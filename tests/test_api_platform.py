"""Money-critical tests for the /api/v1 developer platform: key auth, the reader
grant gate, metered charges (atomic debit + exact split + ledger reconciliation),
idempotency, the daily cap, and refund reversal.

Run:  python -m pytest tests/test_api_platform.py -q
"""
from __future__ import annotations

import json

from extensions import db
from models import User
from services.ledger import balance, user_acct


# --- helpers ----------------------------------------------------------------

def _login(client, email):
    return client.post("/api/auth/login", json={"email": email})


def _register_app_and_key(app, owner_email="owner@example.com", name="Sentiment API"):
    owner = app.test_client()
    _login(owner, owner_email)
    r = owner.post("/api/v1/apps", json={"name": name, "description": "per-run charges"})
    assert r.status_code == 201, r.get_json()
    app_obj = r.get_json()["app"]
    k = owner.post(f"/api/v1/apps/{app_obj['id']}/keys", json={"mode": "test"})
    assert k.status_code == 201, k.get_json()
    return owner, app_obj, k.get_json()["secret"], k.get_json()["key"]["id"]


def _hdr(secret):
    return {"Authorization": f"Bearer {secret}"}


def _wallet(app, email):
    with app.app_context():
        u = User.query.filter_by(email=email).first()
        return u.wallet_cents, balance(user_acct(u.id))


# --- app registration + key auth -------------------------------------------

def test_app_registration_creates_creator_account(app):
    owner, app_obj, secret, _ = _register_app_and_key(app)
    assert app_obj["slug"]
    assert app_obj["publisher_id"]  # its own payable ledger account
    assert secret.startswith("sk_test_")


def test_key_authenticates_and_secret_is_write_once(app):
    owner, app_obj, secret, key_id = _register_app_and_key(app)

    me = app.test_client().get("/api/v1/me", headers=_hdr(secret))
    assert me.status_code == 200
    assert me.get_json()["app"]["slug"] == app_obj["slug"]

    # The plaintext secret is never returned again by any listing.
    listing = owner.get("/api/v1/apps").get_json()
    assert secret not in json.dumps(listing)


def test_bad_and_revoked_keys_are_rejected(app):
    owner, app_obj, secret, key_id = _register_app_and_key(app)
    assert app.test_client().get("/api/v1/me", headers=_hdr("sk_test_not_a_real_key_xxx")).status_code == 401
    assert app.test_client().get("/api/v1/me").status_code == 401  # no header

    owner.post(f"/api/v1/keys/{key_id}/revoke")
    assert app.test_client().get("/api/v1/me", headers=_hdr(secret)).status_code == 401


def test_rotate_supersedes_old_key(app):
    owner, app_obj, secret, key_id = _register_app_and_key(app)
    res = owner.post(f"/api/v1/keys/{key_id}/rotate").get_json()
    new_secret = res["secret"]
    assert new_secret != secret
    assert app.test_client().get("/api/v1/me", headers=_hdr(new_secret)).status_code == 200
    assert app.test_client().get("/api/v1/me", headers=_hdr(secret)).status_code == 401


# --- pieces -----------------------------------------------------------------

def test_create_and_list_pieces_with_key(app):
    owner, app_obj, secret, _ = _register_app_and_key(app)
    r = app.test_client().post("/api/v1/pieces",
                               json={"title": "Run #8", "price_cents": 25, "unit_label": "run"},
                               headers=_hdr(secret))
    assert r.status_code == 201, r.get_json()
    pid = r.get_json()["piece"]["id"]
    lst = app.test_client().get("/api/v1/pieces", headers=_hdr(secret)).get_json()
    assert any(p["id"] == pid for p in lst["pieces"])


# --- the charge: grant gate, split, reconciliation --------------------------

def _setup_charge_ready(app, cap=200):
    owner, app_obj, secret, _ = _register_app_and_key(app)
    piece = app.test_client().post(
        "/api/v1/pieces", json={"title": "Run", "price_cents": 25}, headers=_hdr(secret)
    ).get_json()["piece"]
    reader = app.test_client()
    _login(reader, "reader@example.com")
    reader.post("/api/account/topup", json={"amount_cents": 500})
    return owner, app_obj, secret, piece, reader


