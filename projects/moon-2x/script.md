# moon-2x: "What if the Moon kept coming 2× closer?" (board v2: critic fixes applied)

Sealed plan: `channel/war-room/2026-11-11-first-video.md` (Moon remake, amendments A1, A2 and A3).
The Commander also asked that the Moon come in with a **constant, steady motion**.
- Length: 66.0 s, which is 1,980 frames at 30 fps, in 13 shots.
- The ending is in space, and the last frame hard-cuts to frame 1.

## The one law (`src/story.js`)
The surface-to-surface gap halves every 5 s, continuously: `gap = 376,292 km × 2^(−storyT/5)`.
- **Story time:** storyT = film time − 3. The hook is a flash-forward to storyT 25–28.
- **Moon size:** the angular radius is asin(1737.4 / (gap + 8108.4)). Every shot reads its Moon size from this, so the Moon never pauses or eases.
- **Counter:** "GAP TO THE MOON" counts down every frame from the same law. It pulses at each rung (every 5 s of story time).
- **Tides:** tidal force is proportional to 1/centre-distance³ (×1 today, ×7.5 at rung 1, ×53 at rung 2, ×339 at rung 3, ×1,796 at rung 4, ×7,243 at rung 5).
- **Roche limits:** the fluid limit (18,400 km between centres) comes at storyT 25.96 (film 28.96). The rigid limit (9,500 km) comes at storyT 40.4 (film 43.4).
- **Facts on screen:**
  - 384,400 km mean distance (NASA, science.nasa.gov/moon/facts).
  - The drift away of 3.8 cm/yr comes from lunar laser ranging. NASA's facts page rounds it to "about an inch". The Commander is flagged on this.
  - The ISS orbits at 370–460 km (NASA, nasa.gov space-station facts).
- **A2, met through lenses:** long lenses (600→200 mm, then 135 mm) keep the Moon at 95 px or more on screen from 0:03 on. Story time never skips, which keeps the constant motion.

## Shots (film seconds; frames in shots.txt)
| # | shot | film | storyT | Moon r (deg) | set / camera | what changes in the world | out |
|---|---|---|---|---|---|---|---|
| 1 | s01_hook | 0–3 | 25–28 | 5.0→6.3 | the pier, 85 mm, low (DONE) | sea swelling, restless crowd | hard cut on hit + rewind whoosh |
| 2 | s02_today | 3–8 | 0–5 | 0.26→0.51 | bay at dusk from the promenade; **zoom 600→400 mm** (log-constant), so the Moon visibly GROWS (145→190 px); **the hook's hero silhouette in the foreground at 3.0** | calm evening: boats, birds, gentle surf; **the lighthouse beam sweeps across the Moon at ~3.5** | hard cut on rung-1 hit |
| 3 | s03_tide | 8–13 | 5–10 | 0.51→0.97 | 135 mm from the promenade, over the crowd at the waterline to the bay mouth; hero small in frame | surf climbs the beach; crowd gathers with phones; **beat: boats break loose and drift** | whip-pan right (blur) |
| 4 | s04_flood | 13–18 | 10–15 | 0.97→1.81 | 50 mm high over the rooftops, down at the flooding bay; hero small on a rooftop or steps | sea +2→+6 m over the beach and promenade; lamps half-drowned; town lights reflected; **beat: the first wave over the seawall** | hard cut on hit |
| 5 | s05_blackout | 18–23 | 15–20 | 1.81→3.15 | 85 mm from the beach across the bay at the far town, Moon behind the hills; hero small in the foreground | **beat: the skyline blackout sweep**; lamps die in sequence; moonlight brightens the scene | match cut on the Moon's disc |
| 6 | s06_pier | 23–28 | 20–25 | 3.15→5.02 | the pier, new angle: 3 m crane behind the crowd, slow rise | the whole crowd filming; ends at the hook's state | hard cut on braaam |
| 7 | s07_roche | 28–33 | 25–30 | 5.02→7.13 | 135 mm from the beach: the Moon fills the top half, crowd heads at the bottom | **ROCHE LIMIT at 28.96**: fracture lines spread, first chunks lift off the limb | hard cut on braaam |
| 8 | s08_split | 33–38 | 30–35 | 7.1→9.1 | **70 mm** from the hill, pushing in on the chunks (the Moon stays ≥ 50% of the frame); town and flooded bay below | the Moon splits into big chunks; a debris tail streams toward Earth | foreground wipe (a fragment) |
| 9 | s09_meteors | 38–43 | 35–40 | 9.1→10.5 | 50 mm tracking the hero running down the pier | fragments enter the atmosphere: orange-headed streaks; distant impact glows (orange, never white) | hard cut on impact |
| 10 | s10_ring | 43–48 | 40–45 | 10.5→11.3 | 24 mm up at the sky from the hill, slow tilt | the debris forms a ring arc horizon to horizon; streaks continue | hard cut on braaam |
| 11 | s11_iss | 48–53 | 45–50 | (rubble) | s10's sky rig, lower camera, 35 mm from the beach | the debris skims the upper atmosphere overhead; sky glows; the crowd is small below | crane up |
| 12 | s12_rise | 53–58 | 50–55 | (rubble) | the camera rises from the hero up through the streaks | fast ascent with motion blur; **true silence 57.0–58.0** | foreground wipe into space on the big hit |
| 13 | s13_space | 58–66 | 55–63 | ring | Earth from orbit: sunlit crescent + night side, bright ring, rubble | slow orbit; **ends with Earth's disc where the hook's Moon disc is** (y≈580 design, ≈290 px) | hard cut to frame 1 (loop) |

