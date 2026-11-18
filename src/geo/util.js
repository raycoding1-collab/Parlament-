// Geometry toolkit: every architectural element in the model is built from these
// primitives (pointed arches, cusped tracery, swept mouldings, polygonal lathes).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export { THREE, mergeGeometries };
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Matrix from translation, Y rotation (and optional X/Z rotation) and scale. */
export function M(x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

/** Per-triangle planar UV in metres: U runs horizontally along the face, V up the face. */
export function planarUV(g) {
  const pos = g.attributes.position;
  const n = pos.count;
  const uv = new Float32Array(n * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nn = new THREE.Vector3();
  const U = new THREE.Vector3(), V = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    e1.subVectors(b, a); e2.subVectors(c, a); nn.crossVectors(e1, e2);
    if (nn.lengthSq() < 1e-14) nn.set(0, 0, 1); nn.normalize();
    if (Math.abs(nn.y) > 0.9) { U.set(1, 0, 0); V.set(0, 0, nn.y > 0 ? -1 : 1); }
    else { U.crossVectors(up, nn).normalize(); V.crossVectors(nn, U).normalize(); }
    for (let k = 0; k < 3; k++) {
      const p = k === 0 ? a : k === 1 ? b : c;
      uv[(i + k) * 2] = p.dot(U); uv[(i + k) * 2 + 1] = p.dot(V);
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Normalise a geometry for merging: non-indexed, position/normal/uv only. */
export function clean(g, { uv = 'planar', smooth = false } = {}) {
  if (smooth && g.index) g.computeVertexNormals();
  if (g.index) g = g.toNonIndexed();
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
  g.morphAttributes = {};
  if (!g.attributes.normal || (!smooth && uv === 'planar')) g.computeVertexNormals();
  if (uv === 'planar' || !g.attributes.uv) planarUV(g);
  g.clearGroups();
  return g;
}

/** Merge a list of geometries (already cleaned) into one. */
export function merge(list) {
  const l = list.filter(Boolean);
  if (!l.length) return null;
  if (l.length === 1) return l[0];
  return mergeGeometries(l, false);
}

export function tr(g, m) { g.applyMatrix4(m); return g; }

export function box(w, h, d, x = 0, y = 0, z = 0) {
  return tr(clean(new THREE.BoxGeometry(w, h, d)), M(x, y, z));
}
/** Box given by min corner + size. */
export function boxMin(x0, y0, z0, w, h, d) { return box(w, h, d, x0 + w / 2, y0 + h / 2, z0 + d / 2); }

// ---------------------------------------------------------------- arches
/**
 * Pointed (two-centred) arch from (x0-w/2, sy) over the apex to (x0+w/2, sy).
 * k = radius / span: 0.5 round, 1.0 equilateral, >1 lancet.
 */
export function archPts(w, sy, k = 1, seg = 10, x0 = 0) {
  const r = k * w;
  const cxL = x0 - w / 2 + r;
  const aApex = Math.acos(THREE.MathUtils.clamp((x0 - cxL) / r, -1, 1));
  const left = [];
  for (let i = 0; i <= seg; i++) {
    const a = Math.PI - (Math.PI - aApex) * (i / seg);
    left.push(new THREE.Vector2(cxL + r * Math.cos(a), sy + r * Math.sin(a)));
  }
  const right = left.slice(0, -1).reverse().map(p => new THREE.Vector2(2 * x0 - p.x, p.y));
  return left.concat(right);
}
export function archRise(w, k) { const r = k * w; return Math.sqrt(Math.max(0, r * r - (r - w / 2) * (r - w / 2))); }

/** Cusped (foiled) arch head: pulls the arch inward at cusp points to form lobes. */
export function cuspedArchPts(w, sy, k, lobes = 3, depth = 0.12, seg = 24, x0 = 0) {
  const pts = archPts(w, sy, k, seg, x0);
  const n = pts.length - 1;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const p = pts[i];
    let d = 0;
    if (s > 0.08 && s < 0.92) {
      const v = 1 - Math.abs(Math.sin(Math.PI * lobes * s));
      d = depth * Math.pow(v, 4);
    }
    // inward direction: towards the arch centre line
    const cx = x0, cy = sy;
    const dir = new THREE.Vector2(cx - p.x, (cy + archRise(w, k) * 0.35) - p.y).normalize();
    out.push(new THREE.Vector2(p.x + dir.x * d, p.y + dir.y * d));
  }
  return out;
}

/** Closed outline of a pointed opening: jambs from y0, arch springing at sy. */
export function lancetOutline(w, y0, sy, k = 1, seg = 10, x0 = 0, cusp = 0, lobes = 3) {
  const head = cusp > 0 ? cuspedArchPts(w, sy, k, lobes, cusp, Math.max(seg, 16), x0) : archPts(w, sy, k, seg, x0);
  const pts = [new THREE.Vector2(x0 - w / 2, y0), ...head, new THREE.Vector2(x0 + w / 2, y0)];
  return pts;
}

/** Foil outline (quatrefoil, trefoil…) as union of n circles. */
export function foilPts(cx, cy, R, n = 4, seg = 64, rot = Math.PI / 4) {
  const rc = R * 0.52, d = R - rc;
  const pts = [];
  for (let i = 0; i < seg; i++) {
    const t = (i / seg) * Math.PI * 2;
    const dx = Math.cos(t), dy = Math.sin(t);
    let best = 0;
    for (let j = 0; j < n; j++) {
      const a = rot + (j / n) * Math.PI * 2;
      const ox = Math.cos(a) * d, oy = Math.sin(a) * d;
      // ray from centre intersect circle centred at (ox,oy) radius rc
      const b = dx * ox + dy * oy;
      const c = ox * ox + oy * oy - rc * rc;
      const disc = b * b - c;
      if (disc >= 0) best = Math.max(best, b + Math.sqrt(disc));
    }
    pts.push(new THREE.Vector2(cx + dx * best, cy + dy * best));
  }
  return pts;
}
export function circlePts(cx, cy, r, seg = 24) {
  const pts = [];
  for (let i = 0; i < seg; i++) { const t = (i / seg) * Math.PI * 2; pts.push(new THREE.Vector2(cx + Math.cos(t) * r, cy + Math.sin(t) * r)); }
  return pts;
}

export function shape(outline, holes = []) {
  const s = new THREE.Shape(outline);
  for (const h of holes) s.holes.push(new THREE.Path(h));
  return s;
}

/** Extrude a 2D shape (in XY) by depth; front face at z=front, extending backwards. */
export function extrude(sh, depth, front = 0) {
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 8, steps: 1 });
  g.translate(0, 0, front - depth);
  return clean(g);
}
export function flat(sh, z = 0) {
  const g = new THREE.ShapeGeometry(sh, 8);
  g.translate(0, 0, z);
  return clean(g);
}

// ---------------------------------------------------------------- sweeps
/**
 * Sweep a 2D profile along a path in the XY plane (the wall plane).
 * profile: [[u, v]] where u = offset along path normal (outward from arch centre), v = z (out of wall).
 */
export function sweepXY(path, profile, closed = false) {
  const n = path.length;
  const verts = [];
  const idx = [];
  const P = profile.length;
  for (let i = 0; i < n; i++) {
    const p = path[i];
    const pa = path[Math.max(0, i - 1)], pb = path[Math.min(n - 1, i + 1)];
    let tx = pb.x - pa.x, ty = pb.y - pa.y;
    const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const nx = ty, ny = -tx; // right-hand normal
    for (let j = 0; j < P; j++) {
      const [u, v] = profile[j];
      verts.push(p.x + nx * u, p.y + ny * u, v);
    }
  }
  for (let i = 0; i < n - 1 + (closed ? 1 : 0); i++) {
    const i2 = (i + 1) % n;
    for (let j = 0; j < P - 1; j++) {
      const a = i * P + j, b = i * P + j + 1, c = i2 * P + j, d = i2 * P + j + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return clean(g, { smooth: true });
}

/** Straight horizontal moulding along X from x0 to x1 with profile [[y, z]] (z out of wall). */
export function moulding(x0, x1, y, profile) {
  const sh = new THREE.Shape(profile.map(([py, pz]) => new THREE.Vector2(-pz, y + py)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0, bevelEnabled: false, curveSegments: 4 });
  g.rotateY(Math.PI / 2); // (sx, sy, e) -> (e, sy, -sx) = (e, y, pz)
  g.translate(x0, 0, 0);
  return clean(g);
}

/** Polygonal or round lathe of profile [[r, y]] with n sides (flat facets if n <= 16 and flat=true). */
export function lathe(profile, n = 8, { flatShade = true, phase = 0 } = {}) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y));
  const g = new THREE.LatheGeometry(pts, n, phase, Math.PI * 2);
  if (flatShade) return clean(g);
  g.computeVertexNormals();
  return clean(g, { smooth: true });
}

/** Regular n-gon prism / tapered pyramid between two radii (circumradius), aligned with flat faces on axes. */
export function prism(n, r0, r1, y0, y1, phase = Math.PI / n) {
  const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, n, 1, false, phase);
  g.translate(0, (y0 + y1) / 2, 0);
  return clean(g);
}
export function pyramid(n, r, y0, h, phase = Math.PI / n) { return prism(n, r, 0.0001, y0, y0 + h, phase); }

/** Low-poly organic blob used for crockets / leaves. */
let _blob;
export function blob(sx, sy, sz, x = 0, y = 0, z = 0, ry = 0, rx = 0) {
  if (!_blob) _blob = clean(new THREE.IcosahedronGeometry(1, 0), { uv: 'planar' });
  return tr(_blob.clone(), M(x, y, z, ry, sx, sy, sz, rx));
}

/** Seeded RNG so the model is identical every load. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
