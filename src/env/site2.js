// Real surroundings from OpenStreetMap (© OpenStreetMap contributors, ODbL 1.0)
// with Copernicus Urban Atlas building heights: land and the lowered Pest quay
// road, river walls, Kossuth tér paving, lawns and reflecting pool, roads,
// tram line 2, mapped trees, 17,000 surrounding buildings and the bridges.
import * as THREE from 'three';
import { M, tr, box, boxMin, prism, pyramid, lathe, extrude, flat, shape, clean, rng, planarUV } from '../geo/util.js';
import { lamp, tree, makeFlag } from './site.js';
import { roof } from '../arch/roofs.js';
import SITE_DATA from '../data/site.json';
import PLAN from '../data/plan.json';

export const LEVEL = { street: 0, quay: -3.6, water: -9.0 };
const pts2 = (f) => { const o = []; for (let i = 0; i < f.length; i += 2) o.push(new THREE.Vector2(f[i], f[i + 1])); return o; };

/** Triangulated XZ polygon (with holes) at height y. */
function polyMesh(rings, y) {
  const outer = pts2(rings[0]);
  if (outer.length < 3) return null;
  const holes = rings.slice(1).map(pts2).filter(h => h.length >= 3);
  const sh = new THREE.Shape(outer);
  holes.forEach(h => sh.holes.push(new THREE.Path(h)));
  const g = new THREE.ShapeGeometry(sh);
  g.rotateX(Math.PI / 2);   // shape (x, y) -> (x, 0, y)  [z = +y]
  g.translate(0, y, 0);
  // ShapeGeometry faces +z before rotation; after rotateX(+90°) they face -y: flip winding
  const idx = g.index.array; for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 2]; idx[i + 2] = t; }
  return clean(g);
}
function triMesh(t) {
  const pos = [];
  for (let i = 0; i < t.i.length; i += 3) for (const k of [t.i[i], t.i[i + 2], t.i[i + 1]]) pos.push(t.v[k * 2], t.y, t.v[k * 2 + 1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // ensure up-facing
  const n = g.attributes.normal; if (n.count && n.getY(0) < 0) { const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) { const a = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = a; } g.computeVertexNormals(); }
  return clean(g);
}
/** Vertical wall strip along a polyline between yb(x,z) and yt(x,z). */
function wallStrip(flatPts, yb, yt) {
  const P = pts2(flatPts), pos = [];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1];
    const a0 = [a.x, yb(a), a.y], a1 = [a.x, yt(a), a.y], b0 = [b.x, yb(b), b.y], b1 = [b.x, yt(b), b.y];
    pos.push(...a0, ...b0, ...b1, ...a0, ...b1, ...a1, ...a0, ...b1, ...b0, ...a0, ...a1, ...b1); // double sided
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return clean(g);
}
/** Flat ribbon along a polyline (roads, rails). */
function ribbon(flatPts, w, y, off = 0) {
  const P = pts2(flatPts), pos = [], uv = [];
  let acc = 0;
  const N = (i) => {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    const dx = b.x - a.x, dz = b.y - a.y, l = Math.hypot(dx, dz) || 1;
    return [-dz / l, dx / l];
  };
  for (let i = 0; i < P.length - 1; i++) {
    const [nx0, nz0] = N(i), [nx1, nz1] = N(i + 1);
    const a = P[i], b = P[i + 1], L = a.distanceTo(b);
    const A = (p, nx, nz, s) => [p.x + nx * (off + s * w / 2), y, p.y + nz * (off + s * w / 2)];
    const a0 = A(a, nx0, nz0, -1), a1 = A(a, nx0, nz0, 1), b0 = A(b, nx1, nz1, -1), b1 = A(b, nx1, nz1, 1);
    pos.push(...a0, ...b1, ...b0, ...a0, ...a1, ...b1);
    uv.push(0, acc, w, acc + L, 0, acc + L, 0, acc, w, acc, w, acc + L);
    acc += L;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  const n = g.attributes.normal; if (n.count && n.getY(0) < 0) { const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; } g.computeVertexNormals(); }
  return clean(g, { uv: 'keep' });
}

