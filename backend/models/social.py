"""Social tables — favorites, reactions, comments, collections.

Kept in one module since they're all small + thematically related. Each
gets its own table; joins happen at query time. No cascade configured
on the SQLAlchemy side — the GDPR delete-account flow handles cascade
explicitly so we have a clear audit trail.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Favorite(Base):
    __tablename__ = "favorites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    video_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ReactionEmoji(str, enum.Enum):
    spark = "spark"  # ✨
    fire = "fire"    # 🔥
    target = "target"  # 🎯
    bulb = "bulb"    # 💡
    eyes = "eyes"    # 👀


REACTION_EMOJI_DISPLAY = {
    "spark": "✨",
    "fire": "🔥",
    "target": "🎯",
    "bulb": "💡",
    "eyes": "👀",
}


class Reaction(Base):
    __tablename__ = "reactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    video_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    emoji: Mapped[ReactionEmoji] = mapped_column(
        Enum(ReactionEmoji, name="reaction_emoji"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    video_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    parent_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    body: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    edited_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "video_id": self.video_id,
            "user_id": self.user_id,
            "parent_id": self.parent_id,
            "body": "[deleted]" if self.deleted else self.body,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "edited_at": self.edited_at.isoformat() if self.edited_at else None,
            "deleted": self.deleted,
        }


class Collection(Base):
    __tablename__ = "collections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(140), default="")
    slug: Mapped[str] = mapped_column(String(80), default="", index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    public: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CollectionVideo(Base):
    __tablename__ = "collection_videos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    collection_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    video_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    added_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Share(Base):
    """Tracks share-button clicks for owner analytics."""
    __tablename__ = "shares"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    video_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    channel: Mapped[str] = mapped_column(String(32), default="")  # twitter / linkedin / discord / slack / copy
    ip_hash: Mapped[str] = mapped_column(String(64), default="")
    referrer: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class VideoView(Base):
    """Per-view record for owner analytics. Aggregated views queries
    join against this table by timestamp window."""
    __tablename__ = "video_views"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    video_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    ip_hash: Mapped[str] = mapped_column(String(64), default="", index=True)
    country: Mapped[str] = mapped_column(String(8), default="")
    referrer_host: Mapped[str] = mapped_column(String(255), default="")
    watch_pct: Mapped[int] = mapped_column(Integer, default=0)  # 0..100 — last beacon received
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
