"""Showcase Blueprint - Custom branded sites like smerconish.com"""
from flask import Blueprint, jsonify, request
from sqlalchemy import func

from extensions import db, csrf
from models import ShowcaseSite, Article, Publisher, AuthorProfile, Transaction
from services.events import track_event


bp = Blueprint("showcase", __name__, url_prefix="/showcase")


@bp.route("/<string:site_slug>", methods=["GET"])
@csrf.exempt
def get_showcase_site(site_slug: str):
    """Get showcase site details and configuration."""
    site = ShowcaseSite.query.filter_by(slug=site_slug, is_active=True).first()
    if not site:
        return jsonify({"error": "Showcase site not found"}), 404
    
    # Get content count for this showcase
    content_count = 0
    if site.owner_type == "author":
        content_count = db.session.query(func.count(Article.id)).filter(
            Article.author_id == site.owner_id,
            Article.status == "published"
        ).scalar() or 0
    elif site.owner_type == "publisher":
        content_count = db.session.query(func.count(Article.id)).filter(
            Article.publisher_id == site.owner_id,
            Article.status == "published"
        ).scalar() or 0
    
    return jsonify({
        "id": site.id,
        "slug": site.slug,
        "name": site.name,
        "tagline": site.tagline,
        "owner_type": site.owner_type,
        "owner_id": site.owner_id,
        "primary_color": site.primary_color,
        "accent_color": site.accent_color,
        "logo_url": site.logo_url,
        "hero_image_url": site.hero_image_url,
        "favicon_url": site.favicon_url,
        "about_text": site.about_text,
        "show_paypr_branding": site.show_paypr_branding,
        "content_count": content_count,
        "theme_css": site.theme_css
    })


@bp.route("/<string:site_slug>/content", methods=["GET"])
@csrf.exempt
def get_showcase_content(site_slug: str):
    """Get content for showcase site."""
    site = ShowcaseSite.query.filter_by(slug=site_slug, is_active=True).first()
    if not site:
        return jsonify({"error": "Showcase site not found"}), 404
    
    # Pagination
    try:
        offset = int(request.args.get("offset", 0) or 0)
        limit = min(max(int(request.args.get("limit", 20) or 20), 1), 100)
    except Exception:
        offset, limit = 0, 20
    
    # Category filter
    category = request.args.get("category", "").strip()
    media_type = request.args.get("media_type", "").strip()
    
    # Build query based on owner type
    if site.owner_type == "author":
        query = Article.query.filter(
            Article.author_id == site.owner_id,
            Article.status == "published"
        )
    elif site.owner_type == "publisher":
        query = Article.query.filter(
            Article.publisher_id == site.owner_id,
            Article.status == "published"
        )
    else:
        query = Article.query.filter(Article.status == "published")
    
    # Apply filters
    if category:
        query = query.join(Publisher).filter(Publisher.category == category)
    
    if media_type:
        query = query.filter(Article.media_type == media_type)
    
    # Get articles
    articles = query.order_by(Article.created_at.desc()).offset(offset).limit(limit).all()
    
    items = []
    for a in articles:
        items.append({
            "id": a.id,
            "slug": a.slug,
            "title": a.title,
            "dek": a.dek,
            "author": a.author,
            "media_type": a.media_type,
            "price_cents": a.price_cents or 99,
            "cover_url": a.cover_url,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "publisher_name": a.publisher.name if a.publisher else None,
        })
    
    # Get categories for filtering (if publisher showcase)
    categories = []
    if site.owner_type == "publisher":
        cat_query = db.session.query(Publisher.category).filter(
            Publisher.id == site.owner_id
        ).distinct()
        categories = [c[0] for c in cat_query.all() if c[0]]
    
    return jsonify({
        "items": items,
        "categories": categories,
        "total": len(items)
    })


