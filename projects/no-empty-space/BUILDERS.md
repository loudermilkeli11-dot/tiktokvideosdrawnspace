# no-empty-space: Builder brief (PHASE 2, three groups in parallel)

Read, in this order: `engine/API.md` (instead of engine sources), `channel/references/LOOK.md` + the 3 `look/sheet_*.jpg`,
`projects/no-empty-space/PRODUCTION.md` (the brief: §3 board, §5 sound, §6 look), `script.md` (the board as built),
`src/story.js` (the law), `src/kit.js` + `src/harbour.js` + `src/squeeze.js` (the shared kit). Code structure: copy
gravity-flip / earth-stops shots (`createStudio`, kit, camera, `S.run(t => …)`, page t = shot time + 4); sound per API §22.
`src/k0_kittest.js` is the lead's kit check: copy from it (it builds the world, the selfie woman, a phone squeeze, napkins,
the hero and his car, and has 5 test vantages `?v=0..4`). Lead's frames: `out/k0/` (v0 = frame 1, v1 quay, v2 mole → ferry,
v3 reverse → mountain, v4 85 mm tower).

## The contract
- Write ONLY your own shot files `src/<shot>.js` + `src/<shot>_sound.js`, and new files named after your group:
  `src/groupA_*.js`, `src/groupB_*.js`, `src/groupC_*.js`; new engine files `engine/src/nes_groupX_*.js`.
- NEVER edit shared files: `src/story.js`, `src/kit.js`, `src/harbour.js`, `src/squeeze.js`, `src/k0_kittest.js`,
  `overlay.js`, `score.json`, `shots.txt`, `script.md`, `PRODUCTION.md`, `POST.json`, this file, or another group's files.
  Need a kit change? Do it locally in your group file (wrap / copy) and write the request in your hand-over; the lead folds
  it in at phase 3. Existing engine files: only behind a **default-off** option and only these: **B** `ocean.js`,
  `splash.js`; **C** `space.js`, `moon.js`. Prefer a new `nes_group*` file.
- **Never commit, never push.** Never touch other projects (READ earth-stops / gravity-flip / giant-lens code and COPY what
  you need into your group files; never import across projects).
- Hand-over: `projects/no-empty-space/FINAL/group<X>.txt`: what you built, the frames you checked (and your verdict per
  shot), weak spots, kit requests, measured full-size frame time.
