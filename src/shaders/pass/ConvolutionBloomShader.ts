import * as THREE from 'three';
import {
  RETAIL_BLOOM_FILTER_MULTIPLIER,
  RETAIL_BLOOM_KERNEL_5X5,
} from '@/shaders/pass/FrameBufferEffectGates';

/**
 * Convolution / bloom helpers — retail RenderOverlayConvolution @ 0042c6e0
 * + bright-extract LUTs from InitializeFrameBufferModifications @ 00427c90
 * + BloomFilter kernel @ 0078e230 / multiplier @ 0078daf8 (= 0.35).
 *
 * Threshold LUTs (channel zero below cutoff, then ramp to ~178.5):
 *   R: cutoff 0xEA (234), scale (i-234)*0.04761905*178.5
 *   G/B: cutoff 0xD8 (216), scale (i-216)*0.025641026*178.5
 */

export function createBrightExtractLutTexture(): THREE.DataTexture {
  const data = new Uint8Array(256 * 4);
  for(let i = 0; i < 256; i++){
    let r = 0;
    let g = 0;
    let b = 0;
    if(i >= 0xea){
      r = Math.max(0, Math.min(255, Math.round((i - 0xea) * 0.04761905 * 178.5)));
    }
    if(i >= 0xd8){
      const v = Math.max(0, Math.min(255, Math.round((i - 0xd8) * 0.025641026 * 178.5)));
      g = v;
      b = v;
    }
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    // Retail BloomFilter draws with glColor4f(..., bloomFilterMultiplier).
    data[i * 4 + 3] = Math.round(RETAIL_BLOOM_FILTER_MULTIPLIER * 255);
  }
  const tex = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

export const BrightExtractShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tLut: { value: null as THREE.Texture | null },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tLut;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D( tDiffuse, vUv );
      float r = texture2D( tLut, vec2( c.r, 0.5 ) ).r;
      float g = texture2D( tLut, vec2( c.g, 0.5 ) ).g;
      float b = texture2D( tLut, vec2( c.b, 0.5 ) ).b;
      float a = texture2D( tLut, vec2( c.r, 0.5 ) ).a;
      gl_FragColor = vec4( r, g, b, a );
    }`,
};

/** Retail MipmapFilter — simple fullscreen downsample (decal / copy). */
export const DownsampleShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      gl_FragColor = texture2D( tDiffuse, vUv );
    }`,
};

/**
 * Retail BloomFilter 5×5 kernel (bloomFiltersATI).
 * Weights applied per-texel; alpha preserved for SRC_ALPHA, ONE composite.
 */
export const BloomKernel5x5Shader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    texelSize: { value: new THREE.Vector2(1, 1) },
    kernel: { value: Float32Array.from(RETAIL_BLOOM_KERNEL_5X5) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 texelSize;
    uniform float kernel[25];
    varying vec2 vUv;
    void main() {
      vec4 sum = vec4( 0.0 );
      for( int y = 0; y < 5; y ++ ) {
        for( int x = 0; x < 5; x ++ ) {
          vec2 offset = vec2( float( x - 2 ), float( y - 2 ) ) * texelSize;
          float w = kernel[ y * 5 + x ];
          vec4 s = texture2D( tDiffuse, vUv + offset );
          sum.rgb += s.rgb * w;
          sum.a = max( sum.a, s.a );
        }
      }
      gl_FragColor = sum;
    }`,
};

/**
 * Retail composite: glBlendFunc(GL_SRC_ALPHA, GL_ONE)
 * → scene + bloom.rgb * bloom.a
 */
export const AdditiveCompositeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tBloom: { value: null as THREE.Texture | null },
    /** Fallback when bloom.a is lost; retail bloomFilterMultiplier = 0.35. */
    bloomStrength: { value: RETAIL_BLOOM_FILTER_MULTIPLIER },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tBloom;
    uniform float bloomStrength;
    varying vec2 vUv;
    void main() {
      vec4 scene = texture2D( tDiffuse, vUv );
      vec4 bloom = texture2D( tBloom, vUv );
      float a = bloom.a > 0.0 ? bloom.a : bloomStrength;
      // Retail GL_SRC_ALPHA, GL_ONE
      gl_FragColor = vec4( scene.rgb + bloom.rgb * a, scene.a );
    }`,
};

export { RETAIL_BLOOM_FILTER_MULTIPLIER, RETAIL_BLOOM_KERNEL_5X5 };
