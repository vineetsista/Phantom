# Building Phantom

The README explains *what* Phantom does and *how to run it*. This doc
explains *how it actually thinks* — the non-obvious decisions, the things
that broke and what we did about them.

If you just want to clone-and-run, go back to the [top-level README](../README.md).

---

## Table of contents

1. [The shape of the pipeline](#the-shape-of-the-pipeline)
2. [Word-level visual sync](#word-level-visual-sync)
3. [Stop-slop: keeping AI narration out of the slop trap](#stop-slop-keeping-ai-narration-out-of-the-slop-trap)
4. [Schema patches instead of Alembic](#schema-patches-instead-of-alembic)
5. [The intake URL classifier](#the-intake-url-classifier)
6. [Graceful degradation as a design principle](#graceful-degradation-as-a-design-principle)
7. [Remotion vs. ffmpeg](#remotion-vs-ffmpeg)
8. [Things that took longer than expected](#things-that-took-longer-than-expected)

---

## The shape of the pipeline

A generation is one Celery task that runs six stages back-to-back. Each
stage has a clean contract — input, output, idempotent failure mode.

```
┌─────────────────┐   POST /api/v1/generate    ┌──────────────────┐
│ Next.js client  │ ─────────────────────────▶ │  FastAPI         │
│                 │ ◀──── polling /status ──── │  Job admission   │
└─────────────────┘                            └────────┬─────────┘
                                                        │
                                                        ▼ Celery
                                              ┌──────────────────┐
                                              │  Worker pool     │
                                              │  concurrency=2   │
                                              └────────┬─────────┘
                                                        │
                                                        ▼
   ┌───────────┐  ┌────────┐  ┌─────────┐  ┌───────┐  ┌─────────┐  ┌────────┐
   │  analyze  │─▶│ script │─▶│ diagram │─▶│ voice │─▶│ assemble│─▶│ finish │
   └───────────┘  └────────┘  └─────────┘  └───────┘  └─────────┘  └────────┘
       git           Claude       SVG       ElevenLabs   Remotion    R2 upload
       walk          Sonnet 4.5  (Mermaid)   timestamps   + ffmpeg    + webhook
```

The contract that matters most is between **voice** and **assemble**:
the voice step emits per-section MP3s *plus* a JSON alignment payload
(character-level timestamps from ElevenLabs's `with-timestamps`
endpoint). The assemble step uses those timestamps to anchor every
visual reveal — which module box brightens, which code line gets the
cyan underline, when each takeaway card slides in — to the exact frame
where the narrator says the corresponding word.

The shape of the pipeline mostly fell out of the constraint that
*every stage has to be retryable*. We charge nothing at queue admission,
log richly at every transition, and treat every stage's failure as
"fall back to a degraded version, don't fail the job."

---

## Word-level visual sync

### The problem

Tying a visual reveal to a narration timestamp is easy if you trust
estimates. Claude writes the script and emits
`narration_start_seconds: 14.5` for each module. Schedule the reveal at
frame 14.5 × 30fps = frame 435. Done.

Except Claude's estimate is just that — an estimate. The TTS actually
takes 14.5s ± 3-5s depending on cadence, breath markers, acronym
preprocessing. Visual reveals scheduled against estimates drift, and
the drift is visible to the human eye starting around 800ms.

### What we do instead

We hit ElevenLabs's `with-timestamps` endpoint instead of the plain
TTS endpoint. It returns:

- the MP3 audio (base64 in the JSON response)
- per-character start/end times in milliseconds
- a `normalized_alignment` that accounts for our SSML `<break>` tags

For each architecture module / code highlight, we search the
alignment data for the moment its name (or a distinctive snippet) is
actually spoken. That timestamp becomes the visual reveal frame.

In `voice_generator.py`:

```python
def sync_visuals_to_alignment(script, audio_files):
    alignment = ...  # per-section
    for module in modules:
        for phrase in candidates(module):
            t = find_phrase_time(alignment, phrase)
            if t is not None and not collides_with_neighbour(t):
                module["narration_start_seconds"] = round(t, 2)
                anchored_modules.add(module.id)
                break
```

### The anchored-vs-fallback split

Not every module gets a clean alignment hit. Sometimes the narrator
refers to a module by paraphrase ("the entry point" instead of
"index.js"). For unanchored items we **interpolate** between
neighbouring anchored timings.

Then there's a layer of safety heuristics:

- **Gap-smoother** — if a fallback module sits inside an
  unreasonably wide gap, pull it toward the average slot
- **Tail-cluster redistribute** — if 3+ consecutive fallback modules
  cluster in <60% of avg-slot spacing, redistribute them
- **Ideal-blend** — fallback modules get blended 30% toward their
  ideal even-distribution position (decaying with index — later
  modules trust alignment more)

### The bug we kept hitting

For five versions in a row, the visual lagged the narration by
multiple seconds in the architecture scene. Eventually a user
watching a render said: *"narrator says apple-check and IP, but
the slide doesn't get to those modules until p-any."*

Root cause: **all three heuristics were running on anchored modules
too.** Ideal-blend was pulling alignment-anchored timings 30%
toward their "ideal" position. If alignment correctly placed a
module at 12s but the ideal position said 16s, the module would
visually reveal at 13.2s — 1.2s after the narrator said the name.
Compounded across six modules, the drift was 5+ seconds by scene's
end.

The fix in `voice_generator.py:sync_visuals_to_alignment`:

```python
# Gap-smoother — v8 fix: NEVER shift an anchored module.
for i in range(1, len(modules)):
    if (modules[i].get("id") or "") in anchored_modules:
        continue  # anchored = ground truth, hands off
    ...
```

Same gate on tail-cluster (skip the whole run if any member is
anchored) and on ideal-blend (skip anchored items entirely).

After the fix, a fresh render of is-online anchored 7/7 modules to
real alignment data. Zero post-processing shifts. The slide and the
spoken word now land on the same frame.

### Sync precision in numbers

For the v8 fix verification render:

- Composition duration: 186.04s (sum of section audio + buffers - crossfades)
- ffprobe of the resulting MP4: 186.04s
- Delta: 0.04s — well under the 100ms tolerance that's the human
  perception threshold

---

## Stop-slop: keeping AI narration out of the slop trap

### The failure mode

Ask Claude to narrate a codebase and you get this:

> Welcome to this in-depth exploration of the React reconciler. In
> this video, we'll delve into the fascinating world of fibers and
> the powerful reconciliation algorithm that enables seamless
> rendering. Let's dive in!

Every clause is AI bingo. The viewer bounces in 8 seconds.

### The three-layer defense

**Layer 1: the system prompt.** Specifically forbids the entire
banned-words list, gives concrete good vs. bad examples for every
section, and explicitly bans Wikipedia-style openers ("Often referred
to as", "Known for", "Renowned for").

**Layer 2: regex slop detection.** After Claude returns the script,
`_slop_score()` runs ~30 regex patterns over each section:

```python
_SLOP_PATTERNS = (
    re.compile(r"\bdelv(?:e|ing)\b", re.IGNORECASE),
    re.compile(r"\bleverag(?:e|es|ing|ed)\b", re.IGNORECASE),
    re.compile(r"\b(?:robust|seamless|comprehensive)\b", re.IGNORECASE),
    re.compile(r"(?:^|[.!?]\s+)Welcome to\b", re.IGNORECASE),
    re.compile(r"(?:^|[.!?]\s+)Let'?s (?:dive|jump|get) (?:in|into|started)\b", re.IGNORECASE),
    re.compile(r"(?:.*—.*){3,}", re.DOTALL),  # em-dash overload
    ...
)
```

The Wikipedia-opener patterns are anchored to start-of-narration so
we don't false-positive on "today" inside a sentence.

**Layer 3: bounded revision passes.** If layer 2 flags any sections,
we ask Claude to rewrite *just those sections* with the flagged
patterns inline in the prompt. Up to 3 passes. With a short-circuit:
if a pass doesn't reduce the slop count, we ship anyway — Claude
isn't improving, we'd just be burning tokens.

```python
last_count = 1 << 30
for attempt in range(1, 4):
    flagged = _flag_sloppy_sections(parsed)
    if not flagged:
        break
    if len(flagged) >= last_count:
        # not improving — ship
        break
    last_count = len(flagged)
    parsed = _revise(client, parsed, flagged)
```

### The other quality gates

Two more passes that run after slop detection:

- **`_enforce_specific_takeaways`** — the three summary cards have to
  contain a distinctive technical noun, not metadata. "Built in
  TypeScript" gets rejected; "Hooks are stored as a linked list on
  the fiber" passes.

- **`_enforce_code_narration_cohesion`** — every code highlight's
  `code` text must appear verbatim in the analyzer's top_files
  output. If Claude invented code that isn't in the repo, we override
  with the actual file content and ask Claude to rewrite the
  narration to match.

The whole revision system adds maybe one Sonnet call per generation
in the typical case. Cheap compared to a render that lands and the
viewer immediately closes the tab.

---

## Schema patches instead of Alembic

### The constraint

`Base.metadata.create_all` creates tables that don't exist. It never
ALTERs existing tables. Every time we added a column to a model
(intake_kind, quality_signals, summary_data, webhook_secret, etc.) the
column was silently absent in any DB that already had the table from
a previous version. Every `videos` list endpoint blew up with
`column videos.user_id does not exist`.

The standard fix is Alembic. For a solo-developer project with eight
column additions over three versions, Alembic is overkill —
init, autogenerate, env.py, migration files, an entire vocabulary of
operations. All to add eight columns.

### What we do

A list of `(table, column, ddl)` triples in `models/database.py`,
applied idempotently at boot:

```python
SCHEMA_PATCHES: list[tuple[str, str, str]] = [
    ("videos", "user_id",
     "ALTER TABLE videos ADD COLUMN user_id VARCHAR(36)"),
    ("videos", "intake_kind",
     "ALTER TABLE videos ADD COLUMN intake_kind VARCHAR(16) NOT NULL DEFAULT 'repo'"),
    ...
]

def _apply_schema_patches():
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, column, ddl in SCHEMA_PATCHES:
            existing = {c["name"] for c in inspector.get_columns(table)}
            if column in existing:
                continue
            logger.info("schema patch: %s.%s — applying", table, column)
            conn.execute(text(ddl))
```

`information_schema.columns` is the idempotency check. First boot
applies all patches; second boot logs nothing. Going forward: when
you add a column to a model, add a patch entry in the same commit.

The trade-off this trades away: complex migrations (changing column
types, foreign key reshapes, data backfills). When we hit one of
those, we'll bring in Alembic for that change specifically. Not
before.

---

## The intake URL classifier

A user can paste any of these:

- `https://github.com/owner/repo` — explain the whole repo
- `https://github.com/owner/repo/commit/abc123` — explain a specific commit
- `https://github.com/owner/repo/blob/main/src/app.ts` — explain a specific file
- `https://github.com/owner/repo/pull/42` — explain a PR (diff-focused)
- `https://gist.github.com/user/abc123` — explain a gist

The classifier (`utils/intake.py`) is **one pure-Python module** that
turns any of these into a structured `IntakeURL` dataclass with:

- `kind` — one of `"repo" | "commit" | "file" | "gist" | "pr"`
- `repo_url` — the normalized parent repo URL
- `owner`, `name` — repo identity
- kind-specific fields: `commit_sha`, `file_path`, `file_ref`,
  `gist_id`, `pr_number`

No network calls. Pure regex + urllib parsing. Garbage gets rejected
in the same HTTP request that submitted it — we never waste a Celery
slot on a malformed URL.

The script generator reads `intake_kind` and `intake_meta` and
prepends a **FOCUS block** to its prompt:

```python
if kind == "commit":
    return (
        "FOCUS: The user submitted a specific commit URL. Treat this "
        f"as a 'what changed and why' video about commit {sha[:7]}. "
        "Open with the problem the commit solves; spend the middle on "
        "the diff itself; close with what this unlocks. Use the "
        "broader repo context only to ground the change."
    )
```

For PR mode there's an extra step — `services/pr_analyzer.py` hits
the GitHub API for the PR shell + files + unified diff (trimmed to
60KB, cut at the last `@@` boundary so Claude never sees half a hunk).
That payload gets folded into the FOCUS block so the narration
genuinely walks the diff, not just the parent repo.

For compare mode (two repos), it's its own endpoint
(`POST /api/v1/generate/compare`) because the input shape is different.
The classifier runs on both URLs, both must be plain repos, and the
script generator gets a "side-by-side" FOCUS that explicitly forbids
narrating them as two back-to-back tours.

---

## Graceful degradation as a design principle

Every external dependency in the pipeline has a "what if this key is
missing" path. Not for theoretical robustness — because the project
needs to be runnable on a `git clone` with zero setup so contributors
can actually run it.

| Component | With | Without |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude writes the script | Deterministic mock script from analysis |
| `ELEVENLABS_API_KEY` | Voice + word-level alignment | Falls back to OpenAI TTS, then silent WAV |
| `OPENAI_API_KEY` | OpenAI TTS as fallback | Silent WAV stubs of the right duration |
| `GITHUB_TOKEN` | 5000 req/hr | 60 req/hr public limit |
| Remotion installed | Animated React scenes | ffmpeg slideshow of SVG + audio |
| `R2_*` set | CDN delivery from R2 | Local /media/videos serving |
| `SENTRY_DSN` | Backend + browser error tracking | Silent |
| `NEXT_PUBLIC_POSTHOG_KEY` | Product analytics (EU region) | Silent, honors Do Not Track |
| `RESEND_API_KEY` | Transactional emails | No emails sent |
| `STRIPE_*` | (removed in v8) | (removed in v8) |

The pattern in code:

```python
def _send_email(...):
    key = os.environ.get("RESEND_API_KEY")
    if not key:
        logger.info("email_dispatcher: no RESEND_API_KEY — skipping send")
        return EmailResult(sent=False, reason="no_api_key")
    ...
```

Logs the no-op at INFO so you can see what didn't run. Never
throws an exception that propagates to the caller. Every consumer of
these subsystems wraps in `try/except` and treats failure as
"continue without this feature."

---

## Remotion vs. ffmpeg

The video assembler tries Remotion first. If Remotion's CLI isn't
available (no node_modules, missing chromium, etc.), it falls back
to an ffmpeg slideshow.

The Remotion path:
1. Write `composition-props.json` with the script + per-section audio
   paths + the SVG diagram path
2. Spawn `npx remotion render src/index.ts PhantomVideo {output}.mp4 --props=...`
3. Remotion's React compositions read the props and render every frame

The ffmpeg fallback:
1. Generate a series of PNGs (one per scene)
2. ffmpeg concat with crossfade transitions
3. Mux against the audio

The Remotion path is dramatically better-looking but takes 6-12
minutes (CPU-bound on the worker, since we render at concurrency=4
inside the node process). The ffmpeg path is 30 seconds and looks
like a 2007 PowerPoint.

In practice we always use Remotion. The fallback exists to make
"I just `git clone`d this and node isn't installed" not throw.

### Why we don't render in cloud Remotion / Lambda

Their hosted offering is good. But it requires a Remotion Cloud
account, an API token, and another env var to misplace. The whole
philosophy of the project is "runs locally on docker-compose with
nothing else." Adding a cloud dependency for the render step
breaks that.

---

## Things that took longer than expected

Things that should have taken an hour and took a day. In rough order
of pain:

- **PostgreSQL enum value naming.** Python `VideoStatus.complete`
  serializes to `"complete"` (no -d). I wrote `Video.status ==
  "completed"` in the search router. `psycopg2.errors.InvalidTextRepresentation`.
  Fix: never use string literals for enum comparisons, always
  `VideoStatus.complete`.

- **Next.js dev server in Docker bind-mount on Windows.** chokidar
  doesn't surface inode-create events through the host bind mount.
  *Modifying* an existing file gets picked up; *creating a new
  file* does not. So newly created route files (`src/app/foo/page.tsx`)
  return 404 forever until you `docker restart phantom-frontend-1`.
  No code fix possible — it's a Next/chokidar/Docker-Desktop
  interaction. Documented in README + dev docs.

- **Celery worker queue subscription.** I added v7 priority queue
  routing (Pro/Team → `video.priority`, Free → `video.free`) via
  `task_routes` but never updated the worker command in docker-compose.
  The worker stayed on the default `celery` queue. *Every* generation
  submitted through the API after that commit silently sat in the
  Redis `video.free` list with no consumer. Took a verification pass
  to find. Fix:
  `celery worker ... -Q video.priority,video.free`

- **ElevenLabs language drift.** The `multilingual_v2` model would
  randomly swap a syllable for Spanish/French phonemes mid-sentence
  for English text. Three knobs to fix: switch to `eleven_turbo_v2_5`
  (English-only), set `style` low (0.15-0.18), pass `language_code:
  "en"` explicitly. All three matter; turbo alone doesn't fix it.

- **Range-aware MP4 serving.** FastAPI's default StaticFiles doesn't
  honor HTTP Range headers. Without them, `<video>` scrubbing breaks
  — the only thing that works is sequential playback. Browsers
  require 206 responses with `Content-Range` to enable timeline
  seeking. Hand-rolled the handler in `main.py`.

- **Frontend container `node_modules` named volume.** docker-compose
  has `/app/node_modules` as a named volume so the host folder
  doesn't shadow the in-container install. But when I added
  `next-auth` to `package.json` later, the volume already existed
  and the Dockerfile's `npm install` was skipped on the recreate.
  Every page using auth crashed with `Module not found`. Fix:
  manually `docker exec phantom-frontend-1 npm install`. Long-term
  fix: drop the named volume in dev.

---

## What I'd do differently

If I were starting over:

1. **Single source of truth for visual sync from day one.** Half the
   bugs above traced to "we anchored to alignment but then
   post-processed the timings." Make the anchored-timing rule
   inviolable from the start: anchored items are frozen; only
   fallbacks get touched.

2. **Don't skip migrations to save time.** The schema-patch loop
   works fine for column additions but the moment we want to change
   a type or backfill data we'll need Alembic. Should have introduced
   it the first time we added a non-trivial column.

3. **End-to-end test on every commit.** The pipeline is hard to unit
   test but a single integration test that renders is-online and
   ffprobes the result would have caught at least four of the bugs
   above. The verification pass had to be done by hand.

4. **Pick the curated showcase repos to match generated videos.**
   The 8 SHOWCASE_REPOS entries were aspirational — they reference
   MP4s that were never produced. Better: the showcase grid pulls
   from real completed videos in the database, no static fakes.

---

If you read all of this, you probably have your own opinions about
how it should work. Open an issue or send a PR — I'd rather hear that
than nothing.
