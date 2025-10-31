from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_wtf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask import current_app
from flask_cors import CORS


db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
csrf = CSRFProtect()
def _storage_from_env():
    try:
        uri = current_app.config.get('RATE_LIMIT_STORAGE')
        if uri:
            from limits.storage import storage_from_string
            return storage_from_string(uri)
    except Exception:
        pass
    return None

limiter = Limiter(key_func=get_remote_address, default_limits=["200 per hour"], storage_uri=None)  # replaced in init
cors = CORS()
