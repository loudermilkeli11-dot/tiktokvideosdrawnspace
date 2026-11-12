// Which graphics chip does the renderer actually use, and how fast is a frame?
//   node tools/gpu_check.js                 -> WebGL renderer string, CPU (SwiftShader) vs GPU (IJ_GPU=1)
//   node tools/gpu_check.js page.html [n]   -> also times n full-size frames of a built page (default 5)
const { launch, fileUrl, GPU } = require('./browser.js');
(async () => {
  const b = await launch(); const p = await b.newPage(); p.setDefaultTimeout(0);
  await p.setContent('<canvas id=c></canvas>');
  const r = await p.evaluate(() => { const g = document.getElementById('c').getContext('webgl2'); if (!g) return 'NO WEBGL2';
    const d = g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); });
  const soft = /swiftshader|llvmpipe|software|basic render/i.test(r);
  console.log(`mode: ${GPU ? 'GPU' : 'CPU'}   renderer: ${r}   ${soft ? '(software: NOT the graphics card)' : '(hardware)'}`);
  const pg = process.argv.slice(2).find((a) => a.endsWith('.html'));
  if (pg) {
    const n = +(process.argv.slice(2).find((a) => /^\d+$/.test(a)) || 5);
    await p.goto(fileUrl(pg) + '?static&scale=1');
    await p.waitForFunction(() => window.ASSETS_READY === true || window.ASSETS_ERROR, null, { polling: 250 });
    const ms = [];
    for (let i = 0; i < n; i++) { const s = Date.now(); await p.evaluate((t) => { window.frame(t); return window.cv.toDataURL('image/png').length; }, 4 + i / 30); ms.push(Date.now() - s); }
    console.log(`frames: ${ms.map((x) => (x / 1000).toFixed(2) + ' s').join(', ')}   (cloud CPU: ~9 s per frame)`);
  }
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
