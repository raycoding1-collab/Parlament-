// Facade modules (one bay × one storey each), all built facing +Z with the wall
// face on z = 0 and the clear bay width centred on x = 0. Instances are scaled in X
// to fit each real facade length, so every bay of the building comes from here.
import * as THREE from 'three';
import { M, tr, box, boxMin, prism, pyramid, lathe, blob, extrude, flat, shape, archPts, archRise, lancetOutline, cuspedArchPts, foilPts, circlePts, sweepXY, moulding, clean } from '../geo/util.js';
import { crocket, finial, crocketedSpire, wimperg, pinnacle, canopy, parapetPanel, corbelTable, turretSpire } from './ornament.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
export const A = { PIER: 1.1, CLEAR: 3.4, SPACING: 4.5, PL: 1.4, G1: 7.4, F1: 14.8, S1: 20.4, C1: 21.4, P1: 22.6, WALL: 0.6 };
export const B = { PIER: 0.6, CLEAR: 3.4, SPACING: 4.0 };

const STRING = [[0, 0.0], [0.04, 0.16], [0.12, 0.2], [0.2, 0.12], [0.28, 0.04], [0.3, 0]];
const SILL = [[-0.12, 0.0], [-0.1, 0.1], [0, 0.16], [0.06, 0.14], [0.08, 0]];

/** Wall panel with an opening (outline) extruded to depth, plus reveal. */
function wallWithOpening(w, y0, y1, holes, depth = A.WALL) {
  return extrude(shape([V2(-w / 2, y0), V2(w / 2, y0), V2(w / 2, y1), V2(-w / 2, y1)], holes), depth, 0);
}

/**
 * Traceried window: returns {carve, glass} for an opening of width w with sill y0,
 * springing sy, arch ratio k. lights: 2 or 3. oculus: quatrefoil in head.
 */
export function tracery(w, y0, sy, k, { lights = 2, oculus = true, transom = 0, recess = 0.22, thick = 0.14, cusp = true } = {}) {
  const f = w * 0.055, m = w * 0.075;
  const lw = (w - 2 * f - (lights - 1) * m) / lights;
  const holes = [];
  const lightRise = archRise(lw, 1);
  for (let i = 0; i < lights; i++) {
    const cx = -w / 2 + f + lw / 2 + i * (lw + m);
    const top = transom ? [lancetOutline(lw, transom + 0.07, sy, 1, 10, cx, cusp ? lw * 0.16 : 0)] : [];
    if (transom) {
      // lower rectangular light below transom
      holes.push([V2(cx - lw / 2, y0 + f), V2(cx + lw / 2, y0 + f), V2(cx + lw / 2, transom - 0.07), V2(cx - lw / 2, transom - 0.07)]);
      holes.push(...top);
    } else holes.push(lancetOutline(lw, y0 + f, sy, 1, 10, cx, cusp ? lw * 0.16 : 0));
  }
  if (oculus) {
    const R = archRise(w, k);
    const top = sy + R - f;
    const bot = sy + lightRise + 0.05;
    const rr = Math.min((top - bot) / 2 - 0.03, w * 0.2);
    if (rr > 0.08) holes.push(foilPts(0, (top + bot) / 2 - 0.02, rr, lights === 3 ? 3 : 4, 32, lights === 3 ? Math.PI / 2 : Math.PI / 4));
    if (lights === 3) {
      const r2 = rr * 0.45;
      holes.push(circlePts(-w * 0.27, bot + r2 * 0.6, r2, 16), circlePts(w * 0.27, bot + r2 * 0.6, r2, 16));
    }
  }
  const outline = lancetOutline(w, y0, sy, k, 14);
  const tr_ = extrude(shape(outline, holes), thick, -recess);
  const glass = flat(shape(outline), -recess - thick - 0.06);
  return { carve: [tr_], glass: [glass] };
}

