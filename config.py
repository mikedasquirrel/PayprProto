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

    STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")
    STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY")
    PLATFORM_FEE_BPS = int(os.environ.get("PLATFORM_FEE_BPS", 1000))  # 10%
    DAILY_SPEND_CAP_CENTS = int(os.environ.get("DAILY_SPEND_CAP_CENTS", 1500))

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


def get_config():
    env = os.environ.get("FLASK_ENV", "development").lower()
    if env == "production":
        return ProductionConfig
    if env == "staging":
        return StagingConfig
    return DevelopmentConfig
