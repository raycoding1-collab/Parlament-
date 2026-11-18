// The Országház plan. Coordinates in metres: X along the Danube (south→north is
// irrelevant thanks to symmetry), +Z towards the river (west), Y up. Origin at the
// centre of the Dome Hall at ground level. Overall 268 m × ~123 m, dome 96 m.
//
// Plan (half, x ≥ 0; mirrored for x < 0):
//   front (Danube) range  z 30…48   | central risalit x 0…20, z 30…52
//   back (Kossuth) range  z -46…-28 | entrance pavilion x 0…15, z -60…-46 + stairs
//   end range             x 116…134 | corner pavilions (front & back)
//   cross range           x 98…108
//   central block (dome)  x 0…17, z -17…17 with four slender towers at the corners
//   lobby arm x 17…44, chamber hall x 44…78 (z ±22), link arm x 78…98 (z ±9)
//   → five courtyards per half = 10 courtyards, as in the real building.
import * as THREE from 'three';
import { M, tr, box, boxMin, prism, pyramid, lathe, extrude, flat, shape, lancetOutline, archPts, foilPts, circlePts, moulding, clean, rng } from '../geo/util.js';
import { A, B, defineA, defineB, tracery } from './modules.js';
import { roof, dressRoof } from './roofs.js';
import { cornerTurret, slenderTower } from './towers.js';
import { pinnacle, wimperg, finial, parapetPanel, corbelTable, crocket, statue, canopy } from './ornament.js';
import { buildDome } from './dome.js';
import { buildEntrance } from './entrance.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
const R = rng(1896);

function facadeFrame(ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
  return { L, th: Math.atan2(-dz, dx), ux: dx / L, uz: dz / L };
}
const local = (fr, ax, az, t, y, ry = 0) => M(ax + fr.ux * t, y, az + fr.uz * t, fr.th + ry);

/**
 * Lay out a facade from a to b (outward normal = left-hand side when walking a→b
 * seen from above with +z down… i.e. n = (-dz, dx)).
 */
export function facade(kit, ax, az, bx, bz, o = {}) {
  const { type = 'A', ground = 'win', attic = 0, statues = false, endPiers = [true, true], arcadeBays = null, y = 0, glow = 0.3, vs = 1 } = o;
  const fr = facadeFrame(ax, az, bx, bz);
  if (fr.L < 3.2) { // too short for a bay: plain ashlar return wall
    const h = (type === 'C' ? 30.4 : A.P1) + attic * 4;
    kit.add('stone', boxMin(0, 0, -0.6, fr.L, h, 0.6), local(fr, ax, az, 0, y));
    return 0;
  }
  const spacing = type === 'A' ? A.SPACING : type === 'B' ? B.SPACING : 5.6;
  const pierW = type === 'A' ? A.PIER : type === 'B' ? B.PIER : 1.2;
  const clear = type === 'C' ? 4.4 : A.CLEAR;
  const n = Math.max(1, Math.round(fr.L / spacing));
  const s = fr.L / n;
  const sx = (s - pierW) / clear;
  const lit = () => (R() < glow ? 0.35 + R() * 0.65 : R() * 0.05);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) * s;
    const m = (yy) => local(fr, ax, az, t, y + yy).multiply(M(0, 0, 0, 0, sx, vs, 1));
    if (type === 'A') {
      kit.put('A_plinth', m(0));
      const arc = arcadeBays ? arcadeBays(i, n) : ground === 'arcade';
      kit.put(arc ? 'A_arcade' : 'A_ground', m(0), lit());
      kit.put('A_first', m(0), lit());
      kit.put('A_second', m(0), lit());
      for (let k = 0; k < attic; k++) kit.put('A_attic', m(A.S1 + k * 4), lit());
      kit.put('A_cornice', m(A.S1 + attic * 4));
    } else if (type === 'B') {
      kit.put('B_bay', m(0), lit());
    } else if (type === 'C') {
      kit.put('C_bay', m(0), lit());
    }
  }
  for (let i = 0; i <= n; i++) {
    if ((i === 0 && !endPiers[0]) || (i === n && !endPiers[1])) continue;
    const t = i * s;
    if (type === 'A') {
      const st = statues && i > 0 && i < n;
      kit.put(st ? 'A_pierS' : 'A_pier', local(fr, ax, az, t, y));
      if (st) kit.put('statue' + (i % 4), local(fr, ax, az, t, y + 8.35).multiply(M(0, 0, 1.0)));
      for (let k = 0; k < attic; k++) kit.put('A_pierExt', local(fr, ax, az, t, y + A.S1 + k * 4));
      kit.put('A_pierTop', local(fr, ax, az, t, y + A.S1 + attic * 4));
    } else if (type === 'B') {
      kit.put('B_pier', local(fr, ax, az, t, y));
    } else if (type === 'C') {
      kit.put('C_pier', local(fr, ax, az, t, y).multiply(M(0, 0, 0, 0, 1, vs, 1)));
    }
  }
  return n;
}

