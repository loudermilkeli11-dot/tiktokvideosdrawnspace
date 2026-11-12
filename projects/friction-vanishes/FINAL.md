# friction-vanishes: hand-over (Director, phase 3), 2026-11-12

"What if friction vanished for 5 seconds?" 9 pages, 1,140 frames, 38.0 s. Board: `script.md`. Law: `src/story.js`.
Builder hand-overs: `FINAL/groupA.txt`, `FINAL/groupB.txt`, `FINAL/groupC.txt`.

## What was built
| shot | film | builder | state |
|---|---|---|---|
| s01_crossing | 0.0–4.0 | A | frame 1 moving: braking red car doesn't slow, taxi pirouettes straight, walkers slip, tables drift; whip-pan out |
| s02_grip | 4.0–8.5 | A + **lead fix** | slide toward the lens, grip returns at 5.0: skids, rollovers, bus on its side, hazards |
| s03_minute | 8.5–13.0 | B | match cut to the street top; the whole street slides away; side-street T-bone keeps spinning; whip down |
| s04_quay | 13.0–17.5 | B | the street disgorges off the quay into the harbour at 116 → 126 km/h; dark muddy spray wipe |
| s05_town | 17.5–22.0 | B | the bay town drains into the sea; beach slumps; churned brown shallows |
| s06_hills | 22.0–26.5 | C | the hillside flows (N3): turf tears, soil streams, houses and trees ride it, sediment fans into the bay |
| s07_after | 26.5–30.5 | C | aftermath: bay filled with a glossy mud flat, stranded cars/boats, stripped headlands; tilts up to sky |
| s08_orbit | 30.5–37.0 | C | day-side Earth, brown plumes on every coast, smeared deserts; silent 36–37 |
| s09_loop | 37.0–38.0 | A | normal world, the red car arrives and starts braking → frame 1 (diff checked by A: identical except 1/30 s) |

## Phase 3 changes (lead)
1. **s02_grip camera (Gate F2, the hill read).** The Builder flagged the on-axis view as reading flat, and I agreed: it looked like a level street.
   The whip now lands on a 40 mm oblique from the quay road's right lane (the left facade's level window rows against the
   street climbing away from the flat quay = the hill). From 0.85 s it swings onto the axis over 1.3 s, arriving as the grip bites
   and the cars roll and the bus tips (1.1–2.3 s). The 2.2–4.5 s framing and the 8.5 match cut are unchanged (t4.47 checked).
   Key frames (GPU, full size): `out/frames_s02_lead/s02_grip_t0.80.png` (hill), `t2.00.png` (crash), `t4.47.png` (match).
   Debug params left in (harmless): `?cx ?cz ?cy ?yo ?po ?mm ?h0 ?hd`.
2. **score.json:** the water impact moved 15.7 → **16.33**: the bus from the 400 m mark hits the harbour there, the same instant as the
   s04 shot slam (Builder B's request). No other score change. Still no ticks and no cracks. Hits stay at 5.0 / 22.0 / 37.0.
3. **script.md:** deviations recorded (A_CAM frame-1 camera, s02 camera, s05 west-headland view, s05 staged release as DRAMATIZATION, the 16.33 slam).
4. **Not changed:** `story.js`, `kit.js` (content identical to the phase 1 commit), `overlay.js` (captions still match the picture at every anchor).
   I did NOT copy A_CAM into the kit's FRAME1_CAM: crossingWorld uses FRAME1_CAM for the crowd/tree keep-out near the lens, so
   changing it would reshuffle the verified s01/s09 crowd.

## Consistency pass (GPU key frames, every cut)
- 4.0 whip s01 → s02: both sides motion-blurred left; s02 lands brighter in the lower half (pavement). Low risk of a flash flag; check.py will confirm.
- 8.5 match cut: s02 t4.47 and s03 t0.00 have the street centre line vertical at x 270 and the same lane markings. OK.
- 13.0 whip down → s04 settle (−40° pitch on both sides). OK per B.
- 17.5 dark spray wipe: s04 ends dark brown, s05 opens dark and ramps up over about 10 frames (luma goes down at the cut, then up slowly).
- 22.0 hard cut on the hit: s05 (the town still sliding) → s06 (normal green hillside). The hit carries it.
- 26.5 cut on the crane move: s06 (brown flowing face, rising) → s07 (the aerial mud flat). Same palette and heading.
- 30.5: s07 all sky → s08 limb in the lower 40 %, black above (luma drops).
- 37.0 → loop: s09 last frame matches s01 frame 0 (Builder A diff).
- Look: noon daylight and full colour on every ground shot, ACES + grain (POST_DAY), no smoke anywhere, dark rubber skid marks, spray as droplets/sheets.
- Overlay: `check.py --safe overlay.mov` → 0 frames outside the safe area.

## Known weak spots
- s02: in the oblique section the nearest two cars run to the right edge (partly under TikTok's right-hand buttons for ~0.8 s), and the blue car touches the counter block. The hill read is a perspective cue, clear but not dramatic. City cars are boxy (black-glass cabins).
- s01: the red car is mid-distance (about 55 design px wide); the hook relies on brake glow, the red light and motion. Whip ghosts are visible in stills at 12 samples (fine at max quality, 16).
- s03: the T-bone is about 60 m away (small). s04: floating cars pile at the left as blocks; the first 0.4 s of the wipe looks like a brown starburst.
- s05: still moving at the 22.0 cut (grip returns on the cut); splashes are small at 300–900 m; mild saw-tooth on the waterline at the bottom right; churn is olive more than brown.
- s06: plain box houses, low-poly trees, coarse face mesh; the flow read depends on motion (confirm on the moving render).
- s07: mud texture soft from 255 m; cars are 3–6 px specks; "town on bare rock" headlands.
- s08: coast plumes are soft blobs; the region is recognisable real geography (Mediterranean). No names on screen.
- Sound: check.py's "mid-range hit on every cut" rule will WARN on the 4.0/8.5/13.0/17.5/26.5/30.5 cuts. That is by design (brief §5: no cracks), not a defect.

## Render notes (for the War Room)
- **s02_grip must be re-rendered.** The 09:33 CST max render in `out/` predates the camera fix (09:37). `.\pc\render_project.ps1 friction-vanishes -Shots s02_grip`
  redoes only s02 and assembles with the existing s01, s03–s09 mp4s.
- A full `--reuse` run would re-render s03–s08 too: its freshness rule treats every non-shot `.js` in `src/` as shared, and
  `groupA_hill.js` (Builder A, 09:32, used only by s02) and `kit.js` (a no-op edit by me, 09:38, content identical) are newer than those renders.
  The pictures would come out the same, so `-Shots s02_grip` saves that time. score.json changed, so the score/assemble steps must run again (render_all does this).
- Listen test (brief §7) and the contrast check (`--contrast overlay.mov --bg clean.mp4 --every 0.2`) happen in QC after assembly.

## NEEDS APPROVAL
- Nothing blocking. Commander's call: accept s02's oblique-to-axis move as the Gate F2 fix (frames listed above).
