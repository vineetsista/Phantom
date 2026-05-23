import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/shared/JsonLd";
import { PosterImage } from "@/components/showcase/PosterImage";
import { SHOWCASE_REPOS } from "@/lib/showcase";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://phantom.video";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface LiveVideo {
  id: string;
  repo_owner: string;
  repo_name: string;
  repo_description?: string;
  repo_language?: string;
  repo_stars?: number;
  thumbnail_url?: string;
  duration_seconds?: number;
}

async function fetchLiveShowcase(): Promise<LiveVideo[]> {
  // Live videos surface alongside the curated set. We pull the trending
  // feed (24h) so the showcase reflects what people are actually
  // watching right now; it falls back to all-time top inside the
  // backend if Redis is empty.
  try {
    const res = await fetch(`${API_URL}/api/v1/trending?limit=18`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.videos as LiveVideo[]) || [];
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title: "Showcase — codebase explainers for the projects you already use",
  description:
    "Pre-generated AI video walkthroughs of React, Vue, FastAPI, Next.js, Tailwind, LangChain, Supabase, and Bun. Three-minute explainers of the projects every engineer should understand.",
  alternates: { canonical: `${BASE_URL}/showcase` },
  openGraph: {
    title: "Phantom Showcase",
    description: "AI-generated explainers for the biggest open source projects.",
    url: `${BASE_URL}/showcase`,
    images: [{ url: "/api/og?title=Phantom%20Showcase", width: 1200, height: 630 }],
  },
};

export default async function ShowcasePage() {
  const liveVideos = await fetchLiveShowcase();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Phantom Showcase",
          url: `${BASE_URL}/showcase`,
          description:
            "Pre-generated AI video walkthroughs of popular open source codebases.",
          isPartOf: { "@type": "WebSite", name: "Phantom", url: BASE_URL },
          mainEntity: {
            "@type": "ItemList",
            itemListElement: SHOWCASE_REPOS.map((repo, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: `${BASE_URL}/showcase/${repo.slug}`,
              name: repo.title,
            })),
          },
        }}
      />

      <section className="mx-auto max-w-[1280px] px-6 pb-32 pt-24">
        <header className="mx-auto max-w-2xl text-center">
          <div className="kicker">Showcase</div>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[0.95] tracking-tighter text-bone sm:text-7xl">
            The projects you already use, <span className="accent-electric">explained</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-fog">
            Pre-generated walkthroughs of popular open source codebases. Each
            video was produced automatically by Phantom — no human editing.
          </p>
        </header>

        <div className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SHOWCASE_REPOS.map((repo) => (
            <Link
              key={repo.slug}
              href={`/showcase/${repo.slug}`}
              data-cursor="interactive"
              className="group block overflow-hidden rounded-2xl border border-white/[0.06] bg-graphite/60 transition-all duration-400 ease-luxe hover:-translate-y-1 hover:border-electric/30"
            >
              <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-electric/15 via-graphite to-plasma/15">
                <PosterImage
                  src={`/showcase/${repo.slug}-poster.jpg`}
                  className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 ease-luxe group-hover:opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
                <div className="absolute right-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.32em] text-fog backdrop-blur">
                  {repo.durationLabel}
                </div>
                <div className="absolute left-4 bottom-4 right-4">
                  <div className="font-display text-xl font-bold text-bone">{repo.repo}</div>
                  <div className="mt-1 text-xs text-fog">{repo.description}</div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.04] px-5 py-3 text-xs">
                <span className="font-mono uppercase tracking-[0.32em] accent-electric">
                  {repo.language}
                </span>
                <span className="font-mono text-mist">
                  ★ {repo.stars.toLocaleString()}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {liveVideos.length > 0 && (
          <section className="mt-32">
            <header className="flex items-end justify-between">
              <div>
                <div className="kicker">From the community</div>
                <h2 className="mt-3 font-display text-3xl font-bold text-bone">
                  Trending now.
                </h2>
              </div>
              <Link href="/trending" className="text-sm text-fog hover:text-bone">
                View all →
              </Link>
            </header>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {liveVideos.map((v) => (
                <Link
                  key={v.id}
                  href={`/v/${v.id}`}
                  className="group block rounded-xl border border-white/10 bg-graphite/60 p-5 transition hover:border-electric/40"
                >
                  <div className="font-mono text-xs text-mist">
                    {v.repo_owner}/
                  </div>
                  <div className="mt-1 font-display text-lg font-bold text-bone">
                    {v.repo_name}
                  </div>
                  {v.repo_description && (
                    <p className="mt-2 line-clamp-2 text-sm text-fog">
                      {v.repo_description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between text-xs text-mist">
                    <span>{v.repo_language || "—"}</span>
                    {v.repo_stars ? <span>★ {v.repo_stars.toLocaleString()}</span> : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </section>
    </>
  );
}
