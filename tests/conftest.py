import os
import sys
import pytest

# Ensure project root on sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app import create_app  # noqa: E402


@pytest.fixture
def app():
    application = create_app()
    yield application


@pytest.fixture
def client(app):
    return app.test_client()
