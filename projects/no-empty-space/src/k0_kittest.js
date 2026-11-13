// no-empty-space k0: the lead's kit check (not a film shot). Frame 1 at FRAME1_CAM with the selfie tourist and a test phone
// squeeze at film 1.6 (shot time = film here). ?v=1 quay street, 2 the mole -> ferry, 3 reverse (town + mountain), 4 85 mm tower.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam } from '@engine/camera.js';
import { harbourWorld, FRAME1_CAM, WOMAN, POST_DAY, makePerson, makePhone, makeHero, makeCar, squeeze, shardsFrom, bits, inrush,
  lookDir, qn, handPoint, CAR, HERO_QUAY, QUAY_Y, FERRY, MOLE, TOWER, groundH } from './kit.js';
import { SQZ, depthAt } from './story.js';

const V = qn('v', 0);
const S = createStudio({ samples: 2, shadows: true, near: 0.05, far: 2e4, post: POST_DAY });
const W = harbourWorld(S);
// the selfie tourist + her phone (the s01 gag subject)
const woman = makePerson(S, { hair: 'long', fem: 0.9, top: 0xf08070, bot: 0xf4f1ea, hairCol: 0x6e5238, height: 1.66, pose: 'selfie', bag: 'tote', bagCol: 0xe8d29a, hat: { k: 1, col: 0xf2e3b8, band: 0xe86aa0 } });
woman.setPose('lookHand'); woman.setPose('selfie');
woman.root.position.copy(WOMAN.pos); woman.root.rotation.y = WOMAN.yaw;
const hand = handPoint(woman);
const phone = makePhone(S, hand.clone(), 0x2fa8a8); phone.rotation.y = WOMAN.yaw + 0.6;
const PH = squeeze(S, { T: SQZ.phone.T, dur: SQZ.phone.dur, c0: hand.clone(), shards: shardsFrom([phone], 900, { size: [0.006, 0.016] }), sources: [phone],
  drop: (f) => depthAt('phone', f), spin: 7, bead: { r: 0.012, minPx: 5, I: 10 }, streak: { len: 0.4, w: 0.006 }, light: { I: 3, dist: 3 } });
const napkins = bits(S, inrush(hand, SQZ.phone.T, 160, { r: [0.4, 2.2], y: [0.75, 1.2], ground: () => 9.0, speed: [5, 11], cols: [0xf4f1ea, 0xf2e3b8, 0xe86aa0, 0xffffff], size: [0.04, 0.09], drag: 2.5 }));
// the hero + his car on the quay street (checks for ?v=1)
const hero = makeHero(S, { pose: 'clickFob' }); hero.root.position.copy(HERO_QUAY); hero.root.rotation.y = Math.PI * 0.9;
const car = makeCar(S); car.position.copy(CAR.pos); car.rotation.y = CAR.yaw;
const CAMS = [FRAME1_CAM,
  { pos: new THREE.Vector3(-18, QUAY_Y + 2.2, -18), look: new THREE.Vector3(-8, QUAY_Y + 0.8, -30), mm: 28 },
  { pos: new THREE.Vector3(-30, MOLE.y + 1.7, MOLE.z + 2), look: new THREE.Vector3(FERRY.x, 6, FERRY.z), mm: 35 },
  { pos: new THREE.Vector3(-20, MOLE.y + 1.6, MOLE.z - 2), look: lookDir(new THREE.Vector3(-20, MOLE.y + 1.6, MOLE.z - 2), 178, 8), mm: 24 },
  { pos: FRAME1_CAM.pos, look: new THREE.Vector3(TOWER.x, TOWER.base + 180, TOWER.z), mm: 85 }];
S.run((t) => {
  const film = Math.max(t - 4, 0);
  applyCam(S.camera, CAMS[V]);
  W.update(film, { focus: V === 0 ? new THREE.Vector3(0, 9, -12) : undefined, box: V === 0 ? 30 : undefined });
  PH.update(film, S.camera); napkins.update(film);
  woman.setPose(film > SQZ.phone.T + 0.5 ? 'lookHand' : 'selfie');
});
