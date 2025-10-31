love it. we’ll build a **sleek Flask demo** that feels like a *western urban newsstand*—your “pay once, read now” button front-and-center. Below is a tight roadmap + copy-pasteable scaffold so a coder can stand it up fast, with your color vibe pulled from the image (hot magenta → orange → ember gradients on deep charcoal).

---

# Paypr.pro — Flask Prototype (Simple, Beautiful, Works)

## 0) Visual System (from your image)

**Palette (CSS variables):**

* `--ink`: #0F1115 (deep charcoal background)
* `--ash`: #1A1D24 (cards / surfaces)
* `--smoke`: #8E93A4 (muted text)
* `--paper`: #F5F7FB (on dark for small accents)
* **Gradient brand** `--paypr-grad`: linear-gradient(135deg, #FA3D7F 0%, #FF7A3A 35%, #FFC43A 65%, #A05BFF 100%)
  (magenta → orange → gold → violet, like your fingerprint)

**Tone:** glassy cards, rounded 14px radius, gentle glow shadows, large condensed headlines; minimal chrome.

---

## 1) User Flow (MVP)

1. **Newsstand** (homepage): a stylized streetscape (three “kiosks” = demo pubs) you can browse.
2. Tap a **publication** → its rack of covers (article cards).
3. Open an **article preview** → see price chip (`$0.25`) and **Pay with Paypr** button.
4. Click → wallet is charged → **token** issued → article body revealed.
5. Wallet & history accessible from sticky topbar.

Keep it *one click*. No cart. No coupons.

---

## 2) Data Model (SQLite for demo)

```
users(id, email, wallet_cents, created_at)
publishers(id, name, slug, logo_url, hero_url, default_price_cents, domain)
articles(id, publisher_id, slug, title, dek, author, media_type, price_cents, cover_url, body_html, created_at)
transactions(id, user_id, article_id, publisher_id, price_cents, fee_cents, net_cents, type, created_at)
```

* Platform fee 10% (configurable).
* Token = short-lived JWT bound to `user_id`, `article_id`, `publisher_id` (+exp 10 min).

---

## 3) Flask App Structure

```
paypr/
  app.py
  config.py
  models.py
  services/
    auth.py
    wallet.py
    payments.py
    tokens.py
  blueprints/
    public.py       # newsstand, pub view, article preview
    account.py      # login, wallet, history
    publisher.py    # simple demo console
    api.py          # /api/pay, /api/verify
  static/
    css/base.css
    js/paypr.js     # client pay button logic
    img/...
  templates/
    layout.html
    newsstand.html
    publisher.html
    article.html
    account_wallet.html
    account_history.html
```

### Minimal dependencies

* Flask, Flask-Login, Flask-SQLAlchemy, python-jwt (PyJWT), Stripe (test) or faux processor, WTForms (optional).

---

## 4) Routes (contract the bot can implement)

### Public

* `GET /` → **newsstand** (browse all pubs).
* `GET /p/<pub_slug>` → publication rack (cards).
* `GET /p/<pub_slug>/<article_slug>` → article preview; if unlocked show full body.
* `POST /api/pay` (auth required)
  **Req** `{article_id}` → validate balance & price → create txn → issue JWT
  **Res** `{access_token, balance_cents, price_cents}`
* `POST /api/verify`
  **Req** `{access_token, article_id}` → `{valid: true}`

### Account

* `GET /login` → email magic-link (or dev quick login).
* `GET /wallet` → top up (\$5/\$10).
* `POST /wallet/topup` → Stripe test payment → update wallet.
* `GET /history` → list transactions.

### Demo Publisher (optional)

* `GET /pub/console` → shows reads & revenue for demo pubs.

---

## 5) `paypr.js` (client button logic)

* Renders a glowing “Pay \$0.25 with Paypr” button under the preview.
* On click:

  1. `POST /api/pay` with `article_id`.
  2. If ok, call `POST /api/verify` immediately; on `valid:true`, swap preview with full article HTML (already in page as hidden div or fetched via `?token=...`).
* Shows toast “Unlocked —\$0.25 • Balance \$4.75”.

*(For the demo, verification just flips a session flag; production would respect URL/domain binding.)*

---

## 6) Templates (HTML snippets)

### `layout.html` (dark, gradient accents)

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Paypr</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="{{ url_for('static', filename='css/base.css') }}">
</head>
<body class="ink">
  <header class="topbar">
    <a class="brand" href="/">paypr</a>
    <nav>
      <a href="/wallet">Wallet: ${{ g.wallet }}</a>
      <a href="/history">History</a>
      <a href="/login">Sign in</a>
    </nav>
  </header>
  <main>{% block content %}{% endblock %}</main>
  <script src="{{ url_for('static', filename='js/paypr.js') }}"></script>
</body>
</html>
```

### `newsstand.html` (urban kiosks)

```html
{% extends "layout.html" %}{% block content %}
<section class="streetscape">
  {% for pub in publishers %}
  <a class="kiosk" href="/p/{{ pub.slug }}">
    <div class="kiosk-awning"></div>
    <img class="kiosk-hero" src="{{ pub.hero_url }}" alt="{{ pub.name }}">
    <div class="kiosk-sign">{{ pub.name }}</div>
  </a>
  {% endfor %}
</section>
{% endblock %}
```

### `article.html` (preview + pay)

```html
{% extends "layout.html" %}{% block content %}
<article class="sheet">
  <h1 class="headline">{{ article.title }}</h1>
  <p class="dek">{{ article.dek }}</p>
  <div class="meta">By {{ article.author }} • {{ article.publisher.name }}</div>

  {% if unlocked %}
    <div class="body">{{ article.body_html|safe }}</div>
  {% else %}
    <div class="preview">{{ article.body_preview|safe }}</div>
    <button class="pay-btn" data-article="{{ article.id }}">
      Pay {{ article.price_cents/100 | round(2) }} with Paypr
    </button>
    <div class="small-note">Your payment goes directly to {{ article.publisher.name }} (10% platform fee).</div>
    <div id="full-article" class="hidden">{{ article.body_html|safe }}</div>
  {% endif %}
</article>
{% endblock %}
```

---

## 7) Base CSS (vibe & components)

`static/css/base.css` (excerpt)

```css
:root {
  --ink:#0F1115; --ash:#1A1D24; --smoke:#8E93A4; --paper:#F5F7FB;
  --grad: linear-gradient(135deg,#FA3D7F 0%,#FF7A3A 35%,#FFC43A 65%,#A05BFF 100%);
  --radius:14px; --pad:16px;
}
* { box-sizing:border-box }
body.ink { background: var(--ink); color: #E9EDF5; font: 16px/1.5 Inter, system-ui, -apple-system, Segoe UI; }
.topbar { position:sticky; top:0; display:flex; justify-content:space-between; align-items:center;
  padding:14px 20px; background: rgba(26,29,36,.7); backdrop-filter: blur(8px); border-bottom:1px solid #222; }
.brand { background: var(--grad); -webkit-background-clip:text; color:transparent; font-weight:800; letter-spacing:.5px; }
nav a { color:#CBD2E0; margin-left:18px; text-decoration:none }
.streetscape { display:grid; grid-template-columns: repeat(3, 1fr); gap:24px; padding:32px; }
.kiosk { background:var(--ash); border-radius: var(--radius); padding:0; overflow:hidden; position:relative; box-shadow: 0 10px 30px rgba(0,0,0,.35); }
.kiosk-awning { height:8px; background: var(--grad); }
.kiosk-hero { width:100%; height:160px; object-fit:cover; display:block; }
.kiosk-sign { position:absolute; bottom:12px; left:12px; background: rgba(15,17,21,.7); padding:6px 10px; border-radius:10px; font-weight:600 }
.sheet { max-width:840px; margin:32px auto; background:#11161f; border-radius: var(--radius); padding:32px; box-shadow: 0 10px 40px rgba(0,0,0,.4); }
.headline { font-size:38px; line-height:1.1; letter-spacing:-.2px; }
.dek { color:#C1C7D6; margin-top:8px; }
.meta { color:#9AA2B1; margin:12px 0 20px }
.pay-btn {
  padding:12px 18px; border:0; border-radius:12px; color:#0f1115; font-weight:700; cursor:pointer;
  background: var(--grad); box-shadow: 0 6px 20px rgba(250,61,127,.35);
}
.pay-btn:hover { transform: translateY(-1px) scale(1.01) }
.small-note { color:#8E93A4; margin-top:8px; font-size:12px }
.hidden { display:none }
```

---

## 8) Token + Payment (server logic, pseudocode)

**/api/pay**

```python
def pay():
    user = current_user
    article_id = request.json['article_id']
    article = Article.get(article_id)
    price = article.price_cents or article.publisher.default_price_cents
    assert user.wallet_cents >= price
    # debit & record
    fee = int(price * 0.10)
    net = price - fee
    db.session.add(Transaction(user_id=user.id, article_id=article.id,
                               publisher_id=article.publisher_id,
                               price_cents=price, fee_cents=fee, net_cents=net,
                               type='debit'))
    user.wallet_cents -= price
    db.session.commit()
    token = issue_jwt(user.id, article.id, article.publisher_id, exp_minutes=10)
    return jsonify({ "access_token": token, "balance_cents": user.wallet_cents, "price_cents": price })
```

**/api/verify**

```python
def verify():
    token = request.json['access_token']
    article_id = request.json['article_id']
    claims = verify_jwt(token)
    valid = claims and claims['article_id']==article_id and not is_revoked(token)
    return jsonify({ "valid": bool(valid) })
```

*(For demo simplicity, the view that renders the article checks session “unlocked” after a successful pay call and shows the hidden full body.)*

---

## 9) Seed Dummy Publications (urban newsstand vibe)

* **City Ledger** — metro beats, transit, housing; hero: dusk skyline.
* **Riverside Chronicle** — local government, schools; hero: riverfront kiosks.
* **Frontier Dispatch** — western culture, wildfire, ranch & tech; hero: neon alley.

Each with \~5 articles (cover image + 2-paragraph preview + 6-paragraph body).

---

## 10) Roadmap

### Phase 1 — Prototype (this week)

* Flask app + SQLite models.
* Newsstand UI + three demo pubs.
* Article preview → **Pay** → reveal body.
* Wallet top-up (Stripe test) + history.
* JWT token issue/verify; basic logging.
* Publisher console (read count, revenue summaries).

### Phase 2 — Polish & Trust

* Refund window + daily cap.
* Diversity stats badge.
* Better empty states, 404, loading skeletons.
* Accessibility pass (contrast, focus rings, aria labels).

### Phase 3 — Fallback & Media Types

* Add **PDF** and **audio** “items” with same button.
* Optional minimal browser extension that injects the same pay button on demo domains.

### Phase 4 — Pilot-ready

* Real publisher unlock endpoint (`GET /paypr/unlock?token=...`).
* Payout CSV + simulated disbursements.
* Anti-abuse: token bound to article + short TTL + IP/UA telemetry.

---

## 11) Quick Seed Script (dev convenience)

Create 3 pubs + 15 articles with price tiers (10¢/25¢/50¢). Use stock images or gradient placeholders with your fingerprint-style gradient overlay to keep the brand tight.

---

## 12) Where to place your fingerprint image

* As a faint **background watermark** in header and wallet pages (CSS `background: radial-gradient(...)` using the palette), and small **favicon** mark.

---

If you want, I can output **ready-to-run Flask files** (`app.py`, `models.py`, `templates`, `base.css`, and a tiny `paypr.js`) in one block so your coding bot can generate the repo exactly as above.
