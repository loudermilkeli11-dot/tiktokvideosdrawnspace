# PRODUCTION: giant-lens (video #5)

**Greenlit by the Commander:** 2026-11-12 16:15 CT (22:15 UTC), pitch p2 in `pitches/2026-11-12.json`.
**Sources:** that pitch; `channel/BRAIN.md`; `channel/TASTE.md`; `PLAYBOOK.md`; `CLAUDE.md`; `engine/API.md`; the critique rules sealed for ground-liquid (`projects/ground-liquid/PRODUCTION.md`, top table: ≥ 4 s shots, no ticks, 4 low hits, a causal law, an aftermath ladder).
**Slug:** `giant-lens`. Build everything in `projects/giant-lens/`.

## Where this brief departs from the pitch (and why)
| pitch said | brief does | why |
|---|---|---|
| cover "A SOLAR FURNACE **IN FRANCE**…" | `A SOLAR FURNACE CAN FOCUS SUNLIGHT TO 3,500 °C` | PLAYBOOK §1: no countries in the cover, caption or hashtags. |
| temperature climbs 200 → 3,500 °C as the lens rises | **the spot is always ≈ 3,500 °C; the lens grows ×3.16 per step and the BEAM POWER climbs ×10 per step** (0.31 MW → 31 TW) | Honest optics: a lens hanging at its own focal length (f/1) concentrates sunlight the same ~11,600× at any size, so the temperature can't keep climbing. Size buys power and beam width. That twist becomes a caption (C7). |
| "sea explodes in a steam column" | the sea **boils along the beam** (a white hissing jet with droplets), the pier and boats burn | Computed: even 3.1 GW boils only 1.2 t of sea per second. A huge explosion would break the law. No fluffy smoke (PLAYBOOK). |
| the lens floats at any height | the lens always hangs at **height = its diameter** (its focal length), so the ladder carries it from rooftop height to orbit by itself | The law places every shot: 20 m over the plaza → 6.3 km above the clouds → 200 km, in orbit. |

**Gate 0 (before any other build work).** Build `s01_plaza` only, render it at `?scale=0.5` on the Commander's PC (`IJ_GPU=1`), export the first 3.0 s **muted, no captions** (counter and title on). PASS only if:
1. A cold viewer says "a giant magnifying glass is burning the city" without a caption. "UFO", "laser" or "spotlight" is a FAIL (the glass must read as glass: rim, refraction of the sky, a glint).
2. By 1.0 s the bright disc on the paving has tightened to a white-hot point that is already scorching a line.
3. The car roof is smoking by 2.0 s and in flames by 3.0 s.
4. Frame time ≤ 0.5 s on the GPU at full size with 4 samples.
If it fails, the Director reports to the Producer and stops.

---

## 1. Premise and title
- **Title (frame 1, y ≈ 170, ≤ 410 wide, 3 lines):** What if a *magnifying glass*|the size of a house|looked at a city?  (accent: *magnifying glass*, amber; the Commander greenlit this wording)
- **Cover line:** `A SOLAR FURNACE CAN FOCUS SUNLIGHT TO 3,500 °C` (Scout VERIFIES the 3,500 °C figure before posting, §2).
- **Post caption:** `A real solar furnace focuses sunlight about 10,000 times and reaches about 3,500 °C. The rest is dramatization.` No question, no prompt.

## 2. The law (`src/story.js`, the only source of on-screen numbers)
**The rule.** Sunlight at the ground delivers **S = 1,000 W/m²**. A perfect lens of diameter **D** hanging at its focal length **f = D** (f/1) collects
- **beam power P = S × π(D/2)²**,
- and focuses it into a spot no smaller than the Sun's image: **w = f × θ☉ = 0.0093 D** (θ☉ = 0.533° = 0.0093 rad).
- **Concentration C = (D / w)² = (1 / 0.0093)² = 11,560 suns**, the same at every size, so the **spot flux q = C × S = 11.6 MW/m²**.
- A black surface in the spot heats until it radiates that away: **T = (q / σ)^¼**, σ = 5.67×10⁻⁸ W/m²K⁴.
  T = (1.156×10⁷ / 5.67×10⁻⁸)^¼ = (2.04×10¹⁴)^¼ = **3,779 K = 3,506 °C → shown 3,500 °C**. This matches the real solar furnace's ~3,500 °C.
- **The ladder:** D grows ×√10 = ×3.162 per step, so P grows ×10 per step. 9 steps.

