// Towers measured from the long-lens Danube elevation (ref/SPEC.md).
import * as THREE from 'three';
import { M, tr, box, boxMin, prism, pyramid, lathe, extrude, flat, shape, archPts, lancetOutline, foilPts, circlePts, moulding, clean } from '../geo/util.js';
import { crocket, finial, crocketedSpire, wimperg, pinnacle, parapetPanel, corbelTable } from './ornament.js';
import { tracery } from './modules.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
const rect = (x0, y0, x1, y1) => [V2(x0, y0), V2(x1, y0), V2(x1, y1), V2(x0, y1)];
const faces4 = (fn) => { for (let f = 0; f < 4; f++) fn(f * Math.PI / 2); };
const around = (n, r, fn) => { const ap = r * Math.cos(Math.PI / n); for (let i = 0; i < n; i++) fn((i / n) * Math.PI * 2, ap, i); };
const place = (a, d, y = 0) => M(Math.sin(a) * d, y, Math.cos(a) * d, a);

/** Octagonal crocketed stone spire with lucarne rings and bands. */
function stoneSpire(out, r, y0, h, mat = 'carve', gold = true) {
  out[mat].push(pyramid(8, r, y0, h));
  for (let e = 0; e < 8; e++) {
    const a = Math.PI / 8 + (e / 8) * Math.PI * 2;
    const len = Math.hypot(r, h);
    out.carve.push(tr(box(0.16, len, 0.16), M(Math.sin(a) * r / 2, y0 + h / 2, Math.cos(a) * r / 2, a, 1, 1, 1, -Math.atan2(r, h))));
    const n = Math.round(h / 1.25);
    for (let k = 1; k < n; k++) {
      const t = k / n, rr = r * (1 - t) + 0.05;
      for (const c of crocket(0.34 * (1 - t * 0.6))) out.carve.push(tr(c, M(Math.sin(a) * rr, y0 + h * t, Math.cos(a) * rr, a)));
    }
  }
  for (const t of [0.22, 0.48]) out.carve.push(prism(8, r * (1 - t) + 0.12, r * (1 - t) + 0.1, y0 + h * t, y0 + h * t + 0.22));
  around(8, r, (a, ap) => {
    for (const [t, s] of [[0.06, 1], [0.32, 0.7]]) {
      const rr = (r * (1 - t)) * Math.cos(Math.PI / 8);
      const lw = r * 0.5 * s;
      wimperg(lw, lw * 1.5, 0.1, { crockets: 2, cs: 0.12 * s, finialH: 0.35 * s, blind: true }).carve.forEach(g => out.carve.push(tr(g, M(Math.sin(a) * rr, y0 + h * t, Math.cos(a) * rr, a))));
    }
  });
  const f = finial(Math.max(1.0, r * 0.45), gold);
  (f.gold || f.carve).forEach(g => (gold ? out.gold : out.carve).push(tr(g, M(0, y0 + h - 0.15, 0))));
}

/**
 * Front tower of the Danube risalit (8.8 m square). Origin at the tower axis on the terrace.
 * Faces: +z river, ±x sides; the back merges into the building.
 */
