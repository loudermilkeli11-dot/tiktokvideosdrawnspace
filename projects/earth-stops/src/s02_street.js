// s02_street (8.0-15.0 s, 210 fr, e 0.583 -> 1.167). Street level on the plaza's north kerb (z -44, eye 2.4 m), 35 mm,
// looking north across the x-street SL(-1) = -60 at the shopfront row (facades z ≈ -73.5), a slow track right.
// The shock-front river: wrapped upwind cars (kit) and debris (paper, leaves, shingles, signs, glass) stream left -> right
// at V; along the shopfronts the awnings flap and tear off, the signs go, the shop windows burst OUTWARD and the glass
// and the shop goods ride the flow east (groupA_chips: burst velocity + catch-the-flow ramp). A low dust river.
// Handshakes: 8.0 opens mid-stream, debris entering frame left, same golden light; 15.0 ends tilting up the facades to
// the sky (s03 opens high on the towers).
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { rng, ease, clamp, lerp } from '@engine/util.js';
import { cityWorld, gradeDust, styliseMat, POST_DAY, SAMPLES, D2R } from './kit.js';
import { ev, filmT, roll, V } from './story.js';
import { plazaLook } from './groupA_plaza.js';
import { createChipsA } from './groupA_chips.js';
import { createDustA } from './groupA_dust.js';

const SHOT_NAME = 's02_street';
const S = createStudio({ samples: SAMPLES.s02_street, shadows: true, post: { ...POST_DAY } });
const CAM_Z = -50.5, CAM_Y = 1.9, X0 = -9, X1 = 3;                                 // on the plaza-side sidewalk (-48 .. -53)
const NEAR_LANE = -54.75;                                                           // the lane 3.3 m from the lens: hidden (a car there is one unreadable smear)
const W = cityWorld(S, { keepOut: [[0, CAM_Z, 14]], clearTrees: [[-3, -49.6, 17], [0, 34, 14]], leaves: { x: 0, z: 0, r: 0, per: 0 }, box: 70 });
plazaLook(W);
const C = W.C;
// cost: by e 0.58 the plaza's crowd, hero and fountain water are 220+ m east, out of this view for the whole shot.
// Skip their per-sub-sample work (the kit loops 2,600 fountain drops and every person on each of the 12 sub-samples).
C.drops.length = 0; C.dropM.visible = false; C.disc.visible = false;
W.crowd.meshes.forEach((m) => { m.visible = false; m.userData.list.length = 0; }); W.hero.root.visible = false;

// ---------------------------------------------------------------- the shopfront row (my meshes, stylised)
const fronts = C.buildings.filter((b) => b.z < -60 && b.z > -200 && Math.abs(b.x) < 80 && b.z + b.d / 2 > -80).map((b) => ({ x0: b.x - b.w / 2, x1: b.x + b.w / 2, z: b.z + b.d / 2 }));
const SHOPS = [['BAKERY', 0xf2e6c8, 0x8a4a22, [0xd9a85a, 0xe8c890, 0xb07a3a]], ['FLOWERS', 0xe0709f, 0xffffff, [0xe0709f, 0xd94a3d, 0xe8d24a, 0xffffff]],
  ['BOOKS', 0x1f2a44, 0xf0b23a, [0xf2eee6, 0xfafafa, 0xd9cfb6]], ['CAFÉ', 0x2f9e68, 0xffffff, [0xffffff, 0x6d5539, 0xd9cfb6]], ['PHARMACY', 0xffffff, 0x2f9e68, [0xffffff, 0x3a78d0]],
  ['SHOES', 0xd94a3d, 0xffffff, [0x1c1c22, 0xd94a3d, 0xebe6da]], ['DELI', 0xf0b23a, 0x1f2a44, [0xd94a3d, 0xe8d24a, 0x4e8f3a]], ['TOYS', 0x3a78d0, 0xffffff, [0xd94a3d, 0xf0b23a, 0x3a78d0, 0x2f9e68]]];
