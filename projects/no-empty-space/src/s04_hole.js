// s04_hole (film 18.0-23.5, 165 fr). 24 mm, low and close on the smoking coin-sized hole in the cobbles (the match cut: the hole
// sits at design (270, 540) on frame 0, as on s03's last frame), a slow orbit. The hero walks in and kneels with his phone light;
// deep below, a faint glow sinks away (the 1.5 t car-speck: depthAt('car') 99 -> 490 m, dimmer and smaller as it goes). A dog
// sniffs the hole, a fisherman peers over his shoulder, a ring of townsfolk gathers, a Vespa pulls up, someone films.
// 23.2-23.5: a whip-pan right (~70°) into s05 (samples 12 in the whip).
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake, whip, lensFov } from '@engine/camera.js';
import { ease, clamp, lerp, rng } from '@engine/util.js';
import { POST_DAY, SAMPLES, D2R, makePerson, makeDog, makeVespa, makePhone, townsfolk, handPoint, QUAY_Y, styliseMat } from './kit.js';
import { SHOT, depthAt } from './story.js';
import { quaySet, HOLE, S04_F, S04_R, KNEEL } from './groupA_quay.js';
import { posePlayer, noPhone, faceYaw } from './groupA_lib.js';

const T0 = SHOT.s04_hole.t0, DUR = SHOT.s04_hole.dur;               // 18.0, 5.5
const W0 = T0 + DUR - 0.32;                                          // the whip-pan starts (23.18)
const S = createStudio({ samples: (t) => (T0 + t - 4 > W0 - 0.05 ? 12 : SAMPLES.s04_hole), shadows: true, near: 0.03, far: 2e4, post: { ...POST_DAY } });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), Y = QUAY_Y + 0.02;
const at = (r, f, y = Y) => HOLE.clone().addScaledVector(S04_R, r).addScaledVector(S04_F, f).setY(y);   // hole-relative (right, forward)
const Q = quaySet(S, { keep: [[HOLE.x, HOLE.z, 9]] });
// ------------------------------------------------ the phone light (the hero's phone over the hole) + the sinking glow
const phone = makePhone(S, V3(0, 0, 0), 0x24345a);
const flash = new THREE.PointLight(0xdfe8ff, 0, 2.4, 2); S.scene.add(flash);
const glowTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,220,150,0.85)'); gr.addColorStop(0.55, 'rgba(255,160,70,0.2)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
const sprite = (col, I) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(col).multiplyScalar(I), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.renderOrder = 60; S.scene.add(s); return s; };
const led = sprite(0xe8f0ff, 4);
const deep = sprite(0xffb060, 3); deep.position.copy(HOLE).add(V3(0, 0.004, 0));
// ------------------------------------------------ the dog (sniffs the hole), the fisherman (peers over his shoulder), the Vespa
const dog = makeDog(S, 0xd8a24a);
const DOG0 = at(4.5, 2.6), DOG1 = at(0.38, 0.62);
const fisher = makePerson(S, { hair: 'cap', hairCol: 0x24345a, top: 0x24345a, bot: 0xf2c53a, height: 1.78, build: 1.2, fem: 0, skin: 0x9a6a48, pose: 'stand', hat: false }); noPhone(fisher);
const FISH0 = at(-3.6, 3.6), FISH1 = at(-0.95, 0.75);
const fP = posePlayer(fisher, [[-99, 'stand'], [20.0, 'leanLook', 0.45], [22.2, 'pointDown', 0.35]]);
const vespa = makeVespa(S, 0xe86aa0); const rider = makePerson(S, { hair: 'pony', hairCol: 0x2a1d14, fem: 0.9, top: 0xf4f1ea, bot: 0x4d6f9a, height: 1.66, build: 0.9, skin: 0xc49272, pose: 'sit', hat: false }); noPhone(rider);
const VSP0 = at(8.5, 4.0), VSP1 = at(1.9, 3.1);
// ------------------------------------------------ the ring of townsfolk gathering (closed form: each walks from far to its ring spot)
const R = rng(404), ringP = [];
for (let i = 0; i < 12; i++) { const a = -1.15 + (i / 11) * 2.3 + (R() - 0.5) * 0.12, rr = 2.4 + R() * 1.6, fx = Math.cos(a) * rr, fr = Math.sin(a) * rr;   // a on the far side of the hole
  const end = at(fr, fx + 0.6), dir = end.clone().sub(HOLE).setY(0).normalize(), start = end.clone().addScaledVector(dir, 6 + R() * 5);
  ringP.push({ x: start.x, z: start.z, y: Y, yaw: 0, pose: ['point', 'arms', 'shade', 'filming', 'pocket', 'point'][i % 6], start, end, t0: 18.2 + R() * 1.8, sp: 1.3 + R() * 0.6 }); }
