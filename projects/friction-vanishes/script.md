# friction-vanishes: "What if friction vanished for 5 seconds?" (video #4, board v1)

From `PRODUCTION.md` (approved 2026-11-12). Ladder **5 s → 1 min → 10 min**; each step starts from the normal world and ends when grip returns.
The tsunami critiques are hard rules: every beat holds ≥ 4 s (except the 1 s loop tail), no time-lapse inside a shot, **no ticks, no cracks**,
hits only at 5.0 / 22.0 / 37.0, every shot is one cause → effect, and there is an aftermath beat (s07) before space.

## Format (Studio v2)
- 38.0 s = 1,140 frames at 30 fps, 1080×1920. Daylight first. Type: v2 look (title / counter / captions), `DRAMATIZATION · FRICTION OFF` tag throughout.
- Sound: no voiceover; shot sound + `score.json` (no ticks). Silence 36.0–37.0, soft thud on the loop cut.

## The law (`src/story.js`): Coulomb friction → μ = 0 for T, air drag stays
- Slope θ = 10°: a = g sin θ − (k/m) v², k = ½ρC_dA = 0.404 kg/m (car 1,500 kg, C_d 0.30, A 2.2 m²).
  v = v_t tanh(t/τ_c), x = v_t τ_c ln cosh(t/τ_c), v_t = 79.5 m/s (286 km/h), τ_c = 46.7 s.
- Flat: v = v₀ / (1 + v₀ (k/m) t). Grip back (μ 0.7): downhill skid 5.06 m/s², flat 6.87 m/s².
- No friction = no turning: a turning car keeps its velocity AND its yaw rate (it pirouettes in a straight line).
- **DRAMATIZATION (the one liberty):** only solid–solid and grain friction switch off, instantly; buildings, bolts, knots and clothes hold;
  the hill town, its 400 m street to the quay and the hillside flow speed (9 m/s top, `flowX`) are staged.

| on screen | from the law | value |
|---|---|---|
| normal stop from 50 km/h | v²/(2μg) | **14 m** |
| braking car after 5 s, no friction | coastV(13.89, 5) | 49 km/h, 69 m on |
| hill car after 5 s | slopeV(5), slopeX(5) | **31 km/h, 21 m** |
| skid when grip returns | 8.48 / 5.06 | 1.7 s, 7 m |
| 1 min, τ 4.5 / τ 20 | slopeV | 28 / 116 km/h |
| reaches the street's foot (400 m) | slopeTimeTo(400) | **126 km/h at τ 22.0 s** (film 15.0); off the quay edge at τ 22.7 (film 15.7) |
| steepest slope that holds | arctan μ: sand 34° → 0 | **34° → 0°** |

