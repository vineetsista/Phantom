# Phantom — Status Audit & Multi-Product Strategy

**Date**: 2026-05-22
**Audited against**: HEAD = `9113739` (v5c release notes)
**Scope**: honest read of what exists, what's missing, and what the path to a multi-product company looks like. Surfaces options. Does not decide.

---

## PART 1 — Product inventory

### Product (RepoX)

| Capability | Status | Evidence |
|---|---|---|
| Repo cloning + monorepo detection | ✅ | `backend/services/repo_analyzer.py` — `detect_monorepo_layout()` handles pnpm / workspaces / lerna / turbo / nx / convention; zod render's primary_package = `packages/zod`. |
| Source filtering + smart walkthrough selection | ✅ | `is_source_directory()`, `select_walkthrough_file()`, `_order_top_files()`. Tests + examples are excluded. |
| Deep evidence extraction (v4) | ✅ | `key_files`, `exports_index`, `why_comments`, `readme_key_paragraphs`, `changelog_excerpt`, `interesting_observations`, `personality_traits` all in `AnalysisResult.to_dict()`. |
| Script generation (Claude Sonnet 4.5) | ✅ | `script_generator.py` — multi-pass: stop-slop, takeaway specificity, cohesion validation, hook scrub, spoken-word polish. |
| Voice synthesis (ElevenLabs + OpenAI + silent fallback) | ✅ | `voice_generator.py` with retry, alignment timestamps, jargon expansion. Brian voice locked, language_code=en. |
| Alignment-based sync (tail-cluster, gap-smoother, ideal-blend, monotonicity) | ⚠️ | v5c brought it from C → A-. Still imperfect — user reports end of architecture scene drifts. Sync is now driven by 5 cascading heuristics, which is fragile. |
| Remotion video rendering | ✅ | 4 scenes (Intro / Architecture / Code / Outro) at 720p, ~8min per video. |
| ffmpeg static-cover fallback | ✅ | Triggers when Remotion fails or times out. |
| Video player (scrubber, chapters, keyboard shortcuts, PiP, fullscreen) | ✅ | `VideoPlayer.tsx` — premium-tier per the AUDIT.md grade. |
| ShareModal with live OG preview | ✅ | Per AUDIT.md row 41 — already strong. |
| EmbedModal | ⚠️ | Emits URL with `theme/controls/autoplay/loop` query params; the embed page ignores all of them. (FOLLOWUP.md) |
| OG card generation (dynamic) | ✅ | `/api/og` route exists. |
| OG card per-video (server-rendered for Twitter/LI unfurlers) | ❌ | FOLLOWUP.md — Twitter doesn't execute JS so the React preview doesn't unfurl. Needs `/api/og/[id]` PNG endpoint. |
| Pipeline status updates (live feed) | ⚠️ | Frontend polls `/status/{id}` every 1.5s — works. But per AUDIT.md row 15, the LiveFeed renders scripted strings, not actual worker events. Status `details.stage` reads "Queued" even mid-render. |
| Architecture scene (slide-cycling) | ✅ | One-module-at-a-time cards with descriptions, progress dots, file paths. Layouts now viewport-relative (v5c). |
| Code walkthrough scene | ⚠️ | Highlights line up with narration, fuzzy-relocate, annotation cards. **User-reported defect**: annotation card overlaps code on the left edge at 720p — needs to move right or shrink. |
| Outro scene (why-it-matters + takeaway cards + brand finale) | ✅ | Works. |
| Voice naturalness | ⚠️ | "HT...long pause...TP" reported for HTTP. File-extension robotics fixed in v5c but acronym mid-word pauses still happen. User wants Antoni voice tested. |

### Marketing site

