// s06_lift (film 16.0–19.5): x8. Above the cloud deck, the camera rising: the wall punches up through the clouds, growing
// 2,096 -> 4,192 m (16.0–16.6), taller than the ocean is deep, its lip curling over with spray streaming off it; the sky
// above turns deep blue. World y = altitude (m); the deck tops are ~2.6 km; the wave is hidden below the deck (dithered cut).
import { createStudio, THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createClouds } from '@engine/clouds.js';
import { createMegaWave } from '@engine/megawave.js';
import { createSpray } from '@engine/splash.js';
import { applyCam, shake, kick } from '@engine/camera.js';
import { clamp, sstep, lerp, ease, rng } from '@engine/util.js';
import { SHOT, T, waveH } from './story.js';
const D2R = Math.PI / 180, Q = new URLSearchParams(location.search), qn = (k, d) => (Q.has(k) ? +Q.get(k) : d);
const F0 = SHOT.s06_lift.t0, DUR = SHOT.s06_lift.dur;
const S = createStudio({ samples: 8, near: 5, far: 4e5,
  post: { exposure: 1.0, bloom: 0.08, bloomThreshold: 2.4, bloomRadius: 0.6, vignette: 0.22, grain: 0.012, ca: 0.0008, sat: 1.12, contrast: 1.06 } });
const { scene } = S;
S.hdri('hdri_day_1k.hdr', 0.5);
const SUN = new THREE.Vector3(Math.sin(118 * D2R) * Math.cos(38 * D2R), Math.sin(38 * D2R), -Math.cos(118 * D2R) * Math.cos(38 * D2R)).normalize();
const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky);
sky.U.dayZen.value.set(0x163f9c); sky.U.dayHor.value.set(0x9cc0ea); sky.U.altI && (sky.U.altI.value = 1); sky.U.sunDisc && (sky.U.sunDisc.value = 1);
const DECK = 1500;
const CL = createClouds(S, { base: 800, thick: 800, towers: 0.25, cover: 0.82, hazeL: 160e3, sunI: 1.5, skyI: 0.6, seed: 5 });
CL.U.hazeCol.value.copy(sky.U.dayHor.value).multiplyScalar(1.5 * 1.3);
const sun = new THREE.DirectionalLight(0xfff3e2, 3.1); scene.add(sun); scene.add(sun.target);
const hemi = new THREE.HemisphereLight(0x6f9be0, 0xf4f6ff, 1.0); scene.add(hemi);
scene.fog = new THREE.Fog(0xb0cbea, 8000, 160000);
// the wall: front 7 km ahead of the camera's start, facing it
const MW = createMegaWave(S, { len: 26000, cols: 360, seed: 9, flow: 70 });
MW.U.cutY.value = DECK; MW.U.cutSoft.value = 260; MW.U.cutCol.value.setRGB(0.93, 0.95, 0.98);
const Z0 = qn('zw', -7200);
const stAt = (ft) => { const u = clamp((ft - F0) / DUR); return { H: waveH(ft), front: Z0 + 450 * u, curl: 0.35 + 0.45 * sstep(0.2, 1, u), lean: 0.2 + 0.2 * u, bend: 1 / (2 * 30000), time: ft, sunDir: SUN }; };
// spray streaming off the lip and spindrift blown back over the crest
const R = rng(12), parts = [];
for (let ft = F0 - 0.4; ft < F0 + DUR; ft += 0.1) { const st = stAt(ft);
  for (let x = -6000; x <= 6000; x += 140) { const xj = x + (R() - 0.5) * 120, lip = MW.lipAt(xj, st, 8), cr = MW.lipAt(xj, st, 5), H = st.H;
    const k = R() < 0.5 ? 0 : R() < 0.6 ? 2 : 1;
    parts.push({ p: lip.toArray(), v: [(R() - 0.5) * 60, -0.02 * H + R() * 40, 0.12 * H * (0.4 + 0.6 * R())], t0: ft - F0 + 4 + R() * 0.1,
      size: (k === 0 ? 0.006 : k === 1 ? 0.022 : 0.05) * H * (0.6 + 0.8 * R()), drag: k === 2 ? 1.2 : 0.7, life: 3, kind: k, shade: 1 });
    parts.push({ p: [cr.x, cr.y + 0.02 * H, cr.z], v: [(R() - 0.5) * 40, 0.05 * H * R(), -0.06 * H * R()], t0: ft - F0 + 4 + R() * 0.1, size: 0.08 * H * (0.6 + 0.8 * R()), drag: 1.3, life: 2.5, kind: 2, shade: 1 }); } }
const spray = createSpray(S, parts, { hazeD: 60000 }); spray.U.sunDir.value.copy(SUN); spray.U.streak.value = 1 / 20; spray.U.amb.value.set(0x8fb0d8);
S.run((t) => {
  const tt = t - 4, ft = F0 + tt, u = ease.inOutSine(clamp(tt / DUR));
  MW.set(stAt(ft));
  const pos = new THREE.Vector3(lerp(-400, 300, u), lerp(qn('y0', 2900), qn('y1', 3700), u), lerp(0, -300, u));
  const look = new THREE.Vector3(lerp(200, 0, u), lerp(2900, 3900, u), Z0);
  applyCam(S.camera, { pos, look, mm: lerp(qn('mm0', 30), qn('mm1', 35), u), roll: lerp(3, -2, u) }, shake(t, 0.05 + 0.25 * kick(ft, F0, 1.4), 1.1, 8));
  sky.U.sunDir.value.copy(SUN); sky.update(S, t);
  CL.update(S, { alt: 0, sunDir: SUN }); sky.U.dip && (sky.U.dip.value = CL.dip);
  sun.position.copy(pos).addScaledVector(SUN, 1000); sun.target.position.copy(pos);
  spray.update(t);
});
