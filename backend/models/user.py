"""User account model.

Identity comes from GitHub OAuth (NextAuth on the frontend). The backend
trusts the frontend's session — every request is expected to include an
X-User-Id header set by the Next.js proxy after session validation. This
is acceptable for the MVP because the only public entrypoint is the
Next.js frontend. When we add direct API access (Pro+ feature), API
keys + a real auth middleware will replace the header trust model.

Plan tiers:
  free  — 3 videos/month, public visibility only, Antoni voice only
  pro   — 30/month, public/unlisted/private, voice choice, HD, custom
          watermark, priority queue
  team  — 200/month, multi-seat, all pro, API access, webhook firing
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Plan(str, enum.Enum):
    free = "free"
    pro = "pro"
    team = "team"


# Per-plan monthly video quota. Single source of truth — UI reads these
# via /api/v1/me; backend enforces them in /api/v1/generate.
PLAN_LIMITS: dict[Plan, int] = {
    Plan.free: 3,
    Plan.pro: 30,
    Plan.team: 200,
}


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    # GitHub OAuth fields — id is the canonical identifier (numeric in
    # GitHub's universe; we store as string for forward-compat with other
    # providers later).
    github_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    github_username: Mapped[str] = mapped_column(String(255), default="", index=True)
    email: Mapped[str] = mapped_column(String(255), default="")
    name: Mapped[str] = mapped_column(String(255), default="")
    avatar_url: Mapped[str] = mapped_column(Text, default="")

    # Profile (editable by user from /dashboard/settings)
    bio: Mapped[str] = mapped_column(Text, default="")
    custom_slug: Mapped[str] = mapped_column(String(64), default="", index=True)

    # Subscription
    plan: Mapped[Plan] = mapped_column(
        Enum(Plan, name="user_plan"), default=Plan.free, nullable=False
    )
    stripe_customer_id: Mapped[str] = mapped_column(String(64), default="")
    stripe_subscription_id: Mapped[str] = mapped_column(String(64), default="")
    subscription_status: Mapped[str] = mapped_column(String(32), default="")
    subscription_period_end: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Usage tracking — incremented when a generation succeeds. Reset by a
    # nightly job (or lazily — we recompute current_month_count on demand
    # in `monthly_videos()` below to avoid needing a cron just for this).
    monthly_video_count: Mapped[int] = mapped_column(Integer, default=0)
    monthly_count_reset_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Default preferences (used when user generates without specifying)
    default_voice: Mapped[str] = mapped_column(String(32), default="antoni")
    default_visibility: Mapped[str] = mapped_column(String(16), default="public")
    custom_watermark: Mapped[str] = mapped_column(String(64), default="")

    # Settings flags
    email_on_complete: Mapped[bool] = mapped_column(Boolean, default=True)
    email_on_milestone: Mapped[bool] = mapped_column(Boolean, default=True)

    # v7 — webhook config (Pro+). Webhook fires on generation events.
    # signing_secret is generated once on first config and shown to the
    # user so they can verify signatures.
    webhook_url: Mapped[str] = mapped_column(Text, default="")
    webhook_secret: Mapped[str] = mapped_column(String(64), default="")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "github_id": self.github_id,
            "github_username": self.github_username,
            "email": self.email,
            "name": self.name,
            "avatar_url": self.avatar_url,
            "bio": self.bio,
            "custom_slug": self.custom_slug or self.github_username,
            "plan": self.plan.value if isinstance(self.plan, Plan) else self.plan,
            "plan_limit": PLAN_LIMITS.get(
                self.plan if isinstance(self.plan, Plan) else Plan(self.plan),
                3,
            ),
            "monthly_video_count": self.monthly_video_count,
            "subscription_status": self.subscription_status,
            "subscription_period_end": (
                self.subscription_period_end.isoformat()
                if self.subscription_period_end else None
            ),
            "default_voice": self.default_voice,
            "default_visibility": self.default_visibility,
            "custom_watermark": self.custom_watermark,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @property
    def plan_limit(self) -> int:
        plan = self.plan if isinstance(self.plan, Plan) else Plan(self.plan)
        return PLAN_LIMITS.get(plan, 3)

    def remaining_quota(self) -> int:
        return max(0, self.plan_limit - self.monthly_video_count)
