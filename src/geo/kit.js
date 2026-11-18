// Kit: collects reusable "parts" (instanced) and unique "static" geometry,
// then emits a minimal number of draw calls: one InstancedMesh per part×material,
// one merged mesh per material for unique geometry.
import * as THREE from 'three';
import { clean, merge } from './util.js';

export class Kit {
  constructor(materials) {
    this.mats = materials;
    this.parts = new Map();
    this.statics = new Map();
  }
  /** Define a part once. builder() returns { matKey: BufferGeometry | BufferGeometry[] }. */
  def(name, builder) {
    if (!this.parts.has(name)) {
      const raw = builder();
      const geos = {};
      for (const [k, v] of Object.entries(raw)) {
        if (!Array.isArray(v) && !(v && v.isBufferGeometry)) continue;
        const g = Array.isArray(v) ? merge(v.filter(Boolean)) : v;
        if (g) { g.computeBoundingSphere(); geos[k] = g; }
      }
      this.parts.set(name, { geos, list: [], extra: [] });
    }
    return name;
  }
  has(name) { return this.parts.has(name); }
  put(name, matrix, extra = 0) {
    const p = this.parts.get(name);
    if (!p) throw new Error('unknown part ' + name);
    p.list.push(matrix.clone());
    p.extra.push(extra);
  }
  /** Add unique geometry (optionally transformed) to a material bucket. */
  add(matKey, geo, matrix) {
    if (!geo) return;
    const g = matrix ? geo.clone().applyMatrix4(matrix) : geo;
    if (!this.statics.has(matKey)) this.statics.set(matKey, []);
    this.statics.get(matKey).push(g);
  }
  addMany(obj, matrix) { for (const [k, v] of Object.entries(obj)) for (const g of [].concat(v)) this.add(k, g, matrix); }

  build(group = new THREE.Group()) {
    let tris = 0, calls = 0, inst = 0;
    for (const [name, p] of this.parts) {
      if (!p.list.length) continue;
      for (const [mk, g] of Object.entries(p.geos)) {
        const mat = this.mats[mk];
        if (!mat) throw new Error('missing material ' + mk);
        const mesh = new THREE.InstancedMesh(g, mat, p.list.length);
        p.list.forEach((m, i) => mesh.setMatrixAt(i, m));
        if (mat.userData.instanceExtra) {
          g.setAttribute('aExtra', new THREE.InstancedBufferAttribute(new Float32Array(p.extra), 1));
        }
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        mesh.castShadow = mat.userData.cast !== false;
        mesh.receiveShadow = true;
        mesh.name = name + ':' + mk;
        // fine ornament lives on layer 1 so cheap passes (mobile reflections) can skip it
        if (mk === 'carve' || mk === 'statue' || mk === 'gold' || mk === 'iron') mesh.layers.set(1);
        group.add(mesh);
        tris += (g.attributes.position.count / 3) * p.list.length; calls++; inst += p.list.length;
        (group.userData.report ||= []).push([name + ':' + mk, p.list.length, g.attributes.position.count / 3, (g.attributes.position.count / 3) * p.list.length, isNaN(g.boundingSphere.radius)]);
      }
    }
    for (const [mk, list] of this.statics) {
      const g = merge(list);
      if (!g) continue;
      const mat = this.mats[mk];
      if (!mat) throw new Error('missing material ' + mk);
      const mesh = new THREE.Mesh(g, mat);
      mesh.castShadow = mat.userData.cast !== false;
      mesh.receiveShadow = true;
      mesh.name = 'static:' + mk;
      group.add(mesh);
      tris += g.attributes.position.count / 3; calls++;
      g.computeBoundingSphere();
      (group.userData.report ||= []).push(['static:' + mk, 1, g.attributes.position.count / 3, g.attributes.position.count / 3, isNaN(g.boundingSphere.radius)]);
    }
    group.userData.report.sort((a, b) => b[3] - a[3]);
    group.userData.stats = { tris: Math.round(tris), calls, inst };
    return group;
  }
}
