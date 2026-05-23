"""API keys for programmatic access (Pro+ feature).

Keys are emitted as `phk_live_<32-char-hex>` and stored as SHA-256
hashes — we never persist the plaintext. The prefix (`phk_live_xxxx`)
is stored separately so the dashboard can show users which key did what
without exposing the secret.

Auth flow on /api/v1/generate:
  Authorization: Bearer phk_live_...
  → strip prefix, hash, look up by hash, get user, proceed as if signed in.
"""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def generate_key() -> tuple[str, str, str]:
    """Generate a new API key. Returns (plaintext, prefix, hash).
    Plaintext is shown to the user ONCE on creation; we store only
    the hash + prefix."""
    raw = "phk_live_" + secrets.token_hex(16)  # 32-char hex body
    prefix = raw[:16]  # phk_live_xxxxxxx — 8 hex chars visible
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return raw, prefix, digest


def hash_key(plaintext: str) -> str:
    return hashlib.sha256(plaintext.strip().encode("utf-8")).hexdigest()


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    key_prefix: Mapped[str] = mapped_column(String(20), default="")
    name: Mapped[str] = mapped_column(String(120), default="")
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "prefix": self.key_prefix,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "revoked": self.revoked_at is not None,
        }
