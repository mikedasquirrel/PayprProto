# Paypr - One-Click Pay-to-Unlock Articles

A modern, API-first micropayment platform for quality journalism. Built with Flask (backend) and vanilla JavaScript SPA (frontend).

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- pip and virtualenv

### Setup

1. **Clone and setup virtual environment:**
```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

2. **Configure environment (optional):**
```bash
cp .env.example .env
# Edit .env with your settings (defaults work for demo)
```

3. **Initialize database and seed demo data:**
```bash
python seed.py
```

4. **Run the development server:**
```bash
python app.py
```

5. **Open in browser:**
```
http://127.0.0.1:51879
```

## ✨ Features

### Core Functionality
- **🏪 Newsstand** - Browse publishers with filters, search, and infinite scroll
- **📰 Pay-to-Unlock** - One-click micropayments to unlock premium articles
- **💰 Digital Wallet** - Preload balance, instant payments, refund window (10 min)
- **🎯 Smart Routing** - Client-side SPA with hash-based navigation
- **🔐 Authentication** - Email login + magic link support
- **📊 Transaction History** - Full audit trail with revenue splits

### Publisher Features
- **📈 Analytics Console** - All-time and 7-day revenue stats with interactive charts
- **💵 Revenue Splits** - Configurable split rules by role (author, editor, etc.)
- **📥 CSV Export** - Download transaction data
- **👥 Author Management** - View and manage author relationships
- **📝 Content Curation** - Browse and add independent author submissions
- **⚙️ Publisher Settings** - Customize branding, pricing, and author split defaults

### Admin Features
- **🎨 Theme Customization** - Live theme editor with colors, fonts, gradients
- **⚙️ Site Settings** - Toggle navigation items, configure layout

### Technical Features
- **🔒 Security** - CSRF protection, rate limiting, CORS, security headers
- **⚡ Performance** - Lazy loading, skeleton loaders, optimized assets
- **♿ Accessibility** - Keyboard navigation, ARIA labels, focus states
- **📱 Responsive** - Mobile-first design, touch-friendly interactions
- **🎯 API-First** - Comprehensive REST APIs for all operations
- **🎓 Interactive Tours** - Guided onboarding for readers, authors, and publishers (Shepherd.js)
- **🎨 Showcase Sites** - Branded microsites with custom themes for creators

## 🏗️ Architecture

### Backend (Flask)
- **Framework:** Flask 3.0+ with Blueprints
- **Database:** SQLAlchemy with SQLite (easily swappable)
- **Auth:** Flask-Login + JWT tokens
- **Validation:** Marshmallow schemas
- **Security:** CSRF, rate limiting, CORS

### Frontend (Vanilla JS SPA)
- **Router:** Custom hash-based client-side routing
- **API Client:** Fetch-based API wrapper
- **State Management:** Simple reactive auth state
- **Styling:** Modern CSS with design tokens, glassmorphism
- **No framework dependencies** - Pure vanilla JavaScript

### API Structure
```
/api
  /auth          - Authentication (login, magic link, logout, me)
  /account       - Wallet and transactions
  /publishers    - Publisher data
  /articles      - Article listings and details
  /categories    - Publisher categories
  /pay           - Payment processing
  /verify        - Payment verification
  /refund        - Refund processing
  /publisher     - Publisher console APIs
  /admin         - Admin APIs (theme, site, splits)
```

## 📖 Usage

### 🎓 Interactive Guided Tours

Paypr includes interactive onboarding tours to help you explore the platform:

- **Reader Tour** - Learn how to browse, unlock articles, and manage your wallet
- **Author Tour** - Discover how to publish content and track your earnings  
- **Publisher Tour** - Explore content curation and author management

Access tours from the "🎓 Tours" dropdown in the navbar. Tours auto-start for first-time visitors and track completion in localStorage.

### Demo Flow

1. **Browse Publishers** - Visit the newsstand at `/`
2. **Login** - Click "Login" and enter any email (e.g., `demo@paypr.com`)
   - New accounts automatically get $5.00 starter balance
3. **Select Publisher** - Click on any publisher to view their articles
4. **Read Article** - Click an article to see the preview
5. **Unlock Content** - Click "Unlock Article" to pay and access full content
6. **Refund Window** - You have 10 minutes to request a refund
7. **View History** - Check transaction history and wallet balance

### 🎯 Showcase Demonstrations

Explore two complete showcase sites demonstrating different revenue models:

#### Smerconish.com (Multi-Source Model)
- **URL:** `http://127.0.0.1:51879/#/showcase/smerconish`
- **Model:** Content from multiple publishers with custom splits
- **Examples:**
  - CNN articles (45% author / 45% publisher / 10% platform)
  - SiriusXM podcasts (50% / 40% / 10% split)
  - Independent content (90% / 10% split)
