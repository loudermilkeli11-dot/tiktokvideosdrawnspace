// gravity-flip: the oceans, the clouds and the air lifting off the planet as concentric shells (km units, Earth at the
// origin, as in space.js). One draw: a back-faced bounding sphere whose fragment shader ray-traces the layers exactly
// (near and far crossings, the planet occluding what is behind it) and composites them front to back:
//   - the water sheet at RE + h: a shimmering translucent blue layer with continent-shaped holes (the ocean mask),
//     fractal edges and a foam rim, sun glitter from noise ripples, a deep-blue body;
//   - the cloud deck at RE + h + cloudH (the cloud map, with fine detail for close views);
//   - the air at RE + h .. RE + h + airH: a faint blue glow (chord length through the layer), orange at the terminator.
// It is drawn in the opaque pass (renderOrder 1, no depth test, analytic occlusion), so stations and planes drawn later
// sit correctly in front of it.   const SH = createShell(S, SP);  SH.update(S, t, { h })   (h in km, from heightAt / 1000)
import * as THREE from 'three';
import { NOISE } from './glsl.js';
import { RE } from './space.js';

export function createShell(S, SP, o = {}) {
  const U = {
    brc: { value: SP.EU.brc.value }, day: { value: SP.EU.day.value }, sunDir: SP.EU.sunDir, sunI: SP.EU.sunI,
    h: { value: 0 }, cloudH: { value: o.cloudH ?? 4 }, airH: { value: o.airH ?? 70 }, time: { value: 0 },
    waterI: { value: o.waterI ?? 1 }, cloudI: { value: o.cloudI ?? 1 }, airI: { value: o.airI ?? 1 }, glint: { value: o.glint ?? 1 },
    clear: { value: o.clear ?? 0 }, clearDir: { value: new THREE.Vector3(0, 1, 0) }, clearR: { value: 0.02 },   // keep a cloud-free patch (e.g. around a station)
    toLocal: { value: new THREE.Matrix3() }, fresh: { value: 0 },   // fresh 1: the sheet still looks exactly like the sea it was
  };
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.BackSide, transparent: false, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    vertexShader: `varying vec3 vW; void main(){ vW = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `${NOISE}
      uniform sampler2D brc, day; uniform vec3 sunDir, clearDir; uniform mat3 toLocal;
      uniform float sunI, h, cloudH, airH, time, waterI, cloudI, airI, glint, clear, clearR, fresh; varying vec3 vW;
      const float RE = ${RE.toFixed(1)};
      vec2 hitS(vec3 C, vec3 d, float R){ float b = dot(C, d), c = dot(C, C) - R*R, disc = b*b - c; if (disc < 0.) return vec2(1e9, -1e9); float s = sqrt(disc); return vec2(-b - s, -b + s); }
      vec2 dirUV(vec3 l){ return vec2(fract(atan(l.z, -l.x)*0.15915494), 1. - acos(clamp(l.y, -1., 1.))*0.31830989); }
      vec4 texS(sampler2D t, vec2 uv){ vec2 u2 = vec2(fract(uv.x + 0.5) - 0.5, uv.y); vec2 dx = dFdx(uv), dy = dFdy(uv), dx2 = dFdx(u2), dy2 = dFdy(u2);
        if (abs(dx2.x) + abs(dy2.x) < abs(dx.x) + abs(dy.x)) { dx = dx2; dy = dy2; } return textureGrad(t, uv, dx, dy); }
      // fbm with octaves faded below the pixel footprint fp (km): crisp up close, calm from far
      float dfbm(vec3 p, float lam, float fp){ float s = 0., a = 0.5, w = 0.; for (int i = 0; i < 8; i++){ float k = smoothstep(1.2*fp, 3.5*fp, lam); s += a*k*(vn3(p/lam) - 0.5); w += a; p += vec3(7.1, 3.3, 5.9)*lam; lam *= 0.5; a *= 0.6; } return s/w*2.; }
      // one water crossing at P (normal n points out of the planet; front = seen from above)
      vec4 water(vec3 P, vec3 d, float fp, float front){
        vec3 l = toLocal * normalize(P); vec2 uv = dirUV(l); vec3 q = l*RE;
        float g = texS(brc, uv).g; float e = dfbm(q, 14., fp*0.6);
        float m = mix(1. - smoothstep(0.40, 0.60, g + e*0.55), 1. - smoothstep(0.15, 0.5, g), fresh);   // the ocean, with a fractal coast edge
        if (m < 0.002) return vec4(0.);
        vec3 n = normalize(P), L = normalize(sunDir);
        // ripples: layered noise slopes animate (the shimmer); finer ones fade with distance
        vec3 rq = q + vec3(0., time*3., time*2.);
        float r1 = dfbm(rq, 6., fp), r2 = dfbm(rq + 17., 6., fp);
        vec3 t1 = normalize(cross(n, vec3(0.31, 0.93, 0.17))), t2 = cross(n, t1);
        vec3 nn = normalize(n + (t1*r1 + t2*r2)*0.32);
        float mu = dot(n, L), lit = smoothstep(-0.15, 0.25, mu);
        vec3 deep = vec3(0.006, 0.05, 0.19), shallow = vec3(0.03, 0.2, 0.32);
        vec3 oc = texS(day, uv).rgb;                                          // the sea's own tint where it used to be
        float shelf = smoothstep(0.05, 0.16, oc.g);
        vec3 body = mix(deep, shallow, shelf*0.6 + 0.15*(dfbm(q + 40., 60., fp) + 0.5)) * (0.25 + 1.6*max(mu, 0.)) * sunI;
        float vdn = abs(dot(nn, -d)); float fr = 0.02 + 0.98*pow(1. - vdn, 5.);
        vec3 rf = reflect(d, nn); float sp = pow(max(dot(rf, L), 0.), 260.) * 6. + pow(max(dot(rf, L), 0.), 18.) * 0.12;
        float edge = smoothstep(0.0, 0.12, m) * (1. - smoothstep(0.22, 0.5, m));   // foam along the sheet's torn edges
        vec3 c = body * (front > 0.5 ? 1. : 0.6) + vec3(1.0, 0.93, 0.82) * sp * sunI * glint * step(0., mu) * front + vec3(0.4, 0.6, 0.8) * fr * lit * 0.25 * sunI;
        c += vec3(0.85, 0.92, 1.0) * edge * 1.3 * max(mu, 0.05) * sunI * (1. - fresh);
        float a = clamp((0.5 + 0.45*fr + 0.7*edge*(1. - fresh)) * m, 0., 1.) * waterI;
        if (fresh > 0.) { vec3 H2 = normalize(L - d); vec3 sea = oc * max(mu, 0.) * sunI + vec3(1.0, 0.9, 0.75) * pow(max(dot(n, H2), 0.), 900.) * sunI * 0.5 * step(0., mu);
          c = mix(c, sea, fresh); a = mix(a, m, fresh) * waterI; }
        return vec4(c * a, a); }
      vec4 cloud(vec3 P, vec3 d, float fp){
        vec3 l = toLocal * normalize(P); vec2 uv = dirUV(l); vec3 q = l*RE;
        float c = texS(brc, uv).b; float dn = dfbm(q, 25., fp);
        c = smoothstep(0.12, 0.75, c + dn*0.35*c + dn*0.05);
        c *= 1. - clear * (1. - smoothstep(clearR*0.6, clearR, length(l - clearDir)));
        if (c < 0.003) return vec4(0.);
        vec3 n = normalize(P); float mu = dot(n, normalize(sunDir));
        vec3 col = vec3(1.) * (max(mu*0.9 + 0.1, 0.) * (0.75 + 0.35*dn) + 0.02) * sunI * 1.05;
        col = mix(col, col * vec3(1.0, 0.55, 0.35), exp(-mu*mu*60.) * 0.6);
        float a = clamp(c * 0.95, 0., 1.) * cloudI; return vec4(col * a, a); }
      void main(){
        vec3 C = cameraPosition, d = normalize(vW - C);
        float tP = hitS(C, d, RE).x; float tEnd = tP > 0. ? tP : 1e9;
        float Rw = RE + h + 0.03, Rc = Rw + cloudH, Ra = Rw + airH;
        vec2 tw = hitS(C, d, Rw), tc = hitS(C, d, Rc), ta = hitS(C, d, Ra);
        // pixel footprint (km per pixel) at the near water crossing
        float tn = tw.x > 0. ? tw.x : max(tw.y, 1.); float fp = max(tn * length(fwidth(d)), 1e-3);
        float fpc = max((tc.x > 0. ? tc.x : max(tc.y, 1.)) * length(fwidth(d)), 1e-3);
        vec4 acc = vec4(0.);
        // front to back: near cloud, near water, (planet), far water, far cloud
        if (cloudI > 0. && tc.x > 0. && tc.x < tEnd) { vec4 c = cloud(C + d*tc.x, d, fpc); acc += (1. - acc.a) * c; }
        if (waterI > 0. && tw.x > 0. && tw.x < tEnd) { vec4 c = water(C + d*tw.x, d, fp, 1.); acc += (1. - acc.a) * c; }
        if (waterI > 0. && tw.y > 0. && tw.y < tEnd && tw.x < tw.y) { vec4 c = water(C + d*tw.y, d, fp, 0.); acc += (1. - acc.a) * c; }
        if (cloudI > 0. && tc.y > 0. && tc.y < tEnd && tc.x < tc.y) { vec4 c = cloud(C + d*tc.y, d, fpc) * 0.8; acc += (1. - acc.a) * c; }
        // air: chord through the shell between Rw and Ra (ends at the planet), lit by the sun at the chord's middle
        if (airI > 0. && ta.y > 0.) {
          float a0 = max(ta.x, 0.), a1 = min(ta.y, tEnd); float inner = 0.;
          if (tw.y > 0. && tw.x < tw.y) inner = max(0., min(tw.y, a1) - max(tw.x, a0));
          float ch = max(a1 - a0 - inner, 0.);
          vec3 M = normalize(C + d*(a0 + a1)*0.5); float mu = dot(M, normalize(sunDir));
          vec3 ac = mix(vec3(1.0, 0.42, 0.18), vec3(0.28, 0.52, 1.0), smoothstep(-0.12, 0.25, mu)) * smoothstep(-0.35, 0.05, mu);
          float glow = 1. - exp(-ch / (airH * 9.));
          float inside = 1. - smoothstep(Ra - 2., Ra + 2., length(C));             // the camera is in the air: dark sky overhead
          acc.rgb += (1. - acc.a*0.6) * ac * glow * sunI * mix(0.42, 0.12, inside) * airI; }
        gl_FragColor = acc; }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), mat); mesh.frustumCulled = false; mesh.renderOrder = 1; S.scene.add(mesh);
  const qi = new THREE.Quaternion(), m4 = new THREE.Matrix4();
  return { mesh, U,
    update(S, t, p = {}) {
      if (p.h !== undefined) U.h.value = p.h;
      U.time.value = t;
      const R = RE + U.h.value + Math.max(U.airH.value, U.cloudH.value) + 5; mesh.scale.setScalar(R);
      qi.copy(SP.earth.quaternion).invert(); U.toLocal.value.setFromMatrix4(m4.makeRotationFromQuaternion(qi));
      mesh.visible = U.h.value > 0.0005 || (p.show ?? false);
    } };
}
