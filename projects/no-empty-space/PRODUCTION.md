# PRODUCTION: no-empty-space

**Greenlit by the Commander:** 2026-11-13 03:37 UTC (9:37 PM CST, 11-12), pitch `pitches/2026-11-12-6.json#p5`.
**Sources:** that pitch, overridden by the Commander's plan in the greenlight order (the squeeze ladder, the harbour town, the comedy, the Moon ending), plus `PLAYBOOK.md`, `channel/references/LOOK.md`, `channel/BRAIN.md`, `channel/TASTE.md` and `engine/API.md`.
**Slug:** `no-empty-space`. Build everything in this folder. Use `projects/earth-stops/src/` (`kit.js` look, `plazaLife.js`, `towersBreak.js`) for code patterns only. The architecture, place, palette and people are all new.
**Bar:** the Commander wants NO room for improvement. Every shot gets its key frames checked on the GPU against LOOK.md before the render.

## 0. Flags (read before building)
1. **Length: 70.0 s, not 30–38 s.** This breaks PLAYBOOK §1 and the 9–12 shot / 30–38 s default on purpose. The Commander ordered 60–75 s at a calm pace, which matches LOOK.md (hits run 69–84 s). Gate A data hasn't come in yet, so treat this as the length test.
2. **Cost: 12 shots and 4 new pieces of work.** That breaks the video #4 cost rule (6–7 shots, at most 1 new effect). The Commander's order overrides it. Most of the new work is the squeeze effect N1, which every rung of the ladder reuses.
3. **Niche adjacency.** "Earth crushed into a black hole (9 mm)" videos are common. Ours differs in three ways: the density is nuclear (the atoms only lose their empty space), it's a ladder of everyday things in one town, and the twist is that the Moon doesn't notice. Never use the words "black hole" or "neutron star" on screen.
4. **The coffee-cup gag is changed.** The Commander asked for someone who "can't lift" a squeezed cup. A 0.3 kg speck 1.4 µm wide can't be held at all: it sinks straight through the saucer. The gag stays a "can't have it" gag: the cup vanishes in his fingers, the coffee splashes his lap, and a pinhole is left in the saucer.
5. **Nobody is ever squeezed or shown hurt.** The ferry is docked and empty (`FUORI SERVIZIO` / OUT OF SERVICE sign). The tower is unfinished and empty (`OPENING 2027` banner, cranes). No people are on the mountain. The Earth beat is seen only from space.
6. **The one-character rule.** The hero is the car owner, seen from behind: a stocky man in a straw hat, a lime-and-white striped shirt and red shorts, holding car keys. Other people react around him in full colour, with no faces and no children.

## 1. Premise and title
- **Title (frame 1, y ≈ 170):** `What if atoms had|no *empty space?*` (accent: *empty space*)
- **Cover line:** `ALL 8 BILLION PEOPLE WOULD FIT IN A SUGAR CUBE`
- **Post caption:** `Atoms really are almost all empty space. Squeeze it out and matter reaches nuclear density: about 230 million tonnes in one cubic centimetre. Every size and weight here is computed from that. The instant squeeze is dramatization, and its enormous energy is ignored.`

## 2. The law (`src/story.js`, the only source of on-screen numbers)
**The rule.** At its squeeze time, an object keeps its mass m and packs to nuclear density ρₙ = 2.3×10¹⁷ kg/m³. Its new diameter is **d = (6m / (π·ρₙ))^(1/3)**. A squeezed speck still weighs m, so nothing can hold it up: it falls through rock as if through air, **depth = ½·g·t²** (drag ignored). Film time = story time, so there is no slow motion.

**The one stated liberty (post caption only, never on screen):** the squeeze happens instantly and its energy is ignored, and the Earth's collapse is shown over about 3 s. Every number on screen comes from story.js.

