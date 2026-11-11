// esbuild bundler: shot.js (ES module importing 'three' and '@engine/*') -> one IIFE string on stdout
import * as esbuild from 'esbuild';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const engineAlias = { name: 'engine', setup(b) {
  b.onResolve({ filter: /^@engine\// }, (a) => ({ path: path.join(here, 'src', a.path.slice(8)) }));
  b.onResolve({ filter: /^three(\/.*)?$/ }, (a) => ({ path: a.path === 'three' ? path.join(here, 'node_modules/three/build/three.module.js') : path.join(here, 'node_modules', a.path) }));
} };
const r = await esbuild.build({ entryPoints: [process.argv[2]], bundle: true, format: 'iife', write: false, minifySyntax: true, minifyWhitespace: process.argv.includes('--min'), target: 'es2020', plugins: [engineAlias], logLevel: 'warning', legalComments: 'none' });
process.stdout.write(r.outputFiles[0].text);
