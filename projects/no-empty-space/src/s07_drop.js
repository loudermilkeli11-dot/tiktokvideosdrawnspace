// s07_drop (film 37.0-43.0, 180 fr). Group B. From 60 m above the sea off the headland, 36 mm, a slow push (phase 3).
// The tower's grain (365,000 t in 1.4 mm) is falling through the rock beneath (depthAt('tower'): 78 -> 490 m) and the hill
// above it fails: a star of fissures cracks the plateau and notches the cliffs, the centre caves into a bowl, the wedge of
// cliff facing us slumps out and the sea pours into the notch; rocks tumble down the cliff faces into the water in splashes
// and spray, foam swirls toward the breach, dust rises and drifts in the gold light; tourists in a nearby boat point.
// Opens inside the last thin dust from s06 clearing. Page t = shot time + 4; everything is a pure function of FILM time.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake, kick } from '@engine/camera.js';
import { waveHeight } from '@engine/ocean.js';
import { createSpray } from '@engine/splash.js';
import { rng, clamp, sstep, ease } from '@engine/util.js';
import { harbourWorld, POST_DAY, SAMPLES, bits, makePerson, TOWER, HEAD, PAL, groundH, gradeDust, SUN, SUN_COL, HAZE, D2R, qn } from './kit.js';
import { SHOT } from './story.js';
import { headCap, caveDrop, CAVE, dustPuffs, foamPatches, boatsB } from './groupB_fx.js';
import { dustRing } from './fixBC_tower.js';

const NAME = 's07_drop', T0 = SHOT[NAME].t0;                   // 37.0
const AMP = 0.28;
// samples: 6 (kit says 8; measured 8 = 1.4-2.4 s/frame full size on the GPU with the dust + spray overdraw; the camera is a slow push)
const S = createStudio({ samples: Math.min(SAMPLES[NAME], 6), shadows: true, near: 0.1, far: 2.2e4, post: POST_DAY });
const W = harbourWorld(S, { box: 320, tower: false, ferry: false });          // the tower is gone (squeezed in s06)
const cap = headCap(S, W.town.terrain, { r: 250, step: 4 });
// the view: from the sea SW of the headland, looking up at the breach (the cliff facing us)
const PHI = (CAVE.BREACH[0] + CAVE.BREACH[1]) / 2;              // direction tower -> breach -> us
const DIRC = new THREE.Vector2(Math.cos(PHI), Math.sin(PHI));
// PHASE 3 (Director): raised from a boat at 2.6 m to a 60 m vantage (36 mm) so the plateau top, the fissures, the slumping wedge
// and the sea pouring into the notch all read at a glance (from sea level the cliff was a flat orange wall and the bowl was hidden).
const CAM_Y = qn('cy', 60);
const CAM0 = new THREE.Vector3(TOWER.x + DIRC.x * qn('cd', 560), CAM_Y, TOWER.z + DIRC.y * qn('cd', 560));
const AIM = new THREE.Vector3(TOWER.x + DIRC.x * 120, qn('ay', -5), TOWER.z + DIRC.y * 120);

