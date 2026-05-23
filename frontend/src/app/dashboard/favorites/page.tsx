"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Favorite {
  id: string;
  video_id: string;
  created_at: string;
  video: {
    id: string;
    repo_owner: string;
    repo_name: string;
    repo_description?: string;
    duration_seconds?: number;
    view_count?: number;
    thumbnail_url?: string;
  };
}

export default function FavoritesPage() {
  const [items, setItems] = useState<Favorite[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/favorites")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => setItems(d.favorites || []))
      .catch(() => setError("Couldn't load favorites. Are you signed in?"));
  }, []);

  return (
    <section className="mx-auto max-w-4xl px-6 pb-32 pt-20">
      <header className="flex items-end justify-between">
        <div>
          <div className="kicker">Favorites</div>
          <h1 className="mt-3 font-display text-4xl font-bold text-bone">
            Videos worth keeping.
          </h1>
        </div>
        <Link href="/dashboard" className="text-sm text-fog hover:text-bone">
          ← Dashboard
        </Link>
      </header>

      {error && <p className="mt-10 text-rose-300">{error}</p>}
      {items === null && !error && <p className="mt-10 text-mist">Loading…</p>}
      {items !== null && items.length === 0 && (
        <p className="mt-10 text-mist">
          Hearts mean something. Find one worth keeping —{" "}
          <Link href="/showcase" className="text-electric hover:underline">
            browse the showcase
          </Link>
          .
        </p>
      )}

      {items && items.length > 0 && (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {items.map((f) => (
            <li key={f.id}>
              <Link
                href={`/v/${f.video.id}`}
                className="group block rounded-xl border border-white/10 bg-graphite/60 p-5 transition hover:border-electric/40"
              >
                <div className="font-mono text-xs text-mist">
                  {f.video.repo_owner}/
                </div>
                <div className="mt-1 font-display text-lg font-bold text-bone">
                  {f.video.repo_name}
                </div>
                {f.video.repo_description && (
                  <p className="mt-2 line-clamp-2 text-sm text-fog">
                    {f.video.repo_description}
                  </p>
                )}
                <div className="mt-3 text-xs text-mist">
                  Saved {new Date(f.created_at).toLocaleDateString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
