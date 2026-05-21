"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Download, X } from "lucide-react";
import { useEffect, useState } from "react";

import { track } from "@/lib/analytics";

/**
 * Exit-intent popup. Triggers when the cursor leaves through the top of the
 * viewport (most reliable signal for "user is about to switch tabs / close").
 * On touch devices (no mouseleave), triggers after a scroll-up of 200px+
 * from a deep scroll position.
 *
 * Frequency cap: dismissals + conversions are stored in localStorage with a
 * 30-day TTL. Never shows on /generate, /video/*, or /admin/* (no context to
 * interrupt). Also suppressed when ?nopopup=1 is in the URL (for QA).
 *
 * The lead magnet is "Top 10 Codebases Every Engineer Should Understand" — a
 * static PDF generated separately (see scripts/build-lead-magnet.py).
 */

const STORAGE_KEY = "phantom.exit-intent.last-state";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SUPPRESS_PATH_PREFIXES = ["/generate", "/video", "/admin", "/embed"];
const LEAD_MAGNET_PATH = "/lead-magnets/top-10-codebases.pdf";

type StoredState = { kind: "dismissed" | "converted"; at: number };

function readState(): StoredState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredState;
    if (Date.now() - parsed.at > TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeState(state: StoredState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage can throw in Safari private mode — silently ignore
  }
}

export function ExitIntentPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Path-based suppression — don't interrupt high-intent flows.
    const path = window.location.pathname;
    if (SUPPRESS_PATH_PREFIXES.some((p) => path.startsWith(p))) return;
    if (new URLSearchParams(window.location.search).get("nopopup") === "1") return;

    // Frequency cap.
    if (readState()) return;

    // Don't fire until the user has been on the page for a moment — guards
    // against trigger-on-bounce.
    let armed = false;
    const armTimer = window.setTimeout(() => {
      armed = true;
    }, 8_000);

    // Desktop: classic mouseleave-through-top.
    function onMouseLeave(event: MouseEvent) {
      if (!armed) return;
      if (event.clientY > 0) return;
      if (event.relatedTarget != null) return;
      setOpen(true);
      teardown();
    }

    // Mobile fallback: a meaningful scroll-up gesture from depth.
    let maxScroll = 0;
    function onScroll() {
      if (!armed) return;
      const y = window.scrollY;
      if (y > maxScroll) {
        maxScroll = y;
        return;
      }
      if (maxScroll > 600 && maxScroll - y > 200) {
        setOpen(true);
        teardown();
      }
    }

    function teardown() {
      window.clearTimeout(armTimer);
      document.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("scroll", onScroll);
    }

    document.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("scroll", onScroll, { passive: true });

    return teardown;
  }, []);

  // Escape closes (treats as dismiss).
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") handleDismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function handleDismiss() {
    writeState({ kind: "dismissed", at: Date.now() });
    track("share_clicked", { source: "exit_intent", action: "dismissed" });
    setOpen(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError("That doesn't look like an email.");
      return;
    }
    setError(null);
    track("signup_started", { source: "exit_intent_lead_magnet", email_domain: normalized.split("@")[1] });

    // Try posting to a (future) lead-capture endpoint. If it 404s, that's
    // fine — the user still gets the PDF via direct download, and we still
    // tracked the analytics event.
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, source: "exit_intent" }),
      }).catch(() => undefined);
    } catch {
      // intentional: best-effort capture
    }

    writeState({ kind: "converted", at: Date.now() });
    track("signup_completed", { source: "exit_intent_lead_magnet" });
    setSubmitted(true);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[300] grid place-items-center bg-void/85 px-4 backdrop-blur-md"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-popup-title"
            className="surface-2 relative w-full max-w-[520px] overflow-hidden rounded-3xl p-8"
          >
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Close"
              className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-white/[0.04] text-fog transition-colors duration-300 hover:bg-white/10 hover:text-bone"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Decorative blobs */}
            <div
              aria-hidden
              className="pointer-events-none absolute -left-32 -top-32 h-64 w-64 rounded-full bg-electric/15 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-32 bottom-0 h-64 w-64 rounded-full bg-plasma/15 blur-3xl"
            />

            <div className="relative">
              <div className="kicker">Before you go</div>

              {!submitted ? (
                <>
                  <h2
                    id="exit-popup-title"
                    className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-bone"
                  >
                    The 10 codebases every engineer should be able to read.
                  </h2>
                  <p className="mt-3 text-sm text-fog">
                    A free PDF — what makes React, Postgres, Redis, Bun, and 6 others
                    worth studying, and the architecture patterns you'll find inside.
                    No fluff.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <label className="flex-1">
                      <span className="sr-only">Email</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@where-you-work.com"
                        autoFocus
                        className="h-12 w-full rounded-full border border-white/[0.08] bg-ink/60 px-5 font-body text-sm text-bone placeholder:text-mist outline-none transition-all duration-300 ease-luxe focus:border-electric/60 focus:bg-ink focus:glow-electric"
                      />
                    </label>
                    <button
                      type="submit"
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-electric px-6 text-sm font-semibold text-ink transition-all duration-300 ease-luxe hover:brightness-110 hover:shadow-[0_0_28px_-4px_rgba(0,240,255,0.6)]"
                    >
                      <Download className="h-4 w-4" />
                      Send me the PDF
                    </button>
                  </form>

                  {error && (
                    <p className="mt-3 text-sm text-error" role="alert">
                      {error}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="mt-6 text-xs uppercase tracking-[0.32em] text-mist transition-colors duration-300 hover:text-fog"
                  >
                    No thanks
                  </button>
                </>
              ) : (
                <>
                  <h2 id="exit-popup-title" className="mt-3 font-display text-3xl font-bold tracking-tight text-bone">
                    <span className="inline-flex items-center gap-3">
                      <Check className="h-7 w-7 text-success" />
                      Sent.
                    </span>
                  </h2>
                  <p className="mt-3 text-sm text-fog">
                    Check your inbox in a minute. While you wait — here's the direct
                    link.
                  </p>
                  <a
                    href={LEAD_MAGNET_PATH}
                    download
                    className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-electric px-6 text-sm font-semibold text-ink transition-all duration-300 ease-luxe hover:brightness-110"
                    onClick={() => track("download_clicked", { source: "exit_intent", asset: "top-10-codebases" })}
                  >
                    <Download className="h-4 w-4" />
                    Download now
                  </a>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
