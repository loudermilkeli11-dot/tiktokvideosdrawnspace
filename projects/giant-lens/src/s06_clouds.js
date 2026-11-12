// s06_clouds (film 22.5-27.0, steps 5 -> 6): hard cut on hit 2 to 8 km up, above a low cloud deck (API R3 + N6 cut).
// The lens grows 2 -> 6.3 km (0.0-0.8 s) and, hanging at f = D on the sunline (story.lensCentre), rises out of the deck to
// 5.7 km. Its converging cone has already cut a clean slot through the deck from the bay (the path behind the spot); the head
// keeps cutting away from us, the ground burning orange in the slot, the lens's round shadow (glass + handle) dark on the deck.
// An airliner in the foreground (upper left, against the sky) banks hard away. 3.9-4.5: the camera climbs fast (handshake to
// s07, which continues the climb from ~30 km). Page t = shot time + 4. Units: metres; world y = 0 is 8 km (clouds.js frame).
import { createStudio, THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createClouds, R_EARTH } from '@engine/clouds.js';
import { createPlane } from '@engine/planes.js';
import { applyCam, shake } from '@engine/camera.js';
import { clamp, lerp, ease } from '@engine/util.js';
import { lensRig, SUN, SKY_HIGH, POST_HIGH, SAMPLES, D2R, qn } from './kit.js';
import { lensD, spotOf, SHOT } from './story.js';
const SH = 's06_clouds', DUR = SHOT[SH].dur;
const ALT = 8000;                                   // camera altitude (m) at frame 0
const DECK = { base: 600, thick: 650 };             // a low stratocumulus deck: tops ~1.0-1.9 km, under the 2 km lens at frame 0
const HMID = DECK.base + DECK.thick * 0.6;          // deck height the slot is cut at (m)
// the slot: the converging cone (f/1: radius = half the distance to the focus) crossing the deck at HMID; same at every lens size
const CUT_R = 0.5 * (HMID / SUN.y);                 // 513 m -> drawn with a little evaporation margin below
const S = createStudio({ samples: SAMPLES[SH], near: 5, far: 4e5, post: { ...POST_HIGH } });
const { scene, camera } = S;
S.hdri('hdri_day_1k.hdr', 0.45);
const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky);
sky.U.dayZen.value.set(SKY_HIGH.zen); sky.U.dayHor.value.set(SKY_HIGH.hor); sky.U.altI.value = 1; sky.U.sunDisc.value = 1;
const CL = createClouds(S, { base: DECK.base, thick: DECK.thick, cover: 0.82, hazeL: 140e3, sunI: 1.5, skyI: 0.6, seed: 5, seaCol: 0x24341c });
CL.U.hazeCol.value.copy(sky.U.dayHor.value).multiplyScalar(1.5 * 1.35);
const sun = new THREE.DirectionalLight(0xfff3e2, 3.2); scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0x6f9be0, 0xf4f6ff, 1.1));
// the ground under the deck: farmland (land everywhere in this view), the burn on it
Object.assign(CL.U, {}); CL.U.landI.value = 1; CL.U.landCol.value.set(0x3f5a2c); CL.U.coastP.value.set(0, 9e4); CL.U.coastN.value.set(0, -1);
CL.U.cut.value = 1; CL.U.cutR.value = CUT_R * 1.25; CL.U.cutOff.value.set(SUN.x / SUN.y * HMID, SUN.z / SUN.y * HMID);
CL.U.burnFade.value = 9000; CL.U.burnI.value = 2.6; CL.U.wallGlow.value = 2.2; CL.U.lsOn.value = 1; CL.U.lsDark.value = 0.22;
// ---- the spot path on the ground (the lens drifts; any speed is the liberty). Head moves away from us, a little right.
const GY = -ALT;                                                       // ground at the origin (curvature: d²/2R, below)
const B0 = new THREE.Vector3(qn('bx', 1500), GY, qn('bz', -23500)), V = new THREE.Vector3(qn('vx', 160), 0, qn('vz', -850));
const A = B0.clone().addScaledVector(V.clone().normalize(), -40000);   // the slot already runs back past us, toward the bay
const groundY = (x, z) => -(R_EARTH + ALT) + Math.sqrt(Math.max(0, (R_EARTH) ** 2 - x * x - z * z));
const spotAt = (tt) => { const p = B0.clone().addScaledVector(V, tt); p.y = groundY(p.x, p.z); return p; };
// ---- the lens (N1 + N2): no ground decal (the deck shadow is drawn by clouds.js), no billboards over the deck (the white-hot
// head is drawn inside the deck shader so the clouds occlude it correctly); the faint cone stays.
const rig = lensRig(S, { sky, ground: 0xdfe5ee, shadowDecal: false });
const HA = qn('ha', 2.4);                                              // handle angle: handle up-right, away from the type
// ---- the airliner: foreground upper left, banking hard left (away from the cone); relative path integrated once
const jet = createPlane(S, { len: 62, span: 58 });
const camV = new THREE.Vector3(0, 0, -150);                            // we fly too (the deck drifts slowly)
const JDT = 1 / 120, JP = [];
{ const p = new THREE.Vector3(qn('jx', -78), qn('jy', 22), qn('jz', -330));
  for (let tt = 0; tt <= DUR + 0.7; tt += JDT) {
    const turn = ease.inOutSine(clamp((tt - 0.25) / 3.2)), psi = -46 * D2R * turn, roll = -62 * ease.outCubic(clamp((tt - 0.15) / 1.1));
    const v = new THREE.Vector3(Math.sin(psi), -0.05 * turn, -Math.cos(psi)).multiplyScalar(245);
    JP.push({ p: p.clone(), v: v.clone(), roll }); p.addScaledVector(v.clone().sub(camV), JDT); } }
