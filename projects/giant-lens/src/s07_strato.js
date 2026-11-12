// s07_strato (film 27.0-31.5, steps 6 -> 7 -> 8): the climb continues from s06, 30 -> 70 km, 24 mm, deep-blue high sky,
// curved horizon. The lens grows 6.3 -> 20 km (0.0-0.8) and 20 -> 63 km (2.2-3.0); hanging at f = D on the sunline it rises
// toward us. Its round shadow darkens a whole region of the deck; the scar (the N6 slot + the burning line, now 186 -> 590 m wide)
// runs from the sea behind us across the coast and far inland. Page t = shot time + 4.
// Units: metres; clouds.js frame (world y = 0 is the camera altitude, which changes every frame; the camera stays at x = z = 0).
import { createStudio, THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createClouds, R_EARTH } from '@engine/clouds.js';
import { applyCam, shake } from '@engine/camera.js';
import { clamp, lerp, ease } from '@engine/util.js';
import { lensRig, SUN, SKY_HIGH, POST_HIGH, SAMPLES, D2R, qn } from './kit.js';
import { lensD, spotOf, SHOT } from './story.js';
const SH = 's07_strato', DUR = SHOT[SH].dur;
const DECK = { base: 600, thick: 650 };                        // the same low deck as s06
const HMID = DECK.base + DECK.thick * 0.6;
const S = createStudio({ samples: SAMPLES[SH], near: 20, far: 2.5e6, post: { ...POST_HIGH } });
const { scene, camera } = S;
S.hdri('hdri_day_1k.hdr', 0.45);
const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky);
sky.U.dayZen.value.set(SKY_HIGH.zen); sky.U.dayHor.value.set(SKY_HIGH.hor); sky.U.altI.value = 1; sky.U.sunDisc.value = 1;
const CL = createClouds(S, { base: DECK.base, thick: DECK.thick, cover: 0.74, period: 61000, regional: 0.5, hazeL: qn('haze', 260e3), sunI: 1.5, skyI: 0.6, seed: 5, seaCol: 0x1d4a6a });
CL.U.hazeCol.value.copy(sky.U.dayHor.value).multiplyScalar(1.5 * 1.35);
const sun = new THREE.DirectionalLight(0xfff3e2, 3.2); scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0x6f9be0, 0xf4f6ff, 1.1));
// the ground: sea behind / under us, the coast ~25 km ahead, land beyond
CL.U.landI.value = 1; CL.U.landCol.value.set(0x6a8238); CL.U.coastP.value.set(0, qn('coast', -6000)); CL.U.coastN.value.set(0.15, -1).normalize(); CL.U.coastWob.value = 9000;
CL.U.cut.value = 1; CL.U.cutOff.value.set(SUN.x / SUN.y * HMID, SUN.z / SUN.y * HMID);
CL.U.burnFade.value = 160e3; CL.U.burnI.value = 1.3; CL.U.wallGlow.value = 2.0; CL.U.lsOn.value = 1; CL.U.lsDark.value = 0.2;
// ---- the spot path (the lens drifts; any speed is the liberty): head runs away from us and a little right, inland
const B0 = new THREE.Vector3(qn('bx', -6000), 0, qn('bz', -78000)), V = new THREE.Vector3(qn('vx', 1500), 0, qn('vz', -6500));
const A = B0.clone().addScaledVector(V.clone().normalize(), -150000);   // the scar runs back past us, over the sea, toward the bay
const altAt = (tt) => { const u = clamp(tt / DUR); return 30000 + 40000 * (2 * u - u * u); };   // 30 -> 70 km, ~18 km/s at the cut
const groundY = (x, z, alt) => -(R_EARTH + alt) + Math.sqrt(Math.max(0, R_EARTH * R_EARTH - x * x - z * z));
// ---- the lens (no ground decal, no billboards: the deck shader draws the shadow and the white-hot head; the cone stays)
const rig = lensRig(S, { sky, ground: 0xdfe5ee, shadowDecal: false });
const HA = qn('ha', 2.4);
function camAt(tt) {
  const u = clamp(tt / DUR);
  const pitch = (lerp(-22, qn('pitch1', -14), ease.inOutSine(u))) * D2R, yaw = lerp(qn('yaw0', -3), qn('yaw1', -2), u) * D2R;
  const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  const pos = new THREE.Vector3(0, 0, qn('back', 50000) * Math.pow(u, 1.5));     // pulling back as we climb (curvature: < 0.2 km)
  return { pos, look: pos.clone().add(dir), mm: 24, roll: lerp(-0.2, 1.5, u) };
}
const _h = new THREE.Vector3(), _q = new THREE.Quaternion();
S.run((t) => {
  const tt = Math.max(t - 4, 0) + qn('tt', 0);
  const C = camAt(tt), alt = altAt(tt);
  applyCam(camera, C, shake(t, 0.1 + 0.1 * clamp(1 - tt / 0.8), 0.9, 7));                       // camera FIRST
  sun.position.copy(SUN).multiplyScalar(2000); sun.target.position.set(0, 0, 0);
  sky.U.sunDir.value.copy(SUN); sky.update(S, t);
  CL.update(S, { alt, sunDir: SUN }); sky.U.dip.value = CL.dip;
  // the law: lens size, spot, lens centre = spot + SUN·D
  const D = lensD(SH, tt), w = spotOf(D);
  const spot = B0.clone().addScaledVector(V, tt); spot.y = groundY(spot.x, spot.z, alt);
  rig.set({ spot, D, heat: 1, handleAngle: HA, t, coreI: 0, glowI: 0, discI: 0, beamI: 1.2 });
  // N6 at scale: the slot (cone radius at the deck + the spot) and the burning line (w wide, plus its glow)
  // dramatized: the burning ground's heat keeps the deck open over the scar (fire spread is not modelled; the slot is drawn wide)
  CL.U.cutR.value = 0.5 * (HMID / SUN.y) * 1.25 + qn('slot', 2000) + w * 4;
  CL.U.cutA.value.set(A.x, A.z); CL.U.cutB.value.set(spot.x, spot.z); CL.U.ctime.value = t;
  CL.U.burnW.value = Math.max(w * 1.5, 1100); CL.U.spotR.value = Math.max(w * 1.2, 700); CL.U.spotI.value = 24;
  CL.U.lsC.value.copy(rig.centre); CL.U.lsN.value.copy(SUN); CL.U.lsR.value = D / 2;
  _h.set(Math.cos(HA), 0, -Math.sin(HA)).applyQuaternion(_q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), SUN)); CL.U.lsH.value.copy(_h);
});
