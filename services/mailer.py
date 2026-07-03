from __future__ import annotations

"""Transactional email via Resend (https://resend.com).

Stdlib only — no extra dependency. If RESEND_API_KEY is unset, every send is a
graceful no-op that returns False, so the app runs fine without email
configured (dev returns the magic link inline instead)."""

import json
import urllib.request
from typing import Optional

from flask import current_app


def email_enabled() -> bool:
    return bool(current_app.config.get("RESEND_API_KEY"))


def send_email(to: str, subject: str, html: str, text: Optional[str] = None) -> bool:
    """Send one email. Returns True on a 2xx from Resend, False otherwise
    (including when email is not configured). Never raises."""
    key = current_app.config.get("RESEND_API_KEY")
    if not key or not to:
        return False
    payload = {
        "from": current_app.config.get("MAIL_FROM") or "paypr <no-reply@paypr.pro>",
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return 200 <= r.status < 300
    except Exception:
        return False


def send_magic_link(to: str, link: str) -> bool:
    html = (
        '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;'
        'max-width:480px;margin:auto;color:#111">'
        '<h2 style="font-weight:600;margin:0 0 8px">Sign in to paypr</h2>'
        '<p style="color:#555;line-height:1.5">Tap below to sign in. This link expires in '
        '15 minutes and can be used once.</p>'
        f'<p style="margin:18px 0"><a href="{link}" style="display:inline-block;background:#111;'
        'color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px">Sign in</a></p>'
        f'<p style="color:#999;font-size:12px;word-break:break-all">Or paste this link: {link}</p>'
        '</div>'
    )
    return send_email(to, "Your paypr sign-in link", html, text=f"Sign in to paypr: {link}")
