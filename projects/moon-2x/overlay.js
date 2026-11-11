// moon-2x overlay (WIP: hook only). Look: documentary (channel default).
import { cap } from '../../tools/overlay/helpers.js';
export default () => ({
  captions: [cap(0.0, 3.0, 'What if the Moon | kept coming 2× closer?', ['2×', 'CLOSER'])],
  counter: { t0: 0.0, t1: 3.0, label: 'Gap to the Moon', value: () => '11,759 KM', steps: [] },
  tags: [{ t0: 0, t1: 3.0, text: 'Dramatization' }],
});
