import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function isValidGitHubUrl(value: string): boolean {
  return /^https?:\/\/github\.com\/[\w.\-]+\/[\w.\-]+\/?(?:\.git)?$/.test(value.trim());
}

/** Render-pipeline constants. Must match SCENE_TRAILING_BUFFER_S /
 *  SCENE_TRANSITION_S in frontend/remotion/src/types.ts. If you change one,
 *  change the other in the same commit — a 30-second chapter-marker drift
 *  bug shipped exactly because these two sides disagreed. */
export const SCENE_TRAILING_BUFFER_S = 1.0;
export const SCENE_TRANSITION_S = 0.3;

interface SectionLike {
  id: string;
  audio_duration_seconds?: number;
  duration_seconds?: number;
}

/**
 * Compute the absolute start time in seconds of each section, matching the
 * Remotion composition's Sequence placement math exactly:
 *
 *   scene_n_duration = (audio_duration_seconds || duration_seconds) + buffer
 *   scene_n_start    = sum(scene_0..n-1 durations) − n × transition_overlap
 *
 * Falling back to the estimate (`duration_seconds`) preserves correctness
 * for old DB rows written before the worker started measuring real audio.
 */
export function sectionStartTimes(
  sections: SectionLike[],
  bufferS = SCENE_TRAILING_BUFFER_S,
  transitionS = SCENE_TRANSITION_S,
): { id: string; startSeconds: number; durationSeconds: number }[] {
  // cursor IS the start time of the next scene — matches PhantomVideo's
  // placement loop (`from = cursor; cursor += frames - transitionFrames`).
  let cursor = 0;
  return sections.map((section) => {
    const audio = section.audio_duration_seconds ?? section.duration_seconds ?? 10;
    const sceneDuration = audio + bufferS;
    const startSeconds = cursor;
    cursor += sceneDuration - transitionS;
    return { id: section.id, startSeconds, durationSeconds: sceneDuration };
  });
}