function signTex(text, bg, fg) { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = '#' + bg.toString(16).padStart(6, '0'); g.fillRect(0, 0, 512, 128); g.fillStyle = '#' + fg.toString(16).padStart(6, '0');
  g.font = 'bold 76px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 68);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function stripeTex(a, b) { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 16; const g = cv.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = '#' + (i % 2 ? b : a).toString(16).padStart(6, '0'); g.fillRect(i * 32, 0, 32, 16); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
const shops = [], R = rng(2024);
let si = 0;
fronts.forEach((f) => { for (let x = Math.max(f.x0 + 3, -34); x + 3 < Math.min(f.x1, 30); x += 6.2) {
  const [name, bg, fg, goods] = SHOPS[si++ % SHOPS.length];
  const er = 0.64 + 0.42 * clamp((x + 30) / 58) + 0.05 * R();                        // left (upwind, the track start) goes first
  shops.push({ x, z: f.z, name, bg, fg, goods, eAwn: er, eSign: er + 0.03 + 0.04 * R(), ePane: er - 0.03 + 0.02 * R(), sd: R() }); } });
function glassTex() { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#9cc4d8'); gr.addColorStop(1, '#3f6f86'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.moveTo(40, 0); g.lineTo(100, 0); g.lineTo(30, 256); g.lineTo(-30, 256); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.moveTo(130, 0); g.lineTo(150, 0); g.lineTo(80, 256); g.lineTo(60, 256); g.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
const paneMat = new THREE.MeshBasicMaterial({ map: glassTex(), color: 0xd8d0c0 });   // flat stylised glass (unlit, like the hits' windows)
const frameMat = styliseMat(new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.7 }));
const sideMat = styliseMat(new THREE.MeshStandardMaterial({ color: 0xebe6da, roughness: 0.8 }));
shops.forEach((s) => {
  s.pane = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.6), paneMat); s.pane.position.set(s.x, 2.3, s.z + 0.06); S.scene.add(s.pane);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.25, 0.25), frameMat); fr.position.set(s.x, 4.2, s.z + 0.1); fr.castShadow = true; S.scene.add(fr);   // lintel stays
  const at = stripeTex(s.bg === 0xffffff ? s.fg : s.bg, 0xf2eee6);
  s.awn = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.06, 1.9), [sideMat, sideMat, styliseMat(new THREE.MeshStandardMaterial({ map: at, roughness: 0.85 })), sideMat, sideMat, sideMat]);
  s.awn.geometry.translate(0, 0, 0.95); s.awn.castShadow = true; S.scene.add(s.awn);
  const st = signTex(s.name, s.bg, s.fg), sm = styliseMat(new THREE.MeshStandardMaterial({ map: st, roughness: 0.7 }));
  s.sign = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 0.14), [sideMat, sideMat, sideMat, sideMat, sm, sideMat]); s.sign.castShadow = true; S.scene.add(s.sign);
});
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
const CATCH = 0.02;                                                                 // e s to catch the flow (attached things start at rest)
const xCatch = (a) => V * (a - CATCH * (1 - Math.exp(-a / CATCH)));
function poseShops(e) {
  shops.forEach((s) => {
    // awning: flaps harder and harder, then tears off, peels out over the street and tumbles east
    { const a = e - s.eAwn, fl = (0.05 + 0.1 * clamp((e - 0.58) / 0.4)) * Math.sin(55 * e + s.sd * 9) ;
      if (a < 0) { s.awn.position.set(s.x, 4.45, s.z + 0.1); s.awn.rotation.set(0.32 + fl, 0, 0); }
      else { const out = 2.2 * (1 - Math.exp(-a / 0.05)); s.awn.position.set(s.x + xCatch(a), Math.max(0.4, 4.45 - 0.5 * 9.81 * a * a * 0.6), s.z + 0.1 + out);
        s.awn.rotation.set(0.32 + fl + 2.5 * a, 0.6 * a, -roll(a, s.sd) * 1.4); }
      s.awn.visible = a < 0.4; }
    // the sign: shivers, then goes
    { const a = e - s.eSign;
      if (a < 0) { s.sign.position.set(s.x, 5.0, s.z + 0.12); s.sign.rotation.set(0, 0, 0.015 * Math.sin(70 * e + s.sd * 5)); }
      else { s.sign.position.set(s.x + xCatch(a), Math.max(0.5, 5.0 - 0.5 * 9.81 * a * a), s.z + 0.12 + 1.2 * (1 - Math.exp(-a / 0.06)));
        s.sign.rotation.set(1.5 * a, 0, -roll(a, 0.3 + 0.5 * s.sd)); }
      s.sign.visible = a < 0.4; }
    s.pane.visible = e < s.ePane;
  });
}
// ---------------------------------------------------------------- glass + goods bursting out of the shop windows
const burst = [];
shops.forEach((s, k) => { const RR = rng(300 + k);
  for (let i = 0; i < 55; i++) burst.push({ p: [s.x + (RR() - 0.5) * 4.4, 0.6 + RR() * 3.4, s.z + 0.2], t0: s.ePane + 0.004 * RR(), size: 0.25 + RR() * 0.45, col: RR() < 0.85 ? 0x6f9ab4 : 0xc8d4d8, kind: 1, shape: 1, v: [0, -4 * RR(), 25 + RR() * 45] });
  for (let i = 0; i < 40; i++) burst.push({ p: [s.x + (RR() - 0.5) * 4, 0.5 + RR() * 2, s.z - 1 - RR() * 2], t0: s.ePane + 0.01 + 0.03 * RR(), size: 0.2 + RR() * 0.3, col: s.goods[Math.floor(RR() * s.goods.length)], kind: RR() < 0.5 ? 0 : 2, shape: RR() < 0.6 ? 1 : 0, v: [0, 0, 20 + RR() * 30] });
});
const bursts = createChipsA(S, burst, { ramp: CATCH, tau: 0.06 });
// ---------------------------------------------------------------- the upwind river (has been flowing since e 0; wraps)
const up = [];
{ const RU = rng(6060), PAPER = [0xf2eee6, 0xe8e0c8, 0xfafafa, 0xd9cfb6], LEAF = [0x5f8a2e, 0x7a9a36, 0x8a6a2a, 0x4e7a2a], SHING = [0xa8492e, 0x8a3a28, 0x6a6a70, 0x4a5a6a, 0xb0a090],
    SIGN = [0xd94a3d, 0xf0b23a, 0x3a78d0, 0x2f9e68, 0xe8d24a, 0xff8a3d, 0xfafafa];
  for (let i = 0; i < 6500; i++) { const k = RU(), z = -72 + RU() * 13.5, high = RU() < 0.25;      // >= 8 m from the lens (closer = stepped smears)
    const y = high ? 6 + RU() * 34 : 0.2 + Math.pow(RU(), 1.5) * 6;
    const pick = k < 0.35 ? [0, 1, 0.18 + RU() * 0.25, PAPER[Math.floor(RU() * 4)]] : k < 0.6 ? [0, 1, 0.14 + RU() * 0.16, LEAF[Math.floor(RU() * 4)]]
      : k < 0.82 ? [2, RU() < 0.5 ? 1 : 0, 0.35 + RU() * 0.6, SHING[Math.floor(RU() * 5)]] : k < 0.9 ? [2, 1, 0.7 + RU() * 0.8, SIGN[Math.floor(RU() * 7)]] : [1, 1, 0.3 + RU() * 0.5, 0xa8c4d4];
    up.push({ p: [-130 + RU() * 260, y + (pick[0] === 2 ? 1.8 : 0), z], t0: 0, kind: pick[0], shape: pick[1], size: pick[2], col: pick[3] }); }
  // the skidding band on the near lanes (8-13 m out): shingles, paper and signs scraping along the asphalt
  for (let i = 0; i < 2200; i++) { const k = RU();
    up.push({ p: [-130 + RU() * 260, 0.08 + RU() * 0.6, -58.5 - RU() * 5], t0: 0, kind: k < 0.6 ? 2 : 0, shape: RU() < 0.7 ? 1 : 0, size: 0.2 + RU() * 0.35,
      col: k < 0.6 ? SHING[Math.floor(RU() * 5)] : k < 0.8 ? PAPER[Math.floor(RU() * 4)] : SIGN[Math.floor(RU() * 7)] }); } }
