// Measured façade bays (see ref/SPEC.md). Every module faces +Z with the wall
// plane at z = 0, centred on x = 0, spanning the clear width between piers;
// heights are metres above the terrace (y = 0). Piers are separate parts.
import * as THREE from 'three';
import { M, tr, box, boxMin, prism, pyramid, lathe, blob, extrude, flat, shape, archPts, archRise, lancetOutline, foilPts, circlePts, sweepXY, moulding, clean } from '../geo/util.js';
import { crocket, finial, crocketedSpire, wimperg, pinnacle, canopy, parapetPanel, corbelTable, statue } from './ornament.js';
import { tracery } from './modules.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
const rect = (x0, y0, x1, y1) => [V2(x0, y0), V2(x1, y0), V2(x1, y1), V2(x0, y1)];
const wall = (w, y0, y1, holes = [], d = 0.7) => extrude(shape(rect(-w / 2, y0, w / 2, y1), holes), d, 0);
/** Round-headed (semicircular) opening outline. */
const roundOutline = (w, y0, crown, x0 = 0, seg = 14) => {
  const sy = crown - w / 2;
  const pts = [V2(x0 - w / 2, y0)];
  for (let i = 0; i <= seg; i++) { const a = Math.PI - (i / seg) * Math.PI; pts.push(V2(x0 + Math.cos(a) * w / 2, sy + Math.sin(a) * w / 2)); }
  pts.push(V2(x0 + w / 2, y0));
  return pts;
};
const STR = [[0, 0], [0.05, 0.14], [0.14, 0.2], [0.24, 0.12], [0.3, 0]];
const SILL = [[-0.14, 0], [-0.1, 0.12], [0, 0.18], [0.07, 0.15], [0.09, 0]];
const CORN = [[0, 0], [0, 0.3], [0.14, 0.44], [0.32, 0.55], [0.5, 0.48], [0.55, 0]];

export const RIV = { CLEAR: 4.2, PIER: 0.87, APIER: 1.6, FLOOR: 2.8, CROWN: 11.8, BAL0: 12.6, WIN0: 14.4, WIN1: 18.7, CORNICE: 21.0, PARAPET: 22.3, LOGGIA: 3.6 };
export const END = { PITCH: 4.72, CLEAR: 3.9, PIER: 0.82, CORNICE: 20.6, PARAPET: 23.7 };
export const LOG = { PITCH: 4.86, CLEAR: 4.2, SPRING: 19.2, CROWN: 21.3, CORNICE: 23.7, GABLE: 27.9 };

/** Shared upper zone of the river wing: frieze, corbel table, cornice, pierced parapet. */
function riverTop(W, g) {
  g.stone.push(wall(W, RIV.WIN1, RIV.CORNICE - 0.6));
  // blind tracery frieze: small trefoil arcading
  const n = Math.max(3, Math.round(W / 0.7));
  const holes = [];
  for (let i = 0; i < n; i++) holes.push(lancetOutline(W / n * 0.7, RIV.WIN1 + 0.35, RIV.WIN1 + 1.0, 1, 6, -W / 2 + W / n * (i + 0.5), 0.05));
  g.carve.push(extrude(shape(rect(-W / 2, RIV.WIN1 + 0.25, W / 2, RIV.WIN1 + 1.35), holes), 0.06, 0.06));
  g.carve.push(...corbelTable(W, RIV.CORNICE - 0.6, 0.32));
  g.carve.push(moulding(-W / 2, W / 2, RIV.CORNICE - 0.15, CORN));
  g.stone.push(boxMin(-W / 2, RIV.CORNICE - 0.6, -0.7, W, 0.9, 0.7));
  g.carve.push(...parapetPanel(W, RIV.PARAPET - RIV.CORNICE + 0.1, 0.24, 0, 20).carve.map(x => tr(x, M(0, RIV.CORNICE + 0.1, 0.18))));
}

