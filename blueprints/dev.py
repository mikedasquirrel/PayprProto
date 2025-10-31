from flask import Blueprint, jsonify, request, render_template, redirect, url_for, flash
from flask_login import login_user
from flask_login import login_required

from extensions import db, csrf
from services.seed_data import reseed_demo


bp = Blueprint("dev", __name__)


@bp.route("/dev/reseed", methods=["POST"])  # dev only
@csrf.exempt
@login_required
def reseed():
    payload = request.get_json(silent=True) or {}
    pubs = int(payload.get("num_publishers", 3))
    arts = int(payload.get("articles_per_publisher", 5))
    tiers = payload.get("price_tiers_cents")
    if isinstance(tiers, list):
        tiers = [int(x) for x in tiers]
    cats = payload.get("categories")
    if isinstance(cats, list):
        cats = [str(x) for x in cats]
    stats = reseed_demo(
        num_publishers=pubs,
        articles_per_publisher=arts,
        price_tiers_cents=tiers,
        categories=cats,
    )
    return jsonify({"ok": True, **stats})


@bp.route("/dev/tools", methods=["GET"])  # simple form for reseed
def tools_page():
    return render_template("dev_tools.html")


@bp.route("/dev/instant", methods=["GET"])  # one-click: create/login demo user and reseed
def instant():
    try:
        from models import User
        from extensions import db
        email = "demo@paypr.test"
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(email=email, wallet_cents=2500)
            db.session.add(user)
            db.session.commit()
        login_user(user, remember=True)
        stats = reseed_demo(num_publishers=24, articles_per_publisher=8, price_tiers_cents=[10,15,25,39,50,75,99])
        flash(f"Signed in as {email}. Seeded {stats['publishers']} pubs / {stats['articles']} articles.", "success")
    except Exception as e:
        flash(f"Instant setup failed: {e}", "error")
    return redirect(url_for("public.newsstand"))


@bp.route("/dev/reset", methods=["POST"])  # dangerous dev-only reset
@csrf.exempt
def reset_db():
    from extensions import db
    try:
        db.drop_all(); db.create_all()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
