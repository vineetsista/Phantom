# docs/

Internal development notes. Kept around because they document the
project's history — what was tried, what was deferred, what was wrong.

You don't need to read any of this to run Phantom. See the [top-level
README](../README.md) instead.

## Layout

- **[`BUILDING.md`](BUILDING.md)** — technical deep-dive on how Phantom
  actually works. The interesting decisions (sync algorithm, slop
  detection, schema patches) explained at the level you'd want when
  reading a friend's project.
- **`screenshots/`** — frames extracted from a real generated video,
  used in the top-level README.
- **`RELEASE_NOTES*.md`** — per-version summary of what landed in each
  iteration (v7, v8 are the most recent).
- **`FOLLOWUP*.md`** — what was deferred from each version and why.
- **`BUGS_v8.md`** — bug-discovery report from the v8 verification pass.
- **`VERIFICATION_v8.md`** — what could and couldn't be verified during
  v8 without human eyes/ears.
- **`AUDIT.md`** — early-stage product audit.
- **`PHANTOM_STATUS_AND_STRATEGY.md`** — strategy doc from when Phantom
  was being framed as a SaaS. Kept as historical context.
- **`DEPLOY.md`** — production deployment notes from the SaaS era.
- **`LAUNCH_CHECKLIST.md`** — pre-launch QA sequence from the SaaS era.
- **`QUESTIONS_FOR_USER.md`** — open questions captured during agent
  runs.
- **`VOICE_AB_TEST.md`** — early A/B testing notes for ElevenLabs voice
  settings.
- **`marketing/`** — launch-era marketing artifacts (cold emails, dev.to
  draft, pitch deck, etc.) — preserved as portfolio of writing/strategy
  work even though Phantom is no longer being launched as a product.

If you want the most-current state of the codebase, read the source —
these docs lag behind the code.
