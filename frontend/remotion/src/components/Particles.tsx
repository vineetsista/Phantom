import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { COLORS } from "../types";

/**
 * Subtle floating particles drifting upward at varying speeds + sizes. Built
 * with a deterministic seed so two renders of the same scene produce the
 * same particle layout — never a flicker between renders, never a non-
 * deterministic frame in the output.
 *
 * Reads as atmosphere, not content. Total opacity is low; intentionally
 * doesn't pull focus away from typography or code.
 */

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const Particles: React.FC<{
  count?: number;
  seed?: number;
  color?: string;
  /** Speed multiplier; 1 = leisurely drift, 2 = faster. */
  speed?: number;
}> = ({ count = 36, seed = 42, color = COLORS.cyan, speed = 1 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const particles = useMemo(() => {
    const rand = mulberry32(seed);
    return Array.from({ length: count }, () => ({
      x: rand() * width,
      yStart: rand() * height + height * 0.5,
      size: 1 + rand() * 3,
      speed: 0.3 + rand() * 0.8,
      hueShift: rand(),
    }));
  }, [count, seed, width, height]);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {particles.map((p, index) => {
        const travel = frame * p.speed * speed;
        const y = ((p.yStart - travel) % (height + 200)) - 100;
        const wrappedY = y < -100 ? y + (height + 200) : y;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: p.x,
              top: wrappedY,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: color,
              opacity: 0.08 + p.hueShift * 0.1,
              boxShadow: `0 0 ${p.size * 4}px ${color}66`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
