PHANTOM — Background music
==========================

The Remotion pipeline looks for an ambient track at:

    frontend/public/music/ambient.mp3

If the file is present, every generated video gets the track mixed at
roughly -24 dB under the narration with a 1-second fade in/out (see
frontend/remotion/src/components/MusicBed.tsx). If it's absent, the
video renders silent-bed, exactly as before.

Two ways to populate the file:

  1. Drop a licensed track (Epidemic Sound / Artlist / your own
     composition) into this folder named ambient.mp3.

  2. Run scripts/generate-ambient.sh to synthesize a placeholder bed
     via ffmpeg. Useful for local previews; not licensed for launch.
