// Exports the building to GLB via the in-page GLTFExporter: node tools/export.cjs out.glb
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const out = process.argv[2] || 'orszaghaz.glb';
const root = path.resolve(__dirname, '../dist');
const srv = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); fs.readFile(p, (e, d) => { res.writeHead(e ? 404 : 200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ acceptDownloads: true, viewport: { width: 640, height: 360 } });
  pg.on('console', m => { if (m.type() === 'error' || m.text().startsWith('stats')) console.log(m.text()); });
  await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html?shot=1&q=high&preset=day`);
  await pg.waitForFunction(() => window.__ready || window.__error, null, { timeout: 600000, polling: 500 });
  const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 600000 }), pg.evaluate(() => window.__app.exportGLB())]);
  await dl.saveAs(out);
  console.log('saved', out, (fs.statSync(out).size / 1048576).toFixed(1) + ' MB');
  await b.close(); srv.close();
});
