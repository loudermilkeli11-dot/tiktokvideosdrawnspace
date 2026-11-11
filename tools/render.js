// Deterministic headless render: page.html -> MP4 (H.264 intermediate). frame i -> page time t = 4 + i/30.
// node tools/render.js page.html out.mp4 [--from 0] [--to N] [--scale 1] [--mb n] [--crf 12]
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path');
const A = process.argv.slice(2); const arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const page_ = path.resolve(A[0]), out = path.resolve(A[1]);
const from = +arg('from', 0), to = +arg('to', 90), scale = arg('scale', '1'), mb = arg('mb', ''), crf = arg('crf', '12');
const FLAGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--js-flags=--max-old-space-size=8192'];
(async () => {
  const b = await chromium.launch({ args: FLAGS });
  const p = await b.newPage(); p.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  p.on('pageerror', (e) => console.error('[pageerror]', e.message));
  p.setDefaultTimeout(0);
  await p.goto('file://' + page_ + `?static&scale=${scale}${mb ? '&mb=' + mb : ''}`, { timeout: 600000 });
  await p.waitForFunction(() => window.ASSETS_READY === true || window.ASSETS_ERROR, null, { timeout: 600000, polling: 250 });
  const err = await p.evaluate(() => window.ASSETS_ERROR); if (err) throw new Error(err);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', '30', '-bf', '0', '-r', '30', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = from; i < to; i++) {
    const t = 4 + i / 30, s = Date.now();
    const b64 = await p.evaluate((t) => { window.frame(t); return window.cv.toDataURL('image/png').slice(22); }, t);
    const buf = Buffer.from(b64, 'base64');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    const n = i - from + 1; console.log(`frame ${i} (${n}/${to - from}) ${((Date.now() - s) / 1000).toFixed(2)}s  avg ${((Date.now() - t0) / 1000 / n).toFixed(2)}s`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await b.close();
  console.log(`DONE ${out} ${to - from} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
})().catch((e) => { console.error(e); process.exit(1); });
