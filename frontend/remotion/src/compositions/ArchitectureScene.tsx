import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { BackgroundGrid } from "../components/BackgroundGrid";
import { Watermark } from "../components/Watermark";
import { SETTLE } from "../components/motion";
import { FONT_BODY, FONT_DISPLAY, FONT_MONO } from "../loadFonts";
import {
  COLORS,
  type ScriptConnection,
  type ScriptDataFlow,
  type ScriptModule,
  type ScriptSection,
} from "../types";

/**
 * Architecture scene — calm, stable, readable.
 *
 * After user feedback ("switches frames a lot and moves things out of their
 * original position too much... too messy") the scene was rewritten to
 * follow three rules:
 *
 *  1. STABILITY. Module positions are computed ONCE at scene start and
 *     never change. There is no camera tracking, no zooming toward the
 *     active module, no repositioning when focus changes.
 *  2. THREE-REGION LAYOUT. Hard separation between title (y 0-140),
 *     modules (y 160-880), and footer (y 900-1080). Module placement is
 *     constrained to its region with a 40 px safety margin from the title
 *     boundary.
 *  3. RESTRAINT. One subtle background layer (BackgroundGrid). Static
 *     1px connection lines in mist gray. No particles, no pulse, no
 *     wireframe rotation. Only the ACTIVE module gets a cyan border;
 *     everything else is quiet.
 */
const FPS = 30;

const TITLE_REGION_BOTTOM = 140;
const MODULE_REGION_TOP = TITLE_REGION_BOTTOM + 20; // 160
const FOOTER_REGION_TOP = 880;
const MIN_MARGIN_FROM_TITLE = 40; // boxes must not get within 40px of the title region

