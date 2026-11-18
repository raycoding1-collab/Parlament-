// Physically based sky: single scattering through a spherical atmosphere with
// Rayleigh, Mie and ozone, rendered into an HDR equirect texture whenever the sun
// moves. The same model runs on the CPU to give the sun's transmitted colour,
// the haze (aerial perspective) colours and the ambient level, so lighting,
// sky, fog and water all agree.
import * as THREE from 'three';

const Re = 6360e3, Ra = 6460e3, Hr = 8000, Hm = 1200;
const bR = [5.802e-6, 13.558e-6, 33.1e-6], bO = [0.650e-6, 1.881e-6, 0.085e-6];
const BM = 3.996e-6, BME = 4.44e-6;

// ---------------------------------------------------------------- CPU model
function raySphere(ro, rd, r) {
  const b = ro[0] * rd[0] + ro[1] * rd[1] + ro[2] * rd[2];
  const c = ro[0] * ro[0] + ro[1] * ro[1] + ro[2] * ro[2] - r * r;
  const d = b * b - c; if (d < 0) return null; const s = Math.sqrt(d); return [-b - s, -b + s];
}
const dens = (h, turb) => [Math.exp(-h / Hr), Math.exp(-h / Hm) * turb, Math.max(0, 1 - Math.abs(h - 25000) / 15000)];
function transmittance(p, L, turb, steps = 24) {
  const g = raySphere(p, L, Re); if (g && g[0] > 0) return [0, 0, 0];
  const t = raySphere(p, L, Ra); const ds = t[1] / steps; const od = [0, 0, 0];
  for (let i = 0; i < steps; i++) {
    const q = [p[0] + L[0] * (i + 0.5) * ds, p[1] + L[1] * (i + 0.5) * ds, p[2] + L[2] * (i + 0.5) * ds];
    const d = dens(Math.hypot(q[0], q[1], q[2]) - Re, turb);
    od[0] += d[0] * ds; od[1] += d[1] * ds; od[2] += d[2] * ds;
  }
  return [0, 1, 2].map(k => Math.exp(-(bR[k] * od[0] + BME * od[1] + bO[k] * od[2])));
}
/** Sun transmittance at the observer (RGB 0…1). */
export function sunTransmittance(sunDir, turb = 1) {
  return transmittance([0, Re + 120, 0], [sunDir.x, sunDir.y, sunDir.z], turb);
}
/** Single-scattered sky radiance for a view direction (relative units, sun radiance = I). */
export function skyRadiance(dir, sunDir, I, turb = 1, steps = 16) {
  const ro = [0, Re + 120, 0], rd = [dir.x, dir.y, dir.z], L = [sunDir.x, sunDir.y, sunDir.z];
  let tmax = raySphere(ro, rd, Ra)[1]; const g = raySphere(ro, rd, Re); if (g && g[0] > 0) tmax = g[0];
  const mu = rd[0] * L[0] + rd[1] * L[1] + rd[2] * L[2];
  const pR = 3 / (16 * Math.PI) * (1 + mu * mu), gg = 0.76;
  const pM = 3 / (8 * Math.PI) * ((1 - gg * gg) * (1 + mu * mu)) / ((2 + gg * gg) * Math.pow(1 + gg * gg - 2 * gg * mu, 1.5));
  const od = [0, 0, 0], sR = [0, 0, 0], sM = [0, 0, 0];
  let tPrev = 0;
  for (let i = 0; i < steps; i++) {
    const t1 = tmax * Math.pow((i + 1) / steps, 2), dt = t1 - tPrev, tm = (tPrev + t1) / 2; tPrev = t1;
    const p = [ro[0] + rd[0] * tm, ro[1] + rd[1] * tm, ro[2] + rd[2] * tm];
    const d = dens(Math.hypot(p[0], p[1], p[2]) - Re, turb);
    od[0] += d[0] * dt; od[1] += d[1] * dt; od[2] += d[2] * dt;
    const Tl = transmittance(p, L, turb, 8);
    for (let k = 0; k < 3; k++) {
      const Tv = Math.exp(-(bR[k] * od[0] + BME * od[1] + bO[k] * od[2]));
      sR[k] += Tl[k] * Tv * d[0] * dt; sM[k] += Tl[k] * Tv * d[1] * dt;
    }
  }
  return [0, 1, 2].map(k => I * (sR[k] * bR[k] * pR + sM[k] * BM * pM) * 1.25);
}

