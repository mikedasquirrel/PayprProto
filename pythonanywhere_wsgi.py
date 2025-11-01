#!/usr/bin/env python3
"""
PythonAnywhere WSGI Configuration
Copy this file to /var/www/paypr-mikedasquirrel_pythonanywhere_com_wsgi.py
"""

import sys
import os

# ============================================================================
# CONFIGURATION - Update these paths if needed
# ============================================================================
PROJECT_HOME = '/home/mikedasquirrel/PayprProto'
VENV_PATH = '/home/mikedasquirrel/PayprProto/.venv'
PYTHON_VERSION = 'python3.9'  # Change to your Python version (python3.10, python3.11, etc.)

# ============================================================================
# Setup Python Path
# ============================================================================
if PROJECT_HOME not in sys.path:
    sys.path.insert(0, PROJECT_HOME)

# ============================================================================
# Activate Virtual Environment
# ============================================================================
activate_this = os.path.join(VENV_PATH, 'bin/activate_this.py')

if os.path.exists(activate_this):
    # Python 3.8 and below
    exec(open(activate_this).read(), {'__file__': activate_this})
else:
    # Python 3.9+ - activate_this.py doesn't exist
    import site
    site.addsitedir(os.path.join(VENV_PATH, f'lib/{PYTHON_VERSION}/site-packages'))

# ============================================================================
# Environment Variables with Sensible Defaults
# ============================================================================
# Set production environment
os.environ.setdefault('FLASK_ENV', 'production')
os.environ.setdefault('DEBUG', 'False')

# Secret keys - OVERRIDE THESE IN .env FILE!
os.environ.setdefault('SECRET_KEY', 'production-secret-key-CHANGE-ME')
os.environ.setdefault('JWT_SECRET_KEY', 'production-jwt-secret-CHANGE-ME')

# Database
os.environ.setdefault('SQLALCHEMY_DATABASE_URI', f'sqlite:///{PROJECT_HOME}/paypr.db')

# Feature flags
os.environ.setdefault('FEATURE_PDF', 'true')
os.environ.setdefault('FEATURE_AUDIO', 'true')

# Platform settings
os.environ.setdefault('PLATFORM_FEE_BPS', '1000')
os.environ.setdefault('DAILY_SPEND_CAP_CENTS', '1500')

# Load .env file if it exists (will override defaults above)
try:
    from dotenv import load_dotenv
    env_path = os.path.join(PROJECT_HOME, '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
        print(f"Loaded environment from {env_path}")
    else:
        print(f"No .env file found at {env_path}, using defaults")
except ImportError:
    print("python-dotenv not installed, using environment defaults")

# ============================================================================
# Create Flask Application
# ============================================================================
from app import create_app

application = create_app()

# ============================================================================
# Debug Info (Remove in production if needed)
# ============================================================================
print("=" * 80)
print("PayprProto WSGI Configuration Loaded")
print(f"Project Home: {PROJECT_HOME}")
print(f"Virtual Env: {VENV_PATH}")
print(f"Flask ENV: {os.environ.get('FLASK_ENV')}")
print(f"Debug Mode: {os.environ.get('DEBUG')}")
print("=" * 80)

