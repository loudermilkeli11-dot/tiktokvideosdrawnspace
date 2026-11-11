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
    tintAll: { value: new THREE.Color(0xffffff) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.BackSide, depthWrite: false, depthTest: false,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize((modelMatrix*vec4(position,0.)).xyz); vec4 p = projectionMatrix*viewMatrix*vec4(cameraPosition + vD*1000., 1.); gl_Position = p.xyww; }`,
    fragmentShader: `${NOISE}
      uniform vec3 sunDir, moonDir, nightZen, nightHor, duskCol, dayZen, dayHor, lpDir, lpCol, mwN, tintAll; uniform float moonAng, moonLight, stars, milky, pxAng, time, lp, exposure;
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
        vec3 d = normalize(vD); float y = d.y; float yc = max(y, 0.);
        float sy = sunDir.y;
        // night base
        vec3 col = mix(nightHor, nightZen, pow(yc, 0.45));
        // twilight
        float tw = smoothstep(-0.30, 0.02, sy);
        vec2 dh = normalize(d.xz+1e-5), sh = normalize(sunDir.xz+1e-5);
        float az = max(dot(dh, sh), 0.);
        col += duskCol * tw * (0.25 + 1.6*pow(az, 4.)) * exp(-yc*7.) * 1.2;
        col += vec3(0.25,0.35,0.7) * tw * 0.35 * exp(-yc*2.);
        // day
        float dy = smoothstep(-0.02, 0.25, sy);
        col = mix(col, mix(dayHor, dayZen, pow(yc, 0.5)) * 1.5, dy);
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
        if (y < 0.) col = mix(col, nightHor*0.6 + duskCol*tw*0.1, smoothstep(0., -0.05, y));
        gl_FragColor = vec4(col*exposure*tintAll, 1.);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -10000;
  mesh.U = U;
  mesh.update = (S, t) => { U.time.value = t; U.pxAng.value = THREE.MathUtils.degToRad(S.camera.fov) / S.H; };
  return mesh;
}
