// Országház v2 — laid out on the surveyed OpenStreetMap footprint (relation 3199085)
// with heights and bay rhythms measured from a long-lens elevation photograph.
// See ref/SPEC.md for every number used here. Frame: x along the river (south +),
// z towards the Danube (west +), y up from the terrace / Kossuth tér level.
import * as THREE from 'three';
import { M, tr, box, boxMin, prism, pyramid, lathe, extrude, flat, shape, lancetOutline, archPts, foilPts, circlePts, moulding, clean, rng, sweepXY } from '../geo/util.js';
import { defineBays, RIV, END, LOG } from './bays.js';
import { tracery } from './modules.js';
import { flatTopRoof, gableDormer, chimney, dressRoof } from './roofs.js';
import { frontTower, chamberTurret, endTurret } from './towers2.js';
import { pinnacle, wimperg, finial, parapetPanel, corbelTable, crocket, statue, cresting } from './ornament.js';
import { buildDome2 } from './dome2.js';
import { buildEntrance2 } from './entrance2.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
const rect = (x0, y0, x1, y1) => [V2(x0, y0), V2(x1, y0), V2(x1, y1), V2(x0, y1)];
const R = rng(1904);

/** Frame along a façade line a→b; outward normal = (-dz, dx). */
function frame(ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
  return { L, th: Math.atan2(-dz, dx), ux: dx / L, uz: dz / L, ax, az };
}
const at = (f, t, y = 0, ry = 0) => M(f.ax + f.ux * t, y, f.az + f.uz * t, f.th + ry);
const lit = (p = 0.3) => (R() < p ? 0.35 + R() * 0.65 : R() * 0.05);

/** Evenly divided façade of bay modules with piers (types E or BB). */
export function run(kit, ax, az, bx, bz, { bay = 'E', pier = 'EP', pitch = END.PITCH, clear = END.CLEAR, pierW = END.PIER, ends = [true, true], glow = 0.3 } = {}) {
  const f = frame(ax, az, bx, bz);
  if (f.L < 2.4) return;
  if (f.L < pitch * 0.75) { // short return wall
    kit.add(bay === 'BB' ? 'brick' : 'stone', boxMin(0, 0, -0.7, f.L, bay === 'BB' ? 22.5 : END.PARAPET, 0.7), at(f, 0));
    return;
  }
  const n = Math.max(1, Math.round(f.L / pitch)), s = f.L / n, sx = (s - pierW) / clear;
  for (let i = 0; i < n; i++) kit.put(bay, at(f, (i + 0.5) * s).multiply(M(0, 0, 0, 0, sx, 1, 1)), lit(glow));
  for (let i = 0; i <= n; i++) if ((i > 0 || ends[0]) && (i < n || ends[1])) kit.put(pier, at(f, i * s));
}
const chain = (kit, pts, o) => { for (let i = 0; i < pts.length - 1; i++) run(kit, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], { ...o, ends: [i === 0, true] }); };
const core = (kit, x0, x1, z0, z1, h, mat = 'dark') => kit.add(mat, boxMin(x0 + 0.6, 0, z0 + 0.6, x1 - x0 - 1.2, h, z1 - z0 - 1.2));

