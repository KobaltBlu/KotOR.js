import * as THREE from 'three';

/**
 * DreamDistortionShader — K2 RenderDreamDistortionARB.
 * Clairvoyance enables dream distortion.
 *
 * Fullscreen warp (no stencil). Retail uses distortiontex with multi-texcoord
 * offsets (~0.15625 = 0x3e200000) and a slightly oversized quad (±25 px).
 */
interface DreamDistortionShader {
  uniforms: { [uniform: string]: THREE.IUniform<any>; };
  vertexShader: string;
  fragmentShader: string;
}

export const DreamDistortionShader: DreamDistortionShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDistortion: { value: null },
    /** Retail multi-texcoord offset ~0.15625; full mode can amplify. */
    distortionScale: { value: 0.15625 },
    /** EnableClairvoyance(1) vs ClairvoyanceFull(0) — full uses larger warp. */
    fullMode: { value: 0 },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tDistortion;
    uniform float distortionScale;
    uniform float fullMode;
    varying vec2 vUv;

    void main() {
      float scale = distortionScale * ( fullMode > 0.5 ? 1.35 : 1.0 );
      vec2 dist = texture2D( tDistortion, vUv ).rg;
      vec2 offset = ( dist - 0.5 ) * 2.0 * scale;
      gl_FragColor = texture2D( tDiffuse, vUv + offset );
    }`,
};
