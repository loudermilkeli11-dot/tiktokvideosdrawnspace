import { createStudio, THREE } from '@engine/engine.js';
import { applyCam } from '@engine/camera.js';
import { bayWorld, D2R } from '../../moon-2x/src/kit.js';
const S = createStudio({ samples: 1 });
const W = bayWorld(S, {});
S.run((t) => {
  const tt = t - 4; const storyT = 10 + tt;
  applyCam(S.camera, { pos: new THREE.Vector3(0, 6, 30), look: new THREE.Vector3(0, 30, -1500), mm: 135 }, [0, 0, 0]);
  W.update(S, t, { storyT, moonScreen: [300, 420], level: 2, amp: 1 });
});
