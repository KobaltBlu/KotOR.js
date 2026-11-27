import * as THREE from 'three';
import {
  ODYSSEY_BLOOM_FILTER_MULTIPLIER,
  ODYSSEY_BLOOM_KERNEL_5X5,
} from '@engine/render/shaders/pass/FrameBufferEffectGates';

/**
 * Convolution / bloom helpers — RenderOverlayConvolution
 * + bright-extract LUTs from InitializeFrameBufferModifications (GOG K1)
 * + BloomFilter kernel / multiplier (= 0.35).
 *
 * Threshold LUTs (channel zero below cutoff, then ramp; packed via __ftol2 trunc):
 * R: cutoff 0xEA (234), scale (i-234)*0.04761905*178.5
 * G/B: cutoff 0xD8 (216), scale (i-216)*0.025641026*178.5
 *
 * Greys in 216–233 extract as (0, g, g) — a cyan bloom band. That asymmetry is
 * intentional Odyssey (GOG K1). Aspyr K2 keeps the same cutoffs/algebra
 * (`/21` and `/39` × 255×0.7); their worse-looking bloom is from FBO/alpha path
 * differences, not a different blue tint formula. Do not symmetrize thresholds.
 */

/** bright-extract channel value — matches GOG K1 __ftol2 (trunc toward 0). */
export function odysseyBrightExtractChannel(i: number, cutoff: number, scale: number): number {
  if(i < cutoff){ return 0; }
  return Math.max(0, Math.min(255, Math.trunc((i - cutoff) * scale * 178.5)));
}

/** Per-input grey sample of the combined R/G/B bright-extract LUT. */
export function odysseyBrightExtractRgb(i: number): { r: number; g: number; b: number } {
  const r = odysseyBrightExtractChannel(i, 0xea, 0.04761905);
  const g = odysseyBrightExtractChannel(i, 0xd8, 0.025641026);
  return { r, g, b: g };
}

export function createBrightExtractLutTexture(): THREE.DataTexture {
  const data = new Uint8Array(256 * 4);
  const a = Math.max(0, Math.min(255, Math.trunc(ODYSSEY_BLOOM_FILTER_MULTIPLIER * 255)));
  for(let i = 0; i < 256; i++){
    const { r, g, b } = odysseyBrightExtractRgb(i);
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    // BloomFilter burns bloomFilterMultiplier into RGB via
    // glColor4f(..., 0.35) + SRC_ALPHA/ONE during the 5×5 accumulate;
    // final composite uses glColor alpha 1. We store 0.35 in LUT alpha and
    // apply scene + bloom.rgb * a once at composite (same single ×0.35).
    data[i * 4 + 3] = a;
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

/** MipmapFilter — simple fullscreen downsample (decal / copy). */
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
 * BloomFilter 5×5 kernel (bloomFiltersATI).
 * Weights applied per-texel; alpha preserved for SRC_ALPHA, ONE composite.
 */
export const BloomKernel5x5Shader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    texelSize: { value: new THREE.Vector2(1, 1) },
    kernel: { value: Float32Array.from(ODYSSEY_BLOOM_KERNEL_5X5) },
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
 * final composite (RenderOverlayConvolution):
 * glBlendFunc(GL_SRC_ALPHA, GL_ONE) + glColor4f(1,1,1,1) → scene + bloom.rgb.
 * BloomFilter already burned bloomFilterMultiplier (0.35) into bloom RGB via
 * glColor4f(..., 0.35) during the 5×5 accumulate. We keep extract/kernel RGB
 * unscaled and apply the single ×0.35 here via bloom.a / bloomStrength.
 */
export const AdditiveCompositeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tBloom: { value: null as THREE.Texture | null },
    /** Fallback when bloom.a is lost; bloomFilterMultiplier = 0.35. */
    bloomStrength: { value: ODYSSEY_BLOOM_FILTER_MULTIPLIER },
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
      // Single ×0.35 — equivalent to BloomFilter burn-in + alpha=1 composite.
      gl_FragColor = vec4( scene.rgb + bloom.rgb * a, scene.a );
    }`,
};

export { ODYSSEY_BLOOM_FILTER_MULTIPLIER, ODYSSEY_BLOOM_KERNEL_5X5 };
