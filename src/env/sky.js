// Analytic sky: Rayleigh-like gradient, Mie sun glow, procedural fbm clouds lit
// by the sun, stars and moon for night. The same shader renders the background
// and (via PMREM) the image-based lighting environment.
import * as THREE from 'three';

const vert = /* glsl */`
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = normalize(wp.xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const frag = /* glsl */`
uniform vec3 uSunDir;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uHorizonAway;
uniform vec3 uGround;
uniform vec3 uSunColor;
uniform float uSunSize;
uniform float uGlow;
uniform float uStars;
uniform float uCloud;
uniform vec3 uCloudLit;
uniform vec3 uCloudDark;
uniform float uTime;
uniform vec3 uMoonDir;
uniform float uMoon;
uniform float uHaze;
varying vec3 vDir;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  float t = clamp(h, 0.0, 1.0);
  float cs = max(dot(d, uSunDir), 0.0);
  // horizon colour shifts from the sun side to the opposite side of the sky
  vec2 sh = normalize(uSunDir.xz + 1e-4), dh = normalize(d.xz + 1e-4);
  float toward = 0.5 + 0.5 * dot(sh, dh);
  vec3 hor = mix(uHorizonAway, uHorizon, pow(toward, 1.6));
  vec3 sky = mix(hor, uZenith, 1.0 - exp(-t * 5.5));
  // horizon haze band
  sky = mix(sky, hor * 1.05, exp(-abs(h) * 22.0) * uHaze);
  // broad warm glow around the sun (stronger near horizon)
  sky += uSunColor * uGlow * (pow(cs, 6.0) * 0.35 + pow(cs, 48.0) * 0.6) * (0.6 + 0.4 * (1.0 - t));
  // sun disc
  sky += uSunColor * smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.6, cs) * 40.0 * step(-0.02, uSunDir.y);
  // stars: jittered points on a fine direction grid, magnitude distribution, twinkle
  if (uStars > 0.0 && h > 0.0) {
    vec3 sd = d * 220.0;
    vec3 ci = floor(sd);
    vec3 cf = fract(sd);
    float r = h21(ci.xy + ci.z * 17.13);
    vec3 sp = vec3(h21(ci.yz + 3.7), h21(ci.zx + 9.1), h21(ci.xy + 1.3)) * 0.7 + 0.15;
    float dd = length(cf - sp);
    float mag = pow(h21(ci.xz + 5.5), 6.0);
    float tw = 0.75 + 0.25 * sin(uTime * 1.7 + r * 60.0);
    float star = step(0.985, r) * smoothstep(0.12, 0.0, dd) * (0.3 + mag * 6.0) * tw;
    sky += vec3(0.9, 0.93, 1.0) * star * uStars * smoothstep(0.02, 0.3, h);
  }
  // moon
  if (uMoon > 0.0) {
    float cm = dot(d, normalize(uMoonDir));
    sky += vec3(0.9, 0.92, 1.0) * smoothstep(0.99955, 0.9997, cm) * 6.0 * uMoon;
    sky += vec3(0.4, 0.5, 0.7) * pow(max(cm, 0.0), 300.0) * 0.4 * uMoon;
  }
  // clouds on a virtual plane
  if (uCloud > 0.0 && h > 0.01) {
    vec2 uv = d.xz / (h + 0.08) * 1.6 + vec2(uTime * 0.004, uTime * 0.002);
    float n = fbm(uv * 1.2);
    float n2 = fbm(uv * 3.1 + 5.0);
    float cov = smoothstep(1.0 - uCloud, 1.0 - uCloud + 0.35, n * 0.8 + n2 * 0.3);
    float lit = clamp(0.55 + 0.6 * (fbm(uv * 1.2 + uSunDir.xz * 0.15) - n), 0.0, 1.0);
    vec3 cc = mix(uCloudDark, uCloudLit, lit);
    cc += uSunColor * uGlow * pow(cs, 8.0) * 0.5 * cov;
    float fade = smoothstep(0.0, 0.12, h);
    sky = mix(sky, cc, cov * fade * 0.92);
  }
  // below horizon
  if (h < 0.0) sky = mix(uHorizon, uGround, smoothstep(0.0, 0.1, -h));
  gl_FragColor = vec4(sky, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createSky() {
  const uniforms = {
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uHorizonAway: { value: new THREE.Color() }, uGround: { value: new THREE.Color() },
    uSunColor: { value: new THREE.Color() }, uSunSize: { value: 0.0004 }, uGlow: { value: 1 },
    uStars: { value: 0 }, uCloud: { value: 0.4 }, uCloudLit: { value: new THREE.Color() }, uCloudDark: { value: new THREE.Color() },
    uTime: { value: 0 }, uMoonDir: { value: new THREE.Vector3(0.3, 0.5, -0.8) }, uMoon: { value: 0 }, uHaze: { value: 0.5 },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, side: THREE.BackSide, depthWrite: false, depthTest: true });
  mat.toneMapped = false; // sky renders into the HDR target; OutputPass tone-maps the whole frame
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return { mesh, uniforms };
}
