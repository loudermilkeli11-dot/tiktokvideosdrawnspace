# earth-stops: "What if the Earth *stopped spinning* for 5 seconds?" (board v1, lead Director, 2026-11-12)

Approved brief: `PRODUCTION.md` (greenlit 2026-11-12 14:33 CT). This board is the brief re-cut to the Commander's build notes
(LOOK.md strictly; fewer places: plaza → bay → orbit → plaza; 60–70 s, calm pace). See **Deviations** at the bottom.
Format: Studio v2 type, **9 shots, 65.0 s = 1,950 frames**, 30 fps. Law: `src/story.js`. Kit: `src/kit.js`.

## The one law (`src/story.js`)
- **The rule.** The ground at latitude φ moves east at v = (2π·6,378.137 km / 86,164.09 s)·cos φ = 465.1·cos φ m/s.
  Our city and bay sit at 35°N: **v = 381.0 m/s = 1,372 km/h** (equator: 1,674 km/h, the cover number).
- When the ground stops, everything loose (air, sea, people, cars, leaves, glass, water) keeps going **east at 381 m/s**
  relative to the ground, carrying **½v² = 72,577 J/kg**; in 5 s it travels **1.9 km**. Mach **1.1** (340.3 m/s);
  **3.4×** the strongest gust ever measured (408 km/h). Attached things (trees, lamps, towers) stay and are stripped.
- **One direction:** east = screen-right in every ground shot (the cameras look north). Nothing moves up or west.
- **Clock:** film t → event e = (t − 1.0)/12, clamped [0, 5]. The stop lands at film 1.0 s; **e = 5.000 at film 61.0 s.**
- **DRAMATIZATION · SHOWN 12× SLOWER:** the ground stops and restarts instantly; the planet doesn't break; Earth's own
  momentum is ignored; the destruction pattern is illustrative.

| shot | energy rung (fact line) | mass | J |
|---|---|---|---|
| s01 | ONE CAR · 109 MJ | 1,500 kg | 1.09e8 |
| s02 | AIR IN THIS STREET · 65 GJ | 30 × 500 × 50 m × 1.2 kg/m³ | 6.5e10 |
| s03 | TOP 10 FLOORS · 1.2 TJ | 10 × 1,600 t | 1.16e12 |
| s04 | AIR OVER THIS PLAZA · 11 TJ | 120 × 120 m × 10,329 kg/m² | 1.08e13 |
| s05 | THE BAY'S WATER · 2.2 PJ | 2 km × 1 km × 15 m × 1,025 | 2.2e15 |
| s06 | AIR OVER THE TOWN · 19 PJ | 5 × 5 km × 10,329 kg/m² | 1.9e16 |
| s07 | ALL THE AIR · 600 YEARS OF HUMAN ENERGY | 5.148e18 kg × 72,106 J/kg (⅔ for latitude) | 3.7e23 |
| s08 | ALL OCEANS · 160,000 YEARS OF HUMAN ENERGY | 1.37e21 kg × 72,106 J/kg | 9.9e25 |
Human energy: 620 EJ/yr. Every rung is bigger than the last (×10 to ×10⁷).

