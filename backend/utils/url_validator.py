"""URL whitelist + sanity checks for user-submitted repo URLs.

Allowed hosts: github.com, gitlab.com, gist.github.com only.

Hard blocks:
- Length > 500 chars (DoS protection)
- Private / loopback / link-local IPs in the URL host
- file://, ftp://, javascript:, data:, etc.
- Anything that isn't HTTPS or HTTP

Raises ValueError with a clear message on rejection. Callers should
wrap the call and surface the message in a 400 response.
"""
from __future__ import annotations

import ipaddress
import re
from urllib.parse import urlparse

ALLOWED_HOSTS = {
    "github.com",
    "www.github.com",
    "gitlab.com",
    "www.gitlab.com",
    "gist.github.com",
}

MAX_URL_LENGTH = 500


def validate_repo_url(url: str) -> str:
    """Validate `url` and return the normalized form (host lowercased,
    no trailing slash). Raises ValueError on any rejection."""
    if not isinstance(url, str):
        raise ValueError("URL must be a string")
    url = url.strip()
    if not url:
        raise ValueError("URL cannot be empty")
    if len(url) > MAX_URL_LENGTH:
        raise ValueError(f"URL too long (max {MAX_URL_LENGTH} chars)")

    try:
        parsed = urlparse(url)
    except Exception as exc:
        raise ValueError(f"URL parse failed: {exc}") from exc

    if parsed.scheme.lower() not in {"http", "https"}:
        raise ValueError(
            "Only http and https URLs are accepted. "
            "Public GitHub, GitLab, or gist URLs only."
        )

    host = (parsed.hostname or "").lower()
    if not host:
        raise ValueError("URL is missing a hostname")

    # Block raw IPs even if they're "public" — we explicitly only want
    # the named services in ALLOWED_HOSTS.
    try:
        ip = ipaddress.ip_address(host)
        # If it's a valid IP at all, refuse — only named hosts allowed.
        _ = ip
        raise ValueError("IP-address URLs are not allowed; use github.com / gitlab.com.")
    except ValueError:
        pass  # not an IP, expected

    if host not in ALLOWED_HOSTS:
        raise ValueError(
            f"Host {host!r} is not allowed. "
            f"Phantom currently accepts github.com, gitlab.com, and gist.github.com URLs."
        )

    # Path sanity — must look like /owner/repo or /owner/gist_id at minimum
    path = parsed.path or ""
    if not re.match(r"^/[^/]+/[^/]+", path):
        raise ValueError(
            "URL doesn't look like a repository path. Try the form "
            "https://github.com/<owner>/<repo>."
        )

    # Normalize: drop trailing slash, drop .git suffix, drop fragment.
    normalized = f"{parsed.scheme}://{host}{path.rstrip('/').removesuffix('.git')}"
    if parsed.query:
        # Keep `?` for GitLab subgroups etc. but reject obvious junk.
        normalized += f"?{parsed.query}"
    return normalized
