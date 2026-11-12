# Builder brief: friction-vanishes (PHASE 2, three groups in parallel)

You build an assigned group of shots for "What if friction vanished for 5 seconds?". Repo root: `D:\ClaudeStudio` (Windows; run commands
from the root with forward slashes; `python` not python3; IJ_GPU is already set, so frames render on the GPU).

## Read first (in this order)
1. `engine/API.md`: the engine cheat sheet. Read it instead of engine sources (open a source only for a missing detail).
2. `PLAYBOOK.md` (look bar) and `projects/friction-vanishes/PRODUCTION.md` (the approved brief: §0 the tsunami rules are non-negotiable).
3. `projects/friction-vanishes/script.md`: THE BOARD (your rows, captions, sound, transitions, the lead's deviations).
4. `projects/friction-vanishes/src/story.js`: THE LAW. Every position/speed comes from its functions. Never hand-animate the law.
5. `projects/friction-vanishes/src/kit.js`: THE SHARED KIT (sets, palette, lighting, post presets, car/prop posing, slips, camera helpers).
   `src/k0_kittest.js` shows the kit in use (`?set=cross | hillup | hilldown`); its frames are in `out/kit/`.
6. Reference shots: `projects/gravity-flip/src/s0*_*.js` (structure), `projects/tsunami/src/tsukit.js` (daylight bay + spray + boats).

## Groups (similar difficulty; shots that cut into each other stay together where possible)
| group | shots | sets | the hard part |
|---|---|---|---|
| **A** | s01_crossing, s02_grip, s09_loop | crossing (flat city), hill bottom | Gate F1 (frame 1 must read "the car can't stop" muted by 1.5 s), the s02 grip-return crash + rollovers, the frame-1 match |
| **B** | s03_minute, s04_quay, s05_town | hill top, quay + harbour, daylight bay | the mass slide, ballistic launch + spray, the town draining into the bay |
| **C** | s06_hills, s07_after, s08_orbit | daylight bay hills, aerial bay, orbit | **N3 hillside flow (riskiest)**, the filled-bay aftermath, **N4 brown sediment plumes** from orbit |

## The contract
- Write ONLY your own shot files: `src/<shot>.js` + `src/<shot>_sound.js`, plus new helper files named after your group:
  `src/groupA_*.js`, `src/groupB_*.js`, `src/groupC_*.js`. Project-side effects only (onBeforeCompile patches, new meshes).
  If you truly need an engine change, put it in a NEW file `engine/src/fv_group<X>_*.js`; never edit an existing engine file.
- NEVER edit shared files: `src/kit.js`, `src/story.js`, `overlay.js`, `score.json`, `shots.txt`, `script.md`, `BUILDERS.md`, other groups' files,
  or any other project. Need something in the kit or the law? Copy it into your group file and say so in your hand-over.
- **Never commit, never push.** The lead (Director, PHASE 3) integrates and commits.
- Keep every page buildable at all times.

## Every shot (copy this skeleton)
```js
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake, whip, kick, Path } from '@engine/camera.js';
import { hillWorld, POST_DAY, onHill, hillQ, MAIN_X, ZF, ZQ, TOP_Z, groundY } from './kit.js';   // what you need
import { tauAt, slopeX, slopeV } from './story.js';
const S = createStudio({ samples: 8, shadows: true, post: POST_DAY });          // samples per the table below
const W = hillWorld(S, {});
S.run((t) => {
  const tt = Math.max(t - 4, 0), tau = tauAt('s03_minute', tt);                  // page t = shot time + 4
  applyCam(S.camera, { pos, look, mm: 24 }, shake(t, 0.03, 0.8, 3));             // camera FIRST
  W.update(t, { tau, carPose: (c, i, tau) => ({ p: onHill(c.x0, c.z0 + slopeX(tau)), q: hillQ(c.yaw) }), focus });
});
```
- Sound: `function SOUND(ctx, out, dur)`; option names exactly as API.md §22 (`t`, `dur`, `gain` for hit/whoosh/gasp/flutter; `t0`, `t1`, `gain`
  for the beds; gain in dB). gravity-flip's `{t, dur, g}` is WRONG (ignored). **No ticks, no cracks, no high dings:** keep hits low (sub, thud,
  crunch: `rumble`, filtered `noiseBuf` brown/pink below ~1 kHz). The `hit()` block has a mid-range snap+ring: do NOT use it except softly
  (≤ −18 dB) under a real event. Transitions get a low whoosh (`f0 80–200, f1 ≤ 1200`). Sync events from the law (write the constant + source).
