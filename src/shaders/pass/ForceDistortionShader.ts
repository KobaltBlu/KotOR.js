import * as THREE from 'three';

/**
 * Retail GLRender::RenderForceDistortion @ 004331d0 +
 * forceDistortionShaderATI @ InitializeFrameBufferModificationFragmentShadersATI 00427490.
 *
 * ATI fragment: sample distortiontex (stage0), bias×2 *(tex−0.5), scale by
 * texcoord1 ≈ (screenW·0.1, screenH·0.1) in RECT pixels → normalized UV offset
 * of 2*(rg−0.5)*0.1, then resample the screen color copy.
 */
interface ForceDistortionShader {
  uniforms: { [uniform: string]: THREE.IUniform<any>; };
  vertexShader: string;
  fragmentShader: string;
}

export const ForceDistortionShader: ForceDistortionShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDistortion: { value: null },
    /** Retail multi-texcoord1 scale; normalized equivalent of screen*0.1 / screen. */
    distortionScale: { value: 0.1 },
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
    varying vec2 vUv;

    void main() {
      vec2 dist = texture2D( tDistortion, vUv ).rg;
      // GL_2X_BIT_ATI | GL_BIAS_BIT_ATI → 2*(c - 0.5), then * texcoord1 (~0.1)
      vec2 offset = ( dist - 0.5 ) * 2.0 * distortionScale;
      gl_FragColor = texture2D( tDiffuse, vUv + offset );
    }`,
};
