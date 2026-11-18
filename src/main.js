// Országház — interactive, physically lit procedural model of the Hungarian Parliament.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { AccumPass, GradePass } from './core/passes.js';
import { createMaterials, U, nightGround } from './materials/materials.js';
import { installHaze, weather } from './materials/realism.js';
installHaze();
import { Kit } from './geo/kit.js';
import { buildBuilding2 } from './arch/building2.js';
import { buildSite2, LEVEL } from './env/site2.js';
import { leafTexture } from './env/site.js';
import { createSky } from './env/sky.js';
import { createAtmosphere, sunTransmittance, skyRadiance } from './env/atmosphere.js';
import { createWater } from './env/water.js';
import { PRESETS, VIEWS, sunDir } from './presets.js';

const params = new URLSearchParams(location.search);
const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || Math.min(screen.width, screen.height) < 600;
const Q = {
  high: { tex: 2048, shadow: 4096, dpr: Math.min(devicePixelRatio, 2), ao: true, refl: 1024, reflDetail: true, samples: 4 },
  medium: { tex: 1024, shadow: 2048, dpr: Math.min(devicePixelRatio, 1.5), ao: false, refl: 512, reflDetail: false, samples: 4 },
  low: { tex: 1024, shadow: 1024, dpr: 1, ao: false, refl: 256, reflDetail: false, samples: 0 },
};
let qualityName = params.get('q') || (isMobile ? 'medium' : 'high');
let quality = Q[qualityName] || Q.high;

const ui = {
  load: document.getElementById('loading'),
  bar: document.getElementById('bar'),
  status: document.getElementById('status'),
};
const step = async (msg, pct) => {
  console.log('step', (performance.now() / 1000).toFixed(1), msg);
  if (ui.status) ui.status.textContent = msg;
  if (ui.bar) ui.bar.style.width = pct + '%';
  await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
};

// ------------------------------------------------------------------ renderer
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') });
renderer.setPixelRatio(quality.dpr);
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 1.5, 14000);
camera.layers.enable(1);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 25;
controls.maxDistance = 2600;
controls.maxPolarAngle = Math.PI * 0.53;

let composer, renderPass, gtao, bloom, smaa, output, water, sky, sun, hemi, flag, pmrem, envRT, atm, accum, grade;
let currentPreset = params.get('preset') || 'golden';
let building, envGroup;

