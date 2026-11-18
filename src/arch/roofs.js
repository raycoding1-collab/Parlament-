// Steep neo-Gothic roofs: gabled and hipped roofs with true slope UVs, ornamental
// ridge cresting, crocketed hip finials and gabled stone dormers.
import * as THREE from 'three';
import { M, tr, box, boxMin, prism, pyramid, lathe, extrude, flat, shape, lancetOutline, archPts, clean, planarUV } from '../geo/util.js';
import { finial, cresting, crocket } from './ornament.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/** Build outward-facing triangles from convex polygons, oriented away from `inside`. */
function polys(list, inside) {
  const pos = [];
  const c = inside;
  for (const poly of list) {
    for (let i = 1; i < poly.length - 1; i++) {
      let a = poly[0], b = poly[i], d = poly[i + 1];
      const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a));
      const cen = new THREE.Vector3().add(a).add(b).add(d).multiplyScalar(1 / 3);
      if (n.dot(cen.sub(c)) < 0) { const t = b; b = d; d = t; }
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, d.x, d.y, d.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return planarUV(g);
}

/**
 * Roof over rectangle [x0,x1]×[z0,z1], eave at y, rise h, ridge along `axis`.
 * ends: [startType, endType] each 'hip' | 'gable' | 'none'.
 * Returns { roof: geo, stone: gable walls, ridge: [a,b] world points, slopes: info for dormers }.
 */
export function roof(x0, x1, z0, z1, y, h, axis = 'x', ends = ['hip', 'hip']) {
  // work in a frame where ridge runs along u (=x for axis x)
  const sw = axis === 'x' ? (u, v) => [u, v] : (u, v) => [v, u];
  const [u0, u1, v0, v1] = axis === 'x' ? [x0, x1, z0, z1] : [z0, z1, x0, x1];
  const vc = (v0 + v1) / 2, half = (v1 - v0) / 2;
  const ua = u0 + (ends[0] === 'hip' ? half : 0), ub = u1 - (ends[1] === 'hip' ? half : 0);
  const P = (u, yy, v) => { const [x, z] = sw(u, v); return V3(x, yy, z); };
  const inside = P((u0 + u1) / 2, y + h * 0.3, vc);
  const faces = [
    [P(u0, y, v1), P(u1, y, v1), P(ub, y + h, vc), P(ua, y + h, vc)],
    [P(u1, y, v0), P(u0, y, v0), P(ua, y + h, vc), P(ub, y + h, vc)],
  ];
  const gables = [];
  if (ends[0] === 'hip') faces.push([P(u0, y, v0), P(u0, y, v1), P(ua, y + h, vc)]);
  else if (ends[0] === 'gable') gables.push([P(u0, y, v0), P(u0, y, v1), P(u0, y + h, vc)]);
  if (ends[1] === 'hip') faces.push([P(u1, y, v1), P(u1, y, v0), P(ub, y + h, vc)]);
  else if (ends[1] === 'gable') gables.push([P(u1, y, v0), P(u1, y, v1), P(u1, y + h, vc)]);
  // underside so the roof is closed when seen from courtyards at grazing angles
  faces.push([P(u0, y, v0), P(u1, y, v0), P(u1, y, v1), P(u0, y, v1)]);
  const out = { roof: [polys(faces, inside)], stone: gables.length ? [polys(gables, inside)] : [] };
  out.ridge = [P(ua, y + h, vc), P(ub, y + h, vc)];
  out.frame = { axis, u0, u1, v0, v1, vc, half, y, h, ua, ub };
  return out;
}

/** Gabled dormer (local: front at z=0 facing +z, sill at y=0). */
export function dormer(w = 1.5, kind = 'lancet') {
  const g = { stone: [], carve: [], roof: [], glass: [] };
  const wh = 1.7, gh = 1.1, D = 2.6;
  const ol = lancetOutline(w * 0.5, 0.25, 1.05, 1, 8);
  const front = extrude(shape([V2(-w / 2, -0.4), V2(w / 2, -0.4), V2(w / 2, wh), V2(0, wh + gh), V2(-w / 2, wh)], [ol]), 0.18, 0.0);
  g.stone.push(front);
  g.glass.push(flat(shape(ol), -0.12));
  g.carve.push(tr(extrude(shape(lancetOutline(w * 0.62, 0.18, 1.05, 1, 8), [ol]), 0.08, 0.06), M(0, 0, 0)));
  // cheeks
  for (const s of [-1, 1]) g.stone.push(boxMin(s > 0 ? w / 2 - 0.12 : -w / 2, -0.4, -D, 0.12, wh + 0.4, D));
  // little roof
  const len = Math.hypot(w / 2 + 0.12, gh);
  const ang = Math.atan2(gh, w / 2 + 0.12);
  for (const s of [-1, 1]) g.roof.push(tr(box(len, 0.08, D + 0.15), M(s * (w / 4 + 0.03), wh + gh / 2 + 0.03, -D / 2 + 0.07, 0, 1, 1, 1, 0, -s * ang)));
  g.carve.push(...finial(0.55).carve.map(x => tr(x, M(0, wh + gh - 0.05, 0.05))));
  // coping on gable rakes
  for (const s of [-1, 1]) g.carve.push(tr(box(len, 0.09, 0.26), M(s * (w / 4), wh + gh / 2 + 0.02, 0.0, 0, 1, 1, 1, 0, -s * ang)));
  return g;
}

