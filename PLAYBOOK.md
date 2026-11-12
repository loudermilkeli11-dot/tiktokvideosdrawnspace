# Invisible Journeys Playbook

Code-rendered what-if blockbusters for TikTok ("What if the Moon got 2× closer every 5 seconds?").
The owner is the Commander. The target is good quality, fast.

## 1. The creative formula (non-negotiable)

### Format
- 30–38 s long by default. Use 61–70 s only for a flagged length test, until the Creator Rewards thresholds are verified in TikTok Studio
  (sealed 2026-11-11 in `channel/war-room/2026-11-11-channel-strategy.md`).
- 1080×1920, 30 fps, H.264, MP4 under 100 MB.
- Mastered to about −14 LUFS, with peaks at or below −1 dBTP.

### Story
- **The lane** (sealed 2026-11-11): natural-sky catastrophes built on one true number (the Sun, the Moon, stars, asteroids).
- No real people, countries, conflicts or weapons in the cover, caption or hashtags. Never use #trump, #iran, #israel, #war or #doomsday.
- The story is based on facts the way a Michael Bay movie is: one real fact lights the fuse, then everything goes huge.
- There is one character, seen only from behind or in silhouette. No faces, no real people, no children, no gore.
- One absurd change escalates in 8–12 steps (×2 or ×10 each), with a live counter on screen.
- It ends in space, and the last frame hard-cuts to frame 1 so the video loops.

### No voiceover, ever
- Captions and sound design tell the story.
- Captions are 8 words or fewer and stay on screen for at least 2.8 s.
- Look: **Documentary** (the Commander's choice, 2026-11-11).
  - Captions are Big Shoulders Display 900, uppercase, with the payoff words in amber (#FFB347).
  - They get a soft shadow and a dark top scrim, not a cartoon outline.
  - The counter is boxless: an amber rule, a tracked Inter Tight label and a big Inter Tight 800 value.
  - It's the default in `tools/overlay/ov.html`. `style: { look: 'classic' }` restores the old Anton / Azeret Mono look.
  - Use `|` in a caption to choose the line break.
- Speculative shots are tagged `DRAMATIZATION`.
- **Turn on TikTok's "AI-generated" label on every post.** TikTok requires a label on AI-generated or significantly edited content that shows realistic-looking scenes or people (Community Guidelines → Integrity & Authenticity, checked 2026-11-11). Our renders are realistic, synthetic scenes of events that never happened. Unlabeled posts "may be removed, restricted, or labeled by our team." The on-screen DRAMATIZATION tag does not replace the platform label.
- No engagement bait. No fluffy smoke or fog.

### Frame-1 hook and the first 3 seconds
- The cover states a verifiable fact claim with a number.
- Frame 1 has the claim on screen, the character and a sound hit.
- A payoff or a visible escalation lands by 0:03, with no calm exposition shot before it.

### Layout (design px at 540×960)
- **Safe area (measured on the Commander's iPhone, 2026-11-12):** TikTok fills a tall phone by cropping about 48 px off each side of a 9:16 video, and its UI covers the top bar (y < 100), the right button rail (x > 440 for y 430–870) and the caption block (y > 765).
  - All type stays in x 60–480 and y 100–765, and left of x 440 in the rail band. gravity-flip v1 broke this: the DRAMATIZATION tag and the counter's left edge were cut off.
  - `ov.html` v2 defaults respect it (tag and counter at x 64, titles ≤ 410 wide, captions ≤ 330 wide). `check.py` WARNs on any overlay text outside it.
- Title around y 170; counter at y 384–470 (mid-left); captions centred on y 590, over a calm or banded background.
- The key action stays in y 200–640 and away from the side 60 px.
- The bottom fifth (y > 765) is scenery only.

### Topic test (a pitch must pass all of these)
- It works as a trailer.
- It has a character.
- The premise fits in 10 words or fewer and includes a number.
- It escalates.
- It ends in space and loops.
- It has one real fact.

### Posting (sealed 2026-11-11)
- Use one fixed post slot (about 20:00 UTC, 2 PM Central) and one fixed hashtag set across the next 5 videos, so the results can be compared.
- Pre-publish tick-box:
  - the AI label is on;
  - the DRAMATIZATION tag is visible;
  - there's no question to the viewer and no comment prompt;
  - the cover states a verifiable fact;
  - the fixed hashtag set and the fixed slot are used.
- At 48 h, log the video in `channel/results.csv`, including the 3 s hold, the For You share, the traffic-source split and where the retention curve drops most.

## 2. The look bar (why v1 was rejected)

The Commander rejected a full v1 video, "What if the Moon got 2× closer every 5 seconds?", for being "cheap: a 2D moon, an empty sea,
bland transitions, jumpy animation." Every shot must clear this bar.

1. **Real 3D from real data.**
   - Use three.js PBR (r169), never 2D or SDF clip art.
   - The Moon is a sphere shaded live from NASA's LROC colour map and LOLA elevation (turned into a normal map), with
     Lommel-Seeliger shading, terminator shadows, earthshine, and atmospheric haze when it's low.
   - Never bake lighting into a texture. Use CC0 Poly Haven assets wherever they help.
2. **A living world that reacts.**
   - Every Earth shot has crowds (featureless adult silhouettes with phones), lights, boats, birds and waves.
   - Each step changes the whole frame (light, tide, sky), not just the size of one object.
3. **Motivated transitions.** Use push-ins, whip-pans with blur, match cuts on a shape and foreground wipes.
   A hard cut lands only on a sound hit.
4. **Smooth motion.**
   - Use sub-frame motion blur at 180° (4 samples for calm shots, 8 for moving, 12 for fast).
   - Camera paths are eased, and shake is smoothed noise.
   - No white strobes. Nothing moves more than 40 px per frame without blur.
5. **Cinematic finish.** ACES tone mapping, bloom, fine grain, vignette, and a lens chosen per shot.
6. **Known cheap-looking things to avoid:**
   - capsule or mannequin people taller than about 70 px;
   - box buildings without window variety;
   - flat white waterfall strips;
   - dark, near-empty frames;
   - an all-night-side Earth;
   - "rain" streak textures on water;
   - big blocky hero figures. Keep the character a small, clean silhouette.
7. **People** come from `engine/src/figure.js`: smooth posed bodies with real proportions, hair, coats and bags, never primitives.
   Pose them with `POSES` (hand targets), and keep the hero at about 55–80 design px tall.
8. **Lenses:** for a giant body in the sky, use a long lens (70–135 mm) from low and far away. This compresses the hero against the disc.
   Leading lines (a pier, a road, rails) point at the hero.

## 3. Production targets

- Under 3 hours per video once the studio exists, using at most 3 sets, with most shots in one rich set.
- One critic pass on the board, then a final check. Review loops cost 10–20 min each and missed the big problems.
- Never claim a video will go viral. Learn from `channel/results.csv` (3 s hold, completion, rewatch, shares).
