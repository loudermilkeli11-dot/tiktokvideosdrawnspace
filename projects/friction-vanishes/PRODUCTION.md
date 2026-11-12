# PRODUCTION: friction-vanishes (video #4)

**Greenlit by the Commander:** 2026-11-12 14:41 UTC ("begin producing the friction pitch, remember to adhere to the critics of the tsunami one").
**Sources:** pitch #2 in `pitches/2026-11-12-pitches-4.md`; the sealed dossiers `channel/war-room/2026-11-12-what-is-the-best-of-the-new-pitches.md` (the friction pick and its Tenth Man) and `channel/war-room/2026-11-12-the-currrent-video-is-fine-for-now-do-not-start.md` (the Commander's 4 tsunami complaints); `channel/BRAIN.md`, `PLAYBOOK.md`, `CLAUDE.md`, `engine/API.md`, the reference board `projects/gravity-flip/script.md`.
**Slug:** `friction-vanishes`. Build everything in this folder (`src/story.js`, `src/kit.js`, shots, `overlay.js`, `score.json`).

## 0. The tsunami critiques and how this brief obeys them (non-negotiable)
| Commander's complaint (tsunami-524) | cause found by the War Room | rule in this brief |
|---|---|---|
| "Too fast" | 10 shots in 30.5 s, a cut every ~3 s | **8 beats + a 1 s loop tail in 38 s. Every beat holds ≥ 4.0 s.** No time-lapse inside a shot. |
| "The annoying ding" | 1,800 Hz countdown tick + a crack on all 9 cuts (`tsunami-524/score.json`) | **No ticks at all.** Hits only on 3 moments (5.0, 22.0, 37.0 s), all low/mid "crunch/thud", nothing above ~1 kHz as the main energy. Every other transition is a motivated move with a low whoosh. |
| "Visuals don't make sense" | an arbitrary ×2 dial ending in impossible beats | **Every shot is one cause → effect a muted viewer can read**: no grip → can't brake / can't turn / slides downhill / reaches the sea; grip returns → skid and crash. Bent physics carries DRAMATIZATION. |
| "Premise doesn't lead anywhere" | no consequences, no aftermath | **Time ladder like gravity-flip (5 s → 1 min → 10 min)**; each step is the physical result of the step before, each step ends when grip returns, and the second-to-last beat (s07) is an aftermath payoff before the space ending. |
| Tenth Man (friction dossier): "everything is at rest at t = 0, the hook is calm" | — | **Frame 1 is already moving:** a car at 50 km/h is braking and does not slow. Gate F1 tests this muted before anything else is built. |

**Assumption (one line):** the Commander's "begin producing" overrides the dossier's hold until the gravity-flip 48 h read; that read (2026-11-14 00:30 UTC) and Gate A only affect the posting slot and length (§8), not the build.

---

## 1. Premise and title
- **Title (frame 1, y ≈ 170):** `What if friction *vanished*|for 5 seconds?` (accent: *vanished*, amber). The title escalates by caption at 8.5 s ("one minute") and 22.0 s ("ten minutes").
- **Cover line (fact with a number):** `WITHOUT FRICTION, A CAR AT 50 KM/H COULD NEVER STOP`
  - Honest: with grip gone only air drag slows it, and drag alone never brings it to zero (v = v₀ / (1 + v₀·k·t/m)). After 5 s it is still doing 49 km/h.
- **Post caption:** `On dry asphalt a car at 50 km/h needs about 14 m to stop. All of it comes from friction. Everything after the first seconds is dramatization.` (no question, no prompt)

## 2. The law (`src/story.js`, the only source of on-screen numbers)
**The rule (Coulomb friction).** A thing rests on a slope only while tan θ ≤ μ. Friction goes to μ = 0, so every slope steeper than flat slides, with
**a = g·sin θ − (k/m)·v²**, k = ½·ρ·Cd·A (air drag stays). Anything already moving keeps moving; anything spinning keeps spinning; nothing can turn. When grip returns (μ = 0.7), a sliding car skids to a stop at **μ·g·cos θ − g·sin θ**, and a car sliding sideways trips and rolls.
Ladder: friction is off for **T = 5 s**, then (step 2) **T = 60 s**, then (step 3) **T = 600 s**. Each step starts from the normal world.

