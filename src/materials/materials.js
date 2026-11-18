// Material library. Every stone/roof material is patched with an architectural
// floodlighting model (line and point "uplights" evaluated per fragment) so the
// famous golden night illumination of the Országház can be reproduced without
// hundreds of real-time lights.
import * as THREE from 'three';
import * as TX from './textures.js';

export const U = {
  uFlood: { value: 0 },
  uFloodColor: { value: new THREE.Color(1.0, 0.55, 0.19) },
  uGlow: { value: 0 },
  uGlowColor: { value: new THREE.Color(1.0, 0.56, 0.24) },
  uTime: { value: 0 },
  uPoints: { value: [] },   // vec4: xyz position, w intensity
  uLamp: { value: 0 },
};
const MAXP = 24;
for (let i = 0; i < MAXP; i++) U.uPoints.value.push(new THREE.Vector4(0, -1000, 0, 0));

const FLOOD_PARS = /* glsl */`
uniform float uFlood;
uniform vec3 uFloodColor;
uniform vec4 uPoints[${MAXP}];
varying vec3 vFWorld;
float uplight(vec3 L, vec3 N, float k, float c) {
  float d = length(L);
  vec3 l = L / max(d, 1e-3);
  float ndl = max(dot(N, l), 0.0);
  float aim = 0.45 + 1.1 * clamp(-l.y, 0.0, 1.0); // fixtures aimed upward
  return ndl * aim * k / (d + c);
}
vec3 floodLight(vec3 P, vec3 N, float floodMul) {
  if (uFlood <= 0.0) return vec3(0.0);
  float a = 0.0;
  // continuous rows of facade uplights: Danube quay, Kossuth tér, north & south ends
  float scal = mix(0.72 + 0.28 * pow(cos(3.14159 * P.x / 4.5), 2.0), 1.0, smoothstep(1.0, 14.0, P.y));
  a += uplight(vec3(clamp(P.x, -140.0, 140.0), 0.3, 62.0) - P, N, 30.0, 6.0) * scal;
  a += uplight(vec3(clamp(P.x, -140.0, 140.0), 0.3, -66.0) - P, N, 24.0, 6.0) * scal;
  a += uplight(vec3(clamp(P.x, -140.0, 140.0), 0.3, -86.0) - P, N, 10.0, 6.0);
  a += uplight(vec3(150.0, 0.3, clamp(P.z, -55.0, 55.0)) - P, N, 20.0, 6.0);
  a += uplight(vec3(-150.0, 0.3, clamp(P.z, -55.0, 55.0)) - P, N, 20.0, 6.0);
  // roof-mounted projectors for dome, towers and chamber halls
  for (int i = 0; i < ${MAXP}; i++) {
    vec4 p = uPoints[i];
    if (p.w <= 0.0) continue;
    vec3 L = p.xyz - P;
    float d = length(L);
    vec3 l = L / d;
    a += max(dot(N, l), 0.0) * p.w * 900.0 / (d * d + 400.0);
  }
  return uFloodColor * a * uFlood * floodMul;
}
`;

function patchFlood(mat, floodMul = 1) {
  mat.userData.floodMul = floodMul;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uFlood = U.uFlood; sh.uniforms.uFloodColor = U.uFloodColor; sh.uniforms.uPoints = U.uPoints;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFWorld;')
      .replace('#include <project_vertex>', `#include <project_vertex>
      {
        vec4 fw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          fw = instanceMatrix * fw;
        #endif
        vFWorld = (modelMatrix * fw).xyz;
      }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FLOOD_PARS)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      {
        vec3 wN = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
        vec3 fl = floodLight(vFWorld, wN, ${floodMul.toFixed(3)});
        reflectedLight.directDiffuse += material.diffuseContribution * fl;
        reflectedLight.directSpecular += material.specularColorBlended * fl * 0.35;
      }`);
  };
  mat.customProgramCacheKey = () => 'flood' + floodMul;
  return mat;
}

