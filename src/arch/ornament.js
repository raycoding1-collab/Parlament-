// Gothic Revival ornament vocabulary (Steindl's neo-Gothic): crockets, fleurons,
// pinnacles with gablets, wimpergs (crocketed gables), canopies, pierced parapets,
// corbel tables, cresting. Each returns { material: [geometries] } in local space.
import * as THREE from 'three';
import { M, tr, box, boxMin, prism, pyramid, lathe, blob, extrude, shape, archPts, archRise, lancetOutline, foilPts, circlePts, sweepXY, moulding, clean } from '../geo/util.js';

const V2 = (x, y) => new THREE.Vector2(x, y);

/** Curled leaf crocket at origin pointing +z (outwards), size s. */
export function crocket(s = 0.2) {
  return [blob(s * 0.42, s * 0.36, s * 0.7, 0, s * 0.08, s * 0.42, 0, -0.35)];
}

/** Fleuron finial: stem + 4 leaves + knob + spike. Base at y=0. */
export function finial(h = 1.0, gold = false) {
  const g = [];
  g.push(prism(8, h * 0.06, h * 0.05, 0, h * 0.45));
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    g.push(blob(h * 0.08, h * 0.12, h * 0.17, Math.sin(a) * h * 0.11, h * 0.32, Math.cos(a) * h * 0.11, a, -0.6));
  }
  g.push(tr(lathe([[0.001, 0], [h * 0.09, h * 0.05], [h * 0.07, h * 0.13], [0.001, h * 0.17]], 6, { flatShade: false }), M(0, h * 0.42, 0)));
  g.push(pyramid(6, h * 0.04, h * 0.58, h * 0.42));
  return gold ? { gold: g } : { carve: g };
}

/** Spirelet with crockets along its edges. n sides (4 or 8), base radius r (circum), height h. */
export function crocketedSpire(n, r, y0, h, crockets = 4, cs = 0.18) {
  const g = [pyramid(n, r, y0, h)];
  const cr = [];
  for (let e = 0; e < n; e++) {
    const a = Math.PI / n + (e / n) * Math.PI * 2; // hip edges (pyramid vertices)
    for (let k = 1; k <= crockets; k++) {
      const t = k / (crockets + 1);
      const rr = r * (1 - t);
      const y = y0 + h * t;
      const x = Math.sin(a) * rr, z = Math.cos(a) * rr;
      const s = cs * (1 - t * 0.5);
      for (const p of crocket(s)) cr.push(tr(p, M(x, y, z, a)));
    }
  }
  return { carve: g.concat(cr) };
}

/** Triangular gable slab (wimperg) of base width w, height h, thickness d, with optional arch bite. */
export function wimperg(w, h, d, { biteW = 0, biteSpring = 0, biteK = 1, crockets = 4, cs = 0.22, finialH = 0.9, blind = true } = {}) {
  const pts = [V2(-w / 2, 0), V2(0, h), V2(w / 2, 0)];
  let outline;
  if (biteW > 0) {
    const arch = archPts(biteW, biteSpring, biteK, 12).reverse();
    outline = [V2(-w / 2, 0), V2(0, h), V2(w / 2, 0), V2(biteW / 2, 0), ...arch.map(p => V2(p.x, p.y)), V2(-biteW / 2, 0)];
    // remove duplicate where arch ends meet springing at y=biteSpring>0
    outline = outline.filter((p, i, a) => i === 0 || p.distanceTo(a[i - 1]) > 1e-4);
  } else outline = pts;
  const holes = [];
  if (blind && biteW === 0) holes.push(foilPts(0, h * 0.42, Math.min(w, h) * 0.18, 3, 48, Math.PI / 2));
  const g = { carve: [extrude(shape(outline, holes), d, d * 0.5)] };
  // raking coping mouldings
  const len = Math.hypot(w / 2, h), ang = Math.atan2(h, w / 2);
  g.carve.push(tr(box(len, 0.12, d + 0.12), M(-w / 4, h / 2 + 0.04, 0, 0, 1, 1, 1, 0, ang)));
  g.carve.push(tr(box(len, 0.12, d + 0.12), M(w / 4, h / 2 + 0.04, 0, 0, 1, 1, 1, 0, -ang)));
  for (let k = 1; k <= crockets; k++) {
    const t = k / (crockets + 1);
    for (const sgn of [-1, 1]) {
      const x = sgn * (w / 2) * (1 - t), y = h * t + 0.12;
      for (const p of crocket(cs)) g.carve.push(tr(p, M(x + sgn * 0.02, y, 0, 0, 1, 1, 1, -Math.PI / 2 + 0.2, sgn * (Math.PI / 2 - ang) * 0.0)));
    }
  }
  if (finialH > 0) { const f = finial(finialH); for (const x of f.carve) g.carve.push(tr(x, M(0, h - 0.05, 0))); }
  return g;
}

