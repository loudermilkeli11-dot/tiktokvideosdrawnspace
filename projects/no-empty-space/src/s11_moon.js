// s11_moon (film 61.0-66.0, 150 fr). THE TWIST: the Moon doesn't notice. 135 mm, low behind the Moon's limb (the camera rides
// 30,000 km beyond it, 10° above its orbital plane): the crisp cratered Moon (moon.js, 8k, opaque) glides through the lower
// frame along its usual path, a faint thin line of its orbit runs through it, and far beyond (384,400 km) the squeezed Earth is
// a single bright star, still holding it (same mass, same pull). The camera trucks along the orbit so the Moon glides right
// (continuing s10's pan left), the star stays put; the last 0.5 s fades to black (handshake to s12's end card).
// Units km, Earth (the speck) at the origin. Page t = shot time + 4.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { createSpace } from '@engine/space.js';
import { createMoon, sunForPhase } from '@engine/moon.js';
import { lerp, ease, clamp, sstep } from '@engine/util.js';
import { POST_ORBIT, SAMPLES, aimFor, D2R, qn } from './kit.js';
import { SHOT, MOON_DAYS } from './story.js';

const SH = SHOT.s11_moon, R_ORBIT = 384400, R_MOON = 1737.4;
const S = createStudio({ samples: SAMPLES.s11_moon, near: 50, far: 3e6, post: { ...POST_ORBIT } });
const SP = createSpace(S, { ring: false, stars: 0.36, sunGlare: 0, seg: [16, 8] });
SP.earth.visible = false; SP.atm.visible = false; SP.sun.visible = false;
const moon = createMoon(S, { airlight: false, earthshine: 0, sunI: 3.0, normalScale: 2.4, reliefScale: 2.2 }); S.scene.add(moon);
moon.U.haze.value = 0; moon.U.hazeLift.value = 0; moon.U.crack.value = 0; moon.U.crackW.value = 0; moon.U.crackGlow.value = 0;   // no breakup fracture lines
// the orbit: one thin faint line (depth-tested: the Moon hides the part behind it)
const pts = []; for (let i = 0; i <= 4096; i++) { const a = (i / 4096) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * R_ORBIT, 0, Math.sin(a) * R_ORBIT)); }
const orbitM = new THREE.LineBasicMaterial({ color: new THREE.Color(0xa8c4e8).multiplyScalar(0.32), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), orbitM); orbit.frustumCulled = false;
// FIX PASS (review item 10): REMOVED. At 135 mm the orbit can only show as near-straight lines across the frame, which read as
// rendering glitches; the Moon's glide past the star carries "still orbiting" on its own.
orbit.visible = false;
// the Earth-speck: a single bright white-gold star (minimum size in design px)
const SU = { I: { value: 5 } };
const star = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: SU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv*2. - 1.; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }`,
  fragmentShader: `uniform float I; varying vec2 vUv; void main(){ float d = length(vUv); if (d > 1.) discard;
    float core = smoothstep(0.22, 0.0, d), halo = pow(1. - d, 4.)*0.45, spike = (exp(-abs(vUv.x)*40.) + exp(-abs(vUv.y)*40.))*pow(1. - d, 2.)*0.25;
    gl_FragColor = vec4((vec3(1.0, 0.86, 0.6)*halo + vec3(1., 0.97, 0.92)*core + vec3(1.0, 0.9, 0.75)*spike)*I, 1.); }` }));
star.frustumCulled = false; star.renderOrder = 30; S.scene.add(star);
// the Moon's angle on its orbit (real rate: one turn in 27.3 days; it barely moves in 5 s, as it should)
const TH0 = 0, W_ORB = (2 * Math.PI) / (MOON_DAYS * 86400);
const D = qn('mdist', 30000), BETA = qn('mbeta', 10.5) * D2R, Z0 = qn('mz0', -1150), Z1 = qn('mz1', 250);
S.run((t) => {
  const tt = Math.max(t - 4, 0), film = SH.t0 + tt, u = ease.inOutSine(clamp(tt / SH.dur));
  const th = TH0 + W_ORB * (film - SH.t0), M = new THREE.Vector3(Math.cos(th) * R_ORBIT, 0, Math.sin(th) * R_ORBIT);
  const out = M.clone().normalize(), tang = new THREE.Vector3(-Math.sin(th), 0, Math.cos(th));
  const pos = M.clone().addScaledVector(out, D * Math.cos(BETA)).add(new THREE.Vector3(0, D * Math.sin(BETA), 0)).addScaledVector(tang, lerp(Z0, Z1, u));
  const sx = lerp(268, 300, ease.outCubic(clamp(tt / 1.4))), sy = 236;           // the star settles as s10's pan ends
  applyCam(S.camera, { pos, look: aimFor(pos, sx, sy, 135), mm: 135, roll: 0 }, shake(t, 0.004, 0.5, 6));
  SP.update(S, t);
  moon.position.copy(M); moon.scale.setScalar(R_MOON); moon.faceNearSide(M.clone().negate());   // the near side faces the Earth: we see the far side
  const toCam = pos.clone().sub(M).normalize();
  moon.U.sunDir.value.copy(sunForPhase(toCam, qn('ph', 72), new THREE.Vector3(0, 1, 0), qn('tilt', -35)));
  const pxW = (2 * pos.length() * Math.tan((S.camera.fov * D2R) / 2)) / 960;
  star.position.set(0, 0, 0); star.quaternion.copy(S.camera.quaternion); star.scale.setScalar(10 * pxW);
  SU.I.value = 4.5 + 0.4 * Math.sin(film * 2.1);
  S.post.p.fade = sstep(SH.t0 + SH.dur - 0.5, SH.t0 + SH.dur, film);
});
