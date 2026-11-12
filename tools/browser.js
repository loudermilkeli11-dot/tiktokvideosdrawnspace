// One place that starts Chromium for every render tool.
//   CPU (default, cloud containers): SwiftShader, the software WebGL that cloud and local frames were matched on.
//   GPU (the Commander's PC): IJ_GPU=1 (or --gpu on render.js). New headless Chromium on the real graphics card
//   (Direct3D 11 through ANGLE on Windows). Frames differ from SwiftShader by a hair: never mix the two inside one shot.
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const GPU = process.env.IJ_GPU === '1' || process.argv.includes('--gpu');
const MEM = '--js-flags=--max-old-space-size=8192';
const CPU_FLAGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', MEM];
const GPU_FLAGS = ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-gpu-sandbox',
  ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : []), MEM];
const launch = () => chromium.launch(GPU ? { channel: 'chromium', args: GPU_FLAGS } : { args: CPU_FLAGS });
const fileUrl = (p) => pathToFileURL(path.resolve(p)).href;   // file:///C:/... on Windows, file:///home/... on Linux
module.exports = { launch, fileUrl, GPU };
