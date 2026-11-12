// groupA_hill: the s02_grip slide-and-crash on the kit's hill street (Builder group A). Everything loose on the main street
// slides down the fall line by the law (story.js slideSkidX: slopeX until tau 5, then a skid at SKID_HILL to a stop in 1.7 s,
// 7 m). Sideways cars trip when the grip bites and roll about their downhill lower edge; the bus tips onto its side; tables
// cartwheel; benches tip. Dark rubber skid marks are laid from tau 5 on. Hazard lights blink after the crash.
// No people anywhere on the hill (brief policy).
import { THREE } from '@engine/engine.js';
import { clamp, ease, rng } from '@engine/util.js';
import { hillWorld, onHill, hillQ, setCarColor, SLOPE_Q, MAIN_X, ZF } from './kit.js';
import { slideSkidX, slopeX, slopeV, COS } from './story.js';
export const T_GRIP = 5;                            // grip returns at tau 5 (film 5.0)
// sliders on the main street: x (m), z0 (horizontal z at tau 0), yaw (0 = nose downhill +Z), roll: max roll angle (rad,
// sideways cars only), tr: roll duration (s). Nearest start 36 m above the street's foot (z 288): it stops 8 m above it
// (slid 21 m by tau 5 + 7 m of skid), so nothing reaches the quay road or the lens.
const CARS = [
  { x: 62.3, z0: 252, yaw: 0.05 },
  { x: 58.0, z0: 248, yaw: Math.PI - 0.1 },
  { x: 60.4, z0: 236, yaw: Math.PI / 2, roll: Math.PI, tr: 1.1 },
  { x: 65.0, z0: 226, yaw: 0.22 },
  { x: 61.9, z0: 214, yaw: Math.PI - 0.05 },
  { x: 66.0, z0: 238, yaw: -Math.PI / 2, roll: 2.1, tr: 1.0 },
  { x: 57.8, z0: 140, yaw: Math.PI + 0.1 },
  { x: 66.2, z0: 188, yaw: 0.45 },
  { x: 59.6, z0: 172, yaw: -Math.PI / 2, roll: Math.PI, tr: 1.2 },
  { x: 55.4, z0: 158, yaw: Math.PI },
  { x: 64.2, z0: 154, yaw: 0.1 },
  { x: 56.0, z0: 126, yaw: Math.PI / 2, roll: Math.PI / 2, tr: 0.8 },
  { x: 61.8, z0: 128, yaw: Math.PI + 0.3 },
  { x: 66.0, z0: 112, yaw: -0.2 },
];
// the bus slid slewed across the right lanes: when the grip bites it tips onto its side (high centre of mass)
const BUS = { x: 63.6, z0: 203, yaw: Math.PI / 2, roll: Math.PI / 2, tr: 1.15, col: 0xe9e5da };
// pavement props: kind 3 table (cartwheels), 1 bin (tips + rolls), 0 bench (tips), 2 planter (heavy: skids)
const PROPS = [
  [3, 69.2, 249], [3, 70.3, 247.5], [3, 69.0, 245.2], [3, 70.6, 243], [1, 68.4, 236], [0, 70.8, 228], [2, 69.4, 218], [3, 69.8, 207],
  [3, 70.4, 205.5], [1, 68.3, 196], [0, 70.6, 170], [3, 51.2, 241], [3, 50.2, 239], [1, 51.6, 226], [0, 49.4, 214], [2, 50.6, 200], [3, 50.8, 186],
];
const Z0M = new THREE.Matrix4().makeScale(0, 0, 0);
const sAt = (tau) => slideSkidX(tau, T_GRIP);           // metres moved along the fall line
const X_AX = new THREE.Vector3(1, 0, 0);
// pose of a slider after s metres, with an optional roll th (rad, top toward downhill) of a box with half-extents hw (along the
// fall line) and hh (up): it rolls edge over edge, so its centre advances hw + hh per 90 deg and rides at hw|sin| + hh|cos|
function rolled(x, z0, yaw, s, th, hw, hh) {
  const p = onHill(x, z0 + s * COS);
  const q = hillQ(yaw);
  if (!th) return { p, q };
  const R = new THREE.Quaternion().setFromAxisAngle(X_AX, th);
  const q2 = R.multiply(q);
  const ctr = p.clone().add(new THREE.Vector3(0, hw * Math.abs(Math.sin(th)) + hh * Math.abs(Math.cos(th)), th / (Math.PI / 2) * (hw + hh)).applyQuaternion(SLOPE_Q));
  return { p: ctr.sub(new THREE.Vector3(0, hh, 0).applyQuaternion(q2)), q: q2 };
}
export function hillA(S) {
  const W = hillWorld(S, { cars: 260, props: 260 });
  const { C } = W, scene = S.scene;
  // assign city cars / props to the explicit sliders; every other car on the main street or the quay road near us goes
  const free = C.cars.filter((c) => !c.gone && c.L < 9), bus = C.cars.find((c) => !c.gone && c.L === 9);
  const used = new Set([bus]);
  const sl = CARS.map((o, k) => { const c = free[k * 7 % free.length]; used.add(c); return { ...o, c }; });
  sl.push({ ...BUS, c: bus });
  sl.forEach((o) => { o.c.slide = o; if (o.col) setCarColor(C, C.cars.indexOf(o.c), o.col); });
  C.cars.forEach((c) => { if (used.has(c)) return;
    const onMain = c.lane.axis === 'z' && Math.abs(c.lane.c - MAIN_X) < 8;
    if (onMain && c.z0 > 105) c.gone = true;                                          // replaced by the explicit list
    if (c.lane.axis === 'x' && Math.abs(c.lane.c - 300) < 8 && Math.abs(c.x0 - MAIN_X) < 90) c.gone = true;   // quay road near the lens
    if (c.lane.axis === 'x' && Math.abs(c.x0 - MAIN_X) < 16 && c.z0 < ZF) c.gone = true;   // cross-street cars in the junctions
  });
  const pk = [0, 0, 0, 0].map(() => []); C.props.forEach((p) => pk[p.kind].push(p));
  const psl = []; PROPS.forEach(([k, x, z0]) => { const p = pk[k].pop(); if (p) psl.push({ p, k, x, z0, yaw: rng(z0 * 7 + x)() * 6.28, sp: 0.8 + 0.4 * rng(z0 + x * 3)() }); });
  const pset = new Set(psl.map((o) => o.p));
  C.props.forEach((p) => { if (!pset.has(p) && Math.abs(p.x0 - MAIN_X) < 16 && p.z0 > 100) p.gone = true; });
  psl.forEach((o) => { o.p.gone = false; o.p.sl = o; });
  // ---- skid marks: 2 rubber tracks per car from where the grip bit (tau 5) to where it is now
  const rubber = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.95, transparent: true, opacity: 0.88, polygonOffset: true, polygonOffsetFactor: -3, depthWrite: false });
  const marks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), rubber, sl.length * 2); marks.frustumCulled = false; marks.renderOrder = 2; scene.add(marks);
  // ---- hazard lights (amber corner lamps) on most stopped cars
  const hz = new THREE.MeshStandardMaterial({ color: 0x302000, emissive: 0xff8a10, emissiveIntensity: 3.2 });
  const haz = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.12, 0.08), hz, sl.length * 4); haz.frustumCulled = false; scene.add(haz);
  const m4 = new THREE.Matrix4(), vS = new THREE.Vector3(), vP = new THREE.Vector3(), qq = new THREE.Quaternion();
  const poseOf = (o, tau) => {
    const s = sAt(tau), c = o.c;
    let th = 0;
    if (o.roll && tau > T_GRIP) th = o.roll * ease.inOutSine(clamp((tau - T_GRIP - 0.08) / o.tr));   // trips as the grip bites
    return rolled(o.x, o.z0, o.yaw, s, th, c.W / 2 * Math.abs(Math.sin(o.yaw)) + c.L / 2 * Math.abs(Math.cos(o.yaw)), (0.32 + c.H) / 2);
  };
  return { W, sl, psl,
    update(t, tau, o = {}) {
      W.update(t, { tau, focus: new THREE.Vector3(MAIN_X, 30, 215),
        carPose: (c) => { if (c.slide) return poseOf(c.slide, tau);
          // every other car on the hill slides by the same law; cross-street cars stop at their downhill kerb (they hit it)
          if (c.z0 < ZF) { const s = sAt(tau); const zz = c.lane.axis === 'x' ? Math.min(c.z0 + s * COS, c.lane.c + 9.2) : c.z0 + s * COS; return { p: onHill(c.x0, zz), q: hillQ(c.yaw) }; }
          return undefined; },
        propPose: (p) => { const q = p.sl; if (!q) { if (p.z0 < ZF) { const s = sAt(tau); return { p: onHill(p.x0, p.z0 + s * COS), q: hillQ(p.yaw) }; } return undefined; }
          const s = sAt(tau), s5 = slopeX(T_GRIP), d = Math.max(0, s - s5);
          if (q.k === 3) { const th = d / 0.42 * q.sp; const P = rolled(q.x, q.z0, q.yaw, s, 0, 0, 0); const up = new THREE.Vector3(0, 0.45, 0).applyQuaternion(SLOPE_Q);
            const R = new THREE.Quaternion().setFromAxisAngle(X_AX, th); return { p: P.p.clone().add(up).sub(up.clone().applyQuaternion(R)), q: R.multiply(hillQ(q.yaw)) }; }
          if (q.k === 1) { const th = tau > T_GRIP ? Math.PI / 2 * ease.outCubic(clamp((tau - T_GRIP) / 0.35)) + d / 0.3 * 0.5 : 0; return rolled(q.x, q.z0, q.yaw, s, th, 0.28, 0.48); }
          if (q.k === 0) { const th = tau > T_GRIP ? Math.PI / 2 * ease.inOutSine(clamp((tau - T_GRIP) / 0.6)) : 0; return rolled(q.x, q.z0, 0, s, th, 0.3, 0.42); }
          return rolled(q.x, q.z0, q.yaw, s, 0, 0, 0); } });
      // skid marks (all four wheels lock: two tracks); sideways cars leave only a short smear before they trip
      const s5 = slopeX(T_GRIP), s = sAt(tau);
      sl.forEach((o, k) => { const c = o.c, side = Math.abs(Math.sin(o.yaw)) > 0.7;
        const send = side ? Math.min(s, s5 + 1.6) : s;
        for (let j = 0; j < 2; j++) {
          if (tau <= T_GRIP + 0.02) { marks.setMatrixAt(k * 2 + j, Z0M); continue; }
          const off = (j ? 1 : -1) * (side ? c.L * 0.33 : c.W * 0.42), len = send - s5;
          const xm = o.x + off, zm = o.z0 + ((s5 + send) / 2) * COS;
          m4.compose(onHill(xm, zm, 0.03), SLOPE_Q, vS.set(side ? 0.5 : 0.26, 1, Math.max(0.01, len))); marks.setMatrixAt(k * 2 + j, m4);
        } });
      marks.instanceMatrix.needsUpdate = true;
      // hazard lights: blink at 1.4 Hz from tau 5.5 on cars that ended upright (and on the bus)
      const on = tau > T_GRIP + 0.5 && Math.floor((tau - T_GRIP - 0.5) * 2.8) % 2 === 0;
      sl.forEach((o, k) => { const c = o.c, P = poseOf(o, tau);
        [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz], j) => {
          if (!on || k % 3 === 2) { haz.setMatrixAt(k * 4 + j, Z0M); return; }
          vP.set(sx * c.W * 0.43, 0.32 + c.H * 0.42, sz * (c.L / 2 + 0.02)).applyQuaternion(P.q).add(P.p);
          m4.compose(vP, P.q, vS.set(1, 1, 1)); haz.setMatrixAt(k * 4 + j, m4); }); });
      haz.instanceMatrix.needsUpdate = true;
    } };
}