export function frontTower() {
  const out = { stone: [], carve: [], glass: [], dark: [], gold: [] };
  const S = 8.8, h = S / 2;
  // ---- stage A: shaft 0–24.4 with angle buttresses
  out.stone.push(boxMin(-h, 0, -h, S, 24.4, S));
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    out.stone.push(box(0.7, 24.4, 0.7, sx * (h + 0.1), 12.2, sz * (h + 0.1)));
    out.stone.push(box(0.5, 34.9, 0.5, sx * (h - 0.25), 17.45, sz * (h - 0.25)));
  }
  faces4((a) => {
    if (Math.abs(Math.cos(a) + 1) < 1e-6) return; // back face hidden in the building
    const P = (g, y = 0, d = h) => tr(g, place(a, d, y));
    // ground: round-arched window, mezzanine, tall traceried lancet, blind tracery
    const rw = [V2(-0.6, 3.7), V2(0.6, 3.7)];
    for (let i = 0; i <= 10; i++) { const t = Math.PI - (i / 10) * Math.PI; rw.splice(1 + i, 0, V2(Math.cos(t) * 0.6, 6.9 + Math.sin(t) * 0.6)); }
    out.dark.push(P(flat(shape(rw)), 0, h + 0.02));
    out.dark.push(P(flat(shape(rect(-0.5, 9.2, 0.5, 11.3))), 0, h + 0.02));
    const t = tracery(1.9, 13.0, 17.6, 0.9, { lights: 2, oculus: true, transom: 15.4, recess: -0.05, thick: 0.1 });
    t.glass.forEach(g => out.glass.push(P(g, 0, h + 0.2)));
    t.carve.forEach(g => out.carve.push(P(g, 0, h + 0.2)));
    out.carve.push(P(extrude(shape(lancetOutline(2.4, 12.8, 17.6, 0.9, 12), [lancetOutline(2.0, 12.9, 17.6, 0.9, 12)]), 0.15, 0.12), 0, h));
    wimperg(2.8, 3.4, 0.16, { crockets: 4, cs: 0.22, finialH: 0.7, biteW: 2.4, biteSpring: 0, biteK: 0.9 }).carve.forEach(g => out.carve.push(P(g, 17.6, h + 0.25)));
    for (const y of [2.6, 8.4, 12.2]) out.carve.push(P(box(S, 0.25, 0.25), y, h + 0.1));
    // blind arcading under the cornice
    const holes = []; for (let i = 0; i < 6; i++) holes.push(lancetOutline(0.9, 21.0, 22.7, 1, 6, -3.25 + i * 1.3, 0.1));
    out.carve.push(P(extrude(shape(rect(-h, 20.8, h, 23.4), holes), 0.08, 0.08), 0, h));
    corbelTable(S, 23.6, 0.3).forEach(g => out.carve.push(P(g, 0, h)));
  });
  // ---- stage B: 24.4–34.9, twin tall lancets under a wimperg on each face
  const SB = 6.9, hb = SB / 2;
  out.stone.push(boxMin(-hb, 24.4, -hb, SB, 10.5, SB));
  faces4((a) => {
    const P = (g, y = 0, d = hb) => tr(g, place(a, d, y));
    for (const cx of [-0.95, 0.95]) {
      out.dark.push(P(flat(shape(lancetOutline(0.95, 26.5, 31.6, 1, 10, cx))), 0, hb + 0.02));
      out.carve.push(P(extrude(shape(lancetOutline(1.2, 26.4, 31.6, 1, 10, cx), [lancetOutline(0.95, 26.5, 31.6, 1, 10, cx, 0.15)]), 0.14, 0.12), 0, hb));
    }
    out.carve.push(P(extrude(shape(foilPts(0, 32.3, 0.45, 4, 24), [foilPts(0, 32.3, 0.3, 4, 24)]), 0.1, 0.1), 0, hb));
    wimperg(3.3, 2.8, 0.16, { crockets: 3, cs: 0.2, finialH: 0.6, blind: false }).carve.forEach(g => out.carve.push(P(g, 31.4, hb + 0.25)));
    out.carve.push(P(box(SB + 0.4, 0.3, 0.4), 24.4, hb));
  });
  // gallery 34.9: corbelled parapet + corner pinnacles
  out.carve.push(lathe([[hb * 1.414, 34.2], [hb * 1.414 + 0.6, 34.9], [0.01, 34.9]], 4, { phase: Math.PI / 4 }));
  faces4((a) => parapetPanel(SB + 1.2, 1.0, 0.2, 5, 16).carve.forEach(g => out.carve.push(tr(g, place(a, hb + 0.55, 34.9)))));
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) pinnacle(0.75, 6.0).carve.forEach(g => out.carve.push(tr(g, M(sx * (hb + 0.15), 34.9, sz * (hb + 0.15)))));
  // ---- stage C: 34.9–42.6
  const SC = 5.2, hc = SC / 2;
  out.stone.push(boxMin(-hc, 34.9, -hc, SC, 7.7, SC));
  faces4((a) => {
    const P = (g, y = 0, d = hc) => tr(g, place(a, d, y));
    out.dark.push(P(flat(shape(lancetOutline(1.3, 36.3, 40.0, 1, 10))), 0, hc + 0.02));
    out.carve.push(P(extrude(shape(lancetOutline(1.55, 36.2, 40.0, 1, 10), [lancetOutline(1.3, 36.3, 40.0, 1, 10, 0, 0.18)]), 0.14, 0.12), 0, hc));
    wimperg(2.2, 2.2, 0.14, { crockets: 3, cs: 0.18, finialH: 0.5, blind: false, biteW: 1.55, biteSpring: 0, biteK: 1 }).carve.forEach(g => out.carve.push(P(g, 40.0, hc + 0.2)));
  });
  out.carve.push(lathe([[hc * 1.414, 41.9], [hc * 1.414 + 0.6, 42.6], [0.01, 42.6]], 4, { phase: Math.PI / 4 }));
  faces4((a) => parapetPanel(SC + 1.2, 0.9, 0.18, 4, 16).carve.forEach(g => out.carve.push(tr(g, place(a, hc + 0.55, 42.6)))));
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) pinnacle(0.6, 4.6).carve.forEach(g => out.carve.push(tr(g, M(sx * (hc + 0.2), 42.6, sz * (hc + 0.2)))));
  // ---- stage D: octagonal belfry 42.6–49.6
  const r8 = 2.45;
  out.dark.push(prism(8, r8 * 0.7, r8 * 0.7, 42.6, 49.6));
  around(8, r8, (a, ap) => {
    const w = 2 * r8 * Math.sin(Math.PI / 8);
    const ol = lancetOutline(w * 0.62, 43.4, 47.3, 1, 10);
    out.stone.push(tr(extrude(shape(rect(-w / 2, 42.6, w / 2, 49.6), [ol]), 0.3, 0), place(a, ap)));
    out.carve.push(tr(extrude(shape(ol, [lancetOutline(w * 0.48, 43.45, 47.3, 1, 10, 0, 0.12)]), 0.08, -0.05), place(a, ap)));
    wimperg(w * 0.95, 2.4, 0.12, { crockets: 2, cs: 0.16, finialH: 0.5, blind: false }).carve.forEach(g => out.carve.push(tr(g, place(a, ap + 0.12, 47.6))));
    const ca = a + Math.PI / 8;
    pinnacle(0.38, 2.6, { lite: true }).carve.forEach(g => out.carve.push(tr(g, M(Math.sin(ca) * (r8 + 0.08), 48.8, Math.cos(ca) * (r8 + 0.08)))));
  });
  out.carve.push(prism(8, r8 + 0.25, r8 + 0.2, 49.4, 50.0));
  // ---- crocketed stone spire 50.0–65.8
  stoneSpire(out, 1.95, 50.0, 15.8, 'carve', true);
  return out;
}

