# Builder brief: gravity-flip shots

You are building shots for a code-rendered TikTok video in the repo /home/user/tiktokvideosdrawnspace.
- **Read first:**
  - CLAUDE.md (studio map);
  - PLAYBOOK.md (rules and look bar; the Studio v2 rules win where they differ);
  - projects/gravity-flip/script.md (THE BOARD: your shots' rows, captions, sound notes);
  - projects/gravity-flip/src/story.js (THE LAW).
- **Do not commit or push.** The lead commits. Work only in the files you own (below).
- **Reference code:**
  - projects/gravity-flip/src/look.js: the city plaza test, lift and tumble usage.
  - projects/lab-v2/src/day_bay.js: the bay set in daylight.
  - projects/moon-2x/src/s13_space.js: the space set.
  - Engine modules: city.js, crowd.js, ocean.js, bay.js, sky.js, space.js, debris.js, fire.js.

## Ownership
- **Lead:** s01_plaza, s02_flip, s03_pov, s06_again; city.js; crowd.js; integration, sound mix and assembly.
- **OCEAN:**
  - Shots s04_seaup and s05_crash (+ their _sound.js).
  - You may EXTEND engine/src/ocean.js, adding uniforms that are OFF by default so existing shots render identically: the lifted water slab (surface plus underside), the splash and the surge.
  - You may add new modules under engine/src/ (e.g. splash.js).
- **SKY:**
  - Shot s07_clouds (+ sound).
  - New modules: engine/src/planes.js (low-poly airliners with a generic white/blue livery, NO real airline names or logos) and engine/src/clouds.js (a cloud deck seen from above).
  - sky.js: add default-off uniforms only.
- **SPACE:**
  - Shots s08_coasts, s09_peel, s10_return, s11_end (+ sound).
  - You may EXTEND engine/src/space.js with default-off uniforms (coast surf, a rising ocean/air shell).
  - You may add engine/src/iss.js (a simple space station: truss, modules, solar arrays).
  - Import planes from engine/src/planes.js once SKY has written it. Until then, use a placeholder.
- **TYPE:**
  - tools/overlay/ov.html: a new look 'v2', with fonts copied into tools/overlay/fonts plus their licenses.
  - projects/gravity-flip/overlay.js and projects/gravity-flip/score.json.
  - tools/check.py: an added contrast check.
- **Do NOT edit** anything else, especially other builders' files, city.js, crowd.js, kit/story files, or moon-2x.

## Contract (every shot): src/<shot>.js in projects/gravity-flip/src/
- **Studio:** `createStudio(...)` from '@engine/engine.js'. Use the deterministic `S.run((t) => ...)`.
  - Page time t; shot time `tt = t - 4`.
  - Story clock: `tauAt('<shot>', tt)` from './story.js'.
  - Heights and speeds come ONLY from `heightAt(tau, T)` and `speedAt(tau, T)`. Never hand-animate the law.
- **Samples:** 2 by default (`samples: 2`); 4 for fast motion if you can afford it.
- **Speed:** keep full-size render cost ≤ about 12 s per frame. Measure with `node tools/frames.js <page> <dir> 1.0 --scale 1 --mb 2`.
- **Layout** (design px of the 540×960 frame):
  - The title band is y 150–300 (s01 only).
  - The counter block is at the left: x 22–270, y 370–500. Keep important action out of it, or keep it calm behind it.
  - Captions go at y 560–640.
  - Below y 700 is scenery only, because TikTok's UI covers it.
- **Look:**
  - Bright, colourful, cinematic. Daylight on Earth; crisp black space with a sunlit Earth.
  - People are at mid-distance (at most 150 design px tall), never close-ups. Faces are featureless.
  - No gore: never show an impact on a person.
  - No fluffy smoke or fog. Spray, splashes and clouds seen from above are fine.
  - No white strobes or flashes.
  - Every frame should have motion and a clear subject.
- **Sound:** `src/<shot>_sound.js` defines `function SOUND(ctx, out, dur)` using engine/src/audio_core.js.
  - It starts with `hit(ctx, out, { t: 0 })`.
  - Duration = shot length + 0.6 s.
  - Make it literal to the picture.

## Workflow
1. **Build:** `python3 tools/build_page.py projects/gravity-flip/src/<shot>.js`
2. **Quick frames:** `node tools/frames.js projects/gravity-flip/dist/<shot>.html <dir under /tmp/claude-0/...scratchpad or /tmp> 0 1 2 --scale 0.5 --mb 1 [--q 'k=v']`. LOOK at the PNGs and iterate.
3. **Full-size key frame:** `--scale 1 --mb 2`.
4. **Progress note:** within 2 hours of starting, write projects/gravity-flip/FINAL/<shot>_wip.txt: one line with the key-frame path and the state.
5. **Hand-over:** when FINAL, write projects/gravity-flip/FINAL/<shot>.txt with the key-frame path and a one-sentence description. Do not touch the shot afterwards unless the lead asks.
6. **Deadline:** hand over every shot by 2026-11-12 06:00 UTC, even if imperfect. Keep every page buildable at all times.
7. **Final report** (at most 15 lines): shots done, key frames, known weak spots, and engine changes made.
