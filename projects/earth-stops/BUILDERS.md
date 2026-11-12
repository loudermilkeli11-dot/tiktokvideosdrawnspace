# earth-stops: Builder brief (PHASE 2, three groups in parallel)

Read, in this order: `engine/API.md` (instead of engine sources), `channel/references/LOOK.md` + the 3 `look/sheet_*.jpg`,
`projects/earth-stops/script.md` (the board), `src/story.js` (the law), `src/kit.js` (the shared kit). Code structure: copy
gravity-flip / giant-lens shots (`createStudio`, kit, camera, `S.run(t => …)`, page t = shot time + 4); sound per API §22.

## The contract
- Write ONLY your own shot files `src/<shot>.js` + `src/<shot>_sound.js`, and new files named after your group:
  `src/groupA_*.js`, `src/groupB_*.js`, `src/groupC_*.js`, new engine files `engine/src/es_groupX_*.js`.
- NEVER edit shared files: `src/story.js`, `src/kit.js`, `src/k0_kittest.js`, `overlay.js`, `score.json`, `shots.txt`,
  `script.md`, this file, or another group's files. Need a kit change? Do it locally in your group file and write the
  request in your hand-over; the lead folds it in at phase 3.
- Existing engine files: only behind a **default-off** option, and only the files you own: **A** `city.js`, `crowd.js`,
  `figure.js`; **B** `space.js`, `clouds.js`; **C** `ocean.js`, `bay.js`, `splash.js`. Prefer a new `es_group*` file.
- **Never commit, never push.** Never touch other projects (you may READ tsunami-524 / giant-lens / gravity-flip code and
  COPY what you need into your group files; never import across projects).
- Hand-over: `projects/earth-stops/FINAL/group<X>.txt`: what you built, the frames you checked, weak spots, kit requests.
- Check every shot: `python tools/build_page.py projects/earth-stops/src/<shot>.js`, then
  `node tools/frames.js projects/earth-stops/dist/<shot>.html projects/earth-stops/out/frames 0.2 <mid> <last-0.2> --scale 0.5`,
  Read the PNGs, judge against LOOK.md + the board. At most 4 passes per shot. Also time one full-size frame (`--scale 1`):
  ≤ 0.5 s on the GPU.

## The shared rules (every shot)
- **The ONE clock.** Every moving thing is a pure function of event time `e = ev('<shot>', tt)` (story.js). Film time of a
  shot = `SHOT[name].t0 + tt`. Never accumulate state; no `Math.random`.
- **The one law.** Loose things move east at `drift(e) = V·e` (+X), with `hop`, `roll` for skids/tumbles; trees `leafLeft`,
  `lean`; tower floors `floorRelease(k)`. **East = +X = screen-right**: every ground camera looks roughly north (-Z).
  **Nothing goes up (hops ≤ 1.6 m; spray arcs excepted) and nothing goes west.** Spray/chips: pass `e` to `update`, set
  `t0` in e, velocities in real m/s (381), real gravity; `createSpray` streaks: `U.streak.value = SHUTTER_E`.
- **The look (LOOK.md, strictly).** Kit look only: `SUN` (golden, from the west, 28° high), `SKY`, `HAZE`, `HEMI`, `POST_DAY`
  / `POST_ORBIT`, `gradeDust(S, k)` as dust thickens. **Stylise everything you add** (`styliseMat`: flat-shaded, matte,
  palette colours): low-poly boxes/tetras/cards, never glossy photoreal. Debris = `createChips` (leaves, paper, glass,
  panels, shingles); dust = `createDust` (ochre, thin, crisp-edged: **no fluffy smoke**). A foreground frame where the board
  has a vantage (`balcony()`). Dense, living detail; one clear cause → effect per shot; the event fills the frame.
- **Type zones** (keep calm, mid-tone picture there: there are NO bands behind the text): title y 120–300 (s01/s09), counter
  x 50–300 y 370–500, caption band y 550–640 centred. Key action in y 200–640, nothing important below y 765 or right of
  x 440 in y 430–870. `inTypeZone(cam, p)` tests a world point. Avoid pure white (surge, glass glare) behind the caption band.
- **People:** featureless, mid-distance, full colour; they topple and roll away east smoothly (cityWorld does it); never an
  impact on a person, no bodies, no gore, no children.
- **Samples:** `SAMPLES[shot]` from the kit (12 fast / 8 moving / 4 calm). **Post:** `POST_DAY` ground, `POST_ORBIT` space.
- **Sound** (`<shot>_sound.js`, API §22 names only: `t0/t1/gain` dB, `t/dur/gain` for hit/whoosh/gasp): NO hits at the
  hard cuts (score.json has them), NO ticks, nothing repeating above ~3 kHz; low roar, rumble, rattles, scrapes,
  low-passed glass. Soft cuts get one low whoosh (f1 ≤ 2000, gain ≤ -16). Sync constants written down with their source.

