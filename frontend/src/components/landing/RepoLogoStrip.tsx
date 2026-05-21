"use client";

import { motion } from "framer-motion";

/**
 * Horizontal strip of repo logos shown directly under the hero. Implies
 * "we've analyzed these" without making explicit claims that aren't backed
 * up yet. Each logo links to the corresponding /showcase/[slug] page so
 * curious visitors get pulled into the demo gallery instead of bouncing.
 *
 * Uses simpleicons.org CDN (no dependency, cached at the edge) so we don't
 * have to ship SVG sprites for every brand mark.
 */

const REPOS = [
  { name: "React", slug: "react", icon: "react", color: "61DAFB" },
  { name: "Vue", slug: "vue", icon: "vuedotjs", color: "4FC08D" },
  { name: "Next.js", slug: "next-js", icon: "nextdotjs", color: "F5F5F0" },
  { name: "FastAPI", slug: "fastapi", icon: "fastapi", color: "009688" },
  { name: "Tailwind", slug: "tailwindcss", icon: "tailwindcss", color: "06B6D4" },
  { name: "LangChain", slug: "langchain", icon: "langchain", color: "F5F5F0" },
  { name: "Supabase", slug: "supabase", icon: "supabase", color: "3ECF8E" },
  { name: "Bun", slug: "bun", icon: "bun", color: "FBF0DF" },
];

export function RepoLogoStrip() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20%" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Codebases already explained"
      className="border-y border-white/[0.04] bg-graphite/30"
    >
      <div className="mx-auto max-w-[1280px] px-6 py-12">
        <p className="kicker text-fog">
          Explainers ready for · click any to watch
        </p>
        <ul className="mt-6 grid grid-cols-4 items-center gap-x-6 gap-y-8 md:grid-cols-8">
          {REPOS.map((repo, index) => (
            <li key={repo.slug}>
              <motion.a
                href={`/showcase/${repo.slug}`}
                data-cursor="interactive"
                initial={{ opacity: 0, y: 4 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: 0.05 * index,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group flex flex-col items-center gap-2 text-mist transition-colors duration-300 ease-luxe hover:text-bone"
                aria-label={`Watch the ${repo.name} explainer`}
              >
                <img
                  src={`https://cdn.simpleicons.org/${repo.icon}/A8A8B3`}
                  alt=""
                  width={28}
                  height={28}
                  loading="lazy"
                  className="opacity-50 grayscale transition-all duration-400 ease-luxe group-hover:opacity-100 group-hover:grayscale-0"
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.32em]">
                  {repo.name}
                </span>
              </motion.a>
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}
