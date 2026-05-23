# FOLLOWUP_v8.md — what was deferred and why

The v8 run focused on what could be verified without a human in the loop.
Anything that needs visual iteration on rendered output, or click-through
on the running UI, was deferred here rather than half-shipped blindly.

## Deferred — needs visual iteration

### Phase 4 scene polish (motion grammar foundation landed; scene rewrites didn't)
- IntroScene precise frame-by-frame sequencing (0→30 background, 30→60
  brand kicker, 60→100 title spring, etc.).
- ArchitectureScene three-region layout enforcement (`TITLE_REGION` +
  `MODULE_REGION` + `WATERMARK_REGION` constants; physically prevent
  overlap).
- CodeWalkthroughScene auto-scroll with SPRING_GENTLE; right-side
  annotation flip when x > 1880; 80ms-per-char type-on.
- OutroScene "why this matters" → synced takeaways → sonar finale
  reveal sequence.
- Scene crossfade transitions via TransitionSeries (300ms visual,
  200ms audio with 100ms overlap).
- Ambient audio bed at -32dB under all narration.

**Why deferred**: each is a multi-hour edit on a large scene file
where the right values can only be picked by watching the actual
render. Motion grammar (`motion.ts`) is the foundation; scene
rewrites build on top of it. The user explicitly mandated "defer
cleanly rather than ship poorly" — these are the cleanest deferrals.

### Phase 6 UI polish leftovers
- Popover transform-origin via `--radix-popover-content-transform-origin`.
- Animation duration audit across the app — find anything > 300ms on
  interactive elements.
- List stagger animations (30-80ms per child, up to nth-child(10)).
- Empty state copy pass (apply stop-slop + copywriting to each empty
  state — favorites, search, collections, dashboard).
- Toast notifications wired into every user action (generation
  queued/complete/failed, link copied, settings saved, etc.).
- Mobile responsive audit at 375px.
- Cross-browser Chrome / Firefox / Safari sweep.

### Phase 7 render speed
- Cache hit verification — generate same repo twice, confirm second
  run skips the Sonnet analysis call. Logs show "schema patch" ran but
  cache hit/miss isn't logged distinctively; needs targeted
  instrumentation.
- Render parallelization — scenes currently render serially. Multiple
  Remotion sequences in parallel could cut render time 40-60% on
  multi-core boxes. Non-trivial because we'd need to mux audio at the
  end across parallel video outputs.
- Frontend bundle audit — `next build` + Lighthouse + lazy-loading
  heavy components.
- Database index audit — `EXPLAIN ANALYZE` on /api/v1/search +
  /trending + dashboard history; add indexes where missing.

### Phase 8 system flow
- Rich status updates with stage text + progress bar + ETA + current
  render frame.
- Optimistic UI updates for favorite/react actions.
- Inline form validation (email field validates as user types).
- Useful /404 and /500 pages.
- Browser tab title updates per page (`<title>{repo} · Phantom</title>`).
- Keyboard shortcuts (Cmd+K palette, "/" focus search, G+D dashboard,
  Esc close modals, Space play/pause, ? help).
- Smart defaults audit (every new user gets sensible config).

### Phase 9 copy polish
- Landing page hero + sub-hero + section heads.
- Pricing page tier names + feature lists + FAQ.
- Dashboard empty states.
- Email templates (welcome, generation-complete, follow-up,
  milestone) read by Resend.
- Error message audit across the codebase.
- Help text + tooltips.

## Deferred — infrastructure changes

### `next-auth` install on every container start
- **Issue**: docker named volume for `/app/node_modules` made the new
  `next-auth` dep invisible until manual `npm install` in-container
  (BUG-001).
- **Fix options**: (a) drop the named volume in `docker-compose.yaml`
  and accept the rebuild cost on dep changes, (b) move to a Dockerfile
  that copies node_modules out of the build stage instead of using a
  volume.
- **Why deferred**: changing docker-compose volume strategy mid-flight
  is the kind of change that needs the user awake to confirm dev
  experience.

### Real CSP (Content-Security-Policy)
- Other v8 security headers landed (X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy, HSTS).
- CSP intentionally NOT set: PostHog + Sentry + Fontshare CDN + Google
  Fonts + analytics inline scripts mean a useful CSP is at least a
  day's work mapping out every host. Better to ship no CSP than a
  broken one that blocks our own scripts.

## Won't do (decided against)

- Alembic migrations — single-developer pre-revenue project, the
  `SCHEMA_PATCHES` list in `models/database.py` is sufficient and
  cheaper to maintain than the Alembic init.
- prod-mode frontend (`next build && next start`) — tried in v3, the
  rewrites + .next anonymous-volume interaction made it fragile. Dev
  mode is acceptable for current scale.
- Lighthouse 95+ score chase — diminishing returns past a clean basic
  audit. Better to spend the budget on render quality.
