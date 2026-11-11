// Flames: camera-facing additive billboards with rising noise tongues (no smoke). pts: [{p: Vector3 (base), s: height m, seed}]
//   const F = createFire(S, pts, { I: 6 }); F.update(t); F.U.amt.value = 0..1 (grow in), F.U.I.value = brightness
import * as THREE from 'three';
import { NOISE } from './glsl.js';
export function createFire(S, pts, o = {}) {
  const base = new THREE.PlaneGeometry(1, 1); base.translate(0, 0.5, 0);
  const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
  const N = pts.length, aP = new Float32Array(N * 3), aS = new Float32Array(N), aK = new Float32Array(N);
  pts.forEach((q, i) => { q.p.toArray(aP, i * 3); aS[i] = q.s; aK[i] = q.seed ?? (i * 0.6180339) % 1; });
  g.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 3)); g.setAttribute('aS', new THREE.InstancedBufferAttribute(aS, 1)); g.setAttribute('aK', new THREE.InstancedBufferAttribute(aK, 1));
  g.instanceCount = N;
  const U = { time: { value: 0 }, I: { value: o.I ?? 6 }, amt: { value: 1 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aP; attribute float aS; attribute float aK; uniform float amt, time; varying vec2 vUv; varying float vK;
      void main(){ vUv = uv; vK = aK; vec4 c = viewMatrix * vec4(aP, 1.);
        float s = aS * amt * (0.8 + 0.25*fract(aK*7.13) + 0.08*sin(time*9. + aK*40.));
        c.xy += vec2(position.x * 0.62, position.y) * s; gl_Position = projectionMatrix * c; }`,
    fragmentShader: `${NOISE}
      uniform float time, I; varying vec2 vUv; varying float vK;
      void main(){ vec2 u = vec2(vUv.x - 0.5, vUv.y);
        float n = fbm2(vec2(u.x*3.2 + vK*17., u.y*2.4 - time*2.8 - vK*5.));
        float n2 = fbm2(vec2(u.x*7. + vK*3., u.y*5. - time*4.1));
        float w = (1. - u.y)*0.42 + 0.03;
        float d = abs(u.x + (n - 0.5)*0.34*u.y) / w;
        float m = smoothstep(1., 0.1, d) * smoothstep(0., 0.08, u.y) * smoothstep(1., 0.2, u.y + (n - 0.5)*0.55 + (n2 - 0.5)*0.25);
        vec3 c = mix(vec3(0.9,0.12,0.01), vec3(1.0,0.55,0.12), smoothstep(0.35, 1.0, 1. - d) * (1. - u.y*0.8));
        gl_FragColor = vec4(c * m * I, 1.); }` });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 20; S.scene.add(mesh);
  return { mesh, U, update(t) { U.time.value = t; } };
}
