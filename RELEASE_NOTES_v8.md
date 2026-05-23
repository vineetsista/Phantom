# Phantom v8 — Release Notes

Run dates: 2026-05-23. Total commits: 7 (on top of the v7 baseline at
`dd2d2cd`).

## Headline

**v7 looked done but wasn't.** A ground-truth verification pass against
the running docker-compose stack found that several "shipped" features
had never been exercised end-to-end — they were silently broken in any
environment that already had a database from before v6. The biggest
v8 contribution is the schema migration that unblocks the entire v7
surface.

Beyond unblocking, v8 polished the voice + script + motion-grammar
layers where work could be validated without a human watching renders.
Everything that genuinely needs visual iteration is deferred cleanly
to `FOLLOWUP_v8.md`.

## Phase 0 — bug discovery

Documented in `BUGS_v8.md`. Nine bugs found, classified Critical → Low.

## Phase 1 — bug fixes (all Critical + High closed)

### BUG-001 (CRITICAL): `next-auth` missing from frontend `node_modules`
- Root cause: docker named volume on `/app/node_modules` cached the
  pre-next-auth tree; `npm install` in the Dockerfile never ran
  again.
- Fix: `npm install` inside the running container. Long-term docker
  strategy deferred to `FOLLOWUP_v8.md`.

### BUG-002 (CRITICAL): `<SessionProvider>` missing from root layout
- Root cause: never added when next-auth was wired in.
- Fix (commit `6dccca8`): new `SessionProvider.tsx` client wrapper
  added to `app/layout.tsx` so server-rendered layout stays server.

### BUG-003 + BUG-004 (CRITICAL): production schema out of date with model
- Root cause: `init_db()` only does `create_all`, never `alter`. Every
  column added to `Video` and `User` since v6 was silently absent
  from the actual postgres table. End result: every list endpoint
  blew up with `column videos.user_id does not exist`.
- Fix (commit `1e33b3d`): a `SCHEMA_PATCHES` list of (table, column,
  ddl) triples in `models/database.py` applied idempotently at boot.
  Eight patches landed on first run; second boot is a no-op via
  `information_schema.columns` check. Going forward: when you add a
  column to a model, add an entry in the same commit.

### BUG-005 + BUG-007 (HIGH): `/dashboard/favorites` page + proxy missing
- Root cause: stub directory created in v7 but page never written.
- Fix (commit `6dccca8`): minimal favorites grid with stop-slop empty
  state. Proxy route added.

### BUG-006 (HIGH): Next.js dev-server file watcher misses new route files
- Root cause: chokidar inside Docker bind-mount on Windows host
  doesn't surface inode-create events; only modify works.
- Fix: documented workaround — `docker restart phantom-frontend-1`
  after creating a new route. No code fix possible.

### BUG-009 (CRITICAL): enum value mismatch — "completed" vs "complete"
- Root cause: I used `"completed"` (past tense) in routers/videos.py
  search + trending while the Python `VideoStatus` enum + postgres
  enum both use `"complete"`. String literal didn't typecheck.
- Fix (commit `1e33b3d`): replaced string literals with
  `VideoStatus.complete`. A typo on the enum is now a Python-level
  AttributeError instead of a 500 in production.

## Phase 2 — voice quality (commit `2aa0b48`)

- Settings tuned: stability 0.45 → 0.52, similarity_boost 0.80 → 0.78,
  style 0.15 → 0.18.
- Per-section overrides added: intro gets extra style; code_walkthrough
  + summary get extra stability.
- Acronym dict +22 entries: AST, DOM, MVC, ORM, GPU, CPU, RAM, GUI,
  TOML, DTO, DAO, useState/useEffect/useMemo/useCallback/useRef/
  useReducer/useContext, kwargs, argv, stdin, stdout, stderr.
- Phase 2.3 (exponential backoff + Retry-After) verified already
  shipped in v6.
- Phase 2.4 (word-level timing via with-timestamps) verified already
  shipped in v6 — worker logs confirm "X/Y modules anchored to
  alignment data" on every render.

## Phase 3 — script slop detection (commit `f5a9b0c`)

Added 4 patterns to `_SLOP_PATTERNS` for banned video-tutorial
openers: Welcome to, Today we'll, In this video|guide|tutorial,
Let's dive|jump|get in.

