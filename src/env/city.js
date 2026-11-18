// Budapest context: Pest perimeter blocks (eclectic 5–7 storey apartment houses
// with mansard roofs and corner cupolas), St Stephen's Basilica on the skyline,
// the Chain Bridge to the south, Buda embankment houses and the Buda hills.
import * as THREE from 'three';
import { M, tr, box, boxMin, prism, pyramid, lathe, extrude, flat, shape, clean, rng, archPts } from '../geo/util.js';
import { roof } from '../arch/roofs.js';
import { SITE } from './site.js';

const V2 = (x, y) => new THREE.Vector2(x, y);

function wing(kit, mat, x0, x1, z0, z1, h, roofMat, R, axis) {
  kit.add(mat, boxMin(x0, 0, z0, x1 - x0, h, z1 - z0));
  // cornice
  kit.add('cityRoof', boxMin(x0 - 0.4, h - 0.6, z0 - 0.4, x1 - x0 + 0.8, 0.6, z1 - z0 + 0.8));
  const ax = axis || ((x1 - x0) > (z1 - z0) ? 'x' : 'z');
  const d = ax === 'x' ? z1 - z0 : x1 - x0;
  const r = roof(x0, x1, z0, z1, h, d * 0.5 * (0.7 + R() * 0.5), ax, ['hip', 'hip']);
  kit.add(roofMat, r.roof[0]);
  // chimneys
  const n = Math.floor(Math.max(x1 - x0, z1 - z0) / 14);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const cx = ax === 'x' ? x0 + (x1 - x0) * t : (x0 + x1) / 2 + (R() - 0.5) * 3;
    const cz = ax === 'x' ? (z0 + z1) / 2 + (R() - 0.5) * 3 : z0 + (z1 - z0) * t;
    kit.add('cityRoof', boxMin(cx - 0.4, h, cz - 0.6, 0.8, d * 0.35 + 1.2, 1.2));
  }
}

function block(kit, x0, x1, z0, z1, R) {
  const D = 13 + R() * 3;
  const mats = ['city0', 'city1', 'city2', 'city3', 'city4'];
  const roofMat = () => (R() < 0.7 ? 'cityRoof' : 'cityTile');
  // split the perimeter into individual houses of varying height
  const houses = [];
  const along = (a0, a1, fixed0, fixed1, ax) => {
    let a = a0;
    while (a < a1 - 1) {
      const w = Math.min(a1 - a, 16 + R() * 18);
      houses.push(ax === 'x' ? [a, a + w, fixed0, fixed1] : [fixed0, fixed1, a, a + w]);
      a += w;
    }
  };
  along(x0, x1, z0, z0 + D, 'x');
  along(x0, x1, z1 - D, z1, 'x');
  along(z0 + D, z1 - D, x0, x0 + D, 'z');
  along(z0 + D, z1 - D, x1 - D, x1, 'z');
  for (const [a, b, c, d] of houses) {
    const h = 18 + Math.floor(R() * 4) * 3.4;
    wing(kit, mats[(R() * mats.length) | 0], a, b, c, d, h, roofMat(), R, (b - a) > (d - c) ? 'x' : 'z');
  }
  // corner cupolas on some street corners
  for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
    if (R() < 0.3) {
      const h = 26;
      const sx = cx === x0 ? 1 : -1, sz = cz === z0 ? 1 : -1;
      const px = cx + sx * 4, pz = cz + sz * 4;
      kit.add('cityRoof', lathe([[4.6, h + 3], [4.2, h + 5], [3.0, h + 7.5], [1.2, h + 9], [0.5, h + 10], [0.5, h + 11.5], [0.01, h + 12]], 8, { flatShade: false }), M(px, 0, pz));
      kit.add('city0', prism(8, 4.4, 4.4, 0, h + 3), M(px, 0, pz));
    }
  }
}

