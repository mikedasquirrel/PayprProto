from __future__ import annotations

import json
from typing import Optional, Dict, Any

from flask_login import current_user
from flask import request
from extensions import db
from models import Event


def track_event(name: str, *, article_id: Optional[int] = None, publisher_id: Optional[int] = None, metadata: Optional[Dict[str, Any]] = None) -> None:
    try:
        meta = dict(metadata or {})
        if 'ip' not in meta:
            meta['ip'] = request.remote_addr
        if 'user_agent' not in meta:
            meta['user_agent'] = request.headers.get('User-Agent')
        evt = Event(
            user_id=(current_user.id if getattr(current_user, 'is_authenticated', False) else None),
            event_name=name,
            article_id=article_id,
            publisher_id=publisher_id,
            metadata_json=json.dumps(meta),
        )
        db.session.add(evt)
        db.session.commit()
    except Exception:
        db.session.rollback()
