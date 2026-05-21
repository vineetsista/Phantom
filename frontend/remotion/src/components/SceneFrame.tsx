import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

/**
 * Wraps a scene's visual content in a 6-frame opacity ramp at the start and
 * end of its sequence. Audio children are unaffected — they don't render to
 * pixels, so the fade only ever applies to the visuals.
 *
 * Soft cuts beat hard cuts at 30 fps; six frames is 0.2 s, just enough that
 * the eye reads it as motion rather than a flicker.
 */

const FADE_FRAMES = 6;

export const SceneFrame: React.FC<{
  durationInFrames: number;
  children: React.ReactNode;
}> = ({ durationInFrames, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, FADE_FRAMES, Math.max(0, durationInFrames - FADE_FRAMES), durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};