**The one stated liberty (DRAMATIZATION).** A perfect glass lens of any size hangs motionless in the sky at its focal length, always aimed at the ground, and grows on cue. The light cone is drawn faintly visible. S stays 1,000 W/m² even for the high lenses (conservative: above the air it is 1,361). Burn, melt and spread speeds are shown at the computed flux; spread of fire beyond the beam is not modelled.
On-screen tag for the whole video (x 64): `DRAMATIZATION · PERFECT GIANT LENS`.

**Sources** (Scout VERIFIES before `story.js` locks any number)
| fact | value | source |
|---|---|---|
| sunlight at the ground, clear noon | ≈ 1,000 W/m² | https://science.nasa.gov/sun/facts/ · https://www.nrel.gov/grid/solar-resource/spectra-am1.5.html (AM1.5 = 1,000 W/m²) (VERIFY) |
| solar furnace (Odeillo): 1 MW, ~10,000 suns, up to ~3,500 °C | cover number | https://www.promes.cnrs.fr/ · https://en.wikipedia.org/wiki/Odeillo_solar_furnace (VERIFY; never name the country on screen) |
| Sun's angular diameter | 0.533° | https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html (VERIFY) |
| world primary energy use | ≈ 620 EJ/yr (2023) = 19.6 TW | Energy Institute Statistical Review of World Energy 2024, https://www.energyinst.org/statistical-review (VERIFY) |
| soda-lime glass c ≈ 0.84 kJ/kg·K, flows ≈ 1,400 °C; water heat to boil ≈ 2.6 MJ/kg (0.33 heating + 2.26 latent) | effect timings | standard values (VERIFY, give URLs) |

**Key values (computed; story.js recomputes them)**
| step | shot | D (lens = height) | P = 1,000 × π(D/2)² | spot w = 0.0093 D | shown |
|---|---|---|---|---|---|
| 1 | s01 | 20 m | 314 kW | 0.19 m | 0.31 MW |
| 2 | s02 | 63 m | 3.14 MW | 0.59 m | 3.1 MW |
| 3 | s03 | 200 m | 31.4 MW | 1.9 m | 31 MW |
| 4 | s04 | 632 m | 314 MW | 5.9 m | 314 MW |
| 5 | s05 | 2.0 km | 3.14 GW | 19 m | 3.1 GW |
| 6 | s06 | 6.3 km (above the cloud deck) | 31.4 GW | 59 m | 31 GW |
| 7 | s07 | 20 km | 314 GW | 186 m | 314 GW |
| 8 | s07 | 63 km | 3.14 TW | 590 m | 3.1 TW |
| 9 | s08 | 200 km (orbit) | 31.4 TW | 1.9 km | 31 TW = **1.6× all human power use** (31.4 / 19.6) |

- **Frame-1 focus ramp (s01 only):** the spot tightens from w = D (C = 1) to 0.19 m. T(C) = (C × 1,000 / σ)^¼: C 1 → **91 °C**; C 10 → **375 °C (frame 1)**; C 100 → 879 °C; C 1,000 → 1,776 °C; C 11,560 → **3,500 °C** at film 1.0 s. Ease C on a log scale.
- **Effect timings at q = 11.6 MW/m²:** 6 mm window glass, 15 kg/m² × 0.84 kJ/kg·K × 1,400 K = 17.6 MJ/m² → **1.5 s to flow** (caption C3 "under 2 seconds"). Sea: P / 2.6 MJ/kg → 121 kg/s at 314 MW; **1.2 t/s at 3.1 GW**. Wood and paint: ignite in well under 1 s.
- The counter is never typed by hand; it is read from `story.js` every frame.

## 3. The board (9 shots, 1,140 frames, 38.0 s at 30 fps)
**Hero:** one featureless adult from behind, teal jacket, dark trousers, backpack, one hand up shielding their eyes (`POSES`), 55–80 design px tall. In s01, s02, s05 (on the hillside overlook) and the loop. The beam never touches a person; crowds run clear.
**Lens look (all shots):** a thin glass disc with a dark rim, refracting an upside-down sky, a sun glint on its edge; its shadow is a dark ring on the ground around the white-hot spot (the lens blocks the light it collects). **Each shot opens with the lens growing ×3.16 over 0.8 s** with a low swell, the counter rolling ×10.

