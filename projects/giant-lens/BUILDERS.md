# Builder brief: giant-lens (PHASE 2, three groups in parallel)

You build an assigned group of shots for "What if a magnifying glass the size of a house looked at a city?". Repo root:
`D:\ClaudeStudio` (Windows; run commands from the root with forward slashes; `python`, not python3; IJ_GPU is already set, so
frames render on the GPU).

## Read first (in this order)
1. `engine/API.md`: the engine cheat sheet. Read it instead of the engine sources.
2. `PLAYBOOK.md` (look bar) and `projects/giant-lens/PRODUCTION.md` (the approved brief; §5 sound rules and §6 look are binding).
3. `projects/giant-lens/script.md`: THE BOARD (your rows, captions, sound, transitions, and the lead's **Deviations**).
4. `projects/giant-lens/src/story.js`: THE LAW. Lens size `lensD(shot, tt)`, power `powerAt`, spot concentration `concAt`
   (frame-1 ramp `focusC`), `spotOf`, `boilKgS`, `GLASS_MELT_S`, the `SHOT` table (t0, dur, step0, grows). Never hand-animate them.
5. `projects/giant-lens/src/kit.js` (sets, SUN, palette, post presets, lens rig, hero, car posing, camera helpers) and
   `src/lens.js` (N1 lens, N2 beam + spot, lens shadow, N3 burn trail, flames with ignition times, `heatColor`).
   `src/k0_kittest.js` shows them in use on frame 1; its frames are in `out/kit/` (`k0_kittest_t1.00.png` = full size, 0.3 s/frame
   at 4 samples on the GPU).
6. Reference shots: `projects/gravity-flip/src/s0*_*.js` (structure), `projects/friction-vanishes/src/kit.js` (daylight bay,
   orbit), `projects/tsunami/src/` (spray, boats).

## Groups (similar difficulty; shots that cut into each other stay together)
| group | shots | sets | the hard part |
|---|---|---|---|
| **A** | s01_plaza, s02_street, s09_loop | noon city (`cityWorld`) | **Gate 0** (frame 1 must read "a giant magnifying glass is burning the city" muted in 3 s), the burn line to the car, the row of cars igniting, the frame-1 loop match |
| **B** | s03_tower, s04_bay, s05_town | city tower, daylight bay, bay town from the hillside | **N4 melting panes (riskiest)**, N5 boil jet on the bay, the pier and roofs burning in racing lines |
| **C** | s06_clouds, s07_strato, s08_orbit | cloud deck 8 km (API R3), high altitude 30–70 km, orbit (API R4) | **N6 cloud cut** (a clean slot in the deck), the widening scar, **N7** the scorched line + lens shadow + hot dot on Earth |

## The contract
- Write ONLY your own shot files: `src/<shot>.js` + `src/<shot>_sound.js`, plus helper files named after your group:
  `src/groupA_*.js`, `src/groupB_*.js`, `src/groupC_*.js`.
- **Engine:** new files only, named `engine/src/gl_group<X>_*.js`, EXCEPT these default-off extensions (one owner each, so
  parallel edits never collide): **C** may add default-off uniforms/options to `engine/src/clouds.js` (N6 cut) and
  `engine/src/space.js` (N7, extend the existing `scar` mode); **B** may add default-off options to `engine/src/splash.js`
  (spray tint). Every other project must render identically: default values = today's behaviour.
- NEVER edit shared files: `src/kit.js`, `src/lens.js`, `src/story.js`, `overlay.js`, `score.json`, `shots.txt`, `script.md`,
  `BUILDERS.md`, `PRODUCTION.md`, other groups' files, or any other project. Need something in the kit? Copy it into your group
  file and say so in your hand-over.
- **Never commit, never push.** The Director (PHASE 3) integrates and commits. Keep every page buildable at all times.

## Every shot (copy this skeleton)
```js
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake, whip, kick, Path } from '@engine/camera.js';
import { cityWorld, lensRig, makeHero, POST_DAY, SAMPLES, SUN, D2R } from './kit.js';
import { createBurn, createFlames, heatColor } from './lens.js';
import { lensD, concAt, tempC, SHOT } from './story.js';
const S = createStudio({ samples: SAMPLES.s02_street, shadows: false, post: POST_DAY });
const W = cityWorld(S, { keepOut: [[x, z, r]], clearTrees: [[x, z, r]] });
const rig = lensRig(S, { sky: W.sky });
S.run((t) => {
  const tt = Math.max(t - 4, 0);                                         // page t = shot time + 4
  applyCam(S.camera, { pos, look, mm: 35 }, shake(t, 0.03, 0.8, 3));     // camera FIRST
  W.update(t, { carPose, focus });
  const D = lensD('s02_street', tt), C = concAt('s02_street', tt);
  rig.set({ spot: spotAt(tt), D, C, heat: 1, handleAngle: 0.5, t });     // lens centre = spot + SUN·D (the law)
  burn.update(tt); flames.update(tt);
});
```
- `shadows: false` is fine: shadow maps don't show on our renders (kit check; same in friction-vanishes). The lens shadow is the
  rig's analytic decal on the plane through the spot (pass `n` for a facade/roof; `shadowVisible: false` to hide it).
- **Sound:** `function SOUND(ctx, out, dur)`; option names exactly as API.md §22 (`t`, `dur`, `gain` for hit/whoosh/gasp/flutter;
  `t0`, `t1`, `gain` for the beds; gain in dB). gravity-flip's `{t, dur, g}` is WRONG (ignored). **No ticks, no `hit()` dings,
  nothing repeating above ~3 kHz:** low-pass sizzles/crackle at 4 kHz (`filt(ctx, 'lowpass', 4000)`). The 4 cut hits are in
  `score.json`: do NOT add your own cut hits. **Every grow gets the lens-grow swell:** a low (40–120 Hz) 0.8 s swell starting at
  the grow time in `SHOT[shot].grows` (write the constant + its source). Transitions get a low whoosh (`f0 80–200, f1 ≤ 1200`).
- **Samples:** `SAMPLES[shot]` from the kit (8 calm/moving, 12 for s02/s04, 4 for s08); raise to 12 only inside whip windows
  (`samples: (t) => ...`). Nothing faster than 40 px/frame without blur. No white flashes (`post.p.flash` stays 0).
- **Check every shot:** `python tools/build_page.py projects/giant-lens/src/<shot>.js`, then
  `node tools/frames.js projects/giant-lens/dist/<shot>.html projects/giant-lens/out/frames 0.2 1.5 <last-0.2>` and READ the PNGs.
  Quick looks: `--scale 0.5 --mb 1`. Full-size timing: `--scale 1 --mb 4`. At most 4 passes per shot. **Note:** frames.js always
  adds `?static` to the URL; don't use `static` as your own query flag.
- **Hand-over:** `projects/giant-lens/FINAL/<shot>.txt` (key-frame paths + one sentence + known weak spots + any kit/law needs).

## Shared rules (look bar + brief)
- **Daylight, full colour:** noon city, noon bay, deep-blue high sky, day-side Earth (never an all-night Earth). `POST_DAY` /
  `POST_HIGH` / `POST_ORBIT` from the kit; **`SUN` from the kit everywhere** (65° high, from +Z, a little −X). Ground cameras look
  roughly −Z (down-sun: front-lit, the lens hangs above its spot, its face tilted toward you). In space, use `SP.sunDir`.
- **The lens (N1):** ALWAYS through `lensRig` (or `createLens` with the same law): centre = spot + sun·D, axis = sun, size =
  `lensD(shot, tt)`. Keep the handle visible when the lens is in frame (it is what makes it read as a magnifying glass); pick
  `handleAngle` so the handle points away from the type zones. The glass refracts the sky you pass (`sky` handle, or `zen/hor`).
- **The beam is subtle (N2):** a faint cone, the brightness in the spot (core + halo + bloom). Never a laser bar, never a
  full-frame flash. Heat ramp: white-hot core → yellow → orange glow → black char (`heatColor`, the burn trail).
- **No fluffy smoke.** At most thin dark wisps off a char line; steam is a crisp white jet with droplets (`splash.createSpray`
  kinds 0/1, never 2 as a cloud).
- **People:** full colour, mid-distance (≤ 150 design px), featureless; the hero (`makeHero`: teal jacket, backpack, `shade`
  pose) 55–80 design px in s01, s02, s05, s09. **The beam never touches a person or an animal**: keep crowds out of every spot
  path (`keepOut` in `cityWorld`), people run clear. No faces, children or gore.
- **Layout (design px, 540×960):** key action in y 200–640, away from the side 60 px; nothing important below y 765. The
  counter block (x 50–290, y 370–500) and the caption band (y 560–640) stay calm behind type (`inTypeZone(cam, p)` tests a world
  point). s01/s09: the title covers y ≈ 150–330, so the lens sits at y ≈ 270–345 and the spot at y ≈ 520–560.
- **Honest physics:** the spot is always 3,500 °C (after s01's 1.0 s focus); bigger lenses = wider spot (`spotOf(D)`) and more
  power, not hotter. Glass flows after `GLASS_MELT_S` (1.53 s) of beam; the sea boils at `boilKgS(P)` (kg/s: a hissing jet, not
  an explosion); wood and paint flash in < 0.5 s. The spot moves because the lens drifts (any speed; that's the liberty).

## Handshakes at every cut (both sides must match)
- **0.0 / 37.0 → frame 1 (A: s09 → s01).** s01 frame 0 = `FRAME1_CAM` exactly (no shake at t 0; any push/zoom starts at 1.5 s),
  `cityWorld(S, { keepOut: KEEP_F1, clearTrees: TREES_F1 })`, `rig.set({ ...frame1State(0), t })`: the 20 m lens over `SPOT_F1`
  with C = 10 (the wide white disc inside the lens shadow), hero at `HERO_POS`. s09 = the same scene with the lens frozen at
  `frame1State(0)` and the world running at page t 3.0 → 3.967 (so its last frame is s01's frame 0 minus 1/30 s). Put the
  shared frame-1 setup in `src/groupA_frame1.js` and import it from BOTH s01 and s09. If Gate 0 needs a different frame 1,
  change it there (both shots follow); report the new values for the kit in your hand-over.
- **4.5 (A: s01 → s02) whip-pan RIGHT.** s01's last 0.35 s whips right (yaw +60–70°, `whip()`, 12 samples) off the burning car
  toward the east street; s02's first 0.35 s continues the rightward whip decelerating onto the street view (looking north,
  −Z, along x = 60). Both frames at the cut: blurred sunlit facades and sky (no black, no white).
- **9.0 (A: s02 → B: s03) tilt UP.** s02's last 0.6 s tilts up (pitch to ≈ +35°) following the beam from the burning cars up
  toward the lens, the 63 m lens starting to grow (s03's grow starts at 0.2 s); at the cut the frame is a sunlit glass facade
  + blue sky + the lens rim entering at the top, motion-blurred upward. s03's first 0.5 s continues the upward tilt from ≈ +35°
  (same blur direction, same sun) on the facade of a glass tower on the same street (east street x = 60, west side, ~z −100),
  then settles. Both use `cityWorld` with the default seed (11) so the towers' glass matches.
- **13.5 (B: s03 → s04) hard cut on hit 1.** s03 ends on the burning gash and glowing drips (bright orange on a dark wound in
  the glass); s04 opens on the bay already mid-grow (lens 200 → 632 m over 0.8 s). No match needed beyond the sun and colour.
- **18.0 (B: s04 → s05) crane.** s04's last 0.6 s rises and pulls back (≥ 3 m/s up); s05's first 0.6 s continues the same
  up/back motion from the hillside above the town. Same bay set (`bayWorld`), same sun; the pier fire visible in both.
- **22.5 (B: s05 → C: s06) hard cut on hit 2.** s05 ends on the boiling white wake across the bay and the burning swath of
  roofs; s06 opens above the clouds at 8 km. Light and colour only.
- **27.0 (C: s06 → s07) continuous climb.** s06's last 0.6 s climbs (alt rising ≥ 1 km/s on screen) with the slot in the deck
  below; s07 continues the climb from ≈ 30 km. Same `SKY_HIGH` colours, same sun.
- **31.5 (C: s07 → s08) hard cut on hit 3.** s07 ends on the long burning scar and the 63 km lens; s08 opens on the orbit view
  (no upward luma jump: keep s08's first-frame mean at or below s07's last).
- **37.0 (C: s08 → A: s09) hard cut on hit 4.** s08 36.5–37.0: the dot burns on, no counter, near silence (the picture keeps
  drifting); s09 starts the frame-1 plaza.

## Per-shot notes
**A — s01_plaza (0–4.5, step 1, D = 20 m).** Build first: **Gate 0** = render at `?scale=0.5`, export the first 3.0 s muted
with counter + title (the Director's overlay), and judge: (1) reads "giant magnifying glass burning the city" with no caption
(not UFO / laser / spotlight); (2) by 1.0 s the disc is a white-hot point already scorching; (3) the car roof smokes by 2.0
and is in flames by 3.0; (4) ≤ 0.5 s/frame full size at 4 samples on the GPU (the kit frame: 0.3 s). If it fails, report to the
Director and stop. Spot path: hold at `SPOT_F1` while focusing (`focusC`), then the lens drifts so the spot drags a charring line
(`createBurn`, width ≈ 0.6 m) across the paving to the roof of the parked car (`W.HC` at `CAR_F1`, `roofOf`) by ≈ 1.9 s; paint
scorch with `tintCar(W.C, 0, k)`; thin dark wisps off the line at most; roof flames via `createFlames` (t0 ≈ 2.6–3.0, grow 0.5).
Keep the lens in frame during the drag (the spot comes toward the camera, so the lens does too: drag diagonally right, or pan
gently). The crowd scatters away from the beam (re-pose people from `W.crowd.meshes[*].userData.list`, as friction-vanishes
`slipCrowd` re-poses them; never into the path). End: the right whip (handshake 4.5). The white-hot point is modest at 66 m in the
kit frame: raise `coreI`/`minPx` or zoom 28 → 35 mm after 1.5 s.
**A — s02_street (4.5–9.0, steps 1→2).** Street x = 60 (the kit's city), camera behind the hero walking/standing on the west
pavement, 35 mm, tracking north. Parked cars: re-pose ~8 cars from `W.C.cars` into the kerbside lane x = 54.75 (or 65.25) every
~7 m (`carPose`), each ignites as the spot passes (flames + `tintCar`); street trees at ±10.4 m flare (flames in the canopy);
the asphalt line glows (`createBurn`). The lens (63 m) hangs ~57 m up and ~27 m toward the camera from the spot: frame it high in
the 9:16 frame, or let its rim cut the top edge with its shadow on the street. People run past the hero (never in the path).
**A — s09_loop (37.0–38.0).** See the 0.0 handshake. Sound: plaza room tone only, the low beam hum restarting at the end.
**B — s03_tower (9.0–13.5, steps 2→3).** `cityWorld` (seed 11), a glass tower on the east street; the beam (spot `spotOf(200)`
= 1.9 m) climbs the facade: spot on the facade plane (pass its normal `n` to the rig; the shadow decal lies on that plane).
**N4:** build a hero facade grid over the tower face (own instanced pane quads in `src/groupB_*.js`): per pane heat from the
beam's passage time; emissive by `heatColor`, then sag (vertex droop) after `GLASS_MELT_S`, drip particles (glowing orange
drops falling with g, landing as burning drops on the street). A black glowing gash left behind (`createBurn` with `n` =
facade normal). **Fallback (brief):** panes glow and shatter outward as glowing shards (no sag). Lens 200 m above the skyline.
**B — s04_bay (13.5–18.0, steps 3→4).** `bayWorld` (API R2), 50 mm from the beach, slow lateral drift. The 5.9 m spot walks up the
pier deck (`bay.pier.toWorld`, deck y `deckY`): planks flash into flame in a racing line (`createFlames` along the deck, t0 = the
spot's passage time), two moored daytime boats (`splash.createBoats`, never the bay's glow boats) ignite; where the spot crosses
water: **N5** boil jet = `createSpray` white droplets/sheets rising from the spot + a thin vertical jet (short, crisp). Hide spray
from the ocean mirror (API R10). The lens (632 m) hangs 573 m up and 256 m toward +Z from the spot (0.91·D up, 0.41·D toward +Z).
**B — s05_town (18.0–22.5, steps 4→5).** Hillside above the bay town looking −Z over roofs to the bay, 28 mm; the hero (`makeHero`)
small at frame bottom-left of centre on the hillside. The 19 m spot sweeps across the town: a line of roofs catches one after
another (flames per building along the line; dark char decals on roofs), then crosses the water in a boiling white wake
(spray along the path). The 2 km lens hangs 1.8 km up and ~0.85 km toward +Z, i.e. above/behind a −Z camera: pitch up and let
it fill the top of the sky, or turn the camera across-sun so it hangs to one side.
**C — s06_clouds (22.5–27.0, steps 5→6).** API R3 cloud deck at 8 km (metres; world y = 0 is the camera altitude; the ground is
y ≈ −alt). Lens 6.3 km: centre = ground spot + SUN·D → ≈ 5.7 km altitude, above the cloud tops and BELOW us, so we see its top
face (pass `zen/hor`/`ground` so the glass shows the deck it refracts). Airliner (`createPlane`, generic) in the foreground banks
hard away. **N6:** a default-off cut in `clouds.js` (a band of cleared cloud along the beam path with a hot orange glow beneath),
plus the lens's round shadow on the deck if you can.
**C — s07_strato (27.0–31.5, steps 6→8).** Climb 30 → 70 km, 24 mm, `SKY_HIGH` with `altI = 1`, `sunDisc = 1`, curved horizon
(clouds.js up there, or `space.js` with a close camera). Two grows (0.0 and 2.2). The lens's shadow darkens a whole region
(the shadow decal, scaled); the slot widens into a long burning scar across coast and land. (Brief cut order if time runs out:
fold s07 into s06's last 1.5 s; tell the Director.)
**C — s08_orbit (31.5–37.0, steps 8→9).** API R4 day side (`space.js`, `ring: false`, `seg [512, 256]`, km). The 200 km lens in
orbit glinting (`lensRig(S, { space: true, shadowDecal: false })`, `sun: SP.sunDir`, D = `lensD`/km). **N7:** extend `space.js`
`scar` (default off): a dark scorched line across a continent + the round lens shadow on the clouds converging to one blinding
dot + a cloud slot tracing the line. Slow pull-back past the lens rim, 50 → 70 mm. 36.5–37.0: the dot burns on, low tone fading.
