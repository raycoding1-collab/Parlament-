// Országház — interactive, physically lit procedural model of the Hungarian Parliament.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { createMaterials, U } from './materials/materials.js';
import { Kit } from './geo/kit.js';
import { buildBuilding } from './arch/building.js';
import { buildSite, SITE } from './env/site.js';
import { buildCity } from './env/city.js';
import { createSky } from './env/sky.js';
import { createWater } from './env/water.js';
import { PRESETS, VIEWS } from './presets.js';

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

let composer, renderPass, gtao, bloom, smaa, output, water, sky, sun, hemi, flag, pmrem, envRT;
let currentPreset = params.get('preset') || 'golden';
let building, envGroup;

async function init() {
  await step('Carving limestone & firing roof tiles…', 4);
  const mats = createMaterials(quality);
  // tinted plaster variants for the Pest apartment blocks
  const tints = [0xd9d0c0, 0xcbbd9f, 0xbdb9b2, 0xd6c8ac, 0xc9b5a4];
  tints.forEach((c, i) => { const m = mats.city.clone(); m.color.set(c); m.userData.isCity = true; mats['city' + i] = m; });
  mats.cityAll = tints.map((_, i) => mats['city' + i]);

  await step('Laying out the plan: wings, courtyards, chambers…', 18);
  const kit = new Kit(mats);
  buildBuilding(kit);
  await step('Raising the dome, towers and pinnacles…', 40);
  building = kit.build();
  building.name = 'Orszaghaz';
  scene.add(building);
  await step('Building the embankment, Kossuth tér, Pest and Buda…', 55);
  const kitE = new Kit(mats);
  const site = buildSite(kitE, mats, U);
  buildCity(kitE);
  await step('Instancing geometry…', 68);
  envGroup = kitE.build();
  envGroup.name = 'Budapest';
  scene.add(envGroup);
  flag = site.flag; scene.add(flag);
  console.log('stats', JSON.stringify(building.userData.stats), JSON.stringify(envGroup.userData.stats));

  sky = createSky();
  scene.add(sky.mesh);
  water = createWater(quality.refl);
  const getRC = water.getReflectionCamera;
  water.getReflectionCamera = function (cam) { const rc = getRC.call(this, cam); rc.layers.mask = quality.reflDetail ? cam.layers.mask : 1; return rc; };
  water.position.y = SITE.water;
  water.position.z = SITE.lowerEdge + 1300;
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
  // dome: projectors on the podium terrace corners and on the four arm ridges
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; pts.push([Math.sin(a) * 26, 31.5, Math.cos(a) * 26, 0.55]); }
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; pts.push([Math.sin(a) * 46, 36, Math.cos(a) * 46, 1.5]); }
  pts.push([0, 20, 150, 7.0]);   // long-throw projector on the quay for the dome's river face
  pts.push([0, 20, -170, 5.0]);  // from Kossuth tér
  // chamber halls and their towers, end pavilions
  for (const sx of [-1, 1]) { pts.push([sx * 61, 30, 40, 0.7]); pts.push([sx * 61, 30, -40, 0.6]); pts.push([sx * 125, 30, 70, 0.6]); }
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
  output = new OutputPass();
  composer.addPass(output);
  smaa = new SMAAPass();
  smaa.enabled = quality.samples === 0;
  composer.addPass(smaa);
}

function applyPreset(name, immediate) {
  const P = PRESETS[name] || PRESETS.golden;
  currentPreset = name;
  const su = sky.uniforms;
  su.uSunDir.value.copy(P.sun);
  su.uZenith.value.copy(P.zenith); su.uHorizon.value.copy(P.horizon); su.uHorizonAway.value.copy(P.horizonAway || P.horizon); su.uGround.value.copy(P.ground);
  su.uSunColor.value.copy(P.sunColor); su.uGlow.value = P.glow; su.uSunSize.value = P.sunSize;
  su.uCloud.value = P.cloud; su.uCloudLit.value.copy(P.cloudLit); su.uCloudDark.value.copy(P.cloudDark);
  su.uStars.value = P.stars; su.uMoon.value = P.moon; su.uHaze.value = P.haze;
  if (P.moonLight) su.uMoonDir.value.copy(P.moonLight.dir);

  const L = P.sunI > 0 ? { dir: P.sun, color: P.sunColor, i: P.sunI } : P.moonLight;
  sun.color.copy(L.color);
  sun.intensity = L.i;
  sun.position.copy(L.dir).multiplyScalar(600);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = L.i > 0.5;

  scene.fog = new THREE.FogExp2(P.fog, P.fogD);
  renderer.toneMappingExposure = P.exposure;
  U.uFlood.value = P.flood;
  U.uGlow.value = P.glowWin * 2.2;
  U.uLamp.value = P.lamps;
  for (const m of [envGroup]) m.traverse(o => { if (o.material && o.material.userData.isCity) o.material.emissiveIntensity = P.flood > 0 ? 0.7 : 0; });

  const wu = water.material.uniforms;
  wu.uSunDir.value.copy(P.sunI > 0 ? P.sun : (P.moonLight ? P.moonLight.dir : P.sun));
  wu.uSunColor.value.copy(P.sunI > 0 ? P.sunColor : new THREE.Color(0.5, 0.55, 0.7)).multiplyScalar(P.sunI > 0 ? 1 : 0.03 * P.moon);
  wu.uDeep.value.copy(P.water.deep); wu.uSkyTint.value.copy(P.water.tint);
  wu.uFogColor.value.copy(P.fog); wu.uFogDensity.value = P.fogD;

  bloom.strength = P.bloom[0]; bloom.radius = P.bloom[1]; bloom.threshold = P.bloom[2];
  gtao.blendIntensity = P.ao;
  // environment lighting from the sky
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(sky.mesh.geometry, sky.mesh.material);
  envScene.add(envSky);
  if (envRT) envRT.dispose();
  envRT = pmrem.fromScene(envScene, 0, 1, 6000);
  scene.environment = envRT.texture;
  scene.environmentIntensity = P.env;
  document.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('on', b.dataset.preset === name));
}

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
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  adapt(dt);
  const t = clock.elapsedTime;
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
  render();
}
function render() {
  frameNo++;
  composer.render();
}

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
async function screenshot(W = 3840, H = 2160, download = true) {
  const prev = { ao: gtao.enabled };
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  camera.aspect = W / H; camera.updateProjectionMatrix();
  water.getRenderTarget().setSize(W >> 1, H >> 1);
  const prevQ = quality; quality = { ...quality, reflDetail: true };
  gtao.enabled = true;
  render(); render();
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
window.__app = { applyPreset, setView, screenshot, exportGLB, renderer, scene, camera, render, controls, U, sky, water, setTime: (t) => { U.uTime.value = t; sky.uniforms.uTime.value = t; water.material.uniforms.uTime.value = t; },
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
