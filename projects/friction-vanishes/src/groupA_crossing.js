// groupA_crossing: the SHARED frame-1 logic of s01_crossing and s09_loop (Builder group A). Both shots build the world with
// crossingA(S) and call A.update(tau). Page time passed to the kit is 4 + tau, so s09's last frame (tau -1/30) and s01's
// frame 0 (tau 0) differ only by 1/30 s of motion (birds, sway, fountain, cars all read the same clock).
// Additions on top of the kit's crossingWorld (project-side meshes only):
//   - camera A_CAM (frame 1): high enough to read the stop line and the zebra; the hero and the cars sit RIGHT of the
//     counter block (x 50-290, y 370-500), the title zone is buildings + sky
//   - a traffic signal on a mast arm over the westbound lanes (amber -> red at tau -0.8), a white stop line
//   - the red hero car starts at the stop line (carX0 A_CAR_X0) braking; dark rubber skid marks laid tau -0.3 -> 0 (grip
//     until friction vanishes at tau 0), then no more marks: it slides on at coastV (story.js brakeCarX)
//   - a second braking car (outer westbound lane), coasting by coastX (drag only), brake lights on
//   - a turning taxi mid-left-turn: before tau 0 it follows its arc (R 16 m, 8 m/s); after tau 0 it keeps its velocity AND
//     its yaw rate (kit spinCar): it glides dead straight into the plaza while pirouetting
//   - a cafe terrace on our pavement (tables, benches, planters) that drifts and turns slowly after tau 0
//   - people: the kit crowd, minus anyone near a car path or behind the counter block; walkers' feet go 0.15-1.2 s
import { THREE } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { rng, clamp, fbm, sstep } from '@engine/util.js';
import { createCrowd } from '@engine/crowd.js';
import { crossingWorld, brakeLights, carQ, setCarColor, spinCar, lookDir, slipCrowd, D2R, SL, HERO_CAR, COL } from './kit.js';
import { brakeCarX, coastX, V0 } from './story.js';

// ---------------------------------------------------------------- frame-1 constants (s01 AND s09 use exactly these)
export const A_CAM = { pos: new THREE.Vector3(108.5, 3.4, 71.2), yaw: -83.0, pitch: -9.7, mm: 35 };   // yaw deg (0 = -Z, -90 = -X)
export const A_CAR_X0 = 75.5;                  // hero car nose at tau 0: 7.6 m before the stop line, brakes on, skid marks behind it
export const A_HERO = new THREE.Vector3(88.0, 0, 67.55), A_HERO_YAW = 76 * D2R;   // on the kerb edge, facing the junction
export const STOP_X = 68.4;                        // white stop line (the zebra is x 63-67)
export const BRAKE_ON = -0.3, LIGHT_RED = -0.8;    // brake lights / squeal from tau -0.3; the signal turns red at tau -0.8
// car 2: outer westbound lane, ahead in the junction, also braking (45 km/h)
// (same lane as the hero car, 30 m ahead and clear of the taxi's path; 1.4 m/s slower: the gap closes only to 25 m by tau 4)
const C2 = { lane: SL(0) + 1.75, x0: 40.0, v: 12.5, brakeOn: -0.45, col: 0x2a4f9a };
// turning taxi (left turn from the southbound lane x 58.25 into the westbound lane z 61.75): arc centre, radius, speed
const TX = { cx: SL(0) - 1.75 - 16, cz: SL(0) + 1.75 + 16, R: 16, v: 8, a0: Math.PI / 4, col: 0xe0b23a };
TX.w = TX.v / TX.R;                                // yaw rate 0.5 rad/s, kept after tau 0 (no friction = no torque)
export function taxiPose(tau) {
  if (tau <= 0) { const a = TX.a0 + TX.w * tau; return { x: TX.cx + TX.R * Math.cos(a), z: TX.cz - TX.R * Math.sin(a), yaw: Math.PI + a }; }
  const a = TX.a0, p0 = { x: TX.cx + TX.R * Math.cos(a), z: TX.cz - TX.R * Math.sin(a) }, dir = { x: -Math.sin(a), z: -Math.cos(a) };
  return spinCar(p0, dir, TX.v, Math.PI + a, TX.w, tau);
}
export const camA = (tau, shk = 0) => {
  const look = lookDir(A_CAM.pos, A_CAM.yaw, A_CAM.pitch);
  return { st: { pos: A_CAM.pos.clone(), look, mm: A_CAM.mm, roll: 0 }, sh: shake(4 + tau, shk, 0.8, 3) };
};