## Captions (≤ 8 words, ≥ 2.8 s; `|` = line break; amber words in [brackets])
| film | text | tag |
|---|---|---|
| 0.0–3.0 | WHAT IF THE MOON \| KEPT COMING [2×] [CLOSER?] | DRAMATIZATION |
| 3.0–6.0 | TODAY IT DRIFTS AWAY \| [3.8 CM] A YEAR | SOURCE: LUNAR LASER RANGING |
| 6.0–9.0 | NOW THE GAP [HALVES] \| EVERY 5 SECONDS | DRAMATIZATION (from 6.0 to the end) |
| 9.5–12.8 | TIDES ARE [14×] STRONGER \| AND CLIMBING | |
| 13.5–17.5 | THE SEA CLIMBS \| INTO THE [STREETS] | |
| 18.5–22.5 | THE GRID FAILS. \| [MOONLIGHT] TAKES OVER. | |
| 23.5–27.5 | EVERY CAMERA ON EARTH \| POINTS [UP] | |
| 28.3–32.8 | THE [ROCHE LIMIT]. \| EARTH STARTS TEARING IT. | |
| 33.5–37.5 | THE MOON \| [BREAKS APART] | |
| 38.5–42.5 | AND THE SKY \| STARTS [FALLING] | |
| 43.5–47.5 | A RING OF MOON ROCK \| WRAPS [EARTH] | |
| 48.5–52.5 | NEARING THE \| [SPACE STATION'S] ORBIT | |
| 53.5–56.8 | [50 SECONDS]. \| THAT'S ALL IT TOOK. | |
| 59.0–63.0 | THE MOON \| IS NOW A [RING]. | |

Counter, per A1:
- At 3.0 it spins back over 6 frames, from 7,758 up to 376,292, on a rewind whoosh, with no pulse.
- From 3.2 it runs LIVE on the law, with label "GAP · TODAY" until 6.0, then "GAP TO THE MOON".
- From 43.4 (the rigid Roche limit) the label is "GAP TO THE DEBRIS".
- Pulses fire at each rung: 8, 13, 18 … 63.

## Sound
- **Shot sound** (`src/<shot>_sound.js`, audio_core): every cut lands on a mid-range `hit()` (A3).
  - Surf and tide grow with tides.
  - The crowd escalates from murmurs to shouts to running.
  - Rumble grows; sirens (far); the grid fails with an electrical buzz cut off; cracking stone (s07); meteors rip past (s09); a roar of rubble (s10–s12).
- **Score** (`score.json`):
  - Ticks double at each rung from 3.0.
  - Risers 23.5→28.0 and 48.5→57.0.
  - Braaams at 0, 28, 33 and 43, plus cracks on every cut.
  - Impacts in s09.
  - **Silent second at 57.0–58.0**, then the BIG HIT at 58.0.

## Look
- The light changes the whole frame per rung. Dusk (s02) gives way to blue night, and the moonlight wash grows as 1/d². By s05 the scene reads as a pale "moon-day".
- After the breakup, orange light from the entry streaks and impacts takes over; space is clean and dark.
- Motion-blur samples: 4 for calm shots (s02, s04), 8 for moving shots (s03, s05, s06, s07, s08, s10, s13), 12 for fast ones (s09, s11, s12).
- Bottom third (y > 640 design) is scenery only.
