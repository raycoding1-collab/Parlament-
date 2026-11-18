const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../dist');
const srv = http.createServer((req, res) => { const p = path.join(root, req.url.split('?')[0]); fs.readFile(p, (e, d) => { res.writeHead(e ? 404 : 200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage();
  // stub: stop after build by intercepting
  pg.on('console', m => { if (m.text().startsWith('stats') || m.text().startsWith('textures') || m.type() === 'error') console.log(m.text()); });
  await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html?q=low`);
  await pg.waitForFunction(() => window.__app && window.__app.scene.children.length > 2 || window.__error, null, { timeout: 600000, polling: 300 });
  const rep = await pg.evaluate(() => { const g = window.__app.scene.children.find(o => o.userData.report); return g.userData.report.slice(0, 45).map(r => r.join('  ')).join('\n'); });
  console.log(rep);
  await b.close(); srv.close();
});
