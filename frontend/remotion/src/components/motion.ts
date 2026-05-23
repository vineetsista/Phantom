/**
 * Phantom's motion grammar — the spring configs and interpolation curves
 * every scene shares so the video reads as one piece, not four.
 *
 * Imported by every composition. If you find yourself reaching for a one-off
 * spring config inside a scene, add it here first.
 */

import { spring, interpolate } from "remotion";

/** A spring with a satisfying settle: arrives with a small overshoot, then
 * relaxes. Used for "things landing into their final position" — title
 * letters, module boxes, takeaway cards. */
export const SETTLE = { damping: 12, stiffness: 90 } as const;

/** A faster, harder spring for elements that should snap rather than settle.
 * Used for cursors, highlights, anything micro-interactive. */
export const SNAP = { damping: 18, stiffness: 200 } as const;

/** Grow-in transform: scale from 0.92 → 1.0 with a small upward translate.
 * Pair with `appearOpacity` for the standard "thing appearing" effect. */
export function growIn(frame: number, fps: number, startFrame = 0, cfg = SETTLE) {
  const s = spring({ frame: frame - startFrame, fps, config: cfg });
  const scale = interpolate(s, [0, 1], [0.92, 1.0]);
  const y = interpolate(s, [0, 1], [12, 0]);
  return { scale, y, opacity: interpolate(s, [0, 1], [0, 1]) };
}

/** Standard appear-opacity ramp — 300ms (9 frames at 30fps) from 0 to 1. */
export function appearOpacity(frame: number, startFrame = 0, durationFrames = 9) {
  return interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/** Subtle 1.0 → 1.02 → 1.0 breathing pulse for elements that are currently
 * "active" (the line the narrator is on, the module being mentioned). The
 * period is 1.2s = 36 frames at 30fps. Two-amplitude sine via cosine. */
export function pulse(frame: number, fps: number, amplitude = 0.02, periodSec = 1.2) {
  const t = (frame / fps) / periodSec;
  return 1 + amplitude * 0.5 * (1 - Math.cos(2 * Math.PI * t));
}

/** Cinematic crossfade ramp for content showing/hiding over a short window. */
export function rampInOut(
  frame: number,
  startFrame: number,
  durationFrames: number,
  fadeFrames = 6,
) {
  return interpolate(
    frame,
    [
      startFrame,
      startFrame + fadeFrames,
      startFrame + durationFrames - fadeFrames,
      startFrame + durationFrames,
    ],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
}


// ─── v8 motion grammar additions ──────────────────────────────────────
//
// Restraint reads as polish — Emil's rule. These constants are the
// single source of truth for every scene's timing + camera move. If a
// composition needs a value outside these, the answer is almost
// always to use the existing one instead.

/** SPRING_LANDING — the workhorse "thing arrives at its final position"
 * spring. Aliased to SETTLE so existing call sites don't need to be
 * touched. Use this for: title letters, module boxes, takeaway cards. */
export const SPRING_LANDING = SETTLE;

/** SPRING_PUNCHY — faster, snappier landing. Use for micro-interactive
 * elements (cursors, highlights, scrub markers). */
export const SPRING_PUNCHY = { damping: 12, stiffness: 90 } as const;

/** SPRING_GENTLE — slow, luxurious. Use for camera-style movements
 * (auto-scroll, code-panel pan). The high damping kills any overshoot
 * so the motion reads as deliberate, not springy. */
export const SPRING_GENTLE = { damping: 24, stiffness: 80 } as const;

/** Standard frame counts at 30fps. Convert with fps multiplier in
 * compositions that may render at 60fps. */
export const FADE_IN_FRAMES = 12;
export const FADE_OUT_FRAMES = 8;
export const REVEAL_FRAMES = 20;

/** Camera limits — Emil: restraint is intentional. A 1.04 zoom is
 * enough to feel present without crossing into "fisheye dolly" energy.
 * Translate cap of 30px is per-frame upper bound across the scene. */
export const CAMERA_MAX_ZOOM = 1.04;
export const CAMERA_MAX_TRANSLATE = 30;

/** Custom easing curves. EASE_OUT for "lands and stops" motion; EASE_IN_OUT
 * for "comes from rest, accelerates, decelerates" (camera moves);
 * EASE_DRAWER for sliding panels (Sonner-style — flat acceleration
 * profile, fast settle). */
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
export const EASE_IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";
export const EASE_DRAWER = "cubic-bezier(0.32, 0.72, 0, 1)";

/** Standard fade-in opacity helper. 12 frames at 30fps = 400ms — fast
 * enough not to drag, slow enough that it doesn't feel like a cut. */
export function fadeIn(frame: number, startFrame = 0, durationFrames = FADE_IN_FRAMES) {
  return interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
}

/** Reveal scale — 0.92 → 1.0 over REVEAL_FRAMES. Pair with fadeIn() for
 * the standard "module appears at its final position" effect. */
export function reveal(frame: number, startFrame = 0, durationFrames = REVEAL_FRAMES) {
  return interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0.92, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
}
