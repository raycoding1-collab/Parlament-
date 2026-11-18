// The dome, fitted to the measured silhouette of the long-lens Danube photograph
// (ref/SPEC.md): 16-sided drum Ø ≈ 28 m with tracery windows (30.4–41.5 m),
// quatrefoil oculi (44.2–47.0), a small-arch gallery (48.5–50.9) and balustrade
// (52.4); buttress pinnacles round the shell; maroon slate shell 53.6 → 72.6 m
// with 16 dark ribs; lantern 72.6 → 77.7; spire to 96.0 m.
import * as THREE from 'three';
import { M, tr, box, boxMin, prism, pyramid, lathe, blob, extrude, flat, shape, lancetOutline, archPts, foilPts, circlePts, moulding, clean } from '../geo/util.js';
import { tracery } from './modules.js';
import { pinnacle, wimperg, finial, parapetPanel, corbelTable, crocket } from './ornament.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
const rect = (x0, y0, x1, y1) => [V2(x0, y0), V2(x1, y0), V2(x1, y1), V2(x0, y1)];
const N = 16;
export const DOME2 = { cz: 7.8, base: 27.4, lower: 29.4, R: 14.2, top: 52.4 };

/** Measured shell profile [y, circumradius]. */
const PROFILE = [
  [53.6, 11.75], [56.0, 11.82], [58.0, 11.78], [59.0, 11.68], [60.6, 11.21], [62.1, 10.55], [63.7, 9.74],
  [65.3, 8.68], [66.8, 7.44], [68.4, 6.05], [69.9, 4.45], [71.0, 3.35], [72.0, 2.62], [72.6, 2.35],
];
function shellR(y) {
  if (y <= PROFILE[0][0]) return PROFILE[0][1];
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [y0, r0] = PROFILE[i], [y1, r1] = PROFILE[i + 1];
    if (y <= y1) { const t = (y - y0) / (y1 - y0); const s = t * t * (3 - 2 * t); return r0 + (r1 - r0) * (0.5 * t + 0.5 * s); }
  }
  return PROFILE[PROFILE.length - 1][1];
}

