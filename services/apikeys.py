"""API-key primitives for the developer platform.

Deliberately dependency-light — only ``hashlib`` and ``secrets`` — so the crypto
can be reasoned about and unit-tested without a Flask app context. The database
lookup and the ``require_api_key`` decorator live in ``blueprints/developer.py``;
this module only mints, hashes, and inspects the opaque token.

Token shape:  ``sk_<mode>_<43 url-safe chars>``  e.g. ``sk_test_x1Y2...``
Only the SHA-256 hash of the full token is ever persisted. The plaintext is
returned once, at creation, and cannot be recovered.
"""
from __future__ import annotations

import hashlib
import secrets

VALID_MODES = ("test", "live")
_TOKEN_BYTES = 32  # 32 random bytes -> 43 url-safe base64 chars


def new_secret(mode: str = "test") -> str:
    """Mint a fresh secret key for the given mode."""
    if mode not in VALID_MODES:
        raise ValueError(f"mode must be one of {VALID_MODES}, got {mode!r}")
    return f"sk_{mode}_{secrets.token_urlsafe(_TOKEN_BYTES)}"


def hash_secret(secret: str) -> str:
    """The one-way fingerprint we store and look keys up by."""
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def looks_like_key(value: str) -> bool:
    """Cheap structural check before hitting the database."""
    if not isinstance(value, str):
        return False
    parts = value.split("_", 2)
    return (
        len(parts) == 3
        and parts[0] == "sk"
        and parts[1] in VALID_MODES
        and len(parts[2]) >= 20
    )


def mode_of(secret: str) -> str:
    """'test' or 'live' inferred from the token itself."""
    try:
        return secret.split("_", 2)[1]
    except Exception:
        return "test"


def display_prefix(secret: str) -> str:
    """A safe-to-store, safe-to-show fragment identifying the key in a console
    (token type + mode + first 6 chars of the random part)."""
    parts = secret.split("_", 2)
    if len(parts) == 3:
        return f"{parts[0]}_{parts[1]}_{parts[2][:6]}"
    return secret[:12]


def last4(secret: str) -> str:
    return secret[-4:]


def parse_bearer(header_value: str) -> str | None:
    """Extract the token from an ``Authorization`` header value, accepting either
    ``Bearer sk_...`` or a bare ``sk_...``. Returns None if nothing key-shaped."""
    if not header_value:
        return None
    v = header_value.strip()
    if v.lower().startswith("bearer "):
        v = v[7:].strip()
    return v if looks_like_key(v) else None
