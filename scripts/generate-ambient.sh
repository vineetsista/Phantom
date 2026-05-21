#!/usr/bin/env bash
# Synthesizes a 4-minute placeholder ambient bed at
# frontend/public/music/ambient.mp3 using ffmpeg.
#
# Replace this output with a properly licensed track (Suno, Mubert, Epidemic,
# or your own composition) before launch — this is only here so the music
# infrastructure has something to play while the real track is sourced.
#
# Layered sine drones tuned to a Cmin pad, with a slow LFO on the volume to
# avoid feeling like a test tone. 90 BPM is implied by the gentle envelope
# rather than by a percussive layer.
set -euo pipefail

OUT="$(dirname "$0")/../frontend/public/music"
mkdir -p "$OUT"
TARGET="$OUT/ambient.mp3"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found — install it or drop a real ambient.mp3 into frontend/public/music/" >&2
  exit 1
fi

ffmpeg -y \
  -f lavfi -i "sine=frequency=130.81:duration=240" \
  -f lavfi -i "sine=frequency=196.00:duration=240" \
  -f lavfi -i "sine=frequency=261.63:duration=240" \
  -f lavfi -i "sine=frequency=392.00:duration=240" \
  -filter_complex "
    [0:a]volume=0.18[a0];
    [1:a]volume=0.14[a1];
    [2:a]volume=0.10[a2];
    [3:a]volume=0.07[a3];
    [a0][a1][a2][a3]amix=inputs=4:normalize=0[mixed];
    [mixed]tremolo=f=0.18:d=0.4,
           aecho=0.8:0.85:1000:0.3,
           afade=t=in:st=0:d=4,
           afade=t=out:st=236:d=4[bed]
  " \
  -map "[bed]" -c:a libmp3lame -q:a 4 "$TARGET"

echo "Wrote $TARGET"
