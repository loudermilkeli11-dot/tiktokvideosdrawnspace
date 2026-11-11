# gravity-flip: "What if gravity flipped for 5 seconds?" (video #2, board v1)

The Commander picked the premise on 2026-11-11 and asked for three things on top of it:
- aftermath disasters ("tsunamis, and other dramatic things");
- "planes flying way off into space";
- several locations, not just the bay, with interesting visuals rather than silhouettes.

The video escalates the flip's length in three steps: **5 seconds → 1 minute → 10 minutes.** Each step goes bigger.

## Format (Studio v2)
- **Length:** about 38 s, which is 1,140 frames at 30 fps.
- **Picture:** 1080×1920, bright daylight, people in full colour.
- **Type A:** an Instrument Serif title with an italic accent, a darker band behind the title for contrast, and a counter at mid-left (label / tabular Space Grotesk number / fact line).
- **Sound:** no voiceover. The sound is built around the countdown.
- **The loop:** the last frame hard-cuts to frame 1.
- **Tags:** DRAMATIZATION on screen throughout, and the AI label at upload.

## The one law (`src/story.js`), honest within one stated liberty
- **The liberty, which carries DRAMATIZATION:** Earth's gravity points outward for T seconds, and the solid ground holds.
- **What moves:** everything loose falls up together: people, cars, water, the air itself. Because the air rises with everything else, there is no drag, so vacuum kinematics apply. Gravity follows the inverse-square law.
- **Verified with a numerical integration** (`python3`; see the commit for this board):

| flip T | at the end of the flip | apex | lands back at | landing speed |
|---|---|---|---|---|
| 5 s | 122.6 m, 49 m/s (177 km/h) | 245 m at τ 10.2 s | τ 17.3 s | 70 m/s (252 km/h) |
| 1 min | 17.66 km, 588 m/s (2,115 km/h) | 35.4 km at τ 120 s | τ 206 s | 832 m/s (2,994 km/h) |
| 10 min | 1,629 km, 5.05 km/s (18,163 km/h) | 4,378 km at τ 30 min | τ 54.7 min | 7.1 km/s (25,687 km/h) |

- **Landmarks during the 10-minute flip:**
  - the Kármán line (100 km) at τ 2 min 23 s;
  - the ISS's altitude (408 km) at τ 4 min 51 s.
  - Airliners pass the space station's altitude along with everything else.
- **Facts on screen:**
  - g = 9.81 m/s².
  - The ISS orbits at about 408 km (NASA).
  - The Kármán line is at 100 km.
  - Returning spacecraft come in at about 25,000–28,000 km/h, the same speed range as the 10-minute return.