**Sources** (none re-checked live this turn: the Director confirms them in story.js comments, and any change to a constant re-flows every value automatically)
| fact | value | source |
|---|---|---|
| nuclear density | ≈ 2.3×10¹⁷ kg/m³ | https://en.wikipedia.org/wiki/Nuclear_density; nuclear saturation density, https://pdg.lbl.gov |
| Earth's mass and mean diameter | 5.9722×10²⁴ kg · 12,742 km | NASA Earth Fact Sheet https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html |
| GM of Earth | 3.986×10¹⁴ m³/s² | same |
| Moon's orbit | 384,400 km · 27.32 d sidereal | NASA Moon Fact Sheet https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html |
| world population | ≈ 8.2 billion (2025) | UN World Population Prospects https://population.un.org/wpp/ |
| average body mass | 62 kg (adults, 2005) | Walpole et al., BMC Public Health 2012, https://doi.org/10.1186/1471-2458-12-439 |
| fall time to Earth's centre | 38 min end to end → ~19 min to the centre | Klotz, Am. J. Phys. 83, 231 (2015), https://doi.org/10.1119/1.4898780 |

**Key values (computed; π·ρₙ = 7.226×10¹⁷)**
| object (our own models) | m | arithmetic: d = (6m / 7.226e17)^(1/3) | on screen |
|---|---|---|---|
| water / your body (ρ = 1,000) | — | empty fraction = 1 − 1,000 / 2.3e17 = 1 − 4.35e-15 | **99.9999999999996% EMPTY** |
| phone | 0.20 kg | (1.661e-18)^(1/3) = 1.18e-6 m | **15 CM → 1.2 µM** |
| coffee cup | 0.30 kg | (2.491e-18)^(1/3) = 1.36e-6 m | **9 CM → 1.4 µM** |
| hatchback | 1,500 kg | (1.246e-14)^(1/3) = 2.32e-5 m | **4 M → 23 µM** (a hair is about 70 µm) |
| harbour ferry (docked, empty) | 3,000 t | (2.491e-11)^(1/3) = 2.92e-4 m | **70 M → 0.29 MM** (a fine sand grain) |
| landmark tower (fictional; 381 m, Empire-State-class mass) | 365,000 t | (3.031e-9)^(1/3) = 1.45e-3 m | **381 M → 1.4 MM**; = 3.65e8 / 1,500 = **243,000 CARS** |
| the town's mountain (a cone 1,500 m tall, base r 3 km, rock 2,700 kg/m³) | π·3,000²·1,500/3 = 1.414e10 m³ → 3.82e13 kg | (3.169e-4)^(1/3) = 6.82e-2 m | **1,500 M → 6.8 CM** (a tennis ball is 6.7 cm); **38 BILLION T** |
| Earth | 5.9722e24 kg | V = 5.9722e24 / 2.3e17 = 2.597e7 m³; r = (3V/4π)^(1/3) = 183.7 m | **12,742 KM → 367 M**; **6.0×10²¹ T** |
| mini-Earth's surface gravity | — | 3.986e14 / 183.7² = 1.18e10 m/s² ÷ 9.807 | **1.2 BILLION G** |
| everyone (cover) | 8.2e9 × 62 kg = 5.08e11 kg (generous: children weigh less) | 5.08e11 / 2.3e17 = 2.2e-6 m³ = **2.2 cm³**, a cube 1.3 cm on a side | a sugar cube is about 1.3–1.6 cm (2.2–4 cm³) → **fits** ✓ |
| car falling (squeezed at 13.5 s) | — | ½·9.81·t²: t = 4.5 s → 99 m; t = 10 s → 490 m | **99 → 490 M**, fact **CENTRE OF EARTH IN ~19 MIN** |
| tower grain falling (squeezed at 33.0 s) | — | t = 4 s → 78 m; t = 10 s → 490 m | **78 → 490 M** |
| Moon | unchanged mass → unchanged pull (shell theorem) | — | **27.3 DAYS · UNCHANGED** |

Write the values with SI units through story.js (`fmtSize()` picks µm / mm / cm / m / km). Before the build starts, check that the counter font has the µ glyph; if it doesn't, write `MICRONS`.

