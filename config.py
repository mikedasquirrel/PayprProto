import os
from datetime import timedelta


def str_to_bool(value: str, default: bool = True) -> bool:
    if value is None:
        return default
    return str(value).lower() in ("1", "true", "yes", "on")


class BaseConfig:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret-change-me")

    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(os.path.dirname(__file__), 'paypr.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Our code reads STRIPE_API_KEY, but .env.example historically said
    # STRIPE_SECRET_KEY — honour both so a key set under either name works.
    STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY") or os.environ.get("STRIPE_SECRET_KEY")
    STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY")
    STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")

    # Email via Resend. If RESEND_API_KEY is unset, all email is a graceful no-op.
    RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
    MAIL_FROM = os.environ.get("PAYPR_MAIL_FROM", "paypr <no-reply@paypr.pro>")
    PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL")  # e.g. https://paypr.pro
    # Rail usage fee — DOCTRINE (2026-07-02): the rail takes NO fee on usage.
    # Charges, unlocks and metered runs settle 100% to creators/apps; the only
    # platform revenue is card-cost recovery at top-up (production rail). If a
    # usage fee ever ships, it will be a small FLAT amount (~5¢) via a new
    # RAIL_FEE_CENTS knob — never a percentage. Do not raise this default.
    PLATFORM_FEE_BPS = int(os.environ.get("PLATFORM_FEE_BPS", 0))
    DAILY_SPEND_CAP_CENTS = int(os.environ.get("DAILY_SPEND_CAP_CENTS", 1500))
    # Spendable credit granted to a brand-new account. Default 0: a bare email
    # must never mint spendable money (that was a free-money faucet). Set a small
    # value only if that credit is tracked as non-withdrawable.
    WELCOME_CREDIT_CENTS = int(os.environ.get("WELCOME_CREDIT_CENTS", 0))

    WTF_CSRF_TIME_LIMIT = 3600
    REMEMBER_COOKIE_DURATION = timedelta(days=7)
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False  # True in production

    TEMPLATES_AUTO_RELOAD = True
    JSON_SORT_KEYS = False

    DEFAULT_PORT = int(os.environ.get("PORT", 5001))

    SEND_FILE_MAX_AGE_DEFAULT = 86400  # 1 day for static assets

    FEATURE_PDF = str_to_bool(os.environ.get("FEATURE_PDF", "true"), True)
    FEATURE_AUDIO = str_to_bool(os.environ.get("FEATURE_AUDIO", "true"), True)
    RATE_LIMIT_STORAGE = os.environ.get("RATE_LIMIT_STORAGE")


class DevelopmentConfig(BaseConfig):
    ENV = "development"
    DEBUG = True


class StagingConfig(BaseConfig):
    ENV = "staging"
    DEBUG = False
    SESSION_COOKIE_SECURE = True


class ProductionConfig(BaseConfig):
    ENV = "production"
    DEBUG = False
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_SAMESITE = "Strict"
    
    # PythonAnywhere / Production Optimizations
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 280,  # Less than 300s timeout
        'pool_pre_ping': True,  # Verify connections before use
        'max_overflow': 5,
        'pool_timeout': 30
    }


def get_config():
    env = os.environ.get("FLASK_ENV", "development").lower()
    if env == "production":
        return ProductionConfig
    if env == "staging":
        return StagingConfig
    return DevelopmentConfig
