from __future__ import annotations

from datetime import datetime, timedelta
import csv
import io
import json
import secrets

from flask import Blueprint, request, jsonify, session, current_app, Response
from flask_login import login_required, current_user, login_user, logout_user
from sqlalchemy import func
from werkzeug.security import check_password_hash

from extensions import db, csrf, limiter
from models import (
    Article, Transaction, Publisher, User, ContactMessage, 
    MagicLogin, PublisherUser, AdminAccount, ThemeSettings, 
    SiteSettings, SplitRule, Event
)
from services.payments import calculate_fees_cents, apply_split_rules
from services.tokens import issue_jwt, verify_jwt, revoke_token
from services.schemas import (
    PayRequestSchema, VerifyRequestSchema, RefundRequestSchema, 
    TopupRequestSchema, ContactRequestSchema, LoginRequestSchema,
    MagicLinkRequestSchema, ThemeUpdateSchema, SiteUpdateSchema,
    SplitRulesUpdateSchema
)
from services.events import track_event


bp = Blueprint("api", __name__)
@bp.route("/publishers", methods=["GET"])  # simple pagination/filters for newsstand
@csrf.exempt
def list_publishers():
    from models import Publisher
    try:
        offset = int(request.args.get("offset", 0) or 0)
        limit = min(max(int(request.args.get("limit", 12) or 12), 1), 60)
    except Exception:
        offset, limit = 0, 12
    category = (request.args.get("category") or "").strip()
    q = (request.args.get("q") or "").strip()
    qry = Publisher.query
    if category:
        qry = qry.filter(Publisher.category == category)
    if q:
        like = f"%{q}%"
        qry = qry.filter(Publisher.name.ilike(like))
    pubs = (
        qry.order_by(Publisher.name.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    items = [
        {
            "slug": p.slug,
            "name": p.name,
            "hero_url": p.hero_url,
            "category": p.category,
            "accent_color": p.accent_color,
        }
        for p in pubs
    ]
    return jsonify({"items": items})


@bp.route("/pay", methods=["POST"])
@csrf.exempt
@limiter.limit("10/minute")
@login_required
def pay():
    payload = request.get_json(silent=True) or {}
    data = PayRequestSchema().load(payload)
    article_id = data["article_id"]

    article = Article.query.get(article_id)
    if not article:
        return jsonify({"error": "Article not found"}), 404

    price = article.price_cents or (article.publisher.default_price_cents if article.publisher else 25)

    # Daily cap enforcement
    cap = int(current_app.config.get("DAILY_SPEND_CAP_CENTS", 1500))
    since = datetime.utcnow() - timedelta(days=1)
    spent = (
        db.session.query(db.func.coalesce(db.func.sum(Transaction.price_cents), 0))
        .filter(Transaction.user_id == current_user.id, Transaction.created_at >= since, Transaction.type == "debit")
        .scalar()
    )
    if spent + price > cap:
        return jsonify({"error": "Daily spend cap reached"}), 429

    if (current_user.wallet_cents or 0) < price:
        return jsonify({"error": "Insufficient balance"}), 402

    # Calculate revenue split using new flexible logic
    from services.payments import calculate_article_split, record_author_earnings
    split_amounts = calculate_article_split(price, article)
    
    # Legacy fee/net calculation for backward compatibility
    fee, net = calculate_fees_cents(price)

    import json
    txn = Transaction(
        user_id=current_user.id,
        article_id=article.id,
        publisher_id=article.publisher_id,
        price_cents=price,
        fee_cents=fee,
        net_cents=net,
        type="debit",
        ip_address=request.remote_addr,
        user_agent=request.headers.get("User-Agent"),
        split_breakdown_json=json.dumps(split_amounts),
    )
    current_user.wallet_cents = (current_user.wallet_cents or 0) - price
    db.session.add(txn)
    db.session.commit()

    # Record author earnings if applicable
    try:
        record_author_earnings(article, txn, split_amounts)
    except Exception as e:
        # Don't fail transaction if earnings recording fails
        print(f"Failed to record author earnings: {e}")

    # Analytics
    track_event("pay", article_id=article.id, publisher_id=article.publisher_id, metadata={"price_cents": price})

    token = issue_jwt(current_user.id, article.id, article.publisher_id, exp_minutes=10)

    unlocked = set(session.get("unlocked_articles", []))
    unlocked.add(str(article.id))
    session["unlocked_articles"] = list(unlocked)

    return jsonify({
        "access_token": token,
        "balance_cents": current_user.wallet_cents,
        "price_cents": price,
        "transaction_id": txn.id,
        "split": split_amounts,
    })


@bp.route("/verify", methods=["POST"])
@csrf.exempt
@limiter.limit("60/minute")
@login_required
def verify():
    payload = request.get_json(silent=True) or {}
    data = VerifyRequestSchema().load(payload)
    token = data["access_token"]
    article_id = data["article_id"]

    claims = verify_jwt(token)
    valid = bool(claims and str(claims.get("article_id")) == str(article_id))
    return jsonify({"valid": valid})


@bp.route("/refund", methods=["POST"])
@csrf.exempt
@limiter.limit("5/minute")
@login_required
def refund():
    payload = request.get_json(silent=True) or {}
    data = RefundRequestSchema().load(payload)
    orig = Transaction.query.get(data["transaction_id"])
    if not orig or orig.user_id != current_user.id:
        return jsonify({"error": "Transaction not found"}), 404
    # 10-minute refund window
    if (datetime.utcnow() - orig.created_at) > timedelta(minutes=10):
        return jsonify({"error": "Refund window closed"}), 400
    if orig.type != "debit":
        return jsonify({"error": "Not refundable"}), 400

    # Create refund transaction (audit trail)
    refund_txn = Transaction(
        user_id=current_user.id,
        article_id=orig.article_id,
        publisher_id=orig.publisher_id,
        price_cents=orig.price_cents,
        fee_cents=0,
        net_cents=-orig.price_cents,
        type="refund",
        ip_address=request.remote_addr,
        user_agent=request.headers.get("User-Agent"),
    )
    current_user.wallet_cents = (current_user.wallet_cents or 0) + orig.price_cents
    db.session.add(refund_txn)
    db.session.commit()

    # Revoke any token provided for this article if supplied by client (optional best-effort)
    token = (payload or {}).get("access_token")
    if token:
        revoke_token(token)

    return jsonify({"ok": True, "balance_cents": current_user.wallet_cents, "refund_id": refund_txn.id})


# ========== PUBLIC APIs ==========

@bp.route("/publishers/<string:slug>", methods=["GET"])
@csrf.exempt
def get_publisher(slug: str):
    """Get publisher details with article counts."""
    pub = Publisher.query.filter_by(slug=slug).first()
    if not pub:
        return jsonify({"error": "Publisher not found"}), 404
    
    article_count = db.session.query(func.count(Article.id)).filter(Article.publisher_id == pub.id).scalar()
    
    return jsonify({
        "id": pub.id,
        "name": pub.name,
        "slug": pub.slug,
        "logo_url": pub.logo_url,
        "hero_url": pub.hero_url,
        "default_price_cents": pub.default_price_cents,
        "category": pub.category,
        "accent_color": pub.accent_color,
        "layout_style": pub.layout_style,
        "strapline": pub.strapline,
        "article_count": article_count or 0,
    })


@bp.route("/articles", methods=["GET"])
@csrf.exempt
def list_articles():
    """List articles with optional filters."""
    try:
        offset = int(request.args.get("offset", 0) or 0)
        limit = min(max(int(request.args.get("limit", 12) or 12), 1), 100)
    except Exception:
        offset, limit = 0, 12
    
    publisher_slug = (request.args.get("publisher") or "").strip()
    category = (request.args.get("category") or "").strip()
    featured = request.args.get("featured") == "true"
    
    query = Article.query
    
    if publisher_slug:
        pub = Publisher.query.filter_by(slug=publisher_slug).first()
        if pub:
            query = query.filter(Article.publisher_id == pub.id)
    
    if category:
        query = query.join(Publisher).filter(Publisher.category == category)
    
    if featured:
        query = query.join(Publisher).order_by(Article.created_at.desc()).limit(8)
    else:
        query = query.order_by(Article.created_at.desc()).offset(offset).limit(limit)
    
    articles = query.all()
    
    items = []
    for a in articles:
        items.append({
            "id": a.id,
            "slug": a.slug,
            "title": a.title,
            "dek": a.dek,
            "author": a.author,
            "media_type": a.media_type,
            "price_cents": a.price_cents or (a.publisher.default_price_cents if a.publisher else 25),
            "cover_url": a.cover_url,
            "publisher_slug": a.publisher.slug if a.publisher else None,
            "publisher_name": a.publisher.name if a.publisher else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })
    
    return jsonify({"items": items})


@bp.route("/articles/<int:article_id>", methods=["GET"])
@csrf.exempt
def get_article(article_id: int):
    """Get article detail with unlock status."""
    article = Article.query.get(article_id)
    if not article:
        return jsonify({"error": "Article not found"}), 404
    
    unlocked_set = set(session.get("unlocked_articles", []))
    unlocked = str(article.id) in unlocked_set
    
    price = article.price_cents or (article.publisher.default_price_cents if article.publisher else 25)
    
    result = {
        "id": article.id,
        "slug": article.slug,
        "title": article.title,
        "dek": article.dek,
        "author": article.author,
        "media_type": article.media_type,
        "price_cents": price,
        "cover_url": article.cover_url,
        "publisher": {
            "id": article.publisher.id if article.publisher else None,
            "name": article.publisher.name if article.publisher else None,
            "slug": article.publisher.slug if article.publisher else None,
            "accent_color": article.publisher.accent_color if article.publisher else None,
        } if article.publisher else None,
        "unlocked": unlocked,
        "created_at": article.created_at.isoformat() if article.created_at else None,
    }
    
    if unlocked:
        result["body_html"] = article.body_html
    else:
        result["body_preview"] = article.body_preview
    
    track_event("article_view", article_id=article.id, publisher_id=article.publisher_id if article.publisher else None)
    
    return jsonify(result)


@bp.route("/categories", methods=["GET"])
@csrf.exempt
def list_categories():
    """List distinct publisher categories."""
    cats = [
        c[0] for c in db.session.query(Publisher.category)
        .distinct()
        .order_by(Publisher.category.asc())
        .all() if c[0]
    ]
    return jsonify({"categories": cats})


@bp.route("/publications-showcase", methods=["GET"])
@csrf.exempt
def publications_showcase():
    """Get showcase data for publications using Paypr (fake examples for demo)."""
    showcase_pubs = [
        {
            "name": "The Metropolitan Review",
            "category": "News",
            "logo": "🏛️",
            "quote": "Paypr helped us increase digital revenue by 240% while maintaining editorial independence.",
            "since_year": 2023,
            "article_count": 1200,
            "accent_color": "#2563eb"
        },
        {
            "name": "TechVision Daily",
            "category": "Technology",
            "logo": "💻",
            "quote": "Our readers love the no-subscription model. Engagement is up 3x since switching to Paypr.",
            "since_year": 2024,
            "article_count": 850,
            "accent_color": "#7c3aed"
        },
        {
            "name": "Culture & Commentary",
            "category": "Opinion",
            "logo": "✍️",
            "quote": "Finally, a way to monetize quality opinion pieces without paywalls. Our writers are thriving.",
            "since_year": 2023,
            "article_count": 2400,
            "accent_color": "#dc2626"
        },
        {
            "name": "The Athletic Insider",
            "category": "Sports",
            "logo": "⚽",
            "quote": "Paypr's micropayments let fans pay for what they want. Perfect for sports coverage.",
            "since_year": 2024,
            "article_count": 3100,
            "accent_color": "#059669"
        },
        {
            "name": "ScienceNow",
            "category": "Science",
            "logo": "🔬",
            "quote": "We're reaching new audiences and funding quality science journalism sustainably.",
            "since_year": 2023,
            "article_count": 980,
            "accent_color": "#0891b2"
        },
        {
            "name": "Modern Living Magazine",
            "category": "Lifestyle",
            "logo": "🌿",
            "quote": "The reader experience is seamless. Our subscribers and casual readers both love it.",
            "since_year": 2024,
            "article_count": 1650,
            "accent_color": "#ea580c"
        },
        {
            "name": "Global Finance Report",
            "category": "Business",
            "logo": "📊",
            "quote": "Paypr's transparent split system makes it easy to compensate our expert contributors fairly.",
            "since_year": 2023,
            "article_count": 2200,
            "accent_color": "#7c2d12"
        },
        {
            "name": "The Investigator",
            "category": "News",
            "logo": "🔍",
            "quote": "Deep investigative journalism needs sustainable funding. Paypr delivers.",
            "since_year": 2024,
            "article_count": 420,
            "accent_color": "#1e40af"
        },
        {
            "name": "Creative Quarterly",
            "category": "Arts",
            "logo": "🎨",
            "quote": "Artists and writers get paid fairly. Readers get quality content. Win-win.",
            "since_year": 2023,
            "article_count": 890,
            "accent_color": "#be185d"
        },
        {
            "name": "The Policy Brief",
            "category": "Politics",
            "logo": "🏛️",
            "quote": "Unbiased political analysis, funded by readers not advertisers. That's the Paypr model.",
            "since_year": 2024,
            "article_count": 1340,
            "accent_color": "#4338ca"
        }
    ]
    
    return jsonify({"publications": showcase_pubs})


@bp.route("/contact", methods=["POST"])
@csrf.exempt
@limiter.limit("5/hour")
def contact():
    """Submit contact form."""
    payload = request.get_json(silent=True) or {}
    data = ContactRequestSchema().load(payload)
    
    # Honeypot check
    if payload.get("website"):
        return jsonify({"ok": True})
    
    msg = ContactMessage(
        email=data["email"],
        name=data.get("name", ""),
        message=data["message"]
    )
    db.session.add(msg)
    db.session.commit()
    
    return jsonify({"ok": True})


# ========== AUTH APIs ==========

@bp.route("/auth/login", methods=["POST"])
@csrf.exempt
@limiter.limit("10/minute")
def auth_login():
    """Email-based login (auto-create users)."""
    payload = request.get_json(silent=True) or {}
    data = LoginRequestSchema().load(payload)
    
    email = data["email"].strip().lower()
    
    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(email=email, wallet_cents=500)  # $5 starter balance
        db.session.add(user)
        db.session.commit()
    
    login_user(user, remember=True)
    
    return jsonify({
        "ok": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "wallet_cents": user.wallet_cents or 0,
        }
    })


@bp.route("/auth/magic-link/request", methods=["POST"])
@csrf.exempt
@limiter.limit("5/hour")
def auth_magic_request():
    """Request magic link."""
    payload = request.get_json(silent=True) or {}
    data = MagicLinkRequestSchema().load(payload)
    
    email = data["email"].strip().lower()
    token = secrets.token_urlsafe(24)
    
    ml = MagicLogin(
        email=email,
        token=token,
        expires_at=datetime.utcnow() + timedelta(minutes=15)
    )
    db.session.add(ml)
    db.session.commit()
    
    # In production, send email here
    # For demo, return the link
    link = f"{request.host_url}#/auth/verify?token={token}"
    
    return jsonify({"ok": True, "demo_link": link})


@bp.route("/auth/magic-link/verify", methods=["POST"])
@csrf.exempt
def auth_magic_verify():
    """Verify magic link token."""
    payload = request.get_json(silent=True) or {}
    token = payload.get("token", "").strip()
    
    if not token:
        return jsonify({"error": "Missing token"}), 400
    
    ml = MagicLogin.query.filter_by(token=token).first()
    if not ml or ml.expires_at < datetime.utcnow():
        return jsonify({"error": "Invalid or expired link"}), 400
    
    user = User.query.filter_by(email=ml.email).first()
    if not user:
        user = User(email=ml.email, wallet_cents=500)
        db.session.add(user)
        db.session.commit()
    
    login_user(user, remember=True)
    
    try:
        db.session.delete(ml)
        db.session.commit()
    except Exception:
        db.session.rollback()
    
    return jsonify({
        "ok": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "wallet_cents": user.wallet_cents or 0,
        }
    })


