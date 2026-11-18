// Headless render helper: node tools/shot.cjs out.png preset view W H [extra-js]
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const [out = 'shot.png', preset = 'golden', view = 'danube', W = '1600', H = '900', extra = ''] = process.argv.slice(2);
const root = path.resolve(__dirname, '../dist');
const srv = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(fs.existsSync(p) && fs.statSync(p).isFile() ? p : path.join(root, 'index.html'), (e, d) => {
    res.writeHead(e ? 404 : 200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d);
  });
}).listen(0, async () => {
  const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const pg = await b.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
  const logs = [];
  pg.on('console', m => logs.push(m.type() + ': ' + m.text()));
  pg.on('pageerror', e => logs.push('pageerror: ' + e.message));
  const t0 = Date.now();
  await pg.goto(`http://127.0.0.1:${port}/index.html?shot=1&q=high&preset=${preset}&view=${view}`);
  try { await pg.waitForFunction(() => window.__ready || window.__error, null, { timeout: 600000, polling: 500 }); } catch (e) { logs.push('timeout'); }
  const err = await pg.evaluate(() => window.__error);
  if (err) logs.push('ERR ' + err);
  if (err) { console.log(logs.join('\n')); await b.close(); srv.close(); return; }
  await pg.evaluate(() => document.body.classList.add('clean'));
  if (extra) await pg.evaluate(extra);
  await pg.evaluate(() => { window.__app.render(); window.__app.render(); });
  const data = await pg.evaluate(() => window.__app.renderer.domElement.toDataURL('image/png'));
  fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  console.log(logs.filter(l => !l.includes('GPU stall')).slice(0, 40).join('\n'));
  console.log('time', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  await b.close(); srv.close();
});
