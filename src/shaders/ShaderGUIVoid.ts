import { Shader } from "@/shaders/Shader";
import * as THREE from "three";

/**
 * ShaderGUIVoid class.
 *
 * Fullscreen ethereal void behind menus that use voidFill.
 * Blue-metal grey Perlin fog, soft god rays, layered depth, and
 * drifting luminous dust. Matches the cool steel of KotOR GUI panels.
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

    // Cool steel grey with a blue-metal hint (KotOR GUI panel feel).
    const vec3 METAL = vec3( 0.42, 0.50, 0.60 );
    const vec3 METAL_HI = vec3( 0.58, 0.66, 0.78 );

    float softStars( vec2 uv, float t ) {
      vec2 farUv = uv * 0.85 + vec2( t * 0.0012, -t * 0.0008 );
      float s1 = simplex3d( vec3( farUv * 26.0, t * 0.06 ) );
      float s2 = simplex3d( vec3( farUv * 38.0 + 13.0, t * 0.045 + 3.0 ) );
      s1 = s1 * 0.5 + 0.5;
      s2 = s2 * 0.5 + 0.5;
      float twinkle = 0.8 + 0.2 * sin( t * 0.85 + s1 * 14.0 );
      return ( pow( s1, 19.0 ) * 0.55 + pow( s2, 24.0 ) * 0.75 ) * twinkle;
    }

    // Stronger multi-octave Perlin fog in blue-metal grey.
    vec3 metalFog( vec2 uv, float t ) {
      vec3 pFar = vec3( uv * vec2( 0.85, 1.25 ) + vec2( t * 0.006, -t * 0.004 ), t * 0.018 );
      vec3 pMid = vec3( uv * vec2( 1.6, 2.3 ) + vec2( -t * 0.014, t * 0.009 ), t * 0.028 );
      vec3 pNear = vec3( uv * vec2( 2.8, 3.6 ) + vec2( t * 0.02, t * 0.012 ), t * 0.04 );

      float far = simplex3d_fractal( pFar * 2.0 + 2.0 );
      float mid = simplex3d_fractal( pMid * 2.6 + 6.0 );
      float near = simplex3d( pNear * rot1 + 10.0 );

      far = far * 0.5 + 0.5;
      mid = mid * 0.5 + 0.5;
      near = near * 0.5 + 0.5;

      float ridge = pow( 1.0 - abs( mid * 2.0 - 1.0 ), 2.4 );

      float dFar = smoothstep( 0.28, 0.78, far );
      float dMid = smoothstep( 0.32, 0.8, mid ) * mix( 0.35, 1.0, ridge );
      float dNear = smoothstep( 0.45, 0.85, near ) * 0.45;

      float density = dFar * 0.55 + dMid * 0.7 + dNear * 0.35;
      density = clamp( density, 0.0, 1.0 );

      vec3 col = mix( METAL * 0.35, METAL, density );
      col = mix( col, METAL_HI, ridge * dMid * 0.55 );
      col += METAL_HI * pow( near, 8.0 ) * 0.12;
      return col * density;
    }

    float smokeCurl( vec2 uv, float t ) {
      vec3 p3 = vec3( uv + vec2( t * 0.006, -t * 0.004 ), t * 0.016 );
      float smoke = simplex3d_fractal( p3 * 3.0 + 4.0 );
      smoke = smoke * 0.5 + 0.5;
      return mix( 0.46, 0.58, smoke );
    }

    // Soft volumetric god rays from an upper-center light well.
    float godRays( vec2 uv, float t, float fogDensity ) {
      // Light origin slightly above center (menu “sky”).
      vec2 lightPos = vec2( 0.0, 0.28 );
      vec2 delta = uv - lightPos;
      float dist = length( delta );
      float angle = atan( delta.y, delta.x );

      // Shaft pattern — angular bands with slow drift.
      float shafts = 0.0;
      shafts += pow( max( 0.0, sin( angle * 10.0 + t * 0.15 ) ), 6.0 );
      shafts += pow( max( 0.0, sin( angle * 16.0 - t * 0.11 + 1.7 ) ), 8.0 ) * 0.65;
      shafts += pow( max( 0.0, sin( angle * 7.0 + t * 0.08 ) ), 4.0 ) * 0.4;
      shafts = clamp( shafts, 0.0, 1.0 );

      // Soften with fog so rays feel volumetric, not hard streaks.
      float fogGate = mix( 0.35, 1.0, fogDensity );
      float falloff = exp( -dist * 1.55 ) * smoothstep( 1.4, 0.05, dist );
      // Slight noise break-up along the ray.
      float breakUp = simplex3d( vec3( angle * 2.0, dist * 3.0, t * 0.05 ) );
      breakUp = breakUp * 0.5 + 0.5;
      breakUp = mix( 0.7, 1.15, breakUp );

      return shafts * falloff * fogGate * breakUp;
    }

    vec2 filmDust( vec2 uv, float t ) {
      float core = 0.0;
      float halo = 0.0;

      for( int i = 0; i < 4; i++ ){
        float fi = float( i );
        float depthT = fi / 3.0;
        float scale = 11.0 + fi * 9.0;
        float speed = 0.012 + depthT * 0.038;
        vec2 drift = vec2(
          t * speed * ( i == 1 || i == 3 ? -1.0 : 1.0 ),
          t * speed * 0.62 * ( i == 2 ? -1.0 : 1.0 )
        );
        vec2 pUv = uv * scale * mix( 0.75, 1.15, depthT ) + drift + vec2( fi * 7.3, fi * 4.1 );

        float n = simplex3d( vec3( pUv, fi * 2.3 ) );
        n = n * 0.5 + 0.5;

        float softness = mix( 6.5, 10.5, depthT );
        float mote = pow( n, softness );
        mote = smoothstep( mix( 0.06, 0.12, depthT ), 0.95, mote );

        float id = simplex3d( vec3( pUv * 0.32 + 11.0, fi * 4.2 ) );
        id = id * 0.5 + 0.5;
        float brightness = mix( 0.2, 1.2, pow( id, 1.4 ) );
        brightness *= mix( 0.35, 1.05, depthT );

        float breathe = 0.78 + 0.22 * sin( t * ( 0.4 + depthT * 0.45 ) + id * 9.0 );
        float layerGain = mix( 0.35, 0.7, depthT );
        float lit = mote * brightness * breathe * layerGain;

        core += lit;

        float glowPow = mix( 3.2, 5.5, depthT );
        float glow = pow( n, glowPow ) * brightness;
        glow = smoothstep( 0.04, mix( 0.55, 0.7, depthT ), glow );
        halo += glow * breathe * mix( 0.45, 0.22, depthT );
      }

      return vec2( clamp( core, 0.0, 1.6 ), clamp( halo, 0.0, 1.4 ) );
    }

    void main(){
      vec2 uv = 2.0 * gl_FragCoord.xy / u_resolution.xy - 1.0;
      float radial = length( uv );
      float Length = 1.0 - smoothstep( radial, 0.0, 0.5 );
      // Prefer metal palette; u_color still tints slightly.
      vec3 washTint = mix( METAL, u_color, 0.25 );
      vec3 base = washTint * Length * u_colorIntensity;

      vec2 p = gl_FragCoord.xy / max( u_resolution.x, 1.0 );
      float t = u_time;

      float centerGlow = exp( -radial * radial * 1.4 ) * 0.28;
      float depthVignette = mix( 1.05, 0.7, smoothstep( 0.15, 1.35, radial ) );

      float value = simplex3d_fractal( vec3( p, t * 0.018 ) * 6.5 + 8.0 );
      value = ( value + 0.5 ) * 0.5;

      vec3 fog = metalFog( p, t );
      float fogAmt = clamp( length( fog ) * 1.8, 0.0, 1.0 );
      float stars = softStars( p, t );
      float smoke = smokeCurl( p, t );
      float rays = godRays( uv, t, fogAmt );
      vec2 dust = filmDust( p, t );

      vec3 etherLift = mix( METAL, METAL_HI, 0.45 ) * ( centerGlow + value * 0.18 );

      vec3 rgb = base * 0.75 + etherLift;
      // Stronger Perlin metal fog.
      rgb += fog * 0.95;
      rgb += METAL * value * 0.35;
      rgb += METAL_HI * stars * 0.65;
      rgb = mix( rgb, rgb * smoke * 1.18 + METAL * ( smoke - 0.5 ) * 0.2, 0.35 );

      // God rays in luminous blue-metal.
      rgb += mix( METAL, METAL_HI, 0.6 ) * rays * 0.85;

      rgb += vec3( dust.x ) * 0.75;
      rgb += mix( METAL_HI, vec3( 0.85 ), 0.25 ) * dust.y * 0.55;
      rgb += METAL * dust.y * dust.y * 0.15;

      rgb *= depthVignette;

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
        u_color: { value: new THREE.Color(0.42, 0.50, 0.60) },
        u_colorIntensity: {value: 0.5 },
        u_intensity: {value: 0.48 },
      }
    ])
  }

}
