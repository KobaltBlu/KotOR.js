import * as THREE from 'three';

/**
 * FuryShader — K2 EnableFury / RenderFury + ARB fury program
 * (InitializeFrameBufferModificationFragmentShadersARB).
 *
 * Uses fx_Fury01/02/03 alpha to blend warped scene vs fury tint overlay.
 */
interface FuryShader {
  uniforms: { [uniform: string]: THREE.IUniform<any>; };
  vertexShader: string;
  fragmentShader: string;
}

export const FuryShader: FuryShader = {
  uniforms: {
    tDiffuse: { value: null },
    tFury: { value: null },
    tDistortion: { value: null },
    distortionScale: { value: 0.08 },
    /** program.env[7].a bias before SGE 0.5 threshold */
    alphaBias: { value: 0.0 },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tFury;
    uniform sampler2D tDistortion;
    uniform float distortionScale;
    uniform float alphaBias;
    varying vec2 vUv;

    void main() {
      vec2 offset = vec2( 0.0 );
      if( distortionScale > 0.0 ){
        vec2 dist = texture2D( tDistortion, vUv ).rg;
        offset = ( dist - 0.5 ) * 2.0 * distortionScale;
      }
      vec3 warped = texture2D( tDiffuse, vUv + offset ).rgb;
      vec4 fury = texture2D( tFury, vUv );
      // Retail: SGE(fury.a + c7.a, 0.5); MAD rgb = warped * mask + fury
      float mask = step( 0.5, fury.a + alphaBias );
      vec3 rgb = warped * mask + fury.rgb;
      gl_FragColor = vec4( rgb, max( fury.a, 1.0 ) );
    }`,
};