def test_charge_requires_a_grant(app):
    owner, app_obj, secret, piece, reader = _setup_charge_ready(app)
    r = app.test_client().post("/api/v1/charges",
                               json={"reader_email": "reader@example.com", "piece_id": piece["id"]},
                               headers=_hdr(secret))
    assert r.status_code == 403
    assert r.get_json().get("grant_required") is True


def test_metered_charge_debits_splits_and_reconciles(app):
    owner, app_obj, secret, piece, reader = _setup_charge_ready(app)
    reader.post("/api/v1/grants", json={"app_slug": app_obj["slug"], "daily_cap_cents": 200})

    r = app.test_client().post(
        "/api/v1/charges",
        json={"reader_email": "reader@example.com", "piece_id": piece["id"], "idempotency_key": "run-1"},
        headers=_hdr(secret),
    )
    assert r.status_code == 201, r.get_json()
    body = r.get_json()
    assert sum(body["split"].values()) == 25          # exact split
    assert body["reader_balance_cents"] == 475

    wallet, ledger = _wallet(app, "reader@example.com")
    assert wallet == ledger == 475                     # cached == journal
    with app.app_context():
        assert balance(f"publisher:{app_obj['publisher_id']}") == body["split"].get("publisher", 0)
        # every cent of the price is now somewhere in the ledger, netting to zero
        assert balance("platform") == body["split"].get("platform", 0)


def test_charge_is_idempotent(app):
    owner, app_obj, secret, piece, reader = _setup_charge_ready(app)
    reader.post("/api/v1/grants", json={"app_slug": app_obj["slug"], "daily_cap_cents": 200})
    payload = {"reader_email": "reader@example.com", "piece_id": piece["id"], "idempotency_key": "dup"}
    first = app.test_client().post("/api/v1/charges", json=payload, headers=_hdr(secret)).get_json()
    second = app.test_client().post("/api/v1/charges", json=payload, headers=_hdr(secret)).get_json()
    assert first["charge_id"] == second["charge_id"]   # same charge, no second debit
    wallet, _ = _wallet(app, "reader@example.com")
    assert wallet == 475


def test_daily_cap_is_enforced(app):
    owner, app_obj, secret, piece, reader = _setup_charge_ready(app)
    reader.post("/api/v1/grants", json={"app_slug": app_obj["slug"], "daily_cap_cents": 50})
    c = app.test_client()
    # first 25 ok
    assert c.post("/api/v1/charges", json={"reader_email": "reader@example.com", "piece_id": piece["id"]},
                  headers=_hdr(secret)).status_code == 201
    # an ad-hoc 50 would push net spend to 75 > cap 50
    over = c.post("/api/v1/charges", json={"reader_email": "reader@example.com", "amount_cents": 50},
                  headers=_hdr(secret))
    assert over.status_code == 429


def test_refund_reverses_every_leg(app):
    owner, app_obj, secret, piece, reader = _setup_charge_ready(app)
    reader.post("/api/v1/grants", json={"app_slug": app_obj["slug"], "daily_cap_cents": 200})
    charge = app.test_client().post(
        "/api/v1/charges", json={"reader_email": "reader@example.com", "piece_id": piece["id"]},
        headers=_hdr(secret),
    ).get_json()

    ref = app.test_client().post(f"/api/v1/charges/{charge['charge_id']}/refund", headers=_hdr(secret))
    assert ref.status_code == 200
    wallet, ledger = _wallet(app, "reader@example.com")
    assert wallet == ledger == 500                     # fully restored
    with app.app_context():
        assert balance(f"publisher:{app_obj['publisher_id']}") == 0
        assert balance("platform") == 0

    # a second refund is refused
    again = app.test_client().post(f"/api/v1/charges/{charge['charge_id']}/refund", headers=_hdr(secret))
    assert again.status_code == 409


def test_insufficient_balance_is_rejected(app):
    owner, app_obj, secret, _ = _register_app_and_key(app)
    poor = app.test_client()
    _login(poor, "poor@example.com")            # 0 balance
    poor.post("/api/v1/grants", json={"app_slug": app_obj["slug"], "daily_cap_cents": 5000})
    r = app.test_client().post("/api/v1/charges",
                               json={"reader_email": "poor@example.com", "amount_cents": 100},
                               headers=_hdr(secret))
    assert r.status_code == 402
