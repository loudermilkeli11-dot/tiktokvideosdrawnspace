// s04_quay (film 13.0-17.5, step 2, tau 20 -> 24.5). Low, from a moored boat in the harbour ~60 m off the quay, 28 mm, looking back up
// the hill street. Everything that started sliding at tau 0 comes down the 400 m street at slopeV (116 -> 126 km/h: everything on the
// slope has slid for the same tau, so everything arriving has the same speed), crosses the flat quay road (coastX: drag only), leaves
// the edge and flies by launch(v, dt, 0) (the quay road is level) 2 m down into the harbour (fallTime 0.64 s, ~22 m out), then ploughs
// and floats. The bus from the 400 m mark (TOP_Z) is THE one the counter talks about: foot at T_QUAY 22.0 (film 15.0), edge at T_EDGE
// 22.7 (film 15.7), water at 23.34 (film 16.34). Cars that were spinning keep spinning in flight. Cars parked on the level quay road
// away from the junction do NOT move (no slope, no force). Ends in a muddy spray wipe (dark, never white) from a car ploughing toward us.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake, kick } from '@engine/camera.js';
import { ease, clamp, rng, sstep } from '@engine/util.js';
import { waveHeight } from '@engine/ocean.js';
import { createSpray, createBoats } from '@engine/splash.js';
import { hillWorld, POST_DAY, onHill, hillQ, carQ, setCarColor, MAIN_X, ZF, ZQ, TOP_Z, groundY, slipCrowd, SUN, qn, D2R } from './kit.js';
import { tauAt, slopeX, slopeV, slopeTimeTo, coastX, coastV, coastTime, launch, fallTime, QUAY_H, T_QUAY, T_EDGE, V_QUAY } from './story.js';
import { darkSpray, hideFromMirror } from './groupB_kit.js';
const S = createStudio({ samples: 12, shadows: true, near: 0.3, post: POST_DAY });
const W = hillWorld(S, { box: 110, cars: 300, props: 300, reflScale: 0.25 });
const C = W.C, TAU0 = 20;
const page = (tau) => tau - TAU0 + 4;                                   // story tau -> page t
// ---------- camera: on a small boat ~60 m off the quay, 9 m right of the stream, lens 2.2 m above the water ----------
const CAM = new THREE.Vector3(qn('cx', 71), qn('cy', 3.6), qn('cz', 372)), LOOK = new THREE.Vector3(qn('lx', 57), qn('ly', 12), qn('lz', 240));
// ---------- who comes down: the main street's cars and props, each from its tau-0 spot (z0) ----------
const R = rng(404), objs = [];
const KW = 0.28;                                                          // water drag on a car ploughing in (1/m: v halves in ~0.1 s at 35 m/s; staged)
function addObj(o) { o.tf = slopeTimeTo(ZF - o.z0); o.vf = slopeV(o.tf); o.te = o.tf + coastTime(o.vf, ZQ - ZF); o.ve = coastV(o.vf, o.te - o.tf);
  o.tw = fallTime(o.ve, QUAY_H, 0); o.twater = o.te + o.tw; o.zw = ZQ + launch(o.ve, o.tw, 0)[0]; objs.push(o); (o.c || o.p).obj = o; return o; }