/** Buda hills above the river (analytic, anchored to the OSM bank). */
export function budaHeight(x, z) {
  const d = z - 470;
  if (d <= 0) return 0;
  const ridge = Math.sin(x * 0.0021 + 1.3) * 0.5 + Math.sin(x * 0.0057 + 0.4) * 0.3 + Math.sin(x * 0.013) * 0.12;
  // Castle Hill to the south-west of the Parliament (x ≈ 1500…2600)
  const castle = Math.exp(-Math.pow((x - 2050) / 520, 2)) * Math.exp(-Math.pow((z - 1000) / 260, 2)) * 45;
  return Math.max(0, Math.min(1, d / 1100)) * (110 + 110 * ridge) + castle;
}

/** Extruded city building with a hipped skirt roof (mitred inward offset) or a flat roof. */
function cityBuilding(b, R, out) {
  const rings = b.r.map(pts2);
  let outer = rings[0];
  if (outer.length < 3) return;
  // CCW in (x,z)
  let area = 0; for (let i = 0; i < outer.length; i++) { const p = outer[i], q = outer[(i + 1) % outer.length]; area += p.x * q.y - q.x * p.y; }
  if (area < 0) { outer = outer.slice().reverse(); area = -area; }
  area /= 2;
  if (area < 12) return;
  let cx = 0, cz = 0; outer.forEach(p => { cx += p.x; cz += p.y; }); cx /= outer.length; cz /= outer.length;
  const g0 = cz > 420 ? budaHeight(cx, cz) : 0;
  let h = b.h || (area < 60 ? 6 : 17 + R() * 4);
  h = Math.max(3, Math.min(h, 120));
  const roofH = h > 10 ? Math.min(4.5, h * 0.18) : 0;
  const he = g0 + h - roofH;
  const mat = 'city' + ((Math.abs(Math.floor(cx * 0.37 + cz * 0.11)) + (b.r[0].length)) % 5);
  // walls (outer + courtyards)
  const wpos = [], wuv = [];
  for (const [ri, ring0] of rings.entries()) {
    let ring = ri === 0 ? outer : ring0;
    let acc = 0;
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i], q = ring[(i + 1) % ring.length];
      const L = p.distanceTo(q);
      // outward normal check is not needed: walls are rendered from both orientations via winding per ring
      const a = [p.x, g0 - 0.5, p.y], bb = [q.x, g0 - 0.5, q.y], c = [q.x, he, q.y], d = [p.x, he, p.y];
      if (ri === 0) wpos.push(...a, ...c, ...bb, ...a, ...d, ...c); else wpos.push(...a, ...bb, ...c, ...a, ...c, ...d);
      wuv.push(acc, 0, acc + L, he - g0, acc + L, 0, acc, 0, acc, he - g0, acc + L, he - g0);
      acc += L;
    }
  }
  out[mat].push(geo(wpos, wuv));
  // roof
  const flatTop = (y, mat2) => {
    const s = new THREE.Shape(outer); rings.slice(1).forEach(r => s.holes.push(new THREE.Path(r)));
    const g = new THREE.ShapeGeometry(s); g.rotateX(Math.PI / 2); g.translate(0, y, 0);
    const idx = g.index.array; for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 2]; idx[i + 2] = t; }
    out[mat2].push(clean(g));
  };
  if (roofH <= 0 || rings.length > 1) { flatTop(he, 'cityRoof'); return; }
  const d = roofH / 0.9;
  const n = outer.length, inner = [];
  for (let i = 0; i < n; i++) {
    const p0 = outer[(i - 1 + n) % n], p = outer[i], p1 = outer[(i + 1) % n];
    const e0 = new THREE.Vector2(p.x - p0.x, p.y - p0.y).normalize(), e1 = new THREE.Vector2(p1.x - p.x, p1.y - p.y).normalize();
    const n0 = new THREE.Vector2(-e0.y, e0.x), n1 = new THREE.Vector2(-e1.y, e1.x); // inward for CCW
    const bis = n0.clone().add(n1); const bl = bis.length();
    if (bl < 1e-3) { inner.push(null); continue; }
    bis.multiplyScalar(1 / bl);
    const k = d / Math.max(0.35, bis.dot(n1));
    inner.push(new THREE.Vector2(p.x + bis.x * k, p.y + bis.y * k));
  }
  let ok = inner.every(Boolean);
  if (ok) {
    let a2 = 0; for (let i = 0; i < n; i++) { const p = inner[i], q = inner[(i + 1) % n]; a2 += p.x * q.y - q.x * p.y; }
    a2 /= 2;
    ok = a2 > area * 0.08;
    for (let i = 0; ok && i < n; i++) {
      const e = new THREE.Vector2(outer[(i + 1) % n].x - outer[i].x, outer[(i + 1) % n].y - outer[i].y);
      const f = new THREE.Vector2(inner[(i + 1) % n].x - inner[i].x, inner[(i + 1) % n].y - inner[i].y);
      if (e.dot(f) <= 0) ok = false;
    }
  }
  if (!ok) { flatTop(he, 'cityRoof'); return; }
  const rmat = R() < 0.62 ? 'cityRoof' : 'cityTile';
  const rp = [];
  for (let i = 0; i < n; i++) {
    const a = outer[i], b2 = outer[(i + 1) % n], c = inner[(i + 1) % n], dd = inner[i];
    rp.push(a.x, he, a.y, c.x, he + roofH, c.y, b2.x, he, b2.y, a.x, he, a.y, dd.x, he + roofH, dd.y, c.x, he + roofH, c.y);
  }
  out[rmat].push(geo(rp));
  const s = new THREE.Shape(inner); const g = new THREE.ShapeGeometry(s); g.rotateX(Math.PI / 2); g.translate(0, he + roofH, 0);
  const idx = g.index.array; for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 2]; idx[i + 2] = t; }
  out.cityRoof.push(clean(g));
  // cornice band
}
function geo(pos, uv) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return uv ? clean(g, { uv: 'keep' }) : clean(g);
}


