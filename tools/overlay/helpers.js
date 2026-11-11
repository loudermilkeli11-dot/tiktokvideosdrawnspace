// Helper API for projects/<slug>/overlay.js
//   import { cap, seq, stepValue, ramp, fmt, shot } from '../../tools/overlay/helpers.js';
// overlay.js may `export default {...}` or `export default (info) => ({...})`, where
// info = { fps, total, duration, shots: [{name, frames, start, end, t0, t1}], byName: {name: shot} }.

// caption: cap(t0, t1, 'TEXT here', ['HERE'])  (hl words matched case-insensitively, punctuation ignored)
export const cap = (t0, t1, text, hl = [], extra = {}) => ({ t0, t1, text, hl, ...extra });

// sequential captions: seq(start, [[dur, text, hl?], ...], gap=0) -> back-to-back captions
export function seq(start, items, gap = 0) {
  const out = []; let t = start;
  for (const [dur, text, hl] of items) { out.push(cap(t, t + dur, text, hl || [])); t += dur + gap; }
  return out;
}

// step function: value jumps at given times. stepValue([[t, v], ...]) -> (t)=>v
export function stepValue(pairs) {
  const p = [...pairs].sort((a, b) => a[0] - b[0]);
  return (t) => { let v = p[0][1]; for (const [ti, vi] of p) if (t >= ti) v = vi; return v; };
}
// times of a stepValue table (pass as counter.steps for exact pulse timing)
export const stepTimes = (pairs) => pairs.map(p => p[0]);

// smooth ramp from v0 to v1 between t0..t1 (ease: 'lin' | 'in' | 'out' | 'exp' (geometric))
export function ramp(t0, t1, v0, v1, ease = 'lin') {
  return (t) => {
    const x = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
    if (ease === 'exp') return v0 * Math.pow(v1 / v0, x);
    const k = ease === 'in' ? x * x : ease === 'out' ? 1 - (1 - x) * (1 - x) : x;
    return v0 + (v1 - v0) * k;
  };
}

// formatters
export const fmt = {
  int: (v) => Math.round(v).toLocaleString('en-US'),
  unit: (u, digits = 0) => (v) => Number(v).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }) + ' ' + u,
  times: (v) => '×' + Math.round(v).toLocaleString('en-US'),
  pct: (digits = 0) => (v) => Number(v).toFixed(digits) + '%',
};

// shot timing lookup from the info object: shot(info, 'name') -> {t0, t1, start, frames}
export const shot = (info, name) => {
  const s = info.byName[name];
  if (!s) throw new Error(`overlay.js: unknown shot '${name}'`);
  return s;
};
