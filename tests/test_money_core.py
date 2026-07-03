"""Money-core guarantees for paypr. Runs against the real app + endpoints.

Proves: exact-sum splits, atomic no-overspend debit, idempotent unlock (no
double charge), full refund reversal + no double refund, and a closed
starter-balance faucet.
"""
import itertools
import os
import tempfile

# Configure env BEFORE importing the app.
os.environ.setdefault("FLASK_ENV", "development")
_DB = os.path.join(tempfile.gettempdir(), "paypr_test_money.db")
if os.path.exists(_DB):
    os.remove(_DB)
os.environ["DATABASE_URL"] = f"sqlite:///{_DB}"
os.environ["WELCOME_CREDIT_CENTS"] = "0"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["JWT_SECRET_KEY"] = "test-jwt"

import pytest  # noqa: E402

from app import create_app  # noqa: E402
from extensions import db  # noqa: E402
from models import User, Publisher, Article, LedgerEntry  # noqa: E402
from services.payments import split_purchase  # noqa: E402
from services.ledger import atomic_debit_user, balance, user_acct, topup_wallet  # noqa: E402

_uniq = itertools.count(1)


@pytest.fixture(scope="module")
def app():
    application = create_app()
    application.config.update(TESTING=True, WTF_CSRF_ENABLED=False)
    yield application


@pytest.fixture
def client(app):
    return app.test_client()


def _mk_article(app, price=99, license_type="revenue_share", author_id=None, with_pub=True):
    with app.app_context():
        n = next(_uniq)
        pub_id = None
        if with_pub:
            pub = Publisher(name="Pub", slug=f"pub-{n}", default_price_cents=25)
            db.session.add(pub)
            db.session.commit()
            pub_id = pub.id
        art = Article(
            slug=f"art-{n}", title="T", body_html="<p>full</p>", body_preview="prev",
            price_cents=price, license_type=license_type, publisher_id=pub_id, author_id=author_id,
        )
        db.session.add(art)
        db.session.commit()
        return art.id


@pytest.mark.parametrize(
    "price,lt",
    list(itertools.product([1, 7, 25, 99, 100, 101, 299, 333, 1000], ["independent", "revenue_share", "buyout"])),
)
def test_split_sums_exactly(app, price, lt):
    art_id = _mk_article(app, price=price, license_type=lt)
    with app.app_context():
        art = Article.query.get(art_id)
        s = split_purchase(price, art)
        assert sum(s.values()) == price, s
        assert all(v >= 0 for v in s.values()), s


def test_atomic_debit_no_overspend(app):
    with app.app_context():
        u = User(email=f"atomic-{next(_uniq)}@x.com", wallet_cents=100)
        db.session.add(u)
        db.session.commit()
        assert atomic_debit_user(u.id, 100) is True
        db.session.commit()
        assert atomic_debit_user(u.id, 1) is False  # nothing left to take
        db.session.commit()
        db.session.refresh(u)
        assert u.wallet_cents == 0  # never negative


def test_faucet_closed(client):
    r = client.post("/api/auth/login", json={"email": f"faucet-{next(_uniq)}@x.com"})
    assert r.status_code == 200
    assert r.get_json()["user"]["wallet_cents"] == 0


def test_pay_is_idempotent(app, client):
    art_id = _mk_article(app, price=99)
    assert client.post("/api/auth/login", json={"email": f"buyer-{next(_uniq)}@x.com"}).status_code == 200
    assert client.post("/api/account/topup", json={"amount_cents": 10000}).status_code == 200
    r1 = client.post("/api/pay", json={"article_id": art_id})
    assert r1.status_code == 200
    b1 = r1.get_json()["balance_cents"]
    r2 = client.post("/api/pay", json={"article_id": art_id})  # same article again
    assert r2.status_code == 200
    b2 = r2.get_json()["balance_cents"]
    assert b1 == 10000 - 99
    assert b2 == b1  # charged exactly once


def test_refund_reverses_and_not_twice(app, client):
    art_id = _mk_article(app, price=99)
    assert client.post("/api/auth/login", json={"email": f"ref-{next(_uniq)}@x.com"}).status_code == 200
    client.post("/api/account/topup", json={"amount_cents": 10000})
    tx = client.post("/api/pay", json={"article_id": art_id}).get_json()["transaction_id"]
    rf = client.post("/api/refund", json={"transaction_id": tx})
    assert rf.status_code == 200
    assert rf.get_json()["balance_cents"] == 10000  # reader made whole
    with app.app_context():
        ref = f"txn:{tx}"
        legs = db.session.query(
            db.func.coalesce(db.func.sum(LedgerEntry.delta_cents), 0)
        ).filter(LedgerEntry.ref == ref).scalar()
        assert legs == 0  # every payee leg reversed; no phantom earnings
    rf2 = client.post("/api/refund", json={"transaction_id": tx})
    assert rf2.status_code == 409  # cannot refund twice


def test_wallet_reconciles_to_ledger(app, client):
    art_id = _mk_article(app, price=99)
    email = f"recon-{next(_uniq)}@x.com"
    client.post("/api/auth/login", json={"email": email})
    client.post("/api/account/topup", json={"amount_cents": 10000})
    tx = client.post("/api/pay", json={"article_id": art_id}).get_json()["transaction_id"]
    client.post("/api/refund", json={"transaction_id": tx})
    with app.app_context():
        u = User.query.filter_by(email=email).first()
        assert u.wallet_cents == balance(user_acct(u.id))  # cache == journal


def test_topup_is_idempotent(app):
    with app.app_context():
        u = User(email=f"idem-{next(_uniq)}@x.com", wallet_cents=0)
        db.session.add(u)
        db.session.commit()
        ok, already = topup_wallet(u.id, 2500, "topup_stripe", external_ref="stripe:sess_dup_1")
        assert ok and not already
        ok2, already2 = topup_wallet(u.id, 2500, "topup_stripe", external_ref="stripe:sess_dup_1")
        assert ok2 and already2  # same Stripe session credits once
        db.session.refresh(u)
        assert u.wallet_cents == 2500


def test_origin_guard_blocks_cross_site(app, client):
    art_id = _mk_article(app, price=25)
    client.post("/api/auth/login", json={"email": f"origin-{next(_uniq)}@x.com"})
    client.post("/api/account/topup", json={"amount_cents": 500})
    r = client.post("/api/pay", json={"article_id": art_id}, headers={"Origin": "https://evil.example"})
    assert r.status_code == 403  # forged cross-origin POST rejected


def test_mailer_is_graceful_without_key(app):
    from services.mailer import send_email, email_enabled
    with app.app_context():
        assert email_enabled() is False          # no RESEND_API_KEY in tests
        assert send_email("x@y.com", "hi", "<p>hi</p>") is False  # no-op, never raises


def test_magic_link_request_ok(client):
    r = client.post("/api/auth/magic-link/request", json={"email": "m@example.com"})
    assert r.status_code == 200
    assert r.get_json()["ok"] is True  # emails the link in prod; returns demo_link in dev