const cars = C.cars.filter((c) => !c.gone);
let ci = 0; const nextCar = (pred) => { for (; ci < cars.length; ci++) if (pred(cars[ci])) return cars[ci++]; return null; };
// the bus from the 400 m mark: the counter's 126 km/h at the foot
const busC = cars.find((c) => c.L > 8); busC.mine = true;
const BUS = addObj({ c: busC, x0: MAIN_X - 1.75, z0: TOP_Z, yaw: 0, w: 0, vx: 0, plough: 0.9, big: 1 });
// the stream: arrivals at the foot from tau ~13 (already in the water) to ~25.5 (z0 from 110 up to -180), all four lanes
for (let z = 60; z > -185; z -= 4.2 + R() * 4) {
  const lane = [-5.25, -1.75, 1.75, 5.25][Math.floor(R() * 4)];
  if (Math.abs(z - TOP_Z) < 9 && lane === -1.75) continue;
  const c = nextCar((k) => !k.mine && k.L < 6); if (!c) break; c.mine = true;
  const spin = R() < 0.35;
  addObj({ c, x0: MAIN_X + lane, z0: z, yaw: R() < 0.8 ? 0 : Math.PI, w: spin ? (R() - 0.5) * 2.6 : 0, vx: (R() - 0.5) * 2.4, plough: 0.6 + R() * 0.8, seed: R() });
}
// THE WIPE CAR: spinning since an upstream collision with 3.2 m/s of sideways drift; on the open quay road it keeps drifting toward our
// boat, so it hits the water 3.6 s into the shot and ploughs straight at the lens (stops ~15 m short), its muddy sheet covers the frame.
const T_WIPE_WATER = TAU0 + qn('tw', 3.55);
const wipeC = nextCar((k) => !k.mine && k.L < 5); wipeC.mine = true;
{ let tf = T_WIPE_WATER - 0.65 - 0.68; for (let k = 0; k < 6; k++) { const o = { z0: ZF - slopeX(tf) }; const t1 = slopeTimeTo(ZF - o.z0), v1 = slopeV(t1), te = t1 + coastTime(v1, ZQ - ZF), tw = fallTime(coastV(v1, te - t1), QUAY_H, 0); tf += T_WIPE_WATER - (te + tw); }
  addObj({ c: wipeC, x0: MAIN_X + 5.25, z0: ZF - slopeX(tf), yaw: 0.6, w: 1.4, vx: 3.2, plough: 1.35, wipe: 1, seed: 0.3 }); }
// varied, readable colours on the stream (the city palette has many near-blacks that read as holes in the spray)
const BRIGHT = [0xd8d8d8, 0xb21d1d, 0x2a4f9a, 0xe0b23a, 0x8a8f96, 0xf2f2ee, 0x2f6b4a, 0xd96a2b, 0x3f86c8, 0xc7c0b0, 0x8c2f3e, 0x5aa04a];
objs.forEach((o, k) => { if (o.c) setCarColor(C, C.cars.indexOf(o.c), BRIGHT[k % BRIGHT.length]); });
// cars already parked on the LEVEL quay road, clear of the junction: they stay exactly where they are
const parked = [];
for (const x of [96, 104.5, 113, 123, 18, 9.5, -1]) { const c = nextCar((k) => !k.mine && k.L < 6); if (!c) break; c.mine = true; parked.push({ c, x, z: 300 + (x > 60 ? 5.25 : -5.25), yaw: x > 60 ? Math.PI / 2 : -Math.PI / 2 }); }
// props from the pavements (benches, bins, planters, cafe tables): same law, lighter splashes
const props = C.props.filter((p) => !p.gone);
let pi = 0;
for (let z = 120; z > -150 && pi < props.length; z -= 2.2 + R() * 3) { const p = props[pi++]; p.mine = true;
  addObj({ p, x0: MAIN_X + (R() < 0.5 ? -1 : 1) * (8.2 + R() * 3), z0: z, yaw: R() * 6.28, w: (R() - 0.5) * 3, vx: (R() - 0.5) * 3, plough: 0.5 + R() * 0.6, prop: 1, seed: R() }); }