/**
 * Pinnacle: square shaft with blind tracery panels, four crocketed gablets,
 * a crocketed square spirelet and a fleuron finial. Base at y=0, width s.
 */
export function pinnacle(s = 0.9, h = 4.5, { gold = false, octo = false, lite = false } = {}) {
  const out = { carve: [], gold: [] };
  const shaftH = h * 0.38;
  // base moulding
  out.carve.push(prism(4, s * 0.62, s * 0.58, 0, 0.18, Math.PI / 4));
  out.carve.push(prism(4, s * 0.56, s * 0.56, 0.18, shaftH, Math.PI / 4));
  // blind tracery panels (recessed lancets) on each face
  for (let f = 0; f < (lite ? 0 : 4); f++) {
    const a = f * Math.PI / 2;
    const ol = lancetOutline(s * 0.42, 0.35, shaftH - s * 0.45, 1, 6);
    const pan = extrude(shape(ol), 0.04, 0.0);
    out.carve.push(tr(pan, M(Math.sin(a) * (s * 0.4 + 0.02), 0, Math.cos(a) * (s * 0.4 + 0.02), a)));
  }
  // gablets
  for (let f = 0; f < 4; f++) {
    const a = f * Math.PI / 2;
    const gw = s * 0.92, gh = s * 0.75;
    const tri = extrude(shape([V2(-gw / 2, 0), V2(gw / 2, 0), V2(0, gh)]), 0.08, 0.04);
    out.carve.push(tr(tri, M(Math.sin(a) * s * 0.42, shaftH, Math.cos(a) * s * 0.42, a)));
    if (!lite) for (const p of crocket(s * 0.16)) out.carve.push(tr(p, M(Math.sin(a) * s * 0.42, shaftH + gh, Math.cos(a) * s * 0.42, a, 1, 1, 1, -1.2)));
  }
  // corner colonnettes with mini pinnacles
  for (let c = 0; c < (lite ? 0 : 4); c++) {
    const a = Math.PI / 4 + c * Math.PI / 2, rr = s * 0.4 * Math.SQRT2;
    const x = Math.sin(a) * rr, z = Math.cos(a) * rr;
    out.carve.push(tr(prism(4, s * 0.07, s * 0.07, 0.18, shaftH + s * 0.1, Math.PI / 4), M(x, 0, z)));
    out.carve.push(tr(pyramid(4, s * 0.1, 0, s * 0.45), M(x, shaftH + s * 0.1, z)));
  }
  // spirelet
  const sp = crocketedSpire(octo ? 8 : 4, s * 0.5, shaftH, h - shaftH - s * 0.55, lite ? 2 : 3, s * 0.24);
  out.carve.push(...sp.carve);
  const f = finial(s * 0.75, gold);
  (f.gold || f.carve).forEach(g => (gold ? out.gold : out.carve).push(tr(g, M(0, h - s * 0.6, 0))));
  if (!out.gold.length) delete out.gold;
  return out;
}

