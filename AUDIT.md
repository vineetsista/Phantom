# Phantom — Deep Quality Audit

## Executive summary

**Strongest.** The custom `VideoPlayer` (chapters, scrub-preview, speed menu, PiP, keyboard overlay, idle auto-hide) is genuinely premium and stands up against Linear/Vercel-tier work. The `ShareModal` with a live OG-card preview is similarly polished. The design system — Clash Display + Satoshi + JetBrains Mono, the electric/plasma/ember palette, the `surface-1`/`surface-2`/`glow-*` utilities, and the body-level radial-blob + grid atmosphere — is unusually intentional for a v0.1 product. The Hero's R3F torus-knot + parallax rig is committed and asymmetric. Backend graceful degradation (Claude, OpenAI, ElevenLabs, Remotion all have real fallbacks) is documented and works. SEO surface (per-repo metadata, VideoObject + Breadcrumb schema, sitemap, dynamic OG) is wired correctly.

**Weakest.** The `SocialProof` marquee invents eight named testimonials (M. Alvarez, Yusuf D., Priya R., Anjali N. …) for a product that hasn't shipped — a brand and legal liability, and a direct violation of the copy-editing "Prove It" sweep. The generated video falls well short of the landing's "cinematic" claim: Remotion scenes default to `Inter` (an AI-slop font flagged by `frontend-design`, and incoherent with the Clash/Satoshi brand on the web), there is no background music bed, scenes hard-cut with no transitions, the "Code walkthrough" scene is actually a file-size list (no code, no highlights), and `data_flow` / `file_tree` sections silently render the Intro scene instead of dedicated compositions. Multiple Footer/FAQ promises are unbacked: `/docs`, `/changelog`, `/examples`, `/about`, `/privacy` all 404; the GitHub URL is the bare `https://github.com/`; the FAQ tells users private repos work today, but the README roadmap lists private repo support as Next. The `RepoLogoStrip` kicker reads "Explainers ready for · click any to watch", which is true only if the `/public/showcase/*.mp4` files exist on disk.

**Single highest-leverage improvement.** Rip out the eight fabricated testimonials and rebuild `SocialProof` around things you can actually prove (the eight showcase repos with real star counts; a public counter of videos generated; or a Pratfall-Effect honesty frame — "no quotes yet, here's what shipped on day one"). This removes the biggest trust risk on the page, lets you keep the marquee mechanic, and is sub-30-minute work.

**Estimated effort to bring everything to A-tier minimum.** ~14–18 hours of focused work, dominated by Remotion polish (~5h: scene font + music + transitions + data_flow/file_tree fallback + code-highlight scene), copy specificity sweep (~3h), Footer/FAQ/route cleanup (~2h), social proof rebuild (~1h), and the remaining tactical fixes (~3–7h).

---

## Audit hit list

Sorted Severity desc, then Impact desc. Effort: S (<15 min), M (15–45 min), L (45+ min).

