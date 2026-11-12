# tsunami-524: Director hand-over: Gate 0 FAILED (2026-11-12)

## Gate 0 verdict, 2026-11-12 (GPU, IJ_GPU=1): FAIL on 3 of 5 checks
Pages built from `src/t01_light.js` and `src/t02_town.js`, unchanged (crest 100 m, 150 m/s). Key frames at scale 0.5 are in `out/gate0/` (t01: 0.5 / 2.2 / 4.0 / 5.8 s; t02: 0.5 / 3.0 / 5.0 / 7.5 s). The full-size 4-sample frames are in `out/gate0/full/`.
| # | check | result | what the frames show |
|---|---|---|---|
| 1 | lighthouse + crest in frame ≥ 2 s, "taller than the lighthouse" with no caption | **FAIL** | t01 frames the mouth's headland and buildings; the lighthouse is at most a thin sliver on the right edge, so there's no scale read. |
| 2 | face has body: dark green-blue, foam streaks, breaking lip; no white strip, no "rain" | **FAIL** | The face is a blue gradient covered in evenly spaced vertical white streaks. It reads as rain or a curtain. There's no breaking lip, and the crest is a soft haze. Close up (t02 5.0 s) the whole frame is a pale sheet of streaks. |
| 3 | the town shore is hit and the surge visibly climbs over buildings | **FAIL** | No impact is shown. At t02 7.5 s the town is already under a flat, see-through sheet, with the buildings showing as ghost rectangles below it. Nothing climbs over anything. After the crest passes the camera (t01 4.0 / 5.8 s), the scene inverts: the water surface is overhead like a sky, above a dry sand floor. |
| 4 | ≤ 40 px/frame without blur, no white flashes | not verified | 4 stills can't show it. No white flash appears in them. |
| 5 | ≤ 0.5 s/frame on the GPU, full size, 4 samples | **PASS** | 0.3 s/frame (t01 at 2.2 / 2.3 s, scale 1, mb 4) |

**Per the brief:** any failed check moves the build to the fallback, pitch #2 "every satellite collides". The Director reports the switch to the Producer and does not patch around the failure. So no tsunami shots were built. The fallback has no PRODUCTION.md yet, so the Producer needs to write one and the Commander needs to approve it before anything is built.

**If the Commander wants to save the tsunami anyway (NEEDS APPROVAL, the Commander's call, not the brief's):** it needs a real wave rebuild, not tweaks:
- a front face with an overhanging lip (a mesh, not a height field), with the streak foam swapped for flow-aligned noise;
- opaque, churned water with debris over the town, instead of a see-through plane;
- a camera that never ends up inside the water volume;
- a lighthouse framing pass.

Estimate: 1–2 Director sessions before a new Gate 0, with no guarantee it passes.

## Re-run 2026-11-12 06:02 UTC: still blocked
I re-sent the order unchanged. `node tools/frames.js` and `python tools/build_page.py` were refused again, and `war-room/lib/runner.js:101` still emits `Bash(${b}:*)`. Gate 0 can't run, so I wrote no shots: the brief forbids build work before Gate 0 passes.

## Status
Only step 1 (the skeleton) is built. Gate 0 (the wave test) is required before any other build work (PRODUCTION.md), and it **could not run**: every `node tools/…` and `python|py tools/…` command was refused in this session. Git commands worked.

## Root cause (War Room bug, not a policy refusal)
`war-room/lib/runner.js:101` grants Bash as `Bash(${b}:*)`. With `:*`, the prefix rule needs a word boundary (a space or the end of the command) right after the prefix. `git status:*` matches, but `node tools/:*` never matches `node tools/frames.js` (no space after `tools/`). So in PLAN mode, Studio and the Director can't build or render anything. That is the same refusal the team hit on 11-12.
**Fix (Commander, since war-room/ is outside the Director's write area):** for entries that end in `/`, emit `Bash(${b}*)` (for example `Bash(node tools/*)`), or list the tools as words (`node tools/frames.js:*`, `python tools/build_page.py:*`, …). Then restart the War Room and re-send the build order.

## Built
- `src/tsukit.js`, `src/t01_light.js`, `src/t02_town.js`: Studio's wave-test kit, copied from `projects/tsunami/` as the brief orders (unchanged).
- `src/story.js`: the ONE law. `H(k) = 524·2^k`, `v = √(2gH)`, the fuse countdown, the run-up curve (0 → 524 m at 4.1 s), the ×2/×4/×8 tweens, the log-eased speed ramp 1,032 → 40,270 km/h (stops at 23.0 s), the ocean-left fraction, and the SHOT table (915 frames). Every value in the brief's table checks out: 365 / 516 / 730 / 1,032 km/h, 40,270 km/h, and 510 m over the ocean depth.
- `shots.txt`: 9 shots, 45+90+90+150+105+105+135+105+90 = 915 frames = 30.5 s.
- `overlay.js` and `score.json`: written by a second Director session that ran in parallel (the order was sent twice, at 05:51 and 05:52). That session stopped and handed the folder over. `story.js` now exports the names `overlay.js` reads, and the loop-second counter is frozen at 01.500 to match frame 1. Neither file has been run (node was refused), and `score.json` hasn't been reviewed against §5.
- `script.md`: a header note saying PRODUCTION.md §3 is the board, plus the roof fix below.

## NEEDS APPROVAL / decisions for the Commander
- **Roof fact: 31×, not 26×.** bay.js's waterfront roofs average 17 m above the street, so `round(524/17) = 31`. Per the brief, the board follows the code.
- **Run-up timing:** the crest reaches 524 m 2.6 s after impact. That is time-compressed, so it falls under the DRAMATIZATION tag. The real run-up took longer.

## Next, once commands are allowed
1. Gate 0: `py tools/build_page.py projects/tsunami-524/src/t01_light.js` (and t02), then `node tools/frames.js projects/tsunami-524/dist/t01_light.html projects/tsunami-524/out/gate0 0.5 2.2 4 5.8 --scale 0.5 --gpu` (t02: `0.5 3 5 7.5`). Judge the 5 checks, and time a full-size 4-sample frame.
2. PASS: build s01–s09 per PRODUCTION.md §3–4, then overlay.js and score.json. FAIL: report to the Producer and fall back to pitch #2.
