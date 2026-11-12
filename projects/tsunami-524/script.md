# tsunami-524: "What if a 524 m wave hit town?" (video #3, board v2)

> **Director, 2026-11-11: the build board is `PRODUCTION.md` §3** (9 shots, 915 frames: s05_standup restored, a yellow-raincoat hero, s02 label RUN-UP, cover "IN 1958, WATER RAN 524 M UP AN ALASKA MOUNTAIN"). It overrides this file wherever they differ. Timing lives in `src/story.js` (`SHOT`, `T`).
> **Roof fact changed:** bay.js waterfront roofs average **17 m** (h = 6 + U·14 + U·10, set 1 m in), so the s04 line is **ROOFS 17 M → WAVE 31× TALLER** (`story.js` `ROOF_H`, `ROOF_X`), not 20 m / 26×.

**Status:** board v2 (Analyst's Scroller fixes applied) for the Commander's pick from the War Room (`channel/war-room/2026-11-12-which-pitch-is-best-or-redraw-if-necessary.md`). The build starts only if Studio's wave test is GO (2026-11-12 18:00 UTC = 12:00 CST). On NO-GO the team falls back to the satellite pitch.
**Slug:** `projects/tsunami-524/`. Pitch: `pitches/2026-11-11-pitches-2.md` #1.

## What changed from v1 (Analyst review)
1. **The crack is at 0.0 s** (frame 1 already has the slab moving), not 0.4 s.
2. **The impact lands at 1.5 s** (was 3.0 s). The fuse is 1.5 s, and the counter hits 0 with the splash.
3. **s06 opens on the wall** already standing over the pier (no drawback-then-silence opening).
4. **Cover and C1 say "climbed 524 m"**, never "a 524 m wave hit Alaska" (524 m is a measured runup, Miller, USGS PP 354-C, 1960).
5. **Sources filled in:** average ocean depth is 3,682 m (NOAA, 2010), not 3,688 m.
6. **s05 is merged into s04** (decision below). Total is now 30.5 s.

## Assumptions (one line each)
- **Length is 30.5 s (915 frames at 30 fps).** `channel/BRAIN.md` and the War Room strategy set 30–38 s as the default, so that overrides my brief's 61–70 s. The Analyst's faster hook cost 1.5 s and the s05 merge cost 3.6 s.
- **Layout follows `PLAYBOOK.md` (measured on the Commander's iPhone, 2026-11-12),** not my older brief: type stays in x 60–480 and y 100–765. Title y ≈ 170, counter y 384–470 at x 64, captions centred on y 590, nothing important below y 765.
- **Sets: 2.** The horseshoe bay and town (shots 1–6, 9) and Earth from above (shots 7–8). The cloud deck (`clouds.js`) joins them for shot 6.
- **"Ends in space" and "last frame matches frame 1" both hold.** The video spends its last full beat in orbit (orbit, 27.5–29.5 s). At 29.5 s a hard cut on a hit lands on the exact frame-1 bay (counter frozen at 01.500) and holds 1.0 s. The only difference from frame 1 is the thin dust crack that frame 1 already shows (the held frame is the same pose a heartbeat before it), so TikTok's restart reads as one continuous moment.

## Decision: cut or merge s05 (the valley aerial)
**Merged into s04.** Reasons: (a) it was the one big new build (an aerial with a climbing waterline) and the cheapest step to lose; (b) after the faster hook the video has three ×-steps in a row (×2, ×4, ×8) and the Analyst flagged s05 as the sag: a second "water goes up a slope" beat right after s02; (c) the ×2 now plays inside s04's rise (the camera is carried up with the water into a high aerial, so the waterline on the valleysides is still seen, just not as its own shot). Cost: none of the numbers change; s04 grows from 3.4 s to 5.0 s.

## The one law (`src/story.js`)
A rockfall pushes water up the far slope, and the real record is **524 m (Lituya Bay, Alaska, 1958), a measured runup**. After the real part, each step doubles that wave height:

`H(k) = 524 m × 2^k` for k = 0, 1, 2, 3.

| step k | multiple | wave height H | free-rise speed, v = √(2·g·H), g = 9.81 | shown in |
|---|---|---|---|---|
| 0 | ×1 (real) | 524 m | 101 m/s = 365 km/h | s02, s03, s04 (first half) |
| 1 | ×2 | 1,048 m | 143 m/s = 516 km/h | s04 (second half, the rise) |
| 2 | ×4 | 2,096 m | 203 m/s = 730 km/h | s05 |
| 3 | ×8 | 4,192 m | 287 m/s = 1,032 km/h | s06 |

- **The 4,192 m payoff:** it is taller than the average ocean depth (3,682 m, NOAA), so there is no ocean left deep enough to hold the wave.
- **The speed ramp (s06→s07):** the water's speed counter starts at the computed 1,032 km/h and climbs to **40,270 km/h = 11.186 km/s, Earth's escape speed**. The endpoints are real numbers. The climb between them is the one stated liberty.
- **The ocean total (s08):** about 1.3 billion km³ (NOAA 1.335, USGS 1.386: both round to 1.3).
- **DRAMATIZATION covers:** the town and lighthouse placed inside the bay (the real bay had no town), the 1.5 s fuse, the wave reaching inland, the ×2 doublings, and the water leaving the planet. Only the 524 m runup and the 1958 date are the real event.
- **Wording rule:** always "climbed", "ran up" or "stripped the forest to"; never "a 524 m wave hit".
- **Verification status of every number on screen:**

| number | status | source |
|---|---|---|
| 524 m runup, Lituya Bay, 1958 | VERIFIED (secondary; primary is Miller, USGS PP 354-C, 1960) | NASA Earth Observatory, Earth magazine (links in `pitches/2026-11-11-pitches-2.md`) |
| 1,048 / 2,096 / 4,192 m, 365–1,032 km/h | computed from the law | `story.js` |
| average ocean depth 3,682 m | VERIFIED (Scout, 2026-11-12) | NOAA 2010 estimate |
| 11.186 km/s = 40,270 km/h escape speed | VERIFIED (Scout, 2026-11-12) | NASA Earth Fact Sheet |
| ocean volume 1.3 billion km³ | VERIFIED (Scout, 2026-11-12) | NOAA NGDC 1.335 |

I put NO rockfall volume, quake magnitude or "160 km/h" on screen, because the pitch flagged those as unverified or source-dependent.

## Counter spec (mid-left, x 64, y 384–470; label / number / fact line)
| shot | label | number | fact line |
|---|---|---|---|
| s01 | ROCKFALL IN | 01.500 → 00.000 (s, linear with film time; **hits 0 at the 1.5 s impact**) | LITUYA BAY, ALASKA 1958 |
| s02 | WAVE HEIGHT | 0 → 524 M (follows the real crest height on the cliff face; the cliff top is ≥ 600 m in scene units) | RAN UP 524 M · REAL, 1958 |
| s03 | WAVE HEIGHT | 524 M | RISING AT 365 KM/H |
| s04 | WAVE HEIGHT | 524 M for 9.0–10.5 s, then 524 → 1,048 M (a fast tween over 0.6 s) while the camera rises | first half: ROOFS: 20 M → WAVE 26× TALLER (the integer is `round(524 / roofHeightM)`, so Studio reads the town's real roof height and the board follows it). Second half: ×2 · RISING AT 516 KM/H |
| s05 | WAVE HEIGHT | 1,048 → 2,096 M | ×4 · RISING AT 730 KM/H |
| s06 | WAVE HEIGHT | 2,096 → 4,192 M | ×8 · AVERAGE OCEAN DEPTH 3,682 M |
| s07 | WATER SPEED | 1,032 → 40,270 KM/H | ESCAPE SPEED: 11.2 KM/S |
| s08 | OCEAN LEFT | 100% → 0% (follows the shell's peeled fraction) | 1.3 BILLION KM³ |
| s09 | none in orbit; frozen **ROCKFALL IN · 01.500** on the last bay second | | LITUYA BAY, ALASKA 1958 |

## Captions (≤ 8 words, ≥ 2.8 s, payoff words in *amber*; `|` = line break)
| id | in | out | text | words |
|---|---|---|---|---|
| T | 0.0 | 3.0 | What if a *524 m*\|wave hit town? | 8 |
| C1 | 3.0 | 5.8 | Alaska, 1958.\|It *climbed 524 m.* | 6 |
| C2 | 5.8 | 8.6 | It swallows\|the *lighthouse.* | 4 |
| C3 | 8.6 | 11.4 | Rooftops vanish\|in *seconds.* | 4 |
| C4 | 11.4 | 14.2 | Now make it\|*twice* as tall. | 6 |
| C5 | 14.2 | 17.0 | *Four times.*\|The sea stands up. | 6 |
| C6 | 17.0 | 20.0 | Taller than the\|*ocean is deep.* | 6 |
| C7 | 20.0 | 24.0 | The water\|*leaves the planet.* | 5 |
| C8 | 24.0 | 27.5 | *1.3 billion km³*\|of ocean. Gone. | 6 |
| — | 27.5 | 30.5 | none (silence; the last beat) | — |

- `DRAMATIZATION` tag is visible the whole video (x 64, safe area), reading "DRAMATIZATION · TOWN AND WAVES".
- The real record is stated by C1 ("It climbed 524 m") and the counter's fact line, never as "a 524 m wave".
- No question to the viewer, no bait. The title is the premise, as in video #2. (The title says "wave hit town", which is the premise; C1 immediately fixes it to the real "climbed".)

## Shots (9 shots, 30.5 s)
| # | shot | film | set | what it shows |
|---|---|---|---|---|
| 1 | s01_bay | 0.0–1.5 | bay | frame 1, **the loop frame**: the bay town at noon seen from the pier rail, the far cliff; **the crack is open at 0.0 s and the slab is already sliding**; it hits the water at 1.5 s |
| 2 | s02_cliff | 1.5–4.5 | bay | the rockfall hits the water; a splash wall climbs the opposite slope to 524 m |
| 3 | s03_wall | 4.5–7.5 | bay | the wave crosses the bay and swallows the lighthouse |
| 4 | s04_town | 7.5–12.5 | bay | the wave tops the rooftops and sweeps the plaza (524 m); the camera rises with the water into a high aerial, ×2 |
| 5 | s05_standup | 12.5–16.0 | bay, frame 1's framing | the wall is already standing over the pier, ×4 |
| 6 | s06_lift | 16.0–19.5 | sky + clouds | the water rises through the cloud deck, ×8 |
| 7 | s07_peel | 19.5–24.0 | Earth from orbit | the ocean peels off the planet |
| 8 | s08_tail | 24.0–27.5 | Earth from orbit | a bare Earth, with the oceans as a comet tail |
| 9 | s09_loop | 27.5–30.5 | orbit → bay | orbit (2.0 s), then the frame-1 bay (1.0 s) |

### Per-shot detail
**s01_bay (0.0–1.5), lens 28 mm, locked off at the pier rail, MB 4**
- Alive: crowd of 25–40 coloured figures on the pier and quay (phones up), 4 boats rocking, gulls (about 20), lamps, window lights in the town, the lighthouse mid-frame. The pier planks are a leading line to the cliff.
- Camera: **locked, with no push-in and no drift**, so s05 and the last second match exactly. The only motion is the world. Studio saves the camera pose as `FRAME1_CAM` in `kit.js`, and s05 and s09 import it.
- Hook: the title; the counter at 01.500 already running; **on frame 1 the dust crack is open and the slab has started to slide** (dust plume off the cliff face, rocks bouncing); gulls bursting off the cliff in the first 6 frames; a stone-crack and a rumble on frame 1 itself.
- World reacts: heads turn and the crowd points (there is no time to run); the bay's surface shivers; the slab hits the water at 1.5 s.
- Transition out: **hard cut on the impact hit** at 1.5 s.
- Sound: stone-crack at 0.0 s, rumble rising, gulls, a tick every 0.5 s (0.5, 1.0; the 1.5 tick is replaced by the boom), and a **sub boom plus a mid-range crack at 1.5 s** (the cut hit, above 200 Hz).

**s02_cliff (1.5–4.5), lens 50 mm to 35 mm, a slow pull from a low side-on viewpoint, MB 8**
- Alive: the slab's rock and dust falling, a splash wall climbing the opposite slope, trees snapping, spray hanging in the sun, gulls scattering.
- Camera: a low shore viewpoint tilting up with the crest; the crest passes the 524 m label height at 4.1 s.
- Transition out: **whip-pan** along the water to the right, following the wave, with blur.
- Sound: a rock roar, the water's deep slap, the crest's hiss, then a rising air-push; the whip-pan gets a whoosh.

**s03_wall (4.5–7.5), lens 35 mm, from the pier end looking down the bay (MB 12)**
- Alive: the wall racing in, boats thrown into the air, the lighthouse swallowed at 6.5 s, gulls flying inland, the crowd running up the quay (they are far off, small and out of the water).
- Transition out: **foreground wipe**: the white water fills the lens (a short spray wipe, no flat white strip; it has droplets and darker body), and the picture reveals the town.
- Sound: a continuous freight-train roar, glass and wood splintering, a boat horn.

**s04_town (7.5–12.5), lens 24 mm, a street-level shot at the plaza, MB 12**
- Alive: cars sliding, shopfronts, trees bending, the fountain smothered, awnings tearing. **No people at the impact:** the plaza is already empty or the camera sits above the crowd line; the camera looks at cars, boats and buildings.
- Camera: the wave tops the roofline at 9.0 s and the lens rises with the water (the camera is carried up). From 10.5 s the rise speeds up and tilts down into a high aerial; the bright waterline climbs the valleysides to the 1,048 m mark, trees stripped bare behind the front. The 524 → 1,048 M tween plays at 10.5–11.1 s.
- Transition out: **hard cut on a sub-bass boom** at 12.5 s.
- Sound: a roar swallowing everything, a deep thud as walls give way, car alarms drowned out, then a muffled underwater tone; from 10.5 s a long low swell and a creaking-rock groan, ending on the boom.

**s05_standup (12.5–16.0), lens 28 mm, `FRAME1_CAM` (exactly frame 1's framing), MB 8**
- **Opens on the wall:** from 12.5 s the whole water body is already standing in front of the pier as a wall, its crest above the far cliff top (2,096 m). The foreground is bare wet seabed (stranded boats and rocks) and the pier planks lead to the wall. The crowd is gone; only birds remain.
- Over the shot the wall leans in and its crest overhangs the cliff. The tween 1,048 → 2,096 M plays 12.5–13.1 s.
- This shot is the match: a viewer's eye recognises frame 1 with the world turned over.
- Transition out: **foreground wipe**: the wall's underside falls over the lens (dark green-blue with droplets), opening onto the cloud deck.
- Sound: the boom's tail, a growing roar, then a deep rumble. (No drawback hiss or silence: the wall is already up.)

**s06_lift (16.0–19.5), lens 24 mm, above the cloud deck, MB 12**
- Alive: a column and a sheet of water rising through the clouds and above them, boats and spray tumbling in it; the sky going dark blue, the horizon curving. Counter 2,096 → 4,192 M at 16.0–16.6 s, then the "3,682 M" fact line.
- Transition out: **a push through the sky**: the camera keeps rising, and the horizon curves into a limb.
- Sound: a thin, high wind, the water's hiss, a tearing bass.

**s07_peel (19.5–24.0), lens 35 mm → 70 mm, orbit, a slow pull-back, MB 8**
- Alive: the ocean and the air peeling off Earth like a comet tail (`shell.js`), speeding up; the counter climbs 1,032 → 40,270 KM/H and stops at the escape mark at about 23.0 s. A tiny airliner or two drift out with the water.
- Transition out: **a continuous dolly** to a wider orbit view.
- Sound: low rumbles only (space is silent, so this is score), a rising riser.

**s08_tail (24.0–27.5), lens 70 mm, orbit, wide, MB 4**
- Alive: a brown-grey Earth, bare seabed edges, the oceans as a glittering tail drifting away, the Sun's glint on the water. OCEAN LEFT 100% → 0%.
- Transition out: a slow fade of the score into silence, then the next shot.
- Sound: the riser peaks and drops to a single sub tone.

**s09_loop (27.5–30.5), orbit 2.0 s then the bay 1.0 s, MB 4**
- Orbit (27.5–29.5): the empty Earth turning, a slow move, near silence.
- At 29.5 s: **a hard cut on a hit** (a soft sub hit) to the exact frame-1 bay: calm water, the crowd, the counter frozen at 01.500, and the crack not yet open (frame 1 already shows it; the one-heartbeat difference is the loop). Hold 1.0 s to the end. The last frame is identical to frame 1's composition and framing.
- Sound: 27.5–29.5 near silence, one hit at 29.5, then the room tone of the bay for 1.0 s with no ticks; the stone-crack begins again at the loop.

## Sound summary
- **No voiceover.** Ticks every 0.5 s in s01 only. Hits on cuts: s01→s02 (1.5 s), s04→s05 (12.5 s), s09 (29.5 s). Silence is the last beat.
- **No flash:** the foreground wipes are blue-green and dark, never white. Spray is water with droplets.
- **Score** (`score.json`): a rising riser through s02–s07, a big sub boom at 1.5 s, silence on the 29.5–30.5 bay second.

## What the Studio must build or confirm
1. **Wave test first** (the war-room gate): the wave surge over the bay at `?scale=0.5` using `splash.js`.
2. **New:** the cliff collapse (s01/s02) with the slab already moving on frame 1, and the high aerial with the climbing waterline at the end of s04 (the valley is now one camera move, not its own shot).
3. **A big camera constraint:** `FRAME1_CAM` has to render the same pose in s01, s05 and the last second. Test by diffing frame 1 against s09's last frame (only the crack and slab may differ).
4. **The roof height** in scene metres decides the "26×" on the s04 counter. If it is not about 20 m, the number changes, and the Studio reports back.
5. **The cliff face** in s02 needs enough vertical extent to read 524 m (it should clearly reach above the lighthouse by 20×).
6. Reuse: `bay.js`, `splash.js`, `ocean.js`, `clouds.js`, `shell.js`, `space.js`, `audio_core.js`.

## Risks and fixes
- **The fake-tsunami trust problem** (viewers have seen AI-fake wave clips): the stylised look, the counter on frame 1 and the on-screen DRAMATIZATION tag are the answer; the cover quotes the real 524 m and 1958 as a runup.
- **Frame 1 is now the chaos frame** (crack and slide at 0.0 s, impact at 1.5 s, inside the 3 s hold). If it reads as fake, the counter and the date in the fact line are the first trust cue.
- **Posting:** nothing posts until the gravity-flip 48 h numbers are in and the post fits the 2 PM CT slot. Cover: "A 524 M WAVE CLIMBED AN ALASKA CLIFF IN 1958. IT'S REAL." (not "hit Alaska"). The AI label is on. Hashtags: `#whatif #physics #space #earth #science`.
