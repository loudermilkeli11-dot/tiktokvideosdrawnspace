# giant-lens: hand-over (Director, phase 3, 2026-11-12)

"What if a magnifying glass the size of a house looked at a city?" Studio v2, 9 shots, 38.0 s = 1,140 frames.
Board: `script.md` (deviations 1-10 at the bottom). Law: `src/story.js`. Builder notes: `FINAL/*.txt`.

## What was built
| shot | film s | what happens | built by |
|---|---|---|---|
| s01_plaza | 0.0-4.5 | frame 1: lens over the plaza, disc tightens to a white-hot point, burn line to a car, car ablaze; whip right | A |
| s02_street | 4.5-9.0 | lens 20 -> 63 m, a kerbside row of 7 cars ignites, trees flare, people run; tilt up | A |
| s03_tower | 9.0-13.5 | lens 63 -> 200 m, the spot climbs a glass tower: pane melts (1.53 s), shards burst, molten gash | B |
| s04_bay | 13.5-18.0 | hit 1. Lens 632 m, the whole pier burns in a racing line, two boats ignite, the sea boils; crane up | B |
| s05_town | 18.0-22.5 | lens 2 km, roofs across the town catch one by one, then a boiling wake across the bay | B |
| s06_clouds | 22.5-27.0 | hit 2. 8 km up: lens 6.3 km below us cuts a slot in the deck, the ground burning in it; airliner banks away | C |
| s07_strato | 27.0-31.5 | climb 30 -> 70 km, lens grows twice (20, 63 km), its shadow on the deck, the scar runs over coast and land | C |
| s08_orbit | 31.5-37.0 | hit 3 + braaam. Earth from orbit, 200 km lens, one blinding dot, a scorched line across a continent; silence 36.55 | C |
| s09_loop | 37.0-38.0 | hit 4. The plaza exactly as frame 1 | A |

- **Engine (default-off, other projects unchanged):** `engine/src/clouds.js` (cloud cut, ground burn line, lens shadow, land
  in the gaps) and `engine/src/space.js` (great-circle burn line + lens shadow), each documented in its header.
  `engine/src/gl_groupB_probe.mjs` is a dev-only probe, not imported by anything.
- **Shared files:** no kit or law change was needed. The Builders' kit suggestions (lensRig `coreScale` and a no-depth-test
  shadow decal; moving `A_CAR` into the kit) are done locally in the shots, so they were left out to keep the early GPU renders valid.
- **overlay.js / score.json:** unchanged; they still fit. The cuts are on 13.5 / 22.5 / 31.5 / 37.0 exactly as score.json has
  them; C5 and every counter segment already use `band`. `check.py --safe` on the rendered overlay: 0 frames outside the safe area.

## Consistency pass (GPU, 0.1-0.3 s/frame; frames in `out/cuts/`)
- s01 -> s02 whip: both sides blurred plaza/street facades, same sun and glass. OK.
- s02 -> s03 tilt: s02 ends on the lens underside over the street, s03 opens on the lens + tower from below. OK.
- s03 -> s04 hard cut (hit 1): molten gash -> lens over the bay. OK.
- s04 -> s05 crane: both look +Z at the same town, lens upper left, pier burning. The camera jumps from 12 m to 70 m, so it reads as a
  soft cut with matched motion rather than one continuous crane. Accepted.
- s05 -> s06 hard cut (hit 2), s06 -> s07 climb (lens shrinks into the distance as we rise, same deck and sun), s07 -> s08 hard cut (hit 3). OK.
- s09 t 0.97 vs s01 t 0.00: identical to the eye. Loop OK.

## Known weak spots
1. s01: the burning car is small (~80 design px) because the law hangs the 20 m lens 18 m over a spot 66 m out; the crowd scatter is subtle.
2. s02: after the grow the lens leaves the frame (0.9-3.9 s); only its shadow and cone show until the tilt.
3. s04 opens small and far (the growing lens carries the first second); the foreground boat hull is blocky.
4. s05 has no hero (drone view); the town strip sits in the caption band (C5 has `band`).
5. s06/s07: the lens shadow on the deck is a soft blue-grey disc; at 70 km the scar reads as an orange glowing band, not black char.
6. s08: Earth textures are soft in the lower foreground; the lens is ~100 design px; the line sits just under the counter block (y ≈ 515).
7. Runners slide in standing poses (no running pose in figure.js).
8. DRAMATIZATION beyond the stated liberty: the cloud slot and char widths in s07/s08 are drawn wider than the true spot so they read
   from 100+ km. Every on-screen number is still computed from story.js.

## NEEDS APPROVAL
- Nothing blocking. The Commander may want to rule on weak spot 8 (drawn burn width in s07/s08) before posting.
- Render: `.\pc\render_project.ps1 giant-lens` (War Room does it at max quality).
