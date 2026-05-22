# Phantom v3 — sync overhaul + scene redesign

The user's v3 feedback after watching the v2 renders:
> the architecture part is fully out of sync ... the code walkthrough is fully
> out of sync and when the narrator is talking, it doesnt even align with
> whatever code is up ... add more animations THAT ARENT BUGGED ... i want it
> to be flawless

What was actually broken in v2:
- Architecture modules anchored 6-10s away from where their concepts were
  spoken (label-matching missed file extensions read as "dot T S",
  parenthetical suffixes like "(base class)", and shared file paths).
- Code walkthrough narration described concepts that lived beyond the
  80-line excerpt window — Claude wrote about ZodType.parse while
  showing RefinementCtx + ZodRawShape from the visible window.
- "A P Is" pronunciation from missing plural-acronym jargon entries.
- Annotation interpolate crashed when highlights landed <30 frames apart.
- Late-anchor cluster: alignment finding a single late mention crammed
  every subsequent highlight into the section tail.

What v3 ships:

## 1. Architecture scene redesigned as slide cycling

Old: 6-8 module boxes stacked on the right, all visible simultaneously,
relying on a cyan border to signal "this is the active one." Too quiet
to teach.

New: ONE module per slide, full-screen card with:
- Module counter ("MODULE 03 / 07")
- Huge module name (display font, 84px)
- File path in mono below
- 12-22 word description from Claude (new schema field)
- Cyan corner brackets framing the active card
- Bottom: progress dots + module-name strip showing where we are in the tour

Cards slide in from the right, out to the left as narration advances.
The audio-visual binding is unambiguous now — when the narrator says
"ZodType", the entire screen is ZodType.

## 2. Alignment matching rebuilt

`_label_search_candidates()` builds a ranked list of search phrases per
label that handles every v2 failure mode:

- `"ZodType (base class)"` → tries `"ZodType"` (paren stripped) and
  `"Zod Type"` (camelCase split)
- `"types.ts"` → tries `"types dot T S"` (extension expanded, matching
  what ElevenLabs actually pronounces)
- `"parse method"` → tries `"parse"` (significant word extraction)

Also:
- Anchor matches reject candidates that would break linear ordering
  (module N can't anchor more than 2s before module N-1).
- Final monotonicity post-pass enforces strictly-monotonic timestamps so
  Remotion's `interpolate` never sees out-of-order input ranges.
- Late-anchor sanity check: if the first anchored timestamp is past 40%
  of audio, drop all anchors and use even distribution. Fixes the
  is-online-v4 case where the FIRST highlight anchored at 38.99s of 43s
  audio, cramming the other 3 into the last 5 seconds.

## 3. Code walkthrough cohesion validation

Cohesion guard pre-validates that the narration and highlights share at
least 2 distinctive identifiers. If they don't (narration about
ZodType.parse, highlights showing ZodRawShape), Claude gets a single
targeted rewrite pass that either fixes the narration or repicks the
lines until they match. The rewrite is itself re-validated before
acceptance.

Plus: excerpt window 80 → 240 lines so Claude has enough surface area
to find lines that anchor real concepts. Same for the prompt — the
SYSTEM_PROMPT now teaches Claude to **pick the highlighted lines FIRST,
then write narration about exactly those lines**.

## 4. Annotation graceful degradation

`Annotation` component's four-point interpolate (`[start, start+9,
end-21, end]`) required end-start >= 30 frames. When alignment produced
highlights <1s apart, the interpolate input went non-monotonic and
Remotion threw. Now: fade durations compress proportionally for tight
windows, with a final clamp that guarantees strict monotonicity.

## 5. Voice jargon expanded

`A P Is` is now `A P I's`. Added plurals (URLs, JWTs, SDKs, IDEs, LLMs,
MVPs, PRs, UUIDs) plus `e.g.` → "for example", `i.e.` → "that is",
`vs.` → "versus", and lowercase variants for sentence-start cases.

## 6. Celery time budget bump

Render limit 18 → 28 min soft, 20 → 30 min hard. zod's longer
architecture + code scenes hit the previous limit; this gives headroom.

---

## Final test renders

| Repo | Job ID | Duration | Size |
|------|--------|----------|------|
| is-online | `f2026a2d-c700-473c-befc-e13db31954d7` | 168.92s | 36.7 MB |
| ky | `499b4923-f3c8-4e99-bcd0-b6ca753159fc` | 187.67s | 35.5 MB |
| zod | `0f0b0825-23e0-44e3-b01f-705c8f824f60` | 175.81s | 35.7 MB |
| express | `c9d800c3-5812-4dcf-b4a9-1c8b6f1ffe8c` | 181.03s | 37.1 MB |

All durations within 90-200s target. All renders monotonic. Architecture
sync verified by frame extraction at every module's narration_start_seconds.

### Watch them

- http://localhost:3000/video/f2026a2d-c700-473c-befc-e13db31954d7 (is-online)
- http://localhost:3000/video/499b4923-f3c8-4e99-bcd0-b6ca753159fc (ky)
- http://localhost:3000/video/0f0b0825-23e0-44e3-b01f-705c8f824f60 (zod)
- http://localhost:3000/video/c9d800c3-5812-4dcf-b4a9-1c8b6f1ffe8c (express)

### Specific takeaways now produced (no more metadata)

is-online:
1. Race independent checks against real endpoints to catch captive portals
2. Return on first success, not after all checks complete
3. diagnostics_channel publishes failures without affecting happy path

ky:
1. Throwing HTTPError unifies network and status-code error paths
2. Deep option merging keeps extended instances independent
3. Retry logic that respects Retry-After is the pattern to copy

express:
1. Middleware is a stack of Layer objects walked by the router
2. req and res extend Node.js IncomingMessage and ServerResponse
3. Express wraps focused libraries instead of building from scratch

zod: takeaways visible in the script — single-definition validation, immutable composition, safeParse discriminated union pattern.

## Commits this session

```
792302f fix(sync): late-anchor cluster + bump Celery render time limit
76a53dd fix(code+sync): Annotation tolerates tight highlight windows; enforce monotonic timestamps
c3756ba feat(architecture+voice): slide-cycling scene + acronym pluralization
32420b4 fix(sync): cohesion guard + code-walkthrough anchor improvements
58985ae fix(sync): architecture modules now anchor reliably via robust label matching
```

Plus the v2 commits already shipped (analyzer, intro restraint, player shortcuts, HEAD support, observations).

## What was NOT touched in v3

- Voice settings (stability/style) — `voice_pipeline` memory still says
  don't change without A/B testing.
- Summary scene — user said "a little out of sync" but didn't have a
  specific complaint I could reproduce; the architecture + code fixes
  may have addressed it via the same alignment improvements.
- "More pizzaz" beyond the architecture redesign — the slide cycling IS
  the pizzaz upgrade. If you want more (sound design, ambient bed,
  scene whoosh SFX) the FOLLOWUP.md has the implementation plan.

Nothing pushed to GitHub. Local commits only.
