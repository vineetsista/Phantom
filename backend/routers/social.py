"""Favorites, reactions, comments, shares — small interactive features
that the video page surfaces.

All endpoints require auth (require_user) except share tracking which
is anonymous (we record IP hash so the same person doesn't get double-
counted within ~24h, but we never require signin to share).
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from models import (
    REACTION_EMOJI_DISPLAY,
    Comment,
    Favorite,
    Reaction,
    ReactionEmoji,
    Share,
    User,
    Video,
    get_db,
)
from routers.users import optional_user, require_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["social"])


# === Favorites =============================================================

@router.post("/videos/{video_id}/favorite")
def add_favorite(
    video_id: str,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict:
    existing = (
        db.query(Favorite)
        .filter(Favorite.user_id == user.id, Favorite.video_id == video_id)
        .one_or_none()
    )
    if existing:
        return {"favorited": True, "id": existing.id}
    record = Favorite(user_id=user.id, video_id=video_id)
    db.add(record)
    db.commit()
    return {"favorited": True, "id": record.id}


@router.delete("/videos/{video_id}/favorite")
def remove_favorite(
    video_id: str,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict:
    db.query(Favorite).filter(
        Favorite.user_id == user.id, Favorite.video_id == video_id
    ).delete()
    db.commit()
    return {"favorited": False}


@router.get("/favorites")
def list_favorites(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict:
    """List the current user's favorited videos with full video data."""
    rows = (
        db.query(Video, Favorite.created_at)
        .join(Favorite, Favorite.video_id == Video.id)
        .filter(Favorite.user_id == user.id)
        .order_by(Favorite.created_at.desc())
        .limit(100)
        .all()
    )
    return {
        "favorites": [
            {**video.to_dict(), "favorited_at": ts.isoformat() if ts else None}
            for video, ts in rows
        ]
    }


# === Reactions =============================================================

class ReactionBody(BaseModel):
    emoji: str  # one of: spark fire target bulb eyes


