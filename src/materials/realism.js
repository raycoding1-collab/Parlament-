// Photographic realism layer shared by every material:
//  * aerial perspective — the fog chunk is replaced by height-dependent haze with
//    colour-dependent extinction and a forward-scattering glow towards the sun
//    (direction and colour taken from the scene's directional light);
//  * weathering — world-space stone tint variation, rain streaks on vertical
//    faces, soot under overhangs, dirt on ledges and a splash zone at the base,
//    so no two instanced bays look identical.
import * as THREE from 'three';

export function installHaze() {
  THREE.ShaderChunk.fog_pars_vertex = '#ifdef USE_FOG\n varying vec3 vHazeW;\n#endif';
  THREE.ShaderChunk.fog_vertex = `#ifdef USE_FOG
  {
    vec4 hw = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      hw = instanceMatrix * hw;
    #endif
    hw = modelMatrix * hw;
    vHazeW = hw.xyz;
  }
#endif`;
  THREE.ShaderChunk.fog_pars_fragment = `#ifdef USE_FOG
  uniform vec3 fogColor;
  varying vec3 vHazeW;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`;
  THREE.ShaderChunk.fog_fragment = `#ifdef USE_FOG
  {
    vec3 hv = vHazeW - cameraPosition;
    float hd = length(hv);
    vec3 hr = hv / max(hd, 1e-3);
    const float HH = 650.0;
    float h0 = max(cameraPosition.y + 12.0, 0.0), h1 = max(vHazeW.y + 12.0, 0.0), dh = h1 - h0;
    float avgD = abs(dh) < 0.5 ? exp(-h0 / HH) : (exp(-h0 / HH) - exp(-h1 / HH)) * HH / dh;
    #ifdef FOG_EXP2
      float od = fogDensity * hd * avgD;
    #else
      float od = smoothstep(fogNear, fogFar, hd) * 3.0;
    #endif
    vec3 T = exp(-od * vec3(0.86, 1.0, 1.2));
    vec3 ins = fogColor;
    #if NUM_DIR_LIGHTS > 0
      vec3 sdir = normalize((vec4(directionalLights[0].direction, 0.0) * viewMatrix).xyz);
      float mu = dot(hr, sdir);
      float g = 0.74;
      float ph = (1.0 - g * g) / pow(max(1.0 + g * g - 2.0 * g * mu, 1e-4), 1.5) / 12.566;
      ins += directionalLights[0].color * ph * 0.06;
    #endif
    gl_FragColor.rgb = gl_FragColor.rgb * T + ins * (1.0 - T);
  }
#endif`;
}

const WEATHER_GLSL = /* glsl */`
float wHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float wNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(wHash(i), wHash(i + vec3(1, 0, 0)), f.x), mix(wHash(i + vec3(0, 1, 0)), wHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(wHash(i + vec3(0, 0, 1)), wHash(i + vec3(1, 0, 1)), f.x), mix(wHash(i + vec3(0, 1, 1)), wHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float wFbm(vec3 p) { return 0.55 * wNoise(p) + 0.3 * wNoise(p * 2.1 + 5.3) + 0.15 * wNoise(p * 4.3 + 9.1); }
`;

/**
 * Add world-space weathering to a MeshStandardMaterial.
 * cfg: { amount, tint, grime:[r,g,b], streak, under, top, base }
 */
export function weather(mat, cfg) {
  const c = { amount: 1, tint: 0.1, grime: [0.55, 0.52, 0.48], streak: 1, under: 1, top: 1, base: 1, ...cfg };
  const key = 'w' + JSON.stringify(c);
  const f = (v) => Number(v).toFixed(4);
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + WEATHER_GLSL)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      #ifdef USE_FOG
      {
        vec3 wp = vHazeW;
        vec3 wn = normalize((vec4(nonPerturbedNormal, 0.0) * viewMatrix).xyz);
        float big = wFbm(wp * 0.028);
        float mid = wNoise(wp * 0.13 + 7.3);
        float str = wFbm(vec3(wp.x * 0.8, wp.y * 0.05, wp.z * 0.8) + 3.1);
        float vert = 1.0 - smoothstep(0.55, 0.9, abs(wn.y));
        float dirt = smoothstep(0.5, 0.82, str) * 0.6 * vert * ${f(c.streak)};
        dirt += smoothstep(-0.2, -0.85, wn.y) * 0.5 * ${f(c.under)};
        dirt += smoothstep(0.6, 0.95, wn.y) * 0.22 * ${f(c.top)};
        dirt += (1.0 - smoothstep(0.0, 3.2, wp.y)) * 0.32 * vert * ${f(c.base)};
        dirt = clamp(dirt * ${f(c.amount)} * (0.55 + 0.9 * mid), 0.0, 0.85);
        float tint = (big - 0.5) * ${f(c.tint)} * 2.0 + (mid - 0.5) * ${f(c.tint)};
        diffuseColor.rgb *= 1.0 + tint;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(${c.grime.map(f).join(', ')}), dirt);
        roughnessFactor = clamp(roughnessFactor + dirt * 0.08, 0.04, 1.0);
      }
      #endif`);
  };
  mat.customProgramCacheKey = () => prevKey() + key;
  return mat;
}