| # | shot | frames | film | set | camera | what visibly happens | caption (≤ 8 words) | counter: label / value / fact line |
|---|---|---|---|---|---|---|---|---|
| 1 | s01_plaza | 0–134 | 0.0–4.5 | city plaza, noon | 28 mm, **locked `FRAME1_CAM`** low behind the hero, lens in the upper frame (y 250–360), slow 2 m push-in from 1.5 s | frame 1: a wide bright disc on the paving already tightening; by 1.0 s a white-hot point; it drags a glowing, charring line across the paving to a parked car; the roof paint smokes (2.0 s) and bursts into flame (3.0 s); the crowd scatters | T (0.0–3.6): What if a *magnifying glass*\|the size of a house\|looked at a city? · C1 (3.8–6.8): 3,500 °C. A real\|*solar furnace* does this. | SPOT TEMP / 375 → 3,500 °C / LENS 20 M · 0.31 MW |
| 2 | s02_street | 135–269 | 4.5–9.0 | the avenue off the plaza | **whip-pan** from s01; 35 mm behind the hero, slow track down the avenue | the lens grows to 63 m; the 0.6 m beam sweeps down the row of parked cars: each one catches in turn (about every 1 s); street trees flare; the asphalt line glows and smokes; people run past the hero | C2 (6.9–9.7): Now make the lens *bigger.* | BEAM POWER / 0.31 → 3.1 MW / LENS 63 M · SPOT 3,500 °C |
| 3 | s03_tower | 270–404 | 9.0–13.5 | glass towers, looking up | **tilt up** (motivated) from s02; 24 → 35 mm, low, slow push up the facade | the lens (200 m) is above the skyline; the 1.9 m beam climbs a glass tower: panes glow orange, sag and pour in glowing drips; burning drops rain onto the street; the beam carves a black, glowing gash up 20 floors | C3 (10.0–13.3): Window glass melts in\|*under 2 seconds.* | BEAM POWER / 31 MW / LENS 200 M · 11.6 MW ON EVERY M² |
| 4 | s04_bay | 405–539 | 13.5–18.0 | horseshoe bay, noon | **hard cut on hit 1** at 13.5; 50 mm from the beach, slow lateral drift | the lens (632 m) hangs over the bay; the 6 m beam walks up the pier: planks flash into flame in a racing line; two moored boats ignite; where it crosses water the sea boils in a white hissing jet with droplets | C4 (14.0–17.4): Wood catches *instantly.* | BEAM POWER / 314 MW / LENS 630 M · BOILS 121 KG OF SEA/S |
| 5 | s05_town | 540–674 | 18.0–22.5 | bay town from the hillside | crane up and back from s04 (continuous), 28 mm, the hero small at frame bottom-left of centre | the lens (2 km) fills the sky; the 19 m beam sweeps across the town: a line of roofs catches one after another, a burning swath; it crosses the bay in a boiling white wake; the lighthouse glows | C5 (18.4–21.8): 3 billion watts.\|One *burning line.* | BEAM POWER / 3.1 GW / LENS 2 KM · BOILS 1.2 T OF SEA/S |
| 6 | s06_clouds | 675–809 | 22.5–27.0 | cloud deck from above | **hard cut on hit 2** at 22.5; 35 mm at 8 km, an airliner in the foreground | the lens (6.3 km) above the clouds; the 59 m beam slices the deck: the clouds vanish along a clean cut, the ground below glowing through the slot; the airliner banks hard away from the cone | C6 (22.8–26.2): It cuts the clouds *open.* | BEAM POWER / 31 GW / LENS 6.3 KM · ABOVE THE CLOUDS |
| 7 | s07_strato | 810–944 | 27.0–31.5 | high altitude, curved horizon, deep blue sky | continuous climb from s06, 24 mm, 30 → 70 km | the lens grows twice (20 km, then 63 km): its shadow darkens a whole region below; the cut through the cloud deck widens into a long burning scar across coast and land | C7 (27.4–31.0): Bigger lens. Same 3,500 °C.\|*Wider burn.* | BEAM POWER / 314 GW → 3.1 TW / LENS 20 → 63 KM · SPOT STILL 3,500 °C |
| 8 | s08_orbit | 945–1094 | 31.5–36.5 | Earth from orbit, day side | **hard cut on hit 3** at 31.5; 50 → 70 mm, slow pull-back past the lens rim | the 200 km lens hangs in orbit glinting, its round shadow on the clouds converging to one blinding dot; behind the dot a dark scorched line runs across a continent; a cloud slot traces it | C8 (31.8–36.2): More power than all\|*humanity uses.* | BEAM POWER / 31 TW / LENS 200 KM · 1.6× ALL HUMAN POWER USE |
| 9 | s09_loop | 1095–1139 | 36.5–38.0 | orbit → plaza | orbit 0.5 s; **hard cut on hit 4** at 37.0 to `FRAME1_CAM` | the dot burns on; then the plaza exactly as frame 1, held 1.0 s; TikTok restarts on frame 1 | none (silence) | orbit: none · plaza: SPOT TEMP / 375 °C / LENS 20 M · 0.31 MW |

