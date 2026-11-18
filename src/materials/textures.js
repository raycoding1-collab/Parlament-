// Procedural, seamless textures generated at load time (no external image files).
// All sizes are powers of two; UVs in the model are in metres, so each texture
// declares the real-world size it covers (worldSize) and materials set repeat = 1/worldSize.
import * as THREE from 'three';
import { rng } from '../geo/util.js';

// ---------- periodic value noise
function makeNoise(seed) {
  const R = rng(seed);
  const N = 256, perm = new Uint8Array(N * 2), val = new Float32Array(N);
  for (let i = 0; i < N; i++) { perm[i] = i; val[i] = R(); }
  for (let i = N - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < N; i++) perm[N + i] = perm[i];
  const h = (x, y) => val[perm[(perm[x & 255] + (y & 255)) & 511]];
  // periodic noise: x,y in lattice units, period p (lattice cells)
  return (x, y, p) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const x0 = ((xi % p) + p) % p, y0 = ((yi % p) + p) % p, x1 = (x0 + 1) % p, y1 = (y0 + 1) % p;
    const a = h(x0, y0), b = h(x1, y0), c = h(x0, y1), d = h(x1, y1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
function fbm(noise, x, y, basePeriod, oct = 5, gain = 0.5) {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let o = 0; o < oct; o++) {
    const p = basePeriod * f;
    s += amp * noise(x * p, y * p, p); norm += amp;
    amp *= gain; f *= 2;
  }
  return s / norm;
}

function toTexture(data, size, srgb, repeatWorld) {
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeatWorld) t.repeat.set(1 / repeatWorld, 1 / repeatWorld);
  t.needsUpdate = true;
  return t;
}

function normalFromHeight(hgt, size, strength) {
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xl = (x - 1 + size) % size, xr = (x + 1) % size, yu = (y - 1 + size) % size, yd = (y + 1) % size;
      const dx = (hgt[y * size + xr] - hgt[y * size + xl]) * strength;
      const dy = (hgt[yd * size + x] - hgt[yu * size + x]) * strength;
      let nx = -dx, ny = dy, nz = 1; // texture v grows downward in data; flip y
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const i = (y * size + x) * 4;
      out[i] = (nx * 0.5 + 0.5) * 255; out[i + 1] = (ny * 0.5 + 0.5) * 255; out[i + 2] = (nz * 0.5 + 0.5) * 255; out[i + 3] = 255;
    }
  }
  return out;
}

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

/**
 * Hungarian limestone ashlar: 0.40 m courses, staggered blocks, fine mortar joints,
 * per-block tint, pitting and rain-washed vertical weathering streaks.
 */
