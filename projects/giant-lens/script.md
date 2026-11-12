# giant-lens: "What if a magnifying glass the size of a house looked at a city?" (video #5, board v1)

Approved brief: `PRODUCTION.md` (greenlit 2026-11-12 16:15 CT). This board is the brief's §3, adjusted where the lead's
build found a reason (see **Deviations** at the bottom). Format: Studio v2, 9 shots, **38.0 s = 1,140 frames**, 30 fps.

## The one law (`src/story.js`)
- **The rule.** Sunlight delivers S = 1,000 W/m². A perfect lens of diameter D hangs at its focal length f = D (f/1) on the
  line to the Sun. Beam power **P = S·π(D/2)²**; the spot is the Sun's image, **w = θ☉·D** (θ☉ = 0.533° = 0.009303 rad).
- **Concentration C = (D/w)² = 1/θ☉² = 11,556 suns at every size**, so the spot flux is q = 11.6 MW/m² and the equilibrium
  temperature of a black surface is **T = (q/σ)^¼ = 3,778 K = 3,505 °C → shown 3,500 °C** (real solar furnace: ~3,500 °C).
- **The ladder:** D ×√10 per step → P ×10 per step, 9 steps.
- **The one liberty (DRAMATIZATION · PERFECT GIANT LENS):** a perfect glass lens of any size hangs motionless at its focal
  length, aimed down the sunline, grows on cue (×√10 in 0.8 s, `GROW_S`), and in frame 1 comes into focus. The light cone
  is drawn faintly visible. S stays 1,000 W/m² even above the air (conservative; 1,361 W/m² up there). Fire spread beyond
  the beam is not modelled.
- **Geometry:** lens centre = spot + SUN·D (`lensCentre`). The kit's sun is 65° high, so the lens hangs 0.91·D above its spot.

| step | shot | D | P | spot w | shown |
|---|---|---|---|---|---|
| 1 | s01 | 20 m | 314 kW | 0.19 m | 0.31 MW |
| 2 | s02 | 63 m | 3.14 MW | 0.59 m | 3.1 MW |
| 3 | s03 | 200 m | 31.4 MW | 1.9 m | 31 MW |
| 4 | s04 | 632 m | 314 MW | 5.9 m | 314 MW · boils 121 kg of sea/s |
| 5 | s05 | 2.0 km | 3.14 GW | 19 m | 3.1 GW · boils 1.2 t of sea/s |
| 6 | s06 | 6.3 km | 31.4 GW | 59 m | 31 GW |
| 7 | s07 | 20 km | 314 GW | 186 m | 314 GW |
| 8 | s07 | 63 km | 3.14 TW | 590 m | 3.1 TW |
| 9 | s08 | 200 km | 31.4 TW | 1.9 km | 31 TW = 1.6× all human power use (19.65 TW = 620 EJ/yr) |

- **Frame-1 focus ramp** (`focusC`): C = 10 suns at frame 1 (**375 °C**, a 6.3 m bright disc), log-eased (outCubic) to
  11,556 suns (3,500 °C, a 0.19 m point) at film 1.0 s. T(C) = (C·1,000/σ)^¼.
- **Effect timings:** a 6 mm pane (15 kg/m², c 0.84 kJ/kg·K, +1,400 K = 17.6 MJ/m²) flows in **1.53 s** ("under 2 seconds");
  boiling sea takes 2.59 MJ/kg → 121 kg/s at 314 MW, 1.2 t/s at 3.1 GW. Wood and paint ignite in well under 1 s.

