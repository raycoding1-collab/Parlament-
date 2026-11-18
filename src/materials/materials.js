// Material library. Every stone/roof material is patched with an architectural
// floodlighting model (line and point "uplights" evaluated per fragment) so the
// famous golden night illumination of the Országház can be reproduced without
// hundreds of real-time lights.
import * as THREE from 'three';
import * as TX from './textures.js';
import { weather } from './realism.js';

export const U = {
  uFlood: { value: 0 },
  uFloodColor: { value: new THREE.Color(1.0, 0.55, 0.19) },
  uGlow: { value: 0 },
  uGlowColor: { value: new THREE.Color(1.0, 0.56, 0.24) },
  uTime: { value: 0 },
  uPoints: { value: [] },   // vec4: xyz position, w intensity
  uLamp: { value: 0 },
  uNightMap: { value: null },
};
const MAXP = 32;
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
  // the Danube terrace (in front of wings z=31, pavilions 40.6, risalit 45.4)
  a += uplight(vec3(clamp(P.x, -140.0, 140.0), 0.3, 50.0) - P, N, 26.0, 6.0) * scal;
  // Kossuth tér: before the wings' back façade (outside the east wing) and before the entrance block
  a += uplight(vec3(clamp(P.x, -110.0, 110.0), 0.3, -32.0) - P, N, 22.0, 6.0) * scal * smoothstep(36.0, 46.0, abs(P.x));
  a += uplight(vec3(clamp(P.x, -42.0, 42.0), 0.3, -88.0) - P, N, 22.0, 6.0) * scal;
  a += uplight(vec3(clamp(P.x, -45.0, 45.0), 0.3, -40.0) - P, N, 10.0, 6.0) * (1.0 - smoothstep(30.0, 34.0, abs(P.x)));
  // north and south ends
  a += uplight(vec3(150.0, 0.3, clamp(P.z, -30.0, 45.0)) - P, N, 18.0, 6.0);
  a += uplight(vec3(-150.0, 0.3, clamp(P.z, -30.0, 45.0)) - P, N, 18.0, 6.0);
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
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      #ifdef USE_FOG
      {
        // curtains / blinds behind some panes, slightly different glazing per window
        vec3 cell = floor(vHazeW * vec3(0.55, 0.26, 0.55));
        float hc = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        diffuseColor.rgb += vec3(0.085, 0.074, 0.062) * step(0.58, hc) * (0.5 + 0.9 * fract(hc * 7.0));
        roughnessFactor = clamp(roughnessFactor + (fract(hc * 13.0) - 0.5) * 0.05, 0.02, 0.3);
      }
      #endif`)
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

/** Street-lamp / floodlight spill on the ground at night (lightmap in world XZ). */
export function nightGround(mat, heightFall = 0) {
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uNightMap = U.uNightMap; sh.uniforms.uLampG = U.uLamp;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uNightMap;\nuniform float uLampG;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      #ifdef USE_FOG
      if (uLampG > 0.0) {
        vec2 nuv = (vHazeW.xz + 1024.0) / 2048.0;
        vec3 nl = texture2D(uNightMap, nuv).rgb;
        nl = nl * nl * 2.6;
        float hf = ${heightFall > 0 ? `exp(-max(vHazeW.y, 0.0) / ${heightFall.toFixed(1)})` : '1.0'};
        reflectedLight.directDiffuse += material.diffuseContribution * nl * uLampG * hf;
        reflectedLight.directSpecular += material.specularColorBlended * nl * uLampG * hf * 0.3;
      }
      #endif`);
  };
  mat.customProgramCacheKey = () => prevKey() + 'night' + heightFall;
  return mat;
}