const river = createChipsA(S, up, { wrap: [-130, 130] });                           // wraps well outside the 35 mm view (x -20 .. 14)
// ---------------------------------------------------------------- the foreground frame: a painted kerb guard rail (LOOK rule 2)
// bolted to the stopped ground, so it stays put; it fills the bottom of frame (the near lane is hidden) and gives depth.
{ const g = new THREE.Group(), m = styliseMat(new THREE.MeshStandardMaterial({ color: 0x2f5a3a, roughness: 0.7 }), { rough: 0.7 });
  const box = (w, h, d, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; g.add(b); };
  for (let x = -24; x <= 16; x += 1.6) box(0.07, 1.05, 0.07, x, 0.525, 0);
  box(42, 0.07, 0.06, -4, 1.02, 0); box(42, 0.05, 0.05, -4, 0.55, 0); box(42, 0.04, 0.04, -4, 0.2, 0);
  g.position.set(0, 0.15, -53.1); S.scene.add(g);
  const kerb = new THREE.Mesh(new THREE.BoxGeometry(60, 0.15, 5), styliseMat(new THREE.MeshStandardMaterial({ color: 0x9a9284, roughness: 0.9 })));
  kerb.position.set(-4, 0.075, -50.6); kerb.receiveShadow = true; S.scene.add(kerb); }
