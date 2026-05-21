/**
 * Build marketing/pitch-deck.pptx — a 10-slide dark cinematic pitch deck for
 * investors, recruiters, and partners.
 *
 * Run:
 *   npm install -g pptxgenjs           # or `npm install pptxgenjs` and run with `npx node`
 *   node scripts/build-pitch-deck.js
 *
 * Output:
 *   marketing/pitch-deck.pptx  (10 slides, 16:9, ~80 KB)
 *
 * Design tokens mirror frontend/tailwind.config.ts. No hex colors with `#`
 * prefix — pptxgenjs treats them as corrupted file inputs.
 */
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");

const VOID = "050507";
const INK = "0A0A0B";
const GRAPHITE = "14141A";
const SMOKE = "1F1F28";
const BONE = "F5F5F0";
const FOG = "A8A8B3";
const MIST = "6B6B78";
const ELECTRIC = "00F0FF";
const PLASMA = "7B61FF";

const OUT_DIR = path.resolve(__dirname, "..", "marketing");
const OUT_PATH = path.join(OUT_DIR, "pitch-deck.pptx");

// 16:9 canvas: 10" wide × 5.625" tall.
const W = 10;
const H = 5.625;

// Margins
const M_X = 0.6;
const M_Y = 0.5;

/* ----- helpers ----- */

function paintBackground(slide) {
  slide.background = { color: VOID };
  // Atmospheric blobs — large soft circles at low opacity.
  slide.addShape("ellipse", {
    x: -2, y: -2, w: 5, h: 5,
    fill: { color: ELECTRIC, transparency: 92 },
    line: { type: "none" },
  });
  slide.addShape("ellipse", {
    x: 7, y: 3, w: 5, h: 5,
    fill: { color: PLASMA, transparency: 92 },
    line: { type: "none" },
  });
}

function accentRail(slide) {
  // Thin cyan rail down the left edge — the recurring visual motif.
  slide.addShape("rect", {
    x: 0, y: 0, w: 0.08, h: H,
    fill: { color: ELECTRIC },
    line: { type: "none" },
  });
}

function slideNumber(slide, n, total) {
  slide.addText(`${String(n).padStart(2, "0")} / ${total}`, {
    x: W - 1.2, y: M_Y, w: 0.8, h: 0.3,
    fontSize: 9, fontFace: "Calibri", bold: true,
    color: ELECTRIC, align: "right", margin: 0, charSpacing: 4,
  });
}

function kicker(slide, text, opts = {}) {
  slide.addText(text.toUpperCase(), {
    x: M_X, y: opts.y || M_Y, w: 6, h: 0.3,
    fontSize: 9, fontFace: "Calibri", bold: true,
    color: ELECTRIC, charSpacing: 6, margin: 0,
  });
}

function footer(slide, page) {
  slide.addText("PHANTOM · CONFIDENTIAL", {
    x: M_X, y: H - 0.4, w: 4, h: 0.3,
    fontSize: 8, fontFace: "Calibri",
    color: MIST, charSpacing: 4, margin: 0,
  });
  slide.addText(`PAGE ${page}`, {
    x: W - 1.6, y: H - 0.4, w: 1, h: 0.3,
    fontSize: 8, fontFace: "Calibri",
    color: MIST, align: "right", margin: 0, charSpacing: 4,
  });
}

/* ----- slides ----- */

