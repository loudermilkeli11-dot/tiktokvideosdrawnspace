// groupA_dust: Builder A's dust for the plaza and the street (a variant of the kit's createDust; the kit is not edited).
// Same look family: tan/ochre grit, crisp edges, lit by the golden sun, streaks that ride the flow east at V·e. Not smoke.
// Differences from the kit: a ragged top edge with tongues (the kit's edge is one smooth 90 m wave and read as a hill),
// stronger streak holes, and a FLOOR mode: a ground-hugging sheet of streaks over the paving (seen from the balcony the
// vertical sheets are thin lines; the floor sheet is what covers the bright paving).
// layers: [{ x0, x1, z, h, op, floor?: { z0, z1, y } }]; update(e, amt 0..1).
import { THREE } from '@engine/engine.js';
import { NOISE } from '@engine/glsl.js';
import { COL, SUN_COL, HAZE } from './kit.js';
import { V } from './story.js';

export function createDustA(S, layers, o = {}) {
  const U = { e: { value: 0 }, V: { value: V }, amt: { value: 0 }, col: { value: new THREE.Color(o.col ?? COL.dust) }, sunCol: { value: new THREE.Color(SUN_COL) },
    fogCol: { value: new THREE.Color(HAZE.col) }, fogN: { value: HAZE.near }, fogF: { value: HAZE.far } };
  const VS = `varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
  const FS_WALL = `${NOISE} uniform float e, V, amt, fogN, fogF, H, OP, SEED; uniform vec3 col, sunCol, fogCol; varying vec3 vW; varying vec2 vUv;
    void main(){ float x = vW.x - V*e;
      float big = clamp(0.5 + 0.7*fbm2(vec2(x*0.016, SEED)), 0., 1.);
      float tong = pow(clamp(0.5 + 0.8*fbm2(vec2(x*0.075, SEED + 4.1)), 0., 1.), 2.);
      float edge = H*amt*(0.40 + 0.45*big + 0.18*tong);
      float a = 1. - smoothstep(edge - 1.2, edge + 0.05, vW.y);
      float st = fbm2(vec2(x*0.03, vW.y*0.32 + SEED*3.));
      float dens = clamp(0.30 + 0.95*st, 0., 1.)*(0.7 + 0.3*smoothstep(0., edge, edge - vW.y));
      float side = smoothstep(0., 0.08, vUv.x)*(1. - smoothstep(0.92, 1., vUv.x));
      a *= min(1., dens*1.6)*side*OP*min(1., amt*1.6);
      vec3 c = col*(0.58 + 0.6*clamp(vW.y/max(edge, 0.5), 0., 1.))*mix(vec3(1.), sunCol, 0.35);
      float d = length(cameraPosition - vW); c = mix(c, fogCol, clamp((d - fogN)/(fogF - fogN), 0., 1.));
      gl_FragColor = vec4(c, clamp(a, 0., 0.9)); }`;
  const FS_FLOOR = `${NOISE} uniform float e, V, amt, fogN, fogF, OP, SEED, Z0, Z1; uniform vec3 col, sunCol, fogCol; varying vec3 vW; varying vec2 vUv;
    void main(){ float x = vW.x - V*e;
      float st = fbm2(vec2(x*0.022, vW.z*0.16 + SEED));                             // long streaks along the flow
      float fine = fbm2(vec2(x*0.09, vW.z*0.6 + SEED*2.));
      float cover = smoothstep(0.15, 0.85, amt*1.25 + 0.35*fbm2(vec2(x*0.008, vW.z*0.03 + SEED*5.)));
      float a = clamp(0.25 + 0.9*st + 0.35*fine, 0., 1.)*cover*OP;
      a *= smoothstep(Z0, Z0 + 6., vW.z)*(1. - smoothstep(Z1 - 6., Z1, vW.z));
      vec3 c = col*(0.85 + 0.25*fine)*mix(vec3(1.), sunCol, 0.45);
      float d = length(cameraPosition - vW); c = mix(c, fogCol, clamp((d - fogN)/(fogF - fogN), 0., 1.));
      gl_FragColor = vec4(c, clamp(a, 0., 0.85)); }`;
  const meshes = layers.map((L, i) => {
    let m;
    if (L.floor) { const f = L.floor;
      m = new THREE.Mesh(new THREE.PlaneGeometry(L.x1 - L.x0, f.z1 - f.z0).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, vertexShader: VS, fragmentShader: FS_FLOOR,
        uniforms: { ...U, OP: { value: L.op ?? 0.7 }, SEED: { value: i * 3.17 + 1 }, Z0: { value: f.z0 }, Z1: { value: f.z1 } } }));
      m.position.set((L.x0 + L.x1) / 2, f.y ?? 0.2, (f.z0 + f.z1) / 2);
    } else {
      m = new THREE.Mesh(new THREE.PlaneGeometry(L.x1 - L.x0, L.h * 1.2), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, vertexShader: VS, fragmentShader: FS_WALL,
        uniforms: { ...U, H: { value: L.h }, OP: { value: L.op ?? 0.8 }, SEED: { value: i * 3.17 + 1 } } }));
      m.position.set((L.x0 + L.x1) / 2, L.h * 0.6, L.z);
    }
    m.renderOrder = 20 + i; m.frustumCulled = false; S.scene.add(m); return m; });
  return { meshes, U, update(e, amt) { U.e.value = e; U.amt.value = amt ?? 1 - Math.exp(-Math.max(0, e) / 0.15); } };
}
