import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Almost-imperceptible camera move applied across the full scene duration:
 * a slow scale up (1.0 → ~1.045) plus a subtle lateral drift. Reads as life
 * rather than the static-frame look that gives away programmatic video.
 *
 * Drop this around any scene's contents:
 *
 *     <CameraMove>
 *       <IntroSceneContents />
 *     </CameraMove>
 *
 * Variants: pass `pan="left"` to drift the opposite direction, or `intensity`
 * to scale the effect — useful for outro shots where you want the move to
 * feel more decisive.
 */
export const CameraMove: React.FC<{
  children: React.ReactNode;
  pan?: "left" | "right";
  intensity?: number;
}> = ({ children, pan = "right", intensity = 1 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Bound the move to the scene's allotted frames so a 10s scene and a 30s
  // scene both end at the same final zoom level, regardless of length.
  const t = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const scale = 1 + 0.045 * intensity * t;
  const driftPx = (pan === "right" ? 1 : -1) * 26 * intensity * t;

  return (
    <AbsoluteFill
      style={{
        transform: `translate3d(${driftPx}px, 0, 0) scale(${scale})`,
        transformOrigin: "50% 50%",
        willChange: "transform",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