function slide01_cover(pres) {
  const slide = pres.addSlide();
  paintBackground(slide);

  // Big logo mark
  slide.addShape("roundRect", {
    x: M_X, y: 1.0, w: 0.7, h: 0.7,
    fill: { color: GRAPHITE },
    line: { color: ELECTRIC, width: 1 },
    rectRadius: 0.12,
  });
  slide.addText("P", {
    x: M_X, y: 1.0, w: 0.7, h: 0.7,
    fontSize: 30, fontFace: "Calibri", bold: true,
    color: BONE, align: "center", valign: "middle", margin: 0,
  });
  slide.addText("PHANTOM", {
    x: M_X + 0.9, y: 1.18, w: 4, h: 0.4,
    fontSize: 16, fontFace: "Calibri", bold: true,
    color: BONE, charSpacing: 6, margin: 0,
  });

  // Headline (stacked)
  slide.addText("Any codebase.", {
    x: M_X, y: 2.2, w: 9, h: 1.0,
    fontSize: 60, fontFace: "Calibri", bold: true,
    color: BONE, margin: 0,
  });
  slide.addText("Explained in minutes.", {
    x: M_X, y: 3.05, w: 9, h: 1.0,
    fontSize: 60, fontFace: "Calibri", bold: true,
    color: ELECTRIC, margin: 0,
  });

  // Tagline + author
  slide.addText("The AI that understands codebases.", {
    x: M_X, y: 4.4, w: 9, h: 0.4,
    fontSize: 18, fontFace: "Calibri",
    color: FOG, margin: 0,
  });
  slide.addText("Pitch deck · Vineet Sista · 2026", {
    x: M_X, y: H - 0.45, w: 9, h: 0.3,
    fontSize: 9, fontFace: "Calibri",
    color: MIST, charSpacing: 4, margin: 0,
  });
}

function slide02_problem(pres) {
  const slide = pres.addSlide();
  paintBackground(slide);
  accentRail(slide);
  kicker(slide, "01 · the problem");

  // Left column — big number
  slide.addText("3-7", {
    x: M_X, y: 1.2, w: 4.5, h: 1.8,
    fontSize: 160, fontFace: "Calibri", bold: true,
    color: ELECTRIC, margin: 0,
  });
  slide.addText("days lost per new engineer", {
    x: M_X, y: 3.1, w: 4.5, h: 0.4,
    fontSize: 14, fontFace: "Calibri",
    color: FOG, margin: 0, charSpacing: 2,
  });
  slide.addText("on understanding an unfamiliar codebase", {
    x: M_X, y: 3.4, w: 4.5, h: 0.4,
    fontSize: 12, fontFace: "Calibri",
    color: MIST, margin: 0,
  });

  // Right column — the explanation
  slide.addText("There is no middle layer.", {
    x: 5.4, y: 1.2, w: 4.2, h: 0.6,
    fontSize: 28, fontFace: "Calibri", bold: true,
    color: BONE, margin: 0,
  });
  slide.addText([
    { text: "READMEs ", options: { color: BONE, bold: true } },
    { text: "are too high-level. ", options: { color: FOG, breakLine: true } },
    { text: "Source code ", options: { color: BONE, bold: true } },
    { text: "is too low-level. ", options: { color: FOG, breakLine: true } },
    { text: "ChatGPT ", options: { color: BONE, bold: true } },
    { text: "has no visualization or shareable artifact. ", options: { color: FOG, breakLine: true } },
    { text: "Senior engineers ", options: { color: BONE, bold: true } },
    { text: "have better things to do.", options: { color: FOG } },
  ], {
    x: 5.4, y: 2.0, w: 4.2, h: 2.0,
    fontSize: 14, fontFace: "Calibri", paraSpaceAfter: 6,
    margin: 0,
  });

  slide.addText("Engineers re-discover the shape of every new system, manually, every time.", {
    x: 5.4, y: 4.2, w: 4.2, h: 0.6,
    fontSize: 13, fontFace: "Calibri", italic: true,
    color: ELECTRIC, margin: 0,
  });

  slideNumber(slide, 2, 10);
  footer(slide, 2);
}

