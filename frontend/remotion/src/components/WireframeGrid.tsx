import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import { COLORS } from "../types";

/**
 * Perspective grid that recedes toward a vanishing point. Slowly rotates,
 * extremely low opacity. Sells the sense of a 3D space beneath the 2D
 * diagram.
 *
 * Rendered as SVG so the lines stay crisp at 1920×1080 and we can animate
 * the rotation cheaply via frame-driven transforms.
 */
export const WireframeGrid: React.FC<{
  /** Lines per quadrant. Higher = denser. Default 18. */
  density?: number;
  /** Peak opacity of grid lines. Default 0.05. */
  intensity?: number;
}> = ({ density = 18, intensity = 0.05 }) => {
  const frame = useCurrentFrame();
  // Slow rotation — 0.05° / frame at 30fps = 1.5°/sec.
  const rotate = (frame * 0.05) % 360;

  const lines = Array.from({ length: density });
  const half = density / 2;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", perspective: "1200px" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `rotateX(72deg) rotateZ(${rotate}deg) translateZ(-200px)`,
          transformOrigin: "50% 50%",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="-1000 -1000 2000 2000"
          style={{ overflow: "visible" }}
        >
          {/* Concentric squares receding toward center */}
          {lines.map((_, i) => {
            const r = 60 + i * 70;
            const fade = 1 - i / density;
            return (
              <rect
                key={`s${i}`}
                x={-r}
                y={-r}
                width={r * 2}
                height={r * 2}
                fill="none"
                stroke={COLORS.cyan}
                strokeWidth={0.6}
                strokeOpacity={intensity * fade}
              />
            );
          })}
          {/* Radial spokes */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 360) / 12;
            const rad = (angle * Math.PI) / 180;
            const len = (density + 2) * 70;
            return (
              <line
                key={`r${i}`}
                x1={0}
                y1={0}
                x2={Math.cos(rad) * len}
                y2={Math.sin(rad) * len}
                stroke={COLORS.cyan}
                strokeWidth={0.4}
                strokeOpacity={intensity * 0.8}
              />
            );
          })}
          {/* Horizon glow */}
          <circle
            cx={0}
            cy={0}
            r={half * 70 * 0.6}
            fill="none"
            stroke={COLORS.cyan}
            strokeWidth={1.2}
            strokeOpacity={intensity * 4}
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
