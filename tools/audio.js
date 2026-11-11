// Render a page's sound to WAV (48 kHz, stereo, float32): node tools/audio.js page_sound.html out.wav DURATION_S
// Use the tiny <shot>_sound.html that build_page.py writes (big pages time out here).
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const [pg, out, dur] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); p.setDefaultTimeout(0);
  p.on('pageerror', (e) => console.error('[pageerror]', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  await p.goto('file://' + path.resolve(pg));
  const r = await p.evaluate((d) => renderSound(d), +dur);
  const L = new Float32Array(Buffer.from(r.ch[0], 'base64').buffer.slice(0)), R = new Float32Array(Buffer.from(r.ch[1], 'base64').buffer.slice(0));
  const n = L.length, data = Buffer.alloc(n * 8); for (let i = 0; i < n; i++) { data.writeFloatLE(L[i], i * 8); data.writeFloatLE(R[i], i * 8 + 4); }
  const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(r.sr, 24); h.writeUInt32LE(r.sr * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(out, Buffer.concat([h, data])); let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  console.log(`${out}  ${(n / r.sr).toFixed(2)} s  peak ${(20 * Math.log10(pk + 1e-9)).toFixed(1)} dBFS`); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
