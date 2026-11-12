// groupA_chips: Builder A's variant of the kit's createChips (same shading, same family) with two additions for s02:
//   v:   [vx, vy, vz] an initial burst velocity (m/s, event time) that decays with tau (o.tau, 0.06 s): windows burst
//        OUTWARD (+z toward the street) and then ride the flow east. vy is never > 0 (nothing goes up).
//   ramp: things that were ATTACHED to the stopped ground (awnings, signs, panes) start at rest and catch the flow:
//        x = V·(a - r·(1 - exp(-a/r))), r = o.ramp (0.02 s event = 0.24 s film). Loose things (o.ramp 0) go at V at once.
// list items as the kit: { p, t0, size, col, kind 0 leaf/paper | 1 glass | 2 heavy, shape 0 tetra | 1 card, seed, v }.
// update(e). o: { wrap: [x0, x1], ramp, tau, rest }.
import { THREE } from '@engine/engine.js';
import { SUN, SUN_COL, HEMI, HAZE } from './kit.js';
import { V } from './story.js';

export function createChipsA(S, list, o = {}) {
  const card = new THREE.PlaneGeometry(1, 0.7), tet = new THREE.TetrahedronGeometry(0.6);
  const mk = (base) => { const g = new THREE.InstancedBufferGeometry(); const b = base.index ? base.toNonIndexed() : base; b.computeVertexNormals();
    g.setAttribute('position', b.attributes.position); g.setAttribute('normal', b.attributes.normal); return g; };
  const groups = [0, 1].map((shape) => list.filter((c) => (c.shape ?? 0) === shape));
  const U = { e: { value: 0 }, V: { value: V }, wrap: { value: new THREE.Vector3(o.wrap?.[0] ?? 0, o.wrap?.[1] ?? 0, o.wrap ? 1 : 0) }, rest: { value: o.rest ? 1 : 0 },
    ramp: { value: o.ramp ?? 0 }, tau: { value: o.tau ?? 0.06 },
    sunDir: { value: SUN.clone() }, sunCol: { value: new THREE.Color(SUN_COL).multiplyScalar(o.sunI ?? 1.6) }, skyCol: { value: new THREE.Color(HEMI.sky).multiplyScalar(0.55) },
    gndCol: { value: new THREE.Color(HEMI.ground).multiplyScalar(0.45) }, fogCol: { value: new THREE.Color(HAZE.col) }, fogN: { value: o.fogNear ?? HAZE.near }, fogF: { value: o.fogFar ?? HAZE.far },
    grav: { value: o.gravity ?? 9.81 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide,
    vertexShader: `attribute vec4 aP; attribute vec4 aS; attribute vec3 aC; attribute vec3 aV; uniform float e, V, rest, grav, ramp, tau; uniform vec3 wrap;
      varying vec3 vN; varying vec3 vC; varying float vK; varying vec3 vW;
      mat3 rot(vec3 a){ float cx=cos(a.x),sx=sin(a.x),cy=cos(a.y),sy=sin(a.y),cz=cos(a.z),sz=sin(a.z);
        return mat3(cy*cz, cy*sz, -sy, sx*sy*cz-cx*sz, sx*sy*sz+cx*cz, sx*cy, cx*sy*cz+sx*sz, cx*sy*sz-sx*cz, cx*cy); }
      void main(){ float age = e - aP.w, sz = aS.x, sd = aS.y, kind = aS.z; vC = aC; vK = kind;
        if (age < 0. && rest < 0.5) { gl_Position = vec4(2., 2., 2., 1.); return; }
        float a = max(age, 0.);
        vec3 p = aP.xyz;
        p.x += V*(ramp > 0. ? a - ramp*(1. - exp(-a/ramp)) : a);
        p += aV*tau*(1. - exp(-a/tau));
        if (wrap.z > 0.5) p.x = wrap.x + mod(p.x - wrap.x, wrap.y - wrap.x);
        float fl = kind < 0.5 ? 1. : kind < 1.5 ? 0.5 : 0.25;
        float g = kind < 0.5 ? grav*0.18 : kind < 1.5 ? grav*0.6 : grav;
        p.y += fl*0.9*sin(a*(5. + 7.*sd) + sd*6.28)*min(1., a/0.04) - 0.5*g*a*a;
        p.z += fl*1.2*sin(a*(3. + 4.*sd) + sd*17.)*min(1., a/0.06);
        p.y = max(p.y, 0.03 + sz*0.2);
        vec3 spin = vec3(1.3 + 2.1*sd, 0.7 + 3.3*fract(sd*7.3), -(2.0 + 4.0*fract(sd*3.7)))*a*(kind < 0.5 ? 9. : kind < 1.5 ? 5. : 3.)
                    + vec3(sd*6.28, fract(sd*5.1)*6.28, fract(sd*9.7)*6.28);
        mat3 R = rot(spin); vec3 lp = R*(position*sz); vN = normalize(R*normal);
        vec4 w = modelMatrix*vec4(p + lp, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 sunDir, sunCol, skyCol, gndCol, fogCol; uniform float fogN, fogF;
      varying vec3 vN; varying vec3 vC; varying float vK; varying vec3 vW;
      void main(){ vec3 n = normalize(vN); vec3 Vd = normalize(cameraPosition - vW); if (dot(n, Vd) < 0.) n = -n;
        float dif = max(dot(n, sunDir), 0.); vec3 amb = mix(gndCol, skyCol, n.y*0.5 + 0.5);
        vec3 col = vC*(sunCol*dif + amb);
        if (vK > 0.5 && vK < 1.5) { vec3 h = normalize(sunDir + Vd); col += sunCol*pow(max(dot(n, h), 0.), 60.)*1.4 + vec3(0.25, 0.32, 0.4)*0.3; }
        float d = length(cameraPosition - vW); col = mix(col, fogCol, clamp((d - fogN)/(fogF - fogN), 0., 1.));
        gl_FragColor = vec4(col, 1.); }` });
  const meshes = groups.map((L, shape) => { if (!L.length) return null;
    const g = mk(shape === 1 ? card : tet), aP = new Float32Array(L.length * 4), aS = new Float32Array(L.length * 4), aC = new Float32Array(L.length * 3), aV = new Float32Array(L.length * 3), c = new THREE.Color();
    L.forEach((q, i) => { aP.set([q.p[0], q.p[1], q.p[2], q.t0 ?? 0], i * 4); aS.set([q.size ?? 0.2, q.seed ?? ((i * 0.6180339) % 1), q.kind ?? 0, 0], i * 4); c.set(q.col ?? 0x8a8a80); c.toArray(aC, i * 3);
      const v = q.v ?? [0, 0, 0]; aV.set([v[0], Math.min(0, v[1]), v[2]], i * 3); });
    g.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 4)); g.setAttribute('aS', new THREE.InstancedBufferAttribute(aS, 4)); g.setAttribute('aC', new THREE.InstancedBufferAttribute(aC, 3)); g.setAttribute('aV', new THREE.InstancedBufferAttribute(aV, 3));
    g.instanceCount = L.length; const m = new THREE.Mesh(g, mat); m.frustumCulled = false; S.scene.add(m); return m; }).filter(Boolean);
  return { meshes, U, update(e) { U.e.value = e; } };
}