/** Corner turret of a chamber block: square shaft, octagonal lantern, dark slate spire (to 57.7 m). */
export function chamberTurret(y0 = 21.0) {
  const out = { stone: [], carve: [], dark: [], gold: [], lead: [], glass: [] };
  const S = 3.4, h = S / 2;
  out.stone.push(boxMin(-h, y0, -h, S, 40.5 - y0, S));
  faces4((a) => {
    const P = (g, y = 0, d = h) => tr(g, place(a, d, y));
    out.dark.push(P(flat(shape(lancetOutline(0.7, 25.8, 29.8, 1, 8))), 0, h + 0.02));
    out.dark.push(P(flat(shape(lancetOutline(0.7, 33.0, 36.6, 1, 8))), 0, h + 0.02));
    out.carve.push(P(extrude(shape(lancetOutline(0.95, 32.9, 36.6, 1, 8), [lancetOutline(0.7, 33.0, 36.6, 1, 8, 0, 0.08)]), 0.1, 0.1), 0, h));
    out.carve.push(P(box(S + 0.2, 0.25, 0.3), 33.7, h));
    wimperg(1.9, 2.2, 0.12, { crockets: 2, cs: 0.16, finialH: 0.45, blind: true }).carve.forEach(g => out.carve.push(P(g, 38.0, h + 0.15)));
  });
  out.carve.push(lathe([[h * 1.414, 39.9], [h * 1.414 + 0.45, 40.5], [0.01, 40.5]], 4, { phase: Math.PI / 4 }));
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) pinnacle(0.45, 3.2, { lite: true }).carve.forEach(g => out.carve.push(tr(g, M(sx * (h + 0.1), 40.5, sz * (h + 0.1)))));
  // octagonal open lantern
  const r = 1.4;
  out.dark.push(prism(8, r * 0.65, r * 0.65, 40.5, 47.3));
  around(8, r, (a, ap) => {
    const w = 2 * r * Math.sin(Math.PI / 8);
    out.stone.push(tr(extrude(shape(rect(-w / 2, 40.5, w / 2, 47.3), [lancetOutline(w * 0.55, 41.2, 45.2, 1, 8)]), 0.18, 0), place(a, ap)));
    wimperg(w * 0.95, 1.5, 0.1, { crockets: 1, cs: 0.12, finialH: 0.3, blind: false }).carve.forEach(g => out.carve.push(tr(g, place(a, ap + 0.08, 45.6))));
  });
  out.carve.push(prism(8, r + 0.15, r + 0.12, 47.1, 47.4));
  // dark slate spire with crockets and gilded finial
  out.lead.push(pyramid(8, 1.1, 47.4, 9.4));
  for (let e = 0; e < 8; e++) {
    const a = Math.PI / 8 + (e / 8) * Math.PI * 2;
    for (let k = 1; k < 6; k++) { const t = k / 6, rr = 1.1 * (1 - t) + 0.03; for (const c of crocket(0.15 * (1 - t * 0.5))) out.lead.push(tr(c, M(Math.sin(a) * rr, 47.4 + 9.4 * t, Math.cos(a) * rr, a))); }
  }
  finial(1.0, true).gold.forEach(g => out.gold.push(tr(g, M(0, 56.7, 0))));
  return out;
}