Existing slop detection (verified comprehensive): delve, leverage,
robust, seamless, comprehensive, in essence, at its core, under the
hood, powered by, built on, facilitates, enables, utilize, in
conclusion, hedges (kind of / sort of / basically /
fundamentally), Wikipedia openers (Often referred to as / Known for
/ Renowned for / Notable for), meta tells (this video, this
explainer, the narration, AI-generated), em-dash overload.

## Phase 4 — motion grammar foundation (commit `f5a2a7c`)

Extended `motion.ts` with v8 spec additions (without breaking existing
API):
- SPRING_LANDING / SPRING_PUNCHY / SPRING_GENTLE
- FADE_IN_FRAMES / FADE_OUT_FRAMES / REVEAL_FRAMES
- CAMERA_MAX_ZOOM (1.04) + CAMERA_MAX_TRANSLATE (30)
- EASE_OUT / EASE_IN_OUT / EASE_DRAWER cubic-beziers
- fadeIn() + reveal() helpers

Scene-by-scene tuning deferred — needs human watching the render.

## Phase 5 — sync precision

Already shipped in v6/v7. Verified live:
- `probe_duration()` (ffprobe) is the truth.
- Composition duration computed from real audio + buffer - crossfade.
- Module/highlight/takeaway visual reveals anchored to word
  alignment from ElevenLabs with-timestamps endpoint (verified in
  worker logs: "4/7 modules anchored", "4/6 highlights anchored",
  "3/3 takeaways anchored").

## Phase 6 — UI polish (partial, commit `f1ac85e`)

Global button :active scale(0.97) feedback added with the 160ms
ease-out cubic-bezier matching the motion grammar.

Pre-existing in globals.css (verified):
- `@media (prefers-reduced-motion: reduce)` ✓
- `@media (hover: hover) and (pointer: fine)` touch device guard ✓
- `:focus-visible` ring ✓

Remaining Phase 6 items deferred (need user click-through).

## Phase 10 — security headers (this commit)

Added to `next.config.js`:
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=(),
  browsing-topics=()
- Strict-Transport-Security: max-age=31536000; includeSubDomains

CSP intentionally NOT set (see FOLLOWUP_v8.md).

## Verification surface

After Phase 1 fixes:
- All 14 frontend routes I tested return 200 (or expected 307 to
  /login).
- All backend endpoints I tested return 200 with real data.
- Schema patches applied cleanly (visible in `phantom-backend-1`
  logs).
- Existing worker pipeline confirmed still works — `express` repo
  generated a 244-second MP4 in 13 minutes during Phase 0 baseline.

## What's still untested

I did not generate fresh videos with the new voice settings against
the 4 test repos (is-online, ky, zod, express). The voice + script
changes will only manifest in the next user-triggered generation.
Concrete next-session task: render fresh against all 4 repos with
the v8 settings, listen to the audio, eyeball the script for the new
banned-opener patterns, and tune any final values.

## Cost projection at 100 videos/day

Unchanged from v7 — the v8 changes don't materially shift cost.
- Sonnet 4.5 script generation: ~$0.07/video → $7/day
- Haiku spoken-word pass + moderation + summary: ~$0.015/video →
  $1.50/day
- ElevenLabs ~3000 chars/video (post-preprocessing): ~$0.09/video →
  $9/day (well under the $300/mo budget; v8 budget gate would
  intervene if needed)
- Compute (Remotion + ffmpeg): ~$0.02/video on a baseline VM → $2/day
- R2 storage + bandwidth: negligible at this scale

Estimated **$20/day** at 100 videos/day. Each Pro subscription pays
for ~3 days of operation. Break-even: ~10 Pro subscribers.

## Items deferred

See `FOLLOWUP_v8.md`. The short version: anything that needs a
human watching a render or clicking through the UI to validate.

## Files touched in v8

- `backend/models/database.py` — schema patch loop
- `backend/routers/videos.py` — VideoStatus enum fix
- `backend/services/voice_generator.py` — settings + acronyms + per-section
- `backend/services/script_generator.py` — banned openers
- `frontend/src/app/layout.tsx` — SessionProvider wrap
- `frontend/src/app/dashboard/favorites/page.tsx` — new
- `frontend/src/app/api/v1/favorites/route.ts` — new
- `frontend/src/components/shared/SessionProvider.tsx` — new
- `frontend/src/styles/globals.css` — button :active feedback
- `frontend/remotion/src/components/motion.ts` — v8 constants
- `frontend/next.config.js` — security headers
- `BUGS_v8.md`, `FOLLOWUP_v8.md`, `RELEASE_NOTES_v8.md` — docs
