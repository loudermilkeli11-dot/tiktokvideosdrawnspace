# earth-stops: hand-over (phase 3, lead Director, 2026-11-12)

"What if the Earth *stopped spinning* for 5 seconds?": 9 shots, 65.0 s (1,950 frames, 30 fps), render-ready.
Board: `script.md`. Law: `src/story.js` (381 m/s at 35°N, 1,372 km/h, shown 12× slower, 5.000 s at film 61.0).
Builder hand-overs: `FINAL/groupA.txt`, `groupB.txt`, `groupC.txt` (detail per shot, sync constants, bent rules).

## Places (the Commander's note: fewer places)
plaza (s01–s04, 29 s, all from or next to the one hero balcony) → bay (s05–s06, one terrace) → orbit (s07–s08) → plaza (s09 = frame 1, loop).
s02 is at street level on the plaza's north edge: the same block, not a new place.

## Phase 3 changes
- **Kit sky** (`kit.js SKY.hor` 0xd8dccf → 0xc9d6dc = group A's plazaLook): the sky now matches across the 15.0/22.0 soft cuts
  (s03/s04 had the old grey-cream horizon) and the bay is a touch bluer. Changes s03, s04, s05, s06 (re-render them).
- **Restart spin** (`kit.js RESTART_SPIN` 0.04 rad/film-s after 61.0; the frozen yaw is unchanged, so s07 is untouched): the
  planet now visibly turns again in s08 (Baja moves ~25 px at half size between 8.9 and 11.45). DRAMATIZATION of rate.
- **PHYSICS FIX (C7):** "Every east-facing coast" → **"Every west coast | *gets hit.*"**. The sea keeps moving east, so it slams
  into coasts whose land lies EAST of the water (continents' west coasts: California, the Americas' Pacific shore); east coasts
  drain. s07/s08 were built that way; script.md and the story.js comment now say so.
- Not folded (optional requests, no visible gain worth re-rendering shared code): group A's dust/chips into the kit, the kit's
  off-screen crowd/fountain loop skip, story.js `floorRelease` delay (groupB_towers wraps it: SHEAR_E0 = 1.18 e), plazaShear in s02.

## Consistency pass (GPU, half size; frames in out/p3/, sheets `sheet_cuts1/2.png`, `sheet_mid.png`, `sheet_type.png`)
- 8.0 s01→s02: both under the same amber dust grade, debris exiting right / entering left. OK.
- 15.0 s02→s03: s02 ends tilted up into blue sky, s03 opens high on facades. OK.
- 22.0 s03→s04: same balcony vantage, same sheared stubs (shared plazaShear). OK.
- 29.0 / 43.5 / 52.0 hard cuts: hits in the score. 36.5 s05→s06: same terrace, same light, longer lens. OK.
- 63.5 s09→s01: s09 last frame + 1/30 = s01 frame 0 (group A checked side by side; my s09 1.45 matches s01 0.00).
- Overlay: `check.py --safe` OK (0 frames outside). No `band` on any item.
- Look vs `sheet_sun_exploded_lunar.jpg`: same family (flat low-poly, rail foreground, warm grade that thickens with the story,
  the event filling the frame in s03/s04/s06/s08).

## Known weak spots
- **The DRAMATIZATION tag still draws a dark radial blob** (ov.html v2Tag ignores `band`). See NEEDS APPROVAL.
- Skies are flat (no clouds, no visible sun, no birds after the stop); the hits have a sun disc and clouds.
- Caption contrast without bands is weakest over s04's debris river and over s06's pale town ("over the town" in accent
  gold on beige). Run `check.py --contrast` in QC; if it fails, darken the accent or lower the caption, not a band.
- s08: the right limb carries a brown sunset band at the terminator; at phone size it can read as an offset disc. Space black is
  slightly brown (POST_ORBIT lift).
- s03: the "towers" are city.js mid-rises; the shearing floors read as a stepped deck. s04: tumbling cars are dark smears.
- s05/s06: the wall is slightly glossy next to the matte town; the over-land face is in shadow (sun from the west).
- s07 at ~900 km (not 400 km: texture resolution). Surge width and cloud drag are illustrative (DRAMATIZATION, said in story.js).
- Tower shear starts at e 1.18, not the law's 0.02 (illustrative destruction pattern, covered by the DRAMATIZATION line).
- Sound: group B's groans are synthetic sawtooth glides; shot sound not yet mixed against score.json's risers (QC will hear it).

## Rules bent (and why)
- 65 s instead of 38 s, 3 places instead of 8: the Commander's build note (60–70 s, plaza → bay → orbit → plaza).
- See each group's hand-over for camera and framing deviations.

## NEEDS APPROVAL
- Edit `tools/overlay/ov.html` line 440 to honour the tag's own band:
  `const B = v2B(V2.tagBand, tg.band); if (B.a > 0) v2BandAt(...)` (default unchanged for every other project). overlay.js
  already passes `band: 0` on the tag, so the blob disappears with no change here. LOOK rule 9: no blobs behind text.