/** Roof of a range with copper flat top, cresting round the top and optional chimneys/dormers. */
function rangeRoof(kit, x0, x1, z0, z1, eave, rise, inset, axis, ends, { dormers = 0, dormerSide = 'both', chimneys = 0, crest = true } = {}) {
  const r = flatTopRoof(x0, x1, z0, z1, eave, rise, inset, axis, ends);
  kit.addMany({ roof: r.roof, copper: r.copper, stone: r.stone });
  const T = r.top;
  if (crest) {
    if (!kit.has('crest6')) kit.def('crest6', () => cresting(6.0, 0.7));
    for (let e = 0; e < 4; e++) {
      const a = T[e], b = T[(e + 1) % 4];
      const L = a.distanceTo(b); if (L < 1) continue;
      const n = Math.max(1, Math.round(L / 6)), ang = Math.atan2(-(b.z - a.z), b.x - a.x);
      for (let i = 0; i < n; i++) { const p = a.clone().lerp(b, (i + 0.5) / n); kit.put('crest6', M(p.x, p.y - 0.02, p.z, ang, L / n / 6, 1, 1)); }
    }
  }
  if (chimneys) {
    if (!kit.has('chimney')) kit.def('chimney', () => chimney(1.0, 2.2, 2.4));
    const fr = r.frame;
    for (let i = 0; i < chimneys; i++) {
      const u = fr.u0 + fr.su0 + (fr.u1 - fr.su1 - fr.u0 - fr.su0) * (i + 0.5) / chimneys;
      const v = (fr.v0 + fr.v1) / 2;
      const [x, z] = axis === 'x' ? [u, v] : [v, u];
      kit.put('chimney', M(x, eave + rise - 0.1, z, axis === 'x' ? 0 : Math.PI / 2));
    }
  }
  return r;
}

