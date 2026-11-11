// Lineup check: 8 figure variants seen from behind, backlit against a dusk gradient.
import { createStudio, THREE } from '@engine/engine.js';
import { figureGeometry, figureMaterial, POSES } from '@engine/figure.js';
const S = createStudio({ samples: 1, post: { exposure: 1.0, bloom: 0.2, vignette: 0.2, grain: 0.0 } });
const { scene, camera } = S;
scene.background = new THREE.Color(0x6a7fa8);
const mats = [0x3d4f66, 0x5c3d52, 0x2c3a2e, 0x6a5038, 0x3a3f4a, 0x4b2a2a, 0x55504a, 0x262a33].map((top, i) => figureMaterial({ top, hair: [0x1c140e, 0x4a3a2a, 0x0f0b08, 0x6b5a45][i % 4], rimI: 1.0 }));
const V = [
  { pose: POSES.phoneUp, hair: 'hood', coat: 0.3, bag: 'backpack' },
  { pose: POSES.pocket, hair: 'long', fem: 0.9, coat: 0.65, height: 1.65 },
  { pose: POSES.filming, hair: 'cap', puffer: true },
  { pose: POSES.point, hair: 'bun', fem: 0.9, height: 1.62 },
  { pose: POSES.handsHead, hair: 'short', coat: 0.5 },
  { pose: POSES.shade, hair: 'pony', fem: 0.9, skirt: true, height: 1.6 },
  { pose: POSES.arms, hair: 'curly', build: 1.15, wide: true },
  { pose: POSES.rail, hair: 'long', fem: 0.9, bag: 'tote' },
];
V.forEach((o, i) => { const m = new THREE.Mesh(figureGeometry(o, 0.012), mats[i]); m.position.set((i % 4 - 1.5) * 1.05, i < 4 ? 2.3 : 0, 0); scene.add(m); });
scene.add(new THREE.HemisphereLight(0x8899bb, 0x111111, 0.6));
const d = new THREE.DirectionalLight(0xffffff, 0.8); d.position.set(2, 3, 4); scene.add(d);
S.run(() => { camera.position.set(0, 2.1, 9); camera.lookAt(0, 2.1, 0); camera.fov = 32; camera.updateProjectionMatrix(); });