- Samples (brief §6): **12** s01, s02, s04, s09 (s09 must match s01's blur at the loop); **8** s03, s05, s06; **4** s07, s08. Raise to 12 only
  inside whip windows (`samples: (t) => ...`). Nothing faster than 40 px/frame without blur. No white flashes (`post.p.flash` stays 0).

## Shared rules (look bar + brief)
- Daylight, full colour. Noon city, noon bay, orbit on the day side. `POST_DAY` / `POST_ORBIT` from the kit; `SUN` from the kit everywhere.
- **Layout (design px, 540×960):** key action in y 200–640, away from the side 60 px. The counter block (x 50–290, y 370–500) and the caption
  band (y 560–640) must stay calm behind type (`inTypeZone(cam, p)` in the kit tests a world point). Below y 765 = scenery only.
- People: full colour, mid-distance (≤ 150 design px), featureless; the hero ~65 px, s01/s09 only. **No figure is ever touched by a car or
  debris; nobody on the hill street or in any slide path; people only slip and sit down** (`slipCrowd`). No faces, children, gore.
- Cars/buses in varied colours; skid marks = dark rubber lines, never smoke. No fluffy smoke or fog anywhere; spray = droplets/sheets
  (`splash.createSpray` kinds 0/1, never 2 "veil" as a cloud); mud = wet, glossy brown, never a flat strip.
- Honest physics: cars on the hill move by `slopeX/slopeV` (all loose things slide alike: same a, drag differs < 10%); grip back by
  `slideSkidX/V` (s02) or a stop at `SKID_HILL`; a turning car keeps its yaw rate (`spinCar`); quay launch by `launch(v, dt)`; the braking car by
  `brakeCarX`. Rollovers: a car sliding SIDEWAYS when grip returns trips: rotate about its downhill lower edge (≈ 90–180° over 0.8–1.2 s).
- Hill set geometry (kit): main street x = `MAIN_X` = 60, running along Z; flat quay road z `ZF` 288 → `ZQ` 312 (quay edge, wall, harbour
  beyond, sea level 0, deck y = 2); the 10° street climbs from z 288 to `TOP_Z` −112 (400 m, y 72.5) and the town continues uphill.
  `groundY(x, z)`, `onHill(x, z, dy)`, `hillQ(yaw, rx, rz)` (pose flat on the slope). Cars from `C.cars` keep `x0/z0`; return `null` from
  `carPose` to hide one, `undefined` for the default (parked on the slope).
- Bay set geometry: `engine/API.md` §7 (lagoon centre (0, −800), r 800; town s 38..300; headlands z −1300..−1600; lighthouse (245, −1690)).
  `bayWorld(S)` = API R2 daylight bay; `looseCity(S, {cars, props})` gives city cars/props to pose on `bay groundH`.
- Check every shot: `python tools/build_page.py projects/friction-vanishes/src/<shot>.js`, then
  `node tools/frames.js projects/friction-vanishes/dist/<shot>.html projects/friction-vanishes/out/frames 0.2 1.5 <last-0.2>` and READ the PNGs.
  At most 4 passes per shot. Quick looks: `--scale 0.5 --mb 1`.
- Hand-over: `projects/friction-vanishes/FINAL/<shot>.txt` (key-frame paths + one sentence + known weak spots + any kit/law needs).

## Handshakes at every cut (what the frame looks like at the cut; both sides must match)
- **0.0 / 37.0 → frame 1 (A: s09 → s01).** s01 frame 0 = `FRAME1_CAM` exactly (no shake at t 0; shake may build from 0.5 s), `crossingWorld`
  at τ 0: red car nose at `HERO_CAR.x0` (86) in lane z 61.75 heading −X at 50 km/h, brake lights ON, hero on the kerb (red coat, tote),
  walkers mid-stride. s09 = the same page logic at τ −1 → −1/30 (`brakeCarX` drives at 50 km/h for τ < 0; brake lights on from τ −0.3; the
  traffic light turns red at τ −0.8). The last s09 frame and s01 frame 0 must differ only by 1/30 s of motion. Put the shared frame-1
  logic in `src/groupA_crossing.js` and import it from BOTH shots. You may tune the camera or the car start there (`crossingWorld(S, { carX0 })`
  and your own camera constant), but s01 and s09 must use the same values.
- **4.0 (A: s01 → s02) whip-pan.** s01's last 0.35 s whips LEFT (yaw +70°, `whip()`, 12 samples) following the receding red car; s02's first
  0.35 s continues the leftward whip decelerating onto the hill view. Both frames at the cut are motion blur of daylit facades + sky
  (no black, no white).
- **5.0 (A: s02, in-shot).** Grip returns: every sliding thing switches from `slopeX` to `slideSkidX` at τ = 5 exactly (film 5.0, the hit).
- **8.5 (A: s02 → B: s03) match cut, bottom → top.** s02's last frame: the hill street from the flat quay road, 50 mm, gaze ≈ +6°, the street's
  centre line vertical through x ≈ 270 design px, the street vanishing at y ≈ 400–430; cars stopped and wrecked. s03's first frame (τ 0 of
  the NEW step, the normal world: every car parked/driving, nothing wrecked): from above `HILL_TOP` looking down the same street, its centre line
  vertical through x ≈ 270, the harbour horizon at y ≈ 400–430. Same lane markings; the street is the shape that matches.
