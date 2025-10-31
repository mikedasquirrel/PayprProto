# Publisher Integration Guide

## Preview and Pay Button
- Render article preview with a "Pay with Paypr" button.
- On click, call POST /api/pay with `{ article_id }` (user must be logged in).
- Response includes `access_token`; verify via POST /api/verify with `{ access_token, article_id }`.

## External Unlock (pilot)
- Optionally, call GET /paypr/unlock?token=... on publisher origin to validate token.
- Valid response: `{ valid: true, article_id, publisher_id }`.

## Pricing
- Article-level `price_cents` overrides publisher default.
- Platform fee defaults to 10%.

## Refund Window
- 10 minutes after purchase, POST /api/refund `{ transaction_id }` (same user).

## Webhooks (future)
- TBD for payouts and reconciliation.
