// Procedural night/twilight sky: gradient by sun elevation, sharp stars, Milky Way, moon glow, town light-pollution dome.
import * as THREE from 'three';
import { NOISE } from './glsl.js';
export function createSky(S, o = {}) {
  const U = {
    sunDir: { value: new THREE.Vector3(0, -0.3, -1).normalize() }, moonDir: { value: new THREE.Vector3(0, 0.2, -1).normalize() },
    moonAng: { value: 0.0045 },  // angular radius (rad) of the moon disc (drives glow size)
    moonLight: { value: 0.0 },   // how much the moon lights the sky (grows as it nears)
    stars: { value: o.stars ?? 1.0 }, milky: { value: o.milky ?? 0.6 }, pxAng: { value: 0.0004 }, time: { value: 0 },
    nightZen: { value: new THREE.Color(o.nightZen ?? 0x01030a) }, nightHor: { value: new THREE.Color(o.nightHor ?? 0x0a1426) },
    duskCol: { value: new THREE.Color(o.duskCol ?? 0xff7a3a) }, dayZen: { value: new THREE.Color(0x2a62c4) }, dayHor: { value: new THREE.Color(0x9cc4ec) },
    lpDir: { value: new THREE.Vector3(-1, 0, -0.3).normalize() }, lpCol: { value: new THREE.Color(o.lpCol ?? 0xff9a50) }, lp: { value: o.lp ?? 0.35 },
    mwN: { value: new THREE.Vector3(0.45, 0.35, 0.82).normalize() }, exposure: { value: o.exposure ?? 1 },
    // see-through Earth (0 = off): below the horizon show the far side's night sky + the glowing iron core at the nadir
    thru: { value: 0 }, coreCol: { value: new THREE.Color(1.0, 0.6, 0.3) }, coreI: { value: 40 }, coreAng: { value: Math.asin(3480 / 6371) }, skyGlow: { value: 0.004 },
    tintAll: { value: new THREE.Color(0xffffff) }, beltCol: { value: new THREE.Color(o.beltCol ?? 0xc98a96) }, beltI: { value: o.beltI ?? 0.35 },
    // high altitude (all 0 = off): dip = horizon depression (rad); altI 0..1 = steeper day gradient + bright limb haze band; sunDisc = sun disc + aureole
    dip: { value: 0 }, altI: { value: 0 }, sunDisc: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.BackSide, depthWrite: false, depthTest: false,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize((modelMatrix*vec4(position,0.)).xyz); vec4 p = projectionMatrix*viewMatrix*vec4(cameraPosition + vD*1000., 1.); gl_Position = p.xyww; }`,
    fragmentShader: `${NOISE}
      uniform vec3 beltCol; uniform float beltI; uniform vec3 sunDir, moonDir, nightZen, nightHor, duskCol, dayZen, dayHor, lpDir, lpCol, mwN, tintAll; uniform float moonAng, moonLight, stars, milky, pxAng, time, lp, exposure; uniform float thru, coreI, coreAng, skyGlow; uniform vec3 coreCol; uniform float dip, altI, sunDisc;
      varying vec3 vD;
      vec3 starLayer(vec3 d, float sc, float dens, float bright){
        vec3 p = d*sc; vec3 c = floor(p); float h = h13(c);
        if (h < 1.-dens) return vec3(0.);
        vec3 off = 0.25 + 0.5*vec3(h13(c+7.1), h13(c+3.3), h13(c+5.9));
        vec3 sd = normalize(c + off); float a = length(d - sd);
        float w = pxAng*0.75; float m = pow(h13(c+1.7), 6.)*bright;
        float tw = 0.75 + 0.25*sin(time*(3.+6.*h13(c+9.)) + h*40.);
        vec3 col = mix(vec3(0.75,0.85,1.0), vec3(1.0,0.85,0.65), h13(c+2.2));
        return col * m * tw * exp(-a*a/(w*w)) ;
      }
      void main(){
        vec3 d = normalize(vD); float y = dip > 0. ? sin(asin(clamp(d.y, -1., 1.)) + dip) : d.y; float yc = max(y, 0.);
        float sy = sunDir.y;
        // night base
        vec3 col = mix(nightHor, nightZen, pow(yc, 0.45));
        // twilight
        float tw = smoothstep(-0.30, 0.02, sy);
        vec2 dh = normalize(d.xz+1e-5), sh = normalize(sunDir.xz+1e-5);
        float az = max(dot(dh, sh), 0.);
        col += duskCol * tw * (0.25 + 1.6*pow(az, 4.)) * exp(-yc*7.) * 1.2;
        col += vec3(0.20,0.30,0.65) * tw * 0.22 * exp(-yc*3.5);
        // anti-twilight: Belt of Venus (pink band) over Earth's shadow (dark blue) opposite the sun
        float anti = pow(max(dot(dh, -sh), 0.), 1.5) * smoothstep(-0.3, -0.04, sy) * smoothstep(0.08, -0.06, sy);
        float elev = asin(clamp(y, -1., 1.)) * 57.2958;
        float belt = smoothstep(1.5, 5.5, elev) * smoothstep(14.0, 7.0, elev);
        float shadowB = smoothstep(4.5, 0.5, elev) * step(-0.5, elev);
        col += beltCol * belt * anti * beltI;
        col = mix(col, col*vec3(0.55,0.62,0.85), shadowB * anti * 0.7 * beltI);
        // day
        float dy = smoothstep(-0.02, 0.25, sy);
        vec3 dayC = mix(dayHor, dayZen, pow(yc, mix(0.5, 0.3, altI))) * 1.5;
        if (altI > 0.) dayC += dayHor * altI * 0.8 * exp(-yc * 30.);
        col = mix(col, dayC, dy);
        // moon-lit sky (blue wash) + glow halo
        float ca = dot(d, normalize(moonDir)); float ang = acos(clamp(ca, -1., 1.));
        col += vec3(0.20,0.32,0.62) * moonLight * (0.35 + 0.65*exp(-yc*1.5));
        float g = moonAng/max(ang, moonAng);
        col += vec3(0.9,0.92,1.0) * moonLight * (0.6*g*g + 0.25*exp(-ang/(moonAng*6.)) );
        // light pollution dome toward town
        vec2 lh = normalize(lpDir.xz+1e-5);
        col += lpCol * lp * 0.12 * exp(-yc*9.) * (0.4 + 0.6*pow(max(dot(dh, lh),0.), 3.));
        // stars + milky way (fade with sky brightness)
        float skyL = dot(col, vec3(0.33));
        float sv = stars * smoothstep(0.12, 0.01, skyL) * smoothstep(-0.02, 0.08, y);
        if (sv > 0.) {
          vec3 st = starLayer(d, 160., 0.05, 7.) + starLayer(d, 380., 0.035, 3.) + starLayer(d, 800., 0.03, 1.2);
          float b = dot(d, mwN); float band = exp(-b*b/0.03);
          float n = fbm3(d*6.), lanes = smoothstep(0.35, 0.75, fbm3(d*11.+3.));
          vec3 mw = vec3(0.55,0.6,0.75)*band*(0.35+0.9*n)*(1.-0.75*lanes*band) * milky * 0.05;
          mw += vec3(1.,0.85,0.65)*exp(-b*b/0.006)*fbm3(d*20.)*0.012*milky;
          st += starLayer(d, 1100., 0.10*band, 0.8);
          col += (st + mw) * sv;
        }
        // the core's light from below lights the whole atmosphere (see-through Earth)
        col += coreCol*coreI*thru*skyGlow*(0.35 + 0.65*exp(-yc*3.));
        if (y < 0.) {
          vec3 below = nightHor*0.6 + duskCol*tw*0.1;
          if (thru > 0.) {
            vec3 tc = starLayer(d, 160., 0.05, 7.) + starLayer(d, 380., 0.035, 3.) + starLayer(d, 800., 0.03, 1.2);
            float bb = dot(d, mwN); float band = exp(-bb*bb/0.03);
            tc += vec3(0.55,0.6,0.75)*band*(0.35+0.9*fbm3(d*6.))*milky*0.05;
            float ang = acos(clamp(-d.y, -1., 1.));                                   // angle from the nadir
            float disc = smoothstep(coreAng + 0.004, coreAng - 0.004, ang);
            float gran = 0.78 + 0.22*fbm3(d*26. + vec3(time*0.015, 0., time*0.01));    // slow convection mottling
            float limb = 0.6 + 0.4*sqrt(max(1. - pow(ang/coreAng, 2.), 0.));
            tc = mix(tc, coreCol*coreI*gran*limb, disc);
            tc += coreCol*coreI*0.015*exp(-max(ang - coreAng, 0.)*10.);
            below = mix(below, tc, thru);
          }
          col = mix(col, below, smoothstep(0., -0.05, y));
        }
        if (sunDisc > 0.) { float sa = acos(clamp(dot(d, normalize(sunDir)), -1., 1.));
          col += vec3(1.0, 0.96, 0.9) * sunDisc * (smoothstep(0.0056, 0.0040, sa) * 60. + 0.5*exp(-sa/0.012) + 0.25*exp(-sa/0.07)); }
        gl_FragColor = vec4(col*exposure*tintAll, 1.);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -10000;
  mesh.U = U;
  mesh.update = (S, t) => { U.time.value = t; U.pxAng.value = THREE.MathUtils.degToRad(S.camera.fov) / S.H; };
  return mesh;
}
