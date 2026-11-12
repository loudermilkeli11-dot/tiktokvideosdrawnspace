// s03_wall (film 4.5–7.5): from the pier end, looking down the bay to the mouth. The 524 m wall races in from the fjord,
// boats are sucked up its face and thrown, spray sheets off the lip; it SWALLOWS THE LIGHTHOUSE at T.lighthouse (6.5 s,
// the scale beat). The camera pushes 45 -> 35 mm as it fills the frame; out on a dark spray wipe (droplets, never white).
import { createStudio, THREE, makeWorld, makeWave, makeWaveSpray, frontZ, LIGHTHOUSE, SUN, qn } from './kit.js';
import { createSpray } from '@engine/splash.js';
import { applyCam, shake, kick } from '@engine/camera.js';
import { rng, sstep, clamp, ease, lerp } from '@engine/util.js';
import { SHOT, T } from './story.js';
const F0 = SHOT.s03_wall.t0, DUR = SHOT.s03_wall.dur;
const S = createStudio({ samples: (t) => (t - 4 > DUR - 0.5 ? 12 : 8), near: 1, far: 2e5,
  post: { exposure: 1.0, bloom: 0.06, bloomThreshold: 2.6, bloomRadius: 0.55, vignette: 0.24, grain: 0.014, ca: 0.0008, sat: 1.12, contrast: 1.07 } });
const W = makeWorld(S, { boats: 16 });
const WV = makeWave(S);
const P = W.bay.pier, CAM = P.toWorld(0.6, P.deckY + qn('ch', 6.5), -P.len + 4);
const spray = makeWaveSpray(S, W, WV.MW, (ft) => WV.stAt(ft), F0 - 0.6, F0 + DUR + 0.1, { film0: F0, xs: [-1400, 1400], dx: 45 });
// the wipe: dark droplets and spray sheets thrown across the lens in the last 0.35 s
const R = rng(5), wp = [];
for (let i = 0; i < 900; i++) { const tt = DUR - 0.45 + Math.pow(R(), 0.6) * 0.42, d = 2.5 + R() * 14, drop = R() < 0.8;
  const fw = new THREE.Vector3(0.15, 0, -1).normalize(), rt = new THREE.Vector3(1, 0, 0.15).normalize();
  const p = CAM.clone().addScaledVector(fw, d).addScaledVector(rt, -d * 0.75 - 2 + (R() - 0.5) * 3).add(new THREE.Vector3(0, (R() - 0.5) * d * 1.6, 0));
  wp.push({ p: p.toArray(), v: rt.clone().multiplyScalar(40 + 30 * R()).add(new THREE.Vector3(0, 6 * R(), 0)).toArray(), t0: tt + 4,
    size: drop ? 0.03 + 0.06 * R() : 0.4 + 0.8 * R(), drag: 0.4, life: 1.2, kind: drop ? 0 : 1, shade: 0.3 + 0.15 * R() }); }
const wipe = createSpray(S, wp, { hazeD: 1e6 }); wipe.U.sunDir.value.copy(SUN); wipe.U.amb.value.set(0x34505a);
// boats: sucked up the face as it arrives, tumbling, then gone into the lip
function boatOnWave(b, i, t) {
  const ft = F0 + t - 4, st = WV.stAt(ft), d = b.z - st.front, H = st.H;
  if (d > 1.0 * H) return null;
  if (d < -0.2 * H) return false;
  const u = clamp(1 - (d + 0.2 * H) / (1.2 * H)), y = H * Math.pow(u, 1.4) * 0.92;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.2 * u + 0.4 * Math.sin(ft * 3 + b.ph), b.yaw + 2 * u * b.spin, 1.5 * u * Math.sin(b.ph + ft), 'YXZ'));
  return { p: new THREE.Vector3(b.x, y + 1, b.z - u * 0.12 * H), q };
}
S.run((t) => {
  const tt = t - 4, ft = F0 + tt;
  const st = WV.set(ft);
  const u = ease.inOutSine(clamp(tt / DUR));
  const mm = lerp(qn('mm0', 55), qn('mm1', 35), u);
  const look = new THREE.Vector3(lerp(LIGHTHOUSE.x - 30, 60, u), lerp(qn('ly0', 160), qn('ly1', 330), u), LIGHTHOUSE.z);
  const near = sstep(F0 + 1.2, F0 + DUR, ft);
  if (qn('dbg', 0)) { applyCam(S.camera, { pos: new THREE.Vector3(LIGHTHOUSE.x - 60, 40, LIGHTHOUSE.z + 200), look: new THREE.Vector3(LIGHTHOUSE.x, 20, LIGHTHOUSE.z), mm: 35 }); W.update(t); return; }
  applyCam(S.camera, { pos: CAM, look, mm, roll: lerp(0, -2.5, u) }, shake(t, 0.06 + 0.5 * near, 1.4, 3).map((v, k) => v + (k === 1 ? 0.6 * kick(ft, T.lighthouse, 1.6) : 0)));
  W.update(t, { shadowCenter: CAM });
  W.placeBoats(t, boatOnWave);
  spray.update(t); wipe.update(t);
});
