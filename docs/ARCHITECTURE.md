# Architecture Overview

- Flask app factory in `app.py` with blueprints: public, account, publisher, api, external, dev (dev only).
- Models: User, Publisher, Article, Transaction, Event (SQLAlchemy + SQLite).
- Services: tokens (JWT), payments (fee calc), events (analytics), schemas (marshmallow).
- Frontend: Jinja templates, base.css, paypr.js, image skeletons, lazy loading.
- Security: CSRF (forms/AJAX), rate limiting, CORS (API), security headers, request IDs.
- Payments: Dev faux top-up + Stripe test top-up; transactions with fee/net; refund window.
- Analytics: Event table for views/pay; minimal track_event helper.
