"""paypr developer platform — the /api/v1 machine-facing surface.

This is what turns paypr from a first-party newsstand into a general rail any
project can build on. Two audiences share one blueprint:

  * The **app owner** (a logged-in paypr reader) registers apps and manages API
    keys and their reader-facing grants — cookie-session auth, same as the SPA.
  * The **app itself** (a server) authenticates with an ``sk_…`` API key and
    creates pieces, meters charges, and reads events — no human cookie.

Every money move reuses the existing ledger/split/refund core (services.ledger,
services.payments), so an app's earnings are real, reconcilable balances on the
same journal as first-party publishers — not a parallel system.
"""
from __future__ import annotations

import json
import re
import secrets as _secrets
from datetime import datetime, timedelta
from functools import wraps

from flask import Blueprint, request, jsonify, g, current_app
from flask_login import login_required, current_user
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from extensions import db, csrf, limiter
from models import (
    Article, Transaction, Publisher, User, Event,
    DeveloperApp, ApiKey, AppReaderGrant, IdempotentOp,
)
from services import apikeys
from services.payments import split_purchase, split_amount, calculate_fees_cents
from services.ledger import (
    user_acct, payee_acct, add_entry, atomic_debit_user, credit_user,
    txn_ref, already_refunded, balance,
)
from services.tokens import issue_jwt, revoke_token
from services.events import track_event


bp = Blueprint("developer", __name__)

API_VERSION = "2026-06-30"


# ----------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------

def _err(msg, code=400, **extra):
    body = {"error": msg}
    body.update(extra)
    return jsonify(body), code


def _slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return s or "app"


def _unique_slug(base: str) -> str:
    """A slug not colliding with any Publisher or DeveloperApp."""
    slug = base
    while (
        Publisher.query.filter_by(slug=slug).first()
        or DeveloperApp.query.filter_by(slug=slug).first()
    ):
        slug = f"{base}-{_secrets.token_hex(2)}"
    return slug


def _key_rate_id():
    """Rate-limit bucket for key-authed routes: per API key when present (from the
    Authorization header — available before auth runs, so this works whatever the
    decorator order), else per client IP. Never stores the raw secret."""
    tok = apikeys.parse_bearer(request.headers.get("Authorization", ""))
    if tok:
        return "k:" + apikeys.hash_secret(tok)[:16]
    return request.remote_addr


def require_api_key(*needed_scopes):
    """Decorator: authenticate a server-to-server call via ``Authorization:
    Bearer sk_…``. Sets ``g.developer_app`` / ``g.api_key`` and enforces scopes.
    Runs *before* any rate-limit decorator so limits can be keyed per key."""
    def deco(fn):
        @wraps(fn)
        def inner(*args, **kwargs):
            token = apikeys.parse_bearer(request.headers.get("Authorization", ""))
            if not token:
                return _err("Missing or malformed API key. Send 'Authorization: Bearer sk_...'.", 401)
            row = ApiKey.query.filter_by(key_hash=apikeys.hash_secret(token)).first()
            if not row or not row.active:
                return _err("Invalid or revoked API key.", 401)
            app_row = DeveloperApp.query.get(row.app_id)
            if not app_row or not app_row.is_active:
                return _err("The app for this key is inactive.", 403)
            have = {s.strip() for s in (row.scopes or "").split(",") if s.strip()}
            missing = [s for s in needed_scopes if s not in have]
            if missing:
                return _err(f"API key missing required scope(s): {', '.join(missing)}", 403)
            g.api_key = row
            g.api_key_prefix = row.prefix
            g.developer_app = app_row
            # best-effort last-used stamp; never fail the request on it
            try:
                row.last_used_at = datetime.utcnow()
                db.session.commit()
            except Exception:
                db.session.rollback()
            return fn(*args, **kwargs)
        return inner
    return deco