| # | Item | Grade | Issue | Fix | Severity | Effort | Impact |
|---|---|---|---|---|---|---|---|
| 1 | `SocialProof` — fabricated testimonials (8 named people) | D | All eight quotes/names/roles are invented for a product that hasn't shipped; violates copy-editing "Prove It" sweep, brand/legal liability | Replace marquee with real proof: showcase repo logos w/ live star totals, or an honest "Day-1 beta — no quotes yet, here's what shipped" panel | Critical | M | Removes legal/trust risk, restores credibility of every other claim on the page |
| 2 | Footer links — `/docs`, `/changelog`, `/examples`, `/about`, `/privacy`, bare `https://github.com/` | D | Five internal links 404; the GitHub URL has no repo path; Twitter handle `usephantom` is unverified | Either build minimal placeholder pages (privacy + about are easy) or remove the columns; replace the bare GH link with the actual repo URL | Critical | M | Stops every footer interaction from breaking; removes the obvious "this is half-shipped" signal |
| 3 | Hero subhead promises "data flow" scene; `/Video.tsx` falls back to IntroScene for `data_flow`/`file_tree` | C | Landing copy advertises a scene type that, if Claude emits it, renders as a duplicate Intro instead of dedicated visuals | Either build minimal DataFlowScene + FileTreeScene (L) OR strip "data flow" from the hero/feature copy until shipped (S) | Critical | S–L | Eliminates the most visible promise-vs-reality gap; protects from a real user generating a video that looks broken |
| 4 | Remotion scenes use `Inter, system-ui` — explicitly on `frontend-design` avoid-list | C | Brand uses Clash Display + Satoshi everywhere; the generated video reverts to Inter, breaking visual continuity and triggering AI-slop pattern | Self-host Clash Display + Satoshi as Remotion assets via `staticFile`; swap font-family in every scene + components | High | M | The output product finally looks like the brand; biggest single visual upgrade to the video |
| 5 | Generated video has no background music | C | All scenes play with narration over silence; "cinematic" claim feels hollow; peak-end rule has no peak | Add a 90 BPM ambient/atmospheric bed mixed at ~−24 dB under narration; `<Audio>` track over full Series with fade in/out | High | M | Pulls perceived quality up a full tier; matches the visual atmosphere already present |
| 6 | "Code walkthrough" scene contains no code | C | Scene shows file paths + size pills + a scan-line; landing copy says "Walkthroughs — Syntax-highlighted, narrated over the parts that matter" | Render an actual syntax-highlighted snippet from `top_files[0]` with a moving highlight box; keep file list as a secondary panel | High | L | The most-watched scene of the video finally delivers what the bento cell promises |
| 7 | Scene transitions are hard cuts | C | `<Series>` plays scenes back-to-back with no fade/crossfade; jarring against the high-polish landing | Wrap each `Series.Sequence` content in a 6-frame in / 6-frame out opacity ramp via `interpolate` against `durationInFrames` | High | M | Cheapest single change that lifts the video to A-tier cinematic feel |
| 8 | FAQ says private repos work today; roadmap lists them as Next | C | Direct copy contradiction; user who provides a PAT today will hit graceful-degradation noise instead of working flow | Reword FAQ Q4 to "Private repo support ships in beta soon — public works today" until the PAT flow is real | High | S | Fixes a trust gap that would surface on first paid-tier intent |
| 9 | `RepoLogoStrip` kicker claims explainers are ready — depends on assets that may not exist | C | "Explainers ready for · click any to watch" only true if `/public/showcase/{slug}.mp4` + `-poster.jpg` are present on disk; nothing in repo guarantees that | Run `scripts/setup.sh` to confirm assets are present, OR change the kicker to "Showcase repos we've analyzed" until videos land | High | S | Closes a 404 trap from the highest-traffic CTA path |
| 10 | "AI reads the codebase like a senior engineer" | C | HowItWorks step 02 — vague, unfalsifiable, sounds AI-slop | Replace with "Walks the file tree, extracts modules, picks the 6 files that carry the most weight" (specific, true, audit-friendly) | High | S | Sharpens the only paragraph above the fold on the highest-traffic section |
| 11 | `WhatYouGet` bento previews are decorative, not screenshots | C | Six tiny SVG/CSS mockups (boxes + dashed lines, waveform bars, format chips) don't show real product output | Replace at least three with stills/loops from a real Phantom-generated video (architecture diagram, the file-list scene, an OG card) | High | M | Shifts the section from "we could do this" to "we did this" — biggest specificity upgrade on the page |
| 12 | Hero `WordReveal` accent only highlights `minutes.` | B | The accent color logic flags only one word; everything else stays bone — payoff word feels arbitrary | Either accent `codebase.` + `minutes.` together (parallel) or accent the whole second line; commit harder | Medium | S | Tightens the strongest piece of typography on the page |
| 13 | Hero R3F element is a torus-knot — visually fine but generic | B | A torus-knot is the default "AI thinks about code" shape; the brand could own something more specific (file tree, code graph, repo network) | Replace knot with a slow-rotating procedural file-tree-as-3D-graph; particles already do the orbital atmosphere | Medium | L | One-of-a-kind hero asset vs. a Three.js demo |
| 14 | Pricing — no high-tier anchor above $49 | B | Three tiers $0/$19/$49 max; missing the anchoring tier that makes Pro look like a steal | Add a 4th "Enterprise" tier as text-only with "Talk to founder" — anchors $19 hard | Medium | S | Direct ARPU lever — marketing-psychology Anchoring + Decoy |
| 15 | `LiveFeed` lines are scripted per stage, not derived from the actual job | B | Feed says "Cloning https://github.com/owner/name", "Spinning up Remotion render" regardless of what the worker is doing — magic break the first time a user retries with a different repo and sees identical lines | Have the worker emit 3–5 timestamped feed entries per stage into `status_details.feed[]`; render those instead of constants | Medium | L | Closes the "wait, is this real?" feeling that hits ~3s into the wait |
| 16 | Generation completion has no celebratory beat | B | On `status === "complete"`, the layout adds a "Watch your video" button; no confetti, no shimmer, no peak | Add a single Framer 700ms scale/glow flash on the pipeline-complete card + a `Sparkles` icon ping; ride the peak-end rule | Medium | M | Memory of the wait is set by the end — tiny lift, big retention impact |
| 17 | `/video/[id]` error state is a single sentence | B | "Could not load video" + a link back to /generate; no retry, no fallback, no support path | Add "Try again" button (re-fetch), include the job ID, link to copy diagnostic info | Medium | S | Makes the worst-case outcome feel handled |
| 18 | Generation error path has no recovery action | B | Failure renders `error_message` as red text; user has to manually re-paste URL and retry | When `status === "failed"`, surface a "Retry with same repo" button that re-POSTs `/generate` with the original URL | Medium | M | Saves the user from having to know how the URL state works |
| 19 | `useGenerationStatus` polling — no exponential backoff or stop on disconnect | B | Polling at 1.5s for ~3min hammers Railway with ~120 requests per video; no backoff if the worker is queued | Backoff to 3s after 30s in `queued`, 5s after 90s; stop polling on `complete`/`failed`; reuse `EventSource` if you can | Medium | M | Cuts hosting cost + improves felt smoothness |
| 20 | Showcase grid posters: no `<img>` lazyload, no skeleton, gradient placeholder | B | `PosterImage` opacity-0 until hover — but the gradient sits behind, so before hover everything looks like an empty card | Show the poster at 60% opacity by default, lift to 95% on hover; add a 1px ring on the active card | Medium | S | Showcase becomes browsable instead of a gallery of gradient swatches |
| 21 | `IntroScene` shows "PHANTOM · CODEBASE EXPLAINER" — kicker conflicts with "RepoX · the first product from Phantom" on landing | B | Two product names competing within five seconds of brand contact | Pick one: video kicker should be "PHANTOM · REPOX" or "REPOX BY PHANTOM" — match what the landing taught | Medium | S | Removes a confusion that compounds over every video shared |
| 22 | `formatDuration` not shown — likely seconds; chapters labeled like "0:42" but durations from script are integer seconds | B | If a section is 22s, the chapter dot lives at 0:22 — fine. If two sections sum past the actual audio duration, dots overshoot the bar. No guard. | After fetching `video`, clamp `chapter.start` to `<= video.duration_seconds`; log a warning if mismatch | Medium | S | Removes the rare-but-ugly "chapter dot past the end of the timeline" bug on shared pages |
| 23 | `Navbar` "Try RepoX" CTA — fine, but the only CTA in the chrome | B | Top-right pill never changes; on the `/video/[id]` page where a viewer might want to "make my own", it still says "Try RepoX" — no contextual swap | When pathname starts with `/video/` or `/showcase/`, change the CTA copy to "Make one for my repo" | Medium | S | Captures conversion intent from non-authed shared-link viewers |
| 24 | Generated video — no music + no transitions = naked feel even with great narration | B | See rows 5 + 7 | (handled by rows 5 and 7) | Medium | — | — |
| 25 | `OutroScene` says "Generated by Phantom · RepoX" — only 1 second of brand at the very end | B | The peak-end rule means the last frame is what people remember; right now it's small grey text fading in late | Hold the brand mark larger, add a 1.2s logo + URL animation in the last 60 frames, "phantom.video" prominent | Medium | M | The most-watched frame of a shared video finally earns the impression |
| 26 | Marketing — `pitch-deck.pptx` and `onepager.pdf` are binary | B | Audit can't inspect; if they were generated from PowerPoint templates they will look generic | Open both in Keynote/Google Slides; reduce slide count to 10, use Clash Display headlines + the actual product palette; export as PDF | Medium | L | Brand-consistent assets for press/launch outreach |
| 27 | `launch-tweet-thread.md`, `show-hn-post.md`, `reddit-posts.md` — voice + structure | A | Show HN post nails HN tone; tweet thread uses lowercase voice consistently; details like "cost per video: ~$0.18" are exactly the spec HN rewards | None needed — these are strong | Low | — | Already an asset |
| 28 | `dev-to-article.md` — not audited line-by-line | B | Need to read end-to-end against `stop-slop` skill before publishing | Run a copy-edit pass (Sweep 1 + Sweep 5: Clarity + Specificity) before scheduling | Medium | M | Avoids one weak post becoming the SEO frontdoor |
| 29 | Backend — `repo_analyzer.analyze()` has no LOC or file-count cap | B | A 100k-file repo (linux kernel, chromium) would walk every file and load configs into memory; no early-out | Add `MAX_FILES = 10_000` and `MAX_TOTAL_BYTES = 200_000_000` guards in `_analyze_local`; surface "Repo too large — try a smaller one" | Medium | M | Prevents the first "OOM-kill on Railway" incident before it happens |
| 30 | Backend — Celery task has no retry policy | B | `generate_video` raises on failure; no `autoretry_for`; one transient Claude 5xx kills the job | Add `autoretry_for=(anthropic.RateLimitError, openai.RateLimitError, requests.RequestException)`, `retry_backoff=True`, `retry_jitter=True`, `max_retries=2` | Medium | S | Materially raises completion rate on a flaky API day |
| 31 | Polling endpoint `/api/v1/status` — no Last-Modified or ETag | B | Every poll re-serializes the full job row; trivial to cache for ~1s | Add `Cache-Control: max-age=1, stale-while-revalidate=2` header on `get_status` | Medium | S | Cuts API CPU on the busiest endpoint |
| 32 | `Hero3DFallback` is a pulsing blob | B | The lazy-load fallback is correct, but the blob lives for 200–400ms before R3F hydrates; you can do better | Use the same R3F scene as a static SVG snapshot (export once via Blender or screenshot at frame 60) so the swap is invisible | Medium | M | Removes the only "flash of unstyled 3D" the user sees |
| 33 | `ExitIntentPopup` lives in the root layout | B | Mentioned in `layout.tsx` but not audited; high risk of being either spammy or empty | Open the component; ensure it fires once per session, has a working CTA, and uses brand voice — not "Wait! Before you go!" | Medium | S | Removes a possible AI-slop moment that bypasses everything else |
| 34 | `CursorFollower` toggles `has-custom-cursor` and hides native cursor on hover devices | B | Cursor follower is a brand asset, but if it ever stalls (e.g., React re-render mid-animation) the user is left without any cursor on the page | Verify it bails on `prefers-reduced-motion` and on touch devices (`hover: none, pointer: coarse`); add visibility check on tab blur | Medium | S | Removes a known failure mode of custom cursors |
| 35 | "12 languages and counting" claim in bento | A | Actually backed by `LANGUAGE_BY_EXT` having 20+ extensions across 18 unique languages | None | Low | — | Already true |
| 36 | "AST-parse Python" claim in `show-hn-post.md` | C | The post says "AST-parse Python; regex-derived heuristics for everything else" — current `repo_analyzer.py` does not use `ast`; it does extension lookups and read of config-file excerpts | Either implement AST parsing for Python before posting, or change the line to "extension + filename + config-file heuristics across 12+ languages" | High | S | A single line on HN that's verifiably untrue will get called out in the comments |
| 37 | `RepoLogoStrip` icons from CDN are tinted to `A8A8B3` then hover-revealed | A | Restraint pays off — letting brand color appear only on hover is a strong move | None | Low | — | Already strong |
| 38 | `WatchItWork` autoplays on scroll, muted, loops | A | Right play state, right poster, right "REC · 00:00:00" overlay; minimal but well-judged | None | Low | — | Already strong |
| 39 | `not-found.tsx` (404) with the `phantom analyze --path /` parody | A | On-brand, witty, copy is sharp; the parse-error frame is genuinely good | None | Low | — | Already strong |
| 40 | `VideoPlayer.tsx` — buffered indicator, scrubber preview, chapter dots, speed menu, PiP, fullscreen, keyboard help, idle hide | S | This is the unambiguous highlight of the codebase | None — but verify chapter dot ZIndex on Safari fullscreen | Low | — | Already strong |
| 41 | `ShareModal` — live OG card preview inside the modal | S | The modal renders the actual OG composition before the user shares; very few products do this | None | Low | — | Already strong |
| 42 | `JsonLd` + per-page metadata + sitemap + `VideoObject` schema + Breadcrumb schema | A | SEO surface is complete for v0.1; one note: `SHOWCASE_UPLOAD_DATE` is hardcoded — automate this once cron-generated showcases ship | None pre-launch | Low | — | Already strong |
| 43 | Dynamic OG `route.tsx` — gradient blobs, kicker, pills, brand mark | A | The OG card is brand-consistent and parameterized; this is what makes the `ShareModal` live preview work | None | Low | — | Already strong |
| 44 | Color palette + `surface-1`/`surface-2`/`glow-*` utilities | A | Consistent system across landing, video, showcase, generate; rare in v0.1 products | None | Low | — | Already strong |
| 45 | Graceful degradation matrix (Claude / OpenAI / ElevenLabs / GitHub / Remotion) | A | Documented and implemented — the system runs end-to-end on a fresh clone with no API keys | None | Low | — | Already strong |

