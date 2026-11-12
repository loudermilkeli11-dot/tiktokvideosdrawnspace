# Invisible Journeys Studio: map

Code-rendered what-if TikToks. Read PLAYBOOK.md for the formula, look bar, caption style and rules. The owner is the Commander.

## Engine (`engine/src/`, three.js r169; `engine/tex/` holds processed NASA/Poly Haven textures)
- **`engine/API.md`**: the verified cheat sheet of every module (signatures, options, units, update calls, shot/sound skeletons, recipes, pitfalls). Builders read it instead of the sources.
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
- `city.js`: sunny downtown set: roads with kerbs and crossings, glass/stone towers, cars, trees, lamps, props, a fountain; `update(t, {lift, tumble, waterLift})`.
- `planes.js` (generic airliner, nose −Z), `clouds.js` (cloud deck from above), `iss.js` (generic station), `shell.js` (oceans/air lifting off as shells), `storm.js` (meteor storm from orbit), `splash.js` (lifted sea, seabed, boats, spray), `fire.js` (flames, no smoke).
- `sky.js`, `ocean.js` and `space.js` carry extra modes (see-through, lava, slab sea, seabed, surf, scar…), all off by default.

## Tools (`tools/`)
- `build_page.py`: shot.js → one HTML, plus `<shot>_sound.html`.
- `frames.js`: key frames.
- `render.js` / `run.sh`: render a page to MP4 with 2 renderers. All render tools start Chromium through `browser.js`: SwiftShader by default, the real graphics card with `IJ_GPU=1` (never mix the two inside one shot). `gpu_check.js` prints which chip renders and times frames.
- `audio.js`: render a sound page to WAV.
- `overlay/`: captions + counter → overlay.mov. `stylelab.*` holds the style options.
- `score.py`: ticks, risers, braaams, cracks, the big hit, silences.
- `assemble.sh`: produces final.mp4 at −14 LUFS.
- `check.py`: contact sheets plus checks for frames, size, loudness, flashes (upward jumps only), jumps, cut hits (above 200 Hz), silence and text contrast (A4, ≥ 3:1 after yuv420p). `--contrast overlay.mov --bg clean.mp4 --every 0.2` checks type before assembly.
- `overlay/`: Studio v2 look (`style: {look: 'v2'}`); any title, caption or counter item takes `band` for a stronger backing band over bright picture.
- `render_all.js`: the whole render pipeline for a built project on any OS (pages → shots + sound → score → captions → assemble → QC), `--quality draft|standard|max` (max = 16 sub-samples, 95 MB target, under the 100 MB QC cap), `--shots a,b`, `--reuse` (skip shots unchanged since their last render at that quality), `--jobs N` (2 on the GPU); captions are rendered and safe-area-checked first (`check.py --safe`); prints STEP/PROGRESS/RESULT lines. `pc/render_project.ps1` and the War Room's Studio tab both call it.
- `cloud/`: `RENDER_BRANCH=render-<x> snapshot.sh` (pages → a per-batch branch, so batches can run while others build) → `plan.py --chunk N --shots a,b` (chunks + worker prompts) → `create_session` per chunk (source_revision `render`, clone_depth 1, model claude-fable-5-2) → `collect.sh` → `join.sh`. Proven: about 2 min for 6 frames; cloud and local frames match.
- Commander's PC (Dragon1, Intel Iris Xe, D3D11): 0.10 s per frame on gravity-flip s07 with `IJ_GPU=1` (2026-11-11), vs about 9 s in the cloud. Prefer it for renders: the Commander runs `.\pc\render_project.ps1 <slug>` in PowerShell (pull, build, GPU render, sound, score, captions, assemble, QC; `-Shots a,b` for a partial redo). Push the project to `main` first.
- Measured speed (cloud CPU): about 9 s per frame alone, or about 18 s per frame with 2 renderers in parallel, at full size with 4 samples (hook shot).

## Projects
- `projects/moon-2x/`: video #1, from the sealed dossier `channel/war-room/2026-11-11-first-video.md`.
  - `src/story.js` is the ONE approach law: the gap halves every 5 s, continuously. Shots and the counter both read it.
  - v1 is DONE (2026-11-11): 13 shots, 66.0 s. The final is on the `videos` branch (`moon-2x/moon-2x_v1.mp4`).
  - Board: `script.md`. Kit: `src/kit.js`. Overlay: `overlay.js`. Score: `score.json`. Builder brief: `BUILDERS.md`. Hand-overs: `FINAL/`.
  - Known weak spots: the ring arch (s10/s11) looks like a striped beam; the chunks' inner faces are smooth; the early Moon is small (s03/s04).

