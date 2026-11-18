// Batch renderer: node tools/shots.cjs shots.json  (array of {out, preset, view?, pos?, target?, fov?, w, h})
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const list = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const root = path.resolve(__dirname, '../dist');
const srv = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); fs.readFile(p, (e, d) => { res.writeHead(e ? 404 : 200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const W = list[0].w || 1280, H = list[0].h || 720;
  const pg = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const logs = [];
  pg.on('console', m => { if (!m.text().includes('GPU stall') && !m.text().includes('Clock')) logs.push(m.type() + ': ' + m.text()); });
  pg.on('pageerror', e => logs.push('pageerror: ' + e.message));
  const t0 = Date.now();
  await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html?shot=1&q=${list[0].q || 'high'}&preset=${list[0].preset || 'golden'}&view=danube`);
  await pg.waitForFunction(() => window.__ready || window.__error, null, { timeout: 600000, polling: 500 });
  const err = await pg.evaluate(() => window.__error);
  if (err) { console.log(logs.join('\n')); process.exit(1); }
  await pg.evaluate(() => document.body.classList.add('clean'));
  let cur = list[0].preset || 'golden';
  for (const s of list) {
    const t1 = Date.now();
    await pg.evaluate((s) => {
      const a = window.__app;
      if (s.preset && s.preset !== window.__cur) { a.applyPreset(s.preset); window.__cur = s.preset; }
      if (s.view) a.setView(s.view, true);
      if (s.pos) a.look(s.pos, s.target, s.fov);
      a.setTime(s.time || 12.0);
      if (s.js) eval(s.js);
      if (!s.big) a.render();
    }, s);
    const data = s.big ? await pg.evaluate((s) => window.__app.screenshot(s.big[0], s.big[1], false), s) : await pg.evaluate(() => window.__app.renderer.domElement.toDataURL('image/png'));
    fs.writeFileSync(s.out, Buffer.from(data.split(',')[1], 'base64'));
    console.log('wrote', s.out, ((Date.now() - t1) / 1000).toFixed(1) + 's');
  }
  console.log(logs.slice(0, 30).join('\n'));
  console.log('total', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  await b.close(); srv.close();
});
