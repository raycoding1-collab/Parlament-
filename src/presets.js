// Lighting moods and camera stations.
import * as THREE from 'three';

const C = (r, g, b) => new THREE.Color(r, g, b);
const sunDir = (azDeg, elDeg) => {
  const az = THREE.MathUtils.degToRad(azDeg), el = THREE.MathUtils.degToRad(elDeg);
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
};

// azimuth 0° = sun over the Danube (west of the building), +90° = south (+x)
export const PRESETS = {
  morning: {
    label: 'Morning', sun: sunDir(205, 17), sunColor: C(1.0, 0.86, 0.7), sunI: 3.6,
    zenith: C(0.12, 0.26, 0.6), horizon: C(0.98, 0.84, 0.7), horizonAway: C(0.6, 0.7, 0.86), ground: C(0.3, 0.3, 0.3),
    glow: 1.0, sunSize: 0.0004, cloud: 0.3, cloudLit: C(1.0, 0.95, 0.9), cloudDark: C(0.6, 0.62, 0.72), stars: 0, moon: 0, haze: 0.8,
    env: 0.9, exposure: 1.0, fog: C(0.78, 0.8, 0.86), fogD: 0.00028, flood: 0, glowWin: 0, lamps: 0,
    water: { deep: C(0.05, 0.09, 0.1), tint: C(0.5, 0.6, 0.75) }, bloom: [0.08, 0.4, 0.95], ao: 1.0,
  },
  day: {
    label: 'Day', sun: sunDir(48, 44), sunColor: C(1.0, 0.96, 0.9), sunI: 3.4,
    zenith: C(0.09, 0.22, 0.58), horizon: C(0.70, 0.80, 0.92), horizonAway: C(0.55, 0.68, 0.86), ground: C(0.3, 0.32, 0.33),
    glow: 0.5, sunSize: 0.00035, cloud: 0.42, cloudLit: C(1.0, 1.0, 1.0), cloudDark: C(0.62, 0.68, 0.78), stars: 0, moon: 0, haze: 0.6,
    env: 1.0, exposure: 0.95, fog: C(0.66, 0.75, 0.86), fogD: 0.00026, flood: 0, glowWin: 0, lamps: 0,
    water: { deep: C(0.05, 0.10, 0.10), tint: C(0.4, 0.55, 0.7) }, bloom: [0.08, 0.4, 0.95], ao: 1.0,
  },
  golden: {
    label: 'Golden hour', sun: sunDir(52, 8), sunColor: C(1.0, 0.62, 0.32), sunI: 4.2,
    zenith: C(0.13, 0.22, 0.50), horizon: C(1.0, 0.62, 0.36), horizonAway: C(0.56, 0.52, 0.62), ground: C(0.2, 0.17, 0.15),
    glow: 1.6, sunSize: 0.0005, cloud: 0.36, cloudLit: C(1.0, 0.72, 0.52), cloudDark: C(0.42, 0.36, 0.44), stars: 0, moon: 0, haze: 0.9,
    env: 0.75, exposure: 1.0, fog: C(0.78, 0.62, 0.52), fogD: 0.0003, flood: 0, glowWin: 0, lamps: 0,
    water: { deep: C(0.05, 0.07, 0.08), tint: C(0.8, 0.55, 0.45) }, bloom: [0.14, 0.5, 0.9], ao: 1.0,
  },
  blue: {
    label: 'Blue hour', sun: sunDir(-10, -5), sunColor: C(1.0, 0.45, 0.22), sunI: 0.0,
    zenith: C(0.010, 0.026, 0.10), horizon: C(0.42, 0.26, 0.26), horizonAway: C(0.12, 0.15, 0.30), ground: C(0.02, 0.025, 0.04),
    glow: 0.9, sunSize: 0.0004, cloud: 0.25, cloudLit: C(0.28, 0.24, 0.36), cloudDark: C(0.06, 0.07, 0.13), stars: 0.25, moon: 0, haze: 0.8,
    env: 0.55, exposure: 1.05, fog: C(0.10, 0.12, 0.2), fogD: 0.00032, flood: 0.85, glowWin: 0.45, lamps: 1,
    moonLight: { dir: sunDir(-120, 35), color: C(0.45, 0.55, 0.9), i: 0.12 },
    water: { deep: C(0.01, 0.015, 0.03), tint: C(0.2, 0.25, 0.45) }, bloom: [0.32, 0.45, 0.95], ao: 0.8,
  },
  night: {
    label: 'Night', sun: sunDir(-40, -30), sunColor: C(0.6, 0.7, 1.0), sunI: 0.0,
    zenith: C(0.002, 0.004, 0.014), horizon: C(0.04, 0.035, 0.045), horizonAway: C(0.035, 0.032, 0.04), ground: C(0.005, 0.005, 0.008),
    glow: 0.0, sunSize: 0.0004, cloud: 0.18, cloudLit: C(0.05, 0.05, 0.07), cloudDark: C(0.01, 0.012, 0.02), stars: 1.0, moon: 1.0, haze: 0.6,
    env: 0.35, exposure: 1.1, fog: C(0.025, 0.025, 0.035), fogD: 0.00038, flood: 1.0, glowWin: 0.4, lamps: 1.2,
    moonLight: { dir: sunDir(-140, 38), color: C(0.5, 0.6, 1.0), i: 0.08 },
    water: { deep: C(0.004, 0.006, 0.01), tint: C(0.05, 0.06, 0.1) }, bloom: [0.4, 0.5, 0.95], ao: 0.7,
  },
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