export function stoneAshlar(size = 2048, world = 6.4, seed = 7, joints = true) {
  const noise = makeNoise(seed), R = rng(seed + 1);
  const col = new Uint8Array(size * size * 4), hgt = new Float32Array(size * size), rough = new Uint8Array(size * size * 4);
  const px = size / world; // pixels per metre
  const course = 0.4, nCourses = Math.round(world / course);
  const courseH = size / nCourses;
  // block layout per course
  const rows = [];
  for (let c = 0; c < nCourses; c++) {
    const cuts = []; let x = R() * 1.2;
    while (x < world) { cuts.push(x); x += [0.8, 1.0, 1.2, 1.4, 1.6][(R() * 5) | 0]; }
    const tints = cuts.map(() => [(R() - 0.5) * 0.06, (R() - 0.5) * 0.03]);
    rows.push({ cuts, tints });
  }
  const jw = 0.012 * px; // joint half width in px
  for (let y = 0; y < size; y++) {
    const c = Math.floor(y / courseH), fy = (y - c * courseH);
    const row = rows[c];
    const dyEdge = Math.min(fy, courseH - fy);
    for (let x = 0; x < size; x++) {
      const xm = x / px;
      // find block
      let bi = row.cuts.length - 1, left = row.cuts[bi] - world, right = row.cuts[0];
      for (let k = 0; k < row.cuts.length; k++) {
        if (xm < row.cuts[k]) { bi = (k - 1 + row.cuts.length) % row.cuts.length; left = k === 0 ? row.cuts[row.cuts.length - 1] - world : row.cuts[k - 1]; right = row.cuts[k]; break; }
        if (k === row.cuts.length - 1) { bi = k; left = row.cuts[k]; right = row.cuts[0] + world; }
      }
      const dxEdge = Math.min(xm - left, right - xm) * px;
      const edge = joints ? Math.min(dxEdge, dyEdge) : 1e9;
      const u = x / size, v = y / size;
      const n1 = fbm(noise, u, v, 8, 5);
      const n2 = fbm(noise, u + 0.37, v * 0.25 + 0.11, 16, 3); // streaks (stretched vertically)
      const speck = noise(u * 512, v * 512, 512);
      const t = row.tints[bi] || [0, 0];
      let L = 0.86 + t[0] + (n1 - 0.5) * 0.10 + (speck - 0.5) * 0.05;
      let warm = 0.035 + t[1];
      // weathering: darker grey streaks, stronger under each course top
      const streak = Math.max(0, n2 - 0.52) * 1.4 * (0.6 + 0.4 * (fy / courseH));
      L -= streak * 0.22;
      // pits
      if (speck > 0.93) L -= 0.08;
      let h = 1.0;
      if (joints) {
        if (edge < jw) { L = 0.70 + (n1 - 0.5) * 0.05; warm = 0.02; h = 0.0; }
        else if (edge < jw * 3) { const k = (edge - jw) / (jw * 2); h = 0.6 + 0.4 * k; L -= (1 - k) * 0.05; }
      }
      h += (n1 - 0.5) * 0.25 + (speck - 0.5) * 0.08;
      const i = (y * size + x) * 4;
      col[i] = clamp01(L + warm) * 255; col[i + 1] = clamp01(L + warm * 0.25) * 255; col[i + 2] = clamp01(L - warm * 0.9) * 255; col[i + 3] = 255;
      hgt[y * size + x] = h;
      const r = clamp01(0.82 + (n1 - 0.5) * 0.2 + streak * 0.1 + (edge < jw ? 0.1 : 0));
      rough[i] = 255; rough[i + 1] = r * 255; rough[i + 2] = 255; rough[i + 3] = 255;
    }
  }
  return {
    map: toTexture(col, size, true, world),
    normalMap: toTexture(normalFromHeight(hgt, size, joints ? 2.2 : 1.2), size, false, world),
    roughnessMap: toTexture(rough, size, false, world),
  };
}

/**
 * Roof: small fish-scale (beaver-tail) ceramic tiles, staggered rows, glazed
 * deep-red/brown palette with subtle per-tile variation and a darker lap shadow.
 */
