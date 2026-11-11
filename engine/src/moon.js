// The Moon: live-shaded sphere from NASA LROC colour + LOLA-derived normals/relief.
// Lommel-Seeliger BRDF, normal-mapped craters, horizon-march terminator shadows, earthshine, low-altitude haze.
import * as THREE from 'three';
const R_KM = 1737.4, RELIEF_KM = 19.67;
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
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: `varying vec2 vUv; varying vec3 vObj; varying vec3 vWP; varying mat3 vM;
      void main(){ vUv = uv; vObj = normalize(position); vec4 wp = modelMatrix*vec4(position,1.); vWP = wp.xyz;
        vM = mat3(normalize(modelMatrix[0].xyz), normalize(modelMatrix[1].xyz), normalize(modelMatrix[2].xyz));
        gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform sampler2D map, nrm, rel; uniform vec3 sunDir, earthDir, tint, hazeColor; uniform float hazeLift, sunI, earthshine, normalScale, reliefScale, shadowOn, lambertMix, albedo, haze, horizonY, hazeH;
      varying vec2 vUv; varying vec3 vObj; varying vec3 vWP; varying mat3 vM;
      const float PI = 3.14159265; const float RK = ${R_KM.toFixed(1)}; const float RELK = ${RELIEF_KM};
      float H(vec2 uv){ return texture2D(rel, uv).r * RELK * reliefScale; }
      void main(){
        vec3 Uo = vObj; vec3 Eo = normalize(cross(vec3(0.,1.,0.), Uo) + vec3(1e-6,0.,0.)); vec3 No = cross(Uo, Eo);
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
        vec3 col = alb * brdf * vis * sunI;
        // earthshine (night side), soft
        float mE = max(dot(n, normalize(earthDir)), 0.);
        col += alb * earthshine * mE/(mE+mu+1e-3) * 2. * vec3(0.75,0.85,1.0);
        // haze near horizon (atmospheric extinction + scatter): reddened & lifted
        float hz = haze * exp(-max(vWP.y - horizonY, 0.)/hazeH);
        col = mix(col, col*vec3(1.0,0.66,0.42), clamp(hz,0.,1.)); col += hazeColor*hazeLift*clamp(hz,0.,1.);
        gl_FragColor = vec4(col, 1.);
      }`,
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
