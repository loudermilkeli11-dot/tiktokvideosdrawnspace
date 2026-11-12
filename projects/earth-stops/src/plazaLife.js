// earth-stops v2 (Commander 11-12 critique): life and gags on the hero plaza, for s01_plaza and s09_loop ONLY (both build
// it through groupA_plaza.plazaSet, so s09's last frame + 1/30 s still = s01 frame 0). Same law as the kit's crowd: from
// T_STOP every loose thing goes east (+X, screen-right) at V (story.drift), tumbling (story.roll), hops <= 1.6 m (story.hop).
//   near crowd : ~110 full-colour people in the near half of the plaza (walking, chatting in groups, phones, pointing).
//   gaggers    : people clearly laughing (leaning back, hands on belly) and goofing (arms up, bouncing), facing the lens.
//   clinger    : a man in a red top grabs a lamp post at the stop; his body streams out east like a flag (flutters), then
//                at film CLING_REL he lets go and is swept away with the crowd. Cartoon-style DRAMATIZATION (a real hold at
//                Mach 1.1 is impossible); no impacts shown.
//   gags       : a hot-dog cart (striped umbrella), a dog, hats that fly off heads, umbrellas already in groupA.
import { THREE } from '@engine/engine.js';
import { rng } from '@engine/util.js';
import { createCrowd, createHero } from '@engine/crowd.js';
import { POSES } from '@engine/figure.js';
import { styliseMat, ZERO_M, HERO_POS, FRAME1_CAM, createChips } from './kit.js';
import { evAt, drift, hop, roll, T_STOP, V } from './story.js';

// extra poses (added to the shared POSES table in this page only)
POSES.laugh = { R: { t: [0.12, 1.02, -0.2], pole: [1, -0.6, 0.4] }, L: { t: [-0.12, 1.0, -0.2], pole: [-1, -0.6, 0.4] }, legR: [0.04, 0.08, 0.1], legL: [-0.04, 0.08, 0.12], lean: 0.2, head: [0, 0.45] };
POSES.cheer = { R: { t: [0.42, 2.05, -0.12], pole: [1, -0.3, 0] }, L: { t: [-0.42, 2.05, -0.12], pole: [-1, -0.3, 0] }, legR: [0.1, 0.12, 0.2], legL: [-0.12, 0.12, 0.25], lean: 0.06, head: [0, 0.35] };
POSES.cling = { R: { t: [0.06, 2.12, -0.05], pole: [1, 0, 0.3] }, L: { t: [-0.06, 2.06, -0.05], pole: [-1, 0, 0.3] }, legR: [0.25, 0.12, 0.35], legL: [-0.15, 0.1, 0.1], lean: 0.0, head: [0, 0.2] };
POSES.leanPole = { R: { t: [0.36, 1.45, 0.0], pole: [1, -0.6, 0.4] }, L: { t: [-0.1, 1.0, -0.22], pole: [-1, -0.8, 0.4] }, legR: [0.02, 0.05, 0.03], legL: [-0.1, 0.1, 0.2], lean: 0.02, head: [0.4, 0.2], hip: 0.08 };

const ZAX = new THREE.Vector3(0, 0, 1), YAX = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _o = new THREE.Vector3();
const M = (c, o = {}) => styliseMat(new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o }));
const sst = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

POSES.cling2 = { R: { t: [0.06, 2.12, -0.05], pole: [1, 0, 0.3] }, L: { t: [-0.06, 2.06, -0.05], pole: [-1, 0, 0.3] }, legR: [-0.15, 0.1, 0.1], legL: [0.25, 0.12, 0.35], lean: 0.0, head: [0, 0.2] };
POSES.flail = { R: { t: [0.5, 1.9, 0.25], pole: [1, -0.3, 0.2] }, L: { t: [-0.55, 1.3, -0.3], pole: [-1, -0.3, 0] }, legR: [0.3, 0.15, 0.4], legL: [-0.25, 0.1, -0.2], lean: 0.1, head: [0.3, 0.4] };
// v3 (Commander 11-12 critique #1): the lamp post moved from 24 m to ~12 m from the lens so the clinger is big on a phone
// v4 (Commander 11-12 fix #1): moved again, to the kerb edge of the south sidewalk (z 52.5, ~11.5 m from the lens), and s01/s09
// shoot it on FRAME1_CAM.mm + F1_ZOOM, so the clinger fills about a third of the frame width
export const LAMP = new THREE.Vector3(-2.2, 0, 52.5), GRIP_Y = 4.7, F1_ZOOM = 3;
export const CLING_REL = 4.8;                                                       // film s: he lets go (s01 tt 4.8)

