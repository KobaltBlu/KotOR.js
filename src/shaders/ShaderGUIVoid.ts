import { Shader } from "@/shaders/Shader";
import * as THREE from "three";

/**
 * ShaderGUIVoid class.
 *
 * Fullscreen muted void behind menus that use voidFill.
 * Radial wash + legacy Perlin shimmer + nebula + soft stars, with an
 * extra slow smoke curl for variance. Brightness stays gated by
 * u_intensity / u_colorIntensity (retail-menu feel).
 *
 * @file ShaderGUIVoid.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ShaderGUIVoid extends Shader {

  constructor(){
    super();
    this.name = 'void-gui';
    this.fragment = `
    varying vec2 v_uv;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec3 u_color;
    uniform float u_colorIntensity;
    uniform float u_intensity;

    #include <shadertoy_perlin>

    // Soft point lights from high-power simplex peaks (no cell grid).
    float softStars( vec2 uv, float t ) {
      float s1 = simplex3d( vec3( uv * 28.0, t * 0.15 ) );
      float s2 = simplex3d( vec3( uv * 41.0 + 13.0, t * 0.11 + 3.0 ) );
      s1 = s1 * 0.5 + 0.5;
      s2 = s2 * 0.5 + 0.5;
      float twinkle = 0.7 + 0.3 * sin( t * 1.7 + s1 * 20.0 );
      return ( pow( s1, 18.0 ) * 0.7 + pow( s2, 22.0 ) * 0.9 ) * twinkle;
    }

    vec3 mutedNebula( vec2 uv, float t, vec3 tint ) {
      vec3 pSlow = vec3( uv * vec2( 1.2, 1.8 ) + vec2( t * 0.012, -t * 0.008 ), t * 0.025 );
      vec3 pMid  = vec3( uv * vec2( 2.4, 3.4 ) + vec2( -t * 0.02, t * 0.012 ), t * 0.04 );
      vec3 pFine = vec3( uv * 5.5 + vec2( t * 0.025, t * 0.012 ), t * 0.05 );

      float n1 = simplex3d_fractal( pSlow * 1.1 + 3.0 );
      float n2 = simplex3d_fractal( pMid + 7.0 );
      float n3 = simplex3d( pFine * rot1 + 11.0 );

      n1 = n1 * 0.5 + 0.5;
      n2 = n2 * 0.5 + 0.5;
      n3 = n3 * 0.5 + 0.5;

      float ridge = 1.0 - abs( n2 * 2.0 - 1.0 );
      ridge = pow( ridge, 2.8 );

      float density = smoothstep( 0.32, 0.8, n1 );
      density *= mix( 0.3, 1.0, ridge );

      vec3 deep = vec3( 0.0 );
      vec3 mid = tint * 0.55;
      vec3 hot = mix( tint, vec3( 0.85 ), 0.25 ) * 0.75;

      vec3 col = mix( deep, mid, density );
      col = mix( col, hot, ridge * density * 0.55 );
      col += tint * pow( n3, 10.0 ) * 0.16;
      return col;
    }

    // Extra low-contrast smoke layer for slow large-scale variance.
    float smokeCurl( vec2 uv, float t ) {
      vec3 p3 = vec3( uv + vec2( t * 0.008, -t * 0.005 ), t * 0.02 );
      float smoke = simplex3d_fractal( p3 * 3.5 + 4.0 );
      smoke = smoke * 0.5 + 0.5;
      return mix( 0.42, 0.58, smoke );
    }

    void main(){
      // Soft radial wash (center tint).
      vec2 uv = 2.0 * gl_FragCoord.xy / u_resolution.xy - 1.0;
      float Length = length( uv );
      Length = 1.0 - smoothstep( Length, 0.0, 0.5 );
      vec3 base = u_color * Length * u_colorIntensity;

      vec2 p = gl_FragCoord.xy / max( u_resolution.x, 1.0 );
      float t = u_time;

      // Legacy single-octave wash (familiar shimmer).
      float value = simplex3d_fractal( vec3( p, t * 0.025 ) * 8.0 + 8.0 );
      value = ( value + 0.5 ) * 0.5;

      vec3 nebula = mutedNebula( p, t, u_color );
      float stars = softStars( p + vec2( t * 0.003, -t * 0.002 ), t );
      float smoke = smokeCurl( p, t );

      // Slight edge darkening so depth sits behind the panel.
      float depth = mix( 1.0, 0.78, smoothstep( 0.4, 1.35, length( uv ) ) );

      vec3 rgb = base + vec3( value ) * 0.65;
      rgb += nebula * 0.55;
      rgb += u_color * stars * 0.45;
      // Smoke curl on top — additional large-scale disturbance.
      rgb = mix( rgb, rgb * smoke * 1.35 + u_color * smoke * 0.12, 0.55 );
      rgb *= depth;

      gl_FragColor = vec4( rgb * u_intensity, 1.0 );
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
        u_resolution: { value: new THREE.Vector2() },
        u_color: { value: new THREE.Color(0xFFFFFF) },
        u_colorIntensity: {value: 0.25 },
        u_intensity: {value: 0.15 },
      }
    ])
  }

}
