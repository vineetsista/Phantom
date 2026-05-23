"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ComparePage() {
  const router = useRouter();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/generate/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url_a: a, repo_url_b: b }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      router.push(`/v/${data.job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start compare.");
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-6 pb-32 pt-20">
      <div className="kicker">Compare two repos</div>
      <h1 className="mt-3 font-display text-5xl font-bold text-bone">
        Two codebases. One side-by-side.
      </h1>
      <p className="mt-4 max-w-lg text-fog">
        Pick two repos that solve overlapping problems. We&rsquo;ll surface
        what they share, where they diverge, and when you&rsquo;d reach for
        each one. Counts as 2x quota since the analyzer runs twice.
      </p>

      <form onSubmit={submit} className="mt-10 space-y-5">
        <label className="block">
          <div className="kicker text-fog">Repo A</div>
          <input
            value={a}
            onChange={(e) => setA(e.target.value)}
            placeholder="https://github.com/anthropics/sdk-python"
            className="mt-2 w-full rounded-xl border border-white/10 bg-graphite px-4 py-3 text-bone outline-none focus:border-electric"
          />
        </label>
        <label className="block">
          <div className="kicker text-fog">Repo B</div>
          <input
            value={b}
            onChange={(e) => setB(e.target.value)}
            placeholder="https://github.com/openai/openai-python"
            className="mt-2 w-full rounded-xl border border-white/10 bg-graphite px-4 py-3 text-bone outline-none focus:border-electric"
          />
        </label>
        {error && (
          <div className="rounded-lg border border-rose-400/30 bg-rose-400/5 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting || !a.trim() || !b.trim()}
          className="rounded-full bg-electric px-6 py-3 font-mono text-sm text-ink transition-colors hover:bg-electric/80 disabled:opacity-50"
        >
          {submitting ? "Queuing…" : "Compare these"}
        </button>
      </form>
    </section>
  );
}