export function buildDome2(kit) {
  const { cz, base, lower, R, top } = DOME2;
  const ap = R * Math.cos(Math.PI / N), fw = 2 * R * Math.sin(Math.PI / N);
  const at = (m) => M(0, 0, cz).multiply(m);
  const faceM = (k, d, y = 0) => { const a = (k / N) * Math.PI * 2; return at(M(Math.sin(a) * d, y, Math.cos(a) * d, a)); };
  const cornerM = (k, d, y = 0) => { const a = Math.PI / N + (k / N) * Math.PI * 2; return at(M(Math.sin(a) * d, y, Math.cos(a) * d, a)); };

  // ---- lower drum (mostly hidden by the roofs)
  kit.add('stone', prism(N, R + 0.6, R + 0.6, base, lower), at(M()));
  kit.add('carve', prism(N, R + 0.9, R + 0.8, lower - 0.3, lower + 0.1), at(M()));

  // ---- upper drum face
  kit.def('D2_face', () => {
    const g = { stone: [], carve: [], glass: [], dark: [] };
    const w = 2.6, y0 = 30.4, sy = 39.6, k = 0.85; // S3: lights run down to just above the risalit gables
    const ol = lancetOutline(w, y0, sy, k, 16);
    const oc = circlePts(0, 45.6, 1.4, 28);
    const gal = [-1, 0, 1].map(i => { const pts = [V2(i * 1.25 - 0.42, 48.5)]; for (let s = 0; s <= 8; s++) { const a = Math.PI - s / 8 * Math.PI; pts.push(V2(i * 1.25 + Math.cos(a) * 0.42, 50.48 + Math.sin(a) * 0.42)); } pts.push(V2(i * 1.25 + 0.42, 48.5)); return pts; });
    g.stone.push(extrude(shape(rect(-fw / 2, lower, fw / 2, top - 1.4), [ol, oc, ...gal]), 1.0, 0));
    const t = tracery(w, y0, sy, k, { lights: 2, oculus: true, transom: 35.0, recess: 0.3 });
    g.carve.push(...t.carve); g.glass.push(...t.glass);
    for (const s of [-1, 1]) g.carve.push(tr(prism(8, 0.1, 0.1, y0, sy), M(s * (w / 2 + 0.12), 0, 0.06)));
    // eight-petalled rose (S3 close-up): plate with eight lobes, small hub
    const petals = Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return circlePts(Math.cos(a) * 0.86, 45.6 + Math.sin(a) * 0.86, 0.34, 16).reverse(); });
    g.carve.push(extrude(shape(oc, [...petals, circlePts(0, 45.6, 0.36, 16).reverse()]), 0.14, -0.15));
    g.carve.push(extrude(shape(circlePts(0, 45.6, 0.24, 12)), 0.2, -0.05));
    g.carve.push(extrude(shape(circlePts(0, 45.6, 1.62, 28), [oc]), 0.12, 0.1));
    g.glass.push(flat(shape(oc), -0.4));
    gal.forEach(p => g.dark.push(flat(shape(p), -0.45)));
    wimperg(3.3, 3.0, 0.2, { crockets: 3, cs: 0.22, finialH: 0.7, biteW: w + 0.3, biteSpring: 0, biteK: (k * w + 0.15) / (w + 0.3) }).carve.forEach(x => g.carve.push(tr(x, M(0, sy, 0.25))));
    g.carve.push(moulding(-fw / 2, fw / 2, 47.7, [[0, 0], [0.05, 0.16], [0.15, 0.2], [0.26, 0]]));
    g.carve.push(...corbelTable(fw, top - 1.4, 0.3));
    g.carve.push(moulding(-fw / 2, fw / 2, top - 0.95, [[0, 0], [0, 0.3], [0.15, 0.45], [0.4, 0.5], [0.45, 0]]));
    g.carve.push(...parapetPanel(fw, 1.0, 0.24, 4, 16).carve.map(x => tr(x, M(0, top - 0.5, 0.15))));
    return g;
  });
  // ---- buttress with its tall pinnacle (the white ring round the shell)
  kit.def('D2_butt', () => {
    const g = { stone: [], carve: [] };
    const H = top - lower;
    g.stone.push(boxMin(-0.4, lower, -0.6, 0.8, H * 0.55, 2.0));
    g.stone.push(boxMin(-0.36, lower + H * 0.55, -0.6, 0.72, H * 0.45 + 0.8, 1.5));
    g.carve.push(tr(box(0.85, 0.22, 0.55), M(0, lower + H * 0.55, 1.4, 0, 1, 1, 1, -0.6)));
    pinnacle(0.78, 57.2 - top - 0.8).carve.forEach(x => g.carve.push(tr(x, M(0, top + 0.8, 0.4))));
    return g;
  });
  for (let k = 0; k < N; k++) {
    kit.put('D2_face', faceM(k, ap), 0.12);
    kit.put('D2_butt', cornerM(k, R + 0.1));
  }
  kit.add('dark', prism(N, R - 1.2, R - 1.2, lower, top + 1.4), at(M()));

  // ---- shell: 16 slate facets with slope UVs, analytic normals
  const steps = 36, y0 = 53.4, y1 = 72.6;
  const pos = [], uv = [], nrm = [];
  for (let k = 0; k < N; k++) {
    const a0 = Math.PI / N + ((k - 1) / N) * Math.PI * 2, a1 = a0 + Math.PI * 2 / N, ac = (a0 + a1) / 2;
    let arc = 0;
    for (let j = 0; j < steps; j++) {
      const ya = y0 + (y1 - y0) * j / steps, yb = y0 + (y1 - y0) * (j + 1) / steps;
      const ra = shellR(ya), rb = shellR(yb);
      const seg = Math.hypot(ra - rb, yb - ya);
      const A0 = [Math.sin(a0) * ra, ya, Math.cos(a0) * ra], A1 = [Math.sin(a1) * ra, ya, Math.cos(a1) * ra];
      const B0 = [Math.sin(a0) * rb, yb, Math.cos(a0) * rb], B1 = [Math.sin(a1) * rb, yb, Math.cos(a1) * rb];
      const ha = ra * Math.sin(Math.PI / N), hb = rb * Math.sin(Math.PI / N);
      pos.push(...A0, ...A1, ...B1, ...A0, ...B1, ...B0);
      uv.push(-ha, arc, ha, arc, hb, arc + seg, -ha, arc, hb, arc + seg, -hb, arc + seg);
      for (const yy of [ya, ya, yb, ya, yb, yb]) {
        const dr = shellR(yy + 0.05) - shellR(yy - 0.05);
        let nr = 0.1, ny = -dr; const l = Math.hypot(nr, ny); nr /= l; ny /= l;
        nrm.push(Math.sin(ac) * nr, ny, Math.cos(ac) * nr);
      }
      arc += seg;
    }
  }
  const shell = new THREE.BufferGeometry();
  shell.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  shell.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  shell.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  kit.add('domeRoof', shell, at(M()));
  kit.add('carve', prism(N, 12.6, 12.3, 53.0, 53.8), at(M()));

  // ---- 16 dark ribs (lead-covered) following the profile
  for (let k = 0; k < N; k++) {
    const a = Math.PI / N + (k / N) * Math.PI * 2;
    const rp = [];
    const P = (r, y, s) => [Math.sin(a) * r + Math.cos(a) * s, y, Math.cos(a) * r - Math.sin(a) * s];
    const q = (A, B, C, D) => rp.push(...A, ...B, ...C, ...A, ...C, ...D);
    for (let j = 0; j < steps; j++) {
      const ya = y0 + (y1 - y0) * j / steps, yb = y0 + (y1 - y0) * (j + 1) / steps;
      const ra = shellR(ya), rb = shellR(yb), hw = 0.32, o = 0.28;
      q(P(ra + o, ya, -hw), P(ra + o, ya, hw), P(rb + o, yb, hw), P(rb + o, yb, -hw));
      q(P(ra - 0.05, ya, -hw), P(ra + o, ya, -hw), P(rb + o, yb, -hw), P(rb - 0.05, yb, -hw));
      q(P(ra + o, ya, hw), P(ra - 0.05, ya, hw), P(rb - 0.05, yb, hw), P(rb + o, yb, hw));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    kit.add('lead', clean(g), at(M()));
  }

  // ---- crown of small pinnacles round the top, lantern and spire (dark metal)
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    pinnacle(0.45, 2.4, { lite: true }).carve.forEach(x => kit.add('carve', x, at(M(Math.sin(a) * 3.0, 71.0, Math.cos(a) * 3.0))));
  }
  kit.add('lead', lathe([[2.6, 72.5], [2.3, 73.0], [2.05, 73.4], [2.05, 75.2], [2.35, 75.4], [2.35, 75.7], [1.35, 75.9], [1.25, 77.4], [1.55, 77.7], [1.1, 78.2], [0.01, 78.25]], 16, { flatShade: false }), at(M()));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    kit.add('dark', flat(shape(lancetOutline(0.55, 73.6, 74.6, 1, 6))), at(M(Math.sin(a) * 2.07, 0, Math.cos(a) * 2.07, a)));
  }
  // spire: octagonal needle with two knobs, crockets, gilded orb and cross
  kit.add('lead', prism(8, 1.05, 0.06, 78.0, 94.6), at(M()));
  for (const [y, r] of [[82.0, 0.75], [86.6, 0.55]]) kit.add('lead', lathe([[0.01, y - 0.5], [r, y - 0.15], [r, y + 0.15], [0.01, y + 0.5]], 12, { flatShade: false }), at(M()));
  for (let e = 0; e < 8; e++) {
    const a = Math.PI / 8 + (e / 8) * Math.PI * 2;
    for (let k = 1; k < 9; k++) { const t = k / 9, rr = 1.05 * (1 - t) + 0.04; for (const c of crocket(0.2 * (1 - 0.5 * t))) kit.add('lead', c, at(M(Math.sin(a) * rr, 78 + 16.6 * t, Math.cos(a) * rr, a))); }
  }
  kit.add('gold', clean(new THREE.SphereGeometry(0.32, 14, 10), { smooth: true }), at(M(0, 94.8, 0)));
  kit.add('gold', box(0.1, 1.1, 0.1, 0, 95.5, 0), at(M()));
  kit.add('gold', box(0.55, 0.1, 0.1, 0, 95.7, 0), at(M()));
}