## Shots (film s; τ = story s since friction vanished on that step)
| # | shot | film | step / τ | set (kit) | camera | picture: one cause → effect | caption | counter |
|---|---|---|---|---|---|---|---|---|
| 1 | s01_crossing | 0.0–4.0 | 5 s / 0→4 | `crossingWorld` | `FRAME1_CAM` 35 mm, locked; whip-pan out at the end | frame 1 MOVING: the red car at 50 km/h, brake lights on, does not slow; slides through the red light and the empty junction. A car caught mid-turn goes dead straight AND keeps spinning, into the plaza. Walkers keep gliding, feet go, they sit down hard. Café tables drift. | T 0–2.9 What if friction *vanished* / for 5 seconds? · C1 2.9 Brakes do *nothing.* | FRICTION BACK IN 05.000 → 01.000 · CAR AT 50 KM/H · NORMAL STOP 14 M |
| 2 | s02_grip | 4.0–8.5 | 5 s / 4→8.5 | `hillWorld` bottom | 50 mm on the flat quay road looking up the street; whip in | parked cars, a bus, bins, tables slide down toward camera together; **5.0 grip returns**: skids (1.7 s), sideways cars trip and roll, the bus tips over, tables cartwheel; alarms | C2 5.7 Then the grip / *comes back.* | FRICTION BACK IN 01.000 → 0, then SLID IN 5 S / 21 M / HILL CARS HIT 31 KM/H IN 5 S |
| 3 | s03_minute | 8.5–13.0 | 1 min / 0→4.5 | `hillWorld` top | 24 mm high above `HILL_TOP` looking down to the harbour; whip down at the end | match cut; everything starts sliding away downhill as one mass; side-street cars slide in, collide and keep spinning | C3 8.5 Now make it / *one minute.* · C4 11.5 Every street becomes / a *slide.* | SLIDING · 1:00 · SPEED 0 → 28 KM/H · NOTHING CAN BRAKE |
| 4 | s04_quay | 13.0–17.5 | 1 min / 20→24.5 | `hillWorld` quay | 28 mm low, side-on from a moored boat at the quay edge | cars, a bus, bins, tables arrive at 116 → 126 km/h, cross the quay road, fly off the edge (ballistic, `launch`) into the harbour; heavy spray; ends in a dark spray wipe | C5 14.3 Into the harbour / at *126 km/h.* | QUAY SPEED 116 → 126 KM/H · 400 M OF 10° STREET IN 22 S |
| 5 | s05_town | 17.5–22.0 | 1 min / 55.5→60 | `bayWorld` + `looseCity` | 50 mm from the lighthouse headland across the bay, slow push | every street pours cars and debris over the promenade into the bay; beach sand slumps into the water; trailer boats slide in. 22.0 grip returns: everything stops | C6 17.5 The whole town / *slides into the sea.* | FRICTION BACK IN 00:04.5 → 00:00.0 · EVERY STREET ENDS IN THE SEA |
| 6 | s06_hills | 22.0–26.5 | 10 min / 0→4.5 | `bayWorld` | 35 mm from the water looking up the hillside; slow crane up | the ground itself flows: soil and scree pour down the hills, trees riding, houses carried intact, fanning brown into the bay | C7 22.0 Now make it / *ten minutes.* · C8 24.8 Now the *hills* flow. | SLOPE THAT HOLDS 34° → 0° (22.0–23.0) · DRY SAND, WITH FRICTION: 34° |
| 7 | s07_after | 26.5–30.5 | 10 min / 600 (grip back) | `bayWorld` (N3 end state) | 24 mm high aerial, continuing s06's crane; tilts up to the sky at the end | aftermath: the bay filled brown to the brim, cars and boats stranded on a new mud flat, hills stripped to grey rock, empty streets, still water | C9 27.6 The bay is *full.* | FRICTION BACK AFTER 10:00 · THE HILLS SLID INTO THE BAY |
| 8 | s08_orbit | 30.5–37.0 | 10 min | `dirLL`/`aimFor` + space.js | 70 mm, slow push-in on the day side | every coastline bleeds brown sediment plumes; desert dunes smeared flat | C10 30.5 Every coast / *turns brown.* · C11 33.6 All from one / *missing* force. | STEEPEST SLOPE THAT HELD 0° · FOR 10 MINUTES, EVERYWHERE |
| 9 | s09_loop | 37.0–38.0 | 5 s / −1→0 | `crossingWorld` | `FRAME1_CAM` | the normal world: the red car at 50 km/h, the light turns red, brake lights on, squeal starting → frame 1 | none | FRICTION BACK IN 05.000 (frozen) |

## Transitions
4.0 whip-pan (s01 → s02) · 5.0 grip returns in-shot (the big hit) · 8.5 match cut bottom → top on a low whoosh · 13.0 whip down the street ·
17.5 dark spray wipe · **22.0 hard cut on the hit** · 26.5 cut on the crane move · 30.5 push up through the sky to orbit · **37.0 hard cut on the hit** to frame 1's world.

## Sound (shot `_sound.js` + `score.json`)
0.0 brake squeal on frame 1, cut dead at 0.25 s → glassy frictionless hiss, room tone, crowd surprise, soft body thumps · 4.0 low whoosh ·
**5.0** tyre-bite crunch + metal crumple + sub (score big hit), skid squeals, a bus on its side, car alarms → glass tinkles, quiet ·
8.5 low whoosh, the hiss returns, riser 1 climbs with the speed · 13.0–17.5 metal rushing on asphalt, heavy water slams (first at 15.7) ·
17.5–22.0 the town draining, riser 2 · **22.0** deep earth groan + low crunch · 22.0–26.5 grinding earth, far tree cracks ·
26.5–30.5 near silence: drips, one distant alarm, gulls · 30.5–36.0 one low swell · 36.0–37.0 silence · **37.0** soft thud, room tone, squeal starting.

## Lead's deviations from PRODUCTION.md (approved scope, noted for the Commander)
- **Hero distance:** ~25 m in front of the camera, not 1.4 m: at 35 mm a person 1.4 m away fills the frame; 25 m gives the ~65 px the brief and the look bar ask for.
- **Quay road:** the 400 m of 10° street ends on a flat 24 m quay road, then the quay edge. A camera on flat ground is what makes the hill read (kit check). The counter's 126 km/h is at the street's foot (τ 22.0); the cars coast the flat road and leave the edge at τ 22.7 (film 15.7) at 126 km/h (drag loss < 0.3%).
- **s06 τ:** step 3 restarts the normal world at the 22.0 cut (τ 0), as every step does; the flow speed is staged (`FLOW_V` 9 m/s).