- Check every shot: `python tools/build_page.py projects/no-empty-space/src/<shot>.js`, then
  `node tools/frames.js projects/no-empty-space/dist/<shot>.html projects/no-empty-space/out/frames 0.2 <squeeze -0.3/+0.3> <last-0.2> --scale 0.5`,
  Read the PNGs, judge against LOOK.md + the board. At most 4 passes per shot. Time one full-size frame (`--scale 1 --mb <SAMPLES>`):
  **≤ 1.5 s on the GPU** (the lead's frame-1 test: 1.4 s at 8 samples with the whole town).

## The shared rules (every shot)
- **The ONE clock: FILM time.** `const film = SHOT['<shot>'].t0 + tt` (`filmT`). Every moving thing is a pure function of
  film time; never accumulate state; no `Math.random` (use `rng`, `hash`). `W.update(film, st)`, `squeeze.update(film, cam)`,
  `bits.update(film)` all take film time.
- **The one law** (story.js): a squeezed thing keeps its mass and packs to nuclear density: its size goes `RUNG[name].d0 →
  d1`; the squeeze starts at `SQZ[name].T` and is SHOWN over `SQZ[name].dur` (`implodeK`, the same curve the counter rolls
  with); the core is ALREADY falling from T: `depthAt(name, film)` (½gt², drag ignored). Never invent a number: the
  counter and captions read story.js (overlay.js is done: your picture must match its numbers and times).
- **THE SQUEEZE (kit `squeeze`, src/squeeze.js) is the one look for every rung:**
  ```js
  const SQ = squeeze(S, { T: SQZ.car.T, dur: SQZ.car.dur, c0: centre, sources: [car],                // sources hide at T
    shards: shardsFrom([car], 9000, { size: [0.04, 0.16] }), drop: (f) => depthAt('car', f),
    spin: 6, bead: { r: 0.05, minPx: 6, I: 10 }, streak: { len: 3, w: 0.03 }, light: { I: 40, dist: 25 } });
  // per frame, AFTER applyCam: SQ.update(film, S.camera);
  ```
  Shards are sampled from the object's own surfaces and colours, tear off outside-in, spiral, stretch and glow white-gold as
  they arrive; the bead is the speck (never a frame-wide flash: `post.p.flash` stays 0). Scale the counts and sizes to the
  rung (phone ~900 shards of 6–16 mm; tower 25,000–40,000 of 0.6–3.5 m). Add the **air inrush** with
  `bits(S, inrush(c0, T, n, { r, y, ground, cols, size, drag }))` (bits fly IN and pile up at the point: napkins, sugar
  packets, leaves, lemons, tiles, hats) and the outward **pressure / dust ring** with `bits(S, list)` (arrive: false
  velocities outward, `life` so dust puffs shrink away: **no fluffy smoke**, dust = thin crisp ribbons and puffs only).
  `hole(S, p, r, { tHot })` = the stylised coin-sized smoking hole where a bead goes into the ground.
- **The look (LOOK.md, strictly).** Kit look only: `SUN` (golden, low, from screen-left), `SKY`, `HAZE`, `HEMI`,
  `POST_DAY` / `POST_ORBIT`, `gradeDust(S, k)` (amber dust s06–s08: up to ~0.5). Everything you add is flat-shaded matte
  palette geometry (`styliseMat`, `plainMat`, `GB` + `patternMaterial` for buildings): never glossy photoreal. A foreground
  frame wherever the board has a vantage (the terrace rail is in `harbourWorld`). Dense, living detail; one clear cause →
  effect per shot; **the event fills the frame** (s06's shard spiral + dust ring ≥ half the frame; s08's gale fills it).
- **Gags (Commander, approved with the brief): every GAG subject is framed BIG and readable on a phone: ≥ ¼ of the frame
  height at the gag** (the woman staring at her empty hand s01, the old man and the pinhole saucer s02, the hero clicking
  his fob and patting his pockets s03, the gelato cone s08). Never 55–80 px at mid-distance for a gag. Big cartoon
  reactions (gaping, pointing, ducking, holding hats, running back). Nobody is squeezed or hurt; no faces drawn, no
  children, no gore. Use the kit's people: `makeHero` (the ONE character: stocky, straw hat, lime-and-white stripes, red
  shorts, keys), `makePerson` (one-offs; varied hats via `hat: { k 0..3, col }`, stripes, builds, `fem`), `townsfolk`
  (crowds with hats), extra POSES in kit.js (sit, sitSip, sitStare, sitPeer, selfie, lookHand, clickFob, patPockets,
  shrug, lookUnder, kneel, duck, holdHat, peer, cone, run, tray, pour, fish, accordion, catch). `handPoint(h)` = the right
  hand's world position (phone / cup / fob / cone sit there). Call `setPose` for every pose at load (geometry cache).