const jetAt = (tt) => { const i = clamp(tt / JDT, 0, JP.length - 1.001), k = Math.floor(i), u = i - k; const a = JP[k], b = JP[k + 1];
  return { p: a.p.clone().lerp(b.p, u), v: a.v.clone().lerp(b.v, u), roll: lerp(a.roll, b.roll, u) }; };
// ---- camera: 35 mm, drifting forward; 3.9-4.5 a fast climb (ease-in) that hands over to s07's climb
const T_CLIMB = 3.9;
function camAt(tt) {
  const c = ease.inCubic(clamp((tt - T_CLIMB) / (DUR - T_CLIMB)));
  const pos = new THREE.Vector3(0, 3200 * c, 0).addScaledVector(camV, tt);
  const pitch = (qn('pitch', -17) - 5 * c) * D2R, yaw = (qn('yaw', 1.5) + 0.6 * tt) * D2R;
  const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  return { pos, look: pos.clone().add(dir), mm: 35, roll: -1.5 + 0.4 * tt };
}
const _h = new THREE.Vector3(), _q = new THREE.Quaternion();
S.run((t) => {
  const tt = Math.max(t - 4, 0) + qn('tt', 0);
  const C = camAt(tt);
  applyCam(camera, C, shake(t, 0.05 + 0.1 * clamp((tt - T_CLIMB) / 0.6), 0.9, 6));          // camera FIRST
  const camAlt = ALT + C.pos.y;
  sun.position.copy(SUN).multiplyScalar(2000).add(C.pos); sun.target.position.copy(C.pos);
  sky.U.sunDir.value.copy(SUN); sky.update(S, t);
  CL.update(S, { alt: ALT, sunDir: SUN });
  sky.U.dip.value = Math.acos(Math.min(1, (R_EARTH + DECK.base + DECK.thick * 0.6) / (R_EARTH + camAlt)));   // the camera climbs above ALT
  // the law: lens size, spot, lens centre = spot + SUN·D
  const D = lensD(SH, tt), spot = spotAt(tt), w = spotOf(D);
  rig.set({ spot, D, heat: 1, handleAngle: HA, t, coreI: 0, glowI: 0, discI: 0, beamI: 1.4 });
  // N6: the slot (path start -> head), the burn, the head; the lens shadow on the deck
  CL.U.cutA.value.set(A.x, A.z); CL.U.cutB.value.set(spot.x, spot.z); CL.U.ctime.value = t;
  CL.U.burnW.value = Math.max(w * 0.5, 75); CL.U.spotR.value = Math.max(w, 70); CL.U.spotI.value = 22;
  CL.U.lsC.value.copy(rig.centre); CL.U.lsN.value.copy(SUN); CL.U.lsR.value = D / 2;
  _h.set(Math.cos(HA), 0, -Math.sin(HA)).applyQuaternion(_q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), SUN)); CL.U.lsH.value.copy(_h);
  // the airliner
  const J = jetAt(tt), jp = J.p.clone().add(new THREE.Vector3(0, 0, 0).addScaledVector(camV, tt));
  jet.root.position.copy(jp);
  jet.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), J.v.clone().normalize()).multiply(_q.setFromAxisAngle(new THREE.Vector3(0, 0, -1), J.roll * D2R));
});
