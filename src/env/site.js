// The setting: Pest embankment (upper road, balustrade, battered quay wall, lower
// quay), Kossuth Lajos tér with lawns and the national flag, Budapest-style
// cast-iron candelabra lamps, plane trees, the riverbed and Buda bank.
import * as THREE from 'three';
import { M, tr, box, boxMin, prism, pyramid, lathe, blob, extrude, flat, shape, lancetOutline, foilPts, moulding, clean, rng } from '../geo/util.js';
import { finial } from '../arch/ornament.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
export const SITE = { water: -8.0, quayTop: 0, lowerQuay: -5.4, edge: 76, lowerEdge: 90, buda: 420 };

function plane(x0, x1, z0, z1, y) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  return clean(g);
}

/** Budapest cast-iron candelabrum: moulded base, fluted shaft, scrolled arms, lantern. */
export function lamp() {
  const g = { iron: [], lampGlass: [], gold: [] };
  g.iron.push(lathe([[0.42, 0], [0.42, 0.3], [0.34, 0.38], [0.3, 0.7], [0.22, 0.8], [0.2, 1.0], [0.13, 1.1], [0.11, 1.2]], 8, { phase: Math.PI / 8 }));
  // fluted shaft
  const shaft = new THREE.CylinderGeometry(0.075, 0.11, 3.4, 24, 1, true);
  const p = shaft.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const a = Math.atan2(x, z); const k = 1 - 0.08 * Math.max(0, Math.cos(a * 12)); p.setX(i, x * k); p.setZ(i, z * k); }
  g.iron.push(tr(clean(shaft), M(0, 2.9, 0)));
  g.iron.push(lathe([[0.1, 4.6], [0.16, 4.7], [0.2, 4.8], [0.12, 4.9], [0.09, 5.2]], 8));
  // two scrolled arms with lanterns
  for (const s of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 4.9, 0), new THREE.Vector3(s * 0.3, 5.15, 0), new THREE.Vector3(s * 0.62, 5.1, 0), new THREE.Vector3(s * 0.72, 4.95, 0)]);
    g.iron.push(clean(new THREE.TubeGeometry(curve, 12, 0.03, 6), { smooth: true }));
    const lx = s * 0.72;
    g.iron.push(tr(prism(4, 0.17, 0.2, 4.55, 4.62, Math.PI / 4), M(lx, 0, 0)));
    g.lampGlass.push(tr(prism(4, 0.21, 0.16, 4.62, 5.1, Math.PI / 4), M(lx, 0, 0)));
    g.iron.push(tr(pyramid(4, 0.27, 5.1, 0.28, Math.PI / 4), M(lx, 0, 0)));
    g.gold.push(tr(clean(new THREE.SphereGeometry(0.04, 6, 4)), M(lx, 5.42, 0)));
  }
  // crowning lantern
  g.lampGlass.push(prism(4, 0.22, 0.17, 5.25, 5.75, Math.PI / 4));
  g.iron.push(pyramid(4, 0.3, 5.75, 0.3, Math.PI / 4));
  g.gold.push(...finial(0.3, true).gold.map(x => tr(x, M(0, 6.02, 0))));
  return g;
}

/** Plane tree (Platanus): trunk with branches and clustered, noise-displaced crowns. */
export function tree(seed = 1) {
  const R = rng(seed);
  const g = { bark: [], tree: [] };
  const H = 7 + R() * 3;
  g.bark.push(tr(clean(new THREE.CylinderGeometry(0.18, 0.32, H * 0.55, 8)), M(0, H * 0.275, 0)));
  for (let i = 0; i < 4; i++) {
    const a = R() * Math.PI * 2;
    g.bark.push(tr(clean(new THREE.CylinderGeometry(0.06, 0.14, H * 0.4, 6)), M(Math.sin(a) * 0.8, H * 0.62, Math.cos(a) * 0.8, a, 1, 1, 1, 0.5)));
  }
  const crowns = 7;
  for (let i = 0; i < crowns; i++) {
    const a = (i / crowns) * Math.PI * 2 + R();
    const r = i === 0 ? 0 : 1.6 + R() * 1.2;
    const s = 2.0 + R() * 1.2;
    const ico = new THREE.IcosahedronGeometry(s, 2);
    const pp = ico.attributes.position;
    for (let k = 0; k < pp.count; k++) {
      const x = pp.getX(k), y = pp.getY(k), z = pp.getZ(k);
      const n = 1 + 0.18 * Math.sin(x * 3.1 + seed) * Math.sin(y * 2.7 + i) * Math.sin(z * 3.3);
      pp.setXYZ(k, x * n, y * n * 0.8, z * n);
    }
    ico.computeVertexNormals();
    g.tree.push(tr(clean(ico, { smooth: true }), M(Math.sin(a) * r, H * 0.78 + (i === 0 ? 1.2 : R() * 1.5), Math.cos(a) * r)));
  }
  return g;
}

