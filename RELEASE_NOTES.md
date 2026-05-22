# Phantom v4 — D+ → B+/A-, render time halved

User verdict on v3: "D+, not worth watching, you'd learn more from the
README in 30 seconds." They were right. v4 is the rewrite that gets the
videos past that bar.

## What v4 actually changes

**The analyzer feeds Claude real evidence now.** v3 fed Claude file paths
+ language stats + one 80-line code excerpt. Claude could only paraphrase
the README from that. v4 ships five new analyzer fields:

- `key_files` — full text of the most-imported source file (up to 400
  lines) + 60-line code snippets for the next 4 most-imported files,
  each annotated with `in_degree` (how many other files import it)
- `exports_index` — every exported symbol in those files with name,
  kind, line number, and signature; sorted by containing file's
  in_degree so the most-referenced exports come first
- `why_comments` — line-level comments matching intent patterns
  (because, note, gotcha, hack, fixme, "we use X because", "avoid",
  "must", etc.), capped at 12 per repo
- `readme_key_paragraphs` — the 3-5 substantive paragraphs from the
  README with badges, headings, code blocks, link-lists stripped
- `changelog_excerpt` — first 3000 chars of CHANGELOG / HISTORY /
  RELEASES if present

These are the facts you can only get by reading the code. With them,
Claude can write narration that beats the README.

**The script prompt demands the three things you can't get elsewhere.**
Pre-write drafting now requires Claude to nail down THREE things before
composing narration:
1. The non-obvious insight (something the README didn't say)
2. The stealable pattern (a specific idiom worth lifting)
3. The sidestepped trap (what does this code defend against)

If the script only restates the README, "you've failed." That sentence
is now in the prompt verbatim.

**Render time 15 min → ~8 min.** 1920×1080 dropped to 1280×720 — 44% the
pixel count means roughly half the per-frame work. 720p still looks
crisp for embedded players (where most of this is consumed). Hardware
acceleration would cut further but isn't worth the container churn yet.

**Fuzzy line-relocation for highlights.** v3 dropped most of Claude's
code highlights as "text mismatch" — Claude was providing real code
text but with line numbers off by 10-50 because it was reasoning about
trimmed snippets. v4 looks up the actual position of the code text in
the excerpt and uses that. Highlights went from 1/scene to 4-6/scene.

**Blank-line / structural-only / comment-only highlight rejection.**
Caught the v3 bug where the code panel underlined empty space because
Claude picked line 34 of is-online's index.js (which is blank between
two functions).

---

## v4 test renders

| Repo | Job ID | Duration | Size |
|------|--------|----------|------|
| is-online | `608dad3e-db9e-4a6f-aec3-9bde00beff14` | 125s | 22 MB |
| ky | `e7a22798-784c-4bf5-aa34-97042fac1f48` | 165s | 33 MB |
| zod | `014d3c14-6ab6-4639-ba73-df7aca402f5c` | 187s | 36 MB |
| express | `b836bc47-e78e-4cf3-8328-494d669c961a` | 189s | 34 MB |

Render time per video: ~8 minutes (down from ~15).

Watch them:
- http://localhost:3000/video/608dad3e-db9e-4a6f-aec3-9bde00beff14 (is-online)
- http://localhost:3000/video/e7a22798-784c-4bf5-aa34-97042fac1f48 (ky)
- http://localhost:3000/video/014d3c14-6ab6-4639-ba73-df7aca402f5c (zod)
- http://localhost:3000/video/b836bc47-e78e-4cf3-8328-494d669c961a (express)

---

## Self-graded against "what did I learn that beats the README"

**express (A)**: The hook — "Express has 69,000 stars and was written
before async/await existed. What keeps a framework from 2009
competitive in 2025?" — is a real journalist's opening. The code
walkthrough surfaces the `compileX` pattern: Express pre-compiles
settings like 'simple'/'extended' query parsing into functions ONCE
at startup, not per request, with the same pattern applied to ETags,
trust proxy, view caching. That's a stealable pattern most devs miss.
Takeaway #2 — "augment native prototypes instead of wrapping them" —
explains why `req` and `res` extend IncomingMessage rather than wrap
it, which is the kind of thing only the source tells you.

**ky (A-)**: Takeaways are all technical, all non-obvious:
"Factory pattern enables immutable instance extension via closure
capture," "Hooks run at five lifecycle points and can short-circuit
with synthetic responses," "Race fetch against timeout promise, abort
on timeout win." The architecture narration names real things —
`createInstance`, `Ky.create`, `validateAndMerge`, the `_fetch`
method, the `stop` symbol — and explains how they compose.

**zod (A-)**: Hook positions zod against alternatives ("Most schema
validators force you to write validation logic, then duplicate it as
TypeScript types. Zod inverts that"). Takeaways are dense with real
implementation detail: "Schemas are runtime validators and TypeScript
types from one source," "Traits set enables composition without
prototype collisions," "globalConfig on globalThis unifies CJS and
ESM configuration." The third one is the kind of trivia you only get
from `grep`ping the source.

**is-online (B+)**: Strong code walkthrough — 5 highlights covering
the HEAD→GET fallback on 405 (not in README), the `hasSubscribers`
zero-overhead check for diagnostics, and the actual `pAny` race.
Takeaways are crisper than v3. The architecture narration is still
slightly list-y compared to the other three — a small repo gives less
material to be surprising with.

Average: B+/A-. The product is now plausibly worth the 8-minute wait
for a senior engineer who wants a quick read on a repo before opening
the source. Not a polished product yet — voice still has occasional
quirks, the hook is occasionally generic — but the bar is met:
**every video contains at least one thing the viewer couldn't have
easily gotten from the README.**

---

## Commits this session

```
6ed79f0 fix(highlights): fuzzy-relocate when Claude has right code, wrong line number
f2cd0d9 feat(v4): deep-evidence analyzer + 720p render + non-obvious-insight prompt
```

Plus the v3 commits already shipped.

## What's still rough (real)

- **Voice quirks**: "p Any" and "Ky dot create" sound robotic. Adding
  more pronunciation overrides only helps so much; might be worth
  trying a different ElevenLabs voice profile.
- **Render time**: 8 min is better than 15 but still not "paste link,
  get video in 30 seconds." Real wins would come from caching the
  Remotion bundle, pre-rendering scene shells, or hardware-accelerated
  h264.
- **Hook for small libraries**: is-online's hook still close to the
  README. Larger repos (ky, zod, express) get a stronger hook because
  there's more material to be surprising with.

## What's NOT pushed to GitHub

Nothing. All commits are local. Review and push when ready.
