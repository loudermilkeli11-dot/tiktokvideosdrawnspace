// s02_today — "TODAY" (film 3–8 s, story 0–5 s). Calm dusk bay from the promenade, straight down the pier.
// 600 -> 400 mm zoom, constant in log focal length; the Moon sits on the open-sea horizon through the bay mouth and GROWS
// (145 -> 190 px) from the story clock alone. The hook's hero stands small at the pier's end, head against the lower limb.
// The lighthouse beam (right headland, off frame) sweeps across the disc at tt ~0.5; boats ride at anchor; gulls cross.
import { createStudio, THREE } from '@engine/engine.js';
import { createCrowd, createHero, createBirds } from '@engine/crowd.js';
import { applyCam, shake } from '@engine/camera.js';
import { clamp } from '@engine/util.js';
import { bayWorld, D2R, SHOT } from './kit.js';
import { angRadius } from './story.js';
const S = createStudio({ samples: 4, shadows: false, post: { exposure: 1.12, bloom: 0.18, bloomThreshold: 1.5, bloomRadius: 0.6, vignette: 0.45, grain: 0.03, sat: 1.08, contrast: 1.05 } });
const { camera } = S;
const PIER_YAW = 3 * D2R, PIER_LEN = 340;       // same pier, seen end-on: at 600 mm only its far end and lamps read
const W = bayWorld(S, { pierYaw: PIER_YAW, bay: { pierLen: PIER_LEN, beamI: 1.5 }, sky: { beltI: 0.32 } });
const { bay } = W; const P = bay.pier, DECK = P.deckY;
const fwd = new THREE.Vector3(-Math.sin(PIER_YAW), 0, -Math.cos(PIER_YAW)), right = new THREE.Vector3(Math.cos(PIER_YAW), 0, -Math.sin(PIER_YAW));
const UP = new THREE.Vector3(0, 1, 0);
// camera: on the promenade 20 m left of the pier's axis, ~28 m behind its root: the pier runs in from the right as a leading line
const CAM = P.toWorld(-20.0, 0, 28); CAM.y = 5.9;
// hero at the end of the pier (350 m away: 79 px at 600 mm -> 53 px at 400 mm), dead under the Moon, against its glitter path
const hero = createHero(S, { pose: 'phoneUp', rimI: 1.5 });
const heroW = P.toWorld(-0.2, DECK, -(PIER_LEN - 18)); hero.root.position.copy(heroW); hero.root.rotation.y = PIER_YAW;
const HERO_DIR = heroW.clone().sub(CAM).setY(0).normalize(), AIM = HERO_DIR.clone().applyAxisAngle(UP, 0.1 * D2R), SIDE = new THREE.Vector3().crossVectors(AIM, UP).normalize();
// a few evening strollers at the pier's end rails (further than the hero, so they stay <= 80 px)
const people = [[2.0, 9, 'rail', 1], [1.3, 13, 'stand', 0], [-2.0, 15, 'rail', -1]].map(([lx, back, pose, side]) => {
  const w = P.toWorld(lx, DECK, -(PIER_LEN - 18) - back); return { x: w.x, z: w.z, y: DECK, yaw: PIER_YAW + side * -Math.PI / 2 + (side ? 0 : 0.4), pose }; });
