// t02_town: wave test B (Gate 0, copied from projects/tsunami). Camera on the hillside above the town looking down over the rooftops
// to the bay: the wave crosses the bay and hits the promenade and the streets. tw = 9 + tt (crest reaches the shore ~13 s).
import { createStudio, THREE, makeWorld, qn, dirB, D2R, groundH, sField } from './tsukit.js';
import { applyCam, shake } from '@engine/camera.js';
const S = createStudio({ samples: 2, shadows: false, near: 0.5,
  post: { exposure: 1.0, bloom: 0.06, bloomThreshold: 2.5, bloomRadius: 0.55, vignette: 0.2, grain: 0.012, ca: 0.0008, sat: 1.12, contrast: 1.05 } });
const W = makeWorld(S, { boats: 6 });
const CAM = new THREE.Vector3(qn('cx', 60), 0, qn('cz', 190)); CAM.y = groundH(CAM.x, CAM.z) + qn('cy', 30);
const BEAR = qn('b', -3);
// clear the sight line: drop only the buildings that would hide the beach in the middle of the frame
{ const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), M = W.bay.buildings;
  for (let i = 0; i < M.count; i++) { M.getMatrixAt(i, m4); m4.decompose(p, q, sc); const dx = p.x - CAM.x, dz = p.z - CAM.z, d = Math.hypot(dx, dz);
    const b = Math.atan2(dx, -dz) / D2R - BEAR; let D = 60; for (; D < 400; D += 4) { const w = CAM.clone().addScaledVector(dirB(BEAR + b), D); if (sField(w.x, w.z) < 0) break; }
    const yl = CAM.y - (CAM.y - 2) * d / D; if (d < 12 || (d < D && Math.abs(b) < 26 && p.y + sc.y > yl - 3)) { m4.makeScale(0, 0, 0); M.setMatrixAt(i, m4); } }
  M.instanceMatrix.needsUpdate = true; }
const TW0 = qn('tw0', 9);
const spray = W.makeSpray(TW0, 8);
S.run((t) => {
  const tt = Math.max(t - 4, 0), tw = TW0 + tt;
  const dir = dirB(BEAR); dir.y = Math.tan(qn('pd', -4) * D2R); dir.normalize();
  applyCam(S.camera, { pos: CAM, look: CAM.clone().add(dir), mm: qn('mm', 28), roll: 0 }, shake(t, 0.08, 0.7, 5));
  W.update(t, tw, CAM); spray.update(t);
});