function slide03_solution(pres) {
  const slide = pres.addSlide();
  paintBackground(slide);
  accentRail(slide);
  kicker(slide, "02 · the solution");

  slide.addText("Paste a URL.", {
    x: M_X, y: 1.1, w: 9, h: 0.7,
    fontSize: 42, fontFace: "Calibri", bold: true,
    color: BONE, margin: 0,
  });
  slide.addText("Get a video.", {
    x: M_X, y: 1.65, w: 9, h: 0.7,
    fontSize: 42, fontFace: "Calibri", bold: true,
    color: ELECTRIC, margin: 0,
  });

  // Faux "browser window" with the hero UI rendered as shapes
  const cardX = M_X;
  const cardY = 2.7;
  const cardW = 8.8;
  const cardH = 2.3;
  slide.addShape("rect", {
    x: cardX, y: cardY, w: cardW, h: cardH,
    fill: { color: GRAPHITE },
    line: { color: SMOKE, width: 0.5 },
  });
  // Browser dots
  ["FF4757", "FF6B35", "00D97E"].forEach((color, i) => {
    slide.addShape("ellipse", {
      x: cardX + 0.2 + i * 0.22, y: cardY + 0.18, w: 0.14, h: 0.14,
      fill: { color },
      line: { type: "none" },
    });
  });
  slide.addText("phantom.video", {
    x: cardX + 1.2, y: cardY + 0.12, w: 4, h: 0.3,
    fontSize: 10, fontFace: "Consolas",
    color: MIST, margin: 0,
  });

  // URL input
  slide.addShape("rect", {
    x: cardX + 0.5, y: cardY + 0.8, w: 5.5, h: 0.55,
    fill: { color: INK },
    line: { color: ELECTRIC, width: 1 },
  });
  slide.addText("https://github.com/vercel/next.js", {
    x: cardX + 0.65, y: cardY + 0.82, w: 5.3, h: 0.5,
    fontSize: 13, fontFace: "Consolas",
    color: BONE, valign: "middle", margin: 0,
  });
  // Generate button
  slide.addShape("rect", {
    x: cardX + 6.2, y: cardY + 0.8, w: 1.9, h: 0.55,
    fill: { color: ELECTRIC },
    line: { type: "none" },
  });
  slide.addText("Generate →", {
    x: cardX + 6.2, y: cardY + 0.8, w: 1.9, h: 0.55,
    fontSize: 13, fontFace: "Calibri", bold: true,
    color: INK, align: "center", valign: "middle", margin: 0,
  });

  slide.addText("3-minute narrated walkthrough · architecture · key files · design decisions", {
    x: cardX + 0.5, y: cardY + 1.6, w: 7.5, h: 0.4,
    fontSize: 12, fontFace: "Calibri",
    color: FOG, margin: 0, italic: true,
  });

  slideNumber(slide, 3, 10);
  footer(slide, 3);
}

function slide04_pipeline(pres) {
  const slide = pres.addSlide();
  paintBackground(slide);
  accentRail(slide);
  kicker(slide, "03 · how it works");

  slide.addText("Six stages. Two to five minutes.", {
    x: M_X, y: 1.0, w: 9, h: 0.6,
    fontSize: 32, fontFace: "Calibri", bold: true,
    color: BONE, margin: 0,
  });

  const stages = [
    { n: "01", label: "Clone", note: "Shallow git fetch" },
    { n: "02", label: "Analyze", note: "AST + heuristics" },
    { n: "03", label: "Script", note: "Claude · strict JSON" },
    { n: "04", label: "Diagram", note: "SVG architecture" },
    { n: "05", label: "Voice", note: "OpenAI TTS · 1080p" },
    { n: "06", label: "Render", note: "Remotion · ffmpeg" },
  ];

  const stageW = 1.4;
  const stageH = 2.0;
  const gap = (W - 2 * M_X - 6 * stageW) / 5;
  const startY = 2.2;

  stages.forEach((stage, i) => {
    const x = M_X + i * (stageW + gap);
    slide.addShape("rect", {
      x, y: startY, w: stageW, h: stageH,
      fill: { color: GRAPHITE },
      line: { color: SMOKE, width: 0.5 },
    });
    slide.addShape("rect", {
      x, y: startY, w: stageW, h: 0.08,
      fill: { color: ELECTRIC },
      line: { type: "none" },
    });
    slide.addText(stage.n, {
      x, y: startY + 0.2, w: stageW, h: 0.4,
      fontSize: 11, fontFace: "Calibri", bold: true,
      color: ELECTRIC, align: "center", margin: 0, charSpacing: 4,
    });
    slide.addText(stage.label, {
      x, y: startY + 0.7, w: stageW, h: 0.5,
      fontSize: 18, fontFace: "Calibri", bold: true,
      color: BONE, align: "center", margin: 0,
    });
    slide.addText(stage.note, {
      x: x + 0.05, y: startY + 1.3, w: stageW - 0.1, h: 0.5,
      fontSize: 9, fontFace: "Calibri",
      color: FOG, align: "center", margin: 0,
    });

    // Connecting tick between stages
    if (i < stages.length - 1) {
      slide.addShape("line", {
        x: x + stageW, y: startY + stageH / 2,
        w: gap, h: 0,
        line: { color: ELECTRIC, width: 0.5, dashType: "dash" },
      });
    }
  });

  slide.addText("Each stage gracefully degrades — pipeline runs end-to-end without paid API keys.", {
    x: M_X, y: 4.6, w: 9, h: 0.4,
    fontSize: 11, fontFace: "Calibri", italic: true,
    color: FOG, margin: 0,
  });

  slideNumber(slide, 4, 10);
  footer(slide, 4);
}

