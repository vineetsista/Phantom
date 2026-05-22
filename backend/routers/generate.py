import os
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from models import User, Video, VideoStatus, get_db
from routers.users import check_quota, increment_usage, optional_user
from utils.github_client import parse_github_url
from workers.tasks import generate_video

router = APIRouter(prefix="/api/v1", tags=["generate"])

# Feature flag: when False, /generate accepts anonymous requests (legacy
# behavior). When True, signin is required and quotas enforced. Set
# REQUIRE_AUTH=1 in the environment to flip on. Default False so v5c
# rendering keeps working during the v6 rollout.
REQUIRE_AUTH = os.environ.get("REQUIRE_AUTH", "0") == "1"


class GenerateOptions(BaseModel):
    # None means "let the worker decide" — falls through to DEFAULT_VOICE env
    # var, then to auto-detect based on which API keys are configured.
    voice: Optional[Literal["openai", "elevenlabs"]] = None
    quality: Literal["720p", "1080p"] = "720p"
    visibility: Optional[Literal["public", "unlisted", "private"]] = None


class GenerateRequest(BaseModel):
    repo_url: str
    options: GenerateOptions = Field(default_factory=GenerateOptions)


class GenerateResponse(BaseModel):
    job_id: str
    status: str


@router.post("/generate", response_model=GenerateResponse, status_code=status.HTTP_202_ACCEPTED)
def create_generation(
    body: GenerateRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(optional_user),
) -> GenerateResponse:
    try:
        owner, name = parse_github_url(body.repo_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Auth + quota check — gated behind REQUIRE_AUTH flag so dev / v5c
    # rendering doesn't break before the frontend OAuth ships.
    if REQUIRE_AUTH:
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sign in to generate videos.",
            )
        check_quota(user)
        # Free tier locks visibility to public, voice to default.
        from models.user import Plan
        is_free = (user.plan == Plan.free if isinstance(user.plan, Plan)
                   else user.plan == "free")
        visibility = (
            "public" if is_free
            else (body.options.visibility or user.default_visibility or "public")
        )
    else:
        visibility = body.options.visibility or "public"

    video = Video(
        repo_url=body.repo_url,
        repo_owner=owner,
        repo_name=name,
        status=VideoStatus.queued,
        progress=0,
        status_details={"stage": "Queued"},
        voice_provider=body.options.voice or "",
        video_quality=body.options.quality,
        user_id=user.id if user else None,
        visibility=visibility,
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    # Charge quota at queue admission so transient render failures don't
    # double-bill on retry.
    if REQUIRE_AUTH and user is not None:
        increment_usage(user, db)

    generate_video.delay(video.id, body.repo_url, body.options.model_dump())

    return GenerateResponse(job_id=video.id, status=video.status.value)