export function plazaLife(S, W) {
  const R = rng(1112);
  const camZ = FRAME1_CAM.pos.z, inView = (x, z) => Math.abs(x - 1) < 1.5 + 0.3 * (camZ - z);
  const clear = (x, z) => Math.hypot(x - HERO_POS.x, z - HERO_POS.z) > 2.4 && Math.hypot(x - LAMP.x, z - LAMP.z) > 3.2;
  // ---- near crowd: chat groups + walkers
  const near = [];
  for (let g = 0; g < 26; g++) {                                                    // chat groups of 2-4 facing each other
    const cx = -14 + R() * 30, cz = 16 + R() * 30; if (!inView(cx, cz) || !clear(cx, cz)) continue;
    const n = 2 + Math.floor(R() * 3);
    for (let k = 0; k < n; k++) { const a = (k / n) * 6.28 + R(), x = cx + Math.cos(a) * 0.75, z = cz + Math.sin(a) * 0.75;
      near.push({ x, z, y: 0, yaw: Math.atan2(cx - x, -(cz - z)) * -1, pose: ['stand', 'pocket', 'arms', 'point', 'phoneUp'][Math.floor(R() * 5)] }); } }
  for (let i = 0; i < 46; i++) { const x = -16 + R() * 34, z = 12 + R() * 36; if (!inView(x, z) || !clear(x, z)) continue;
    const dir = R() < 0.5 ? 1 : -1, alongX = R() < 0.55;
    near.push({ x, z, y: 0, yaw: alongX ? (dir > 0 ? -Math.PI / 2 : Math.PI / 2) : (dir > 0 ? Math.PI : 0), pose: ['stand', 'pocket', 'phoneUp'][Math.floor(R() * 3)],
      walk: { vx: alongX ? 1.25 * dir : 0, vz: alongX ? 0 : 1.25 * dir } }); }
  const crowd = createCrowd(S, near, { poses: ['stand', 'pocket', 'arms', 'point', 'phoneUp'], rimI: 0.25, seed: 21 });
  crowd.phones.forEach((ph) => { ph.visible = false; });
  // ---- gaggers: laughing and goofing, turned toward the lens
  const gag = [[-2.5, 33], [-1.6, 33.4], [5.5, 30], [6.4, 29.6], [-9, 28], [9.5, 36], [3.5, 44], [-3.2, 46], [11, 24], [-7.5, 22]]
    .map(([x, z], i) => ({ x, z, y: 0, yaw: Math.PI + (i % 2 ? 0.5 : -0.5), pose: i % 3 === 1 ? 'cheer' : 'laugh' }));
  const gaggers = createCrowd(S, gag, { poses: ['laugh', 'cheer'], rimI: 0.25, seed: 33 });
  gaggers.phones.forEach((ph) => { ph.visible = false; });
  const all = [crowd, gaggers];
  all.forEach((c) => c.meshes.forEach((m) => m.userData.list.forEach((p, i) => { p.x0 = p.x; p.z0 = p.z; p.sd = (i * 0.41 + (p.seed ?? 0.3) + 0.17 * p.x) % 1; if (p.sd < 0) p.sd += 1; })));

  // ---- the lamp post (stays: the ground's furniture is bolted down, like the kit's lamps)
  const lamp = new THREE.Group(), LM = M(0x24443a), LH = M(0xf6efd8, { emissive: 0x302810 });
  { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 6.6, 8), LM); pole.position.y = 3.3; lamp.add(pole);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.5, 8), LM); base.position.y = 0.25; lamp.add(base);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.07, 0.07), LM); arm.position.set(0.4, 6.5, 0); lamp.add(arm);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 0.32, 8), LM); head.position.set(0.8, 6.4, 0); lamp.add(head);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), LH); glow.position.set(0.8, 6.25, 0); lamp.add(glow); }
  lamp.position.copy(LAMP); lamp.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); S.scene.add(lamp);

  // ---- the clinger (red top, cap): leans on the lamp, laughing at his phone-less friend, then the stop
  const cl = createHero(S, { hair: 'cap', coat: 0, bag: 'tote', top: 0xd93a2e, bot: 0x2d4a7a, hairCol: 0x1f3f8a, bagCol: 0xe8c040, height: 1.78, fem: 0.1, pose: 'leanPole', rimI: 0.3 });
  cl.phone.visible = false; cl.setPose('cling'); cl.setPose('cling2'); cl.setPose('leanPole');

  // ---- v3 tumblers: full-colour people from upwind (west, off-frame) cartwheeling past close to the lens, staggered
  const TUMB = [
    { top: 0x3a78d0, bot: 0x2a2a30, hair: 'short', fem: 0.2, z: 46.0, y: 4.2, t0: 1.55, sd: 0.3 },
    { top: 0xf0b23a, bot: 0x5a3a2a, hair: 'bun', fem: 0.85, z: 42.0, y: 5.5, t0: 2.4, sd: 0.7 },
    { top: 0x2f9e68, bot: 0x3a3a40, hair: 'cap', fem: 0.1, z: 47.5, y: 3.6, t0: 3.6, sd: 0.5 },
    { top: 0xe86aa0, bot: 0x2d4a7a, hair: 'long', fem: 0.9, z: 44.0, y: 4.8, t0: 5.4, sd: 0.15 },
    { top: 0xff8a3d, bot: 0x1f2a3a, hair: 'short', fem: 0.3, z: 48.5, y: 3.4, t0: 6.6, sd: 0.85 } ];
  const tumblers = TUMB.map((o) => { const h = createHero(S, { hair: o.hair, coat: 0, bag: 'none', top: o.top, bot: o.bot, hairCol: 0x3a2418, height: 1.72, fem: o.fem, pose: 'flail', rimI: 0.3 });
    h.phone.visible = false; h.root.visible = false; return { h, ...o, x0: -34 }; });

  // ---- v3 plaza debris river close to the lens: café chairs/tables, boards, paper, planters, bins, poured through the frame from the stop on
  const pl = [], PC = [0xd94a3d, 0xf0b23a, 0x3a78d0, 0x2f9e68, 0xfafafa, 0x8a6a4a, 0xb0aca4, 0x6a6660, 0xe8d24a];
  for (let i = 0; i < 520; i++) { const z = 30 + R() * 28, near = z > 46;
    pl.push({ p: [-40 - R() * 12, 0.3 + Math.pow(R(), 1.6) * (near ? 5 : 9), z], t0: evAt(1.2 + R() * 6.8) - 0.004, size: near ? 0.35 + Math.pow(R(), 2) * 1.6 : 0.5 + R() * 1.8,
      shape: R() < 0.6 ? 1 : 0, kind: 2, col: PC[Math.floor(R() * PC.length)] }); }
  const plazaChips = createChips(S, pl);
  let clPose = 'leanPole';
  const setCl = (p) => { if (p !== clPose) { cl.setPose(p); clPose = p; } };

  // ---- hot-dog cart (white/red box, striped umbrella, wheels)
  const cart = new THREE.Group();
  { const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.9, 0.9), M(0xf2eee6)); body.position.y = 0.85; cart.add(body);
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.22, 0.92), M(0xd94a3d)); band.position.y = 1.05; cart.add(band);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 1.0), M(0xb0aca4)); top.position.y = 1.33; cart.add(top);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.04), M(0xf0b23a)); sign.position.set(0, 0.85, 0.47); cart.add(sign);
    const dog = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.5, 2, 6), M(0xc0583a)); dog.rotation.z = Math.PI / 2; dog.position.set(0, 0.85, 0.5); cart.add(dog);
    for (const [x, z] of [[-0.7, 0.48], [0.7, 0.48], [-0.7, -0.48], [0.7, -0.48]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 10), M(0x2a2a2e)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.28, z); cart.add(w); }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 5), M(0x5a5048)); pole.position.y = 2.0; cart.add(pole);
    for (let k = 0; k < 8; k++) { const seg = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.45, 2, 1, true, k * Math.PI / 4, Math.PI / 4), M(k % 2 ? 0xfafafa : 0xd94a3d, { side: THREE.DoubleSide })); seg.position.y = 2.75; cart.add(seg); } }
  const CART = new THREE.Vector3(7.5, 0, 31); cart.position.copy(CART); cart.rotation.y = 0.35;
  cart.traverse((m) => { if (m.isMesh) m.castShadow = true; }); S.scene.add(cart);
  const vendor = createHero(S, { hair: 'bun', coat: 0, bag: 'tote', top: 0xf2eee6, bot: 0x3a3a40, hairCol: 0x4a2a18, bagCol: 0xd94a3d, height: 1.66, fem: 0.8, pose: 'arms', rimI: 0.3 });
  vendor.phone.visible = false; const VEND = new THREE.Vector3(7.2, 0, 29.6);

  // ---- a dog (golden, low-poly) trotting beside a walker toward the lens
  const dogG = new THREE.Group(), DC = M(0xd8a24a), DD = M(0x7a4a22);
  { const b = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.32, 0.3), DC); b.position.y = 0.5; dogG.add(b);
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.26), DC); h.position.set(0.45, 0.72, 0); dogG.add(h);
    const sn = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.14), DD); sn.position.set(0.64, 0.66, 0); dogG.add(sn);
    for (const z of [-0.1, 0.1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.06), DD); e.position.set(0.4, 0.9, z); dogG.add(e); }
    for (const [x, z] of [[-0.28, -0.1], [-0.28, 0.1], [0.28, -0.1], [0.28, 0.1]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.08), DC); l.position.set(x, 0.18, z); dogG.add(l); }
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.06), DC); tl.position.set(-0.48, 0.66, 0); tl.rotation.z = 0.6; dogG.add(tl); dogG.userData.tail = tl; }
  dogG.traverse((m) => { if (m.isMesh) m.castShadow = true; }); S.scene.add(dogG);
  const DOG = new THREE.Vector3(-1.0, 0, 42.5);

  // ---- hats on heads that fly off at the stop (brim + crown, instanced)
  const hats = [];
  crowd.meshes.forEach((m) => m.userData.list.forEach((p) => { if (R() < 0.35) hats.push({ p, h: 1.68 + R() * 0.1 }); }));
  gaggers.meshes.forEach((m) => m.userData.list.forEach((p) => { if (R() < 0.4) hats.push({ p, h: 1.66 }); }));
  const hatG = new THREE.CylinderGeometry(0.11, 0.12, 0.14, 8); hatG.translate(0, 0.07, 0);
  const brimG = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 10);
  const HC = [0xd9a21b, 0x2a2a2e, 0xd94a3d, 0xf2eee6, 0x3a78d0, 0x2f9e68, 0xc8a070];
  const hatM = new THREE.InstancedMesh(hatG, M(0xffffff), Math.max(1, hats.length)), brimM = new THREE.InstancedMesh(brimG, M(0xffffff), Math.max(1, hats.length));
  hats.forEach((hh, i) => { const c = new THREE.Color(HC[Math.floor(R() * HC.length)]); hatM.setColorAt(i, c); brimM.setColorAt(i, c); hh.sd = R(); hh.t0 = R() * 0.004; });
  hatM.castShadow = brimM.castShadow = true; hatM.frustumCulled = brimM.frustumCulled = false; S.scene.add(hatM, brimM);

  // law helpers: a person/thing with seed sd, e s after its release, starting at x0
  const fling = (e, sd) => ({ a: Math.min(1.45, e / 0.035) + roll(e, sd) * 0.8, y: hop(e, sd) * 0.5 });

  return { crowd, gaggers, cl, lamp, cart, dogG,
    update(film) {
      const t = film + 4, e = evAt(film), dx = drift(e), tw = Math.min(film, T_STOP);
      // walkers: walk until the stop (the ground clock), then the law
      crowd.meshes.forEach((m) => m.userData.list.forEach((p) => { if (p.walk) { p.x = p.x0 + p.walk.vx * (tw + 3); p.z = p.z0 + p.walk.vz * (tw + 3); } }));
      crowd.update(t, { agitation: e > 0 ? 0 : 0.25 });
      gaggers.update(t, { agitation: e > 0 ? 0 : 0.95 });                         // laughing: big bob and sway
      if (e > 0) all.forEach((c) => c.meshes.forEach((m) => { m.userData.list.forEach((p, i) => {
        const F = fling(e, p.sd), x = p.x + dx;
        if (x > 900) { m.setMatrixAt(i, ZERO_M); return; }
        _q.setFromAxisAngle(ZAX, -F.a).multiply(_q2.setFromAxisAngle(YAX, p.yaw || 0));
        _o.set(0, 0.95, 0); const piv = _o.clone().sub(_o.clone().applyQuaternion(_q));
        m.setMatrixAt(i, _m.compose(_v.set(x + piv.x, F.y + 0.25 * Math.abs(Math.sin(F.a)) + piv.y, p.z + piv.z), _q, _s.set(1, 1, 1))); });
        m.instanceMatrix.needsUpdate = true; }));
      // hats: ride on heads before; at the stop they pop off first and sail east, spinning, dropping slowly
      hats.forEach((hh, i) => { const p = hh.p, ea = Math.max(0, e - hh.t0);
        if (e <= 0) { _q.setFromAxisAngle(YAX, p.yaw || 0); _v.set(p.x, hh.h + 0.04 * Math.sin(t * 3 + hh.sd * 6), p.z); }
        else { const x = p.x + V * ea * 1.04 + 0.6 * Math.min(1, ea / 0.01); if (x > 900) { hatM.setMatrixAt(i, ZERO_M); brimM.setMatrixAt(i, ZERO_M); return; }
          _q.setFromEuler(new THREE.Euler(ea * (20 + 30 * hh.sd), ea * 15, -ea * (40 + 30 * hh.sd)));
          _v.set(x, Math.max(0.1, hh.h + 0.35 * Math.min(1, ea / 0.01) - 0.5 * 9.81 * 0.18 * ea * ea * 50), p.z + 0.8 * Math.sin(ea * 60 + hh.sd * 6)); }
        hatM.setMatrixAt(i, _m.compose(_v, _q, _s.set(1, 1, 1))); _o.copy(_v); brimM.setMatrixAt(i, _m.compose(_o, _q, _s)); });
      hatM.instanceMatrix.needsUpdate = brimM.instanceMatrix.needsUpdate = true;
      // the clinger
      { const eR = evAt(CLING_REL);
        if (e <= 0) { setCl(Math.floor(film * 30 / 6) % 2 ? 'cling2' : 'cling');               // goofing: shinned up the lamp post, kicking his legs for his friends
          _q.setFromAxisAngle(ZAX, 0.12 * Math.sin(film * 5)).multiply(_q2.setFromAxisAngle(YAX, Math.PI - 0.5));
          const hand = new THREE.Vector3(0, 2.09, 0).applyQuaternion(_q); cl.root.position.set(LAMP.x + 0.08, GRIP_Y, LAMP.z + 0.05).sub(hand); cl.root.quaternion.copy(_q); }
        else if (e < eR) { setCl(Math.floor(film * 30 / 3) % 2 ? 'cling2' : 'cling');          // legs flap: swap every 3 frames
          // swings out to horizontal over the first 0.15 film s, then flutters like a flag (whips up and down), slipping lower
          const sw = sst(0, 0.0125, e), fl = 0.22 * Math.sin(film * 17) + 0.1 * Math.sin(film * 29 + 1), slip = 0.35 * sst(evAt(2.5), eR, e);
          const ang = (Math.PI / 2) * sw * (1 - 0.06 * sw) + fl * sw;
          _q.setFromAxisAngle(ZAX, ang).multiply(_q2.setFromAxisAngle(YAX, Math.PI));
          const hand = new THREE.Vector3(0, 2.09, 0).applyQuaternion(_q), grip = new THREE.Vector3(LAMP.x + 0.08, GRIP_Y - slip, LAMP.z + 0.05);
          cl.root.position.copy(grip.sub(hand)); cl.root.quaternion.copy(_q); }
        else { setCl('cling');
          const a = e - eR, tau = 0.012, x = V * (a - tau * (1 - Math.exp(-a / tau)));       // the air takes him up to speed in ~0.15 film s
          const rr = Math.PI / 2 + (2 + 3 * 0.7) * a * 1.0 + 0.12 * Math.sin(film * 17);
          _q.setFromAxisAngle(ZAX, rr).multiply(_q2.setFromAxisAngle(YAX, Math.PI));
          const c = new THREE.Vector3(0, 1.0, 0).applyQuaternion(_q);
          cl.root.position.set(LAMP.x + 2.0 + x - c.x, Math.max(0.35, GRIP_Y - 0.35 - 0.5 * 9.81 * 0.15 * (a * 12) ** 2) - c.y + 0.0, LAMP.z + 0.05); cl.root.quaternion.copy(_q);
          cl.root.visible = x < 900; } }
      // v3: tumblers cartwheel past the lens (x = x0 + V·(e - e0), the law), flailing; plaza debris river
      tumblers.forEach((u, k) => { const a = e - evAt(u.t0), x = u.x0 + V * a;
        u.h.root.visible = a > 0 && x < 40; if (!u.h.root.visible) return;
        const sp = 9 + 5 * u.sd, ang = a * 12 * sp + k;
        _q.setFromAxisAngle(ZAX, -ang).multiply(_q2.setFromAxisAngle(YAX, Math.PI + 0.6 * Math.sin(a * 40 + k)));
        const c = new THREE.Vector3(0, 0.95, 0).applyQuaternion(_q);
        u.h.root.position.set(x - c.x, u.y + 0.4 * Math.sin(a * 60 + k) - c.y, u.z); u.h.root.quaternion.copy(_q); });
      plazaChips.update(e);
      // the cart and the vendor: tips east and tumbles away; the dog: trots, then tumbles
      { const F = fling(e, 0.62);
        cart.position.set(CART.x + dx, e > 0 ? F.y + 0.6 * Math.abs(Math.sin(F.a)) : 0, CART.z);
        cart.quaternion.setFromAxisAngle(ZAX, -(e > 0 ? F.a : 0)).multiply(_q2.setFromAxisAngle(YAX, 0.35)); cart.visible = dx < 900;
        const G = fling(e, 0.27);
        vendor.root.position.set(VEND.x + dx, e > 0 ? G.y + 0.25 * Math.abs(Math.sin(G.a)) : 0, VEND.z);
        vendor.root.quaternion.setFromAxisAngle(ZAX, -(e > 0 ? G.a : 0)).multiply(_q2.setFromAxisAngle(YAX, Math.PI + 0.4)); vendor.root.visible = dx < 900;
        const H = fling(e, 0.83), dz = 1.1 * (tw + 3);
        dogG.position.set(DOG.x + dx, e > 0 ? H.y + 0.3 * Math.abs(Math.sin(H.a)) : 0.03 * Math.abs(Math.sin(t * 9)), DOG.z - dz * 0 + 0);
        dogG.quaternion.setFromAxisAngle(ZAX, -(e > 0 ? H.a * 1.3 : 0)).multiply(_q2.setFromAxisAngle(YAX, -0.9));
        dogG.userData.tail.rotation.y = 0.8 * Math.sin(t * 14); dogG.visible = dx < 900; }
    } };
}