function slide05_tech(pres) {
  const slide = pres.addSlide();
  paintBackground(slide);
  accentRail(slide);
  kicker(slide, "04 · technology");

  slide.addText("Production stack on day one.", {
    x: M_X, y: 1.0, w: 9, h: 0.6,
    fontSize: 32, fontFace: "Calibri", bold: true,
    color: BONE, margin: 0,
  });

  const groups = [
    { title: "Frontend", items: ["Next.js 14", "React 18", "TypeScript", "Tailwind", "Framer Motion", "R3F"] },
    { title: "Backend", items: ["Python 3.12", "FastAPI", "SQLAlchemy", "Celery", "Postgres", "Redis"] },
    { title: "AI · Video", items: ["Claude Sonnet 4.5", "OpenAI TTS-1-HD", "ElevenLabs", "Remotion 4", "ffmpeg"] },
    { title: "Infra", items: ["Vercel · edge", "Railway · workers", "Upstash · Redis", "Cloudflare R2", "Sentry · PostHog"] },
  ];

  const colW = 2.1;
  const gap = (W - 2 * M_X - 4 * colW) / 3;
  groups.forEach((g, i) => {
    const x = M_X + i * (colW + gap);
    const y = 2.0;
    slide.addText(g.title.toUpperCase(), {
      x, y, w: colW, h: 0.3,
      fontSize: 10, fontFace: "Calibri", bold: true,
      color: ELECTRIC, margin: 0, charSpacing: 4,
    });
    slide.addText(
      g.items.map((item, j) => ({
        text: item,
        options: {
          color: BONE, fontSize: 13,
          breakLine: j < g.items.length - 1,
        },
      })),
      {
        x, y: y + 0.45, w: colW, h: 2.6,
        fontFace: "Calibri", margin: 0, paraSpaceAfter: 4,
      },
    );
  });

  slideNumber(slide, 5, 10);
  footer(slide, 5);
}

