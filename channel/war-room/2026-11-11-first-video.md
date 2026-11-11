# War Room dossier: the first video

- Decision: Which premise is Invisible Journeys' first video (remake "What if the Moon got 2× closer every 5 seconds?" to the new look bar, or a different premise), and what exactly is its frame 1?
- Convened: 2026-11-11. Roster: tailored (Scroller with the platform seat, Fact Officer, Showrunner, Quartermaster; Marshal; Tenth Man). Depth: quick.
- Status: SEALED by the Commander on 2026-11-11. This dossier is now frozen.
- Commander's call: Go with the Moon remake as video #1, with amendments A1, A2 and A3 adopted.
- Why a war and not a check: the channel has no data yet (channel/results.csv:1), so nothing can settle it.

## Chief-of-staff verification (arithmetic and citation checks, not opinions)
- Ladder: 384,400 → 192,200 → 96,100 → 48,050 → 24,025 → 12,012 km centre to centre. Tides scale ×8 per step.
- Surface gap: 376,292 km, which reaches 92 km after 12 halvings.
- Speed: step 1 covers 192,200 km in 5 s, or 38,440 km/s (about 0.13 c). The Fact Officer's "≈1.0 c" was wrong.
- Moon disc at the 60 mm lens, in design px, for rungs 0–6: 15, 29, 56, 104, 181, 288, 410.
- Cited code was checked: tools/overlay/ov.html:133, tools/check.py:19, tools/check.py:174, tools/score.py:191, tools/score.py:203.
- Not verified: the NASA figures (3.8 cm/yr, 384,400 km), because the web fetch was blocked. Confirm them before posting.

STRATEGY: Remake the Moon premise as video #1, built as a cold open on mid-chaos, then a 12-rung "surface gap" ladder that stays literally true, with a Roche-limit breakup, a rise to space and a matched-disc loop. Use two sets: the bay plus an Earth-from-space ending.
  why-it-wins: All 4 officers back it independently. It passes the topic test, and v1 failed on its look, not its idea (PLAYBOOK.md:45). The opportunity cost decides it. Every premise needs the same unbuilt work (bay proof render, audio, space set), and only the ~0.5 day of escalation tuning is specific to the Moon. The alternatives (Earth spin, Sun ×2, gravity ×2) add sets that have no code yet and facts nobody has checked. Doing nothing keeps results.csv empty and teaches us nothing.

FRAME 1 (as advised by the Marshal):
- Scene: a flash-forward to rung 5. A dusk bay at 60 mm, with the Moon about 19× its normal size (288 design px), lit at 60° phase so the terminator shows. It sits in y 350–640, clear of the caption.
- Story: the swollen sea lifts toward the Moon. The small silhouetted hero stands on the pier with a phone raised, and the crowd and boats are below.
- Text: caption "WHAT IF THE MOON KEPT COMING 2× CLOSER?" (8 words) and counter "GAP 11,759 km", with a DRAMATIZATION tag.
- Sound: a hit that lands on frame 0 (see the amendments for how).

BATTLE-PLAN:
  - Gate everything on a half-scale bay render and a 3 s proof render through run.sh, check.py and assemble.sh. If it looks cheap, fix the set, not the premise.
  - Ladder: halve the surface gap (376,300 → 92 km) over 12 rungs. Breakup runs from rung 6 (inside the fluid Roche limit, ~18,400 km) to rung 8 (about the rigid limit, ~9,500 km), around the 0:30 drop-off. Rungs 9–12 are the ring, the fragment rain and the rise to space.
  - The fuse at 0:03: "THE MOON DRIFTS 3.8 CM AWAY EVERY YEAR" with a NASA LLR tag.
  - Every rung changes a different setting in the world: sea level, blackout sweep, wet sand, sky, crowd agitation, camera (PLAYBOOK.md:55).
  - Build engine/src/audio_core.js and tools/audio.js, plus an Earth-from-space set from the existing Earth textures.
  - The loop: hard-cut from the last space frame to frame 1 on a sound hit, matched on the disc's position.
  - Amendments from the Tenth Man (ADOPTED at the seal):
    - A1: the 0:03 cut gets its own "GAP · TODAY" counter track with no pulse, a 6-frame rewind whoosh as the number spins back, and the caption "TODAY IT DRIFTS AWAY 3.8 CM A YEAR". The first change-pulse comes at rung 1.
    - A2: cut at 0:03 to rung 3 (disc about 104 px), not rung 0. Roll rungs 0–2 as a 1.5 s counter inside the fuse shot, and spend the freed time on rungs 5–8.
    - A3: every cut hits on a layered mid-range transient (200 Hz–3 kHz, such as a crack or a water slam), with the sub-bass only as a sweetener. Measure onsets after a 200 Hz high-pass, and check the mix on a phone speaker before posting.

