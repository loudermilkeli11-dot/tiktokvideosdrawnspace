// The Moon: live-shaded sphere from NASA LROC colour + LOLA-derived normals/relief.
// Lommel-Seeliger BRDF, normal-mapped craters, horizon-march terminator shadows, earthshine, low-altitude haze.
import * as THREE from 'three';
const R_KM = 1737.4, RELIEF_KM = 19.67;
// 12 fixed chunk seeds on the sphere (Fibonacci + jitter): shared by the crack pattern and breakup.js
export function defaultCells(n = 12, seed = 3) {
  const out = []; for (let i = 0; i < n; i++) { const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996 + seed;
    out.push(new THREE.Vector3(Math.cos(a) * r + 0.15 * Math.sin(i * 7.1), y, Math.sin(a) * r + 0.15 * Math.cos(i * 3.3)).normalize()); }
  return out;
}
export function createMoon(S, o = {}) {
  const hi = o.res !== '2k';
  const map = hi ? S.tex('moon_color_8k.jpg', { repeat: true }) : S.tex('moon_color_2k.jpg', { repeat: true });
  map.wrapT = THREE.ClampToEdgeWrapping;
  const nrm = S.tex('moon_normal_4k.jpg', { srgb: false, repeat: true }); nrm.wrapT = THREE.ClampToEdgeWrapping;
  const rel = S.tex('moon_relief_4k.jpg', { srgb: false, repeat: true }); rel.wrapT = THREE.ClampToEdgeWrapping;
  const U = {
    map: { value: map }, nrm: { value: nrm }, rel: { value: rel },
    sunDir: { value: new THREE.Vector3(1, 0.2, 0.3).normalize() },   // world-space direction TO the sun
    earthDir: { value: new THREE.Vector3(0, 0, 1) },                  // world-space direction TO the earth (earthshine)
    sunI: { value: o.sunI ?? 3.2 }, earthshine: { value: o.earthshine ?? 0.012 },
    normalScale: { value: o.normalScale ?? 2.2 }, reliefScale: { value: o.reliefScale ?? 2.0 }, shadowOn: { value: o.shadows ?? 1 },
    lambertMix: { value: o.lambertMix ?? 0.25 }, albedo: { value: o.albedo ?? 1.0 }, tint: { value: new THREE.Color(o.tint ?? 0xfff6ea) },
    haze: { value: 0 }, hazeLift: { value: o.hazeLift ?? 0.004 }, hazeColor: { value: new THREE.Color(0xff9a5a) }, horizonY: { value: 0 }, hazeH: { value: 50 },
    glow: { value: 0 },
    // breakup: crack = 0..1 spread of the fracture network (from the tidal axis outward); cell >= 0 renders one chunk only
    crack: { value: 0 }, crackW: { value: o.crackW ?? 0.012 }, crackGlow: { value: o.crackGlow ?? 0.35 },
    cells: { value: o.cells || defaultCells() }, cell: { value: -1 }, airCol: { value: new THREE.Color(0, 0, 0) },
  };
  // airlight: the atmosphere in FRONT of the Moon adds sky light, so the unlit side shows sky, not a black disc.
  // Additive blending models that (sky behind is replaced by moon + air in front ~ sky + moon). Occluders still depth-test.
  const air = o.airlight ?? true;   // breakup chunks use airlight:false (opaque, so interiors occlude) + uniform airCol
  const mat = new THREE.ShaderMaterial({
    uniforms: U, side: o.side ?? THREE.FrontSide, ...(air ? { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false } : {}),
    vertexShader: `varying vec2 vUv; varying vec3 vObj; varying vec3 vWP; varying mat3 vM;
      void main(){ vUv = uv; vObj = normalize(position); vec4 wp = modelMatrix*vec4(position,1.); vWP = wp.xyz;
        vM = mat3(normalize(modelMatrix[0].xyz), normalize(modelMatrix[1].xyz), normalize(modelMatrix[2].xyz));
        gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform float crack, crackW, crackGlow, cell; uniform vec3 cells[NCELL]; uniform vec3 airCol;
      float h31(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }
      vec3 h33(vec3 p){ return vec3(h31(p), h31(p+17.3), h31(p+41.7)); }
      // fine fracture network: 3D cellular edges (F2-F1)
      float fineCracks(vec3 p){ vec3 i = floor(p), f = fract(p); float d1 = 9., d2 = 9.;
        for (int z=-1; z<=1; z++) for (int y=-1; y<=1; y++) for (int x=-1; x<=1; x++){ vec3 g = vec3(x,y,z); vec3 r = g + h33(i+g) - f; float d = dot(r,r);
          if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
        return sqrt(d2) - sqrt(d1); }
      uniform sampler2D map, nrm, rel; uniform vec3 sunDir, earthDir, tint, hazeColor; uniform float hazeLift, sunI, earthshine, normalScale, reliefScale, shadowOn, lambertMix, albedo, haze, horizonY, hazeH;
      varying vec2 vUv; varying vec3 vObj; varying vec3 vWP; varying mat3 vM;
      const float PI = 3.14159265; const float RK = ${R_KM.toFixed(1)}; const float RELK = ${RELIEF_KM};
      float H(vec2 uv){ return texture2D(rel, uv).r * RELK * reliefScale; }
      void main(){
        vec3 Uo = vObj;
        // nearest chunk seed (angular) -> chunk id + edge distance between the two nearest cells
        float b1 = -2., b2 = -2.; float id = 0.;
        for (int k = 0; k < NCELL; k++) { float d = dot(Uo, cells[k]); if (d > b1) { b2 = b1; b1 = d; id = float(k); } else if (d > b2) b2 = d; }
        if (cell >= 0. && abs(id - cell) > 0.5) discard;
        float edge = (b1 - b2);                                   // 0 on a chunk boundary
        float reach = 1. - abs(Uo.x);                              // 0 on the tidal axis (+X faces Earth), 1 on the limb ring
        float grow = smoothstep(reach - 0.08, reach + 0.02, crack * 1.25);
        float big = (1. - smoothstep(crackW*0.5, crackW, edge)) * grow;
        float fine = (1. - smoothstep(0.012, 0.03, fineCracks(Uo*5.5 + 3.1))) * grow * smoothstep(0.2, 0.7, crack) * smoothstep(0.22, 0.04, edge) * 0.85;
        float crackM = max(big, fine);
        float rim = (1. - smoothstep(crackW, crackW*2.2, edge)) * grow - big;
        if (!gl_FrontFacing) {                                    // broken interior of a separated chunk: textured, lit rock
          vec3 Lw = normalize(sunDir); vec3 nI = -normalize(vM*Uo);
          float l = 0.12 + 0.88*max(dot(nI, Lw)*0.6 + 0.4, 0.);
          vec3 rockA = texture2D(map, vec2(vUv.x*3.7 + vUv.y*1.3, vUv.y*2.9)).rgb * 0.32 + texture2D(rel, vUv*5.).r * 0.08;
          float strata = 0.75 + 0.25*sin(length(Uo)*0. + dot(Uo, cells[int(id)])*60.);
          gl_FragColor = vec4(rockA * strata * l * sunI * 0.55 + vec3(1.0,0.4,0.1)*crackGlow*0.05 + airCol*0.6, 1.); return; } vec3 Eo = normalize(cross(abs(Uo.y) > 0.995 ? vec3(1.,0.,0.) : vec3(0.,1.,0.), Uo)); vec3 No = cross(Uo, Eo);
        vec3 U = normalize(vM*Uo), E = normalize(vM*Eo), N = normalize(vM*No);
        vec3 tn = texture2D(nrm, vUv).xyz*2.-1.; tn.xy *= normalScale;
        vec3 n = normalize(E*tn.x + N*tn.y + U*tn.z);
        vec3 V = normalize(cameraPosition - vWP); vec3 L = normalize(sunDir);
        float mu0 = max(dot(n, L), 0.), mu = max(dot(n, V), 0.);
        float ls = mu0/(mu0+mu+1e-4) * 2.0;
        float brdf = mix(ls, mu0, lambertMix);
        // horizon-march self-shadowing (long terminator shadows)
        float vis = 1.;
        float sinE = dot(U, L);
        if (shadowOn > 0.5 && sinE > -0.05 && sinE < 0.55) {
          vec2 dt = normalize(vec2(dot(L,E), dot(L,N)) + 1e-6);
          float lat = (vUv.y-0.5)*PI; float cl = max(cos(lat), 0.08);
          float h0 = H(vUv); float tanE = sinE/sqrt(max(1.-sinE*sinE, 1e-4));
          float d = 2.6;
          for (int k = 0; k < 16; k++) {
            vec2 uv2 = vUv + vec2(dt.x*d/(2.*PI*RK*cl), dt.y*d/(PI*RK));
            float h = H(uv2) - d*d/(2.*RK);
            float over = h - (h0 + d*tanE);
            vis = min(vis, clamp(1. - over/(0.35 + d*0.02), 0., 1.));
            d *= 1.32;
          }
        }
        vec3 alb = texture2D(map, vUv).rgb * albedo * tint;
        vec3 col = alb * brdf * vis * sunI * smoothstep(-0.07, 0.03, sinE);
        col *= 1. - crackM * 0.97;                                  // dark fracture cores
        col += alb * max(rim, 0.) * brdf * sunI * 0.9;              // sunlit cliff edges along the cracks
        col += vec3(1.0, 0.42, 0.1) * crackGlow * crackM * (0.3 + 0.7*big);  // hot glow deep in the cracks (dramatization)
        // earthshine (night side), soft
        float mE = max(dot(n, normalize(earthDir)), 0.);
        col += alb * earthshine * mE/(mE+mu+1e-3) * 2. * vec3(0.75,0.85,1.0);
        // haze near horizon (atmospheric extinction + scatter): reddened & lifted
        float hz = haze * exp(-max(vWP.y - horizonY, 0.)/hazeH);
        col = mix(col, col*vec3(1.0,0.66,0.42), clamp(hz,0.,1.)); col += hazeColor*hazeLift*clamp(hz,0.,1.);
        gl_FragColor = vec4(col + airCol, 1.);
      }`,
    defines: { NCELL: 12 },
  });
  const geo = new THREE.SphereGeometry(1, o.seg ?? 192, Math.round((o.seg ?? 192) / 2));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  // orient: nearside (texture centre, lon 0, which is +X in SphereGeometry) faces `dir`; north stays up
  mesh.faceNearSide = (dir, libration = [0, 0]) => {
    const d = dir.clone().normalize();
    const yaw = Math.atan2(-d.z, d.x) + libration[0]; // rotate +X onto d (around Y)
    mesh.rotation.set(0, 0, 0); mesh.rotateY(yaw); mesh.rotateZ(Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)) + libration[1]);
  };
  mesh.U = U;
  return mesh;
}
// Sun direction for a given illuminated fraction phase angle (deg), relative to view dir (moon->camera)
export function sunForPhase(toCam, phaseDeg, up = new THREE.Vector3(0, 1, 0), tiltDeg = 0) {
  const v = toCam.clone().normalize(); const side = new THREE.Vector3().crossVectors(up, v).normalize();
  const a = THREE.MathUtils.degToRad(phaseDeg);
  const s = v.clone().multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a));
  return s.applyAxisAngle(v, THREE.MathUtils.degToRad(tiltDeg)).normalize();
}