// ---------------------------------------------------------------- rocks off the cliffs (rim points on the breach wedge and the
// fissures that reach the cliffs), each launched when its ground fails; splash time solved at load (closed form, bisection)
const RR = rng(303), rocks = [], spr = [], wbits = [], foamL = [], RC = [PAL.rock, PAL.rockDark, 0xb3a58f, 0x8a7a62, 0x9c8a70];
const K = 0.15, yAt = (p, v, a) => { const f = (1 - Math.exp(-K * a)) / K; return p[1] + v[1] * f - 9.81 * (a / K - f / K); };
const xzAt = (p, v, a) => { const f = (1 - Math.exp(-K * a)) / K; return [p[0] + v[0] * f, p[2] + v[2] * f]; };
for (let i = 0; i < 260; i++) {
  const breach = i < 170, a = breach ? CAVE.BREACH[0] + 0.04 + (CAVE.BREACH[1] - CAVE.BREACH[0] - 0.08) * RR() : PHI + (RR() < 0.5 ? -1 : 1) * (0.45 + 0.6 * RR());
  const r = 172 + 26 * RR(), x = TOWER.x + Math.cos(a) * r, z = TOWER.z + Math.sin(a) * r, h0 = groundH(x, z); if (h0 < 6) continue;
  const t0 = CAVE.T_CAVE + CAVE.DUR * (breach ? 0.32 + 0.6 * RR() : 0.08 + 0.5 * RR());
  const y0 = h0 - caveDrop(x, z, h0, t0) + 1, out = 2 + 6 * RR(), size = (breach ? 2.2 : 1.4) + (breach ? 6 : 3.5) * Math.pow(RR(), 1.6);
  const p = [x, y0, z], v = [Math.cos(a) * out, 1 + 3 * RR(), Math.sin(a) * out];
  rocks.push({ p, v, t0, size, col: RC[Math.floor(RR() * RC.length)], shape: RR() < 0.55 ? 0 : 2, drag: K, floor: -6, seed: RR(), spin: 0.6 });   // FIX PASS: angular blocks, never balls
  // where and when it hits the sea
  let lo = 0, hi = 12; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (yAt(p, v, m) > 0) lo = m; else hi = m; }
  const ts = t0 + hi, [sx, sz] = xzAt(p, v, hi), en = Math.min(1.6, size / 4);
  if (ts > T0 + 6.2) continue;
  for (let k = 0; k < 26 + 30 * en; k++) { const q = RR() * 6.283, sp = (2 + 7 * RR()) * en, kind = RR() < 0.7 ? 0 : 1;
    spr.push({ p: [sx, 0.2, sz], v: [Math.cos(q) * sp, (6 + 12 * RR()) * (0.6 + 0.6 * en), Math.sin(q) * sp], t0: ts + 0.08 * RR(), size: kind ? 1.2 + 2.2 * en : 0.25 + 0.5 * RR(), drag: kind ? 0.5 : 0.25, life: 4, kind }); }
  for (let k = 0; k < 6 + 10 * en; k++) { const q = RR() * 6.283, sp = (1.5 + 4 * RR()) * en;
    wbits.push({ p: [sx, 0, sz], v: [Math.cos(q) * sp, 5 + 9 * RR() * en, Math.sin(q) * sp], t0: ts, size: 0.3 + 0.7 * RR() * en, col: 0xffffff, shape: 0, drag: 0.3, floor: -3, seed: RR() }); }
  for (let k = 0; k < 4; k++) foamL.push({ x: sx + (RR() - 0.5) * 6 * en, z: sz + (RR() - 0.5) * 6 * en, s: (2 + 3 * RR()) * en, sx: 0.7 + 0.6 * RR(), r: RR() * 6, t0: ts + 0.2, t1: ts + 6, drift: [(RR() - 0.5) * 2, (RR() - 0.5) * 2] });
}
const rockB = bits(S, rocks), waterB = bits(S, wbits);
// the sea pours into the notch once the wedge is below sea level: white water jetting in, foam swirling toward it
const MOUTH = new THREE.Vector3(TOWER.x + DIRC.x * 192, 0, TOWER.z + DIRC.y * 192), T_FLOOD = CAVE.T_CAVE + CAVE.DUR * 0.62;
for (let k = 0; k < 1400; k++) { const side = (RR() - 0.5) * 70, along = new THREE.Vector2(-DIRC.y, DIRC.x), q = RR();
  const p = [MOUTH.x + along.x * side + DIRC.x * 12, 0.2, MOUTH.z + along.y * side + DIRC.y * 12], inw = 8 + 10 * RR();
  spr.push({ p, v: [-DIRC.x * inw - along.x * side * 0.12, 3 + 9 * q, -DIRC.y * inw - along.y * side * 0.12], t0: T_FLOOD + 2.2 * RR(), size: RR() < 0.7 ? 0.3 + 0.5 * RR() : 1.5 + 2 * RR(), drag: 0.6, life: 2.2, kind: RR() < 0.7 ? 0 : 1 }); }