// ---------------------------------------------------------------- river-front terrace
function defBaluster(kit) {
  if (kit.has('baluster')) return;
  // vase baluster 0.62 m: square plinth, bulb, neck, ring, square cap
  kit.def('baluster', () => ({ carve: [
    box(0.2, 0.08, 0.2, 0, 0.04, 0),
    lathe([[0.075, 0.08], [0.085, 0.11], [0.062, 0.14], [0.09, 0.22], [0.098, 0.3], [0.08, 0.38], [0.05, 0.45], [0.042, 0.5], [0.06, 0.52], [0.06, 0.54]], 6, { phase: Math.PI / 6 }),
    box(0.18, 0.08, 0.18, 0, 0.58, 0),
  ] }));
}
/** One straight piece of the embankment: ashlar wall with plinth, cornice and
 *  pilaster strips, balustrade with pedestals on top. Pit back edges get no rail. */
function terraceSegment(kit, a, b, stairs) {
  const L = a.distanceTo(b); if (L < 0.2) return;
  const ry = Math.atan2(-(b.y - a.y), b.x - a.x);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const along = (t, y, sx, sy, sz, oy = 0) => box(sx, sy, sz).applyMatrix4(M(a.x + (b.x - a.x) * t, y + oy, a.y + (b.y - a.y) * t, ry));
  const back = stairs.some(([cx, zb]) => Math.abs(a.y - zb) < 0.1 && Math.abs(b.y - zb) < 0.1 && Math.abs(mid.x - cx) < 8);
  // wall face, plinth and cornice (thickness straddles the line)
  kit.add('stone', along(0.5, LEVEL.quay - 0.2, L + 0.9, 3.82, 0.9, 1.91));
  if (back) return;
  kit.add('stone', along(0.5, LEVEL.quay, L + 1.2, 0.5, 1.2, 0.25));
  kit.add('carve', along(0.5, -0.28, L + 1.14, 0.18, 1.14, 0.09));
  kit.add('carve', along(0.5, -0.1, L + 1.26, 0.12, 1.26, 0.06));
  // balustrade: base, rail
  defBaluster(kit);
  kit.add('stone', along(0.5, 0.02, L, 0.24, 0.62, 0.12));
  kit.add('carve', along(0.5, 0.88, L, 0.16, 0.56, 0.08));
  const nPed = Math.max(1, Math.round(L / 7.6));
  for (let k = 0; k <= nPed; k++) {
    const t = k / nPed;
    kit.add('stone', along(t, 0.02, 0.62, 1.1, 0.7, 0.55));
    kit.add('carve', along(t, 1.12, 0.74, 0.12, 0.82, 0.06));
    kit.add('stone', along(t, LEVEL.quay + 0.5, 0.9, 3.1, 1.04, 1.55)); // pilaster strip under each pedestal
  }
  for (let k = 0; k < nPed; k++) {
    const s0 = (k / nPed) * L + 0.42, s1 = ((k + 1) / nPed) * L - 0.42;
    const n = Math.max(1, Math.floor((s1 - s0) / 0.3));
    for (let j = 0; j < n; j++) {
      const t = (s0 + (j + 0.5) * (s1 - s0) / n) / L;
      kit.put('baluster', M(a.x + (b.x - a.x) * t, 0.26, a.y + (b.y - a.y) * t, ry));
    }
  }
}
/** Straight flight from the terrace down to the quay road, laid in its pit:
 *  22 risers of 0.164 m on 0.42 m treads, granite with stone landings. */
