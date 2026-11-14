#!/usr/bin/env node
// Record every shot's pins (S.pin(...) in the shot) per frame -> projects/<slug>/out/pins.json
//   node tools/overlay/pins.js projects/<slug> [--shots a,b]
// Needs the built pages (projects/<slug>/dist/<shot>.html). No rendering: each frame only runs the shot's update
// and projects the pins, so a shot takes seconds. Output: { "<shot>": { "<pin>": [[x, y, vis, r], ...one per frame] } }
// in caption design px (540 x 960). overlay.js reads it with info.pin('<shot>', '<pin>') -> (t) => [x, y, vis, r].
const path = require('path'), fs = require('fs');
const { launch, fileUrl } = require('../browser.js');
const A = process.argv.slice(2);
if (!A[0]) { console.error('usage: pins.js projects/<slug> [--shots a,b]'); process.exit(2); }
const proj = path.resolve(A[0]);
const only = A.includes('--shots') ? A[A.indexOf('--shots') + 1].split(',') : null;
const shots = fs.readFileSync(path.join(proj, 'shots.txt'), 'utf8').split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean)
  .map((l) => { const [name, n] = l.split(/\s+/); return { name, frames: +n }; });
const outFile = path.join(proj, 'out', 'pins.json');
const all = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
(async () => {
  const b = await launch();
  for (const s of shots) {
    if (only && !only.includes(s.name)) continue;
    const page = path.join(proj, 'dist', s.name + '.html');
    if (!fs.existsSync(page)) { console.log(`pins: ${s.name} no page (build it first)`); continue; }
    const p = await b.newPage(); p.setDefaultTimeout(0);
    await p.goto(fileUrl(page) + '?static&scale=0.25', { timeout: 600000 });
    await p.waitForFunction(() => window.ASSETS_READY === true || window.ASSETS_ERROR, null, { timeout: 600000, polling: 250 });
    const rec = await p.evaluate((n) => {
      if (!window.pins || !window.pins(4)) return null;
      const out = {};
      for (let i = 0; i < n; i++) { const r = window.pins(4 + i / 30); for (const [k, v] of Object.entries(r)) (out[k] ||= []).push(v); }
      return out;
    }, s.frames);
    await p.close();
    if (rec) { all[s.name] = rec; console.log(`pins: ${s.name} ${Object.keys(rec).join(', ')} (${s.frames} frames)`); }
    else delete all[s.name];
  }
  await b.close();
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(all));
  console.log(`pins: wrote ${outFile} (${Object.keys(all).length} shots with pins)`);
})().catch((e) => { console.error(e); process.exit(1); });