// ---------------------------------------------------------------- the dust river (low, in front) + the street sheet
const dFloor = createDustA(S, [{ x0: -300, x1: 300, op: 0.32, floor: { z0: -73, z1: -45, y: 0.15 } }]);
const dLow = createDustA(S, [{ x0: -300, x1: 300, z: -58, h: 1.8, op: 0.55 }]);
const dMid = createDustA(S, [{ x0: -300, x1: 300, z: -63, h: 7, op: 0.5 }]);

const YAX = new THREE.Vector3(0, 1, 0);
function camAt(tt) {
  const u = ease.inOutSine(clamp(tt / 7));
  const pos = new THREE.Vector3(lerp(X0, X1, u), CAM_Y, CAM_Z);
  const tilt = clamp((tt - 5.0) / 2.0), pitch = 1 + 47 * Math.pow(tilt, 1.7);           // eased in, still rising at the cut
  const yaw = 8 - 4 * u;
  const dir = new THREE.Vector3(Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R));
  return { pos, look: pos.clone().add(dir), mm: 35, roll: 0 };
}
S.run((t) => {
  const tt = Math.max(t - 4, 0), e = ev(SHOT_NAME, tt), film = filmT(SHOT_NAME, tt);
  const cam = camAt(tt);
  applyCam(S.camera, cam, shake(t, 0.05, 1.6, 3));                                   // the air buffets the operator a little
  W.update(film, { focus: new THREE.Vector3(cam.pos.x, 0, -62), box: 70, carPose: (c) => (c.lane.axis === 'x' && Math.abs(c.lane.c - NEAR_LANE) < 0.5 ? null : undefined) });
  poseShops(e); bursts.update(e); river.update(e);
  dFloor.update(e, 1); dLow.update(e, 0.95); dMid.update(e, 1);
  gradeDust(S, 0.42);
});
