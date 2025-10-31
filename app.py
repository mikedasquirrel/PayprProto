import os
import logging
import uuid
from flask import Flask, g, render_template, jsonify, request
from marshmallow import ValidationError
from dotenv import load_dotenv

from config import get_config
from extensions import db, migrate, login_manager, csrf, limiter, cors


def create_app() -> Flask:
    # Load .env early
    load_dotenv()

    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config.from_object(get_config())

    # Optional Sentry
    try:
        import sentry_sdk
        from sentry_sdk.integrations.flask import FlaskIntegration
        dsn = os.environ.get("SENTRY_DSN")
        if dsn:
            sentry_sdk.init(dsn=dsn, integrations=[FlaskIntegration()])
    except Exception:
        pass

    # Logging
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    # Init extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    csrf.init_app(app)
    # Configure limiter storage if provided
    try:
        storage_uri = app.config.get('RATE_LIMIT_STORAGE')
        if storage_uri:
            limiter._storage_uri = storage_uri  # type: ignore
    except Exception:
        pass
    limiter.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    login_manager.login_view = "account.login"

    # Feature flags
    app.config.setdefault("FEATURE_PDF", os.environ.get("FEATURE_PDF", "true").lower() == "true")
    app.config.setdefault("FEATURE_AUDIO", os.environ.get("FEATURE_AUDIO", "true").lower() == "true")

    # i18n stub and config exposure
    app.jinja_env.globals.setdefault("_", lambda s: s)

    @app.context_processor
    def inject_globals():
        # Inject config plus dynamic theme settings as CSS variables
        try:
            from models import ThemeSettings, SiteSettings
            theme = ThemeSettings.query.order_by(ThemeSettings.id.asc()).first()
            site = SiteSettings.query.order_by(SiteSettings.id.asc()).first()
        except Exception:
            theme = None
            site = None

        css_vars = {}
        if theme:
            css_vars = {
                "--ink": theme.color_ink,
                "--ash": theme.color_ash,
                "--smoke": theme.color_smoke,
                "--paper": theme.color_paper,
                "--grad": theme.grad,
                "--radius": f"{theme.radius_px}px",
                "--base-font": str(theme.base_font_px),
                "--font-body": theme.font_body,
                "--font-headline": theme.font_headline,
            }
        return {"config": app.config, "theme_vars": css_vars, "theme": theme, "site": site}

    # Register blueprints
    # Note: public, account, and publisher blueprints are now replaced by the SPA + API
    # from blueprints.public import bp as public_bp
    # from blueprints.account import bp as account_bp
    # from blueprints.publisher import bp as publisher_bp
    from blueprints.api import bp as api_bp
    from blueprints.external import bp as external_bp
    from blueprints.showcase import bp as showcase_bp

    # app.register_blueprint(public_bp)  # Disabled - using SPA
    # app.register_blueprint(account_bp)  # Disabled - using API
    # app.register_blueprint(publisher_bp)  # Disabled - using API
    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(external_bp)
    app.register_blueprint(showcase_bp)

    # Admin (theme settings etc.)
    try:
        from blueprints.admin import bp as admin_bp
        app.register_blueprint(admin_bp, url_prefix="/admin")
    except Exception:
        pass

    if app.config.get("ENV") == "development":
        from blueprints.dev import bp as dev_bp
        app.register_blueprint(dev_bp)

    @app.route("/healthz")
    def healthz():
        return jsonify({"ok": True}), 200

    # Serve SPA for all non-API routes
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_spa(path):
        # Don't serve SPA for API routes or static files
        if path.startswith("api/") or path.startswith("static/"):
            from flask import abort
            abort(404)
        
        # Serve index.html for all other routes (SPA)
        import os
        index_path = os.path.join(app.static_folder, "index.html")
        if os.path.exists(index_path):
            return app.send_static_file("index.html")
        else:
            # Fallback if index.html doesn't exist yet
            return "<html><body><h1>Paypr SPA</h1><p>Building frontend...</p></body></html>", 200

    @app.before_request
    def _inject_globals():
        g.request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        try:
            from flask_login import current_user
            g.wallet = f"{(current_user.wallet_cents or 0)/100:.2f}" if current_user.is_authenticated else "0.00"
        except Exception:
            g.wallet = "0.00"

    @app.after_request
    def _after(resp):
        resp.headers["X-Request-Id"] = g.get("request_id", "-")
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "DENY")
        resp.headers.setdefault("Referrer-Policy", "no-referrer")
        # Basic CSP suitable for this prototype - allow images from anywhere for demo
        resp.headers.setdefault("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https: http:; style-src 'self' 'unsafe-inline' https://fonts.gstatic.com https://fonts.googleapis.com; script-src 'self'; connect-src 'self'; font-src 'self' https://fonts.gstatic.com; base-uri 'none'; frame-ancestors 'none'")
        return resp

    # Errors
    @app.errorhandler(ValidationError)
    def bad_request(err: ValidationError):
        return jsonify({"error": err.messages}), 400

    @app.errorhandler(404)
    def not_found(e):
        return render_template("errors/404.html"), 404

    @app.errorhandler(500)
    def server_error(e):
        return render_template("errors/500.html"), 500

    @app.errorhandler(429)
    def too_many(e):
        return jsonify({"error": "Rate limit"}), 429

    # Ensure DB exists for demo run
    with app.app_context():
        from models import (  # noqa: F401
            User, Publisher, Article, Transaction, Event, AdminAccount,
            AuthorProfile, ContentLicense, ShowcaseSite, AuthorEarnings,
            ThemeSettings, SiteSettings, SplitRule, RevokedToken,
            ContactMessage, MagicLogin, PublisherUser
        )
        db.create_all()
        # Dev-friendly: ensure new columns exist in SQLite without migrations
        try:
            uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
            if uri.startswith("sqlite"):
                from sqlalchemy import text
                # Check and add 'category' and 'accent_color' on publishers
                info = db.session.execute(text("PRAGMA table_info('publishers')")).fetchall()
                cols = {row[1] for row in info}
                if "category" not in cols:
                    db.session.execute(text("ALTER TABLE publishers ADD COLUMN category VARCHAR(50)"))
                if "accent_color" not in cols:
                    db.session.execute(text("ALTER TABLE publishers ADD COLUMN accent_color VARCHAR(16)"))
                if "layout_style" not in cols:
                    db.session.execute(text("ALTER TABLE publishers ADD COLUMN layout_style VARCHAR(32)"))
                if "strapline" not in cols:
                    db.session.execute(text("ALTER TABLE publishers ADD COLUMN strapline VARCHAR(300)"))
                # Ensure split_breakdown_json on transactions
                tinfo = db.session.execute(text("PRAGMA table_info('transactions')")).fetchall()
                tcols = {row[1] for row in tinfo}
                if "split_breakdown_json" not in tcols:
                    db.session.execute(text("ALTER TABLE transactions ADD COLUMN split_breakdown_json TEXT"))
                # Ensure new fields on theme_settings for admin theme page
                ts_info = db.session.execute(text("PRAGMA table_info('theme_settings')")).fetchall()
                ts_cols = {row[1] for row in ts_info}
                if "font_body_link" not in ts_cols:
                    db.session.execute(text("ALTER TABLE theme_settings ADD COLUMN font_body_link VARCHAR(500)"))
                if "font_headline_link" not in ts_cols:
                    db.session.execute(text("ALTER TABLE theme_settings ADD COLUMN font_headline_link VARCHAR(500)"))
                if "default_kiosk_hero_url" not in ts_cols:
                    db.session.execute(text("ALTER TABLE theme_settings ADD COLUMN default_kiosk_hero_url VARCHAR(500)"))
                
                # Ensure new author marketplace fields on articles
                art_info = db.session.execute(text("PRAGMA table_info('articles')")).fetchall()
                art_cols = {row[1] for row in art_info}
                if "author_id" not in art_cols:
                    db.session.execute(text("ALTER TABLE articles ADD COLUMN author_id INTEGER"))
                if "license_type" not in art_cols:
                    db.session.execute(text("ALTER TABLE articles ADD COLUMN license_type VARCHAR(50) DEFAULT 'independent'"))
                if "custom_splits" not in art_cols:
                    db.session.execute(text("ALTER TABLE articles ADD COLUMN custom_splits TEXT"))
                if "status" not in art_cols:
                    db.session.execute(text("ALTER TABLE articles ADD COLUMN status VARCHAR(20) DEFAULT 'published'"))
                if "updated_at" not in art_cols:
                    db.session.execute(text("ALTER TABLE articles ADD COLUMN updated_at TIMESTAMP"))
                
                # Ensure new fields on publishers
                pub_info = db.session.execute(text("PRAGMA table_info('publishers')")).fetchall()
                pub_cols = {row[1] for row in pub_info}
                if "accepts_submissions" not in pub_cols:
                    db.session.execute(text("ALTER TABLE publishers ADD COLUMN accepts_submissions BOOLEAN DEFAULT 1"))
                if "default_author_split_bps" not in pub_cols:
                    db.session.execute(text("ALTER TABLE publishers ADD COLUMN default_author_split_bps INTEGER DEFAULT 6000"))
                
                db.session.commit()
        except Exception:
            db.session.rollback()

        # Ensure a default admin account for demo
        try:
            from werkzeug.security import generate_password_hash
            if not AdminAccount.query.first():
                acct = AdminAccount(username="admin", password_hash=generate_password_hash("demo123"))
                db.session.add(acct)
                db.session.commit()
        except Exception:
            db.session.rollback()

    return app


if __name__ == "__main__":
    application = create_app()
    port = application.config.get("DEFAULT_PORT", 51879)
    application.run(host="0.0.0.0", port=port, debug=application.config.get("DEBUG", False))
