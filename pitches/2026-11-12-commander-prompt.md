# Production prompt: "What if the air *vanished* for 5 seconds?"

Paste this into **War Room → Studio → Greenlight an idea** (Quality: Max, Builder: Opus), or give it to any Claude Code session in this repo.

---

Build a flagship Invisible Journeys video: **"What if the air *vanished* for 5 seconds?"** Read CLAUDE.md, PLAYBOOK.md, channel/BRAIN.md, channel/TASTE.md and engine/API.md first. Use projects/gravity-flip as the reference for structure and quality (story.js law, shots.txt, shot + _sound files, overlay.js, score.json).

**Format:** Studio v2.
- 1080×1920, 30 fps, 36–38 s, about 11 shots, bright daylight first, full-colour people at mid-distance (no faces, no gore).
- Title with one amber accent word. Mid-left counter (label / number / fact line).
- Captions of 8 words or fewer, inside the TikTok safe area: x 60–480, y 100–765 design px.
- No voiceover. DRAMATIZATION on screen. Hard cut from the last frame to frame 1.

**The one law** (src/story.js, every number computed; verify each with a primary source and cite it):
- The air vanishes for exactly 5 s. Sea-level pressure falls from 101.3 kPa to 0.
- **Water boils** whenever pressure is below its vapour pressure: 2.33 kPa at 20 °C. So every open water surface boils at room temperature (fountain, drinks, sea), then starts to freeze from evaporative cooling. Use the boil only; no freezing needed in 5 s.
- **Nothing flies.** No air means no lift, so everything airborne is in free fall: d = ½·9.81·t², which is 122.6 m at t = 5 s. Jet engines flame out (no oxygen). Birds drop.
- **No sound:** the audio goes to true silence, apart from a low heartbeat sub that is score, not diegetic.
- **No sky:** no Rayleigh scattering, so the noon sky goes black with stars visible, and the Sun is a hard white disc.
- **Mass:** the atmosphere is 5.15 × 10¹⁸ kg (5.15 quadrillion tonnes).
- **Humans:** about 9–12 s of useful consciousness in sudden vacuum (NASA), so 5 s is survivable. Show discomfort only: hands to ears.
- **The one liberty (DRAMATIZATION):** the air vanishes and reappears instantly. The return lands as a planet-wide thunderclap.

**Board** (film time · place · what visibly happens · counter):

| # | Time | Place | What visibly happens | Counter |
|---|---|---|---|---|
| 1 | 0:00–3:00 | City plaza at lunch (citykit) | Slow push-in. Hit on frame 1. | AIR VANISHES IN · 03.000 · SEA-LEVEL AIR 101 KPA |
| 2 | 3:00–6:00 | Same plaza | All sound cuts on the frame the counter reaches 0. The sky drains to black with stars over about 0.6 s. Pigeons drop. The fountain erupts into boiling white foam. Caption: "Every sound *stops*." | AIR PRESSURE · 101 → 0 KPA |
| 3 | 6:00–9:00 | Cafe tables | Drinks foam over in their cups. People clutch their ears (mid-distance). Caption: "Water boils at *room temperature*." | WATER BOILS AT · 20 °C |
| 4 | 9:00–12:30 | The bay in daylight | The sea fizzes white to the horizon. Black sky, hard Sun. | SEA · BOILING |
| 5 | 12:30–16:30 | Above the cloud deck | An airliner's engines die. It drops through clouds that are evaporating away. Caption: "Planes just *fall*." | LIFT · 0 · FALLEN · live, up to 122.6 M |
| 6 | 16:30–20:00 | Orbit | Earth's blue rim and cloud cover fade out (space.js atmI / cloudsI). Earth looks airless. | ATMOSPHERE · 5.15 QUADRILLION T → 0 |
| 7 | 20:00–23:00 | Plaza | AIR RETURNS 00.000. A white shock ring rolls across the plaza, windows flex, pigeons burst up, car alarms start. Caption: "Then it all comes back *at once*." | AIR RETURNS IN · 00.000 |
| 8 | 23:00–27:00 | Bay | The fizz dies. Steam hangs over the water. Sound floods back. | |
| 9 | 27:00–31:00 | Sky | The airliner recovers 122.6 m lower. Contrails re-form. Caption: "One jet lost *122 m*." | |
| 10 | 31:00–35:00 | Orbit | The blue rim snaps back, and a white shock-front ring races around the globe. | |
| 11 | 35:00–38:00 | End card | "5 seconds. *Every sound on Earth stopped.*" Silence on the last beat, then a hard cut to frame 1 on a hit. | |

**Quality bar** (what makes it "very high quality"):
1. **The visible effect.** Every shot has one unmistakable visible effect by its first second. Nothing is subtle at phone size.
2. **Build the hardest things first, then look-test them at 1080×1920:**
   - boiling foam (fountain, cups, sea: particles plus an ocean fizz term);
   - the noon sky going black with stars;
   - the return shock ring.
3. **Light continuity.** One sun direction per location, kept across cuts. Match the black-sky exposure, so stars read without crushing the plaza.
4. **Sound.** True silence for the 5 s, apart from the heartbeat sub. Make the return thunderclap the loudest moment of the film, with a mid-range crack so phone speakers carry it.
5. **Motion.** At least 8 motion-blur sub-samples on moving shots. Render at max quality on the GPU.
6. **QC.** check.py must PASS:
   - frame count;
   - −14 LUFS;
   - no white flashes (fade the sky to black; never flash it);
   - contrast ≥ 3:1;
   - safe area.

**Posting** (projects/<slug>/POST.json):
- **Cover:** "WITHOUT AIR, A JET WOULD FALL 122 M IN 5 SECONDS".
- **Caption:** "The air vanishes for 5 seconds. Water boils at room temperature, planes fall, the sky goes black."
- **Hashtags:** the fixed set from the brain.
- **Upload:** turn on the AI-generated label.