// ---------------------------------------------------------------- GPU sky LUT
const lutFrag = /* glsl */`
precision highp float;
uniform vec3 uSun; uniform float uSunI; uniform float uTurb;
uniform vec3 uMoon; uniform float uMoonI;
varying vec2 vUv;
const float PI = 3.14159265, Re = 6360e3, Ra = 6460e3, Hr = 8000.0, Hm = 1200.0;
const vec3 bR = vec3(5.802e-6, 13.558e-6, 33.1e-6), bO = vec3(0.650e-6, 1.881e-6, 0.085e-6);
const float BM = 3.996e-6, BME = 4.44e-6;
vec2 rs(vec3 ro, vec3 rd, float r) { float b = dot(ro, rd), c = dot(ro, ro) - r * r, d = b * b - c; if (d < 0.0) return vec2(-1.0); d = sqrt(d); return vec2(-b - d, -b + d); }
vec3 dens(float h) { return vec3(exp(-h / Hr), exp(-h / Hm) * uTurb, max(0.0, 1.0 - abs(h - 25000.0) / 15000.0)); }
vec3 trans(vec3 p, vec3 L) {
  vec2 g = rs(p, L, Re); if (g.x > 0.0) return vec3(0.0);
  float ds = rs(p, L, Ra).y / 8.0; vec3 od = vec3(0.0);
  for (int i = 0; i < 8; i++) { vec3 q = p + L * (float(i) + 0.5) * ds; od += dens(length(q) - Re) * ds; }
  return exp(-(bR * od.x + BME * od.y + bO * od.z));
}
vec3 scatter(vec3 rd, vec3 L, float I) {
  if (I <= 0.0) return vec3(0.0);
  vec3 ro = vec3(0.0, Re + 120.0, 0.0);
  float tmax = rs(ro, rd, Ra).y; vec2 g = rs(ro, rd, Re); if (g.x > 0.0) tmax = g.x;
  float mu = dot(rd, L), gg = 0.76;
  float pR = 3.0 / (16.0 * PI) * (1.0 + mu * mu);
  float pM = 3.0 / (8.0 * PI) * ((1.0 - gg * gg) * (1.0 + mu * mu)) / ((2.0 + gg * gg) * pow(1.0 + gg * gg - 2.0 * gg * mu, 1.5));
  vec3 od = vec3(0.0), sR = vec3(0.0), sM = vec3(0.0); float tPrev = 0.0;
  for (int i = 0; i < 32; i++) {
    float t1 = tmax * pow((float(i) + 1.0) / 32.0, 2.0), dt = t1 - tPrev, tm = 0.5 * (tPrev + t1); tPrev = t1;
    vec3 p = ro + rd * tm; vec3 d = dens(length(p) - Re) * dt; od += d;
    vec3 T = trans(p, L) * exp(-(bR * od.x + BME * od.y + bO * od.z));
    sR += T * d.x; sM += T * d.y;
  }
  return I * (sR * bR * pR + sM * BM * pM) * 1.25;
}
void main() {
  // u: azimuth, v: elevation mapped with more resolution near the horizon
  float az = (vUv.x - 0.5) * 2.0 * PI;
  float el = (vUv.y * vUv.y) * 0.5 * PI;
  vec3 rd = vec3(cos(el) * sin(az), sin(el), cos(el) * cos(az));
  vec3 c = scatter(rd, uSun, uSunI) + scatter(rd, uMoon, uMoonI);
  gl_FragColor = vec4(c, 1.0);
}`;

export function createAtmosphere(renderer) {
  const rt = new THREE.WebGLRenderTarget(512, 256, { type: THREE.HalfFloatType, depthBuffer: false });
  rt.texture.wrapS = THREE.RepeatWrapping; rt.texture.magFilter = rt.texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: lutFrag,
    uniforms: { uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunI: { value: 20 }, uTurb: { value: 1 }, uMoon: { value: new THREE.Vector3(0, -1, 0) }, uMoonI: { value: 0 } },
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  const sc = new THREE.Scene(); sc.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    texture: rt.texture,
    update(sunDir, sunI, turb, moonDir, moonI) {
      mat.uniforms.uSun.value.copy(sunDir); mat.uniforms.uSunI.value = sunI; mat.uniforms.uTurb.value = turb;
      mat.uniforms.uMoon.value.copy(moonDir); mat.uniforms.uMoonI.value = moonI;
      const prev = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.render(sc, cam); renderer.setRenderTarget(prev);
    },
  };
}
