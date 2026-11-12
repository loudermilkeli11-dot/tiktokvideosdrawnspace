// s01_bay (film 0.0–1.5): FRAME 1. Noon, the fjord bay from behind the hero (yellow raincoat) at the pier rail, 28 mm, locked.
// Frame 1 is already moving: the crack on the head wall has opened and the slab is sliding; dust sheds off it; the gulls burst
// off the pier end; the crowd points and films. The slab reaches the water at 1.5 s (T.impact): hard cut on the boom.
import { frame1World } from './frame1.js';
import { SHOT } from './story.js';
const F = frame1World({ samples: 4 });
F.S.run((t) => { const tt = t - 4; F.update(SHOT.s01_bay.t0 + tt, t); });
