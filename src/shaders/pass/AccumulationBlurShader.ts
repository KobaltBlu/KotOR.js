import * as THREE from 'three';

/**
 * Retail accumulationBlurShaderATI @ InitializeFrameBufferModificationFragmentShadersATI
 * + RenderAccumulationBlur.
 *
 * ATI: r3 = prev * C0; out = current * C1 + r3
 * where C0 = (ratio,ratio,ratio,...) and C1 = (1-ratio,...).
 *
 * @file AccumulationBlurShader.ts
 */
interface AccumulationBlurShader {
  uniforms: { [uniform: string]: THREE.IUniform<any> };
  vertexShader: string;
  fragmentShader: string;
}

export const AccumulationBlurShader: AccumulationBlurShader = {
  uniforms: {
    tPrev: { value: null },
    tCurrent: { value: null },
    /** Retail accumulationRatio (speed-blur ratio default 0.75). */
    ratio: { value: 0.75 },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,

  fragmentShader: /* glsl */ `
    uniform sampler2D tPrev;
    uniform sampler2D tCurrent;
    uniform float ratio;
    varying vec2 vUv;

    void main() {
      vec4 prev = texture2D( tPrev, vUv );
      vec4 curr = texture2D( tCurrent, vUv );
      // prev * ratio + current * (1 - ratio)
      gl_FragColor = mix( curr, prev, ratio );
    }`,
};

/** Retail accumulation pbuffer size (CreatePBuffer(0x80,0x80)). */
export const RETAIL_ACCUMULATION_SIZE = 128;