def _app_public(app_row: DeveloperApp, include_keys=False) -> dict:
    earned = balance(f"publisher:{app_row.publisher_id}") if app_row.publisher_id else 0
    out = {
        "id": app_row.id,
        "name": app_row.name,
        "slug": app_row.slug,
        "description": app_row.description,
        "website_url": app_row.website_url,
        "publisher_id": app_row.publisher_id,
        "is_active": app_row.is_active,
        "earned_cents": earned,
        "created_at": app_row.created_at.isoformat() + "Z",
    }
    if include_keys:
        out["keys"] = [_key_public(k) for k in ApiKey.query.filter_by(app_id=app_row.id).order_by(ApiKey.id.desc()).all()]
    return out


def _key_public(k: ApiKey) -> dict:
    return {
        "id": k.id,
        "label": k.label,
        "mode": k.mode,
        "prefix": k.prefix,
        "last4": k.last4,
        "scopes": k.scopes,
        "active": k.active,
        "created_at": k.created_at.isoformat() + "Z",
        "last_used_at": (k.last_used_at.isoformat() + "Z") if k.last_used_at else None,
        "revoked_at": (k.revoked_at.isoformat() + "Z") if k.revoked_at else None,
    }


def _owner_app_or_404(app_id):
    app_row = DeveloperApp.query.get(app_id)
    if not app_row or app_row.owner_user_id != current_user.id:
        return None
    return app_row


def _charge_acct(role: str, app_row: DeveloperApp, article) -> str:
    """One consistent account mapping for both crediting a charge and reversing a
    refund — so metered charges (which have no Article) still reconcile exactly."""
    if article is not None:
        return payee_acct(role, article)
    if role == "publisher":
        return f"publisher:{app_row.publisher_id}" if app_row.publisher_id else "role:publisher"
    if role == "platform":
        return "platform"
    return f"role:{role}"


# ----------------------------------------------------------------------------
# app + key management  (owner session auth)
# ----------------------------------------------------------------------------

@bp.route("/apps", methods=["POST"])
@csrf.exempt
@limiter.limit("20/hour")
@login_required
def create_app_registration():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    if not name:
        return _err("An app name is required.", 400)

    slug = _unique_slug(_slugify(name))
    # Give the app its own creator (publisher) account so earnings accrue to a
    # real, payable ledger balance — identical plumbing to a first-party publisher.
    pub = Publisher(
        name=name,
        slug=slug,
        default_price_cents=int(payload.get("default_price_cents") or 25),
        category="Apps",
        strapline=(payload.get("description") or "")[:300] or None,
    )
    db.session.add(pub)
    db.session.flush()
    app_row = DeveloperApp(
        name=name,
        slug=slug,
        owner_user_id=current_user.id,
        publisher_id=pub.id,
        description=payload.get("description"),
        website_url=payload.get("website_url"),
        default_split_json=payload.get("default_split_json"),
    )
    db.session.add(app_row)
    db.session.commit()
    return jsonify({"ok": True, "app": _app_public(app_row, include_keys=True)}), 201


@bp.route("/apps", methods=["GET"])
@csrf.exempt
@login_required
def list_my_apps():
    apps = DeveloperApp.query.filter_by(owner_user_id=current_user.id).order_by(DeveloperApp.id.desc()).all()
    return jsonify({"apps": [_app_public(a, include_keys=True) for a in apps]})


@bp.route("/apps/<int:app_id>", methods=["GET"])
@csrf.exempt
@login_required
def get_my_app(app_id):
    app_row = _owner_app_or_404(app_id)
    if not app_row:
        return _err("App not found.", 404)
    return jsonify({"app": _app_public(app_row, include_keys=True)})


@bp.route("/apps/<int:app_id>/keys", methods=["POST"])
@csrf.exempt
@limiter.limit("30/hour")
@login_required
def issue_key(app_id):
    app_row = _owner_app_or_404(app_id)
    if not app_row:
        return _err("App not found.", 404)
    payload = request.get_json(silent=True) or {}
    mode = payload.get("mode", "test")
    if mode not in apikeys.VALID_MODES:
        return _err(f"mode must be one of {apikeys.VALID_MODES}", 400)

    secret = apikeys.new_secret(mode)
    key = ApiKey(
        app_id=app_row.id,
        label=(payload.get("label") or "").strip()[:120] or None,
        mode=mode,
        prefix=apikeys.display_prefix(secret),
        last4=apikeys.last4(secret),
        key_hash=apikeys.hash_secret(secret),
    )
    db.session.add(key)
    db.session.commit()
    # The plaintext is returned exactly once, here, and never stored.
    return jsonify({"ok": True, "secret": secret, "key": _key_public(key)}), 201