function slide06_market(pres) {
  const slide = pres.addSlide();
  paintBackground(slide);
  accentRail(slide);
  kicker(slide, "05 · market");

  slide.addText("Developer tools is the trillion-dollar adjacency.", {
    x: M_X, y: 1.0, w: 9, h: 0.7,
    fontSize: 28, fontFace: "Calibri", bold: true,
    color: BONE, margin: 0,
  });

  // Three stat blocks
  const stats = [
    { n: "$30B+", label: "Dev tools market", note: "2026E · expanding 18% YoY" },
    { n: "28M+", label: "Active GitHub developers", note: "Every one is a potential generation" },
    { n: "$0.18", label: "Cost per generated video", note: "Sustainable free tier · 100x margin at $19/mo" },
  ];

  const cardW = 2.85;
  const gap = (W - 2 * M_X - 3 * cardW) / 2;
  stats.forEach((s, i) => {
    const x = M_X + i * (cardW + gap);
    const y = 2.0;
    slide.addShape("rect", {
      x, y, w: cardW, h: 2.5,
      fill: { color: GRAPHITE },
      line: { color: SMOKE, width: 0.5 },
    });
    slide.addText(s.n, {
      x, y: y + 0.4, w: cardW, h: 1.0,
      fontSize: 48, fontFace: "Calibri", bold: true,
      color: ELECTRIC, align: "center", margin: 0,
    });
    slide.addText(s.label, {
      x, y: y + 1.5, w: cardW, h: 0.4,
      fontSize: 13, fontFace: "Calibri", bold: true,
      color: BONE, align: "center", margin: 0,
    });
    slide.addText(s.note, {
      x: x + 0.2, y: y + 1.95, w: cardW - 0.4, h: 0.5,
      fontSize: 10, fontFace: "Calibri",
      color: FOG, align: "center", margin: 0,
    });
  });

  slide.addText("The wedge: codebase video — a category that doesn't exist yet.", {
    x: M_X, y: 4.8, w: 9, h: 0.4,
    fontSize: 12, fontFace: "Calibri", italic: true,
    color: ELECTRIC, margin: 0,
  });

  slideNumber(slide, 6, 10);
  footer(slide, 6);
}

function slide07_pricing(pres) {
  const slide = pres.addSlide();
  paintBackground(slide);
  accentRail(slide);
  kicker(slide, "06 · business model");

  slide.addText("Freemium · self-serve.", {
    x: M_X, y: 1.0, w: 9, h: 0.6,
    fontSize: 32, fontFace: "Calibri", bold: true,
    color: BONE, margin: 0,
  });

  const tiers = [
    { name: "Hobby", price: "$0", cad: "forever", perks: ["2 videos / mo", "720p · watermark", "Up to 5K LOC"], accent: false },
    { name: "Pro", price: "$19", cad: "per month", perks: ["Unlimited videos", "1080p · no mark", "API access · priority queue"], accent: true },
    { name: "Studio", price: "$49", cad: "per month", perks: ["Pro + team workspace", "Custom branding", "White-label embeds"], accent: false },
  ];

  const cardW = 2.85;
  const gap = (W - 2 * M_X - 3 * cardW) / 2;
  tiers.forEach((t, i) => {
    const x = M_X + i * (cardW + gap);
    const y = t.accent ? 1.85 : 2.0;
    const h = t.accent ? 3.0 : 2.8;
    slide.addShape("rect", {
      x, y, w: cardW, h,
      fill: { color: GRAPHITE },
      line: { color: t.accent ? ELECTRIC : SMOKE, width: t.accent ? 1.5 : 0.5 },
    });
    if (t.accent) {
      slide.addShape("rect", {
        x: x + cardW / 2 - 0.6, y: y - 0.15, w: 1.2, h: 0.3,
        fill: { color: ELECTRIC },
        line: { type: "none" },
      });
      slide.addText("MOST POPULAR", {
        x: x + cardW / 2 - 0.6, y: y - 0.15, w: 1.2, h: 0.3,
        fontSize: 8, fontFace: "Calibri", bold: true,
        color: INK, align: "center", valign: "middle", margin: 0, charSpacing: 3,
      });
    }
    slide.addText(t.name, {
      x: x + 0.3, y: y + 0.2, w: cardW - 0.6, h: 0.35,
      fontSize: 14, fontFace: "Calibri", bold: true,
      color: BONE, margin: 0,
    });
    slide.addText(t.price, {
      x: x + 0.3, y: y + 0.6, w: cardW - 0.6, h: 0.7,
      fontSize: 42, fontFace: "Calibri", bold: true,
      color: t.accent ? ELECTRIC : BONE, margin: 0,
    });
    slide.addText(t.cad, {
      x: x + 0.3, y: y + 1.35, w: cardW - 0.6, h: 0.3,
      fontSize: 10, fontFace: "Calibri",
      color: MIST, margin: 0,
    });
    slide.addText(
      t.perks.map((perk, j) => ({
        text: perk,
        options: { color: FOG, fontSize: 11, breakLine: j < t.perks.length - 1, bullet: true },
      })),
      {
        x: x + 0.3, y: y + 1.7, w: cardW - 0.6, h: 1.5,
        fontFace: "Calibri", margin: 0, paraSpaceAfter: 4,
      },
    );
  });

  slide.addText("Target: 1,000 paying customers · 6 months post-launch", {
    x: M_X, y: 5.0, w: 9, h: 0.4,
    fontSize: 11, fontFace: "Calibri", italic: true,
    color: ELECTRIC, margin: 0,
  });

  slideNumber(slide, 7, 10);
  footer(slide, 7);
}