// ---------------------------------------------------------------- build
export function crossingA(S) {
  const W = crossingWorld(S, { carX0: A_CAR_X0 });
  const { C, crowd, hero, HC } = W, scene = S.scene, cam = A_CAM.pos;
  hero.root.position.copy(A_HERO); hero.root.rotation.y = A_HERO_YAW;
  // trees / lamp poles / props between the lens and the junction on our pavement (they hang in the frame)
  const treeMs = C.group.children.filter((m) => m.isInstancedMesh && m.count === C.trees.length), Z0 = new THREE.Matrix4().makeScale(0, 0, 0);
  const pathPts = [];                                       // every car path sample (x, z) for keep-outs
  for (let tau = -1; tau <= 4.2; tau += 0.1) { const p = taxiPose(tau); pathPts.push([p.x, p.z]); }
  const nearPath = (x, z, r) => pathPts.some(([px, pz]) => Math.hypot(x - px, z - pz) < r);
  treeMs.forEach((M) => { C.trees.forEach((tr, i) => { if ((tr.z > 66 && tr.z < 74 && tr.x > 64 && tr.x < 140) || nearPath(tr.x, tr.z, 4)) M.setMatrixAt(i, Z0); }); M.instanceMatrix.needsUpdate = true; });
  const poles = C.group.children.find((m) => m.isInstancedMesh && m.geometry.parameters && m.geometry.parameters.radiusTop === 0.09);
  if (poles) { const m4 = new THREE.Matrix4(), v = new THREE.Vector3(); for (let i = 0; i < poles.count; i++) { poles.getMatrixAt(i, m4); v.setFromMatrixPosition(m4);
      if ((v.z > 66 && v.z < 74 && v.x > 72 && v.x < 140) || nearPath(v.x, v.z, 3.5)) poles.setMatrixAt(i, Z0); } poles.instanceMatrix.needsUpdate = true; }
  // cafe terrace: re-use city props (kind 3 tables, 0 benches, 2 planters) on our pavement 12-20 m from the lens
  const R = rng(4242), terrace = [];
  const want = [3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 1];
  const used = new Set();
  want.forEach((k, j) => { const p = C.props.find((q, i) => q.kind === k && !used.has(i) && (used.add(i) || true)); if (!p) return;
    const row = j % 3, col = Math.floor(j / 3);
    const x = 101.0 - col * 2.4 - R() * 0.5, z = k === 0 ? 72.3 : k === 2 ? 72.4 : 70.2 + row * 1.0 + R() * 0.2;
    terrace.push({ p, x0: x, z0: z, yaw0: R() * 6.28, vx: (R() - 0.5) * 0.5, vz: (R() - 0.5) * 0.3, w: (R() - 0.5) * 0.5 }); });
  const terraceSet = new Set(terrace.map((o) => o.p));
  C.props.forEach((p) => { if (!terraceSet.has(p) && (Math.hypot(p.x - cam.x, p.z - cam.z) < 14 || nearPath(p.x, p.z, 4) || (p.z > 52 && p.z < 68 && p.x > -60 && p.x < 140))) p.y = -60; });
  // people: nobody near a car path or in the roadway; our pavement between the junction and the lens stays clear (counter block)
  crowd.meshes.forEach((m) => m.userData.list.forEach((p) => {
    const ox = p.x, oz = p.z; let hide = false;
    if (oz > 66 && ox > 70 && ox < 135) hide = true;                     // our pavement near the lens: behind the counter type
    if (nearPath(ox, oz, 6)) hide = true;
    for (let tau = -1; tau <= 4.01 && !hide; tau += 0.5) { const yw = p.yaw || 0, x = ox - Math.sin(yw) * (p.walkV || 0) * tau, z = oz - Math.cos(yw) * (p.walkV || 0) * tau;
      if (z > 52.5 && z < 67.5 && x > 30 && x < 100) hide = true;          // roadway with sliding cars
      if (nearPath(x, z, 4)) hide = true; }
    if (hide) p.y0 = -200;
    const r = rng(Math.floor(p.seed * 1e6));
    p.fall = p.walkV ? 0.15 + r() * 1.05 : r() < 0.35 ? 0.9 + r() * 2.6 : null;   // walkers' feet go first; some standers later
    p.sv = p.walkV ? null : [(r() - 0.5) * 0.6, (r() - 0.5) * 0.6];              // a stander pushes off a little as they go
  }));
  // car 2 and the taxi: re-use two avenue cars (the kit hid them as "gone")
  const pick = (pred) => C.cars.find((c) => !c.hero && pred(c));
  const car2 = pick((c) => c.L > 4 && c.L < 5); Object.assign(car2, { gone: false, L: 4.6, H: 1.5, W: 1.85, a2: true }); setCarColor(C, C.cars.indexOf(car2), C2.col);
  const taxi = pick((c) => c !== car2 && c.L > 4 && c.L < 5); Object.assign(taxi, { gone: false, L: 4.5, H: 1.5, W: 1.85, tx: true }); setCarColor(C, C.cars.indexOf(taxi), TX.col);
  const BL2 = brakeLights(S, car2);
  // brake lights: bigger lamps + a high centre lamp, deep red (the kit's 4x emissive on 0xff2a1a tone-maps to orange)
  for (const [B, c] of [[W.BL, HC], [BL2, car2]]) { const kids = [...B.group.children], mat = kids[0].material; mat.emissive.set(0xff0a04); mat.color.set(0x200000);
    kids.forEach((k) => { k.scale.set(1.5, 1.9, 1.4); });
    const c3 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.05), mat); c3.position.set(0, 0.32 + c.H * 0.55 + 0.06, -c.L * 0.31 - 0.03); B.group.add(c3);
    const gl = new THREE.PointLight(0xff1a08, 0, 8, 2); gl.position.set(0, 0.75, -c.L / 2 - 0.5); B.group.add(gl); B.glow = gl; }
  // foreground walkers on our pavement, 11-16 m from the lens, walking AWAY from it (they glide on at walking speed after the
  // slip, so nobody nears the lens or the hero); two cafe customers stand, then lose their footing when they shift weight
  // (yaw pi/2 + 0.35: walking -X and drifting away from the kerb, so they never come near the hero at the kerb edge)
  const near = [
    { x: 95.6, z: 68.25, yaw: Math.PI / 2 + 0.36, walk: 1.05, fall: 0.3, pose: 'pocket' },
    { x: 93.9, z: 68.75, yaw: Math.PI / 2 + 0.3, walk: 0.95, fall: 0.85, pose: 'stand' },
    { x: 97.4, z: 68.9, yaw: Math.PI / 2 + 0.4, walk: 1.0, fall: 1.2, pose: 'arms' },
  ];
  const crowd2 = createCrowd(S, near, { poses: ['pocket', 'stand', 'arms'], rimI: 0.25, seed: 77 });
  crowd2.meshes.forEach((m) => m.userData.list.forEach((p) => { p.walkV = p.walk; }));
  // ---- the traffic signal on a mast arm (our corner, over the westbound lanes); lamps face the oncoming (+X) traffic
  const sig = new THREE.Group(); scene.add(sig);
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.5, metalness: 0.6 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 6.2, 10), metal); pole.position.set(69.6, 3.1, 68.4); pole.castShadow = true; sig.add(pole);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 9.4, 8), metal); arm.rotation.x = Math.PI / 2; arm.position.set(69.6, 6.0, 63.9); arm.castShadow = true; sig.add(arm);
  const lampMats = [0xff0d05, 0xff8a00, 0x30ff70].map((c) => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: c, emissiveIntensity: 0, roughness: 0.3 }));
  const heads = [];
  for (const z of [SL(0) + 5.25, SL(0) + 1.75]) {
    const g = new THREE.Group(); g.position.set(69.6, 4.95, z); sig.add(g);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.3, 0.5), new THREE.MeshStandardMaterial({ color: 0x1b1d1f, roughness: 0.6 })); box.castShadow = true; g.add(box);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 0.8), new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.8 })); plate.position.x = -0.24; g.add(plate);
    const hang = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6), metal); hang.position.y = 0.85; g.add(hang);
    [0.4, 0, -0.4].forEach((y, k) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 10, 0, Math.PI), lampMats[k]); l.rotation.y = Math.PI / 2; l.position.set(0.22, y, 0); g.add(l);
      const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.22, 12, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x141516, roughness: 0.7, side: THREE.DoubleSide }));
      hood.rotation.z = Math.PI / 2; hood.rotation.y = Math.PI / 2; hood.position.set(0.32, y + 0.02, 0); g.add(hood); });
    heads.push(g);
  }
  // ---- road paint: the stop line (white, across the westbound lanes) + skid marks (dark rubber)
  const paint = new THREE.MeshStandardMaterial({ color: 0xd8d8d2, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
  const stopL = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 7.0).rotateX(-Math.PI / 2), paint); stopL.position.set(STOP_X, 0.012, SL(0) + 3.5); stopL.receiveShadow = true; scene.add(stopL);
  const rubber = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.95, transparent: true, opacity: 0.82, polygonOffset: true, polygonOffsetFactor: -3, depthWrite: false });
  const markG = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const marks = new THREE.InstancedMesh(markG, rubber, 8); marks.frustumCulled = false; marks.renderOrder = 2; scene.add(marks);
  const m4 = new THREE.Matrix4(), qI = new THREE.Quaternion(), vP = new THREE.Vector3(), vS = new THREE.Vector3();
  // a braking car's 4 locked wheels lay 2 tracks from where the brakes bit (tau b0) to where the grip vanished (tau 0)
  const setMarks = (k0, xNose, laneZ, c, tau, b0) => {
    const t1 = Math.min(tau, 0);
    for (let s = 0; s < 2; s++) { const z = laneZ + (s ? 1 : -1) * c.W * 0.45;
      if (t1 <= b0) { marks.setMatrixAt(k0 + s, Z0); continue; }
      const xa = xNose(b0) + c.L / 2 + c.L * 0.33, xb = xNose(t1) + c.L / 2 - c.L * 0.33;   // rear wheel at b0 -> front wheel now
      m4.compose(vP.set((xa + xb) / 2, 0.015, z), qI, vS.set(Math.max(0.01, xa - xb), 1, 0.24)); marks.setMatrixAt(k0 + s, m4); }
  };
  const heroNose = (tau) => A_CAR_X0 - brakeCarX(tau, 5);
  const c2Nose = (tau) => C2.x0 - coastX(C2.v, tau);
  return { W, hero, car2, taxi, terrace,
    // tau: story time (s01: tt; s09: tt - 1). Page time for the kit = 4 + tau (continuous across the loop cut)
    update(tau, o = {}) {
      const tp = 4 + tau;
      // terrace props drift with the tiny velocities they had, turning slowly (no friction to stop them)
      const d = Math.max(tau, 0);
      terrace.forEach((q) => { q.p.x = q.x0 + q.vx * d; q.p.z = Math.min(72.6, q.z0 + q.vz * d); q.p.yaw = q.yaw0 + q.w * d; q.p.y = 0; });
      W.update(tp, { tau, T: 5, agitation: 0.22 + 0.4 * sstep(0.3, 1.5, tau),
        carPose: (c) => {
          if (c.a2) { const x = c2Nose(tau); return { p: new THREE.Vector3(x + c.L / 2, 0, C2.lane), q: carQ(-Math.PI / 2) }; }
          if (c.tx) { const P = taxiPose(tau); return { p: new THREE.Vector3(P.x, 0, P.z), q: carQ(P.yaw) }; }
          return undefined; },
        fallAt: (p) => (tau < 0 ? null : p.fall), slide: (p) => p.sv,
        focus: new THREE.Vector3(78, 0, 62) });
      slipCrowd(crowd2, tp, tau, { agitation: 0.3, fallAt: (p) => (tau < 0 ? null : p.fall), slide: (p) => p.sv || null });
      BL2.set(new THREE.Vector3(c2Nose(tau) + car2.L / 2, 0, C2.lane), carQ(-Math.PI / 2), tau > C2.brakeOn ? 1 : 0);
      W.BL.glow.intensity = tau > BRAKE_ON ? 9 : 0; BL2.glow.intensity = tau > C2.brakeOn ? 9 : 0;
      setMarks(0, heroNose, HERO_CAR.lane, HC, tau, BRAKE_ON); setMarks(2, c2Nose, C2.lane, car2, tau, C2.brakeOn);
      marks.instanceMatrix.needsUpdate = true;
      // signal: amber before LIGHT_RED, then red (it stays red: grip is the story, not the light)
      const red = tau >= LIGHT_RED ? 1 : 0;
      lampMats[0].emissiveIntensity = 1.7 * red; lampMats[1].emissiveIntensity = 1.8 * (1 - red); lampMats[2].emissiveIntensity = 0;
      // the hero: still on the kerb, a small sway (no walking, so they keep their footing)
      const sw = fbm(tp * 0.6 + 3.1, 3);
      hero.root.rotation.set(0.012 * sw, A_HERO_YAW + 0.04 * fbm(tp * 0.4 + 9, 2), 0.02 * sw);
    } };
}
