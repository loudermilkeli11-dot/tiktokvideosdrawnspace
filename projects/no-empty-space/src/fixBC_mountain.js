// no-empty-space FIX PASS (group C): s08's mountain (Commander review items 3/5). Builder-owned; never edits the shared kit.
// slabMountain: our OWN 1,500 m massif replacing the kit's flat cone in s08: radial rocky ridges and gullies, a twin summit,
// strata, lighter and darker faces, green scrub and pines on the lower slopes, dry grass between, lit by the kit's golden sun and
// hazed by the scene fog (a lit, flat-shaded MeshStandardMaterial). The surface is cut into ~1,700 IRREGULAR thick slabs (cells
// grouped round jittered seeds, each with skirt walls so it has thickness when it lifts). At the squeeze each slab tears off
// (summit first, the lower slopes last), tumbles and streams along a gentle arc into the point, stretched along its path,
// shrinking and heating white-gold on arrival. All on the GPU, a pure function of FILM time.
import { THREE } from '@engine/engine.js';
import { rng, clamp } from '@engine/util.js';
import { styliseMat, LOOK } from './kit.js';

// a small 2D value noise + fbm (local: no dependence on the engine's noise signatures)
const hsh = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vn2 = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hsh(xi, yi), b = hsh(xi + 1, yi), c = hsh(xi, yi + 1), d = hsh(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
const fbm2 = (x, y, n = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < n; i++) { s += a * (vn2(x * f, y * f) * 2 - 1); f *= 2.03; a *= 0.5; } return s; };