/** Flag with waving vertex shader (Hungarian tricolour). */
export function makeFlag(mats, U) {
  const w = 12, h = 6;
  const geo = new THREE.PlaneGeometry(w, h, 48, 24);
  geo.translate(w / 2, 0, 0);
  const cols = [];
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const c = y > h / 6 ? 0xce2939 : y > -h / 6 ? 0xf4f4f0 : 0x477050; // Hungarian red, white, green (sRGB)
    const col = new THREE.Color(c);
    cols.push(col.r, col.g, col.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nfloat wave(vec3 p){ float k = p.x / 12.0; return (sin(p.x * 0.9 - uTime * 3.2) * 0.55 + sin(p.x * 1.7 - uTime * 4.1 + p.y * 0.6) * 0.25) * k; }')
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        { vec3 pp = position; float e = 0.05;
          float d0 = wave(pp), dx = wave(pp + vec3(e,0,0)) - d0, dy = wave(pp + vec3(0,e,0)) - d0;
          objectNormal = normalize(vec3(-dx / e, -dy / e, 1.0)); }`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z += wave(position); transformed.y -= (position.x / 12.0) * (position.x / 12.0) * 0.5;');
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

export function buildSite(kit, mats, U) {
  const { water, lowerQuay, edge, lowerEdge, buda } = SITE;
  const X0 = -1400, X1 = 1400;
  // ---- building plinth terrace and river promenade
  kit.add('paving', plane(-150, 150, 48, 60, 0.02));
  kit.add('grass', plane(-112, -24, 53, 58, 0.06));
  kit.add('grass', plane(24, 112, 53, 58, 0.06));
  for (const [a, b] of [[-112, -24], [24, 112]]) {
    kit.add('stone', boxMin(a, 0, 52.6, b - a, 0.25, 0.3));
    kit.add('stone', boxMin(a, 0, 58.2, b - a, 0.25, 0.3));
  }
  // upper embankment road and pavement
  kit.add('asphalt', plane(X0, X1, 60, 72, 0.0));
  kit.add('paving', plane(X0, X1, 72, edge, 0.03));
  kit.add('paving', plane(X0, -150, 40, 60, 0.02));
  kit.add('paving', plane(150, X1, 40, 60, 0.02));
  // kerbs
  kit.add('quay', boxMin(X0, 0, 71.8, X1 - X0, 0.15, 0.25));
  kit.add('quay', boxMin(X0, 0, 59.8, X1 - X0, 0.15, 0.25));
  // stone balustrade along the river edge
  kit.def('balustrade', () => {
    const g = { quay: [], carve: [] };
    g.quay.push(boxMin(-2.5, 0, -0.35, 5, 0.25, 0.7));
    g.quay.push(boxMin(-2.5, 0.95, -0.32, 5, 0.18, 0.64));
    for (let i = 0; i < 10; i++) g.carve.push(tr(lathe([[0.08, 0], [0.11, 0.1], [0.13, 0.4], [0.06, 0.6], [0.09, 0.7]], 6, { flatShade: false }), M(-2.25 + i * 0.5, 0.25, 0)));
    g.quay.push(boxMin(-0.35, 0, -0.38, 0.7, 1.2, 0.76));
    return g;
  });
  for (let x = -497.5; x < 500; x += 5) kit.put('balustrade', M(x, 0, edge - 0.4));
  kit.add('quay', boxMin(X0, 0, edge - 0.75, X1 - X0, 1.13, 0.7)); // solid parapet beyond the balustraded stretch (hidden behind it near the building)
  // battered quay wall down to the lower quay, lower quay, edge wall to water
  {
    const sh = shape([V2(0, 0), V2(0, lowerQuay), V2(1.4, lowerQuay)]);
    const g = new THREE.ExtrudeGeometry(new THREE.Shape([V2(edge, 0.0), V2(edge + 1.4, lowerQuay), V2(edge - 2, lowerQuay), V2(edge - 2, 0)]), { depth: X1 - X0, bevelEnabled: false });
    g.rotateY(-Math.PI / 2); // shape x -> world z
    g.translate(X1, 0, 0);
    kit.add('quay', clean(g));
  }
  kit.add('paving', plane(X0, X1, edge + 1.4, lowerEdge, lowerQuay + 0.02));
  {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape([V2(lowerEdge, lowerQuay), V2(lowerEdge + 0.6, water - 3), V2(lowerEdge - 2, water - 3), V2(lowerEdge - 2, lowerQuay)]), { depth: X1 - X0, bevelEnabled: false });
    g.rotateY(-Math.PI / 2); g.translate(X1, 0, 0);
    kit.add('quay', clean(g));
    kit.add('quay', boxMin(X0, lowerQuay, lowerEdge - 0.6, X1 - X0, 0.3, 0.8));
  }
  // mooring bollards on the lower quay
  kit.def('bollard', () => ({ iron: [lathe([[0.18, 0], [0.16, 0.5], [0.22, 0.6], [0.18, 0.7], [0.01, 0.72]], 10, { flatShade: false })] }));
  for (let x = -600; x <= 600; x += 25) kit.put('bollard', M(x, lowerQuay + 0.3, lowerEdge - 0.4));
  // riverbed & Buda quay
  kit.add('hill', plane(-8000, 8000, lowerEdge, buda + 40, water - 6));
  {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape([V2(buda, water - 6), V2(buda + 0.8, 2), V2(buda + 4, 2), V2(buda + 4, water - 6)]), { depth: 16000, bevelEnabled: false });
    g.rotateY(-Math.PI / 2); g.translate(8000, 0, 0);
    kit.add('quay', clean(g));
    kit.add('asphalt', plane(-8000, 8000, buda + 4, buda + 64, 2));
  }
  // ---- lamps along the promenade and the square
  kit.def('lamp', () => lamp());
  for (let x = -300; x <= 300; x += 16) kit.put('lamp', M(x, 0, edge - 1.4));
  for (let x = -140; x <= 140; x += 20) kit.put('lamp', M(x, 0, 59.2));

  // ---- Kossuth Lajos tér
  kit.add('paving', plane(-180, 180, -190, 40, 0.01));
  // lawn parterres with paths
  for (const sx of [-1, 1]) {
    for (const [a, b, c, d] of [[22, 95, -150, -80], [105, 170, -150, -60], [22, 95, -182, -158], [105, 170, -182, -158]]) {
      const x0 = sx > 0 ? a : -b, x1 = sx > 0 ? b : -a;
      kit.add('grass', plane(x0, x1, c, d, 0.07));
      kit.add('stone', boxMin(x0, 0, c, x1 - x0, 0.22, 0.25));
      kit.add('stone', boxMin(x0, 0, d - 0.25, x1 - x0, 0.22, 0.25));
    }
  }
  for (let x = -170; x <= 170; x += 24) { kit.put('lamp', M(x, 0, -76)); kit.put('lamp', M(x, 0, -186)); }
  // trees framing the square
  for (let v = 0; v < 6; v++) kit.def('tree' + v, () => tree(v * 13 + 5));
  const R = rng(4);
  for (let x = -172; x <= 172; x += 12) {
    if (Math.abs(x) < 26) continue;
    kit.put('tree' + ((R() * 6) | 0), M(x + (R() - 0.5) * 2, 0, -195 + (R() - 0.5) * 2, R() * 6.28));
  }
  for (let z = -180; z <= -70; z += 12) for (const x of [-176, 176]) kit.put('tree' + ((R() * 6) | 0), M(x + (R() - 0.5) * 2, 0, z, R() * 6.28));
  // trees on the riverside terraces beyond the building ends
  for (let x = 160; x <= 420; x += 11) for (const s of [-1, 1]) kit.put('tree' + ((R() * 6) | 0), M(s * x, 0, 66 + (R() - 0.5), R() * 6.28, 0.9, 0.9, 0.9));
  // flagpole base
  kit.add('stone', lathe([[2.4, 0], [2.4, 0.5], [1.8, 0.6], [1.6, 1.4], [1.2, 1.5], [0.9, 2.4], [0.01, 2.4]], 8, { phase: Math.PI / 8 }), M(0, 0, -128));
  kit.add('iron', prism(16, 0.32, 0.14, 2.4, 40), M(0, 0, -128));
  kit.add('gold', clean(new THREE.SphereGeometry(0.45, 16, 12)), M(0, 40.3, -128));
  // general ground beyond
  kit.add('asphalt', plane(-8000, 8000, -8000, -190, -0.02));
  kit.add('asphalt', plane(-8000, -180, -190, 40, -0.02));
  kit.add('asphalt', plane(180, 8000, -190, 40, -0.02));
  kit.add('asphalt', plane(-8000, 8000, 40, 60, -0.03));
  kit.add('asphalt', plane(-8000, X0, 60, SITE.lowerEdge, -0.03));
  kit.add('asphalt', plane(X1, 8000, 60, SITE.lowerEdge, -0.03));

  const flag = makeFlag(mats, U);
  flag.position.set(0.3, 36.5, -128);
  return { flag };
}
