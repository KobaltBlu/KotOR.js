import { Shader } from "@engine/render/shaders/Shader";
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

    /**
     * Whether there is a void underneath this background.
     *
     * 1.0 = fade edges into the void.
     * 0.0 = background remains opaque.
     */
    uniform float u_voidFill;

    #include <shadertoy_perlin>

    void main(){

      /**
       * Keep procedural coordinates 1:1.
       *
       * Use width for both axes, matching the corrected void shader.
       */
      vec2 p =
        gl_FragCoord.xy /
        max(
          u_resolution.x,
          1.0
        );

      float t =
        u_time;

      /**
       * ------------------------------------------------------------
       * RECTANGULAR EDGE MASK
       * ------------------------------------------------------------
       */

      const float edge0 =
        0.0;

      const float edge1 =
        0.175;

      float x =
        smoothstep(
          edge0,
          edge1,
          v_uv.x
        );

      float y =
        smoothstep(
          edge0,
          edge1,
          v_uv.y
        );

      float x2 =
        smoothstep(
          edge0,
          edge1,
          1.0 -
          v_uv.x
        );

      float y2 =
        smoothstep(
          edge0,
          edge1,
          1.0 -
          v_uv.y
        );

      float grad =
        x *
        x2 *
        y *
        y2;

      float gradInv =
        1.0 -
        grad;

      /**
       * ------------------------------------------------------------
       * EDGE NOISE
       * ------------------------------------------------------------
       */

      vec3 pFine =
        vec3(
          p,
          t *
          0.025
        );

      float edgeNoise =
        simplex3d_fractal(
          pFine *
          8.0 +
          8.0
        );

      /**
       * Normalize to 0..1 before using it as opacity.
       *
       * The old shader squared the signed value. That makes negative
       * and positive noise equivalent, which isn't particularly useful
       * for defining an irregular boundary.
       */
      edgeNoise =
        edgeNoise *
        0.5 +
        0.5;

      /**
       * ------------------------------------------------------------
       * FINE UV WARP
       * ------------------------------------------------------------
       */

      float fineWarp =
        gradInv *
        gradInv *
        0.022;

      float nX =
        simplex3d(
          vec3(
            p *
            3.2,

            t *
            0.03
          )
        );

      float nY =
        simplex3d(
          vec3(
            p *
            3.2 +
            19.0,

            t *
            0.028
          )
        );

      /**
       * ------------------------------------------------------------
       * LARGE-SCALE SMOKE WARP
       * ------------------------------------------------------------
       */

      vec3 pSmoke =
        vec3(
          p +
          vec2(
            t *
            0.008,

            -t *
            0.005
          ),

          t *
          0.02
        );

      float smokeWarp =
        gradInv *
        gradInv *
        0.014;

      float sX =
        simplex3d_fractal(
          pSmoke *
          3.5 +
          4.0
        );

      float sY =
        simplex3d_fractal(
          pSmoke *
          3.5 +
          9.0
        );

      vec2 warp =
        vec2(
          nX,
          nY
        ) *
        fineWarp +

        vec2(
          sX,
          sY
        ) *
        smokeWarp;

      /**
       * Don't warp anything when there is no void blend.
       */
      warp *=
        u_voidFill;

      vec2 uvSample =
        clamp(
          v_uv +
          warp,
          vec2(0.0),
          vec2(1.0)
        );

      vec4 tex =
        texture2D(
          map,
          uvSample
        );

      /**
       * ------------------------------------------------------------
       * ORGANIC ALPHA
       * ------------------------------------------------------------
       *
       * grad already gives:
       *
       * edge -> 0
       * interior -> 1
       *
       * Noise should influence the transition region directly.
       *
       * Do NOT multiply edgeNoise by grad before using it.
       */
      float noisyEdge =
        mix(
          edgeNoise,
          1.0,
          grad
        );

      /**
       * Keep the center completely opaque while giving the outer
       * transition an irregular procedural profile.
       */
      float voidAlpha =
        grad +
        noisyEdge *
        gradInv *
        grad;

      voidAlpha =
        clamp(
          voidAlpha,
          0.0,
          1.0
        );

      /**
       * No void underneath:
       *
       * backgroundAlpha = 1
       *
       * Void underneath:
       *
       * backgroundAlpha = procedural fade
       */
      float backgroundAlpha =
        mix(
          1.0,
          voidAlpha,
          u_voidFill
        );

      float alpha =
        tex.a *
        backgroundAlpha;

      /**
       * STRAIGHT ALPHA.
       *
       * Do not multiply RGB by alpha.
       *
       * The transparent GUI render pass performs that multiplication
       * during blending.
       */
      gl_FragColor =
        vec4(
          tex.rgb,
          alpha
        );
    }
    `;

    this.vertex = `
    varying vec2 v_uv;

    void main(){

      v_uv =
        uv;

      gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(
          position,
          1.0
        );
    }
    `;

    this.uniforms =
      THREE.UniformsUtils.merge([
        {
          u_time: {
            value:
              0.0
          },

          u_resolution: {
            value:
              new THREE.Vector2(
                1600,
                1200
              )
          },

          u_voidFill: {
            value:
              0.0
          },

          map: {
            value:
              null
          }
        }
      ]);
  }
}