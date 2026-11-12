// k0_kittest: lead's check page for the shared kit (NOT a film shot). The hero vantage FRAME1_CAM with the balcony rail, the
// plaza world flung by the law, leaves, and a test dust sheet. Shot time tt = film time (as s01). Builder A owns s01's real
// camera move, dust layout, extra debris and timing.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam } from '@engine/camera.js';
import { cityWorld, balcony, createDust, gradeDust, FRAME1_CAM, POST_DAY, SAMPLES } from './kit.js';
import { evAt } from './story.js';
const S = createStudio({ samples: (t) => (t - 4 < 1.0 ? SAMPLES.s01_pre : SAMPLES.s01_plaza), shadows: true, post: POST_DAY });
const W = cityWorld(S, {});
balcony(S, FRAME1_CAM);
const dust = createDust(S, [{ x0: -260, x1: 260, z: -10, h: 10, op: 0.55 }, { x0: -300, x1: 300, z: -80, h: 30, op: 0.7 }]);
const QQ = new URLSearchParams(location.search);
if (QQ.has('dbg2')) dust.meshes.forEach((m) => { m.material.fragmentShader = m.material.fragmentShader.replace('gl_FragColor = vec4(c, clamp(a, 0., 0.92));', `gl_FragColor = vec4(${QQ.get('dbg2') === '1' ? 'amt, OP, H/10.' : 'side, dens, edge/10.'}, 1.);`); });
if (QQ.has('dbg')) dust.meshes.forEach((m) => { m.material = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide }); });
S.run((t) => {
  const film = Math.max(t - 4, 0), e = evAt(film);
  applyCam(S.camera, FRAME1_CAM);
  W.update(film, { focus: new THREE.Vector3(0, 0, 10) });
  dust.update(e);
  gradeDust(S, Math.min(1, e / 0.6) * 0.5);
});