const swirl = []; for (let k = 0; k < 180; k++) swirl.push({ r0: 25 + 90 * RR(), a0: (RR() - 0.5) * 2.6, s: 1.5 + 4 * RR(), sx: 0.4 + 0.5 * RR(), t0: T_FLOOD - 0.2 + 1.5 * RR() });
const spray = createSpray(S, spr, { hazeD: 9000 });
spray.U.sunDir.value.copy(SUN); spray.U.sunCol.value.set(SUN_COL).multiplyScalar(1.15); spray.U.amb.value.set(0x9ab8d8); spray.U.hazeCol.value.set(HAZE.col); spray.U.streak.value = 1 / 15;
{ const ob = W.ocean.refl.onBeforeRender; W.ocean.refl.onBeforeRender = (r, sc, cam) => { spray.mesh.visible = false; ob && ob(r, sc, cam); spray.mesh.visible = true; }; }
const foam = foamPatches(S, [...foamL, ...swirl.map((f) => ({ ...f, x: 0, z: 0, t1: 60 }))]);
const NF = foamL.length;
// ---------------------------------------------------------------- dust: rising from the cracks and the bowl, drifting in the gold
// light; plus the last of s06's dust ring drifting past the lens at the start, clearing
const DC = [0xd9b88c, 0xcaa676, 0xe8cfa6, 0xbf9a6a, 0xd4b48e], puffs = [];
for (let k = 0; k < 900; k++) { const a = RR() * 6.283, r = Math.sqrt(RR()) * 150, x = TOWER.x + Math.cos(a) * r, z = TOWER.z + Math.sin(a) * r, h0 = groundH(x, z);
  const t0 = CAVE.T_CAVE + CAVE.DUR * (0.1 + 0.9 * RR());
  puffs.push({ p: [x, Math.max(h0 - caveDrop(x, z, h0, t0 + 0.3), 0) + 2, z], v: [3 + 4 * RR(), 6 + 16 * RR(), -1 + 2 * RR()], t0, size: 3 + 5 * RR(), grow: 2.5 + 4 * RR(), col: DC[Math.floor(RR() * DC.length)], drag: 0.6, life: 4 + 3 * RR(), flat: 0.75 }); }
// dust spurting out of the cracks as they run outward across the plateau and down the cliffs (the star, read at a glance)
for (const ai of [CAVE.BREACH[0] - 0.02, CAVE.BREACH[1] + 0.02, (CAVE.BREACH[0] + CAVE.BREACH[1]) / 2 + 0.06, 1.45, 3.55]) for (let k = 0; k < 70; k++) {
  const r = 30 + 185 * RR(), kf = 0.4 * Math.max(0, (r - 70) / 160) + 0.02, x = TOWER.x + Math.cos(ai) * r, z = TOWER.z + Math.sin(ai) * r, h0 = groundH(x, z);
  if (h0 < 3) continue; const t0 = CAVE.T_CAVE + CAVE.DUR * kf * (0.9 + 0.2 * RR());
  puffs.push({ p: [x, h0 - 4, z], v: [Math.cos(ai) * 3, 10 + 16 * RR(), Math.sin(ai) * 3], t0, size: 2 + 3 * RR(), grow: 2.5 + 3 * RR(), col: DC[Math.floor(RR() * DC.length)], drag: 0.7, life: 3 + 2 * RR(), flat: 0.8 }); }
const FWD = new THREE.Vector3().subVectors(AIM, CAM0).setY(0).normalize(), RT = new THREE.Vector3(-FWD.z, 0, FWD.x), thin = [];
for (let k = 0; k < 110; k++) { const d = 25 + 200 * Math.pow(RR(), 1.3), side = (RR() - 0.5) * d * 0.8;
  const p = CAM0.clone().addScaledVector(FWD, d).addScaledVector(RT, side); p.y = 1 + d * 0.08 * RR();
  thin.push({ p: p.toArray(), v: [RT.x * 5 + FWD.x * 2, 0.4, RT.z * 5 + FWD.z * 2], t0: T0 - 1.2 - 0.5 * RR(), size: 0.6 + 0.022 * d * (0.5 + RR()), grow: 0.8 + 1.2 * RR(), col: DC[Math.floor(RR() * DC.length)], drag: 0.3, life: 2.0 + 0.9 * RR(), flat: 0.3 }); }
// the headland's trees ride the ground down (and lean into the cracks) instead of hanging in the air
const TREES = []; { const _m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  (W.town.trees ?? []).forEach((m) => { for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, _m); _m.decompose(p, q, s);
    if (Math.hypot(p.x - TOWER.x, p.z - TOWER.z) < 245) TREES.push({ m, i, p: p.clone(), q: q.clone(), s: s.clone(), h0: groundH(p.x, p.z) }); } }); }
