// no-empty-space N2: "Porto", the hero harbour town (lead-owned; Builders import it through kit.js, NEVER edit it).
// ONE coherent stylised low-poly family: flat-shaded matte geometry with vertex colours, windows/shutters/tiles/cobbles drawn
// by shader patterns (one draw call per family), palette-only colours. Metres, +Y up, the camera's north = -Z.
//
// GEOGRAPHY (a narrow Portofino-like inlet seen along its length from the café terrace, so both house-lined shores fit 9:16):
//   quay (head of the inlet) ... z = -40, street level y = QUAY_Y (1.6), the quay street z -40..-14, x -62..62
//   the inlet .................. water between xW(z) and xE(z) (±62 m at the quay, ±97 m at the mouth z = MOUTH_Z -1000)
//   shores ..................... a 10 m promenade at QUAY_Y on both sides, then pastel houses climbing steep hills
//   the head town .............. houses climbing the slope south of the quay street (z > -14), up toward the mountain
//   BAR DEL PORTO terrace ....... floor y TERRACE.y (9.0) at x -14..14, z -13..-1; its front wall drops to the quay street
//   the mole ................... a breakwater from the west shore at z MOLE.z (-760) reaching x +22 (a 60 m gap east)
//   the ferry .................. docked on the east promenade, x ~ 84, z -300..-370 (bow north), FUORI SERVIZIO
//   the headland + TOWER ....... east of the mouth: rock plateau 48 m high centred HEAD (230, -1700), the 381 m tower on it
//   the mountain ............... a 1,500 m cone (story.MOUNTAIN) centred MOUNT (-200, 0, 3600) behind the town
//   the church ................. on the west shore at (-122, -760): nave, tiled dome, campanile
import { THREE } from '@engine/engine.js';
import { rng, fbm, vnoise, clamp, sstep } from '@engine/util.js';
import { MOUNTAIN } from './story.js';

export const QUAY_Y = 1.6, QUAY_Z = -40, MOUTH_Z = -1000;
export const TERRACE = { y: 9.0, x0: -14, x1: 14, z0: -13, z1: -1, railZ: -12.6, deckZ: -9.6, deckH: 1.0 };   // deck: the bar's raised floor (FRAME1_CAM and the selfie woman stand on it)
export const MOLE = { x0: -100, x1: 22, z: -760, w: 12, y: 3.4 };
export const HEAD = { x: 230, z: -1700, r: 200, y: 48 };
export const TOWER = { x: 236, z: -1712, base: HEAD.y, h: 381, w0: 44, w1: 30 };
export const MOUNT = { x: -200, z: 3600, h: MOUNTAIN.h, r: MOUNTAIN.r };
export const CHURCH = { x: -124, z: -760 };
export const FERRY = { x: 64.2, z: -335, len: 70, beam: 13 };   // moored 1.6 m off the east quay wall (xE(-335) - beam/2 - 1.6; was 84 = inside the houses)
export const xW = (z) => (z > -1050 ? -62 - 0.035 * Math.max(0, -z - 40) : -95.6 - 0.6 * (-1050 - z));
export const xE = (z) => (z > MOUTH_Z ? 62 + 0.035 * Math.max(0, -z - 40) : 95.6 + 0.45 * (MOUTH_Z - z));

// ---------------------------------------------------------------- the ground (JS; the GLSL twin below drives the sea)
// region signed distances (+ = land) and heights; land = max over regions
function regions(x, z) {
  const town = z - QUAY_Z, west = xW(z) - x, east = x - xE(z);
  const head = HEAD.r - Math.hypot(x - HEAD.x, z - HEAD.z);
  const mole = Math.min(MOLE.w / 2 - Math.abs(z - MOLE.z), Math.min(x - MOLE.x0 + 40, MOLE.x1 - x));
  return { town, west, east, head, mole };
}
const hill = (s, k = 0.55, cap = 210) => { const u = Math.max(0, s - 10); return QUAY_Y + cap * (1 - Math.exp(-(u * k) / cap)); };
export function groundH(x, z) {
  const r = regions(x, z); let h = -1e9;
  if (r.town > 0) h = Math.max(h, z < -14 ? QUAY_Y : QUAY_Y + 0.30 * (z + 14) + 6 * fbm(x * 0.006 + 3, 7) * sstep(0, 60, z + 14));
  if (r.west > 0) h = Math.max(h, hill(r.west) + 8 * fbm(z * 0.004, 2) * sstep(10, 60, r.west));
  if (r.east > 0) h = Math.max(h, hill(r.east, 0.5) + 8 * fbm(z * 0.004, 4) * sstep(10, 60, r.east));
  if (r.head > 0) h = Math.max(h, HEAD.y * sstep(0, 26, r.head) + 3 * fbm(x * 0.02 + z * 0.013, 9) * sstep(0, 40, r.head));
  if (r.mole > 0) h = Math.max(h, MOLE.y);
  if (h > -1e8) return h;
  const s = Math.max(r.town, r.west, r.east, r.head, r.mole);           // < 0: water; seabed shelves down from every shore
  return -Math.min(14, 2.5 + 0.22 * -s);
}
export const isLand = (x, z) => { const r = regions(x, z); return Math.max(r.town, r.west, r.east, r.head, r.mole) > 0; };
export const GROUND_GLSL = `
float xWz(float z){ return z > -1050. ? -62. - 0.035*max(0., -z - 40.) : -95.6 - 0.6*(-1050. - z); }
float xEz(float z){ return z > ${MOUTH_Z.toFixed(1)} ? 62. + 0.035*max(0., -z - 40.) : 95.6 + 0.45*(${MOUTH_Z.toFixed(1)} - z); }
float groundH(vec2 p){ float x = p.x, z = p.y;
  float town = z - (${QUAY_Z.toFixed(1)}), west = xWz(z) - x, east = x - xEz(z);
  float head = ${HEAD.r.toFixed(1)} - length(vec2(x - ${HEAD.x.toFixed(1)}, z - (${HEAD.z.toFixed(1)})));
  float mole = min(${(MOLE.w / 2).toFixed(1)} - abs(z - (${MOLE.z.toFixed(1)})), min(x - (${MOLE.x0.toFixed(1)}) + 40., ${MOLE.x1.toFixed(1)} - x));
  float s = max(max(max(town, west), max(east, head)), mole);
  if (s > 0.) return ${QUAY_Y.toFixed(2)} + 0.3*max(0., s - 10.);
  return -min(14., 2.5 + 0.22*(-s)); }`;