---

## Roll-up by section

| Section | Tier | Headline weakness |
|---|---|---|
| Landing — Hero | A | Single accent word, generic 3D shape |
| Landing — RepoLogoStrip | A | Asset existence not guaranteed |
| Landing — WatchItWork | A | None |
| Landing — HowItWorks | B+ | Step copy reads as AI-slop |
| Landing — WhatYouGet (bento) | C | Previews are decorative, not real |
| Landing — BuiltFor | A | None |
| Landing — Pricing | B+ | Missing anchor tier above $49 |
| Landing — SocialProof | D | Fabricated testimonials |
| Landing — FAQ | B | Promises private repo support that isn't shipped |
| Landing — FinalCTA | A | None |
| Layout — Footer | C | 5 broken links, bare GitHub URL |
| Layout — Navbar | B+ | No contextual CTA on shared pages |
| Generate — Pipeline visualization | A | None |
| Generate — LiveFeed | B | Static, not derived from worker |
| Generate — Completion transition | B | No celebratory peak |
| Generate — Error path | B | No retry action |
| Video — Player | S | None |
| Video — Action bar | A | None |
| Video — Sidebar | A | None |
| Video — ShareModal | S | None |
| Showcase — Index | A | Poster hidden until hover |
| Showcase — Detail (SEO) | A | Hardcoded upload date |
| Remotion — Intro | B | Inter font, brand kicker mismatch |
| Remotion — Architecture | B+ | None major |
| Remotion — Code walkthrough | C | Shows no code |
| Remotion — Data flow / File tree | D | Not implemented; falls back to Intro |
| Remotion — Outro | B | Brand mark too small / too late |
| Remotion — Music + transitions | C | None of either |
| Backend — Endpoints | A | None |
| Backend — Pipeline reliability | B | No retry policy, no LOC cap |
| Backend — Polling | B | No backoff, no caching headers |
| Marketing — Show HN / Twitter / Reddit copy | A | AST claim is false |
| Marketing — Dev.to article | B | Not audited line-by-line |
| Marketing — Pitch deck / one-pager (binary) | B | Need eyes; risk of generic template |

---

## Recommended sequencing if you only have 4 hours

1. **30 min** — Rewrite `SocialProof` to remove fabricated names (row 1).
2. **30 min** — Fix Footer + GitHub URL + FAQ private-repo claim (rows 2, 8).
3. **20 min** — Swap Remotion `Inter` for self-hosted Clash + Satoshi (row 4).
4. **30 min** — Add ambient music track + 6-frame fades between scenes (rows 5, 7).
5. **20 min** — Sharpen HowItWorks step 02 + bento copy + tighten WordReveal accent (rows 10, 12).
6. **20 min** — Strip "data flow" from hero subhead until scene exists (row 3, the cheap branch).
7. **20 min** — Add Celery retry + LOC cap (rows 29, 30).
8. **20 min** — Add "Make one for my repo" contextual Navbar CTA on `/video/*` and `/showcase/*` (row 23).
9. **30 min** — QA pass + commit.

That sequence alone lifts every D and most of the Cs in this audit and is the path to a credible launch.
