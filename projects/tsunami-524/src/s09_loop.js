// s09_loop (film 29.5–30.5): the hard cut back to the bay on the loop hit. This page IS frame 1's world one second earlier:
// s01's world at film time -1.0 .. 0 (calm crowd, gulls idling; the crack starts in the last ~0.35 s), so when TikTok restarts
// the video, frame 1 continues the motion seamlessly. Overlay: the counter frozen at 01.500, as on frame 1.
import { frame1World } from './frame1.js';
import { SHOT } from './story.js';
const F = frame1World({ samples: 4 });
F.S.run((t) => { const tt = t - 4; F.update(SHOT.s01_bay.t0 - SHOT.s09_loop.dur + tt, t); });