**The one stated liberty (DRAMATIZATION).** Only friction between solid surfaces and between grains switches off, instantly. Air and water drag stay. Buildings, bolts, nails, knots and clothes hold (in truth they would fail too). The hill town, the 400 m street that ends at a quay, the speed of the hillside flow and how far it runs in 10 min are dramatized. People slip and fall but are never shown being hit or carried away. On-screen tag for the whole film (x 64): `DRAMATIZATION · FRICTION OFF`.

**Sources**
| fact | value | source |
|---|---|---|
| tyre on dry asphalt | μ ≈ 0.7 | https://en.wikipedia.org/wiki/Braking_distance (μ 0.7 dry pavement) — LIKELY; @scout confirms before the counter locks |
| gravity | g = 9.81 m/s² | NASA Earth Fact Sheet https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html |
| slip condition tan θ = μ; dry sand angle of repose | ~34° | https://en.wikipedia.org/wiki/Angle_of_repose — LIKELY; @scout confirms |
| sea-level air density | 1.225 kg/m³ | ISA, https://en.wikipedia.org/wiki/International_Standard_Atmosphere |
| car (stated assumption, in story.js) | m 1,500 kg, Cd 0.30, A 2.2 m² | typical family car; not shown on screen |

Keep off screen: any real place name, the 2019 friction episode's framing ("things fall out of your hand").

**Key counter values (computed; story.js recomputes and the board follows the code)**
k = 0.5 × 1.225 × 0.30 × 2.2 = 0.404 kg/m · slope θ = 10° → a₀ = 9.81 × sin 10° = **1.703 m/s²** · terminal v_t = √(m·a₀/k) = √(2,555/0.404) = **79.5 m/s (286 km/h)** · τ_c = v_t / a₀ = 46.7 s
Slope: v(t) = v_t·tanh(t/τ_c); x(t) = v_t·τ_c·ln cosh(t/τ_c). Flat coast: v(t) = v₀ / (1 + v₀·(k/m)·t).

| what | arithmetic | value on screen |
|---|---|---|
| normal stop from 50 km/h (13.89 m/s) | 13.89² / (2 × 0.7 × 9.81) = 192.9 / 13.73 | **14 M** |
| braking car after 5 s with no friction | 13.89 / (1 + 13.89 × 2.69e-4 × 5) = 13.63 m/s | **49 KM/H**, 69 m past the line |
| parked car on 10° street at τ 5 s | 79.5 × tanh(0.107) = 8.49 m/s; x = 3,710 × ln cosh(0.107) | **31 KM/H**, 21 M |
| skid when grip returns | 0.7 × 9.81 × cos 10° − 1.703 = 5.06 m/s²; 8.49 / 5.06 | stops in **1.7 s**, 7 m |
| step 2, τ 4.5 s (s03 end) | 79.5 × tanh(0.096) | **28 KM/H** |
| step 2, τ 20 s (s04 start) | 79.5 × tanh(0.428) = 32.1 m/s; x = 331 m | **116 KM/H** |
| reaches the quay, 400 m down | v² = 6,321 × (1 − e^(−5.39e-4 × 400)) → 35.0 m/s; t = 46.7 × atanh(0.440) | **126 KM/H at τ 22 S** |
| steepest slope that holds | arctan μ: sand 34° → arctan 0 | **34° → 0°** |

The counter is never typed by hand: overlay and captions read `story.js` every frame (including "126 km/h" in caption C5).

