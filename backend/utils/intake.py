"""Intake URL classifier — what kind of artifact did the user paste?

Phantom accepts more than just `https://github.com/owner/repo`. A user
can paste:

  - A commit URL          → explain THIS commit
  - A file URL            → explain THIS file
  - A gist URL            → explain the gist
  - A pull request URL    → explain the PR (handled separately in PR mode)
  - A standard repo URL   → explain the whole repo

This module turns any of those into a structured `IntakeURL` so the
generator pipeline can pick the right strategy. It deliberately doesn't
make network calls — classification is pure regex + url parsing so we
fail fast on garbage before queuing a Celery job.

Compare mode (two repos) is handled in its own endpoint
(`/generate/compare`) because the input shape is "two URLs", not one.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal, Optional
from urllib.parse import urlparse

from utils.url_validator import validate_repo_url


IntakeKind = Literal["repo", "commit", "file", "gist", "pr"]


@dataclass
class IntakeURL:
    kind: IntakeKind
    repo_url: str                 # normalized https://github.com/{owner}/{name}
    owner: str
    name: str
    # Kind-specific fields
    commit_sha: Optional[str] = None
    file_path: Optional[str] = None
    file_ref: Optional[str] = None    # branch/tag/SHA for /blob/<ref>/<path>
    gist_id: Optional[str] = None
    pr_number: Optional[int] = None

    @property
    def focus_label(self) -> str:
        """Short human label for the dashboard ("commit a1b2c3", "file:
        src/app.py", etc.)."""
        if self.kind == "commit" and self.commit_sha:
            return f"commit {self.commit_sha[:7]}"
        if self.kind == "file" and self.file_path:
            return f"file: {self.file_path}"
        if self.kind == "gist":
            return f"gist {self.gist_id or ''}".strip()
        if self.kind == "pr" and self.pr_number is not None:
            return f"PR #{self.pr_number}"
        return self.name


_COMMIT_PATH_RE = re.compile(r"^/([^/]+)/([^/]+)/commit/([0-9a-fA-F]{7,40})/?$")
_BLOB_PATH_RE = re.compile(r"^/([^/]+)/([^/]+)/blob/([^/]+)/(.+)$")
_PR_PATH_RE = re.compile(r"^/([^/]+)/([^/]+)/pull/(\d+)/?")
_GIST_HOST = {"gist.github.com"}


def classify(url: str) -> IntakeURL:
    """Classify `url` into an IntakeURL. Raises ValueError if the URL
    doesn't match any recognized GitHub artifact shape.

    Note: gist URLs from gist.github.com look like
    `https://gist.github.com/<user>/<id>` — `name` for that case is set
    to the gist id since there's no repo concept.
    """
    parsed = urlparse(url.strip())
    host = (parsed.hostname or "").lower()
    path = parsed.path or ""

    # --- Gist ---
    if host in _GIST_HOST:
        m = re.match(r"^/([^/]+)/([0-9a-fA-F]+)/?$", path)
        if not m:
            raise ValueError(
                "Gist URL must look like https://gist.github.com/<user>/<id>"
            )
        owner, gist_id = m.group(1), m.group(2)
        return IntakeURL(
            kind="gist",
            repo_url=f"https://gist.github.com/{owner}/{gist_id}",
            owner=owner,
            name=gist_id,
            gist_id=gist_id,
        )

    # --- GitHub commit ---
    m = _COMMIT_PATH_RE.match(path)
    if m:
        owner, name, sha = m.group(1), m.group(2), m.group(3)
        return IntakeURL(
            kind="commit",
            repo_url=f"https://github.com/{owner}/{name}",
            owner=owner,
            name=name,
            commit_sha=sha.lower(),
        )

    # --- GitHub blob (single-file) ---
    m = _BLOB_PATH_RE.match(path)
    if m:
        owner, name, ref, file_path = (
            m.group(1), m.group(2), m.group(3), m.group(4)
        )
        return IntakeURL(
            kind="file",
            repo_url=f"https://github.com/{owner}/{name}",
            owner=owner,
            name=name,
            file_path=file_path,
            file_ref=ref,
        )

    # --- GitHub PR ---
    m = _PR_PATH_RE.match(path)
    if m:
        owner, name, pr_num = m.group(1), m.group(2), int(m.group(3))
        return IntakeURL(
            kind="pr",
            repo_url=f"https://github.com/{owner}/{name}",
            owner=owner,
            name=name,
            pr_number=pr_num,
        )

    # --- Plain repo URL (falls through the existing validator) ---
    normalized = validate_repo_url(url)
    parsed = urlparse(normalized)
    parts = (parsed.path or "").strip("/").split("/")
    if len(parts) < 2:
        raise ValueError("URL doesn't look like a repository.")
    owner, name = parts[0], parts[1]
    return IntakeURL(
        kind="repo",
        repo_url=normalized,
        owner=owner,
        name=name,
    )