@bp.route("/<string:site_slug>/stats", methods=["GET"])
@csrf.exempt
def get_showcase_stats(site_slug: str):
    """Get stats for showcase site (public facing)."""
    site = ShowcaseSite.query.filter_by(slug=site_slug, is_active=True).first()
    if not site:
        return jsonify({"error": "Showcase site not found"}), 404
    
    # Get article IDs for this showcase
    if site.owner_type == "author":
        article_ids_query = db.session.query(Article.id).filter(
            Article.author_id == site.owner_id,
            Article.status == "published"
        )
    elif site.owner_type == "publisher":
        article_ids_query = db.session.query(Article.id).filter(
            Article.publisher_id == site.owner_id,
            Article.status == "published"
        )
    else:
        return jsonify({"error": "Invalid owner type"}), 400
    
    article_ids = [row[0] for row in article_ids_query.all()]
    
    if not article_ids:
        return jsonify({
            "total_reads": 0,
            "total_revenue_cents": 0,
            "article_count": 0
        })
    
    # Get transaction stats
    total_reads = db.session.query(func.count(Transaction.id)).filter(
        Transaction.article_id.in_(article_ids),
        Transaction.type == "debit"
    ).scalar() or 0
    
    total_revenue = db.session.query(
        func.coalesce(func.sum(Transaction.price_cents), 0)
    ).filter(
        Transaction.article_id.in_(article_ids),
        Transaction.type == "debit"
    ).scalar() or 0
    
    return jsonify({
        "total_reads": total_reads,
        "total_revenue_cents": total_revenue,
        "article_count": len(article_ids)
    })


# Admin/Owner APIs for managing showcase sites

@bp.route("/create", methods=["POST"])
@csrf.exempt
def create_showcase_site():
    """Create a new showcase site (requires auth)."""
    # For now, allow creation - in production, require authentication
    payload = request.get_json(silent=True) or {}
    
    slug = payload.get("slug", "").strip()
    name = payload.get("name", "").strip()
    
    if not slug or not name:
        return jsonify({"error": "Slug and name are required"}), 400
    
    # Check if slug exists
    existing = ShowcaseSite.query.filter_by(slug=slug).first()
    if existing:
        return jsonify({"error": "Slug already exists"}), 400
    
    site = ShowcaseSite(
        slug=slug,
        name=name,
        tagline=payload.get("tagline", ""),
        owner_type=payload.get("owner_type", "author"),
        owner_id=payload.get("owner_id"),
        primary_color=payload.get("primary_color", "#1A1D24"),
        accent_color=payload.get("accent_color", "#FA3D7F"),
        logo_url=payload.get("logo_url"),
        hero_image_url=payload.get("hero_image_url"),
        favicon_url=payload.get("favicon_url"),
        about_text=payload.get("about_text", ""),
        theme_css=payload.get("theme_css", ""),
        show_paypr_branding=payload.get("show_paypr_branding", True)
    )
    
    db.session.add(site)
    db.session.commit()
    
    return jsonify({
        "ok": True,
        "site": {
            "id": site.id,
            "slug": site.slug,
            "name": site.name
        }
    }), 201


@bp.route("/<string:site_slug>/update", methods=["PUT"])
@csrf.exempt
def update_showcase_site(site_slug: str):
    """Update showcase site settings."""
    site = ShowcaseSite.query.filter_by(slug=site_slug).first()
    if not site:
        return jsonify({"error": "Showcase site not found"}), 404
    
    payload = request.get_json(silent=True) or {}
    
    # Update fields
    if "name" in payload:
        site.name = payload["name"]
    if "tagline" in payload:
        site.tagline = payload["tagline"]
    if "primary_color" in payload:
        site.primary_color = payload["primary_color"]
    if "accent_color" in payload:
        site.accent_color = payload["accent_color"]
    if "logo_url" in payload:
        site.logo_url = payload["logo_url"]
    if "hero_image_url" in payload:
        site.hero_image_url = payload["hero_image_url"]
    if "favicon_url" in payload:
        site.favicon_url = payload["favicon_url"]
    if "about_text" in payload:
        site.about_text = payload["about_text"]
    if "theme_css" in payload:
        site.theme_css = payload["theme_css"]
    if "show_paypr_branding" in payload:
        site.show_paypr_branding = bool(payload["show_paypr_branding"])
    if "is_active" in payload:
        site.is_active = bool(payload["is_active"])
    
    db.session.commit()
    
    return jsonify({"ok": True})