function slide08_traction(pres) {
  const slide = pres.addSlide();
  paintBackground(slide);
  accentRail(slide);
  kicker(slide, "07 · early traction");

  slide.addText("Pre-launch · what we've built.", {
    x: M_X, y: 1.0, w: 9, h: 0.6,
    fontSize: 32, fontFace: "Calibri", bold: true,
    color: BONE, margin: 0,
  });

  const tractions = [
    "End-to-end pipeline shipped — analyze, script, voice, render",
    "8 showcase videos pre-rendered (React, Vue, FastAPI, Next.js, Tailwind, LangChain, Supabase, Bun)",
    "Custom video player with chapters, share modal with dynamic OG cards",
    "Embed widget — every shared video is a growth vector",
    "Marketing kit ready: Show HN draft, launch tweet thread, dev.to article, Reddit posts",
    "Cost per video: $0.18 all-in · free tier sustainable",
  ];

  slide.addText(
    tractions.map((t, i) => ({
      text: t,
      options: { color: BONE, fontSize: 14, breakLine: i < tractions.length - 1, bullet: { code: "25CF" } },
    })),
    {
      x: M_X, y: 1.9, w: 8.8, h: 3.0,
      fontFace: "Calibri", margin: 0, paraSpaceAfter: 8,
    },
  );

  // Footer note
  slide.addText("Public launch: Q3 2026 · Show HN + Product Hunt + Twitter coordinated rollout.", {
    x: M_X, y: 5.0, w: 9, h: 0.4,
    fontSize: 11, fontFace: "Calibri", italic: true,
    color: ELECTRIC, margin: 0,
  });

  slideNumber(slide, 8, 10);
  footer(slide, 8);
}

function slide09_roadmap(pres) {
  const slide = pres.addSlide();
  paintBackground(slide);
  accentRail(slide);
  kicker(slide, "08 · roadmap");

  slide.addText("RepoX is the first product.", {
    x: M_X, y: 1.0, w: 9, h: 0.6,
    fontSize: 32, fontFace: "Calibri", bold: true,
    color: BONE, margin: 0,
  });

  const phases = [
    {
      tag: "NOW · Q3 2026",
      title: "RepoX",
      body: "Codebase → narrated video. Self-serve. Free + Pro + Studio tiers.",
      accent: ELECTRIC,
    },
    {
      tag: "NEXT · Q1 2027",
      title: "RepoX Chat",
      body: "Interactive Q&A grounded in the same analysis. Slack + Discord bot.",
      accent: PLASMA,
    },
    {
      tag: "LATER · 2027",
      title: "Phantom API",
      body: "Developer platform · DevRel teams generate explainers per integration. Volume pricing.",
      accent: BONE,
    },
  ];

  phases.forEach((p, i) => {
    const x = M_X;
    const y = 2.0 + i * 1.05;
    slide.addShape("rect", {
      x, y, w: W - 2 * M_X, h: 0.9,
      fill: { color: GRAPHITE },
      line: { color: SMOKE, width: 0.5 },
    });
    slide.addShape("rect", {
      x, y, w: 0.06, h: 0.9,
      fill: { color: p.accent },
      line: { type: "none" },
    });
    slide.addText(p.tag, {
      x: x + 0.2, y: y + 0.15, w: 2.2, h: 0.3,
      fontSize: 9, fontFace: "Calibri", bold: true,
      color: p.accent, margin: 0, charSpacing: 4,
    });
    slide.addText(p.title, {
      x: x + 0.2, y: y + 0.42, w: 2.5, h: 0.4,
      fontSize: 18, fontFace: "Calibri", bold: true,
      color: BONE, margin: 0,
    });
    slide.addText(p.body, {
      x: 3.3, y: y + 0.3, w: W - 4, h: 0.5,
      fontSize: 12, fontFace: "Calibri",
      color: FOG, valign: "middle", margin: 0,
    });
  });

  slideNumber(slide, 9, 10);
  footer(slide, 9);
}