async function init() {
  await step('Carving limestone & firing roof tiles…', 4);
  const mats = createMaterials(quality);
  // tinted plaster variants for the Pest apartment blocks
  const tints = [0xd9d0c0, 0xcbbd9f, 0xbdb9b2, 0xd6c8ac, 0xc9b5a4];
  tints.forEach((c, i) => { const m = mats.city.clone(); m.color.set(c); m.userData.isCity = true; weather(m, { amount: 0.9, tint: 0.16, grime: [0.6, 0.57, 0.53] }); nightGround(m, 7); mats['city' + i] = m; });
  mats.cityAll = tints.map((_, i) => mats['city' + i]);
  mats.leaf = new THREE.MeshStandardMaterial({ name: 'leaf', map: leafTexture(), alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.78, color: 0xe2e6c8 });
  weather(mats.leaf, { amount: 0, tint: 0.35, streak: 0, under: 0, top: 0, base: 0 });

  await step('Laying out the plan: wings, courtyards, chambers…', 18);
  const kit = new Kit(mats);
  buildBuilding2(kit);
  await step('Raising the dome, towers and pinnacles…', 40);
  building = kit.build();
  building.name = 'Orszaghaz';
  scene.add(building);
  await step('Building the embankment, Kossuth tér, Pest and Buda…', 55);
  const kitE = new Kit(mats);
  const site = buildSite2(kitE, mats, U);
  await step('Instancing geometry…', 68);
  envGroup = kitE.build();
  envGroup.name = 'Budapest';
  scene.add(envGroup);
  flag = site.flag; scene.add(flag);
  // national flags on the two chamber halls' flagpoles (S3)
  for (const sx of [-1, 1]) { const f = flag.clone(); f.scale.setScalar(0.32); f.position.set(sx * 60.9 + 0.1, 53.4, 6.6); scene.add(f); }
  U.uNightMap.value = site.nightMap;
  console.log('stats', JSON.stringify(building.userData.stats), JSON.stringify(envGroup.userData.stats));
  console.log('report', JSON.stringify(building.userData.report.slice(0, 14)));

  atm = createAtmosphere(renderer);
  sky = createSky(atm.texture);
  scene.add(sky.mesh);
  water = createWater(quality.refl);
  const getRC = water.getReflectionCamera;
  water.getReflectionCamera = function (cam) { const rc = getRC.call(this, cam); rc.layers.mask = quality.reflDetail ? cam.layers.mask : 1; return rc; };
  water.position.y = LEVEL.water;
  water.position.z = 230;
  scene.add(water);
  // render the reflection only once per frame (GTAO re-renders the scene)
  const origBefore = water.onBeforeRender;
  let lastFrame = -1;
  water.onBeforeRender = function (r, s, c, ...rest) {
    if (frameNo === lastFrame || c !== camera) return;
    lastFrame = frameNo;
    origBefore.call(this, r, s, c, ...rest);
  };

  sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadow, quality.shadow);
  const sc = sun.shadow.camera;
  sc.left = -210; sc.right = 210; sc.top = 210; sc.bottom = -210; sc.near = 10; sc.far = 1200;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.06;
  scene.add(sun, sun.target);
  hemi = new THREE.HemisphereLight(0xbfd4ff, 0x40362c, 0.0);
  scene.add(hemi);
  pmrem = new THREE.PMREMGenerator(renderer);

  // floodlight projector positions (roof-mounted) for dome, towers, chambers
  const pts = [];
  const DZ = 7.8; // dome axis (OSM plan)
  // dome: projectors on the terrace round the drum, on the arm roofs, and on the drum balustrade for the shell
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; pts.push([Math.sin(a) * 24, 29.5, DZ + Math.cos(a) * 24, 0.4]); }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; pts.push([Math.sin(a) * 16.5, 53.5, DZ + Math.cos(a) * 16.5, 0.28]); }
  // dedicated dome projectors (aimed at the shell from the surrounding roofs)
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; pts.push([Math.sin(a) * 30, 60, DZ + Math.cos(a) * 30, 1.25]); }
  pts.push([0, 22, 150, 6.0]);    // long-throw projector on the Danube quay
  pts.push([0, 20, -150, 4.0]);   // from Kossuth tér
  // chamber halls and their turrets, front towers, end blocks
  for (const sx of [-1, 1]) { pts.push([sx * 61, 26, 34, 0.75]); pts.push([sx * 61, 26, -20, 0.6]); pts.push([sx * 21.4, 26, 60, 0.9]); pts.push([sx * 114, 26, 62, 0.6]); pts.push([sx * 150, 20, 8, 0.5]); }
  pts.forEach((p, i) => U.uPoints.value[i].set(...p));

  await step('Compiling shaders…', 82);
  setupComposer();
  applyPreset(currentPreset, true);
  setView(params.get('view') || 'danube', true);
  renderer.compile(scene, camera);
  await step('Ready', 100);
  if (ui.load) { ui.load.classList.add('done'); setTimeout(() => ui.load.remove(), 900); }
  buildUI();
  if (params.has('shot')) { renderer.setAnimationLoop(null); } else animate();
}