@bp.route("/keys/<int:key_id>/revoke", methods=["POST"])
@csrf.exempt
@login_required
def revoke_key(key_id):
    key = ApiKey.query.get(key_id)
    if not key or not (_owner_app_or_404(key.app_id)):
        return _err("Key not found.", 404)
    if key.active:
        key.revoked_at = datetime.utcnow()
        db.session.commit()
    return jsonify({"ok": True, "key": _key_public(key)})


@bp.route("/keys/<int:key_id>/rotate", methods=["POST"])
@csrf.exempt
@login_required
def rotate_key(key_id):
    old = ApiKey.query.get(key_id)
    if not old or not (_owner_app_or_404(old.app_id)):
        return _err("Key not found.", 404)
    if old.active:
        old.revoked_at = datetime.utcnow()
    secret = apikeys.new_secret(old.mode)
    new = ApiKey(
        app_id=old.app_id,
        label=old.label,
        mode=old.mode,
        prefix=apikeys.display_prefix(secret),
        last4=apikeys.last4(secret),
        key_hash=apikeys.hash_secret(secret),
        scopes=old.scopes,
    )
    db.session.add(new)
    db.session.commit()
    return jsonify({"ok": True, "secret": secret, "key": _key_public(new), "revoked_key_id": old.id})


# ----------------------------------------------------------------------------
# reader grants — a reader authorizes an app to meter their wallet (session auth)
# ----------------------------------------------------------------------------

@bp.route("/grants", methods=["POST"])
@csrf.exempt
@limiter.limit("30/hour")
@login_required
def create_grant():
    payload = request.get_json(silent=True) or {}
    slug = (payload.get("app_slug") or "").strip()
    app_row = DeveloperApp.query.filter_by(slug=slug).first()
    if not app_row:
        return _err("App not found.", 404)
    try:
        cap = int(payload.get("daily_cap_cents", 500))
    except (TypeError, ValueError):
        return _err("daily_cap_cents must be an integer.", 400)
    cap = max(0, min(cap, 50000))

    grant = (
        AppReaderGrant.query
        .filter_by(app_id=app_row.id, user_id=current_user.id, revoked_at=None)
        .first()
    )
    if grant:
        grant.daily_cap_cents = cap
    else:
        grant = AppReaderGrant(app_id=app_row.id, user_id=current_user.id, daily_cap_cents=cap)
        db.session.add(grant)
    db.session.commit()
    return jsonify({"ok": True, "grant": {
        "id": grant.id, "app_slug": app_row.slug, "app_name": app_row.name,
        "daily_cap_cents": grant.daily_cap_cents,
    }}), 201


@bp.route("/grants", methods=["GET"])
@csrf.exempt
@login_required
def list_grants():
    rows = (
        db.session.query(AppReaderGrant, DeveloperApp)
        .join(DeveloperApp, DeveloperApp.id == AppReaderGrant.app_id)
        .filter(AppReaderGrant.user_id == current_user.id, AppReaderGrant.revoked_at.is_(None))
        .all()
    )
    return jsonify({"grants": [
        {"id": gr.id, "app_slug": ap.slug, "app_name": ap.name, "daily_cap_cents": gr.daily_cap_cents}
        for gr, ap in rows
    ]})


@bp.route("/grants/<int:grant_id>/revoke", methods=["POST"])
@csrf.exempt
@login_required
def revoke_grant(grant_id):
    gr = AppReaderGrant.query.get(grant_id)
    if not gr or gr.user_id != current_user.id:
        return _err("Grant not found.", 404)
    if gr.revoked_at is None:
        gr.revoked_at = datetime.utcnow()
        db.session.commit()
    return jsonify({"ok": True})


# ----------------------------------------------------------------------------
# machine surface — API-key auth
# ----------------------------------------------------------------------------

