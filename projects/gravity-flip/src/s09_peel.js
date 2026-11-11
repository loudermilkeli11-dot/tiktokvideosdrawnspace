// s09_peel (film 24.0–30.5; T = 600 s; the speed-ramped clock from story.js: a time-lapse to τ 286, then slow motion).
// A: 0–3.5 s, "Now make it ten minutes.": the whole planet from orbit. The oceans, the clouds and the air lift off as
//    concentric shells (radius = heightAt(τ, 600)): a shimmering translucent water sheet with continent-shaped holes over
//    the bare sea floor, the cloud deck riding on it, the blue air glow on top; the gap opens along the limb.
// B: 3.5–6.5 s (cut on the caption's hit), "Planes pass the space station.": the slow part of the clock. An airliner that
//    was cruising at 11.8 km rises past a generic space station at 408 km. The camera rides with the plane and swings round
//    it, so the station goes from above it (black sky) through the horizon to below it (the water sheet, Earth beyond).
// Everything that moves is a function of τ: no hand animation of the law.
import { createStudio, THREE } from '@engine/engine.js';
import { createSpace, RE } from '@engine/space.js';
import { createShell } from '@engine/shell.js';
import { createStation } from '@engine/iss.js';
import { createPlane, createPlanes } from '@engine/planes.js';
import { applyCam, shake, lensFov } from '@engine/camera.js';
import { ease, clamp, lerp, sstep, rng } from '@engine/util.js';
import { tauAt, heightAt } from './story.js';

const Q = new URLSearchParams(location.search);
const D2R = Math.PI / 180, CUT = 3.5, ISS = 408, A0 = +(Q.get('a0') ?? 11.1);   // km: the station's altitude, the plane's start altitude
const S = createStudio({ samples: (t) => (t - 4 >= CUT ? 4 : 2), near: 1, far: 3e6,
  post: { exposure: 1.0, bloom: 0.18, bloomThreshold: 1.4, bloomRadius: 0.6, vignette: 0.38, grain: 0.025, ca: 0.0006, sat: 1.08, contrast: 1.04 } });
const { scene, camera } = S;
// lat/lon -> unit vector in the Earth's frame (same parameterisation as SphereGeometry's UVs; Earth is not rotated here)
const dirLL = (lon, lat) => { const ph = (lon + 180) * D2R, th = lat * D2R; return new THREE.Vector3(-Math.cos(ph) * Math.cos(th), Math.sin(th), Math.sin(ph) * Math.cos(th)); };
const SUN = dirLL(-25, 5);                                   // the Sun overhead in the mid-Atlantic
const SP = createSpace(S, { sunDir: SUN.toArray(), ring: false, stars: 0.32, sunI: 1.45, seg: [512, 256], sunGlare: 0.6 });
SP.EU.cloudsI.value = 0; SP.EU.detail.value = 1;
const SH = createShell(S, SP, { cloudH: 4, airH: 70, clear: 1 });
// ---- the station right over the Egyptian coast (the sheet's torn edge below it); local frame (east, up, north) ----
const UP = dirLL(27.5, 31.25), EAST = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), UP).normalize(), NORTH = new THREE.Vector3().crossVectors(UP, EAST);
SH.U.clearDir.value.copy(UP); SH.U.clearR.value = 0.05;
const PS = UP.clone().multiplyScalar(RE + ISS);
const AZ = +(Q.get('az') ?? 112) * D2R;                         // the view azimuth at the pass (from north toward east)
const HD = NORTH.clone().multiplyScalar(Math.cos(AZ)).addScaledVector(EAST, Math.sin(AZ));   // horizontal: plane -> station
const SIDE = new THREE.Vector3().crossVectors(HD, UP).normalize();
const ST = createStation(S, { scale: 0.001 });
{ const x = new THREE.Vector3().copy(SIDE).applyAxisAngle(UP, 0.35), z = new THREE.Vector3().crossVectors(x, UP).normalize();
  ST.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, UP, z.negate())); }
ST.root.position.copy(PS); ST.setArrays(0.5);
const DH = +(Q.get('dh') ?? 0.8), DS = +(Q.get('ds') ?? 0.1);   // km: plane path's horizontal distance from the station, sideways offset
// ---- the hero airliner + a scattered fleet of distant ones (all ride the law from their own cruise altitudes) ----
const jet = createPlane(S, { scale: 0.001 }); jet.mesh.renderOrder = 10; jet.mesh.frustumCulled = false;
const R = rng(77), FL = 36, fleet = createPlanes(S, FL, { scale: 0.001 }); fleet.mesh.renderOrder = 10;
const far = Array.from({ length: FL }, () => ({ e: (R() - 0.5) * 140, n: (R() - 0.5) * 140, a0: 9.5 + R() * 3, ax: new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), w: 0.2 + R() * 0.5, p: R() * 6 }));
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), v1 = new THREE.Vector3();
const TUMBLE = new THREE.Vector3(0.35, 0.25, 0.9).normalize();            // plane space: mostly a slow roll with some yaw
// level, nose along SIDE (broadside to the camera at the pass), a little nose-up and banked
const BASE = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(HD.clone().negate(), UP, SIDE.clone().negate()))
  .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25, 0.3, -0.35)));