/** Facades along a closed/open polyline. */
function chain(kit, pts, o) { for (let i = 0; i < pts.length - 1; i++) facade(kit, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], o); }

/** Interior core so no gaps can be seen through between modules. */
function core(kit, x0, x1, z0, z1, h, inset = 0.55) {
  kit.add('dark', boxMin(x0 + inset, 0, z0 + inset, x1 - x0 - 2 * inset, h, z1 - z0 - 2 * inset));
}

function defineChamberModules(kit) {
  const W = 4.4;
  kit.def('C_bay', () => {
    const g = { stone: [], carve: [], glass: [], dark: [] };
    const wall = (y0, y1, holes, d = 0.6) => extrude(shape([V2(-W / 2, y0), V2(W / 2, y0), V2(W / 2, y1), V2(-W / 2, y1)], holes), d, 0);
    // two lower storeys (light-well facades)
    for (const [w, y0, sy, k, b0, b1] of [[1.5, 2.2, 5.4, 0.8, 0, 7.4], [1.7, 9.0, 12.4, 1, 7.4, 14.8]]) {
      const ol = lancetOutline(w, y0, sy, k, 12);
      g.stone.push(wall(b0, b1, [ol], 0.5));
      const t = tracery(w, y0, sy, k, { lights: 2, oculus: k >= 1, recess: 0.18, thick: 0.1 });
      g.carve.push(...t.carve); g.glass.push(...t.glass);
    }
    // blind arcade band
    const holes = [];
    for (let i = 0; i < 5; i++) holes.push(lancetOutline(0.55, 15.1, 16.0, 1, 6, -W / 2 + 0.44 + i * 0.88, 0.06));
    g.stone.push(wall(14.8, 16.6, holes, 0.6));
    for (let i = 0; i < 5; i++) g.dark.push(flat(shape(lancetOutline(0.55, 15.1, 16.0, 1, 6, -W / 2 + 0.44 + i * 0.88)), -0.15));
    // great three-light chamber window
    const w = 3.4, y0 = 17.0, sy = 24.2, k = 1;
    const ol = lancetOutline(w, y0, sy, k, 18);
    g.stone.push(wall(16.6, 28.2, [ol]));
    const t = tracery(w, y0, sy, k, { lights: 3, oculus: true, transom: 20.9 });
    g.carve.push(...t.carve); g.glass.push(...t.glass);
    g.carve.push(moulding(-W / 2, W / 2, 16.6, [[0, 0], [0.05, 0.18], [0.15, 0.22], [0.3, 0]]));
    for (const sx of [-1, 1]) {
      g.carve.push(tr(prism(8, 0.08, 0.08, y0, sy), M(sx * (w / 2 + 0.1), 0, 0.07)));
    }
    const wg = wimperg(4.1, 4.4, 0.24, { biteW: w + 0.36, biteSpring: 0, biteK: (w + 0.18) / (w + 0.36), crockets: 5, cs: 0.24, finialH: 1.0 });
    g.carve.push(...wg.carve.map(x => tr(x, M(0, sy, 0.2))));
    // cornice + parapet
    g.stone.push(boxMin(-W / 2, 28.2, -0.6, W, 1.0, 0.6));
    g.carve.push(...corbelTable(W, 28.25, 0.3));
    g.carve.push(moulding(-W / 2, W / 2, 28.75, [[0, 0], [0, 0.3], [0.12, 0.42], [0.3, 0.5], [0.45, 0.42], [0.45, 0]]));
    g.carve.push(...parapetPanel(W, 1.15, 0.26).carve.map(x => tr(x, M(0, 29.2, 0.12))));
    return g;
  });
  kit.def('C_pier', () => {
    const g = { stone: [], carve: [] };
    g.stone.push(boxMin(-0.6, 0, -0.05, 1.2, 1.4, 1.1));
    g.stone.push(boxMin(-0.6, 1.4, -0.05, 1.2, 15.2, 0.9));
    g.stone.push(boxMin(-0.6, 16.6, -0.05, 1.2, 11.6, 0.7));
    g.stone.push(boxMin(-0.6, 28.2, -0.05, 1.2, 2.2, 0.55));
    g.carve.push(tr(prism(8, 0.1, 0.1, 16.6, 28.0), M(0, 0, 0.75)));
    pinnacle(1.1, 6.2).carve.forEach(x => g.carve.push(tr(x, M(0, 30.4, 0.25))));
    return g;
  });
}

