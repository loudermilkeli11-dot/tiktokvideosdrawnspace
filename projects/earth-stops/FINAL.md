# earth-stops v2 edit (Director, 2026-11-12, Commander's critique)

Still 65.0 s / 1,950 frames; law, clock, sideways-only motion, sound plan and loop unchanged. 8 shots now.
- **Tag removed:** overlay `tags: []`. Put "shown 12× slower; the lamp-post hold is dramatized" in the POST caption.
- **Plaza (s01 + s09, via groupA_plaza → new `src/plazaLife.js`):** ~110 more full-colour people in the near plaza (chat groups, walkers),
  10 laughing/goofing people facing the lens (new poses `laugh`, `cheer`, page-local), a golden dog, a hot-dog cart + vendor,
  ~40 hats that fly off at the stop, a lamp post where a man in a red top clings, body out east like a flag (1.0–4.8 s),
  then lets go and is swept away (cartoon DRAMATIZATION, no impacts). Shove: jolt 0.15 → 0.3 s, shake 0.9 → 1.7; upwind debris 3200 → 4800.
  s09 still uses the same set, so its last frame matches s01 frame 0 (checked).
- **Towers (s03, and s04 for consistency):** no layered floor slabs. New `src/towersBreak.js`: glass bursting off in waves down
  each facade, cladding panels, ripped signs, roof AC units, tanks and the crane tumbling east. Towers stand.
- **s07_coast cut** (fuzzy close view); its 255 frames go to s08 (now 600 fr, 43.5–63.5), which opens wider (19,000 km, 45 mm)
  so it is sharp all the way. Captions re-timed; score: braaam + hit at 43.5, riser 2 now 37.5→43.38, 52.0 cut removed.
  s08 sound offsets shifted (restore swell at shot 17.5 = film 61.0).
- story.js LIST/HITS changed, so every page's bytes changed: all shots re-render (identical output for s02/s05/s06; cheap on the GPU).
- **Weak spots:** the clinger is ~50 design px tall at 24 m; he leaves frame in ~0.4 s after letting go (V = 31.75 m/s film, the law).
  s03 far shards are scaled up ×2 to read. s07 files stay on disk but are not in shots.txt.
- **Rule broken (taste "several locations"):** fewer places, per the Commander's note: plaza → bay → orbit → plaza.

# earth-stops: hand-over (phase 3, lead Director, 2026-11-12)

"What if the Earth *stopped spinning* for 5 seconds?": 9 shots, 65.0 s (1,950 frames, 30 fps), render-ready.
Board: `script.md`. Law: `src/story.js` (381 m/s at 35°N, 1,372 km/h, shown 12× slower, 5.000 s at film 61.0).
Builder hand-overs: `FINAL/groupA.txt`, `groupB.txt`, `groupC.txt` (detail per shot, sync constants, bent rules).

## Places (the Commander's note: fewer places)
plaza (s01–s04, 29 s, all from or next to the one hero balcony) → bay (s05–s06, one terrace) → orbit (s07–s08) → plaza (s09 = frame 1, loop).
s02 is at street level on the plaza's north edge: the same block, not a new place.

## QC fix round (2026-11-12 evening): RESULT PASS
- **White flash at 63.5 (FAIL → OK):** s09 cut from black space (luma 0.23) straight to the bright plaza (0.66). s09 now
  opens from near-black and eases up over 0.4 s (`post.p.fade`, 0.85 → 0); measured 0.28 → 0.68, about 0.05 per frame.
  Fade = 0 from 0.4 s on, so the last frame still equals s01 frame 0 (loop diff 0.005, unchanged).
- **Cut hits (5 weak onsets → all +12 to +30 dB):** a ~0.1 s suck-out (true silence) before each cut + firmer cracks
  (−9 dB) at 29.0/43.5/52.0; 8.0 and 15.0 (check.py reads them as hard cuts) got a low thud + crack. Risers end at the gap.
- Verified by a real partial run: `render_all.js --quality max --shots s09_loop --reuse` → `check.py`: **RESULT PASS**
  (flash 0, 6/6 cuts on hits, −14.1 LUFS, 93.35 MB, safe area OK). out/final.mp4 is that PASS build.
- **Still WARN: text contrast (129/130 frames < 3:1).** Not fixable without bands from this project: A4 measures glyphs
  against the 90th-percentile pixel 1.5–6 design px around them, so white type needs that ring at L ≤ 0.30 and the
  amber accent at L ≤ 0.165 (a dark navy). Over a daylight plaza that is only reachable with a band (LOOK rule 9 forbids it),
  a baked dark blob in the picture (same thing), or a stronger glyph halo in tools/overlay/ov.html (outside my write area).
  Phone read: the type is legible on the contact sheets (soft shadow, LOOK rule 9 style) but thin over the pale bay.
  See NEEDS APPROVAL.

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

## QC fix round (2026-11-12, after render_all FAIL)
- **White flash at 63.5 (FAIL → fixed):** s08 ends in black space (luma 0.23), s09 cut straight to the plaza (0.66).
  s09 now opens with `post.fade` 0.85 → 0 over 0.4 s (smoothstep): first frame 0.28, max +0.05 per frame. From tt 0.4 the fade
  is 0, so s09's last frame still equals s01 frame 0 (loop diff 0.005, unchanged). Only s09 was re-rendered.
- **Cut hits (weak onset on 5 of 6 cuts → fixed):** check.py also reads 8.0 and 15.0 as hard cuts, and the risers and roar
  masked every cut. `score.json`: a 0.10–0.12 s suck-out (true silence) right before each cut, firmer mid cracks (-9 to -12 dB),
  low thuds at 8.0/15.0, risers end at the suck-out. Onsets now +12.4 / +14.8 / +15.7 / +15.9 / +14.3 / +29.5 dB.
- **QC re-run on the reassembled final (s09 + score re-rendered, the other 8 shots reused): RESULT PASS.** 0 flash frames,
  -14.1 LUFS, 93.35 MB, safe area OK.
- **Text contrast is still a WARN (129 of 130 sampled frames below 3:1).** This can't be fixed from the project without breaking
  LOOK rule 9. check.py measures each glyph against the 90th-percentile pixel 1.5–6 design px around it, so white text needs the
  background darker than linear L 0.30 there, and the amber accent needs it darker than 0.165. Over a daylight plaza, a pale town or
  white surf, only a band or a heavy outline gets there. ov.html's v2 halos (`tight` [0,2.5,0.6], `emHalo` [0,7,0.75]) are
  hard-coded in tools/ (outside my write scope), and darkening the picture under the text would be a band baked into the frame.
  See NEEDS APPROVAL.

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
- Text contrast without bands, pick one:
  (a) accept the A4 WARN for v2-no-band films (the hits' plain shadowed text would fail it too); or
  (b) let a spec set `style: { halo: [offY, blur, opacity] }` in ov.html to override `V2.tight`, e.g. [0, 6, 0.9]. That gives a
  stronger soft halo with no box, and earth-stops would opt in. It raises contrast but may still not reach 3:1 over the brightest
  sky. A lower accent luminance (#E89A2E) would help the accent words.
- Text contrast (choose one): (a) accept the A4 WARN for this film (QC PASSES; LOOK's soft-shadow type, as the hits
  use); or (b) approve an opt-in `style.halo` in `tools/overlay/ov.html` (e.g. `V2.tight` → `[0, 3, 0.9]` plus a 1 design px
  dark stroke under glyphs, no box) and I set it in overlay.js. (b) reads as outlined TikTok type, not the LOOK serif.
  Recommendation: (a) now, and test (b) on the next film.
