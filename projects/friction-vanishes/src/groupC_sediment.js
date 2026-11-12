// friction-vanishes GROUP C helper (s08_orbit). N4: every coast bleeds brown sediment into the sea, desert dunes smeared flat.
// A project-side patch of space.js's Earth ShaderMaterial (string replace before the first compile; no engine edit).
//   EU.sed 0..1     brown plume tint on the oceans along every coast (coast SDF in km from space.js `coast: true`, + noise)
//   EU.sedR (km)    how far the plumes reach out to sea (they keep spreading after the flow stopped)
//   EU.dunes 0..1   desert contrast flattened (dunes smeared: the day map's fine detail is replaced by its blurred mip)
import { THREE } from '@engine/engine.js';
import { COL } from './kit.js';

export function patchSediment(SP, o = {}) {
  const m = SP.earth.material, EU = SP.EU;
  Object.assign(EU, { sed: { value: o.sed ?? 1 }, sedR: { value: o.sedR ?? 120 }, dunes: { value: o.dunes ?? 1 },
    sedCol: { value: new THREE.Color(COL.sediment) } });
  const rep = (a, b) => { if (!m.fragmentShader.includes(a)) throw new Error('groupC sediment patch missed: ' + a); m.fragmentShader = m.fragmentShader.replace(a, b); };
  rep('uniform float cityI,', 'uniform float sed, sedR, dunes; uniform vec3 sedCol;\nuniform float cityI,');
  rep('vec3 col = dc * max(mu, 0.) * sunI;', `
        if (dunes > 0.) { vec3 bl = texture2D(day, vUv, 4.0).rgb; float lum = dot(dc, vec3(0.3, 0.55, 0.15));
          float des = (1. - ocean) * smoothstep(0.16, 0.30, lum) * smoothstep(0.015, 0.07, dc.r - dc.b);
          dc = mix(dc, bl, des * dunes * 0.85); }
        if (sed > 0.) { float d = texture2D(coast, vUv).r;                                   // km to the coast (< 0 at sea)
          float nA = fbm3(vO*0.0035 + 3.), nB = fbm3(vO*0.011 + 7.), nC = vn3(vO*0.045);
          float reach = sedR * (0.25 + 1.6*nA*nA);
          float plume = smoothstep(-reach, -reach*0.1, d) * smoothstep(0.30, 0.62, nB + 0.18 + 0.25*smoothstep(-reach*0.5, 0., d));
          plume = max(plume, smoothstep(-0.18*sedR, 0., d)*0.9);                           // a continuous brown hem on every shore
          plume *= ocean * step(d, 1.) * sed * (0.8 + 0.2*nC);
          vec3 sc = mix(sedCol, sedCol*vec3(0.62, 0.66, 0.55), smoothstep(0.35, 0.7, nB));  // darker, greener where it thins out
          dc = mix(dc, sc*(1.25 - 0.45*smoothstep(-reach, 0., -d)), clamp(plume, 0., 0.94)); }
        vec3 col = dc * max(mu, 0.) * sunI;`);
  // the brown water is not a mirror: dim the glint where the sediment is thick
  rep('* ocean * sunI * 0.5 * step(0., mu)', '* ocean * sunI * 0.5 * step(0., mu) * (1. - 0.7*sed*smoothstep(-sedR*0.3, 0., texture2D(coast, vUv).r))');
  m.needsUpdate = true;
  return EU;
}
