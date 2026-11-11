# War Room dossier: channel strategy for the next 5 videos

- **Decision:** Given the channel analytics in channel/analytics/2026-11-11-snapshot.md (and channel/results.csv), what content strategy should Invisible Journeys commit to for its next 5 videos (topic lane, video length, hook and first 10 seconds), and what exactly is video #2?
- **Convened:** 2026-11-11, about 19:20–20:00 UTC.
  - Roster: tailored. Data Skeptic, Showrunner, Scroller, Producer and Platform Officer, then the Marshal, then the Tenth Man.
  - Depth: quick. Officers ran on a fast model, the Tenth Man on the strong model.
- **Status:** SEALED by the Commander on 2026-11-11 (answered about 20:50 UTC). This dossier is now frozen.
- **Commander's call:** "Seal as planned", which adopts the strategy with amendments A1, A2 and A3. Video #2 starts right after the seal.
- **Why a war and not a check:** no test or spec can say which strategy wins. The evidence is 3 fully measured videos and 5 partial ones, with post time, length, hashtags and account age all changing together (channel/analytics/2026-11-11-snapshot.md:51).

## What the numbers say
| video | length | views | avg watched | watched in full | likes | follows per 1,000 views |
|---|---|---|---|---|---|---|
| A119 "nuke the Moon" (#trump #nuke) | 34 s | 7,013 | 9.0 s (26.5%) | 8.13% | 1.88% | 0.57 |
| Pickaxe "Will Trump nuke this mountain?" | 88.5 s | 4,833 | 17.8 s (20.1%) | 2.80% | 2.50% | 0.62 |
| "The sun just went dark" (no cover text) | 34 s | 1,029 | 13.4 s (39.4%) | 22.72% | 6.32% | 0 |

- **Reach vs retention:** reach went to the posts framed around news and weapons. Retention and likes went to the plain sky catastrophe.
- **Conversion:** nothing converts yet. There were 7 follows and 2 shares across 12,875 views.
- **Watch time:** the average view lasts 9–18 s on every video, so most viewers leave before the halfway mark whatever the length.
- **What matters most is still unknown** (snapshot.md:47–50):
  - where views come from (For You, hashtags or followers);
  - where viewers leave (retention curves);
  - the 3 s hold;
  - the follower total.

## Chief-of-staff verification (arithmetic and citation checks, not opinions)
- **Rates:**
  - Reach gap A119 vs Sun: 7,013 / 1,029 = 6.8×.
  - Follows per 1,000 views: 0.57, 0.62 and 0.
  - Play time per view: 9.2, 18.1 and 10.7 s (channel/analytics/2026-11-11-snapshot.md:22).
- **Post times, in Central time** (on the snapshot's time-zone assumption, line 3):
  - A119: 14:16.
  - Pickaxe: 11:50.
  - Sun: 06:12.
  - moon-2x: 09:30.
  - The lowest-reach video was also the one posted at dawn, so post time is a live confound.
- **Watch-time arithmetic:** at the measured 20–26.5% of length watched, a 66 s film would hold 13.2–17.5 s per view. Expecting moon-2x to behave like the old videos is speculative.
- **Gate A arithmetic:** at 66 s, an average watch of 18 s or more already means 27.3% of length or more. So the "≥ 25%" clause never binds, and the gate is simply 18 s.
- **Render arithmetic:**
  - A 34 s video is 1,020 frames, 51.5% of moon-2x's 1,980.
  - At about 9 s per frame on one renderer, that's about 2.55 h (CLAUDE.md, "Measured speed").
- **Physics of video #2 (Sun vanishes):**
  - Sunlight takes 499 s (8 min 19 s) on average. The yearly range is 8 min 11 s in January to 8 min 27 s in July, and about 8 min 13 s in mid-November.
  - Nothing on Earth changes until that light runs out, because light and gravity both travel at c. So a countdown during which "the sky and sea change at each rung" (the Scroller's version) is wrong.
  - At 0:00 the light goes out, and the Moon goes dark 1–3 s later. Earth then leaves on a straight line at about 30 km/s, and cooling takes days to weeks.
  - Two wordings in the advised spec overstate the fact:
    - "VANISHED FOR 8 MIN 20 S" reads as if the Sun came back.
    - "8:20 TO LIVE" claims everyone dies at 0:00.
- **Physics of other premises:**
  - **Moon vanishes:** the Sun's tidal force is 0.46× the Moon's, so tides shrink to about a third of today's spring range, not zero. Changes to tilt and day length take millions of years.
  - **Chicxulub:** a 10 km rock matches the Moon's 0.52° disc at about 1,100 km, which is 55 s before impact at 20 km/s. "Taller than Everest" holds for anything over 8.85 km.
  - **Earth spin:** the equator moves at 1,674 km/h.
  - **T CrB (slate #3):** the old cover said it was "about to explode" (snapshot.md:30). Check whether it has erupted before building #3.
- **Citations corrected:**
  - Producer:
    - "3 sets, 3 h" is PLAYBOOK.md:84, not :83;
    - "dark, near-empty frames" is PLAYBOOK.md:73, not :68;
    - moonLight is engine/src/sky.js:8, not :11;
    - the analytic ground function is engine/src/bay.js:3, not :7.
  - Showrunner:
    - "each step changes the whole frame" is PLAYBOOK.md:61, not :55;
    - "the dinosaur cover pulled views" is overstated: 546 in 7 days (snapshot.md:27).
- **Code check:**
  - The ocean's `level` and `amp` are uniforms the kit already sets every frame (engine/src/ocean.js:39, projects/moon-2x/src/kit.js:57).
  - Night lighting exists in the bay set: windows, lamps and a lighthouse (engine/src/bay.js:1).

## Majority map (from the Marshal)
- **Lane:** natural-sky and space what-ifs, with no politics or weapons. 4 of 5 (Showrunner, Scroller, Producer, Platform Officer). The Data Skeptic agrees only on "not news".
- **Length:** no majority.
  - 30–38 s: Scroller, Producer.
  - Test 34 vs 60–66 s: Data Skeptic.
  - Keep 61–70 s: Showrunner, Platform Officer.
- **Hook:** all five. A payoff image or a claim on frame 1, and a visible escalation by about 3 s.
- **Video #2:** five different premises (dinosaur rock, Sun vanishes, Moon vanishes, Sun 2× brighter, a Moon-adjacent short). The Marshal chose one.

STRATEGY: One lane, "a natural-sky catastrophe with one true number". Package every video with a fact-with-number cover claim, a payoff image on frame 1 and a visible escalation by 0:03. Drop all news, politician, country and weapons framing. Treat length as a controlled test, not a rule. Hold the hashtag set and the post slot constant so the next 5 videos can actually teach us something.
  why-it-wins:
  - **The reach winners are also the riskiest posts.**
    - A119 and Pickaxe carried #trump/#iran plus "nuke" (snapshot.md:10–11).
    - TikTok makes unverified crisis content ineligible for For You (snapshot.md:39–40).
    - They converted at about 0.6 follows per 1,000 views, which is noise-level.
  - **Packaging is the cheapest gap to test.** The Sun video holds best (39.4% of length, 22.72% watched in full) with no cover text. The cheapest hypothesis is that packaging, not topic, is what held it back.
  - **The 61–70 s rule is unverified, and the payoff it buys is distant.**
    - It rests on unverified Creator Rewards thresholds.
    - It sits behind an estimated 10,000 followers the channel is far from.
    - It doubles render cost.
  - **The cost of the alternatives:**
    - Keeping 66 s plus the news lane costs about 2× render per video, adds policy exposure, and chases an audience that hasn't followed.
    - Doing nothing ships another video that teaches nothing.

VIDEO #2 (as advised by the Marshal; SUPERSEDED by A1, kept for the record):
- **Premise:** what if the Sun vanished? We'd keep its light for 8 min 20 s. The Marshal's cover line is "WHAT IF THE SUN VANISHED FOR 8 MIN 20 S?"
- **Length and sets:** 34 s, looping. Two sets: the bay from dusk into night, then space.
- **Frame 1:**
  - The bay at dusk, the silhouette on the pier, the Sun's disc blinking out.
  - The caption has the number in amber.
  - The counter is "LIGHT LEFT 8:20", running down.
  - A hit on frame 1 and the DRAMATIZATION tag. The AI label goes on at upload.
- **Structure:** the last light runs out, then the blackout (the Moon goes dark seconds later), then Earth leaves on a straight line into space, then it loops to frame 1.
- **Built from:**
  - `kit.js` bayWorld, crowd and hero;
  - `sky.js` (dusk to night, stars, Milky Way);
  - `ocean.js`;
  - `space.js` Earth;
  - the overlay counter and `audio_core`;
  - a new `story.js` law.
- **First gate:** a half-scale night-bay frame test before committing to shots.

SLATE:
- **#3:** the Blaze Star (T CrB) nova, 3,000 light-years away, 34 s. Check whether it has erupted first.
- **#4:** the 10 km dinosaur-killer rock arrives over the bay. About 64 s if Gate A passes, otherwise 34 s.
- **#5:** open (the Moon vanishes, Earth spins 2× faster, or the Sun comes 2× closer). Chosen after the gates.

BATTLE-PLAN:
  - Read moon-2x at 48 h (2026-11-13 15:30 UTC): views, average watch, completion, 3 s hold, retention curve and traffic-source split. Log them in channel/results.csv.
  - **Gate A (2026-11-13):** if moon-2x averages 18 s or more watched, #4 is a 64 s length test. Otherwise every video is 30–38 s. AMENDED by A2: the bar is 13.4 s.
  - Post in one fixed slot (about 20:00 UTC, near A119's) with one fixed hashtag set. Use no political or weapons tags.
  - Fill hold_3s_pct, fyp_pct and the traffic source for every video. They're blank today.
  - Cadence: one video every 2–3 days from the shared bay rig.
  - **Gate B (after #5):** if no cover-text video beats 2,000 views, reconvene on the lane. AMENDED by A3: each remake is judged against its own original.
  - Verify the Creator Rewards thresholds in TikTok Studio by 2026-11-18.

PLAYBOOK CHANGES (applied at the seal):
  - **Amend line 9:** 30–38 s is the default. 61–70 s only for a flagged length test, until the Creator Rewards thresholds are verified.
  - **Add:** every cover is a verifiable fact claim with a number.
  - **Add:** no real people, countries, conflicts or weapons in the cover, caption or hashtags. Never use #trump, #iran, #israel, #war or #doomsday.
  - **Add:** a payoff or visible escalation by 0:03, with no calm exposition shot before it.
  - **Add:** keep the hashtag set and the post slot constant across the next 5 videos.
  - **Keep line 29 (AI label)** and add a pre-publish tick-box.

AMENDMENTS (from the Tenth Man; ADOPTED at the seal):
  - **A1: video #2 obeys its own fact.**
    - On frame 1 the Sun is still up, under a claim like "THE SUN IS GONE. | ITS LIGHT ISN'T."
    - The counter runs down the real light-travel time for the post date (8 min 13 s in mid-November).
    - The blackout is the climax near 0:28, followed by a hard loop back to sunlight.
    - Drop "TO LIVE" and the space ending. This is a one-off waiver of "ends in space" (PLAYBOOK.md:17).
    - The bet left: a countdown in which nothing on Earth visibly changes.
  - **A2: a gate that can pass.** Gate A passes if moon-2x's average watch beats 13.4 s, the best 34 s average on record, whatever its views. In that case #4 is the 64 s length test.
  - **A3: judge each remake against its own original.**
    - Before #2, log the dinosaur post's full analytics (average watch and For You share).
    - Judge #2 against the old Sun post (1,029 views, 13.4 s) and #4 against the old dinosaur post (546 views).
    - Gate B then fires only if the remakes don't beat their originals, not on a flat 2,000 views.

BASELINE:
  - The sample is too small (a handful of posts, 0–4 follows each) to justify a 5-video plan and a lane switch. The only reach winners came from the Trump/nuke framing being dropped.
  - Dropping the controversial hashtags and framing will probably cut reach. The Sun video got only 1,029 views despite strong retention, and retention doesn't fix weak distribution.
  - Going to 34 s abandons the possible 61 s+ Creator Rewards threshold before it's checked, because verification on 11-18 comes after #2 and #3 are committed. The length test is also confounded, since topic and length change at once and 2–3 day cadence gives too few data points.

HOW-WE-LOSE:
  - by: The Tenth Man
    axis: premise physics, the hook rule and the look bar
    claim: Video #2 as advised has no honest board the rules allow. Frame 1 shows the Sun's disc going out while the counter reads "LIGHT LEFT 8:20". But nothing visible changes until that light runs out, so the picture contradicts the very number the new cover rule calls verifiable. Rendered honestly, the back half is two images the look bar bans (PLAYBOOK.md:73–74). The first is a bay with no twilight, whose Moon goes dark 1–3 s later. The second is a sunless Earth, which space.js draws half pitch-black, because its city lights only appear on the side facing away from the Sun. Earth "leaving on a straight line" can't be seen either: it strays only about 38 km from its orbit in an hour. The only gate, one night-bay frame, tests neither the hook nor the space ending.
    grounding: engine/src/space.js:45
    failure-world: "2026-11-20: The night-bay frame passed, so #2 shipped as advised. The top comment was 'if you can SEE it go dark, the 8 minutes are already up.' The back half played as a black bay and a dark, motionless Earth, and the average watch fell below the old uncaptioned Sun post's 13.4 s. The council logged 'Sun at 34 s doesn't hold', which poisoned the first arm of the length test."
    predictability: novel
    status: defused (A1 adopted)
  - by: The Tenth Man
    axis: measurement
    claim: Gate A is built not to pass. It asks moon-2x for an average watch of 18 s or more. That's above every average on record (17.8 s at most) and above the council's own 13.2–17.5 s forecast for a 66 s film. Averages also fall as a video spreads wider: A119 held 9.0 s over 7,013 views, while the Sun's 13.4 s was measured at about 820 views (3 h 04 m ÷ 13.4 s). So a 66 s film that holds viewers longer than every short still fails the gate, and a breakout fails it hardest.
    grounding: channel/analytics/2026-11-11-snapshot.md:11
    failure-world: "2027-01-15: moon-2x became the lane's first breakout and settled at 15.6 s a view, more than any short has held, so Gate A failed it. Every film since has been 34 s at 9–11 s a view. The PLAYBOOK now says 'long failed' about the channel's best film, and the promised length test never ran."
    predictability: novel
    status: defused (A2 adopted)
  - by: The Tenth Man
    axis: data
    claim: The packaging bet has already been tested once in this lane, and it lost. The fact-claim cover "THE DINOSAUR KILLER WAS TALLER THAN EVEREST" drew 546 views in its first week. That's about half of the uncaptioned Sun video's 1,029, and the Sun video was posted at dawn. Slot #4 re-shoots that very post.
    grounding: channel/analytics/2026-11-11-snapshot.md:27
    failure-world: "2026-11-28: #2–#5 all carried number-claim covers and landed at 400–900 views, with 0–1 follows each. Gate B fired, and two weeks of renders re-learned what the snapshot already showed. The cover, look, post slot, AI label and hashtags all changed at once, so nobody could say which one failed."
    predictability: predictable
    status: defused (A3 adopted)
  - by: The Data Skeptic
    axis: knowledge vs assumption
    claim: Committing a lane and a length on the strength of one viral-ish post and one retention outlier locks in a style the data can't support. Post time, hashtags and account age are all confounded.
    grounding: channel/analytics/2026-11-11-snapshot.md:51
    status: bet-accepted (length stays a test; lane chosen on policy risk, not on reach data)
  - by: The Showrunner
    axis: story shape
    claim: The series turns into one template ("the same bay, a bigger number"), and viewers stop following by episode 2 because every rung looks the same.
    grounding: PLAYBOOK.md:61
    status: bet-accepted (each episode must change a different thing in the world)
  - by: The Scroller
    axis: the cold viewer
    claim: A 34 s video escalating every 3–4 s can feel frantic and unearned. If viewers still leave by 0:10, the problem is the frame-1 image, not the length.
    grounding: speculative
    status: bet-accepted (read the retention curve, not just the average)
  - by: The Producer
    axis: feasibility
    claim: Removing the main light source leaves dark, near-empty frames, which the look bar forbids. Starlight alone may not carry the frame at 540×960.
    grounding: PLAYBOOK.md:73
    status: not-defused (gate: the half-scale night-bay frame test before shots are committed)
  - by: The Platform Officer
    axis: platform rules
    claim: If the channel drifts back to "Will [leader] nuke X?", the unverified-crisis rule makes those posts ineligible for For You and may drag down the account. Skipping the AI label is the second risk.
    grounding: channel/analytics/2026-11-11-snapshot.md:39
    status: defused (the safe-lane rule and the pre-publish tick-box)

## Open after the seal
- **Gate 0 (before any #2 shots):** a half-scale frame test of the bay after the blackout, using the Producer's risk (PLAYBOOK.md:73).
  - The frame has lamps, windows, the lighthouse, the crowd's phone screens and the full Milky Way.
  - With A1 there is no space ending, so the dark-Earth problem in engine/src/space.js:45 only needs fixing if a sunless Earth is ever shown.
- **2026-11-13 15:30 UTC:** read moon-2x at 48 h, then decide Gate A. Collect:
  - views, average watch and completion;
  - 3 s hold;
  - the retention curve;
  - the traffic-source split;
  - the account's follower total.
- **Before #2 posts:**
  - Match the countdown to the post date: about 8 min 13 s in mid-November. 8 min 20 s is the yearly average.
  - Log the dinosaur post's full analytics (A3).
- **Before #3:** check whether T CrB has erupted. The old cover said it was "about to".
- **By 2026-11-18:** check the Creator Rewards thresholds in TikTok Studio.
- **At the seal:** apply the PLAYBOOK changes (plus any adopted amendments) and commit.

## Process note: the baseline was not blind
- **What happened:**
  - The Tenth Man read this dossier while it was being drafted: it was saved in the repo, and his entries cite it.
  - The draft already contained the chief-of-staff notes and the BASELINE, so he could see the baseline.
  - His two "novel" scores are therefore weaker evidence than usual. He may have steered around the baseline rather than found mechanisms outside it on his own.
- **What still holds:** his mechanisms were checked separately.
  - The citations open.
  - The 38 km orbit drift (38.4 km in 1 h at 29.8 km/s) and the ~820-view figure (11,040 s ÷ 13.4 s) are correct.
  - space.js does gate city lights by the Sun's direction.
- **Why no push-back on the third objection:** he wasn't sent back on the predictable one. Two of his three objections were already novel, and a second pass could not be blind.
- **Fix for next time:** drafts stay in the scratchpad until the Tenth Man has reported.

## Note to the Commander
- **The dissent:**
  - Two failure mechanisms are outside the baseline. Video #2 contradicts its own fact (A1), and Gate A can't pass (A2).
  - The third (A3) is the obvious risk, now with evidence: a fact-claim cover in this lane has already lost to no cover.
  - All three fixes are cheap.
- **A1 is a real creative change.** Video #2 becomes a suspense countdown ("the Sun is gone; its light isn't"), not an escalation ladder. For one video it also waives "ends in space".

## Post-seal note (2026-11-11, about 21:00 UTC)
- **Video #2 was scrapped by the Commander:** "I don't want a repeat of an old video... run a new original idea through."
- **Why it was a repeat twice over:**
  - The Sun countdown remade our own "The sun just went dark".
  - It also matched a popular niche video, Bolt Games' "What if the Sun disappeared? You wouldn't even know for 8 minutes" (101.3K likes; `channel/references/2026-11-11-niche.md`).
- **Why the council missed it:** none of the officers checked the niche for originality.
- **What still stands:** the rest of the seal (lane safety, measurement, Gates A and B). Amendment A1 is void.
- **Next:** a new War Room decides Studio v2's format and an original video #2.
