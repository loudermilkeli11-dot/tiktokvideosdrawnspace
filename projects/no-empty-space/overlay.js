// no-empty-space overlay (Studio v2, look 'v2' in tools/overlay/ov.html): title, captions, the end card and ONE counter that
// tracks each rung of the squeeze ladder. Board: script.md. Every number is COMPUTED from the law (src/story.js): the size
// rolls from the object's size to its nuclear-density size along the same curve the shards use (sizeAt), the weights
// (fmtMass), the falling depths (depthAt, 1/2 g t^2), 99.9999999999996%, 367 m, 1.2 billion g, 27.3 days, 2.2 cm³.
// Caption times come from the SHOT table, so a re-timed shot carries its type. LOOK.md: clean shadowed text, NO bands:
// every item passes band: 0. Safe area: title y ~170 (<= 410 wide), counter x 64 / y 384-470, captions centred on y 590.
import { cap } from '../../tools/overlay/helpers.js';
import { SHOT, FILM_LEN, RUNG, sizeAt, depthAt, fmtSize, SHOW, T_ENDCARD, T_LOOP, T_ORBIT, T_CENTRE_MIN, MOON_DAYS } from './src/story.js';

const s = (n) => SHOT[n].t0, end = (n) => SHOT[n].t0 + SHOT[n].dur;
const NB = { band: 0 };
const c = (t0, t1, text) => cap(t0, t1 + 1e-6, text, [], NB);                     // + 1 µs: a 2.8 s caption never reads 2.7999
const TITLE = 'What if atoms had | no *empty space?*';
const id = (x) => x;
// a size rung: label "<WHAT> · SIZE", the value rolls with the implosion, the fact line states the unchanged weight
const sizeSeg = (name, t0, t1) => ({ t0, t1, band: 0, format: id, label: `${RUNG[name].what} · ${RUNG[name].dim}`, value: (t) => fmtSize(sizeAt(name, t)),
  fact: `WEIGHT ${SHOW.mass[name]} · UNCHANGED` });
const depthSeg = (name, label, fact, t0, t1) => ({ t0, t1, band: 0, format: id, label, value: (t) => `${Math.round(depthAt(name, t)).toLocaleString('en-US')} m`, fact });

export default () => ({
  style: { look: 'v2' },
  titles: [
    cap(0, 3.0, TITLE, [], { ...NB, fadeIn: 0 }),
    cap(T_ENDCARD + 0.3, T_LOOP, TITLE, [], { ...NB, y: 372, fadeIn: 0.3, fadeOut: 0 }),            // the end card (black)
    cap(T_LOOP, FILM_LEN + 0.01, TITLE, [], { ...NB, fadeIn: 0, fadeOut: 0 }),                   // = frame 1 (loop)
  ],
  captions: [
    c(3.0, 5.9, 'Her phone just lost | its *empty space.*'),
    c(6.3, 11.3, `Atoms are | *${SHOW.emptyPct}%* empty.`),
    c(14.0, 17.8, 'His car: *thinner | than a hair.*'),
    c(18.3, 23.3, `Still ${RUNG.car.m / 1000} tonnes. | It *sinks through rock.*`),
    c(25.8, 29.8, 'The ferry: *a grain | of sand.*'),
    // phase 3: raised into the deeper blue upper sky (top y 130) so the type never covers the tower's crush (it sat on the
    // tower at y 590) and reads against the darker zenith instead of the pale horizon
    cap(33.3, 36.8 + 1e-6, `A ${SHOW.tower[0]} tower | *implodes to ${SHOW.tower[1]}.*`, [], { ...NB, y: 130 }),
    c(37.3, 42.8, `${(RUNG.tower.m / 1000).toLocaleString('en-US')} tonnes | *punch through the hill.*`),
    c(45.0, 49.8, 'The mountain: | *a tennis ball.*'),
    c(T_ORBIT + 0.2, 55.8, 'Then the | *whole Earth.*'),
    c(56.2, 60.8, `Earth: *${SHOW.earth[1]}.* | The tower's height.`),
    c(61.2, 65.8, 'The Moon | *doesn\'t notice.*'),
  ],
  counter: [
    sizeSeg('phone', 0, end('s01_phone')),
    sizeSeg('cup', s('s02_cup'), end('s02_cup')),
    sizeSeg('car', s('s03_car'), end('s03_car')),
    depthSeg('car', 'CAR · DEPTH', `EARTH'S CENTRE IN ~${T_CENTRE_MIN} MIN`, s('s04_hole'), end('s04_hole')),
    sizeSeg('ferry', s('s05_ferry'), end('s05_ferry')),
    sizeSeg('tower', s('s06_tower'), end('s06_tower')),
    depthSeg('tower', 'TOWER GRAIN · DEPTH', `ONE GRAIN = ${SHOW.cars}`, s('s07_drop'), end('s07_drop')),
    sizeSeg('mountain', s('s08_mountain'), end('s08_mountain')),
    sizeSeg('earth', s('s09_earth'), end('s09_earth')),
    { t0: s('s10_speck'), t1: end('s10_speck'), band: 0, format: id, label: 'EARTH · WIDTH', value: () => SHOW.earth[1], fact: `SURFACE GRAVITY ${SHOW.gMini}` },
    { t0: s('s11_moon'), t1: end('s11_moon'), band: 0, format: id, label: 'MOON · ORBIT', value: () => `${MOON_DAYS} days`, fact: 'SAME MASS, SAME PULL', fadeOut: 0.3 },
    { ...sizeSeg('phone', T_LOOP, FILM_LEN + 0.01), value: () => SHOW.phone[0], fadeIn: 0, fadeOut: 0 },   // = frame 1 (loop)
  ],
  tags: [],   // no on-screen DRAMATIZATION tag (Commander 11-12): the liberty (instant squeeze, energy ignored) is in POST.json
  // the end card's fact line: small tracked caps under the title (LOOK.md rule 10), no band; fades in with the title
  draw(ctx, t) {
    if (t < T_ENDCARD + 0.3 || t >= T_LOOP) return false;
    const a = Math.min(1, (t - T_ENDCARD - 0.3) / 0.3);
    ctx.save(); ctx.globalAlpha = 0.86 * a; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = "600 10.5px 'Inter Tight'"; ctx.letterSpacing = '2px'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 1;
    [`ALL ${SHOW.people.toUpperCase()} PEOPLE WOULD FIT`, 'IN A SUGAR CUBE', `(${SHOW.sugar.toUpperCase()} AT NUCLEAR DENSITY)`].forEach((l, i) => ctx.fillText(l, 270, 492 + i * 18));
    ctx.restore(); return true;
  },
});