## 3. The board (12 shots, 2,100 frames, 70.0 s at 30 fps)
**The hero place:** a Mediterranean hillside harbour town. Pastel houses (ochre, coral, mint, sky-blue) are stacked up a slope under terracotta roofs, with arches, green shutters, laundry lines, bougainvillea, a church with a tiled dome, and stairs. There is a quay with fishing boats and a docked ferry. A rocky headland carries an unfinished 381 m glass-and-stone landmark tower with cranes and an `OPENING 2027` banner. A 1,500 m mountain rises behind the town.
**The hero vantage:** the café terrace `BAR DEL PORTO`. A foreground railing with flower boxes and striped awnings looks over the harbour to the headland tower. Golden hour comes from the left, with long shadows and warm haze.
**People:** 60–120 per town shot, from `plazaLife.js` restyled: fishermen, tourists with sun hats and cameras, a nun on a scooter, a gelato seller, waiters, an accordion player, old men at a card table, joggers, a dog walker with three dogs. Body shapes, outfits, hats and bags all vary, and every person has an activity. **Story props:** `GELATO`, `PESCE FRESCO`, `FERRY · FUORI SERVIZIO`, `OPENING 2027`, a menu board, Vespas, a fruit cart, kites over the mole.

| # | shot | frames | film (s) | set | camera | what visibly happens | caption (≤ 8 words) | counter: label / value / fact line |
|---|---|---|---|---|---|---|---|---|
| 1 | s01_phone | 0–179 | 0.0–6.0 | terrace (hero vantage), `FRAME1_CAM` | 35 mm, locked behind the hero at the railing; a 2% push-in after the pop | A busy terrace. At 1.6 s, a tourist's selfie phone (mid-frame left, at arm's length) **implodes**: its shards streak into a hot point, an air-snap sucks napkins, a straw hat and sugar packets inward, and the table glass cracks. A glowing bead drops through the floor with a dust puff. She stares at her empty hand while the tables around her jump up. | T (0.0–3.0): What if atoms had\|no *empty space?* · C1 (3.0–6.0): Her phone just lost\|its *empty space.* | PHONE · SIZE / 15 CM → 1.2 µM at 1.6 s / WEIGHT 0.2 KG · UNCHANGED |
| 2 | s02_cup | 180–344 | 6.0–11.5 | the terrace, café table | 50 mm, low table height, slow drift | **Gag 1:** an old man in a cardigan reaches for his espresso. The cup implodes in his fingers (a small pop and an inward ripple of air), the coffee drops and splashes his lap, and a neat pinhole is left in the saucer. He lifts the saucer and looks through the hole. The waiter freezes mid-pour. | C2 (6.3–11.3): Atoms are\|*99.9999999999996%* empty. | COFFEE CUP · SIZE / 9 CM → 1.4 µM / WEIGHT 0.3 KG · UNCHANGED |
| 3 | s03_car | 345–539 | 11.5–18.0 | the quay street below the terrace | 28 mm, behind the hero at mid-distance, slow track | The hero strolls to his little red hatchback and clicks the key fob. At 13.5 s the car **implodes**: the panels fold and shatter inward into a point, a boom, dust, leaves and a fruit-cart's lemons are sucked in, and his straw hat flies off toward the point. A glowing line punches down into the cobbles. **Gag 2:** he clicks the fob again, pats his pockets, looks under a bench. | C3 (14.0–17.8): His car: *thinner\|than a hair.* | CAR · SIZE / 4 M → 23 µM / WEIGHT 1.5 T · UNCHANGED |
| 4 | s04_hole | 540–704 | 18.0–23.5 | the quay, ground level | 24 mm, low and close at the hole, slow orbit | A neat smoking hole the size of a coin in the cobbles (stylised: honest scale is invisible). The hero kneels and shines his phone light in; a faint glow sinks deep below. A dog sniffs it, and a fisherman peers over his shoulder. | C4 (18.3–23.3): Still 1.5 tonnes.\|It *sinks through rock.* | CAR · DEPTH / 99 → 490 M (½gt²) / EARTH'S CENTRE IN ~19 MIN |
| 5 | s05_ferry | 705–899 | 23.5–30.0 | the harbour from the mole | 35 mm, wide, a slow push | At 25.5 s the docked, empty ferry **implodes**: the hull plates shear inward, and the sea rushes into a 3,000 m³ hole. The crater slams shut into a **geyser column of white water, foam and spray**, then a ring wave rocks every boat; the mooring ropes snap free. The crowd on the mole runs back, and a fisherman's catch lands in a tourist's arms. | C5 (25.8–29.8): The ferry: *a grain\|of sand.* | FERRY · SIZE / 70 M → 0.29 MM / WEIGHT 3,000 T · UNCHANGED |
| 6 | s06_tower | 900–1109 | 30.0–37.0 | terrace (hero vantage), looking at the headland | 85 mm from the terrace, locked, then a hit shake | **THE SET PIECE.** At 33.0 s the 381 m tower implodes from the outside in, in 0.8 s: the glass skin, floors, cranes and banner tear into thousands of shards that spiral into one blinding point, dragging rock off the headland. Then the shock: a dust ring races out over the water, the harbour surface flattens and ripples inward, awnings rip, the terrace windows shatter inward, and people duck (the hero holds onto his hat). | C6 (33.3–36.8): A 381 m tower\|*implodes to 1.4 mm.* | TOWER · SIZE / 381 M → 1.4 MM / WEIGHT 365,000 T · UNCHANGED |
| 7 | s07_drop | 1110–1289 | 37.0–43.0 | the headland, closer | 50 mm from a boat in the harbour, slow push | The bead falls: the headland rock under it cracks open in a star of fissures and caves into a crater, rocks tumble into the sea in splashes and spray, and the harbour water swirls toward the cave-in. Dust settles in gold light. People on the mole point. | C7 (37.3–42.8): 365,000 tonnes\|*punch through the hill.* | TOWER GRAIN · DEPTH / 78 → 490 M / ONE GRAIN = 243,000 CARS |
| 8 | s08_mountain | 1290–1499 | 43.0–50.0 | reverse: from the mole back at the town and the mountain | 24 mm, low, locked, then a small shake | At 44.5 s the mountain behind the town **implodes**: its rock faces shatter into slabs streaming into a point, and the skyline turns into open sky. Then the air rush: a gale sweeps up through the town toward where it stood, carrying laundry, umbrellas, kites, gulls, roof tiles and café chairs. **Gag 3:** the gelato seller's scoop flies off the cone; he is left holding the empty cone, looking at it. | C8 (45.0–49.8): The mountain:\|*a tennis ball.* | MOUNTAIN · SIZE / 1,500 M → 6.8 CM / WEIGHT 38 BILLION T · UNCHANGED |
| 9 | s09_earth | 1500–1679 | 50.0–56.0 | crane up from the town → orbit | 0.0–1.5 s crane up through the dust; cut on a hit to 70 mm on the whole sunlit Earth, then a slow pull-back | Earth, sharp and whole (day side, never fuzzy). At 52.0 s it squeezes over ~3 s: the crust cracks into plates that fall inward, the oceans tear into white spray streams, and the cloud layer lags and is pulled in last. It shrinks toward a white-gold point. | C9 (50.3–55.8): Then the\|*whole Earth.* | EARTH · WIDTH / 12,742 KM → 367 M / WEIGHT 6.0×10²¹ T · UNCHANGED |
| 10 | s10_speck | 1680–1829 | 56.0–61.0 | deep space close-up | 35 mm, a slow dolly toward the ball | A hot, glowing ball 367 m wide hangs against a sharp star field, with a faint heat shimmer. For scale, a thin ghost outline of the lost 381 m tower stands beside it, the same height. | C10 (56.2–60.8): Earth: *367 m.*\|The tower's height. | EARTH · WIDTH / 367 M / SURFACE GRAVITY 1.2 BILLION G |
| 11 | s11_moon | 1830–1979 | 61.0–66.0 | orbit, with the Moon in the foreground | 135 mm, low behind the Moon's limb, slow pan | The crisp, cratered Moon (`moon.js`) glides through frame on its usual path; far beyond it the Earth-speck is a single bright star. A faint, thin orbit arc traces the Moon's path. **The twist.** | C11 (61.2–65.8): The Moon\|*doesn't notice.* | MOON · ORBIT / 27.3 DAYS / UNCHANGED · SAME MASS, SAME PULL |
| 12 | s12_loop | 1980–2099 | 66.0–70.0 | black end card → terrace | end card 66.0–69.0 (fade in 0.3 s); **hard cut on a hit at 69.0** to `FRAME1_CAM` | End card: the title again, then in small text: *All 8 billion people would fit in a sugar cube.* Then the busy frame-1 terrace (page time 4.0 s), with the hero at the railing and the phone intact. Hold for 1.0 s, and TikTok restarts on frame 1. | end card text only; terrace: the title, as on frame 1 | end card: none · terrace: PHONE · SIZE / 15 CM (frozen) / WEIGHT 0.2 KG |

