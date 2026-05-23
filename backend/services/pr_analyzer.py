"""PR Explainer mode — fetch a GitHub PR's diff + metadata so the
script generator can narrate it like a code review.

The standard analyzer clones the *repo* and walks it. That doesn't
work for PR mode — we need the PR's *changeset*, not the current HEAD.
This module hits GitHub's REST API for the PR shell + the patch view
for the unified diff. Both endpoints work for public PRs without a
token; with a token (GITHUB_TOKEN env var), rate limits go from
60/hour to 5000/hour.

Output is folded into the AnalysisResult.intake_meta so the script
generator can reach it from its focus block.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Optional

import httpx

from config import get_settings

logger = logging.getLogger(__name__)

# Cap the unified diff at 60 KB before sending to Claude. Beyond that the
# narration gets diluted, and our prompt context becomes the bottleneck.
MAX_DIFF_CHARS = 60_000


@dataclass
class PRSummary:
    number: int
    title: str
    body: str
    state: str
    author: str
    base_ref: str
    head_ref: str
    base_sha: str
    head_sha: str
    additions: int
    deletions: int
    changed_files: int
    merged: bool
    created_at: str
    merged_at: Optional[str]
    files: list[dict] = field(default_factory=list)
    diff: str = ""
    diff_truncated: bool = False

    def to_dict(self) -> dict:
        return {
            "number": self.number,
            "title": self.title,
            "body": self.body[:1500],
            "state": self.state,
            "author": self.author,
            "base_ref": self.base_ref,
            "head_ref": self.head_ref,
            "base_sha": self.base_sha,
            "head_sha": self.head_sha,
            "additions": self.additions,
            "deletions": self.deletions,
            "changed_files": self.changed_files,
            "merged": self.merged,
            "created_at": self.created_at,
            "merged_at": self.merged_at,
            "files": self.files,
            "diff": self.diff,
            "diff_truncated": self.diff_truncated,
        }


def fetch_pr(owner: str, name: str, pr_number: int) -> Optional[PRSummary]:
    """Fetch a PR's metadata + diff. Returns None on any failure so the
    caller can fall back to plain repo mode without crashing the job."""
    settings = get_settings()
    headers = {"Accept": "application/vnd.github+json"}
    if settings.github_token and not settings.github_token.startswith("your_"):
        headers["Authorization"] = f"Bearer {settings.github_token}"

    base = f"https://api.github.com/repos/{owner}/{name}/pulls/{pr_number}"
    try:
        with httpx.Client(timeout=30) as client:
            shell_resp = client.get(base, headers=headers)
            shell_resp.raise_for_status()
            shell = shell_resp.json()

            # Files endpoint — gives us per-file stats + patches. Paginated
            # but we only fetch the first page (top 30 files) which is
            # enough for narration; the full file count stays accurate
            # from the shell.
            files_resp = client.get(
                f"{base}/files", headers=headers, params={"per_page": 30}
            )
            files_resp.raise_for_status()
            files_json = files_resp.json() or []

            # Unified diff — separate Accept header. GitHub's max diff
            # response is ~3MB; we cap our own slice to 60KB so the
            # Claude prompt stays sane.
            diff_resp = client.get(
                base,
                headers={**headers, "Accept": "application/vnd.github.v3.diff"},
            )
            diff_text = diff_resp.text if diff_resp.status_code == 200 else ""

        diff_trimmed = diff_text
        truncated = False
        if len(diff_trimmed) > MAX_DIFF_CHARS:
            diff_trimmed = diff_trimmed[:MAX_DIFF_CHARS]
            # Don't cut mid-hunk — trim back to the last @@ marker.
            last_hunk = diff_trimmed.rfind("\n@@")
            if last_hunk > MAX_DIFF_CHARS * 0.5:
                diff_trimmed = diff_trimmed[:last_hunk]
            truncated = True

        files_min = [
            {
                "filename": f.get("filename"),
                "status": f.get("status"),  # added, modified, removed, renamed
                "additions": f.get("additions", 0),
                "deletions": f.get("deletions", 0),
                "changes": f.get("changes", 0),
                # Per-file patch trimmed to 4KB so the file list isn't
                # dominated by one big file.
                "patch": (f.get("patch") or "")[:4000],
            }
            for f in files_json
        ]

        user = shell.get("user") or {}
        head = shell.get("head") or {}
        base_obj = shell.get("base") or {}
        return PRSummary(
            number=shell.get("number", pr_number),
            title=shell.get("title") or "",
            body=shell.get("body") or "",
            state=shell.get("state") or "open",
            author=user.get("login") or "",
            base_ref=base_obj.get("ref", ""),
            head_ref=head.get("ref", ""),
            base_sha=base_obj.get("sha", ""),
            head_sha=head.get("sha", ""),
            additions=shell.get("additions", 0),
            deletions=shell.get("deletions", 0),
            changed_files=shell.get("changed_files", 0),
            merged=bool(shell.get("merged")),
            created_at=shell.get("created_at") or "",
            merged_at=shell.get("merged_at"),
            files=files_min,
            diff=diff_trimmed,
            diff_truncated=truncated,
        )
    except Exception as exc:
        logger.warning("PR fetch failed for %s/%s#%d: %s", owner, name, pr_number, exc)
        return None


_PR_URL_RE = re.compile(
    r"^https?://github\.com/([\w.\-]+)/([\w.\-]+?)/pull/(\d+)/?"
)


def parse_pr_url(url: str) -> Optional[tuple[str, str, int]]:
    """Helper for callers that have a URL and want owner/name/number."""
    m = _PR_URL_RE.match(url.strip())
    if not m:
        return None
    return m.group(1), m.group(2), int(m.group(3))