/** St Stephen's Basilica (simplified massing): Greek cross, dome on drum, two west towers. */
function basilica(kit, x, z, ry) {
  const m = M(x, 0, z, ry);
  const S = (g) => kit.add('city2', g, m);
  S(boxMin(-25, 0, -45, 50, 30, 90));
  S(boxMin(-45, 0, -20, 90, 30, 40));
  kit.add('cityRoof', roof(-25, 25, -45, 45, 30, 9, 'z', ['gable', 'gable']).roof[0], m);
  kit.add('cityRoof', roof(-45, 45, -20, 20, 30, 9, 'x', ['gable', 'gable']).roof[0], m);
  // portico
  S(boxMin(-14, 0, 45, 28, 22, 6));
  kit.add('cityRoof', roof(-14, 14, 45, 51, 22, 4, 'x', ['gable', 'gable']).roof[0], m);
  for (let i = 0; i < 6; i++) S(tr(prism(12, 0.9, 0.9, 0, 18), M(-11 + i * 4.4, 0, 51)));
  // drum, dome, lantern
  S(prism(16, 16, 16, 30, 46));
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; S(tr(prism(12, 0.8, 0.8, 32, 46), M(Math.sin(a) * 16.6, 0, Math.cos(a) * 16.6))); }
  S(prism(16, 17, 17, 46, 48));
  const dome = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; dome.push([15 * Math.cos(t * Math.PI / 2) + 0.01, 48 + 26 * Math.sin(t * Math.PI / 2)]); }
  kit.add('copper', lathe(dome, 32, { flatShade: false }), m);
  S(prism(12, 3.4, 3.4, 73, 82));
  kit.add('copper', lathe([[3.8, 82], [3.0, 86], [1.2, 89], [0.6, 92], [0.01, 93]], 16, { flatShade: false }), m);
  kit.add('gold', tr(prism(6, 0.2, 0.2, 93, 96), M(0, 0, 0)), m);
  // twin bell towers
  for (const sx of [-1, 1]) {
    const tm = m.clone().multiply(M(sx * 20, 0, 40));
    kit.add('city2', boxMin(-6, 0, -6, 12, 52, 12), tm);
    kit.add('city2', prism(8, 5, 5, 52, 64), tm);
    kit.add('copper', lathe([[5.4, 64], [4.8, 67], [2.6, 71], [1.2, 74], [0.01, 78]], 16, { flatShade: false }), tm);
    kit.add('gold', prism(6, 0.15, 0.15, 77, 80), tm);
  }
}

/** Chain Bridge (Széchenyi Lánchíd): two triumphal-arch stone towers, chains, deck. */
function chainBridge(kit, x) {
  const z0 = SITE.lowerEdge + 10, z1 = SITE.buda - 10;
  const deckY = 2.5, towerZ = [z0 + 70, z1 - 70];
  kit.add('city4', boxMin(x - 7, deckY - 1.4, z0 - 30, 14, 1.4, z1 - z0 + 60));
  kit.add('iron', boxMin(x - 7.2, deckY, z0 - 30, 0.3, 1.2, z1 - z0 + 60));
  kit.add('iron', boxMin(x + 6.9, deckY, z0 - 30, 0.3, 1.2, z1 - z0 + 60));
  for (const tz of towerZ) {
    const holes = [[...archPts(9, 22, 0.5, 18, 0).map(p => V2(p.x, p.y)), V2(4.5, deckY), V2(-4.5, deckY)].reverse()];
    const tw = extrude(shape([V2(-9, SITE.water - 2), V2(9, SITE.water - 2), V2(9, 48), V2(-9, 48)], holes), 12, 6);
    kit.add('city2', tw, M(x, 0, tz));
    kit.add('city2', boxMin(x - 10, 46, tz - 7, 20, 3, 14));
    kit.add('city2', boxMin(x - 10, SITE.water - 6, tz - 8, 20, 6, 16));
  }
  // chains: catenary between anchorages, sagging between towers
  const pts = (sx) => {
    const P = [];
    const anch = [z0 - 25, z1 + 25];
    const ta = towerZ[0], tb = towerZ[1];
    for (let i = 0; i <= 10; i++) { const t = i / 10; P.push(new THREE.Vector3(x + sx * 6.2, deckY + 1 + t * t * 43, anch[0] + (ta - anch[0]) * t)); }
    for (let i = 1; i <= 40; i++) { const t = i / 40; const zz = ta + (tb - ta) * t; const sag = 4 * t * (1 - t); P.push(new THREE.Vector3(x + sx * 6.2, 44 - sag * 40, zz)); }
    for (let i = 1; i <= 10; i++) { const t = i / 10; P.push(new THREE.Vector3(x + sx * 6.2, 44 - t * (2 - t) * 43, tb + (anch[1] - tb) * t)); }
    return P;
  };
  for (const sx of [-1, 1]) {
    const P = pts(sx);
    kit.add('iron', clean(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), 120, 0.55, 6), { smooth: true }));
    for (let i = 10; i < 50; i += 2) kit.add('iron', boxMin(P[i].x - 0.06, deckY, P[i].z - 0.06, 0.12, P[i].y - deckY, 0.12));
    // light bulbs strung along the chains
    for (let i = 2; i < P.length - 2; i += 1) kit.add('lampGlass', clean(new THREE.SphereGeometry(0.28, 6, 4)), M(P[i].x, P[i].y + 0.7, P[i].z));
  }
}