/** Octagonal turret spire (for corner turrets / towers) with lucarnes and crockets. */
export function turretSpire(r, y0, h, { lucarnes = true, crockets = 6, gold = true } = {}) {
  const out = { roof: [], carve: [], gold: [] };
  out.roof.push(pyramid(8, r, y0, h));
  for (let e = 0; e < 8; e++) {
    const a = Math.PI / 8 + (e / 8) * Math.PI * 2;
    // rib along hip
    const len = Math.hypot(r, h);
    const tilt = -Math.atan2(r, h);
    out.carve.push(tr(box(0.12, len, 0.12), M(Math.sin(a) * r / 2, y0 + h / 2, Math.cos(a) * r / 2, a, 1, 1, 1, tilt)));
    for (let k = 1; k <= crockets; k++) {
      const t = k / (crockets + 1);
      const rr = r * (1 - t) + 0.04, y = y0 + h * t;
      for (const p of crocket(0.22 * (1 - t * 0.5) * Math.min(1.4, r))) out.carve.push(tr(p, M(Math.sin(a) * rr, y, Math.cos(a) * rr, a)));
    }
  }
  if (lucarnes) {
    for (let e = 0; e < 4; e++) {
      const a = e * Math.PI / 2;
      const rr = r * 0.62 * Math.cos(Math.PI / 8), y = y0 + h * 0.18;
      const lw = r * 0.45;
      const fr = extrude(shape([V2(-lw / 2, 0), V2(lw / 2, 0), V2(lw / 2, lw * 0.6), V2(0, lw * 1.25), V2(-lw / 2, lw * 0.6)], [lancetOutline(lw * 0.45, 0.06, lw * 0.5, 1, 6)]), 0.1, 0.05);
      out.carve.push(tr(fr, M(Math.sin(a) * rr, y, Math.cos(a) * rr, a)));
      out.roof.push(tr(box(lw * 0.9, lw * 0.6, rr * 0.8), M(Math.sin(a) * rr * 0.6, y + lw * 0.3, Math.cos(a) * rr * 0.6, a)));
    }
  }
  const f = finial(Math.max(0.9, r * 0.8), gold);
  (f.gold || f.carve).forEach(g => (gold ? out.gold : out.carve).push(tr(g, M(0, y0 + h - 0.1, 0))));
  if (!out.gold.length) delete out.gold;
  return out;
}

/** Hexagonal canopy (baldachin) over a statue, open arches below, spirelet above. Base y=0, centred. */
export function canopy(w = 1.0) {
  const out = { carve: [] };
  const r = w * 0.55;
  // canopy floor/ceiling slab
  out.carve.push(prism(6, r, r, 0, 0.12, 0));
  // little arches on 3 front faces (hexagon half), as gablets
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const fw = r;
    const g = extrude(shape([V2(-fw / 2, 0), V2(fw / 2, 0), V2(fw / 2, 0.3), V2(0, 0.75), V2(-fw / 2, 0.3)], [lancetOutline(fw * 0.6, -0.01, 0.2, 1, 6)]), 0.05, 0);
    out.carve.push(tr(g, M(Math.sin(a) * r * 0.86, -0.4, Math.cos(a) * r * 0.86, a)));
    out.carve.push(tr(pyramid(4, 0.05, 0, 0.35), M(Math.sin(a - Math.PI / 6) * r, 0.1, Math.cos(a - Math.PI / 6) * r)));
  }
  out.carve.push(prism(6, r * 0.8, r * 0.7, 0.12, 0.55, 0));
  out.carve.push(...crocketedSpire(6, r * 0.7, 0.55, w * 1.3, 3, 0.1).carve);
  out.carve.push(...finial(0.3).carve.map(g => tr(g, M(0, 0.55 + w * 1.3 - 0.06, 0))));
  return out;
}

/**
 * Standing ruler statue (2.3 m): mantled robe, belt, arms holding attribute,
 * bearded head with the Hungarian open crown; variants change the attribute & pose.
 */
