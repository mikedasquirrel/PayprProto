from flask import Blueprint, render_template, abort, session, request, redirect, url_for, flash, send_file
from sqlalchemy.orm import joinedload
from sqlalchemy import func

from extensions import db, csrf
from models import Publisher, Article, ContactMessage
from services.events import track_event


bp = Blueprint("public", __name__)


@bp.route("/")
def newsstand():
    selected = (request.args.get('category') or '').strip()
    query = (request.args.get('q') or '').strip()
    sort = (request.args.get('sort') or 'name').strip()
    price_min = request.args.get('min')
    price_max = request.args.get('max')
    q = Publisher.query
    if selected:
        q = q.filter(Publisher.category == selected)
    if query:
        like = f"%{query}%"
        q = q.filter(Publisher.name.ilike(like))
    if sort == 'new':
        q = q.order_by(Publisher.created_at.desc())
    elif sort == 'name_desc':
        q = q.order_by(Publisher.name.desc())
    else:
        q = q.order_by(Publisher.name.asc())
    publishers = q.all()
    # categories list for filter chips
    cats = [c[0] for c in db.session.query(Publisher.category).distinct().order_by(Publisher.category.asc()).all() if c[0]]

    # Featured: pick 8 latest articles with high cover quality
    from models import Article
    featured = (
        Article.query.join(Publisher, Article.publisher_id==Publisher.id)
        .order_by(Article.created_at.desc())
        .limit(8)
        .all()
    )
    track_event("newsstand_view")
    return render_template("newsstand.html", publishers=publishers, categories=cats, selected_category=selected, q=query, sort=sort, featured=featured, price_min=price_min, price_max=price_max)


@bp.route("/walkthrough")
def walkthrough():
    return render_template("walkthrough.html")


@bp.route("/bookmarklet")
def bookmarklet():
    return render_template("bookmarklet.html")


@bp.route("/platform")
def platform_overview():
    return render_template("platform_overview.html")


@bp.route("/publisher/guide")
def publisher_guide():
    return render_template("publisher_guide.html")


@bp.route("/publishers")
def publishers_page():
    return render_template("publishers.html")


@bp.route("/partner/apply", methods=["GET"])  # simple CTA form for publishers
def partner_apply():
    return render_template("partner_apply.html")


@bp.route("/case/smerconish")
def case_smerconish():
    return render_template("case_smerconish.html")


@bp.route("/about")
def about():
    return render_template("legal_about.html")


@bp.route("/terms")
def terms():
    return render_template("legal_terms.html")


@bp.route("/privacy")
def privacy():
    return render_template("legal_privacy.html")


@bp.route("/showcase")
def showcase():
    pubs = Publisher.query.order_by(Publisher.created_at.desc()).limit(60).all()
    # Group by layout_style for tiles
    by_style = {}
    for p in pubs:
        key = (p.layout_style or 'default')
        by_style.setdefault(key, []).append(p)
    return render_template("showcase.html", by_style=by_style)


@bp.route('/robots.txt')
def robots_txt():
    return ("User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n", 200, {"Content-Type": "text/plain"})


@bp.route('/sitemap.xml')
def sitemap_xml():
    from models import Article
    items = []
    for p in Publisher.query.order_by(Publisher.created_at.desc()).limit(200).all():
        items.append((f"/p/{p.slug}", p.created_at))
    for a in Article.query.order_by(Article.created_at.desc()).limit(500).all():
        items.append((f"/p/{a.publisher.slug}/{a.slug}", a.created_at))
    xml = ["<?xml version=\"1.0\" encoding=\"UTF-8\"?>", "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">"]
    for loc, dt in items:
        xml.append(f"  <url><loc>{{request.host_url.rstrip('/')}}{{loc}}</loc><lastmod>{{dt.date().isoformat()}}</lastmod></url>")
    xml.append("</urlset>")
    return ("\n".join(xml), 200, {"Content-Type": "application/xml"})


@bp.route("/presskit")
def presskit():
    return render_template("presskit.html")


@bp.route("/presskit.zip")
def presskit_zip():
    import io, os, zipfile
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        base = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'img')
        # Add key assets if available
        for fname in [
            'social_preview.png',
        ]:
            path = os.path.join(base, fname)
            if os.path.exists(path):
                z.write(path, arcname=fname)
        # favicon
        fav = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'favicon.svg')
        if os.path.exists(fav):
            z.write(fav, arcname='favicon.svg')
    buf.seek(0)
    return send_file(buf, mimetype='application/zip', as_attachment=True, download_name='presskit.zip')


@bp.route("/contact", methods=["GET"])  # simple link to email for now
def contact():
    return render_template("contact.html")


@bp.route("/contact", methods=["POST"])  # store message
def contact_post():
    # Honeypot
    if (request.form.get('website') or '').strip():
        return redirect(url_for('public.contact'))
    email = (request.form.get('email') or '').strip()
    name = (request.form.get('name') or '').strip()
    message = (request.form.get('message') or '').strip()
    if not email or not message:
        flash('Please include an email and a short message.', 'error')
        return redirect(url_for('public.contact'))
    db.session.add(ContactMessage(email=email, name=name, message=message))
    db.session.commit()
    flash('Thanks — we will be in touch soon.', 'success')
    return redirect(url_for('public.contact'))


@bp.route("/p/<string:pub_slug>")
def publisher_view(pub_slug: str):
    publisher = Publisher.query.filter_by(slug=pub_slug).first()
    if not publisher:
        abort(404)
    page = max(int(request.args.get('page', 1) or 1), 1)
    sort = (request.args.get('sort') or 'new').strip()
    per_page = 9
    total = db.session.query(func.count(Article.id)).filter(Article.publisher_id == publisher.id).scalar()
    q = Article.query.options(joinedload(Article.publisher)).filter_by(publisher_id=publisher.id)
    if sort == 'price_asc':
        q = q.order_by((Article.price_cents.is_(None)).asc(), Article.price_cents.asc())
    elif sort == 'price_desc':
        q = q.order_by((Article.price_cents.is_(None)).asc(), Article.price_cents.desc())
    else:
        q = q.order_by(Article.created_at.desc())
    articles = q.offset((page-1)*per_page).limit(per_page).all()
    total_pages = (total + per_page - 1)//per_page if total else 1
    track_event("publisher_view", publisher_id=publisher.id)
    return render_template("publisher.html", publisher=publisher, articles=articles, page=page, total_pages=total_pages, sort=sort)


@bp.route("/p/<string:pub_slug>/<string:article_slug>")
def article_view(pub_slug: str, article_slug: str):
    article = (
        Article.query.options(joinedload(Article.publisher))
        .join(Publisher, Article.publisher_id == Publisher.id)
        .filter(Publisher.slug == pub_slug, Article.slug == article_slug)
        .first()
    )
    if not article:
        abort(404)

    unlocked_set = set(session.get("unlocked_articles", []))
    unlocked = str(article.id) in unlocked_set
    track_event("article_view", article_id=article.id, publisher_id=article.publisher_id)
    return render_template("article.html", article=article, unlocked=unlocked)