## Shots (film seconds; τ = story seconds since the flip on that step; a cut may skip story time and the counter follows)
| # | shot | film | τ | location | picture | caption (≤ 6–8 words) | counter |
|---|---|---|---|---|---|---|---|
| 1 | s01_plaza | 0.0–3.0 | −3→0 | city plaza | a busy lunchtime plaza: fountain, cars on the avenue, pigeons, towers; slow push-in | title: "What if gravity *flipped* for 5 seconds?" | GRAVITY FLIPS IN · 03.000→00.000 · EARTH PULLS AT 9.81 M/S² |
| 2 | s02_flip | 3.0–6.0 | 0→3 | city plaza | at 0 everything loose leaves the ground at once: people, cars, benches, the fountain's water. The camera tilts up and starts rising with them | "Everything loose falls *up*." | FALLING UP · height m · km/h |
| 3 | s03_pov | 6.0–8.5 | 3→5.5 | in the air over the plaza | point of view from among the floating crowd, the plaza dropping away; at τ 5 the light and sound shift as gravity returns | at 8.0: "Gravity's back. *Still rising.*" | HEIGHT · 44→130 m · 177 km/h |
| 4 | s04_seaup | 8.5–10.5 | 9→11 | the bay (daylight) | the lighthouse webcam, which is bolted down and so stays put, looks up: the whole sea hangs 245 m overhead like a glittering ceiling, boats sitting on it, its underside mirroring the seabed; below, the bare wet seabed and stranded rocks | "The sea *fell up* too." | APEX · 245 M |
| 5 | s05_crash | 10.5–13.5 | 16→19 | the bay | a bolted-down rooftop camera: at τ 17.3 the sea slams back into the bay in a colossal splash, then a tsunami surge pours over the beach into the town, carrying boats into the streets (no people on screen at impact) | "Then it all comes *back*." | LANDING · 252 KM/H |
| 6 | s06_again | 13.5–15.0 | −1.5→0 (step 2) | city plaza, rewound | a fast rewind to the calm plaza, the counter re-armed | "Now make it *one minute.*" | FLIP · 01:00 |
| 7 | s07_clouds | 15.0–20.0 | 50→55 | 17 km up, above the cloud deck | people, cars, pigeons and a tumbling airliner rising past the camera at 2,000 km/h; dark-blue sky, the cloud sea below, Earth's horizon curving | "Above the clouds. *Above the jets.*" | HEIGHT · 17.7 KM · 2,115 KM/H |
| 8 | s08_coasts | 20.0–24.0 | 200→206 | Earth from orbit | the oceans fall back from 35 km: every coastline erupts in white surf at once | "Every coast. *At once.*" | 3,000 KM/H |
| 9 | s09_peel | 24.0–30.5 | (step 3) 0→291 | Earth from orbit | "Now make it ten minutes." The oceans and the atmosphere peel off Earth like a comet tail; tiny airliners rise past the ISS | at 24.0: "Now make it *ten minutes.*"; at 27.5: "Planes pass the *space station.*" | HEIGHT · 408 KM · 4:51 |
| 10 | s10_return | 30.5–35.0 | 2,880→3,285 | Earth's night side from orbit | it all comes back: a planet-wide meteor storm, thousands of orange entry streaks lighting the night side | "It all comes back at *25,000 km/h.*" | RE-ENTRY · 25,687 KM/H |
| 11 | s11_end | 35.0–38.0 | — | orbit, slow | the scarred, steaming Earth turns away from the Sun | "10 minutes. *That's all it takes.*" | — |

## Sound (`score.json` + shot sound)
- **0–3 s:** ticks on the counter's seconds and a rising sub pulse. The flip lands on a deep whoomp plus a mid-range crack (A3 rule).
- **Falling up:** wind rush, crowd shouts (distant), car alarms going up and away.
- **The top:** near silence at the weightless apex (s04).
- **The crash:** the sea's impact, a tsunami roar, debris.
- **The rewind:** a tape-rewind whoosh into step 2.
- **Above the clouds:** a thin, high wind and a jet engine's scream tumbling past.
- **Space:** only low rumbles. Sound doesn't travel in space; the low sound is score, not diegetic.
- **The meteor storm:** a rising roar, then silence on the end card. The hard cut back to frame 1 lands on a hit.

## Look rules for this video
- **Daylight, colour, motion.** People are seen at mid-distance (crowd figures at most 150 design px), never as close-ups. Their faces stay featureless.
- **No gore:** no impacts on people are ever shown. We cut to the sea, cars and buildings instead.
- **No fluffy smoke or fog.** Water spray, splashes and clouds-from-above are allowed.
- **Glitter, not glare.** No white strobes; the meteor storm is orange.

## Builders and ownership
- See `BUILDERS.md`.
- **Lead:** s01, s02, s03, s06, integration, sound and assembly.
- **Builder OCEAN:** s04 and s05, plus the ocean lift, the underside of the water, the splash and the surge.
- **Builder SKY:** s07, plus planes and the cloud deck.
- **Builder SPACE:** s08, s09, s10 and s11, plus coast surf, the peeling ocean/air shell and the meteor storm.
- **Builder TYPE:** the v2 look in ov.html, `overlay.js` and `score.json`.