function patchGlass(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = U.uGlow; sh.uniforms.uGlowColor = U.uGlowColor;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aExtra;\nvarying float vExtra;\nvarying vec3 vGPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvExtra = aExtra;\nvGPos = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGlow;\nuniform vec3 uGlowColor;\nvarying float vExtra;\nvarying vec3 vGPos;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        // warm interior light behind leaded panes; a slight vertical gradient fakes depth
        float g = vExtra * uGlow;
        float lead = step(0.9, fract(vGPos.y * 2.2)) * 0.6 + step(0.92, fract(vGPos.x * 2.6 + 0.5)) * 0.6;
        totalEmissiveRadiance += uGlowColor * g * (1.0 - min(lead, 0.8)) * (0.75 + 0.25 * smoothstep(0.0, 2.0, vGPos.y));
      }`);
  };
  mat.customProgramCacheKey = () => 'glass';
  mat.userData.instanceExtra = true;
  return mat;
}

function lampPatch(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uLamp = U.uLamp;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uLamp;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= uLamp;');
  };
  mat.customProgramCacheKey = () => 'lamp';
  return mat;
}

export function createMaterials(q = { tex: 2048 }) {
  const t0 = performance.now();
  const ash = TX.stoneAshlar(q.tex, 6.4, 7, true);
  const fine = TX.stoneAshlar(q.tex >> 1, 3.2, 9, false);
  const roof = TX.roofTiles(q.tex >> 1, 3.0, 11, 'red');
  const pave = TX.paving(q.tex >> 1, 8, 21, 1.0, [0.58, 0.56, 0.53]);
  const quay = TX.paving(q.tex >> 1, 6, 23, 0.75, [0.50, 0.48, 0.45]);
  const grass = TX.grass(512, 6);
  const asph = TX.asphalt(512, 6);
  const city = TX.cityFacade(q.tex >> 1);
  console.log('textures', (performance.now() - t0).toFixed(0) + 'ms');

  const std = (o) => new THREE.MeshStandardMaterial(o);
  const m = {};
  // Hungarian (Süttő-type) limestone: warm white, slightly porous
  m.stone = patchFlood(std({ color: 0xd9d1c2, map: ash.map, normalMap: ash.normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughnessMap: ash.roughnessMap, roughness: 1, metalness: 0 }));
  m.carve = patchFlood(std({ color: 0xe0d9cb, map: fine.map, normalMap: fine.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughnessMap: fine.roughnessMap, roughness: 1 }));
  m.statue = patchFlood(std({ color: 0xcfc8ba, map: fine.map, normalMap: fine.normalMap, roughness: 0.95 }));
  m.dark = patchFlood(std({ color: 0x6e6961, map: fine.map, roughness: 0.9 }), 0.5); // shadowed recess / back walls
  m.roof = patchFlood(std({ color: 0xd8c4c0, map: roof.map, normalMap: roof.normalMap, roughnessMap: roof.roughnessMap, roughness: 1, metalness: 0.0, envMapIntensity: 0.6 }), 0.55);
  m.domeRoof = patchFlood(std({ color: 0xe6cfca, map: roof.map, normalMap: roof.normalMap, roughnessMap: roof.roughnessMap, roughness: 1, envMapIntensity: 0.7 }), 0.8);
  m.glass = patchGlass(std({ color: 0x0b0f12, roughness: 0.06, metalness: 0.2, envMapIntensity: 1.6, emissive: 0x000000 }));
  m.glass.userData.cast = false;
  m.gold = patchFlood(std({ color: 0xd9a54a, roughness: 0.28, metalness: 1.0, envMapIntensity: 1.2 }), 1.2);
  m.iron = patchFlood(std({ color: 0x23282a, roughness: 0.5, metalness: 0.7 }), 0.4);
  m.bronze = patchFlood(std({ color: 0x5c4a32, roughness: 0.42, metalness: 0.85 }), 0.6);
  m.copper = patchFlood(std({ color: 0x5f9a86, roughness: 0.6, metalness: 0.2 }), 0.6);
  m.lampGlass = lampPatch(std({ color: 0xfff4e0, roughness: 0.2, emissive: new THREE.Color(1.0, 0.78, 0.5), emissiveIntensity: 6 }));
  m.paving = patchFlood(std({ map: pave.map, normalMap: pave.normalMap, roughnessMap: pave.roughnessMap, roughness: 1 }), 0.25);
  m.quay = patchFlood(std({ color: 0xa3a3a0, map: quay.map, normalMap: quay.normalMap, roughnessMap: quay.roughnessMap, roughness: 1 }), 0.5);
  m.grass = std({ color: 0xc8d8b0, map: grass.map, roughness: 0.95 });
  m.asphalt = std({ map: asph.map, roughnessMap: asph.roughnessMap, roughness: 1 });
  m.city = std({ map: city.map, emissiveMap: city.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.9 });
  m.cityRoof = std({ color: 0x4a4e52, roughness: 0.7, metalness: 0.3 });
  m.cityTile = std({ color: 0x7a3a2a, roughness: 0.8 });
  m.hill = std({ color: 0x3b4a33, roughness: 1 });
  m.flagRed = std({ color: 0xc8102e, roughness: 0.8, side: THREE.DoubleSide });
  m.flagWhite = std({ color: 0xf4f4f0, roughness: 0.8, side: THREE.DoubleSide });
  m.flagGreen = std({ color: 0x2f7d32, roughness: 0.8, side: THREE.DoubleSide });
  m.tree = std({ color: 0x3d5a2a, roughness: 0.9 });
  m.bark = std({ color: 0x4a3c30, roughness: 1 });
  m.hill.userData.cast = false;
  m.grass.userData.cast = false;
  m.asphalt.userData.cast = false;
  m.paving.userData.cast = false;
  for (const [k, v] of Object.entries(m)) if (v && v.isMaterial) v.name = k;
  m.textures = { ash, fine, roof, pave, quay, grass, asph, city };
  return m;
}
