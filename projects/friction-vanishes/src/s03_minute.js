// s03_minute (film 8.5-13.0, step 2 "one minute", tau 0 -> 4.5). Match cut from s02's bottom view: high above HILL_TOP looking DOWN the
// 400 m street to the harbour, 24 mm. tau 0 = the normal world (cars parked and driving, tables out). Friction goes: everything on the
// main street slides away downhill as one mass (story.js slope law; cars already driving keep their speed: groupB slideS), the car
// driving uphill can't climb and is carried back, cross-street cars drift into the main street (no friction = no turning) and T-bone
// a car; from the contact on each keeps its yaw rate (spins as it slides). Ends whipping DOWN the street (pitch -40 deg at the cut).
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake, whip } from '@engine/camera.js';
import { ease, clamp, rng } from '@engine/util.js';
import { hillWorld, POST_DAY, onHill, hillQ, MAIN_X, TOP_Z, ZQ, groundY, Q, qn, D2R } from './kit.js';
import { tauAt, slopeX } from './story.js';
import { slideS, gridSlide } from './groupB_kit.js';
const S = createStudio({ samples: (t) => (t - 4 > 4.08 ? 12 : 8), shadows: true, post: POST_DAY });
const W = hillWorld(S, { box: 130, cars: 340, props: 320 });
const C = W.C;
// ---------- the main street: who is where at tau 0 (re-using the city's cars/props; their lanes follow city.js: x > 60 runs +Z) ----------
const CAMZ = TOP_Z - 10, CAMY = groundY(0, CAMZ) + qn('cy', 16);
const used = new Set(), R = rng(303);
const pick = (pred) => { const i = C.cars.findIndex((c, k) => !used.has(k) && !c.gone && pred(c)); if (i >= 0) used.add(i); return i >= 0 ? C.cars[i] : null; };
const slots = [];   // { c, x0, z0, yaw, vx, vz }
const put = (c, x0, z0, yaw, vx = 0, vz = 0) => { if (!c) return null; const s = { c, x0, z0, yaw, vx, vz, hx: Math.abs(Math.sin(yaw)) > 0.5 ? c.L / 2 : c.W / 2 + 0.1, hz: Math.abs(Math.sin(yaw)) > 0.5 ? c.W / 2 : c.L / 2 }; c.slot = s; slots.push(s); return s; };
// parked along the left kerb (outer lane x 54.75) the whole way down; the right kerb from the junction at z 0 on
for (let z = CAMZ + 17; z < ZQ - 30; z += 6.0 + R() * 3.5) { if (R() < 0.1) continue; put(pick((c) => c.L < 6), MAIN_X - 5.25, z, R() < 0.5 ? 0 : Math.PI); }
for (let z = CAMZ + 19; z < ZQ - 30; z += 6.2 + R() * 4) { if (R() < 0.12) continue; put(pick((c) => c.L < 6), MAIN_X + 5.25, z, R() < 0.5 ? 0 : Math.PI); }
const bus = put(pick((c) => c.L > 8), MAIN_X - 5.25, CAMZ + 70, Math.PI);            // a bus at the left kerb, mid-distance
// a bus is longer: clear left-kerb cars that would overlap it
slots.filter((s) => s !== bus && s.x0 === bus.x0 && Math.abs(s.z0 - bus.z0) < 7.5).forEach((s) => { s.c.gone = true; });
// traffic in the inner lanes: downhill (x 61.75, +Z) and one car driving UP toward us (x 58.25, -Z) that can't climb any more
const upCar = put(pick((c) => c.L < 5), MAIN_X - 1.75, CAMZ + 58, Math.PI, 0, -9);
put(pick((c) => c.L < 5), MAIN_X - 1.75, CAMZ + 118, Math.PI, 0, -8);
put(pick((c) => c.L < 5), MAIN_X + 1.75, CAMZ + 92, 0, 0, 8);
put(pick((c) => c.L < 6), MAIN_X + 1.75, CAMZ + 24, 0, 0, 7);
put(pick((c) => c.L < 5), MAIN_X - 1.75, CAMZ + 30, Math.PI, 0, -6);
put(pick((c) => c.L < 6), MAIN_X + 1.75, CAMZ + 150, 0, 0, 9);
// THE COLLISION at the junction z = SL(-1) = -60: car A crosses from the left side street (+X at 9 m/s, lane z -61.75) and can't turn or
// stop; it slides straight across and T-bones car B driving downhill in the inner lane. Contact time from the geometry (both slide the
// same slope, so only their own speeds matter): A's nose (x0 + L/2 + 9 tau) meets B's flank (61.75 - W/2).
const A = put(pick((c) => c.L < 5), 30, -61.75, Math.PI / 2, 9, 0);
const TC_A = (MAIN_X + 1.75 - 0.93 - (A.x0 + A.c.L / 2)) / A.vx;
const B = put(pick((c) => c.L < 5), MAIN_X + 1.75, 0, 0, 0, 8);
B.z0 = A.z0 + slopeX(TC_A) - slideS(8, TC_A) + 0.6;                                     // B is there at the contact (its side, 0.6 m behind centre)
// a second car from the right side street (-X, lane z -58.25) drifts across behind them and hits the parked car on the left kerb
const A2 = put(pick((c) => c.L < 5), 96, -58.25, -Math.PI / 2, -8, 0);
const C2 = put(pick((c) => c.L < 6), MAIN_X - 5.25, -58.25 - 0.8, 0);
slots.filter((s) => s !== C2 && s.x0 === C2.x0 && Math.abs(s.z0 - C2.z0) < 6).forEach((s) => { s.c.gone = true; });
const TC_A2 = (A2.x0 - A2.c.L / 2 - (C2.x0 + C2.c.W / 2)) / -A2.vx;
// keep the contact zone clear of other cars
slots.filter((s) => ![A, B, A2, C2, bus].includes(s) && s.x0 > MAIN_X - 3 && Math.abs(s.z0 - B.z0) < 9 && s !== upCar).forEach((s) => { s.c.gone = true; });
// spins after contact (rad/s, kept constant: no friction = nothing to stop the rotation) and momentum shared (equal masses)
const HIT = [
  { s: A, tc: TC_A, w: 1.5, vx: 3.5 }, { s: B, tc: TC_A, w: -1.1, vx: 5.5, vzMix: true },
  { s: A2, tc: TC_A2, w: -1.3, vx: -3.0 }, { s: C2, tc: TC_A2, w: 0.9, vx: -5.0 },
];
HIT.forEach((h) => { h.s.hit = h; });
// state at contact: z and downhill speed of each partner, then they slide on together (z momentum averaged)
const preState = (s, tau) => gridSlide({ x0: s.x0, z0: s.z0, vx: s.vx, vz: s.vz, hx: s.hx, hz: s.hz }, tau);
HIT.forEach((h) => { const st = preState(h.s, h.tc); h.x = st.x; h.z = st.z; h.vz = st.vz; });
for (let k = 0; k < HIT.length; k += 2) { const a = HIT[k], b = HIT[k + 1], vz = 0.5 * (a.vz + b.vz); a.vz2 = vz; b.vz2 = vz; }
function slotPose(s, tau) {
  const h = s.hit;
  if (h && tau > h.tc) {
    const d = tau - h.tc, x = THREE.MathUtils.clamp(h.x + h.vx * d, MAIN_X - 7 + 2.3, MAIN_X + 7 - 2.3), z = h.z + slideS(h.vz2, d);
    return { p: onHill(x, z), q: hillQ(s.yaw + h.w * d) };
  }
  const st = preState(s, tau);
  return { p: onHill(st.x, st.z), q: hillQ(s.yaw) };
}
// every other car in town (side streets, other avenues) obeys the same grid rule; tumble-free (they only slide)
C.cars.forEach((c) => { if (c.slot) { c.x0 = c.slot.x0; c.z0 = c.slot.z0; return; }
  if (c.gone) return;
  if (inMainCorridor(c.x0) && c.z0 > CAMZ - 10 && c.z0 < ZQ) { c.gone = true; return; }   // the main street is ours
  const onX = c.lane.axis === 'x';
  c.gs = { x0: c.x0, z0: c.z0, vx: onX ? c.v * c.lane.dir : 0, vz: onX ? 0 : c.v * c.lane.dir, hx: onX ? c.L / 2 : c.W / 2, hz: onX ? c.W / 2 : c.L / 2 }; });
