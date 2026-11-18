// Turrets and towers: octagonal corner turrets of the pavilions, the four slender
// open-belfry towers that cluster around the dome, and the chamber-hall towers.
import * as THREE from 'three';
import { M, tr, box, boxMin, prism, pyramid, lathe, blob, extrude, flat, shape, archPts, lancetOutline, foilPts, moulding, clean } from '../geo/util.js';
import { crocket, finial, crocketedSpire, wimperg, pinnacle, parapetPanel, corbelTable, turretSpire } from './ornament.js';
import { tracery } from './modules.js';
import { A } from './modules.js';

const V2 = (x, y) => new THREE.Vector2(x, y);

/** Place geometry around an n-gon: fn(angle, apothem) for each face. */
function around(n, r, fn) {
  const ap = r * Math.cos(Math.PI / n);
  for (let i = 0; i < n; i++) fn((i / n) * Math.PI * 2, ap, i);
}

/**
 * Octagonal corner turret. r = circumradius. Shaft from 0 to shaftTop with string
 * courses at the storey lines and slit lancets; corbelled gallery with pierced
 * parapet and pinnacles; open lantern stage; crocketed spire.
 */
export function cornerTurret(r, shaftTop, spireH, { lantern = true, gold = true } = {}) {
  const out = { stone: [], carve: [], glass: [], roof: [], gold: [], dark: [] };
  out.stone.push(prism(8, r, r, 0, shaftTop));
  out.carve.push(prism(8, r + 0.15, r + 0.1, 0, 1.4));
  const side = 2 * r * Math.sin(Math.PI / 8);
  for (const y of [A.G1, A.F1, A.S1]) if (y < shaftTop - 1) out.carve.push(prism(8, r + 0.12, r + 0.12, y, y + 0.25));
  // slit windows on each face per storey
  for (const [y0, sy] of [[3.0, 5.6], [9.0, 12.4], [16.0, 18.8]]) {
    if (sy > shaftTop - 1.5) continue;
    around(8, r, (a, ap) => {
      const w = Math.min(0.6, side * 0.45);
      out.dark.push(tr(flat(shape(lancetOutline(w, y0, sy, 1, 8))), M(Math.sin(a) * (ap + 0.01), 0, Math.cos(a) * (ap + 0.01), a)));
      out.carve.push(tr(extrude(shape(lancetOutline(w + 0.2, y0 - 0.1, sy, 1, 8), [lancetOutline(w, y0, sy, 1, 8)]), 0.08, 0.08), M(Math.sin(a) * ap, 0, Math.cos(a) * ap, a)));
    });
  }
  // corbelled gallery
  const gy = shaftTop;
  out.carve.push(lathe([[r, gy - 1.2], [r + 0.25, gy - 0.8], [r + 0.45, gy - 0.3], [r + 0.55, gy], [r + 0.55, gy + 0.15], [0.01, gy + 0.15]], 8, { phase: Math.PI / 8 }));
  around(8, r + 0.5, (a, ap) => {
    const pp = parapetPanel(2 * (r + 0.5) * Math.sin(Math.PI / 8), 0.9, 0.16, 2, 16);
    pp.carve.forEach(g => out.carve.push(tr(g, M(Math.sin(a) * ap, gy + 0.15, Math.cos(a) * ap, a))));
  });
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i / 8) * Math.PI * 2, rr = r + 0.5;
    pinnacle(0.34, 2.2, { lite: true }).carve.forEach(g => out.carve.push(tr(g, M(Math.sin(a) * rr, gy + 0.15, Math.cos(a) * rr))));
  }
  let y = gy + 0.15;
  const rl = r * 0.78;
  if (lantern) {
    const lh = Math.max(2.6, r * 1.7);
    // open lantern: 8 piers with pointed openings (dark interior core)
    out.dark.push(prism(8, rl * 0.6, rl * 0.6, y, y + lh));
    around(8, rl, (a, ap, i) => {
      const w = 2 * rl * Math.sin(Math.PI / 8);
      const ol = lancetOutline(w * 0.62, 0.0, lh * 0.62, 1, 8);
      const panel = extrude(shape([V2(-w / 2, 0), V2(w / 2, 0), V2(w / 2, lh), V2(-w / 2, lh)], [ol]), 0.18, 0.0);
      out.stone.push(tr(panel, M(Math.sin(a) * ap, y, Math.cos(a) * ap, a)));
      const wg = wimperg(w * 0.9, lh * 0.55, 0.1, { crockets: 2, cs: 0.12, finialH: 0.35, blind: false });
      wg.carve.forEach(g => out.carve.push(tr(g, M(Math.sin(a) * (ap + 0.08), y + lh * 0.62, Math.cos(a) * (ap + 0.08), a))));
    });
    y += lh;
    out.carve.push(prism(8, rl + 0.12, rl + 0.12, y, y + 0.25));
    y += 0.25;
  }
  const sp = turretSpire(rl + 0.05, y, spireH, { lucarnes: true, crockets: Math.max(3, Math.round(spireH / 1.6)), gold });
  for (const k of Object.keys(sp)) out[k].push(...sp[k]);
  out.tip = y + spireH;
  return out;
}

/**
 * Slender tower flanking the dome (4×). Square shaft (s wide) with angle buttresses,
 * tall open belfry with paired lancets & wimpergs, octagonal stage, very tall spire.
 */
