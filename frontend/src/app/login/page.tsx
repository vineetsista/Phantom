"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { Logo } from "@/components/shared/Logo";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [status, next, router]);

  return (
    <div className="grid min-h-[80vh] place-items-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-graphite/40 p-10 backdrop-blur">
        <Logo />
        <h1 className="mt-10 font-display text-3xl font-bold text-bone">
          Sign in to generate videos
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-fog">
          Phantom uses GitHub OAuth — you can revoke access any time from
          GitHub settings. We read your public profile only.
        </p>
        <button
          type="button"
          onClick={() => signIn("github", { callbackUrl: next })}
          className="mt-10 inline-flex h-12 w-full items-center justify-center gap-3 rounded-full bg-bone text-sm font-medium text-ink transition-all duration-300 ease-luxe hover:brightness-95 hover:shadow-[0_0_24px_-4px_rgba(255,255,255,0.4)]"
        >
          <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden>
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
          Continue with GitHub
        </button>
        <p className="mt-8 text-xs leading-relaxed text-mist">
          By signing in you agree to the{" "}
          <a href="/terms" className="text-fog hover:text-bone">terms</a> and{" "}
          <a href="/privacy" className="text-fog hover:text-bone">privacy policy</a>.
        </p>
      </div>
    </div>
  );
}