export function buildBuilding2(kit) {
  defineBays(kit);
  kit.def('turretEnd', () => endTurret());
  kit.def('turretCh', () => chamberTurret(20.0));
  kit.def('towerFront', () => frontTower());
  kit.def('dormerG', () => gableDormer(2.2, 4.2));

  for (const sg of [1, -1]) {
    const X = (x) => x * sg;
    // mirrored façade helper keeping outward normals
    const F = (ax, az, bx, bz, o = {}) => sg > 0 ? run(kit, ax, az, bx, bz, o) : run(kit, -bx, bz, -ax, az, { ...o, ends: o.ends ? [o.ends[1], o.ends[0]] : undefined });
    const C = (pts, o) => { for (let i = 0; i < pts.length - 1; i++) F(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], { ...o, ends: [i === 0, true] }); };
    const box2 = (x0, x1, z0, z1, h, mat) => sg > 0 ? core(kit, x0, x1, z0, z1, h, mat) : core(kit, -x1, -x0, z0, z1, h, mat);
    const roofM = (x0, x1, z0, z1, eave, rise, inset, axis, ends, o) => sg > 0
      ? rangeRoof(kit, x0, x1, z0, z1, eave, rise, inset, axis, ends, o)
      : rangeRoof(kit, -x1, -x0, z0, z1, eave, rise, inset, axis, axis === 'x' ? [ends[1], ends[0]] : ends, o);
    const ry = sg > 0 ? 0 : 0; // river façades face +z on both halves

    // ================= Danube wing: 13 arches (measured centres) =================
    const arches = [];
    let c = -96.6;
    const steps = [5.07, 5.07, 5.07, 5.07, 5.82, 5.82, 5.07, 5.07, 5.82, 5.82, 5.07, 5.07];
    arches.push(c); for (const d of steps) arches.push(c += d);
    const accent = new Set([5, 9]); // arches 6 and 10
    arches.forEach((ax, i) => kit.put(accent.has(i) ? 'RX' : 'RA', M(X(ax), 0, 31.0, ry), lit(0.35)));
    for (let i = 0; i < arches.length - 1; i++) {
      const px = (arches[i] + arches[i + 1]) / 2;
      const isA = accent.has(i) || accent.has(i + 1);
      kit.put(isA ? 'RPX' : 'RP', M(X(px), 0, 31.0));
      if (!isA) kit.put('statue' + (i % 4), M(X(px), RIV.BAL0 + 0.15, 31.0 + 1.1));
    }
    // wide end piers of the wing (against the end block and against the tower)
    for (const [x0, x1] of [[-102.2, arches[0] - RIV.CLEAR / 2], [arches[12] + RIV.CLEAR / 2, -25.05]]) {
      const a = Math.min(X(x0), X(x1)), b = Math.max(X(x0), X(x1));
      kit.add('stone', boxMin(a, 0, 30.0, b - a, RIV.PARAPET, 1.95));
      kit.add('carve', moulding(a, b, RIV.CORNICE - 0.15, [[0, 0], [0, 0.3], [0.14, 0.44], [0.32, 0.55], [0.5, 0.48], [0.55, 0]]), M(0, 0, 31.95));
      kit.add('carve', extrude(shape(rect(a + 0.4, RIV.WIN0, b - 0.4, RIV.WIN1 + 1), [lancetOutline(Math.min(1.2, b - a - 1.2), RIV.WIN0 + 0.3, RIV.WIN1 - 0.4, 1, 8, (a + b) / 2, 0.15)]), 0.1, 0.1), M(0, 0, 31.95));
      pinnacle(1.1, 6.0).carve.forEach(g => kit.add('carve', g, M((a + b) / 2, RIV.PARAPET, 31.4)));
    }
    box2(25.05, 102.2, 19.0, 31.0, 22.0);
    // gable dormers on the river roof, one per regular bay
    arches.forEach((ax, i) => { if (!accent.has(i)) kit.put('dormerG', M(X(ax), 23.0, 29.6)); });

    // ================= central risalit (x 0…17 per half) =================
    for (let i = 0; i < 4; i++) {
      const x = i * LOG.PITCH; // 0, 4.86, 9.72, 14.58
      if (sg < 0 && i === 0) continue;
      kit.put('L', M(X(x), 0, 45.4), lit(0.5));
    }
    for (let i = 0; i < 3; i++) kit.put('LC', M(X(LOG.PITCH * (i + 0.5)), 0, 45.4));
    box2(0, 17.0, 31.0, 45.4, 23.7);
    // side return walls between wing and tower (x = ±25.05, z 31…36.6)
    kit.add('stone', boxMin(Math.min(X(25.05), X(24.35)), 0, 31.0, 0.7, RIV.PARAPET, 5.6));
    // flat copper roof behind the gables
    kit.add('copper', boxMin(Math.min(X(0), X(17.2)), 23.6, 31.0, 17.2, 0.3, 14.2));
    // front tower
    kit.put('towerFront', M(X(21.4), 0, 41.0));

    // ================= end block =================
    const ex0 = 102.2, ex1 = 125.8;
    // river face, back face (5 bays each), end faces, inner returns
    F(ex0, 40.6, ex1, 40.6, { ends: [true, true], glow: 0.25 });
    F(ex1, -24.1, ex0, -24.1, { ends: [true, true] });
    F(ex1, 40.6, ex1, 15.5, { ends: [false, true] });
    F(ex1, 0.6, ex1, -24.1, { ends: [true, false] });
    F(ex0, 31.0, ex0, 40.6, { ends: [false, false] });
    F(ex0, -24.1, ex0, -14.4, { ends: [false, false] });
    box2(ex0, ex1, -24.1, 40.6, 22.6);
    // corner gables above the parapet
    if (!kit.has('cornerGable')) kit.def('cornerGable', () => {
      const g = { stone: [], carve: [], dark: [] };
      const w = 3.6, h = 27.2 - END.PARAPET + 0.6;
      g.stone.push(extrude(shape([V2(-w / 2, 0), V2(w / 2, 0), V2(0, h)], [lancetOutline(0.7, 0.4, 2.0, 1, 8)]), 0.4, 0.1));
      g.dark.push(flat(shape(lancetOutline(0.7, 0.4, 2.0, 1, 8)), -0.25));
      wimperg(w + 0.2, h + 0.15, 0.12, { crockets: 3, cs: 0.26, finialH: 0.9, blind: false }).carve.forEach(x => g.carve.push(tr(x, M(0, -0.05, 0.2))));
      return g;
    });
    const pb = (ex1 - ex0) / 5;
    for (const [x, z, a] of [[ex0 + pb * 0.5, 40.6, 0], [ex1 - pb * 0.5, 40.6, 0], [ex0 + pb * 0.5, -24.1, Math.PI], [ex1 - pb * 0.5, -24.1, Math.PI], [ex1, 40.6 - 2.5, Math.PI / 2], [ex1, -24.1 + 2.5, Math.PI / 2]]) {
      kit.put('cornerGable', M(X(x), END.PARAPET - 0.6, z, sg > 0 ? a : (a === Math.PI / 2 ? -Math.PI / 2 : a)));
    }
    for (const [x, z] of [[ex0 + 2.6, 38.0], [ex1 - 2.6, 38.0], [ex0 + 2.6, -21.5], [ex1 - 2.6, -21.5]]) kit.put('turretEnd', M(X(x), 0, z));
    // roofs: river pavilion, back pavilion, end range between
    roofM(ex0, ex1, 17.4, 40.6, 22.8, 10.4, 6.35, 'x', ['hip', 'hip'], { chimneys: 2 });
    roofM(ex0, ex1, -24.1, -1.3, 22.8, 10.4, 6.35, 'x', ['hip', 'hip'], { chimneys: 2 });
    roofM(113.4, ex1, -2, 18, 22.8, 7.8, 5.2, 'z', ['none', 'none'], { chimneys: 2 });
    // end-façade risalit with rose-window gable and twin portal
    endRisalit(kit, sg);

    // ================= main range: back (Kossuth-side) façade =================
    F(102.2, -14.4, 35.96, -14.4, { ends: [false, true] });
    F(35.96, -14.4, 35.96, -18.88, { ends: [false, false] });
    F(35.96, -18.88, 32.2, -18.88, { ends: [false, false] });
    box2(35.96, 102.2, -14.4, -1.3, 22.0);

    // ================= courtyards (brick façades) =================
    const B = { bay: 'BB', pier: 'BP', pitch: 3.95, clear: 3.4, pierW: 0.6 };
    C([[41.2, 22.5], [14.7, 22.5], [14.7, 17.99], [17.13, 13.74], [41.2, 13.78], [41.2, 22.5]], B);
    C([[14.69, -2.49], [14.68, -7.03], [41.23, -7.02], [41.24, 1.78], [17.13, 1.76], [14.69, -2.49]], B);
    C([[113.4, 17.4], [80.6, 17.4], [80.6, -1.3], [113.4, -1.3], [113.4, 17.4]], B);
    C([[8.3, -19.4], [8.3, -52.4], [19.7, -52.4], [19.7, -19.4], [8.3, -19.4]], B);

    // ================= roofs of the main range =================
    roofM(25.05, 41.2, 22.5, 31.0, 22.0, 6.2, 3.6, 'x', ['none', 'none'], { chimneys: 1 });
    // in front of / behind the chamber halls the ranges carry low copper-topped roofs,
    // so the chambers' great windows show above the wings (S3, S4)
    roofM(41.2, 80.6, 17.4, 31.0, 22.0, 2.6, 2.4, 'x', ['none', 'none'], { chimneys: 2 });
    roofM(41.2, 80.6, -14.4, -1.3, 22.0, 2.6, 2.4, 'x', ['none', 'none'], { chimneys: 2 });
    roofM(80.6, 106.0, 17.4, 31.0, 22.0, 8.6, 5.6, 'x', ['gable', 'none'], { chimneys: 2 });
    roofM(80.6, 106.0, -14.4, -1.3, 22.0, 8.4, 5.4, 'x', ['gable', 'none'], { chimneys: 2 });
    roofM(17.0, 41.2, -14.4, -7.0, 22.0, 5.4, 3.1, 'x', ['none', 'none']);
    roofM(17.0, 49.7, 1.8, 13.8, 22.0, 7.6, 5.0, 'x', ['none', 'none'], { chimneys: 1 });
    kit.add('copper', boxMin(Math.min(X(41.2), X(80.6)), 22.0, -1.3, 39.4, 0.3, 18.7));

    // ================= chamber block (Upper House north, Lower House south) =================
    chamberBlock(kit, X(60.9), 6.6);

    // ================= east wing =================
    F(32.2, -18.88, 32.2, -52.09, { ends: [false, true] });
    box2(19.7, 32.2, -52.1, -14.4, 22.0);
    roofM(19.7, 32.2, -56, -14.4, 22.0, 8.0, 5.0, 'z', ['none', 'none'], { chimneys: 2 });
  }

  // ================= symmetric centre pieces =================
  // central block round the dome and the grand-staircase spine
  core(kit, -17.0, 17.0, -14.4, 31.0, 27.5, 'stone');
  kit.add('copper', boxMin(-17.0, 27.4, -14.4, 34.0, 0.3, 45.4));
  for (let f = 0; f < 4; f++) {
    // balustrade round the dome terrace
    const a = f * Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const t = -16 + 32 * (i + 0.5) / 6;
      kit.add('carve', parapetPanel(32 / 6, 1.0, 0.22, 4, 16).carve[0], M(Math.sin(a) * 16.6 + Math.cos(a) * t, 27.7, 7.8 + Math.cos(a) * 16.6 - Math.sin(a) * t, a));
    }
  }
  // grand staircase hall (spine of the east wing): tall walls with big windows to the courtyards
  core(kit, -8.3, 8.3, -52.1, -14.4, 27.0, 'stone');
  for (const s of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const z = -48.5 + i * 5.6;
      const ol = lancetOutline(2.4, 22.0, 25.2, 0.9, 12);
      kit.add('stone', extrude(shape(rect(-2.6, 21.6, 2.6, 27.0), [ol]), 0.6, 0), M(s * 8.3, 0, z, s * Math.PI / 2));
      kit.add('glass', flat(shape(ol), -0.4), M(s * 8.3, 0, z, s * Math.PI / 2));
    }
  }
  rangeRoof(kit, -8.6, 8.6, -52.1, -14.4, 27.0, 9.5, 6.8, 'z', ['none', 'none'], { chimneys: 0 });
  buildDome2(kit);
  buildEntrance2(kit, { run, rangeRoof });
}