## 3. The board (9 pages, 1,140 frames, 38.0 s at 30 fps)
**Hero:** one featureless adult in a red coat with a shoulder bag, seen from behind on the kerb at the crossing, ~65 design px tall, full colour (`figure.js`). In s01 and the loop tail s09 only. The hero stays on the kerb: nothing reaches them.

| # | shot | frames | film | set | camera | what visibly happens (one cause → effect) | caption (≤ 8 words) | counter: label / value / fact line |
|---|---|---|---|---|---|---|---|---|
| 1 | s01_crossing | 0–119 | 0.0–4.0 | city plaza edge, noon (τ 0→4) | 35 mm, locked `FRAME1_CAM` 1.4 m behind the hero on the kerb, looking across the avenue to the fountain | **frame 1 moving:** a red car at 50 km/h is braking for the red light; its squeal cuts out at 0.25 s and it **does not slow**, sliding across the empty crossing and on into the plaza. A turning car goes **dead straight** instead of turning. Walkers' feet shoot out; they sit down hard. Café tables drift. | T 0.0–2.9: What if friction *vanished*\|for 5 seconds? · C1 2.9–5.7: Brakes do *nothing.* | FRICTION BACK IN / 05.000 → 01.000 / CAR AT 50 KM/H · NORMAL STOP 14 M |
| 2 | s02_grip | 120–254 | 4.0–8.5 | NEW hill street, 10° (τ 4→8.5) | 50 mm from the bottom junction looking uphill (long lens sells the slope); whip-pan in from s01 | parked cars, a bus, bins and tables slide down toward camera together. **At 5.0 s grip returns:** locked cars skid and stop in 1.7 s, sideways cars trip and roll, the bus tips onto its side, tables cartwheel. Car alarms. Aftermath held to 8.5. | C2 5.7–8.5: Then the grip\|*comes back.* | FRICTION BACK IN / 01.000 → 00.000, then SLID / 21 M / HILL CARS HIT 31 KM/H IN 5 S |
| 3 | s03_minute | 255–389 | 8.5–13.0 | hill street, top (step 2, τ 0→4.5) | 24 mm high crane looking DOWN the 400 m street to the harbour at its foot; ends on a whip down the street | the normal street; at τ 0 everything starts sliding away downhill as one mass, accelerating; cars from side streets slide in, collide and **keep spinning** as they slide | C3 8.5–11.5: Now make it\|*one minute.* · C4 11.5–14.3: Every street becomes\|a *slide.* | SLIDING FOR 1 MIN · SPEED / 0 → 28 KM/H / NOTHING CAN BRAKE |
| 4 | s04_quay | 390–524 | 13.0–17.5 | hill street foot + quay + harbour (τ 20→24.5) | 28 mm low, side-on from a moored boat at the quay edge; dark spray wipe out | the street disgorges: cars, a bus, bins, tables arrive at 116 → 126 km/h, fly off the quay edge and slam into the harbour; heavy spray, spinning cars | C5 14.3–17.5: Into the harbour\|at *126 km/h.* | QUAY SPEED / 116 → 126 KM/H / 400 M OF 10° STREET IN 22 S |
| 5 | s05_town | 525–659 | 17.5–22.0 | bay, daylight, wide (τ 55.5→60) | 50 mm from the lighthouse headland across the bay, slow push | the whole hillside town drains: every street pours cars and debris over the promenade into the bay; the beach sand slumps into the water; boats on trailers slide in. At τ 60 (22.0) grip returns: the hit | C6 17.5–22.0: The whole town\|*slides into the sea.* | FRICTION BACK IN / 00:04.5 → 00:00.0 / EVERY STREET ENDS IN THE SEA |
| 6 | s06_hills | 660–794 | 22.0–26.5 | bay, the hills above the town (step 3) | 35 mm from the water looking up the hillside; slow crane up (cut on the move) | **the ground itself flows:** soil and scree pour down the hillsides like slow brown liquid, trees riding on it, houses carried intact (DRAMATIZATION), fanning into the bay as brown water | C7 22.0–24.8: Now make it\|*ten minutes.* · C8 24.8–27.6: Now the *hills* flow. | SLOPE THAT HOLDS / 34° → 0° (tween 22.0–23.0) / DRY SAND, WITH FRICTION: 34° |
| 7 | s07_after | 795–914 | 26.5–30.5 | bay, aerial (τ 10:00, grip back) | 24 mm high aerial continuing s06's crane, slow drift; pushes up into the sky at the end | **aftermath payoff:** the bay filled brown to the brim; cars and boats stranded on a new mud flat; the hills stripped to bare grey rock; the town's streets empty; still water | C9 27.6–30.5: The bay is *full.* | FRICTION BACK AFTER / 10:00 / THE HILLS SLID INTO THE BAY |
| 8 | s08_orbit | 915–1109 | 30.5–37.0 | Earth from orbit, day side | 70 mm, slow push-in | every coastline bleeds brown sediment plumes into the oceans; desert dunes smeared flat | C10 30.5–33.6: Every coast\|*turns brown.* · C11 33.6–37.0: All from one\|*missing* force. | STEEPEST SLOPE THAT HELD / 0° / FOR 10 MINUTES, EVERYWHERE |
| 9 | s09_loop | 1110–1139 | 37.0–38.0 | city crossing, `FRAME1_CAM` (τ −1.0→0) | hard cut on the hit at 37.0 | the normal world: the red car approaches, the light turns red, it starts to brake (real grip, squeal just starting); runs straight into frame 1 | none (silence) | FRICTION BACK IN / 05.000 (frozen) / CAR AT 50 KM/H · NORMAL STOP 14 M |