export function buildBuilding(kit) {
  defineA(kit);
  defineB(kit);
  defineChamberModules(kit);
  for (let v = 0; v < 4; v++) kit.def('statue' + v, () => statue(v));

  const EAVE = A.C1;          // 21.4 roof eave of ordinary ranges
  const RISE = 15.5;          // ~61° pitch over 18 m deep ranges (Steindl's very steep roofs)
  const PAV_EAVE = A.C1 + 4;  // pavilions with attic storey

  for (const sg of [1, -1]) {
    const X = (x) => x * sg;
    // mirrored facade helper keeps outward normals correct
    const F = (ax, az, bx, bz, o) => sg > 0 ? facade(kit, ax, az, bx, bz, o) : facade(kit, -bx, bz, -ax, az, o ? { ...o, endPiers: o.endPiers ? [o.endPiers[1], o.endPiers[0]] : undefined } : o);
    const C = (pts, o) => { for (let i = 0; i < pts.length - 1; i++) F(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], o.type === 'B' ? { ...o, endPiers: [i === 0, true] } : o); };
    const box2 = (x0, x1, z0, z1, h) => sg > 0 ? core(kit, x0, x1, z0, z1, h) : core(kit, -x1, -x0, z0, z1, h);
    const roofX = (x0, x1, z0, z1, y, h, axis, ends, dress = {}) => {
      const r = sg > 0 ? roof(x0, x1, z0, z1, y, h, axis, ends) : roof(-x1, -x0, z0, z1, y, h, axis, axis === 'x' ? [ends[1], ends[0]] : ends);
      kit.addMany({ roof: r.roof, stone: r.stone });
      dressRoof(kit, r, dress);
      return r;
    };

    // ---------------- Danube front range (x 20…116)
    F(20, 48, 116, 48, { statues: true, endPiers: [true, true] });
    box2(20, 116, 30, 48, EAVE);
    roofX(10, 125, 30, 48, EAVE, RISE, 'x', ['gable', 'gable']);

    // ---------------- Kossuth tér back range (x 15…116)
    F(116, -46, 15, -46, { statues: true, endPiers: [true, true] });
    box2(0, 116, -46, -28, EAVE);
    roofX(0, 125, -46, -28, EAVE, RISE, 'x', ['gable', 'gable']);

    // ---------------- end range (x 116…134), facing north/south
    F(134, 30, 134, -28, { statues: false, endPiers: [false, false], arcadeBays: (i, n) => i === Math.floor(n / 2) });
    box2(116, 134, -28, 30, EAVE);
    roofX(116, 134, -37, 39, EAVE, RISE, 'z', ['gable', 'gable']);

    // ---------------- corner pavilions (front + back)
    for (const [z0, z1, front] of [[30, 50, true], [-48, -28, false]]) {
      const zf = front ? z1 : z0;
      if (front) {
        F(116, 50, 134, 50, { attic: 1, endPiers: [false, false], statues: true });
        F(134, 50, 134, 30, { attic: 1, endPiers: [false, false] });
        F(116, 48, 116, 50, { attic: 1, endPiers: [false, false] });
      } else {
        F(134, -48, 116, -48, { attic: 1, endPiers: [false, false], statues: true });
        F(134, -28, 134, -48, { attic: 1, endPiers: [false, false] });
        F(116, -48, 116, -46, { attic: 1, endPiers: [false, false] });
      }
      box2(116, 134, z0, z1, PAV_EAVE);
      roofX(116, 134, z0, z1, PAV_EAVE, 19.0, 'z', ['hip', 'hip'], { dormerStep: 6, dormerAt: 0.3 });
      const tname = 'turretPav';
      if (!kit.has(tname)) kit.def(tname, () => cornerTurret(2.0, PAV_EAVE + 4.4, 13));
      for (const [tx, tz] of [[116, zf], [134, zf], [134, front ? z0 : z1]]) kit.put(tname, M(X(tx), 0, tz));
    }

    // ---------------- cross range (x 98…108) – courtyard-only facades
    box2(98, 108, -28, 30, EAVE);
    roofX(98, 108, -37, 39, EAVE, 8.4, 'z', ['gable', 'gable'], { dormers: false });

    // ---------------- lobby arm, link arm
    box2(17, 44, -9, 9, EAVE);
    roofX(12, 49, -9, 9, EAVE, RISE, 'x', ['gable', 'gable']);
    box2(78, 98, -9, 9, EAVE);
    roofX(73, 103, -9, 9, EAVE, RISE, 'x', ['gable', 'gable']);

    // ---------------- river arm and staircase arm (E–W, 24 m wide, high roofs into the drum)
    box2(0, 12, 17, 30, EAVE);
    box2(0, 12, -28, -17, EAVE);

    // ---------------- courtyards (B facades looking inwards)
    C([[98, 30], [12, 30], [12, 17], [17, 17]], { type: 'B', endPiers: [false, false] });
    C([[17, 9], [44, 9]], { type: 'B', endPiers: [false, false] });
    C([[78, 9], [98, 9], [98, 30]], { type: 'B', endPiers: [false, false] });
    C([[12, -28], [98, -28], [98, -9], [78, -9]], { type: 'B', endPiers: [false, false] });
    C([[44, -9], [17, -9]], { type: 'B', endPiers: [false, false] });
    C([[12, -17], [12, -28]], { type: 'B', endPiers: [false, false] });
    C([[17, -17], [12, -17]], { type: 'B', endPiers: [false, false] });
    C([[116, 30], [108, 30], [108, -28], [116, -28], [116, 30]], { type: 'B', endPiers: [false, false] });
    C([[17, -9], [17, -17]], { type: 'B', endPiers: [false, false] });
    C([[17, 17], [17, 9]], { type: 'B', endPiers: [false, false] });

    // ---------------- chamber hall (House of Representatives / former Upper House)
    // the chamber halls rise well above the wings: storeys scaled ×1.25 (cornice ≈ 36 m)
    const cx0 = 44, cx1 = 78, cz0 = -22, cz1 = 22, CV = 1.25;
    C([[cx0, cz1], [cx1, cz1]], { type: 'C', endPiers: [false, false], vs: CV });
    C([[cx1, cz1], [cx1, cz0]], { type: 'C', endPiers: [false, false], vs: CV });
    C([[cx1, cz0], [cx0, cz0]], { type: 'C', endPiers: [false, false], vs: CV });
    C([[cx0, cz0], [cx0, cz1]], { type: 'C', endPiers: [false, false], vs: CV });
    box2(cx0, cx1, cz0, cz1, 29.2 * CV);
    roofX(cx0 + 0.4, cx1 - 0.4, cz0 + 0.4, cz1 - 0.4, 29.2 * CV, 19.0, 'z', ['hip', 'hip'], { dormerStep: 6, dormerAt: 0.22 });
    if (!kit.has('turretCh')) kit.def('turretCh', () => cornerTurret(2.4, 41.5, 17.0));
    for (const [tx, tz] of [[cx0, cz0], [cx0, cz1], [cx1, cz0], [cx1, cz1]]) kit.put('turretCh', M(X(tx), 0, tz));

    // ---------------- Danube central risalit (x 0…20, z 30…52)
    F(0, 52, 20, 52, { attic: 1, statues: true, ground: 'arcade', endPiers: [sg > 0, false] });
    F(20, 52, 20, 48, { attic: 1, endPiers: [false, false] });
    box2(0, 20, 30, 52, PAV_EAVE);
    if (!kit.has('turretRiv')) kit.def('turretRiv', () => cornerTurret(2.4, PAV_EAVE + 6.5, 17.0));
    kit.put('turretRiv', M(X(20), 0, 52));
    kit.put('turretRiv', M(X(20), 0, 30.5));

    // ---------------- central block corner towers (4 slender towers round the dome)
    if (!kit.has('slender')) kit.def('slender', () => slenderTower(4.4, 0, 52, 19));
    kit.put('slender', M(X(17), 0, 17));
    kit.put('slender', M(X(17), 0, -17));
  }

  // symmetric pieces built once (spanning x<0 and x>0)
  // central risalit roof (ridge along x) with a crocketed rose-window gable to the Danube
  {
    const r = roof(-20, 20, 30, 52, PAV_EAVE, 18.5, 'x', ['hip', 'hip']);
    kit.addMany({ roof: r.roof });
    dressRoof(kit, r, { dormerStep: 7, dormerAt: 0.3 });
    // river arm & staircase arm roofs (ridge along z, running into the drum)
    const ra = roof(-12, 12, 12, 41, EAVE, 19.0, 'z', ['gable', 'gable']);
    kit.addMany({ roof: ra.roof, stone: ra.stone });
    dressRoof(kit, ra, { dormers: false });
    const sa = roof(-12, 12, -52, -12, EAVE, 19.0, 'z', ['gable', 'gable']);
    kit.addMany({ roof: sa.roof, stone: sa.stone });
    dressRoof(kit, sa, { dormers: false });
    // central block podium (dome base) with terrace parapet
    kit.add('stone', boxMin(-17, 0, -17, 34, 30, 34));
    for (let f = 0; f < 4; f++) {
      const a = f * Math.PI / 2;
      for (let i = 0; i < 6; i++) {
        const t = -17 + 34 * (i + 0.5) / 6;
        kit.add('carve', parapetPanel(34 / 6, 1.1, 0.25).carve[0], M(Math.sin(a) * 17 + Math.cos(a) * t, 30, Math.cos(a) * 17 - Math.sin(a) * t, a));
      }
      kit.add('carve', moulding(-17, 17, 29.4, [[0, 0], [0, 0.25], [0.3, 0.45], [0.6, 0.3], [0.6, 0]]), M(Math.sin(a) * 17, 0, Math.cos(a) * 17, a));
    }
    // great gable over the central risalit (rose window to the river)
    gableWithRose(kit, 0, PAV_EAVE - 0.2, 52.25, 15, 16.5, 0);
  }

  buildDome(kit);
  buildEntrance(kit, { gableWithRose });
  return kit;
}