/** Populate a roof with cresting, end finials and dormers. */
export function dressRoof(kit, r, { dormers = true, dormerStep = 5.5, dormerAt = 0.28, crest = true, finials = true, dormerKind = 'D_std' } = {}) {
  const f = r.frame;
  const [a, b] = r.ridge;
  const len = a.distanceTo(b);
  const ry = f.axis === 'x' ? 0 : Math.PI / 2;
  if (crest && len > 1) {
    const n = Math.max(1, Math.round(len / 6));
    const seg = len / n;
    if (!kit.has('crest6')) kit.def('crest6', () => cresting(6.0, 0.75));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const p = a.clone().lerp(b, t);
      kit.put('crest6', M(p.x, p.y - 0.02, p.z, ry, seg / 6, 1, 1));
    }
  }
  if (finials) {
    if (!kit.has('roofFinial')) kit.def('roofFinial', () => {
      const g = finial(1.6, true);
      g.iron = [prism(8, 0.09, 0.07, -0.4, 0.7)];
      return g;
    });
    kit.put('roofFinial', M(a.x, a.y, a.z));
    if (len > 0.5) kit.put('roofFinial', M(b.x, b.y, b.z));
  }
  if (dormers) {
    if (!kit.has('D_std')) kit.def('D_std', () => dormer(1.5));
    const d0 = f.half * dormerAt;
    const yy = f.y + (d0 / f.half) * f.h - 0.15;
    const span0 = f.u0 + f.half + 1.5, span1 = f.u1 - f.half - 1.5;
    const L = span1 - span0;
    if (L > 2) {
      const n = Math.max(1, Math.floor(L / dormerStep));
      const st = L / n;
      for (let i = 0; i < n; i++) {
        const u = span0 + st * (i + 0.5);
        for (const s of [1, -1]) {
          const v = s > 0 ? f.v1 - d0 : f.v0 + d0;
          const [x, z] = f.axis === 'x' ? [u, v] : [v, u];
          const rot = f.axis === 'x' ? (s > 0 ? 0 : Math.PI) : (s > 0 ? Math.PI / 2 : -Math.PI / 2);
          kit.put(dormerKind, M(x, yy, z, rot));
        }
      }
    }
  }
}

/**
 * Truncated (hip or gable) roof as on the Országház: steep slate slopes rising to a
 * flat top sheathed in copper. inset = horizontal run of the slopes; ends: 'hip'|'gable'|'none'.
 * Returns { roof: slopes, copper: flat top, stone: gable-end walls, top: [corners] }.
 */
export function flatTopRoof(x0, x1, z0, z1, y, h, inset, axis = 'x', ends = ['hip', 'hip']) {
  const sw = axis === 'x' ? (u, v) => [u, v] : (u, v) => [v, u];
  const [u0, u1, v0, v1] = axis === 'x' ? [x0, x1, z0, z1] : [z0, z1, x0, x1];
  const s = Math.min(inset, (v1 - v0) / 2 - 0.05);
  const su0 = ends[0] === 'hip' ? s : 0, su1 = ends[1] === 'hip' ? s : 0;
  const P = (u, yy, v) => { const [x, z] = sw(u, v); return V3(x, yy, z); };
  const T = [P(u0 + su0, y + h, v0 + s), P(u1 - su1, y + h, v0 + s), P(u1 - su1, y + h, v1 - s), P(u0 + su0, y + h, v1 - s)];
  const B = [P(u0, y, v0), P(u1, y, v0), P(u1, y, v1), P(u0, y, v1)];
  const inside = P((u0 + u1) / 2, y + h * 0.4, (v0 + v1) / 2);
  const slopes = [[B[0], B[1], T[1], T[0]], [B[2], B[3], T[3], T[2]]];
  const gables = [];
  if (ends[0] === 'hip') slopes.push([B[3], B[0], T[0], T[3]]); else if (ends[0] === 'gable') gables.push([B[3], B[0], T[0], T[3]]);
  if (ends[1] === 'hip') slopes.push([B[1], B[2], T[2], T[1]]); else if (ends[1] === 'gable') gables.push([B[1], B[2], T[2], T[1]]);
  slopes.push([B[0], B[1], B[2], B[3]]);
  return {
    roof: [polys(slopes, inside)],
    copper: [polys([T], P((u0 + u1) / 2, y, (v0 + v1) / 2))],
    stone: gables.length ? [polys(gables, inside)] : [],
    top: T, frame: { axis, u0, u1, v0, v1, y, h, s, su0, su1 },
  };
}

