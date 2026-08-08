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
    uniform sampler2D u_godRayMap;
    uniform vec2 u_godRayRotation;

    #include <shadertoy_perlin>

    // Cool steel grey with a blue-metal hint (KotOR GUI panel feel).
    const vec3 METAL = vec3( 0.42, 0.50, 0.60 );
    const vec3 METAL_HI = vec3( 0.58, 0.66, 0.78 );

    // Stronger multi-octave Perlin fog in blue-metal grey.
    vec4 metalFog( vec2 uv, float t ) {
      vec3 pFar = vec3(
        uv * vec2(0.85, 1.25) +
        vec2(t * 0.006, -t * 0.004),
        t * 0.018
      );

      vec3 pMid = vec3(
        uv * vec2(1.6, 2.3) +
        vec2(-t * 0.014, t * 0.009),
        t * 0.028
      );

      vec3 pNear = vec3(
        uv * vec2(2.8, 3.6) +
        vec2(t * 0.02, t * 0.012),
        t * 0.04
      );

      float far = simplex3d_fractal(
        pFar * 2.0 + 2.0
      );

      float mid = simplex3d_fractal(
        pMid * 2.6 + 6.0
      );

      float near = simplex3d(
        pNear * rot1 + 10.0
      );

      far = far * 0.5 + 0.5;
      mid = mid * 0.5 + 0.5;
      near = near * 0.5 + 0.5;

      float ridge =
        1.0 - abs(mid * 2.0 - 1.0);

      ridge *= ridge;

      float dFar =
        smoothstep(0.28, 0.78, far);

      float dMid =
        smoothstep(0.32, 0.8, mid) *
        mix(0.35, 1.0, ridge);

      float dNear =
        smoothstep(0.45, 0.85, near) *
        0.45;

      float density =
        dFar * 0.55 +
        dMid * 0.7 +
        dNear * 0.35;

      density = clamp(
        density,
        0.0,
        1.0
      );

      vec3 col =
        mix(
          METAL * 0.35,
          METAL,
          density
        );

      col = mix(
        col,
        METAL_HI,
        ridge * dMid * 0.55
      );

      float near2 = near * near;
      float near4 = near2 * near2;
      float near8 = near4 * near4;

      col +=
        METAL_HI *
        near8 *
        0.12;

      /*
      * RGB = fog
      * A   = mid noise, reusable elsewhere
      */
      return vec4(
        col * density,
        mid
      );
    }

    vec2 rotate2D( vec2 p, vec2 cs ) {
      return vec2(
        p.x * cs.x - p.y * cs.y,
        p.x * cs.y + p.y * cs.x
      );
    }

    // Pre-baked god-ray texture.
    // Angular shafts, radial attenuation, and breakup are generated once on CPU.
    float godRays( vec2 uv, float fogDensity ) {
      const vec2 lightPos = vec2( 0.0, 0.28 );

      // Texture represents -1.4 .. +1.4 around its center.
      const float extent = 1.4;
      const float invDiameter = 1.0 / ( extent * 2.0 );

      vec2 delta = uv - lightPos;

      // Main slowly rotating layer.
      vec2 rayA = rotate2D( delta, u_godRayRotation );
      vec2 rayUvA = rayA * invDiameter + 0.5;

      float shaftsA = texture2D( u_godRayMap, rayUvA ).r;

      // Counter-rotating secondary layer.
      //
      // This replaces some of the independently moving angular frequencies
      // from the original procedural implementation. Still dramatically
      // cheaper than atan/sin/pow/simplex.
      vec2 inverseRotation = vec2(
        u_godRayRotation.x,
        -u_godRayRotation.y
      );

      vec2 rayB = rotate2D(
        delta * 0.94,
        inverseRotation
      );

      vec2 rayUvB = rayB * invDiameter + 0.5;

      float shaftsB = texture2D( u_godRayMap, rayUvB ).r;

      float shafts = clamp(
        shaftsA * 0.72 +
        shaftsB * 0.32,
        0.0,
        1.0
      );

      // Fog still modulates rays dynamically.
      float fogGate = mix( 0.35, 1.0, fogDensity );

      return shafts * fogGate;
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

      vec4 fogData = metalFog(p, t);
      vec3 fog = fogData.rgb;
      float midNoise = fogData.a;

      float fogAmt = clamp( length( fog ) * 1.8, 0.0, 1.0 );
      // float stars = softStars( p, t );
      float smoke = mix(
        0.46,
        0.58,
        midNoise
      );
      float rays = godRays( uv, fogAmt );

      vec3 etherLift = mix( METAL, METAL_HI, 0.45 ) * ( centerGlow + value * 0.18 );

      vec3 rgb = base * 0.7 + etherLift * 0.85;
      // Stronger Perlin metal fog.
      rgb += fog * 0.8;
      rgb += METAL * value * 0.28;
      // rgb += METAL_HI * stars * 0.55;
      rgb = mix( rgb, rgb * smoke * 1.15 + METAL * ( smoke - 0.5 ) * 0.16, 0.32 );

      // God rays in luminous blue-metal.
      rgb += mix( METAL, METAL_HI, 0.6 ) * rays * 0.7;

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
        u_colorIntensity: {value: 0.42 },
        u_intensity: {value: 0.38 },
        u_godRayMap: {
          value: null
        },
        // x = cos(angle)
        // y = sin(angle)
        u_godRayRotation: {
          value: new THREE.Vector2(1.0, 0.0)
        },
      }
    ])
  }

}