@bp.route("/me", methods=["GET"])
@csrf.exempt
@require_api_key()
def whoami():
    app_row = g.developer_app
    return jsonify({
        "app": _app_public(app_row),
        "key": {"prefix": g.api_key.prefix, "mode": g.api_key.mode, "scopes": g.api_key.scopes},
        "api_version": API_VERSION,
    })


@bp.route("/pieces", methods=["POST"])
@csrf.exempt
@limiter.limit("120/minute", key_func=_key_rate_id)
@require_api_key("pieces:write")
def create_piece():
    app_row = g.developer_app
    payload = request.get_json(silent=True) or {}
    title = (payload.get("title") or "").strip()
    if not title:
        return _err("A piece 'title' is required.", 400)
    try:
        price_cents = int(payload.get("price_cents"))
    except (TypeError, ValueError):
        return _err("'price_cents' (integer) is required.", 400)
    if price_cents <= 0:
        return _err("'price_cents' must be positive.", 400)

    body_html = (payload.get("body_html") or "").strip()
    # A metered unit (a compute run) may carry no document body; keep the column
    # satisfied with a minimal placeholder so pieces and articles share one table.
    if not body_html:
        body_html = f"<p>{title}</p>"
    unit_label = (payload.get("unit_label") or "piece").strip()[:40]

    slug = _slugify(title)[:180] + "-" + _secrets.token_hex(3)
    article = Article(
        publisher_id=app_row.publisher_id,
        slug=slug,
        title=title,
        dek=(payload.get("dek") or f"{unit_label} · {app_row.name}")[:600],
        media_type=payload.get("media_type", "html"),
        price_cents=price_cents,
        body_html=body_html,
        body_preview=(payload.get("body_preview") or body_html[:280]),
        license_type=payload.get("license_type", "buyout"),
        custom_splits=(json.dumps(payload["split"]) if isinstance(payload.get("split"), dict) else payload.get("custom_splits")),
        status="published",
    )
    db.session.add(article)
    db.session.commit()
    return jsonify({"ok": True, "piece": _piece_public(article, unit_label)}), 201


def _piece_public(a: Article, unit_label="piece") -> dict:
    return {
        "id": a.id,
        "title": a.title,
        "slug": a.slug,
        "price_cents": a.price_cents,
        "unit_label": unit_label,
        "license_type": a.license_type,
        "status": a.status,
        "created_at": a.created_at.isoformat() + "Z",
    }


@bp.route("/pieces", methods=["GET"])
@csrf.exempt
@require_api_key("pieces:read")
def list_pieces():
    app_row = g.developer_app
    rows = (
        Article.query.filter_by(publisher_id=app_row.publisher_id)
        .order_by(Article.id.desc()).limit(100).all()
    )
    return jsonify({"pieces": [_piece_public(a) for a in rows]})


@bp.route("/pieces/<int:piece_id>", methods=["GET"])
@csrf.exempt
@require_api_key("pieces:read")
def get_piece(piece_id):
    app_row = g.developer_app
    a = Article.query.get(piece_id)
    if not a or a.publisher_id != app_row.publisher_id:
        return _err("Piece not found.", 404)
    return jsonify({"piece": _piece_public(a)})