export function roofTiles(size = 1024, world = 3.0, seed = 11, palette = 'red') {
  const noise = makeNoise(seed), R = rng(seed + 3);
  const col = new Uint8Array(size * size * 4), hgt = new Float32Array(size * size), rough = new Uint8Array(size * size * 4);
  const px = size / world;
  const tw = world / 12, th = world / 18; // tile width & exposed height
  const nx = 12, ny = 18;
  const tint = [];
  for (let j = 0; j < ny; j++) { tint.push([]); for (let i = 0; i < nx; i++) tint[j].push([(R() - 0.5), R()]); }
  const base = palette === 'red' ? [0.40, 0.11, 0.075] : [0.36, 0.16, 0.12];
  for (let y = 0; y < size; y++) {
    const ym = (y / px);
    const row = Math.floor(ym / th);
    const fy = ym / th - row; // 0 at top of exposed part, 1 at bottom edge
    for (let x = 0; x < size; x++) {
      const xm = x / px;
      const off = (row % 2) * 0.5;
      const col0 = Math.floor(xm / tw + off);
      const fx = xm / tw + off - col0; // 0..1 across tile
      // rounded bottom edge: tile bottom boundary curve
      const cx = (fx - 0.5) * 2; // -1..1
      const bottom = 1 - 0.32 * (1 - Math.sqrt(Math.max(0, 1 - cx * cx)));
      let inTile = fy < bottom;
      let r = row, c = col0;
      let ly = fy;
      if (!inTile) { r = row + 1; const off2 = (r % 2) * 0.5; c = Math.floor(xm / tw + off2); ly = fy - 1; }
      const t = tint[((r % ny) + ny) % ny][((c % nx) + nx) % nx];
      const u = x / size, v = y / size;
      const n = fbm(noise, u, v, 16, 4);
      // edge darkening and lap shadow from tile above
      const sideDist = Math.min(fx, 1 - fx);
      const lap = inTile ? clamp01(fy / 0.18) : 1;
      let L = 1 + t[0] * 0.22 + (n - 0.5) * 0.25;
      L *= 0.55 + 0.45 * lap;
      if (sideDist < 0.03 && inTile) L *= 0.8;
      // occasional glazed lighter tile
      const glaze = t[1] > 0.93 ? 1.25 : 1;
      const i = (y * size + x) * 4;
      col[i] = clamp01(base[0] * L * glaze) * 255; col[i + 1] = clamp01(base[1] * L * (1 + (t[1] - 0.5) * 0.3)) * 255; col[i + 2] = clamp01(base[2] * L) * 255; col[i + 3] = 255;
      hgt[y * size + x] = (inTile ? (1 - fy) * 0.6 : 0.6 + (1 - (fy - 1 + 0.0)) * 0.0) + (1 - Math.pow(Math.abs(cx), 4)) * 0.2 + n * 0.1;
      rough[i] = 255; rough[i + 1] = clamp01(0.68 + (n - 0.5) * 0.25 + (1 - lap) * 0.15) * 255; rough[i + 2] = 255; rough[i + 3] = 255;
    }
  }
  return {
    map: toTexture(col, size, true, world),
    normalMap: toTexture(normalFromHeight(hgt, size, 3.0), size, false, world),
    roughnessMap: toTexture(rough, size, false, world),
  };
}

/** Granite paving slabs (Kossuth tér / quay promenade). */
export function paving(size = 1024, world = 8, seed = 21, slab = 1.0, tone = [0.55, 0.53, 0.5]) {
  const noise = makeNoise(seed), R = rng(seed);
  const col = new Uint8Array(size * size * 4), hgt = new Float32Array(size * size), rough = new Uint8Array(size * size * 4);
  const n = Math.round(world / slab), cell = size / n;
  const tints = []; for (let i = 0; i < n * n * 2; i++) tints.push(R() - 0.5);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const cy = Math.floor(y / (cell * 0.5)), fy = (y % (cell * 0.5));
    const offx = (cy % 2) * cell * 0.5;
    const cx = Math.floor(((x + offx) % size) / cell), fx = ((x + offx) % size) % cell;
    const e = Math.min(fx, cell - fx, fy, cell * 0.5 - fy);
    const u = x / size, v = y / size;
    const nn = fbm(noise, u, v, 16, 4), sp = noise(u * 512, v * 512, 512);
    const t = tints[(cy * n + cx) % tints.length];
    let L = 1 + t * 0.18 + (nn - 0.5) * 0.25 + (sp - 0.5) * 0.25;
    let h = 1;
    if (e < 1.5) { L *= 0.55; h = 0; }
    const i = (y * size + x) * 4;
    col[i] = clamp01(tone[0] * L) * 255; col[i + 1] = clamp01(tone[1] * L) * 255; col[i + 2] = clamp01(tone[2] * L) * 255; col[i + 3] = 255;
    hgt[y * size + x] = h + sp * 0.1;
    rough[i] = 255; rough[i + 1] = clamp01(0.75 + (nn - 0.5) * 0.3) * 255; rough[i + 2] = 255; rough[i + 3] = 255;
  }
  return { map: toTexture(col, size, true, world), normalMap: toTexture(normalFromHeight(hgt, size, 1.5), size, false, world), roughnessMap: toTexture(rough, size, false, world) };
}

