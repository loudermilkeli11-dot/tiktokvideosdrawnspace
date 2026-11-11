// moon-2x overlay: captions + live counter for the full 66 s film. Look: documentary (channel default).
// The counter follows the SAME law as the picture (src/story.js): the gap halves every 5 s, continuously.
import { cap } from '../../tools/overlay/helpers.js';
const G0 = 384400 - 1737.4 - 6371.0;
const GAP = (storyT) => G0 * Math.pow(2, -storyT / 5);
const KM = (v) => Math.round(v).toLocaleString('en-US') + ' KM';
// film time -> displayed gap. Hook 0–3: storyT 25..28. 3.0–3.2: rewind spin (log-space) from the hook's last value up to today.
function gapAt(t) {
  if (t < 3) return GAP(25 + t);
  if (t < 3.2) { const a = Math.log(GAP(28)), b = Math.log(G0); const u = (t - 3) / 0.2; return Math.exp(a + (b - a) * (u * u * (3 - 2 * u))); }
  return GAP(t - 3);
}
export default () => ({
  captions: [
    cap(0.0, 3.0, 'What if the Moon | kept coming 2× closer?', ['2×', 'CLOSER']),
    cap(3.0, 6.0, 'Today it drifts away | 3.8 cm a year', ['3.8', 'CM']),
    cap(6.0, 9.0, 'Now the gap halves | every 5 seconds', ['HALVES']),
    cap(9.5, 12.8, 'Tides are 14× stronger | and climbing', ['14×']),
    cap(13.5, 17.5, 'The sea climbs | into the streets', ['STREETS']),
    cap(18.5, 22.5, 'The grid fails. | Moonlight takes over.', ['MOONLIGHT']),
    cap(23.5, 27.5, 'Every camera on Earth | points up', ['UP']),
    cap(28.3, 32.8, 'The Roche limit. | Earth starts tearing it.', ['ROCHE', 'LIMIT']),
    cap(33.5, 37.5, 'The Moon | breaks apart', ['BREAKS', 'APART']),
    cap(38.5, 42.5, 'And the sky | starts falling', ['FALLING']),
    cap(43.5, 47.5, 'A ring of Moon rock | wraps Earth', ['EARTH']),
    cap(48.5, 52.5, 'Nearing the | space station\'s orbit', ['SPACE', "STATION'S"]),
    cap(53.5, 56.8, '50 seconds. | That\'s all it took.', ['50', 'SECONDS']),
    cap(59.0, 63.0, 'The Moon | is now a ring.', ['RING']),
  ],
  counter: [
    { t0: 0.0, t1: 3.0, label: 'Gap to the Moon', value: gapAt, format: KM, steps: [] },
    { t0: 3.0, t1: 6.0, label: 'Gap · Today', value: gapAt, format: KM, steps: [] },
    { t0: 6.0, t1: 43.4, label: 'Gap to the Moon', value: gapAt, format: KM, steps: [8, 13, 18, 23, 28, 33, 38, 43] },
    { t0: 43.4, t1: 66.0, label: 'Gap to the debris', value: gapAt, format: KM, steps: [48, 53, 58, 63] },
  ],
  tags: [
    { t0: 0.0, t1: 3.0, text: 'Dramatization' },
    { t0: 3.0, t1: 6.0, text: 'Source: lunar laser ranging' },
    { t0: 6.0, t1: 66.0, text: 'Dramatization' },
  ],
});
