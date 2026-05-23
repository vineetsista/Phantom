import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from models import User, Video, VideoStatus, get_db
from routers.users import optional_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["videos"])


# --- Redis-backed trending counter ---------------------------------------
# Lazy + fail-open. Used by /videos/{id} view tracking + /trending feed.

_redis_videos_client = None


def _get_redis_videos():
    global _redis_videos_client
    if _redis_videos_client is not None:
        return _redis_videos_client
    try:
        import redis  # type: ignore
        from config import get_settings
        _redis_videos_client = redis.from_url(
            get_settings().redis_url, decode_responses=True
        )
        _redis_videos_client.ping()
        return _redis_videos_client
    except Exception as exc:
        logger.warning("trending counter: Redis unavailable: %s", exc)
        _redis_videos_client = None
        return None


def _bump_trending(video_id: str) -> None:
    """Bump the trending counter for `video_id`. Trending is computed
    over a 24-hour window using two hourly buckets so the score decays
    naturally and we don't need a background sweeper to age entries
    out."""
    r = _get_redis_videos()
    if r is None:
        return
    try:
        hour_key = datetime.now(timezone.utc).strftime("trending:%Y%m%d%H")
        r.zincrby(hour_key, 1, video_id)
        r.expire(hour_key, 36 * 3600)  # keep ~36h so the 24h window is intact
    except Exception as exc:
        logger.warning("trending bump failed: %s", exc)


@router.get("/videos")
def list_videos(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(optional_user),
    limit: int = 50,
    mine: bool = False,
    status_filter: Optional[str] = None,
) -> dict:
    """List videos. With `mine=true`, scopes to the authenticated user's
    own videos (any visibility). Without auth, returns public videos.
    Used by the dashboard history page (mine=true) and the public
    showcase (mine=false default)."""
    stmt = select(Video).order_by(Video.created_at.desc())
    if mine:
        if user is None:
            raise HTTPException(status_code=401, detail="Sign in to see your videos.")
        stmt = stmt.where(Video.user_id == user.id)
    else:
        stmt = stmt.where(Video.visibility == "public")
    if status_filter:
        stmt = stmt.where(Video.status == status_filter)
    stmt = stmt.limit(min(limit, 200))
    videos = db.execute(stmt).scalars().all()
    return {"videos": [v.to_dict() for v in videos]}


@router.get("/videos/{video_id}")
def get_video(video_id: str, db: Session = Depends(get_db)) -> dict:
    video = db.get(Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    video.view_count = (video.view_count or 0) + 1
    db.commit()
    _bump_trending(video.id)
    return {"video": video.to_dict()}


@router.get("/search")
def search_videos(
    q: str = Query(..., min_length=1, max_length=120),
    db: Session = Depends(get_db),
    limit: int = 30,
) -> dict:
    """Public video search. Matches against repo_owner, repo_name, and
    repo_description with ILIKE for portability (works on SQLite for
    dev + Postgres for prod). For Postgres deployments where the
    `pg_trgm` extension is available, prefix matching is fast enough at
    our scale without a separate FTS index."""
    pattern = f"%{q.strip()}%"
    stmt = (
        select(Video)
        .where(Video.visibility == "public", Video.status == VideoStatus.complete)
        .where(
            or_(
                Video.repo_owner.ilike(pattern),
                Video.repo_name.ilike(pattern),
                Video.repo_description.ilike(pattern),
            )
        )
        .order_by(Video.view_count.desc())
        .limit(min(limit, 100))
    )
    rows = db.execute(stmt).scalars().all()
    return {"query": q, "videos": [v.to_dict() for v in rows]}


@router.get("/trending")
def trending(db: Session = Depends(get_db), limit: int = 12) -> dict:
    """Trending feed: 24-hour view counts from Redis, joined back to
    Video rows. Falls back to most-viewed-of-all-time when Redis is
    unavailable so the page is never empty."""
    r = _get_redis_videos()
    ids_with_scores: list[tuple[str, float]] = []
    if r is not None:
        try:
            now = datetime.now(timezone.utc)
            # Merge the last 24 hourly buckets into a single sorted set.
            keys = [
                (now - timedelta(hours=h)).strftime("trending:%Y%m%d%H")
                for h in range(24)
            ]
            tmp_key = "trending:24h:" + now.strftime("%Y%m%d%H%M")
            existing = [k for k in keys if r.exists(k)]
            if existing:
                r.zunionstore(tmp_key, existing)
                r.expire(tmp_key, 120)
                ids_with_scores = r.zrevrange(
                    tmp_key, 0, limit - 1, withscores=True
                )
        except Exception as exc:
            logger.warning("trending fetch failed: %s", exc)
    if ids_with_scores:
        ids = [vid for vid, _ in ids_with_scores]
        score_map = dict(ids_with_scores)
        stmt = select(Video).where(
            Video.id.in_(ids),
            Video.visibility == "public",
            Video.status == VideoStatus.complete,
        )
        rows = db.execute(stmt).scalars().all()
        out = [
            {**v.to_dict(), "trending_score": int(score_map.get(v.id, 0))}
            for v in rows
        ]
        out.sort(key=lambda x: x["trending_score"], reverse=True)
        return {"videos": out, "source": "redis_24h"}

    # Fallback — most-viewed completed public videos.
    stmt = (
        select(Video)
        .where(Video.visibility == "public", Video.status == VideoStatus.complete)
        .order_by(Video.view_count.desc())
        .limit(limit)
    )
    rows = db.execute(stmt).scalars().all()
    return {
        "videos": [{**v.to_dict(), "trending_score": v.view_count or 0} for v in rows],
        "source": "fallback_all_time",
    }


@router.delete("/videos/{video_id}")
def delete_video(video_id: str, db: Session = Depends(get_db)) -> dict:
    video = db.get(Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    db.delete(video)
    db.commit()
    return {"success": True}


@router.get("/videos/{video_id}/summary")
def get_video_summary(video_id: str, db: Session = Depends(get_db)) -> dict:
    """v6 — written summary companion. Returns the Haiku-generated
    summary if it exists; otherwise 404 (frontend can fall back to a
    "Summary not yet generated" placeholder)."""
    video = db.get(Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if not video.summary_data:
        raise HTTPException(status_code=404, detail="Summary not generated yet")
    return {
        "video_id": video.id,
        "repo_owner": video.repo_owner,
        "repo_name": video.repo_name,
        "summary": video.summary_data,
    }


@router.get("/repo/{owner}/{name}")
def get_videos_for_repo(owner: str, name: str, db: Session = Depends(get_db)) -> dict:
    """v6 — list all completed videos for owner/name. Powers the
    /repo/[owner]/[repo] page where every analyzed repo lives."""
    stmt = (
        select(Video)
        .where(Video.repo_owner == owner, Video.repo_name == name)
        .order_by(Video.created_at.desc())
    )
    videos = db.execute(stmt).scalars().all()
    return {"videos": [v.to_dict() for v in videos]}