@bp.route("/charges", methods=["POST"])
@csrf.exempt
@limiter.limit("300/minute", key_func=_key_rate_id)
@require_api_key("charges:write")
def create_charge():
    """Meter a charge against a reader's wallet — the pay-per-piece / pay-per-run
    primitive. Requires the reader to have granted this app a spending allowance;
    enforces the grant's daily cap; debits atomically and splits into the ledger
    in one transaction. Idempotent per ``idempotency_key``."""
    app_row = g.developer_app
    payload = request.get_json(silent=True) or {}

    reader_email = (payload.get("reader_email") or "").strip().lower()
    if not reader_email:
        return _err("'reader_email' is required.", 400)
    reader = User.query.filter_by(email=reader_email).first()
    if not reader:
        return _err("No paypr reader with that email. The reader must have a wallet and grant this app first.", 404)

    grant = (
        AppReaderGrant.query
        .filter_by(app_id=app_row.id, user_id=reader.id, revoked_at=None)
        .first()
    )
    if not grant:
        return _err("This reader has not authorized your app to charge their wallet.", 403,
                    reader_email=reader_email, grant_required=True)

    # Resolve price + split, from a registered piece or an ad-hoc metered amount.
    article = None
    piece_id = payload.get("piece_id")
    if piece_id is not None:
        try:
            piece_id = int(piece_id)
        except (TypeError, ValueError):
            return _err("piece_id must be an integer.", 400)
        article = Article.query.get(piece_id)
        if not article or article.publisher_id != app_row.publisher_id:
            return _err("piece_id not found for this app.", 404)
        price = article.price_cents or (app_row.publisher.default_price_cents if app_row.publisher else 25)
        split_amounts = split_purchase(price, article)
    else:
        try:
            price = int(payload.get("amount_cents"))
        except (TypeError, ValueError):
            return _err("Provide either 'piece_id' or 'amount_cents'.", 400)
        if price <= 0:
            return _err("'amount_cents' must be positive.", 400)
        if price > 50000:
            return _err("'amount_cents' exceeds the $500 per-charge ceiling.", 400)
        if isinstance(payload.get("split"), dict):
            bps = payload["split"]
        elif app_row.default_split_json:
            try:
                bps = json.loads(app_row.default_split_json)
            except Exception:
                bps = None
        else:
            bps = None
        if not bps:
            fee_bps = int(current_app.config.get("PLATFORM_FEE_BPS", 1000))
            bps = {"publisher": 10000 - fee_bps, "platform": fee_bps}
        split_amounts = split_amount(price, bps)

    description = (payload.get("description") or "").strip()[:300]
    idem = (payload.get("idempotency_key") or "").strip()[:100]
    idem_key = f"charge:{app_row.id}:{idem}" if idem else None

    # Idempotency: a retry with the same key returns the original result, never a
    # second debit. Claim the key inside the same transaction as the charge.
    op = None
    if idem_key:
        existing = IdempotentOp.query.filter_by(key=idem_key).first()
        if existing:
            if existing.response_json:
                return jsonify(json.loads(existing.response_json))
            return _err("A charge with this idempotency_key is still in progress.", 409)
        op = IdempotentOp(key=idem_key)
        db.session.add(op)
        try:
            db.session.flush()
        except IntegrityError:
            db.session.rollback()
            return _err("Duplicate idempotency_key.", 409)

    # Daily cap: this reader's net spend through THIS app in the last 24h.
    since = datetime.utcnow() - timedelta(days=1)
    debited = db.session.query(db.func.coalesce(db.func.sum(Transaction.price_cents), 0)).filter(
        Transaction.user_id == reader.id, Transaction.publisher_id == app_row.publisher_id,
        Transaction.created_at >= since, Transaction.type == "debit",
    ).scalar() or 0
    refunded = db.session.query(db.func.coalesce(db.func.sum(Transaction.price_cents), 0)).filter(
        Transaction.user_id == reader.id, Transaction.publisher_id == app_row.publisher_id,
        Transaction.created_at >= since, Transaction.type == "refund",
    ).scalar() or 0
    if (debited - refunded) + price > grant.daily_cap_cents:
        db.session.rollback()
        return _err("Reader's daily cap for this app would be exceeded.", 429,
                    daily_cap_cents=grant.daily_cap_cents, spent_cents=int(debited - refunded))

    if not atomic_debit_user(reader.id, price):
        db.session.rollback()
        return _err("Reader has insufficient balance.", 402)

    fee = split_amounts.get("platform", 0)
    net = price - fee
    try:
        txn = Transaction(
            user_id=reader.id,
            article_id=(article.id if article else None),
            publisher_id=app_row.publisher_id,
            price_cents=price, fee_cents=fee, net_cents=net, type="debit",
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
            split_breakdown_json=json.dumps(split_amounts),
        )
        db.session.add(txn)
        db.session.flush()
        ref = txn_ref(txn.id)
        add_entry(user_acct(reader.id), -price, "purchase", ref)
        for role, cents in split_amounts.items():
            if cents:
                add_entry(_charge_acct(role, app_row, article), int(cents), "split_credit", ref)
        if article is not None and article.author_id and split_amounts.get("author", 0) > 0:
            from models import AuthorEarnings
            db.session.add(AuthorEarnings(
                author_id=article.author_id, article_id=article.id, transaction_id=txn.id,
                amount_cents=split_amounts["author"],
                percentage=(split_amounts["author"] * 10000) // price if price > 0 else 0,
                publisher_id=article.publisher_id,
            ))
        token = issue_jwt(reader.id, (article.id if article else 0), app_row.publisher_id, exp_minutes=10)
        bal = db.session.execute(text("SELECT wallet_cents FROM users WHERE id=:id"), {"id": reader.id}).scalar()
        result = {
            "ok": True,
            "charge_id": txn.id,
            "access_token": token,
            "price_cents": price,
            "reader_balance_cents": int(bal or 0),
            "split": split_amounts,
            "mode": g.api_key.mode,
            "piece_id": (article.id if article else None),
            "description": description or None,
        }
        if op is not None:
            op.response_json = json.dumps(result)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return _err("Charge could not be completed.", 500)

    track_event("api_charge", article_id=(article.id if article else None),
                publisher_id=app_row.publisher_id,
                metadata={"app": app_row.slug, "price_cents": price, "mode": g.api_key.mode})
    return jsonify(result), 201


