// Towers measured from the long-lens Danube elevation (ref/SPEC.md).
import * as THREE from 'three';
import { M, tr, box, boxMin, prism, pyramid, lathe, extrude, flat, shape, archPts, lancetOutline, foilPts, circlePts, moulding, clean } from '../geo/util.js';
import { crocket, finial, crocketedSpire, wimperg, pinnacle, parapetPanel, corbelTable, statue } from './ornament.js';
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
    const n = Math.round(h / 0.72);
    for (let k = 1; k < n; k++) {
      const t = k / n, rr = r * (1 - t) + 0.06;
      for (const c of crocket(0.55 * (1 - t * 0.55))) out.carve.push(tr(c, M(Math.sin(a) * rr, y0 + h * t, Math.cos(a) * rr, a, 1.25, 0.8, 1.15, 0.25)));
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
  const out = { stone: [], carve: [], glass: [], dark: [], gold: [], shade: [] };
  const S = 8.8, h = S / 2;
  // Levels measured on the S3 close-up (camera solve s(z) = 14.24·300/(340.6 − z), z = 41):
  // arcade band 23.9–25.9 · stage B windows 27.4–33.3 · gallery 35.4 · statue stage 37.2–41.4 ·
  // gallery 41.4 · octagonal belfry 42.4–47.5 · cornice 47.5–48.2 · crown arcade 48.2–51.3 ·
  // spire 51.3 → 65.0, cross to 67.2.
  const A1 = 26.3, B1 = 35.4, C1 = 41.4, D0 = 42.4, D1 = 47.5, E0 = 48.2, E1 = 51.3;
  out.statue = [];
  // ---- stage A: shaft with angle buttresses
  out.stone.push(boxMin(-h, 0, -h, S, A1, S));
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    out.stone.push(box(0.7, A1, 0.7, sx * (h + 0.1), A1 / 2, sz * (h + 0.1)));
    out.stone.push(box(0.5, B1, 0.5, sx * (h - 0.25), B1 / 2, sz * (h - 0.25)));
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
    wimperg(3.0, 3.8, 0.16, { crockets: 4, cs: 0.22, finialH: 0.7, biteW: 2.4, biteSpring: 0, biteK: 0.9 }).carve.forEach(g => out.carve.push(P(g, 17.6, h + 0.25)));
    for (const y of [2.6, 8.4, 12.2, 22.9]) out.carve.push(P(box(S, 0.25, 0.25), y, h + 0.1));
    // open arcade band of eight round-headed arches under the corbel table
    const holes = [];
    for (let i = 0; i < 8; i++) {
      const cx = -3.5 + i, pts = [V2(cx - 0.36, 23.9)];
      for (let k = 0; k <= 8; k++) { const t2 = Math.PI - (k / 8) * Math.PI; pts.push(V2(cx + Math.cos(t2) * 0.36, 25.5 + Math.sin(t2) * 0.36)); }
      pts.push(V2(cx + 0.36, 23.9)); holes.push(pts);
    }
    out.carve.push(P(extrude(shape(rect(-h, 23.7, h, 26.0), holes), 0.12, 0.12), 0, h));
    holes.forEach(o => out.dark.push(P(flat(shape(o)), 0, h + 0.01)));
    corbelTable(S, A1 - 0.2, 0.3).forEach(g => out.carve.push(P(g, 0, h)));
  });
  // ---- stage B: twin-light window between two slim lancets, each under its own gable
  const SB = 6.9, hb = SB / 2;
  out.stone.push(boxMin(-hb, A1, -hb, SB, B1 - A1, SB));
  out.carve.push(boxMin(-h - 0.2, A1 - 0.05, -h - 0.2, S + 0.4, 0.3, S + 0.4));
  faces4((a) => {
    const P = (g, y = 0, d = hb) => tr(g, place(a, d, y));
    const w = 2.0, y0 = 27.4, sy = 31.6, k = 0.9;
    const t = tracery(w, y0, sy, k, { lights: 2, oculus: true, transom: 29.8, recess: -0.06, thick: 0.1 });
    t.carve.forEach(g => out.carve.push(P(g, 0, hb + 0.16)));
    t.glass.forEach(g => out.dark.push(P(g, 0, hb + 0.16)));
    out.carve.push(P(extrude(shape(lancetOutline(w + 0.4, y0 - 0.1, sy, (k * w + 0.2) / (w + 0.4), 14), [lancetOutline(w, y0, sy, k, 14)]), 0.16, 0.16), 0, hb));
    wimperg(2.9, 3.6, 0.14, { crockets: 3, cs: 0.2, finialH: 0.6, biteW: w + 0.4, biteSpring: 0, biteK: (k * w + 0.2) / (w + 0.4) }).carve.forEach(g => out.carve.push(P(g, sy, hb + 0.26)));
    for (const sx of [-1, 1]) {
      const cx = sx * 2.3;
      out.dark.push(P(flat(shape(lancetOutline(0.62, 28.0, 32.4, 1, 10, cx))), 0, hb + 0.02));
      out.carve.push(P(extrude(shape(lancetOutline(0.92, 27.9, 32.4, 1, 10, cx), [lancetOutline(0.62, 28.0, 32.4, 1, 10, cx)]), 0.12, 0.12), 0, hb));
      wimperg(1.25, 2.2, 0.1, { crockets: 2, cs: 0.14, finialH: 0.4, biteW: 0.92, biteSpring: 0, biteK: 1 }).carve.forEach(g => out.carve.push(tr(g, place(a, hb + 0.18, 32.4).multiply(M(cx)))));
    }
    out.carve.push(P(box(SB + 0.3, 0.22, 0.3), 27.0, hb));
  });
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) pinnacle(0.66, 5.2).carve.forEach(g => out.carve.push(tr(g, M(sx * (h - 0.25), B1 - 2.6, sz * (h - 0.25)))));
  // gallery 1: deep corbelled balcony projecting past the shaft, open parapet, corner pinnacles
  const gB = hb + 1.0;
  out.carve.push(lathe([[hb * 1.414, B1 - 1.0], [gB * 1.414, B1 - 0.05], [gB * 1.414, B1 + 0.12], [0.01, B1 + 0.12]], 4, { phase: Math.PI / 4 }));
  faces4((a) => {
    corbelTable(2 * gB, B1 - 0.75, 0.6).forEach(g => out.carve.push(tr(g, place(a, hb + 0.1, 0))));
    parapetPanel(2 * gB, 1.0, 0.2, 7, 16).carve.forEach(g => out.carve.push(tr(g, place(a, gB - 0.1, B1 + 0.1))));
  });
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) pinnacle(0.55, 3.4, { lite: true }).carve.forEach(g => out.carve.push(tr(g, M(sx * (gB - 0.25), B1 + 0.1, sz * (gB - 0.25)))));
  // ---- stage C: statue stage — two canopied niches per face, statues at the corners
  const SC = 5.6, hc = SC / 2;
  out.stone.push(boxMin(-hc, B1, -hc, SC, C1 - B1, SC));
  faces4((a) => {
    const P = (g, y = 0, d = hc) => tr(g, place(a, d, y));
    for (const cx of [-1.1, 1.1]) {
      const ol = lancetOutline(1.1, 37.0, 39.2, 1, 10, cx);
      out.shade.push(P(flat(shape(ol)), 0, hc - 0.32));
      out.carve.push(P(extrude(shape(lancetOutline(1.4, 36.9, 39.2, 1, 10, cx), [ol]), 0.4, 0.06), 0, hc));
      wimperg(1.8, 2.15, 0.1, { crockets: 2, cs: 0.14, finialH: 0.3, biteW: 1.4, biteSpring: 0, biteK: 1 }).carve.forEach(g => out.carve.push(tr(g, place(a, hc + 0.12, 39.2).multiply(M(cx)))));
      statue((cx > 0 ? 1 : 2)).statue.forEach(g => out.statue.push(tr(g, place(a, hc - 0.15, 37.05).multiply(M(cx, 0, 0, 0, 0.82, 0.82, 0.82)))));
    }
    out.carve.push(P(box(SC + 0.2, 0.22, 0.25), 36.8, hc));
  });
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    out.stone.push(box(0.9, C1 - B1, 0.9, sx * (hc + 0.15), (B1 + C1) / 2, sz * (hc + 0.15)));
    statue(3).statue.forEach(g => out.statue.push(tr(g, M(sx * (hc + 0.35), B1 + 0.1, sz * (hc + 0.35), Math.atan2(sx, sz), 0.8, 0.8, 0.8))));
    pinnacle(0.5, 3.0, { lite: true }).carve.forEach(g => out.carve.push(tr(g, M(sx * (hc + 0.15), C1 - 1.2, sz * (hc + 0.15)))));
  }
  // gallery 2
  const gC = hc + 0.45;
  out.carve.push(lathe([[hc * 1.414, C1 - 0.5], [gC * 1.414, C1], [gC * 1.414, C1 + 0.1], [0.01, C1 + 0.1]], 4, { phase: Math.PI / 4 }));
  faces4((a) => parapetPanel(2 * gC, 0.85, 0.18, 6, 16).carve.forEach(g => out.carve.push(tr(g, place(a, gC - 0.1, C1 + 0.1)))));
  // ---- stage D: octagonal belfry with tall slender lancets, pinnacles on the angles
  const r8 = 2.55;
  out.dark.push(prism(8, r8 * 0.7, r8 * 0.7, D0, D1));
  around(8, r8, (a, ap) => {
    const w = 2 * r8 * Math.sin(Math.PI / 8);
    const ol = lancetOutline(w * 0.5, D0 + 0.6, D1 - 1.5, 1, 10);
    out.stone.push(tr(extrude(shape(rect(-w / 2, D0, w / 2, D1), [ol]), 0.3, 0), place(a, ap)));
    out.carve.push(tr(extrude(shape(lancetOutline(w * 0.66, D0 + 0.5, D1 - 1.5, 1, 10), [ol]), 0.1, 0.08), place(a, ap)));
    const ca = a + Math.PI / 8;
    pinnacle(0.42, 3.4, { lite: true }).carve.forEach(g => out.carve.push(tr(g, M(Math.sin(ca) * (r8 + 0.1), D1 - 1.6, Math.cos(ca) * (r8 + 0.1)))));
  });
  // cornice on corbels
  out.carve.push(prism(8, r8 + 0.1, r8 + 0.45, D1, D1 + 0.4));
  out.carve.push(prism(8, r8 + 0.45, r8 + 0.45, D1 + 0.4, E0));
  // ---- crown stage: short octagon with a ring of small lancets, pinnacles round the spire foot
  const r9 = 2.2;
  out.dark.push(prism(8, r9 * 0.7, r9 * 0.7, E0, E1));
  around(8, r9, (a, ap) => {
    const w = 2 * r9 * Math.sin(Math.PI / 8);
    const hs = [-0.42, 0.42].map(cx => lancetOutline(0.5, E0 + 0.5, E1 - 1.0, 1, 8, cx));
    out.stone.push(tr(extrude(shape(rect(-w / 2, E0, w / 2, E1), hs), 0.25, 0), place(a, ap)));
    const ca = a + Math.PI / 8;
    pinnacle(0.34, 2.6, { lite: true }).carve.forEach(g => out.carve.push(tr(g, M(Math.sin(ca) * (r9 + 0.12), E1 - 1.2, Math.cos(ca) * (r9 + 0.12)))));
  });
  out.carve.push(prism(8, r9 + 0.25, r9 + 0.2, E1 - 0.2, E1 + 0.25));
  // ---- crocketed stone spire 51.3–65.0, cross to 67.2
  stoneSpire(out, 1.8, E1 + 0.2, 13.7, 'carve', true);
  return out;
}

