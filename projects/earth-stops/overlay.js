// earth-stops overlay (Studio v2, look 'v2' in tools/overlay/ov.html): title, captions and the ONE running clock for the 65 s film.
// Board: script.md. Every number is COMPUTED from the law (src/story.js): the ground speed (381 m/s), the event clock e (ms),
// the per-shot energy rung, 1,372 km/h, the slow-motion factor. Caption times come from the SHOT table, so a re-timed shot
// carries its type. LOOK.md: clean shadowed text, NO bands: every item passes band: 0 (the tag's small default band can't be
// switched off from here; it sits on the sky).
import { cap } from '../../tools/overlay/helpers.js';
import { SHOT, FILM_LEN, T_STOP, T_LABEL, T_RESTORE, evAt, factLine, SHOW } from './src/story.js';

const s = (n) => SHOT[n].t0, end = (n) => SHOT[n].t0 + SHOT[n].dur;
const NB = { band: 0 };
const c = (t0, t1, text) => cap(t0, t1 + 1e-6, text, [], NB);                     // + 1 µs: a 2.8 s caption never reads 2.7999
const SPEED_FACT = "EARTH'S SPIN HERE · 35°N";
const clock = (t) => `${evAt(t).toFixed(3)} s`;                                    // 0.000 -> 5.000, milliseconds rolling
// one counter segment per shot after the label flips: STOPPED FOR / e / the shot's energy rung
const run = (name, t0 = s(name), t1 = end(name)) => ({ t0, t1, band: 0, format: (x) => x, label: 'Stopped for', value: clock, fact: factLine(name) });

export default () => ({
  style: { look: 'v2' },
  titles: [
    cap(0, 3.6, 'What if the Earth *stopped spinning* | for 5 seconds?', [], NB),
    cap(s('s09_loop'), FILM_LEN + 0.01, 'What if the Earth *stopped spinning* | for 5 seconds?', [], { ...NB, fadeIn: 0, fadeOut: 0 }),   // = frame 1 (loop)
  ],
  captions: [
    c(4.0, 7.7, 'The ground stops. | Everything else *keeps going.*'),
    c(8.4, 14.6, `${SHOW.kmh} km/h. | *Faster than sound.*`),
    c(15.4, 21.6, 'The tops of towers | *shear off* sideways.'),
    c(22.4, 28.6, 'Everything upwind | is *still coming.*'),
    c(29.4, 36.1, 'The whole bay | *slides east.*'),
    c(36.9, 43.1, 'It climbs right | *over the town.*'),
    c(43.9, 51.6, 'Every east-facing coast | *gets hit.*'),
    c(52.4, 59.6, 'Every ocean | *keeps going too.*'),
    c(60.2, 63.3, 'At 5 seconds, | it *spins again.*'),
  ],
  counter: [
    { t0: 0, t1: T_STOP, band: 0, format: (x) => x, label: 'Ground speed', value: () => `${SHOW.v} m/s`, fact: SPEED_FACT, fadeIn: 0 },
    { t0: T_STOP, t1: T_LABEL, band: 0, format: (x) => x, label: 'Ground speed', value: () => '0 m/s', fact: 'THE GROUND JUST STOPPED' },
    run('s01_plaza', T_LABEL), run('s02_street'), run('s03_towers'), run('s04_river'), run('s05_bay'), run('s06_town'), run('s07_coast'),
    run('s08_earth', s('s08_earth'), T_RESTORE),
    { t0: T_RESTORE, t1: end('s08_earth'), band: 0, format: (x) => x, label: 'Spin restored', value: () => '5.000 s', fact: `GROUND SPEED BACK TO ${SHOW.v} m/s` },
    { t0: s('s09_loop'), t1: FILM_LEN + 0.01, band: 0, format: (x) => x, label: 'Ground speed', value: () => `${SHOW.v} m/s`, fact: SPEED_FACT, fadeIn: 0 },   // = frame 1
  ],
  tags: [{ t0: 0, t1: FILM_LEN + 0.01, band: 0, text: `Dramatization · shown ${SHOW.slow}× slower` }],   // ov.html v2Tag ignores band (NEEDS APPROVAL, FINAL)
});
