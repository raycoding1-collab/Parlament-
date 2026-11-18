// Main entrance on Kossuth Lajos tér: projecting pavilion with monumental rose
// gable and twin turrets, a three-arched porch with crocketed gables and balcony,
// the grand flight of steps and the two reclining guardian lions.
import * as THREE from 'three';
import { M, tr, box, boxMin, prism, pyramid, lathe, blob, extrude, flat, shape, lancetOutline, archPts, foilPts, sweepXY, moulding, clean, rng } from '../geo/util.js';
import { facade } from './building.js';
import { A } from './modules.js';
import { roof, dressRoof } from './roofs.js';
import { cornerTurret } from './towers.js';
import { pinnacle, wimperg, finial, parapetPanel, crocket } from './ornament.js';

const V2 = (x, y) => new THREE.Vector2(x, y);

/**
 * Reclining guardian lion (sphinx pose), ~3.3 m long, facing +z: ribbed torso,
 * powerful haunches, crossed forepaws with toes, a mane of individual flowing
 * locks, sculpted head with brow, muzzle, nose pad, jaw and recessed eyes,
 * tail curling around the hind paw.
 */
export function lion() {
  const g = { statue: [], dark: [] };
  const S = g.statue;
  const R = rng(77);
  const sph = (ws = 20, hs = 14) => clean(new THREE.SphereGeometry(1, ws, hs), { smooth: true });
  const E = (x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => S.push(tr(sph(), M(x, y, z, ry, sx, sy, sz, rx, rz)));
  // torso: chest, ribcage, loins, hips
  E(0, 0.78, 0.55, 0.58, 0.62, 0.62);
  E(0, 0.72, 0.0, 0.54, 0.56, 0.75);
  E(0, 0.62, -0.75, 0.46, 0.48, 0.6);
  E(0, 0.66, -1.25, 0.52, 0.52, 0.5);
  // haunches and folded hind legs
  for (const s of [-1, 1]) {
    E(s * 0.36, 0.55, -1.15, 0.3, 0.46, 0.58, 0.2);
    S.push(tr(clean(new THREE.CapsuleGeometry(0.15, 0.75, 4, 10), { smooth: true }), M(s * 0.5, 0.17, -0.82, 0, 1, 1, 1, Math.PI / 2 + 0.05)));
    E(s * 0.5, 0.11, -0.36, 0.17, 0.11, 0.25);
    for (let t = -1; t <= 1; t++) E(s * 0.5 + t * 0.075, 0.08, -0.16, 0.05, 0.055, 0.07);
    // forelegs extended, slightly converging, big paws with four toes
    S.push(tr(clean(new THREE.CapsuleGeometry(0.17, 1.0, 4, 10), { smooth: true }), M(s * 0.3, 0.24, 1.1, -s * 0.05, 1, 1, 1, Math.PI / 2 - 0.1)));
    E(s * 0.32, 0.36, 0.62, 0.22, 0.3, 0.3); // shoulder/elbow
    E(s * 0.27, 0.13, 1.7, 0.21, 0.13, 0.27);
    for (let t = 0; t < 4; t++) E(s * 0.27 + (t - 1.5) * 0.085, 0.1, 1.92, 0.052, 0.06, 0.075);
  }
  // spine ridge
  E(0, 1.18, -0.2, 0.18, 0.12, 0.9);
  // mane: flowing locks around neck & shoulders, falling backwards and down
  for (let ring = 0; ring < 3; ring++) {
    const n = 14 + ring * 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R() * 0.2;
      if (Math.cos(a) < -0.65 && ring === 0) continue;
      const rr = 0.42 + ring * 0.12;
      const y = 1.32 + Math.cos(a) * rr * 0.95, x = Math.sin(a) * rr * 1.05;
      const z = 0.68 - ring * 0.2;
      const lock = new THREE.IcosahedronGeometry(1, 1);
      S.push(tr(clean(lock, { smooth: false }), M(x, y, z, Math.sin(a) * 0.35, 0.13, 0.13, 0.36 + ring * 0.05, -0.55 - ring * 0.15, -a * 0.6)));
    }
  }
  E(0, 1.15, 0.45, 0.6, 0.62, 0.55); // mane mass
  E(0, 0.95, 0.85, 0.42, 0.42, 0.3);  // chest ruff
  // head
  E(0, 1.36, 1.0, 0.33, 0.34, 0.36);
  E(0, 1.5, 1.08, 0.3, 0.12, 0.26);          // brow
  E(0, 1.2, 1.33, 0.22, 0.17, 0.24);         // muzzle
  E(0, 1.29, 1.55, 0.085, 0.07, 0.06);       // nose pad
  E(0, 1.33, 1.38, 0.07, 0.08, 0.2, -0.3);   // bridge of nose
  E(0, 1.03, 1.28, 0.16, 0.08, 0.18);        // jaw
  for (const s of [-1, 1]) {
    E(s * 0.1, 1.19, 1.5, 0.1, 0.08, 0.07);  // whisker pads
    E(s * 0.25, 1.62, 0.84, 0.1, 0.12, 0.06, 0, s * 0.4); // ears
    g.dark.push(tr(clean(new THREE.SphereGeometry(0.045, 8, 6)), M(s * 0.15, 1.42, 1.3)));
  }
  // tail curling forward along the flank, tuft over the hind paw
  const tail = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    tail.push(new THREE.Vector3(0.45 + Math.sin(t * Math.PI) * 0.28, 0.42 - t * 0.32, -1.6 + t * 1.45));
  }
  S.push(clean(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tail), 28, 0.065, 8), { smooth: true }));
  E(0.48, 0.12, -0.12, 0.1, 0.1, 0.18);
  // plinth slab carved with the lion
  S.push(boxMin(-0.85, -0.05, -1.9, 1.7, 0.08, 4.05));
  return g;
}

