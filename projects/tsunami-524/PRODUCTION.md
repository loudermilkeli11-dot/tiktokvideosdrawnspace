# PRODUCTION: tsunami-524 (video #3)

**Greenlit by the Commander:** 2026-11-12 05:47 UTC ("chosen pitch: tsunami").
**Sources:** pitch #1 in `pitches/2026-11-11-pitches-2.md`, the sealed dossier `channel/war-room/2026-11-12-which-pitch-is-best-or-redraw-if-necessary.md`, the Writer's board v2 `projects/tsunami-524/script.md` (this brief overrides the board wherever they differ), `channel/BRAIN.md`, `PLAYBOOK.md`, `CLAUDE.md`.
**Slug:** `tsunami-524`. This folder already holds this pitch's board, so the brief lives next to it. `projects/tsunami/` holds Studio's wave-test kit (`src/tsukit.js`, `t01_light.js`, `t02_town.js`). Copy that kit into `projects/tsunami-524/src/` and build from there. Don't build in two folders.

**Gate 0 (before any other build work).** Run the wave test from `projects/tsunami/` at `?scale=0.5` on the Commander's PC (`IJ_GPU=1`). It has not run yet: the build commands were refused on 11-12. It is due **2026-11-12 18:00 UTC**. It PASSES only if all 5 of these hold on the key frames:
1. The lighthouse and the wave crest are both in frame for ≥ 2 s, and a muted viewer can say "taller than the lighthouse" without a caption.
2. The water face has body: darker green-blue, foam streaks, a breaking lip. No flat white strip and no "rain" texture.
3. The town shoreline is hit and the surge visibly climbs over buildings (t02).
4. Nothing moves more than 40 px per frame without blur, and there are no white flashes.
5. The time per frame is ≤ 0.5 s on the GPU at full size with 4 samples.

If any check fails, the build switches to the fallback, pitch #2 "every satellite collides" (`pitches/2026-11-11-pitches-2.md`). The Director reports that switch to the Producer and does not try to patch around the failure.

---

## 1. Premise and title
- **Title (frame 1, y ≈ 170):** What if a *524 m*|wave hit town?  (accent: *524 m*, amber)
- **Cover line (fact with a number):** `IN 1958, WATER RAN 524 M UP AN ALASKA MOUNTAIN`
  - Use "ran up", "climbed" or "stripped the forest to" for the real number. Never write "a 524 m wave hit…". 524 m is a measured **run-up**, not a wave height. This replaces the board's cover line "A 524 M WAVE CLIMBED…", which broke this rule.
- **Post caption:** `Lituya Bay, Alaska, 1958: the water really ran 524 m up the mountainside. Everything after the first splash is dramatization.` No question and no prompt.

## 2. The law (`src/story.js`, the only source of on-screen numbers)
**The rule.** A rockfall into the bay drives water up the far slope to the real record of **524 m**. After that, each step doubles it: **H(k) = 524 m × 2^k**, k = 0…3. The counter also shows the vertical speed water needs to reach H: **v = √(2·g·H)**, with g = 9.81 m/s².

**The one stated liberty (DRAMATIZATION).** We treat the real 524 m run-up as a wave height and keep doubling it, then let the water leave Earth. The 1.5 s fuse, the town and lighthouse inside the bay, and the climb in speed from 1,032 km/h to escape speed are also part of the liberty. Only the 524 m run-up, the 1958 date and the 3 reference facts are real.
On-screen tag for the whole video (x 64, inside the safe area): `DRAMATIZATION · TOWN AND WAVES`.

**Sources**
| fact | value | source |
|---|---|---|
| Lituya Bay run-up, 9 July 1958 | 524 m (1,720 ft) | primary: Miller, USGS Professional Paper 354-C (1960), https://pubs.usgs.gov/pp/0354c/report.pdf · secondary: https://earthobservatory.nasa.gov/images/147557/lituya-bays-apocalyptic-wave |
| average ocean depth | 3,682 m | NOAA, https://oceanservice.noaa.gov/facts/oceandepth.html |
| Earth's escape speed | 11.186 km/s | NASA Earth Fact Sheet, https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html |
| ocean volume | 1.335 billion km³, shown as 1.3 | NOAA NGDC, https://www.ngdc.noaa.gov/mgg/global/etopo1_ocean_volumes.html |

Keep these off screen because they are unverified or vary by source: the rockfall volume, the quake magnitude and "160 km/h".

