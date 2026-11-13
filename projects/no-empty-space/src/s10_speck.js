// s10_speck (film 56.0-61.0, 150 fr). N4: what is left of the Earth: a ball 367 m wide (story R_MINI), hot and glowing, against a
// sharp star field; beside it, the thin ghost outline of the lost 381 m tower (s06), standing on the same baseline: the same
// height, so the scale reads at a glance. 35 mm, a slow eased dolly in from where s09's point sat (design 300, 300); the last
// second pans left (handshake to s11). Metres; the ball's centre is the origin. Page t = shot time + 4.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { createSpace } from '@engine/space.js';
import { NOISE } from '@engine/glsl.js';
import { lerp, ease, clamp, sstep } from '@engine/util.js';
import { POST_ORBIT, SAMPLES, aimFor, D2R, towerGroup, qn } from './kit.js';
import { SHOT, R_MINI, RUNG } from './story.js';

const SH = SHOT.s10_speck;
const S = createStudio({ samples: SAMPLES.s10_speck, near: 1, far: 3e6, post: { ...POST_ORBIT } });
const SP = createSpace(S, { ring: false, stars: 0.34, sunGlare: 0, seg: [16, 8] });
SP.earth.visible = false; SP.atm.visible = false; SP.sun.visible = false;
// ---- the ball: a flat-shaded low-poly sphere, every facet flickering hot (closed form in film time), limb darker orange
const U = { film: { value: 0 } };
const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(R_MINI, 3), new THREE.ShaderMaterial({ uniforms: U,
  vertexShader: `varying vec3 vW; varying vec3 vO; void main(){ vO = position; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `${NOISE} uniform float film; varying vec3 vW; varying vec3 vO;
    void main(){ vec3 n = normalize(cross(dFdx(vW), dFdy(vW))); float mu = abs(dot(n, normalize(cameraPosition - vW)));
      float fl = vn3(n*7.3 + vec3(film*2.3, film*1.1, -film*1.7)) * 0.6 + vn3(n*2.1 + film*0.6)*0.4;   // one value per facet (flat normal)
      float h = clamp(mu*0.8 + (fl - 0.5)*0.7, 0., 1.);
      vec3 hot = mix(vec3(0.95, 0.32, 0.07)*0.9, vec3(1.0, 0.62, 0.26)*1.25, smoothstep(0.1, 0.6, h));
      hot = mix(hot, vec3(1.0, 0.9, 0.7)*1.7, smoothstep(0.65, 1.0, h));
      gl_FragColor = vec4(hot, 1.); }` }));
S.scene.add(ball);
// heat shimmer / corona: a camera-facing glow whose rim wavers
const CU = { film: { value: 0 }, I: { value: 0.9 } };
const corona = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: CU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv*2. - 1.; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }`,
  fragmentShader: `${NOISE} uniform float film, I; varying vec2 vUv;
    void main(){ float d = length(vUv), a = atan(vUv.y, vUv.x); float w = vn2(vec2(a*3.2, film*1.8))*0.06 + vn2(vec2(a*9., -film*2.6))*0.03;
      float r0 = 0.47 + w; float g = (exp(-max(d - r0, 0.)*8.)*0.75 + exp(-d*3.2)*0.1)*smoothstep(1.0, 0.75, d);   // the ball hides the centre (depth)
      gl_FragColor = vec4(vec3(1.0, 0.72, 0.4)*g*I, 1.); }` }));
corona.renderOrder = 20; S.scene.add(corona);
// ---- the ghost of the 381 m tower: its own geometry as thin pale edges, on the ball's baseline, to its left
const tg = towerGroup(S); S.scene.remove(tg);
// FIX PASS (review item 9): brighter edges + a faint glass fill so the outline reads as the tower at a glance, closer to the ball
const ghost = new THREE.Group(); const lineM = new THREE.LineBasicMaterial({ color: new THREE.Color(0xcfe8ff).multiplyScalar(0.85), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
const fillM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fc4ff).multiplyScalar(0.16), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide });
tg.children.forEach((m) => { if (m.isMesh) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 25), lineM); e.position.copy(m.position); e.rotation.copy(m.rotation); ghost.add(e);
  if (!m.material.map) { const f = new THREE.Mesh(m.geometry, fillM); f.position.copy(m.position); f.rotation.copy(m.rotation); ghost.add(f); } } });
const GAP = 90;                                                             // m between the ball's edge and the tower's nearest face
ghost.position.set(-(R_MINI + GAP + 30), -R_MINI, 0); ghost.rotation.y = 0.5; S.scene.add(ghost);
const tGhost = 56.5;                                                        // film s: the outline draws in (no pop on the cut)
// ---- camera: dolly in (8.6 km -> 2.1 km), the ball eases from design (300, 300) to (330, 285); 60.1 -> 61.0 a pan left
const START = new THREE.Vector3(260, 150, 8600), END = new THREE.Vector3(-260, 40, 1350);
S.run((t) => {
  const tt = Math.max(t - 4, 0), film = SH.t0 + tt, u = ease.inOutSine(clamp(tt / SH.dur));
  const pos = START.clone().lerp(END, u), mm = 35;
  // PHASE 3: the end framing centres the PAIR (tower + ball), not the ball: the ball was cropped by the right edge / button rail
  const sx = lerp(300, qn('sx', 300), u), sy = lerp(300, qn('sy', 232), u);
  const look = aimFor(pos, sx, sy, mm);
  const pan = qn('pan', 3) * Math.pow(clamp((film - 59.8) / 1.2), 2);      // degrees, a gentle accelerating pan left (s11 continues it; no star streaks)
  const dir = look.sub(pos).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), pan * D2R);
  applyCam(S.camera, { pos, look: pos.clone().add(dir), mm, roll: 0 }, shake(t, 0.008, 0.8, 3));
  SP.update(S, t);
  U.film.value = film; CU.film.value = film;
  corona.position.set(0, 0, 0); corona.quaternion.copy(S.camera.quaternion); corona.scale.setScalar(R_MINI * 2.1);
  lineM.opacity = sstep(tGhost, tGhost + 0.9, film); fillM.opacity = lineM.opacity;
});