// FIX PASS (NEVER SHIP #1): the lumpy puffs are replaced by THIN, CRISP dust rings (fixBC_tower.js dustRing): one round the
// sinking bowl, small spurts along the cracks as they run out, and a low wall at the breach mouth where the wedge slumps into the
// sea (with a white spray skirt). s06 now ends on a crisp ring, so the "clearing dust" opening is dropped too.
void puffs; void thin; void dustPuffs;
const RINGS = [];
RINGS.push(dustRing(S, { c: new THREE.Vector3(TOWER.x, 0, TOWER.z), t0: CAVE.T_CAVE + CAVE.DUR * 0.15, v: 38, k: 0.7, r0: 25, H0: 30, Hend: 12, lean: 0.35, segA: 240, life: 4.2, spray: false,
  base: () => HEAD.y - 14, col: 0xd9bb8e, op: 0.7 }));
for (const ai of [CAVE.BREACH[0] - 0.02, CAVE.BREACH[1] + 0.02, (CAVE.BREACH[0] + CAVE.BREACH[1]) / 2 + 0.06, 1.45, 3.55]) for (const r of [70, 125, 180]) {
  const x = TOWER.x + Math.cos(ai) * r, z = TOWER.z + Math.sin(ai) * r, h0 = groundH(x, z); if (h0 < 3) continue;
  const kf = 0.4 * Math.max(0, (r - 70) / 160) + 0.02, t0 = CAVE.T_CAVE + CAVE.DUR * kf;
  RINGS.push(dustRing(S, { c: new THREE.Vector3(x, 0, z), t0, v: 14, k: 1.1, r0: 2, H0: 16, Hend: 7, lean: 0.25, segA: 120, life: 3.2, spray: false, base: () => h0 - 8, col: 0xd6b48a, op: 0.65 })); }
RINGS.push(dustRing(S, { c: MOUTH.clone(), t0: CAVE.T_CAVE + CAVE.DUR * 0.5, v: 30, k: 0.6, r0: 15, H0: 34, Hend: 14, lean: 0.4, segA: 260, life: 4, base: () => 0, col: 0xdcc096, op: 0.7 }));
const dust = { update: (f) => RINGS.forEach((r) => r.update(f)) }, dustThin = { update() {} };
// ---------------------------------------------------------------- a gozzo nearby: two tourists point at the hill, the skipper holds his cap
const NB = (() => { const f = new THREE.Vector3().subVectors(AIM, CAM0).setY(0).normalize(), r = new THREE.Vector3(-f.z, 0, f.x);
  const p = CAM0.clone().addScaledVector(f, qn('bd', 150)).addScaledVector(r, qn('bx', -22)); return { x: p.x, z: p.z }; })();   // ahead-left, low in frame
const nb = boatsB(S, [{ x: NB.x, z: NB.z, yaw: PHI + Math.PI * 0.5, s: 1.15, col: 0x2f6fb8, ph: 1.3 }]);   // broadside to us
const folk = [makePerson(S, { hair: 'long', fem: 0.9, top: 0x2fa8a8, bot: 0xf4f1ea, height: 1.66, hat: { k: 1, col: 0xf2e3b8, band: 0xd2402e }, pose: 'point' }),
  makePerson(S, { hair: 'short', top: 0xf08a2a, bot: 0x24345a, build: 1.2, height: 1.78, hat: { k: 3, col: 0x24345a, band: 0xf4f1ea }, pose: 'point' }),
  makePerson(S, { hair: 'short', top: 0xf4f1ea, bot: 0x4d6f9a, build: 1.05, height: 1.7, hat: { k: 2, col: 0xe8d29a, band: 0x2a3550 }, pose: 'holdHat' })];
['point', 'handsHead', 'holdHat', 'pocket'].forEach((p) => folk.forEach((f) => f.setPose(p)));
const FL = [[-0.5, -1.6, 'point'], [0.5, -0.6, 'point'], [0, 1.6, 'holdHat']];

