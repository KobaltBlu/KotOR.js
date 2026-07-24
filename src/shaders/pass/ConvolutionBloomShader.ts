import * as THREE from 'three';

/**
 * Convolution / bloom helpers — retail RenderOverlayConvolution @ 0042c6e0
 * + bright-extract LUTs from InitializeFrameBufferModifications @ 00427c90.
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
    data[i * 4 + 3] = 255;
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
      // Per-channel LUT: sample R lut at c.r, G at c.g, B at c.b
      float r = texture2D( tLut, vec2( c.r, 0.5 ) ).r;
      float g = texture2D( tLut, vec2( c.g, 0.5 ) ).g;
      float b = texture2D( tLut, vec2( c.b, 0.5 ) ).b;
      gl_FragColor = vec4( r, g, b, 1.0 );
    }`,
};

export const KawaseBlurShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    offset: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 offset;
    varying vec2 vUv;
    void main() {
      vec4 sum = texture2D( tDiffuse, vUv + vec2( -offset.x, -offset.y ) );
      sum += texture2D( tDiffuse, vUv + vec2(  offset.x, -offset.y ) );
      sum += texture2D( tDiffuse, vUv + vec2( -offset.x,  offset.y ) );
      sum += texture2D( tDiffuse, vUv + vec2(  offset.x,  offset.y ) );
      gl_FragColor = sum * 0.25;
    }`,
};

export const AdditiveCompositeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tBloom: { value: null as THREE.Texture | null },
    bloomStrength: { value: 1.0 },
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
      // Retail glBlendFunc(GL_SRC_ALPHA, GL_ONE) style add
      gl_FragColor = vec4( scene.rgb + bloom.rgb * bloomStrength, scene.a );
    }`,
};
