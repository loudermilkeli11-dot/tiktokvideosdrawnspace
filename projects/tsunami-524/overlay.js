// tsunami-524 overlay (Studio v2, look 'v2' in tools/overlay/ov.html): title, captions, the live counter and the DRAMATIZATION
// tag for the full 30.5 s film. Board: script.md · brief: PRODUCTION.md §3, §6. Every counter number is COMPUTED from the law
// (src/story.js) at each film time, and every anchor comes from its T / SHOT tables, so a re-timed beat carries its type.
// Safe area (PLAYBOOK): type in x 60-480, y 100-765, left of x 440 for y 430-870; v2 defaults put the tag/counter at x 64.
import { cap } from '../../tools/overlay/helpers.js';
import {
  SHOT, T, FILM_LEN, RUNUP, YEAR, OCEAN_DEPTH, V_ESC, OCEAN_KM3, ROOF_M, ROOF_X,
  H, kmh, fuseAt, heightAt, riseAt, waterSpeedAt, oceanLeftAt,
} from './src/story.js';

// ---- formats
const n0 = (v) => Math.round(v).toLocaleString('en-US');
const METRES = (m) => `${n0(m)} M`;
const COUNTDOWN = (s) => { const ms = Math.round(Math.max(0, s) * 1000); return `${String(Math.floor(ms / 1000)).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`; };
const RISING = (t) => `rising at ${n0(kmh(riseAt(t)))} km/h`;
const PLACE = `Lituya Bay, Alaska ${YEAR}`;

// ---- counter segment over [t0, t1): label/value/fact are strings or functions of film time
const res = (v, t) => (typeof v === 'function' ? v(t) : v);
const seg = (t0, t1, o) => ({ t0, t1, format: (x) => x, band: o.band, label: (t) => res(o.label, t), value: (t) => res(o.value, t), fact: (t) => res(o.fact ?? '', t) });
const end = (name) => SHOT[name].t0 + SHOT[name].dur;

// ---- stronger backing bands where the picture is bright (A4 >= 3:1 after yuv420p): noon sky, spray, cloud deck, sunlit Earth
const BRIGHT = { a: 0.7, padY: 64, plateau: [0.74, 0.9] }, CLOUDS = { a: 0.78, padX: 130, padY: 64, plateau: [0.72, 0.9] };

// ---- captions: anchored to the beats; each starts at max(anchor, previous start + 2.8 s) and runs to the next one
const MIN = 2.8, frame = (t) => Math.round(t * 30) / 30;
function chain(items, stop) {
  const out = [];
  for (const [anchor, text, extra] of items) {
    const prev = out[out.length - 1], t0 = frame(prev ? Math.max(anchor, prev.t0 + MIN) : anchor);
    if (prev) prev.t1 = t0 + 1e-6;
    out.push(cap(t0, stop, text, [], extra));
  }
  return out;
}
const TITLE_OUT = 3.0;                                   // title holds through the impact; C1 follows it

export default () => ({
  style: { look: 'v2' },
  titles: [cap(0, TITLE_OUT, `What if a *${RUNUP} m* | wave hit town?`)],
  captions: chain([
    [TITLE_OUT, `Alaska, ${YEAR}. | It *climbed ${RUNUP} m.*`, { band: BRIGHT }],     // 3.0  over the spray on the slope
    [T.lighthouse - 0.7, 'It swallows | the *lighthouse.*', { band: BRIGHT }],          // 5.8
    [T.roofs - 0.4, 'Rooftops vanish | in *seconds.*'],                                 // 8.6
    [T.x2[0] + 0.9, 'Now make it | *twice* as tall.'],                                  // 11.4
    [T.x4[0] + 1.7, '*Four times.* | The sea stands up.'],                              // 14.2
    [T.x8[0] + 1.0, 'Taller than the | *ocean is deep.*', { band: CLOUDS }],            // 17.0
    [T.speed[0] + 0.5, 'The water | *leaves the planet.*', { band: BRIGHT }],           // 20.0
    [T.ocean[0], `*${(OCEAN_KM3 / 1e9).toFixed(1)} billion km³* | of ocean. Gone.`, { fadeOut: 0.3 }],   // 24.0
  ], T.ocean[1]),                                                                        // 27.5: no caption after; silence
  counter: [
    seg(SHOT.s01_bay.t0, end('s01_bay'), { label: 'Rockfall in', value: (t) => COUNTDOWN(fuseAt(t)), fact: PLACE }),
    seg(SHOT.s02_cliff.t0, end('s02_cliff'), { band: BRIGHT, label: 'Run-up', value: (t) => METRES(heightAt(t)), fact: `real · Lituya Bay ${YEAR}` }),
    seg(SHOT.s03_wall.t0, end('s03_wall'), { band: BRIGHT, label: 'Wave height', value: (t) => METRES(heightAt(t)), fact: RISING }),
    seg(SHOT.s04_town.t0, end('s04_town'), {
      label: 'Wave height', value: (t) => METRES(heightAt(t)),
      fact: (t) => (t < T.x2[0] ? `roofs ${ROOF_M} m → wave ${ROOF_X}× taller` : `×2 · ${RISING(t)}`),
    }),
    seg(SHOT.s05_standup.t0, end('s05_standup'), { band: BRIGHT, label: 'Wave height', value: (t) => METRES(heightAt(t)), fact: (t) => `×4 · ${RISING(t)}` }),
    seg(SHOT.s06_lift.t0, end('s06_lift'), { band: CLOUDS, label: 'Wave height', value: (t) => METRES(heightAt(t)), fact: `×8 · average ocean depth ${n0(OCEAN_DEPTH)} m` }),
    seg(SHOT.s07_peel.t0, end('s07_peel'), { band: BRIGHT, label: 'Water speed · km/h', value: (t) => n0(kmh(waterSpeedAt(t))), fact: `escape speed: ${(V_ESC / 1000).toFixed(1)} km/s` }),
    seg(SHOT.s08_tail.t0, end('s08_tail'), { label: 'Ocean left', value: (t) => `${Math.round(oceanLeftAt(t) * 100)}%`, fact: `${(OCEAN_KM3 / 1e9).toFixed(1)} billion km³` }),
    // s09: no counter over the orbit; the frozen frame-1 counter on the last bay second (identical to frame 1 for the loop)
    { ...seg(T.loopCut, FILM_LEN, { label: 'Rockfall in', value: () => COUNTDOWN(fuseAt(SHOT.s01_bay.t0)), fact: PLACE }), fadeIn: 0, fadeOut: 0 },   // frozen at 01.500 = frame 1
  ],
  tags: [{ t0: 0, t1: FILM_LEN, text: 'Dramatization · town and waves' }],
  _debug: { T, H: [0, 1, 2, 3].map(H), ROOF_M, ROOF_X },
});