/** End-block roof turret (rises behind the corner gables): lantern 30.8–35.6, slate spire to 40.7 m. */
export function endTurret() {
  const out = { stone: [], carve: [], dark: [], gold: [], lead: [] };
  const r = 1.45;
  out.stone.push(prism(8, r, r, 22.0, 30.8));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    out.dark.push(tr(flat(shape(lancetOutline(0.45, 25.5, 28.6, 1, 8))), place(a, r * Math.cos(Math.PI / 8) + 0.02)));
  }
  out.carve.push(prism(8, r + 0.35, r + 0.25, 30.5, 30.8));
  around(8, r + 0.3, (a, ap) => parapetPanel(2 * (r + 0.3) * Math.sin(Math.PI / 8), 0.7, 0.14, 1, 14).carve.forEach(g => out.carve.push(tr(g, place(a, ap, 30.8)))));
  const rl = 1.05;
  out.dark.push(prism(8, rl * 0.6, rl * 0.6, 31.0, 35.6));
  around(8, rl, (a, ap) => {
    const w = 2 * rl * Math.sin(Math.PI / 8);
    out.stone.push(tr(extrude(shape(rect(-w / 2, 31.0, w / 2, 35.6), [lancetOutline(w * 0.55, 31.6, 34.4, 1, 6)]), 0.14, 0), place(a, ap)));
  });
  out.carve.push(prism(8, rl + 0.15, rl + 0.12, 35.4, 35.7));
  out.lead.push(pyramid(8, rl + 0.05, 35.7, 4.4));
  for (let e = 0; e < 8; e++) {
    const a = Math.PI / 8 + (e / 8) * Math.PI * 2;
    for (let k = 1; k < 4; k++) { const t = k / 4, rr = (rl + 0.05) * (1 - t) + 0.03; for (const c of crocket(0.14)) out.lead.push(tr(c, M(Math.sin(a) * rr, 35.7 + 4.4 * t, Math.cos(a) * rr, a))); }
  }
  finial(0.7, true).gold.forEach(g => out.gold.push(tr(g, M(0, 39.9, 0))));
  return out;
}
