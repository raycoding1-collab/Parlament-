// The 96 m dome: 16-sided drum on a podium, tall two-light windows under crocketed
// wimpergs, 16 buttresses ending in pinnacles, an ogival 16-facet tiled dome with
// white stone ribs carrying crockets, three rows of lucarnes, and an open
// eight-arched lantern with crocketed spire and gilded finial.
import * as THREE from 'three';
import { M, tr, box, boxMin, prism, pyramid, lathe, extrude, flat, shape, lancetOutline, archPts, foilPts, circlePts, moulding, clean } from '../geo/util.js';
import { tracery } from './modules.js';
import { pinnacle, wimperg, finial, parapetPanel, corbelTable, crocket, crocketedSpire } from './ornament.js';
import { dormer } from './roofs.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
const N = 16;
export const DOME = { podium: 30, lowerTop: 34, RL: 16.2, RD: 15.2, drumTop: 51.6, base: 53.0, R0: 14.4, top: 82.0, Rtop: 3.6 };

/** Dome profile radius (circumradius of the 16-gon) at height y. */
function profileR(y) {
  const { base, R0, top, Rtop } = DOME;
  const H = top - base, d = R0 - Rtop;
  const Rc = (d * d + H * H) / (2 * d);
  const t = Math.min(Math.max(y - base, 0), H);
  return (R0 - Rc) + Math.sqrt(Rc * Rc - t * t);
}