function setupComposer() {
  const w = innerWidth, h = innerHeight;
  const rt = new THREE.WebGLRenderTarget(w * quality.dpr, h * quality.dpr, { type: THREE.HalfFloatType, samples: quality.samples });
  composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(quality.dpr);
  composer.setSize(w, h);
  renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  gtao = new GTAOPass(scene, camera, w, h);
  gtao.updateGtaoMaterial({ radius: 1.6, distanceExponent: 2, thickness: 2.5, scale: 1.0, samples: 16, distanceFallOff: 1 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  gtao.blendIntensity = 0.9;
  gtao.enabled = quality.ao;
  composer.addPass(gtao);
  bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.3, 0.5, 0.9);
  composer.addPass(bloom);
  accum = new AccumPass();               // progressive refinement when the view is still
  composer.addPass(accum);
  output = new OutputPass();
  composer.addPass(output);
  smaa = new SMAAPass();
  smaa.enabled = quality.samples === 0;
  composer.addPass(smaa);
  grade = new GradePass();               // lens & film
  composer.addPass(grade);
  resetAccum = () => accum.reset();
}

const SKY_I = 20;      // sun radiance scale of the scattering LUT
const SUN_E = 9;       // direct-sun irradiance (≈5:1 sun:sky at noon)
const lumi = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
function applyPreset(name) {
  const P = PRESETS[name] || PRESETS.golden;
  currentPreset = name;
  const sd = sunDir(P.az, P.el);
  const md = P.moon ? sunDir(P.moon.az, P.moon.el) : new THREE.Vector3(0, -1, 0);
  const T = sunTransmittance(sd, P.turb);                    // transmitted sun colour (0…1)
  const above = sd.y > -0.01;
  atm.update(sd, SKY_I, P.turb, md, 0);
  const zen = skyRadiance(new THREE.Vector3(0, 1, 0), sd, SKY_I, P.turb);
  const hz = (az) => skyRadiance(sunDir(az, 4), sd, SKY_I, P.turb);
  const hSun = hz(P.az), hAway = hz(P.az + 180), hSide = hz(P.az + 90);
  // twilight glow when the sun is just below the horizon (multiple scattering)
  const tw = Math.max(0, Math.min(1, (P.el + 11) / 8)) * Math.max(0, Math.min(1, (3 - P.el) / 4));
  const night = P.night || { zen: new THREE.Color(0, 0, 0), hor: new THREE.Color(0, 0, 0) };

  const su = sky.uniforms;
  su.uSunDir.value.copy(sd);
  su.uSunDisc.value.setRGB(T[0], T[1], T[2]).multiplyScalar(above ? 2600 : 0);
  su.uTwi.value.setRGB(0.010, 0.019, 0.046).multiplyScalar(tw);
  su.uTwiGlow.value.setRGB(0.085, 0.036, 0.013).multiplyScalar(tw);
  su.uNightZen.value.copy(night.zen); su.uNightHor.value.copy(night.hor);
  su.uCloud.value = P.cloud;
  su.uCloudSun.value.setRGB(T[0], T[1], T[2]).multiplyScalar(SKY_I * 0.075 * (above ? 1 : 0));
  su.uCloudAmb.value.setRGB(zen[0] * 1.6 + hAway[0] * 0.25, zen[1] * 1.6 + hAway[1] * 0.25, zen[2] * 1.6 + hAway[2] * 0.25)
    .add(new THREE.Color(0.012, 0.016, 0.03).multiplyScalar(tw)).add(night.hor.clone().multiplyScalar(1.6));
  su.uStars.value = P.stars || 0; su.uMoon.value = P.moon && P.moon.i > 0 ? 1 : 0; su.uMoonDir.value.copy(md);
  su.uGround.value.setRGB(0.06 * lumi(zen) + night.hor.r, 0.06 * lumi(zen) + night.hor.g, 0.06 * lumi(zen) + night.hor.b);

  // the sun (or moon) as the shadow-casting light
  if (above && lumi(T) > 0.002) {
    const m = Math.max(T[0], T[1], T[2]);
    sun.color.setRGB(T[0] / m, T[1] / m, T[2] / m);
    sun.intensity = SUN_E * m;
    sun.position.copy(sd).multiplyScalar(600);
    sun.castShadow = true;
  } else {
    sun.color.setRGB(0.62, 0.72, 1.0);
    sun.intensity = P.moon ? P.moon.i : 0.0;
    sun.position.copy(md).multiplyScalar(600);
    sun.castShadow = sun.intensity > 0.015;
  }
  baseSunDir.copy(sun.position).normalize();

  // aerial perspective: haze colour = sky near the horizon (+ twilight / city glow)
  const haze = new THREE.Color((hAway[0] + hSide[0]) / 2, (hAway[1] + hSide[1]) / 2, (hAway[2] + hSide[2]) / 2)
    .multiplyScalar(0.6).add(new THREE.Color(0.02, 0.03, 0.06).multiplyScalar(tw)).add(night.hor.clone().multiplyScalar(0.9));
  scene.fog = new THREE.FogExp2(haze, P.haze);
  renderer.toneMappingExposure = P.exposure;
  U.uFlood.value = P.flood;
  U.uGlow.value = P.glowWin * 2.2;
  U.uLamp.value = P.lamps;
  for (const m of [envGroup]) m.traverse(o => { if (o.material && o.material.userData.isCity) o.material.emissiveIntensity = P.flood > 0 ? 0.7 * P.flood + 0.05 : 0; });

  const wu = water.material.uniforms;
  wu.uSunDir.value.copy(above ? sd : md);
  wu.uSunColor.value.setRGB(T[0], T[1], T[2]).multiplyScalar(above ? SKY_I * 1.2 : 0);
  if (!above && P.moon) wu.uSunColor.value.setRGB(0.5, 0.55, 0.7).multiplyScalar(P.moon.i * 2);
  wu.uDeep.value.copy(P.water.deep);
  wu.uSkyTint.value.setRGB(zen[0], zen[1], zen[2]);
  wu.uFogColor.value.copy(haze); wu.uFogDensity.value = P.haze;
  wu.uStreak.value = P.flood > 0 ? 0.011 : 0.0035;

  bloom.strength = P.bloom[0]; bloom.radius = P.bloom[1]; bloom.threshold = P.bloom[2];
  gtao.blendIntensity = P.ao;
  // image-based lighting from the very same sky
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(sky.mesh.geometry, sky.mesh.material));
  if (envRT) envRT.dispose();
  envRT = pmrem.fromScene(envScene, 0, 1, 6000);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 1.0;
  resetAccum && resetAccum();
  document.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('on', b.dataset.preset === name));
}
const baseSunDir = new THREE.Vector3(0, 1, 0);
let resetAccum = null;

