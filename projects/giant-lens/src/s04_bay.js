// s04_bay (film 13.5–18.0, steps 3 -> 4): the beam races up the pier. Page t = shot time + 4. (Builder B, session 3c)
// Set: kit bayWorld (API R2, noon). Hard cut on hit 1 at 13.5: we open with the lens mid-grow (200 -> 632 m over 0.0–0.8 s,
// story.SHOT.s04_bay.grows), so the spot widens 1.9 -> 5.9 m (spotOf). Lens centre = spot + SUN·D (kit rig): 573 m up, 256 m toward +Z.
// A -Z beach camera can never hold that lens and its spot in one frame, so we look UP-SUN (+Z) from the water ~65 m off the pier's end,
// along the pier (leading line) toward the town: the lens's lower rim and its handle hang across the top of the frame, its shadow
// darkens the water round the spot (analytic decal), the faint cone comes down to the deck.
// The spot (the lens drifts; any speed is the liberty): already on the deck at the shore end at the cut, it races out along the deck
// TOWARD us: planks flash into flame where it passes (wood ignites in < 0.5 s at 11.6 MW/m²); it swings over two moored boats (each
// ignites), then leaves the pier end for the water (N5 boil jet: white droplets + a thin vertical jet, no fluffy veil).
// Last 0.6 s: the camera cranes up (~5 m/s at the cut) and back (-Z), continuing into s05 (which also looks +Z, from the north headland).
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { ease, clamp, lerp, rng } from '@engine/util.js';
import { waveHeight } from '@engine/ocean.js';
import { createBoats } from '@engine/splash.js';
import { bayWorld, lensRig, POST_DAY, SAMPLES, SUN, lookDir, qn, D2R } from './kit.js';
import { createBurn, createFlames, createLensShadow } from './lens.js';
import { lensD, spotOf, CMAX } from './story.js';
import { boilSpray, passTimes, hideFromMirror } from './groupB_s04fx.js';

const SHOTN = 's04_bay';
const S = createStudio({ samples: (t) => (t - 4 > 3.85 ? 12 : SAMPLES.s04_bay), shadows: false, near: 0.5, post: POST_DAY });
const W = bayWorld(S, {});
const { bay, ocean } = W, PIER = bay.pier, DECK = PIER.deckY;
const rig = lensRig(S, { sky: W.sky });
rig.beam.core.m.material.depthTest = false; rig.beam.halo.m.material.depthTest = false;
// the lens shadow on the sea: the kit decal (depth-tested on the plane through the spot) left holes where waves/boats occluded it, so
// this shot draws the same analytic shadow on a fixed plane just above the water with no depth test (it darkens sea, pier and boats).
const seaShadow = createLensShadow(S, { dark: 0.45 }); seaShadow.mesh.material.depthTest = false; seaShadow.mesh.renderOrder = 17;
const SEA_H = 0.3, _sp = new THREE.Vector3(), _hd = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);

// ---- the spot path in pier space (lx across the deck, d out along it), shot time tt
const BOATS = [{ lx: 8.6, d: 116, L: 11, yaw: 0.04 }, { lx: -8.4, d: 70, L: 9, yaw: -0.05 }];
// The cut lands with the spot already on the deck near the shore end (it came off the beach before the cut: tt < 0 extrapolates).
const T_ON = -0.6, T_OFF = 3.2, D_ON = 2, D_OFF = 150;          // on the deck: shore end -> pier end, racing toward the camera
const dOf = (tt) => { const u = (tt - T_ON) / (T_OFF - T_ON); return D_ON + (D_OFF - D_ON) * (u * 0.82 + 0.18 * ease.inOutSine(clamp(u))); };
const T_BB = 1.17, T_BA = 2.25;                                 // over boat B (d 70) and boat A (d 116): dOf(T_BB) ≈ 70, dOf(T_BA) ≈ 116
const g = (x) => Math.exp(-x * x);
function pierXY(tt) {
  if (tt < T_OFF) return [-8.4 * g((tt - T_BB) / 0.16) + 8.6 * g((tt - T_BA) / 0.16), dOf(tt)];
  const u = ease.outCubic(clamp((tt - T_OFF) / (4.7 - T_OFF)));
  return [lerp(0, 24, u), lerp(D_OFF, 170, u)];                 // off the pier end onto the water, toward the camera: boil jet
}
const _pw = (lx, ly, d) => PIER.toWorld(lx, ly, -d);
function surfY(lx, d) {
  if (Math.abs(lx) < 2.5 && d > 0 && d < PIER.len) return DECK;
  for (const b of BOATS) if (Math.abs(lx - b.lx) < 1.8 && Math.abs(d - b.d) < b.L * 0.45) return 1.3;
  return 0.05;
}
const wAt = (tt) => spotOf(lensD(SHOTN, Math.max(tt, 0)));
const pathAt = (tt) => { const [lx, d] = pierXY(tt); const p = _pw(lx, 0, d); p.y = surfY(lx, d); return { p, w: wAt(tt), lx, d }; };
const onWater = (tt) => pathAt(tt).p.y < 0.5;

