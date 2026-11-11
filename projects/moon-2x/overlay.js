// moon-2x overlay (WIP: hook only). Look: documentary (channel default).
import { cap } from '../../tools/overlay/helpers.js';
const GAP = (storyT) => (384400 - 1737.4 - 6371.0) * Math.pow(2, -storyT / 5);   // mirrors src/story.js
export default () => ({
  captions: [cap(0.0, 3.0, 'What if the Moon | kept coming 2× closer?', ['2×', 'CLOSER'])],
  // live countdown: same law as the picture (src/story.js) — the gap halves every 5 s; hook = story time 25 s
  counter: { t0: 0.0, t1: 3.0, label: 'Gap to the Moon', value: (t) => GAP(25 + t), format: (v) => Math.round(v).toLocaleString('en-US') + ' KM', steps: [] },
  tags: [{ t0: 0, t1: 3.0, text: 'Dramatization' }],
});