/** End-façade risalit: twin round-arched portal, paired lancets, rose-window gable. */
function endRisalit(kit, sg) {
  const x0 = 125.8, x1 = 131.9, z0 = 0.6, z1 = 15.5, W = z1 - z0, zc = (z0 + z1) / 2;
  const face = M(sg * x1, 0, zc, sg > 0 ? Math.PI / 2 : -Math.PI / 2); // facing ±x
  const A = (mat, g) => kit.add(mat, g, face);
  const portals = [-1.9, 1.9].map(c => { const p = [V2(c - 1.45, 0)]; for (let i = 0; i <= 12; i++) { const a = Math.PI - i / 12 * Math.PI; p.push(V2(c + Math.cos(a) * 1.45, 4.8 + Math.sin(a) * 1.45)); } p.push(V2(c + 1.45, 0)); return p; });
  const wins = [-3.6, 0, 3.6].map(c => lancetOutline(2.0, 13.2, 17.6, 0.88, 14, c));
  const mez = [-3.6, 0, 3.6].map(c => rect(c - 0.8, 9.3, c + 0.8, 11.4));
  A('stone', extrude(shape(rect(-W / 2, 0, W / 2, END.CORNICE), [...portals, ...wins, ...mez]), 1.2, 0));
  portals.forEach(p => A('dark', flat(shape(p), -0.9)));
  mez.forEach(p => A('glass', flat(shape(p), -0.35)));
  [-3.6, 0, 3.6].forEach(c => { const t = tracery(2.0, 13.2, 17.6, 0.88, { lights: 2, oculus: true, transom: 15.6 }); t.carve.forEach(g => A('carve', tr(g, M(c, 0, 0)))); t.glass.forEach(g => A('glass', tr(g, M(c, 0, 0)))); });
  // archivolts of the portals and the central statue niche
  for (const c of [-1.9, 1.9]) A('carve', sweepXY([V2(c - 1.45, 0.3), ...archPts(2.9, 4.8, 0.5, 14, c), V2(c + 1.45, 0.3)].reverse(), [[-0.05, 0], [0.05, 0.14], [0.16, 0.2], [0.3, 0.1], [0.36, 0]]));
  A('carve', box(0.6, 6.2, 0.5, 0, 3.1, 0.25));
  for (const y of [2.6, 8.4, 12.4]) A('carve', moulding(-W / 2, W / 2, y, [[0, 0], [0.05, 0.14], [0.14, 0.2], [0.24, 0.12], [0.3, 0]]));
  A('carve', moulding(-W / 2, W / 2, END.CORNICE - 0.1, [[0, 0], [0, 0.3], [0.14, 0.44], [0.32, 0.55], [0.5, 0.48], [0.55, 0]]));
  // the crocketed gable with a six-foil rose
  const gh = 33.0 - END.CORNICE;
  const rose = circlePts(0, END.CORNICE + gh * 0.45, 1.7, 36);
  const lan = [-1.6, 1.6].map(c => lancetOutline(1.2, END.CORNICE + 0.6, END.CORNICE + 3.4, 1, 10, c));
  kit.add('stone', extrude(shape([V2(-W / 2, END.CORNICE), V2(W / 2, END.CORNICE), V2(0, END.CORNICE + gh)], [rose, ...lan]), 0.9, 0.2), face);
  kit.add('carve', extrude(shape(rose, [foilPts(0, END.CORNICE + gh * 0.45, 1.45, 6, 48, 0)]), 0.14, 0.05), face);
  kit.add('glass', flat(shape(rose), -0.4), face);
  lan.forEach(l => { kit.add('glass', flat(shape(l), -0.4), face); });
  const len = Math.hypot(W / 2, gh), ang = Math.atan2(gh, W / 2);
  for (const s of [-1, 1]) {
    kit.add('carve', box(len, 0.35, 1.2), face.clone().multiply(M(s * W / 4, END.CORNICE + gh / 2 + 0.12, 0.25, 0, 1, 1, 1, 0, -s * ang)));
    for (let k = 1; k <= 9; k++) for (const c of crocket(0.42)) kit.add('carve', c, face.clone().multiply(M(s * (W / 2) * (1 - k / 10), END.CORNICE + gh * k / 10 + 0.35, 0.25, 0, 1, 1, 1, -1.3)));
    pinnacle(1.2, 9.6).carve.forEach(g => kit.add('carve', g, face.clone().multiply(M(s * (W / 2 + 0.2), END.CORNICE, 0.3))));
    // flanking statues between the windows
    kit.put('statue' + (s > 0 ? 3 : 2), face.clone().multiply(M(s * 1.8, 12.9, 0.45)));
  }
  finial(2.4, true).gold.forEach(g => kit.add('gold', g, face.clone().multiply(M(0, END.CORNICE + gh - 0.2, 0.2))));
  // risalit body and roof (ridge along x into the end range)
  kit.add('dark', boxMin(Math.min(sg * x0, sg * (x1 - 1.2)), 0, z0 + 0.6, Math.abs(x1 - x0) - 0.6, END.CORNICE, W - 1.2));
  const r = flatTopRoof(Math.min(sg * 119, sg * (x1 - 0.4)), Math.max(sg * 119, sg * (x1 - 0.4)), z0, z1, END.CORNICE + 0.6, gh - 1.4, W / 2 - 0.4, 'x', ['none', 'none']);
  kit.addMany({ roof: r.roof, copper: r.copper });
  // side returns
  for (const z of [z0, z1]) kit.add('stone', boxMin(Math.min(sg * x0, sg * x1), 0, z - 0.35, Math.abs(x1 - x0), END.PARAPET, 0.7));
}