| Page | Status | Evidence |
|---|---|---|
| Landing (Hero, RepoLogoStrip, WatchItWork, HowItWorks, WhatYouGet, BuiltFor, Pricing, SocialProof, FAQ, FinalCTA) | ✅ | All 10 sections compose in `app/page.tsx`. |
| Showcase grid | ⚠️ | Page renders, but per AUDIT.md the actual MP4s at `/public/showcase/{slug}.mp4` may not exist on disk. Showcase metadata claims 228k stars for React etc. — needs the files to be generated and dropped in. |
| Showcase per-repo detail page | ✅ | `/showcase/[slug]/page.tsx` exists with VideoObject + Breadcrumb schema. |
| Use cases | ✅ | `/use-cases/page.tsx` exists. |
| Status page | ⚠️ | `/status/page.tsx` exists. Per LAUNCH_CHECKLIST it's a manual "All systems operational" stub — no real health-check integration. |
| About | ⚠️ | Exists. Mentions "first product is RepoX. More products are coming." but does not name or describe Phantom Protocol. No company-level explanation. |
| Privacy | ⚠️ | `/privacy/page.tsx` exists. Content not audited — likely a placeholder. |
| Terms of service | ❌ | No `/terms` route. |
| 404 | ✅ | Per AUDIT.md row 39 — A-tier, on-brand, the `phantom analyze --path /` parody. |
| Admin analytics page | ⚠️ | `/admin/analytics/page.tsx` exists. Likely password-protected per LAUNCH_CHECKLIST but unverified. |
| Newsletter signup | ❌ | FOLLOWUP.md. Footer has no email field. |
| Blog | ❌ | FOLLOWUP.md. |
| API docs page | ❌ | FOLLOWUP.md (`/docs/api`). |
| Pricing accuracy | ⚠️ | Hobby/Pro/Studio at $0/$19/$49. Per AUDIT.md row 14, no Enterprise anchor tier. Per FOLLOWUP.md, pricing tier audit deferred — user must confirm what's actually deliverable. |
| Social proof | ⚠️ | Per AUDIT.md row 1: fabricated testimonials (8 named people who don't exist). Listed as Critical severity. Status: may have been touched in subsequent commits but no specific commit message indicates a rewrite. **Needs confirmation.** |

### Infrastructure

| Component | Status | Evidence |
|---|---|---|
| Database schema | ⚠️ | Only one table: `videos` (`backend/models/video.py`). No `users`, `subscriptions`, `api_keys`, `organizations`. |
| Authentication | ❌ | No auth routes, no auth middleware, no user model. The product is single-tenant by absence-of-design. |
| Payment integration | ❌ | Stripe not installed (not in `frontend/package.json` or any backend service). Pricing page is decoration. |
| Email service | ❌ | No SendGrid / Resend / Postmark / SES. `hello@phantom.video` referenced in copy but not wired. |
| Rate limiting | ❌ | `/api/v1/generate` accepts unlimited POSTs. No `slowapi` or similar. |
| Error monitoring | ❌ | No Sentry / Rollbar. LAUNCH_CHECKLIST tracks it as TODO. |
| Analytics | ⚠️ | `frontend/src/lib/analytics.ts` exists (events defined). PostHog / Plausible snippet not confirmed installed in `layout.tsx`. |
| Backups | ❌ | Postgres is on Docker locally; production not deployed yet so no backups exist. |
| HTTP Range support | ✅ | `backend/main.py` — verified 206 Partial Content. |
| OG card route | ✅ | `/api/og` with `@vercel/og`. |

### Deployment

| Item | Status | Evidence |
|---|---|---|
| Production deploy | ❌ | DEPLOY.md is a guide ("90 minutes from clone to prod") but has not been executed. Everything runs on localhost. |
| Domain registered | ❌ (unconfirmed) | README + about page reference `phantom.video`. No evidence of registration. Need to check via WHOIS — out of audit scope. |
| DNS / SSL | ❌ | Depends on registration. |
| Vercel project | ❌ | Not connected. |
| Railway services (API + worker) | ❌ | Not deployed. |
| Supabase Postgres | ❌ | Not provisioned. |
| Upstash Redis | ❌ | Not provisioned. |
| Cloudflare R2 | ❌ | Backend writes to local filesystem — `/app/output/videos`. DEPLOY.md notes the R2 swap as a small change still to be made. |

---

## PART 2 — Gap analysis (what's missing for public launch of RepoX)

Items not already tracked in FOLLOWUP.md. Grouped by priority.

### LAUNCH BLOCKERS (must fix before public)

1. **No production deployment.** Everything runs on localhost. RepoX is unlaunchable until DEPLOY.md is actually executed — domain + Vercel + Railway + Supabase + Upstash + R2.
2. **No auth + no rate limiting.** A public `/api/v1/generate` is a $$$ DoS attack waiting to happen — every POST burns Claude + ElevenLabs credit. Need at minimum: per-IP rate limit + Cloudflare Turnstile or hCaptcha on the public form.
3. **No payment** despite the pricing page. The Pro/Studio tiers are aspirational. Either remove the tiers (Free only at launch) or wire Stripe + entitlement gates.
4. **Showcase assets may be absent.** AUDIT.md row 9 flags `/public/showcase/*.mp4` as a possibly-broken promise. Either verify they exist or rewrite the kicker copy.
5. **Fabricated testimonials still possibly present** (AUDIT.md row 1, Critical). Needs confirmation that `SocialProof` was rewritten. If not — replace with real GitHub star counts or honest "Day-1 beta" frame.
6. **Render cost per video is not metered.** Per DEPLOY.md, ~$0.18 per render. At 100 free users × 10 videos = $180 of API spend with zero revenue. Need either: low free-tier cap (3 videos/account) or anonymous-no-account = 1 render then signup gate.
7. **OG unfurl on Twitter / LinkedIn** doesn't work (FOLLOWUP.md) — kills shared-link viral mechanics. Server-rendered `/api/og/[id]` PNG needed.
8. **Error monitoring**. First production bug will be invisible without Sentry or equivalent.

### IMPORTANT BUT NOT BLOCKING

- Render time is 8 min. Acceptable for early adopters; will feel slow at scale. Caching the Remotion bundle + GPU h264 would help.
- No "regenerate" button beyond what `EmbedModal` query params suggest.
- Annotation card overlaps code at 720p (user-reported in this session).
- Voice acronym mid-word pauses ("HT...TP").
- LiveFeed strings aren't real worker events (AUDIT.md row 15).
- Status page is manual, not real.
- Privacy page content not verified.

### POST-LAUNCH

- All FOLLOWUP.md items.
- Blog, newsletter, API docs.
- Loading skeletons, empty states.
- Mobile 375px polish.
- Cross-browser sweep.
- Lighthouse hard pass.

### PROBABLY SCOPE CREEP

- 4-product feature additions before validating the 1st product has any users.
- Light-mode theme.
- Inline regeneration controls.
- Video chapter editor.
- Comparison mode.

---

## PART 3 — Phantom as a multi-product company

### a. Brand architecture

| Question | Current state |
|---|---|
| Is "Phantom" the company brand throughout? | **Mostly yes.** `layout.tsx` metadata, JSON-LD Organization, Footer, About all use "Phantom" as the parent. Logo says Phantom. Page title: "Phantom — Any codebase. Explained in minutes." |
| Is RepoX clearly a product *of* Phantom? | **Partially.** Footer says "RepoX is the first product — more coming." About says "The first product is RepoX." Navbar CTA says "Try RepoX." But the homepage hero is all RepoX content — there's no Phantom-as-company landing distinct from RepoX-the-product. |
| Does the URL structure leave room for `/repox/`, `/protocol/`? | **No.** RepoX functionality lives at the root: `/generate`, `/showcase`, `/use-cases`, `/video/[id]`. Adding Phantom Protocol would either compete with RepoX at the root or require a refactor to namespace RepoX under `/repox/*`. |
| Does the brand identity work for both video-gen AND developer infra? | **Mostly yes.** The palette (void / electric / plasma / ember), the Clash Display + Satoshi + JetBrains Mono type system, and the "make opaque systems legible" subtext all carry to a dev-infra product. The 3D R3F torus-knot Hero is RepoX-specific decoration but easily swappable. The kicker fonts and dark aesthetic feel like an infra brand. |
| Is anything actively *locked* to RepoX? | The hero copy. The bento previews. The pricing tiers. The showcase. The terminal-feed motif on the generate page. All of this would need a sibling experience for Protocol — not a refactor of existing stuff, but parallel construction. |

**Net read**: brand is closer to "multi-product ready" than to "RepoX masquerading as Phantom" — but the gap is real. The homepage is currently RepoX's landing page, not Phantom's.

### b. Narrative coherence

- **Multi-product vision in the codebase**: minimal. Two strings ("RepoX is the first product — more coming" in Footer; "The first product is RepoX. More products are coming." in About). Nothing else hints at a second product.
- **About page**: explains what RepoX does. Doesn't explain Phantom as a company, what binds the products, or what's next.
- **Messaging**: "first product from Phantom" is the strongest hint, and it appears in the Intro scene kicker ("PHANTOM · REPOX"). README has "The flagship product is RepoX. More products coming." That's the most explicit it gets.

**There is no public mention of Phantom Protocol anywhere.** Which is correct — it doesn't exist yet. But there's also no waitlist, no "what's next," no thesis statement that ties future products together.

### c. Technical readiness

| Concern | State |
|---|---|
| Code structure for multi-product | **Not built that way.** Top-level is `/backend/`, `/frontend/`, `/marketing/`. Not `/apps/repox/`, `/apps/protocol/`. Adding a second product would either co-locate it inside `/backend/` and `/frontend/` (messy) or require restructuring. |
| Shared concerns separated from product-specific code | **Partially.** Design system (Tailwind + global CSS) is shared. Layout (Navbar / Footer) is shared. But all routes (`/generate`, `/showcase`, `/video/[id]`) live at the root. There's no clear "shared infrastructure / RepoX-specific" split. |
| Database supports multi-product users | **No.** Schema is `videos` only. No users, no organizations, no product entitlements. A user buying RepoX Pro + Protocol Pro can't be represented today. |
| Shared auth | **N/A — there's no auth yet.** When auth is added, this is the moment to decide: single Phantom account → both products, or separate accounts per product. The first is industry-standard (Vercel, Linear, Stripe, GitHub) and almost certainly the right call. |
| Shared billing | **N/A — there's no billing yet.** Same consideration. |
| Shared brand assets | **Yes.** Fonts, palette, logo, JsonLd Organization schema. Easy to extend. |

**Net read on technical readiness**: it'd take ~1 week of focused refactor to make the codebase multi-product-shaped *before* shipping Phantom Protocol. Doing it later is harder than doing it now. Doing it now is also possibly premature optimization.

---

## PART 4 — Phantom Protocol strategic thinking

User brief: open-source observability + provenance for AI agents. Cryptographic proof chains for what agents did and why. Think Git for AI agent behavior.

### a. Positioning

**Existing competitors (as of 2026)**:
- **LangSmith** (LangChain's hosted offering). Tracing + eval + datasets. Owns the LangChain audience. Not open-source.
- **Helicone**. Logging + caching + cost tracking for LLM calls. Open-source proxy + paid hosted. Strong with the OpenAI-first / proxy-tolerant crowd.
- **Arize Phoenix** (note: same word — branding conflict to flag). Open-source LLM observability with traces + evaluations. Probably the closest existing comparable.
- **Langfuse**. Open-source tracing + prompt management. Solid product, growing fast.
- **Braintrust**. Eval-first, dataset-focused. Less of an observability tool.
- **W&B Weave**. Trace-focused. From the Weights & Biases ML side.
- **OpenTelemetry for AI** (semantic conventions for GenAI). Emerging standard. Phantom Protocol could either embrace it (be a backend for OTEL-GenAI) or compete with it (be the canonical implementation).

**Phantom Protocol's possible wedge**: cryptographic provenance — proof chains for agent decisions. *Why* the agent did what it did, signed and verifiable. This is genuinely differentiated. None of the above produce signed proof artifacts.

**Honest pressure-test**:
- "Cryptographic proof chains" sounds like real differentiation OR like marketing copy depending on what's actually under the hood. If it's "we log the agent's reasoning + hash it + sign with a key" — that's a feature, not a thesis. If it's "agent actions produce a Merkle-tree of typed events with content-addressed lookups and verifier libraries" — that's a thesis. Which one Phantom Protocol becomes is the key product decision.
- **Question to answer before building**: who *needs* cryptographic provenance? Compliance-heavy industries (healthcare, finance, government). Agents-doing-money-moves use cases. Multi-agent systems where one agent reads another's output. Self-driving / robotics where post-hoc audit matters legally. If none of these are the target audience, "cryptographic" is decoration.

**Brand collision risk to flag**: Arize **Phoenix**. Plus "Phantom Protocol" itself sounds close to "Anthropic Protocol" and there's a thing called Model Context Protocol (MCP). Search "phantom protocol" today — what comes up? Worth checking before committing the name.

### b. Minimum viable first release (v0.1)

Three serious options to choose from:

**Option A — Spec doc only**.
- Publish `phantom-protocol.org` with a formal spec: event schema, signing format, retrieval protocol.
- Reference implementation TBD.
- Goal: start the conversation, get feedback, attract contributors.
- Pro: 1-2 weeks of writing. No code maintenance burden.
- Con: spec without implementation is a graveyard. Most specs that aren't backed by working code die.

**Option B — One SDK + one integration**.
- Python SDK (because LangChain + most AI tooling is Python-first).
- One integration: Anthropic API (Phantom already uses it for RepoX, so dogfooding works). Wraps `Anthropic.messages.create` and emits provenance events to a configurable backend.
- Backend can be local SQLite for v0.1.
- Goal: someone can `pip install phantom-protocol` and `with phantom.trace(): claude.messages.create(...)` and get signed traces.
- Pro: real, demoable, shippable.
- Con: 3-4 weeks of focused work.

**Option C — Protocol + hosted dashboard**.
- SDK + a Vercel-hosted dashboard that reads traces and shows them.
- Goal: full product on launch.
- Pro: closes the loop, monetization-ready.
- Con: 6-8 weeks. Probably too much for a side product launch.

**Recommended option for review (user decides)**: **Option B** — SDK + Anthropic integration + local backend. Spec doc emerges from the implementation. Hosted dashboard comes after validation.

**README test for v0.1**: would a curious dev clone the repo, run `pip install phantom-protocol`, run the example, and tweet about it? If yes — ship. If no — the surface is too small.

**Integrations that matter for v0.1**:
1. Anthropic Python SDK
2. OpenAI Python SDK
3. (Probably) LangChain
4. (Eventually) MCP

OTEL-GenAI: emit OTEL-compatible spans in addition to the native Phantom format. Free distribution channel.

### c. Monetization path

Open-source core + paid hosted dashboard is the standard playbook. Examples: PostHog, Supabase, Plausible, Hashicorp.

**Mapping cleanly to Phantom Protocol**:
- **Free OSS**: SDK, local file backend, basic Web UI for local viewing.
- **Hosted paid**: cloud backend, multi-user access, retention, alerts, dashboards, team collaboration.
- **Enterprise**: SAML / SSO, on-prem, audit logs of the audit log (recursive provenance for compliance), white-label.

**"I need the hosted version" threshold**: when local SQLite or a self-hosted Postgres becomes annoying. Usually around 100k traces or 5+ team members. Match that to a free hosted tier that lures people in, then upgrade.

**$500-5K/month enterprise features (the user's stated target)**:
- SAML / SSO
- SOC 2 / ISO 27001 attestations
- Dedicated tenancy
- Hosted on AWS/GCP in customer's preferred region
- SLA + support contract
- The cryptographic provenance angle is itself an enterprise differentiator — if it's real, this is what regulated industries pay for.

### d. Launch strategy

Three coherent stances to choose from:

**Stance 1 — Sequential**: ship RepoX, get to 100+ real users, learn, *then* announce Phantom Protocol with RepoX's audience as the early adopters.
- Pro: focused. One product crisis at a time.
- Con: RepoX users are "engineers who want video walkthroughs of code." Protocol users are "engineers building AI agents." Overlap is real but not total.

**Stance 2 — Simultaneous announcement**: launch RepoX publicly *with* a Phantom Protocol waitlist on the same landing. Both share the "Phantom: makes opaque systems legible" thesis.
- Pro: positions Phantom as a multi-product company from day one. Tells better narrative.
- Con: dilutes RepoX's launch news. "Two products from a side project" can feel unfocused.

**Stance 3 — Protocol first**: skip RepoX launch, build Phantom Protocol, launch that as the company's first public product because the audience is bigger (every AI agent dev) and the moat is harder (open-source ecosystem position).
- Pro: bigger market, stronger long-term position.
- Con: throws away ~6 months of RepoX work and the polish it took to get here.

**Recommended stance for review (user decides)**: **Stance 1 with a teaser**. Ship RepoX. Add a single line to the homepage / about: "Phantom Protocol — observability for AI agents — coming Q3." Capture waitlist emails. This lets you concentrate launch heat on RepoX while seeding the Protocol audience.

**Audience overlap question**: RepoX users are "engineers who use AI tools." Protocol users are "engineers who *build* agentic systems." A subset of RepoX users will be in the Protocol audience. Probably 20-40% overlap.

---

## PART 5 — Company-level things that don't exist yet

| Area | State | Implication |
|---|---|---|
| **Business entity** | Unknown. No mention in repo. | Need to decide: LLC (simplest), C-corp (if planning fundraising), sole-proprietor (cheapest, but risky if revenue scales). Wyoming / Delaware are common for tech. ~$200-1500 to file depending on state. |
| **Terms of service** | ❌ no `/terms` route | Required before taking payment. Most YC startups use a template (e.g. Stripe Atlas's ToS template). |
| **Privacy policy** | ⚠️ `/privacy` route exists, content unverified | Required if you collect any user data (including emails). GDPR / CCPA matter once you have users in EU / California. |
| **Business bank account** | Unknown | Required for revenue. Mercury and Brex are the standard "startup banking" options. Free, online. |
| **Accounting** | None | Trivial in year 1 (spreadsheet). Pilot or Bench when revenue exceeds ~$5k/mo. |
| **Expense tracking** | None | Same — spreadsheet or a free tool. Becomes real at tax time. |
| **Production hosting plan** | Documented (DEPLOY.md) but not executed | Vercel + Railway + Supabase + Upstash + R2 stack ready to go. Cost estimate from DEPLOY: ~$45/mo at 1k videos. Reasonable. |
| **Domain registration** | Unknown (likely not yet) | `phantom.video` is the README + about reference. Worth checking availability (was claimed by audit, never confirmed). Backup names per DEPLOY.md: `usephantom.com`, `phantomcode.io`, `repophantom.com`. **Branding decision needed before any public launch.** |
| **Content strategy** | None active | `dev-to-article.md` drafted but not published. No blog, no newsletter, no Twitter posts, no demo videos posted publicly. Twitter handle `@usephantom` referenced — unconfirmed if it's been claimed. |
| **Community** | None | No Discord, no GitHub Discussions enabled, no community hub. Standard playbook is Discord or Slack for early users. For Phantom Protocol specifically: GitHub Discussions is the right home (where open-source devs are). |
| **Metrics / OKRs** | Implicit only | LAUNCH_CHECKLIST mentions targets (1,000 generations in month 1, 30% return rate, 1-3% Pro conversion) — solid. No tracking system to measure them yet. |
| **Internship conflict (JPMC SEP, starts June)** | **Not addressed in repo.** | This is the single biggest blind spot. Most BB / IB / quant firms have strict IP + outside-activity policies. Phantom may technically belong to JPMC if work happens on JPMC time / hardware, or if the IP clause sweeps "anything related to financial services / data analytics." Phantom Protocol's pitch ("audit trail for AI agents") is uncomfortably close to fintech / compliance — high audit risk. **User should read the offer letter and the firm's outside-activity policy before any public launch.** Some firms require pre-clearance via Compliance for any side project that generates revenue. This is not something to discover in August. |

---

## PART 6 — Prioritized next 30 days

Realistic for one person on limited daily time. Sequenced so each step unblocks the next. Effort: XS (<1h), S (1-3h), M (half-day), L (full day), XL (multi-day).

### Week 1 — RepoX final polish (no product expansion)

| # | Item | Effort | Why |
|---|---|---|---|
| 1 | Fix the annotation-card-overlapping-code bug (user-reported today) | S | Most-visible defect. Easy CSS fix. |
| 2 | Fix architecture sync drift toward end of scene (user-reported today) | M | The cascading-heuristic sync system is fragile. Investigation needed. |
| 3 | Try Antoni voice (and Rachel, Adam) via `backend/scripts/voice_ab.py`. Pick the best. | M | User has explicitly called this out twice. |
| 4 | Fix acronym mid-word pauses ("HT...TP", "p Any") | S | SSML break tags inside acronyms in `voice_generator.py`. |
| 5 | Confirm fabricated testimonials removed (AUDIT.md row 1) | S | Critical-severity legal/trust risk if still there. |

### Week 2 — Pre-launch infrastructure

| # | Item | Effort | Why |
|---|---|---|---|
| 6 | **Read the JPMC offer letter + firm outside-activity policy.** | XS | If this blocks launch, everything below is moot. Do this Monday morning. |
| 7 | Pick + register a domain (`phantom.video` if available; backups in DEPLOY.md) | S | Unblocks production deploy. |
| 8 | Provision the production stack: Vercel + Railway + Supabase + Upstash + R2 | L | DEPLOY.md is the playbook. ~90min if no surprises. |
| 9 | Wire Stripe + a minimum-viable rate limit + Cloudflare Turnstile on `/generate` | M | Without these, public launch = open wallet to abuse. |
| 10 | Add `/api/og/[id]` server-rendered PNG for unfurls | S | Twitter / LinkedIn share previews currently broken. |
| 11 | Sentry on backend + frontend | S | First production bug must be visible. |
| 12 | Generate + commit 4-8 real showcase videos. Confirm `/public/showcase/*.mp4` files exist. | L | Closes AUDIT.md row 9. |

### Week 3 — Phantom-as-company narrative

| # | Item | Effort | Why |
|---|---|---|---|
| 13 | Rewrite About page to explain Phantom-as-company. Add Phantom Protocol teaser ("coming soon" + waitlist email field). | M | The narrative needs to exist before Protocol's launch is even considered. |
| 14 | Decide branding: keep RepoX content at root, or refactor to `/repox/*` ahead of Protocol? | S decision, L if refactor | Multi-product URL structure now is cheaper than later. |
| 15 | Set up `@phantom` (or `@usephantom`) Twitter + verify handle availability | XS | Free + needed for launch. |
| 16 | Buy Stripe Atlas + form LLC (or your structure of choice) | M | Required if any revenue happens. ~$500 total. |
| 17 | Use a TOS template (Atlas's or similar). Privacy policy review. | S | Required for payment. |
| 18 | Soft launch: DM 20 dev friends, ask for brutal feedback. Fix top 3 issues. | M | Per LAUNCH_CHECKLIST T-1. |

### Week 4 — Public launch + Phantom Protocol seed

| # | Item | Effort | Why |
|---|---|---|---|
| 19 | RepoX public launch (HN + Twitter thread + 2 subreddits) | L launch day + sustained engagement | The thing this whole project has been building toward. |
| 20 | After 48h cooldown, review metrics + iterate | M | Per LAUNCH_CHECKLIST T+1 week. |
| 21 | **Decision point**: did RepoX get traction? If yes → start Phantom Protocol v0.1 (Option B from Part 4 — Python SDK + Anthropic integration). If no → iterate RepoX, defer Protocol. | — | Don't ship Protocol on the back of a flop. Validate first. |
| 22 | If traction: write Phantom Protocol spec doc draft + 1-page landing at `phantom.video/protocol` (waitlist only) | L | Seeds the audience for Protocol while RepoX iteration continues. |

---

## PART 7 — Honest risks

### What could derail Phantom

1. **JPMC internship conflict.** Highest priority unknown. Most banks treat outside commercial work as either pre-clearance-required or outright forbidden. Phantom Protocol's "compliance / audit trail for AI agents" pitch is uncomfortably close to JPMC's own business interests. If discovered post-launch, could mean: forced shutdown, IP claim on the work, recovery of compensation, termination of internship. **This is a non-negotiable read-the-policy-before-Monday item.**

2. **Competition shipping first.** RepoX has 3-5 "competitors" in adjacent spaces (Sourcery, Greptile, others doing repo-to-explanation). Phantom Protocol has the LangSmith / Phoenix / Langfuse field. None has shipped exactly what Phantom proposes — yet. The window is months, not years.

3. **Burnout.** This is the most likely failure mode. Six months of solo work to v5c, with the user reporting demoralization in past conversations ("this just isn't worth it"). Adding Phantom Protocol on top while running RepoX in production while doing JPMC SEP is a high-burnout setup. **One product live with paying users is more valuable than two products in vaporware.**

4. **Production hosting cost spikes.** $0.18/video looks fine at 100 videos/day. At 1,000/day with no rate limit, that's $180/day = $5,400/month in API + infra. If abuse hits before billing is wired, this is a single bad weekend away from a credit-card disaster. Rate limit + auth + payment must all exist before public launch.

5. **The "two products" problem.** Phantom Protocol and RepoX share a thesis but not an audience. Building both as a single person dilutes both. The pull to "ship something new" when "iterate on what shipped" is harder is real and recurring. A focus discipline is needed — possibly "we don't touch Protocol code until RepoX has $1k MRR" or similar.

6. **AI tool fatigue.** By Q3 2026, the market may be saturated with AI-explains-X products. RepoX's positioning ("video walkthroughs of codebases") needs to feel distinct from "another AI tool." The current honest beta framing helps. Continuing to ship craft-quality differentiation matters.

7. **Cryptographic provenance turning out to be solution-without-problem.** If the answer to "who actually needs signed proof chains for agent actions" is "almost nobody in 2026," Phantom Protocol's wedge collapses to "another observability tool" — and that market is crowded. Validate the wedge with 5 real-customer interviews before writing the first line of code.

---

## Closing observation

The single highest-leverage move right now is **not technical**. It's the JPMC conflict-check + the domain decision + the read on whether RepoX's audience overlaps Phantom Protocol's audience enough to make the multi-product story honest.

The code is in unusually good shape for a v0.1 — v5c is genuine B+/A- territory on script + sync + layout. The deployment, monetization, and company-level infrastructure are at zero. That gap is where the next 30 days actually live.