- **13.0 (B: s03 → s04) whip down the street.** s03's last 0.35 s whips DOWN (pitch −40°, 12 samples) along the street toward the harbour;
  s04's first 0.3 s settles from a blurred downward tilt onto the low side-on quay view.
- **17.5 (B: s04 → s05) dark spray wipe.** s04's last 0.5 s: a wall of dark, wet droplets/sheets from a car hitting the water right by the lens
  covers the frame (droplets, darkened by the shadow side, never white; check.py fails upward luma jumps). s05's first 0.3 s: the tail of
  the droplets clears off-frame over the bay wide.
- **22.0 (B: s05 → C: s06) hard cut on the hit.** s05's last frame: the bay wide from the lighthouse headland, grip back at τ 60: cars piled at
  the waterline and in the shallows, everything stopped, water churned brown-green near shore. s06's first frame: step 3 restarts the NORMAL
  world (town intact, cars parked, green hills), seen from the water (y ≈ 3 m) looking up the hillside behind the town, 35 mm, same sun
  (kit `SUN`); the ground starts flowing at τ 0+ (`flowX`). Different angle: no matching needed beyond light and colour.
- **26.5 (C: s06 → s07) cut on the crane move.** s06's last 0.5 s cranes UP (camera rising ≥ 4 m/s, slight tilt down, motion blur); s07's first
  0.5 s continues the same upward/outward motion at aerial height (≈ 250–400 m) over the filled bay at τ 600.
