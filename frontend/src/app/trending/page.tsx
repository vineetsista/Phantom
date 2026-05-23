import Link from "next/link";
import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const metadata: Metadata = {
  title: "Trending — what engineers are watching on Phantom",
  description: "The most-watched codebase explainers in the last 24 hours.",
};

interface VideoRow {
  id: string;
  repo_owner: string;
  repo_name: string;
  repo_description?: string;
  trending_score?: number;
  view_count?: number;
}

async function fetchTrending(): Promise<{ videos: VideoRow[]; source: string }> {
  try {
    const res = await fetch(`${API_URL}/api/v1/trending?limit=24`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { videos: [], source: "error" };
    return res.json();
  } catch {
    return { videos: [], source: "error" };
  }
}

export default async function TrendingPage() {
  const { videos, source } = await fetchTrending();
  return (
    <section className="mx-auto max-w-5xl px-6 pb-32 pt-20">
      <header>
        <div className="kicker">Trending</div>
        <h1 className="mt-3 font-display text-5xl font-bold text-bone">
          What engineers are watching.
        </h1>
        <p className="mt-3 max-w-xl text-fog">
          {source === "redis_24h"
            ? "Most-viewed Phantom videos in the last 24 hours."
            : "Most-watched videos of all time."}
        </p>
      </header>

      {videos.length === 0 ? (
        <p className="mt-10 text-mist">
          Nothing trending yet. Be the first —{" "}
          <Link href="/" className="text-electric hover:underline">
            generate a video
          </Link>
          .
        </p>
      ) : (
        <ol className="mt-10 space-y-3">
          {videos.map((v, i) => (
            <li key={v.id}>
              <Link
                href={`/v/${v.id}`}
                className="flex items-center gap-5 rounded-xl border border-white/10 bg-graphite/60 px-5 py-4 transition hover:border-electric/40"
              >
                <div className="w-8 font-mono text-2xl text-mist">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex-1">
                  <div className="font-display text-lg font-bold text-bone">
                    {v.repo_owner}/{v.repo_name}
                  </div>
                  {v.repo_description && (
                    <p className="mt-1 line-clamp-1 text-sm text-fog">
                      {v.repo_description}
                    </p>
                  )}
                </div>
                <div className="font-mono text-xs text-mist">
                  {v.trending_score ?? v.view_count ?? 0} views
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
