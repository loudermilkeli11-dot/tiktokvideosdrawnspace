// gravity-flip: a planet-wide meteor storm from orbit (km units, Earth at the origin, as in space.js). Every streak is
// one returning object falling straight down (radially) with the shared law: its head altitude is uH + a0 (uH = the law's
// height, set per frame; a0 = where the object started). It glows from its ignition altitude zi down to the ground, its
// trail (up to Lmax km) stretching back up the path; brighter and hotter lower down. Orange only (no white strobes).
// Instanced camera-facing ribbons, additive, depth-tested (the planet hides the ones behind it).
//   const ST = createStorm(S, list, o);  ST.update(S, h)          list: [{ n: unit Vector3, a0, zi, Lmax, w, I }]
import * as THREE from 'three';
import { RE } from './space.js';

export function createStorm(S, list, o = {}) {
  const n = list.length, g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
  const aN = new Float32Array(n * 3), aP = new Float32Array(n * 4), aQ = new Float32Array(n * 2);
  list.forEach((m, i) => { aN.set([m.n.x, m.n.y, m.n.z], i * 3); aP.set([m.a0, m.zi, m.Lmax, m.w], i * 4); aQ.set([m.I ?? 1, m.heat ?? 0.5], i * 2); });
  g.setAttribute('aN', new THREE.InstancedBufferAttribute(aN, 3)); g.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 4)); g.setAttribute('aQ', new THREE.InstancedBufferAttribute(aQ, 2));
  g.instanceCount = n;
  const U = { uH: { value: 300 }, pxAng: { value: 0.0004 }, minPx: { value: o.minPx ?? 1.3 }, gain: { value: o.gain ?? 1 }, zFull: { value: o.zFull ?? 60 },
    tailCol: { value: new THREE.Color(o.tailCol ?? 0xff3a0c) }, headCol: { value: new THREE.Color(o.headCol ?? 0xffb46a) } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `attribute vec3 aN; attribute vec4 aP; attribute vec2 aQ; uniform float uH, pxAng, minPx, zFull;
      varying float vAlong, vHeadAt, vY, vI, vHeat;
      void main(){
        float alt = uH + aP.x;                                   // the head's altitude now (km)
        if (alt > aP.y || alt < -1.) { gl_Position = vec4(2., 2., 2., 1.); vI = 0.; return; }
        float top = min(aP.y, max(alt, 0.) + aP.z);
        vec3 head = aN * (${RE.toFixed(1)} + max(alt, 0.)), tail = aN * (${RE.toFixed(1)} + top);
        vec3 dir = -aN; vec3 mid = mix(tail, head, 0.5); float dist = length(cameraPosition - mid);
        float w = max(aP.w, dist * pxAng * minPx); float Lseg = max(length(head - tail), 1e-3);
        vec3 P = mix(tail, head, position.x) + dir * position.x * w * 2.;
        vec3 side = normalize(cross(dir, cameraPosition - P)); P += side * position.y * w * 2.;
        vAlong = position.x * (Lseg + 2. * w) / w; vHeadAt = Lseg / w; vY = position.y * 2.;
        float ign = smoothstep(aP.y, aP.y - 12., alt);                       // fades in at ignition
        float dense = 0.35 + 0.65 * (1. - smoothstep(0., zFull + 200., alt));  // hotter as the air thickens
        float land = smoothstep(-1., 0.5, alt);                              // gone at the ground
        vI = aQ.x * ign * dense * land * pow(aP.w / w, 0.5); vHeat = aQ.y * dense;
        gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.); }`,
    fragmentShader: `uniform float gain; uniform vec3 tailCol, headCol; varying float vAlong, vHeadAt, vY, vI, vHeat;
      void main(){ if (vI <= 0.) discard;
        float d = vAlong - vHeadAt, f = clamp(vAlong / max(vHeadAt, 1e-3), 0., 1.);
        float behind = 1. - step(0., d), taper = mix(0.25, 0.8, f);
        float core = exp(-vY*vY / (taper*taper) * 2.2) * pow(f, 1.6) * behind;
        float halo = exp(-vY*vY * 0.7) * pow(f, 2.5) * behind * 0.22;
        float head = exp(-(d*d*1.5 + vY*vY*1.5));
        vec3 tc = mix(tailCol * vec3(0.7, 0.45, 0.4), tailCol, f);
        vec3 hc = mix(headCol, vec3(1.0, 0.82, 0.6), vHeat * 0.5);
        gl_FragColor = vec4((tc * (core * 1.5 + halo) + hc * head * 2.6) * vI * gain, 1.); }` });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 40; S.scene.add(mesh);
  return { mesh, U, list,
    update(S, h) { U.uH.value = h; U.pxAng.value = THREE.MathUtils.degToRad(S.camera.fov) / S.H; } };
}
