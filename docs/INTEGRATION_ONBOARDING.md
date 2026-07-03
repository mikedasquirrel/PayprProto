# Integrating paypr.pro — onboarding for builders

*Audience: another agent/bot (or engineer) wiring paypr into one of our projects — Resonance/cientifics, or anything we bring live. This is the API-side contract, the mental model, and a working non-FreeSpeak example. paypr is the **rail, not a reseller**: it holds the wallet, moves money by the piece, splits it, and proves access — your project keeps its own content and UX.*

Base URL below is written as `{PAYPR}` — `https://paypr.pro` in prod, `http://127.0.0.1:5001` in dev.

---

## 1. The mental model (five nouns)

- **Reader** — a `User` with a `wallet_cents` balance. Funds it once, spends by the piece across every project on the rail.
- **Piece** — an `Article`: an atomic unit of paid value with a `price_cents`, a `body_preview` (free) and a `body_html` (paid), and a split config. A "piece" does **not** have to be an article — for Resonance it's *a finding*; for a tool it could be *one run*. It's just "a thing worth a few cents."
- **Creator** — a `Publisher` and/or an `AuthorProfile`. Your project registers as one (or both). Money owed to a creator accrues to their **ledger account** (`publisher:<id>`, `author:<id>`).
- **Transaction** — the immutable record of a debit / refund / top-up.
- **Ledger** — the append-only journal. Every balance move writes a `LedgerEntry`, so `wallet_cents == SUM(ledger)` always reconciles and each creator has a real, derivable balance. This is what makes the numbers trustworthy.

### The money guarantees you can rely on
These are enforced and covered by `tests/test_money_core.py`:
- **No overspend** — the debit is a single atomic conditional UPDATE; a balance can't go negative and two concurrent buys can't spend the same funds.
- **Idempotent unlock** — paying for a piece you already own re-grants access without charging again.
- **Exact splits** — the split of a price sums to the cent (largest-remainder); no cent is created or lost.
- **Clean refunds** — a refund returns the reader's money *and* reverses every creator's share; it can't happen twice.
- **Idempotent top-ups** — a Stripe payment credits exactly once whether the browser return or the webhook arrives first.

---

## 2. Auth model

- **Reader session** — cookie-based. `POST {PAYPR}/api/auth/login {email}` or the magic-link pair. All wallet/pay calls need this cookie (`credentials: 'include'`).
- **Access token (JWT)** — `POST /api/pay` returns a short-lived (10-minute) `access_token` proving *this reader unlocked this piece*. Use it to reveal content and to verify an unlock **from your own origin** without sharing the session — `GET {PAYPR}/api/... /verify` or `GET {PAYPR}/paypr/unlock?token=…`.
- **Money endpoints are origin-guarded** — cross-origin POSTs to `pay/refund/topup` are rejected (defense-in-depth with SameSite cookies). Call them same-origin, or from your server.

---

## 3. Three integration patterns (pick per project)

**A. Server-to-server (recommended for apps like Resonance).**
Your backend holds the paypr integration. It creates pieces, and either proxies the reader's pay/verify or calls paypr with the reader's session. Cleanest control, no secrets in the browser.

**B. Client drop-in.**
Render a preview + an "unlock" button; on click, `POST /api/pay` then `POST /api/verify`, reveal on `valid`. (See `docs/EXTERNAL_INTEGRATION.md` for the ~15-line snippet.)

**C. External verify (JWT).**
Gate content on *your* origin: after a reader unlocks, hand your server the `access_token` and call `GET {PAYPR}/paypr/unlock?token=…` → `{valid, article_id, publisher_id}`. Reveal only if valid.

---

## 4. Onboarding a new project — the checklist

1. **Register the project as a creator.** Create a `Publisher` (e.g. slug `resonance`) and, if a person is owed money, an `AuthorProfile`. (Admin/seed today; a self-serve `/api/author/register` exists for authors.)
2. **Register each unit of value as a Piece.** One `Article` per finding / report / run, with `price_cents` and a split (`license_type` or `custom_splits`).
3. **Wire the reader flow** (pattern A/B/C): preview → `pay` → `verify` → reveal, with a 10-minute `refund`.
4. **Funding:** readers top up via Stripe Checkout — `POST /api/account/topup/checkout` returns a `checkout_url`; the **webhook** `/api/stripe/webhook` credits the wallet (source of truth).
5. **Earnings:** read what the project has earned via `GET /api/publisher/console/stats` (debit-only, net of refunds). Payout egress (Stripe Connect) is the one roadmap piece that needs account onboarding, not just code.

---

## 5. API reference (the endpoints you'll use)

All JSON. `⟨auth⟩` = reader cookie required.

**Auth**
- `POST /api/auth/login` `{email}` → `{ok, user:{id,email,wallet_cents}}` (creates the user; **0** starter balance).
- `POST /api/auth/magic-link/request` `{email}` → `{ok}` (emails a link; dev also returns `demo_link`).
- `POST /api/auth/magic-link/verify` `{token}` → `{ok, user}`.
- `GET /api/auth/me` → `{authenticated, user?}`.

