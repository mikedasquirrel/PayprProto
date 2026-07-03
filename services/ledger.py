from __future__ import annotations

"""Money primitives: an append-only ledger plus atomic, race-safe balance moves.

Every balance change writes a LedgerEntry in the SAME database transaction as
the change itself, so:
  * the cached ``User.wallet_cents`` can always be reconciled against SUM(ledger);
  * every payee (author, publisher, platform) has a real, derivable balance —
    money is actually moved, not merely logged.

The user debit is a single conditional UPDATE, so two concurrent purchases can
never both succeed against the same funds. This is the correct pattern on
SQLite *and* Postgres (no read-check-write race, no row-lock gymnastics)."""

from typing import Optional

from sqlalchemy import text

from extensions import db
from models import LedgerEntry, Transaction


def user_acct(user_id: int) -> str:
    return f"user:{int(user_id)}"


def payee_acct(role: str, article) -> str:
    """Map a split role to a ledger account for a given article."""
    if role == "author" and getattr(article, "author_id", None):
        return f"author:{article.author_id}"
    if role == "publisher" and getattr(article, "publisher_id", None):
        return f"publisher:{article.publisher_id}"
    if role == "platform":
        return "platform"
    return f"role:{role}"


def add_entry(account: str, delta_cents: int, reason: str, ref: Optional[str] = None) -> None:
    """Queue an append-only ledger row. Does NOT commit — the caller commits the
    whole operation as one unit."""
    db.session.add(
        LedgerEntry(account=account, delta_cents=int(delta_cents), reason=reason, ref=ref)
    )


def balance(account: str) -> int:
    return int(
        db.session.query(db.func.coalesce(db.func.sum(LedgerEntry.delta_cents), 0))
        .filter(LedgerEntry.account == account)
        .scalar()
        or 0
    )


def atomic_debit_user(user_id: int, amount_cents: int) -> bool:
    """Subtract ``amount_cents`` from a user's cached balance iff sufficient,
    atomically. Returns True if debited, False if funds were insufficient.
    Does NOT commit."""
    if int(amount_cents) <= 0:
        return False
    res = db.session.execute(
        text(
            "UPDATE users SET wallet_cents = wallet_cents - :amt "
            "WHERE id = :uid AND wallet_cents >= :amt"
        ),
        {"amt": int(amount_cents), "uid": int(user_id)},
    )
    return (res.rowcount or 0) == 1


def credit_user(user_id: int, amount_cents: int) -> None:
    """Add ``amount_cents`` (may be negative for admin adjustments) to a user's
    cached balance atomically. Does NOT commit."""
    db.session.execute(
        text("UPDATE users SET wallet_cents = wallet_cents + :amt WHERE id = :uid"),
        {"amt": int(amount_cents), "uid": int(user_id)},
    )


def txn_ref(txn_id: int) -> str:
    return f"txn:{int(txn_id)}"


def already_refunded(txn_id: int) -> bool:
    """True if a refund has already been posted against this transaction."""
    return (
        db.session.query(LedgerEntry.id)
        .filter(LedgerEntry.reason == "refund", LedgerEntry.ref == txn_ref(txn_id))
        .first()
        is not None
    )


def active_unlock(user_id: int, article_id: int) -> Optional[Transaction]:
    """The current paid, non-refunded unlock for (user, article), if any.
    A user who already owns an article must not be charged again."""
    debits = (
        db.session.query(db.func.count(Transaction.id))
        .filter(
            Transaction.user_id == user_id,
            Transaction.article_id == article_id,
            Transaction.type == "debit",
        )
        .scalar()
        or 0
    )
    refunds = (
        db.session.query(db.func.count(Transaction.id))
        .filter(
            Transaction.user_id == user_id,
            Transaction.article_id == article_id,
            Transaction.type == "refund",
        )
        .scalar()
        or 0
    )
    if debits > refunds:
        return (
            Transaction.query.filter_by(
                user_id=user_id, article_id=article_id, type="debit"
            )
            .order_by(Transaction.id.desc())
            .first()
        )
    return None


def topup_wallet(user_id: int, amount_cents: int, source: str, external_ref: Optional[str] = None):
    """Idempotently credit a wallet from an external source (Stripe, dev), writing
    a ledger entry and a topup Transaction so wallet_cents always reconciles to
    SUM(ledger). If ``external_ref`` is supplied and was already processed, this is
    a no-op — the same Stripe session can arrive via both verify-session and the
    webhook and only credit once. Commits. Returns ``(ok, already_credited)``."""
    from models import IdempotentOp, Transaction as _Txn

    amount_cents = int(amount_cents)
    if external_ref:
        # Claim the idempotency key up front; the unique constraint makes a
        # concurrent duplicate raise, which we treat as "already done".
        db.session.add(IdempotentOp(key=external_ref))
        try:
            db.session.flush()
        except Exception:
            db.session.rollback()
            return True, True
    if amount_cents <= 0:
        db.session.commit()
        return True, False
    credit_user(user_id, amount_cents)
    add_entry(user_acct(user_id), amount_cents, source, external_ref or source)
    db.session.add(_Txn(
        user_id=user_id, article_id=None, publisher_id=None,
        price_cents=amount_cents, fee_cents=0, net_cents=amount_cents, type="topup",
    ))
    db.session.commit()
    return True, False