## The board (east = screen-right; e = event seconds since the stop)
| # | shot | frames | film s | e | place / camera | what visibly happens | caption |
|---|---|---|---|---|---|---|---|
| 1 | s01_plaza | 240 | 0.0–8.0 | 0 → 0.583 | **hero vantage**: 2nd-floor balcony over the south street (FRAME1_CAM, 32 mm), rail across the bottom; slow 2 m push from 2.0 s | frame 1: golden afternoon, busy plaza, fountain jetting, the mustard-jacket hero below us. **1.0 s: jolt + boom**: every person, car, bench, umbrella and the fountain's water lurch screen-right together; tree crowns strip to bare wood, trunks lean east; ochre dust sheet lifts; by 5 s the plaza is swept bare except trees, lamps, the basin | T 0.0–3.6 · C1 4.0–7.7 "The ground stops. \| Everything else *keeps going.*" |
| 2 | s02_street | 210 | 8.0–15.0 | 0.583 → 1.167 | street level on the plaza's north edge looking north across the x-street (z −60) at the shopfront row; 35 mm, slow track right | the shock-front river down the street: awnings and signs tear off, shop windows burst outward in glinting sheets, cars from upwind roll through, leaves and paper streaming | C2 8.4–14.6 "1,372 km/h. \| *Faster than sound.*" |
| 3 | s03_towers | 210 | 15.0–22.0 | 1.167 → 1.75 | hero balcony, 70–85 mm on the tall hazed towers behind the plaza (top right of frame 1); slow pan right | the top 10 floors keep moving while the frames below stop: facades peel off in glass ribbons streaming right, roof tanks and a crane topple right; lower floors stand | C3 15.4–21.6 "The tops of towers \| *shear off* sideways." |
| 4 | s04_river | 210 | 22.0–29.0 | 1.75 → 2.333 | hero balcony, 24–28 mm, wider than frame 1; calm drift | the same plaza, transformed: bare, bent trees, an emptied basin, and a dense river of upwind debris (cars, roof panels, signs, glass, paper) flowing left→right through it; the dust sheet thicker, the grade amber | C4 22.4–28.6 "Everything upwind \| is *still coming.*" |
| 5 | s05_bay | 225 | 29.0–36.5 | 2.333 → 2.958 | **HIT 1.** hillside terrace above the bay town (BAY_CAM, railing), looking north over the whole bay to the sea | the whole bay has slid east: the west half drained (seabed, stranded boats, left), the water heaped into a white wall against the east shore (right), the pier and boats carried with it | C5 29.4–36.1 "The whole bay \| *slides east.*" |
| 6 | s06_town | 210 | 36.5–43.5 | 2.958 → 3.542 | same terrace, longer lens (50–70 mm) on the east waterfront | the white wall climbs over the waterfront and races into the east town, roofs and boats carried right; the lighthouse in spray | C6 36.9–43.1 "It climbs right \| *over the town.*" |
| 7 | s07_coast | 255 | 43.5–52.0 | 3.542 → 4.25 | **HIT 2.** Earth from 400 km, day side, an east-facing coast; 50 mm slow drift | a bright white surge line runs the length of the coast and pushes inland; a tan dust veil streaks east across the land; cloud bands drag ragged over the mountains | C7 43.9–51.6 "Every east-facing coast \| *gets hit.*" |
| 8 | s08_earth | 345 | 52.0–63.5 | 4.25 → 5.0 | **HIT 3** + braaam. far orbit, 70 → 35 mm pull-back to the whole disc | white surge bands on every east coast, dust veils over land; **61.0: 5.000 s**, the counter flips to SPIN RESTORED and the planet visibly turns again; true silence 62.85–63.45 | C8a 52.4–59.6 "Every ocean \| *keeps going too.*" · C8b 60.2–63.3 "At 5 seconds, \| it *spins again.*" |
| 9 | s09_loop | 45 | 63.5–65.0 | — | **HIT 4.** FRAME1_CAM, the plaza exactly as frame 1 (s01 world at film −1.5 → −0.033) | crowd walking, fountain on; the title and the 381 m/s counter back on; the last frame + 1/30 s = frame 1 | title (= frame 1) |

**Counter** (x 64, y 384–470, from story.js): 0–1.0 `GROUND SPEED / 381 m/s / EARTH'S SPIN HERE · 35°N` → 1.0–1.6 `0 m/s / THE
GROUND JUST STOPPED` → 1.6–61.0 `STOPPED FOR / 0.000 → 5.000 s` (ms rolling) with the shot's fact line → 61.0–63.5 `SPIN
RESTORED / 5.000 s / GROUND SPEED BACK TO 381 m/s` → s09 = frame 1. Tag: `DRAMATIZATION · SHOWN 12× SLOWER`.
**Transitions:** 8.0 match-cut on the motion (debris exits right, enters left) · 15.0 soft cut, tilt-up match · 22.0 soft
cut, same vantage wider · **29.0 hit 1** · 36.5 soft cut, same terrace, longer lens · **43.5 hit 2** · **52.0 hit 3** · **63.5 hit 4** (loop).
**Sound:** no ticks; the stop boom at 1.0; roaring low wind, rattles, scrapes; risers 22→29 and 43.5→52; braaam 52.0; a soft
low swell at 61.0; true silence 62.85–63.45; s09 = s01's pre-stop room tone. `score.json` has every cut hit.

## Deviations from the brief (and why)
| brief | board | why |
|---|---|---|
| 9 shots, 38.0 s, 8 places (plaza, avenue, towers, bay, town, clouds, coast, Earth) | 9 shots, **65.0 s**, 3 places: the plaza (s01–s04 + s09, 31 s from one balcony vantage), the bay (s05–s06, one terrace), orbit (s07–s08) | The Commander's build note: plaza as hero place, then bay, then orbit, back to the plaza; 60–70 s, calm pace (LOOK rules 1, 8). The brief allowed ×1.7. |
| shown 7× slower, stop at 0.8 s, 5.000 at 35.8 s | **shown 12× slower**, stop at 1.0 s, 5.000 at 61.0 s | The same ONE clock stretched over the longer film. Loose things cross the frame at 31.75 m/s: fast but readable. |
| s06 cloud deck + airliner ("planes feel nothing") | cut | Fewer places (Commander). |
| s02 whip-pan; noon light | soft match-cut on motion; **golden afternoon sun from the west** (screen-left) | LOOK: calm camera, golden light; long shadows point east, the way everything flies. |
| captions/counter `band` over bright picture | **no bands** (`band: 0` everywhere) | LOOK rule 9 + Commander's note. Contrast now rests on the shadowed type; check.py's A4 test will tell (see BUILDERS: keep calm, mid-tone picture behind type). |
| s04 fact "THE BAY'S WATER", s05 "AIR OVER THE TOWN", s06 "ALL AIR IN VIEW 30 EJ" | s04 = AIR OVER THIS PLAZA 11 TJ; bay 2.2 PJ; town 19 PJ; s07/s08 = all air / all oceans | Keeps every rung bigger than the last after the re-order. |
| "ALL THE OCEANS · 160,000 YEARS …" | "ALL OCEANS · …" | The fact line must end left of x 440 (right rail). |
