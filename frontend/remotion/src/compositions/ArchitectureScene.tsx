import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { BackgroundGrid } from "../components/BackgroundGrid";
import { CameraMove } from "../components/CameraMove";
import { FocusGlow } from "../components/FocusGlow";
import { Particles } from "../components/Particles";
import { ScanLineReveal } from "../components/ScanLineReveal";
import { Watermark } from "../components/Watermark";
import { SETTLE, pulse } from "../components/motion";
import { FONT_BODY, FONT_DISPLAY, FONT_MONO } from "../loadFonts";
import {
  COLORS,
  type ScriptConnection,
  type ScriptDataFlow,
  type ScriptModule,
  type ScriptSection,
} from "../types";

/**
 * Build-the-diagram architecture scene.
 *
 * Modules don't all appear at once. Each module's `narration_start_seconds`
 * decides when it scan-lines onto the canvas. Connections draw as SVG
 * paths (strokeDasharray sweep) when the narrator describes them. When
 * narration is currently on a particular module, that module zooms in
 * by 8% with a slight cyan glow; everything else dims and recedes.
 *
 * Layout is a deterministic anchored circle: the first module (the entry
 * point) sits at center; subsequent modules orbit around it on a circle.
 * For repos with too many modules to fit on a single ring, modules
 * 9+ get a second outer ring. Two-ring layout keeps the visual readable.
 */