/** Corner tower of a chamber block (S3 close-up): square stone shaft with trefoil gables at its
 *  head, then a tall dark slate spire with a small railed gallery part-way up (tip 57.7 m). */
export function chamberTurret(y0 = 21.0) {
  const out = { stone: [], carve: [], dark: [], gold: [], lead: [], glass: [], roof: [], iron: [] };
  const S = 3.6, h = S / 2, top = 36.2;
  out.stone.push(boxMin(-h, y0, -h, S, top - y0, S));
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) out.stone.push(box(0.45, top - y0 - 1.0, 0.45, sx * (h + 0.05), (y0 + top - 1.0) / 2, sz * (h + 0.05)));
  faces4((a) => {
    const P = (g, y = 0, d = h) => tr(g, place(a, d, y));
    // triple round-headed lights of the gallery storey and a twin light below
    for (const cx of [-0.75, 0, 0.75]) {
      const pts = [V2(cx - 0.22, 31.0)]; for (let i = 0; i <= 8; i++) { const t = Math.PI - i / 8 * Math.PI; pts.push(V2(cx + Math.cos(t) * 0.22, 32.4 + Math.sin(t) * 0.22)); } pts.push(V2(cx + 0.22, 31.0));
      out.dark.push(P(flat(shape(pts)), 0, h + 0.02));
    }
    for (const cx of [-0.45, 0.45]) out.dark.push(P(flat(shape(lancetOutline(0.55, 26.0, 28.6, 1, 8, cx))), 0, h + 0.02));
    out.carve.push(P(box(S + 0.3, 0.25, 0.3), 30.4, h));
    // the crocketed gable with trefoil that crowns each face
    const gw = S + 0.2, gh = 2.9;
    out.stone.push(P(extrude(shape([V2(-gw / 2, 0), V2(gw / 2, 0), V2(0, gh)], [foilPts(0, gh * 0.4, 0.42, 3, 24, Math.PI / 2)]), 0.3, 0.15), top - 0.6));
    out.dark.push(P(flat(shape(foilPts(0, gh * 0.4, 0.42, 3, 24, Math.PI / 2))), top - 0.6, h - 0.17));
    wimperg(gw + 0.15, gh + 0.1, 0.1, { crockets: 2, cs: 0.2, finialH: 0.5, blind: false }).carve.forEach(g => out.carve.push(P(g, top - 0.65, h + 0.18)));
  });
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) pinnacle(0.42, 3.4, { lite: true }).carve.forEach(g => out.carve.push(tr(g, M(sx * (h + 0.05), top - 1.0, sz * (h + 0.05)))));
  // tall slate spire: lower frustum, railed gallery, upper needle
  out.roof.push(prism(8, 1.85, 1.05, top, 46.4));
  for (let k = 0; k < 4; k++) { // small slate lucarnes on the lower spire
    const a = k * Math.PI / 2, rr = 1.55;
    out.roof.push(tr(box(0.55, 0.9, 0.9), M(Math.sin(a) * rr, 39.2, Math.cos(a) * rr, a)));
    out.dark.push(tr(flat(shape(lancetOutline(0.28, 0, 0.55, 1, 6))), M(Math.sin(a) * (rr + 0.46), 38.9, Math.cos(a) * (rr + 0.46), a)));
  }
  out.lead.push(prism(8, 1.25, 1.25, 46.4, 46.6));
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; out.iron.push(box(0.04, 0.75, 0.04, Math.sin(a) * 1.2, 47.0, Math.cos(a) * 1.2)); }
  out.iron.push(prism(16, 1.22, 1.22, 47.35, 47.42));
  out.roof.push(prism(8, 0.85, 0.02, 46.6, 57.0));
  for (let e = 0; e < 8; e++) {
    const a = Math.PI / 8 + (e / 8) * Math.PI * 2;
    for (let k = 1; k < 7; k++) { const t = k / 7, rr = 0.85 * (1 - t) + 0.03; for (const c of crocket(0.12)) out.lead.push(tr(c, M(Math.sin(a) * rr, 46.6 + 10.4 * t, Math.cos(a) * rr, a))); }
  }
  finial(0.9, true).gold.forEach(g => out.gold.push(tr(g, M(0, 56.85, 0))));
  return out;
}

