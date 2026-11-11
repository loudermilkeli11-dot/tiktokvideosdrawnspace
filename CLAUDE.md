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
- `breakup.js`: the Moon cut into 12 chunks plus rubble. ALWAYS call `trimBreakup(B)` from `debris.js` (about 6× cheaper).
- `debris.js`: meteors, impact glows, the ring arc from the ground, rubble streams, `trimBreakup`, `hideFromReflection`.
- `space.js`: Earth (day/night/clouds/atmosphere), the debris ring with Earth's shadow, the Sun, stars.
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
  - v1 is DONE (2026-11-11): 13 shots, 66.0 s. The final is on the `videos` branch (`moon-2x/moon-2x_v1.mp4`).
  - Board: `script.md`. Kit: `src/kit.js`. Overlay: `overlay.js`. Score: `score.json`. Builder brief: `BUILDERS.md`. Hand-overs: `FINAL/`.
  - Known weak spots: the ring arch (s10/s11) looks like a striped beam; the chunks' inner faces are smooth; the early Moon is small (s03/s04).

- `projects/sun-gone/`: video #2 (34 s), sealed in `channel/war-room/2026-11-11-channel-strategy.md` with amendment A1.
  - It's an honest countdown: the Sun is gone, but its light is still arriving. The bay stays sunlit for the real light-travel time, then goes dark. No space ending.
  - Board: `script.md`. Law: `src/story.js`.

## War Room
- Sealed dossiers live in `channel/war-room/`: the first video, and the channel strategy (2026-11-11). The strategy covers the sky lane, fact-with-number covers, 34 s by default, and Gates A and B on 2026-11-13.
- `war-room/`: Node app (Agent SDK) for the Commander's Windows PC. To install, run `war-room/War Room Setup.cmd`.
- `.war-room/roster.yaml`: the TikTok officers for `/war-room`. Dossiers go to `channel/war-room/`.
- `channel/results.csv`: the post-stats log.

## Environment
- The setup script runs `npm ci` in `engine/` (saved 2026-11-11). It hasn't been run by a fresh session yet.
