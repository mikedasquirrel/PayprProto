#!/usr/bin/env python3
"""Server-to-server example of the paypr developer platform (/api/v1).

A "Sentiment API" app charges a reader a few cents *per model run* — the
pay-per-compute case that makes paypr a metered access layer, not just a
paywall. This script spins paypr up on a throwaway database and drives the whole
machine-facing lifecycle over the real HTTP API:

    register app  ->  mint API key  ->  register a piece (one run)
    reader grants the app a daily allowance  ->  reader funds wallet
    app meters a charge with the key  ->  refund  ->  reconcile the ledger

Run:  python examples/metered_compute_integration.py
"""
import json
import os
import sys
import tempfile

os.environ["FLASK_ENV"] = "development"
_DB = os.path.join(tempfile.gettempdir(), "paypr_example_metered.db")
if os.path.exists(_DB):
    os.remove(_DB)
os.environ["DATABASE_URL"] = f"sqlite:///{_DB}"
os.environ["WELCOME_CREDIT_CENTS"] = "0"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app                          # noqa: E402
from extensions import db                            # noqa: E402
from models import User                              # noqa: E402
from services.ledger import balance, user_acct       # noqa: E402

app = create_app()
app.config.update(TESTING=True, WTF_CSRF_ENABLED=False)


def money(c):
    return f"${(c or 0) / 100:,.2f}"


def hr(title):
    print("\n" + "─" * 72 + f"\n  {title}\n" + "─" * 72)


def call(client, method, path, body=None, headers=None, note=""):
    print(f"\n→ {method} {path}" + (f"   {note}" if note else ""))
    if body is not None:
        print(f"    body: {json.dumps(body)}")
    resp = client.open(path, method=method, json=body, headers=headers or {})
    try:
        data = resp.get_json()
    except Exception:
        data = resp.data.decode()[:200]
    shown = dict(data) if isinstance(data, dict) else data
    if isinstance(shown, dict) and "secret" in shown:
        shown["secret"] = shown["secret"][:16] + "…(hidden)"
    if isinstance(shown, dict) and "access_token" in shown and shown["access_token"]:
        shown["access_token"] = shown["access_token"][:14] + "…"
    print(f"← {resp.status_code}  {json.dumps(shown)}")
    return resp.status_code, data


# Two independent sessions (separate cookie jars): the app owner and the reader.
owner = app.test_client()
reader = app.test_client()


def ledger_table(title, app_pub_id, reader_email):
    with app.app_context():
        r = User.query.filter_by(email=reader_email).first()
        rows = [
            ("reader wallet", money(r.wallet_cents if r else 0)),
            ("↳ reader ledger", money(balance(user_acct(r.id)) if r else 0)),
            ("app  (publisher acct)", money(balance(f"publisher:{app_pub_id}"))),
            ("platform (paypr fee)", money(balance("platform"))),
        ]
    print(f"\n  {title}")
    for k, v in rows:
        print(f"    {k:<24} {v:>10}")


hr("1) The app owner signs in and registers an app")
call(owner, "POST", "/api/auth/login", {"email": "founder@sentiment.example"})
_, appres = call(owner, "POST", "/api/v1/apps",
                 {"name": "Sentiment API", "description": "charges per model run"})
app_obj = appres["app"]
app_id, app_slug, app_pub_id = app_obj["id"], app_obj["slug"], app_obj["publisher_id"]
print(f"    app #{app_id} slug='{app_slug}' → creator ledger account publisher:{app_pub_id}")

hr("2) Owner mints a test API key (shown once)")
_, keyres = call(owner, "POST", f"/api/v1/apps/{app_id}/keys", {"mode": "test", "label": "demo"})
SECRET = keyres["secret"]
KEY_HEADERS = {"Authorization": f"Bearer {SECRET}"}
print(f"    minted {keyres['key']['prefix']}…{keyres['key']['last4']}  (full secret captured by the app)")

hr("3) The app identifies itself with the key, then registers a piece (one run)")
call(owner, "GET", "/api/v1/me", headers=KEY_HEADERS, note="(key auth — no cookie)")
_, piece = call(owner, "POST", "/api/v1/pieces",
                {"title": "Sentiment run — batch #8", "price_cents": 25, "unit_label": "run"},
                headers=KEY_HEADERS)
piece_id = piece["piece"]["id"]

hr("4) A reader signs in, authorizes the app (daily cap $2), and funds the wallet")
call(reader, "POST", "/api/auth/login", {"email": "reader@example.com"})
call(reader, "POST", "/api/v1/grants", {"app_slug": app_slug, "daily_cap_cents": 200})
call(reader, "POST", "/api/account/topup", {"amount_cents": 500}, note="(dev funding; prod = Stripe)")
ledger_table("Ledger before any charge:", app_pub_id, "reader@example.com")

hr("5) The app meters a charge for one run — atomic debit + exact split")
_, charge = call(owner, "POST", "/api/v1/charges",
                 {"reader_email": "reader@example.com", "piece_id": piece_id,
                  "idempotency_key": "run-8f3a"}, headers=KEY_HEADERS)
print(f"    split: {charge['split']}  reader balance now {money(charge['reader_balance_cents'])}")
ledger_table("Ledger after the charge:", app_pub_id, "reader@example.com")

hr("6) Idempotency — the same idempotency_key does NOT charge twice")
_, again = call(owner, "POST", "/api/v1/charges",
                {"reader_email": "reader@example.com", "piece_id": piece_id,
                 "idempotency_key": "run-8f3a"}, headers=KEY_HEADERS)
print(f"    returned original charge_id {again['charge_id']} — no second debit")

hr("7) The app refunds the run — every ledger leg reverses")
call(owner, "POST", f"/api/v1/charges/{charge['charge_id']}/refund", headers=KEY_HEADERS)
ledger_table("Ledger after the refund:", app_pub_id, "reader@example.com")

hr("8) A charge without a grant is refused (defense: reader must opt in)")
stranger = app.test_client()
stranger.post("/api/auth/login", json={"email": "stranger@example.com"})
call(owner, "POST", "/api/v1/charges",
     {"reader_email": "stranger@example.com", "amount_cents": 25}, headers=KEY_HEADERS,
     note="(expect 403 — no grant)")

hr("9) Reconciliation — the cached wallet equals the journal")
with app.app_context():
    r = User.query.filter_by(email="reader@example.com").first()
    w, l = r.wallet_cents, balance(user_acct(r.id))
    print(f"    reader.wallet_cents = {w}   SUM(reader ledger) = {l}   match: {w == l}")
    assert w == l, "ledger reconciliation failed"
    assert w == 500, f"expected reader back to $5.00 after refund, got {money(w)}"
print("\n✓ Metered pay-per-compute lifecycle exercised over /api/v1: key auth, piece, "
      "grant, charge, idempotency, refund, reconciliation.\n")