S.run((t) => {
  const tt = Math.max(t - 4, 0), film = T0 + tt, page = film + 4;
  // our boat rides the swell: a slow push in; the rumble of the collapse shakes the frame
  const u = ease.inOutSine(clamp(tt / 6)), pos = CAM0.clone().lerp(AIM.clone().setY(CAM0.y), 0.03 * u);
  pos.y = CAM_Y + waveHeight(pos.x, pos.z, page, AMP, 0) * 0.8 * (CAM_Y < 10 ? 1 : 0.3);
  const quake = 0.02 + 0.07 * sstep(CAVE.T_CAVE, CAVE.T_CAVE + 0.4, film) * (1 - sstep(41.3, 42.6, film)) + 0.25 * kick(film, CAVE.T_CAVE + CAVE.DUR * 0.32, 1.4);
  applyCam(S.camera, { pos, look: AIM, mm: qn('mm', 36) + 3 * u, roll: 0.4 * Math.sin(page * 0.8) }, shake(t, quake, 3.5, 11));
  W.update(film, { focus: new THREE.Vector3(TOWER.x + DIRC.x * 150, 0, TOWER.z + DIRC.y * 150), box: 320, agitation: 0.6 });
  // the hill fails
  // the ground: evaluated at the frame's own time (quantised to 1/30 s: deterministic; slow motion, so no sub-sample blur needed)
  const fq = Math.round(film * 30) / 30;
  cap.update((x, z, h0) => caveDrop(x, z, h0, fq), fq);
  if (TREES.lastKey !== fq) { TREES.lastKey = fq; const film = fq; const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), ax = new THREE.Vector3(), touched = new Set();
    TREES.forEach((tr) => { const d = caveDrop(tr.p.x, tr.p.z, tr.h0, film), dx = caveDrop(tr.p.x + 3, tr.p.z, tr.h0, film) - d, dz = caveDrop(tr.p.x, tr.p.z + 3, tr.h0, film) - d;
      ax.set(dz, 0, -dx); const tilt = Math.min(0.9, ax.length() * 0.12); if (tilt > 1e-4) ax.normalize(); _q.setFromAxisAngle(ax.lengthSq() > 0 ? ax : new THREE.Vector3(1, 0, 0), tilt).multiply(tr.q);
      tr.m.setMatrixAt(tr.i, _m.compose(new THREE.Vector3(tr.p.x, tr.p.y - d, tr.p.z), _q, tr.s)); touched.add(tr.m); });
    touched.forEach((m) => { m.instanceMatrix.needsUpdate = true; }); }
  rockB.update(film); waterB.update(film); spray.update(film); dust.update(film); dustThin.update(film);
  foam.update(film, (x, z) => waveHeight(x, z, page, AMP, 0));
  // the swirl: foam patches spiral in toward the notch mouth, faster as they close in
  swirl.forEach((f, i) => { const a = Math.max(0, film - f.t0), R = f.r0 * Math.exp(-0.35 * a), ang = f.a0 + 0.9 * (1 - R / f.r0) * 3;
    const along = new THREE.Vector2(-DIRC.y, DIRC.x), dx = Math.cos(ang), dz = Math.sin(ang);
    const it = foam.mesh, m = new THREE.Matrix4(); if (film < f.t0) { it.setMatrixAt(NF + i, m.makeScale(0, 0, 0)); return; }
    const x = MOUTH.x + (DIRC.x * dx + along.x * dz) * R, z = MOUTH.z + (DIRC.y * dx + along.y * dz) * R;
    it.setMatrixAt(NF + i, m.compose(new THREE.Vector3(x, waveHeight(x, z, page, AMP, 0) + 0.08, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang + 1.57), new THREE.Vector3(f.s * 2.2, 1, f.s * f.sx))); });
  foam.mesh.instanceMatrix.needsUpdate = true;
  // the nearby boat and its people
  nb.update(film, (b) => { const y = waveHeight(b.x, b.z, page, AMP, 0) - 0.35; const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.05 * Math.sin(page * 1.2 + 1), b.yaw, 0.07 * Math.sin(page * 1.0 + 2), 'YXZ'));
    const P = new THREE.Vector3(b.x, y, b.z); folk.forEach((f, i) => { const [lx, lz, pose] = FL[i]; f.root.position.set(lx, 1.27, lz).applyQuaternion(q).add(P); f.root.quaternion.copy(q);
      f.root.rotateY(Math.PI - 0.5 + 0.35 * i); f.setPose(film > 39.4 && i === 0 ? 'handsHead' : pose); }); return { p: P, q }; });
  gradeDust(S, 0.32 - 0.06 * sstep(T0, T0 + 1.6, film) + 0.16 * sstep(CAVE.T_CAVE + 1, CAVE.T_CAVE + 3, film));   // FIX PASS: matches s06's new end (0.32)
});