- Demonstrates how a creator can aggregate content from various distribution partners

#### TechPulse Newsletter (Independent Model)
- **URL:** `http://127.0.0.1:51879/#/showcase/technewsletter`  
- **Model:** 100% independent creator, no publisher intermediary
- **Split:** 90% to author, 10% to platform
- Demonstrates the indie creator model with full creative control
- Modern tech-focused design showcasing the platform's flexibility

### Admin Access

1. Navigate to the admin login (if needed, create route or use API directly)
2. Default credentials: `admin` / `demo123`
3. Customize theme colors, fonts, and site settings

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available options:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 51879 | Server port |
| `FLASK_ENV` | development | Environment mode |
| `SECRET_KEY` | (auto) | Flask session secret |
| `JWT_SECRET_KEY` | (auto) | JWT token secret |
| `PLATFORM_FEE_BPS` | 0 | Rail usage fee — zero by doctrine (flat ~5¢ knob if ever, never bps) |
| `DAILY_SPEND_CAP_CENTS` | 1500 | Daily spending limit ($15) |
| `STRIPE_API_KEY` | (optional) | Stripe test key |

### Platform Fees

Configure revenue splits in the admin panel or via API:
- Platform fee: Set via `PLATFORM_FEE_BPS` (basis points)
- Publisher splits: Configure per-publisher in admin

## 🧪 Development

### Reseed Database

While the server is running:
```bash
python seed.py
```

Or use the dev endpoint (requires login):
```
POST /dev/reseed
```

### API Testing

Use the included Healthcheck endpoint:
```bash
curl http://127.0.0.1:51879/healthz
```

Example API calls:
```bash
# Get publishers
curl http://127.0.0.1:51879/api/publishers

# Get categories
curl http://127.0.0.1:51879/api/categories

# Get article
curl http://127.0.0.1:51879/api/articles/1
```

## 📁 Project Structure

```
PayprProto/
├── app.py                 # Flask app factory
├── config.py             # Configuration classes
├── models.py             # SQLAlchemy models
├── extensions.py         # Flask extensions
├── seed.py              # Database seeder
├── requirements.txt     # Python dependencies
├── blueprints/          # Flask blueprints
│   ├── api.py          # REST API endpoints
│   ├── account.py      # User account routes
│   ├── publisher.py    # Publisher routes
│   ├── admin.py        # Admin routes
│   └── dev.py          # Dev tools
├── services/           # Business logic
│   ├── payments.py    # Payment calculations
│   ├── tokens.py      # JWT handling
│   ├── events.py      # Analytics tracking
│   └── schemas.py     # Validation schemas
├── static/            # Frontend SPA
│   ├── index.html    # SPA entry point
│   ├── app.js        # Main application
│   ├── css/          # Stylesheets
│   └── js/           # JavaScript modules
│       ├── api.js         # API client
│       ├── auth.js        # Auth manager
│       ├── router.js      # Client router
│       ├── components/    # UI components
│       └── pages/         # Page views
└── docs/             # Documentation
```

## 🧪 Testing

```bash
pytest
```

## 🐳 Docker

```bash
docker compose up --build
```

Then visit: http://127.0.0.1:51879

## 📝 API Documentation

Full API documentation available at [docs/API.md](docs/API.md)

Quick reference:
- All API endpoints are under `/api/`
- Authentication uses session cookies
- Payment APIs require authentication
- Admin APIs require admin session

## 🔐 Security

- CSRF protection on all forms and state-changing operations
- Rate limiting on sensitive endpoints
- Security headers (CSP, X-Frame-Options, etc.)
- JWT tokens for payment verification
- Session-based authentication
- SQL injection protection via SQLAlchemy
- XSS protection via proper escaping

## 🚢 Production Deployment

**Note:** This is a prototype. For production:

1. Use PostgreSQL instead of SQLite
2. Set strong `SECRET_KEY` and `JWT_SECRET_KEY`
3. Enable HTTPS and set `SESSION_COOKIE_SECURE=True`
4. Use Redis for rate limiting and caching
5. Configure proper Stripe webhook handling
6. Set up proper email delivery for magic links
7. Configure Sentry or other monitoring
8. Use a production WSGI server (gunicorn, uwsgi)
9. Set up CDN for static assets

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

This is a prototype/demo project. Feel free to fork and adapt for your needs!

## 💬 Support

For questions or issues, please open an issue on GitHub.

---

**Built with ❤️ for quality journalism and micropayments**