**Key counter values (computed)**
| step | H = 524 × 2^k | 2·g·H | v = √(2gH) | km/h (×3.6) |
|---|---|---|---|---|
| k0 (real) | 524 m | 10,281 | 101.4 m/s | **365** |
| k1 ×2 | 1,048 m | 20,562 | 143.4 m/s | **516** |
| k2 ×4 | 2,096 m | 41,124 | 202.8 m/s | **730** |
| k3 ×8 | 4,192 m | 82,247 | 286.8 m/s | **1,032** |
| escape | — | — | 11,186 m/s | **40,270** (11.186 × 3,600) |
- At ×8, 4,192 m is more than the 3,682 m average ocean depth, so the wave is taller than the ocean is deep (4,192 − 3,682 = 510 m taller).
- s04 fact line: `round(524 / roofH)`× taller than the roofs. `roofH` is read from `bay.js`'s real roof height in scene metres. If it is 20 m, that gives 26×. The board follows the code, not the other way round.
- The counter is never typed in by hand. It is read from `story.js` for every frame.

## 3. The board (9 shots, 915 frames, 30.5 s at 30 fps)
**Hero:** one featureless adult in a yellow raincoat, seen from behind at the pier rail, 55–80 design px tall, with full-colour clothes (`figure.js`). They are in frame 1 and in the loop second (s09). They are never shown at the moment of impact: from s03 on they are gone or small and far away running up the quay.

| # | shot | frames | film | set | camera | what visibly happens | caption (≤ 8 words) | counter: label / value / fact line |
|---|---|---|---|---|---|---|---|---|
| 1 | s01_bay | 0–44 | 0.0–1.5 | bay, noon | 28 mm, **locked** `FRAME1_CAM` from behind the hero at the pier rail | frame 1 is already moving: the far cliff's crack is open and the slab is sliding, dust and rocks bounce, gulls burst, the crowd points; the slab hits the water at 1.5 s | T (0.0–3.0): What if a *524 m*\|wave hit town? | ROCKFALL IN / 01.500 → 00.000 / LITUYA BAY, ALASKA 1958 |
| 2 | s02_cliff | 45–134 | 1.5–4.5 | bay, far slope | 50→35 mm, low side-on, tilts up with the crest; whip-pan out | the impact blows a splash sheet up the opposite slope, trees snap, and the crest passes the 524 m mark at 4.1 s | C1 (3.0–5.8): Alaska, 1958.\|It *climbed 524 m.* | RUN-UP / 0 → 524 M / REAL · LITUYA BAY 1958 |
| 3 | s03_wall | 135–224 | 4.5–7.5 | bay, pier end | 35 mm, pier end looking down the bay; spray wipe out | the wall races in, boats are thrown, and **the lighthouse is swallowed at 6.5 s** (the scale beat, inside 8 s) | C2 (5.8–8.6): It swallows\|the *lighthouse.* | WAVE HEIGHT / 524 M / RISING AT 365 KM/H |
| 4 | s04_town | 225–374 | 7.5–12.5 | bay town plaza | 24 mm street level, then carried up with the water into a high aerial | an empty plaza; cars slide, awnings tear, the fountain is smothered; the wave tops the roofs at 9.0 s; the waterline climbs the valley sides and the forest is stripped; ×2 | C3 (8.6–11.4): Rooftops vanish\|in *seconds.* · C4 (11.4–14.2): Now make it\|*twice* as tall. | WAVE HEIGHT / 524 → 1,048 M (tween 10.5–11.1) / ROOFS 20 M → WAVE 26× TALLER, then ×2 · RISING AT 516 KM/H |
| 5 | s05_standup | 375–479 | 12.5–16.0 | bay, `FRAME1_CAM` | 28 mm, exactly frame 1's framing; underside wipe out | match shot: the same pier now leads to a standing wall above the cliff top on bare wet seabed with stranded boats; it leans and overhangs; ×4 | C5 (14.2–17.0): *Four times.*\|The sea stands up. | WAVE HEIGHT / 1,048 → 2,096 M (12.5–13.1) / ×4 · RISING AT 730 KM/H |
| 6 | s06_lift | 480–584 | 16.0–19.5 | above the cloud deck | 24 mm, rising; the horizon curves into a limb | a sheet and column of water punch up through the clouds, carrying boats and spray; the sky turns deep blue; ×8 | C6 (17.0–20.0): Taller than the\|*ocean is deep.* | WAVE HEIGHT / 2,096 → 4,192 M (16.0–16.6) / ×8 · AVERAGE OCEAN DEPTH 3,682 M |
| 7 | s07_peel | 585–719 | 19.5–24.0 | Earth from orbit, day side | 35→70 mm, slow pull-back | the ocean peels off Earth as a shell and speeds up, with 1–2 airliners carried out with it | C7 (20.0–24.0): The water\|*leaves the planet.* | WATER SPEED / 1,032 → 40,270 KM/H (stops 23.0 s) / ESCAPE SPEED: 11.2 KM/S |
| 8 | s08_tail | 720–824 | 24.0–27.5 | orbit, wide | 70 mm, slow dolly | a brown-grey Earth with bare seabed, the oceans a glittering comet tail with sunglint | C8 (24.0–27.5): *1.3 billion km³*\|of ocean. Gone. | OCEAN LEFT / 100% → 0% / 1.3 BILLION KM³ |
| 9 | s09_loop | 825–914 | 27.5–30.5 | orbit → bay | orbit 2.0 s; **hard cut on a hit at 29.5 s** to `FRAME1_CAM` | the empty Earth turns, then the calm frame-1 bay with the hero and crowd at the moment before the crack (page time 3.9 s); hold 1.0 s, then TikTok restarts on frame 1 | none (silence) | orbit: none · bay: ROCKFALL IN / 01.500 frozen / LITUYA BAY, ALASKA 1958 |