export function createMaterials(q = { tex: 2048 }) {
  const t0 = performance.now();
  const ash = TX.stoneAshlar(q.tex, 6.4, 7, true);
  const fine = TX.stoneAshlar(q.tex >> 1, 3.2, 9, false);
  const roof = TX.roofTiles(q.tex >> 1, 2.4, 11, 'slate');
  const domeT = TX.roofTiles(q.tex >> 1, 2.0, 13, 'dome');
  const brk = TX.brick(q.tex >> 1, 4, 61);
  const zs = TX.zsolnay(256, 1.0);
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
  m.dark = patchFlood(std({ color: 0x6e6961, map: fine.map, roughness: 0.9 }), 0.5);
  m.shade = patchFlood(std({ color: 0x2e2a26, map: fine.map, roughness: 0.95, envMapIntensity: 0.4 }), 0.35); // shadowed recess / back walls
  // Maroon natural slate (fish-scale), slightly glossy
  m.roof = patchFlood(std({ color: 0xe8dcda, map: roof.map, normalMap: roof.normalMap, roughnessMap: roof.roughnessMap, roughness: 0.75, metalness: 0.05, envMapIntensity: 0.8 }), 0.5);
  m.domeRoof = patchFlood(std({ color: 0xf0e2df, map: domeT.map, normalMap: domeT.normalMap, roughnessMap: domeT.roughnessMap, roughness: 0.75, metalness: 0.05, envMapIntensity: 0.8 }), 0.85);
  m.lead = patchFlood(std({ color: 0x3b3537, roughness: 0.45, metalness: 0.55, envMapIntensity: 1.0 }), 0.5);
  m.brick = patchFlood(std({ map: brk.map, normalMap: brk.normalMap, roughnessMap: brk.roughnessMap, roughness: 1 }), 0.6);
  m.zsolnay = patchFlood(std({ map: zs.map, roughness: 0.25, metalness: 0.0, envMapIntensity: 1.2 }), 0.6);
  m.glass = patchGlass(std({ color: 0x0b0f12, roughness: 0.06, metalness: 0.2, envMapIntensity: 1.6, emissive: 0x000000 }));
  m.glass.userData.cast = false;
  m.gold = patchFlood(std({ color: 0xd9a54a, roughness: 0.28, metalness: 1.0, envMapIntensity: 1.2 }), 1.2);
  m.iron = patchFlood(std({ color: 0x23282a, roughness: 0.5, metalness: 0.7 }), 0.4);
  m.bronze = patchFlood(std({ color: 0x5c4a32, roughness: 0.42, metalness: 0.85 }), 0.6);
  m.copper = patchFlood(std({ color: 0x6b9c88, roughness: 0.62, metalness: 0.15, envMapIntensity: 0.9 }), 0.5);
  m.lampGlass = lampPatch(std({ color: 0xfff4e0, roughness: 0.2, emissive: new THREE.Color(1.0, 0.78, 0.5), emissiveIntensity: 6 }));
  m.paving = patchFlood(std({ map: pave.map, normalMap: pave.normalMap, roughnessMap: pave.roughnessMap, roughness: 1 }), 0.25);
  m.quay = patchFlood(std({ color: 0xa3a3a0, map: quay.map, normalMap: quay.normalMap, roughnessMap: quay.roughnessMap, roughness: 1 }), 0.5);
  m.road = std({ color: 0x8a8a8a, map: asph.map, roughnessMap: asph.roughnessMap, roughness: 1 });
  m.road.userData.cast = false;
  m.sett = std({ color: 0x9a948c, map: quay.map, normalMap: quay.normalMap, roughness: 0.9 });
  m.sett.userData.cast = false;
  m.poolWater = std({ color: 0x0a1418, roughness: 0.04, metalness: 0.9, envMapIntensity: 1.4 });
  m.poolWater.userData.cast = false;
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
  m.bark = std({ color: 0x6b6150, roughness: 1 });
  m.leaf = null; // set in main.js (needs a canvas texture)
  m.hill.userData.cast = false;
  m.grass.userData.cast = false;
  m.asphalt.userData.cast = false;
  m.paving.userData.cast = false;
  // world-space weathering (rain streaks, soot under overhangs, ledge dirt, splash zone, tonal variation)
  const LIME = { amount: 1.0, tint: 0.07, grime: [0.52, 0.49, 0.45] };
  weather(m.stone, LIME);
  weather(m.carve, { ...LIME, amount: 1.15, under: 1.3 });
  weather(m.statue, { ...LIME, amount: 1.3, under: 1.4, grime: [0.48, 0.46, 0.43] });
  weather(m.dark, { amount: 0.5, tint: 0.05 });
  weather(m.shade, { amount: 0.4, tint: 0.05 });
  weather(m.roof, { amount: 0.35, tint: 0.14, grime: [1.28, 1.24, 1.18], under: 0, top: 0.4, base: 0 });
  weather(m.domeRoof, { amount: 0.25, tint: 0.1, grime: [1.2, 1.17, 1.12], under: 0, top: 0.3, base: 0 });
  weather(m.copper, { amount: 0.6, tint: 0.2, grime: [0.72, 0.82, 0.78], under: 0.4, top: 0.2, base: 0 });
  weather(m.lead, { amount: 0.3, tint: 0.1, grime: [1.15, 1.15, 1.12], base: 0 });
  weather(m.brick, { amount: 0.7, tint: 0.1, grime: [0.6, 0.56, 0.52] });
  weather(m.quay, { amount: 0.9, tint: 0.12, grime: [0.55, 0.55, 0.5], top: 0.2 });
  weather(m.paving, { amount: 0.5, tint: 0.14, grime: [0.72, 0.7, 0.66], streak: 0, under: 0, base: 0 });
  weather(m.road, { amount: 0.4, tint: 0.16, grime: [0.8, 0.8, 0.8], streak: 0, under: 0, base: 0 });
  weather(m.asphalt, { amount: 0.4, tint: 0.16, grime: [0.8, 0.8, 0.8], streak: 0, under: 0, base: 0 });
  weather(m.sett, { amount: 0.4, tint: 0.12, streak: 0, under: 0, base: 0 });
  weather(m.grass, { amount: 0.0, tint: 0.3, streak: 0, under: 0, top: 0, base: 0 });
  weather(m.tree, { amount: 0.0, tint: 0.35, streak: 0, under: 0, top: 0, base: 0 });
  weather(m.cityRoof, { amount: 0.4, tint: 0.2, grime: [0.75, 0.72, 0.7], under: 0, base: 0 });
  weather(m.cityTile, { amount: 0.4, tint: 0.2, grime: [0.7, 0.68, 0.65], under: 0, base: 0 });
  weather(m.hill, { amount: 0.0, tint: 0.35, streak: 0, under: 0, top: 0, base: 0 });
  for (const k of ['asphalt', 'road', 'paving', 'quay', 'sett', 'grass']) nightGround(m[k], k === 'quay' ? 4 : 0);
  for (const [k, v] of Object.entries(m)) if (v && v.isMaterial) v.name = k;
  m.textures = { ash, fine, roof, domeT, brk, zs, pave, quay, grass, asph, city };
  return m;
}