## Shots (film seconds; `src/story.js SHOT`; grows in shot time)
| # | shot | frames | film | set | camera | what visibly happens | caption | counter (label / value / fact) |
|---|---|---|---|---|---|---|---|---|
| 1 | s01_plaza | 135 | 0.0–4.5 | noon plaza (kit `cityWorld`) | `FRAME1_CAM` locked (28 mm, 5.5 m up, looking north); slow push / zoom from 1.5 s | the wide bright disc inside the lens shadow tightens to a white-hot point by 1.0; the point drags a glowing, charring line across the paving to the parked blue car; roof paint smokes (2.0), bursts into flame (3.0); the crowd scatters; ends whipping right | T 0.0–3.6 · C1 3.8–6.8 "3,500 °C. A real \| *solar furnace* does this." | SPOT TEMP / 375 → 3,500 °C / LENS 20 M · 0.31 MW |
| 2 | s02_street | 135 | 4.5–9.0 | the east street x = 60 (looking north) | whip lands; 35 mm behind the hero, slow track up the street; ends tilting UP | lens grows 20 → 63 m (0.15–0.95 s); the 0.6 m beam sweeps up the kerbside row of parked cars: each catches ~1 s apart; street trees flare; the asphalt line glows; people run past the hero | C2 6.9–9.7 "Now make the lens *bigger.*" | BEAM POWER / 0.31 → 3.1 MW / LENS 63 M · SPOT 3,500 °C |
| 3 | s03_tower | 135 | 9.0–13.5 | a glass tower on the same street | tilt-up continues (24 → 35 mm), slow push up the facade | lens grows 63 → 200 m (0.2–1.0 s) above the skyline; the 1.9 m beam climbs the facade: panes glow orange, sag, pour glowing drips; burning drops rain on the street; a black, glowing gash up ~20 floors | C3 10.0–13.3 "Window glass melts in \| *under 2 seconds.*" | BEAM POWER / 3.1 → 31 MW / LENS 200 M · 11.6 MW ON EVERY M² |
| 4 | s04_bay | 135 | 13.5–18.0 | horseshoe bay, noon (kit `bayWorld`) | **hard cut on hit 1**; 50 mm from the beach, slow lateral drift | lens grows 200 → 632 m (0.0–0.8 s) over the bay; the 6 m beam walks up the pier: planks flash into flame in a racing line; two moored boats ignite; where it crosses water the sea boils in a crisp white hissing jet | C4 14.0–17.4 "Wood catches *instantly.*" | BEAM POWER / 31 → 314 MW / LENS 630 M · BOILS 121 KG OF SEA/S |
| 5 | s05_town | 135 | 18.0–22.5 | bay town from the hillside | crane up and back from s04 (continuous), 28 mm, hero small bottom-left of centre | lens grows to 2 km (0.0–0.8 s) and fills the sky; the 19 m beam sweeps across the town: roofs catch one after another (a burning swath), then a boiling white wake across the bay | C5 18.4–21.8 "3 billion watts. \| One *burning line.*" | BEAM POWER / 314 MW → 3.1 GW / LENS 2 KM · BOILS 1.2 T OF SEA/S |
| 6 | s06_clouds | 135 | 22.5–27.0 | cloud deck from above, 8 km (API R3) | **hard cut on hit 2**; 35 mm, an airliner in the foreground | lens grows to 6.3 km (0.0–0.8 s), hanging above the deck below us; the 59 m beam slices the deck: clouds vanish along a clean cut, the ground glowing through the slot; the airliner banks hard away | C6 22.8–26.2 "It cuts the clouds *open.*" | BEAM POWER / 3.1 → 31 GW / LENS 6.3 KM · ABOVE THE CLOUDS |
| 7 | s07_strato | 135 | 27.0–31.5 | high altitude, curved horizon, deep blue | continuous climb from s06, 24 mm, 30 → 70 km | lens grows twice (20 km at 0.0, 63 km at 2.2): its shadow darkens a region; the cloud cut widens into a long burning scar across coast and land | C7 27.4–31.0 "Bigger lens. Same 3,500 °C. \| *Wider burn.*" | BEAM POWER / 31 GW → 3.1 TW / LENS 20 → 63 KM · SPOT STILL 3,500 °C |
| 8 | s08_orbit | 165 | 31.5–37.0 | Earth from orbit, day side (API R4) | **hard cut on hit 3**; 50 → 70 mm, slow pull-back past the lens rim | lens grows to 200 km (0.0–0.8 s), glinting; its round shadow on the clouds converges to one blinding dot; a dark scorched line runs across a continent, a cloud slot traces it; 36.5–37.0 the dot burns on in near silence | C8 31.8–36.2 "More power than all \| *humanity uses.*" | BEAM POWER / 3.1 → 31 TW / LENS 200 KM · 1.6× ALL HUMAN POWER USE (no counter 36.5–37.0) |
| 9 | s09_loop | 30 | 37.0–38.0 | the plaza = frame 1 | **hard cut on hit 4** to `FRAME1_CAM` | the plaza exactly as frame 1 (C = 10 suns, the wide disc), the world alive (fountain, crowd, traffic at page t 3.0 → 4.0); TikTok restarts on frame 1 | none (silence) | SPOT TEMP / 375 °C / LENS 20 M · 0.31 MW |