// ---------------------------------------------------------------- palette (one family; matte)
export const PAL = {
  walls: [0xe6b35c, 0xec8a6c, 0x9fd6bd, 0x8fc3e6, 0xf3e3c0, 0xf2a99c, 0xf0d26a, 0xd99062, 0xf6f0e4, 0xc9b2de, 0xe9c48a, 0xb8dcb0],
  roofs: [0xc0603a, 0xb3532f, 0xcf7046, 0xa94c2c, 0xd47a52],
  shutters: [0x3f7a4a, 0x2f6f6a, 0x4f8a3c, 0x6a4a2e, 0x2f5f8a],
  stone: 0xc9b597, stoneDark: 0x9c8a70, pave: 0xbcae95, rock: 0xa58f72, rockDark: 0x7d6b55, scrub: 0x7d8c46, dry: 0xb8a05e, sand: 0xdcc79c,
  cypress: 0x3d5a2e, pine: 0x4f6e34, olive: 0x8a9a62,
};

// ---------------------------------------------------------------- geometry builder (flat faces, vertex colours, pattern attrs)
// aW = (u along the face m, v up the face m, kind, faceLen); kind: 0 plain, 1 house wall, 2 roof tiles, 3 tower glass, 4 paving
// aS = (seed, shutter idx, floor height, flags)
export class GB {
  constructor() { this.p = []; this.c = []; this.w = []; this.s = []; }
  tri(a, b, c, col, wa = [0, 0, 0, 0], wb = wa, wc = wa, s = [0, 0, 3, 0]) {
    const C = new THREE.Color(col); this.p.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) { this.c.push(C.r, C.g, C.b); this.s.push(...s); }
    this.w.push(...wa, ...wb, ...wc);
  }
  // quad a b c d (CCW from outside); per-vertex uv (u, v) + kind + len
  // face (optional [x, y, z]): flips the winding so the quad's normal points that way
  quad(a, b, c, d, col, kind = 0, len = 1, h = 1, s, uv = [[0, 0], [len, 0], [len, h], [0, h]], face) {
    const W = (k) => [uv[k][0], uv[k][1], kind, len];
    if (face) { const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      if (n[0] * face[0] + n[1] * face[1] + n[2] * face[2] < 0) { this.tri(a, c, b, col, W(0), W(2), W(1), s); this.tri(a, d, c, col, W(0), W(3), W(2), s); return; } }
    this.tri(a, b, c, col, W(0), W(1), W(2), s); this.tri(a, c, d, col, W(0), W(2), W(3), s);
  }
  // oriented box: centre-bottom (x, y0, z), size (w along local x, h, d along local z), yaw (rad); faces: 4 walls (+ top)
  box(x, y0, z, w, h, d, yaw, col, o = {}) {
    const cs = Math.cos(yaw), sn = Math.sin(yaw), P = (lx, ly, lz) => [x + lx * cs + lz * sn, y0 + ly, z - lx * sn + lz * cs];
    const hw = w / 2, hd = d / 2, k = o.kind ?? 0, s = o.s, top = o.top ?? col;
    const walls = [[[-hw, hd], [hw, hd], w], [[hw, hd], [hw, -hd], d], [[hw, -hd], [-hw, -hd], w], [[-hw, -hd], [-hw, hd], d]];
    walls.forEach(([[ax, az], [bx, bz], L]) => this.quad(P(ax, 0, az), P(bx, 0, bz), P(bx, h, bz), P(ax, h, az), col, k, L, h, s));
    if (o.top !== false) this.quad(P(-hw, h, hd), P(hw, h, hd), P(hw, h, -hd), P(-hw, h, -hd), top, o.topKind ?? 0, w, d, s);
    if (o.bottom) this.quad(P(-hw, 0, -hd), P(hw, 0, -hd), P(hw, 0, hd), P(-hw, 0, hd), col, 0, w, d, s);
  }
  // hip roof over a w x d footprint at height y (overhang ov), ridge height rh
  hip(x, y, z, w, d, yaw, rh, col, ov = 0.45, s) {
    const cs = Math.cos(yaw), sn = Math.sin(yaw), P = (lx, ly, lz) => [x + lx * cs + lz * sn, y + ly, z - lx * sn + lz * cs];
    const hw = w / 2 + ov, hd = d / 2 + ov, along = w >= d, r = Math.max(0, (along ? hw - hd : hd - hw));
    const A = along ? P(-r, rh, 0) : P(0, rh, -r), B = along ? P(r, rh, 0) : P(0, rh, r);
    const c0 = P(-hw, 0, hd), c1 = P(hw, 0, hd), c2 = P(hw, 0, -hd), c3 = P(-hw, 0, -hd);
    const sl = Math.hypot(along ? hd : hw, rh);
    const T = (u, v) => [u, v, 2, w];
    if (along) {
      this.tri(c0, c1, B, col, T(0, 0), T(2 * hw, 0), T(hw + r, sl), s); this.tri(c0, B, A, col, T(0, 0), T(hw + r, sl), T(hw - r, sl), s);   // front
      this.tri(c2, c3, A, col, T(0, 0), T(2 * hw, 0), T(hw + r, sl), s); this.tri(c2, A, B, col, T(0, 0), T(hw + r, sl), T(hw - r, sl), s);   // back
      this.tri(c1, c2, B, col, T(0, 0), T(2 * hd, 0), T(hd, sl), s); this.tri(c3, c0, A, col, T(0, 0), T(2 * hd, 0), T(hd, sl), s);
    } else {
      this.tri(c1, c2, B, col, T(0, 0), T(2 * hd, 0), T(hd + r, sl), s); this.tri(c1, B, A, col, T(0, 0), T(hd + r, sl), T(hd - r, sl), s);
      this.tri(c3, c0, A, col, T(0, 0), T(2 * hd, 0), T(hd + r, sl), s); this.tri(c3, A, B, col, T(0, 0), T(hd + r, sl), T(hd - r, sl), s);
      this.tri(c0, c1, A, col, T(0, 0), T(2 * hw, 0), T(hw, sl), s); this.tri(c2, c3, B, col, T(0, 0), T(2 * hw, 0), T(hw, sl), s);
    }
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aW', new THREE.Float32BufferAttribute(this.w, 4));
    g.setAttribute('aS', new THREE.Float32BufferAttribute(this.s, 4));
    g.computeVertexNormals(); g.computeBoundingSphere(); return g;
  }
}