// o: { c: {x, z}, H 1500, R 3000, y0 -120, cell 50, slab 140, seed, T, dur, C0 (Vector3), heat 0xfff0c8 }
export function slabMountain(S, o) {
  const H = o.H ?? 1500, RB = o.R ?? 3000, cx = o.c.x, cz = o.c.z, y0 = o.y0 ?? -120, cell = o.cell ?? 50, R = rng(o.seed ?? 515);
  // ---------------------------------------------------------------- the height field
  const hf = (x, z) => { const dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz), a = Math.atan2(dz, dx), t = Math.min(r / RB, 1.2);
    if (t >= 1) return y0 - 40;
    let h = H * Math.pow(1 - t, 1.35);
    const rid = Math.pow(1 - Math.abs(Math.sin(a * 6 + 0.9 * Math.sin(a * 2.3) + t * 2.2)), 2.2);       // 12 radial ridges with gullies between
    h += (rid - 0.35) * 260 * Math.sin(Math.PI * Math.min(t * 1.15, 1)) ;
    h += 160 * Math.exp(-Math.pow((a - 2.2) * 1.6, 2)) * Math.pow(1 - t, 2.2);                              // the twin summit
    h += 70 * fbm2(x * 0.0022 + 3, z * 0.0022 - 7, 4) * (0.4 + t);                                            // broken rock
    h *= 1 - Math.pow(t, 6);                                                                                  // eases into the plain
    return y0 + Math.max(h, 0); };
  // ---------------------------------------------------------------- cells -> irregular slabs
  const n = Math.ceil((2 * RB) / cell), gx0 = cx - RB, gz0 = cz - RB, sl = o.slab ?? 140, ns = Math.ceil((2 * RB) / sl);
  const seeds = []; for (let j = 0; j <= ns; j++) for (let i = 0; i <= ns; i++) seeds.push([gx0 + (i + 0.15 + 0.7 * R()) * sl, gz0 + (j + 0.15 + 0.7 * R()) * sl]);
  const seedOf = (x, z) => { const i = Math.floor((x - gx0) / sl), j = Math.floor((z - gz0) / sl); let best = -1, bd = 1e18;
    for (let jj = j - 1; jj <= j + 1; jj++) for (let ii = i - 1; ii <= i + 1; ii++) { if (ii < 0 || jj < 0 || ii > ns || jj > ns) continue; const k = jj * (ns + 1) + ii, s = seeds[k], d = (s[0] - x) ** 2 + (s[1] - z) ** 2; if (d < bd) { bd = d; best = k; } }
    return best; };
  const V = (i, j) => [gx0 + i * cell, gz0 + j * cell];
  const H0 = new Float32Array((n + 1) * (n + 1)); for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const [x, z] = V(i, j); H0[j * (n + 1) + i] = hf(x, z); }
  const hv = (i, j) => H0[j * (n + 1) + i];
  const owner = new Int32Array(n * n).fill(-1);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const [x, z] = V(i + 0.5, j + 0.5); if (Math.hypot(x - cx, z - cz) > RB * 0.985) continue; owner[j * n + i] = seedOf(x, z); }
  // slab centres (mean of their cells' tops)
  const cen = new Map(); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const s = owner[j * n + i]; if (s < 0) continue; const [x, z] = V(i + 0.5, j + 0.5);
    const c = cen.get(s) ?? { x: 0, y: 0, z: 0, k: 0 }; c.x += x; c.z += z; c.y += (hv(i, j) + hv(i + 1, j + 1)) / 2; c.k++; cen.set(s, c); }
  cen.forEach((c) => { c.x /= c.k; c.y /= c.k; c.z /= c.k; });
  // release order: nearest the point first (the summit), the lower slopes last; jittered so the front is ragged
  let dmin = 1e18, dmax = 0; cen.forEach((c) => { c.d = Math.hypot(c.x - o.C0.x, c.y - o.C0.y, c.z - o.C0.z); dmin = Math.min(dmin, c.d); dmax = Math.max(dmax, c.d); });
  cen.forEach((c) => { c.u0 = clamp(0.62 * Math.pow((c.d - dmin) / (dmax - dmin), 0.9) + 0.08 * (R() - 0.5), 0, 0.68); c.sd = R(); c.arc = 30 + 110 * R(); c.ax = R(); c.th = 25 + 45 * R(); });
  // ---------------------------------------------------------------- geometry
  const pos = [], col = [], aC = [], aR = [];
  const ROCK = [0x9c8c76, 0x8a7a66, 0xb5a488, 0x75695a, 0xa8957a, 0xc2b08f], SCRUB = [0x6f7d3e, 0x5d6f35, 0x7f8a45], PINE = [0x3f5a2e, 0x355028], DRY = [0xb5a060, 0xc4ae6a];
  const c3 = new THREE.Color(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nn = new THREE.Vector3(), SUN = LOOK.sunDir.clone().normalize();
  const tri = (a, b, c, s, colour) => { const C = cen.get(s); for (const v of [a, b, c]) { pos.push(...v); col.push(colour.r, colour.g, colour.b); aC.push(C.x, C.y, C.z); aR.push(C.u0, C.sd, C.arc, C.ax); } };
  const faceCol = (a, b, c, s) => { e1.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); e2.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]); nn.crossVectors(e1, e2).normalize();
    const y = (a[1] + b[1] + c[1]) / 3 - y0, steep = 1 - Math.abs(nn.y), mx = (a[0] + b[0] + c[0]) / 3, mz = (a[2] + b[2] + c[2]) / 3, nz = 0.5 + 0.5 * fbm2(mx * 0.004, mz * 0.004, 3), r = hsh(mx * 0.37, mz * 0.71);
    const dxm = mx - cx, dzm = mz - cz, am = Math.atan2(dzm, dxm), tm = Math.hypot(dxm, dzm) / RB;
    const rid = Math.pow(1 - Math.abs(Math.sin(am * 6 + 0.9 * Math.sin(am * 2.3) + tm * 2.2)), 2.2);       // 1 on a ridge crest, 0 in a gully
    const green = 780 + 420 * nz + 320 * (1 - rid);                                                         // green climbs the gullies
    if (y < green && steep < 0.66) { if (nz > 0.58 && y < green - 80) c3.set(PINE[r < 0.5 ? 0 : 1]); else if (nz < 0.3) c3.set(DRY[r < 0.5 ? 0 : 1]); else c3.set(SCRUB[Math.floor(r * 3)]); c3.multiplyScalar(0.88 + 0.24 * hsh(mz, mx)); }
    else { c3.set(ROCK[Math.floor(r * ROCK.length)]); const strata = 0.5 + 0.5 * Math.sin(y * 0.045 + 2 * nz); c3.multiplyScalar(0.8 + 0.2 * strata + 0.22 * rid - (steep > 0.6 ? 0.1 : 0));
      if (rid < 0.25) c3.lerp(new THREE.Color(0x5d5246), 0.35); }                                            // darker rock down in the gullies
    // baked light: sun-facing faces warmer and brighter, faces turned away cooler and darker (survives the haze)
    const sd = nn.y < 0 ? -nn.dot(SUN) : nn.dot(SUN);
    c3.multiplyScalar(0.62 + 0.55 * Math.max(sd, 0)); if (sd < 0.15) c3.lerp(new THREE.Color(0x6a6f8a), 0.18); else c3.lerp(new THREE.Color(0xf2c27a), 0.12 * sd);
    return c3.clone(); };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const s = owner[j * n + i]; if (s < 0) continue;
    const [xa, za] = V(i, j), [xb, zb] = V(i + 1, j + 1);
    const A = [xa, hv(i, j), za], B = [xb, hv(i + 1, j), za], Cc = [xa, hv(i, j + 1), zb], D = [xb, hv(i + 1, j + 1), zb];
    const flip = (i + j) % 2 === 0;
    const t1 = flip ? [A, Cc, B] : [A, Cc, D], t2 = flip ? [B, Cc, D] : [A, D, B];
    tri(...t1, s, faceCol(...t1, s)); tri(...t2, s, faceCol(...t2, s));
    // skirts on edges that border another slab or the outside: thickness so the slab reads as a block when it lifts
    const th = cen.get(s).th, skirt = (P, Q) => { const P2 = [P[0], P[1] - th, P[2]], Q2 = [Q[0], Q[1] - th, Q[2]], cc = c3.set(ROCK[3]).multiplyScalar(0.75).clone(); tri(P, P2, Q, s, cc); tri(Q, P2, Q2, s, cc); };
    const nb = (ii, jj) => (ii < 0 || jj < 0 || ii >= n || jj >= n ? -1 : owner[jj * n + ii]);
    if (nb(i, j - 1) !== s) skirt(B, A); if (nb(i + 1, j) !== s) skirt(D, B); if (nb(i, j + 1) !== s) skirt(Cc, D); if (nb(i - 1, j) !== s) skirt(A, Cc);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aC', new THREE.Float32BufferAttribute(aC, 3)); g.setAttribute('aR', new THREE.Float32BufferAttribute(aR, 4)); g.computeVertexNormals(); g.computeBoundingSphere();
  const U = { uFilm: { value: -1 }, uT: { value: o.T }, uDur: { value: o.dur }, uC: { value: o.C0.clone() }, uHot: { value: new THREE.Color(o.heat ?? 0xfff0c8).multiplyScalar(o.heatI ?? 2.2) } };
  const mat = styliseMat(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0, side: THREE.DoubleSide }), { rough: 0.92, env: 0.3 });
  mat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute vec3 aC; attribute vec4 aR; uniform float uFilm, uT, uDur; uniform vec3 uC; varying float vHeat;
      vec3 rodr(vec3 v, vec3 k, float a){ float c = cos(a), s = sin(a); return v*c + cross(k, v)*s + k*dot(k, v)*(1. - c); }`)
      .replace('#include <project_vertex>', `vHeat = 0.;
      { float age = uFilm - uT, u0 = aR.x*uDur;
        float tau = clamp((age - u0)/max(uDur - u0, 1e-3), 0., 1.);
        if (age > u0 && tau > 0.) {
          float k = pow(tau, 1.45);
          vec3 rel = transformed - aC;
          vec3 ax = normalize(vec3(aR.y - 0.5, 0.7, aR.w - 0.5));
          rel = rodr(rel, ax, (1.2 + 3.*aR.y)*k*3.);
          vec3 dir = normalize(uC - aC + 1e-3);
          vec3 cen = mix(aC, uC, k) + vec3(0., aR.z*sin(3.14159*k), 0.);
          cen += vec3(0., 18.*smoothstep(0., 0.08, tau)*(1. - k), 0.);              // the tear: it first jolts up off the mountain
          float stc = 1. + 3.2*sin(3.14159*min(k*1.15, 1.));
          rel += dir*dot(rel, dir)*(stc - 1.);
          rel *= 1. - 0.97*pow(k, 0.8);
          transformed = tau > 0.997 ? uC : cen + rel;
          vHeat = smoothstep(0.8, 1., k); } }
      #include <project_vertex>`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform vec3 uHot; varying float vHeat;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance += uHot*vHeat*vHeat;`)
      .replace('#include <fog_fragment>', `#ifdef USE_FOG
        #ifdef FOG_EXP2
          float fogFactor = 1.0 - exp(- fogDensity*fogDensity*vFogDepth*vFogDepth);
        #else
          float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
        #endif
        gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor*0.6);   // haze, but the massif keeps its colour
      #endif`); };
  mat.customProgramCacheKey = () => 'fixBC_slabMountain';
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.receiveShadow = false; mesh.castShadow = false; S.scene.add(mesh);
  return { mesh, U, hf, slabs: cen.size,
    update(film, C) { U.uFilm.value = film; if (C) U.uC.value.copy(C); mesh.visible = film < o.T + o.dur + 0.02; } };
}