// ---- lights: the Sun, and blue earthshine from below the station ----
const sun = new THREE.DirectionalLight(0xfff4e6, 3.0); sun.position.copy(SUN); scene.add(sun); scene.add(sun.target);
const hemi = new THREE.HemisphereLight(0x000000, 0x5a7fb0, 0.55); hemi.position.copy(UP); scene.add(hemi);
const amb = new THREE.AmbientLight(0x8090a0, 0.06); scene.add(amb);

const relAt = (tau) => heightAt(tau, 600) / 1000 + A0 - ISS;          // plane altitude relative to the station (km)
const planePos = (tau, out = new THREE.Vector3()) => out.copy(PS).addScaledVector(HD, -DH).addScaledVector(SIDE, DS).addScaledVector(UP, relAt(tau));
// ---- part A: wide orbit view, Earth centre placed at a design pixel (sx, sy) ----
function aimFor(pos, sx, sy, mm) {
  const toE = pos.clone().negate().normalize(); const vf = lensFov(mm) * D2R;
  const ay = ((sy - 480) / 960) * vf, ax = ((sx - 270) / 540) * vf * (540 / 960);
  const right = new THREE.Vector3().crossVectors(toE, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, toE);
  const fwd = toE.clone().applyAxisAngle(right, ay).applyAxisAngle(up, ax); return pos.clone().add(fwd.multiplyScalar(1e5));
}
const CAMDIR = dirLL(+(Q.get('lon') ?? -6), +(Q.get('lat') ?? 12));
S.run((t) => {
  const tt = Math.max(t - 4, 0), tau = tauAt('s09_peel', tt), h = heightAt(tau, 600) / 1000;
  // the shells and what they leave behind
  SH.update(S, t, { h, show: true });
  const fresh = 1 - sstep(0, 25, h);                                     // at the very start the sheet still looks like the sea
  SH.U.waterI.value = 1; SP.EU.seabed.value = 1; SH.U.time.value = tau * 0.05;
  SP.EU.atmI.value = 1 - sstep(4, 50, h); SH.U.airI.value = sstep(2, 40, h);
  SH.U.fresh && (SH.U.fresh.value = fresh);
  // the hero plane and the fleet ride the law from their cruise altitudes, tumbling (story-time spin: slow in slow motion)
  planePos(tau, jet.root.position);
  jet.root.quaternion.copy(BASE).multiply(qa.setFromAxisAngle(TUMBLE, (tau - 287.3) * 0.22));
  far.forEach((f, i) => { const p = PS.clone().addScaledVector(EAST, f.e).addScaledVector(NORTH, f.n).addScaledVector(UP, heightAt(tau, 600) / 1000 + f.a0 - ISS);
    fleet.set(i, p, qa.setFromAxisAngle(f.ax, f.p + tau * f.w * 0.3)); });
  const B = tt >= CUT;
  ST.root.visible = jet.root.visible = fleet.mesh.visible = B;
  if (!B) {
    // A: slow push toward the limb; the limb across the upper frame, Africa and the Atlantic below
    const u = ease.inOutSine(clamp(tt / CUT)), mm = 30;
    const dist = lerp(12500, 10200, u);
    const pos = CAMDIR.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), lerp(0.0, 0.05, u)).multiplyScalar(dist);
    camera.near = 50; camera.far = 3e6;
    applyCam(camera, { pos, look: aimFor(pos, lerp(250, 262, u), +(Q.get('sy') ?? 1010), mm), mm, roll: lerp(-4, -2, u) }, shake(t, 0.02, 0.5, 3));
  } else {
    // B: ride with the plane; the camera swings round it so it always looks past the plane at the station
    const P = planePos(tau), toS = PS.clone().sub(P); const dS = toS.length(); toS.normalize();
    const el = Math.asin(clamp(toS.dot(UP), -1, 1));                          // station elevation seen from the plane
    const elc = clamp(el * +(Q.get('lag') ?? 0.8), -38 * D2R, 38 * D2R);    // the camera lags and never looks straight up or down
    const dirC = HD.clone().multiplyScalar(Math.cos(elc)).addScaledVector(UP, Math.sin(elc)).normalize();
    const camD = +(Q.get('cd') ?? 0.16);
    const pos = P.clone().addScaledVector(dirC, -camD).addScaledVector(SIDE, +(Q.get('cs') ?? -0.03)).addScaledVector(UP, -0.01);
    const look = P.clone().addScaledVector(dirC, 0.5).addScaledVector(SIDE, +(Q.get('ls') ?? 0.03));
    camera.near = 0.004; camera.far = 3e6;
    applyCam(camera, { pos, look, mm: +(Q.get('mm') ?? 32), roll: 0 }, shake(t, 0.05, 0.6, 7));
    // level to the local horizon (applyCam assumes world +Y is up; here 'up' is the station's zenith)
    const sh = shake(t, 0.05, 0.6, 7); camera.up.copy(UP); camera.lookAt(look);
    camera.rotateY(sh[0] * D2R); camera.rotateX(sh[1] * D2R); camera.rotateZ(sh[2] * D2R);
  }
  SP.update(S, t); sun.position.copy(camera.position).add(SUN); sun.target.position.copy(camera.position);
});