/** River arcade + loggia (shared by regular and accent bays). */
function riverArcade(W, g) {
  const A = RIV.CLEAR;
  // podium front (rusticated) and arcade floor
  g.stone.push(wall(W, 0, RIV.FLOOR, [], 1.2));
  g.carve.push(moulding(-W / 2, W / 2, RIV.FLOOR - 0.3, [[0, 0], [0, 0.25], [0.18, 0.32], [0.3, 0.1], [0.3, 0]]));
  // arcade wall with the round arch
  const ol = roundOutline(A, RIV.FLOOR, RIV.CROWN, 0, 20);
  g.stone.push(wall(W, RIV.FLOOR, RIV.BAL0, [ol], 1.0));
  // archivolt: two orders + hood
  const arc = archPts(A, RIV.CROWN - A / 2, 0.5, 22);
  g.carve.push(sweepXY([V2(-A / 2, RIV.CROWN - A / 2), ...arc, V2(A / 2, RIV.CROWN - A / 2)].reverse(), [[-0.06, 0.02], [0.04, 0.12], [0.14, 0.14], [0.22, 0.06], [0.26, 0]]));
  g.carve.push(sweepXY(archPts(A + 0.5, RIV.CROWN - A / 2, 0.5, 22).reverse(), [[0, 0], [0.06, 0.1], [0.14, 0.12], [0.18, 0]]));
  // loggia floor, back wall with doors and windows, coffered ceiling
  const D = RIV.LOGGIA;
  g.stone.push(boxMin(-W / 2, RIV.FLOOR - 0.1, -D - 1.0, W, 0.1, D + 1.0));
  const door = lancetOutline(1.5, RIV.FLOOR, RIV.FLOOR + 3.4, 0.5, 10);
  const win = roundOutline(1.4, RIV.FLOOR + 5.0, RIV.FLOOR + 7.6, 0, 10);
  g.shade.push(tr(wall(W, RIV.FLOOR, RIV.BAL0, [door, win], 0.4), M(0, 0, -D - 1.0)));
  g.glass.push(tr(flat(shape(door)), M(0, 0, -D - 1.3)), tr(flat(shape(win)), M(0, 0, -D - 1.3)));
  g.shade.push(boxMin(-W / 2, RIV.CROWN - 0.2, -D - 1.0, W, 0.4, D));
  for (const s of [-1, 1]) g.shade.push(tr(wall(D, RIV.FLOOR, RIV.CROWN, [roundOutline(D - 0.8, RIV.FLOOR, RIV.CROWN - 0.6, 0, 10)], 0.4), M(s * (W / 2 + 0.2), 0, -D / 2 - 1.0, Math.PI / 2)));
  // spandrel roundels
  for (const s of [-1, 1]) g.carve.push(tr(extrude(shape(circlePts(0, 0, 0.32, 16), [foilPts(0, 0, 0.24, 4, 24)]), 0.06, 0.06), M(s * (A / 2 + 0.05), RIV.CROWN - 0.3, 0)));
  // entablature band + main-floor balustrade
  g.carve.push(moulding(-W / 2, W / 2, RIV.BAL0 - 0.35, STR));
  g.carve.push(...parapetPanel(W, 1.25, 0.2, 0, 16).carve.map(x => tr(x, M(0, RIV.BAL0, 0.28))));
}

