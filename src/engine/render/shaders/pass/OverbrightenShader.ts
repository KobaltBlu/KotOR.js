import * as THREE from 'three';

/**
 * OverbrightenShader — RenderOverlayOverbrighten +
 * LUT init in InitializeFrameBufferModifications.
 *
 * Full-screen REPLACE (glBlendFunc GL_ONE, GL_ZERO). ARBfp ADD_SAT only merges
 * the three per-channel 1D LUT texels into RGB — it does not add to the scene.
 *
 * Shipping leaves this pass off: visualizePass1 is BSS-zero with no writers.
 * Enable only via VideoEffectManager.debugVisualizeOverbrighten.
 *
 * Curve (= 0.5):
 * f >= 0.5 → sqrt((f-0.5)*0.5) + 0.5
 * else → 2*f*f
 */
interface OverbrightenShader {
  uniforms: { [uniform: string]: THREE.IUniform<any>; };
  vertexShader: string;
  fragmentShader: string;
}

export const OverbrightenShader: OverbrightenShader = {
  uniforms: {
    tDiffuse: { value: null },
    tLut: { value: null },
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
      // Same LUT for R/G/B (builds three identical curves)
      float r = texture2D( tLut, vec2( c.r, 0.5 ) ).r;
      float g = texture2D( tLut, vec2( c.g, 0.5 ) ).r;
      float b = texture2D( tLut, vec2( c.b, 0.5 ) ).r;
      gl_FragColor = vec4( r, g, b, c.a );
    }`,
};

/** Build the overbrighten 1D LUT as a 256×1 DataTexture. */
export function createOverbrightenLutTexture(): THREE.DataTexture {
  const data = new Uint8Array(256 * 4);
  for(let i = 0; i < 256; i++){
    let f = i / 255;
    if(f >= 0.5){
      f = Math.sqrt((f - 0.5) * 0.5) + 0.5;
    }else{
      f = f * f * 0.5 * 4.0; // 2*f^2
    }
    const v = Math.max(0, Math.min(255, Math.round(f * 255)));
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
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