## GROUP A: s01_plaza, s02_street, s09_loop (Gate 0 is s01: build it FIRST)
- **s01_plaza** (0.0–8.0 s, 240 fr, e 0 → 0.583). `cityWorld(S)` + `balcony(S, FRAME1_CAM)`; camera = `FRAME1_CAM`
  exactly until 2.0 s (no shake before 1.0), then a slow eased 2 m push north; the jolt at 1.0 = 4-frame camera shake
  (`kick`), NO white flash. Samples: `SAMPLES.s01_pre` before 1.0, `SAMPLES.s01_plaza` after (s09 matches the pre value).
  Add: café umbrellas/awnings as `createChips(..., {rest: true})` panels that sit still until 1.0 then go; paper/litter
  chips; glass chips from the shopfront rows; the fountain's water as a crisp white sheet + droplets (kit moves the jet
  drops; strengthen it); `createDust` layers big and near enough to read (the kit's 10 m / 30 m test layers are too thin
  from 85 m: think 15–40 m tall, starting low and growing, ochre against the paving), `gradeDust(S, k)` up to ~0.4.
  The hero (kit) topples east with the crowd at 1.0 and leaves frame right by ~3 s.
  **Gate 0** (PRODUCTION.md, timings shifted to this board): muted first 3.0 s with title + counter: (1) reads as "the
  ground stopped, everything got thrown sideways" (trees and lamps stay put, everything loose goes; not an explosion,
  not a storm); (2) at 1.0 s everything loose starts right in the same frame; (3) by 2.5 s crowd, cars, fountain water
  streaming right, trees stripped sideways; (4) ≤ 0.5 s per full-size frame. Record your verdict in `FINAL/groupA.txt`.
  **Handshake 8.0 → s02:** last 0.3 s the debris stream fills frame right (a ≤ 15° eased pan right is allowed, no whip).
- **s02_street** (8.0–15.0 s, 210 fr, e 0.583 → 1.167). Street level (eye 1.7–4 m) at the plaza's north kerb (z ≈ -46),
  35 mm, looking north across the x-street `SL(-1) = -60` at the shopfront row (block z -72 …), slow track right. Pass
  `keepOut`/`clearTrees` for your camera. The kit's wrapping traffic already sends upwind cars through; add: awnings and
  signs tearing off (rest chips / small meshes posed by `floorRelease`-style times), windows bursting OUTWARD-then-east as
  glinting glass sheets (chips kind 1), a low dust river, leaves, paper. **Handshake 8.0:** opens with debris entering
  frame left, the same golden light; **15.0 → s03:** ends tilting up the facades toward the sky (s03 opens high).
  Sound: the shock roar (Mach 1.1: a continuous low roar, no crack), glass bursts low-passed, a car alarm smeared in wind.
- **s09_loop** (63.5–65.0 s, 45 fr). The s01 scene and camera at film `tt - 1.5` (world film -1.5 → -0.033; `noFling`
  not needed, e = 0 there), samples = `SAMPLES.s09_loop` (= s01_pre). Its last frame + 1/30 s must equal s01 frame 0
  (check both PNGs side by side). Sound: s01's pre-stop bed (crowd murmur, fountain, distant traffic), ending at the same
  levels s01 starts with.

## GROUP B: s03_towers, s04_river, s07_coast, s08_earth
- **s03_towers** (15.0–22.0 s, 210 fr, e 1.167 → 1.75). From the hero balcony (`FRAME1_CAM.pos`), 70–85 mm on the tall,
  hazed towers seen top-right in frame 1 (the kit's `skyline()` caps the near blocks; do NOT change its settings, the
  plaza shots must match). Slow pan right with the debris. **N3 facade peel:** the top `TOP_FLOORS` floors let go from
  the roof down at `floorRelease(k)` and stream right as glass ribbons + chips (kind 1) + panels; roof tanks / a crane
  jib topple right (your own low-poly meshes, `styliseMat`). Lower floors stand. Fallback if the peel won't read: a dense
  shard/panel stream off the top floors. **Handshake 15.0:** opens high on the towers (s02 tilted up); **22.0 → s04:**
  ends easing the pan back toward the plaza (soft cut to the wide).
  Sound: deep steel groans, glass ribbons hissing (low-passed ≤ 3 kHz), the roar continuing. (Riser 1 starts at 22.0 in the score.)
