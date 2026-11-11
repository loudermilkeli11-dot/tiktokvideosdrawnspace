# Invisible Journeys Studio: map (WORK IN PROGRESS, paused)

Phase 0 is partly built. Nothing below has been checked end to end with a full render yet.
- `engine/src/`: three.js r169 engine. `engine.js` (studio, deterministic `frame(t)`, sub-frame motion blur), `post.js` (bloom/ACES/grain),
  `camera.js` (lens mm, eased paths, shake), `moon.js` (LROC+LOLA, Lommel-Seeliger, horizon-march shadows), `sky.js`, `ocean.js` (Gerstner + planar reflection),
  `bay.js` (horseshoe-bay set, town windows, lamps, pier, boats, lighthouse; redesign not yet test-rendered), `crowd.js` (crowd, hero, birds).
- `engine/tex/`: processed NASA/Poly Haven textures. `tools/process_textures.py` rebuilds them.
- `tools/`: `build_page.py` (shot -> one HTML), `render.js`/`run.sh` (headless -> MP4), `frames.js` (key frames),
  `overlay/` (captions + counter), `score.py`, `assemble.sh`, `check.py` (see the docstrings).
- Not done: `tools/audio.js` + `engine/src/audio_core.js`, `tools/cloud/`, PLAYBOOK.md, the setup script, and the 3 s proof render.
- Shots import `@engine/<module>.js` and `three`. Page time t = shot time + 4. Use `?scale=0.5&mb=1` for fast iteration.
- `.war-room/roster.yaml`: TikTok officers for `/war-room` (pick "Saved roster"). `channel/results.csv` is the post-stats log.