- **Escalation steps (10):** brakes fail → cars can't turn → people fall → grip returns: crash → 1 min: streets become slides → 126 km/h into the harbour → the town in the sea → 10 min: the hills flow → the bay filled → every coast brown. Payoff by 0:01 (the car doesn't slow), and a new place or counter in every beat.
- **Transitions:** whip-pan following a sliding car (4.0) → hard cut on the grip-return crunch is in-shot at 5.0, not a cut → match cut street-bottom to street-top on a low whoosh (8.5) → whip down the street (13.0) → dark spray wipe (17.5) → **hard cut on the hit** (22.0) → cut on the crane move, motion-blurred (26.5) → push up through the sky to orbit (30.5) → **hard cut on the hit** to frame 1's world (37.0).
- **Frame-1 match test:** s09's last frame vs s01 frame 0 must be identical except the car's 1/30 s of motion and the counter.

## 4. Build map
| shot | reuse (engine) | NEW (keep small) |
|---|---|---|
| s01 | `city.js` plaza + cars/props/trees, `crowd.js`/`figure.js` (hero + 40–60 walkers, `POSES`), birds, `sky.js` day, `S.hdri('hdri_day_1k.hdr')`, `camera.js` | **N2 slide law** in `story.js` (functions above; cars driven by the shot as `citykit` does). **N5 slip:** a scripted fall (rotate 60–80° back about the waist, drop 0.5 m) on top of `crowd.update`. Save `FRAME1_CAM` in `src/kit.js`. |
| s02 | `city.js` (cars, buses, props), `update({ tumble })` for the rolls | **N1 hill street** (`src/hillkit.js`): city.js made into a 10° street by offsetting every instance (buildings, cars, props, trees, lamps) by `groundY(z) = −z·tan 10°` and a sheared ground plane. Buildings stay vertical. **No engine file changes.** |
| s03 | N1, N2 | spin: ω stays constant after a collision (scripted) |
| s04 | N1 foot + `ocean.js` harbour water, `splash.js` `createSpray` (droplets/sheets, no fluff), `createBoats` | a quay edge and the ballistic car launch (N2) |
| s05 | `bay.js` daylight recipe (API §7), `ocean.js`, `splash.js` spray + boats, city cars/props scattered on the bay streets | streets as chutes: N2 objects on `bay.groundH` downhill paths; beach slump = a small terrain vertex lowering along the shore |
| s06 | `bay.js` terrain, trees | **N3 hillside flow (RISKIEST):** terrain vertex morph toward a relaxed profile over τ, a brown flow-streak ground shader on moving regions, trees/houses carried along the flow lines, brown sediment tint in the water near shore |
| s07 | `bay.js`, N3 end state, `splash.createBoats` (stranded), `ocean.js` seabed/mud colour | the mud flat level (N3 final state) |
| s08 | `space.js` Earth day side (`coast: true`, `seg [512,256]`, `ring: false`), `shell.js` none | **N4 sediment:** a default-off brown coastal-plume tint on the oceans (coast SDF + noise), as a project-side `onBeforeCompile` patch (or a default-off `sediment` uniform in space.js) |
| s09 | s01 at τ −1.0 | — |

