// The Danube: planar reflection (Reflector render target in HDR) distorted by
// multi-octave procedural wave normals, Fresnel blend with the river's deep
// green-grey body colour, sun/moon glitter and depth fog.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

const WaterShader = {
  name: 'DanubeWater',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color(1, 1, 1) },
    uDeep: { value: new THREE.Color(0.02, 0.05, 0.05) },
    uSkyTint: { value: new THREE.Color(0.3, 0.4, 0.5) },
    uDistort: { value: 0.035 },
    uFogColor: { value: new THREE.Color() },
    uFogDensity: { value: 0.0 },
    uReflect: { value: 1.0 },
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vWorld;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorld = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform vec3 uDeep;
    uniform vec3 uSkyTint;
    uniform float uDistort;
    uniform vec3 uFogColor;
    uniform float uFogDensity;
    uniform float uReflect;
    varying vec4 vUv;
    varying vec3 vWorld;
    vec2 h22(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return -1.0 + 2.0 * fract(sin(p) * 43758.5453); }
    float gnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(dot(h22(i), f), dot(h22(i+vec2(1,0)), f-vec2(1,0)), u.x), mix(dot(h22(i+vec2(0,1)), f-vec2(0,1)), dot(h22(i+vec2(1,1)), f-vec2(1,1)), u.x), u.y); }
    float gDist;
    float waves(vec2 p) {
      // the Danube flows along X: stretch noise across the current and drift it;
      // fine octaves fade with distance (no sub-pixel sparkle)
      float t = uTime;
      float s = 0.0;
      s += gnoise(p * vec2(0.05, 0.09) + vec2(t * 0.09, 0.0)) * 1.0;
      s += gnoise(p * vec2(0.14, 0.22) + vec2(t * 0.22, t * 0.03)) * 0.45;
      s += gnoise(p * vec2(0.42, 0.6) + vec2(t * 0.5, -t * 0.05)) * 0.2 * clamp(1.0 - gDist / 900.0, 0.0, 1.0);
      s += gnoise(p * vec2(1.2, 1.6) + vec2(t * 0.9, t * 0.1)) * 0.08 * clamp(1.0 - gDist / 350.0, 0.0, 1.0);
      s += gnoise(p * vec2(3.2, 4.0) + vec2(t * 1.6, 0.0)) * 0.035 * clamp(1.0 - gDist / 120.0, 0.0, 1.0);
      return s;
    }
    void main() {
      vec2 p = vWorld.xz;
      gDist = length(cameraPosition - vWorld);
      float e = 0.08 + gDist * 0.0015;
      float h0 = waves(p);
      vec3 n = normalize(vec3(-(waves(p + vec2(e, 0.0)) - h0) / e * 0.5, 1.0, -(waves(p + vec2(0.0, e)) - h0) / e * 0.5));
      vec3 V = normalize(cameraPosition - vWorld);
      float dist = length(cameraPosition - vWorld);
      // reflection lookup with normal-based distortion (less at distance)
      vec2 off = n.xz * uDistort * (0.35 + 0.65 * clamp(60.0 / dist, 0.0, 1.0)) * 3.0;
      vec4 uv = vUv; uv.xy += off * uv.w;
      vec3 refl = texture2DProj(tDiffuse, uv).rgb;
      float cosT = clamp(dot(n, V), 0.0, 1.0);
      float F = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);
      F = mix(0.25, 1.0, F) * uReflect;
      vec3 body = uDeep + uSkyTint * 0.08 * (0.5 + 0.5 * n.x);
      vec3 col = mix(body, refl, clamp(F, 0.0, 1.0));
      // glitter of the sun / moon
      vec3 H = normalize(uSunDir + V);
      float spec = pow(max(dot(n, H), 0.0), 900.0) * 30.0 + pow(max(dot(n, H), 0.0), 120.0) * 0.6;
      col += uSunColor * spec * step(0.0, uSunDir.y + 0.05);
      float fog = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
      col = mix(col, uFogColor, fog);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function createWater(size = 1024) {
  const geo = new THREE.PlaneGeometry(16000, 3000);
  const water = new Reflector(geo, { textureWidth: size, textureHeight: size, clipBias: 0.002, shader: WaterShader, multisample: 4 });
  water.rotation.x = -Math.PI / 2;
  // keep HDR values in the reflection so night floodlights bloom in the river
  const rt = water.getRenderTarget();
  rt.texture.type = THREE.HalfFloatType;
  rt.texture.colorSpace = THREE.LinearSRGBColorSpace;
  return water;
}
