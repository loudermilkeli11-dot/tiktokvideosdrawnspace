# no-empty-space: FINAL hand-over (Director, phase 3, 2026-11-13)

"What if atoms had no empty space?" 12 shots, 70.0 s (2100 frames), one hero harbour town ("Porto") squeezed rung by rung:
phone → coffee cup → car → ferry → 381 m tower → mountain → Earth (a 367 m ball) → the Moon doesn't notice → loop.
Law: `src/story.js` (nuclear density 2.3e17 kg/m³; d = (6m/πρ)^⅓; fall ½gt²). Every on-screen number is read from it.
Hand-overs from the Builders: `FINAL/groupA.txt`, `groupB.txt`, `groupC.txt`, `fixBC.txt`, and the Commander's review `FINAL/commander_review.txt` (items 1–10 fixed).

## Phase 3 changes (what I fixed)
- **Ferry berth (shared, `harbour.js`):** `FERRY.x` 84 → 64.2. The hull was inside the east promenade and houses; it's now moored at the quay wall in s01–s04, matching s05.
- **Continuity:** s06 and s07 now build the world with `ferry: false` (she was squeezed in s05 and was still standing in the tower shots' set).
- **s07_drop, re-staged:** the camera is now 60 m above the sea at 36 mm, not 2.6 m on a boat at 50 mm. From sea level the headland was a flat orange wall with a zig-zag waterline for the first second, and the cave-in read as orange blobs. The new view shows the plateau, the star of fissures, the wedge slumping and the sea pouring into the notch, all at y 340–520. The tourists' boat moved to 150 m (low in frame, clear of the caption).
- **s10_speck:** the end framing centres the tower and the ball as a pair, and the closing pan is 3° (it was 6°). The glowing ball was cut off by the right edge, under TikTok's button rail.
- **overlay.js:** the s06 caption ("A 381 m tower implodes to 1.4 mm.") moved to the top of the frame (y 130). At y 590 it sat right on the tower's crush, the set piece.
- No kit/story/score timing changed: score.json still matches every cut and every squeeze completion.

## Consistency pass (key frames on the GPU, half size, `out/p3/`)
- Cuts checked: s01→s02 napkin wipe; s02 crane to the street → s03; s03 ends on the hole at (270, 540) = s04 frame 0; s04 whip → s05 whip landing; s05 → s06 hard cut; s06 → s07; s07 → s08 hard cut; s08's last frame = s09 frame 0 (exact); s09 point at (300, 300) = s10 frame 0; s10 → s11; s12's last frame = s01 frame 0 (the loop; identical by eye).
- Look: one stylised low-poly family, golden light and haze in the town shots, crisp space shots, full-colour people in every town shot. Gags are framed at a quarter of the frame height or more: the woman in s01, the old man in s02, the hero in s03 (~36%), the gelato seller in s08 (~55%).

## Known weak spots (honest)
1. **Text contrast WARN (A4), as on earth-stops.** With no bands (LOOK.md), the gold accent words fall below 3:1 over the warm town and the pale skies: s02's "99.9999999999996%" sits over the old man's mustard/orange body. The v2 look's shadow strength lives in `tools/overlay/ov.html`, which this project can't change. White type reads in every composite I checked (`out/p3/comp1.png`). The s09 counter sits over the Earth's limb from 52.0 to 54.5 s.
2. **s06:** the tower's crush reads as a buckling, waist-folding column that lifts off its base for ~0.3 s; the aftermath is calm (a thin dust ring and chunks falling into the harbour).
3. **s07:** the cliffs are big flat facets, and the cracks read as V-gorges rather than thin cracks. The cause (the grain falling inside the rock) is invisible by physics; the caption carries it.
4. **People up close** (s02, s04, s08) show the SDF look: faceless heads, jagged hair edges. The walks are pose swaps. s04's dog is boxy next to the rounded people.
5. **Kit pose head-pitch sign:** in figure.js, head[1] > 0 looks down, so the kit poses lookHand, patPockets, lookUnder, kneel and pour look the wrong way. Group A uses corrected local copies. I didn't change the kit (every shot would change after its review); fix it in the kit for the next video.
6. **Render time:** s03 and s08 run 2–3 s per frame inside their 8–12-sample windows. The first orbit frame of s09 pays ~11 s of shader compile.

## NEEDS APPROVAL
- Nothing blocking. Optional: a stronger soft no-box halo option in `tools/overlay/ov.html` (outside my write area) would lift the A4 contrast numbers on every no-band film.

## Post (POST.json)
The liberty is in the caption only: each squeeze is shown over 0.25–3 s (it's physically instant) and its energy is ignored. There is no on-screen tag.
