"""POST signed event payloads to a user's configured webhook URL.

Called from the worker on generation completion / failure. Each
payload includes an HMAC-SHA256 signature in X-Phantom-Signature so
the receiver can verify authenticity.

Best-effort: a webhook failure never fails the underlying job. Logged
+ ignored.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


def sign(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


def dispatch(
    url: str,
    secret: str,
    event: str,
    payload: dict[str, Any],
    timeout_s: float = 8.0,
) -> bool:
    """POST `payload` to `url` with the given event name. Returns True
    on 2xx, False otherwise. Never raises."""
    if not url or not url.startswith(("http://", "https://")):
        return False
    envelope = {"event": event, "data": payload}
    body = json.dumps(envelope, default=str).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Phantom-Webhook/1.0",
        "X-Phantom-Event": event,
    }
    if secret:
        headers["X-Phantom-Signature"] = sign(secret, body)
    try:
        resp = httpx.post(url, content=body, headers=headers, timeout=timeout_s)
        if 200 <= resp.status_code < 300:
            logger.info("webhook %s → %s ok (%d)", event, url, resp.status_code)
            return True
        logger.warning(
            "webhook %s → %s non-2xx %d: %s",
            event, url, resp.status_code, (resp.text or "")[:200],
        )
    except Exception as exc:
        logger.warning("webhook %s → %s error: %s", event, url, exc)
    return False
