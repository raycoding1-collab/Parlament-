// Photographic post passes: progressive accumulation (anti-aliasing + soft
// shadows from jittered sun samples) and a lens/film grade.
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

/** Running average of jittered frames in linear HDR. */
export class AccumPass extends Pass {
  constructor() {
    super();
    this.n = 0;
    const o = { type: THREE.HalfFloatType, depthBuffer: false };
    this.a = new THREE.WebGLRenderTarget(1, 1, o); this.b = new THREE.WebGLRenderTarget(1, 1, o);
    this.blend = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tNew: { value: null }, tAcc: { value: null }, w: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D tNew, tAcc; uniform float w; varying vec2 vUv; void main(){ vec4 n = texture2D(tNew, vUv); vec4 a = texture2D(tAcc, vUv); gl_FragColor = mix(a, n, w); }',
      depthTest: false, depthWrite: false,
    }));
    this.copy = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { t: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }',
      depthTest: false, depthWrite: false,
    }));
  }
  setSize(w, h) { this.a.setSize(w, h); this.b.setSize(w, h); this.n = 0; }
  reset() { this.n = 0; }
  render(renderer, writeBuffer, readBuffer) {
    const m = this.blend.material.uniforms;
    m.tNew.value = readBuffer.texture; m.tAcc.value = this.a.texture; m.w.value = 1 / (this.n + 1);
    renderer.setRenderTarget(this.b); this.blend.render(renderer);
    const t = this.a; this.a = this.b; this.b = t;
    this.n++;
    this.copy.material.uniforms.t.value = this.a.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.copy.render(renderer);
  }
}

/** Lens & film: gentle S-curve, warm/cool split, vignette, lateral chromatic aberration, fine grain. */
export class GradePass extends Pass {
  constructor() {
    super();
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uVig: { value: 0.32 }, uGrain: { value: 0.022 }, uCA: { value: 0.7 }, uSplit: { value: 0.035 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse; uniform float uTime, uVig, uGrain, uCA, uSplit; uniform vec2 uRes; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec2 c = vUv - 0.5; float r2 = dot(c, c);
          vec2 off = c * r2 * uCA * 0.006;
          vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
          // filmic S-curve in display space and a subtle split-tone (cool shadows, warm highlights)
          col = col * col * (3.0 - 2.0 * col) * 0.28 + col * 0.72;
          float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
          col += uSplit * (vec3(-0.6, -0.1, 0.7) * (1.0 - smoothstep(0.0, 0.45, l)) + vec3(0.6, 0.15, -0.6) * smoothstep(0.55, 1.0, l)) * 0.5;
          col *= 1.0 - uVig * smoothstep(0.08, 0.62, r2 * 1.9);
          col += (h(vUv * uRes + fract(uTime) * 91.7) - 0.5) * uGrain * (0.6 + 0.4 * (1.0 - l));
          gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }`,
      depthTest: false, depthWrite: false,
    }));
  }
  setSize(w, h) { this.quad.material.uniforms.uRes.value.set(w, h); }
  render(renderer, writeBuffer, readBuffer) {
    this.quad.material.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
}