@bp.route("/charges/<int:charge_id>/refund", methods=["POST"])
@csrf.exempt
@limiter.limit("60/minute", key_func=_key_rate_id)
@require_api_key("charges:write")
def refund_charge(charge_id):
    """Reverse a metered charge — returns the reader's money and reverses every
    payee leg on the ledger, exactly once, within the refund window."""
    app_row = g.developer_app
    orig = Transaction.query.get(charge_id)
    if not orig or orig.publisher_id != app_row.publisher_id or orig.type != "debit":
        return _err("Charge not found for this app.", 404)
    if (datetime.utcnow() - orig.created_at) > timedelta(minutes=10):
        return _err("Refund window (10 min) closed.", 400)
    if already_refunded(orig.id):
        return _err("Already refunded.", 409)

    ref = txn_ref(orig.id)
    try:
        orig_split = json.loads(orig.split_breakdown_json) if orig.split_breakdown_json else {}
    except Exception:
        orig_split = {}
    article = orig.article  # may be None for a metered run
    try:
        refund_txn = Transaction(
            user_id=orig.user_id, article_id=orig.article_id, publisher_id=orig.publisher_id,
            price_cents=orig.price_cents, fee_cents=0, net_cents=-orig.price_cents, type="refund",
            ip_address=request.remote_addr, user_agent=request.headers.get("User-Agent"),
        )
        db.session.add(refund_txn)
        credit_user(orig.user_id, orig.price_cents)
        add_entry(user_acct(orig.user_id), orig.price_cents, "refund", ref)
        for role, cents in (orig_split or {}).items():
            if cents:
                add_entry(_charge_acct(role, app_row, article), -int(cents), "refund_reversal", ref)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return _err("Refund could not be completed.", 500)

    token = (payload := request.get_json(silent=True) or {}).get("access_token")
    if token:
        revoke_token(token)
    bal = db.session.execute(text("SELECT wallet_cents FROM users WHERE id=:id"), {"id": orig.user_id}).scalar()
    return jsonify({"ok": True, "refund_id": refund_txn.id, "reader_balance_cents": int(bal or 0)})


@bp.route("/events", methods=["GET"])
@csrf.exempt
@require_api_key("events:read")
def list_events():
    app_row = g.developer_app
    try:
        limit = min(max(int(request.args.get("limit", 50) or 50), 1), 200)
    except Exception:
        limit = 50
    rows = (
        Event.query.filter_by(publisher_id=app_row.publisher_id)
        .order_by(Event.id.desc()).limit(limit).all()
    )
    def _row(e):
        try:
            meta = json.loads(e.metadata_json) if e.metadata_json else {}
        except Exception:
            meta = {}
        return {"id": e.id, "event": e.event_name, "article_id": e.article_id,
                "created_at": e.created_at.isoformat() + "Z", "metadata": meta}
    return jsonify({"events": [_row(e) for e in rows]})
