import React from "react";
import { Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Background music bed. Mixes ~-24 dB under the narration (linear amplitude
 * 0.063) so the voiceover stays foreground. Fades in over the first second
 * and out over the last second so the music never starts or stops abruptly.
 *
 * The track is loop-friendly; if the file is shorter than the composition
 * Remotion will loop it automatically when `loop` is set.
 */

const TARGET_LEVEL = 0.063; // -24 dB
const FADE_FRAMES = 30; // ~1 second at 30 fps

export const MusicBed: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, FADE_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - FADE_FRAMES, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const envelope = Math.min(fadeIn, fadeOut);

  // staticFile() also accepts already-absolute file:// URLs (the Python side
  // may pass one) — we let it through unmodified in that case.
  const resolved = src.startsWith("file://") || src.startsWith("http")
    ? src
    : staticFile(src);

  return <Audio src={resolved} volume={envelope * TARGET_LEVEL} loop />;
};
