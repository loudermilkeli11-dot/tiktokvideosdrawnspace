// earth-stops group B: N6, the coast band from orbit (s07_coast, s08_earth). A transparent shell just above space.js's Earth
// (a child of SP.earth, so it turns with it), reading space.js's own coast distance field (SP.EU.coast, km, + on land).
// The law: the sea keeps moving EAST at V relative to the stopped ground. So it piles into every coast whose land lies EAST
// of the water (the coast-SDF gradient points east: the west coasts of continents) and pulls away from every coast whose
// land lies WEST of it (the gradient points west: east coasts, where the shelf is laid bare).
//   hit coasts:   a white surge line at the shore; white water pushed inland by drift(e) (km, the law: 1.35 km at e 3.5,
//                 1.9 km at 5.0), floored at minPx pixels so it never vanishes from far orbit (DRAMATIZATION of width,
//                 like giant-lens's char line); a band of torn white water offshore (illustrative width).
//   drained coasts: a pale strip of wet, bared shelf offshore, as wide as the drift.
//   everywhere:   faint east-west whitecap streaks over the moving ocean; a faint tan dust veil streaked east over land.
// createCoastBand(S, SP, { seg, minPx 2.5, seaK 5, dustI 1, streakI 1 }) -> { mesh, U, update(e, cloudShift) }
import { THREE } from '@engine/engine.js';
import { RE } from '@engine/space.js';
import { NOISE } from '@engine/glsl.js';
import { V } from './story.js';

export function createCoastBand(S, SP, o = {}) {
  const U = { coast: SP.EU.coast, brc: SP.EU.brc, sunDir: SP.EU.sunDir, sunI: SP.EU.sunI, cloudsI: SP.EU.cloudsI, cloudShift: { value: 0 },
    e: { value: 0 }, V: { value: V }, minPx: { value: o.minPx ?? 2.5 }, seaK: { value: o.seaK ?? 5 }, dustI: { value: o.dustI ?? 1 }, streakI: { value: o.streakI ?? 1 },
    texW: { value: o.coastW ?? 4096 }, gain: { value: 1 } };
  const seg = o.seg ?? [192, 96];
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vO;
      void main(){ vUv = uv; vO = position; vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${NOISE} uniform sampler2D coast, brc; uniform vec3 sunDir; uniform float sunI, cloudsI, cloudShift, e, V, minPx, seaK, dustI, streakI, texW, gain;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vO;
      float D(vec2 uv){ return texture2D(coast, uv).r; }
      void main(){
        vec3 n = normalize(vN); float mu = dot(n, normalize(sunDir)); float lit = max(mu*0.9 + 0.1, 0.)*sunI;
        if (mu < -0.15) discard;
        float d = D(vUv);
        float lat = (vUv.y - 0.5)*3.14159265, cl = max(cos(lat), 0.05);
        float du = 3./texW, dv = 3./(texW*0.5);
        float gE = (D(vUv + vec2(du, 0.)) - D(vUv - vec2(du, 0.)))/(2.*du*6.2831853*${RE}.*cl);
        float gN = (D(vUv + vec2(0., dv)) - D(vUv - vec2(0., dv)))/(2.*dv*3.14159265*${RE}.);
        float east = gE/max(length(vec2(gE, gN)), 1e-4);                        // +1: land lies east of the water (the sea runs INTO it)
        float hit = smoothstep(0.12, 0.5, east), drain = smoothstep(0.12, 0.5, -east);
        // only real seas and real land: 160 km upwind of a hit coast must be open water (no lakes), 45 km inland must be land
        // (no specks of islands); mirrored for the drained coasts
        float kmU = 1./(6.2831853*${RE}.*cl);
        hit *= (1. - smoothstep(-60., -20., D(vUv - vec2(160.*kmU, 0.))))*(1. - smoothstep(-25., -5., D(vUv - vec2(50.*kmU, 0.))))*smoothstep(5., 25., D(vUv + vec2(45.*kmU, 0.)));
        drain *= (1. - smoothstep(-60., -20., D(vUv + vec2(160.*kmU, 0.))))*smoothstep(5., 25., D(vUv - vec2(45.*kmU, 0.)));
        float fp = length(fwidth(vW)) + 1e-4;                                   // km per pixel
        float dr = V*e/1000.;                                                   // km the sea has travelled (the law)
        float wIn = max(dr, minPx*fp), wSea = max(seaK*dr, minPx*1.6*fp);
        float wob = (vn3(vO*0.03) - 0.5)*0.6 + (vn3(vO*0.12 + 3.) - 0.5)*0.4;
        float dd = d + wob*min(wIn, 3.)*0.8;
        // hit coasts: the shore line, white water inland to wIn, torn white water out to sea
        float line = exp(-dd*dd/(0.25*wIn*wIn + 0.3*fp*fp));
        float inl = (1. - smoothstep(wIn*0.6, wIn*1.15, dd))*step(0., dd);
        float tear = smoothstep(0.3, 0.75, vn3(vec3(vO.x*0.08 - e*1.5, vO.y*0.25, vO.z*0.25)));
        float sea = (1. - smoothstep(wSea*0.4, wSea, -dd))*step(dd, 0.)*(0.35 + 0.65*tear);
        float surfN = 0.55 + 0.6*vn3(vO*0.045 + vec3(e*0.6, 0., 0.)) + 0.25*vn3(vO*0.2);       // brighter and darker runs of surf
        float foam = hit*clamp(line*1.25*surfN + inl*0.9 + sea*0.7, 0., 1.);
        // drained coasts: the bared shelf, out to the drift distance (floored), wet and pale
        float bare = drain*(1. - smoothstep(wIn*0.7, wIn*1.2, -dd))*step(dd, 0.);
        // the whole ocean moving east: faint whitecap streaks, stretched east-west (lon), sliding east
        float lon = atan(vO.z, -vO.x);
        float stq = smoothstep(0.66, 0.92, vn3(vec3(lon*${RE}.*cl*0.012 - e*4., lat*${RE}.*0.12, 1.7)))*(1. - smoothstep(-30., 0., d))*0.045*streakI*smoothstep(25., 6., fp);
        // a tan dust veil over land, streaked east
        float dv2 = smoothstep(0.38, 0.8, fbm3(vec3(lon*${RE}.*cl*0.003 - e*0.8, lat*${RE}.*0.012, 4.1)))*smoothstep(0., 40., d)*0.35*dustI;
        vec3 white = vec3(0.93, 0.96, 1.0)*lit*1.12, shelf = vec3(0.62, 0.56, 0.46)*lit, tan = vec3(0.80, 0.64, 0.45)*lit;
        vec3 col = white; float a = max(foam, stq);
        if (bare > a) { col = shelf; a = bare*0.9; }
        if (dv2 > a) { col = tan; a = dv2; }
        float clouds = texture2D(brc, vUv + vec2(cloudShift, 0.)).b*cloudsI;
        a *= (1. - 0.9*clouds)*smoothstep(-0.15, 0.05, mu)*gain;
        gl_FragColor = vec4(col, clamp(a, 0., 1.)); }` });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(RE * 1.0002, seg[0], seg[1]), mat);
  mesh.renderOrder = 2; SP.earth.add(mesh);
  return { mesh, U, update(e, cloudShift) { U.e.value = e; U.cloudShift.value = cloudShift; } };
}
// clouds dragged east by the moving air: space.js samples clouds at uv + cloudShift, so a falling shift moves them east.
// DRAMATIZATION (rate): the real air moves 1.9 km in 5 s; this shows ~120 km so the drag reads from orbit.
export const cloudShiftAt = (e) => 0.02 - 0.0015 * e;