// pose: slope -> flat quay road -> ballistic -> water (plough, float, settle)
const _q = new THREE.Quaternion();
function pose(o, tau) {
  const yaw = o.yaw + o.w * tau;
  if (tau <= o.tf) { const z = o.z0 + slopeX(tau); return { p: onHill(o.x0, z), q: hillQ(yaw), z }; }
  if (tau <= o.te) { const d = tau - o.tf, z = ZF + coastX(o.vf, d); return { p: new THREE.Vector3(o.x0 + o.vx * d, QUAY_H, z), q: carQ(yaw), z }; }
  const dxE = o.vx * (o.te - o.tf), dt = tau - o.te;
  if (tau <= o.twater) { const [f, h] = launch(o.ve, dt, 0); return { p: new THREE.Vector3(o.x0 + dxE + o.vx * dt, QUAY_H + h, ZQ + f), q: carQ(yaw, 0.75 * dt + 0.15 * sstep(0, 0.2, dt), (o.seed - 0.5) * 0.6 * dt), z: ZQ + f }; }
  const dw = tau - o.twater, k = KW / o.plough, s = Math.log(1 + o.ve * k * dw) / k, lat = (o.vx + (o.seed - 0.5) * 14) * Math.log(1 + 3 * dw) / 3;
  const bob = waveHeight(o.x0, o.zw + s, page(tau), 0.25, 0), sink = (o.prop ? 0.004 : 0.3) * Math.max(0, dw - 1.0) ** 2;   // cars go under within ~3 s (staged)
  const dive = Math.exp(-dw * 2.5) * Math.sin(dw * 6), yw = yaw * Math.exp(-0) - o.w * (tau - o.twater) * (1 - Math.exp(-dw * 2)) * 0.6;
  const y = (o.prop ? -0.1 : -0.55) + bob - 0.9 * dive - sink;
  return { p: new THREE.Vector3(o.x0 + dxE + o.vx * o.tw + lat, y, o.zw + s), q: carQ(yw, 0.48 + 0.3 * dive + (o.prop ? (o.seed - 0.5) * 2 : 0), (o.seed - 0.5) * 0.5 + 0.2 * Math.sin(dw * 1.7 + o.seed * 9)), z: o.zw + s };
}
// ---------- splashes: every water entry from tau 15 on (older ones have fallen back) ----------
const SR = rng(77), parts = [], wipeParts = [];
for (const o of objs) {
  if (o.twater < 15 || o.twater > TAU0 + 4.6) continue;
  const big = o.big ? 3.5 : o.prop ? 0.25 : 1, n = Math.round(qn('sn', 110) * big), x0 = o.x0 + o.vx * (o.te - o.tf + o.tw), z0 = o.zw, ve = o.ve;
  for (let k = 0; k < n; k++) {                                             // crown + a low forward sheet (the car's speed throws water ahead)
    const kind = SR() < 0.15 ? 1 : 0, a = SR() * 6.283, fwd = SR() < 0.45, r = SR();
    const vy = (fwd ? 2.5 + 6 * r : 4 + 10 * Math.pow(r, 0.9)) * (o.big ? 1.35 : 1), vh = fwd ? ve * (0.1 + 0.25 * SR()) : 2 + 5 * SR();
    const v = fwd ? [o.vx + (SR() - 0.5) * 8, vy, vh] : [Math.cos(a) * vh, vy, Math.sin(a) * vh];
    parts.push({ p: [x0 + (SR() - 0.5) * 2.5, 0.3 + SR() * 0.6, z0 + SR() * 3], v, t0: page(o.twater) + SR() * 0.3, size: kind ? (0.5 + SR() * 0.9) * (o.big ? 1.6 : 1) : 0.06 + SR() * 0.12, drag: kind ? 0.4 : 0.15, life: 4, kind, shade: 0.75 + 0.25 * SR() });
  }
  if (o.wipe) {                                                              // THE WIPE: a muddy sheet thrown straight at our lens as it ploughs
    for (let k = 0; k < 3600; k++) { const ts = 0.05 + Math.pow(SR(), 0.8) * 0.4, kw = KW / o.plough, s = Math.log(1 + ve * kw * ts) / kw;
      const px = x0 + o.vx * 0.5 * ts, pz = z0 + s, aim = new THREE.Vector3(CAM.x + (SR() - 0.5) * 9, CAM.y + (SR() - 0.45) * 9, CAM.z + 1 + SR() * 6).sub(new THREE.Vector3(px, 0.6, pz));
      const flight = 0.4 + SR() * 0.35, v = aim.multiplyScalar(1 / flight); v.y += 0.5 * 9.81 * flight;   // arrive at the lens 0.45-1.2 s after the hit (film 17.0-17.5+)
      const kind = SR() < 0.55 ? 1 : 0;
      wipeParts.push({ p: [px + (SR() - 0.5) * 2.5, 0.4 + SR(), pz], v: [v.x, v.y, v.z], t0: page(o.twater + ts), size: kind ? 0.35 + SR() * 0.9 : 0.06 + SR() * 0.14, drag: 0.08, life: 3, kind, shade: 0.5 + 0.5 * SR() });
    }
  }
}
const spray = createSpray(S, parts, { hazeD: 5000 }); spray.U.sunDir.value.copy(SUN); spray.U.streak.value = 1 / 18;
const wipe = darkSpray(S, wipeParts, { amb: 0x3b3326, sunI: 0.3 }); wipe.U.sunDir.value.copy(SUN);
hideFromMirror(W.ocean, [spray.mesh, wipe.mesh]);
if (qn('ns', 0)) { spray.mesh.visible = false; wipe.mesh.visible = false; }       // ?ns=1: check the picture without spray
// a few onlookers far along the quay to our right (flat ground, standing still: they don't slide), never near the stream
// moored boats along the quay wall (crew-free), and ours: its bow just under the lens
const BOATS = [{ x: 30, z: 322, yaw: 1.5, L: 11 }, { x: 16, z: 324, yaw: 1.62, L: 8 }, { x: 108, z: 323, yaw: 1.55, L: 12 }, { x: 128, z: 321, yaw: 1.6, L: 9 }];
const BT = createBoats(S, BOATS.length, { seed: 5 });
S.run((t) => {
  const tt = Math.max(t - 4, 0), tau = tauAt('s04_quay', tt);
  const bob = waveHeight(CAM.x, CAM.z, t, 0.25, 0), roll = 1.2 * Math.sin(t * 1.1 + 0.4) + 0.6 * Math.sin(t * 1.9);
  const settle = -40 * Math.pow(1 - clamp(tt / 0.35), 5);                 // the whip down from s03 settles onto our view
  const pos = CAM.clone(); pos.y += bob * 0.8;
  const dir = LOOK.clone().sub(CAM).normalize(); const pitch0 = Math.asin(dir.y), yaw0 = Math.atan2(dir.x, -dir.z), p = pitch0 + settle * D2R;
  const look = pos.clone().add(new THREE.Vector3(Math.sin(yaw0) * Math.cos(p), Math.sin(p), -Math.cos(yaw0) * Math.cos(p)));
  const kb = kick(tt, BUS.twater - TAU0, 1.0);
  applyCam(S.camera, { pos, look, mm: 28, roll }, shake(t, 0.06 + 0.35 * kb, 1.0, 4));
  W.update(t, {
    tau,
    carPose: (c) => { if (!c.mine) return null; if (c.obj) return pose(c.obj, tau); const pk = parked.find((q) => q.c === c); return pk ? { p: new THREE.Vector3(pk.x, QUAY_H, pk.z), q: carQ(pk.yaw) } : null; },
    propPose: (p) => (p.mine && p.obj ? pose(p.obj, tau) : null),
    focus: new THREE.Vector3(MAIN_X, 6, 300),
  });
  BOATS.forEach((b, i) => { const y = waveHeight(b.x, b.z, t, 0.25, 0) + 0.15; _q.setFromEuler(new THREE.Euler(0.02 * Math.sin(t * 1.3 + i), b.yaw, 0.03 * Math.sin(t * 0.9 + i * 2), 'YXZ')); BT.setBoat(i, new THREE.Vector3(b.x, y, b.z), _q, b.L); });
  BT.commit();
  spray.update(t); wipe.update(t);
});