function riverStair(kit, [cx, zb, zr]) {
  const W = 15.2, N = 22, rise = (0 - LEVEL.quay) / N, run = (zr - zb) / N;
  for (let i = 0; i < N; i++) {
    const h = (N - i) * rise;
    kit.add('stone', boxMin(cx - W / 2, LEVEL.quay, zb + i * run, W, h, run + 0.02));
    kit.add('carve', boxMin(cx - W / 2, LEVEL.quay + h - 0.03, zb + i * run + run - 0.06, W, 0.05, 0.1)); // nosing
  }
  // landing in front, flush with the wall line, and lamps on the cheek pedestals
  kit.add('stone', boxMin(cx - W / 2, LEVEL.quay, zr - 0.05, W, 0.05, 1.6));
}

export function buildSite2(kit, mats, U) {
  const S = SITE_DATA, T = S.terrain, R = rng(7);
  // ---------- terrain
  kit.add('paving', triMesh(T.land));   // pavements & squares: light stone; roads are asphalt ribbons on top
  kit.add('asphalt', triMesh(T.quay));
  for (const l of T.riverWalls) kit.add('quay', wallStrip(l, () => LEVEL.water - 3, (p) => (p.y < 230 ? LEVEL.quay : 0)));
  // retaining walls: the Parliament's river front is a dressed-limestone embankment
  // with a balustrade (S3 elevation); elsewhere plain granite with a solid parapet
  const front = (p) => Math.abs(p.x) < 175 && p.y > 40 && p.y < 75;
  for (const l of T.retain) {
    const P = pts2(l);
    let run = [];
    const flush = () => {
      if (run.length > 1) {
        const f = run.flatMap(p => [p.x, p.y]);
        kit.add('quay', wallStrip(f, () => LEVEL.quay - 0.2, () => 0.02));
        kit.add('quay', wallStrip(f, () => 0, () => 1.05));
      }
      run = [];
    };
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1];
      if (front(a) && front(b)) { flush(); terraceSegment(kit, a, b, T.stairs || []); continue; }
      if (!run.length) run.push(a);
      run.push(b);
    }
    flush();
  }
  for (const st of T.stairs || []) riverStair(kit, st);
  // stone parapet along the Pest river edge
  for (const l of T.riverWalls) {
    const P = pts2(l); const seg = [];
    for (const p of P) { if (p.y < 230 && Math.abs(p.x) < 2600) seg.push(p.x, p.y); else if (seg.length) { if (seg.length > 2) kit.add('quay', wallStrip(seg.splice(0), () => LEVEL.quay, () => LEVEL.quay + 1.0)); seg.length = 0; } }
    if (seg.length > 2) kit.add('quay', wallStrip(seg, () => LEVEL.quay, () => LEVEL.quay + 1.0));
  }
  // ---------- squares, lawns, pools
  for (const p of S.paved) { const g = polyMesh(p.r, 0.03); if (g) kit.add('paving', g); }
  for (const p of S.green) {
    const k = p.k;
    const mat = (k === 'grass' || k === 'park' || k === 'garden' || k === 'flowerbed' || k === 'village_green' || k === 'meadow' || k === 'recreation_ground') ? 'grass' : (k === 'forest' || k === 'wood' || k === 'scrub') ? 'tree' : 'grass';
    const g = polyMesh(p.r, 0.06); if (g) kit.add(mat, g);
  }
  for (const p of S.pool) {
    const g = polyMesh(p.r, 0.25); if (!g) continue;
    kit.add('poolWater', g);
    const ring = p.r[0];
    kit.add('quay', wallStrip(ring.concat(ring.slice(0, 2)), () => -0.2, () => 0.45));
  }
  // ---------- roads and tram rails
  const width = { primary: 14, secondary: 13, secondary_link: 7, tertiary: 10, tertiary_link: 6, residential: 8, unclassified: 7, living_street: 6, service: 4, road: 6, pedestrian: 5, cycleway: 2.2 };
  for (const r of S.roads) {
    const w = width[r.k]; if (!w || r.b) continue;
    const y = (r.q ? LEVEL.quay : 0) + (r.k === 'pedestrian' || r.k === 'cycleway' ? 0.035 : 0.02);
    kit.add(r.k === 'pedestrian' ? 'paving' : 'road', ribbon(r.p, (r.l ? Math.min(+r.l * 3.3, w + 4) : w), y));
  }
  S.trams.forEach((t, i) => {
    const y = (S.tramsQ[i] ? LEVEL.quay : 0) + 0.06;
    for (const off of [-0.72, 0.72]) kit.add('iron', ribbon(t, 0.08, y, off));
    kit.add('sett', ribbon(t, 2.6, y - 0.03));
  });
  // ---------- trees (mapped points)
  for (let v = 0; v < 6; v++) if (!kit.has('tree' + v)) kit.def('tree' + v, () => tree(v * 13 + 5));
  for (const [x, z] of S.trees) kit.put('tree' + ((R() * 6) | 0), M(x, 0, z, R() * 6.28, 0.85 + R() * 0.3, 0.85 + R() * 0.35, 0.85 + R() * 0.3));
  // ---------- lamps: terrace edge in front of the river façade, Kossuth tér walks
  if (!kit.has('lamp')) kit.def('lamp', () => lamp());
  const lampPts = [];
  const putLamp = (m) => { kit.put('lamp', m); const e = m.elements; lampPts.push([e[12], e[14], 1]); };
  for (const l of T.riverWalls) {
    const P = pts2(l); let acc = 0;
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1], L = a.distanceTo(b);
      if (a.y > 230 || Math.abs(a.x) > 700) { acc = 0; continue; }
      for (let t = (16 - acc % 16) % 16; t < L; t += 16) {
        const p = a.clone().lerp(b, t / L); const nx = -(b.y - a.y) / L, nz = (b.x - a.x) / L;
        const s = (p.y - 1.4 * nz < p.y) ? -1 : 1; // step towards Pest (−z)
        putLamp(M(p.x + nx * 1.4 * (nz < 0 ? 1 : -1), LEVEL.quay, p.y - Math.abs(nz) * 1.4));
      }
      acc += L;
    }
  }
  for (let x = -170; x <= 170; x += 20) putLamp(M(x, 0, -76));
  // cast-iron bollards along the river edge of the quay road
  if (!kit.has('bollard')) kit.def('bollard', () => ({ iron: [lathe([[0.12, 0], [0.12, 0.08], [0.09, 0.12], [0.08, 0.55], [0.1, 0.6], [0.1, 0.66], [0.06, 0.74], [0.001, 0.76]], 8)] }));
  for (const l of T.riverWalls) {
    const P = pts2(l); let acc = 0;
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1], L = a.distanceTo(b);
      if (a.y > 230 || Math.abs(a.x) > 420 || Math.abs(b.x) > 420) { acc = 0; continue; }
      const nx = -(b.y - a.y) / L, nz = (b.x - a.x) / L, sg = nz < 0 ? 1 : -1;
      for (let t = (4 - acc % 4) % 4; t < L; t += 4) {
        const p = a.clone().lerp(b, t / L);
        kit.put('bollard', M(p.x + nx * 0.7 * sg, LEVEL.quay, p.y + nz * 0.7 * sg));
      }
      acc += L;
    }
  }
  // ---------- buildings
  const out = { city0: [], city1: [], city2: [], city3: [], city4: [], cityRoof: [], cityTile: [] };
  for (const b of S.buildings) cityBuilding(b, R, out);
  for (const [k, list] of Object.entries(out)) list.forEach(g => kit.add(k, g));
  // ---------- Buda hills
  {
    const W = 16000, D = 6200, nx = 260, nz = 110;
    const g = new THREE.PlaneGeometry(W, D, nx, nz); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i) + D / 2 + 440; p.setXYZ(i, x, budaHeight(x, z) - 0.6, z); }
    g.computeVertexNormals();
    kit.add('hill', clean(g, { smooth: true }));
  }
  // ---------- bridges (OSM decks) + the Chain Bridge towers
  for (const b of S.bridges) {
    const name = String(b.n || '');
    if (!/híd|lánchíd/.test(name)) continue;
    const deck = polyMesh(b.r, 1.6);
    if (deck) { kit.add('city2', deck); const under = polyMesh(b.r, 0.6); if (under) kit.add('iron', under); }
  }
  // flag on Kossuth tér
  kit.add('stone', lathe([[2.4, 0], [2.4, 0.5], [1.8, 0.6], [1.6, 1.4], [1.2, 1.5], [0.9, 2.4], [0.01, 2.4]], 8, { phase: Math.PI / 8 }), M(0, 0, -100));
  kit.add('iron', prism(16, 0.32, 0.14, 2.4, 40), M(0, 0, -100));
  kit.add('gold', clean(new THREE.SphereGeometry(0.45, 16, 12)), M(0, 40.3, -100));
  const flag = makeFlag(mats, U);
  flag.position.set(0.3, 36.5, -100);
  return { flag, nightMap: nightLightmap(S, lampPts) };
}