// ---- N5: the boil jet wherever the spot is on water
const ranges = []; { let a = null; for (let tt = 0; tt <= 4.6; tt += 0.01) { const w = onWater(tt); if (w && a === null) a = tt; if (!w && a !== null) { ranges.push([a, tt]); a = null; } } if (a !== null) ranges.push([a, 4.6]); }
const spray = boilSpray(S, ocean, pathAt, ranges, { seed: 41, rate: 90, per: 22, scale: qn('ss', 1.2), jetV: 17, jetK: 0.5, sheetK: 0.06 });

// ---- flames: deck planks (a racing line), the two boats; t0 = when the spot first covers the point
const FR = rng(77), deckPts = [], boatPts = [];
for (let d = 1; d <= PIER.len - 1; d += 1.3) for (const lx of [-1.7, 0, 1.7]) if (FR() < 0.85) deckPts.push({ lx: lx + (FR() - 0.5) * 0.6, d: d + (FR() - 0.5) * 0.8, s: 2.2 + FR() * 3.6 });
BOATS.forEach((b, bi) => { for (let i = 0; i < 14; i++) boatPts.push({ lx: b.lx + (FR() - 0.5) * 2.2, d: b.d + (FR() - 0.5) * b.L * 0.75, s: 1.8 + FR() * 3.2, bi }); });
const deckW = deckPts.map((q) => _pw(q.lx, DECK - 0.1, q.d)), boatW = boatPts.map((q) => _pw(q.lx, 1.0, q.d));
const tDeck = passTimes(deckW, pathAt, T_ON - 0.05, T_OFF + 0.1, 1.2), tBoat = passTimes(boatW, pathAt, 0, 4.6, 0.8);
const fl = [];
deckPts.forEach((q, i) => { if (tDeck[i] < 98) fl.push({ p: deckW[i], s: q.s, t0: tDeck[i] + 0.12 + FR() * 0.25, grow: 0.35, seed: FR() }); });
boatPts.forEach((q, i) => { if (tBoat[i] < 98) fl.push({ p: boatW[i], s: q.s, t0: tBoat[i] + 0.1 + FR() * 0.3, grow: 0.4, seed: FR() }); });
const flames = createFlames(S, fl.length ? fl : [{ p: new THREE.Vector3(0, -50, 0), s: 0.1, t0: 99 }], { I: qn('fi', 5) });
// N3 char line on the deck (clamped to the planks)
const burn = createBurn(S, { spotAt: (tt) => { const [lx, d] = pierXY(tt); return { p: _pw(clamp(lx, -1.3, 1.3), DECK + 0.01, d) }; }, t0: T_ON, t1: T_OFF, n: 500, width: 3.8, lift: 0.02, glowS: 3 });
hideFromMirror(ocean, [spray.mesh, flames.mesh, rig.lens.group, rig.beam.group, seaShadow.mesh]);   // the lens's mirror image broke up into pale blobs round the boats