- **Escalation (9 steps, ×10 power each):** car roof → a row of cars → a glass tower → the pier and boats → a whole town → the cloud deck → a region → a continent from orbit. Every shot is a new place and a new counter value; something ignites, melts or boils at least every ~1.5 s (TASTE rule).
- **Pace (ground-liquid rules):** shots 4.5 s except s08 (5.0) and the loop tail (1.5). 9 captions, each ≥ 2.8 s, none overlapping. Slow, eased cameras.
- **Transitions:** whip-pan (4.5) → tilt-up (9.0) → hard cut, hit 1 (13.5) → crane (18.0) → hard cut, hit 2 (22.5) → climb (27.0) → hard cut, hit 3 (31.5) → hard cut, hit 4, loop (37.0).
- **Frame-1 match test:** s01 first frame vs s09 last frame must be identical, counter included (375 °C).

## 4. Build map
| shot | reuse (engine) | NEW (keep small) |
|---|---|---|
| all | `post.js`, `camera.js`, `sky.js` day | **N1 lens** (`src/lens.js`): a thin disc with a physical transmission/refraction material, dark rim, Fresnel glint, its ground shadow ring; scale = D, height = D from `story.js`. **N2 beam + spot:** faint additive light cone (brightest near the focus) + a white-hot core sprite with an orange halo that blooms (no white full-frame flashes). |
| s01, s02 | `city.js` plaza + avenue (cars, trees, props), `crowd.js`/`figure.js` (hero + 40–60 running people, gravity-flip `citykit.js` daywear), `fire.js` on the car roof / cars / trees | **N3 burn trail:** a decal ribbon on the ground following the spot path: white → orange glow → black char, fading in ~3 s. Per-car "heat" 0..1 drives paint darkening, then `fire.js`. Save `FRAME1_CAM` in `src/kit.js`. |
| s03 | `city.js` towers, `fire.js` | **N4 melting panes:** on the tower's window instances near the beam: emissive glow by heat, vertex sag, drip particles (glowing orange droplets falling with gravity). |
| s04, s05 | `bay.js` daylight recipe (API R2), `ocean.js`, `splash.js` boats + spray, `fire.js`, N3 on the pier deck and roofs | **N5 boil jet:** `splash.js createSpray` with a white tint plus a thin vertical vapour jet (short, crisp, not fluffy). Roof ignition = N3 on roof instances + `fire.js` sprites in a line. |
| s06, s07 | `clouds.js`, `planes.js`, `sky.js` high-altitude | **N6 cloud cut:** a mask on `clouds.js` that clears a band along the beam path with a hot glow beneath (default off). |
| s08, s09 | `space.js` Earth (day, clouds, atmosphere) | **N7 `EU.scar`:** a dark scorched line + hot dot + round lens shadow on the day side (default off; `space.js` already has a "scar" mode: extend it). |

- **Riskiest shots:**
  1. **s01_plaza** (Gate 0): the lens must read as glass and the spot as focused sunlight, muted, in 1 s. If the lens reads as a UFO, add the inverted-sky refraction and a stronger rim glint before anything else.
  2. **s03_tower**: N4 melting glass is the only all-new effect. Fallback: panes glow and shatter outward as glowing shards (no sag).
- **Cut order if time runs out:** (1) fold s07 into s06's last 1.5 s (one grow beat, 314 GW) and give s08 the time; (2) drop the boats in s04. Never cut s01, s03, s08 or the loop.
- **Engine edits stay default-off** (spray tint, cloud cut, `EU.scar`), so older projects render the same.
- **Policy:** the beam never touches a person or an animal; no burned bodies, no gore, no children.