- **Escalation:** car roof → a row of cars → a glass tower → pier and boats → a town → the cloud deck → a region → a
  continent from orbit. Something ignites, melts or boils at least every ~1.5 s.
- **Transitions:** whip-pan (4.5) → tilt-up (9.0) → hard cut, hit 1 (13.5) → crane (18.0) → hard cut, hit 2 (22.5) →
  climb (27.0) → hard cut, hit 3 (31.5) → hard cut, hit 4, loop (37.0).
- **Frame-1 match:** s01 frame 0 vs s09 last frame differ only by 1/30 s of world motion (counter 375 °C on both).

## Sound (no voiceover; `score.json` + each shot's `_sound.js`)
- **Score:** no ticks. Exactly 4 hits (low impacts + a soft crack for the cut onset) at 13.5 / 22.5 / 31.5 (+ braaam −6 dB) /
  37.0 (soft). Riser 1 9.0→13.5, riser 2 22.5→31.5. True silence 36.55–36.97; 37.0–38.0 plaza room tone only.
- **Shot sound:** a low beam hum (60–120 Hz) from frame 1; a rising sizzle as the spot tightens (low-passed at 4 kHz);
  crackle, paint pops, a soft whump when the roof catches (3.0); a **lens-grow swell** (low, 0.8 s) at every grow; car-by-car
  ignition whumps (irregular); glass groans and sparse cracking, drips hissing; gulls, the pier going up, the sea's hard hiss;
  hillside wind, distant roofs; altitude wind, the airliner spooling up; the hum drops an octave at each strato grow; space:
  one low tone. Nothing repeating above ~3 kHz.

## Deviations from the brief (lead, 2026-11-12)
1. **s08 runs to 37.0 and s09 is the plaza only (1.0 s).** The brief's s09 "orbit 0.5 s" is continuous with s08 (no cut
   at 36.5), so it is s08's tail. Shot boundaries now sit only on real cuts. Frames: s08 165, s09 30 (total still 1,140).
2. **The lens hangs at f = D along the sunline, not straight up.** Height above the spot = 0.91·D (sun 65° high).
3. **Frame-1 camera is 5.5 m up, not "low".** At eye height the paving is seen at ~2°: the focusing disc is ~3 px tall and
   unreadable (kit check). 5.5 m shows the disc, the lens shadow and the burn line; the hero stays ~60 px, bottom-left.
4. **The lens is a magnifying glass with a handle** (dark rim + black handle). It reads "giant magnifying glass" muted,
   which is Gate 0's test, and its shadow (glass + handle) is drawn on the ground around the spot.
5. **Lens shadow is analytic** (`createLensShadow`): shadow maps don't show on our renders (also true in friction-vanishes).
6. **s09 samples = 8** (s01's), so the loop frames match.
7. **Title band:** default (not the stronger band), so the lens under the title's lower edge stays readable.
8. **s04/s05 look UP-SUN (+Z), not from the beach/hillside (Builders, phase 2).** The lens hangs 0.91·D up and 0.41·D
   sunward of its spot, so no −Z camera holds the lens and its spot together. s04: from the water off the pier end, 12 m up,
   20 mm, the pier as the leading line. s05: a drone 70 m over the lagoon, 28 mm, across the bay at the town; no hero.
9. **s01's car** is `A_CAR` (24.7, 0, −8), yaw π/2 (groupA_frame1.js), so the lens never turns edge-on over the camera.
10. **Visual widths DRAMATIZED** so they read at distance: the s07 cloud slot/char and the s08 char swath (7 km) and cloud
    slot (40 km) are wider than the true spot. Every number on screen is still the law's.
