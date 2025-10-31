from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

import hashlib
import jwt
from flask import current_app

from extensions import db
from models import RevokedToken


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def issue_jwt(user_id: int, article_id: int, publisher_id: int, exp_minutes: int = 10) -> str:
    now = datetime.now(tz=timezone.utc)
    payload = {
        "sub": str(user_id),
        "article_id": article_id,
        "publisher_id": publisher_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=exp_minutes)).timestamp()),
    }
    secret = current_app.config.get("JWT_SECRET_KEY")
    token = jwt.encode(payload, secret, algorithm="HS256")
    return token


def verify_jwt(token: str) -> Optional[Dict[str, Any]]:
    try:
        # Check revocation
        token_hash = _hash_token(token)
        if db.session.query(RevokedToken.id).filter_by(token_hash=token_hash).first():
            return None
        secret = current_app.config.get("JWT_SECRET_KEY")
        payload = jwt.decode(token, secret, algorithms=["HS256"])  # type: ignore
        return payload
    except Exception:
        return None


def revoke_token(token: str) -> None:
    try:
        token_hash = _hash_token(token)
        if not db.session.query(RevokedToken.id).filter_by(token_hash=token_hash).first():
            db.session.add(RevokedToken(token_hash=token_hash))
            db.session.commit()
    except Exception:
        db.session.rollback()
