"""Generate voice samples for the v2 A/B test.

Produces a flat directory of small MP3s, one per (voice, settings) combo, all
synthesizing the same 25-second test paragraph. The paragraph is chosen to
exercise the prosody surface — a hook, a mid-paragraph period, a colon, an
em-dash, a comma, a punchline.

Output: ./output/voice-ab/<combo>.mp3 + summary.txt.

Run with the ElevenLabs key in env:

    docker exec phantom-worker-1 python /app/scripts/voice_ab.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

import httpx

# Make `services` importable when run as a script inside the worker container.
sys.path.insert(0, "/app")

from services.voice_generator import _preprocess_narration  # noqa: E402

VOICES = {
    "brian": "nPczCjzI2devNBz1zQrb",   # current default
    "antoni": "ErXwobaYiN019PkySvjV",  # warmer male; user-requested A/B
    "sam":   "yoZ06aMxZJJ28mfd3POQ",   # crisp male; user-requested A/B
}

# Three voice_settings combos from the user's brief, plus the previous default
# as a baseline reference.
COMBOS = {
    "baseline_v2":     {"stability": 0.40, "similarity_boost": 0.75, "style": 0.20, "use_speaker_boost": True},
    "combo_A_subtle":  {"stability": 0.30, "similarity_boost": 0.80, "style": 0.35, "use_speaker_boost": True},
    "combo_B_dramatic":{"stability": 0.25, "similarity_boost": 0.85, "style": 0.45, "use_speaker_boost": True},
    "combo_C_steady":  {"stability": 0.50, "similarity_boost": 0.75, "style": 0.30, "use_speaker_boost": True},
}

# The test paragraph exercises every prosody beat we care about.
TEST_TEXT = (
    "navigator.onLine lies. It tells you you're connected to a network, "
    "not that the internet is accessible. is-online solves the actual problem: "
    "by racing four real checks against the live internet and returning the "
    "first one that answers — DNS at OpenDNS, the public IP service, Apple's "
    "captive portal test, and Cloudflare. First success wins. Steal the idea, "
    "not the library."
)


def synthesize(voice_id: str, settings: dict[str, Any], text: str, model_id: str) -> bytes:
    api_key = os.environ.get("ELEVENLABS_API_KEY") or ""
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY not set in environment")
    response = httpx.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        json={"text": text, "model_id": model_id, "voice_settings": settings},
        timeout=60,
    )
    response.raise_for_status()
    return response.content


def main() -> None:
    out_dir = Path("/app/output/voice-ab")
    out_dir.mkdir(parents=True, exist_ok=True)
    prepared = _preprocess_narration(TEST_TEXT)
    summary: list[str] = [
        "Voice A/B samples for v2 quality pass.",
        "",
        f"Test paragraph (raw): {TEST_TEXT}",
        "",
        f"After preprocessing: {prepared}",
        "",
        "Combos × voices:",
    ]
    for voice_name, voice_id in VOICES.items():
        for combo_name, settings in COMBOS.items():
            slug = f"{voice_name}__{combo_name}.mp3"
            try:
                audio = synthesize(voice_id, settings, prepared, "eleven_turbo_v2_5")
            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code if exc.response is not None else 0
                msg = f"  SKIP {slug}: HTTP {status}"
                print(msg)
                summary.append(msg)
                continue
            (out_dir / slug).write_bytes(audio)
            ok = f"  ok   {slug}  ({len(audio)} bytes)"
            print(ok)
            summary.append(ok)
    (out_dir / "summary.txt").write_text("\n".join(summary), encoding="utf-8")
    print(f"\nWrote {out_dir}/summary.txt")


if __name__ == "__main__":
    main()