export function buildDome(kit) {
  const { podium, lowerTop, RL, RD, drumTop, base, R0, top, Rtop } = DOME;
  const apL = RL * Math.cos(Math.PI / N), wL = 2 * RL * Math.sin(Math.PI / N);
  const apD = RD * Math.cos(Math.PI / N), wD = 2 * RD * Math.sin(Math.PI / N);
  const faceM = (k, ap, y = 0, out = 0) => { const a = (k / N) * Math.PI * 2; return M(Math.sin(a) * (ap + out), y, Math.cos(a) * (ap + out), a); };
  const cornerM = (k, R, y = 0) => { const a = Math.PI / N + (k / N) * Math.PI * 2; return M(Math.sin(a) * R, y, Math.cos(a) * R, a); };

  // ---- lower drum: blind arcading on each face
  kit.def('dome_lower', () => {
    const g = { stone: [], carve: [], dark: [] };
    const holes = [lancetOutline(1.7, 0.6, 2.4, 1, 10, -1.3), lancetOutline(1.7, 0.6, 2.4, 1, 10, 1.3)];
    g.stone.push(extrude(shape([V2(-wL / 2, 0), V2(wL / 2, 0), V2(wL / 2, lowerTop - podium), V2(-wL / 2, lowerTop - podium)], holes), 1.0, 0));
    for (const cx of [-1.3, 1.3]) {
      g.dark.push(flat(shape(lancetOutline(1.7, 0.6, 2.4, 1, 10, cx)), -0.35));
      g.carve.push(extrude(shape(lancetOutline(1.7, 0.6, 2.4, 1, 10, cx), [lancetOutline(1.4, 0.65, 2.4, 1, 10, cx, 0.18)]), 0.1, -0.15));
    }
    g.carve.push(moulding(-wL / 2, wL / 2, 0, [[0, 0], [0, 0.4], [0.3, 0.4], [0.6, 0.1], [0.6, 0]]));
    g.carve.push(moulding(-wL / 2, wL / 2, lowerTop - podium - 0.4, [[0, 0], [0.1, 0.3], [0.3, 0.4], [0.4, 0]]));
    return g;
  });

  // ---- upper drum face: great window, wimperg, cornice & parapet
  kit.def('dome_face', () => {
    const g = { stone: [], carve: [], glass: [] };
    const y0 = 36.2 - lowerTop, sy = 46.2 - lowerTop, w = 3.2, k = 1;
    const H = drumTop - lowerTop;
    const ol = lancetOutline(w, y0, sy, k, 18);
    g.stone.push(extrude(shape([V2(-wD / 2, 0), V2(wD / 2, 0), V2(wD / 2, H), V2(-wD / 2, H)], [ol]), 1.0, 0));
    const t = tracery(w, y0, sy, k, { lights: 2, oculus: true, transom: 41.2 - lowerTop, recess: 0.3 });
    g.carve.push(...t.carve); g.glass.push(...t.glass);
    // splayed jamb orders
    for (const sx of [-1, 1]) for (let o = 0; o < 2; o++) g.carve.push(tr(prism(8, 0.09, 0.09, y0, sy), M(sx * (w / 2 + 0.1 + o * 0.2), 0, 0.05 + o * 0.1)));
    g.carve.push(moulding(-w / 2 - 0.3, w / 2 + 0.3, y0 - 0.14, [[-0.12, 0], [-0.1, 0.12], [0, 0.2], [0.06, 0.16], [0.08, 0]]));
    const wg = wimperg(4.3, 4.6, 0.26, { biteW: w + 0.5, biteSpring: 0, biteK: (w + 0.25) / (w + 0.5), crockets: 5, cs: 0.26, finialH: 1.1 });
    g.carve.push(...wg.carve.map(x => tr(x, M(0, sy, 0.3))));
    // blind tracery panels beside the window
    for (const sx of [-1, 1]) {
      g.carve.push(tr(extrude(shape(lancetOutline(0.55, 0, 4.5, 1, 8), [lancetOutline(0.38, 0.1, 4.4, 1, 8, 0, 0.06)]), 0.07, 0.07), M(sx * 2.15, y0 + 0.8, 0)));
    }
    // corbel table, cornice, pierced parapet
    g.carve.push(...corbelTable(wD, H - 0.6, 0.35));
    g.carve.push(moulding(-wD / 2, wD / 2, H - 0.15, [[0, 0], [0, 0.35], [0.15, 0.5], [0.4, 0.55], [0.5, 0.3], [0.5, 0]]));
    g.carve.push(...parapetPanel(wD, 1.2, 0.28, 6).carve.map(x => tr(x, M(0, H + 0.35, 0.15))));
    g.carve.push(moulding(-wD / 2, wD / 2, 0, [[0, 0], [0, 0.25], [0.2, 0.3], [0.35, 0]]));
    return g;
  });

  // ---- buttress at each corner of the drum, ending in a large pinnacle
  kit.def('dome_buttress', () => {
    const g = { stone: [], carve: [] };
    const H = drumTop - lowerTop;
    // stepped buttress projecting radially (+z local)
    g.stone.push(boxMin(-0.55, 0, -0.8, 1.1, H * 0.45, 2.4));
    g.stone.push(boxMin(-0.5, H * 0.45, -0.8, 1.0, H * 0.35, 2.0));
    g.stone.push(boxMin(-0.45, H * 0.8, -0.8, 0.9, H * 0.2 + 2.0, 1.6));
    for (const [y, a] of [[H * 0.45, 1.45], [H * 0.8, 1.05]]) g.carve.push(tr(box(1.1, 0.25, 0.6), M(0, y - 0.05, a, 0, 1, 1, 1, -0.6)));
    // statue niche on the buttress face
    g.carve.push(tr(extrude(shape([V2(-0.45, 0), V2(0.45, 0), V2(0.45, 2.7), V2(-0.45, 2.7)], [lancetOutline(0.6, 0.1, 2.0, 1, 8, 0, 0.1)]), 0.06, 1.66), M(0, 3.5, 0)));
    // pinnacle above parapet
    pinnacle(1.05, 7.4).carve.forEach(x => g.carve.push(tr(x, M(0, H + 2.0, 0.0))));
    return g;
  });

  for (let k = 0; k < N; k++) {
    kit.put('dome_lower', faceM(k, apL, podium));
    kit.put('dome_face', faceM(k, apD, lowerTop), 0.15);
    kit.put('dome_buttress', cornerM(k, RD + 0.05, lowerTop));
  }
  // ledge between lower and upper drum, drum core, lower drum parapet
  kit.add('carve', prism(N, RL + 0.3, RL + 0.3, lowerTop - 0.05, lowerTop + 0.25));
  kit.add('dark', prism(N, RD - 0.9, RD - 0.9, podium, base + 0.5));
  for (let k = 0; k < N; k++) {
    kit.add('carve', parapetPanel(wL * 0.98, 0.8, 0.22, 5).carve[0], faceM(k, apL + 0.15, lowerTop + 0.25));
  }

  // ---- dome shell: 16 tiled facets with explicit slope UVs
  const steps = 40;
  const pos = [], uv = [];
  const ys = [];
  for (let j = 0; j <= steps; j++) ys.push(base + (top - base) * (j / steps));
  for (let k = 0; k < N; k++) {
    const a0 = Math.PI / N + ((k - 1) / N) * Math.PI * 2, a1 = a0 + (Math.PI * 2) / N;
    let arc = 0;
    for (let j = 0; j < steps; j++) {
      const yA = ys[j], yB = ys[j + 1];
      const rA = profileR(yA), rB = profileR(yB);
      const segL = Math.hypot(rA - rB, yB - yA);
      const pA0 = [Math.sin(a0) * rA, yA, Math.cos(a0) * rA], pA1 = [Math.sin(a1) * rA, yA, Math.cos(a1) * rA];
      const pB0 = [Math.sin(a0) * rB, yB, Math.cos(a0) * rB], pB1 = [Math.sin(a1) * rB, yB, Math.cos(a1) * rB];
      const hwA = rA * Math.sin(Math.PI / N), hwB = rB * Math.sin(Math.PI / N);
      pos.push(...pA0, ...pA1, ...pB1, ...pA0, ...pB1, ...pB0);
      uv.push(-hwA, arc, hwA, arc, hwB, arc + segL, -hwA, arc, hwB, arc + segL, -hwB, arc + segL);
      arc += segL;
    }
  }
  const shell = new THREE.BufferGeometry();
  shell.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  shell.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  // analytic normals: flat across each facet, smooth along the ogival profile
  const nrm = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2];
    const tri = Math.floor(i / 9), facet = Math.floor(tri / (steps * 2));
    const ac = (facet / N) * Math.PI * 2;
    const dr = profileR(y + 0.05) - profileR(y - 0.05);
    let nr = 0.1, ny = -dr; const l = Math.hypot(nr, ny); nr /= l; ny /= l;
    nrm[i] = Math.sin(ac) * nr; nrm[i + 1] = ny; nrm[i + 2] = Math.cos(ac) * nr;
  }
  shell.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  kit.add('domeRoof', shell);

  // ---- ribs with crockets
  for (let k = 0; k < N; k++) {
    const a = Math.PI / N + (k / N) * Math.PI * 2;
    const path = [];
    for (let j = 0; j <= steps; j++) path.push([profileR(ys[j]), ys[j]]);
    // rib cross-section 0.75 wide, 0.4 proud; built as quads along the path
    const rp = [], hw = 0.38;
    for (let j = 0; j < steps; j++) {
      const [r0, y0] = path[j], [r1, y1] = path[j + 1];
      const nx = (y1 - y0), ny = -(r1 - r0); const l = Math.hypot(nx, ny); // outward normal in (r,y)
      const o0 = [r0 + nx / l * 0.42, y0 + ny / l * 0.42], o1 = [r1 + nx / l * 0.42, y1 + ny / l * 0.42];
      const P = (r, y, s) => { const tx = Math.cos(a) * s, tz = -Math.sin(a) * s; return [Math.sin(a) * r + tx, y, Math.cos(a) * r + tz]; };
      const q = (A, B, C, D) => rp.push(...A, ...B, ...C, ...A, ...C, ...D);
      const iA = P(r0 - 0.1, y0, -hw), iB = P(r0 - 0.1, y0, hw), oA = P(o0[0], o0[1], -hw * 0.75), oB = P(o0[0], o0[1], hw * 0.75);
      const iA2 = P(r1 - 0.1, y1, -hw), iB2 = P(r1 - 0.1, y1, hw), oA2 = P(o1[0], o1[1], -hw * 0.75), oB2 = P(o1[0], o1[1], hw * 0.75);
      q(oA, oB, oB2, oA2); q(iA, oA, oA2, iA2); q(oB, iB, iB2, oB2);
      // crocket every 3 segments
      if (j % 3 === 1 && j < steps - 2) {
        const dir = Math.atan2(r1 - r0, y1 - y0);
        for (const c of crocket(0.42)) kit.add('carve', c, M(Math.sin(a) * (o0[0] + 0.05), o0[1], Math.cos(a) * (o0[0] + 0.05), a, 1, 1, 1, dir * 0.5 - 0.4));
      }
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    kit.add('carve', clean(rg));
  }
  // dome base: cornice ring at the springing
  kit.add('carve', prism(N, R0 + 0.6, R0 + 0.3, base - 0.3, base + 0.5));

  // ---- lucarnes in three rows
  if (!kit.has('lucarneA')) kit.def('lucarneA', () => dormer(1.6));
  if (!kit.has('lucarneB')) kit.def('lucarneB', () => {
    const g = { stone: [], glass: [], roof: [], carve: [] };
    // round oculus lucarne with a little hood roof
    g.stone.push(extrude(shape(circlePts(0, 0.75, 0.75, 20), [circlePts(0, 0.75, 0.45, 20)]), 0.25, 0.1));
    g.carve.push(extrude(shape(foilPts(0, 0.75, 0.46, 4, 32), [foilPts(0, 0.75, 0.3, 4, 32)]), 0.08, 0.0));
    g.glass.push(flat(shape(circlePts(0, 0.75, 0.46, 20)), -0.1));
    g.roof.push(tr(clean(new THREE.CylinderGeometry(0.85, 0.85, 1.8, 14, 1, false, -Math.PI / 2, Math.PI)), M(0, 0.75, -0.8, 0, 1, 1, 1, Math.PI / 2)));
    g.carve.push(...finial(0.45).carve.map(x => tr(x, M(0, 1.55, 0.05))));
    return g;
  });
  const placeOnShell = (name, y, count, phase, scale = 1) => {
    for (let i = 0; i < count; i++) {
      const a = phase + (i / count) * Math.PI * 2;
      const r = profileR(y) * Math.cos(Math.PI / N) - 0.15;
      kit.put(name, M(Math.sin(a) * r, y, Math.cos(a) * r, a, scale, scale, scale), 0.3);
    }
  };
  placeOnShell('lucarneA', 57.2, 16, 0, 1.0);
  placeOnShell('lucarneB', 65.5, 16, 0, 0.95);
  placeOnShell('lucarneB', 72.6, 8, Math.PI / 8, 0.7);

  // ---- lantern
  const ly = top;
  kit.add('carve', lathe([[Rtop + 0.6, ly - 0.3], [Rtop + 0.9, ly + 0.2], [Rtop + 0.9, ly + 0.9], [0.01, ly + 0.9]], 16, { phase: Math.PI / 16 }));
  const RLn = 3.4, LH = 5.4, l0 = ly + 0.9;
  const apLn = RLn * Math.cos(Math.PI / 8), wLn = 2 * RLn * Math.sin(Math.PI / 8);
  kit.add('dark', prism(8, 1.6, 1.6, l0, l0 + LH));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const m = M(Math.sin(a) * apLn, l0, Math.cos(a) * apLn, a);
    const ol = lancetOutline(wLn * 0.66, 0.2, LH * 0.62, 1, 10);
    kit.add('stone', extrude(shape([V2(-wLn / 2, 0), V2(wLn / 2, 0), V2(wLn / 2, LH), V2(-wLn / 2, LH)], [ol]), 0.35, 0), m);
    kit.add('carve', extrude(shape(ol, [lancetOutline(wLn * 0.5, 0.25, LH * 0.62, 1, 10, 0, 0.15)]), 0.08, -0.05), m);
    const wg = wimperg(wLn * 0.95, 2.1, 0.14, { crockets: 3, cs: 0.16, finialH: 0.5, blind: false });
    wg.carve.forEach(x => kit.add('carve', x, m.clone().multiply(M(0, LH * 0.62 + 0.9, 0.15))));
    const ca = a + Math.PI / 8;
    pinnacle(0.42, 2.6).carve.forEach(x => kit.add('carve', x, M(Math.sin(ca) * (RLn + 0.15), l0 + LH - 0.6, Math.cos(ca) * (RLn + 0.15))));
    kit.add('carve', prism(6, 0.13, 0.13, l0, l0 + LH - 0.6), M(Math.sin(ca) * (RLn + 0.15), 0, Math.cos(ca) * (RLn + 0.15)));
  }
  kit.add('carve', prism(8, RLn + 0.3, RLn + 0.2, l0 + LH, l0 + LH + 0.5));
  const sy0 = l0 + LH + 0.5;
  const spireH = 96 - 1.0 - sy0;
  const sp = crocketedSpire(8, RLn * 0.86, sy0, spireH, 6, 0.32);
  sp.carve.forEach(x => kit.add('carve', x));
  // eight small gabled lucarnes on the spire base
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const r = RLn * 0.86 * Math.cos(Math.PI / 8) * 0.82;
    wimperg(0.9, 1.3, 0.1, { crockets: 1, cs: 0.1, finialH: 0.3, blind: true }).carve.forEach(x => kit.add('carve', x, M(Math.sin(a) * r, sy0 + 0.6, Math.cos(a) * r, a)));
  }
  finial(1.4, true).gold.forEach(x => kit.add('gold', x, M(0, 96 - 1.35, 0)));
  // gilded orb ring at spire base
  kit.add('gold', prism(16, RLn * 0.9, RLn * 0.9, sy0 - 0.08, sy0 + 0.08));
}