function inMainCorridor(x) { return Math.abs(x - MAIN_X) < 12; }
// props (benches, bins, planters, cafe tables): our pavements get a row of them near the lens; all slide by the same law
const near = C.props.filter((p) => !p.gone).slice(0, 90);
near.forEach((p, i) => { const side = i % 2 ? 1 : -1; p.x0 = MAIN_X + side * (8.4 + R() * 2.8); p.z0 = CAMZ + 14 + (i >> 1) * 3.6 + R() * 2.5; p.yaw = R() * 6.28; });
C.props.forEach((p) => { if (!p.gone && !near.includes(p) && inMainCorridor(p.x0) && p.z0 > CAMZ - 10) p.gone = true; });
// the camera's own tree canopies: trees right under the lens fill the frame
C.group.children.filter((m) => m.isInstancedMesh && m.count === C.trees.length).forEach((M) => { const m4 = new THREE.Matrix4();
  M.updateMatrixWorld(); C.trees.forEach((tr, i) => { if (Math.abs(tr.x - MAIN_X) < 14 && tr.z < CAMZ + 18 && tr.z > CAMZ - 30) { M.setMatrixAt(i, m4.makeScale(0, 0, 0)); } }); M.instanceMatrix.needsUpdate = true; });
const P0 = 5.8, P1 = 13;   // pitch (deg down): the match-cut framing (harbour horizon y ~ 415) easing down to follow the mass
S.run((t) => {
  const tt = Math.max(t - 4, 0), tau = tauAt('s03_minute', tt);
  const u = ease.inOutSine(clamp((tt - 0.6) / 3.6)), wp = whip(tt, 4.5, 0.7, 80);     // whip: 0 at 4.15 s, 40 deg at the cut (fastest there)
  const pitch = -(P0 + (P1 - P0) * u + wp), pos = new THREE.Vector3(MAIN_X, CAMY - 1.5 * u, CAMZ + 4 * u);
  const dir = new THREE.Vector3(0, Math.sin(pitch * D2R), Math.cos(pitch * D2R));
  applyCam(S.camera, { pos, look: pos.clone().add(dir), mm: 24, roll: 0 }, shake(t, 0.035 + 0.05 * clamp((tt - 1) / 3), 0.8, 3));
  W.update(t, {
    tau,
    carPose: (c) => { if (c.slot) return slotPose(c.slot, tau); if (c.gs) { const st = gridSlide(c.gs, tau); return { p: onHill(st.x, st.z), q: hillQ(c.yaw) }; } return undefined; },
    propPose: (p) => { const st = gridSlide({ x0: p.x0, z0: p.z0, vx: 0, vz: 0, hx: 0.6, hz: 0.6, kerb: false }, tau); return { p: onHill(st.x, st.z), q: hillQ(p.yaw) }; },
    focus: new THREE.Vector3(MAIN_X, groundY(0, CAMZ + 80), CAMZ + 80),
  });
});
