// s05_town (film 18.0–22.5, steps 4 -> 5): the bay town burns in one line. Page t = shot time + 4.
// Set: kit bayWorld (API R2). The lens grows 632 m -> 2 km over 0.0–0.8 (lensD, story.js); it hangs 0.91·D (1.8 km) up and 0.41·D
// (0.8 km) toward +Z from its spot (lens centre = spot + SUN·D, kit rig). To hold the 2 km lens AND its spot in one frame we look
// UP-SUN (+Z) from the north headland, 1.5 km across the bay: the lens's lower rim and glass fill the top of the sky, its 2 km
// shadow lies on the bay, the hero stands small on the headland (bottom-left of centre) shading their eyes.
// Spot path (the lens drifts; any speed is the liberty): the 19 m spot (spotOf(2 km)) sweeps the south-shore town east -> west:
// every roof under it catches at its passage time (a burning swath), then it turns onto the bay and runs toward us in a boiling
// white wake (N5, 1.2 t of sea per second). It never comes within 600 m of the hero. The pier still burns from s04.
// First 0.6 s: the crane from s04 continues (up and back, decelerating).
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { clamp } from '@engine/util.js';
import { createSpray } from '@engine/splash.js';
import { createBirds } from '@engine/crowd.js';
import { bayWorld, lensRig, makeHero, POST_DAY, SAMPLES, SUN, lookDir, qn, D2R } from './kit.js';
import { createFlames } from './lens.js';
import { lensD, spotOf, CMAX } from './story.js';
import { pathFn, boilParts, createFoam, createSeaShadow, hideFromMirror, passTime, handleDirOf } from './groupB_bay.js';

const SHOTN = 's05_town';
const S = createStudio({ samples: (t) => (t - 4 < 0.6 ? 12 : SAMPLES.s05_town), shadows: false, near: 0.5, far: 3e4, post: POST_DAY });
const W = bayWorld(S, {});
const { bay, ocean } = W, pier = bay.pier, G = W.ground;
const rig = lensRig(S, { sky: W.sky, shadowDecal: false });
const shadow = createSeaShadow(S, { h: 0.3, dark: 0.55 });
rig.beam.core.m.material.depthTest = false; rig.beam.halo.m.material.depthTest = false;

// ---- camera on the north headland, looking up-sun across the bay at the south town
const CX = qn('cx', -200), CZ = qn('cz', -680), CH = qn('ch', 70);
const CAM = new THREE.Vector3(CX, Math.max(G(CX, CZ), 0) + CH, CZ);
const YAW = qn('yaw', 170), PITCH = qn('pitch', 2.5), MM = qn('mm', 28), HANDLE = qn('ha', -1.45);
// headland buildings right in front of the lens would wall off the view: they go (radius clr)
{ const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), M = bay.buildings;
  for (let i = 0; i < M.count; i++) { M.getMatrixAt(i, m4); m4.decompose(p, q, s); if (Math.hypot(p.x - CX, p.z - CZ) < qn('clr', 220)) M.setMatrixAt(i, m4.makeScale(0, 0, 0)); }
  M.instanceMatrix.needsUpdate = true; }

// ---- the spot: across the town (east -> west), then onto the bay toward the headland
const T_TOWN0 = 0.5, T_TURN = 2.6, T_END = 4.8, ZT = qn('zt', 95);
const spotAt0 = pathFn([
  { t0: -1.0, t1: T_TOWN0, a: new THREE.Vector3(330, 0, ZT + 30), b: new THREE.Vector3(250, 0, ZT), ease: 'lin' },
  { t0: T_TOWN0, t1: T_TURN, a: new THREE.Vector3(250, 0, ZT), b: new THREE.Vector3(-230, 0, ZT - 10), via: new THREE.Vector3(30, 0, ZT + 25), ease: 'lin' },
  { t0: T_TURN, t1: T_END, a: new THREE.Vector3(-230, 0, ZT - 10), b: new THREE.Vector3(qn('wx', -165), 0, qn('wz', -330)), via: new THREE.Vector3(-245, 0, -110), ease: 'lin', water: true },
]);
// on land the spot sits on the ground (or roof); "water" only where the bay is
const spotAt = (tt) => { const s = spotAt0(tt), h = G(s.p.x, s.p.z); const water = h < -0.3; s.p.y = water ? 0 : Math.max(h, 0); s.water = water; return s; };
const wAt = (tt) => spotOf(lensD(SHOTN, tt));

