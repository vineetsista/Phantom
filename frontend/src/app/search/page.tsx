"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface VideoRow {
  id: string;
  repo_owner: string;
  repo_name: string;
  repo_description?: string;
  thumbnail_url?: string;
  view_count?: number;
  duration_seconds?: number;
}

export default function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("q") || "";
  const [q, setQ] = useState(initial);
  const [results, setResults] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/v1/search?q=${encodeURIComponent(trimmed)}`)
        .then((r) => r.json())
        .then((data) => setResults(data.videos || []))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timeout);
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <section className="mx-auto max-w-5xl px-6 pb-32 pt-20">
      <header>
        <div className="kicker">Search</div>
        <h1 className="mt-3 font-display text-5xl font-bold text-bone">
          Find a codebase.
        </h1>
        <p className="mt-3 max-w-xl text-fog">
          Search across every public Phantom video — by owner, repo name, or
          description.
        </p>
      </header>

      <form onSubmit={submit} className="mt-10">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="react, fastapi, tailwindcss…"
          className="w-full rounded-2xl border border-white/10 bg-graphite px-5 py-4 text-lg text-bone outline-none focus:border-electric"
        />
      </form>

      <div className="mt-10">
        {loading && <p className="text-mist">Searching…</p>}
        {!loading && q && results.length === 0 && (
          <p className="text-mist">
            No videos for &ldquo;{q}&rdquo; yet. Be the first —{" "}
            <Link href="/" className="text-electric hover:underline">
              generate one
            </Link>
            .
          </p>
        )}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((v) => (
            <li key={v.id}>
              <Link
                href={`/v/${v.id}`}
                className="group block rounded-xl border border-white/10 bg-graphite/60 p-5 transition hover:border-electric/40"
              >
                <div className="font-mono text-xs text-mist">{v.repo_owner}/</div>
                <div className="mt-1 font-display text-xl font-bold text-bone">
                  {v.repo_name}
                </div>
                {v.repo_description && (
                  <p className="mt-2 line-clamp-2 text-sm text-fog">
                    {v.repo_description}
                  </p>
                )}
                <div className="mt-3 text-xs text-mist">
                  {v.view_count ?? 0} views
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