// ------------------------------------------------------------------ camera
let flight = null;
function setView(name, immediate) {
  const V = VIEWS[name] || VIEWS.danube;
  const to = { pos: new THREE.Vector3(...V.pos), target: new THREE.Vector3(...V.target), fov: V.fov };
  if (immediate) {
    camera.position.copy(to.pos); controls.target.copy(to.target); camera.fov = to.fov; camera.updateProjectionMatrix(); controls.update();
  } else {
    flight = { t: 0, from: { pos: camera.position.clone(), target: controls.target.clone(), fov: camera.fov }, to };
  }
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === name));
}

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock();
let frameNo = 0, autoOrbit = false;
let perfFrames = 0, perfTime = 0, perfChecks = 0;
function adapt(dt) {
  if (params.has('q') || perfChecks >= 2 || flight) return;
  perfFrames++; perfTime += dt;
  if (perfFrames < 90) return;
  const avg = perfTime / perfFrames;
  perfFrames = 0; perfTime = 0; perfChecks++;
  const order = ['high', 'medium', 'low'];
  const i = order.indexOf(qualityName);
  if (avg > 0.045 && i < 2) {
    qualityName = order[i + 1]; quality = Q[qualityName];
    gtao.enabled = quality.ao; smaa.enabled = quality.samples === 0;
    water.getRenderTarget().setSize(quality.refl, quality.refl);
    resize();
    const ql = document.getElementById('quality'); if (ql) ql.value = qualityName;
    console.log('adaptive quality ->', qualityName, (avg * 1000).toFixed(0) + 'ms');
  }
}
let lastKey = '', still = 0, simTime = 0;
const MAXACC = { high: 64, medium: 24, low: 8 };
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  const key = camera.position.toArray().map(v => v.toFixed(3)).join() + camera.quaternion.toArray().map(v => v.toFixed(4)).join() + camera.fov + camera.aspect;
  const moving = key !== lastKey || flight || autoOrbit;
  if (moving) { lastKey = key; still = 0; } else still++;
  const refine = still > 8;
  if (refine && accum.n >= MAXACC[qualityName]) { controls.update(); return; } // finished still: nothing to redraw
  if (!refine) { adapt(dt); simTime += dt; }
  const t = simTime;
  U.uTime.value = t;
  sky.uniforms.uTime.value = t;
  water.material.uniforms.uTime.value = t;
  if (flight) {
    flight.t = Math.min(1, flight.t + dt / 2.4);
    const e = flight.t < 0.5 ? 4 * flight.t ** 3 : 1 - (-2 * flight.t + 2) ** 3 / 2;
    camera.position.lerpVectors(flight.from.pos, flight.to.pos, e);
    controls.target.lerpVectors(flight.from.target, flight.to.target, e);
    camera.fov = THREE.MathUtils.lerp(flight.from.fov, flight.to.fov, e);
    camera.updateProjectionMatrix();
    if (flight.t >= 1) flight = null;
  }
  if (autoOrbit && !flight) {
    const off = camera.position.clone().sub(controls.target);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.05);
    camera.position.copy(controls.target).add(off);
  }
  controls.update();
  sky.mesh.position.copy(camera.position);
  render(refine);
}
// Halton (2,3) sub-pixel jitter + sun-disc jitter for anti-aliasing and true penumbrae
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
const _sj = new THREE.Vector3(), _t1 = new THREE.Vector3(), _t2 = new THREE.Vector3();
function render(jitter = false) {
  frameNo++;
  if (jitter) {
    const k = accum.n + 1;
    const W = renderer.domElement.width, H = renderer.domElement.height;
    camera.setViewOffset(W, H, halton(k, 2) - 0.5, halton(k, 3) - 0.5, W, H);
    // sample the sun's disc (0.27°) widened by forward scattering → realistic soft shadows
    const a = halton(k, 5) * Math.PI * 2, rr = Math.sqrt(halton(k, 7)) * 0.0062;
    _t1.set(0, 1, 0).cross(baseSunDir).normalize(); _t2.copy(baseSunDir).cross(_t1);
    _sj.copy(baseSunDir).addScaledVector(_t1, Math.cos(a) * rr).addScaledVector(_t2, Math.sin(a) * rr).normalize();
  } else {
    camera.clearViewOffset();
    _sj.copy(baseSunDir);
    accum.reset();
  }
  fitShadow(_sj);
  grade.quad.material.uniforms.uTime.value = performance.now() * 0.001;
  composer.render();
}
/** Fit the sun's shadow frustum to what the camera looks at (crisp close-ups, shadows over the city from the air). */
const _fc = new THREE.Vector3();
function fitShadow(dir) {
  const d = camera.position.distanceTo(controls.target);
  const r = THREE.MathUtils.clamp(d * 0.75, 140, 1100);
  _fc.copy(controls.target); _fc.y = 0;
  // keep the Parliament inside the frustum for distant views of it
  if (_fc.length() > r * 0.6) _fc.multiplyScalar(r * 0.6 / _fc.length());
  const step = (r * 2) / sun.shadow.mapSize.x;  // snap to texels to avoid shimmering
  _fc.x = Math.round(_fc.x / step) * step; _fc.z = Math.round(_fc.z / step) * step;
  sun.target.position.copy(_fc);
  sun.position.copy(_fc).addScaledVector(dir, 1500);
  const sc = sun.shadow.camera;
  if (sc.right !== r) { sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 200; sc.far = 3200; sc.updateProjectionMatrix(); }
  sun.shadow.normalBias = 0.04 + r * 0.00012;
}
/** Render a refined still: n jittered frames averaged. */
function renderStill(n = 16) { accum.reset(); for (let i = 0; i < n; i++) render(true); }

