# Invisible Journeys Playbook

Code-rendered what-if blockbusters for TikTok ("What if the Moon got 2× closer every 5 seconds?").
The owner is the Commander. The target is good quality, fast.

## 1. The creative formula (non-negotiable)

### Format
- 61–70 s long, because Creator Rewards needs more than 60 s.
- 1080×1920, 30 fps, H.264, MP4 under 100 MB.
- Mastered to about −14 LUFS, with peaks at or below −1 dBTP.

### Story
- The story is based on facts the way a Michael Bay movie is: one real fact lights the fuse, then everything goes huge.
- There is one character, seen only from behind or in silhouette. No faces, no real people, no children, no gore.
- One absurd change escalates in 8–12 steps (×2 or ×10 each), with a live counter on screen.
- It ends in space, and the last frame hard-cuts to frame 1 so the video loops.

### No voiceover, ever
- Captions and sound design tell the story.
- Captions are 8 words or fewer and stay on screen for at least 2.8 s.
- Captions use Anton with a thick black outline and a hard shadow. The counter uses Azeret Mono.
- Speculative shots are tagged `DRAMATIZATION`.
- No engagement bait. No fluffy smoke or fog.

### Frame-1 hook
The question on screen, the character in mid-chaos and a sound hit, all on the first frame.

### Layout (design px at 540×960)
- Captions sit at y 230–350, over a calm, darkish background.
- The counter panel sits at y 129–210.
- The key action stays in y 350–640.
- The bottom third (y > 640) is scenery only, because TikTok's UI covers it.

### Topic test (a pitch must pass all of these)
- It works as a trailer.
- It has a character.
- The premise fits in 10 words or fewer and includes a number.
- It escalates.
- It ends in space and loops.
- It has one real fact.

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

## 3. Production targets

- Under 3 hours per video once the studio exists, using at most 3 sets, with most shots in one rich set.
- One critic pass on the board, then a final check. Review loops cost 10–20 min each and missed the big problems.
- Never claim a video will go viral. Learn from `channel/results.csv` (3 s hold, completion, rewatch, shares).
