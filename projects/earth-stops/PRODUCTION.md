# PRODUCTION: earth-stops

**Greenlit by the Commander:** 2026-11-12 14:33 CT (20:33 UTC), pitch p2 in `pitches/2026-11-12-4.json`.
**Sources:** that pitch; `channel/BRAIN.md`; `channel/TASTE.md`; `channel/references/LOOK.md`; `PLAYBOOK.md`; `CLAUDE.md`; `engine/API.md`; the structure of `projects/giant-lens/PRODUCTION.md` (≥ 4 s shots, no ticks, 4 low cut hits, frame-1 loop).
**Slug:** `earth-stops`. Build everything in `projects/earth-stops/`.

## Where this brief departs from the pitch or the rules (and why)
| pitch / rule said | brief does | why |
|---|---|---|
| beats at 0:03, 0:10, 0:17… with separate counters (WIND, DEBRIS SPEED, SURGE…) | **the whole film is the 5 seconds, shown 7× slower**, with one running timer `STOPPED FOR 0.000 s → 5.000 s` (milliseconds rolling) across every shot; each shot's fact line names the energy now in motion | Niche hits run a countdown with ms from frame 1 (BRAIN). One clock ties 8 places into one event, and the loop is natural: at 5.000 s the spin returns, cut to frame 1. Slow motion is stated in the DRAMATIZATION tag. |
| WIND 1,370 km/h | **1,372 km/h** (381.0 m/s × 3.6) | Computed, not rounded by hand. |
| "cloud deck smeared into streaks" | the whole cloud deck **races east as one sheet**, torn ragged only where it drags over mountains; an airliner **rides along untouched** | Honest: the air keeps the same speed as the plane, so planes feel nothing. That twist is caption C6. |
| "sandblasted band along east-facing coasts" | a white surge band about **1.9 km deep** (381 m/s × 5 s) on every east-facing coast + a tan dust sheet over land | The law caps how far anything travels in 5 s. |
| counter "SURGE · wall of water" | fact line `THE BAY'S WATER · 2.2 PJ` | Every number from `story.js`. |
| LOOK rule 1: one place transformed over time | 8 places, one event | The Commander's 11-11 rule (city, bay, sky, orbit) and the pitch. The plaza opens and closes the film, so the viewer still has one home place. |
| LOOK: 60–80 s, black end card with a fact | **38.0 s**, ends in orbit, hard-cut to frame 1 | BRAIN default is 30–38 s until Gate A (2026-11-13) says otherwise. The real fact lives in the cover, the s08 fact line and the post caption. If Gate A passes, the Director may stretch each shot ×1.7 (64 s) without changing the board. |
| risk: things flying looks like gravity-flip | **everything moves sideways, one direction (east, screen-right), never up**; the shock/dust front is the signature | Must not read as a gravity-flip variant. |

**Gate 0 (before any other build work).** Build `s01_plaza` only, render at `?scale=0.5` on the Commander's PC (`IJ_GPU=1`), export the first 3.0 s **muted, no captions** (title and counter on). PASS only if:
1. A cold viewer says "the ground stopped / everything got thrown sideways" without a caption. "Explosion" or "wind storm" is a FAIL (the cause must read as the ground stopping: the trees and buildings stay, everything loose goes).
2. At 0.8 s the counter snaps 381 → 0 m/s and, in the same frame, every loose thing starts moving screen-right together.
3. By 2.0 s: the crowd, the cars and the fountain water are all streaming right; the trees are stripped of leaves sideways.
4. Frame time ≤ 0.5 s on the GPU at full size with 4 samples.
If it fails, the Director reports to the Producer and stops.

---

## 1. Premise and title
- **Title (frame 1, y ≈ 170, ≤ 410 wide, 2 lines):** What if the Earth *stopped spinning*|for 5 seconds?  (accent: *stopped spinning*, amber; the Commander greenlit this wording)
- **Cover line:** `AT THE EQUATOR THE GROUND MOVES 1,674 KM/H. STOP IT AND EVERYTHING KEEPS GOING` (from the greenlit pitch; 1,674 is verified in §2).
- **Post caption:** `At the equator the ground moves 1,674 km/h. Stop it for 5 seconds and everything loose keeps going. Shown 7x slower; the rest is dramatization.` No question, no prompt.