function resize() {
  const w = innerWidth, h = innerHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setPixelRatio(quality.dpr);
  renderer.setSize(w, h, false);
  composer.setPixelRatio(quality.dpr);
  composer.setSize(w, h);
}
addEventListener('resize', resize);

// ------------------------------------------------------------------ 4K still & GLB export
async function screenshot(W = 3840, H = 2160, download = true, frames = 24) {
  const prev = { ao: gtao.enabled };
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  camera.aspect = W / H; camera.updateProjectionMatrix();
  water.getRenderTarget().setSize(W >> 1, H >> 1);
  const prevQ = quality; quality = { ...quality, reflDetail: true };
  gtao.enabled = true;
  render();
  renderStill(frames);
  let result;
  if (download) {
    const blob = await new Promise(r => renderer.domElement.toBlob(r, 'image/png'));
    if (blob) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `orszaghaz-${currentPreset}-${W}x${H}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
  } else result = renderer.domElement.toDataURL('image/png');
  gtao.enabled = prev.ao;
  quality = prevQ;
  water.getRenderTarget().setSize(quality.refl, quality.refl);
  resize();
  return result;
}
async function exportGLB() {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  // GLTFExporter needs canvas-backed images: convert the procedural DataTextures
  const canvases = new Map();
  const toCanvas = (t) => {
    if (!t || !t.isDataTexture) return t;
    if (canvases.has(t)) return canvases.get(t);
    const { width, height, data } = t.image;
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), width, height), 0, 0);
    const ct = new THREE.CanvasTexture(c);
    ct.flipY = false; ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.repeat.copy(t.repeat); ct.colorSpace = t.colorSpace; ct.name = t.name;
    canvases.set(t, ct);
    return ct;
  };
  const swaps = [];
  const removed = [];
  const expMats = new Map();
  building.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material;
    let e = expMats.get(m);
    if (!e) {
      e = new THREE.MeshStandardMaterial({ name: m.name, color: m.color, roughness: m.roughness, metalness: m.metalness, map: toCanvas(m.map), normalMap: toCanvas(m.normalMap), roughnessMap: toCanvas(m.roughnessMap), side: m.side });
      if (m.normalScale) e.normalScale.copy(m.normalScale);
      expMats.set(m, e);
    }
    swaps.push([o, m]); o.material = e;
    const ex = o.geometry.getAttribute('aExtra');
    if (ex) { removed.push([o.geometry, ex]); o.geometry.deleteAttribute('aExtra'); }
  });
  try {
    const ex = new GLTFExporter();
    const glb = await ex.parseAsync(building, { binary: true, maxTextureSize: 2048 });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' }));
    a.download = 'orszaghaz.glb';
    a.click();
  } finally {
    for (const [o, m] of swaps) o.material = m;
    for (const e of expMats.values()) e.dispose();
    for (const [g, a] of removed) g.setAttribute('aExtra', a);
  }
}
window.__app = { applyPreset, setView, screenshot, exportGLB, renderer, scene, camera, render, renderStill, controls, U, sky, water, setTime: (t) => { U.uTime.value = t; sky.uniforms.uTime.value = t; water.material.uniforms.uTime.value = t; },
  look(pos, target, fov) { camera.position.set(...pos); controls.target.set(...target); if (fov) camera.fov = fov; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); controls.update(); sky.mesh.position.copy(camera.position); }, get stats() { return building.userData.stats; }, get building() { return building; } };

// ------------------------------------------------------------------ UI
function buildUI() {
  const bar = document.getElementById('ui');
  if (!bar) return;
  bar.classList.add('show');
  bar.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => applyPreset(b.dataset.preset));
  bar.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));
  const orbit = document.getElementById('orbit');
  if (orbit) orbit.onclick = () => { autoOrbit = !autoOrbit; orbit.classList.toggle('on', autoOrbit); };
  // inside a sandboxed frame (e.g. a hosted artifact) downloads are refused: hide those buttons
  let framed = false; try { framed = window.self !== window.top; } catch (e) { framed = true; }
  if (framed) for (const id of ['shot', 'glb']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
  const shot = document.getElementById('shot');
  if (shot) shot.onclick = async () => { shot.textContent = 'Rendering…'; await new Promise(r => setTimeout(r, 30)); await screenshot(); shot.textContent = '4K still'; };
  const glb = document.getElementById('glb');
  if (glb) glb.onclick = async () => { glb.textContent = 'Exporting…'; await exportGLB(); glb.textContent = 'GLB'; };
  const ql = document.getElementById('quality');
  if (ql) {
    ql.value = qualityName;
    ql.onchange = () => { qualityName = ql.value; quality = Q[qualityName]; gtao.enabled = quality.ao; smaa.enabled = quality.samples === 0; water.getRenderTarget().setSize(quality.refl, quality.refl); resize(); };
  }
  document.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('on', b.dataset.preset === currentPreset));
  const hide = document.getElementById('hide');
  if (hide) hide.onclick = () => document.body.classList.toggle('clean');
}

init().then(() => { window.__ready = true; }).catch(e => { console.error(e); if (ui.status) ui.status.textContent = 'Error: ' + e.message; window.__error = String(e && e.stack || e); });