export function defineBays(kit) {
  const W = RIV.CLEAR;
  // ---------------- regular river bay: arcade + three round-headed windows
  kit.def('RA', () => {
    const g = { stone: [], carve: [], glass: [], dark: [], shade: [] };
    riverArcade(W, g);
    const ww = 1.12, pitch = 1.5;
    const holes = [-1, 0, 1].map(i => roundOutline(ww, RIV.WIN0, RIV.WIN1, i * pitch));
    g.stone.push(wall(W, RIV.BAL0, RIV.WIN1, holes));
    for (const i of [-1, 0, 1]) {
      g.glass.push(flat(shape(roundOutline(ww, RIV.WIN0, RIV.WIN1, i * pitch)), -0.32));
      // mullion + transom of each light, and a moulded surround
      g.carve.push(box(0.07, RIV.WIN1 - RIV.WIN0 - 0.3, 0.08, i * pitch, (RIV.WIN0 + RIV.WIN1) / 2 - 0.15, -0.22));
      g.carve.push(box(ww, 0.07, 0.08, i * pitch, RIV.WIN0 + 2.7, -0.22));
      g.carve.push(sweepXY([V2(i * pitch - ww / 2, RIV.WIN0), ...archPts(ww, RIV.WIN1 - ww / 2, 0.5, 12, i * pitch), V2(i * pitch + ww / 2, RIV.WIN0)].reverse(), [[0, 0], [0.05, 0.08], [0.11, 0]]));
    }
    // colonnettes between the lights
    for (const s of [-0.5, 0.5]) {
      g.carve.push(tr(prism(8, 0.1, 0.1, RIV.WIN0, RIV.WIN1 - 0.6), M(s * pitch * 2 * 0.5, 0, 0.05)));
      g.carve.push(tr(lathe([[0.1, 0], [0.17, 0.12], [0.17, 0.2]], 8), M(s * pitch * 2 * 0.5, RIV.WIN1 - 0.62, 0.05)));
    }
    g.carve.push(moulding(-W / 2, W / 2, RIV.WIN0 - 0.15, SILL));
    riverTop(W, g);
    return g;
  });

  // ---------------- accent bay (under the chamber-block towers): single tall pointed window + gable
  kit.def('RX', () => {
    const g = { stone: [], carve: [], glass: [], dark: [], shade: [] };
    riverArcade(W, g);
    const w = 1.9, y0 = 13.9, sy = 18.1, k = 0.85;
    const ol = lancetOutline(w, y0, sy, k, 16);
    g.stone.push(wall(W, RIV.BAL0, RIV.WIN1 + 1.4, [ol]));
    const t = tracery(w, y0, sy, k, { lights: 2, oculus: true, transom: 16.2 });
    g.carve.push(...t.carve); g.glass.push(...t.glass);
    for (const s of [-1, 1]) g.carve.push(tr(prism(8, 0.08, 0.08, y0, sy), M(s * (w / 2 + 0.1), 0, 0.06)));
    g.stone.push(wall(W, RIV.WIN1 + 1.4, RIV.CORNICE - 0.6));
    g.carve.push(...corbelTable(W, RIV.CORNICE - 0.6, 0.32));
    g.carve.push(moulding(-W / 2, W / 2, RIV.CORNICE - 0.15, CORN));
    g.stone.push(boxMin(-W / 2, RIV.CORNICE - 0.6, -0.7, W, 0.9, 0.7));
    // the crocketed gable rising through the parapet with three lancets
    const gh = 27.8 - RIV.CORNICE;
    const holes = [lancetOutline(0.5, 1.0, 3.2, 1, 8, -0.75), lancetOutline(0.55, 1.0, 3.9, 1, 8, 0), lancetOutline(0.5, 1.0, 3.2, 1, 8, 0.75)];
    g.stone.push(tr(extrude(shape([V2(-W / 2, 0), V2(W / 2, 0), V2(0, gh)], holes), 0.5, 0.1), M(0, RIV.CORNICE + 0.3, 0)));
    for (const x of [-0.75, 0, 0.75]) g.dark.push(tr(flat(shape(lancetOutline(x === 0 ? 0.55 : 0.5, 1.0, x === 0 ? 3.9 : 3.2, 1, 8, x))), M(0, RIV.CORNICE + 0.3, -0.3)));
    const wg = wimperg(W + 0.2, gh + 0.2, 0.16, { crockets: 6, cs: 0.28, finialH: 1.1, blind: false });
    g.carve.push(...wg.carve.map(x => tr(x, M(0, RIV.CORNICE + 0.25, 0.2))));
    return g;
  });

  // ---------------- piers of the river arcade (with ruler statue & canopy) and their pinnacles
  const riverPier = (pw, tall) => () => {
    const g = { stone: [], carve: [] };
    g.stone.push(boxMin(-pw / 2 - 0.1, 0, -0.1, pw + 0.2, RIV.FLOOR, 1.35));
    g.stone.push(boxMin(-pw / 2, RIV.FLOOR, -0.1, pw, RIV.CORNICE - RIV.FLOOR, 0.95));
    // engaged column on the arcade pier with capital at the springing
    g.carve.push(tr(lathe([[0.2, 0], [0.26, 0.1], [0.2, 0.3]], 10), M(0, RIV.FLOOR, 1.0)));
    g.carve.push(tr(prism(10, 0.17, 0.17, RIV.FLOOR + 0.3, RIV.CROWN - RIV.CLEAR / 2 - 0.4), M(0, 0, 1.0)));
    g.carve.push(tr(lathe([[0.17, 0], [0.28, 0.2], [0.34, 0.4], [0.34, 0.5]], 10), M(0, RIV.CROWN - RIV.CLEAR / 2 - 0.45, 1.0)));
    // statue corbel and canopy at the main floor
    g.carve.push(tr(lathe([[0.05, -0.8], [0.26, -0.5], [0.42, -0.2], [0.44, 0]], 6, { phase: 0 }), M(0, RIV.BAL0 + 0.1, 1.1)));
    g.carve.push(...canopy(0.95).carve.map(x => tr(x, M(0, RIV.BAL0 + 2.75, 1.1))));
    // weathered set-off and the pinnacle above the parapet
    g.carve.push(tr(box(pw + 0.06, 0.25, 0.6), M(0, RIV.CORNICE - 0.1, 0.85, 0, 1, 1, 1, -0.5)));
    g.stone.push(boxMin(-pw / 2 + 0.05, RIV.CORNICE, -0.1, pw - 0.1, RIV.PARAPET - RIV.CORNICE + 0.4, 0.7));
    const ph = tall ? 26.8 - RIV.PARAPET : 24.6 - RIV.PARAPET;
    pinnacle(Math.min(pw, 1.05), ph + 0.6, { lite: !tall }).carve.forEach(x => g.carve.push(tr(x, M(0, RIV.PARAPET + 0.1, 0.3))));
    return g;
  };
  kit.def('RP', riverPier(RIV.PIER, false));
  kit.def('RPX', riverPier(RIV.APIER, true));
  for (let v = 0; v < 4; v++) if (!kit.has('statue' + v)) kit.def('statue' + v, () => statue(v));

  // ---------------- central risalit loggia bay
  kit.def('L', () => {
    const g = { stone: [], carve: [], glass: [], dark: [], shade: [] };
    const P = LOG.PITCH, A = LOG.CLEAR;
    // basement with small square window
    g.stone.push(wall(P, 0, 2.6, [rect(-0.45, 0.8, 0.45, 1.8)], 1.0));
    g.dark.push(flat(shape(rect(-0.45, 0.8, 0.45, 1.8)), -0.5));
    g.carve.push(moulding(-P / 2, P / 2, 2.4, [[0, 0], [0, 0.2], [0.15, 0.25], [0.25, 0]]));
    // ground floor: paired round-arched windows
    const gw = [roundOutline(0.95, 3.7, 7.5, -0.75), roundOutline(0.95, 3.7, 7.5, 0.75)];
    g.stone.push(wall(P, 2.6, 8.4, gw));
    gw.forEach(o => g.glass.push(flat(shape(o), -0.3)));
    g.carve.push(box(0.22, 3.6, 0.2, 0, 5.5, 0.05));
    g.carve.push(moulding(-P / 2, P / 2, 8.4, STR));
    // mezzanine: triple rectangular windows
    const mw = [-1, 0, 1].map(i => rect(i * 1.0 - 0.38, 9.2, i * 1.0 + 0.38, 11.3));
    g.stone.push(wall(P, 8.4, 12.0, mw));
    mw.forEach(o => g.glass.push(flat(shape(o), -0.3)));
    g.carve.push(moulding(-P / 2, P / 2, 12.0, STR));
    // loggia: semicircular arch on colonnettes, balustrade, deep back wall with tall windows
    const ol = roundOutline(A, 12.6, LOG.CROWN, 0, 20);
    g.stone.push(wall(P, 12.3, LOG.CORNICE, [ol], 0.8));
    g.carve.push(sweepXY(archPts(A, LOG.SPRING, 0.5, 22).reverse(), [[-0.05, 0.02], [0.05, 0.1], [0.13, 0.1], [0.2, 0]]));
    g.carve.push(...parapetPanel(A, 1.1, 0.2, 4, 16).carve.map(x => tr(x, M(0, 12.6, 0.05))));
    g.stone.push(boxMin(-P / 2, 12.5, -4.3, P, 0.12, 4.3));
    const bw = roundOutline(1.6, 14.0, 19.6, 0, 12);
    g.shade.push(tr(wall(P, 12.6, LOG.CROWN, [bw], 0.4), M(0, 0, -4.2)));
    g.glass.push(tr(flat(shape(bw)), M(0, 0, -4.5)));
    g.shade.push(boxMin(-P / 2, LOG.CROWN - 0.3, -4.3, P, 0.3, 3.6));
    // frieze, cornice
    g.carve.push(moulding(-P / 2, P / 2, LOG.CORNICE - 0.4, CORN));
    // crocketed gable with trefoil oculus over each bay
    const gh = LOG.GABLE - LOG.CORNICE;
    g.stone.push(tr(extrude(shape([V2(-P / 2 + 0.25, 0), V2(P / 2 - 0.25, 0), V2(0, gh)], [foilPts(0, gh * 0.42, 0.6, 3, 30, Math.PI / 2)]), 0.4, 0.2), M(0, LOG.CORNICE, 0)));
    g.dark.push(tr(flat(shape(foilPts(0, gh * 0.42, 0.6, 3, 30, Math.PI / 2))), M(0, LOG.CORNICE, -0.2)));
    wimperg(P - 0.3, gh + 0.15, 0.12, { crockets: 4, cs: 0.24, finialH: 0.9, blind: false }).carve.forEach(x => g.carve.push(tr(x, M(0, LOG.CORNICE - 0.05, 0.25))));
    return g;
  });
  kit.def('LC', () => {
    // twin colonnettes between loggia arches, rising to a pinnacle above the gables
    const g = { stone: [], carve: [] };
    const cw = LOG.PITCH - LOG.CLEAR;
    g.stone.push(boxMin(-cw / 2, 0, -0.1, cw, 12.6, 1.0));
    for (const s of [-1, 1]) {
      g.carve.push(tr(prism(10, 0.12, 0.12, 12.6, LOG.SPRING - 0.4), M(s * 0.16, 0, 0.35)));
      g.carve.push(tr(lathe([[0.12, 0], [0.2, 0.2], [0.24, 0.4]], 8), M(s * 0.16, LOG.SPRING - 0.45, 0.35)));
    }
    g.stone.push(boxMin(-cw / 2, LOG.SPRING - 0.05, -0.1, cw, LOG.CORNICE - LOG.SPRING + 0.05, 0.8));
    pinnacle(0.7, 31.0 - LOG.CORNICE - 0.4, {}).carve.forEach(x => g.carve.push(tr(x, M(0, LOG.CORNICE + 0.3, 0.3))));
    return g;
  });

  // ---------------- end blocks and the Kossuth-side façades
  kit.def('E', () => {
    const g = { stone: [], carve: [], glass: [], dark: [] };
    const C = END.CLEAR;
    g.stone.push(wall(C, 0, 2.6, [rect(-0.5, 0.8, 0.5, 1.9)], 1.0));
    g.dark.push(flat(shape(rect(-0.5, 0.8, 0.5, 1.9)), -0.5));
    g.carve.push(moulding(-C / 2, C / 2, 2.4, [[0, 0], [0, 0.2], [0.15, 0.25], [0.25, 0]]));
    // ground floor: paired pointed lights
    const gl = [lancetOutline(0.85, 4.1, 6.8, 1, 10, -0.6), lancetOutline(0.85, 4.1, 6.8, 1, 10, 0.6)];
    g.stone.push(wall(C, 2.6, 8.4, gl));
    gl.forEach(o => g.glass.push(flat(shape(o), -0.3)));
    g.carve.push(...hood(2.2, 6.6));
    g.carve.push(moulding(-C / 2, C / 2, 8.4, STR));
    // mezzanine: paired rectangular windows
    const ml = [rect(-1.05, 9.3, -0.15, 11.4), rect(0.15, 9.3, 1.05, 11.4)];
    g.stone.push(wall(C, 8.4, 12.4, ml));
    ml.forEach(o => g.glass.push(flat(shape(o), -0.3)));
    g.carve.push(moulding(-C / 2, C / 2, 12.4, STR));
    // main floor: tall two-light traceried window with oculus
    const w = 2.1, y0 = 13.2, sy = 17.6, k = 0.88;
    const ol = lancetOutline(w, y0, sy, k, 16);
    g.stone.push(wall(C, 12.4, END.CORNICE - 0.5, [ol]));
    const t = tracery(w, y0, sy, k, { lights: 2, oculus: true, transom: 15.6 });
    g.carve.push(...t.carve); g.glass.push(...t.glass);
    g.carve.push(...hood(w, sy, 0.12, k));
    g.carve.push(moulding(-w / 2 - 0.2, w / 2 + 0.2, y0 - 0.14, SILL));
    g.carve.push(...corbelTable(C, END.CORNICE - 0.5, 0.3));
    g.carve.push(moulding(-C / 2, C / 2, END.CORNICE - 0.1, CORN));
    g.stone.push(boxMin(-C / 2, END.CORNICE - 0.5, -0.7, C, 0.9, 0.7));
    // the tall pierced parapet of the end blocks (two tiers of tracery)
    g.carve.push(...parapetPanel(C, 1.45, 0.24, 3, 20).carve.map(x => tr(x, M(0, END.CORNICE + 0.3, 0.15))));
    g.carve.push(...parapetPanel(C, 1.3, 0.24, 4, 16).carve.map(x => tr(x, M(0, END.CORNICE + 1.75, 0.15))));
    return g;
  });
  kit.def('EP', () => {
    const g = { stone: [], carve: [] };
    const pw = END.PIER;
    g.stone.push(boxMin(-pw / 2 - 0.1, 0, -0.1, pw + 0.2, 2.6, 1.0));
    g.stone.push(boxMin(-pw / 2, 2.6, -0.1, pw, END.PARAPET - 2.6, 0.6));
    g.carve.push(tr(prism(8, 0.09, 0.09, 2.8, END.CORNICE - 0.6), M(0, 0, 0.6)));
    pinnacle(0.8, 26.0 - END.PARAPET + 0.5, { lite: true }).carve.forEach(x => g.carve.push(tr(x, M(0, END.PARAPET, 0.2))));
    return g;
  });

  // ---------------- courtyard bays: brick walls with stone dressings (Zsolnay accents)
  kit.def('BB', () => {
    const g = { brick: [], carve: [], glass: [], zsolnay: [] };
    const C = 3.4;
    const ls = [[1.4, 2.4, 6.0, 0.8], [1.5, 9.0, 12.2, 1.0], [1.4, 15.6, 18.4, 0.7]];
    let yb = 0;
    for (const [w, y0, sy, k] of ls) {
      const ol = lancetOutline(w, y0, sy, k, 10);
      const yt = y0 < 5 ? 7.6 : y0 < 12 ? 14.6 : 20.2;
      g.brick.push(wall(C, yb, yt, [ol], 0.5));
      g.glass.push(flat(shape(ol), -0.22));
      g.carve.push(extrude(shape(lancetOutline(w + 0.3, y0 - 0.1, sy, k, 10), [ol]), 0.08, 0.06));
      g.carve.push(box(0.08, sy - y0, 0.08, 0, (y0 + sy) / 2, -0.12));
      g.carve.push(moulding(-C / 2, C / 2, yt - 0.25, [[0, 0], [0.05, 0.1], [0.2, 0.12], [0.25, 0]]));
      // glazed Zsolnay tile band
      g.zsolnay.push(box(C, 0.22, 0.04, 0, yt - 0.55, 0.02));
      yb = yt;
    }
    g.brick.push(wall(C, 20.2, 21.6, [], 0.5));
    g.carve.push(moulding(-C / 2, C / 2, 21.2, [[0, 0], [0, 0.2], [0.15, 0.3], [0.35, 0.25], [0.4, 0]]));
    g.carve.push(...parapetPanel(C, 0.9, 0.2, 3, 16).carve.map(x => tr(x, M(0, 21.6, 0))));
    return g;
  });
  kit.def('BP', () => {
    const g = { carve: [], stone: [] };
    g.stone.push(boxMin(-0.3, 0, -0.05, 0.6, 22.5, 0.32));
    pinnacle(0.55, 3.2, { lite: true }).carve.forEach(x => g.carve.push(tr(x, M(0, 22.5, 0.1))));
    return g;
  });
}

function hood(w, sy, off = 0.12, k = 1) {
  const kk = (k * w + off) / (w + off * 2);
  const arch = archPts(w + off * 2, sy, kk, 14);
  const path = [V2(arch[0].x, sy - 0.3), ...arch, V2(arch[arch.length - 1].x, sy - 0.3)];
  return [sweepXY(path.reverse(), [[0, 0], [0.05, 0.08], [0.1, 0.11], [0.15, 0.07], [0.17, 0]]), blob(0.1, 0.12, 0.1, -w / 2 - off, sy - 0.35, 0.1), blob(0.1, 0.12, 0.1, w / 2 + off, sy - 0.35, 0.1)];
}
