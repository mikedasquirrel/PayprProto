# PythonAnywhere Deployment Guide

## Quick Deploy Steps

### 1. Pull Latest Code

In PythonAnywhere Bash console:
```bash
cd ~/PayprProto
git pull origin main
```

### 2. Install Dependencies

```bash
cd ~/PayprProto
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Update WSGI File

Copy the contents of `pythonanywhere_wsgi.py` to your WSGI configuration file:

**Location**: `/var/www/paypr-mikedasquirrel_pythonanywhere_com_wsgi.py`

Or use this command:
```bash
cp ~/PayprProto/pythonanywhere_wsgi.py /var/www/paypr-mikedasquirrel_pythonanywhere_com_wsgi.py
```

**Update the paths in the WSGI file** if your username or paths are different:
- `PROJECT_HOME = '/home/mikedasquirrel/PayprProto'`
- `VENV_PATH = '/home/mikedasquirrel/PayprProto/.venv'`
- `PYTHON_VERSION = 'python3.9'` (check with `python3 --version`)

### 4. (Optional) Create .env File for Production Secrets

If you need to override defaults (Stripe keys, custom secrets, etc.):

```bash
cd ~/PayprProto
cp .env.example .env
nano .env  # Edit with your actual values
```

**Important**: Never commit `.env` to git! It's already in `.gitignore`.

### 5. Reload Web App

Go to the **Web** tab in PythonAnywhere and click the green **Reload** button.

---

## Environment Variables

The app works out of the box with sensible defaults. You only need a `.env` file if you want to override:

### Required for Payments
- `STRIPE_API_KEY` - Your Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key

### Security (Recommended to change)
- `SECRET_KEY` - Flask secret key (auto-generated if not set)
- `JWT_SECRET_KEY` - JWT signing key (auto-generated if not set)

### Optional
- `SENTRY_DSN` - Error tracking
- `RATE_LIMIT_STORAGE` - Redis URL for rate limiting

---

## Troubleshooting

### "ModuleNotFoundError"
- Make sure you've installed requirements: `pip install -r requirements.txt`
- Make sure WSGI file points to correct virtual environment

### "No module named 'app'"
- Check PROJECT_HOME path in WSGI file
- Make sure you're in the right directory

### Changes not showing
- Click **Reload** in the Web tab
- Check error log in PythonAnywhere

### Database issues
- Make sure `paypr.db` exists: `ls ~/PayprProto/paypr.db`
- Run migrations if needed: `flask db upgrade`

---

## First Time Setup

If this is your first deployment:

```bash
# 1. Clone repository
cd ~
git clone https://github.com/mikedasquirrel/PayprProto.git
cd PayprProto

# 2. Create virtual environment
python3.9 -m venv .venv
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Initialize database
python3 -c "from app import create_app; app = create_app(); app.app_context().push(); from extensions import db; db.create_all()"

# 5. Copy and configure WSGI file
cp pythonanywhere_wsgi.py /var/www/paypr-mikedasquirrel_pythonanywhere_com_wsgi.py

# 6. Configure web app in PythonAnywhere Web tab
# - Source code: /home/mikedasquirrel/PayprProto
# - Working directory: /home/mikedasquirrel/PayprProto
# - WSGI file: /var/www/paypr-mikedasquirrel_pythonanywhere_com_wsgi.py

# 7. Reload web app
```

Done! 🚀