@bp.route("/auth/logout", methods=["POST"])
@csrf.exempt
@login_required
def auth_logout():
    """Logout current user."""
    logout_user()
    return jsonify({"ok": True})


@bp.route("/auth/me", methods=["GET"])
@csrf.exempt
def auth_me():
    """Get current user info."""
    if not current_user.is_authenticated:
        return jsonify({"authenticated": False})
    
    return jsonify({
        "authenticated": True,
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "wallet_cents": current_user.wallet_cents or 0,
        }
    })


# ========== ACCOUNT APIs ==========

@bp.route("/account/wallet", methods=["GET"])
@csrf.exempt
@login_required
def account_wallet():
    """Get wallet balance."""
    return jsonify({
        "balance_cents": current_user.wallet_cents or 0,
        "email": current_user.email,
    })


@bp.route("/account/topup", methods=["POST"])
@csrf.exempt
@limiter.limit("20/minute")
@login_required
def account_topup():
    """Dev wallet topup."""
    payload = request.get_json(silent=True) or {}
    data = TopupRequestSchema().load(payload)
    
    amount_cents = data["amount_cents"]
    
    current_user.wallet_cents = (current_user.wallet_cents or 0) + amount_cents
    db.session.commit()
    
    return jsonify({
        "ok": True,
        "balance_cents": current_user.wallet_cents,
    })