function slide10_about(pres) {
  const slide = pres.addSlide();
  paintBackground(slide);
  accentRail(slide);
  kicker(slide, "09 · about");

  slide.addText("Vineet Sista", {
    x: M_X, y: 1.0, w: 6, h: 0.7,
    fontSize: 44, fontFace: "Calibri", bold: true,
    color: BONE, margin: 0,
  });
  slide.addText("Founder & sole engineer · Columbus, OH", {
    x: M_X, y: 1.8, w: 6, h: 0.4,
    fontSize: 14, fontFace: "Calibri",
    color: ELECTRIC, margin: 0, charSpacing: 2,
  });

  const points = [
    { tag: "CS", text: "Ohio State University — Computer Science" },
    { tag: "JPMC", text: "JPMorgan Chase Software Engineering Program (SEP)" },
    { tag: "VeloQuant", text: "Built quantitative trading infrastructure" },
    { tag: "Side", text: "Multiple side projects — Phantom, Wraith, AlphaStream, Darkmile, RetainIQ" },
  ];

  points.forEach((p, i) => {
    const y = 2.6 + i * 0.5;
    slide.addShape("rect", {
      x: M_X, y, w: 1.2, h: 0.4,
      fill: { color: GRAPHITE },
      line: { color: ELECTRIC, width: 0.5 },
    });
    slide.addText(p.tag, {
      x: M_X, y, w: 1.2, h: 0.4,
      fontSize: 10, fontFace: "Calibri", bold: true,
      color: ELECTRIC, align: "center", valign: "middle", margin: 0, charSpacing: 2,
    });
    slide.addText(p.text, {
      x: M_X + 1.4, y, w: W - M_X - 1.4 - M_X, h: 0.4,
      fontSize: 13, fontFace: "Calibri",
      color: FOG, valign: "middle", margin: 0,
    });
  });

  // CTA pill
  slide.addShape("rect", {
    x: M_X, y: H - 1.1, w: 3.4, h: 0.5,
    fill: { color: ELECTRIC },
    line: { type: "none" },
  });
  slide.addText("hello@phantom.video →", {
    x: M_X, y: H - 1.1, w: 3.4, h: 0.5,
    fontSize: 13, fontFace: "Calibri", bold: true,
    color: INK, align: "center", valign: "middle", margin: 0,
  });

  slideNumber(slide, 10, 10);
  footer(slide, 10);
}

/* ----- main ----- */

async function build() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Vineet Sista";
  pres.company = "Phantom";
  pres.title = "Phantom — Pitch Deck";
  pres.subject = "AI that turns any GitHub repo into a narrated video explainer";

  slide01_cover(pres);
  slide02_problem(pres);
  slide03_solution(pres);
  slide04_pipeline(pres);
  slide05_tech(pres);
  slide06_market(pres);
  slide07_pricing(pres);
  slide08_traction(pres);
  slide09_roadmap(pres);
  slide10_about(pres);

  await pres.writeFile({ fileName: OUT_PATH });
  console.log(`✓ Wrote ${path.relative(path.resolve(__dirname, ".."), OUT_PATH)} (10 slides)`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