/** Monumental crocketed gable with a traceried rose window. Base centre (x, y, z), facing angle ry. */
export function gableWithRose(kit, x, y, z, w, h, ry) {
  const m = M(x, y, z, ry);
  const holes = [];
  const rc = h * 0.42, rr = Math.min(w * 0.26, h * 0.26);
  holes.push(circlePts(0, rc, rr, 48));
  const g = extrude(shape([V2(-w / 2, 0), V2(w / 2, 0), V2(0, h)], holes), 0.7, 0.35);
  kit.add('stone', g, m);
  // rose tracery: hub, 12 radiating spokes with trefoil heads, outer foiled ring
  const rose = [];
  const spokes = 12;
  const ringHoles = [];
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    ringHoles.push(foilPts(Math.cos(a) * rr * 0.68, rc + Math.sin(a) * rr * 0.68, rr * 0.2, 3, 24, a));
  }
  ringHoles.push(foilPts(0, rc, rr * 0.3, 6, 48, 0));
  rose.push(extrude(shape(circlePts(0, rc, rr, 48), ringHoles), 0.14, 0.05));
  kit.add('carve', rose[0], m);
  kit.add('glass', flat(shape(circlePts(0, rc, rr, 48)), -0.25), m);
  // moulded rim
  const rim = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2, a2 = ((i + 1) / 48) * Math.PI * 2;
    rim.push(tr(box(rr * 0.14, 0.18, 0.2), M(Math.cos((a + a2) / 2) * (rr + 0.08), rc + Math.sin((a + a2) / 2) * (rr + 0.08), 0.45, 0, 1, 1, 1, 0, (a + a2) / 2 + Math.PI / 2)));
  }
  rim.forEach(r => kit.add('carve', r, m));
  // raking copings with crockets & big finial, side pinnacles
  const len = Math.hypot(w / 2, h), ang = Math.atan2(h, w / 2);
  for (const s of [-1, 1]) {
    kit.add('carve', box(len, 0.35, 1.0), m.clone().multiply(M(s * w / 4, h / 2 + 0.1, 0.1, 0, 1, 1, 1, 0, -s * ang)));
    for (let k = 1; k <= 8; k++) {
      const t = k / 9;
      for (const c of crocket(0.45)) kit.add('carve', c, m.clone().multiply(M(s * (w / 2) * (1 - t), h * t + 0.3, 0.1, 0, 1, 1, 1, -1.3)));
    }
    pinnacle(1.1, 6.5).carve.forEach(p => kit.add('carve', p, m.clone().multiply(M(s * (w / 2 + 0.2), 0, 0.2))));
  }
  finial(2.6, true).gold.forEach(f => kit.add('gold', f, m.clone().multiply(M(0, h - 0.2, 0.1))));
  // blind arcade under the rose
  for (let i = 0; i < 7; i++) {
    const cx = -w * 0.3 + i * (w * 0.6 / 6);
    kit.add('carve', extrude(shape(lancetOutline(0.9, 0.5, 2.2, 1, 8, cx), [lancetOutline(0.65, 0.6, 2.2, 1, 8, cx, 0.1)]), 0.1, 0.45), m);
  }
}