/**
 * Night lightmap over ±1024 m (1 m/px): warm pools under every lamp, sodium/LED
 * street lighting along the OSM streets, and the floodlights' spill on the
 * terrace round the Parliament. Sampled by ground and wall materials.
 */
function nightLightmap(S, lamps) {
  const N = 2048, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, N, N);
  g.globalCompositeOperation = 'lighter';
  const X = (x) => x + 1024, Z = (z) => z + 1024;
  const pool = (x, z, r, col, a) => {
    const gr = g.createRadialGradient(X(x), Z(z), 0, X(x), Z(z), r);
    gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(0.35, `rgba(${col},${a * 0.55})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(X(x), Z(z), r, 0, Math.PI * 2); g.fill();
  };
  // street lighting along the real streets (alternating sides, ~30 m spacing)
  const widths = { primary: 14, secondary: 13, tertiary: 10, residential: 8, unclassified: 7, living_street: 6, pedestrian: 5, service: 4 };
  const R = rng(99);
  for (const r of S.roads) {
    const w = widths[r.k]; if (!w) continue;
    const p = r.p; let acc = 0, side = 1;
    for (let i = 0; i < p.length - 2; i += 2) {
      const ax = p[i], az = p[i + 1], bx = p[i + 2], bz = p[i + 3];
      if (Math.abs(ax) > 1000 || Math.abs(az) > 1000) continue;
      const L = Math.hypot(bx - ax, bz - az); if (L < 0.1) continue;
      const nx = -(bz - az) / L, nz = (bx - ax) / L;
      for (let t = (30 - acc % 30) % 30; t < L; t += 30) {
        const x = ax + (bx - ax) * t / L + nx * side * w * 0.45, z = az + (bz - az) * t / L + nz * side * w * 0.45;
        const warm = r.k === 'pedestrian' ? '255,214,160' : (R() < 0.6 ? '255,178,96' : '255,220,175');
        pool(x, z, 15, warm, 0.5); side = -side;
      }
      acc += L;
    }
  }
  // the ornamental lamps round the Parliament (brighter, whiter)
  for (const [x, z] of lamps) pool(x, z, 11, '255,224,180', 0.75);
  // floodlight spill on the terrace: a warm band hugging the building's outline
  const o = PLAN.outline;
  g.lineJoin = 'round';
  for (const [wdt, a] of [[34, 0.16], [20, 0.22], [9, 0.3]]) {
    g.strokeStyle = `rgba(255,170,85,${a})`; g.lineWidth = wdt; g.beginPath();
    for (let i = 0; i < o.length; i += 2) { const fn = i ? 'lineTo' : 'moveTo'; g[fn](X(o[i]), Z(o[i + 1])); }
    g.closePath(); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  return t;
}
