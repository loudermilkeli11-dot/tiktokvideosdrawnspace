#!/usr/bin/env node
// Overlay layer renderer (captions / counter / tags) -> out/overlay.mov (qtrle, argb alpha)
// usage: node tools/overlay/render_ov.js projects/<slug> [--frames a:b] [--png out_dir] [--validate] [--workers N]
//   --frames a:b   render frames a..b-1 only (film frame numbers). With .mov output the
//                  movie then starts at frame a (for previews).
//   --png dir      write PNGs (ov_<frame>.png) for the selected frames instead of a movie
//                  (e.g. --frames 300:301 --png /tmp/x for a single still).
//   --validate     only run the caption validator.
const path = require('path'), fs = require('fs'), http = require('http');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const REPO = path.resolve(__dirname, '..', '..');
const FPS = 30;

function parseShots(file) {
  const shots = []; let start = 0;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const [name, fr] = line.split(/\s+/);
    const frames = parseInt(fr, 10);
    if (!name || !(frames > 0)) throw new Error(`bad shots.txt line: ${raw}`);
    shots.push({ name, frames, start, end: start + frames, t0: start / FPS, t1: (start + frames) / FPS });
    start += frames;
  }
  return { shots, total: start };
}

function validate(caps, total) {
  const warns = [];
  const dur = total / FPS;
  const sorted = [...caps].sort((a, b) => a.t0 - b.t0);
  sorted.forEach((c, i) => {
    const n = c.text.trim().split(/\s+/).length;
    const tag = `caption @${c.t0.toFixed(2)}s "${c.text}"`;
    if (n > 8) warns.push(`${tag}: ${n} words (> 8)`);
    if (c.t1 - c.t0 < 2.8) warns.push(`${tag}: on screen ${(c.t1 - c.t0).toFixed(2)}s (< 2.8s)`);
    if (c.t1 <= c.t0) warns.push(`${tag}: t1 <= t0`);
    if (c.t0 < 0 || c.t1 > dur + 1e-6) warns.push(`${tag}: outside film (0..${dur.toFixed(2)}s)`);
    if (i > 0 && c.t0 < sorted[i - 1].t1 - 1e-6) warns.push(`${tag}: overlaps previous caption "${sorted[i - 1].text}"`);
  });
  return warns;
}

function serve(root, proj) {
  // repo served at /, project dir mounted at /__proj/p/ (so '../../tools/overlay/helpers.js' resolves)
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json' };
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    const [r0, rel] = u.startsWith('/__proj/p/') ? [proj, u.slice(10)] : [root, u];
    const p = path.join(r0, rel);
    if (!p.startsWith(r0) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) { console.error('usage: render_ov.js projects/<slug> [--frames a:b] [--png dir] [--validate] [--workers N]'); process.exit(2); }
  const proj = path.resolve(args[0]);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const { shots, total } = parseShots(path.join(proj, 'shots.txt'));
  let [a, b] = [0, total];
  if (opt('--frames')) { const [x, y] = opt('--frames').split(':'); a = parseInt(x || '0'); b = y ? parseInt(y) : a + 1; }
  b = Math.min(b, total);
  const pngDir = opt('--png');
  const nWorkers = parseInt(opt('--workers') || '3');
  const info = { fps: FPS, total, duration: total / FPS, shots, byName: Object.fromEntries(shots.map(s => [s.name, s])) };

  const srv = await serve(REPO, proj);
  const base = `http://127.0.0.1:${srv.address().port}`;
  const ovUrl = `${base}/__proj/p/overlay.js?v=${Date.now()}`;
  const browser = await chromium.launch();
  const t0 = Date.now();
  const pages = [];
  try {
    for (let i = 0; i < Math.max(1, Math.min(nWorkers, b - a)); i++) {
      const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
      pg.on('pageerror', e => console.error('[page error]', e.message));
      pg.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
      await pg.goto(`${base}/tools/overlay/ov.html`);
      await pg.waitForFunction(() => window.ovReady === true);
      const meta = await pg.evaluate(([u, inf]) => window.ov.init(u, inf), [ovUrl, info]);
      if (i === 0) {
        const warns = validate(meta.captions, total);
        for (const w of warns) console.warn('WARN', w);
        console.log(`overlay: ${meta.captions.length} captions, ${warns.length} warnings, fonts ${meta.fonts.join(' ')}`);
        if (args.includes('--validate')) { await browser.close(); srv.close(); return; }
      }
      pages.push(pg);
    }

    // blank frame PNG (fully transparent) for empty frames
    const blank = Buffer.from(await pages[0].evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      const u = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (const x of u) s += String.fromCharCode(x); return btoa(s);
    }), 'base64');

    let ff = null, ffDone = null;
    if (pngDir) fs.mkdirSync(pngDir, { recursive: true });
    else {
      fs.mkdirSync(path.join(proj, 'out'), { recursive: true });
      const out = path.join(proj, 'out', 'overlay.mov');
      ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
        '-c:v', 'qtrle', '-pix_fmt', 'argb', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
      ffDone = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));
    }
    const write = (buf) => new Promise(r => { if (!ff.stdin.write(buf)) ff.stdin.once('drain', r); else r(); });

    // workers render ahead into a map; main loop writes in order
    const results = new Map(); let next = a; const waiters = new Map();
    const getResult = (f) => results.has(f) ? Promise.resolve(results.get(f)) : new Promise(r => waiters.set(f, r));
    const AHEAD = 24;
    let writeHead = a;
    const workers = pages.map(async (pg) => {
      while (true) {
        const f = next++;
        if (f >= b) return;
        while (f - writeHead > AHEAD) await new Promise(r => setTimeout(r, 5));
        const b64 = await pg.evaluate((fr) => window.ov.frame(fr), f);
        const buf = b64 ? Buffer.from(b64, 'base64') : null;
        if (waiters.has(f)) { waiters.get(f)(buf); waiters.delete(f); } else results.set(f, buf);
      }
    });
    let nonEmpty = 0;
    for (let f = a; f < b; f++) {
      const buf = await getResult(f); results.delete(f); writeHead = f;
      if (buf) nonEmpty++;
      if (pngDir) { if (buf || true) fs.writeFileSync(path.join(pngDir, `ov_${String(f).padStart(5, '0')}.png`), buf || blank); }
      else await write(buf || blank);
      if ((f - a) % 300 === 0 && f > a) process.stdout.write(`  frame ${f}/${b} (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
    }
    await Promise.all(workers);
    if (ff) { ff.stdin.end(); await ffDone; }
    console.log(`overlay: rendered frames ${a}..${b - 1} (${b - a}, ${nonEmpty} non-empty) in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${pngDir || path.join(proj, 'out', 'overlay.mov')}`);
  } finally {
    await browser.close(); srv.close();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