- **s04_river** (22.0–29.0 s, 210 fr, e 1.75 → 2.333). Hero balcony again, `balcony()` in frame, 24–28 mm, a calm
  drift: the SAME plaza transformed (LOOK rule 1): bare bent trees, empty basin, and a dense **upwind debris river**:
  wrapped kit cars and props + your own chips (`wrap: [x0, x1]`) of roof panels, signs, shingles, paper, glass, flowing
  left → right through the whole frame at V; the dust sheet thicker, `gradeDust` ~0.6 (amber). **Handshake 29.0 (HIT 1):**
  ends at full chaos, hard cut.
- **s07_coast** (43.5–52.0 s, 255 fr, e 3.542 → 4.25). Space set, API R4 + `dirLL`/`aimFor`, `POST_ORBIT`, `ring: false`,
  `coast: true`, 400 km up over an EAST-facing coast (e.g. a continent's east seaboard), day side, the sun from the west
  of frame so the land is lit. **N6 east-coast band** (space.js default-off option or an `es_groupB_*.js` overlay mesh):
  `EU.surf`-style white surge, ONLY where the coast faces east (gradient of the coast SDF · east), creeping inland by
  `drift(e)` (1.9 km in 5 s is sub-pixel from orbit: DRAMATIZATION of width, say so in the hand-over, as giant-lens did);
  a faint tan dust veil streaking east over land; clouds dragged east (`cloudShift` driven by e). **Handshake 43.5 (HIT 2):**
  opens already showing the white coast line; **52.0 (HIT 3):** hard cut.
- **s08_earth** (52.0–63.5 s, 345 fr, e 4.25 → 5). Far orbit, 70 → 35 mm slow pull-back to the whole disc, day side
  (never all-night), surge bands on every east coast, dust veils. Earth's turn = `SP.earth.rotation.y = earthYaw(film)`
  (kit): frozen during the event, **turning again from 61.0** (T_RESTORE). Sound: a low tone under the braaam (score),
  a soft low swell at 61.0 (shot time 9.0), then near silence (the score cuts to true silence 62.85–63.45).

## GROUP C: s05_bay, s06_town
- **s05_bay** (29.0–36.5 s, 225 fr, e 2.333 → 2.958). `bayWorld(S, { slab: true, shadows })` (slab compiles the lifted-sea/seabed code; drop it if you build N4 another way) + a terrace `balcony()`
  at `BAY_CAM` (the lead's START point only: `camPos()` puts it `BAY_CAM.up` m above the hillside; you own the final
  framing). Looking north over the town (foreground, bottom) and the whole bay to the sea mouth (-Z); 20–24 mm.
  **N4 sideways sea** (an `es_groupC_*.js` file or a default-off ocean.js option): the bay water has slid east by
  `drift(e)` (890 m at the cut, 1.1 km at the end): the WEST half drained (seabed, puddles, stranded boats tilted:
  `splash.createBoats`, `patchSlab` seabed), the water heaped into a white-topped wall against the EAST shore (screen
  right), the pier and boats carried with it. Copy tsunami-524's surge/runup code (`runup.js`, `tsukit.js`) into your
  group file if it helps. Spray = crisp white droplets streaming east (no fog). It must read "the sea moved sideways",
  not "a tsunami arrived": the drained left half is the proof. Kit look: SUN, HAZE, POST_DAY, everything stylised.
  **Handshake 29.0 (HIT 1):** opens on the full scene (drained left, heaped right) already in motion; **36.5 → s06:**
  ends with the wall reaching the east waterfront.
- **s06_town** (36.5–43.5 s, 210 fr, e 2.958 → 3.542). Same terrace, 50–70 mm on the east waterfront and the town:
  the wall climbs over the promenade and races inland EAST (screen-right), roofs and boats carried right; the lighthouse
  (245, -1690) in spray. Houses: `bay.buildings` instances, re-posed / hidden as the water passes (closed form in e).
  **Handshake 36.5:** same light, same terrace, a longer lens; **43.5 (HIT 2):** ends at the peak, hard cut.
  Sound (both): gulls cut off at the cut, the sea's huge low suck and roar, hulls grinding on seabed, timbers breaking low.

## Notes from the lead's kit check (k0_kittest, GPU, ~0.3 s/frame at half size)
- Frame 1 reads: golden afternoon, haze, a stepped skyline with sky, the plaza crowd, the fountain, the mustard hero
  ~60 design px at (330, 620), the railing across the bottom (rail top y ≈ 830).
- At 2.2 s the crowd is down and rolling right, crowns stripped, cars and benches sliding; by 5 s the plaza is bare. That
  is the law (everything travels 222 m by 8.0 s), so s01's second half needs the dust, the umbrella/litter/glass chips and
  the leaves to stay busy; s04 needs the upwind river.
- `?dbg=1` / `?dbg2=1|2` on k0 are debug views of the dust planes.