BASELINE:
  - The engine has never finished an end-to-end render, and the audio and space set aren't built, so it ships late or looks cheap again like v1.
  - Opening on mid-chaos and then cutting to a calm start at 0:03 confuses viewers, because the hook and the fact clash, and the loop cut feels jarring.
  - A 61–70 s video with no voiceover leans on captions and sound, so retention is weak, and "Moon gets closer" is a familiar what-if that may not stand out as a debut.

HOW-WE-LOSE:
  - by: The Tenth Man
    axis: refuting the consensus (the 0:03 cut)
    claim: At 0:03 every signal says the Moon is leaving. The counter jumps up from 11,759 to 376,300 km, and the change-pulse that later means "halved" fires on that jump. The disc shrinks from about 288 to 15 px, and the caption says "DRIFTS … AWAY". Nothing marks the cut as a jump back to the start.
    grounding: tools/overlay/ov.html:133
    failure-world: "2026-11-27: Post #1 holds the first 3 s, then falls off a cliff from 0:03 to 0:06. Viewers read 'false alarm, it went back' at the exact moment they decide whether to swipe. Because results.csv is empty, this one row teaches the Analyst the wrong lesson: that the cold open or the premise doesn't work."
    predictability: predictable
    status: defused (A1 adopted)
  - by: The Tenth Man
    axis: refuting the consensus (promise debt in the ladder's geometry)
    claim: Once the cold open is spent, the Moon is a dot. At the frame-1 lens the disc is 15, 29, 56, 104 and 181 px for rungs 0–4, and it only gets back to frame-1 size at about 0:28. So 0:03–0:18 is a calm bay with a tiny Moon, the "empty sea" and "dark near-empty frames" v1 was rejected for. On check.py's 180×320 contact sheets the rung-0 Moon is about 5 px, so review won't catch it.
    grounding: PLAYBOOK.md:67
    failure-world: "2026-12-04: Retention bleeds steadily from 0:03 to 0:18 while viewers wait for the frame-1 Moon, which doesn't return until 0:28. Completion stays in single digits, and the Commander calls rungs 0–2 'v1 again'."
    predictability: novel
    status: defused (A2 adopted)
  - by: The Tenth Man
    axis: refuting the consensus (the sound hook on a phone)
    claim: The planned "sub-bass boom" sits mostly under about 110 Hz (impact 110→40 Hz, big-hit sub 80→25 Hz), which phone speakers barely play. What's left is a roughly 30 ms click under the tide roar. check.py measures cut onsets with full-band loudness, so it passes every cut anyway. With no voiceover, sound is half the hook.
    grounding: tools/score.py:191
    failure-world: "2026-12-11: Approved on the Commander's PC speakers and posted. On phones, frame 1 opens on surf hiss and a tick, so the 3 s hold misses. The 0:03 hard cut, with no audible hit, reads as the 'jumpy' edit v1 was rejected for."
    predictability: novel
    status: defused (A3 adopted)
  - by: The Quartermaster
    axis: feasibility
    claim: The first end-to-end render is the weakest link. Render cost has never been measured, and the bay, the biggest set, has never been test-rendered. After that, the space ending and the audio don't exist yet.
    grounding: CLAUDE.md:10
    status: bet-accepted
  - by: The Fact Officer
    axis: honest science
    claim: Physics commenters will catch three things. An intact giant Moon after rung 4 is wrong. "2× every 5 s" means about 0.13 c at step 1. And a 3.8 cm/yr drift away is not a closing orbit. The NASA figures were also not fetched.
    grounding: speculative
    status: not-defused (re-open if the NASA figures fail verification)
  - by: The Showrunner
    axis: story shape
    claim: If the rungs only change the counter and the size of the Moon ("same bay, bigger Moon"), it repeats v1's failure.
    grounding: PLAYBOOK.md:55
    status: defused
  - by: The Scroller
    axis: hook, retention, platform
    claim: The premise may be saturated on short-form, and a doomsday or tsunami tone could draw a sensitive-content review. Both are unverified.
    grounding: speculative
    status: bet-accepted

## Open after the seal
- The Fact Officer's risk stays open. Verify the NASA figures, keep the DRAMATIZATION tag on everything from rung 1, and show the Roche breakup on screen.
- The Quartermaster's and Scroller's bets were accepted as decision debt. The first gate is the half-scale bay render and the 3 s proof render.

## Note to the Commander (at convening)
The dissent includes 2 novel failure mechanisms (A2 and A3), so the council is not stuck on the obvious risks. The Tenth Man's first point is predictable, but his fix (A1) is cheap. A2 also changes the ladder's pacing, so accepting it means the board is written around rung 3 at 0:03.