const crowd = createCrowd(S, people, { poses: ['rail', 'stand'], rimI: 1.1, seed: 5 });
// boats riding at anchor out in the bay, left of the pier (x/z set once; the bay bobs them on the waves every frame)
const BOATS = [[-0.75, 1500, 0.6], [-0.15, 1900, 2.1], [-1.15, 2100, 1.2], [0.6, 2300, -0.4], [-0.5, 2600, 2.8], [1.1, 2450, 0.9], [-1.4, 1750, 1.9]];
BOATS.forEach(([deg, d, yaw], i) => { const b = bay.boats[i]; const p = CAM.clone().addScaledVector(AIM.clone().applyAxisAngle(UP, -deg * D2R), d); b.x = p.x; b.z = p.z; b.yaw = yaw; b.L = 7 + (i % 3) * 2.5; });
for (let i = BOATS.length; i < bay.boats.length; i++) bay.boats[i].z = 400;   // the rest wait under the land behind the camera
bay.U.lampI.value = 0.6; bay.beam.scale.set(13, 1400, 13);
// lighthouse shaft, drawn volumetrically: the stock cone bands at 600 mm, so hide it and shade the beam per pixel from the
// closest approach of each view ray to the beam axis (soft Gaussian core, widening cone, fades along its length). The sphere
// encloses the camera (and its mirror twin), so the ocean's planar reflection gets the shaft too.
bay.beam.visible = false;
const BEAM = { L: { value: bay.beam.position.clone() }, B: { value: new THREE.Vector3(1, 0, 0) }, I: { value: 0.32 }, len: { value: 1400 } };
const beamVol = new THREE.Mesh(new THREE.SphereGeometry(3000, 24, 12), new THREE.ShaderMaterial({ uniforms: BEAM, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
  fragmentShader: `uniform vec3 L, B; uniform float I, len; varying vec3 vW;
    void main(){ vec3 r = normalize(vW - cameraPosition); vec3 w0 = cameraPosition - L; float b = dot(r, B), d = dot(r, w0), e = dot(B, w0);
      float den = max(1. - b*b, 1e-5); float u = clamp((e - b*d)/den, 0., len); vec3 p = L + u*B; float s = max(dot(p - cameraPosition, r), 0.);
      float dist = length(cameraPosition + s*r - p); float wd = 0.5 + 0.0075*u;
      float g = exp(-dist*dist/(wd*wd)) * pow(1. - u/len, 2.2) * smoothstep(0., 25., u);
      gl_FragColor = vec4(vec3(1.0, 0.92, 0.76) * I * g, 1.); }` }));
beamVol.frustumCulled = false; beamVol.renderOrder = 60; S.scene.add(beamVol);
const birds = createBirds(S, 12, { flap: 7, seed: 4 });
// story clock
const STORY0 = SHOT.s02_today - 3;               // 0: today
const mmAt = (tt) => 600 * Math.pow(400 / 600, clamp(tt, 0, 5) / 5);
S.run((t) => {
  const tt = Math.max(t - 4, 0), storyT = STORY0 + tt, u = clamp(tt / 5);
  // lens: 600 -> 400 mm, constant rate in log focal; the tilt keeps the sea horizon at design y 520 -> 555 (linear)
  const mm = mmAt(tt), yH = 520 + 35 * u, pitch = Math.atan(((yH - 480) / 480) * (18 / mm));
  const dir = AIM.clone().applyAxisAngle(SIDE, pitch);
  applyCam(camera, { pos: CAM, look: CAM.clone().add(dir), mm, roll: 0 }, shake(t, 0.012, 0.35, 5));
  // Moon: over the bay mouth, right above the hero; its lower limb just in the sea haze (centre 0.93 radius above level)
  const ang = angRadius(storyT);
  const md = HERO_DIR.clone().applyAxisAngle(UP, 0.3 * D2R); md.y = Math.tan(ang * 0.93); md.normalize();
  W.update(S, t, { storyT, moonDir: md, level: 0.0, amp: 0.55, shadowCenter: heroW });
  // lighthouse beam: one slow sweep through the line of sight (crosses the disc at tt ~0.5), then on round
  // (tilted 2.6 deg down: as it swings through west it rises from the sea, crosses the disc and drops again)
  const th = Math.PI + 1.9 * (tt - 0.5), tau = 0.045; BEAM.B.value.set(Math.cos(th) * Math.cos(tau), -Math.sin(tau), -Math.sin(th) * Math.cos(tau)); beamVol.position.copy(CAM);
  for (const m of [crowd.material, hero.material]) m.U.rimDir.value.copy(md);
  crowd.update(t, { agitation: 0.12 });
  hero.root.rotation.set(0, PIER_YAW + Math.sin(t * 0.7) * 0.03, Math.sin(t * 1.1) * 0.01);
  // gulls: a loose flock flying away from us out over the bay (wings read as spread 'm' shapes), passing the disc
  birds.update(t, (x) => CAM.clone().addScaledVector(AIM, 260 + (x - 4) * 11).addScaledVector(SIDE, -3 - (x - 4) * 0.9).setY(CAM.y + 1.7 + (x - 4) * 0.12), 4.5, 0.75);
});