- `projects/gravity-flip/`: video #2, "What if gravity flipped for 5 seconds?" → 1 minute → 10 minutes. Studio v2 format: 11 shots, 38.0 s.
  - `src/story.js` is the law (reversed inverse-square gravity for T seconds, integrated tables); the shots, the counter and the captions all read it.
  - Lead city kit: `src/citykit.js`. Board: `script.md`. Builder brief: `BUILDERS.md`. Hand-overs: `FINAL/`.
  - v1 is DONE (2026-11-11). The final is on the `videos` branch (`gravity-flip/gravity-flip_v1.mp4`).

## Commander
- Time zone: US Central. Give every ETA in CST/CDT, and never promise one you can't keep.
- Rendering on the Commander's PC is free. Setup: `pc/Render PC Setup.cmd` (Git, Node, ffmpeg, Python, the repo at `D:\ClaudeStudio`, the Commander's studio folder, renderer, GPU check, stay-awake). Their desktop app has no Remote Control setting (2026-11-11), so cloud sessions can't reach the PC: GPU work runs in a Claude Code session on the PC itself (desktop app, or `claude remote-control` there to drive it from the phone). Re-check `list_computer_folders` now and then. On Windows, use `py` for Python.

## War Room
- Sealed dossiers live in `channel/war-room/`: the first video, and the channel strategy (2026-11-11). The strategy covers the sky lane, fact-with-number covers, 34 s by default, and Gates A and B on 2026-11-13.
- `war-room/`: Node app for the Commander's Windows PC. PLAN mode (default): agents run through Claude Code on the PC, on the Claude plan (no API key); weighted slots (Haiku 0.5, Sonnet 1, Opus 2, 6 total), a usage cap at 80% of the plan's real 5-hour window (read from Claude Code's rate_limit_event; running work pauses/re-queues, resumes after the reset; WARROOM_PLAN_CAP), Deep (Opus) per order. **Studio tab:** greenlight → the Producer writes `projects/<slug>/PRODUCTION.md` → the Commander approves → the **Director** agent builds it (8+ shots: lead skeleton/kit/split → 3 parallel **Builders** → Director integrates and does the consistency pass) → `render_all.js` renders on the GPU (max quality) → QC (one auto-fix round) → the film plays in the app. **👥 Team** orders: the Producer plans NOW/THEN tasks for several agents in parallel, then writes one answer. Studio ETAs learn from real runs (`war-room/data/calib.json`). **Phone alerts:** Telegram bot (Memory tab; `lib/notify.js`): approvals with buttons, done, failures, usage pauses; `/status /approve /reject /resume` from the linked chat only; a finished video is sent to the phone as `out/tiktok.mp4` (≤ 45 MB, made by render_all) with the caption/hashtags/cover from `projects/<slug>/POST.json`. Short orders run **playbooks** (`war-room/playbooks/`: pitch, stats, production, taste). **v3 UI:** side nav (Home · Pitches · Studio · Council · Team · Intel · Teach & settings); pitches are JSON (`pitches/<date>.json`) shown as cards with 🎬 Greenlight / 👍 / 👎; votes and taught rules go to `channel/feedback.jsonl` and `channel/TASTE.md` (the taste profile every agent reads with the brain; the Analyst re-distills it every 5 votes); pitch research is cached per day in `channel/research/<date>.md`. To install, run `war-room/War Room Setup.cmd`; to force a restart, `war-room/Restart War Room.cmd`.
- `.war-room/roster.yaml`: the TikTok officers for `/war-room`. Dossiers go to `channel/war-room/`.
- `channel/results.csv`: the post-stats log. `channel/BRAIN.md`: the channel brain (evidence, the Commander's taste, format, what is cheap to build). Every War Room agent gets it before every task, and the Analyst keeps it current; screenshots dropped in the Intel tab land in `channel/analytics/<date>/` and become an Analyst task.

## Environment
- The setup script runs `npm ci` in `engine/` (saved 2026-11-11). It hasn't been run by a fresh session yet.