- **Type zones** (NO bands behind text, so keep calm, mid-tone picture there): title y 120–260 (s01, s12), counter x 50–300
  y 370–500, caption band y 550–640 (x 100–440). Key action in y 200–640; nothing important below y 765 or right of x 440
  in y 430–870. `inTypeZone(cam, p)` tests a world point. Avoid pure white (geyser, glass glare, the bead's halo) behind
  the caption band.
- **Samples:** `SAMPLES[shot]` from the kit (12 fast / 8 moving / 4 calm; raise them only inside a whip). **Post:**
  `POST_DAY` on the ground, `POST_ORBIT` in space.
- **Sound** (`<shot>_sound.js`, API §22 names only: `t0/t1/gain` dB, `t/dur/gain` for hit/whoosh/gasp): NO hits on cuts and
  NO squeeze booms (score.json has every cut and every completion boom: 1.95, 8.05, 14.0, 26.1, 33.8 (big_hit), 45.7, 55.0).
  YOUR shot sound plays the room (gulls, water lapping, chatter, cups, an accordion), the **INHALE** of each squeeze (a
  rising, sucking noise sweep from `SQZ.T`, low-passed, getting louder and higher in pitch, with a HARD stop at
  `T + dur`; recipe: `src(noiseBuf(ctx,'pink',…))` → `filt('bandpass', f)` with `f.frequency.setValueAtTime/
  exponentialRampToValueAtTime` 300 → 2,000 Hz → `env` from -40 to -14 dB → cut to -120 at T + dur) and the aftermath
  (air rush, debris, crowd gasps, water). NO ticks, nothing repeating above ~3 kHz; low and warm. Sync times from story.js
  written as constants with their source (`// SQZ.car.T - SHOT.s03_car.t0 = 2.0`).

## GROUP A: s01_phone, s02_cup, s03_car, s04_hole, s12_loop (the terrace, the quay, gags 1–2, the loop)
- **s01_phone** (0.0–6.0, 180 fr; phone squeeze T 1.60, done 1.95). `harbourWorld(S)` + `FRAME1_CAM` **exactly** (locked;
  a 2% eased push-in after 2.2 s is allowed). The selfie tourist at `WOMAN` (`makePerson`, pose `selfie`, then `lookHand`
  from ~2.3 s: she stares up at her empty hand, frozen; framed big at the right of frame), her phone at `handPoint`. Copy
  k0's squeeze + napkin inrush and grow it: the inrush must span **a third of the frame** (napkins, sugar packets, a straw
  hat off a neighbour's head, a menu card), the **table glass cracks** (a cracked-glass decal on a table top), the bead drops
  through the deck with a tiny dust puff (`hole` on the deck). Fill the lower terrace (y 9.0) with patrons at
  `W.terrace.tables` (sitting, sipping, a waiter with a tray, an accordion player at the rail) so frame 1 is dense and alive;
  they jump and gape at 2.0 s. Put the old man of s02 at the bottom-left table (-0.9, -11.3) so s02 is the same man.
  The hero: optional in s01 (the 35 mm portrait frame is only ~3 m wide at the rail; if you place him, keep him clear of the
  counter and caption zones); he MUST read clearly from s03. Frame 1 (t 0) is the cover frame and the loop frame: title
  y ~170 over clean sky, the counter over the shaded west shore: check contrast. **Handshake 6.0 → s02:** a big napkin
  (card) sweeps across the lens left → right in the last 0.25 s (foreground wipe), same light.
- **s02_cup** (6.0–11.5, 165 fr; cup T 7.80, done 8.05). Gag 1, 50 mm, low at table height on the old man (cardigan, flat
  cap or panama, `sitSip` → `sitStare` → `sitPeer`), **≥ ¼ frame tall**, slow drift. `makeCup` at his hand; the cup
  implodes in his fingers (small shard spiral, a pop of air: crumbs, a sugar packet and a napkin corner sucked in), the
  coffee drops as a short dark splash (bits, brown, onto his lap), a pinhole glows in the saucer (`hole`, r 4 mm, on the
  saucer). He lifts the saucer and looks through the hole (`sitPeer`); the waiter behind freezes mid-pour (`pour`), coffee
  still pouring from his pot into nothing. Opens with the napkin exiting right. **Handshake 11.5 → s03:** ends tilting
  down past the flower boxes toward the quay street (s03 opens looking down on the street).
- **s03_car** (11.5–18.0, 195 fr; car T 13.50, done 14.0). Quay street, 28 mm, behind the hero at mid-distance, slow track.
  `makeHero` at `HERO_QUAY` strolls to `makeCar` at `CAR` (red hatchback) and clicks his fob (`clickFob`, keys at
  `handPoint`; a low fob chirp in the sound at ~12.9). At 13.5 the car implodes: panels fold and shatter inward into a point
  (shards from `car.userData.parts`), dust, leaves, the fruit cart's lemons (`makeFruitCart` nearby: its lemons as inrush
  bits) and **his straw hat** fly toward the point; a glowing streak punches into the cobbles; `hole` in the cobbles. Gag 2
  (15.0–18.0): he clicks the fob again, pats his pockets (`patPockets`), shrugs, looks under a bench (`lookUnder`):
  **framed ≥ ¼ frame tall** (push in or cut the lens to ~40 mm for the gag; one eased move). Bystanders gape and point.
  **Handshake 18.0 → s04:** ends centred on the smoking hole (design ~ (270, 540)).
- **s04_hole** (18.0–23.5, 165 fr). 24 mm low and close at the hole (the match cut: the hole at the same screen spot),
  slow orbit. The hero kneels (`kneel`) and shines his phone light in; a faint glow sinks deep below (a dim point
  shrinking/dimming as `depthAt('car', film)` grows: 99 → 490 m); a dog (`makeDog`) sniffs the hole; a fisherman peers over
  his shoulder; **keep it lively** (Commander): people gathering in a ring (no children), a Vespa stopping, someone filming.
  **Handshake 23.5 → s05:** a whip-pan right (`whip`, ~70° over the last 0.3 s, samples 12 in the whip).
- **s12_loop** (66.0–70.0, 120 fr). 66.0–69.0: pure black (the overlay draws the end card; `post.p.fade = 1`). 69.0–70.0:
  the s01 page (same world, same `FRAME1_CAM`, same people) at **film `loopFilm(tt)`** (story.js: -1.0 → -0.033), samples
  = `SAMPLES.s12_loop` (= `s01_pre`); s01 must use `SAMPLES.s01_pre` until the squeeze so the loop frames match. Its last
  frame + 1/30 s must equal s01 frame 0: check both PNGs side by side. Sound: s01's pre-squeeze bed from 69.0, silence before.
