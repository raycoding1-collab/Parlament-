// Lighting moods and camera stations.
import * as THREE from 'three';

const C = (r, g, b) => new THREE.Color(r, g, b);
export const sunDir = (azDeg, elDeg) => {
  const az = THREE.MathUtils.degToRad(azDeg), el = THREE.MathUtils.degToRad(elDeg);
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
};

// Physical lighting moods. azimuth 0° = sun over the Danube (west of the building),
// +90° = south (+x). Colours of sun, sky, clouds and haze are derived from the
// atmosphere model (env/atmosphere.js); only exposure and artificial lights are set here.
export const PRESETS = {
  morning: { label: 'Morning', az: 205, el: 15, turb: 1.6, cloud: 0.32, haze: 0.0003, exposure: 0.48, flood: 0, glowWin: 0, lamps: 0, bloom: [0.05, 0.5, 4.0], ao: 1.0, water: { deep: C(0.02, 0.05, 0.06) } },
  day: { label: 'Day', az: 48, el: 46, turb: 1.2, cloud: 0.42, haze: 0.00022, exposure: 0.37, flood: 0, glowWin: 0, lamps: 0, bloom: [0.04, 0.5, 4.0], ao: 1.0, water: { deep: C(0.02, 0.05, 0.06) } },
  golden: { label: 'Golden hour', az: 54, el: 6.5, turb: 1.9, cloud: 0.34, haze: 0.00026, exposure: 0.6, flood: 0, glowWin: 0, lamps: 0, bloom: [0.08, 0.6, 3.0], ao: 1.0, water: { deep: C(0.02, 0.04, 0.05) } },
  blue: { label: 'Blue hour', az: -8, el: -4.5, turb: 1.5, cloud: 0.22, haze: 0.0004, exposure: 3.2, flood: 0.3, glowWin: 0.14, lamps: 0.32, night: { zen: C(0.0006, 0.0012, 0.003), hor: C(0.004, 0.003, 0.0025) }, moon: { az: -130, el: 32, i: 0.0 }, stars: 0.15, bloom: [0.18, 0.55, 0.9], ao: 0.85, water: { deep: C(0.004, 0.008, 0.016) } },
  night: { label: 'Night', az: -40, el: -28, turb: 1.4, cloud: 0.16, haze: 0.00045, exposure: 1.0, flood: 1.0, glowWin: 0.4, lamps: 1.1, night: { zen: C(0.0018, 0.0032, 0.0075), hor: C(0.013, 0.009, 0.0065) }, moon: { az: -140, el: 38, i: 0.02 }, stars: 1.0, bloom: [0.28, 0.6, 1.4], ao: 0.7, water: { deep: C(0.002, 0.003, 0.006) } },
};

export const VIEWS = {
  danube: { label: 'Danube', pos: [0, 2.0, 452], target: [0, 34, 12], fov: 30 },
  river: { label: 'River level', pos: [190, -7.2, 330], target: [10, 32, 10], fov: 38 },
  castle: { label: 'From the Castle', pos: [1100, 72, 820], target: [8, 30, 4], fov: 8.5 },
  aerial: { label: 'Aerial', pos: [330, 230, 380], target: [0, 26, -6], fov: 34 },
  dome: { label: 'Dome', pos: [60, 92, 132], target: [0, 66, 8], fov: 34 },
  square: { label: 'Kossuth tér', pos: [95, 9, -180], target: [0, 32, -40], fov: 42 },
  north: { label: 'From north', pos: [-430, 48, 230], target: [0, 34, 4], fov: 30 },
};
