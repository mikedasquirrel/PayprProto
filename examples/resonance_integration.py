#!/usr/bin/env python3
"""A non-FreeSpeak, full-force example of the paypr API.

Resonance (the "recover the maker's hand" experiment) publishes a paid *finding*
and charges a few cents to unlock it. This script spins paypr up on a throwaway
database and drives the entire reader lifecycle through the real HTTP API —
login, fund, preview, pay, verify, external-unlock, reveal, refund — printing the
request/response transcript and the ledger the money lands in.

Run:  python examples/resonance_integration.py
"""
import json
import os
import sys
import tempfile

# --- configure a throwaway app BEFORE importing it --------------------------
os.environ["FLASK_ENV"] = "development"
_DB = os.path.join(tempfile.gettempdir(), "paypr_example_resonance.db")
if os.path.exists(_DB):
    os.remove(_DB)
os.environ["DATABASE_URL"] = f"sqlite:///{_DB}"
os.environ["WELCOME_CREDIT_CENTS"] = "0"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app                     # noqa: E402
from extensions import db                       # noqa: E402
from models import User, Publisher, Article, AuthorProfile  # noqa: E402
from services.ledger import balance, user_acct  # noqa: E402

app = create_app()
app.config.update(TESTING=True, WTF_CSRF_ENABLED=False)


def money(c):
    return f"${(c or 0) / 100:,.2f}"


def hr(title):
    print("\n" + "─" * 70 + f"\n  {title}\n" + "─" * 70)


def call(client, method, path, body=None, note=""):
    print(f"\n→ {method} {path}" + (f"   {note}" if note else ""))
    if body is not None:
        print(f"    body: {json.dumps(body)}")
    resp = client.open(path, method=method, json=body)
    try:
        data = resp.get_json()
    except Exception:
        data = resp.data.decode()[:200]
    print(f"← {resp.status_code}  {json.dumps(data)}")
    return resp.status_code, data


# --- 1. Seed: Resonance as a creator, one paid finding ----------------------
with app.app_context():
    maker = User(email="maker@resonance.example", wallet_cents=0)
    db.session.add(maker)
    db.session.commit()
    author = AuthorProfile(user_id=maker.id, display_name="The Maker", bio="Recovers a hand from a blinded transform.")
    resonance = Publisher(name="Resonance", slug="resonance", default_price_cents=199,
                          default_author_split_bps=6000, category="Research",
                          strapline="Can a machine recover a maker's hand?")
    db.session.add_all([author, resonance])
    db.session.commit()
    finding = Article(
        publisher_id=resonance.id, author_id=author.id, slug="hand-from-blinded-transform",
        title="Finding 001 — the hand survives the blinding",
        dek="A blinded stylometric transform still leaks the maker's hand at p < 0.01.",
        body_preview="We blinded 240 samples and asked whether authorship survives. Preview: it does — but the mechanism is not the one we expected…",
        body_html="<h1>The hand survives the blinding</h1><p>Across 240 blinded samples, a recovered-hand classifier held at 0.83 F1… [full finding, methods, and the twist].</p>",
        price_cents=199, license_type="revenue_share", status="published",
    )
    db.session.add(finding)
    db.session.commit()
    art_id, pub_id, author_id = finding.id, resonance.id, author.id
    print(f"Seeded: publisher 'Resonance' (#{pub_id}), author 'The Maker' (#{author_id}), "
          f"finding #{art_id} priced {money(199)} (60/30/10 revenue share).")

client = app.test_client()


def ledger_table(title):
    with app.app_context():
        reader = User.query.filter_by(email="reader@example.com").first()
        rows = [
            ("reader wallet", money(reader.wallet_cents if reader else 0)),
            ("↳ reader ledger", money(balance(user_acct(reader.id)) if reader else 0)),
            ("author  (The Maker)", money(balance(f"author:{author_id}"))),
            ("publisher (Resonance)", money(balance(f"publisher:{pub_id}"))),
            ("platform (paypr fee)", money(balance("platform"))),
        ]
    print(f"\n  {title}")
    for k, v in rows:
        print(f"    {k:<24} {v:>10}")


# --- 2. Reader lifecycle over the real API ----------------------------------
hr("1) Reader signs in — starts with an empty wallet")
call(client, "POST", "/api/auth/login", {"email": "reader@example.com"})

hr("2) Reader sees the finding — locked (preview only)")
_, art = call(client, "GET", f"/api/articles/{art_id}", note="(no body_html yet)")
print(f"    unlocked? {art.get('unlocked')}   showing: body_preview")

hr("3) Reader funds the wallet ($5.00)")
call(client, "POST", "/api/account/topup", {"amount_cents": 500}, note="(dev; prod uses /topup/checkout → Stripe)")

hr("4) Reader pays to unlock — atomic debit + exact split into the ledger")
_, pay = call(client, "POST", "/api/pay", {"article_id": art_id})
token = pay["access_token"]
print(f"    split (cents): {pay['split']}  →  author {money(pay['split'].get('author',0))}, "
      f"Resonance {money(pay['split'].get('publisher',0))}, platform {money(pay['split'].get('platform',0))}")
ledger_table("Ledger after the sale:")

hr("5) Access is proven two ways")
call(client, "POST", "/api/verify", {"access_token": token, "article_id": art_id}, note="(same-origin verify)")
call(client, "GET", f"/paypr/unlock?token={token}", note="(external verify, no session — for your own origin)")
_, art2 = call(client, "GET", f"/api/articles/{art_id}", note="(now unlocked)")
print(f"    unlocked? {art2.get('unlocked')}   body_html present: {bool(art2.get('body_html'))}")

hr("6) Reader refunds within the 10-minute window — every leg reverses")
call(client, "POST", "/api/refund", {"transaction_id": pay["transaction_id"]})
ledger_table("Ledger after the refund (all creator legs reversed):")

# --- 3. Reconciliation ------------------------------------------------------
hr("7) Reconciliation — the cached wallet equals the journal")
with app.app_context():
    reader = User.query.filter_by(email="reader@example.com").first()
    w, l = reader.wallet_cents, balance(user_acct(reader.id))
    print(f"    reader.wallet_cents = {w}   SUM(reader ledger) = {l}   match: {w == l}")
    assert w == l, "ledger reconciliation failed"
print("\n✓ Full paypr reader lifecycle exercised over the API, splits paid, refund reversed, ledger reconciled.\n")