- Sound A: s01 the café (gulls, cups, chatter, an accordion that **stops mid-note** at 1.6), the phone inhale (tiny, 0.35 s),
  gasps; s02 quiet café, the cup pop inhale (0.25 s), a coffee splash, a gasp, the pour dripping; s03 footsteps, a low
  fob chirp (once, low-pitched), the car inhale (0.5 s: metal groan pulled inward), debris settling, the second fob click
  into silence, distant car alarms (low); s04 a hollow wind tone from the hole, a dog sniff, a falling-pitch rumble sinking.

## GROUP B: s05_ferry, s06_tower, s07_drop (the harbour set pieces: THE SET PIECE is s06)
- **s05_ferry** (23.5–30.0, 195 fr; ferry T 25.50, done 26.1). The harbour, 35 mm wide, a slow push; you own the vantage
  (the kit's `?v=2` from the mole sees the ferry bow-on and small: move closer: e.g. the east promenade or the water, so the
  70 m ferry fills ~half the frame width). Opens landing out of s04's whip. `W.ferry` (docked, empty, the `FUORI SERVIZIO`
  sign on the quay) implodes: hull plates shear inward (shards from `W.ferry`, ~15,000, 0.3–1.6 m), and the sea rushes into
  the hole: a **water crater that slams shut into a geyser column of white water, foam and spray** (a short-lived dimple in
  the sea as a default-off `ocean.js` option or your own mesh + `splash.createSpray` column: crisp droplets and sheets, not
  fog), then a **ring wave** that rocks every boat (`W.update(film, { boatPose })`) and slaps the quay with spray; mooring
  ropes snap; the crowd on the promenade runs back (`run`); a fish lands in a tourist's arms (`catch`). No smooth blob:
  foam, spray, detail. **Handshake 30.0 (HARD cut):** ends at the ring wave's peak, boats rocking.
- **s06_tower** (30.0–37.0, 210 fr; tower T 33.00, done 33.8). From the terrace (`FRAME1_CAM.pos`), 85 mm, locked, then a
  hit shake (`kick` at 33.8). 30.0–33.0: the pre-rumble: gulls lift off, the water shivers, a crane's jib swings. At 33.0
  the 381 m tower (`W.tower`) implodes **from the outside in** in 0.8 s: glass skin, floors, cranes and the OPENING 2027
  banner tear into 25,000–40,000 shards that spiral into one blinding point, **dragging rock off the headland** (extra rock
  shards sampled from a disc around the tower base, `HEAD`), and the bead falls into the headland. Then the shock: a
  **dust ring** races out over the water (crisp tan ribbons + puff bits, `gradeDust` → 0.5), the harbour surface flattens
  and ripples inward, the terrace awning rips (`W.terrace.awning`), terrace glass shatters inward (glass bits), people duck
  (`duck`) and the hero holds his hat (`holdHat`) if you show him (a reverse/foreground element is yours to choose). The
  event fills **≥ half the frame**. Risk (brief §4): it must read PHYSICAL, never a model scaling down. Test frames 32.8 /
  33.2 / 33.5 / 34.5 first; fallback: slow nothing (the counter is locked to 0.8 s) but double the outer-skin shard count.
  **Handshake 37.0 → s07:** the dust ring fills the lower half; s07 opens inside thin dust ribbons clearing.
- **s07_drop** (37.0–43.0, 180 fr). 50 mm from a boat in the harbour, slow push, on the headland: the grain is falling
  (`depthAt('tower', film)`: 78 → 490 m) and the rock above it fails: a star of fissures cracks open, the plateau caves in
  (displace `W.town.terrain` vertices in a radius around (TOWER.x, TOWER.z) per frame in closed form, or build your own
  breakable headland cap), rocks tumble into the sea in splashes and spray, the water swirls toward the cave-in, dust
  settles in gold light, people on the far mole point. **Handshake 43.0 (HARD cut):** ends on settling dust.
- Sound B: s05 a steel groan inhale (0.6 s), the water slam + geyser roar, ropes snapping, the ring wave slapping the quay,
  crowd shouts; s06 the low ground rumble and birds lifting (riser 1 is in the score), the 0.8 s inhale with glass
  shrieking inward (low-passed), **hard stop at 33.42** (score holds true silence 33.42–33.8 and lands the big_hit at
  33.8), then the shock roar, windows shattering (low-passed), crowd screams; s07 rock cracking, the cave-in, splashes,
  the rumble sinking.