- **Escalation (9 rungs, ×10–×10¹⁰ in mass each):** phone 0.2 kg → cup → car 1.5 t → ferry 3,000 t → tower 365,000 t → mountain 38 billion t → Earth 6×10²¹ t → the speck's gravity → the Moon twist. The payoff lands at 1.6 s. Every shot has a new angle or a new counter, while the one hero place carries s01–s08 (LOOK.md rule 1).
- **Transitions:** a dust/napkin foreground wipe (6.0) → a tilt down to the street (11.5) → a match cut on the hole (18.0) → a whip-pan to the harbour with blur (23.5) → a hard cut on the tower's pre-rumble (30.0) → a push through the dust (37.0) → a hard cut to the reverse on a hit (43.0) → a crane up (50.0) → a dolly (56.0) → a pan (61.0) → a fade to black (66.0) → a hard cut on a hit (69.0). A hard cut lands only on a hit.
- **Pace:** each beat holds 5–7 s. The squeeze lands 1.5–2.5 s into the shot, and the reaction gets the rest. Never rush a reaction (TASTE: "too fast is worse").

## 4. Build map
| shot | reuse (engine / earth-stops patterns) | NEW |
|---|---|---|
| all town shots | `sky.js` golden-hour mode, earth-stops `kit.js` light/grade/haze patterns, `ocean.js` (harbour water + planar reflection), `bay.js` (boats, pier, lighthouse as a base), `figure.js` + `POSES`, `crowd.js` birds, `plazaLife.js` crowd/gag system (restyled) | **N2 harbour town set** `src/harbour.js`: new low-poly Mediterranean architecture (stacked pastel houses, terracotta roofs, arches, dome, stairs, laundry, bougainvillea, awnings, signs), the headland + tower + cranes, the mountain, the terrace foreground, `FRAME1_CAM`. One coherent flat-shaded kit; no glossy photoreal pieces. |
| s01, s02, s03, s05, s06, s08 | `towersBreak.js` fracture approach, `debris.js` rubble streams, `post.js` bloom | **N1 squeeze effect** `src/squeeze.js` (the shared core): `squeeze(obj, t0, {dur, scale})` fractures the mesh into low-poly shards that spiral and stretch into a point (accelerating, motion-blurred), plus a hot bead (emissive and bloom; **no frame-wide white flash**), an air-inrush field that pulls loose props/cards toward the point, an outward pressure/dust ring, then the bead's drop streak and a dust puff plus a pinhole/crater decal. One API, tuned from phone scale to mountain scale. |
| s05, s07 | `splash.js` spray and foam, `ocean.js` surf | the ferry geyser: a crater in the water that slams shut (a short-lived dimple mask in `ocean.js`, then a `splash.js` column); s07 headland crack and cave-in (fracture pattern from `towersBreak.js`) |
| s09 | `space.js` Earth (day, clouds, atmosphere), the `breakup.js` chunk technique + `trimBreakup`, `debris.js` streams | **N3 Earth squeeze:** animate the Earth radius 6,371 km → point over 3 s; crust plates (`breakup.js`-style chunks with the Earth texture) fall inward, ocean spray streams in white, the cloud shell lags. Whole-Earth framing only: never a close crop of the satellite texture (TASTE). |
| s10 | `space.js` stars, `post.js` bloom | **N4** the glowing ball (an emissive low-poly sphere with surface flicker and heat shimmer) + the ghost tower outline (wireframe from s06's tower mesh) |
| s11 | `moon.js` (LROC/LOLA, sharp), `space.js` stars/Sun | the thin orbit arc (one line) |
| s12 | s01 at page time 4.0 s; overlay end card | — |

- **Riskiest shots:**
  1. **s06_tower.** It is the set piece. It must read as **physical** (thousands of shards torn off and swallowed, rock dragged off the headland), never as a model scaling down or a smooth blob. Test frames at 32.8 / 33.2 / 33.5 / 34.5 s on the GPU first. Fallback: slow the implosion to 1.2 s and double the shard count in the outer skin.
  2. **s09_earth.** It must stay sharp and clean (TASTE: orbit views) while it shatters. If the plates read as noise, use fewer, bigger plates (24–40) with white spray seams, and keep the camera on the whole Earth.
  3. **s01 hook.** A phone is small. The phone sits mid-frame at about y 380, the napkin/hat inrush spans a third of the frame, and the table glass cracks, so the change is unmissable by 2.0 s.
- **Cut plan if time runs out** (reaches 60.0 s, still in the Commander's range): drop s02 (move the 99.9999999999996% caption to s01's C1 window, 3.0–6.0, and drop "Her phone…") and shorten s10 to 3.0 s with the scale outline only. Never cut s01, s03, s06, s08, s09, s11 or the loop.
- **Frame-1 match test:** s01 at page time 4.0 s must equal s12's last frame, including the title and the counter.
- **Policy:** no one is squeezed or hurt, no blood, no faces, no children. Reactions are big and cartoon (ducking, pointing, gaping, running back).

## 5. Sound (no voiceover; `audio_core.js` + `score.json`)
Follow the Commander's rule: no ticks, dings or repeating high tones. **The squeeze sound** (one family, scaled per rung): a reversed whoosh sucking inward, then a hard stop, then a sub boom with a mid-range crack above 200 Hz, then the air rush. Bigger objects get longer inhales, deeper booms and longer rushes.
| time | beat |
|---|---|
| 0.0–1.4 | harbour room tone: gulls, an accordion, cups and chatter, lapping water; a low drone starts |
| **1.6** | **phone squeeze** (small: a snap with a sub thump) + glass crack; the accordion stops mid-note |
| 6.0–11.5 | quiet café; **cup pop** ~7.8 s, a coffee splash, a gasp, the waiter's pour drips |
| 11.5–13.4 | footsteps, a key-fob chirp-chirp (low-pitched, once) |
| **13.5** | **car squeeze:** a medium boom + metal crunch + inrush; the hat whoosh |
| 14.5–18.0 | a second key-fob click into silence (the gag), distant car alarms |
| 18.0–23.5 | quiet; a hollow wind tone from the hole, a dog sniff, a falling-pitch rumble from deep down |
| **25.5** | **ferry squeeze:** a steel groan inhale, a boom, then the **water slam + geyser roar**, ropes snapping, a ring wave slapping the quay; crowd shouts |
| 30.0–32.9 | a low riser 1 + a deep ground rumble; birds lift off |
| **33.0** | **TOWER: the biggest squeeze.** A 0.8 s inhale (glass shriek pulled inward), then the cut-off, a **0.4 s of silence**, then the BIG hit (sub + crack), the shock roar, windows shattering, the crowd screaming |
| 37.0–43.0 | rock cracking, the cave-in, splashes; the rumble sinking |
| **43.0** | **cut hit** to the reverse angle |
| **44.5** | **mountain squeeze:** a long, deep inhale, a boom, then the gale roar sweeping through the town (cloth flapping, tiles) |
| 50.0–52.0 | the gale fades as we rise; riser 2 climbs |
| **52.0–55.0** | **Earth squeeze:** a low groan into a deep inhale, riser 2 peaks |
| **55.0** | **hit**, then the score only |
| 56.0–66.0 | a single low tone + a soft high shimmer (no ticks); the Moon beat thins to near silence |
| 66.0–69.0 | **silence** under the end card |
| **69.0** | **cut hit:** a soft sub + a mid-range click on the cut to the terrace; harbour room tone resumes for the loop |
- Master to −14 LUFS, peaks ≤ −1 dBTP. The cut hits (13.5, 25.5, 33.0, 43.0, 44.5, 55.0, 69.0 s) have energy above 200 Hz.

## 6. Look (LOOK.md, strictly)
- **One coherent stylised low-poly kit:** flat-shaded houses, boats, cars, trees, props and people in the same proportions and palette. Nothing glossy or photoreal sits next to it (the tower's glass is flat-shaded panels too).
- **Light:** golden hour from frame left, a low sun, long shadows, warm haze in depth, bloom on the beads. **Grade shift:** warm gold (s01–s05) → amber dust (s06–s08) → clean cold space with a white-gold speck (s09–s11) → black (s12) → warm gold again at the loop.
- **The event fills the frame:** the tower's shard spiral and dust ring take at least half the frame; the mountain gale fills the whole frame with flying things.
- **Destruction is physical:** shards, slabs, tiles, splashes, foam and spray. No smooth blobs, no scale-down tricks, no layers sliding, **no fluffy smoke** (dust as thin ribbons and puffs only), no white strobes.
- **Space is sharp:** the whole Earth and a crisp Moon; never a zoomed satellite crop, never streaky blur.
- **People:** full colour, mid-distance, the hero 55–80 design px tall, varied bodies and outfits, characterful motion (ducking, pointing, clutching hats, running back).
- **Motion blur 180°:** 4 samples (s02, s04, s10, s11, s12), 8 (s01, s03, s07, s09), 12 (s05, s06, s08).
- **Text (no bands, no boxes):** the LOOK.md typography (a serif title centred in the top third, a small-caps counter label + a big number + a small-caps sub-line on the left, italic serif captions centred in the lower middle) with soft shadows only. **Do not use `band`.** If contrast fails, fix the picture (local grade or a darker sky behind the text), not the text. Safe area: all type in x 60–480 and y 100–765, and left of x 440 for y 430–870; title y ≈ 170 (≤ 410 wide), counter at x 64 and y 384–470, captions centred on y 590 (≤ 330 wide). Key action in y 200–640.

## 7. Render and QC
- Build each shot with `py tools/build_page.py`. Check key frames with `node tools/frames.js` on the GPU (`IJ_GPU=1`; never mix it with SwiftShader in one shot), at minimum the squeeze moment ±0.3 s of every rung.
- Render: push to `main`, then `.\pc\render_project.ps1 no-empty-space` (`render_all.js --quality max`; `-Shots a,b` for redos). Estimate: 2,100 frames at ~1.3 s per frame ≈ 46 min of render, plus sound, captions and QC.
- `tools/check.py` must PASS on `final.mp4`:
  - frames: 2,100 frames, 1080×1920, 30 fps, under 100 MB;
  - loudness: −14 LUFS, peaks ≤ −1 dBTP;
  - flashes: no upward-jump flashes (check the beads at 1.6, 13.5, 25.5, 33.0, 44.5 and 55.0 s);
  - cut hits above 200 Hz at the times in §5; silence as the last beat before 69.0;
  - text contrast ≥ 3:1 after yuv420p (`--contrast overlay.mov --bg clean.mp4 --every 0.2`), with no safe-area WARNs (`--safe`).
- Also the frame-1 match test (§4) and a contact sheet the Director reviews against LOOK.md. One auto-fix round, then report.

## 8. Posting
- **Cover:** `ALL 8 BILLION PEOPLE WOULD FIT IN A SUGAR CUBE`
- **Caption:** see §1. No question, no bait.
- **Hashtags (fixed):** `#whatif #physics #space #earth #science`
- **AI-generated label:** ON. There is no on-screen DRAMATIZATION tag; the liberty is in the caption.
- **Slot:** 2 PM CST (20:00 UTC) on the first free day after the videos already queued for that slot. The Commander confirms the date.
- **At 48 h:** log views, average watch, watched-full, the 3 s hold, For You share, traffic sources and the retention drop point in `channel/results.csv`. This is the first 70 s film in the new look, so compare its average watch with earth-stops v2 (65 s).