- **Riskiest shots:**
  1. **s06_hills (N3).** All new; must read as "the ground is flowing", not as a texture scroll or lava. If it misses the look bar after 2 passes, cut it: s05 runs to 24.5 with C7 over its last 2.5 s (the beach and lower hills slumping), s07 becomes the 10 min aftermath. Never cut s01, s02 or the loop.
  2. **s02_grip (N1 + rollovers).** The first new set and the step-1 payoff. A flat-looking street kills it: the long lens from the bottom must show the slope against vertical buildings.
- **Fallback (friction dossier, Director's cut):** if N1 can't reach the bar, the board becomes plaza (s01) → bay (s05, s06/s07) → orbit (s08), with s02's grip-return crash moved to the plaza.
- **Policy:** no figure is ever touched by a car or debris; nobody on the hill street or in the slide paths; people only slip and sit down. No faces, no children, no gore.

### Gates before the full build (Director)
- **Gate F1 — muted hook (first, half size, GPU):** s01 0.0–3.0 s with the overlay, muted. PASS if a viewer can say "the car can't stop" by 1.5 s without reading the caption. If not, fix s01 (closer car, smoke-free skid lines, a second car) before anything else.
- **Gate F2 — hill read:** s02 key frames at 4.5 / 5.2 / 6.5 s. PASS if the slope reads as a hill (vertical buildings, tilted street) and the grip-return crash reads as cause → effect.
- Report both to the Producer with frames; then build the rest.

## 5. Sound (no voiceover; `audio_core.js` + `score.json`)
**No ticks anywhere.** Hits only at 5.0, 22.0 and 37.0. Main energy of every hit stays below ~1 kHz (crunch/thud, not a crack or a ding).
| time | beat |
|---|---|
| 0.0 | brake squeal (sound hit on frame 1) that **cuts dead at 0.25 s** into a glassy, frictionless hiss; city room tone, the crowd's surprise |
| 0.25–4.0 | the hiss, a rising low drone, soft body thumps as people sit down; no tyre noise at all |
| 4.0 | low whoosh on the whip-pan |
| **5.0** | **the big hit:** grip returns: a tyre-bite crunch + metal crumple + sub; then skid squeals, a bus hitting its side, car alarms |
| 5.0–8.5 | alarms settle; glass tinkles; quiet |
| 8.5 | low whoosh on the match cut; the hiss returns; riser 1 starts and climbs with the speed counter |
| 13.0–17.5 | rushing metal on asphalt, then heavy water slams as cars leave the quay; riser 1 peaks at 22 s τ (≈ 15.0 film) and drops into the splashes |
| 17.5–22.0 | wide roar of the town draining; distant slams; the riser rebuilds |
| **22.0** | **hit:** deep earth groan + low crunch on the hard cut |
| 22.0–26.5 | grinding, sliding earth, low and continuous; tree cracks far away |
| 26.5–30.5 | **near silence:** drips, a distant alarm, gulls (the aftermath breathes) |
| 30.5–36.0 | score only (space is silent): a low swelling drone |
| 36.0–37.0 | silence |
| **37.0** | **soft hit:** low thud on the cut to the crossing |
| 37.0–38.0 | city room tone and the squeal just starting, which flows into frame 1 |
- Master to −14 LUFS, peaks ≤ −1 dBTP.
- **check.py note:** if `check.py` still demands a mid-range hit above 200 Hz on *every* page cut, do NOT add cracks to pass it. That rule change is the open item from the 11-12 dossier (Studio: loosen the cut-hit rule); report it as a known WARN.

## 6. Look
- Daylight first: noon city, noon bay, orbit on the day side. Never an all-night Earth.
- Full-colour people at mid-distance (crowd ≤ 150 design px, hero ~65 px): varied coats and bags, no silhouettes, no faces, no children, no gore.
- Cars and buses in varied colours; skid marks are dark rubber lines, never smoke. No fluffy smoke or fog anywhere; spray is droplets/sheets; mud is wet and glossy brown, not a flat strip.
- Motion blur 180°: 4 samples (s07, s08, s09), 8 (s03, s05, s06), 12 (s01, s02, s04: fast cars). Nothing over 40 px/frame without blur. No white strobes: the spray wipe is dark with droplets.
- `post.js`: ACES, bloom, grain, vignette.
- **Safe area (540×960 design px):** all type in x 60–480, y 100–765, and left of x 440 for y 430–870. Title y ≈ 170 (≤ 410 wide), counter x 64 at y 384–470, captions centred on y 590 (≤ 330 wide), DRAMATIZATION tag at x 64. Key action in y 200–640. `band` on captions over bright sky/spray. Overlay `style: {look: 'v2'}`.

## 7. Render and QC
- Build: `py tools/build_page.py` per shot; key frames with `node tools/frames.js` on the GPU (`IJ_GPU=1`; never mix with SwiftShader inside a shot).
- Render: push to `main`, then the Commander runs `.\pc\render_project.ps1 friction-vanishes` (= `node tools/render_all.js … --quality max`, 95 MB target). `-Shots a,b` to redo single shots.
- `tools/check.py` must PASS on `final.mp4`:
  - frames: 1,140 frames, 1080×1920, 30 fps, under 100 MB;
  - loudness −14 LUFS, peaks ≤ −1 dBTP;
  - flashes: none (check 5.0, 17.5 spray wipe, 30.5 sky push, 37.0 loop cut);
  - silence as the last beat before the loop;
  - text: contrast ≥ 3:1 after yuv420p, checked before assembly with `--contrast overlay.mov --bg clean.mp4 --every 0.2`; no safe-area WARNs (`--safe`).
- Also the frame-1 vs last-frame diff (§3) and a contact sheet reviewed by the Director. One auto-fix round, then report.
- **Listen test (new, from the tsunami Tenth Man):** the Director plays the final mix once with sound and confirms there is no repeating high tone; report "no ding" or name the offending cue.

## 8. Posting
- **Cover:** `WITHOUT FRICTION, A CAR AT 50 KM/H COULD NEVER STOP`
- **Caption:** see §1 (no question, no bait).
- **Hashtags (fixed):** `#whatif #physics #space #earth #science`
- **AI-generated label:** ON. DRAMATIZATION tag visible.
- **Slot:** 2 PM CST = **2026-11-16 20:00 UTC (Mon)**: tsunami-524 takes 2026-11-14 20:00 UTC; this goes after tsunami's 48 h pull (2026-11-16 20:00 UTC is that mark, so pull tsunami first, then post). Hold if a gate or QC hasn't passed.
- **Gate A (BRAIN, 2026-11-13):** if moon-2x's average watch is above 13.4 s, video #4 is the 64 s length test. Then the Writer stretches this board (every beat ~1.7×, same shots, no new steps), which also answers "too fast". Otherwise ship at 38 s.
- **At 48 h:** log views, average watch, watched-full, 3 s hold, For You share, traffic sources and the retention drop point in `channel/results.csv`.