export function statue(variant = 0) {
  const out = { statue: [] };
  const S = out.statue;
  // plinth
  S.push(prism(8, 0.36, 0.32, 0, 0.18));
  // robe: flared lathe with folds (16 sided wobble)
  const prof = [[0.34, 0.18], [0.33, 0.35], [0.28, 0.9], [0.24, 1.3], [0.22, 1.45], [0.25, 1.6], [0.23, 1.72], [0.12, 1.82], [0.001, 1.84]];
  const robe = new THREE.LatheGeometry(prof.map(([r, y]) => V2(r, y)), 18);
  const p = robe.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
    const a = Math.atan2(x, z);
    const fold = 1 + 0.07 * Math.sin(a * 7 + variant) * (1 - Math.min(1, y / 1.4));
    const flatten = z < 0 ? 0.78 : 1.0; // flatter back against the wall
    p.setX(i, x * fold); p.setZ(i, z * fold * flatten);
  }
  robe.computeVertexNormals();
  S.push(clean(robe, { smooth: true }));
  // mantle over shoulders (cape) – a partial cylinder behind
  S.push(tr(clean(new THREE.CylinderGeometry(0.27, 0.36, 1.3, 12, 1, true, Math.PI * 0.55, Math.PI * 0.9)), M(0, 1.1, -0.02)));
  // belt
  S.push(tr(prism(16, 0.235, 0.235, 0, 0.05), M(0, 1.12, 0, 0, 1, 1, 0.9)));
  // arms (upper + fore) holding attribute
  const arm = (sx, ang, fore) => {
    S.push(tr(clean(new THREE.CapsuleGeometry(0.07, 0.42, 3, 8)), M(sx * 0.27, 1.5, 0.03, 0, 1, 1, 1, 0, sx * 0.18)));
    S.push(tr(clean(new THREE.CapsuleGeometry(0.06, 0.34, 3, 8)), M(sx * 0.3, 1.2, 0.14, 0, 1, 1, 1, fore, 0)));
    S.push(blob(0.055, 0.07, 0.06, sx * 0.3, 1.06, 0.3));
  };
  arm(-1, 0, -1.1); arm(1, 0, -1.0 + variant * 0.12);
  // head, beard, crown
  S.push(tr(clean(new THREE.SphereGeometry(0.12, 12, 10), { smooth: true }), M(0, 1.98, 0.02, 0, 1, 1.12, 1)));
  S.push(blob(0.09, 0.11, 0.07, 0, 1.87, 0.08));
  S.push(tr(prism(10, 0.135, 0.14, 0, 0.09), M(0, 2.06, 0.01)));
  for (let i = 0; i < 5; i++) { const a = -0.9 + i * 0.45; S.push(tr(pyramid(4, 0.035, 0, 0.09), M(Math.sin(a) * 0.13, 2.15, Math.cos(a) * 0.13))); }
  if (variant % 4 === 0) { // apostolic cross-topped crown arches
    S.push(tr(box(0.02, 0.12, 0.26), M(0, 2.18, 0.01, 0, 1, 1, 1, 0, 0)));
    S.push(tr(box(0.26, 0.12, 0.02), M(0, 2.18, 0.01)));
    S.push(tr(box(0.02, 0.1, 0.02), M(0, 2.3, 0.01)));
    S.push(tr(box(0.06, 0.02, 0.02), M(0, 2.32, 0.01)));
  }
  // attributes
  if (variant % 4 === 0 || variant % 4 === 2) { // sword held point-down before the body
    S.push(box(0.04, 0.9, 0.015, 0.0, 0.7, 0.34));
    S.push(box(0.26, 0.04, 0.04, 0.0, 1.17, 0.34));
    S.push(box(0.04, 0.12, 0.04, 0.0, 1.25, 0.34));
  }
  if (variant % 4 === 1) { // sceptre and orb
    S.push(tr(prism(6, 0.02, 0.02, 0, 0.75), M(0.3, 1.0, 0.3, 0, 1, 1, 1, 0.15)));
    S.push(tr(clean(new THREE.SphereGeometry(0.05, 8, 6)), M(0.33, 1.78, 0.4)));
    S.push(tr(clean(new THREE.SphereGeometry(0.07, 10, 8)), M(-0.3, 1.12, 0.32)));
    S.push(box(0.015, 0.08, 0.015, -0.3, 1.22, 0.32));
  }
  if (variant % 4 === 3) { // shield and mace (military leader)
    const sh = extrude(shape([V2(-0.2, 0.25), V2(0.2, 0.25), V2(0.2, -0.05), V2(0, -0.3), V2(-0.2, -0.05)]), 0.04, 0);
    S.push(tr(sh, M(-0.3, 1.05, 0.36, 0.3)));
    S.push(tr(prism(6, 0.02, 0.02, 0, 0.6), M(0.32, 0.95, 0.3)));
    S.push(tr(prism(8, 0.06, 0.06, 0, 0.1), M(0.32, 1.55, 0.3)));
  }
  return out;
}