## 5. Sound (no voiceover; `audio_core.js` + `score.json`)
**Rules (from the ground-liquid critique):** no `ticks` block; no repeating cue above ~3 kHz (low-pass the sizzles at 4 kHz); exactly 4 hits, low-mid thuds; silence as the last beat.
| time | beat |
|---|---|
| 0.0 | a low beam hum (60–120 Hz) already sounding; a rising sizzle as the spot tightens; crowd murmur → gasps (`gasp`) |
| 1.0–4.5 | crackle of scorching paving; paint pops; the car roof catches with a soft whump at 3.0; one low car alarm |
| 4.5 | whoosh on the whip-pan; **lens-grow swell** (low, 0.8 s; repeats at every grow, never bright) |
| 4.5–9.0 | car-by-car whumps of ignition (irregular, not rhythmic), crowd running |
| 9.0–13.5 | glass groans and ticks of cracking (sparse), molten drips hissing on the street; riser 1 to 13.5 |
| **13.5** | **hit 1:** low thud, cut to the bay |
| 13.5–18.0 | gulls, the pier going up in a rushing crackle, the sea boiling in a hard hiss |
| 18.0–22.5 | wind on the hillside; distant roofs catching; the hum deepens with power |
| **22.5** | **hit 2:** low thud, cut above the clouds |
| 22.5–27.0 | wind at altitude, the airliner's engines spooling up as it banks; riser 2 starts |
| 27.0–31.5 | the hum drops an octave at each grow; riser 2 climbs |
| **31.5** | **hit 3:** braaam (−6 dB) on the cut to orbit; then space is silent except one low tone |
| 31.5–36.5 | the low tone fading |
| 36.5–37.0 | near silence |
| **37.0** | **hit 4:** soft low thud on the cut to the plaza |
| 37.0–38.0 | **silence** (plaza room tone only); the hum restarts on the loop |
- Master to −14 LUFS, peaks ≤ −1 dBTP. `check.py` sees the 4 hard cuts' onsets above 200 Hz.

## 6. Look
- **Daylight first:** noon city (gravity-flip's daylight recipe), noon bay, high blue sky, day-side Earth. Never an all-night Earth.
- **Full-colour people at mid-distance:** the teal-jacket hero and a mixed crowd in daywear. No silhouettes, no faces, no children, no gore.
- **Heat has a colour ramp:** white-hot core → yellow → orange glow → black char. Flames from `fire.js`. **No fluffy smoke**: at most thin dark wisps off the char line; steam is a crisp white jet with droplets.
- **The beam is subtle**: a faint cone, not a laser bar. The spot carries the brightness (bloom), with no full-frame white flashes.
- **Motion blur 180°:** 4 samples (s08, s09), 8 (s01, s03, s05, s06, s07), 12 (s02, s04). ACES, bloom, grain, vignette.
- **Safe area (540×960):** all type in x 60–480 and y 100–765, and left of x 440 for y 430–870. Title at y ≈ 170 (3 lines; keep the lens below y 250 in s01), counter at x 64 at y 384–470, captions centred on y 590 (≤ 330 wide), tag at x 64. Key action in y 200–640. `band` on captions over the bright sky, the clouds and the glare. Overlay `style: {look: 'v2'}`.

## 7. Render and QC
- Build: `py tools/build_page.py` per shot; key frames with `node tools/frames.js` on the GPU (`IJ_GPU=1`; never mix with SwiftShader inside a shot). Gate 0 first.
- Render: push to `main`, then the Commander runs `.\pc\render_project.ps1 giant-lens` (`render_all.js --quality max`). `-Shots a,b` redoes single shots.
- `tools/check.py` must PASS on `final.mp4`:
  - frames: 1,140 frames, 1080×1920, 30 fps, under 100 MB;
  - loudness: −14 LUFS, peaks ≤ −1 dBTP;
  - flashes: no upward-jump flashes (watch the spot's bloom in s01 and the ignitions);
  - cut hits: the 4 hard cuts at 13.5, 22.5, 31.5 and 37.0 s each with an onset; silence as the last beat;
  - text: contrast ≥ 3:1 after yuv420p (`--contrast overlay.mov --bg clean.mp4 --every 0.2` before assembly); no safe-area WARNs (`check.py --safe`).
- Also the frame-1 vs last-frame diff and a contact sheet reviewed by the Director. Listen once for any repeating high cue. One auto-fix round, then report.

## 8. Posting
- **Cover:** `A SOLAR FURNACE CAN FOCUS SUNLIGHT TO 3,500 °C`
- **Caption:** §1 (no question, no bait, no country).
- **Hashtags (fixed):** `#whatif #physics #space #earth #science`
- **AI-generated label:** ON. The DRAMATIZATION tag is visible.
- **Slot:** the fixed 2 PM CT slot (20:00 UTC). Queue: tsunami-524 (Sat 11-14) → ground-liquid (Mon 11-16) → **giant-lens earliest Wed 2026-11-18, 2 PM CST**. Hold if Gate 0, QC or the Scout's fact check hasn't passed. The Commander can pull it forward.
- **At 48 h:** log views, average watch, watched-full, the 3 s hold, For You share, traffic sources and the retention drop point in `channel/results.csv`.
