import { Shader } from "@/shaders/Shader";
import * as THREE from "three";

/**
 * ShaderGUIBackground class.
 *
 * Menu background texture with edge fade into the void fill.
 * Base Perlin edge alpha plus an extra slow smoke-curl UV warp for
 * additional disturbance where the void blends over the GUI art.
 *
 * @file ShaderGUIBackground.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ShaderGUIBackground extends Shader {

  constructor(){
    super();
    this.name = 'background-gui';
    this.fragment = `
    varying vec2 v_uv;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform sampler2D map;

    #include <shadertoy_perlin>

    void main(){
      vec2 p = gl_FragCoord.xy / max( u_resolution.y, 1.0 );
      float t = u_time;

      // Base edge noise (original scale).
      vec3 pFine = vec3( p, t * 0.025 );
      float value = simplex3d_fractal( pFine * 8.0 + 8.0 );

      float edge0 = 0.0;
      float edge1 = 0.175;

      float x = smoothstep( edge0, edge1, v_uv.x );
      float y = smoothstep( edge0, edge1, v_uv.y );

      float x2 = smoothstep( edge0, edge1, 1.0 - v_uv.x );
      float y2 = smoothstep( edge0, edge1, 1.0 - v_uv.y );

      float grad = ( x * x2 * y * y2 );
      float grad_inv = 1.0 - grad;

      // Fine warp (original disturbance).
      float fineWarp = grad_inv * grad_inv * 0.022;
      float nX = simplex3d( vec3( p * 3.2, t * 0.03 ) );
      float nY = simplex3d( vec3( p * 3.2 + 19.0, t * 0.028 ) );

      // Extra slow smoke-curl warp for large-scale variance on top.
      vec3 pSmoke = vec3( p + vec2( t * 0.008, -t * 0.005 ), t * 0.02 );
      float smokeWarp = grad_inv * grad_inv * 0.014;
      float sX = simplex3d_fractal( pSmoke * 3.5 + 4.0 );
      float sY = simplex3d_fractal( pSmoke * 3.5 + 9.0 );

      vec2 warp = vec2( nX, nY ) * fineWarp + vec2( sX, sY ) * smokeWarp;
      vec2 uvSample = clamp( v_uv + warp, vec2( 0.0 ), vec2( 1.0 ) );

      vec4 tex = texture2D( map, uvSample );

      value = value * grad;

      float alpha = grad + ( ( value * value ) * grad_inv );
      gl_FragColor.rgb = tex.rgb * alpha;
      gl_FragColor.a = alpha;
    }
    `;
    this.vertex = `
    varying vec2 v_uv;
    void main() {
      v_uv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `;
    this.uniforms = THREE.UniformsUtils.merge([
      {
        u_time: { value: 0.0 },
        u_resolution: { value: new THREE.Vector2(1600, 1200) },
        map: { value: null }
      }
    ])
  }

}
