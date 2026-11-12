// s08_orbit (film 31.5-37.0, steps 8 -> 9): hard cut on hit 3 to Earth's day side from orbit (API R4, km, Earth at the origin).
// The lens grows 63 -> 200 km (0.0-0.8 s) and hangs 200 km up the sunline from its spot, glinting. N7 (space.js, default off,
// giant-lens additions): its round shadow (glass + handle) darkens the clouds and land around ONE blinding dot (the 1.9 km spot);
// a dark scorched line runs from the ocean across the coast and deep inland, a slot in the clouds tracing it. 50 -> 70 mm, a slow
// pull-back past the lens rim. 5.0-5.5 (film 36.5-37.0): the dot burns on, no counter, the picture keeps drifting.
// Page t = shot time + 4.
import { createStudio, THREE } from '@engine/engine.js';
import { createSpace, RE } from '@engine/space.js';
import { applyCam, shake, lensFov } from '@engine/camera.js';
import { clamp, lerp, ease } from '@engine/util.js';
import { lensRig, dirLL, POST_ORBIT, SAMPLES, D2R, qn } from './kit.js';
import { lensD, spotOf, SHOT } from './story.js';
const SH = 's08_orbit', DUR = SHOT[SH].dur;
// ---- the place: a spot inland on a continent's dry interior; the line comes in from the ocean to the west-south-west
const N = dirLL(qn('lon', 21), qn('lat', 6));                                 // the spot's up (unit)
const EAST = new THREE.Vector3(0, 1, 0).cross(N).normalize(), NORTH = N.clone().cross(EAST).normalize();
// the Sun: 65° high over the spot (the film's one sun elevation), from the south-west-ish so the lens leans toward the camera
const TS = EAST.clone().multiplyScalar(-0.45).addScaledVector(NORTH, -0.89).normalize();
const SUN = N.clone().multiplyScalar(Math.sin(65 * D2R)).addScaledVector(TS, Math.cos(65 * D2R)).normalize();
const S = createStudio({ samples: SAMPLES[SH], near: 5, far: 3e6, post: { ...POST_ORBIT } });
const { scene, camera } = S;
const SP = createSpace(S, { sunDir: SUN.toArray(), ring: false, stars: 0.3, sunI: 1.5, cityI: 1.0, sunGlare: 0, seg: [512, 256] });
SP.EU.cloudsI.value = qn('ci', 0.4); SP.EU.detail.value = 0.8;
scene.add(new THREE.DirectionalLight(0xfff3e2, 2.6), new THREE.HemisphereLight(0x4a6a9a, 0x101010, 0.25));
scene.children.filter((c) => c.isDirectionalLight).forEach((l) => l.position.copy(SUN).multiplyScalar(1000));
// ---- the line: start far out over the ocean (WSW), head = the spot, which drifts slowly east (the lens drifts: the liberty)
const LA = dirLL(qn('lon0', -4), qn('lat0', -3));
const headAt = (tt) => N.clone().addScaledVector(EAST, (qn('vh', 45) * tt) / RE).normalize();   // km/s along the surface
const EU = SP.EU;
EU.lnOn.value = 1; EU.lnA.value.copy(LA); // dramatized widths: the scorched swath (lnW 7 km) and the cloud slot (40 km) are drawn wider than the 1.9 km spot so they read
EU.lnW.value = qn('lw', 7); EU.lnCloud.value = qn('lc', 40); EU.lnFade.value = qn('lf', 120); EU.lnI.value = qn('li', 1);
EU.spI.value = qn('spi', 40); EU.spR.value = qn('spr', 3.5);
EU.lsOn.value = 1; EU.lsDark.value = qn('lsd', 0.3);
// ---- the lens: glass tinted like the Earth it looks through (space mode would draw it black)
const rig = lensRig(S, { space: false, shadowDecal: false, zen: 0x9db4cc, hor: 0x9db4cc, ground: 0x7d94ad, sunI: 1.4 });
rig.lens.U.glow.value = 0.02;
const HA = qn('ha', 2.6);
// ---- camera: from above the spot, off the sunline, pulling back past the lens rim; the dot held at a design pixel
function aimAt(pos, target, sx, sy, mm) {
  const toT = target.clone().sub(pos).normalize(), vf = lensFov(mm) * D2R;
  const ay = ((sy - 480) / 960) * vf, ax = ((sx - 270) / 540) * vf * (540 / 960);
  const right = new THREE.Vector3().crossVectors(toT, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, toT);
  return pos.clone().add(toT.applyAxisAngle(right, ay).applyAxisAngle(up, ax).multiplyScalar(1e4));
}
// from the sun's side (front-lit), qn('el') above the horizon: the lens (65° up the sunline, leaning toward us) hangs above the dot
const CEL = qn('el', 34) * D2R, CH = TS.clone().applyAxisAngle(N, qn('az', 12) * D2R);
const CDIR = N.clone().multiplyScalar(Math.sin(CEL)).addScaledVector(CH, Math.cos(CEL)).normalize();
function camAt(tt, spot) {
  const u = ease.inOutSine(clamp(tt / DUR)), mm = lerp(50, 70, u);
  const pos = spot.clone().addScaledVector(CDIR, lerp(qn('r0', 1900), qn('r1', 3800), u));
  return { pos, look: aimAt(pos, spot, qn('sx', 320), qn('sy', 520), mm), mm, roll: lerp(-3, 2, u) };
}
const _h = new THREE.Vector3();
S.run((t) => {
  const tt = Math.max(t - 4, 0) + qn('tt', 0);
  const hd = headAt(tt), spot = hd.clone().multiplyScalar(RE);
  applyCam(camera, camAt(tt, spot), shake(t, 0.025, 0.6, 8));                  // camera FIRST
  SP.update(S, t);
  const D = lensD(SH, tt), w = spotOf(D);                                     // km (lensD returns metres)
  const Dk = D / 1000, wk = w / 1000;
  rig.set({ spot, D: Dk, sun: SUN, n: N, heat: 1, handleAngle: HA, t, coreI: 1.4, glowI: 0, discI: 0, beamI: 0.9, minPx: 3, glowR: Math.max(wk * 3, 5) });
  EU.lnB.value.copy(hd); EU.spR.value = Math.max(wk * 1.5, qn('spr', 3.5));
  EU.lsC.value.copy(rig.centre); EU.lsN.value.copy(SUN); EU.lsR.value = Dk / 2;
  _h.set(Math.cos(HA), 0, -Math.sin(HA)).applyQuaternion(rig.lens.group.quaternion); EU.lsH.value.copy(_h);
});
