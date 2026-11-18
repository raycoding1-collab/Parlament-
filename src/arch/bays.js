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

  // ---------------- river arcade supports (S3 close-up): free-standing round columns with
  // cushion capitals carry the round arches; above them a spandrel wall and a slim pilaster
  // rising through the parapet into a small pinnacle. Accent bays keep a solid pier.
  const SPRING = RIV.CROWN - RIV.CLEAR / 2;
  const riverPier = (pw, accent) => () => {
    const g = { stone: [], carve: [] };
    g.stone.push(boxMin(-pw / 2 - 0.1, 0, -1.1, pw + 0.2, RIV.FLOOR, 1.35));
    if (!accent) {
      const cz = -0.42;
      g.carve.push(tr(boxMin(-0.42, 0, -0.42, 0.84, 0.3, 0.84), M(0, RIV.FLOOR, cz)));
      g.carve.push(tr(lathe([[0.36, 0], [0.38, 0.08], [0.32, 0.18], [0.3, 0.26], [0.29, 0.34]], 16, { flatShade: false }), M(0, RIV.FLOOR + 0.3, cz)));
      g.carve.push(tr(lathe([[0.29, 0], [0.26, (SPRING - RIV.FLOOR - 1.2) * 0.5], [0.25, SPRING - RIV.FLOOR - 1.2]], 18, { flatShade: false }), M(0, RIV.FLOOR + 0.64, cz)));
      // cushion capital with necking and abacus
      g.carve.push(tr(lathe([[0.27, 0], [0.3, 0.06], [0.27, 0.12], [0.33, 0.2], [0.44, 0.38], [0.5, 0.5], [0.01, 0.5]], 16, { flatShade: false }), M(0, SPRING - 0.56, cz)));
      g.carve.push(tr(boxMin(-0.5, 0, -0.5, 1.0, 0.16, 1.0), M(0, SPRING - 0.06, cz)));
    } else {
      g.stone.push(boxMin(-pw / 2, RIV.FLOOR, -1.0, pw, SPRING - RIV.FLOOR, 1.35));
      for (const s of [-1, 1]) g.carve.push(tr(prism(10, 0.13, 0.13, RIV.FLOOR + 0.3, SPRING - 0.3), M(s * (pw / 2 - 0.18), 0, 0.38)));
    }
    // spandrel wall between the arches
    g.stone.push(boxMin(-pw / 2 - 0.05, SPRING, -1.0, pw + 0.1, RIV.CORNICE - SPRING, 1.02));
    // statue corbel and canopy in the spandrel (regular bays)
    if (!accent) {
      g.carve.push(tr(lathe([[0.04, -0.55], [0.2, -0.35], [0.32, -0.12], [0.34, 0]], 6, { phase: 0 }), M(0, SPRING + 0.4, 0.22)));
      g.carve.push(...canopy(0.72).carve.map(x => tr(x, M(0, SPRING + 2.45, 0.22, 0, 0.8, 0.8, 0.8))));
    }
    // slim pilaster to the parapet, then a small pinnacle
    const pp = accent ? 0.62 : 0.4;
    g.stone.push(boxMin(-pp / 2, SPRING + 0.4, 0.0, pp, RIV.PARAPET + 0.25 - SPRING - 0.4, accent ? 0.3 : 0.16));
    g.carve.push(tr(box(pp + 0.1, 0.2, 0.32), M(0, RIV.CORNICE - 0.1, 0.12, 0, 1, 1, 1, -0.5)));
    const ph = accent ? 27.0 - RIV.PARAPET : 25.0 - RIV.PARAPET;
    pinnacle(accent ? 0.85 : 0.5, ph, { lite: !accent }).carve.forEach(x => g.carve.push(tr(x, M(0, RIV.PARAPET + 0.2, 0.1))));
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
    const A0 = LOG.CROWN + 0.7; // cornice directly over the arch crowns (S3)
    g.stone.push(wall(P, 12.3, A0, [ol], 0.8));
    g.carve.push(sweepXY(archPts(A, LOG.SPRING, 0.5, 22).reverse(), [[-0.05, 0.02], [0.05, 0.1], [0.13, 0.1], [0.2, 0]]));
    g.carve.push(...parapetPanel(A, 1.1, 0.2, 4, 16).carve.map(x => tr(x, M(0, 12.6, 0.05))));
    g.stone.push(boxMin(-P / 2, 12.5, -4.3, P, 0.12, 4.3));
    const bw = roundOutline(1.6, 14.0, 19.6, 0, 12);
    g.shade.push(tr(wall(P, 12.6, LOG.CROWN, [bw], 0.4), M(0, 0, -4.2)));
    g.glass.push(tr(flat(shape(bw)), M(0, 0, -4.5)));
    g.shade.push(boxMin(-P / 2, LOG.CROWN - 0.3, -4.3, P, 0.3, 3.6));
    g.carve.push(moulding(-P / 2, P / 2, A0 - 0.55, CORN));
    // gabled attic screen: five-light round-headed arcade (centre light open,
    // the others blind) under a steep crocketed gable with a quatrefoil (S3)
    const sw = P - 0.42, S1 = A0 + 3.2, AP = LOG.GABLE, gh = AP - S1;
    const lights = [-2, -1, 0, 1, 2].map(i => roundOutline(0.42, A0 + 0.6, A0 + 2.55, i * 0.78, 10));
    const qf = foilPts(0, S1 + gh * 0.36, 0.48, 4, 32, Math.PI / 4);
    const screen = [V2(-sw / 2, A0), V2(sw / 2, A0), V2(sw / 2, S1), V2(0, AP), V2(-sw / 2, S1)];
    g.stone.push(extrude(shape(screen, [...lights, qf]), 0.5, 0.3));
    lights.forEach((o, i) => (i === 2 ? g.dark : g.shade).push(flat(shape(o), i === 2 ? -0.3 : 0.12)));
    g.dark.push(flat(shape(qf), 0.0));
    g.carve.push(extrude(shape(circlePts(0, S1 + gh * 0.36, 0.62, 24), [circlePts(0, S1 + gh * 0.36, 0.5, 24)]), 0.08, 0.38));
    for (let i = -2; i <= 1; i++) g.carve.push(tr(prism(8, 0.07, 0.07, A0 + 0.6, A0 + 1.9), M(i * 0.78 + 0.39, 0, 0.36)));
    g.carve.push(boxMin(-sw / 2, A0 + 0.42, 0.25, sw, 0.14, 0.16));
    g.carve.push(boxMin(-sw / 2 - 0.06, S1 - 0.16, 0.24, sw + 0.12, 0.2, 0.18));
    // raking copings, crockets and finial
    const len = Math.hypot(sw / 2, gh), ang = Math.atan2(gh, sw / 2);
    for (const sg of [-1, 1]) {
      g.carve.push(tr(box(len + 0.1, 0.16, 0.66), M(sg * sw / 4, S1 + gh / 2 + 0.05, 0.05, 0, 1, 1, 1, 0, -sg * ang)));
      for (let k = 1; k <= 3; k++) {
        const t = k / 4;
        for (const c of crocket(0.24)) g.carve.push(tr(c, M(sg * (sw / 2) * (1 - t), S1 + gh * t + 0.14, 0.15, 0, 1, 1, 1, -Math.PI / 2 + 0.2)));
      }
    }
    finial(0.95).carve.forEach(x => g.carve.push(tr(x, M(0, AP - 0.05, 0.05))));
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
    g.stone.push(boxMin(-cw / 2, LOG.SPRING - 0.05, -0.1, cw, LOG.CROWN + 0.9 - LOG.SPRING + 0.05, 0.8));
    pinnacle(0.62, 5.0, {}).carve.forEach(x => g.carve.push(tr(x, M(0, LOG.CROWN + 0.9, 0.3))));
    return g;
  });

  // ---------------- end blocks and the Kossuth-side façades
  kit.def('E', () => {
    const g = { stone: [], carve: [], glass: [], dark: [] };
    const C = END.CLEAR;
    g.stone.push(wall(C, 0, 2.6, [rect(-0.5, 0.8, 0.5, 1.9)], 1.0));
    g.dark.push(flat(shape(rect(-0.5, 0.8, 0.5, 1.9)), -0.5));
    g.carve.push(moulding(-C / 2, C / 2, 2.4, [[0, 0], [0, 0.2], [0.15, 0.25], [0.25, 0]]));
    // ground floor: paired round-headed lights under a round hood (S3 close-up)
    const gl = [roundOutline(0.85, 4.1, 7.5, -0.6), roundOutline(0.85, 4.1, 7.5, 0.6)];
    g.stone.push(wall(C, 2.6, 8.4, gl));
    gl.forEach(o => g.glass.push(flat(shape(o), -0.3)));
    g.carve.push(sweepXY(archPts(2.3, 6.6, 0.5, 16).reverse(), [[0, 0], [0.05, 0.08], [0.1, 0.11], [0.15, 0.07], [0.17, 0]]));
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
    // the tall arcaded parapet of the end blocks: round-headed slots between colonnettes
    {
      const n = 6, py0 = END.CORNICE + 0.5, py1 = END.PARAPET - 0.3, slots = [];
      for (let i = 0; i < n; i++) slots.push(roundOutline(0.32, py0 + 0.35, py1 - 0.35, -C / 2 + C / n * (i + 0.5), 8));
      g.carve.push(extrude(shape(rect(-C / 2, py0, C / 2, py1), slots), 0.26, 0.15));
      g.carve.push(moulding(-C / 2, C / 2, py1, [[0, 0.15], [0.12, 0.2], [0.3, 0.12], [0.3, -0.2], [0, -0.2]]));
    }
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