/** Stone gable dormer of the river roofs: crocketed stone front, slate saddle roof (front at z=0). */
export function gableDormer(w = 2.0, h = 3.2) {
  const g = { stone: [], carve: [], roof: [], dark: [] };
  const wh = h * 0.42, D = 3.0;
  const ol = lancetOutline(w * 0.34, 0.25, wh - 0.1, 1, 8);
  g.stone.push(extrude(shape([V2(-w / 2, -0.6), V2(w / 2, -0.6), V2(w / 2, wh), V2(0, h), V2(-w / 2, wh)], [ol]), 0.22, 0.0));
  g.dark.push(flat(shape(ol), -0.16));
  const len = Math.hypot(w / 2, h - wh), ang = Math.atan2(h - wh, w / 2);
  for (const s of [-1, 1]) {
    g.roof.push(tr(box(len + 0.1, 0.1, D), M(s * w / 4, (wh + h) / 2 - 0.02, -D / 2, 0, 1, 1, 1, 0, -s * ang)));
    g.carve.push(tr(box(len, 0.12, 0.3), M(s * w / 4, (wh + h) / 2 + 0.05, 0.02, 0, 1, 1, 1, 0, -s * ang)));
    for (let k = 1; k <= 3; k++) for (const c of crocket(0.2)) g.carve.push(tr(c, M(s * (w / 2) * (1 - k / 4), wh + (h - wh) * k / 4 + 0.12, 0.05, 0, 1, 1, 1, -1.2)));
    g.stone.push(boxMin(s > 0 ? w / 2 - 0.15 : -w / 2, -0.6, -D, 0.15, wh + 0.6, D));
  }
  g.carve.push(...finial(0.7).carve.map(x => tr(x, M(0, h - 0.05, 0.02))));
  return g;
}

/** Brick-and-stone chimney stack on the roof tops. */
export function chimney(w = 1.0, d = 2.2, h = 2.4) {
  return { stone: [boxMin(-w / 2, 0, -d / 2, w, h, d)], carve: [boxMin(-w / 2 - 0.08, h, -d / 2 - 0.08, w + 0.16, 0.18, d + 0.16), boxMin(-w / 2 - 0.12, h * 0.6, -d / 2 - 0.12, w + 0.24, 0.12, d + 0.24)] };
}

/** Big slate-faced dormer gable of the river roofs (S3 close-up): dark slate face, stone copings,
 *  a small lancet light and finial; front at z = 0, base y = 0. */
export function slateDormer(w = 3.8, h = 5.0) {
  const g = { roof: [], carve: [], dark: [], stone: [] };
  const D = 4.5;
  const ol = lancetOutline(0.7, 0.6, 1.9, 1, 8);
  g.roof.push(extrude(shape([V2(-w / 2, -0.8), V2(w / 2, -0.8), V2(w / 2, 0.2), V2(0, h), V2(-w / 2, 0.2)], [ol]), 0.14, 0.0));
  g.dark.push(flat(shape(ol), -0.1));
  g.carve.push(extrude(shape(lancetOutline(0.95, 0.5, 1.9, 1, 8), [ol]), 0.1, 0.06));
  const len = Math.hypot(w / 2, h - 0.2), ang = Math.atan2(h - 0.2, w / 2);
  for (const s of [-1, 1]) {
    g.roof.push(tr(box(len + 0.2, 0.1, D), M(s * w / 4, (h + 0.2) / 2, -D / 2, 0, 1, 1, 1, 0, -s * ang)));
    g.carve.push(tr(box(len + 0.1, 0.14, 0.24), M(s * w / 4, (h + 0.2) / 2 + 0.06, 0.04, 0, 1, 1, 1, 0, -s * ang)));
    g.roof.push(boxMin(s > 0 ? w / 2 - 0.12 : -w / 2, -0.8, -D, 0.12, 1.0, D));
  }
  g.carve.push(...finial(0.8).carve.map(x => tr(x, M(0, h - 0.05, 0.04))));
  return g;
}