function hills(kit) {
  const R = rng(99);
  // Buda hills: a wide heightfield beyond the river
  const W = 16000, D = 5200, nx = 220, nz = 90;
  const g = new THREE.PlaneGeometry(W, D, nx, nz);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i) + D / 2 + SITE.buda + 60;
    const d = z - (SITE.buda + 60);
    const ridge = Math.sin(x * 0.0021 + 1.3) * 0.5 + Math.sin(x * 0.0057 + 0.4) * 0.3 + Math.sin(x * 0.013) * 0.12;
    const hgt = Math.max(0, Math.min(1, d / 900)) * (140 + 120 * ridge) + Math.max(0, d - 1600) * 0.05;
    p.setXYZ(i, x, 2 + hgt + Math.sin(x * 0.03 + z * 0.02) * 2, z);
  }
  g.computeVertexNormals();
  kit.add('hill', clean(g, { smooth: true }));
  // scattered villas on the slopes
  kit.def('villa', () => {
    const o = { city1: [boxMin(-5, 0, -4, 10, 8, 8)], cityTile: [roof(-5.4, 5.4, -4.4, 4.4, 8, 4, 'x', ['hip', 'hip']).roof[0]] };
    return o;
  });
  for (let i = 0; i < 900; i++) {
    const x = (R() - 0.5) * 4200, d = 60 + Math.pow(R(), 1.4) * 1100;
    const z = SITE.buda + 60 + d;
    const ridge = Math.sin(x * 0.0021 + 1.3) * 0.5 + Math.sin(x * 0.0057 + 0.4) * 0.3 + Math.sin(x * 0.013) * 0.12;
    const y = 2 + Math.max(0, Math.min(1, d / 900)) * (140 + 120 * ridge);
    kit.put('villa', M(x, y - 1, z, R() * 6.28, 1 + R(), 1 + R() * 0.8, 1 + R()));
  }
}

export function buildCity(kit) {
  const R = rng(1873);
  // Pest blocks east of Kossuth tér
  const px = 100, pz = 84;
  for (let gx = -8; gx <= 8; gx++) {
    for (let gz = 0; gz < 9; gz++) {
      const x0 = gx * px - 42, z0 = -225 - gz * pz - 66;
      const x1 = x0 + 84, z1 = z0 + 66;
      if (R() < 0.06) continue; // small squares
      block(kit, x0, x1, z0, z1, R);
    }
  }
  // blocks north and south along the embankment
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 3; j++) {
        const x0 = sx > 0 ? 260 + i * 100 : -260 - i * 100 - 84;
        const z0 = -40 - j * 84 + (j === 0 ? 0 : 0);
        if (sx > 0 && x0 > 1320) continue;
        block(kit, x0, x0 + 84, z0 - 26 - (j === 0 ? 0 : 40), z0 + 40 - (j === 0 ? 0 : 40), R);
      }
    }
  }
  // Buda embankment houses
  for (let x = -2200; x < 2200; x += 34 + R() * 20) {
    const h = 16 + Math.floor(R() * 4) * 3.4, w = 26 + R() * 10;
    wing(kit, 'city' + ((R() * 5) | 0), x, x + w, SITE.buda + 46, SITE.buda + 62, h, R() < 0.6 ? 'cityRoof' : 'cityTile', R, 'x');
  }
  // distant city carpet (fades into the haze) so the horizon is never empty
  for (let v = 0; v < 3; v++) kit.def('far' + v, () => ({
    ['city' + (v * 2)]: [boxMin(-0.5, 0, -0.5, 1, 1, 1)],
    [v === 1 ? 'cityTile' : 'cityRoof']: [roof(-0.55, 0.55, -0.55, 0.55, 1, 0.35, 'x', ['hip', 'hip']).roof[0]],
  }));
  const far = (x, z) => {
    const w = 40 + R() * 50, d = 30 + R() * 40, h = 16 + R() * 14;
    kit.put('far' + ((R() * 3) | 0), M(x + (R() - 0.5) * 20, 0, z + (R() - 0.5) * 20, (R() < 0.5 ? 0 : Math.PI / 2), w, h, d));
  };
  for (let x = -4600; x <= 4600; x += 85) for (let z = -1080; z >= -4200; z -= 80) if (Math.abs(x) > 860 || z < -1050) far(x, z);
  for (const sx of [-1, 1]) for (let x = 1340; x <= 4600; x += 85) for (let z = 40; z > -1080; z -= 80) far(sx * x, z);
  basilica(kit, 720, -640, Math.PI);
  chainBridge(kit, 1480);
  hills(kit);
}
