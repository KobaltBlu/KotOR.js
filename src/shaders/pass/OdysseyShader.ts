import * as THREE from 'three';

/**
 * OdysseyShader — retail VideoEffects saturation + film/scan noise.
 *
 * Saturation: RenderSaturationAdjustment
 * (luma weights 0.3086 / 0.6094 / 0.082).
 * Film noise: RenderOverlayFilmNoise — additive filmnoisetex.
 */
interface OdysseyShader {
  uniforms: { [uniform: string]: THREE.IUniform<any>; },
  vertexShader: string;
  fragmentShader: string;
}

export const OdysseyShader: OdysseyShader = {
  uniforms: {
    tDiffuse: { value: null },
    tFilmNoise: { value: null },
    saturation: { value: 1.0 },
    modulation: new THREE.Uniform( new THREE.Vector3(1, 1, 1) ),
    /** Retail film-noise UV tile (~7.5 on one axis in RenderOverlayFilmNoise). */
    filmNoiseScale: { value: 7.5 },
    time: { value: 0.0 },
    bFilmNoise: { value: 0 },
    bmodulate: { value: 0 },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tFilmNoise;
    varying vec2 vUv;
    uniform float saturation;
    uniform vec3 modulation;
    uniform float filmNoiseScale;
    uniform float time;
    uniform bool bFilmNoise;
    uniform bool bmodulate;

    void main() {
      vec4 cTextureScreen = texture2D( tDiffuse, vUv );
      vec3 cResult = cTextureScreen.rgb;

      // Retail RenderOverlayFilmNoise: scene + filmnoisetex (additive)
      if( bFilmNoise ){
        vec2 noiseUv = vec2( vUv.x * filmNoiseScale, vUv.y * filmNoiseScale + time * 0.15 );
        vec3 noise = texture2D( tFilmNoise, noiseUv ).rgb;
        cResult = cResult + noise;
      }

      // Retail saturation matrix (weights 0.3086 / 0.6094 / 0.082)
      if( bmodulate ){
        vec3 lumaWeights = vec3( 0.3086, 0.6094, 0.082 );
        vec3 grey = vec3( dot( lumaWeights, cResult ) );
        cResult = modulation * ( grey + saturation * ( cResult - grey ) );
      }

      gl_FragColor = vec4( cResult, cTextureScreen.a );
    }`
};
