// Sky dome driven by the physical scattering LUT (atmosphere.js): limb-darkened
// sun disc, domain-warped clouds lit by the transmitted sun and the sky ambient,
// twilight glow, airglow, Budapest's light pollution, moon and stars.
import * as THREE from 'three';

const vert = /* glsl */`
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = normalize(wp.xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const frag = /* glsl */`
uniform sampler2D uLut;
uniform vec3 uSunDir; uniform vec3 uSunDisc; uniform float uSunSize;
uniform vec3 uTwi; uniform vec3 uTwiGlow;
uniform vec3 uNightZen; uniform vec3 uNightHor;
uniform float uCloud; uniform vec3 uCloudSun; uniform vec3 uCloudAmb;
uniform float uStars; uniform vec3 uMoonDir; uniform float uMoon;
uniform vec3 uGround; uniform float uTime;
varying vec3 vDir;
const float PI = 3.14159265;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { s += a * vn(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
vec3 lut(vec3 d) {
  float az = atan(d.x, d.z);
  float el = asin(clamp(d.y, 0.0, 1.0));
  return texture2D(uLut, vec2(az / (2.0 * PI) + 0.5, sqrt(el / (0.5 * PI)))).rgb;
}
float clouds(vec2 uv) {
  vec2 w = vec2(fbm(uv * 0.7 + 3.1), fbm(uv * 0.7 + 8.7));
  float n = fbm(uv + w * 1.4);
  return smoothstep(1.0 - uCloud, 1.0 - uCloud + 0.28, n);
}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 sky = lut(d);
  float elev = max(h, 0.0);
  // twilight glow (multiple scattering when the sun is below the horizon)
  vec2 sh = normalize(uSunDir.xz + 1e-5), dh = normalize(d.xz + 1e-5);
  float toward = max(dot(sh, dh), 0.0);
  sky += uTwi * (0.55 + 0.45 * (1.0 - elev)) + uTwiGlow * pow(toward, 4.0) * exp(-elev * 9.0);
  // night: airglow + city light pollution towards the horizon
  sky += mix(uNightHor, uNightZen, pow(elev, 0.35));
  // sun disc with limb darkening
  float cs = dot(d, uSunDir);
  float r = clamp((1.0 - cs) / uSunSize, 0.0, 1.0);
  if (r < 1.0 && uSunDir.y > -0.03) sky += uSunDisc * (1.0 - 0.6 * (1.0 - sqrt(1.0 - r * r))) * smoothstep(1.0, 0.9, r);
  // stars (point-like, magnitude distribution, twinkle near the horizon)
  if (uStars > 0.0 && h > 0.0) {
    vec3 sd = d * 260.0; vec3 ci = floor(sd), cf = fract(sd);
    float rr = h21(ci.xy + ci.z * 17.13);
    vec3 sp = vec3(h21(ci.yz + 3.7), h21(ci.zx + 9.1), h21(ci.xy + 1.3)) * 0.7 + 0.15;
    float dd = length(cf - sp), mag = pow(h21(ci.xz + 5.5), 7.0);
    float tw = 1.0 - (0.35 * (1.0 - elev)) * (0.5 + 0.5 * sin(uTime * 3.0 + rr * 60.0));
    vec3 tint = mix(vec3(1.0, 0.85, 0.7), vec3(0.75, 0.85, 1.0), h21(ci.zy));
    sky += tint * step(0.984, rr) * smoothstep(0.1, 0.0, dd) * (0.004 + mag * 0.08) * tw * uStars * smoothstep(0.02, 0.3, h);
  }
  // moon disc and halo
  if (uMoon > 0.0) {
    float cm = dot(d, normalize(uMoonDir));
    sky += vec3(0.85, 0.88, 0.95) * smoothstep(0.99985, 0.99992, cm) * 0.35 * uMoon;
    sky += vec3(0.35, 0.42, 0.6) * pow(max(cm, 0.0), 600.0) * 0.012 * uMoon;
  }
  // clouds on a curved layer, lit by the transmitted sun (silver lining) and the sky
  if (uCloud > 0.0 && h > 0.005) {
    vec2 uv = d.xz / (h + 0.06) * 1.25 + vec2(uTime * 0.003, uTime * 0.0015);
    float c = clouds(uv);
    if (c > 0.001) {
      float th = clouds(uv + uSunDir.xz * 0.12); // self-shadow toward the sun
      float mu = dot(d, uSunDir);
      float hg = (1.0 - 0.36) / pow(1.0 + 0.36 - 1.2 * mu, 1.5);
      vec3 lit = uCloudSun * (0.35 + 0.25 * hg) * (1.0 - 0.7 * th) + uCloudAmb * (0.9 - 0.3 * c);
      vec3 hor = lut(normalize(vec3(d.x, 0.02, d.z)));
      lit = mix(lit, hor, smoothstep(0.25, 0.0, h) * 0.6); // aerial perspective on far clouds
      sky = mix(sky, lit, c * smoothstep(0.005, 0.08, h) * 0.95);
    }
  }
  if (h < 0.0) sky = mix(lut(normalize(vec3(d.x, 0.0, d.z))), uGround, smoothstep(0.0, 0.06, -h));
  gl_FragColor = vec4(sky, 1.0);
}`;

export function createSky(lutTexture) {
  const uniforms = {
    uLut: { value: lutTexture },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunDisc: { value: new THREE.Color() }, uSunSize: { value: 0.00004 },
    uTwi: { value: new THREE.Color(0, 0, 0) }, uTwiGlow: { value: new THREE.Color(0, 0, 0) },
    uNightZen: { value: new THREE.Color(0, 0, 0) }, uNightHor: { value: new THREE.Color(0, 0, 0) },
    uCloud: { value: 0.4 }, uCloudSun: { value: new THREE.Color() }, uCloudAmb: { value: new THREE.Color() },
    uStars: { value: 0 }, uMoonDir: { value: new THREE.Vector3(0.3, 0.5, -0.8) }, uMoon: { value: 0 },
    uGround: { value: new THREE.Color(0.02, 0.02, 0.02) }, uTime: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, side: THREE.BackSide, depthWrite: false, depthTest: true });
  mat.toneMapped = false;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(5000, 64, 32), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return { mesh, uniforms };
}