/** Pierced parapet panel: quatrefoils in squares, coping on top. Width w (x centred), height h. Front at z=0. */
export function parapetPanel(w, h = 1.15, d = 0.28, n = 0, seg = 28) {
  const cnt = n || Math.max(1, Math.round(w / 0.85));
  const cw = w / cnt;
  const holes = [];
  for (let i = 0; i < cnt; i++) {
    const cx = -w / 2 + cw * (i + 0.5);
    holes.push(foilPts(cx, h * 0.47, Math.min(cw, h) * 0.36, 4, seg, Math.PI / 4));
  }
  const body = extrude(shape([V2(-w / 2, 0), V2(w / 2, 0), V2(w / 2, h - 0.12), V2(-w / 2, h - 0.12)], holes), d, 0);
  const cope = moulding(-w / 2, w / 2, h - 0.14, [[0, 0.06], [0.08, 0.08], [0.16, 0.05], [0.2, 0], [0.2, -d - 0.05], [0, -d - 0.05]]);
  // small ribs dividing the squares
  const ribs = [];
  for (let i = 0; i <= cnt; i++) ribs.push(box(0.06, h - 0.12, 0.04, -w / 2 + cw * i, (h - 0.12) / 2, 0.02));
  return { carve: [body, cope, ...ribs] };
}

/** Corbel table: row of small trefoil arches on corbels under a cornice. */
export function corbelTable(w, y, depth = 0.35) {
  const n = Math.max(2, Math.round(w / 0.55));
  const cw = w / n;
  const g = [];
  const holes = [];
  for (let i = 0; i < n; i++) {
    const cx = -w / 2 + cw * (i + 0.5);
    holes.push(lancetOutline(cw * 0.78, 0, 0.12, 0.62, 6, cx, 0, 3));
  }
  const band = extrude(shape([V2(-w / 2, -0.05), V2(w / 2, -0.05), V2(w / 2, 0.42), V2(-w / 2, 0.42)], holes), 0.1, depth);
  g.push(tr(band, M(0, y, 0)));
  for (let i = 0; i <= n; i++) {
    const cx = -w / 2 + cw * i;
    g.push(tr(lathe([[0.001, -0.2], [0.06, -0.1], [0.09, 0.05], [0.1, 0.1]], 4, { phase: Math.PI / 4 }), M(cx, y, depth - 0.12, 0, 1, 1, 1.4)));
  }
  return g;
}

/** Ornamental ridge cresting (cast iron, gilded tips) along X, length L, at y=0: fleur-de-lis on a scrolled band. */
export function cresting(L, h = 0.7) {
  const n = Math.max(1, Math.round(L / 0.6));
  const cw = L / n;
  const pts = [V2(-L / 2, 0)];
  for (let i = 0; i < n; i++) {
    const x0 = -L / 2 + cw * i, c = x0 + cw * 0.5;
    pts.push(V2(x0, h * 0.25), V2(c - cw * 0.3, h * 0.32), V2(c - cw * 0.12, h * 0.5), V2(c - cw * 0.22, h * 0.72),
      V2(c - cw * 0.06, h * 0.66), V2(c, h), V2(c + cw * 0.06, h * 0.66), V2(c + cw * 0.22, h * 0.72), V2(c + cw * 0.12, h * 0.5), V2(c + cw * 0.3, h * 0.32));
  }
  pts.push(V2(L / 2, h * 0.25), V2(L / 2, 0));
  const g = extrude(shape(pts), 0.035, 0.0175);
  const out = { iron: [g, box(L, 0.08, 0.1, 0, 0.04, 0)], gold: [] };
  for (let i = 0; i < n; i++) out.gold.push(tr(clean(new THREE.OctahedronGeometry(0.05, 0)), M(-L / 2 + cw * (i + 0.5), h + 0.03, 0)));
  return out;
}
