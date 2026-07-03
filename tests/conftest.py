import os
import sys
import tempfile
import pytest

# Ensure project root on sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Safe test defaults, set BEFORE app/config import — the DB URI is read at
# config-import time, so without this the app would bind to the production /
# mounted database (where SQLite can't lock). Shell env still wins (setdefault).
# tempfile.gettempdir() works everywhere (macOS has no /dev/shm).
os.environ.setdefault("FLASK_ENV", "development")
os.environ.setdefault("WELCOME_CREDIT_CENTS", "0")
os.environ.setdefault(
    "DATABASE_URL",
    "sqlite:///" + os.path.join(tempfile.gettempdir(), "paypr_test.db"),
)

from app import create_app  # noqa: E402
from extensions import db  # noqa: E402


@pytest.fixture
def app():
    application = create_app()
    # Hermetic tests: the DB file persists across tests in one session (the URI
    # is baked at config import), so reset the schema per test. Module-scoped
    # suites (test_money_core) manage their own app/DB and are unaffected.
    with application.app_context():
        db.drop_all()
        db.create_all()
    yield application


@pytest.fixture
def client(app):
    return app.test_client()