export function buildEntrance(kit, { gableWithRose }) {
  const PAV_EAVE = A.C1 + 4;
  // ---- entrance pavilion x -15…15, z -60…-46
  facade(kit, 15, -60, -15, -60, { attic: 1, statues: true, endPiers: [false, false], arcadeBays: (i, n) => i >= 2 && i < n - 2 });
  facade(kit, -15, -60, -15, -46, { attic: 1, endPiers: [false, true] });
  facade(kit, 15, -46, 15, -60, { attic: 1, endPiers: [true, false] });
  kit.add('dark', boxMin(-14.4, 0, -59.4, 28.8, PAV_EAVE, 13.4));
  const r = roof(-15, 15, -60.3, -37, PAV_EAVE, 20.0, 'z', ['gable', 'gable']);
  kit.addMany({ roof: r.roof });
  dressRoof(kit, r, { dormerStep: 6, dormerAt: 0.3 });
  gableWithRose(kit, 0, PAV_EAVE - 0.2, -60.25, 24, 21.0, Math.PI);
  if (!kit.has('turretEnt')) kit.def('turretEnt', () => cornerTurret(2.3, PAV_EAVE + 7.0, 17.0));
  kit.put('turretEnt', M(15, 0, -60));
  kit.put('turretEnt', M(-15, 0, -60));

  // ---- porch: three open arches with gables, balcony terrace
  const pz0 = -66.5, pz1 = -60.0, PH = 11.0, py = 1.4;
  const bays = [-5.4, 0, 5.4];
  const front = [];
  const bw = 5.4;
  // front arcade wall with three arches
  const ar = bays.map(cx => lancetOutline(4.0, py, py + 4.6, 0.75, 18, cx));
  kit.add('stone', extrude(shape([V2(-8.1, py), V2(8.1, py), V2(8.1, PH), V2(-8.1, PH)], ar), 1.0, 0), M(0, 0, pz0, Math.PI));
  for (const cx of bays) {
    const m = M(0, 0, pz0, Math.PI);
    const arch = archPts(4.0, py + 4.6, 0.75, 22, cx);
    kit.add('carve', sweepXY([V2(cx - 2, py + 0.6), ...arch, V2(cx + 2, py + 0.6)].reverse(), [[-0.1, 0], [0, 0.1], [0.12, 0.16], [0.25, 0.1], [0.3, 0]]), m);
    // archivolt cusping
    kit.add('carve', extrude(shape(lancetOutline(4.0, py + 4.6, py + 4.62, 0.75, 22, cx).slice(1, -1).concat(archPts(3.6, py + 4.6, 0.78, 22, cx).reverse())), 0.15, -0.3), m);
    const wg = wimperg(5.0, 4.6, 0.3, { biteW: 4.6, biteSpring: 0, biteK: 0.75, crockets: 5, cs: 0.28, finialH: 1.1 });
    wg.carve.forEach(x => kit.add('carve', x, m.clone().multiply(M(cx, py + 4.6, 0.3))));
  }
  // porch side walls, piers with pinnacles, vault, floor
  for (const sx of [-1, 1]) {
    kit.add('stone', extrude(shape([V2(pz0, py), V2(pz1, py), V2(pz1, PH), V2(pz0, PH)], [lancetOutline(3.4, py, py + 4.0, 0.75, 14, (pz0 + pz1) / 2)]), 0.8, 0), M(sx < 0 ? -8.1 : 7.3, 0, 0, -Math.PI / 2));
  }
  for (const x of [-8.1, -2.7, 2.7, 8.1]) {
    kit.add('stone', boxMin(x - 0.6, 0, pz0 - 0.8, 1.2, PH + 0.6, 1.2));
    pinnacle(1.0, 5.6).carve.forEach(g => kit.add('carve', g, M(x, PH + 0.6, pz0 - 0.2)));
  }
  kit.add('dark', boxMin(-7.6, PH - 0.6, pz0 + 0.3, 15.2, 0.6, pz1 - pz0 - 0.3));
  kit.add('paving', boxMin(-8.2, 0, pz0 - 0.8, 16.4, py, pz1 - pz0 + 0.8));
  // balcony parapet on porch roof
  for (let i = 0; i < 6; i++) kit.add('carve', parapetPanel(16.2 / 6, 1.1, 0.25).carve[0], M(-8.1 + 16.2 * (i + 0.5) / 6, PH, pz0 - 0.1, Math.PI));
  kit.add('carve', moulding(-8.1, 8.1, PH - 0.5, [[0, 0], [0, 0.3], [0.2, 0.5], [0.5, 0.4], [0.5, 0]]), M(0, 0, pz0, Math.PI));

  // ---- grand flight of steps
  const steps = 10, rise = py / steps, tread = 0.55;
  const sz0 = pz0 - 0.8;
  for (let i = 0; i < steps; i++) {
    const w = 26 + (steps - i) * 0.4;
    kit.add('quay', boxMin(-w / 2, 0, sz0 - (steps - i) * tread, w, rise * (i + 1), tread + 0.02));
  }
  // stair cheeks with lions on pedestals
  if (!kit.has('lion')) kit.def('lion', () => lion());
  const cz = sz0 - steps * tread;
  for (const sx of [-1, 1]) {
    const x = sx * 15.2;
    kit.add('stone', boxMin(x - 1.0, 0, cz - 3.2, 2.0, 1.9, 3.2 + steps * tread + 1));
    kit.add('carve', moulding(-1.1, 1.1, 1.7, [[0, 0], [0, 0.15], [0.12, 0.2], [0.25, 0.1], [0.25, 0]]), M(x, 0, cz - 3.2, Math.PI));
    kit.add('stone', boxMin(x - 1.3, 0, cz - 3.6, 2.6, 0.5, 3.8));
    kit.put('lion', M(x, 1.95, cz - 1.6, Math.PI, 1, 1, 1));
  }
}

