// Invisible Journeys engine core: studio, deterministic frame(t), motion-blur accumulation, asset loading.
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { Post } from './post.js';
import { halton } from './util.js';
export { THREE };
export const W = 1080, H = 1920, FPS = 30, PRE = 4; // page time t = shot time + PRE
const Q = new URLSearchParams(location.search);
export const SCALE = +(Q.get('scale') || 1);          // ?scale=0.5 for fast iteration
export const MB = Q.get('mb') ? +Q.get('mb') : null;  // ?mb=1 forces motion-blur sample count

// Texture URL: inlined data URI (built page) or dev path (served from repo root)
export function texURL(name) { return (window.TEX && window.TEX[name]) || `/engine/tex/${name}`; }

export function createStudio(opts = {}) {
  const cv = document.createElement('canvas');
  cv.id = 'cv'; cv.width = Math.round(W * SCALE); cv.height = Math.round(H * SCALE);
  cv.style.cssText = 'width:360px;height:640px;display:block;background:#000';
  document.body.style.cssText = 'margin:0;background:#111';
  document.body.appendChild(cv); window.cv = cv;
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, preserveDrawingBuffer: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(cv.width, cv.height, false);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = !!opts.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, W / H, opts.near || 0.1, opts.far || 2e5);
  const post = new Post(renderer, cv.width, cv.height, opts.post || {});
  const S = {
    THREE, renderer, scene, camera, post, cv, W: cv.width, H: cv.height, scale: SCALE,
    samples: opts.samples ?? 8,     // number or (t)=>number : 4 calm, 8 moving, 12 fast
    shutter: opts.shutter ?? 0.5,   // fraction of frame interval (0.5 = 180 deg)
    jitter: opts.jitter ?? true,    // sub-pixel AA jitter across sub-samples
    pending: [], update: () => {}, t: 0,
    env: null,
  };
  S.tex = (name, o = {}) => {
    const tx = new THREE.Texture();
    S.pending.push(new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => { tx.image = img; tx.needsUpdate = true; res(); };
      img.onerror = () => rej(new Error('texture failed: ' + name)); img.src = texURL(name);
    }));
    tx.colorSpace = o.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    tx.wrapS = tx.wrapT = o.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    tx.anisotropy = o.aniso ?? 8; tx.generateMipmaps = true; tx.minFilter = THREE.LinearMipmapLinearFilter;
    return tx;
  };
  S.hdri = (name, intensity = 1) => {
    const p = new RGBELoader().setDataType(THREE.HalfFloatType).loadAsync(texURL(name)).then((hdr) => {
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      const pm = new THREE.PMREMGenerator(renderer);
      S.env = pm.fromEquirectangular(hdr).texture; scene.environment = S.env;
      scene.environmentIntensity = intensity; hdr.dispose(); pm.dispose();
    });
    S.pending.push(p); return p;
  };
  S.run = (update) => {
    S.update = update;
    window.frame = (t) => renderFrame(S, t);
    window.ASSETS_READY = false;
    Promise.all(S.pending).then(() => {
      // warm-up: compile shaders + upload textures
      update(PRE, S); renderer.compile(scene, camera); renderFrame(S, PRE);
      window.ASSETS_READY = true; document.title = 'READY';
      if (!navigator.webdriver && !Q.has('static')) livePreview(S);
    }).catch((e) => { console.error(e); window.ASSETS_ERROR = String(e); });
  };
  return S;
}

let jitterIdx = 0;
function renderFrame(S, t) {
  const { renderer, scene, camera, post } = S;
  let n = typeof S.samples === 'function' ? S.samples(t) : S.samples;
  if (MB) n = MB;
  n = Math.max(1, Math.round(n));
  post.begin();
  for (let i = 0; i < n; i++) {
    const ts = n === 1 ? t : t + ((i + 0.5) / n - 0.5) * S.shutter / FPS;
    S.t = ts;
    S.update(ts, S);
    if (S.jitter && n > 1) {
      const k = (i % 16) + 1;
      camera.setViewOffset(S.W, S.H, halton(k, 2) - 0.5, halton(k, 3) - 0.5, S.W, S.H);
    } else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    renderer.setRenderTarget(post.rtScene);
    renderer.clear();
    renderer.render(scene, camera);
    post.accumulate(1 / n);
  }
  camera.clearViewOffset();
  post.finish(t);
  S.t = t;
}

function livePreview(S) { // open the built page in a browser to scrub: ?t=12.3 or plays live
  const t0 = performance.now(); const fixed = Q.get('t');
  const loop = () => { const t = fixed ? +fixed + PRE : PRE + ((performance.now() - t0) / 1000) % (+(Q.get('dur') || 10)); window.frame(t); if (!fixed) requestAnimationFrame(loop); };
  loop();
}