- **Escalation steps (10):** crack → impact → 524 m run-up → lighthouse → town → ×2 → ×4 → ×8 → escape speed → ocean gone. There is a payoff by 0:03 (the impact at 1.5 s) and a new place or counter on every shot. s05 goes back to the bay **on purpose**: it is the match shot that sells the loop.
- **Fixes over board v2:** a hero has been added (the formula requires one, and v2 had only a crowd). s02's label is RUN-UP, not WAVE HEIGHT (wording rule). The cover line has been fixed (§1).
- **Transitions:** hard cut on the boom (1.5 s) → whip-pan with blur (4.5 s) → spray wipe, dark and with droplets, never white (7.5 s) → hard cut on the boom (12.5 s) → wipe by the wall's underside (16.0 s) → push through the sky (19.5 s) → dolly (24.0 s) → hard cut on a hit (29.5 s).

## 4. Build map
| shot | reuse (engine) | NEW (keep small) |
|---|---|---|
| s01 | `bay.js` (town, lamps, pier, boats, lighthouse), `ocean.js`, `sky.js` day, `crowd.js`/`figure.js` (hero + 25–40 figures, `POSES` phones and points), crowd birds, `camera.js` | **N1 cliff + slab:** a far-cliff mesh with a crack that opens and a slab that slides, plus rock debris as particles (sparse dust, no fluffy smoke). Save `FRAME1_CAM` in `src/kit.js`. |
| s02 | `splash.js` spray, `ocean.js`, `fire.js` none | **N2 run-up sheet:** a water/spray sheet that climbs the slope to 524 m scene height, with trees snapping (instanced). The cliff must reach ≥ 600 m in scene units. |
| s03 | **`projects/tsunami/src/tsukit.js`** wave (bump + GLSL twin, crest foam), `splash.js` boats/spray | spray-wipe card (dark, droplets) |
| s04 | tsukit wave, `bay.js` town, `city.js` props (cars, trees, fountain, awnings) dressed into the bay town | **N3 valley waterline:** a rising waterline on the terrain plus forest stripping (a ground-shader mask that follows H). The camera carry-up. |
| s05 | tsukit with H = 2,096 (the standing wall), `ocean.js` seabed mode, `splash.js` stranded boats | wall lean/overhang (a deformation of the bump profile) and the underside wipe |
| s06 | `clouds.js` deck, `sky.js` (day → deep blue), `splash.js` boats | **N4 water column/sheet** through the cloud deck (a reused shell segment or an extruded tsukit profile) |
| s07 | `shell.js` oceans lifting off, `space.js` Earth (day, clouds, atmosphere), `planes.js` | the speed ramp tied to the counter |
| s08 | `space.js` seabed/scar mode, `shell.js` tail, Sun glint | — |
| s09 | s08 orbit plus s01 at page time 3.9 s (calm, pre-crack) | — |

- **Riskiest shots:**
  1. **s02_cliff.** The run-up sheet is all new, and 524 m has to *read* as huge. Put the lighthouse or the treeline in frame for scale.
  2. **s05_standup.** A 2 km wall over the pier. It is the match shot and the scale proof. If it reads as a blue blob, it kills the middle.