@bp.route("/account/topup/stripe", methods=["POST"])
@csrf.exempt
@limiter.limit("10/minute")
@login_required
def account_topup_stripe():
    """Stripe test topup."""
    import stripe
    
    payload = request.get_json(silent=True) or {}
    data = TopupRequestSchema().load(payload)
    
    amount_cents = data["amount_cents"]
    api_key = current_app.config.get("STRIPE_API_KEY")
    
    if not api_key:
        return jsonify({"error": "Stripe not configured"}), 400
    
    stripe.api_key = api_key
    
    try:
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="usd",
            payment_method_types=["card"],
            confirm=True,
            payment_method="pm_card_visa",
            description="Paypr wallet top-up (test)",
        )
        
        if intent.status == "succeeded":
            current_user.wallet_cents = (current_user.wallet_cents or 0) + amount_cents
            db.session.commit()
            return jsonify({"ok": True, "balance_cents": current_user.wallet_cents})
        
        return jsonify({"error": f"Intent status {intent.status}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/account/topup/checkout", methods=["POST"])
@csrf.exempt
@limiter.limit("10/minute")
@login_required
def account_topup_checkout():
    """Create Stripe Checkout session for wallet topup."""
    import stripe
    
    payload = request.get_json(silent=True) or {}
    data = TopupRequestSchema().load(payload)
    
    amount_cents = data["amount_cents"]
    api_key = current_app.config.get("STRIPE_API_KEY")
    
    if not api_key:
        return jsonify({"error": "Stripe not configured"}), 400
    
    # Minimum $1.00, maximum $500.00
    if amount_cents < 100 or amount_cents > 50000:
        return jsonify({"error": "Amount must be between $1.00 and $500.00"}), 400
    
    stripe.api_key = api_key
    
    # Get base URL for success/cancel redirects
    base_url = request.host_url.rstrip('/')
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": "Paypr Wallet Top-up",
                        "description": f"Add ${amount_cents/100:.2f} to your Paypr wallet",
                    },
                    "unit_amount": amount_cents,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{base_url}/#/payment-success?session_id={{CHECKOUT_SESSION_ID}}&amount={amount_cents}",
            cancel_url=f"{base_url}/#/payment-cancel",
            client_reference_id=str(current_user.id),
            metadata={
                "user_id": current_user.id,
                "user_email": current_user.email,
                "amount_cents": amount_cents,
                "type": "wallet_topup",
            }
        )
        
        return jsonify({
            "ok": True,
            "session_id": session.id,
            "checkout_url": session.url,
            "publishable_key": current_app.config.get("STRIPE_PUBLISHABLE_KEY"),
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/account/topup/verify-session", methods=["POST"])
@csrf.exempt
@login_required
def account_topup_verify_session():
    """Verify Stripe Checkout session and credit wallet."""
    import stripe
    
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    
    if not session_id:
        return jsonify({"error": "session_id required"}), 400
    
    api_key = current_app.config.get("STRIPE_API_KEY")
    if not api_key:
        return jsonify({"error": "Stripe not configured"}), 400
    
    stripe.api_key = api_key
    
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        
        # Verify session belongs to current user
        if session.client_reference_id != str(current_user.id):
            return jsonify({"error": "Session mismatch"}), 403
        
        # Check if payment succeeded
        if session.payment_status != "paid":
            return jsonify({"error": "Payment not completed", "status": session.payment_status}), 400
        
        # Check if we already credited this session (idempotency)
        existing = Transaction.query.filter_by(
            user_id=current_user.id,
            type="topup"
        ).filter(
            Transaction.ip_address == session_id  # Using ip_address field to store session_id
        ).first()
        
        if existing:
            return jsonify({
                "ok": True,
                "already_credited": True,
                "balance_cents": current_user.wallet_cents,
            })
        
        # Credit the wallet
        amount_cents = int(session.metadata.get("amount_cents", 0))
        current_user.wallet_cents = (current_user.wallet_cents or 0) + amount_cents
        
        # Create transaction record
        txn = Transaction(
            user_id=current_user.id,
            article_id=None,
            publisher_id=None,
            price_cents=amount_cents,
            fee_cents=0,
            net_cents=amount_cents,
            type="topup",
            ip_address=session_id,  # Store session_id for idempotency
            user_agent=request.headers.get("User-Agent"),
        )
        db.session.add(txn)
        db.session.commit()
        
        return jsonify({
            "ok": True,
            "balance_cents": current_user.wallet_cents,
            "amount_credited": amount_cents,
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/account/transactions", methods=["GET"])
@csrf.exempt
@login_required
def account_transactions():
    """Get transaction history."""
    txns = (
        Transaction.query.filter_by(user_id=current_user.id)
        .order_by(Transaction.created_at.desc())
        .all()
    )
    
    items = []
    for t in txns:
        split = None
        try:
            if t.split_breakdown_json:
                split = json.loads(t.split_breakdown_json)
        except Exception:
            split = None
        
        items.append({
            "id": t.id,
            "type": t.type,
            "price_cents": t.price_cents,
            "fee_cents": t.fee_cents,
            "net_cents": t.net_cents,
            "article_id": t.article_id,
            "article_title": t.article.title if t.article else None,
            "publisher_name": t.publisher.name if t.publisher else None,
            "split": split,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })
    
    return jsonify({"transactions": items})


# ========== PUBLISHER APIs ==========

@bp.route("/publisher/auth/magic-link/request", methods=["POST"])
@csrf.exempt
@limiter.limit("5/hour")
def publisher_auth_request():
    """Publisher magic link request."""
    payload = request.get_json(silent=True) or {}
    data = MagicLinkRequestSchema().load(payload)
    
    email = data["email"].strip().lower()
    
    # Verify publisher user exists
    pub_user = PublisherUser.query.filter_by(email=email).first()
    if not pub_user:
        return jsonify({"error": "Publisher account not found"}), 404
    
    token = secrets.token_urlsafe(24)
    ml = MagicLogin(
        email=email,
        token=token,
        expires_at=datetime.utcnow() + timedelta(minutes=15)
    )
    db.session.add(ml)
    db.session.commit()
    
    link = f"{request.host_url}#/publisher/verify?token={token}"
    return jsonify({"ok": True, "demo_link": link})


@bp.route("/publisher/auth/magic-link/verify", methods=["POST"])
@csrf.exempt
def publisher_auth_verify():
    """Verify publisher magic link."""
    payload = request.get_json(silent=True) or {}
    token = payload.get("token", "").strip()
    
    if not token:
        return jsonify({"error": "Missing token"}), 400
    
    ml = MagicLogin.query.filter_by(token=token).first()
    if not ml or ml.expires_at < datetime.utcnow():
        return jsonify({"error": "Invalid or expired link"}), 400
    
    pub_user = PublisherUser.query.filter_by(email=ml.email).first()
    if not pub_user:
        return jsonify({"error": "Publisher account not found"}), 404
    
    session["publisher_user"] = ml.email
    session["publisher_id"] = pub_user.publisher_id
    
    try:
        db.session.delete(ml)
        db.session.commit()
    except Exception:
        db.session.rollback()
    
    return jsonify({
        "ok": True,
        "publisher": {
            "id": pub_user.publisher.id,
            "name": pub_user.publisher.name,
            "slug": pub_user.publisher.slug,
        } if pub_user.publisher else None
    })


def _require_publisher_auth():
    """Helper to check publisher authentication."""
    if session.get("is_admin"):
        return None  # Admin can access all
    
    email = session.get("publisher_user")
    if not email:
        return jsonify({"error": "Publisher authentication required"}), 401
    
    pub_user = PublisherUser.query.filter_by(email=email).first()
    if not pub_user:
        return jsonify({"error": "Publisher account not found"}), 404
    
    return pub_user


@bp.route("/publisher/console/stats", methods=["GET"])
@csrf.exempt
def publisher_console_stats():
    """Get publisher revenue stats."""
    auth_result = _require_publisher_auth()
    if isinstance(auth_result, tuple):
        return auth_result
    
    pub_user = auth_result
    publisher_id = session.get("publisher_id") if not session.get("is_admin") else None
    
    # All-time stats
    if session.get("is_admin"):
        summaries = (
            db.session.query(
                Publisher.id,
                Publisher.name,
                Publisher.slug,
                func.count(Transaction.id),
                func.sum(Transaction.price_cents),
                func.sum(Transaction.fee_cents),
                func.sum(Transaction.net_cents),
            )
            .join(Transaction, Transaction.publisher_id == Publisher.id)
            .group_by(Publisher.id)
            .all()
        )
    else:
        summaries = (
            db.session.query(
                Publisher.id,
                Publisher.name,
                Publisher.slug,
                func.count(Transaction.id),
                func.sum(Transaction.price_cents),
                func.sum(Transaction.fee_cents),
                func.sum(Transaction.net_cents),
            )
            .join(Transaction, Transaction.publisher_id == Publisher.id)
            .filter(Publisher.id == publisher_id)
            .group_by(Publisher.id)
            .all()
        )
    
    # 7-day stats
    since = datetime.utcnow() - timedelta(days=7)
    if session.get("is_admin"):
        summaries_7d = (
            db.session.query(
                Publisher.id,
                func.count(Transaction.id),
                func.sum(Transaction.price_cents),
                func.sum(Transaction.fee_cents),
                func.sum(Transaction.net_cents),
            )
            .join(Transaction, Transaction.publisher_id == Publisher.id)
            .filter(Transaction.created_at >= since)
            .group_by(Publisher.id)
            .all()
        )
    else:
        summaries_7d = (
            db.session.query(
                Publisher.id,
                func.count(Transaction.id),
                func.sum(Transaction.price_cents),
                func.sum(Transaction.fee_cents),
                func.sum(Transaction.net_cents),
            )
            .join(Transaction, Transaction.publisher_id == Publisher.id)
            .filter(Transaction.created_at >= since, Publisher.id == publisher_id)
            .group_by(Publisher.id)
            .all()
        )
    
    # Build response
    stats_7d_map = {row[0]: row[1:] for row in summaries_7d}
    
    items = []
    for row in summaries:
        pub_id = row[0]
        seven_day = stats_7d_map.get(pub_id, (0, 0, 0, 0))
        
        items.append({
            "publisher_id": pub_id,
            "publisher_name": row[1],
            "publisher_slug": row[2],
            "all_time": {
                "reads": row[3] or 0,
                "gross_cents": row[4] or 0,
                "fee_cents": row[5] or 0,
                "net_cents": row[6] or 0,
            },
            "last_7_days": {
                "reads": seven_day[0] or 0,
                "gross_cents": seven_day[1] or 0,
                "fee_cents": seven_day[2] or 0,
                "net_cents": seven_day[3] or 0,
            }
        })
    
    return jsonify({"stats": items})


@bp.route("/publisher/console/transactions", methods=["GET"])
@csrf.exempt
def publisher_console_transactions():
    """Get publisher transactions with optional CSV export."""
    auth_result = _require_publisher_auth()
    if isinstance(auth_result, tuple):
        return auth_result
    
    publisher_id = session.get("publisher_id") if not session.get("is_admin") else None
    format_type = request.args.get("format", "json")
    
    if session.get("is_admin"):
        query = (
            db.session.query(
                Publisher.name,
                func.count(Transaction.id),
                func.sum(Transaction.price_cents),
                func.sum(Transaction.fee_cents),
                func.sum(Transaction.net_cents),
            )
            .join(Transaction, Transaction.publisher_id == Publisher.id)
            .group_by(Publisher.id)
        )
    else:
        query = (
            db.session.query(
                Publisher.name,
                func.count(Transaction.id),
                func.sum(Transaction.price_cents),
                func.sum(Transaction.fee_cents),
                func.sum(Transaction.net_cents),
            )
            .join(Transaction, Transaction.publisher_id == Publisher.id)
            .filter(Publisher.id == publisher_id)
            .group_by(Publisher.id)
        )
    
    rows = query.all()
    
    if format_type == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["publisher", "reads", "gross_cents", "fee_cents", "net_cents"])
        for r in rows:
            writer.writerow([r[0], r[1] or 0, r[2] or 0, r[3] or 0, r[4] or 0])
        
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=transactions.csv"}
        )
    
    items = []
    for r in rows:
        items.append({
            "publisher": r[0],
            "reads": r[1] or 0,
            "gross_cents": r[2] or 0,
            "fee_cents": r[3] or 0,
            "net_cents": r[4] or 0,
        })
    
    return jsonify({"transactions": items})


@bp.route("/publisher/console/articles", methods=["GET"])
@csrf.exempt
def publisher_console_articles():
    """Get article performance stats."""
    auth_result = _require_publisher_auth()
    if isinstance(auth_result, tuple):
        return auth_result
    
    publisher_id = session.get("publisher_id") if not session.get("is_admin") else None
    
    if publisher_id:
        query = (
            db.session.query(
                Article.id,
                Article.title,
                Article.slug,
                func.count(Transaction.id),
                func.sum(Transaction.price_cents),
            )
            .outerjoin(Transaction, Transaction.article_id == Article.id)
            .filter(Article.publisher_id == publisher_id)
            .group_by(Article.id)
            .order_by(func.count(Transaction.id).desc())
        )
    else:
        query = (
            db.session.query(
                Article.id,
                Article.title,
                Article.slug,
                func.count(Transaction.id),
                func.sum(Transaction.price_cents),
            )
            .outerjoin(Transaction, Transaction.article_id == Article.id)
            .group_by(Article.id)
            .order_by(func.count(Transaction.id).desc())
        )
    
    rows = query.limit(50).all()
    
    items = []
    for r in rows:
        items.append({
            "article_id": r[0],
            "title": r[1],
            "slug": r[2],
            "reads": r[3] or 0,
            "revenue_cents": r[4] or 0,
        })
    
    return jsonify({"articles": items})


# ========== ADMIN APIs ==========

@bp.route("/admin/auth/login", methods=["POST"])
@csrf.exempt
@limiter.limit("10/minute")
def admin_auth_login():
    """Admin login."""
    payload = request.get_json(silent=True) or {}
    username = payload.get("username", "").strip()
    password = payload.get("password", "")
    
    acct = AdminAccount.query.filter_by(username=username).first()
    if not acct or not check_password_hash(acct.password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401
    
    session["is_admin"] = True
    
    return jsonify({"ok": True, "username": username})


@bp.route("/admin/auth/logout", methods=["POST"])
@csrf.exempt
def admin_auth_logout():
    """Admin logout."""
    session["is_admin"] = False
    return jsonify({"ok": True})


@bp.route("/admin/theme", methods=["GET"])
@csrf.exempt
def admin_theme_get():
    """Get theme settings."""
    if not session.get("is_admin"):
        return jsonify({"error": "Admin authentication required"}), 401
    
    theme = ThemeSettings.query.order_by(ThemeSettings.id.asc()).first()
    if not theme:
        theme = ThemeSettings()
        db.session.add(theme)
        db.session.commit()
    
    return jsonify({
        "color_ink": theme.color_ink,
        "color_ash": theme.color_ash,
        "color_smoke": theme.color_smoke,
        "color_paper": theme.color_paper,
        "grad": theme.grad,
        "font_body": theme.font_body,
        "font_headline": theme.font_headline,
        "font_body_link": theme.font_body_link,
        "font_headline_link": theme.font_headline_link,
        "base_font_px": theme.base_font_px,
        "radius_px": theme.radius_px,
        "logo_text": theme.logo_text,
        "favicon_url": theme.favicon_url,
        "watermark_css": theme.watermark_css,
        "default_kiosk_hero_url": theme.default_kiosk_hero_url,
    })


@bp.route("/admin/theme", methods=["PUT"])
@csrf.exempt
def admin_theme_update():
    """Update theme settings."""
    if not session.get("is_admin"):
        return jsonify({"error": "Admin authentication required"}), 401
    
    payload = request.get_json(silent=True) or {}
    
    theme = ThemeSettings.query.order_by(ThemeSettings.id.asc()).first()
    if not theme:
        theme = ThemeSettings()
        db.session.add(theme)
    
    # Update fields if provided
    for field in ["color_ink", "color_ash", "color_smoke", "color_paper", "grad",
                  "font_body", "font_headline", "font_body_link", "font_headline_link",
                  "logo_text", "favicon_url", "watermark_css", "default_kiosk_hero_url"]:
        if field in payload:
            setattr(theme, field, payload[field])
    
    if "base_font_px" in payload:
        theme.base_font_px = int(payload["base_font_px"])
    if "radius_px" in payload:
        theme.radius_px = int(payload["radius_px"])
    
    db.session.commit()
    
    return jsonify({"ok": True})


@bp.route("/admin/site", methods=["GET"])
@csrf.exempt
def admin_site_get():
    """Get site settings."""
    if not session.get("is_admin"):
        return jsonify({"error": "Admin authentication required"}), 401
    
    site = SiteSettings.query.order_by(SiteSettings.id.asc()).first()
    if not site:
        site = SiteSettings()
        db.session.add(site)
        db.session.commit()
    
    return jsonify({
        "nav_newsstand": site.nav_newsstand,
        "nav_walkthrough": site.nav_walkthrough,
        "nav_publishers": site.nav_publishers,
        "nav_platform": site.nav_platform,
        "nav_guide": site.nav_guide,
        "nav_showcase": site.nav_showcase,
        "nav_bookmarklet": site.nav_bookmarklet,
        "nav_presskit": site.nav_presskit,
        "nav_case": site.nav_case,
        "nav_wallet": site.nav_wallet,
        "nav_history": site.nav_history,
        "nav_login": site.nav_login,
        "nav_order_csv": site.nav_order_csv,
        "site_layout": site.site_layout,
        "no_gradients": site.no_gradients,
    })


@bp.route("/admin/site", methods=["PUT"])
@csrf.exempt
def admin_site_update():
    """Update site settings."""
    if not session.get("is_admin"):
        return jsonify({"error": "Admin authentication required"}), 401
    
    payload = request.get_json(silent=True) or {}
    
    site = SiteSettings.query.order_by(SiteSettings.id.asc()).first()
    if not site:
        site = SiteSettings()
        db.session.add(site)
    
    # Update nav toggles
    for key in ['newsstand', 'walkthrough', 'publishers', 'platform', 'guide',
                'showcase', 'bookmarklet', 'presskit', 'case', 'wallet', 'history', 'login']:
        field = f'nav_{key}'
        if field in payload:
            setattr(site, field, bool(payload[field]))
    
    if "nav_order_csv" in payload:
        site.nav_order_csv = payload["nav_order_csv"]
    if "site_layout" in payload:
        site.site_layout = payload["site_layout"]
    if "no_gradients" in payload:
        site.no_gradients = bool(payload["no_gradients"])
    
    db.session.commit()
    
    return jsonify({"ok": True})


@bp.route("/admin/splits/<int:publisher_id>", methods=["GET"])
@csrf.exempt
def admin_splits_get(publisher_id: int):
    """Get split rules for publisher."""
    if not session.get("is_admin"):
        return jsonify({"error": "Admin authentication required"}), 401
    
    pub = Publisher.query.get(publisher_id)
    if not pub:
        return jsonify({"error": "Publisher not found"}), 404
    
    rules = SplitRule.query.filter_by(publisher_id=publisher_id).all()
    
    items = []
    for r in rules:
        items.append({
            "id": r.id,
            "role": r.role,
            "percent_bps": r.percent_bps,
            "recipient_label": r.recipient_label,
        })
    
    return jsonify({
        "publisher": {
            "id": pub.id,
            "name": pub.name,
            "slug": pub.slug,
        },
        "rules": items
    })


@bp.route("/admin/splits/<int:publisher_id>", methods=["PUT"])
@csrf.exempt
def admin_splits_update(publisher_id: int):
    """Update split rules for publisher."""
    if not session.get("is_admin"):
        return jsonify({"error": "Admin authentication required"}), 401
    
    pub = Publisher.query.get(publisher_id)
    if not pub:
        return jsonify({"error": "Publisher not found"}), 404
    
    payload = request.get_json(silent=True) or {}
    rules_data = payload.get("rules", [])
    
    # Clear existing rules
    SplitRule.query.filter_by(publisher_id=publisher_id).delete()
    
    # Add new rules
    for rule_data in rules_data:
        role = rule_data.get("role", "").strip()
        if not role:
            continue
        
        rule = SplitRule(
            publisher_id=publisher_id,
            role=role,
            percent_bps=int(rule_data.get("percent_bps", 0)),
            recipient_label=rule_data.get("recipient_label", role)
        )
        db.session.add(rule)
    
    db.session.commit()
    
    # Validate total
    total = db.session.query(func.coalesce(func.sum(SplitRule.percent_bps), 0)).filter_by(publisher_id=publisher_id).scalar() or 0
    
    return jsonify({
        "ok": True,
        "total_bps": total,
        "warning": "Total exceeds 100%" if total > 10000 else None
    })


@bp.route("/admin/users", methods=["GET"])
@csrf.exempt
def admin_users_list():
    """Get list of users for admin management."""
    if not session.get("is_admin"):
        return jsonify({"error": "Admin authentication required"}), 401
    
    # Get pagination params
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 50))
    search = request.args.get("search", "").strip()
    
    # Build query
    query = User.query
    
    if search:
        query = query.filter(User.email.ilike(f"%{search}%"))
    
    # Get paginated users
    users = query.order_by(User.created_at.desc()).limit(per_page).offset((page - 1) * per_page).all()
    total = query.count()
    
    items = []
    for user in users:
        # Get transaction stats
        txn_count = Transaction.query.filter_by(user_id=user.id, type="debit").count()
        total_spent = db.session.query(
            db.func.coalesce(db.func.sum(Transaction.price_cents), 0)
        ).filter_by(user_id=user.id, type="debit").scalar() or 0
        
        items.append({
            "id": user.id,
            "email": user.email,
            "wallet_cents": user.wallet_cents or 0,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "transaction_count": txn_count,
            "total_spent_cents": total_spent,
        })
    
    return jsonify({
        "items": items,
        "page": page,
        "per_page": per_page,
        "total": total,
    })


@bp.route("/admin/users/<int:user_id>", methods=["GET"])
@csrf.exempt
def admin_user_detail(user_id: int):
    """Get detailed user information."""
    if not session.get("is_admin"):
        return jsonify({"error": "Admin authentication required"}), 401
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Get recent transactions
    recent_txns = Transaction.query.filter_by(user_id=user.id).order_by(
        Transaction.created_at.desc()
    ).limit(20).all()
    
    txn_items = []
    for t in recent_txns:
        txn_items.append({
            "id": t.id,
            "type": t.type,
            "price_cents": t.price_cents,
            "article_title": t.article.title if t.article else None,
            "publisher_name": t.publisher.name if t.publisher else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })
    
    # Check if user is an author
    from models import AuthorProfile
    author_profile = AuthorProfile.query.filter_by(user_id=user.id).first()
    
    return jsonify({
        "id": user.id,
        "email": user.email,
        "wallet_cents": user.wallet_cents or 0,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "is_author": author_profile is not None,
        "author_id": author_profile.id if author_profile else None,
        "recent_transactions": txn_items,
    })


@bp.route("/admin/users/<int:user_id>/credit", methods=["POST"])
@csrf.exempt
@limiter.limit("20/minute")
def admin_credit_user(user_id: int):
    """Manually credit user wallet (admin only)."""
    if not session.get("is_admin"):
        return jsonify({"error": "Admin authentication required"}), 401
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    payload = request.get_json(silent=True) or {}
    amount_cents = payload.get("amount_cents")
    note = payload.get("note", "")
    
    if not amount_cents or not isinstance(amount_cents, int):
        return jsonify({"error": "amount_cents required (integer)"}), 400
    
    # Allow both positive (credit) and negative (debit) amounts
    if amount_cents == 0:
        return jsonify({"error": "Amount cannot be zero"}), 400
    
    # Update wallet
    user.wallet_cents = (user.wallet_cents or 0) + amount_cents
    
    # Create transaction record for audit trail
    txn = Transaction(
        user_id=user.id,
        article_id=None,
        publisher_id=None,
        price_cents=abs(amount_cents),
        fee_cents=0,
        net_cents=amount_cents,
        type="admin_credit" if amount_cents > 0 else "admin_debit",
        ip_address=request.remote_addr,
        user_agent=note[:300] if note else "Admin manual adjustment",  # Store note in user_agent field
    )
    db.session.add(txn)
    db.session.commit()
    
    return jsonify({
        "ok": True,
        "user_id": user.id,
        "new_balance_cents": user.wallet_cents,
        "amount_adjusted": amount_cents,
        "transaction_id": txn.id,
    })


# ========== AUTHOR APIs ==========

@bp.route("/author/register", methods=["POST"])
@csrf.exempt
@login_required
def author_register():
    """Register as an author (creates author profile)."""
    from models import AuthorProfile
    
    # Check if user already has author profile
    existing = AuthorProfile.query.filter_by(user_id=current_user.id).first()
    if existing:
        return jsonify({"error": "Author profile already exists"}), 400
    
    payload = request.get_json(silent=True) or {}
    
    # Create author profile
    author = AuthorProfile(
        user_id=current_user.id,
        display_name=payload.get("display_name", current_user.email.split("@")[0]),
        bio=payload.get("bio", ""),
        photo_url=payload.get("photo_url"),
        website_url=payload.get("website_url"),
        twitter_handle=payload.get("twitter_handle"),
        default_price_cents=payload.get("default_price_cents", 99),
        accepts_publisher_requests=payload.get("accepts_publisher_requests", True)
    )
    
    db.session.add(author)
    db.session.commit()
    
    return jsonify({
        "ok": True,
        "author": {
            "id": author.id,
            "display_name": author.display_name,
            "bio": author.bio,
            "photo_url": author.photo_url,
            "default_price_cents": author.default_price_cents
        }
    }), 201


@bp.route("/author/profile", methods=["GET"])
@csrf.exempt
@login_required
def author_profile_get():
    """Get current user's author profile."""
    from models import AuthorProfile
    
    author = AuthorProfile.query.filter_by(user_id=current_user.id).first()
    if not author:
        return jsonify({"error": "Author profile not found"}), 404
    
    # Get article count
    article_count = db.session.query(func.count(Article.id)).filter(
        Article.author_id == author.id,
        Article.status == "published"
    ).scalar() or 0
    
    return jsonify({
        "id": author.id,
        "user_id": author.user_id,
        "display_name": author.display_name,
        "bio": author.bio,
        "photo_url": author.photo_url,
        "website_url": author.website_url,
        "twitter_handle": author.twitter_handle,
        "default_price_cents": author.default_price_cents,
        "accepts_publisher_requests": author.accepts_publisher_requests,
        "article_count": article_count,
        "created_at": author.created_at.isoformat() if author.created_at else None
    })


@bp.route("/author/profile/<int:author_id>", methods=["GET"])
@csrf.exempt
def author_profile_public(author_id: int):
    """Get public author profile."""
    from models import AuthorProfile
    
    author = AuthorProfile.query.get(author_id)
    if not author:
        return jsonify({"error": "Author not found"}), 404
    
    # Get published articles
    articles = Article.query.filter(
        Article.author_id == author.id,
        Article.status == "published"
    ).order_by(Article.created_at.desc()).limit(20).all()
    
    # Get total earnings (if author is current user)
    total_earnings = 0
    if current_user.is_authenticated and current_user.id == author.user_id:
        from models import AuthorEarnings
        total_earnings = db.session.query(
            func.coalesce(func.sum(AuthorEarnings.amount_cents), 0)
        ).filter(AuthorEarnings.author_id == author.id).scalar() or 0
    
    return jsonify({
        "id": author.id,
        "display_name": author.display_name,
        "bio": author.bio,
        "photo_url": author.photo_url,
        "website_url": author.website_url,
        "twitter_handle": author.twitter_handle,
        "article_count": len(articles),
        "total_earnings_cents": total_earnings if current_user.is_authenticated and current_user.id == author.user_id else None,
        "articles": [{
            "id": a.id,
            "slug": a.slug,
            "title": a.title,
            "dek": a.dek,
            "price_cents": a.price_cents,
            "cover_url": a.cover_url,
            "publisher_name": a.publisher.name if a.publisher else None,
            "created_at": a.created_at.isoformat() if a.created_at else None
        } for a in articles]
    })


@bp.route("/author/profile", methods=["PUT"])
@csrf.exempt
@login_required
def author_profile_update():
    """Update author profile."""
    from models import AuthorProfile
    
    author = AuthorProfile.query.filter_by(user_id=current_user.id).first()
    if not author:
        return jsonify({"error": "Author profile not found"}), 404
    
    payload = request.get_json(silent=True) or {}
    
    # Update fields
    if "display_name" in payload:
        author.display_name = payload["display_name"]
    if "bio" in payload:
        author.bio = payload["bio"]
    if "photo_url" in payload:
        author.photo_url = payload["photo_url"]
    if "website_url" in payload:
        author.website_url = payload["website_url"]
    if "twitter_handle" in payload:
        author.twitter_handle = payload["twitter_handle"]
    if "default_price_cents" in payload:
        author.default_price_cents = int(payload["default_price_cents"])
    if "accepts_publisher_requests" in payload:
        author.accepts_publisher_requests = bool(payload["accepts_publisher_requests"])
    
    db.session.commit()
    
    return jsonify({"ok": True})


@bp.route("/author/content", methods=["GET"])
@csrf.exempt
@login_required
def author_content_list():
    """List author's own content."""
    from models import AuthorProfile
    
    author = AuthorProfile.query.filter_by(user_id=current_user.id).first()
    if not author:
        return jsonify({"error": "Author profile not found"}), 404
    
    status_filter = request.args.get("status", "").strip()
    
    query = Article.query.filter(Article.author_id == author.id)
    
    if status_filter:
        query = query.filter(Article.status == status_filter)
    
    articles = query.order_by(Article.created_at.desc()).all()
    
    items = []
    for a in articles:
        # Get earnings for this article
        from models import AuthorEarnings
        earnings = db.session.query(
            func.coalesce(func.sum(AuthorEarnings.amount_cents), 0)
        ).filter(AuthorEarnings.article_id == a.id).scalar() or 0
        
        # Get read count
        reads = db.session.query(func.count(Transaction.id)).filter(
            Transaction.article_id == a.id,
            Transaction.type == "debit"
        ).scalar() or 0
        
        items.append({
            "id": a.id,
            "slug": a.slug,
            "title": a.title,
            "dek": a.dek,
            "price_cents": a.price_cents,
            "cover_url": a.cover_url,
            "status": a.status,
            "license_type": a.license_type,
            "publisher_name": a.publisher.name if a.publisher else None,
            "publisher_id": a.publisher_id,
            "earnings_cents": earnings,
            "reads": reads,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "updated_at": a.updated_at.isoformat() if a.updated_at else None
        })
    
    return jsonify({"articles": items})


@bp.route("/author/content/submit", methods=["POST"])
@csrf.exempt
@login_required
@limiter.limit("20/hour")
def author_content_submit():
    """Submit new article content."""
    from models import AuthorProfile
    
    author = AuthorProfile.query.filter_by(user_id=current_user.id).first()
    if not author:
        return jsonify({"error": "Author profile not found. Please register as an author first."}), 404
    
    payload = request.get_json(silent=True) or {}
    
    # Required fields
    title = payload.get("title", "").strip()
    body_html = payload.get("body_html", "").strip()
    
    if not title or not body_html:
        return jsonify({"error": "Title and body are required"}), 400
    
    # Generate slug from title
    import re
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    slug = f"{slug}-{datetime.utcnow().timestamp()}"[:255]
    
    # Create article
    article = Article(
        author_id=author.id,
        publisher_id=payload.get("publisher_id"),  # Optional
        slug=slug,
        title=title,
        dek=payload.get("dek", ""),
        author=author.display_name,
        media_type=payload.get("media_type", "html"),
        price_cents=payload.get("price_cents", author.default_price_cents),
        cover_url=payload.get("cover_url"),
        body_html=body_html,
        body_preview=payload.get("body_preview", body_html[:500]),
        license_type=payload.get("license_type", "independent"),
        custom_splits=payload.get("custom_splits"),  # JSON string
        status=payload.get("status", "published")  # draft or published
    )
    
    db.session.add(article)
    db.session.commit()
    
    # If has publisher and license, create license record
    if article.publisher_id and article.license_type in ["revenue_share", "buyout"]:
        from models import ContentLicense
        license = ContentLicense(
            article_id=article.id,
            author_id=author.id,
            publisher_id=article.publisher_id,
            license_type=article.license_type,
            split_config_json=article.custom_splits
        )
        db.session.add(license)
        db.session.commit()
    
    return jsonify({
        "ok": True,
        "article": {
            "id": article.id,
            "slug": article.slug,
            "title": article.title,
            "status": article.status,
            "price_cents": article.price_cents
        }
    }), 201


@bp.route("/author/content/<int:article_id>", methods=["PUT"])
@csrf.exempt
@login_required
def author_content_update(article_id: int):
    """Update article content."""
    from models import AuthorProfile
    
    author = AuthorProfile.query.filter_by(user_id=current_user.id).first()
    if not author:
        return jsonify({"error": "Author profile not found"}), 404
    
    article = Article.query.get(article_id)
    if not article or article.author_id != author.id:
        return jsonify({"error": "Article not found or not authorized"}), 404
    
    payload = request.get_json(silent=True) or {}
    
    # Update fields
    if "title" in payload:
        article.title = payload["title"]
    if "dek" in payload:
        article.dek = payload["dek"]
    if "body_html" in payload:
        article.body_html = payload["body_html"]
    if "body_preview" in payload:
        article.body_preview = payload["body_preview"]
    if "price_cents" in payload:
        article.price_cents = int(payload["price_cents"])
    if "cover_url" in payload:
        article.cover_url = payload["cover_url"]
    if "media_type" in payload:
        article.media_type = payload["media_type"]
    if "status" in payload:
        article.status = payload["status"]
    if "custom_splits" in payload:
        article.custom_splits = payload["custom_splits"]
    
    db.session.commit()
    
    return jsonify({"ok": True})


@bp.route("/author/content/<int:article_id>", methods=["DELETE"])
@csrf.exempt
@login_required
def author_content_delete(article_id: int):
    """Delete/unpublish article."""
    from models import AuthorProfile
    
    author = AuthorProfile.query.filter_by(user_id=current_user.id).first()
    if not author:
        return jsonify({"error": "Author profile not found"}), 404
    
    article = Article.query.get(article_id)
    if not article or article.author_id != author.id:
        return jsonify({"error": "Article not found or not authorized"}), 404
    
    # Check if article has been purchased
    purchase_count = db.session.query(func.count(Transaction.id)).filter(
        Transaction.article_id == article.id,
        Transaction.type == "debit"
    ).scalar() or 0
    
    if purchase_count > 0:
        # Don't delete, just unpublish
        article.status = "archived"
        db.session.commit()
        return jsonify({"ok": True, "message": "Article archived (has purchases)"})
    else:
        # Safe to delete
        db.session.delete(article)
        db.session.commit()
        return jsonify({"ok": True, "message": "Article deleted"})


@bp.route("/author/earnings", methods=["GET"])
@csrf.exempt
@login_required
def author_earnings():
    """Get author earnings dashboard."""
    from models import AuthorProfile, AuthorEarnings
    
    author = AuthorProfile.query.filter_by(user_id=current_user.id).first()
    if not author:
        return jsonify({"error": "Author profile not found"}), 404
    
    # Total earnings
    total_earnings = db.session.query(
        func.coalesce(func.sum(AuthorEarnings.amount_cents), 0)
    ).filter(AuthorEarnings.author_id == author.id).scalar() or 0
    
    # Last 30 days earnings
    since = datetime.utcnow() - timedelta(days=30)
    recent_earnings = db.session.query(
        func.coalesce(func.sum(AuthorEarnings.amount_cents), 0)
    ).filter(
        AuthorEarnings.author_id == author.id,
        AuthorEarnings.created_at >= since
    ).scalar() or 0
    
    # Top earning articles
    top_articles = db.session.query(
        Article.id,
        Article.title,
        Article.slug,
        func.sum(AuthorEarnings.amount_cents).label("earnings"),
        func.count(AuthorEarnings.id).label("sales")
    ).join(
        AuthorEarnings, AuthorEarnings.article_id == Article.id
    ).filter(
        AuthorEarnings.author_id == author.id
    ).group_by(Article.id).order_by(func.sum(AuthorEarnings.amount_cents).desc()).limit(10).all()
    
    # Recent earnings transactions
    recent_txns = AuthorEarnings.query.filter_by(
        author_id=author.id
    ).order_by(AuthorEarnings.created_at.desc()).limit(50).all()
    
    return jsonify({
        "total_earnings_cents": total_earnings,
        "last_30_days_cents": recent_earnings,
        "top_articles": [{
            "article_id": row[0],
            "title": row[1],
            "slug": row[2],
            "earnings_cents": row[3] or 0,
            "sales": row[4] or 0
        } for row in top_articles],
        "recent_transactions": [{
            "id": t.id,
            "amount_cents": t.amount_cents,
            "article_title": t.article.title if t.article else None,
            "publisher_name": t.publisher.name if t.publisher else None,
            "created_at": t.created_at.isoformat() if t.created_at else None
        } for t in recent_txns]
    })


# ========== ENHANCED PUBLISHER APIs (Content Curation) ==========

@bp.route("/publisher/available-content", methods=["GET"])
@csrf.exempt
def publisher_available_content():
    """Browse available author content for curation."""
    # Publishers can browse independent content or content from authors who accept requests
    from models import AuthorProfile
    
    # Filter params
    category = request.args.get("category", "").strip()
    min_price = request.args.get("min_price")
    max_price = request.args.get("max_price")
    author_id = request.args.get("author_id")
    
    query = Article.query.filter(
        Article.status == "published",
        Article.license_type.in_(["independent", "revenue_share"])
    ).join(
        AuthorProfile, Article.author_id == AuthorProfile.id
    ).filter(
        AuthorProfile.accepts_publisher_requests == True
    )
    
    if author_id:
        query = query.filter(Article.author_id == int(author_id))
    
    if min_price:
        query = query.filter(Article.price_cents >= int(min_price))
    if max_price:
        query = query.filter(Article.price_cents <= int(max_price))
    
    articles = query.order_by(Article.created_at.desc()).limit(50).all()
    
    items = []
    for a in articles:
        items.append({
            "id": a.id,
            "title": a.title,
            "dek": a.dek,
            "author_name": a.author_profile.display_name if a.author_profile else a.author,
            "author_id": a.author_id,
            "price_cents": a.price_cents,
            "cover_url": a.cover_url,
            "license_type": a.license_type,
            "created_at": a.created_at.isoformat() if a.created_at else None
        })
    
    return jsonify({"articles": items})


@bp.route("/publisher/add-content/<int:article_id>", methods=["POST"])
@csrf.exempt
def publisher_add_content(article_id: int):
    """Add author content to publisher's catalog."""
    # Requires publisher authentication (admin or publisher session)
    auth_result = _require_publisher_auth()
    if isinstance(auth_result, tuple):
        return auth_result
    
    publisher_id = session.get("publisher_id")
    if not publisher_id:
        return jsonify({"error": "Publisher ID required"}), 400
    
    article = Article.query.get(article_id)
    if not article:
        return jsonify({"error": "Article not found"}), 404
    
    # Check if already has a publisher
    if article.publisher_id and article.publisher_id != publisher_id:
        return jsonify({"error": "Article already belongs to another publisher"}), 400
    
    payload = request.get_json(silent=True) or {}
    
    # Set publisher
    article.publisher_id = publisher_id
    
    # Set license type and splits if provided
    if "license_type" in payload:
        article.license_type = payload["license_type"]
    if "custom_splits" in payload:
        article.custom_splits = payload["custom_splits"]
    
    db.session.commit()
    
    # Create license record
    from models import ContentLicense
    license = ContentLicense(
        article_id=article.id,
        author_id=article.author_id,
        publisher_id=publisher_id,
        license_type=article.license_type,
        split_config_json=article.custom_splits
    )
    db.session.add(license)
    db.session.commit()
    
    return jsonify({"ok": True, "article_id": article.id})


@bp.route("/publisher/content/<int:article_id>/splits", methods=["PUT"])
@csrf.exempt
def publisher_configure_splits(article_id: int):
    """Configure revenue split for specific article."""
    auth_result = _require_publisher_auth()
    if isinstance(auth_result, tuple):
        return auth_result
    
    publisher_id = session.get("publisher_id")
    
    article = Article.query.get(article_id)
    if not article or (article.publisher_id != publisher_id and not session.get("is_admin")):
        return jsonify({"error": "Article not found or not authorized"}), 404
    
    payload = request.get_json(silent=True) or {}
    splits = payload.get("splits", {})
    
    # Validate splits
    total_bps = sum(int(v) for v in splits.values())
    if total_bps > 10000:
        return jsonify({"error": "Split total exceeds 100%"}), 400
    
    # Store as JSON
    article.custom_splits = json.dumps(splits)
    db.session.commit()
    
    # Update license record
    from models import ContentLicense
    license = ContentLicense.query.filter_by(
        article_id=article.id,
        publisher_id=publisher_id
    ).first()
    
    if license:
        license.split_config_json = article.custom_splits
        db.session.commit()
    
    return jsonify({"ok": True, "total_bps": total_bps})


@bp.route("/publisher/authors", methods=["GET"])
@csrf.exempt
def publisher_authors():
    """List authors working with this publisher."""
    auth_result = _require_publisher_auth()
    if isinstance(auth_result, tuple):
        return auth_result
    
    publisher_id = session.get("publisher_id")
    
    # Get distinct authors who have content with this publisher
    from models import AuthorProfile, ContentLicense
    
    authors_query = db.session.query(
        AuthorProfile.id,
        AuthorProfile.display_name,
        AuthorProfile.photo_url,
        func.count(Article.id).label("article_count"),
        func.sum(Transaction.price_cents).label("total_revenue")
    ).join(
        Article, Article.author_id == AuthorProfile.id
    ).outerjoin(
        Transaction, Transaction.article_id == Article.id
    ).filter(
        Article.publisher_id == publisher_id
    ).group_by(AuthorProfile.id).all()
    
    authors = []
    for row in authors_query:
        authors.append({
            "author_id": row[0],
            "display_name": row[1],
            "photo_url": row[2],
            "article_count": row[3] or 0,
            "total_revenue_cents": row[4] or 0
        })
    
    return jsonify({"authors": authors})


@bp.route("/publisher/invite-author", methods=["POST"])
@csrf.exempt
def publisher_invite_author():
    """Invite author to submit content (placeholder for email invitation)."""
    auth_result = _require_publisher_auth()
    if isinstance(auth_result, tuple):
        return auth_result
    
    payload = request.get_json(silent=True) or {}
    email = payload.get("email", "").strip()
    
    if not email:
        return jsonify({"error": "Email required"}), 400
    
    # In production, send invitation email
    # For now, just return success
    
    return jsonify({
        "ok": True,
        "message": f"Invitation sent to {email}",
        "demo_note": "Email invitations not yet implemented in demo"
    })
