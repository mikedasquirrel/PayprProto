from flask import Blueprint, render_template, request, redirect, url_for, flash, session, send_from_directory
from flask_login import login_required

from extensions import db, csrf
from models import ThemeSettings, AdminAccount, Publisher, SplitRule, SiteSettings
from werkzeug.security import generate_password_hash, check_password_hash


bp = Blueprint("admin", __name__, template_folder="../templates")
@bp.route('/media', methods=['GET'])
def media_library():
    # simple directory listing of /static/img
    import os
    img_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'img')
    try:
        files = [f for f in os.listdir(img_dir) if not f.startswith('.')]
    except Exception:
        files = []
    return render_template('admin_media.html', files=files)


@bp.route('/media/upload', methods=['POST'])
@csrf.exempt
def media_upload():
    if not is_admin_authenticated():
        return redirect(url_for('admin.admin_login'))
    # delete flow
    if request.form.get('delete'):
        fname = request.form.get('delete')
        import os
        img_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'img')
        try:
            os.remove(os.path.join(img_dir, fname))
            flash('Deleted', 'info')
        except Exception:
            flash('Delete failed', 'error')
        return redirect(url_for('admin.media_library'))
    # multi-delete flow
    delete_many = request.form.getlist('delete_many')
    if delete_many:
        import os
        img_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'img')
        deleted = 0
        for fname in delete_many:
            try:
                os.remove(os.path.join(img_dir, fname))
                deleted += 1
            except Exception:
                pass
        flash(f'Deleted {deleted} file(s).', 'info')
        return redirect(url_for('admin.media_library'))
    file = request.files.get('file')
    if not file:
        flash('No file selected', 'error')
        return redirect(url_for('admin.media_library'))
    import os
    img_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'img')
    os.makedirs(img_dir, exist_ok=True)
    dest = os.path.join(img_dir, file.filename)
    file.save(dest)
    flash('Uploaded', 'success')
    return redirect(url_for('admin.media_library'))


def is_admin_authenticated() -> bool:
    return session.get("is_admin", False) is True


@bp.before_app_request
def _ensure_admin_flag():
    session.setdefault("is_admin", False)


@bp.route("/login", methods=["GET", "POST"])  # separate admin login
@csrf.exempt
def admin_login():
    if request.method == "POST":
        username = (request.form.get("username") or "").strip()
        password = request.form.get("password") or ""
        acct = AdminAccount.query.filter_by(username=username).first()
        if acct and check_password_hash(acct.password_hash, password):
            session["is_admin"] = True
            flash("Admin signed in.", "success")
            return redirect(url_for("admin.theme_get"))
        flash("Invalid admin credentials.", "error")
        return redirect(url_for("admin.admin_login"))
    return render_template("admin_login.html")


@bp.route("/logout")
def admin_logout():
    session["is_admin"] = False
    flash("Admin signed out.", "info")
    return redirect(url_for("public.newsstand"))


@bp.route("/theme", methods=["GET"])  # Simple admin page
def theme_get():
    if not is_admin_authenticated():
        return redirect(url_for("admin.admin_login"))
    theme = ThemeSettings.query.order_by(ThemeSettings.id.asc()).first()
    if not theme:
        theme = ThemeSettings()
        db.session.add(theme)
        db.session.commit()
    site = SiteSettings.query.order_by(SiteSettings.id.asc()).first()
    if not site:
        site = SiteSettings()
        db.session.add(site)
        db.session.commit()
    return render_template("admin_theme.html", theme=theme, site=site)


