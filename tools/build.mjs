// Bundles the app with esbuild and produces:
//   dist/index.html + dist/app.js  (served version)
//   dist/orszaghaz.html            (single self-contained file, works offline / file://)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const watch = process.argv.includes('--dev');
mkdirSync('dist', { recursive: true });
await build({
  entryPoints: ['src/main.js'], bundle: true, format: 'esm', outfile: 'dist/app.js',
  minify: !watch, sourcemap: false, target: ['es2020'], legalComments: 'none',
  splitting: false, logLevel: 'info',
});
const html = readFileSync('web/index.html', 'utf8');
writeFileSync('dist/index.html', html);
const js = readFileSync('dist/app.js', 'utf8').replace(/<\/script/g, '<\\/script');
writeFileSync('dist/orszaghaz.html', html.replace('<script type="module" src="./app.js"></script>', `<script type="module">\n${js}\n</script>`));
console.log('built', (js.length / 1024).toFixed(0) + ' KB');
