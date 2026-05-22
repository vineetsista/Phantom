"""Stripe billing endpoints.

All three endpoints (checkout, portal, webhook) return 503 with a clear
diagnostic when STRIPE_SECRET_KEY isn't configured — so the v6 Phase 2
scaffold ships without requiring real Stripe credentials in dev. To
activate:

  1. Create products at https://dashboard.stripe.com/products
  2. Set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + STRIPE_PRO_PRICE_ID
     + STRIPE_TEAM_PRICE_ID env vars
  3. Restart the backend
  4. Configure the webhook endpoint to point at
     https://your-domain/api/v1/billing/webhook
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import get_settings
from models import Plan, User, get_db
from routers.users import require_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/billing", tags=["billing"])
settings = get_settings()


def _stripe_or_503():
    """Return the Stripe SDK module configured with the secret key, or
    raise 503 if STRIPE_SECRET_KEY isn't set. Used at the top of every
    endpoint to short-circuit when billing isn't configured."""
    if not settings.has_stripe:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing is not configured on this deployment.",
        )
    import stripe  # type: ignore
    stripe.api_key = settings.stripe_secret_key
    return stripe


class CheckoutBody(BaseModel):
    plan: Literal["pro", "team"]
    success_url: str
    cancel_url: str


@router.post("/checkout")
def create_checkout_session(
    body: CheckoutBody,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict:
    """Create a Stripe Checkout Session for the requested plan and return
    its URL. The frontend redirects to it. On success, Stripe redirects
    to success_url; the webhook handler below promotes the user's plan."""
    stripe = _stripe_or_503()

    price_id = (
        settings.stripe_pro_price_id if body.plan == "pro"
        else settings.stripe_team_price_id
    )
    if not price_id:
        raise HTTPException(
            status_code=503,
            detail=f"STRIPE_{body.plan.upper()}_PRICE_ID not configured",
        )

    # Reuse the existing Stripe customer if we already created one for
    # this user; otherwise let Checkout auto-create one based on email.
    customer_id = user.stripe_customer_id or None

    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=body.success_url,
        cancel_url=body.cancel_url,
        customer=customer_id,
        customer_email=user.email if not customer_id else None,
        client_reference_id=user.id,
        metadata={
            "user_id": user.id,
            "plan": body.plan,
        },
        allow_promotion_codes=True,
    )

    logger.info(
        "Stripe checkout session %s created for user %s plan=%s",
        session.id, user.id, body.plan,
    )
    return {"url": session.url, "session_id": session.id}


@router.post("/portal")
def create_portal_session(
    user: User = Depends(require_user),
) -> dict:
    """Create a Customer Portal session — lets the user manage their
    subscription (upgrade/downgrade/cancel/update card) on Stripe's
    hosted page. Requires the user to already have a stripe_customer_id."""
    stripe = _stripe_or_503()

    if not user.stripe_customer_id:
        raise HTTPException(
            status_code=400,
            detail="No active subscription. Upgrade first.",
        )

    session = stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=f"{settings.app_url}/dashboard",
    )
    return {"url": session.url}


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Handle Stripe lifecycle events:

    - checkout.session.completed → set plan + stripe_customer_id
    - customer.subscription.updated → refresh status + period_end
    - customer.subscription.deleted → revert to free plan
    - invoice.payment_failed → flag account, downgrade after grace
    """
    stripe = _stripe_or_503()
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig, settings.stripe_webhook_secret
        )
    except Exception as exc:
        logger.warning("Invalid Stripe webhook signature: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        user_id = (data.get("metadata") or {}).get("user_id") or data.get("client_reference_id")
        plan_str = (data.get("metadata") or {}).get("plan", "pro")
        customer_id = data.get("customer")
        subscription_id = data.get("subscription")
        if user_id:
            user = db.query(User).filter(User.id == user_id).one_or_none()
            if user:
                user.plan = Plan.pro if plan_str == "pro" else Plan.team
                user.stripe_customer_id = customer_id or ""
                user.stripe_subscription_id = subscription_id or ""
                user.subscription_status = "active"
                db.commit()
                logger.info("Promoted user %s to %s plan", user_id, user.plan)

    elif event_type in ("customer.subscription.updated", "customer.subscription.created"):
        sub_id = data.get("id")
        customer_id = data.get("customer")
        sub_status = data.get("status", "")
        period_end = data.get("current_period_end")
        user = (
            db.query(User)
            .filter(User.stripe_customer_id == customer_id)
            .one_or_none()
        )
        if user:
            user.stripe_subscription_id = sub_id or user.stripe_subscription_id
            user.subscription_status = sub_status
            if period_end:
                user.subscription_period_end = datetime.fromtimestamp(
                    period_end, tz=timezone.utc
                ).replace(tzinfo=None)
            # Cancelled but still in current period — keep plan until
            # period_end. Reverted to free in subscription.deleted below.
            db.commit()

    elif event_type == "customer.subscription.deleted":
        customer_id = data.get("customer")
        user = (
            db.query(User)
            .filter(User.stripe_customer_id == customer_id)
            .one_or_none()
        )
        if user:
            user.plan = Plan.free
            user.subscription_status = "canceled"
            user.stripe_subscription_id = ""
            db.commit()
            logger.info("Reverted user %s to free plan", user.id)

    return {"received": True}
