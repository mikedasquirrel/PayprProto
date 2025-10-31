from __future__ import annotations

from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_user, logout_user, login_required, current_user
import stripe
import json

from extensions import db, csrf
from models import User, Transaction, MagicLogin
from services.schemas import TopupRequestSchema
from flask import current_app
from datetime import datetime, timedelta
import secrets


bp = Blueprint("account", __name__)


@bp.route("/login", methods=["GET", "POST"])  # dev quick login
@csrf.exempt
def login():
    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()
        if not email:
            flash("Enter an email to sign in.", "error")
            return redirect(url_for("account.login"))
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(email=email, wallet_cents=500)  # $5 starter in dev
            db.session.add(user)
            db.session.commit()
        login_user(user, remember=True)
        flash("Signed in.", "success")
        return redirect(url_for("public.newsstand"))
    return render_template("account_login.html")


@bp.route("/login/magic", methods=["GET", "POST"])  # magic link request form
@csrf.exempt
def login_magic():
    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()
        if not email:
            flash("Enter an email.", "error")
            return redirect(url_for("account.login_magic"))
        token = secrets.token_urlsafe(24)
        ml = MagicLogin(email=email, token=token, expires_at=datetime.utcnow() + timedelta(minutes=15))
        db.session.add(ml)
        db.session.commit()
        link = url_for("account.login_verify", token=token, _external=True)
        flash(f"Magic link (demo): {link}", "info")
        return redirect(url_for("account.login_magic"))
    return render_template("account_magic.html")


@bp.route("/login/verify")  # magic link click
def login_verify():
    token = (request.args.get("token") or "").strip()
    if not token:
        flash("Missing token.", "error")
        return redirect(url_for("account.login_magic"))
    ml = MagicLogin.query.filter_by(token=token).first()
    if not ml or ml.expires_at < datetime.utcnow():
        flash("Invalid or expired link.", "error")
        return redirect(url_for("account.login_magic"))
    user = User.query.filter_by(email=ml.email).first()
    if not user:
        user = User(email=ml.email, wallet_cents=0)
        db.session.add(user)
        db.session.commit()
    login_user(user, remember=True)
    try:
        db.session.delete(ml)
        db.session.commit()
    except Exception:
        db.session.rollback()
    flash("Signed in via magic link.", "success")
    return redirect(url_for("public.newsstand"))


@bp.route("/logout")
@login_required
def logout():
    logout_user()
    flash("Signed out.", "info")
    return redirect(url_for("public.newsstand"))


@bp.route("/wallet")
@login_required
def wallet():
    return render_template("account_wallet.html")


@bp.route("/wallet/topup", methods=["POST"])  # faux top-up for dev
@csrf.exempt
@login_required
def wallet_topup():
    amount_cents = int(request.form.get("amount_cents") or 0)
    if amount_cents <= 0:
        flash("Invalid amount.", "error")
        return redirect(url_for("account.wallet"))
    current_user.wallet_cents = (current_user.wallet_cents or 0) + amount_cents
    db.session.commit()
    flash(f"Wallet topped up by ${amount_cents/100:.2f}.", "success")
    return redirect(url_for("account.wallet"))


@bp.route("/wallet/topup/stripe", methods=["POST"])  # test-only server-confirmed intent
@csrf.exempt
@login_required
def wallet_topup_stripe():
    data = TopupRequestSchema().load(request.get_json(silent=True) or {})
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


@bp.route("/history")
@login_required
def history():
    txns = (
        Transaction.query.filter_by(user_id=current_user.id)
        .order_by(Transaction.created_at.desc())
        .all()
    )
    entries = []
    for t in txns:
        split = None
        try:
            if t.split_breakdown_json:
                split = json.loads(t.split_breakdown_json)
        except Exception:
            split = None
        entries.append({"t": t, "split": split})
    return render_template("account_history.html", entries=entries)
