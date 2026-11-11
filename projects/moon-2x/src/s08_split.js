// s08_split (film 33–38, storyT 30–35): THE MOON BREAKS APART. 70->78 mm push from the hill above the drowned town.
// Chunks part at a constant rate along the fracture network, rubble fills the gaps and streams toward Earth.
// Out: a fragment sweeps past the lens (foreground wipe) into s09.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { createCrowd } from '@engine/crowd.js';
import { createBreakup } from '@engine/breakup.js';
import { trimBreakup } from '@engine/debris.js';
import { groundH, sField } from '@engine/bay.js';
import { clamp, lerp, rng, smoother } from '@engine/util.js';
import { bayWorld, D2R, SHOT, dirThroughScreen } from './kit.js';
import { angRadius } from './story.js';
const S = createStudio({ samples: 8, post: { exposure: 1.05, bloom: 0.18, bloomThreshold: 1.5, bloomRadius: 0.6, vignette: 0.5, grain: 0.03, sat: 1.06, contrast: 1.06 } });
const W = bayWorld(S, { pierYaw: 3 * D2R });
const B = createBreakup(S, { moon: { sunI: 1.3, normalScale: 2.0 }, rubble: 1400 });
trimBreakup(B);   // each chunk keeps only its own triangles: same picture, far cheaper
// camera on the hillside inland of the inner shore, looking out over the town and the flooded bay to the mouth
const CX = 40, CZ = 260; const camBase = new THREE.Vector3(CX, groundH(CX, CZ) + 38, CZ);
// crowd on the hill crest just below the camera, silhouetted against the bay (55–75 m away)
const R = rng(31); const people = [];
for (let i = 0; i < 26; i++) { const x = CX - 40 + R() * 80, z = CZ - 70 - R() * 20; if (sField(x, z) < 45) continue; people.push({ x, z, y: groundH(x, z), yaw: (R() - 0.5) * 0.4 }); }
const crowd = createCrowd(S, people, { poses: ['handsHead', 'point', 'phoneUp', 'shade', 'filming', 'arms', 'handsHead'], rimI: 1.3 });
// the wipe rock: one big fragment that crosses the lens at the end
const wipe = new THREE.InstancedMesh(B.rocks.geometry, B.rocks.material, 1); wipe.frustumCulled = false; S.scene.add(wipe); const wm4 = new THREE.Matrix4();
const MM0 = 70, MM1 = 78, TOP = 330;
S.run((t) => {
  const tt = Math.max(t - 4, 0), storyT = SHOT.s08_split - 3 + tt, ang = angRadius(storyT);
  const mm = MM0 * Math.pow(MM1 / MM0, tt / 5);                               // slow push (zoom) at a constant rate
  const pxPerDeg = 960 / (2 * Math.atan(18 / mm) / D2R);
  const rpx = ang / D2R * pxPerDeg, cy = Math.max(TOP + rpx, 470);
  const pos = camBase.clone().add(new THREE.Vector3(0, 0, -tt * 0.6));
  const look = new THREE.Vector3(10, 95, -1700);
  applyCam(S.camera, { pos, look, mm, roll: -1.2 }, shake(t, 0.14, 1.3));
  const md = dirThroughScreen(S.camera, 280, cy);
  const sep = lerp(0.07, 0.55, tt / 5), stretch = lerp(0.05, 0.32, tt / 5), tail = lerp(0.05, 0.75, tt / 5);
  const res = W.update(S, t, { storyT, moonDir: md, moonVisible: false, level: 6.2, amp: 1.7, power: 0.06, flicker: 0.5, wet: 1 });
  const sun = W.moon.U.sunDir.value.clone();
  B.update(t, { centre: pos.clone().addScaledVector(md, W.DIST), radius: W.DIST * Math.sin(ang), md, sunDir: sun, crack: 1, sep, stretch, tail,
    airCol: new THREE.Color(0.045, 0.07, 0.14), hot: 0.18 });
  B.U.sunI.value = res.g.moonSunI;
  crowd.material.U.rimDir.value.copy(md); crowd.update(t, { agitation: 0.9 });
  // foreground wipe: a fragment sweeps right-to-left across the lens from tt 4.62 to 5.0 (motion-blurred)
  const w = clamp((tt - 4.62) / 0.38);
  if (w > 0 && w < 1) { wipe.visible = true; const fwd = S.camera.getWorldDirection(new THREE.Vector3()); const rt = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const wp = S.camera.position.clone().addScaledVector(fwd, 7).addScaledVector(rt, lerp(9, -9, smoother(0, 1, w))).add(new THREE.Vector3(0, lerp(1.5, -0.5, w), 0));
    wm4.compose(wp, new THREE.Quaternion().setFromEuler(new THREE.Euler(t * 3, t * 2, 0)), new THREE.Vector3(3.4, 3.4, 3.4)); wipe.setMatrixAt(0, wm4); wipe.instanceMatrix.needsUpdate = true; } else wipe.visible = false;
});