@bp.route("/theme", methods=["POST"])  # Save theme
@csrf.exempt
def theme_post():
    if not is_admin_authenticated():
        return redirect(url_for("admin.admin_login"))
    theme = ThemeSettings.query.order_by(ThemeSettings.id.asc()).first()
    if not theme:
        theme = ThemeSettings()
        db.session.add(theme)

    # Colors
    theme.color_ink = request.form.get("color_ink", theme.color_ink)
    theme.color_ash = request.form.get("color_ash", theme.color_ash)
    theme.color_smoke = request.form.get("color_smoke", theme.color_smoke)
    theme.color_paper = request.form.get("color_paper", theme.color_paper)
    theme.grad = request.form.get("grad", theme.grad)

    # Typography & sizing
    theme.font_body = request.form.get("font_body", theme.font_body)
    theme.font_body_link = request.form.get("font_body_link", theme.font_body_link)
    theme.font_headline = request.form.get("font_headline", theme.font_headline)
    theme.font_headline_link = request.form.get("font_headline_link", theme.font_headline_link)
    try:
        theme.base_font_px = int(request.form.get("base_font_px", theme.base_font_px))
    except Exception:
        pass
    try:
        theme.radius_px = int(request.form.get("radius_px", theme.radius_px))
    except Exception:
        pass

    # Assets
    theme.logo_text = request.form.get("logo_text", theme.logo_text)
    theme.favicon_url = request.form.get("favicon_url", theme.favicon_url)
    theme.watermark_css = request.form.get("watermark_css", theme.watermark_css)
    theme.default_kiosk_hero_url = request.form.get("default_kiosk_hero_url", theme.default_kiosk_hero_url)

    db.session.commit()
    # Site settings
    site = SiteSettings.query.order_by(SiteSettings.id.asc()).first() or SiteSettings()
    db.session.add(site)
    site.no_gradients = (request.form.get('no_gradients') == 'on')
    site.site_layout = request.form.get('site_layout', site.site_layout)
    # nav toggles
    for key in ['newsstand','walkthrough','publishers','platform','guide','showcase','bookmarklet','presskit','case','wallet','history','login']:
        setattr(site, f'nav_{key}', request.form.get(f'nav_{key}') == 'on')
    order = (request.form.get('nav_order_csv') or site.nav_order_csv).strip()
    if order:
        site.nav_order_csv = order
    db.session.commit()
    flash("Theme & site settings saved.", "success")
    return redirect(url_for("admin.theme_get"))


@bp.route('/splits', methods=['GET'])
def splits_get():
    if not is_admin_authenticated():
        return redirect(url_for('admin.admin_login'))
    pubs = Publisher.query.order_by(Publisher.name.asc()).all()
    rules_map = {}
    for p in pubs:
        rules = SplitRule.query.filter_by(publisher_id=p.id).all()
        rules_map[p.id] = rules
    return render_template('admin_splits.html', publishers=pubs, rules_map=rules_map)


@bp.route('/splits', methods=['POST'])
@csrf.exempt
def splits_post():
    if not is_admin_authenticated():
        return redirect(url_for('admin.admin_login'))
    pub_id = int(request.form.get('publisher_id') or 0)
    roles = request.form.getlist('role')
    bps_list = request.form.getlist('bps')
    labels = request.form.getlist('label')
    if not pub_id:
        flash('Missing publisher', 'error')
        return redirect(url_for('admin.splits_get'))
    # Clear existing
    SplitRule.query.filter_by(publisher_id=pub_id).delete()
    # Insert new
    for i, role in enumerate(roles):
        role = (role or '').strip()
        if not role:
            continue
        try:
            bps = int(bps_list[i])
        except Exception:
            bps = 0
        lab = (labels[i] if i < len(labels) else '') or role
        db.session.add(SplitRule(publisher_id=pub_id, role=role, percent_bps=bps, recipient_label=lab))
    db.session.commit()
    # Validate sum <= 10000
    total = db.session.query(db.func.coalesce(db.func.sum(SplitRule.percent_bps), 0)).filter_by(publisher_id=pub_id).scalar() or 0
    if total > 10000:
        flash(f"Warning: total split {total} bps exceeds 10000 (100%).", 'error')
    elif total < 10000:
        flash(f"Note: total split {total} bps leaves remainder to publisher.", 'info')
    flash('Split rules saved.', 'success')
    return redirect(url_for('admin.splits_get'))