- **Cut if time runs out:** shorten s06 (fold the ×8 into s05's last 1.0 s) and keep s07–s09. Never cut s03 (the lighthouse) or the loop.
- **Frame-1 match test:** diff s01 at page time 3.9 s against s09's last frame. It must be identical except the counter (both read 01.500).
- **Policy:** no figure is ever touched by water on screen. People are far, small and running, or already gone.

## 5. Sound (no voiceover; `audio_core.js` + `score.json`)
| time | beat |
|---|---|
| 0.0 | stone crack (mid-range) and a low rumble starts; gulls |
| 0.5, 1.0 | ticks (s01 only) |
| **1.5** | **cut hit:** sub boom plus a mid-range `hit` above 200 Hz (replaces the 1.5 tick) |
| 1.5–4.5 | rock roar, deep water slap, crest hiss; riser 1 starts |
| 4.5 | whoosh on the whip-pan |
| 4.5–7.5 | freight-train roar, splintering wood, one boat horn |
| 9.0 | deep thud as the wave tops the roofs; car alarms drown; muffled underwater tone |
| 10.5–12.5 | low swell and a rock groan, rising |
| **12.5** | **cut hit:** sub boom (braaam) |
| 12.5–16.0 | roar grows, deep rumble |
| 16.0–19.5 | thin high wind, water hiss, tearing bass |
| 19.5–24.0 | score only (space is silent): riser 2 climbs with the speed counter and peaks at 23.0 s |
| 24.0–27.5 | riser drops to a single sub tone, fading |
| 27.5–29.5 | near silence |
| **29.5** | **cut hit:** a soft sub hit with a mid-range click on the cut to the bay |
| 29.5–30.5 | **silence** (only bay room tone, very low); the crack restarts on the loop |
- Master to −14 LUFS, peaks ≤ −1 dBTP. The cut hits have energy above 200 Hz (check.py).

## 6. Look
- Daylight first: noon bay with a blue sky (tsukit's day HDRI). Orbit shots are on the day side, never an all-night Earth.
- Full-colour people at mid-distance: the hero in a yellow raincoat, a mixed crowd with phones. No silhouettes, no faces, no children, no gore. Nobody is shown being hit.
- Water has body: deep green-blue face, foam streaks, breaking lip, droplet spray. No flat white strips, no rain textures, no fluffy smoke. Cliff dust is sparse particles.
- Motion blur 180°: 4 samples (s01, s08, s09), 8 (s02, s05, s07), 12 (s03, s04, s06). ACES, bloom, grain, vignette (`post.js`). No white strobes.
- **Safe area (540×960 design px):** all type in x 60–480 and y 100–765, and left of x 440 for y 430–870. Title y ≈ 170, counter x 64 at y 384–470, captions centred on y 590 (≤ 330 wide), DRAMATIZATION tag at x 64. Key action in y 200–640. Use `band` on captions over bright spray or sky. Overlay `style: {look: 'v2'}`.

## 7. Render and QC
- Build: `py tools/build_page.py` per shot, then check key frames with `node tools/frames.js` on the GPU (`IJ_GPU=1`; never mix with SwiftShader inside a shot).
- Render: push to `main`, then the Commander runs `.\pc\render_project.ps1 tsunami-524` (or `node tools/render_all.js … --quality max`). Use `-Shots a,b` to redo single shots.
- `tools/check.py` must PASS on `final.mp4`:
  - frames: 915 frames, 1080×1920, 30 fps, under 100 MB;
  - loudness: −14 LUFS;
  - flashes: no upward-jump flashes (check the wipes and the 1.5 s impact especially);
  - cut hits: above 200 Hz at 1.5, 12.5 and 29.5 s; silence as the last beat;
  - text: contrast ≥ 3:1 after yuv420p, checked before assembly with `--contrast overlay.mov --bg clean.mp4 --every 0.2`; no safe-area WARNs.
- Also: the frame-1 vs last-frame diff (§4) and a contact sheet reviewed by the Director before hand-off. One auto-fix round, then report.

## 8. Posting
- **Cover:** `IN 1958, WATER RAN 524 M UP AN ALASKA MOUNTAIN`
- **Caption:** see §1 (no question, no bait).
- **Hashtags (fixed):** `#whatif #physics #space #earth #science`
- **AI-generated label:** ON. The DRAMATIZATION tag is visible.
- **Slot:** 2 PM CST = **2026-11-14 20:00 UTC**, after the gravity-flip 48 h pull (2026-11-14 00:30 UTC) and the Analyst's post/hold call (due 2026-11-14 06:00 UTC). Hold if Gate 0 or QC hasn't passed.
- **At 48 h (2026-11-16 20:00 UTC):** log views, average watch, watched-full, the 3 s hold, For You share, traffic sources and the retention drop point in `channel/results.csv`.
