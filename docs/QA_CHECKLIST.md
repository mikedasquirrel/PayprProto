# QA Checklist

- Health: GET /healthz → 200 { ok: true }
- Newsstand: GET / → publishers list renders; links use `/p/<slug>`
- Publisher rack: GET /p/<slug> → cards render; `href` link to article slugs
- Article: GET /p/<slug>/<article_slug> → preview renders; Pay button present
- Login: GET/POST /login → sign in redirects to /
- Wallet: GET /wallet → balance & top-up UI visible
- Dev top-up: POST /wallet/topup → redirects back; balance updates
- Stripe top-up: POST /wallet/topup/stripe (JSON) → ok with balance
- Pay API: POST /api/pay → returns token + balance; wallet reduced
- Verify API: POST /api/verify → `{ valid: true }`
- Refund API: POST /api/refund → ok within 10 minutes
- History: GET /history → transactions table shows recent rows
- Publisher console: GET /pub/console → summaries tables render
- CSV export: GET /pub/export.csv → downloads CSV
- External unlock: GET /paypr/unlock?token=... → `{ valid }`
- Dev reseed: POST /dev/reseed (logged-in) → 200 with counts
- Static: CSS/JS load; favicon present
- 404/500: Nonexistent page shows branded error page
