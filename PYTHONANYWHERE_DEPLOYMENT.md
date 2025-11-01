# PythonAnywhere Deployment Guide

## Quick Start

This guide helps you deploy Paypr on PythonAnywhere.

## Prerequisites

- PythonAnywhere account (free or paid)
- Basic familiarity with Python and Flask

## Step 1: Upload Code

1. Log in to PythonAnywhere
2. Go to "Files" tab
3. Upload your project or clone from Git:
```bash
git clone https://github.com/yourusername/paypr.git
cd paypr
```

## Step 2: Create Virtual Environment

In a PythonAnywhere Bash console:

```bash
cd ~/paypr  # or your project directory
python3.10 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Step 3: Configure Environment Variables

Create a `.env` file in your project root:

```bash
nano .env
```

Add the following (customize values):

```env
FLASK_ENV=production
DEBUG=False
SECRET_KEY=<generate-with: python -c "import secrets; print(secrets.token_hex(32))">
JWT_SECRET_KEY=<generate-with: python -c "import secrets; print(secrets.token_hex(32))">

# Database - Use PythonAnywhere MySQL
DATABASE_URL=mysql://username:password@username.mysql.pythonanywhere-services.com/username$paypr

# Stripe (optional)
STRIPE_API_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Platform Settings
PLATFORM_FEE_BPS=1000
DAILY_SPEND_CAP_CENTS=1500

# Features
FEATURE_PDF=true
FEATURE_AUDIO=true
```

## Step 4: Set Up Database

### Option A: SQLite (Simple, for testing)
Already configured by default. Just run:
```bash
python seed.py
```

### Option B: MySQL (Recommended for production)

1. Go to PythonAnywhere "Databases" tab
2. Initialize MySQL and set a password
3. Create database: `username$paypr`
4. Update DATABASE_URL in .env (see above)
5. Run migrations:
```bash
source venv/bin/activate
flask db upgrade  # If using migrations
# OR
python seed.py  # To seed data
```

## Step 5: Configure Web App

1. Go to "Web" tab in PythonAnywhere
2. Click "Add a new web app"
3. Choose "Manual configuration"
4. Select Python 3.10
5. Set up the WSGI file:

### WSGI Configuration (`/var/www/username_pythonanywhere_com_wsgi.py`):

```python
import sys
import os

# Add your project directory to path
project_home = '/home/username/paypr'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Load environment variables
from dotenv import load_dotenv
load_dotenv(os.path.join(project_home, '.env'))

# Import app
from app import create_app
application = create_app()
```

## Step 6: Configure Static Files

In the PythonAnywhere Web tab, add static file mappings:

| URL | Directory |
|-----|-----------|
| `/static/` | `/home/username/paypr/static/` |

## Step 7: Set Virtualenv Path

In the PythonAnywhere Web tab:
- Virtualenv: `/home/username/paypr/venv`

## Step 8: Reload and Test

1. Click "Reload" button in Web tab
2. Visit your site: `https://username.pythonanywhere.com`
3. Test login and basic functionality

## Optimization for PythonAnywhere

### 1. Connection Pooling

PythonAnywhere has connection limits. Optimize in `config.py`:

```python
class ProductionConfig(BaseConfig):
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 280,  # Less than PythonAnywhere's 300s timeout
        'pool_pre_ping': True,  # Verify connections
        'max_overflow': 5
    }
```

### 2. Session Configuration

For production security:

```python
SESSION_COOKIE_SECURE = True  # HTTPS only
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
PERMANENT_SESSION_LIFETIME = timedelta(days=7)
```

### 3. Static File Caching

Already configured in `app.py`:
```python
SEND_FILE_MAX_AGE_DEFAULT = 86400  # 1 day
```

### 4. Rate Limiting

For production, use Redis (available on paid plans):

```python
# In .env
RATE_LIMIT_STORAGE=redis://localhost:6379

# Or use in-memory (default)
# Works but doesn't persist across worker restarts
```

## Environment-Specific Settings

### Development (.env)
```env
FLASK_ENV=development
DEBUG=True
DATABASE_URL=sqlite:///paypr.db
```

### Staging (.env)
```env
FLASK_ENV=staging
DEBUG=False
DATABASE_URL=mysql://user:pass@host/staging_db
STRIPE_API_KEY=sk_test_...
```

### Production (.env)
```env
FLASK_ENV=production
DEBUG=False
DATABASE_URL=mysql://user:pass@host/production_db
STRIPE_API_KEY=sk_live_...
SESSION_COOKIE_SECURE=True
```

## Troubleshooting

### Error: "No module named 'app'"
- Check WSGI file path configuration
- Ensure virtual environment is activated
- Verify sys.path includes project directory

### Database Connection Errors
- Check DATABASE_URL format
- Verify MySQL password
- Test connection in console: `mysql -u username -p`

### Static Files Not Loading
- Check static file mappings in Web tab
- Verify paths are absolute
- Clear browser cache

### 500 Internal Server Error
- Check error log in PythonAnywhere Web tab
- Look at `/var/log/username.pythonanywhere.com.error.log`
- Enable debug temporarily to see errors

## Security Checklist

- [ ] Set strong SECRET_KEY and JWT_SECRET_KEY
- [ ] Set DEBUG=False in production
- [ ] Use HTTPS (automatically enabled on PythonAnywhere)
- [ ] Set SESSION_COOKIE_SECURE=True
- [ ] Use production Stripe keys for real payments
- [ ] Set up regular database backups
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Review security headers in app.py

## Monitoring

### View Logs
```bash
tail -f /var/log/username.pythonanywhere.com.error.log
tail -f /var/log/username.pythonanywhere.com.access.log
```

### Optional: Sentry Integration
Add to .env:
```env
SENTRY_DSN=https://your-sentry-dsn-here
```

## Scheduled Tasks (Optional)

For maintenance tasks, use PythonAnywhere's Tasks tab:

```bash
# Daily backup
cd /home/username/paypr && python scripts/backup.py

# Weekly cleanup
cd /home/username/paypr && python scripts/cleanup.py
```

## Scaling Considerations

### Free Account Limits
- 1 web app
- Limited CPU time
- SQLite or small MySQL database

### Paid Account Benefits
- Multiple web apps
- More CPU time
- Larger databases
- Redis access
- SSH access
- More concurrent connections

## Support

- PythonAnywhere Help: https://help.pythonanywhere.com/
- Paypr Documentation: See docs/ folder
- Flask Documentation: https://flask.palletsprojects.com/

## Quick Reference

```bash
# Activate environment
source ~/paypr/venv/bin/activate

# Reload app after changes
touch /var/www/username_pythonanywhere_com_wsgi.py

# Check logs
tail -f ~/logs/paypr.log

# Run migrations
flask db upgrade

# Reseed database (careful!)
python seed.py
```

## Production Best Practices

1. **Use MySQL, not SQLite** for production
2. **Set strong secrets** - never use default values
3. **Enable HTTPS** (automatic on PythonAnywhere)
4. **Monitor error logs** regularly
5. **Back up database** weekly
6. **Test payment flow** thoroughly before launch
7. **Configure proper rate limiting**
8. **Set up error notifications** (Sentry)
9. **Document your configuration**
10. **Test on staging first** before production updates

---

**Ready to Deploy!** Follow these steps and your Paypr platform will be live on PythonAnywhere.

