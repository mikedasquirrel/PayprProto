# paypr.pro — production-readiness audit & punch list

*2026-07-01. A money-rail review of the current codebase, prioritized. Verdict: a genuinely capable three-sided demo, but **not yet safe to hold real money.** The gaps below are the distance between "demo works end-to-end" and "absolutely perfected." Fix P0 before a single real dollar flows.*

---

## P0 — Money correctness & safety (blockers for real funds)

**1. The balance is a mutable counter, not a ledger.**
`User.wallet_cents` is edited in place on pay / top-up / refund / admin-credit. Nothing derives the balance from an append-only journal, so the counter can silently drift from the transaction history (a partial failure, a bug, an admin edit). *Fix:* an immutable `LedgerEntry` table (user, delta_cents, reason, ref, created_at); balance = `SUM(delta)`; the cached `wallet_cents` becomes a denormalized mirror reconciled against the ledger.

**2. The debit is race-unsafe → overspend.**
`/pay` reads `wallet_cents`, checks `>= price`, then subtracts and commits — a read-check-write with no lock. Two concurrent requests both pass the check and both debit; balance goes negative. SQLite's file lock hides this today; **Postgres will not.** *Fix:* atomic conditional update — `UPDATE users SET wallet_cents = wallet_cents - :p WHERE id=:id AND wallet_cents >= :p`, and treat 0 rows affected as "insufficient funds." (Same pattern for the daily-cap check.)

**3. No idempotency on `/pay`.**
A double-click or client retry produces two debits, two transactions, two unlocks. *Fix:* an idempotency key (client-supplied or derived) with a unique constraint; a repeat returns the original result instead of charging again.

**4. Idempotency hack overloads the `ip_address` column.**
The Stripe-Checkout credit path stores the Stripe `session_id` in `Transaction.ip_address` and queries it for idempotency. That destroys the audit IP and risks collisions. *Fix:* a dedicated `external_ref` column with a unique index; keep `ip_address` for what it says.

**5. Recipients have no held balance or payout.**
Splits are computed and *logged* (`split_breakdown_json`, plus `AuthorEarnings` for authors only) — but publisher / platform / other-role shares are never credited to an account, and there is no payout path. paypr currently computes who is owed what and then never moves it. *Fix:* ledger accounts for every payee (author, publisher, platform), credited inside the same transaction as the debit; a payout/withdrawal flow on top.

**6. `apply_split_rules` can distribute more than was collected.**
It rounds every role *up* (`+9999//10000`) and only ever *adds* a positive remainder — it never corrects overflow — so three-way splits can sum past `net`. (The purchase path uses the safer `calculate_article_split`, which rounds down and hands the remainder out — so the two split functions round differently.) *Fix:* one split function, largest-remainder allocation, asserting `sum(parts) == net` exactly.

**7. Purchase isn't atomic.**
`record_author_earnings` runs its **own** `db.session.commit()` after `/pay` already committed the debit, wrapped in a `try/except` that swallows failures ("don't fail the transaction if earnings recording fails"). Result: the reader is charged, but the earnings row can be silently missing, and the two are not one unit. *Fix:* one transaction — debit, transaction row, and every recipient credit commit together or roll back together; no independent commits in helpers.

**8. Refund doesn't reverse the split.**
`/refund` returns the reader's money and writes a refund row, but does not reverse the `AuthorEarnings` (or any recipient credit) from the original purchase. The author/publisher keep phantom earnings on a refunded sale. *Fix:* refund reverses every leg of the original split in the same transaction.

**9. Revenue stats count refunds as revenue.**
Publisher stats `SUM(price_cents)` with no `type='debit'` filter; a refund row carries a **positive** `price_cents`, so refunds inflate publisher revenue and unlock counts. *Fix:* filter to `type='debit'` (net of refunds) everywhere revenue is summed.

**10. The $5 starter balance is a free-money faucet.**
`/auth/login` (and magic-verify) auto-creates a user from an email alone and grants `wallet_cents=500`, no verification. Unlimited emails → unlimited $5 wallets → real value the moment payouts exist. *Fix:* no spendable starter credit without a verified, funded account (or make starter credit non-withdrawable and non-transferable, tracked separately).

**11. CSRF is disabled on the money endpoints.**
Every route is `@csrf.exempt`, including `/pay`, `/refund`, `/account/topup`. With cookie-session auth, a malicious page can POST these on the victim's behalf. *Fix:* real CSRF protection (token or strict `SameSite`+origin checks) on all state-changing money routes.

---

## P1 — Payments, data & security hardening

**12. Real payment ingress.** Top-up is dev-faux + Stripe **test-mode** + a client-verified Checkout. Move to live Stripe (and PayPal, per the app-store notes) with a **server-side webhook** as the source of truth for "paid" — never trust client `verify-session` alone. Add reconciliation.

**13. Real payout egress.** A withdrawal/payout rail for publishers/authors (Stripe Connect or equivalent), with balances from #5.

**14. Postgres + migrations + backups.** SQLite (`paypr.db`) can't hold real money under concurrency; ship Postgres, run Alembic migrations (folder exists), and scheduled backups. Add DB CHECK constraints (`wallet_cents >= 0`), a currency field.

**15. Secrets & repo hygiene.** `paypr.db`, `cookies.txt`, `server.log`, `server.pid` are committed — `cookies.txt` may hold a live session. Purge, gitignore, rotate `SECRET_KEY`/`JWT_SECRET_KEY` to strong fixed values (STATUS says "auto-generated for dev" — that silently invalidates or forges sessions in prod).

**16. Session/cookie security.** Enforce `Secure` + `HttpOnly` + `SameSite=Lax/Strict`, a permanent strong `SECRET_KEY`, and short session lifetimes for the money surfaces.

**17. Magic links must email, not echo.** Both flows return `demo_link` in the JSON. In prod, send via email and never return the token.

**18. Admin credit hardening.** `admin_credit_user` can set any balance; keep it, but behind strong admin auth, full audit, and ideally a second-factor.

---

## P2 — UX, tests, compliance

**19. UX to the Keyring bar.** Wallet, publisher console, and site UI get the same craft pass (headless-rendered + iterated) once the money core is safe.

**20. Test suite for the money paths.** Concurrency test for #2, idempotency test for #3, split-sums-exactly test for #6, refund-reverses-split test for #8, faucet test for #10. `QA_CHECKLIST.md` exists — wire it to real tests.

**21. Compliance basics.** Terms + refund policy; holding customer balances is money-transmission-adjacent — get eyes on it before scale. Age/PII as needed.

---

## Suggested execution order

1. **Ledger + atomic debit + idempotency** (#1–4) — the spine.
2. **Recipient accounts + atomic split + refund reversal + stats fix** (#5–9) — correct distribution.
3. **Faucet + CSRF + secrets/cookies** (#10, 11, 15, 16) — close the money-abuse doors.
4. **Postgres + real Stripe webhook top-up + payout** (#12–14).
5. **Tests** (#20) alongside each of the above — never money code without a test.
6. **UX polish** (#19) and **compliance** (#21) last.

*Nothing here is a knock on the build — it's a lot of working software. These are the specific, ordinary things a payments product must get exactly right, and they're very fixable.*
