import * as THREE from 'three';

/**
 * MiniGameAspectMaskShader — widescreen 4:3 letterbox for swoop / turret.
 *
 * minigame HUDs were authored for 4:3. On wider viewports the world
 * continues past the HUD frame; this pass fills that excess with black bars.
 *
 * @file MiniGameAspectMaskShader.ts
 */

interface MiniGameAspectMaskShader {
  uniforms: { [uniform: string]: THREE.IUniform<any> };
  vertexShader: string;
  fragmentShader: string;
}

/** Design aspect matching GUI / MG HUD framing. */
export const MINIGAME_SAFE_ASPECT = 4 / 3;

export const MiniGameAspectMaskShader: MiniGameAspectMaskShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uSafeAspect: { value: MINIGAME_SAFE_ASPECT },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uSafeAspect;
    varying vec2 vUv;

    void main() {
      vec4 scene = texture2D( tDiffuse, vUv );

      float screenAspect = max( uResolution.x / max( uResolution.y, 1.0 ), 0.0001 );
      float safeAspect = max( uSafeAspect, 0.0001 );

      // Centered safe rect in UV space (pillarbox when wider than 4:3).
      vec2 safeHalf = vec2( 0.5, 0.5 );
      if( screenAspect > safeAspect ){
        safeHalf.x = 0.5 * ( safeAspect / screenAspect );
      }else{
        safeHalf.y = 0.5 * ( screenAspect / safeAspect );
      }

      vec2 d = abs( vUv - vec2( 0.5 ) ) - safeHalf;
      float outside = max( d.x, d.y );
      float mask = step( outside, 0.0 );

      gl_FragColor = vec4( scene.rgb * mask, scene.a );
    }`,
};
