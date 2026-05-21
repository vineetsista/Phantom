import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Reveal text one character at a time. Defaults: ~30 ms per character at
 * 30 fps (1 char per frame). For "important" headlines pass a smaller
 * `msPerChar` (e.g. 24) for snappier feel; for atmospheric prologue text
 * try 48+.
 *
 * The cursor blinks at 2 Hz while typing and persists for 12 frames after
 * the text completes, then disappears so it doesn't compete with downstream
 * elements that fade in.
 */
export const TypewriterText: React.FC<{
  text: string;
  startFrame?: number;
  msPerChar?: number;
  showCursor?: boolean;
  cursorColor?: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({
  text,
  startFrame = 0,
  msPerChar = 32,
  showCursor = true,
  cursorColor = "#00F0FF",
  className,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const framesPerChar = Math.max(1, Math.round((msPerChar / 1000) * fps));
  const relFrame = Math.max(0, frame - startFrame);
  const reveal = Math.min(text.length, Math.floor(relFrame / framesPerChar));
  const visible = text.slice(0, reveal);
  const done = reveal >= text.length;

  // Blink cursor at 2 Hz; hide cursor 12 frames after text completes.
  const cursorFrame = Math.max(0, frame - startFrame);
  const halfPeriodFrames = Math.max(1, Math.round(fps / 4));
  const blink = Math.floor(cursorFrame / halfPeriodFrames) % 2 === 0;
  const stillVisible = !done || frame - startFrame - text.length * framesPerChar < 12;
  const cursorOpacity = showCursor && stillVisible ? (blink ? 1 : 0) : 0;

  return (
    <span className={className} style={style}>
      {visible}
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: "0.55ch",
          marginLeft: "0.05ch",
          color: cursorColor,
          opacity: cursorOpacity,
        }}
      >
        ▍
      </span>
    </span>
  );
};
