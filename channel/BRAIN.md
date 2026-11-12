# Channel brain: what we know (read this before every task)

This is the short, living summary of everything the channel has learned. Every War Room agent gets it in full before every task.
The **Analyst** keeps it current: after each 48 h stats log or post-mortem, update **Evidence** and **Lessons**, and keep the file under about 1,000 words.
Sources are cited, so check them when a decision depends on a detail.

## The channel
- **Invisible Journeys** (TikTok): code-rendered "what if" disaster videos about space and science. Every frame is rendered by our own engine (`engine/`), never AI video.
- **Owner:** the Commander, on US Central time.
- **Lane (sealed 2026-11-11):** natural sky and physics catastrophes with ONE true number. Never news, politicians, countries, conflicts or weapons (`channel/war-room/2026-11-11-channel-strategy.md`).

## Evidence (numbers; newest first)
| video | length | views | avg watch | watched full | notes |
|---|---|---|---|---|---|
| gravity-flip (v2 format) | 38 s | 326 at 1 h | ? | ? | posted 2026-11-11 about 6:30 PM CT; 19 likes, 2 comments, 1 save at 1 h |
| moon-2x (studio film #1) | 66 s | 314, flat from 1 h to 8 h | ? | ? | stalled after TikTok's first test batch |
| A119 "nuke the moon" | 34 s | 7,013 | 9.0 s | 8.1% | best reach, but #trump/#nuke tags; 0.57 follows per 1,000 views |
| Pickaxe (Iran) | 88.5 s | 4,833 | 17.8 s | 2.8% | political; asked for comments |
| Sun went dark | 34 s | 1,029 | 13.4 s | 22.7% | best hold; no cover text |
| dinosaur killer / rods from God / Halloween meteors | short | 546 / 315 / 270 (7 d) | — | — | pre-studio |
- Full log: `channel/results.csv`. Snapshot and platform rules: `channel/analytics/2026-11-11-snapshot.md`.
- **Gaps we still need every time:** the 3 s hold, the retention curve (where people leave), the For You share and the traffic sources.

## Lessons (7 rows of real stats, 2 of them studio films: every conclusion is a guess)
- **Likes per view at 1 h:** gravity-flip 19/326 = 5.8%. The Sun video ended at 6.3%, A119 at 1.9% and Pickaxe at 2.5%. Early engagement on the v2 format looks healthy, but 19 likes is a tiny sample.
- **Reach is the gap.** moon-2x had about 300 views at 1 h and then stalled at 314. gravity-flip has 326 at 1 h, so it is on the same track. Whether it passes 1,000 depends on whether TikTok widens the test batch, and a screenshot of the video page can't show that.
- **Viewers reply with premises.** One comment ("What if your inside") asks about being indoors. We answered "You'd still be crushed by somet…". A comment-sourced follow-up is free pitch material, but check it against the Never list.
- **Still missing:** average watch, watched-full %, the 3 s hold, For You share and the retention curve. The 1 h screenshot was the video page, not TikTok Studio analytics. Shares weren't visible either.

## What the niche's hits do (`channel/references/2026-11-11-niche.md`)
- They pick a premise anyone gets in 5 words: "What if [a basic thing] vanished/flipped for 5 seconds?"
- A countdown to the event is on screen from frame 1, often with milliseconds.
- They use a bright, clean, stylised daylight world full of everyday places and simple people.
- The event changes the WHOLE frame at once, then new counters track the aftermath.
- Hits get 100K–466K likes. Saves run 5–9% of likes, and ours are already inside that range. **Our gap is reach and shares, not saves.**

## The Commander's taste (learned from their calls; follow it)
- **They want chaos and drama:** something crazy happening on screen, big visible disasters, aftermath (tsunamis, impacts, things flying into space). "Interesting to look at" is not enough.
- **Rejected as boring:** ice sinking, sound stopping, falling through the Earth, see-through Earth ("not much chaos and drama"), and a remake of the Sun video (a repeat of their own post and of a popular niche video).
- **Liked:** the gravity flip, with several locations (city, bay, sky, orbit), escalating steps (5 s → 1 min → 10 min), and planes flying off into space.
- **Never:** remake our own past premises or the niche's (the Sun vanishing, protons/neutrons vanishing, A119, Pickaxe, dinosaur killer, rods from God, meteors, the Blaze Star, the Moon 2× closer).
- **Visuals:** full-colour people and places, not silhouettes. Daylight first, then escalate.
- **Speed:** they hate waiting. Ship fast and give honest ETAs in Central time.

## The format that ships (Studio v2; `PLAYBOOK.md`)
- **Length:** 30–38 s by default. 61–70 s only as a flagged test.
- **Frame 1:** the title question with one accent word ("What if gravity *flipped* for 5 seconds?"), a mid-left counter (label / number / fact line) already running, and DRAMATIZATION shown.
- **By 0:03:** a visible payoff or escalation, with no calm exposition shot first.
- **Then:** escalating steps, each with a new location or counter, and captions of 6–8 words.
- **Ending:** ends big (space works) and hard-cuts back to frame 1 for the loop.
- **Sound:** no voiceover; ticks, risers, hits on cuts, silence as the last beat.
- **Text:** stays inside TikTok's safe area: x 60–480 and y 100–765 (design px at 540×960), and off the right button rail.
- **Physics:** ONE honest law per video (`projects/<slug>/src/story.js`), with the one stated liberty shown as DRAMATIZATION. Every number on screen is computed from it.

## Posting (sealed)
- **Cover:** a verifiable fact with a number, e.g. "5 SECONDS OF FLIPPED GRAVITY WOULD THROW YOU 245 M UP".
- **Slot:** one fixed slot (about 2 PM Central) and one fixed hashtag set: `#whatif #physics #space #earth #science`.
- **Labels:** turn on TikTok's AI-generated label every time.
- **Caption:** no questions to the viewer and no comment bait.
- **At 48 h:** log views, average watch, watched-full, the 3 s hold, For You share, traffic sources, and where the retention curve drops.

## Production facts (what is cheap or expensive)
- **Rendering on the Commander's PC GPU:** about 0.1–0.2 s per frame, so a full video renders in minutes with `pc/render_project.ps1 <slug>`. The building is the slow part, not the rendering.
- **Ready-made sets and effects (reuse them; new sets cost the most):**
  - **Places:** a city plaza with crowds, cars and a fountain; a horseshoe bay with a town, pier, boats and a lighthouse.
  - **Sky and space:** the cloud deck from above, a sky from day to night, Earth from orbit (day, night, clouds, surf, scars), a generic space station and airliners.
  - **Disasters:** a lifted sea and splash/tsunami surge, ocean/air shells peeling off the planet, a planet-wide meteor storm, flames, and the Moon breaking into chunks with a debris ring.
- **Typical build:** 9–13 shots. Most of the time goes to new effects.

## Open questions (update as they resolve)
- **Gate A (2026-11-13):** is moon-2x's average watch above 13.4 s? Yes → video #4 is a 64 s length test; no → stay at 30–38 s.
- Does the gravity flip beat 1,029 views (the Sun video, our best clean-lane post), or does it stall near 330 like moon-2x? Next check: 8 h, then 48 h (~2026-11-14 00:30 UTC). Both studio films were posted outside the fixed 2 PM CT slot, so slot is a confound.
- What is the 3 s hold for the v2 format? We need the retention curve.