- **30.5 (C: s07 → s08) push up to orbit.** s07's last 0.6 s tilts up into the blue sky (frame ≥ 80% sky by the cut, deep blue `dayZen`);
  s08's first frame: Earth's sunlit limb with the blue atmosphere band filling the lower 40% and black space above (no upward luma jump:
  keep the frame mean at or below s07's last frame).
- **37.0 (C: s08 → A: s09) hard cut on the hit.** s08 36.0–37.0 is the silent beat (picture keeps drifting); s09 starts the normal crossing.

## Per-shot notes
**A — s01_crossing (0–4.0, τ 0→4).** Use `crossingWorld` and `W.update(t, { tau, T: 5, carPose, fallAt, slide, brake })`.
- Gate F1 (test first, half size): frames 0.0/0.75/1.5 must say "the car can't stop" with no caption. Tools: brake lights on, the stop line
  and the zebra at the junction, the car passing the stop line at 13.6 m/s, a second car (opposite lane, also braking, also not slowing).
- The turning car: a car mid-left-turn at the junction (heading NW, ω = v/R, R ≈ 12 m, v ≈ 6 m/s), `spinCar` → it glides straight into the
  plaza, rotating. No one in its path.
- Fill the empty lower half: a café terrace on our pavement 12–25 m from the lens (city props kind 3 tables, benches) that drifts and spins
  slowly once τ > 0 (tables keep the tiny velocities they had: ≤ 0.3 m/s), walkers whose feet go (`fallAt`: 0.15–1.2 s, `slide` = their
  walking velocity). The hero never falls (they are standing still on the kerb; give them a small sway only).
- Sound: squeal (band-passed noise 1.5–3 kHz is OK for ≤ 0.25 s; it's a real event, not a tick) cut dead at 0.25 s → a soft glassy hiss
  (pink noise, high-cut ~3 kHz, low level), room tone, crowd surprise rising, 3–5 soft body thumps (brown noise < 300 Hz).
**A — s02_grip (4.0–8.5, τ 4→8.5).** `hillWorld`, camera on the flat quay road near (MAIN_X ± 3, 2 + 1.4, ZF + 8) gazing up the street at
  50 mm (see `k0_kittest.js ?set=hillup`). Everything loose on the main street slides toward the camera at `slopeX`; nothing reaches the camera
  or the quay road (at τ 5 they've slid 21 m; the nearest start ≥ 60 m up). 5.0: skids (`slideSkidX`), dark rubber skid lines, sideways
  cars trip and roll, the bus (L 9 cars in `C.cars`) tips onto its side, tables cartwheel. Alarms after. Gate F2: frames 4.5 / 5.2 / 6.5 s
  (shot time 0.5 / 1.2 / 2.5) must show a hill and the crash as cause → effect.
**A — s09_loop (37.0–38.0, τ −1→0).** See the 0.0 handshake. Sound: soft room tone, the light's click (low), the squeal just starting at the end.
**B — s03_minute (8.5–13.0, τ 0→4.5, step 2).** High camera above `HILL_TOP` (≈ +16 m, see `?set=hilldown`), 24 mm. Everything on the main
  street and side streets slides downhill as one mass at `slopeX(τ)` (cars on the X lanes slide sideways down the slope; where they cross into
  the main street they collide: from the contact on, keep each car's yaw rate constant). Ends whipping down the street.
**B — s04_quay (13.0–17.5, τ 20→24.5).** Low, side-on from a moored boat just off the quay edge (`splash.createBoats`), 28 mm, looking along
  the quay so the street's foot is in frame. Things arrive across the flat quay road at `slopeV` (116 → 126 km/h; the street's foot at τ 22.0),
  leave the edge at τ ≈ 22.7 (`T_EDGE`) and fly by `launch(v, dt)` into the water: heavy droplet/sheet spray (`createSpray`, hide it from the
  ocean mirror, R10). Cars keep spinning in flight. Then the dark spray wipe (17.5 handshake). Keep the boat crew-free.
**B — s05_town (17.5–22.0, τ 55.5→60).** `bayWorld` + `looseCity`: cars and props stream down the bay's streets (gradient of `bay groundH`,
  i.e. down `-sGrad`) over the promenade into the water; the beach sand slumps (lower terrain vertices along the shore by ≤ 2 m); trailer boats
  slide in. At τ 60 (film 22.0) everything stops dead (grip back). 50 mm from the lighthouse headland across the bay, slow push.
**C — s06_hills (22.0–26.5, τ 0→4.5, step 3) — N3, riskiest.** The ground flows: terrain vertex morph toward a relaxed profile driven by
  `flowX(τ)` (staged speed), a wet brown flow-streak shader on the moving regions, trees/houses riding the flow lines, brown sediment tint
  in the water near shore. It must read "the ground is flowing", not a texture scroll, not lava (no glow). **Fallback (brief §4):** if it misses
  after 2 passes, say so in the hand-over; the lead re-times s05 to 24.5 and s07 to the 10 min aftermath.
**C — s07_after (26.5–30.5, τ 600).** The N3 end state, aerial: the bay filled brown to the brim (a mud surface at ≈ sea level over the
  lagoon: glossy wet brown with ripples, `COL.mud/mudWet`), cars and boats stranded on it, hills stripped to grey rock (`COL.rock`), still water
  beyond. Near silence in the sound (drips, one distant alarm, gulls).
**C — s08_orbit (30.5–37.0).** API R4 day side (`space.js`, `ring: false`, `coast: true`, `seg [512, 256]`), 70 mm slow push-in. **N4:** a
  project-side brown coastal plume tint on the oceans (coast SDF + noise, `COL.sediment`) via an `onBeforeCompile` patch in
  `src/groupC_sediment.js`, and desert dunes smeared flat (lower contrast on the deserts). Pick a view with many coastlines in daylight. The
  frame must stay daylit (never an all-night Earth). Sound: low drone only; silent from 36.0.