**Wallet** ⟨auth⟩
- `GET /api/account/wallet` → `{balance_cents, email}`.
- `POST /api/account/topup/checkout` `{amount_cents}` → `{checkout_url, session_id, publishable_key}` (100–50000). Redirect the reader to `checkout_url`.
- `POST /api/stripe/webhook` — Stripe→paypr, signature-verified; credits on `checkout.session.completed`. **This is the real top-up path.**
- `GET /api/account/transactions` → `{transactions:[…]}`.

**The core loop** ⟨auth⟩
- `POST /api/pay` `{article_id}` → `{access_token, transaction_id, price_cents, balance_cents, split}`. Idempotent per (reader, piece).
- `POST /api/verify` `{access_token, article_id}` → `{valid}`.
- `GET /paypr/unlock?token=…` → `{valid, article_id, publisher_id}` (external, no session).
- `POST /api/refund` `{transaction_id}` → `{ok, balance_cents, refund_id}` (10-min window, once).

**Content**
- `GET /api/articles/:id` → the piece; includes `body_html` **only if** the caller has unlocked it (session), else `body_preview`.
- `GET /api/articles?publisher=slug` , `GET /api/publishers/:slug`.
- `POST /api/author/content/submit` ⟨auth+author⟩ `{title, body_html, price_cents, license_type, custom_splits?, publisher_id?}`.

**Creator earnings** ⟨publisher/admin session⟩
- `GET /api/publisher/console/stats` → `{all_time_revenue_cents, seven_day_revenue_cents, total_unlocks, …}` (debit-only).
- `GET /api/publisher/console/transactions?format=csv` → per-publisher roll-up.

---

## 6. Pricing & splits

- `price_cents` on the piece (falls back to the publisher default).
- **The rail takes NO usage fee** (doctrine, 2026-07-02): `PLATFORM_FEE_BPS` defaults to 0 and every default split settles 100% to creators. If a usage fee ever ships it will be a small flat amount (~5¢) under a new flat-cents knob — never a percentage.
- **Split** = how the price divides, in basis points (summing to 10000 = 100% of price). `platform` is the (zero, by default) fee.
  - `license_type: "independent"` → `{author: 10000}` — the author keeps everything.
  - `"revenue_share"` → `{author: 6000, publisher: 4000}` (publisher default configurable via `default_author_split_bps`).
  - `"buyout"` → `{publisher: 10000}`.
  - `custom_splits`: a JSON string of `{role: bps}` for full control (e.g. `{"author":7000,"publisher":3000}`); a `platform` role is honored if a piece explicitly includes one.
- The single split function guarantees the parts **sum to the exact price**. On a purchase, each role's share is credited to its ledger account in the *same* transaction as the reader's debit; a refund reverses every leg.

---

## 7. The non-FreeSpeak worked example — Resonance charges for a finding

Runnable: `python examples/resonance_integration.py` (spins up paypr on a throwaway DB and drives the whole API end-to-end, printing the transcript). What it shows:

1. Register **Resonance** as a publisher + **the maker** as an author; publish one paid finding (`$1.99`, 60/30/10 split).
2. A reader logs in (wallet `$0.00`), funds `$5.00`, sees the **locked preview**.
3. `POST /api/pay` → the reader is charged `$1.99`, gets an `access_token`, and the split lands in the ledger: **author `$1.19`, Resonance `$0.60`, platform `$0.20`**.
4. `POST /api/verify` and `GET /paypr/unlock?token=…` both return `valid: true`; `GET /api/articles/:id` now returns the **full body**.
5. `POST /api/refund` returns the reader's `$1.99` and **reverses all three creator legs**; balances net back to zero.
6. Reconciliation check: `reader.wallet_cents == SUM(reader ledger)`.

The equivalent raw calls (what your project actually sends):

```bash
# 1. reader session
curl -sX POST {PAYPR}/api/auth/login -H 'Content-Type: application/json' \
  -c jar -d '{"email":"reader@example.com"}'

# 2. fund the wallet (dev). in prod: /api/account/topup/checkout -> Stripe
curl -sX POST {PAYPR}/api/account/topup -H 'Content-Type: application/json' \
  -b jar -c jar -d '{"amount_cents":500}'

# 3. pay for the finding (article_id from your catalog)
curl -sX POST {PAYPR}/api/pay -H 'Content-Type: application/json' \
  -b jar -c jar -d '{"article_id":1}'
#   -> {"access_token":"eyJ…","transaction_id":7,"price_cents":199,
#       "balance_cents":301,"split":{"author":119,"publisher":60,"platform":20}}

# 4. verify + reveal
curl -sX POST {PAYPR}/api/verify -H 'Content-Type: application/json' \
  -b jar -c jar -d '{"access_token":"eyJ…","article_id":1}'      # -> {"valid":true}
curl -s "{PAYPR}/paypr/unlock?token=eyJ…"                         # -> {"valid":true,"article_id":1,"publisher_id":1}
curl -s -b jar {PAYPR}/api/articles/1                             # -> now includes body_html

# 5. (optional) refund within 10 minutes
curl -sX POST {PAYPR}/api/refund -H 'Content-Type: application/json' \
  -b jar -c jar -d '{"transaction_id":7}'                         # -> {"ok":true,"balance_cents":500}
```

