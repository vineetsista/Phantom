# Voice A/B test — v2 (Brian baseline) → v3 (per-punctuation prosody)

Iteration after the v2 cut still felt monotone. The user note: "the voice
is bareable, most of it is fixed, but it still talks like a robot
almost." This iteration pushes further on three axes — break variety,
voice_settings, and a side-by-side comparison against Antoni and Sam.

## What changed

1. **Preprocessor: per-punctuation breaks.** The v2 cut inserted a single
   250ms break between sentences. The v3 cut varies by context:

   | Context | Break length |
   |---|---|
   | End of paragraph / final sentence | 500 ms |
   | Sentence ending mid-paragraph (`.!?` + space + capital) | 350 ms |
   | Colon (before an explanation) | 250 ms |
   | Em-dash | 200 ms |
   | Semicolon | 200 ms |
   | Comma | 150 ms |

   Lives in `_preprocess_narration` in `backend/services/voice_generator.py`.
   Verified output on the test paragraph:

   ```
   navigator.onLine lies. <break time="350ms"/> It tells you...,
   <break time="150ms"/> not that... accessible. is-online solves the
   actual problem: <break time="250ms"/> by racing... that answers
   <break time="200ms"/> D N S at OpenDNS, <break time="150ms"/>
   the public IP service, ... First success wins. <break time="350ms"/>
   Steal the idea, <break time="150ms"/> not the library.
   <break time="500ms"/>
   ```

2. **Voice settings: nudged toward expressive.** New default:

   ```python
   {
       "stability": 0.30,       # was 0.40 — more variation, less monotone
       "similarity_boost": 0.80,# was 0.75 — tightens speaker identity
       "style": 0.35,           # was 0.20 — adds personality
       "use_speaker_boost": True,
   }
   ```

3. **SSML `<emphasis>` was NOT added.** ElevenLabs documents `<break>` as
   officially supported but `<emphasis>` is not honored consistently on
   `eleven_turbo_v2_5`. Adding it produces silent strings in the audio,
   not emphasis. The prosody work above achieves the same goal via
   structural pauses.

## A/B grid (12 samples)

All samples are 25-second renderings of the same test paragraph
(`backend/scripts/voice_ab.py`):

> "navigator.onLine lies. It tells you you're connected to a network,
> not that the internet is accessible. is-online solves the actual
> problem: by racing four real checks against the live internet and
> returning the first one that answers — DNS at OpenDNS, the public
> IP service, Apple's captive portal test, and Cloudflare. First
> success wins. Steal the idea, not the library."

After preprocessing (see above), then synthesized with each
(voice, settings) combo. Files in `output/voice-ab/`:

| | baseline (v2) | combo A — subtle | combo B — dramatic | combo C — steady |
|---|---|---|---|---|
| **Settings** | stab=0.40, sim=0.75, sty=0.20 | stab=0.30, sim=0.80, sty=0.35 | stab=0.25, sim=0.85, sty=0.45 | stab=0.50, sim=0.75, sty=0.30 |
| **Brian** (current default, `nPczCjzI2devNBz1zQrb`) | `brian__baseline_v2.mp3` | `brian__combo_A_subtle.mp3` ← v3 default | `brian__combo_B_dramatic.mp3` | `brian__combo_C_steady.mp3` |
| **Antoni** (`ErXwobaYiN019PkySvjV`) | `antoni__baseline_v2.mp3` | `antoni__combo_A_subtle.mp3` | `antoni__combo_B_dramatic.mp3` | `antoni__combo_C_steady.mp3` |
| **Sam** (`yoZ06aMxZJJ28mfd3POQ`) | `sam__baseline_v2.mp3` | `sam__combo_A_subtle.mp3` | `sam__combo_B_dramatic.mp3` | `sam__combo_C_steady.mp3` |

### How to listen

Open `output/voice-ab/` in a file manager and play them back-to-back.
The signal you're looking for is:
- **Sentence-level rhythm.** Does the voice pause where a person would?
- **Lean-in moments.** Do "First success wins" or "Steal the idea" carry weight?
- **Steadiness.** Lower stability (combo B) gives more variation but can drift; higher (combo C) can flatten the lean-ins.
- **Personality.** Higher style (B > A > C > baseline) sounds more like a person, but at higher values can sound like an actor doing a voice.

Brian + combo A is the chosen default — modest expressiveness without
theatrics, identity stays tight across long-form. If you prefer Antoni
combo A or Sam combo A, change `DEFAULT_ELEVENLABS_VOICE_ID` in `.env`
to that ID and redeploy. Settings live in `voice_generator._ELEVENLABS_DEFAULTS`.

### Cost note

The A/B grid is 12 samples × ~25 s, which on `eleven_turbo_v2_5` is
roughly 8000 chars × $0.30/1k = $2.40. Cheap. Generate it again
(`docker exec phantom-worker-1 python /app/scripts/voice_ab.py`) any
time you want to compare against a future voice.

## What to listen for in the next full generation

After this commit lands, generate is-online again. The opener should
have a real pause between "navigator.onLine lies." and "It tells you" —
not a slam-cut. The colon before "by racing four real checks" should
give a small breath. The em-dash should be a beat, not a comma. If any
of those still feel mashed together, the break tags aren't being
honored — file a bug.
