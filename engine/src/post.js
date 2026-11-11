// HDR post: sub-frame accumulation -> bloom -> exposure/grade -> ACES -> vignette, CA, grain -> sRGB canvas.
import * as THREE from 'three';
const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
function rt(w, h, depth = false) {
  return new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: depth, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false, colorSpace: THREE.LinearSRGBColorSpace });
}
export class Post {
  constructor(renderer, w, h, o = {}) {
    this.r = renderer; this.w = w; this.h = h;
    this.rtScene = rt(w, h, true); this.rtAcc = rt(w, h);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.qs = new THREE.Scene(); this.qs.add(this.quad); this.quad.frustumCulled = false;
    // params (mutable per frame by shots)
    this.p = Object.assign({
      exposure: 1.0, bloom: 0.35, bloomThreshold: 1.0, bloomKnee: 0.6, bloomRadius: 0.85,
      vignette: 0.35, grain: 0.035, ca: 0.0025, sat: 1.05, contrast: 1.04,
      lift: [0.0, 0.0, 0.0], gain: [1, 1, 1], tint: [1, 1, 1], flash: 0.0, flashColor: [1.0, 0.85, 0.7],
      fade: 0.0, // fade to black 0..1
    }, o);
    this.matAcc = new THREE.ShaderMaterial({ vertexShader: VS, uniforms: { src: { value: null }, wgt: { value: 1 } },
      fragmentShader: `uniform sampler2D src; uniform float wgt; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(src, vUv).rgb * wgt, 1.); }`,
      blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true });
    // bloom mip chain
    this.mips = []; let mw = w >> 1, mh = h >> 1;
    for (let i = 0; i < 6 && mw > 8 && mh > 8; i++) { this.mips.push(rt(mw, mh)); mw >>= 1; mh >>= 1; }
    this.matDown = new THREE.ShaderMaterial({ vertexShader: VS, depthTest: false, depthWrite: false,
      uniforms: { src: { value: null }, texel: { value: new THREE.Vector2() }, first: { value: 0 }, thr: { value: 1 }, knee: { value: 0.5 } },
      fragmentShader: `uniform sampler2D src; uniform vec2 texel; uniform float first, thr, knee; varying vec2 vUv;
      vec3 s(vec2 o){ return texture2D(src, vUv + o*texel).rgb; }
      void main(){ // 13-tap (Jimenez 2014)
        vec3 a=s(vec2(-2,2)),b=s(vec2(0,2)),c=s(vec2(2,2)),d=s(vec2(-2,0)),e=s(vec2(0,0)),f=s(vec2(2,0)),g=s(vec2(-2,-2)),h=s(vec2(0,-2)),i=s(vec2(2,-2)),j=s(vec2(-1,1)),k=s(vec2(1,1)),l=s(vec2(-1,-1)),m=s(vec2(1,-1));
        vec3 col = e*0.125 + (a+c+g+i)*0.03125 + (b+d+f+h)*0.0625 + (j+k+l+m)*0.125;
        if (first > 0.5) { float br = max(col.r, max(col.g, col.b)); float rq = clamp(br - thr + knee, 0., 2.*knee); rq = rq*rq/(4.*knee+1e-5);
          col *= max(rq, br - thr) / max(br, 1e-5); col = min(col, vec3(60.)); }
        gl_FragColor = vec4(col, 1.); }` });
    this.matUp = new THREE.ShaderMaterial({ vertexShader: VS, depthTest: false, depthWrite: false, transparent: true, blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation, blendSrc: THREE.ConstantAlphaFactor, blendDst: THREE.OneFactor,
      uniforms: { src: { value: null }, texel: { value: new THREE.Vector2() } },
      fragmentShader: `uniform sampler2D src; uniform vec2 texel; varying vec2 vUv;
      void main(){ vec3 c = vec3(0.);
        c += texture2D(src, vUv + vec2(-1,1)*texel).rgb; c += 2.*texture2D(src, vUv + vec2(0,1)*texel).rgb; c += texture2D(src, vUv + vec2(1,1)*texel).rgb;
        c += 2.*texture2D(src, vUv + vec2(-1,0)*texel).rgb; c += 4.*texture2D(src, vUv).rgb; c += 2.*texture2D(src, vUv + vec2(1,0)*texel).rgb;
        c += texture2D(src, vUv + vec2(-1,-1)*texel).rgb; c += 2.*texture2D(src, vUv + vec2(0,-1)*texel).rgb; c += texture2D(src, vUv + vec2(1,-1)*texel).rgb;
        gl_FragColor = vec4(c/16., 1.); }` });
    this.matFinal = new THREE.ShaderMaterial({ vertexShader: VS, depthTest: false, depthWrite: false,
      uniforms: { acc: { value: this.rtAcc.texture }, bloomT: { value: this.mips[0].texture }, u: { value: {} },
        exposure: { value: 1 }, bloom: { value: 0.3 }, vignette: { value: 0.3 }, grain: { value: 0.03 }, ca: { value: 0.002 }, sat: { value: 1 }, contrast: { value: 1 },
        lift: { value: new THREE.Vector3() }, gain: { value: new THREE.Vector3(1, 1, 1) }, tint: { value: new THREE.Vector3(1, 1, 1) },
        flash: { value: 0 }, flashColor: { value: new THREE.Vector3(1, 1, 1) }, fade: { value: 0 }, seed: { value: 0 }, aspect: { value: w / h }, res: { value: new THREE.Vector2(w, h) } },
      fragmentShader: `uniform sampler2D acc, bloomT; uniform float exposure, bloom, vignette, grain, ca, sat, contrast, flash, fade, seed, aspect; uniform vec3 lift, gain, tint, flashColor; uniform vec2 res; varying vec2 vUv;
      vec3 RRTAndODTFit(vec3 v){ vec3 a = v*(v+0.0245786)-0.000090537; vec3 b = v*(0.983729*v+0.4329510)+0.238081; return a/b; }
      vec3 aces(vec3 c){ const mat3 I = mat3(vec3(0.59719,0.07600,0.02840), vec3(0.35458,0.90834,0.13383), vec3(0.04823,0.01566,0.83777));
        const mat3 O = mat3(vec3(1.60475,-0.10208,-0.00327), vec3(-0.53108,1.10813,-0.07276), vec3(-0.07367,-0.00605,1.07602));
        c = I*(c/0.6); c = RRTAndODTFit(c); return clamp(O*c, 0., 1.); }
      float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
      vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1./2.4))-0.055, step(0.0031308, c)); }
      void main(){
        vec2 d = vUv - 0.5; float r2 = dot(d*vec2(aspect,1.), d*vec2(aspect,1.));
        vec3 c; c.r = texture2D(acc, vUv - d*ca).r; c.g = texture2D(acc, vUv).g; c.b = texture2D(acc, vUv + d*ca).b;
        c += texture2D(bloomT, vUv).rgb * bloom;
        c *= exposure * tint;
        c += flashColor * flash * (0.6 + 0.4*dot(c, vec3(0.33)));
        float l = dot(c, vec3(0.2126,0.7152,0.0722)); c = max(mix(vec3(l), c, sat), 0.);
        c = aces(c);
        c = pow(c, vec3(contrast)); c = c*gain + lift*(1.-c);
        c *= mix(1., smoothstep(0.95, 0.15, r2*1.25), vignette);
        c *= 1. - fade;
        c = toSRGB(c);
        float g = h12(gl_FragCoord.xy + seed*vec2(37.1, 91.7)) + h12(gl_FragCoord.xy*1.37 + seed*vec2(11.3,7.9)) - 1.;
        float lum = dot(c, vec3(0.333)); c += g * grain * (1.2 - lum) ;
        gl_FragColor = vec4(clamp(c, 0., 1.), 1.); }` });
    this.matUp.blendAlpha = 1;
  }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.qs, this.cam); }
  begin() { const r = this.r; r.setRenderTarget(this.rtAcc); r.setClearColor(0x000000, 1); r.clear(true, false, false); }
  accumulate(w) { const a = this.r.autoClear; this.r.autoClear = false; this.matAcc.uniforms.src.value = this.rtScene.texture; this.matAcc.uniforms.wgt.value = w; this.pass(this.matAcc, this.rtAcc); this.r.autoClear = a; }
  finish(t) {
    const p = this.p, r = this.r, ac = r.autoClear;
    // bloom down
    let src = this.rtAcc;
    for (let i = 0; i < this.mips.length; i++) {
      const u = this.matDown.uniforms; u.src.value = src.texture; u.texel.value.set(1 / src.width, 1 / src.height); u.first.value = i === 0 ? 1 : 0; u.thr.value = p.bloomThreshold; u.knee.value = p.bloomKnee;
      r.autoClear = true; this.pass(this.matDown, this.mips[i]); src = this.mips[i];
    }
    // bloom up (additive, radius controls blend of wider mips)
    r.autoClear = false;
    for (let i = this.mips.length - 1; i > 0; i--) {
      const u = this.matUp.uniforms; u.src.value = this.mips[i].texture; u.texel.value.set(1 / this.mips[i].width, 1 / this.mips[i].height);
      this.r.setBlendConstant?.(p.bloomRadius);
      this.matUp.blendColor = new THREE.Color(p.bloomRadius, p.bloomRadius, p.bloomRadius); this.matUp.blendAlpha = p.bloomRadius;
      this.pass(this.matUp, this.mips[i - 1]);
    }
    r.autoClear = true;
    const U = this.matFinal.uniforms;
    for (const k of ['exposure', 'bloom', 'vignette', 'grain', 'ca', 'sat', 'contrast', 'flash', 'fade']) U[k].value = p[k];
    U.lift.value.fromArray(p.lift); U.gain.value.fromArray(p.gain); U.tint.value.fromArray(p.tint); U.flashColor.value.fromArray(p.flashColor);
    U.seed.value = Math.round(t * 30) % 997;
    this.pass(this.matFinal, null);
    r.autoClear = ac;
  }
}