const FPS = 30;
const ENTRY_RADIUS_ATTRACTOR = 0;

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
  const dataFlows = data.data_flows ?? [];

  // Position each module. Module 0 = center. Modules 1-6 = inner ring.
  // Modules 7+ = outer ring.
  const placements = useMemo<Placement[]>(() => {
    const boxW = 320;
    const boxH = 140;
    const cx0 = width / 2;
    const cy0 = height / 2 + 30;
    const innerR = 360;
    const outerR = 580;
    return modules.map((_, index) => {
      if (index === ENTRY_RADIUS_ATTRACTOR) {
        return {
          x: cx0 - boxW / 2,
          y: cy0 - boxH / 2,
          cx: cx0,
          cy: cy0,
          width: boxW,
          height: boxH,
        };
      }
      const ringIndex = index <= 6 ? index : index - 6;
      const ringCount = index <= 6 ? Math.min(modules.length - 1, 6) : Math.max(1, modules.length - 7);
      const radius = index <= 6 ? innerR : outerR;
      // -90deg start so module 1 lands at the top
      const theta = -Math.PI / 2 + (2 * Math.PI * (ringIndex - 1)) / Math.max(1, ringCount);
      const mx = cx0 + radius * Math.cos(theta);
      const my = cy0 + radius * Math.sin(theta);
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

  // Convert narration_start_seconds to the frame at which a module/connection
  // begins to appear. Falls back to a sensible default if missing.
  const moduleStartFrames = useMemo(() => {
    return modules.map((m, index) => {
      const s = m.narration_start_seconds;
      if (typeof s === "number" && s >= 0) {
        return Math.max(30, Math.round(s * FPS) + 30);
      }
      // Default: stagger every 30 frames (~1s), with a 30-frame intro
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
  // whose narration_start_seconds is in the past. Drives the zoom + dim.
  const activeIndex = useMemo(() => {
    let active = -1;
    for (let i = 0; i < moduleStartFrames.length; i++) {
      if (frame >= moduleStartFrames[i] + 12) active = i;
    }
    return active;
  }, [moduleStartFrames, frame]);

  // Header
  const titleOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [14, 28], [0, 1], { extrapolateRight: "clamp" });

  // Camera zoom toward the active module
  const activePlacement = activeIndex >= 0 ? placements[activeIndex] : null;
  const focusZoomTarget = activePlacement
    ? {
        scale: 1.08,
        translateX: (width / 2 - activePlacement.cx) * 0.18,
        translateY: (height / 2 - activePlacement.cy) * 0.18,
      }
    : { scale: 1.0, translateX: 0, translateY: 0 };
  const zoomSpring = spring({
    frame: frame - 60,
    fps,
    config: { damping: 26, stiffness: 60 },
  });
  // Always settle toward the current target. The spring just smooths the
  // transitions between different active modules.
  const cameraScale = 1.0 + (focusZoomTarget.scale - 1.0) * zoomSpring;
  const cameraTx = focusZoomTarget.translateX * zoomSpring;
  const cameraTy = focusZoomTarget.translateY * zoomSpring;

  return (
    <AbsoluteFill>
      <BackgroundGrid />
      <Particles count={20} seed={modules.length * 41 + 1} speed={0.8} />
      <FocusGlow x={50} y={55} radius={70} intensity={0.07} />

      {/* Title strip */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: FONT_DISPLAY,
        }}
      >
        <div
          style={{
            opacity: titleOpacity,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
          }}
        >
          Architecture
        </div>
        <div
          style={{
            opacity: subtitleOpacity,
            marginTop: 10,
            fontSize: 22,
            color: COLORS.cyan,
            textTransform: "capitalize",
            fontFamily: FONT_MONO,
            letterSpacing: 4,
          }}
        >
          {data.hint ?? "modules"}
        </div>
      </div>

      <CameraMove pan="left" intensity={0.4}>
        {/* The zoom layer wraps both the SVG arrows and the module boxes so
            they zoom together — no parallax between the diagram and its
            connections. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translate3d(${cameraTx}px, ${cameraTy}px, 0) scale(${cameraScale})`,
            transformOrigin: "50% 55%",
          }}
        >
          {/* SVG connection layer */}
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

              // Path = quadratic curve. Control point pulled toward center
              // so arrows arc rather than cut straight across modules.
              const midX = (a.cx + b.cx) / 2;
              const midY = (a.cy + b.cy) / 2;
              const ctrlPullX = (width / 2 - midX) * 0.25;
              const ctrlPullY = (height / 2 + 30 - midY) * 0.25;
              const path = `M ${a.cx} ${a.cy} Q ${midX + ctrlPullX} ${midY + ctrlPullY}, ${b.cx} ${b.cy}`;

              // Approximate path length (chord length is close enough for
              // strokeDasharray pacing). Animate the dash offset from full
              // length to 0 to make the line "draw."
              const dashLength = Math.max(
                400,
                Math.round(Math.hypot(b.cx - a.cx, b.cy - a.cy) * 1.4),
              );
              const drawProgress = interpolate(
                frame,
                [startFrame, startFrame + 16],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              );
              const opacity = interpolate(
                frame,
                [startFrame, startFrame + 8],
                [0, 0.55],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              );

              return (
                <g key={`conn-${i}`}>
                  <path
                    d={path}
                    stroke={COLORS.cyan}
                    strokeOpacity={opacity}
                    strokeWidth={1.5}
                    strokeDasharray={dashLength}
                    strokeDashoffset={dashLength * (1 - drawProgress)}
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Arrowhead at the destination, fading in once the path
                      finishes drawing. */}
                  {drawProgress > 0.85 && (
                    <circle
                      cx={b.cx}
                      cy={b.cy}
                      r={4}
                      fill={COLORS.cyan}
                      opacity={(drawProgress - 0.85) / 0.15}
                    />
                  )}
                </g>
              );
            })}

            {/* Data-flow particle traces — small dots travel along chained
                paths in sequence when the narrator describes a flow. */}
            {dataFlows.map((flow, i) => {
              const flowStart = flow.narration_seconds
                ? Math.round(flow.narration_seconds * FPS) + 30
                : 120 + i * 30;
              return flow.path.slice(0, -1).map((fromId, j) => {
                const toId = flow.path[j + 1];
                const fromIdx = modules.findIndex((m) => m.id === fromId);
                const toIdx = modules.findIndex((m) => m.id === toId);
                if (fromIdx < 0 || toIdx < 0) return null;
                const a = placements[fromIdx];
                const b = placements[toIdx];
                const segStart = flowStart + j * 12;
                const segProgress = interpolate(
                  frame,
                  [segStart, segStart + 20],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                );
                const px = a.cx + (b.cx - a.cx) * segProgress;
                const py = a.cy + (b.cy - a.cy) * segProgress;
                const dotOpacity = interpolate(
                  frame,
                  [segStart, segStart + 4, segStart + 16, segStart + 20],
                  [0, 1, 1, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                );
                return (
                  <circle
                    key={`flow-${i}-${j}`}
                    cx={px}
                    cy={py}
                    r={5}
                    fill={COLORS.cyan}
                    opacity={dotOpacity}
                    style={{ filter: `drop-shadow(0 0 8px ${COLORS.cyan})` }}
                  />
                );
              });
            })}
          </svg>

          {/* Module boxes */}
          {modules.map((module, index) => {
            const place = placements[index];
            const start = moduleStartFrames[index];
            const enter = spring({
              frame: frame - start,
              fps,
              config: SETTLE,
            });
            const isActive = activeIndex === index;
            const isAfterEntry = frame >= start + 12;
            const pulseScale = isActive && isAfterEntry ? pulse(frame, fps) : 1;
            const baseOpacity = interpolate(enter, [0, 1], [0, 1]);
            const dim = isActive
              ? 1
              : activeIndex >= 0 && isAfterEntry
                ? 0.55
                : baseOpacity;
            const opacity = isAfterEntry ? dim : baseOpacity;
            const liftScale = isActive ? 1.06 : 1;
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
                  transform: `scale(${liftScale * pulseScale})`,
                  transformOrigin: "center center",
                  zIndex: isActive ? 5 : 2,
                }}
              >
                <ScanLineReveal startFrame={start} durationFrames={14} height={place.height}>
                  <div
                    style={{
                      width: place.width,
                      height: place.height,
                      borderRadius: 18,
                      padding: "16px 22px",
                      background: "rgba(20,20,28,0.9)",
                      border: `1px solid ${isActive ? COLORS.cyan : "rgba(255,255,255,0.12)"}`,
                      boxShadow: isActive
                        ? `0 0 48px -8px ${COLORS.cyan}, inset 0 0 0 1px rgba(0,240,255,0.16)`
                        : `0 0 24px -16px rgba(0,0,0,0.6)`,
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
                        fontSize: 24,
                        fontWeight: 700,
                        color: isActive ? COLORS.text : "rgba(245,245,240,0.9)",
                        lineHeight: 1.1,
                      }}
                    >
                      {label}
                    </div>
                    {filePath && (
                      <div
                        style={{
                          marginTop: 8,
                          fontFamily: FONT_MONO,
                          fontSize: 13,
                          color: isActive
                            ? COLORS.cyan
                            : "rgba(245,245,240,0.45)",
                          letterSpacing: 0.5,
                          // Subtle pulse on the file-path when this module is
                          // the active one. Tied to the same pulse helper so
                          // the box and its file path breathe in sync.
                          opacity: isActive ? 0.6 + 0.4 * (pulseScale - 1) * 50 : 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {filePath}
                      </div>
                    )}
                    {module.role && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 14,
                          color: "rgba(245,245,240,0.55)",
                        }}
                      >
                        {module.role}
                      </div>
                    )}
                  </div>
                </ScanLineReveal>
              </div>
            );
          })}
        </div>
      </CameraMove>

      <Watermark />
    </AbsoluteFill>
  );
};