/** Chamber block: 22.4 m square, three great tracery windows per face, gallery, gabled parapet, 4 turrets. */
function chamberBlock(kit, cx, cz) {
  const S = 22.4, h = S / 2;
  if (!kit.has('CHF')) kit.def('CHF', () => {
    const g = { stone: [], carve: [], glass: [], dark: [] };
    const W = S - 3.4;
    const wins = [-5.6, 0, 5.6].map(c => lancetOutline(3.6, 25.5, 28.6, 0.8, 18, c));
    g.stone.push(extrude(shape(rect(-W / 2, 20.0, W / 2, 33.7), wins), 0.8, 0));
    [-5.6, 0, 5.6].forEach(c => {
      const t = tracery(3.6, 25.5, 28.6, 0.8, { lights: 3, oculus: true, transom: 27.0 });
      t.carve.forEach(x => g.carve.push(tr(x, M(c, 0, 0)))); t.glass.forEach(x => g.glass.push(tr(x, M(c, 0, 0))));
      for (const s of [-1, 1]) g.carve.push(tr(prism(8, 0.1, 0.1, 25.5, 28.6), M(c + s * 1.92, 0, 0.06)));
    });
    // gallery of small arches under the eaves
    const n = 13, holes = [];
    for (let i = 0; i < n; i++) holes.push(lancetOutline(0.7, 31.2, 32.4, 0.55, 8, -W / 2 + W / n * (i + 0.5)));
    g.carve.push(extrude(shape(rect(-W / 2, 31.0, W / 2, 33.0), holes), 0.12, 0.12));
    holes.forEach(p => g.dark.push(flat(shape(p), -0.25)));
    g.carve.push(moulding(-W / 2, W / 2, 30.6, [[0, 0], [0.05, 0.15], [0.15, 0.2], [0.25, 0]]));
    g.carve.push(moulding(-W / 2, W / 2, 33.3, [[0, 0], [0, 0.3], [0.14, 0.44], [0.32, 0.55], [0.5, 0.48], [0.55, 0]]));
    // crocketed gablets with trefoils along the parapet (6) and pinnacles between
    for (let i = 0; i < 6; i++) {
      const x = -W / 2 + W / 6 * (i + 0.5);
      g.stone.push(tr(extrude(shape([V2(-1.25, 0), V2(1.25, 0), V2(0, 2.4)], [foilPts(0, 0.95, 0.42, 3, 24, Math.PI / 2)]), 0.3, 0.15), M(x, 33.8, 0)));
      wimperg(2.6, 2.5, 0.1, { crockets: 2, cs: 0.18, finialH: 0.55, blind: false }).carve.forEach(c => g.carve.push(tr(c, M(x, 33.75, 0.2))));
      if (i > 0) pinnacle(0.4, 2.8, { lite: true }).carve.forEach(c => g.carve.push(tr(c, M(x - W / 12, 33.8, 0.1))));
    }
    g.carve.push(...parapetPanel(W, 0.9, 0.2, 10, 16).carve.map(c => tr(c, M(0, 33.8, -0.2))));
    return g;
  });
  for (let f = 0; f < 4; f++) {
    const a = f * Math.PI / 2;
    kit.put('CHF', M(cx + Math.sin(a) * h, 0, cz + Math.cos(a) * h, a), 0.35);
  }
  kit.add('dark', boxMin(cx - h + 0.8, 20, cz - h + 0.8, S - 1.6, 13.7, S - 1.6));
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) kit.put('turretCh', M(cx + sx * (h - 0.2), 0, cz + sz * (h - 0.2)));
  // near-vertical pavilion roof with a broad flat copper top (S3: top ≈ 17 m wide)
  rangeRoof(kit, cx - h + 0.6, cx + h - 0.6, cz - h + 0.6, cz + h - 0.6, 33.7, 12.1, 2.6, 'x', ['hip', 'hip'], { chimneys: 0 });
  // flagpole on the Upper House (north) block
  if (cx < 0) { kit.add('iron', prism(8, 0.12, 0.08, 45.8, 54), M(cx, 0, cz)); }
}
