// Reclining guardian lion (after Béla Markup's lions at the Kossuth tér stairs).
import * as THREE from 'three';
import { M, tr, boxMin, blob, clean, rng } from '../geo/util.js';

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