export function grass(size = 512, world = 6, seed = 31) {
  const noise = makeNoise(seed);
  const col = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const n = fbm(noise, u, v, 8, 5), s = noise(u * 256, v * 256, 256);
    const L = 0.75 + (n - 0.5) * 0.6 + (s - 0.5) * 0.3;
    const i = (y * size + x) * 4;
    col[i] = clamp01(0.20 * L + (n - 0.5) * 0.06) * 255; col[i + 1] = clamp01(0.34 * L) * 255; col[i + 2] = clamp01(0.12 * L) * 255; col[i + 3] = 255;
  }
  return { map: toTexture(col, size, true, world) };
}

export function asphalt(size = 512, world = 6, seed = 41) {
  const noise = makeNoise(seed);
  const col = new Uint8Array(size * size * 4), rough = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const n = fbm(noise, u, v, 8, 4), s = noise(u * 512, v * 512, 512);
    const L = 0.2 + (n - 0.5) * 0.06 + (s - 0.5) * 0.08;
    const i = (y * size + x) * 4;
    col[i] = col[i + 1] = clamp01(L) * 255; col[i + 2] = clamp01(L * 1.03) * 255; col[i + 3] = 255;
    rough[i] = 255; rough[i + 1] = clamp01(0.85 + (n - 0.5) * 0.2) * 255; rough[i + 2] = 255; rough[i + 3] = 255;
  }
  return { map: toTexture(col, size, true, world), roughnessMap: toTexture(rough, size, false, world) };
}

/**
 * Pest apartment-block facade atlas: plaster, window grid (3.4 m storeys, 3.2 m bays),
 * cornice bands; emissive twin with randomly lit windows for night.
 */
export function cityFacade(size = 1024, seed = 51) {
  const noise = makeNoise(seed), R = rng(seed);
  const world = 16; // 16 m square = 5 bays × ~4.7 storeys
  const col = new Uint8Array(size * size * 4), emi = new Uint8Array(size * size * 4);
  const px = size / world;
  const bayW = 3.2, stH = 3.2;
  const lit = []; for (let i = 0; i < 200; i++) lit.push(R());
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const xm = x / px, ym = y / px;
    const bx = xm % bayW, by = ym % stH;
    const bi = Math.floor(xm / bayW), si = Math.floor(ym / stH);
    const u = x / size, v = y / size;
    const n = fbm(noise, u, v, 8, 4);
    let L = 0.82 + (n - 0.5) * 0.15;
    let r = L, g = L * 0.975, b = L * 0.94;
    let er = 0, eg = 0, eb = 0;
    const win = bx > 0.95 && bx < 2.25 && by > 0.7 && by < 2.75;
    const frame = bx > 0.85 && bx < 2.35 && by > 0.6 && by < 2.85;
    if (frame && !win) { r *= 1.08; g *= 1.08; b *= 1.08; }
    if (win) {
      const mull = Math.abs(bx - 1.6) < 0.04 || Math.abs(by - 2.1) < 0.04;
      r = g = b = mull ? 0.5 : 0.08 + n * 0.05;
      const l = lit[(bi * 7 + si * 13) % lit.length];
      if (!mull && l > 0.72) { const k = 0.4 + l * 0.8; er = 1.0 * k; eg = 0.6 * k; eb = 0.3 * k; }
    }
    if (by < 0.18) { r *= 0.85; g *= 0.85; b *= 0.85; } // cornice shadow band
    const i = (y * size + x) * 4;
    col[i] = clamp01(r) * 255; col[i + 1] = clamp01(g) * 255; col[i + 2] = clamp01(b) * 255; col[i + 3] = 255;
    emi[i] = clamp01(er) * 255; emi[i + 1] = clamp01(eg) * 255; emi[i + 2] = clamp01(eb) * 255; emi[i + 3] = 255;
  }
  return { map: toTexture(col, size, true, world), emissiveMap: toTexture(emi, size, true, world) };
}