/** End-block corner turret (S3): slate-clad octagonal body rising from the roof corner,
 *  railed ring, slate spire to 40.7 m with gilded finial. */
export function endTurret() {
  const out = { stone: [], carve: [], dark: [], gold: [], lead: [], roof: [], iron: [] };
  const r = 1.5;
  out.carve.push(prism(8, r + 0.25, r + 0.15, 22.0, 23.9));
  out.roof.push(prism(8, r, r * 0.92, 23.9, 32.6));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    out.dark.push(tr(flat(shape(lancetOutline(0.36, 27.0, 29.4, 1, 6))), place(a, r * Math.cos(Math.PI / 8) * 0.96 + 0.03)));
  }
  out.lead.push(prism(8, r + 0.12, r + 0.12, 32.6, 32.85));
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; out.iron.push(box(0.04, 0.7, 0.04, Math.sin(a) * (r + 0.05), 33.2, Math.cos(a) * (r + 0.05))); }
  out.roof.push(prism(8, r * 0.78, 0.02, 32.85, 40.2));
  for (let e = 0; e < 8; e++) {
    const a = Math.PI / 8 + (e / 8) * Math.PI * 2;
    for (let k = 1; k < 5; k++) { const t = k / 5, rr = r * 0.78 * (1 - t) + 0.03; for (const c of crocket(0.13)) out.lead.push(tr(c, M(Math.sin(a) * rr, 32.85 + 7.35 * t, Math.cos(a) * rr, a))); }
  }
  finial(0.75, true).gold.forEach(g => out.gold.push(tr(g, M(0, 40.0, 0))));
  return out;
}
