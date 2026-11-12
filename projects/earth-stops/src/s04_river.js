// s04_river (film 22.0–29.0, 210 fr, e 1.75 -> 2.333). Page t = shot time + 4. Board: "Everything upwind is still coming."
// The SAME hero balcony as frame 1 (FRAME1_CAM.pos, balcony() rail across the bottom), a little wider (27 -> 25 mm) and a
// calm drift: the plaza transformed (LOOK rule 1). The kit strips the trees and empties the basin; groupB_towers has cut every
// tower round the plaza to a stub (the shear seen in s03), and the tops of the towers UPWIND are still arriving: floors of
// building 24 (264 m west, 78 m tall) cross over the plaza at 40–75 m. Below them the upwind debris river: the kit's wrapped
// cars and props tumbling through, plus groupB chips torn off upwind roofs and streets (roof panels, signs, shingles, paper,
// glass) that enter frame left and leave right at V = 31.75 m/s of film. Each chip is torn loose at t0 somewhere upwind
// (x -560 … -120 m) and then obeys the law (V east, real gravity), so the stream has every height and never thins.
// Dust thicker than s03 (ochre sheets 8–55 m), gradeDust 0.55 -> 0.65 (amber). Ends at full chaos; HIT 1 cut at 29.0.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { ease, clamp, lerp, rng } from '@engine/util.js';
import { cityWorld, balcony, createDust, createChips, carQ, rollQ, FRAME1_CAM, POST_DAY, SAMPLES, qn, gradeDust } from './kit.js';
import { ev, SHOT, V, roll, hop } from './story.js';
import { breakTowers } from './towersBreak.js';   // v2: no layered floor slabs (Commander 11-12); same breakage as s03

const SHOTN = 's04_river', DUR = SHOT[SHOTN].dur, E0 = ev(SHOTN, 0), E1 = ev(SHOTN, DUR);
const S = createStudio({ samples: SAMPLES.s04_river, shadows: true, post: POST_DAY });
const W = cityWorld(S, { leaves: { x: 0, z: 0, r: 60, per: 10 } });
balcony(S, FRAME1_CAM);
// the same towers, delays and exclusions as s03 (plazaShear), so the stubs match
const TW = breakTowers(S, W, ev('s03_towers', 0));
// ---- the upwind river: torn off somewhere upwind at t0, then the law. Building materials first (concrete, render, roofing,
// glass, timber), only a few painted signs/awnings, so it reads as a wrecked city flowing past, not confetti.
const R = rng(2404), list = [];
const COLS = { mat: [0xb9b3a8, 0x8f8a82, 0xd8d2c6, 0xa8866a, 0x8a4a32, 0x6d5539, 0x5a5048, 0x7a746c, 0xc8b49a], sign: [0xd94a3d, 0xf0b23a, 0x2f9e68, 0x3a78d0, 0xfafafa], paper: [0xf2eee6, 0xe8e0c8, 0xd8cfb8] };
const pick = (a) => a[Math.floor(R() * a.length)];
const NR = qn('nr', 4200);
for (let i = 0; i < NR; i++) {
  const r = R(), kind = r < 0.25 ? 0 : r < 0.45 ? 1 : 2, xs = -560 + R() * 440, z = -72 + R() * 90;             // the plaza's depth, ≥ 46 m from the lens
  const dxIn = -xs - 60 + R() * 140;                                                                            // where in frame it is mid-shot
  const t0 = lerp(E0, E1, R()) - dxIn / V + 0.15 * (R() - 0.5);
  const ht = kind === 2 ? 2 + Math.pow(R(), 0.9) * 40 : kind === 1 ? 2 + R() * 30 : 1 + Math.pow(R(), 1.4) * 26;
  const big = kind === 2 && R() < 0.18, sign = big && R() < 0.12;
  list.push({ p: [xs, ht, z], t0, kind, shape: kind === 0 || R() < 0.55 ? 1 : 0, seed: R(),
    size: kind === 0 ? 0.25 + 0.3 * R() : kind === 1 ? 0.5 + 0.7 * R() : big ? 2.0 + 1.8 * R() : 0.35 + 0.9 * R(),
    col: kind === 0 ? (R() < 0.5 ? pick(COLS.paper) : new THREE.Color().setHSL(0.07 + 0.08 * R(), 0.45, 0.25 + 0.15 * R()).getHex()) : kind === 1 ? 0x9cb8c8 : sign ? pick(COLS.sign) : pick(COLS.mat) });
}
// low and near: grit, shingles and paper skidding across the near half of the plaza floor (fall the last metre, then skid at V)
for (let i = 0; i < qn('ng', 2200); i++) {
  const kind = R() < 0.7 ? 2 : 0, xs = -560 + R() * 440, z = 2 + R() * 34, dxIn = -xs - 60 + R() * 140;
  list.push({ p: [xs, 0.2 + R() * 2.5, z], t0: lerp(E0, E1, R()) - dxIn / V, kind, shape: R() < 0.5 ? 1 : 0, seed: R(),
    size: kind === 0 ? 0.2 + 0.25 * R() : 0.2 + 0.6 * R(), col: kind === 0 ? pick(COLS.paper) : pick(COLS.mat) });
}
const river = createChips(S, list);
// whole cars from upwind streets tumbling across the plaza (the kit's own car instances, posed by the law): car i crosses the
// frame centre (x ≈ 0) at shot time CROSS[k]; x = V·(e - e_i) from 300 m upwind, rolling east (kit rollQ), hops ≤ 1.6 m
const CROSS = [0.8, 2.1, 3.3, 4.4, 5.6, 6.5], CARS = new Map(CROSS.map((tt, k) => [7 + k * 23, { eC: ev(SHOTN, tt), z: 6 + ((k * 0.618) % 1) * 30, sd: (k * 0.37) % 1 }]));
const dust = createDust(S, [{ x0: -400, x1: 500, z: 20, h: 5, op: 0.35 }, { x0: -500, x1: 600, z: -30, h: 12, op: 0.4 }, { x0: -600, x1: 800, z: -66, h: 22, op: 0.45 },
  { x0: -700, x1: 900, z: -190, h: 38, op: 0.5 }, { x0: -900, x1: 1100, z: -330, h: 58, op: 0.55 }]);
const P = FRAME1_CAM.pos;
S.run((t) => {
  const tt = Math.max(t - 4, 0), e = ev(SHOTN, tt), film = SHOT[SHOTN].t0 + tt, u = ease.inOutSine(clamp(tt / DUR));
  const look = new THREE.Vector3(qn('lx', lerp(3, 7, u)), qn('ly', lerp(12, 15, u)), FRAME1_CAM.look.z);
  applyCam(S.camera, { pos: P, look, mm: qn('mm', lerp(27, 25, u)), roll: 0 }, shake(t, 0.06, 0.7, 5));
  W.update(film, { focus: new THREE.Vector3(0, 0, 0), box: 120, carPose: (c, i, ee) => { const K = CARS.get(i); if (!K) return undefined;
    const x = V * (ee - K.eC); if (Math.abs(x) > 320) return null;
    const a = roll(ee - K.eC + 1, K.sd) * 0.9, lift = 0.5 * Math.max(c.W, c.H) * Math.abs(Math.sin(a));
    return { p: new THREE.Vector3(x, hop(ee, K.sd) * 0.7 + lift, K.z), q: rollQ(a, carQ(Math.PI / 2 + K.sd)) }; } });
  TW.update(e); river.update(e);
  dust.update(e, lerp(0.85, 1.0, u));
  gradeDust(S, lerp(0.55, 0.65, u));
});