// ---- moored daytime boats (splash.createBoats, never the bay's glow boats)
const MOOR = [...BOATS, { lx: 30, d: 150, L: 8, yaw: 0.6 }, { lx: -34, d: 128, L: 12, yaw: -0.4 }, { lx: 42, d: 60, L: 7, yaw: 1.1 },
  { lx: 52, d: 196, L: 10, yaw: 0.9 }, { lx: -22, d: 202, L: 8, yaw: -0.7 }];                       // two near the camera (never in the spot's path)
const BT = createBoats(S, MOOR.length, { seed: 3 });
const _q = new THREE.Quaternion(), _e = new THREE.Euler();

// ---- camera: on the water off the pier end, looking back along the pier (+Z, up-sun) at 20 mm; slow drift; crane at the end
const CAM0 = _pw(qn('clx', 75), qn('cy', 12), qn('cd', 215));                          // off the pier's axis: the racing line reads
const AIM = _pw(qn('alx', 0), 0, qn('ad', 80)).sub(CAM0);
const YAW0 = Math.atan2(AIM.x, -AIM.z) / D2R + qn('dyaw', 0), PITCH0 = qn('pitch', 0), MM = qn('mm', 20), HANDLE = qn('ha', -1.45);   // handle hangs down into the sky
const T_CRANE = 3.9;
S.run((t) => {
  const tt = Math.max(t - 4, 0), u = ease.inOutSine(clamp(tt / 4.5)), c = Math.max(0, tt - T_CRANE);
  const pos = CAM0.clone().add(new THREE.Vector3(-10 * u, 0, 0));                      // slow lateral drift (toward -X)
  pos.y += 3.6 * c * c / 0.6 + 2.4 * c; pos.z -= 4.5 * c;                              // crane up (~5 m/s at the cut) and back (-Z)
  const pitch = PITCH0 + 1.5 * u - 6 * c;
  applyCam(S.camera, { pos, look: lookDir(pos, YAW0 - 2 * u, pitch), mm: MM, roll: 0 }, shake(t, 0.03, 0.8, 4));
  W.update(S, t, { focus: _pw(0, 0, 90) });
  const P = pathAt(tt), D = lensD(SHOTN, tt), water = P.p.y < 0.5;
  rig.set({ spot: P.p, D, C: CMAX, n: new THREE.Vector3(0, 1, 0), heat: water ? 0.25 : 1, glowR: P.w * (water ? 1.1 : 1.6), handleAngle: HANDLE, t, minPx: 5,
    coreI: water ? 0.45 : 0.8, beamI: qn('bi', 0.55), shadowVisible: false, discI: water ? 0.12 : 0.5 });
  // the kit's core/halo billboards are sized for small spots; at 5.9 m they reach below the deck/water and get clipped into a hard
  // white box. Here: a tighter core and halo, lifted, drawn without the depth clip (they are glows).
  rig.beam.core.U.size.value = P.w * 0.75; rig.beam.halo.U.size.value = P.w * (water ? 1.2 : 1.7);
  rig.beam.core.U.c.value.y += P.w * 0.25; rig.beam.halo.U.c.value.copy(rig.beam.core.U.c.value);
  _sp.copy(P.p).addScaledVector(SUN, -(P.p.y - SEA_H) / SUN.y);                        // the spot's sun-line through the sea plane
  _hd.set(Math.cos(HANDLE), 0, -Math.sin(HANDLE)).applyQuaternion(rig.lens.group.quaternion);
  seaShadow.set({ centre: rig.centre, axis: SUN, D, handleDir: _hd, spot: _sp, n: UP, sun: SUN }); seaShadow.mesh.visible = !!qn('sh', 1);
  MOOR.forEach((b, i) => { const p = _pw(b.lx, 0, b.d); p.y = waveHeight(p.x, p.z, t, 0.45, 0) + 0.1;
    _q.setFromEuler(_e.set(0.02 * Math.sin(t * 1.3 + i), PIER.yaw + b.yaw, 0.03 * Math.sin(t * 0.9 + i * 2), 'YXZ')); BT.setBoat(i, p, _q, b.L); });
  BT.commit();
  burn.update(tt); flames.update(tt); spray.update(t);
});