const ring = townsfolk(S, ringP, { poses: ['point', 'arms', 'shade', 'filming', 'pocket'], seed: 77, hats: 0.6 });
const ringList = ring.crowd.meshes.flatMap((m) => m.userData.list);
// ------------------------------------------------ camera: low, close, slow orbit; the hole at design (270, 540) on frame 0
const vf = lensFov(24) * D2R, dy = Math.atan(((540 - 480) / 480) * Math.tan(vf / 2));
const camAt = (film) => { const u = ease.inOutSine(clamp((film - T0) / (W0 - T0))), orb = lerp(0, 22, u) * D2R, dist = lerp(2.05, 1.8, u), h = lerp(0.85, 0.78, u);
  const f = S04_F.clone().applyAxisAngle(V3(0, 1, 0), orb), pos = HOLE.clone().addScaledVector(f, -dist).setY(QUAY_Y + h);
  const toHole = HOLE.clone().sub(pos), pitch = Math.atan2(toHole.y, Math.hypot(toHole.x, toHole.z)) + dy;
  const yaw = whip(film - T0, W0 - T0 + 0.16, 0.32, 70) * D2R;                                  // 0 -> 70° over the last 0.32 s
  const d = V3(f.x, 0, f.z).normalize().applyAxisAngle(V3(0, 1, 0), -yaw); d.y = Math.tan(pitch + 0.25 * (yaw / (70 * D2R)) * 0.6); return { pos, look: pos.clone().add(d), mm: 24, roll: 0 }; };

S.run((t) => {
  const tt = t - 4, film = T0 + tt;
  applyCam(S.camera, camAt(film), shake(t, 0.02, 0.6, 9));
  Q.update(film, S.camera, { focus: HOLE.clone(), box: 14 });
  // the lemon-lady from s03 (she stood by the car) steps round to the far side of the ring, out of the lens
  { const f = Q.folks[1], u = ease.inOutSine(clamp((film - 18.0) / 1.6)), p0 = f.d.p, p1 = at(1.25, 2.1); f.h.root.position.lerpVectors(p0, p1, u); f.h.root.rotation.y = faceYaw(HOLE.x - f.h.root.position.x, HOLE.z - f.h.root.position.z); }
  // the phone light: in the hero's right hand once he kneels; a cold LED glow and a little light on the cobbles
  const kneel = clamp((film - 19.55) / 0.3);
  const hp = handPoint(Q.hero); phone.position.copy(hp); phone.rotation.set(-Math.PI / 2 + 0.3, Q.hero.root.rotation.y, 0); phone.visible = film > 19.3;
  led.position.copy(hp).add(V3(0, -0.02, 0)); led.scale.setScalar(0.09 * kneel); led.visible = kneel > 0; flash.position.copy(hp).add(V3(0, -0.05, 0)); flash.intensity = 1.6 * kneel;
  // the car-speck sinking: a faint warm glow deep in the hole, fainter and smaller as it falls (99 -> 490 m)
  const dpt = depthAt('car', film), k = Math.pow(99 / Math.max(99, dpt), 1.4);
  deep.scale.setScalar(0.17 * Math.sqrt(k)); deep.material.color.setRGB(1, 0.69, 0.38).multiplyScalar(4.0 * k * (0.85 + 0.15 * Math.sin(film * 9)));
  // the dog trots in (19.0-20.4) and sniffs (head bobs, tail wags)
  { const u = ease.inOutSine(clamp((film - 19.0) / 1.4)); dog.position.lerpVectors(DOG0, DOG1, u); dog.position.y = Y + 0.02 * Math.abs(Math.sin(film * 14)) * (u < 1 ? 1 : 0);
    dog.rotation.set(u >= 1 ? 0.18 + 0.06 * Math.sin(film * 11) : 0, faceYaw(HOLE.x - dog.position.x, HOLE.z - dog.position.z), 0); dog.userData.tail.rotation.y = 0.6 * Math.sin(film * 16); }
  // the fisherman walks up behind the hero and leans over his shoulder
  { const u = ease.inOutSine(clamp((film - 18.6) / 1.5)); fisher.root.position.lerpVectors(FISH0, FISH1, u); fisher.root.rotation.y = faceYaw(HOLE.x - fisher.root.position.x, HOLE.z - fisher.root.position.z); fP.apply(film); }
  // the Vespa rolls in and stops (decelerating), the rider looks
  { const u = clamp((film - 18.4) / 2.2), e = 1 - (1 - u) * (1 - u); vespa.position.lerpVectors(VSP0, VSP1, e); const dir = VSP1.clone().sub(VSP0); vespa.rotation.y = faceYaw(dir.x, dir.z);
    rider.root.position.copy(vespa.position).add(V3(0, 0.32, 0)).addScaledVector(dir.normalize(), 0.18); rider.root.rotation.y = vespa.rotation.y + (u >= 1 ? -0.5 : 0); }
  // the ring gathers
  ringList.forEach((p) => { const L = p.start.distanceTo(p.end), u = clamp((film - p.t0) * p.sp / L), e = u * (2 - u);   // (crowd copies each record with its fields)
    p.x = lerp(p.start.x, p.end.x, e); p.z = lerp(p.start.z, p.end.z, e); p.yaw = faceYaw(HOLE.x - p.x, HOLE.z - p.z); });
  ring.update(film + 4, { agitation: 0.45 });
});