## 2. The law (`src/story.js`, the only source of on-screen numbers)
**The rule.** Earth's surface moves east at **v(φ) = 465.1 × cos φ m/s** (equatorial circumference 40,075 km ÷ sidereal day 86,164 s = 465.1 m/s). Our city sits at **φ = 35°N: v = 465.1 × 0.8192 = 381.0 m/s = 1,372 km/h**. When the ground stops, anything not fixed to it (air, sea, people, cars, loose parts) keeps moving east at 381 m/s relative to the ground, carrying **½v² = 72,580 J per kg**. In 5 s it travels **381 × 5 = 1,905 m ≈ 1.9 km**. Attached things (trees, towers) feel the full blast of their own inertia and of the air.

**The one stated liberty (DRAMATIZATION).** The ground stops instantly and restarts instantly after 5.000 s; the planet itself does not break, and Earth's own momentum is ignored. Shown 7× slower. The exact destruction pattern is illustrative.
On-screen tag for the whole video (x 64): `DRAMATIZATION · SHOWN 7× SLOWER`.

**Clock.** Film time t (s) → event time **e = (t − 0.8) / 7**, clamped to [0, 5]. The stop lands at film 0.8 s; e = 5.000 at film 35.8 s.

**Sources** (Scout VERIFIES before `story.js` locks any number)
| fact | value | source |
|---|---|---|
| equatorial radius 6,378.137 km; sidereal day 23.9345 h | 465.1 m/s, 1,674 km/h | https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html |
| speed of sound, 15 °C sea level | 340.3 m/s → 381 / 340.3 = **Mach 1.12** | ISA standard atmosphere, https://www.grc.nasa.gov/www/k-12/airplane/sound.html (VERIFY) |
| strongest surface wind gust measured | 408 km/h (3-s gust, Barrow Island 1996) → 1,372 / 408 = **3.4×** | https://wmo.asu.edu/content/world-maximum-surface-wind-gust-3-second (say "gust", never "wind") |
| mass of the atmosphere | 5.148 × 10¹⁸ kg | Trenberth & Smith 2005, https://doi.org/10.1175/JCLI-3299.1 (VERIFY) |
| ocean volume | 1.335 × 10⁹ km³ × 1,025 kg/m³ = 1.37 × 10²¹ kg | https://www.ngdc.noaa.gov/mgg/global/etopo1_ocean_volumes.html (VERIFY) |
| air column over 1 m² | 101,325 Pa ÷ 9.81 = 10,329 kg | standard sea-level pressure |
| world primary energy use | ≈ 620 EJ/yr (2023) | https://www.energyinst.org/statistical-review (VERIFY) |