/** Hood mould (label) following the arch, with carved label stops. */
function hoodMould(w, sy, k, off = 0.1, drop = 0.35) {
  const arch = archPts(w + off * 2, sy, (k * w + off) / (w + off * 2), 16);
  const path = [V2(arch[0].x, sy - drop), ...arch, V2(arch[arch.length - 1].x, sy - drop)];
  const g = sweepXY(path.reverse(), [[0, 0.0], [0.05, 0.08], [0.1, 0.12], [0.15, 0.08], [0.17, 0.0]]);
  const stops = [blob(0.12, 0.14, 0.12, -w / 2 - off, sy - drop - 0.05, 0.1), blob(0.12, 0.14, 0.12, w / 2 + off, sy - drop - 0.05, 0.1)];
  return [g, ...stops];
}

/** Standard A bay modules. */
export function defineA(kit) {
  const W = A.CLEAR;
  kit.def('A_plinth', () => {
    const g = { stone: [], dark: [], glass: [] };
    g.stone.push(wallWithOpening(W, 0, A.PL, [[V2(-0.55, 0.35), V2(0.55, 0.35), V2(0.55, 0.95), V2(-0.55, 0.95)]], 0.9));
    g.stone.forEach(x => x.translate(0, 0, 0.3));
    g.carve = [moulding(-W / 2, W / 2, A.PL - 0.25, [[0, 0], [0, 0.3], [0.12, 0.3], [0.25, 0.02], [0.25, 0]])];
    // basement grille
    for (let i = -2; i <= 2; i++) g.dark.push(box(0.04, 0.6, 0.04, i * 0.2, 0.65, -0.05));
    g.glass.push(flat(shape([V2(-0.55, 0.35), V2(0.55, 0.35), V2(0.55, 0.95), V2(-0.55, 0.95)]), -0.35));
    return g;
  });

  kit.def('A_ground', () => {
    const w = 1.8, y0 = 2.4, sy = 5.55, k = 0.8;
    const ol = lancetOutline(w, y0, sy, k, 14);
    const g = { stone: [wallWithOpening(W, A.PL, A.G1, [ol])], carve: [], glass: [] };
    const t = tracery(w, y0, sy, k, { lights: 2, oculus: true, transom: 4.2 });
    g.carve.push(...t.carve); g.glass.push(...t.glass);
    g.carve.push(moulding(-w / 2 - 0.15, w / 2 + 0.15, y0 - 0.12, SILL));
    g.carve.push(...hoodMould(w, sy, k));
    // blind trefoil panels flanking (spandrels)
    for (const sx of [-1, 1]) g.carve.push(tr(extrude(shape(foilPts(0, 0, 0.22, 3, 30, Math.PI / 2)), 0.05, 0.05), M(sx * 1.32, 6.6, 0)));
    return g;
  });

  kit.def('A_arcade', () => {
    const w = 3.0, sy = 4.7, k = 0.7, D = 3.2;
    const ol = lancetOutline(w, A.PL, sy, k, 18);
    const g = { stone: [wallWithOpening(W, A.PL, A.G1, [ol], 0.9)], carve: [], glass: [], dark: [] };
    // archivolt: three recessed orders
    const arch = archPts(w, sy, k, 20);
    g.carve.push(sweepXY([V2(-w / 2, A.PL + 0.5), ...arch, V2(w / 2, A.PL + 0.5)].reverse(), [[-0.05, 0.02], [0.02, 0.08], [0.1, 0.1], [0.16, 0.04], [0.2, 0.0]]));
    g.carve.push(...hoodMould(w, sy, k, 0.22, 0.2));
    // cusping inside the arch head (open trefoil fringe)
    const inner = cuspedArchPts(w - 0.04, sy, k, 5, 0.22, 40);
    const outer = archPts(w + 0.002, sy, k, 40).reverse();
    g.carve.push(extrude(shape([...inner, ...outer]), 0.12, -0.25));
    // loggia: floor, vault ceiling, back wall with portal and window, transverse arches
    g.stone.push(boxMin(-W / 2 - 0.6, A.PL - 0.1, -D - 0.9, W + 1.2, 0.1, D + 0.9));
    g.dark.push(boxMin(-W / 2 - 0.6, A.G1 - 0.3, -D - 0.9, W + 1.2, 0.3, D + 0.9));
    // rib vault: diagonal ribs
    for (const s of [-1, 1]) g.carve.push(tr(box(Math.hypot(W, D) , 0.18, 0.16), M(0, A.G1 - 0.42, -D / 2 - 0.45, Math.atan2(D, W) * s)));
    const doorO = lancetOutline(1.5, A.PL, 3.6, 0.8, 12);
    g.dark.push(tr(wallWithOpening(W + 1.2, A.PL, A.G1, [doorO], 0.3), M(0, 0, -D - 0.9)));
    g.dark.push(tr(flat(shape(doorO)), M(0, 0, -D - 1.15)));
    g.carve.push(tr(sweepXY([V2(-0.75, A.PL), ...archPts(1.5, 3.6, 0.8, 12), V2(0.75, A.PL)].reverse(), [[0, 0], [0.06, 0.08], [0.12, 0]]), M(0, 0, -D - 0.9)));
    for (const sx of [-1, 1]) {
      const to = lancetOutline(D * 0.8, A.PL, 4.6, 0.75, 12);
      const tw = tr(wallWithOpening(D + 0.9, A.PL, A.G1 - 0.3, [to], 0.3), M(sx * (W / 2 + 0.45), 0, -D / 2 - 0.45, Math.PI / 2));
      g.stone.push(tw);
    }
    return g;
  });

  kit.def('A_first', () => {
    const w = 2.3, y0 = 8.3, sy = 12.0, k = 1.0;
    const ol = lancetOutline(w, y0, sy, k, 16);
    const g = { stone: [wallWithOpening(W, A.G1, A.F1, [ol])], carve: [], glass: [] };
    g.carve.push(moulding(-W / 2, W / 2, A.G1, STRING));
    const t = tracery(w, y0, sy, k, { lights: 2, oculus: true, transom: 10.6 });
    g.carve.push(...t.carve); g.glass.push(...t.glass);
    g.carve.push(moulding(-w / 2 - 0.2, w / 2 + 0.2, y0 - 0.14, SILL));
    // jamb shafts (colonnettes) with capitals
    for (const sx of [-1, 1]) {
      g.carve.push(tr(prism(8, 0.07, 0.07, y0, sy), M(sx * (w / 2 + 0.08), 0, 0.06)));
      g.carve.push(tr(lathe([[0.07, 0], [0.13, 0.12], [0.14, 0.2]], 8), M(sx * (w / 2 + 0.08), sy - 0.2, 0.06)));
    }
    // crocketed wimperg with arch bite, in front of the wall
    const wg = wimperg(3.15, 2.9, 0.22, { biteW: w + 0.34, biteSpring: 0, biteK: (k * w + 0.17) / (w + 0.34), crockets: 4, cs: 0.2, finialH: 0.7 });
    g.carve.push(...wg.carve.map(x => tr(x, M(0, sy, 0.18))));
    // flanking mini pinnacles on wimperg feet
    for (const sx of [-1, 1]) {
      const pn = pinnacle(0.32, 2.2, { lite: true });
      g.carve.push(...pn.carve.map(x => tr(x, M(sx * 1.55, sy - 0.15, 0.18))));
    }
    // blind tracery in the wimperg field above arch: small quatrefoil
    return g;
  });

  kit.def('A_second', () => {
    const w = 1.9, y0 = 15.8, sy = 18.7, k = 0.62;
    const ol = lancetOutline(w, y0, sy, k, 14);
    const g = { stone: [wallWithOpening(W, A.F1, A.S1, [ol])], carve: [], glass: [] };
    g.carve.push(moulding(-W / 2, W / 2, A.F1, STRING));
    const t = tracery(w, y0, sy, k, { lights: 2, oculus: false });
    g.carve.push(...t.carve); g.glass.push(...t.glass);
    g.carve.push(moulding(-w / 2 - 0.15, w / 2 + 0.15, y0 - 0.12, SILL));
    g.carve.push(...hoodMould(w, sy, k, 0.08, 0.25));
    return g;
  });

  // attic storey for pavilions and risalits (4.0 m): paired small lancets
  kit.def('A_attic', () => {
    const holes = [lancetOutline(0.8, 0.7, 2.6, 1, 10, -0.6), lancetOutline(0.8, 0.7, 2.6, 1, 10, 0.6)];
    const g = { stone: [wallWithOpening(W, 0, 4.0, holes)], carve: [], glass: [] };
    g.carve.push(moulding(-W / 2, W / 2, 0, STRING));
    for (const cx of [-0.6, 0.6]) {
      g.glass.push(flat(shape(lancetOutline(0.8, 0.7, 2.6, 1, 10, cx)), -0.4));
      g.carve.push(tr(extrude(shape(lancetOutline(0.8, 0.7, 2.6, 1, 10, cx), [lancetOutline(0.6, 0.75, 2.6, 1, 10, cx, 0.1)]), 0.1, -0.15), M(0, 0, 0)));
    }
    g.carve.push(...hoodMould(2.1, 2.7, 0.62, 0.1, 0.3));
    return g;
  });

  kit.def('A_cornice', () => {
    const g = { carve: [], stone: [] };
    g.stone.push(boxMin(-W / 2, 0, -A.WALL, W, 1.0, A.WALL));
    g.carve.push(...corbelTable(W, 0.05, 0.3));
    g.carve.push(moulding(-W / 2, W / 2, 0.55, [[0, 0], [0, 0.3], [0.12, 0.42], [0.3, 0.5], [0.45, 0.42], [0.45, 0]]));
    g.carve.push(...parapetPanel(W, 1.15, 0.26).carve.map(x => tr(x, M(0, 1.0, 0.12))));
    return g;
  });

  // ---------------- piers (buttresses) running full height, ending in pinnacles
  const pierShaft = (y0, y1, proj, w = A.PIER) => boxMin(-w / 2, y0, -0.05, w, y1 - y0, proj + 0.05);
  const setOff = (y, projLow, projHigh, w = A.PIER) => {
    // sloped weathering from projLow to projHigh over 0.35 m
    const sh = shape([V2(-0.05, 0), V2(projLow, 0), V2(projHigh, 0.35), V2(-0.05, 0.35)].map(p => V2(-p.x, p.y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false });
    g.rotateY(Math.PI / 2); g.translate(-w / 2, y, 0);
    return clean(g);
  };
  const pierLow = (statue) => () => {
    const g = { stone: [], carve: [], dark: [] };
    g.stone.push(boxMin(-A.PIER / 2 - 0.2, 0, -0.05, A.PIER + 0.4, A.PL, 1.25));
    g.carve.push(tr(moulding(-A.PIER / 2 - 0.2, A.PIER / 2 + 0.2, A.PL - 0.25, [[0, 0], [0, 1.2], [0.12, 1.2], [0.25, 0.9], [0.25, 0]]), M(0, 0, 0)));
    g.stone.push(pierShaft(A.PL, A.G1, 0.85));
    g.carve.push(setOff(A.G1 - 0.35, 0.85, 0.65));
    g.stone.push(pierShaft(A.G1, A.F1, 0.65));
    g.carve.push(setOff(A.F1 - 0.35, 0.65, 0.5));
    g.stone.push(pierShaft(A.F1, A.S1, 0.5));
    // engaged colonnette on the pier face
    g.carve.push(tr(prism(8, 0.09, 0.09, A.PL, A.G1 - 0.4), M(0, 0, 0.9)));
    g.carve.push(tr(prism(8, 0.08, 0.08, A.F1, A.S1), M(0, 0, 0.55)));
    if (statue) {
      // corbel for statue at first floor, canopy above
      g.carve.push(tr(lathe([[0.05, -0.9], [0.25, -0.6], [0.42, -0.25], [0.46, -0.1], [0.46, 0]], 6, { phase: 0 }), M(0, 8.35, 1.0)));
      g.carve.push(...canopy(1.0).carve.map(x => tr(x, M(0, 11.0, 1.0))));
      g.dark.push(tr(extrude(shape(lancetOutline(0.8, 0, 2.3, 1, 10)), 0.08, 0.68), M(0, 8.4, 0)));
    } else {
      // blind niche with trefoil head
      g.carve.push(tr(extrude(shape([V2(-0.4, 0), V2(0.4, 0), V2(0.4, 2.6), V2(-0.4, 2.6)], [lancetOutline(0.6, 0.1, 1.9, 1, 10, 0, 0.1)]), 0.08, 0.72), M(0, 9.0, 0)));
    }
    return g;
  };
  kit.def('A_pierS', () => { const g = pierLow(true)(); return g; });
  kit.def('A_pier', () => { const g = pierLow(false)(); return g; });
  kit.def('A_pierExt', () => ({ stone: [pierShaft(0, 4.0, 0.5)], carve: [tr(prism(8, 0.08, 0.08, 0, 4.0), M(0, 0, 0.55))] }));
  kit.def('A_pierTop', () => {
    // from cornice base (0) through parapet, then pinnacle
    const g = { stone: [pierShaft(0, 2.2, 0.5)], carve: [] };
    g.carve.push(tr(moulding(-A.PIER / 2 - 0.05, A.PIER / 2 + 0.05, 0.55, [[0, 0], [0, 0.55], [0.15, 0.68], [0.45, 0.6], [0.45, 0]]), M(0, 0, 0)));
    const p = pinnacle(1.0, 5.4);
    g.carve.push(...p.carve.map(x => tr(x, M(0, 2.2, 0.2))));
    return g;
  });
}

/** Courtyard (B) modules: same storey heights, plainer windows and flat pilasters. */
export function defineB(kit) {
  const W = B.CLEAR;
  kit.def('B_bay', () => {
    const g = { stone: [], carve: [], glass: [] };
    const wins = [[1.5, 2.0, 5.4, 0.8, 0, A.G1], [1.8, 8.4, 12.2, 1, A.G1, A.F1], [1.5, 15.8, 18.6, 0.62, A.F1, A.S1]];
    for (const [w, y0, sy, k, b0, b1] of wins) {
      const ol = lancetOutline(w, y0, sy, k, 12);
      g.stone.push(wallWithOpening(W, b0, b1, [ol], 0.5));
      const t = tracery(w, y0, sy, k, { lights: 2, oculus: k >= 1, recess: 0.18, thick: 0.1, cusp: false });
      g.carve.push(...t.carve); g.glass.push(...t.glass);
      g.carve.push(moulding(-w / 2 - 0.1, w / 2 + 0.1, y0 - 0.1, SILL));
      if (b0 > 0) g.carve.push(moulding(-W / 2, W / 2, b0, [[0, 0], [0.06, 0.12], [0.16, 0.08], [0.2, 0]]));
    }
    g.carve.push(moulding(-W / 2, W / 2, A.S1, [[0, 0], [0, 0.2], [0.15, 0.32], [0.4, 0.3], [0.5, 0]]));
    g.stone.push(boxMin(-W / 2, A.S1, -0.5, W, 1.0, 0.5));
    g.carve.push(...parapetPanel(W, 1.0, 0.22, 3, 16).carve.map(x => tr(x, M(0, A.S1 + 0.9, 0.0))));
    return g;
  });
  kit.def('B_pier', () => {
    const g = { stone: [boxMin(-B.PIER / 2, 0, -0.05, B.PIER, A.S1 + 1.9, 0.3)], carve: [] };
    const p = pinnacle(0.62, 3.6, { lite: true });
    g.carve.push(...p.carve.map(x => tr(x, M(0, A.S1 + 1.9, 0.1))));
    return g;
  });
}