---

## 8. Security & correctness notes for integrators

- Keep the **Stripe secret + webhook secret server-side** (paypr config env). Never in a browser or committed to a repo.
- Money POSTs are **origin-guarded** and **rate-limited**; call them same-origin or server-side.
- The `access_token` is a **bearer proof for 10 minutes** — treat it like a capability; don't log it.
- A refunded unlock is void: `/paypr/unlock` will return `valid:false` after refund (the token is revoked if you pass it to `/api/refund`).
- Earnings/revenue are **debit-only, net of refunds** — trust the ledger, not raw transaction sums.

---

## 9. Roadmap hooks (so you build in the right direction)

- **Payout egress** — creators' ledger balances are exact; paying them out to a bank needs **Stripe Connect** onboarding (KYC), which is an account step, not a code step. Until then, balances accrue and are reportable.
- **Pay-per-compute (the BYO-wallet bridge)** — the same `pay`/`verify` loop can gate *a model run* instead of *a document*. Resonance is the natural first compute example: charge a few cents per analysis, the wallet funds it, the split pays the maker. This is where paypr stops being "a paywall" and becomes "a metered access layer" — see `~/Desktop/_Access_Layer_Strategy.md`.

---

## 10. The developer platform — API keys, pieces, metered charges (`/api/v1`)

Everything above authenticates as a *human* (reader/publisher cookie). That's fine for a browser drop-in, but a **service** — a tool, a model endpoint, another team's backend — needs to authenticate as *itself*. That's the `/api/v1` surface: the generalized rail any project builds on without a person in the loop. It reuses the exact same ledger/split/refund core, so an app's money is as real and reconcilable as a first-party publisher's.

**The shift in nouns.** A first-party *publisher* becomes a self-serve **App**; an *article* becomes a **Piece** (an article, a finding, or *one compute run*); the reader-present *pay* becomes a server-driven **Charge**. The App earns to a `publisher:<id>` ledger account exactly as before.

### 10.1 Keys
- An **App owner** is just a logged-in paypr reader. From the [developer console](/#/developers/console) (or `POST /api/v1/apps`) they register an app; it's handed its own creator (publisher) account so earnings accrue to a payable balance.
- `POST /api/v1/apps/:id/keys` mints an `sk_test_…` or `sk_live_…` secret. **Only its SHA-256 hash is stored** — the plaintext is returned once and never again. Rotate (`/keys/:id/rotate`) and revoke (`/keys/:id/revoke`) any time.
- Authenticate every machine call with `Authorization: Bearer sk_…`. Scopes on the key gate what it can do (`pieces:write`, `charges:write`, …). Keys are rate-limited per key.

### 10.2 The grant — why an app can't drain a wallet
A key is powerful, so a charge is **not** enough on its own. A reader must first authorize the app: `POST /api/v1/grants {app_slug, daily_cap_cents}` (reader session). The app may then meter that reader **only up to the daily cap**, net of refunds. No grant → `403 grant_required`. This is the honest BYO-wallet bridge: consent is explicit and bounded.

### 10.3 The charge
`POST /api/v1/charges` (key auth). Body is either:
- `{ reader_email, piece_id, idempotency_key? }` — charges the piece's price, split by the piece; **or**
- `{ reader_email, amount_cents, split?, idempotency_key? }` — ad-hoc **pay-per-compute**; `split` is an optional bps map, else the app default (platform fee + app).

It performs the *same* atomic debit and exact-split-into-the-ledger as `/api/pay`, in one transaction, and returns `{ charge_id, access_token, price_cents, reader_balance_cents, split }`. Pass an `idempotency_key` and a retry returns the original charge — never a second debit. Reverse within 10 minutes with `POST /api/v1/charges/:id/refund` (reverses every payee leg).

### 10.4 The endpoints
```
# owner (cookie session)
POST /api/v1/apps                      {name, description?, website_url?}
GET  /api/v1/apps
POST /api/v1/apps/:id/keys             {mode?, label?}      -> secret (once)
POST /api/v1/keys/:id/rotate | /revoke

# reader (cookie session)
POST /api/v1/grants                    {app_slug, daily_cap_cents}
GET  /api/v1/grants  ·  POST /api/v1/grants/:id/revoke

# app (Authorization: Bearer sk_…)
GET  /api/v1/me
POST /api/v1/pieces                    {title, price_cents, unit_label?, split?}
GET  /api/v1/pieces  ·  GET /api/v1/pieces/:id
POST /api/v1/charges                   {reader_email, piece_id | amount_cents, idempotency_key?}
POST /api/v1/charges/:id/refund
GET  /api/v1/events
```

### 10.5 Worked example
`python examples/metered_compute_integration.py` — a "Sentiment API" app registers, mints a key, publishes a run as a piece, a reader grants it a $2/day allowance, the app meters a 25¢ charge with the key, proves idempotency, refunds, and reconciles the wallet against the ledger. The browsable, always-accurate reference is at `/#/developers/reference`.
