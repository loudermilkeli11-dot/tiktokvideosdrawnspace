# Invisible Journeys Studio: map

Code-rendered what-if TikToks. Read PLAYBOOK.md for the formula, look bar, caption style and rules. The owner is the Commander.

## Engine (`engine/src/`, three.js r169; `engine/tex/` holds processed NASA/Poly Haven textures)
- `engine.js`: studio, deterministic `frame(t)` (page time t = shot time + 4), sub-frame motion blur, `?scale=0.5&mb=1` for fast iteration.
- `post.js`: bloom, ACES, grain, vignette.
- `camera.js`: lenses in mm, eased paths, shake, whip.
- `moon.js`: LROC + LOLA, Lommel-Seeliger, terminator shadows, earthshine, haze, airlight.
- `sky.js`: dusk/night sky, Belt of Venus, stars, Milky Way.
- `ocean.js`: Gerstner waves, planar reflection, surf.
- `bay.js`: horseshoe-bay set: town windows, lamps, orientable plank pier, boats, lighthouse.
- `figure.js`: organic people from signed distance fields; pose with `POSES` hand targets.
- `crowd.js`: crowd, hero and birds, all built on figure.js.
- `audio_core.js`: shot sound kit (surf, rumble, crowd, gasp, mid-range `hit`, whoosh, siren…) plus `renderSound`.

## Tools (`tools/`)
- `build_page.py`: shot.js → one HTML, plus `<shot>_sound.html`.
- `frames.js`: key frames.
- `render.js` / `run.sh`: render a page to MP4 with 2 renderers.
- `audio.js`: render a sound page to WAV.
- `overlay/`: captions + counter → overlay.mov. `stylelab.*` holds the style options.
- `score.py`: ticks, risers, braaams, cracks, the big hit, silences.
- `assemble.sh`: produces final.mp4 at −14 LUFS.
- `check.py`: contact sheets plus checks for frames, size, loudness, flashes, jumps, cut hits (above 200 Hz) and silence.
- `cloud/`: `snapshot.sh` (pages → `render` branch) → `plan.py` (chunks + worker prompts) → `create_session` per chunk (source_revision `render`, clone_depth 1, model claude-fable-5-2) → `collect.sh` → `join.sh`. Proven: about 2 min for 6 frames; cloud and local frames match.
- Measured speed: about 9 s per frame alone, or about 18 s per frame with 2 renderers in parallel, at full size with 4 samples (hook shot).

## Projects
- `projects/moon-2x/`: video #1, from the sealed dossier `channel/war-room/2026-11-11-first-video.md`.
  - `src/story.js` is the ONE approach law: the gap halves every 5 s, continuously. Shots and the counter both read it.
  - Only `s01_hook` (3 s) exists. Still to do: the board for the 12 rungs, the remaining shots, the space-ending set, and the full score cue sheet.

## War Room
- `war-room/`: Node app (Agent SDK) for the Commander's Windows PC. To install, run `war-room/War Room Setup.cmd`.
- `.war-room/roster.yaml`: the TikTok officers for `/war-room`. Dossiers go to `channel/war-room/`.
- `channel/results.csv`: the post-stats log.

## Environment
- The setup script runs `npm ci` in `engine/` (saved 2026-11-11). It hasn't been run by a fresh session yet.