## GROUP C: s08_mountain, s09_earth, s10_speck, s11_moon (the mountain, gag 3, the Earth, the twist)
- **s08_mountain** (43.0–50.0, 210 fr; mountain T 44.50, done 45.7). Reverse: from the mole looking back at the town and
  the mountain (kit `?v=3` is the start point), 24 mm, low, locked, then a small shake. `W.mountain` implodes: rock faces
  shatter into slabs (30,000+ shards, 8–40 m) streaming into a point (it sits ~4.3 km away: make the stream read; the
  slabs are big), the skyline becomes open sky. Then the **gale**: the air rushes toward where it stood: laundry, umbrellas,
  kites (`W.kites`), gulls (`W.birds`), roof tiles and café chairs fly up through the town toward the point (bits with
  velocities toward the mountain's centre; the frame fills with flying things). **Gag 3** (46.0–49.8): the gelato seller on
  the mole (`makeGelatoCart` + `makePerson` pose `cone`): the scoop flies off the cone toward the mountain; he is left
  holding the empty cone, staring at it: **framed ≥ ¼ frame tall** (put him and the cart in the near foreground of this
  locked frame, or one eased push). `gradeDust` up to ~0.4. **Handshake 50.0 → s09:** ends with the gale easing.
- **s09_earth** (50.0–56.0, 180 fr; Earth T 52.00, done 55.0). 50.0–51.5: a crane up from the town through the dust
  (the harbour world). **HARD cut at 51.5** (`T_ORBIT`) to orbit: 70 mm on the whole sunlit Earth (space.js, API R4,
  `ring: false`, day side, never fuzzy, never a close crop of the satellite texture), slow pull-back. **N3 Earth squeeze**:
  over 3 s the radius goes 6,371 km → `R_MINI` (183.7 m) along `implodeK('earth', film)` (the counter's curve): crust plates
  (24–40 big plates with the Earth texture, `breakup.js`-style + `trimBreakup`) crack and fall inward, the oceans tear
  into white spray streams, the cloud shell lags and is pulled in last; it ends as a white-gold point (the bead). Sharp and
  clean (TASTE). Fallback: fewer, bigger plates with white spray seams. **Handshake 56.0 → s10:** ends with the point centred.
- **s10_speck** (56.0–61.0, 150 fr). Deep space close-up, 35 mm, a slow dolly toward the ball: **N4** a hot glowing ball
  367 m wide (an emissive low-poly sphere, surface flicker and heat shimmer, bloom) against a sharp star field; beside it a
  thin ghost outline of the lost 381 m tower (`towerGroup` geometry as edges/wireframe, faint), the same height: the scale
  reads at a glance. Opens on the point from s09. **Handshake 61.0 → s11:** ends panning left.
- **s11_moon** (61.0–66.0, 150 fr). 135 mm low behind the Moon's limb, slow pan: the crisp cratered Moon (`moon.js`, sharp)
  glides through frame on its usual path; far beyond it the Earth-speck is a single bright star; a faint thin orbit arc
  traces the Moon's path. **The twist** reads: the Moon doesn't notice. **Handshake 66.0 → s12:** fades to black over the
  last 0.5 s (`post.p.fade`).
- Sound C: s08 a long deep inhale (1.2 s), then the gale roar sweeping through the town (cloth flapping, tiles), the
  gelato seller's small "oh" (a gasp, low); s09 the gale fading as we rise, then (riser 2 and the braaams are in the score)
  a low groan into a deep inhale 52.0–55.0 with a hard stop at 55.0; s10 a single low tone + a soft high shimmer (no ticks);
  s11 near silence, a faint low pad thinning out by 65.5.

## Notes from the lead's kit check (k0_kittest, GPU)
- Frame 1 reads as a postcard: the inlet's two pastel shores converge on the mouth, the headland tower (OPENING 2027 banner)
  on the right, the flower-box rail + café tables in the foreground, golden light from the left, the selfie tourist big at
  right with her phone at ~(340, 370) design px; the phone squeeze reads as a shard spiral in her hand (`out/k0/v0`).
- 1.4 s per full-size frame at 8 samples with the whole town on the GPU.
- The quay street (`?v=1`) is the strongest set: the striped hero, the red car, the cobbles, the pastel shore.
- Weak spots to own: frame 1's lower terrace is empty until A adds patrons; the ferry is small from the mole (B moves
  closer); the mountain is 4.3 km from the mole (C: the slabs must be big and the stream must read).