**Key values (computed; story.js recomputes them). KE = mass × 72,580 J/kg unless noted.**
| shot | what is moving east | mass | energy in motion | shown (fact line) |
|---|---|---|---|---|
| s01 | one car | 1,500 kg | 1.09 × 10⁸ J | `ONE CAR · 109 MJ` |
| s02 | the air in this street (30 × 500 × 50 m × 1.2 kg/m³) | 9.0 × 10⁵ kg | 6.5 × 10¹⁰ J | `AIR IN THIS STREET · 65 GJ` |
| s03 | one tower's top 10 floors (10 × 1,600 t) | 1.6 × 10⁷ kg | 1.16 × 10¹² J | `TOP 10 FLOORS · 1.2 TJ` |
| s04 | the bay's water (2 km × 1 km × 15 m × 1,025) | 3.08 × 10¹⁰ kg | 2.2 × 10¹⁵ J | `THE BAY'S WATER · 2.2 PJ` |
| s05 | the air over the town (5 × 5 km × 10,329 kg/m²) | 2.58 × 10¹¹ kg | 1.9 × 10¹⁶ J | `AIR OVER THE TOWN · 19 PJ` |
| s06 | all the air in view (200 × 200 km) | 4.13 × 10¹⁴ kg | 3.0 × 10¹⁹ J = 30 EJ | `ALL AIR IN VIEW · 30 EJ = 18 DAYS OF HUMAN ENERGY` (30 / 620 × 365 = 17.7) |
| s07 | the whole atmosphere (all latitudes: ½ M × 465.1² × ⅔, the ⅔ = mean cos²φ over the sphere) | 5.148 × 10¹⁸ kg | 5.148e18 × 72,106 = 3.7 × 10²³ J | `WHOLE ATMOSPHERE · 600 YEARS OF HUMAN ENERGY` (3.71e23 / 6.2e20 = 599) |
| s08 | all the oceans (same ⅔ factor, ≈) | 1.37 × 10²¹ kg | 1.37e21 × 72,106 = 9.9 × 10²⁵ J | `ALL THE OCEANS · 160,000 YEARS OF HUMAN ENERGY` (9.87e25 / 6.2e20 = 159,000) |
- 9 rungs from 109 MJ to 9.9 × 10²⁵ J (×10¹⁸). Every shot is a bigger rung.
- Other on-screen numbers: wind **1,372 km/h**, **Mach 1.1**, **3.4×** the record gust, travel in 5 s **1.9 km**.
- The counter is never typed by hand; it is read from `story.js` every frame.

## 3. The board (9 shots, 1,140 frames, 38.0 s at 30 fps)
**Counter (x 64, y 384–470):** frame 1 to 0.8 s: `GROUND SPEED / 381 m/s / EARTH'S SPIN HERE · 35°N`. At 0.8 s the value snaps to **0 m/s** (hit). From 1.3 s on: `STOPPED FOR / 0.000 s` rolling with milliseconds (e from §2), fact line per shot (§2 table). At 35.8 s it reads `5.000 s`, then the label flips to `SPIN RESTORED`.
**Hero:** one featureless adult from behind, mustard jacket, dark trousers, backpack, 55–80 design px tall, at the plaza edge in s01 and in the loop. At the stop they are carried off screen-right with the crowd in a smooth tumble (like gravity-flip's lift, but sideways). Never shown hitting anything.
**Direction law:** east = screen-right in every shot (except s04/s05, where the camera looks east and the sea runs away from camera toward the town). Nothing ever moves left or up except spray arcs.

| # | shot | frames | film | set | camera | what visibly happens | caption (≤ 8 words) | counter: label / value / fact line |
|---|---|---|---|---|---|---|---|---|
| 1 | s01_plaza | 0–194 | 0.0–6.5 | city plaza, noon | 28 mm, **locked `FRAME1_CAM`** low behind the hero, plaza and fountain ahead, slow 2 m push-in from 2.0 s | frame 1: a busy sunny plaza, crowd walking, fountain jetting. **0.8 s: a jolt, a bass boom**; every person, car, café umbrella, bench and the fountain's water lurch screen-right together in one sheet; trees bend flat and shed every leaf sideways; a tan dust front races across the paving; by 3 s the plaza is swept bare except trees, lamps and the fountain basin | T (0.0–3.0): What if the Earth *stopped spinning*\|for 5 seconds? · C1 (3.3–6.4): The ground stops.\|Everything else *keeps going.* | GROUND SPEED / 381 → 0 m/s / EARTH'S SPIN HERE · 35°N → STOPPED FOR / 0.000–0.814 s / ONE CAR · 109 MJ |
| 2 | s02_avenue | 195–314 | 6.5–10.5 | the avenue off the plaza | **whip-pan right** (with the motion) from s01; 35 mm looking along the street, slow track right | a supersonic shock front rips down the avenue: shop awnings and signs tear off, windows burst outward in glittering sheets, parked cars skid and roll away with the dust | C2 (6.8–10.3): 1,372 km/h.\|Faster than *sound.* | STOPPED FOR / 0.814–1.386 s / AIR IN THIS STREET · 65 GJ · MACH 1.1 |
| 3 | s03_towers | 315–434 | 10.5–14.5 | glass towers from a rooftop, 400 m off | 85 mm, slow pan right with the debris | the towers' upper floors lag behind their own momentum: facades peel off the top 10 floors in long glass ribbons streaming right; roof tanks and a crane jib topple right; the lower floors stand | C3 (10.8–14.3): The tops of towers\|*shear off* sideways. | STOPPED FOR / 1.386–1.957 s / TOP 10 FLOORS · 1.2 TJ |
| 4 | s04_bay | 435–569 | 14.5–19.0 | horseshoe bay, noon, camera on the west headland looking east at the town | **hard cut on hit 1** at 14.5; 50 mm, slow push | the whole bay's surface lunges away from camera toward the town: the water drops at the near shore, exposing seabed and stranded boats, while the far side heaps into a white wall; boats and the pier are carried with it | C4 (14.9–18.8): The whole bay\|*lunges east.* | STOPPED FOR / 1.957–2.600 s / THE BAY'S WATER · 2.2 PJ |
| 5 | s05_town | 570–689 | 19.0–23.0 | bay town from the hillside behind it, looking west back at the bay | 28 mm, slow crane up | the white wall arrives and climbs over the waterfront, streets fill with racing water, roofs and boats carried inland; the lighthouse vanishes in spray | C5 (19.3–22.8): It climbs right\|*over the town.* | STOPPED FOR / 2.600–3.171 s / AIR OVER THE TOWN · 19 PJ |
| 6 | s06_clouds | 690–824 | 23.0–27.5 | cloud deck from above, 10 km | **hard cut on hit 2** at 23.0; 35 mm, an airliner in the foreground | the whole cloud deck slides right at speed below a calm airliner; through gaps, tan dust sheets and white coastlines race the same way; the plane flies on untouched | C6 (23.3–27.3): The sky blows east.\|*Planes feel nothing.* | STOPPED FOR / 3.171–3.814 s / ALL AIR IN VIEW · 30 EJ = 18 DAYS OF HUMAN ENERGY |
| 7 | s07_coast | 825–944 | 27.5–31.5 | Earth from 400 km, day side, an east-facing coastline | continuous climb from s06 (cloud pass-through), 50 mm, slow drift | a bright white surge line runs the length of the coast and pushes inland; a tan dust sheet streaks east across the continent; cloud bands drag ragged where they cross mountains | C7 (27.8–31.3): Every east-facing coast\|*gets hit.* | STOPPED FOR / 3.814–4.386 s / WHOLE ATMOSPHERE · 600 YEARS OF HUMAN ENERGY |
| 8 | s08_earth | 945–1094 | 31.5–36.5 | Earth from far orbit, day side | **hard cut on hit 3** at 31.5; 70 → 35 mm slow pull-back to the whole disc | the whole planet: white surge bands on every east coast, dust veils over land; at 35.8 s (5.000) the timer stops, the label flips to SPIN RESTORED and the planet visibly resumes its slow turn | C8 (32.6–36.3): At 5 seconds,\|it *spins again.* | STOPPED FOR / 4.386 → 5.000 s / ALL THE OCEANS · 160,000 YEARS OF HUMAN ENERGY → SPIN RESTORED |
| 9 | s09_loop | 1095–1139 | 36.5–38.0 | orbit → plaza | orbit 0.5 s; **hard cut on hit 4** at 37.0 to `FRAME1_CAM` | the plaza exactly as frame 1 (crowd walking, fountain on), held 1.0 s; TikTok restarts on frame 1 | none (silence) | orbit: SPIN RESTORED · plaza: GROUND SPEED / 381 m/s / EARTH'S SPIN HERE · 35°N |

- **Escalation (9 rungs, ×10 to ×1,000 each):** a car → a street → tower tops → a bay → a town → the sky → a coastline → the planet. New place and bigger energy every shot; something is torn loose at least every ~1.5 s.
- **Payoff by 0:03:** the stop and the sideways sweep land at 0.8 s.
- **Pace:** shots 4.0–6.5 s, captions 3.1–4.0 s each (all ≥ 2.8 s, none overlapping), eased cameras. Nothing rushed (TASTE 11-12).
- **Transitions:** whip-pan (6.5) → cut along the debris line (10.5) → hard cut, hit 1 (14.5) → cut to the hillside on the wave's arrival (19.0) → hard cut, hit 2 (23.0) → climb through the clouds (27.5) → hard cut, hit 3 (31.5) → hard cut, hit 4, loop (37.0).
- **Frame-1 match test:** s01 first frame vs s09 last frame identical, counter included (381 m/s).

## 4. Build map
| shot | reuse (engine) | NEW (keep small) |
|---|---|---|
| all | `post.js`, `camera.js`, `sky.js` day | `src/story.js` (law, clock, rungs). |
| s01, s02 | `city.js` plaza + avenue (cars, trees, props, fountain), `crowd.js`/`figure.js` (hero + 40–60 people, gravity-flip `citykit.js` daywear), `createSpray` from `splash.js` for leaves, glass and fountain water (horizontal velocity, ballistic with drag) | **N1 eastward fling (the core new effect):** `src/fling.js` drives each car/prop/person record along +x from e: x = x0 + d(e) with d from the law (381 m/s, minus a short friction skid for cars), small hops and `tumble`; done by writing positions before `C.update` / `crowd.update` (cars are not driven by city.js, see API). If `city.js` needs an `shove` option, add it **default 0**. **N2 dust front:** a low tan sheet (thin, crisp-edged, NOT fluffy smoke) moving at 381 m/s × slow. Trees: leaves to spray, trunks bent by a vertex lean (default 0). Save `FRAME1_CAM` in `src/kit.js`. |
| s03 | `city.js` towers, `createSpray` (glass) | **N3 facade peel:** the top 10 floors' window instances detach in order from the windward edge and fly right as glinting shards + ribbons; roof props via N1. |
| s04, s05 | `bay.js` daylight recipe (API R2), `ocean.js` slab (`surgeT/surgeH/surgeV` bore over land), `splash.js` boats + spray + seabed; **tsunami-524's surge/runup kit (`runup.js`, `tsukit.js`) for the wall over the town** | **N4 sideways sea:** tilt the slab (near shore drops, far shore heaps) by a slope from e; point the existing bore at the town. Prefer reusing tsunami-524 code over new shaders. |
| s06 | `clouds.js`, `planes.js` | **N5 deck slide:** a scroll offset on the cloud deck (default 0) + motion blur 8 samples. |
| s07, s08, s09 | `space.js` Earth (day, clouds, atmosphere, `surf`/`scar` modes) | **N6 east-coast band:** extend the surf mode with a coast-normal test (white only where the coast faces east) + a faint tan dust veil over land (default off). The resume at 5.000 s is just the Earth's rotation turned back on. |

- **Riskiest shots:**
  1. **s01_plaza** (Gate 0): the stop must read in one glance. If it reads as an explosion, keep trees and lamps rock-still at the jolt and make the whole crowd move as one sheet, same speed, same direction.
  2. **s03_towers**: N3 is the only all-new geometry effect. Fallback: no peel, just a dense stream of glass shards and roof props from the top floors (`createSpray`).
  3. s04: the bay must drain at the near shore (seabed showing) so "the sea moved sideways" reads, not "a tsunami arrived".
- **Cut order if time runs out:** (1) fold s05 into the last 1.5 s of s04 (give s04 the time); (2) drop the crane jib in s03. Never cut s01, s04, s08 or the loop.
- **New-effect count:** 1 core (N1 fling) + 5 small default-off tweaks (N2–N6). Over the 1-effect cap I set for video #4 cards; the Commander greenlit this board shape (pitch: size M). If the Director's estimate passes 1 day, report before building s03.
- **Engine edits stay default-off**, so older projects render the same.
- **Policy:** people leave frame tumbling smoothly; no impacts with people, no bodies, no gore, no children. No countries, no weapons.

## 5. Sound (no voiceover; `audio_core.js` + `score.json`)
**Rules (TASTE 11-12):** no `ticks` block, no repeating cue above ~3 kHz, the ms counter is silent; exactly 4 cut hits plus the stop boom; silence as the last beat.
| time | beat |
|---|---|
| 0.0–0.8 | plaza room tone: crowd murmur, fountain, distant traffic, one low swell under the title |
| **0.8** | **the stop:** a deep bass boom (sonic boom, low-passed ≤ 2 kHz) + `rumble`; frame-1 sound hit |
| 0.8–6.5 | a roaring wind (`wind`, low f), everything rattling and scraping away screen-right, gasps fading off (`gasp`) |
| 6.5 | whoosh on the whip-pan |
| 6.5–10.5 | the shock front: a continuous low roar, glass bursting (low-passed), car alarms smeared in the wind |
| 10.5–14.5 | steel groans, glass ribbons hissing; riser 1 to 14.5 |
| **14.5** | **hit 1:** low thud, cut to the bay |
| 14.5–19.0 | gulls cut off, the sea's huge suck (low, `surf` reversed swell), hulls grinding on seabed |
| 19.0–23.0 | the wall's roar over the town, timbers breaking (low) |
| **23.0** | **hit 2:** low thud, cut above the clouds |
| 23.0–27.5 | near-quiet cabin-like hum (the plane feels nothing) under a distant roar; riser 2 starts |
| 27.5–31.5 | riser 2 climbs; wind thinning to space |
| **31.5** | **hit 3:** braaam (−6 dB) on the cut to the whole Earth; then one low tone |
| 35.8 | a soft low swell as the spin restarts |
| 36.5–37.0 | near silence |
| **37.0** | **hit 4:** soft low thud on the cut to the plaza |
| 37.0–38.0 | **silence** (plaza room tone only); the murmur continues on the loop |
- Master to −14 LUFS, peaks ≤ −1 dBTP. `check.py` sees the 4 hard cuts' onsets above 200 Hz.

## 6. Look
- **Daylight first:** noon city (gravity-flip's daylight recipe), noon bay, high blue sky over the cloud deck, day-side Earth. Golden haze in the distance, strong sun, long shadows. Never an all-night Earth.
- **Full-colour people at mid-distance:** mustard-jacket hero and a mixed crowd in daywear. No silhouettes, no faces, no children, no gore.
- **Debris palette:** glinting glass, leaves, paper, tan dust. **No fluffy smoke:** the dust front is a thin, crisp-edged sheet; spray is crisp white with droplets.
- **One direction:** all motion right (east). Motion blur 180°: 12 samples (s01 after 0.8, s02), 8 (s03, s04, s05, s06), 4 (s07, s08, s09, s01 before 0.8). ACES, bloom, grain, vignette. No white full-frame flash on the stop: the jolt is a 4-frame camera shake + the boom.
- **Safe area (540×960):** all type in x 60–480 and y 100–765, and left of x 440 for y 430–870. Title y ≈ 170 (≤ 410 wide), counter x 64 at y 384–470, captions centred on y 590 (≤ 330 wide), tag at x 64. Key action in y 200–640. `band` on captions over the bright cloud deck and the white surge. Overlay `style: {look: 'v2'}`.

## 7. Render and QC
- Build: `py tools/build_page.py` per shot; key frames with `node tools/frames.js` on the GPU (`IJ_GPU=1`; never mix with SwiftShader inside a shot). Gate 0 first.
- Render: push to `main`, then the Commander runs `.\pc\render_project.ps1 earth-stops` (`render_all.js --quality max`). `-Shots a,b` redoes single shots.
- `tools/check.py` must PASS on `final.mp4`:
  - frames: 1,140 frames, 1080×1920, 30 fps, under 100 MB;
  - loudness: −14 LUFS, peaks ≤ −1 dBTP;
  - flashes: no upward-jump flashes (watch the stop at 0.8 s, the white surge in s04/s05 and the bright clouds);
  - cut hits: the 4 hard cuts at 14.5, 23.0, 31.5 and 37.0 s each with an onset; silence as the last beat;
  - text: contrast ≥ 3:1 after yuv420p (`--contrast overlay.mov --bg clean.mp4 --every 0.2` before assembly); no safe-area WARNs (`check.py --safe`).
- Also the frame-1 vs last-frame diff, a contact sheet reviewed by the Director, and a listen for any repeating high cue. One auto-fix round, then report.

## 8. Posting
- **Cover:** `AT THE EQUATOR THE GROUND MOVES 1,674 KM/H. STOP IT AND EVERYTHING KEEPS GOING`
- **Caption:** §1 (no question, no bait, no country).
- **Hashtags (fixed):** `#whatif #physics #space #earth #science`
- **AI-generated label:** ON. The DRAMATIZATION tag is visible.
- **Slot:** the fixed 2 PM CT slot (20:00 UTC). Queue: tsunami-524 (Sat 11-14) → ground-liquid (Mon 11-16, if built) → giant-lens (Wed 11-18) → **earth-stops earliest Fri 2026-11-20, 2 PM CST (20:00 UTC)**. Hold if Gate 0, QC, the Scout's fact check or the Scout's niche-uniqueness check hasn't passed. The Commander can pull it forward.
- **At 48 h:** log views, average watch, watched-full, the 3 s hold, For You share, traffic sources and the retention drop point in `channel/results.csv`.
