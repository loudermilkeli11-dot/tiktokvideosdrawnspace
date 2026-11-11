# Builder brief: moon-2x shots

You are building shots for a code-rendered TikTok video in the repo /home/user/tiktokvideosdrawnspace.
- **Read first:** CLAUDE.md (studio map), PLAYBOOK.md (rules + look bar: obey it), projects/moon-2x/script.md (the board: your shots' rows, captions and sound notes).
- **Reference shot:** `src/s01_hook.js` + `src/s01_hook_sound.js` (finished). See also `stills/s01_frame1_captioned.jpg`.
- **Do not commit or push.** The lead commits. Work only in your own files.

## Your files
- **You own** `projects/moon-2x/src/<shot>.js` and `src/<shot>_sound.js` for your assigned shots.
- **New engine modules:** you may add a NEW file under `engine/src/` only if your brief says so.
- **Do NOT edit** `engine/src/*.js` shared modules, `src/kit.js`, `src/story.js` or tools. If you need a tweak, do it inside your shot file. For example, set uniforms or materials on the objects the kit returns, or use `onBeforeCompile`.

## Contract (every shot)
- **Kit:** import `bayWorld`, `D2R`, `dirThroughScreen` and `SHOT` from `./kit.js`, and `gapKm` / `angRadius` from `./story.js`. Use `createStudio`, `applyCam`, `shake`, `Path`, `whip`, `kick` from `@engine/*.js`, and `createCrowd` / `createHero` / `createBirds` from `@engine/crowd.js`.
- **Time:** page time t; the shot's own time is `tt = t - 4` (0..dur).
- **Story clock:** `storyT = SHOT.<name> - 3 + tt`. Pass it to `W.update(S, t, { storyT, moonScreen: [x, y], level, amp, ... })` every sub-frame.
  - The Moon's SIZE comes from the clock. Never scale it by hand.
  - Choose WHERE it sits with `moonScreen` (design px of the disc centre, frame 540×960) or with `moonDir`.
  - The motion must be constant and steady: no easing on the Moon or on story-driven world changes.
- **Easing:** camera moves may ease. Shake is smoothed noise. Nothing moves more than 40 px/frame without blur.
- **Motion blur:** set `samples` per the board (4 calm, 8 moving, 12 fast).
- **Layout (design px):** captions sit at y 230–350 over calm, dark sky. The counter is at y 129–210. Key action stays in y 350–640. Below y 640 is scenery only.
  - Don't put the bright Moon disc behind the caption band. Its top edge goes at y ≥ 355 unless the board says otherwise.
- **People:** use the crowd and hero from `@engine/crowd.js` (organic figures; poses in `engine/src/figure.js` POSES).
  - Crowd figures must be ≤ 80 design px tall; keep them at distance.
  - The hero is a small clean silhouette, seen from behind only.
  - No faces, no children, no gore.
- **Every Earth shot is alive:** crowd, lights, boats, birds and waves, and the whole frame's light changes with the story (the kit's `grade()` does most of this).
- **Never:**
  - white flashes or strobes (impact glows are orange);
  - fluffy smoke or fog;
  - dark, empty frames.
- **Sound:** `src/<shot>_sound.js` defines `function SOUND(ctx, out, dur)` using `engine/src/audio_core.js` (surf, wind, rumble, crowd, gasp, hit, whoosh, siren, flutter, shutters, verb).
  - It MUST start with `hit(ctx, out, { t: 0 })` (a mid-range hit on the cut).
  - Make sounds literal to the picture.
  - Duration = shot length + 0.6 s tail.

## Workflow and verification
1. **Build:** `python3 tools/build_page.py projects/moon-2x/src/<shot>.js`
2. **Quick frames:** `node tools/frames.js projects/moon-2x/dist/<shot>.html <outdir> 0 2.5 4.9 --scale 0.5 --mb 1`. Look at them: open the PNGs. Iterate until it clears the PLAYBOOK look bar at phone size.
3. **Full-size check:** one key frame at full size: `--scale 1` (about 10–20 s per frame). Composite the caption with the real overlay:
   - `node tools/overlay/render_ov.js projects/moon-2x --frames F:F+1 --png <dir>`, where F = film frame = (SHOT start + t) × 30;
   - alpha-composite it with PIL;
   - check the caption reads and nothing important sits under it.
4. **Sound:** `node tools/audio.js projects/moon-2x/dist/<shot>_sound.html projects/moon-2x/out/<shot>.wav <dur+0.6>` must render without errors. Peaks may exceed 0 dBFS; mastering handles that.
5. **Hand-over:** when a shot is FINAL, write `projects/moon-2x/FINAL/<shot>.txt` containing one line: key-frame path + one-sentence description. The lead renders it in the cloud immediately, so do not touch that shot again unless the lead asks.
6. **Speed:** keep full-size render cost ≤ about 15 s per frame with your sample count. Test with `node tools/render.js <page> /tmp/x.mp4 --from 0 --to 2`.

## Deadline
**Hand over every shot within 75 minutes of starting**, even if imperfect. Keep each page buildable at all times. Final report: ≤ 15 lines covering shots done, key frames, known weak spots, and any engine change you wished you could make.