@router.post("/videos/{video_id}/react")
def add_reaction(
    video_id: str,
    body: ReactionBody,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict:
    if body.emoji not in REACTION_EMOJI_DISPLAY:
        raise HTTPException(status_code=400, detail="Invalid emoji.")
    # Toggle: if user already reacted with this emoji, remove. Otherwise add.
    emoji_val = ReactionEmoji(body.emoji)
    existing = (
        db.query(Reaction)
        .filter(
            Reaction.user_id == user.id,
            Reaction.video_id == video_id,
            Reaction.emoji == emoji_val,
        )
        .one_or_none()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return {"reacted": False, "emoji": body.emoji}
    record = Reaction(user_id=user.id, video_id=video_id, emoji=emoji_val)
    db.add(record)
    db.commit()
    return {"reacted": True, "emoji": body.emoji, "id": record.id}


@router.get("/videos/{video_id}/reactions")
def list_reactions(
    video_id: str,
    user: Optional[User] = Depends(optional_user),
    db: Session = Depends(get_db),
) -> dict:
    """Return reaction counts per emoji + which emojis the current user
    has reacted with (so the UI can highlight them)."""
    counts: dict[str, int] = {emoji: 0 for emoji in REACTION_EMOJI_DISPLAY}
    rows = (
        db.query(Reaction.emoji, func.count(Reaction.id))
        .filter(Reaction.video_id == video_id)
        .group_by(Reaction.emoji)
        .all()
    )
    for emoji, n in rows:
        key = emoji.value if isinstance(emoji, ReactionEmoji) else emoji
        counts[key] = int(n or 0)

    mine: list[str] = []
    if user is not None:
        my_rows = (
            db.query(Reaction.emoji)
            .filter(Reaction.user_id == user.id, Reaction.video_id == video_id)
            .all()
        )
        mine = [
            e.value if isinstance(e, ReactionEmoji) else e
            for (e,) in my_rows
        ]
    return {"counts": counts, "mine": mine, "display": REACTION_EMOJI_DISPLAY}


# === Comments ==============================================================

class CommentBody(BaseModel):
    body: str
    parent_id: Optional[str] = None


@router.post("/videos/{video_id}/comments")
def post_comment(
    video_id: str,
    body: CommentBody,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict:
    text = (body.body or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment cannot be empty.")
    if len(text) > 1000:
        raise HTTPException(status_code=400, detail="Comment too long (max 1000 chars).")
    # Threading: only allow one level deep — replies to top-level only.
    parent = None
    if body.parent_id:
        parent = (
            db.query(Comment)
            .filter(Comment.id == body.parent_id, Comment.video_id == video_id)
            .one_or_none()
        )
        if parent is None:
            raise HTTPException(status_code=400, detail="Parent comment not found.")
        if parent.parent_id is not None:
            raise HTTPException(status_code=400, detail="Replies cannot be nested.")
    record = Comment(
        video_id=video_id,
        user_id=user.id,
        parent_id=body.parent_id,
        body=text,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record.to_dict()


@router.get("/videos/{video_id}/comments")
def list_comments(video_id: str, db: Session = Depends(get_db)) -> dict:
    """Return threaded comments. Top-level first, replies nested under
    `replies` array on each top-level comment."""
    all_comments = (
        db.query(Comment, User)
        .join(User, User.id == Comment.user_id)
        .filter(Comment.video_id == video_id)
        .order_by(Comment.created_at.asc())
        .all()
    )

    by_id: dict[str, dict] = {}
    top_level: list[dict] = []
    for c, u in all_comments:
        d = c.to_dict()
        d["author"] = {
            "id": u.id,
            "name": u.name or u.github_username,
            "github_username": u.github_username,
            "avatar_url": u.avatar_url,
            "slug": u.custom_slug or u.github_username,
        }
        d["replies"] = []
        by_id[c.id] = d
        if c.parent_id is None:
            top_level.append(d)
        else:
            parent = by_id.get(c.parent_id)
            if parent:
                parent["replies"].append(d)

    return {"comments": top_level, "total": len(all_comments)}


@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: str,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict:
    record = db.query(Comment).filter(Comment.id == comment_id).one_or_none()
    if record is None:
        raise HTTPException(status_code=404, detail="Comment not found.")
    # Allow: comment author OR video owner.
    video = db.query(Video).filter(Video.id == record.video_id).one_or_none()
    is_video_owner = video and video.user_id == user.id
    if record.user_id != user.id and not is_video_owner:
        raise HTTPException(status_code=403, detail="Not your comment.")
    record.deleted = True
    record.body = ""
    db.commit()
    return {"ok": True}


# === Shares (anonymous tracking) ==========================================


class ShareBody(BaseModel):
    channel: str  # twitter / linkedin / discord / slack / copy


@router.post("/videos/{video_id}/share")
def track_share(
    video_id: str,
    body: ShareBody,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    channel = (body.channel or "").lower().strip()
    if channel not in {"twitter", "linkedin", "discord", "slack", "copy", "email"}:
        raise HTTPException(status_code=400, detail="Unknown channel.")
    # IP hash with a daily rotating salt — same person clicking share
    # twice in one day counts once; tomorrow it counts again. Sufficient
    # anti-spam without storing IPs.
    today = datetime.utcnow().strftime("%Y-%m-%d")
    salt = f"phantom-share-{today}"
    raw_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
        request.client.host if request.client else ""
    )
    ip_hash = hashlib.sha256(f"{salt}:{raw_ip}".encode()).hexdigest()
    # Dedupe within day.
    cutoff = datetime.utcnow() - timedelta(hours=24)
    existing = (
        db.query(Share)
        .filter(
            Share.video_id == video_id,
            Share.channel == channel,
            Share.ip_hash == ip_hash,
            Share.created_at >= cutoff,
        )
        .first()
    )
    if existing:
        return {"counted": False, "reason": "dedup"}
    record = Share(
        video_id=video_id,
        channel=channel,
        ip_hash=ip_hash,
        referrer=(request.headers.get("referer") or "")[:200],
    )
    db.add(record)
    db.commit()
    return {"counted": True}
