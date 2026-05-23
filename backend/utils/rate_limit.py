"""Redis-backed rate limiter (sliding window).

Used to protect public endpoints from abuse — most importantly the
/generate endpoint where each call burns Claude + ElevenLabs credit.

Usage:

    from utils.rate_limit import check_rate_limit, RateLimitExceeded

    check_rate_limit(
        key=f"generate:ip:{request.client.host}",
        limit=10,
        window_seconds=3600,
    )  # raises RateLimitExceeded with retry-after on hit

Degrades gracefully when Redis is unavailable — logs a warning and
allows the request through. Better to lose rate-limiting temporarily
than to lock the whole product out.
"""
from __future__ import annotations

import logging
import time
from typing import Optional

from fastapi import HTTPException

from config import get_settings

logger = logging.getLogger(__name__)

_redis_client: Optional[object] = None


def _get_redis():
    """Lazy-init the Redis client. Returns None if Redis is unreachable
    so callers can no-op instead of crashing."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        import redis  # type: ignore
        settings = get_settings()
        _redis_client = redis.from_url(settings.redis_url, decode_responses=True)
        # ping to confirm connectivity
        _redis_client.ping()
        return _redis_client
    except Exception as exc:
        logger.warning("rate_limit: Redis unavailable, falling open: %s", exc)
        _redis_client = None
        return None


class RateLimitExceeded(HTTPException):
    def __init__(self, retry_after_s: int, limit: int, window_s: int):
        super().__init__(
            status_code=429,
            detail=(
                f"Rate limit hit: {limit} requests per {window_s}s. "
                f"Try again in {retry_after_s}s."
            ),
            headers={"Retry-After": str(retry_after_s)},
        )


def check_rate_limit(key: str, limit: int, window_seconds: int) -> None:
    """Sliding-window rate limit on `key`. Raises RateLimitExceeded if
    more than `limit` calls have been recorded in the last
    `window_seconds`. Records the current call before checking.

    Algorithm: Redis sorted set with timestamps as scores. ZREMRANGEBYSCORE
    drops entries older than window. ZCARD gives current count. ZADD
    records this call. EXPIRE keeps the key from accumulating cold
    entries forever.
    """
    r = _get_redis()
    if r is None:
        return  # fail-open

    now = time.time()
    window_start = now - window_seconds
    try:
        pipe = r.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {f"{now}:{id(object())}": now})
        pipe.expire(key, window_seconds + 60)
        _, count, _, _ = pipe.execute()
    except Exception as exc:
        logger.warning("rate_limit: pipeline failed, falling open: %s", exc)
        return

    if count >= limit:
        # Approximate retry-after: time until oldest entry in window
        # falls out. Conservative — could be more accurate by reading
        # the oldest score.
        retry = max(1, window_seconds - int(now - window_start) // 2)
        raise RateLimitExceeded(retry, limit, window_seconds)
