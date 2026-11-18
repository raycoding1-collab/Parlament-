// Kossuth tér side: the entrance block (OSM: x ±38.4, z −67.5…−52.1), the main
// porch (x ±14.3 to z −73.0) with its flight of steps and Béla Markup's lions.
// No measured photograph of this side was available, so the composition follows
// the plan and the documented elements, and reuses the façade vocabulary of the
// end blocks (ref/SPEC.md).
import * as THREE from 'three';
import { M, tr, box, boxMin, prism, lathe, extrude, flat, shape, lancetOutline, archPts, foilPts, circlePts, moulding, sweepXY } from '../geo/util.js';
import { END } from './bays.js';
import { pinnacle, wimperg, finial, parapetPanel, crocket } from './ornament.js';
import { lion } from './lion.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
const rect = (x0, y0, x1, y1) => [V2(x0, y0), V2(x1, y0), V2(x1, y1), V2(x0, y1)];

export function buildEntrance2(kit, { run, rangeRoof }) {
  for (const sg of [1, -1]) {
    const F = (ax, az, bx, bz, o = {}) => sg > 0 ? run(kit, ax, az, bx, bz, o) : run(kit, -bx, bz, -ax, az, { ...o, ends: o.ends ? [o.ends[1], o.ends[0]] : undefined });
    F(38.4, -67.5, 14.3, -67.5, { ends: [true, true] });
    F(38.4, -52.1, 38.4, -67.5, { ends: [true, false] });
    F(32.2, -52.1, 38.4, -52.1, { ends: [false, true] });
    kit.put('turretEnd', M(sg * 35.8, 0, -65.0));
  }
  kit.add('dark', boxMin(-37.8, 0, -66.9, 75.6, 22.6, 14.2));
  rangeRoof(kit, -38.4, 38.4, -67.5, -52.1, 22.8, 9.4, 6.0, 'x', ['hip', 'hip'], { chimneys: 4 });

  // ---- central bay of the entrance block: tall gable with rose, flanked by turrets
  const W = 28.6, z = -67.5;
  const m = M(0, 0, z, Math.PI);
  const win = [-6.5, 0, 6.5].map(c => lancetOutline(2.6, 14.0, 19.6, 0.9, 16, c));
  kit.add('stone', extrude(shape(rect(-W / 2, 12.0, W / 2, END.CORNICE + 1.5), win), 1.0, 0), m);
  win.forEach(o => kit.add('glass', flat(shape(o), -0.5), m));
  kit.add('carve', moulding(-W / 2, W / 2, END.CORNICE + 1.1, [[0, 0], [0, 0.3], [0.14, 0.44], [0.32, 0.55], [0.5, 0.48], [0.55, 0]]), m);
  const gw = 20, gh = 15, gy = END.CORNICE + 1.5;
  const rose = circlePts(0, gy + gh * 0.42, 2.4, 40);
  kit.add('stone', extrude(shape([V2(-gw / 2, gy), V2(gw / 2, gy), V2(0, gy + gh)], [rose]), 1.0, 0.3), m);
  kit.add('carve', extrude(shape(rose, [foilPts(0, gy + gh * 0.42, 2.05, 8, 64, 0), circlePts(0, gy + gh * 0.42, 0.5, 16)]), 0.16, 0.05), m);
  kit.add('glass', flat(shape(rose), -0.5), m);
  const len = Math.hypot(gw / 2, gh), ang = Math.atan2(gh, gw / 2);
  for (const s of [-1, 1]) {
    kit.add('carve', box(len, 0.4, 1.3), m.clone().multiply(M(s * gw / 4, gy + gh / 2 + 0.15, 0.35, 0, 1, 1, 1, 0, -s * ang)));
    for (let k = 1; k <= 10; k++) for (const c of crocket(0.5)) kit.add('carve', c, m.clone().multiply(M(s * (gw / 2) * (1 - k / 11), gy + gh * k / 11 + 0.4, 0.35, 0, 1, 1, 1, -1.3)));
    pinnacle(1.3, 11).carve.forEach(g => kit.add('carve', g, m.clone().multiply(M(s * (gw / 2 + 0.3), gy, 0.4))));
    kit.put('turretEnd', M(s * 13.0, 0, -66.0));
  }
  finial(2.8, true).gold.forEach(g => kit.add('gold', g, m.clone().multiply(M(0, gy + gh - 0.2, 0.3))));
  const r = rangeRoof(kit, -10, 10, -67.5, -55, gy, gh - 0.6, 9.6, 'z', ['none', 'none'], { crest: false });

  // ---- porch: three pointed arches with crocketed gables and a balcony
  const pz0 = -73.0, pz1 = -67.5, PH = 12.0, py = 2.6;
  const pm = M(0, 0, pz0, Math.PI);
  const ar = [-9.0, 0, 9.0].map(cx => lancetOutline(6.4, py, py + 5.4, 0.72, 20, cx));
  kit.add('stone', extrude(shape(rect(-14.3, 0, 14.3, PH), ar), 1.2, 0), pm);
  for (const cx of [-9.0, 0, 9.0]) {
    kit.add('carve', sweepXY([V2(cx - 3.2, py + 0.6), ...archPts(6.4, py + 5.4, 0.72, 22, cx), V2(cx + 3.2, py + 0.6)].reverse(), [[-0.08, 0], [0.04, 0.12], [0.16, 0.18], [0.3, 0.1], [0.36, 0]]), pm);
    wimperg(7.6, 5.6, 0.3, { crockets: 6, cs: 0.3, finialH: 1.2, biteW: 7.0, biteSpring: 0, biteK: 0.72 }).carve.forEach(g => kit.add('carve', g, pm.clone().multiply(M(cx, py + 5.4, 0.35))));
  }
  for (const x of [-14.3, -4.5, 4.5, 14.3]) {
    kit.add('stone', boxMin(x - 0.75, 0, pz0 - 0.9, 1.5, PH + 0.4, 1.4));
    pinnacle(1.2, 6.5).carve.forEach(g => kit.add('carve', g, M(x, PH + 0.4, pz0 - 0.2)));
  }
  kit.add('dark', boxMin(-13.6, py, pz0 + 0.6, 27.2, PH - py - 0.6, pz1 - pz0 - 0.6));
  kit.add('paving', boxMin(-14.3, 0, pz0, 28.6, py, pz1 - pz0));
  for (let i = 0; i < 6; i++) kit.add('carve', parapetPanel(28.6 / 6, 1.1, 0.25, 4, 16).carve[0], M(-14.3 + 28.6 * (i + 0.5) / 6, PH, pz0 - 0.05, Math.PI));
  kit.add('carve', moulding(-14.3, 14.3, PH - 0.5, [[0, 0], [0, 0.3], [0.2, 0.5], [0.5, 0.4], [0.5, 0]]), pm);

  // ---- flight of steps down to Kossuth tér and the two lions
  const steps = 16, rise = py / steps, tread = 0.6;
  for (let i = 0; i < steps; i++) {
    const w = 30 + (steps - i) * 0.3;
    kit.add('quay', boxMin(-w / 2, 0, pz0 - (steps - i) * tread, w, rise * (i + 1), tread + 0.02));
  }
  if (!kit.has('lion')) kit.def('lion', () => lion());
  const cz = pz0 - steps * tread;
  for (const sx of [-1, 1]) {
    const x = sx * 16.6;
    kit.add('stone', boxMin(x - 1.1, 0, cz - 3.4, 2.2, 2.1, 3.4 + steps * tread));
    kit.add('carve', moulding(-1.2, 1.2, 1.9, [[0, 0], [0, 0.15], [0.12, 0.2], [0.25, 0.1], [0.25, 0]]), M(x, 0, cz - 3.4, Math.PI));
    kit.add('stone', boxMin(x - 1.4, 0, cz - 3.8, 2.8, 0.5, 4.0));
    kit.put('lion', M(x, 2.15, cz - 1.7, Math.PI));
  }
}
