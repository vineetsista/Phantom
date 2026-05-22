"use client";

/**
 * Reusable paywall component shown when a free user tries to access a
 * Pro feature. Pass the feature name + which tier unlocks it; the
 * component renders the description, the tier badge, and a CTA that
 * kicks off Stripe Checkout.
 *
 * Used by: voice picker (Pro voices), private video toggle (Pro
 * visibility), HD quality (Pro), custom watermark (Pro), API access
 * (Team), comparison mode (Pro), etc.
 */
import { useState } from "react";

interface PaywallProps {
  feature: string;
  description: string;
  tier: "pro" | "team";
  /** Optional content preview rendered behind a blur. */
  children?: React.ReactNode;
  /** Override the upgrade CTA label. */
  ctaLabel?: string;
}

const TIER_PRICE = { pro: 19, team: 99 } as const;
const TIER_LABEL = { pro: "Pro", team: "Team" } as const;

export function Paywall({
  feature,
  description,
  tier,
  children,
  ctaLabel,
}: PaywallProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: tier,
          success_url: `${window.location.origin}/dashboard?welcome=${tier}`,
          cancel_url: window.location.href,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-electric/20 bg-graphite/40 p-6 backdrop-blur">
      {children && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 select-none opacity-40 blur-md"
        >
          {children}
        </div>
      )}
      <div className="relative">
        <div className="kicker text-electric">
          {TIER_LABEL[tier]} · ${TIER_PRICE[tier]}/mo
        </div>
        <h3 className="mt-3 font-display text-2xl font-bold text-bone">
          {feature}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-fog">{description}</p>
        <button
          type="button"
          onClick={startCheckout}
          disabled={loading}
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-full bg-electric px-5 text-sm font-medium text-ink transition-all duration-300 ease-luxe hover:brightness-110 hover:shadow-[0_0_24px_-4px_rgba(0,240,255,0.7)] disabled:opacity-50"
        >
          {loading
            ? "Redirecting…"
            : ctaLabel || `Upgrade to ${TIER_LABEL[tier]}`}
          {!loading && <span aria-hidden>→</span>}
        </button>
        {error && (
          <p className="mt-4 text-xs text-rose-400">
            Couldn&apos;t start checkout: {error}
          </p>
        )}
      </div>
    </div>
  );
}
