// Example overlay spec. Times are film seconds. See tools/overlay/helpers.js for the helper API.
import { cap, stepValue, stepTimes, fmt, shot } from '../../tools/overlay/helpers.js';

const STEPS = [[0.0, 1], [0.8, 2], [1.4, 4], [1.9, 1024]];

export default (info) => ({
  captions: [
    cap(0.0, shot(info, 'intro').t1, 'Every second it doubles', ['DOUBLES']),
    cap(shot(info, 'reveal').t0, info.duration, 'Until the moon is gone', ['MOON']),
  ],
  counter: {
    t0: 0.2, t1: info.duration,
    label: 'Moon distance',
    value: stepValue(STEPS),
    format: fmt.times,
    steps: stepTimes(STEPS).slice(1),   // optional: exact pulse times (else auto-detect value change)
  },
  tags: [{ t0: 0, t1: info.duration, text: 'Dramatization' }],
  // optional: style overrides, e.g. style: { accent: '#FFD23F', capSize: 46 }
  // optional: draw(ctx, t, frame) hook for bespoke elements (ctx in 540x960 design units); return false if nothing drawn
});