// ---------------------------------------------------------------- the pattern material (windows, shutters, arches, tiles, glass, cobbles)
// One MeshStandardMaterial (vertexColors, flatShading, matte) whose shader draws the stylised detail by kind. Haze is the
// scene's linear fog (kit). o: { rough 0.85, env 0.35 }
export function patternMaterial(o = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: o.rough ?? 0.86, metalness: 0, envMapIntensity: o.env ?? 0.35 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute vec4 aW; attribute vec4 aS; varying vec4 vW; varying vec4 vS; varying vec3 vWp;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      vW = aW; vS = aS; vWp = (modelMatrix * vec4(position, 1.)).xyz;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec4 vW; varying vec4 vS; varying vec3 vWp;
      float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
      float boxm(vec2 p, vec2 a, vec2 b){ vec2 q = step(a, p)*step(p, b); return q.x*q.y; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      float kind = floor(vW.z + 0.5); float rgh = 0.;
      if (kind == 1.) {                                   // house wall: bays of windows with shutters; ground floor doors/arches
        float fh = vS.z, L = vW.w, bay = max(1., floor(L/2.8)), bw = L/bay;
        float u = vW.x, v = vW.y, row = floor(v/fh), bx = floor(u/bw);
        vec2 q = vec2(fract(u/bw), fract(v/fh));
        float sd = hsh(vec2(vS.x*91. + bx, row));
        vec3 shut = vS.y < 0.5 ? vec3(0.25,0.48,0.29) : vS.y < 1.5 ? vec3(0.18,0.44,0.42) : vS.y < 2.5 ? vec3(0.31,0.54,0.24) : vS.y < 3.5 ? vec3(0.42,0.29,0.18) : vec3(0.18,0.37,0.54);
        bool edge = u < 0.6 || u > L - 0.6;
        if (!edge && row < 0.5) {                          // ground floor: a door or a shop arch every other bay, else a barred window
          if (mod(bx + floor(vS.x*7.), 2.) < 1.) { float ar = boxm(q, vec2(0.22, 0.), vec2(0.78, 0.62)) + step(length((q - vec2(0.5, 0.62))*vec2(1., 1.55)), 0.28);
            if (ar > 0.5) diffuseColor.rgb = mix(vec3(0.16,0.12,0.10), shut*0.7, step(0.5, sd)); }
          else if (boxm(q, vec2(0.36, 0.38), vec2(0.64, 0.72)) > 0.5) diffuseColor.rgb = vec3(0.17,0.19,0.22);
        } else if (!edge && v < vS.z*vS.w + 0.01) {
          float win = boxm(q, vec2(0.37, 0.30), vec2(0.63, 0.80));
          float sl = boxm(q, vec2(0.33, 0.25), vec2(0.67, 0.29));
          float shL = boxm(q, vec2(0.21, 0.30), vec2(0.36, 0.80)), shR = boxm(q, vec2(0.64, 0.30), vec2(0.79, 0.80));
          float closed = step(0.72, sd);
          if (sl > 0.5) diffuseColor.rgb = vec3(0.93,0.90,0.83);
          if (win > 0.5) diffuseColor.rgb = closed > 0.5 ? shut*(0.85 + 0.15*step(0.5, fract(q.y*14.))) : vec3(0.14,0.18,0.22) + 0.06*sd;
          if ((shL + shR) > 0.5 && closed < 0.5) diffuseColor.rgb = shut*(0.82 + 0.18*step(0.5, fract(q.y*14.)));
        }
        diffuseColor.rgb *= 0.94 + 0.06*hsh(floor(vWp.xz*0.7) + floor(vWp.y*0.9));   // plaster mottling
      } else if (kind == 2.) {                            // terracotta roof tiles: courses + staggered joints
        float c = fract(vW.y/0.32), j = fract(vW.x/0.26 + 0.5*floor(vW.y/0.32));
        diffuseColor.rgb *= 0.78 + 0.22*smoothstep(0., 0.25, c) - 0.10*step(0.92, j) + 0.08*(hsh(floor(vec2(vW.x/0.26, vW.y/0.32))) - 0.5);
      } else if (kind == 3.) {                            // tower glass: pale stylised curtain wall, stone mullions, floor slabs
        vec2 q = vec2(fract(vW.x/1.8), fract(vW.y/4.0));
        float mul = step(q.x, 0.08) + step(0.82, q.y);
        vec3 gl = mix(vec3(0.30,0.46,0.56), vec3(0.78,0.66,0.52), smoothstep(0., 380., vW.y)*0.35 + 0.22*hsh(floor(vec2(vW.x/1.8, vW.y/4.))));
        diffuseColor.rgb = mul > 0.5 ? diffuseColor.rgb : gl; rgh = mul > 0.5 ? 0. : 1.;
      } else if (kind == 4.) {                            // cobbles / paving in world xz
        vec2 p = vWp.xz*vec2(2.6, 3.2); p.x += 0.5*floor(p.y); vec2 f = fract(p) - 0.5;
        float st = smoothstep(0.5, 0.36, max(abs(f.x), abs(f.y)));
        diffuseColor.rgb *= mix(0.62, 0.95 + 0.12*(hsh(floor(p)) - 0.5), st);
      }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, 0.35, rgh);`);
  };
  m.customProgramCacheKey = () => 'nes-pattern-v1';
  return m;
}
export const plainMat = (col, o = {}) => new THREE.MeshStandardMaterial({ color: col, flatShading: true, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, envMapIntensity: o.env ?? 0.35, ...(o.extra ?? {}) });

// ---------------------------------------------------------------- canvas signs (story props)
export function signTexture(text, o = {}) {
  const cv = document.createElement('canvas'), W = o.w ?? 1024, H = o.h ?? 256; cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); c.fillStyle = o.bg ?? '#f3ead6'; c.fillRect(0, 0, W, H);
  if (o.border !== false) { const lw = H * 0.05; c.strokeStyle = o.fg ?? '#1f3a5f'; c.lineWidth = lw; c.strokeRect(lw * 1.5, lw * 1.5, W - lw * 3, H - lw * 3); }
  c.fillStyle = o.fg ?? '#1f3a5f'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const lines = String(text).split('|'); let size = o.size ?? H * (lines.length > 1 ? 0.36 : 0.56);
  c.font = `${o.weight ?? 800} ${size}px ${o.font ?? 'Georgia, "Times New Roman", serif'}`;
  while (Math.max(...lines.map((l) => c.measureText(l).width)) > W * 0.88 && size > 10) { size -= 2; c.font = `${o.weight ?? 800} ${size}px ${o.font ?? 'Georgia, serif'}`; }
  lines.forEach((l, i) => c.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.1));
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// a sign board: w x h metres at p, facing yaw (0 = faces +Z, toward a south camera); returns the Mesh
export function signBoard(S, text, p, w, h, yaw = 0, o = {}) {
  const mat = new THREE.MeshStandardMaterial({ map: signTexture(text, { w: Math.round(256 * w / h) * 2, h: 512, ...o }), roughness: 0.8, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.copy(p); m.rotation.y = yaw; m.castShadow = true; m.receiveShadow = true;
  S.scene.add(m); return m;
}

// ---------------------------------------------------------------- terrain (one flat-shaded grid; CCW from above)
function buildTerrain() {
  const X0 = -1700, X1 = 1700, Z0 = -2400, Z1 = 1500, step = 10;
  const nx = Math.round((X1 - X0) / step), nz = Math.round((Z1 - Z0) / step);
  const H = new Float32Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) H[j * (nx + 1) + i] = groundH(X0 + i * step, Z0 + j * step);
  const pos = [], col = [], c = new THREE.Color(), n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  const colorAt = (x, y, z, ny) => {
    if (y < 0.4) return c.set(PAL.sand).multiplyScalar(0.8 + 0.1 * vnoise(x * 0.05, 3));
    if (y < 2.2 && !isLand(x, z)) return c.set(PAL.rock);
    const steep = 1 - ny, nn = 0.5 + 0.5 * fbm(x * 0.02 + z * 0.017, 5);
    if (steep > 0.45) return c.set(PAL.rock).lerp(new THREE.Color(PAL.rockDark), nn * 0.6);
    return c.set(PAL.scrub).lerp(new THREE.Color(PAL.dry), clamp(nn * 1.2 - 0.1 + steep)).multiplyScalar(0.92 + 0.12 * vnoise(x * 0.09 + z * 0.07, 8));
  };
  const V = (i, j) => [X0 + i * step, H[j * (nx + 1) + i], Z0 + j * step];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = V(i, j), b = V(i + 1, j), cc = V(i, j + 1), d = V(i + 1, j + 1);
    for (const [p, q, r] of [[a, cc, b], [b, cc, d]]) {             // CCW seen from above (+y): a(x0,z0) -> c(x0,z1) -> b(x1,z0)
      if (p[1] < -13 && q[1] < -13 && r[1] < -13) continue;
      e1.set(q[0] - p[0], q[1] - p[1], q[2] - p[2]); e2.set(r[0] - p[0], r[1] - p[1], r[2] - p[2]); n.crossVectors(e1, e2).normalize();
      const cx = (p[0] + q[0] + r[0]) / 3, cy = (p[1] + q[1] + r[1]) / 3, cz = (p[2] + q[2] + r[2]) / 3; colorAt(cx, cy, cz, Math.abs(n.y));
      pos.push(...p, ...q, ...r); for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals(); return g;
}

// ---------------------------------------------------------------- houses (stacked up the slopes; one GB, one draw)
function addHouse(gb, R, x, z, w, d, yaw, o = {}) {
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => groundH(x + (a * w / 2) * Math.cos(yaw) + (b * d / 2) * Math.sin(yaw), z - (a * w / 2) * Math.sin(yaw) + (b * d / 2) * Math.cos(yaw)));
  const lo = Math.min(...corners), hi = Math.max(...corners);
  if (lo < QUAY_Y - 0.05) return false;
  const floors = o.floors ?? 2 + Math.floor(R() * 3.2), fh = 3.0 + R() * 0.3, h = floors * fh + (hi - lo) + 0.4;
  const wall = o.col ?? PAL.walls[Math.floor(R() * PAL.walls.length)];
  const s = [R(), Math.floor(R() * 5), fh, (h / fh) + 0.0];                 // seed, shutter colour, floor height, window rows
  const base = lo - 0.3;
  gb.box(x, base, z, w, h + 0.3, d, yaw, wall, { kind: 1, s: [s[0], s[1], fh, Math.floor((h + 0.3 - 0.6) / fh)], top: false });
  // the walls' v starts at base; windows are drawn from the ground floor (v from base, so a house on a slope shows a plinth row)
  const roofY = base + h + 0.3;
  if (R() < 0.78) gb.hip(x, roofY, z, w, d, yaw, 1.4 + R() * 1.4, PAL.roofs[Math.floor(R() * PAL.roofs.length)], 0.45, [s[0], 0, 3, 0]);
  else { gb.box(x, roofY, z, w, 0.12, d, yaw, 0xe9dfcc, { top: true }); const pw = 0.25;                     // flat roof terrace + parapet
    gb.box(x, roofY, z + (d / 2 - pw / 2) * Math.cos(yaw), w, 0.9, pw, yaw, wall, {}); }
  return { h: roofY - base, top: roofY, base };
}

// ---------------------------------------------------------------- trees (instanced: cypress cones, umbrella pines, olives)
function treeGeometries() {
  const cyp = new THREE.ConeGeometry(1.1, 9, 6, 1); cyp.translate(0, 5.5, 0);
  const pineT = new THREE.CylinderGeometry(0.22, 0.32, 6, 5); pineT.translate(0, 3, 0);
  const pineC = new THREE.IcosahedronGeometry(1, 0); pineC.scale(4.2, 1.5, 4.2); pineC.translate(0, 7, 0);
  const olive = new THREE.IcosahedronGeometry(1, 0); olive.scale(2.4, 1.9, 2.4); olive.translate(0, 2.8, 0);
  const trunk = new THREE.CylinderGeometry(0.15, 0.25, 2.2, 5); trunk.translate(0, 1.1, 0);
  return { cyp, pineT, pineC, olive, trunk };
}

// ---------------------------------------------------------------- boats (fishing gozzi) and the ferry
export function boatGeometry() {           // ~7 m pointed hull (bow -Z), gunwale stripe, a little wheelhouse; vertex colours (hull = white -> tinted)
  const gb = new GB(), L = 7, B = 2.3, D = 1.1, stern = L / 2, bow = -L / 2;
  const hull = 0xffffff, deck = 0xc8a878, trim = 0xf4f1ea;
  const P = (x, y, z) => [x, y, z];
  const top = [P(-B / 2, D, stern), P(B / 2, D, stern), P(B / 2, D, 0.3), P(0, D + 0.25, bow), P(-B / 2, D, 0.3)];
  const bot = [P(-B * 0.32, 0, stern - 0.2), P(B * 0.32, 0, stern - 0.2), P(B * 0.3, 0, 0.3), P(0, 0.35, bow + 0.3), P(-B * 0.3, 0, 0.3)];
  for (let i = 0; i < 5; i++) { const j = (i + 1) % 5; gb.quad(bot[i], bot[j], top[j], top[i], hull); }
  gb.tri(top[0], top[1], top[2], deck); gb.tri(top[0], top[2], top[4], deck); gb.tri(top[4], top[2], top[3], deck);
  for (let i = 0; i < 5; i++) { const j = (i + 1) % 5; const a = top[i], b = top[j]; gb.quad([a[0], a[1] - 0.18, a[2]], [b[0], b[1] - 0.18, b[2]], b, a, trim); }
  gb.box(0, D, 1.4, 1.3, 1.2, 1.4, 0, trim, { top: 0x2f6f8a }); gb.box(0, D, -1.6, 0.12, 2.6, 0.12, 0, 0x6a5038, {});
  return gb.build();
}
export function ferryGroup() {             // 70 m car ferry, bow -Z: white hull, blue band, red boot-top, two-deck superstructure, funnel
  const gb = new GB(), L = FERRY.len, B = FERRY.beam;
  gb.box(0, -2.2, 0, B, 2.4, L - 6, 0, 0xb8382e, {});                                    // red boot-top (waterline)
  gb.box(0, 0.2, 0, B, 4.6, L - 6, 0, 0xf4f2ec, { top: 0x8a8f96 });                     // hull + car deck
  gb.box(0, 2.6, 0, B + 0.05, 1.1, L - 6.05, 0, 0x234f8f, { top: false });              // blue band
  for (const z of [-(L - 6) / 2, (L - 6) / 2]) { const sg = z < 0 ? -1 : 1;             // bow/stern ramps (wedges)
    gb.quad([-B / 2, -2.2, z], [B / 2, -2.2, z], [B / 2, 4.8, z + sg * 3], [-B / 2, 4.8, z + sg * 3], 0xf4f2ec); }
  gb.box(0, 4.8, 4, B - 1.2, 3.0, 34, 0, 0xf4f2ec, { top: 0xdedad2, kind: 1, s: [0.3, 4, 1.5, 2] });   // deck 1 (window rows)
  gb.box(0, 7.8, 2, B - 3, 2.6, 20, 0, 0xf4f2ec, { top: 0xdedad2, kind: 1, s: [0.6, 4, 1.3, 2] });     // deck 2
  gb.box(0, 10.4, -6, 6, 1.8, 5, 0, 0xf4f2ec, { top: 0x2b2f36 });                                      // bridge
  gb.box(0, 10.4, 6, 2.6, 4.2, 3.4, 0, 0xd9a21b, { top: 0x1c1c22 }); gb.box(0, 13.2, 6, 2.62, 1.0, 3.42, 0, 0x1c1c22, { top: false });   // funnel
  for (const x of [-B / 2 + 0.5, B / 2 - 0.5]) for (let z = -12; z <= 18; z += 6) gb.box(x, 4.8, z, 1.0, 1.2, 2.4, 0, 0xf08a2a, {});   // lifeboats
  const g = new THREE.Group(); const m = new THREE.Mesh(gb.build(), patternMaterial()); m.castShadow = true; m.receiveShadow = true; g.add(m);
  g.userData.parts = [m]; return g;
}

// ---------------------------------------------------------------- the landmark tower (unfinished, 381 m, cranes, banner)
export function towerGroup(S) {
  const gb = new GB(), T = TOWER, H = T.h, top = H - 22;                    // the top 22 m are bare structure
  const segs = 8;
  for (let k = 0; k < segs; k++) {                                          // a gently tapering glass shaft with 4 stone corner fins, set-backs
    const y0 = (k / segs) * top, y1 = ((k + 1) / segs) * top, wk = T.w0 + (T.w1 - T.w0) * (k / (segs - 1));
    gb.box(0, y0, 0, wk, y1 - y0, wk, 0, 0xffffff, { kind: 3, top: k === segs - 1 ? 0x8d8a84 : 0xd9cfbf });
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) gb.box(sx * wk / 2, y0, sz * wk / 2, 2.6, y1 - y0, 2.6, 0, 0xe2d6c0, {});
  }
  gb.box(0, -2, 0, T.w0 + 18, 14, T.w0 + 18, 0, 0xd9cfbf, { kind: 1, s: [0.5, 4, 4.5, 3] });              // podium
  // bare top: floor slabs + columns + core
  for (let y = top; y < H - 3; y += 4.2) gb.box(0, y, 0, T.w1 - 1, 0.4, T.w1 - 1, 0, 0x9a968e, {});
  for (const sx of [-1, -0.33, 0.33, 1]) for (const sz of [-1, -0.33, 0.33, 1]) gb.box(sx * (T.w1 / 2 - 1), top, sz * (T.w1 / 2 - 1), 0.8, 19, 0.8, 0, 0x8d8a84, {});
  gb.box(0, top, 0, 9, 24, 9, 0, 0xb4aea2, {});
  // two tower cranes (yellow mast, red jib)
  [[[-6, 0, -4], 0.6], [[7, 0, 6], 2.4]].forEach(([[cx, , cz], yaw]) => {
    gb.box(cx, top, cz, 1.6, 52, 1.6, 0, 0xe8b21e, {});
    const c = Math.cos(yaw), s = Math.sin(yaw);
    gb.box(cx + 12 * c, top + 50, cz - 12 * s, 40, 1.4, 1.4, yaw, 0xd2402e, {});
    gb.box(cx - 9 * c, top + 49, cz + 9 * s, 6, 2.6, 2.6, yaw, 0x8d8a84, {});
    gb.box(cx, top + 52, cz, 1.0, 6, 1.0, 0, 0xe8b21e, {}); });
  const g = new THREE.Group(); const m = new THREE.Mesh(gb.build(), patternMaterial({ env: 0.5 })); m.castShadow = true; m.receiveShadow = true; g.add(m);
  // OPENING 2027 banner hung on the west face (facing the town / the camera side, +Z rotated toward the terrace)
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(30, 60), new THREE.MeshStandardMaterial({ map: signTexture('OPENING|2027', { w: 512, h: 1024, bg: '#d2402e', fg: '#fff6e8', border: false, size: 150 }), roughness: 0.85, side: THREE.DoubleSide }));
  banner.position.set(0, 150, T.w0 / 2 + 0.6); g.add(banner);
  g.position.set(T.x, T.base, T.z); g.rotation.y = Math.atan2(0 - T.x, 0 - T.z);   // local +Z (the banner face) toward the terrace
  g.userData.parts = [m, banner]; S.scene.add(g); return g;
}

// ---------------------------------------------------------------- the mountain (a faceted 1,500 m cone with ridges)
export function mountainGroup(S) {
  // ridged faceted massif: radial ridges (gullies between them), a lumpy twin summit, strata; grey rock above the scrub line
  const R = rng(42), segs = 84, rings = 26, pos = [], col = [];
  const ridge = (a, u) => 1 + 0.16 * Math.sin(a * 5 + 1.3) + 0.09 * Math.sin(a * 13 + 0.4) * (0.4 + u) + 0.06 * vnoise(a * 17 + u * 9, 4) + 0.05 * Math.abs(Math.sin(a * 23 + u * 4));
  const P = (i, k) => { const a = (i % segs) / segs * Math.PI * 2, u = k / rings, r = MOUNT.r * (1 - u) * ridge(a, u) * (k === rings ? 0 : 1);
    const twin = 1 + 0.06 * Math.exp(-Math.pow((a - 2.2) * 1.4, 2)) * u;
    const h = MOUNT.h * (1 - Math.pow(1 - u, 1.3)) * twin * (1 + 0.04 * vnoise(a * 11 + k * 1.7, 6)) - 120;
    return [MOUNT.x + Math.cos(a) * r, h, MOUNT.z + Math.sin(a) * r]; };
  const c = new THREE.Color(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nrm = new THREE.Vector3();
  const ROCKS = [0x9a8c7a, 0x857868, 0xb3a58f, 0x6f6456, 0xa8977c];
  for (let k = 0; k < rings; k++) for (let i = 0; i < segs; i++) {
    const a = P(i, k), b = P(i + 1, k), d = P(i, k + 1), e = P(i + 1, k + 1);
    for (const tri of [[a, d, b], [b, d, e]]) {
      if (k === rings - 1 && tri[1] === d && tri[2] === e) continue;
      e1.set(tri[1][0] - tri[0][0], tri[1][1] - tri[0][1], tri[1][2] - tri[0][2]); e2.set(tri[2][0] - tri[0][0], tri[2][1] - tri[0][1], tri[2][2] - tri[0][2]);
      nrm.crossVectors(e1, e2).normalize(); const steep = 1 - Math.abs(nrm.y), y = (tri[0][1] + tri[1][1] + tri[2][1]) / 3, nn = R();
      const scrubLine = 380 + 160 * nn;
      if (y < scrubLine && steep < 0.6) c.set(nn < 0.5 ? PAL.scrub : PAL.pine).lerp(new THREE.Color(PAL.dry), 0.3 * R());
      else c.set(ROCKS[Math.floor(R() * ROCKS.length)]).multiplyScalar(0.85 + 0.25 * Math.sin(y * 0.025) * 0.5 + (steep > 0.55 ? -0.12 : 0.05));
      pos.push(...tri[0], ...tri[1], ...tri[2]); for (let q = 0; q < 3; q++) col.push(c.r, c.g, c.b);
    }
  }
  const g0 = new THREE.BufferGeometry(); g0.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g0.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g0.computeVertexNormals();
  const m = new THREE.Mesh(g0, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, side: THREE.DoubleSide }));
  m.receiveShadow = true; const g = new THREE.Group(); g.add(m); g.userData.parts = [m]; S.scene.add(g); return g;
}

// ---------------------------------------------------------------- the whole town: buildTown(S) -> handles
// o: { houses true, trees true, seed 7, skipHouses: [[x, z, r]] (keep clear, e.g. a camera) }
export function buildTown(S, o = {}) {
  const R = rng(o.seed ?? 7), scene = S.scene, pat = patternMaterial();
  const out = { pat };
  // terrain
  const terr = new THREE.Mesh(buildTerrain(), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
  terr.receiveShadow = true; terr.castShadow = false; scene.add(terr); out.terrain = terr;
  // quay street, shore promenades, quay walls, the mole: one paved GB (cobbles) + one stone GB
  const pave = new GB(), stone = new GB();
  const skip = o.skipHouses ?? [];
  const UP = [0, 1, 0], PY = QUAY_Y + 0.02;
  pave.quad([-70, PY, -14], [70, PY, -14], [70, PY, QUAY_Z], [-70, PY, QUAY_Z], PAL.pave, 4, 140, 26, undefined, undefined, UP);
  for (let z = QUAY_Z; z > -1030; z -= 20) { const z1 = z - 20;               // promenades along both shores (10 m wide), quay walls
    for (const side of [-1, 1]) { const X = side < 0 ? xW : xE, a = X(z), b = X(z1), w = 10 * side;
      pave.quad([a, PY, z], [b, PY, z1], [b + w, PY, z1], [a + w, PY, z], PAL.pave, 4, 10, 20, undefined, undefined, UP);
      stone.quad([a, -4, z], [b, -4, z1], [b, PY, z1], [a, PY, z], PAL.stone, 0, 20, 5.6, undefined, undefined, [-side, 0, 0]); } }
  stone.quad([-62, -4, QUAY_Z], [62, -4, QUAY_Z], [62, PY, QUAY_Z], [-62, PY, QUAY_Z], PAL.stone, 0, 124, 5.6, undefined, undefined, [0, 0, -1]);   // the head quay wall faces north
  stone.box((MOLE.x0 + MOLE.x1) / 2 - 20, -6, MOLE.z, MOLE.x1 - MOLE.x0 + 40, MOLE.y + 6, MOLE.w, 0, PAL.stone, { top: PAL.pave, topKind: 4 });
  { const RR = rng(5); for (let x = MOLE.x0 - 10; x < MOLE.x1 + 4; x += 2.2) for (const sd of [-1, 1]) {   // tumbled rock armour along the mole
    const s = 1.2 + RR() * 1.6; stone.box(x + RR(), -3, MOLE.z + sd * (MOLE.w / 2 + 1.2 + RR()), s, 3 + RR() * 2.5, s, RR() * 3, RR() < 0.5 ? PAL.rock : PAL.rockDark, {}); } }
  for (const g of [pave, stone]) { const m = new THREE.Mesh(g.build(), pat); m.receiveShadow = true; m.castShadow = g === stone; scene.add(m); }
  // houses
  const hb = new GB(), placed = [];
  const tryHouse = (x, z, yaw, extra = {}) => {
    if (skip.some(([sx, sz, sr]) => Math.hypot(x - sx, z - sz) < sr)) return;
    const w = extra.w ?? 6.5 + R() * 4, d = extra.d ?? 6.5 + R() * 4;
    const hs = addHouse(hb, R, x, z, w, d, yaw, extra); if (hs) placed.push({ x, z, w, d, yaw, ...hs });
  };
  if (o.houses !== false) {
    // head town: rows climbing south; a stair street at x -24, a road at x +26 left open; the terrace block kept for the bar
    for (let z = -8; z < 520; z += 10.5) for (let x = -420; x < 420; x += 10.5) {
      const jx = x + (R() - 0.5) * 3, jz = z + (R() - 0.5) * 2.5;
      if (jz > 24 && (Math.abs(jx + 26) < 3.5 || Math.abs(jx - 28) < 4)) continue;     // a stair street and a road up the hill
      if (jx > TERRACE.x0 - 7 && jx < TERRACE.x1 + 7 && jz < 16) continue;               // the BAR DEL PORTO block (its own buildings)
      if (jz < -2 && (jx < xW(-40) + 12 || jx > xE(-40) - 12)) continue;
      if (R() < 0.12) continue; tryHouse(jx, jz, (R() - 0.5) * 0.12);
    }
    // the shores: rows parallel to the water, facing it, stacked up the hill (first row right on the promenade)
    for (const side of [-1, 1]) for (let z = -48; z > -1060; z -= 10) for (let s = 15; s < 260; s += 10.5) {
      const X = side < 0 ? xW : xE, x = X(z) - side * -s + (R() - 0.5) * 2.5, zz = z + (R() - 0.5) * 3;
      if (R() < (s < 30 ? 0.05 : 0.14 + s * 0.0012)) continue;
      if (Math.hypot(x - CHURCH.x, zz - CHURCH.z) < 30) continue;
      if (Math.abs(zz - MOLE.z) < 9 && side < 0 && s < 26) continue;
      tryHouse(x, zz, side < 0 ? -Math.PI / 2 : Math.PI / 2);
    }
  }
  const houses = new THREE.Mesh(hb.build(), pat); houses.castShadow = true; houses.receiveShadow = true; scene.add(houses);
  out.houses = houses; out.placed = placed;
  // the church: nave + tiled dome + campanile (west shore, facing the water)
  { const cb = new GB(), x = CHURCH.x, z = CHURCH.z, y = groundH(x, z) - 0.5;
    cb.box(x - 6, y, z, 26, 16, 14, -Math.PI / 2, 0xf3e6c8, { kind: 1, s: [0.2, 3, 5.5, 2] , top: false });
    cb.hip(x - 6, y + 16, z, 26, 14, -Math.PI / 2, 3.5, PAL.roofs[0]);
    cb.box(x + 2, y + 16, z, 10, 6, 10, 0, 0xf3e6c8, { top: false });
    cb.box(x - 14, y, z - 9, 6, 34, 6, 0, 0xe7c48e, { kind: 1, s: [0.7, 3, 6, 5], top: false }); cb.hip(x - 14, y + 34, z - 9, 6, 6, 0, 4.5, PAL.roofs[2]);
    const cm = new THREE.Mesh(cb.build(), pat); cm.castShadow = cm.receiveShadow = true; scene.add(cm);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(5.6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), plainMat(0x2f8a86, { rough: 0.6 }));
    dome.position.set(x + 2, y + 22, z); dome.castShadow = true; scene.add(dome);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 2.4, 8), plainMat(0xf3e6c8)); lantern.position.set(x + 2, y + 28.6, z); scene.add(lantern); out.church = cm; }
  // trees: cypresses and umbrella pines on the hills between and above the houses, olives on the terraces
  if (o.trees !== false) {
    const G = treeGeometries(), list = { cyp: [], pine: [], olive: [] };
    const occ = new Set(), key = (x, z) => `${Math.floor(x / 6)},${Math.floor(z / 6)}`;   // 6 m occupancy grid of house footprints
    placed.forEach((p) => { const r = Math.max(p.w, p.d) / 2 + 2; for (let x = p.x - r; x <= p.x + r; x += 3) for (let z = p.z - r; z <= p.z + r; z += 3) occ.add(key(x, z)); });
    const near = (x, z) => occ.has(key(x, z));
    for (let i = 0; i < 26000 && list.cyp.length + list.pine.length + list.olive.length < 5200; i++) {
      const x = -1600 + R() * 3200, z = -2300 + R() * 3700, h = groundH(x, z); if (h < 3.5) continue;
      if (Math.abs(x) < 70 && z > -60 && z < 30) continue;
      if (h < 60 && near(x, z)) continue;
      const k = R(), s = 0.8 + R() * 0.5;
      (k < 0.38 ? list.cyp : k < 0.7 ? list.pine : list.olive).push({ x, y: h - 0.3, z, s, r: R() * 6.28 });
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), cc = new THREE.Color();
    const inst = (geo, col, L, sx = 1) => { const m = new THREE.InstancedMesh(geo, plainMat(0xffffff), Math.max(1, L.length));
      L.forEach((t, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.r); m.setMatrixAt(i, m4.compose(v.set(t.x, t.y, t.z), q, sc.set(t.s * sx, t.s, t.s * sx))); m.setColorAt(i, cc.set(col).multiplyScalar(0.85 + 0.3 * hashf(t.x * 0.37 + t.z))); });
      m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
    out.trees = [inst(G.cyp, PAL.cypress, list.cyp), inst(G.pineT, 0x6a5038, list.pine), inst(G.pineC, PAL.pine, list.pine), inst(G.trunk, 0x6a5038, list.olive), inst(G.olive, PAL.olive, list.olive)];
    out.treeLists = list;
  }
  return out;
}
const hashf = (x) => { const s = Math.sin(x * 12.9898) * 43758.5453; return s - Math.floor(s); };

// ---------------------------------------------------------------- BAR DEL PORTO: the terrace, its front wall/arcade, rail, flower boxes, awning
// Returns { group, rail, flowers, awning, tables: [{x, z}], deck } (the foreground frame; kit.terraceSet wraps it)
export function buildTerrace(S, o = {}) {
  const T = TERRACE, gb = new GB(), pat = patternMaterial(), g = new THREE.Group();
  // the building under the terrace (an arcade of shops on the quay street) and the bar building behind it (3 floors)
  gb.box(0, QUAY_Y - 0.5, (T.z0 + T.z1) / 2 - 0.5, T.x1 - T.x0 + 2, T.y - QUAY_Y + 0.5, T.z1 - T.z0 + 1, Math.PI, 0xe6b35c, { kind: 1, s: [0.11, 0, 3.4, 2], top: PAL.pave, topKind: 4 });
  gb.box(0, QUAY_Y - 0.5, T.z1 + 7.5, T.x1 - T.x0 + 14, T.y - QUAY_Y + 0.5 + 9.5, 15, Math.PI, 0xec8a6c, { kind: 1, s: [0.53, 1, 3.1, 5], top: false });
  gb.hip(0, T.y + 9.5, T.z1 + 7.5, T.x1 - T.x0 + 14, 15, 0, 2.8, PAL.roofs[1]);
  for (const sx of [-1, 1]) { gb.box(sx * (T.x1 + 4), QUAY_Y - 0.5, (T.z0 + T.z1) / 2, 8, T.y - QUAY_Y + 4.5, T.z1 - T.z0 + 2, 0, sx < 0 ? 0x9fd6bd : 0xf0d26a, { kind: 1, s: [0.3 + sx * 0.1, 2, 3.2, 3], top: false });   // flanking houses
    gb.hip(sx * (T.x1 + 4), T.y + 4, (T.z0 + T.z1) / 2, 8, T.z1 - T.z0 + 2, 0, 2.0, PAL.roofs[sx < 0 ? 2 : 3]); }
  gb.box(0, T.y, T.deckZ + (T.z1 - T.deckZ) / 2, T.x1 - T.x0, T.deckH, T.z1 - T.deckZ, 0, 0xd8cab0, { top: PAL.pave, topKind: 4 });   // the bar's raised deck
  const m = new THREE.Mesh(gb.build(), pat); m.castShadow = m.receiveShadow = true; g.add(m);
  // the rail: painted iron (dark green) with a timber top rail; posts; flower boxes hung on the outside
  const ironM = plainMat(0x22402f, { rough: 0.6 }), woodM = plainMat(0x7a4a2a, { rough: 0.8 }), boxM = plainMat(0x9a5a34);
  const L = T.x1 - T.x0, rz = T.railZ;
  const add = (geo, mat, x, y, z) => { const mm = new THREE.Mesh(geo, mat); mm.position.set(x, y, z); mm.castShadow = mm.receiveShadow = true; g.add(mm); return mm; };
  add(new THREE.BoxGeometry(L, 0.07, 0.12), woodM, 0, T.y + 1.04, rz);
  add(new THREE.BoxGeometry(L, 0.04, 0.04), ironM, 0, T.y + 0.12, rz);
  { const bal = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.92, 0.03), ironM, Math.ceil(L / 0.16) + 1), m4 = new THREE.Matrix4(); let i = 0;
    for (let x = T.x0; x <= T.x1 + 1e-6; x += 0.16) bal.setMatrixAt(i++, m4.makeTranslation(x, T.y + 0.56, rz)); bal.count = i; bal.castShadow = true; g.add(bal); }
  for (let x = T.x0; x <= T.x1 + 1e-6; x += 2.0) add(new THREE.BoxGeometry(0.08, 1.06, 0.08), ironM, x, T.y + 0.53, rz);
  // flower boxes (outside the rail) with geraniums: red/pink/white blooms over green
  const R = rng(19), bloomG = new THREE.IcosahedronGeometry(0.09, 0), leafG = new THREE.IcosahedronGeometry(0.13, 0);
  const blooms = [], leaves = [];
  for (let x = T.x0 + 0.8; x < T.x1 - 0.5; x += 2.0) {
    add(new THREE.BoxGeometry(1.5, 0.28, 0.3), boxM, x + 0.75, T.y + 0.86, rz - 0.24);
    for (let k = 0; k < 26; k++) { const px = x + 0.08 + R() * 1.35, pz = rz - 0.24 + (R() - 0.5) * 0.28, py = T.y + 1.04 + R() * 0.22;
      leaves.push([px, py - 0.06, pz]); if (R() < 0.6) blooms.push([px + (R() - 0.5) * 0.1, py + 0.06, pz, R()]); } }
  const BC = [0xd8283a, 0xe8466a, 0xf2f0ea, 0xe0306a, 0xc81e2e];
  { const bm = new THREE.InstancedMesh(bloomG, plainMat(0xffffff), blooms.length), lm = new THREE.InstancedMesh(leafG, plainMat(0x3f7a34), leaves.length), m4 = new THREE.Matrix4(), c = new THREE.Color();
    blooms.forEach(([x, y, z, k], i) => { bm.setMatrixAt(i, m4.makeTranslation(x, y, z)); bm.setColorAt(i, c.set(BC[Math.floor(k * BC.length)])); });
    leaves.forEach(([x, y, z], i) => lm.setMatrixAt(i, m4.makeTranslation(x, y, z)));
    bm.castShadow = lm.castShadow = true; g.add(bm, lm); }
  // café tables (round, blue-and-white cloths) + chairs on the terrace; returned for the Builders' people
  const tables = [], clothM = plainMat(0xf2efe6), cloth2 = plainMat(0x3a78c8), legM = plainMat(0x3a3a3a, { rough: 0.5 }), chairM = plainMat(0x2f6f8a);
  for (const [x, z] of [[-10.5, -11.0], [-6.5, -10.9], [-3.4, -11.1], [-0.9, -11.3], [2.2, -11.1], [5.2, -11.0], [8.4, -11.2], [11.8, -10.9]]) {
    const top = add(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 14), (tables.length % 2 ? cloth2 : clothM), x, T.y + 0.75, z);
    add(new THREE.CylinderGeometry(0.03, 0.05, 0.73, 6), legM, x, T.y + 0.37, z);
    for (const a of [0.4, 2.2, 3.9]) { const cx = x + Math.cos(a) * 0.62, cz = z + Math.sin(a) * 0.62;
      add(new THREE.BoxGeometry(0.4, 0.05, 0.4), chairM, cx, T.y + 0.45, cz).rotation.y = -a;
      const back = add(new THREE.BoxGeometry(0.4, 0.45, 0.04), chairM, cx + Math.cos(a) * 0.2, T.y + 0.68, cz + Math.sin(a) * 0.2); back.rotation.y = Math.PI / 2 - a; }
    tables.push({ x, z, top });
  }
  // the striped awning over the bar's door (green and cream), its scalloped valance; the BAR DEL PORTO sign
  { const aw = new THREE.Group(), n = 12, w = 9 / n;
    for (let i = 0; i < n; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 3.2), plainMat(i % 2 ? 0xf3ead6 : 0x2f7a4a)); st.position.set(-4.5 + w * (i + 0.5), 0, 0); aw.add(st);
      const val = new THREE.Mesh(new THREE.BoxGeometry(w, 0.32, 0.03), plainMat(i % 2 ? 0xf3ead6 : 0x2f7a4a)); val.position.set(-4.5 + w * (i + 0.5), -0.16, -1.6); aw.add(val); }
    aw.position.set(2, T.y + T.deckH + 3.0, T.z1 + 0.6 - 1.6); aw.rotation.x = -0.32; aw.traverse((mm) => { if (mm.isMesh) mm.castShadow = true; }); g.add(aw); g.userData.awning = aw; }
  S.scene.add(g);
  const sign = signBoard(S, 'BAR DEL PORTO', new THREE.Vector3(2, T.y + T.deckH + 4.3, T.z1 - 0.05), 5.2, 0.9, Math.PI, { bg: '#1f3a5f', fg: '#f3ead6' });
  return { group: g, tables, sign, awning: g.userData.awning };
}