// ---- roofs that catch: every building whose footprint the 19 m spot crosses; flames on the roof at the passage time
const FR = (i) => ((i * 0.6180339887) % 1);
const fpts = [];
{ const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), M = bay.buildings; let nb = 0;
  for (let i = 0; i < M.count; i++) { M.getMatrixAt(i, m4); m4.decompose(p, q, s); if (s.x < 0.01 || p.z < -200 || Math.abs(p.x) > 520) continue;
    const r = Math.hypot(s.x, s.z) / 2, pt = passTime(spotAt, p, -1.0, T_TURN, 1 / 120); if (pt.d > r + 13) continue;
    const top = p.y + s.y, n = 3 + Math.round(r / 4);
    for (let k = 0; k < n; k++) { const ox = (FR(i + k * 3) - 0.5) * s.x * 0.8, oz = (FR(i * 7 + k) - 0.5) * s.z * 0.8, o = new THREE.Vector3(ox, 0, oz).applyQuaternion(q);
      fpts.push({ p: new THREE.Vector3(p.x + o.x, top - 0.3, p.z + o.z), s: 16 + 18 * FR(i * 3 + k * 5), t0: pt.t + 0.05 + 0.12 * FR(k + i), grow: 0.4, seed: FR(i * 11 + k) }); }
    nb++; }
  if (qn('dbg', 0)) console.error('s05 roofs burning:', nb); }
// the ground line between the roofs (gardens, streets) burns too: one continuous line
for (let tt = -1.0, i = 0; tt < T_TURN; tt += 1 / 40, i++) { const s = spotAt(tt); if (s.water) continue;
  fpts.push({ p: new THREE.Vector3(s.p.x + (FR(i) - 0.5) * 12, s.p.y, s.p.z + (FR(i * 3) - 0.5) * 12), s: 11 + 12 * FR(i * 7), t0: tt + 0.05, grow: 0.35, seed: FR(i * 5) }); }
// the pier, still burning from s04
for (let lz = -150, i = 0; lz <= -6; lz += 2.5, i++) fpts.push({ p: pier.toWorld((FR(i) - 0.5) * 3, pier.deckY, lz), s: 4 + 4 * FR(i * 3), t0: -6, grow: 0.5, seed: FR(i * 7) });
const flames = createFlames(S, fpts, { I: 5.5 });
// ---- N5: the boiling wake across the bay (1.2 t of sea per second: tall white jets)
const spray = createSpray(S, boilParts(spotAt, { t0: T_TURN - 0.1, t1: T_END, w: 19, k: 4.5, n: 24, rate: 90, seed: 505 }), { hazeD: 9000 });
spray.U.sunDir.value.copy(SUN); spray.U.streak.value = 1 / 15;
const foam = createFoam(S, spotAt, { t0: T_TURN - 0.1, t1: T_END, width: 26, n: 500, fade: 6 });
hideFromMirror(ocean, [spray.mesh, foam.mesh, shadow.mesh, rig.beam.cone]);
// ---- the hero on the headland (bottom-left of centre), facing the town, shading their eyes
const hero = makeHero(S, { pose: 'shade' });
const HX = CX + qn('hx', 6.5), HZ = CZ + qn('hz', 21);
hero.root.position.set(HX, G(HX, HZ), HZ); hero.root.rotation.y = Math.PI + 12 * D2R;
hero.root.visible = qn('hero', 0) > 0;                                   // drone view over the lagoon: no ground near the lens for the hero (see hand-over)
const gulls = createBirds(S, 10, { flap: 9, seed: 52, color: 0xe2e6ea });

const _h = new THREE.Vector3();
S.run((t) => {
  const tt = t - 4;
  // continues s04's crane (s04 ends rising ~9.6 m/s, backing −Z 4.5 m/s, tilting down 6°/s): same motion, decelerating to rest at 0.6
  const cr = clamp(tt / 0.6), crE = 1 - (1 - cr) * (1 - cr);
  const pos = CAM.clone().add(new THREE.Vector3(0, -2.9 * (1 - crE), 1.35 * (1 - crE)));
  pos.x += 3 * clamp(tt / 4.5);
  applyCam(S.camera, { pos, look: lookDir(pos, YAW, PITCH + 1.8 * (1 - crE)), mm: MM, roll: 0 }, shake(t, 0.03, 0.7, 8));
  W.update(S, t, { focus: new THREE.Vector3(0, 0, 0) });
  const D = lensD(SHOTN, tt), s = spotAt(tt);
  rig.set({ spot: s.p, D, C: CMAX, n: new THREE.Vector3(0, 1, 0), heat: 1, handleAngle: HANDLE, t, minPx: 9, coreI: 1.2, glowR: Math.max(wAt(tt) * 1.8, 20) });
  { // the kit's core/halo billboards are sized for the ground sets; at 1 km they clip against the water into a hard box: keep
    // them spot-sized (with a pixel floor), lift them off the surface, and draw them without depth test
    const w = wAt(tt), cam = S.camera, mpp = (2 * cam.position.distanceTo(s.p) * Math.tan((cam.fov * Math.PI) / 360)) / 1920;
    rig.beam.core.U.size.value = Math.max(w * 0.75, 7 * mpp); rig.beam.halo.U.size.value = Math.max(w * 1.7, 22 * mpp);
    rig.beam.core.U.c.value.y += w * 0.25; rig.beam.halo.U.c.value.y += w * 0.25; }
  shadow.set({ centre: rig.centre, D, handleDir: handleDirOf(rig, HANDLE, _h), spot: s.p, sun: SUN });
  gulls.update(t, (x) => new THREE.Vector3(-60 - x * 9, 52 + Math.sin(x) * 3, -560 - x * 5), 10, 1.6);
  flames.update(tt); spray.update(tt); foam.update(tt);
});