export function slenderTower(s, baseY, shaftTop, spireH) {
  const out = { stone: [], carve: [], glass: [], roof: [], gold: [], dark: [] };
  const h = s / 2;
  out.stone.push(boxMin(-h, baseY, -h, s, shaftTop - baseY, s));
  // angle buttresses
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    for (const ax of ['x', 'z']) {
      const bx = ax === 'x' ? sx * (h + 0.25) : sx * (h - 0.35);
      const bz = ax === 'z' ? sz * (h + 0.25) : sz * (h - 0.35);
      out.stone.push(box(ax === 'x' ? 0.5 : 0.7, shaftTop - baseY, ax === 'z' ? 0.5 : 0.7, bx, (baseY + shaftTop) / 2, bz));
    }
    pinnacle(0.7, 4.2).carve.forEach(g => out.carve.push(tr(g, M(sx * (h + 0.1), shaftTop, sz * (h + 0.1)))));
  }
  // storeys: blind tracery panels + windows on each face
  for (let f = 0; f < 4; f++) {
    const a = f * Math.PI / 2;
    const place = (g, y = 0, z = h) => tr(g, M(Math.sin(a) * z, y, Math.cos(a) * z, a));
    for (let yy = baseY + 2; yy < shaftTop - 12; yy += 6.5) {
      const t = tracery(s * 0.42, yy, yy + 3.4, 1, { lights: 2, oculus: true, recess: -0.05, thick: 0.1 });
      t.glass.forEach(g => out.glass.push(place(g, 0, h + 0.18)));
      t.carve.forEach(g => out.carve.push(place(g, 0, h + 0.18)));
      out.carve.push(place(box(s, 0.2, 0.2), yy - 0.4, h + 0.1));
    }
    // belfry: tall paired open lancets with shafts, under a crocketed wimperg
    const by0 = shaftTop - 10.5, bsy = shaftTop - 4.2;
    for (const cx of [-s * 0.2, s * 0.2]) {
      out.dark.push(place(flat(shape(lancetOutline(s * 0.3, by0, bsy, 1, 10, cx))), 0, h + 0.02));
      out.carve.push(place(extrude(shape(lancetOutline(s * 0.36, by0 - 0.05, bsy, 1, 10, cx), [lancetOutline(s * 0.3, by0, bsy, 1, 10, cx, 0.12)]), 0.12, 0.12), 0, h));
    }
    const wg = wimperg(s * 0.95, 4.2, 0.18, { crockets: 4, cs: 0.22, finialH: 0.9, blind: true });
    wg.carve.forEach(g => out.carve.push(place(g, bsy + 0.9, h + 0.3)));
    out.carve.push(place(box(s + 0.2, 0.3, 0.3), by0 - 0.6, h + 0.05));
  }
  // corbel table + parapet at shaft top
  for (let f = 0; f < 4; f++) {
    const a = f * Math.PI / 2;
    corbelTable(s, 0, 0.3).forEach(g => out.carve.push(tr(g, M(Math.sin(a) * h, shaftTop - 0.6, Math.cos(a) * h, a))));
  }
  // octagonal stage
  const r8 = h * 1.02;
  const y8 = shaftTop;
  out.stone.push(prism(8, r8, r8, y8, y8 + 4.2));
  around(8, r8, (a, ap) => {
    const w = 2 * r8 * Math.sin(Math.PI / 8);
    out.dark.push(tr(flat(shape(lancetOutline(w * 0.45, 0.6, 2.6, 1, 8))), M(Math.sin(a) * (ap + 0.01), y8, Math.cos(a) * (ap + 0.01), a)));
    out.carve.push(tr(extrude(shape(lancetOutline(w * 0.6, 0.5, 2.6, 1, 8), [lancetOutline(w * 0.45, 0.6, 2.6, 1, 8, 0, 0.08)]), 0.08, 0.08), M(Math.sin(a) * ap, y8, Math.cos(a) * ap, a)));
    const wg = wimperg(w * 0.95, 1.9, 0.12, { crockets: 2, cs: 0.14, finialH: 0.5, blind: false });
    wg.carve.forEach(g => out.carve.push(tr(g, M(Math.sin(a) * (ap + 0.1), y8 + 3.1, Math.cos(a) * (ap + 0.1), a))));
  });
  out.carve.push(prism(8, r8 + 0.15, r8 + 0.15, y8 + 4.2, y8 + 4.5));
  // white stone needle: eight crocketed ribs around a pierced spire with trefoil openings
  const sp = turretSpire(r8, y8 + 4.5, spireH, { lucarnes: true, crockets: Math.round(spireH / 1.3), gold: true });
  out.carve.push(...sp.roof); // stone, not tile
  for (const k of ['carve', 'gold']) out[k].push(...(sp[k] || []));
  for (let b = 0; b < 3; b++) {
    const t = 0.3 + b * 0.2, rr = r8 * (1 - t);
    out.carve.push(prism(8, rr + 0.12, rr + 0.1, y8 + 4.5 + spireH * t, y8 + 4.5 + spireH * t + 0.25));
  }
  around(8, r8 * 0.55, (a, ap) => {
    for (let b = 0; b < 3; b++) {
      const t = 0.18 + b * 0.22, rr = r8 * (1 - t) * Math.cos(Math.PI / 8) + 0.02;
      out.dark.push(tr(flat(shape(foilPts(0, 0, 0.32 * (1 - t), 3, 18, Math.PI / 2))), M(Math.sin(a) * rr, y8 + 4.5 + spireH * (t + 0.08), Math.cos(a) * rr, a, 1, 1, 1, -Math.atan2(r8, spireH))));
    }
  });
  out.tip = y8 + 4.5 + spireH;
  return out;
}