interface Placement {
  x: number;
  y: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

export const ArchitectureScene: React.FC<{ section: ScriptSection }> = ({
  section,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const data = (section.visuals?.data as {
    modules?: ScriptModule[];
    connections?: ScriptConnection[];
    data_flows?: ScriptDataFlow[];
    hint?: string;
  }) ?? {};

  const modules = (data.modules ?? []).slice(0, 10);
  const connections = data.connections ?? [];

  // Layout — compute everything ONCE per render. Module 0 (entry point)
  // anchors at the centre of the module region; the remaining modules
  // orbit on a single ring sized to fit inside the region with a hard
  // safety margin from the title boundary.
  const placements = useMemo<Placement[]>(() => {
    const n = modules.length;
    if (n === 0) return [];

    const regionTop = MODULE_REGION_TOP;
    const regionBottom = FOOTER_REGION_TOP;
    const regionHeight = regionBottom - regionTop;
    const regionCenterX = width / 2;
    const regionCenterY = (regionTop + regionBottom) / 2;

    // Box size scales with module count. Cap minimum at 220×96 for legibility.
    const baseW = n > 6 ? 240 : 320;
    const baseH = n > 6 ? 96 : 130;

    // Maximum ring radius constrained so the topmost box (theta = -π/2)
    // can't land within MIN_MARGIN_FROM_TITLE of the title region.
    const topConstraint =
      regionCenterY - regionTop - baseH / 2 - MIN_MARGIN_FROM_TITLE;
    const bottomConstraint =
      regionBottom - regionCenterY - baseH / 2 - 20;
    const sideConstraint = (width - baseW) / 2 - 100;
    const maxRing = Math.min(topConstraint, bottomConstraint, sideConstraint);
    // Tighter ring for smaller layouts so the diagram doesn't feel spread out.
    const ringR = Math.min(n > 6 ? 320 : 360, Math.max(220, maxRing));

    // Final scale factor — if the boxes still wouldn't fit at the chosen
    // radius and size, shrink everything proportionally.
    const estimatedSpan = (ringR * 2) + baseH;
    const scale = estimatedSpan > regionHeight - MIN_MARGIN_FROM_TITLE
      ? (regionHeight - MIN_MARGIN_FROM_TITLE) / estimatedSpan
      : 1;
    const boxW = Math.round(baseW * scale);
    const boxH = Math.round(baseH * scale);
    const radius = Math.round(ringR * scale);

    return modules.map((_, index) => {
      if (index === 0) {
        return {
          x: regionCenterX - boxW / 2,
          y: regionCenterY - boxH / 2,
          cx: regionCenterX,
          cy: regionCenterY,
          width: boxW,
          height: boxH,
        };
      }
      const ringCount = n - 1;
      // -90deg start so module 1 lands at the top of the ring.
      const theta = -Math.PI / 2 + (2 * Math.PI * (index - 1)) / Math.max(1, ringCount);
      const mx = regionCenterX + radius * Math.cos(theta);
      // Vertical clamp — never drop below MODULE_REGION_TOP + boxH/2 + margin.
      const myUnclamped = regionCenterY + radius * Math.sin(theta);
      const my = Math.max(
        regionTop + boxH / 2 + MIN_MARGIN_FROM_TITLE,
        Math.min(regionBottom - boxH / 2 - 10, myUnclamped),
      );
      return {
        x: mx - boxW / 2,
        y: my - boxH / 2,
        cx: mx,
        cy: my,
        width: boxW,
        height: boxH,
      };
    });
  }, [modules, width, height]);

  // Convert narration_start_seconds to the frame at which a module starts
  // to appear. Boxes use a soft 14-frame fade-in plus a small scale settle
  // (0.94 → 1.0). NO repositioning, no translation.
  const moduleStartFrames = useMemo(() => {
    return modules.map((m, index) => {
      const s = m.narration_start_seconds;
      if (typeof s === "number" && s >= 0) {
        return Math.max(30, Math.round(s * FPS) + 30);
      }
      return 30 + index * 30;
    });
  }, [modules]);

  const connectionStartFrames = useMemo(() => {
    return connections.map((c) => {
      const s = c.narration_start_seconds;
      if (typeof s === "number" && s >= 0) {
        return Math.max(30, Math.round(s * FPS) + 30);
      }
      return 60;
    });
  }, [connections]);

  // Which module is currently "active" — the most recently mentioned one
  // whose narration_start_seconds is in the past. Drives ONLY the static
  // cyan border + 100% opacity. No translate, no scale, no pulse.
  const activeIndex = useMemo(() => {
    let active = -1;
    for (let i = 0; i < moduleStartFrames.length; i++) {
      if (frame >= moduleStartFrames[i] + 14) active = i;
    }
    return active;
  }, [moduleStartFrames, frame]);

  // Header opacities — title comes first, kicker shortly after.
  const kickerOpacity = interpolate(frame, [4, 22], [0, 1], { extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [10, 28], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {/* Single subtle background — no wireframe, no particles, no glow. */}
      <BackgroundGrid />
      {/* Reduce the BackgroundGrid intensity by overlaying a slight darken. */}
      <AbsoluteFill style={{ background: "rgba(10,10,11,0.35)", pointerEvents: "none" }} />

      {/* TITLE REGION — y 0 to TITLE_REGION_BOTTOM. Nothing else renders here. */}
      <div
        style={{
          position: "absolute",
          top: 32,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: FONT_DISPLAY,
          height: TITLE_REGION_BOTTOM - 32,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            opacity: kickerOpacity,
            fontSize: 12,
            color: COLORS.cyan,
            textTransform: "uppercase",
            fontFamily: FONT_MONO,
            letterSpacing: 6,
            marginBottom: 10,
          }}
        >
          {(data.hint ?? "modules").toString().toUpperCase()}
        </div>
        <div
          style={{
            opacity: titleOpacity,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            lineHeight: 1,
          }}
        >
          Architecture
        </div>
      </div>

      {/* MODULE REGION — y MODULE_REGION_TOP to FOOTER_REGION_TOP. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          // No camera transform — stability is the rule.
        }}
      >
        {/* Connection layer — static thin mist-gray lines. Drawn once
            then never animated again. */}
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          {connections.map((c, i) => {
            const fromIdx = modules.findIndex((m) => m.id === c.from);
            const toIdx = modules.findIndex((m) => m.id === c.to);
            if (fromIdx < 0 || toIdx < 0) return null;
            const a = placements[fromIdx];
            const b = placements[toIdx];
            const startFrame = connectionStartFrames[i];

            // Gentle quadratic curve, control point pulled toward region centre.
            const midX = (a.cx + b.cx) / 2;
            const midY = (a.cy + b.cy) / 2;
            const ctrlPullX = (width / 2 - midX) * 0.15;
            const ctrlPullY =
              ((MODULE_REGION_TOP + FOOTER_REGION_TOP) / 2 - midY) * 0.15;
            const path = `M ${a.cx} ${a.cy} Q ${midX + ctrlPullX} ${
              midY + ctrlPullY
            }, ${b.cx} ${b.cy}`;

            const dashLength = Math.max(
              400,
              Math.round(Math.hypot(b.cx - a.cx, b.cy - a.cy) * 1.4),
            );
            const drawProgress = interpolate(
              frame,
              [startFrame, startFrame + 24],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            return (
              <path
                key={`conn-${i}`}
                d={path}
                stroke="rgba(245,245,240,0.18)"
                strokeOpacity={0.5}
                strokeWidth={1}
                strokeDasharray={dashLength}
                strokeDashoffset={dashLength * (1 - drawProgress)}
                fill="none"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Module boxes — appear in place, never move. */}
        {modules.map((module, index) => {
          const place = placements[index];
          const start = moduleStartFrames[index];
          // Soft enter: 14-frame fade + small scale settle from 0.94 → 1.0.
          // Spring with high damping so it doesn't overshoot.
          const enter = spring({
            frame: frame - start,
            fps,
            config: { damping: 26, stiffness: 90 },
          });
          const enterScale = interpolate(enter, [0, 1], [0.94, 1.0]);
          const enterOpacity = interpolate(enter, [0, 1], [0, 1]);

          const isAfterEntry = frame >= start + 14;
          const isActive = activeIndex === index && isAfterEntry;

          // Dim non-active modules to 30% once SOMETHING is active, but
          // only after THIS module has entered. No transition animations
          // — opacity changes are driven by the React interpolate the same
          // way the underline appears.
          let opacity = enterOpacity;
          if (isAfterEntry) {
            opacity = isActive
              ? 1
              : activeIndex >= 0
                ? 0.30
                : 1;
          }

          const id = module.id || module.name || `m${index}`;
          const label = module.label || module.name || id;
          const filePath = module.file_path || "";

          return (
            <div
              key={id + index}
              style={{
                position: "absolute",
                left: place.x,
                top: place.y,
                width: place.width,
                height: place.height,
                opacity,
                transform: `scale(${enterScale})`,
                transformOrigin: "center center",
                zIndex: isActive ? 5 : 2,
              }}
            >
              <div
                style={{
                  width: place.width,
                  height: place.height,
                  borderRadius: 14,
                  padding: "14px 20px",
                  background: "rgba(20,20,28,0.92)",
                  border: `1px solid ${isActive ? COLORS.cyan : "rgba(255,255,255,0.10)"}`,
                  boxShadow: isActive
                    ? `0 0 24px -8px ${COLORS.cyan}55`
                    : "none",
                  fontFamily: FONT_BODY,
                  color: COLORS.text,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 22,
                    fontWeight: 700,
                    color: COLORS.text,
                    lineHeight: 1.1,
                  }}
                >
                  {label}
                </div>
                {filePath && (
                  <div
                    style={{
                      marginTop: 6,
                      fontFamily: FONT_MONO,
                      fontSize: 12,
                      color: "rgba(245,245,240,0.5)",
                      letterSpacing: 0.4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {filePath}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER REGION — only the watermark lives here. */}
      <Watermark />
    </AbsoluteFill>
  );
};
