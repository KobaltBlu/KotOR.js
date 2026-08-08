import { Shader } from "@/shaders/Shader";
import * as THREE from "three";

import {
  GUI_FOG_VOLUME,
  GUI_FOG_ATLAS_WIDTH,
  GUI_FOG_ATLAS_HEIGHT
} from "@/shaders/datatextures/fog.datatexture";

export class ShaderGUIVoid extends Shader {

  constructor(){
    super();

    this.name =
      'void-gui';

    this.fragment = `
    uniform vec2 u_resolution;
    uniform float u_time;

    uniform vec3 u_color;
    uniform float u_colorIntensity;
    uniform float u_intensity;

    uniform sampler2D u_godRayMap;
    uniform vec2 u_godRayRotation;

    uniform sampler2D u_fogVolumeMap;

    #include <shadertoy_perlin>

    const vec3 METAL =
      vec3(
        0.42,
        0.50,
        0.60
      );

    const vec3 METAL_HI =
      vec3(
        0.58,
        0.66,
        0.78
      );

    const vec2 FOG_SLICE_SIZE =
      vec2(
        ${GUI_FOG_VOLUME.sliceWidth.toFixed(1)},
        ${GUI_FOG_VOLUME.sliceHeight.toFixed(1)}
      );

    const vec2 FOG_P_EXTENT =
      vec2(
        ${GUI_FOG_VOLUME.pExtentX.toFixed(8)},
        ${GUI_FOG_VOLUME.pExtentY.toFixed(8)}
      );

    const float FOG_FRAME_COUNT =
      ${GUI_FOG_VOLUME.frameCount.toFixed(1)};

    const float FOG_GRID_COLUMNS =
      ${GUI_FOG_VOLUME.gridColumns.toFixed(1)};

    const float FOG_PERIOD =
      ${GUI_FOG_VOLUME.periodSeconds.toFixed(8)};

    const vec2 FOG_ATLAS_SIZE =
      vec2(
        ${GUI_FOG_ATLAS_WIDTH.toFixed(1)},
        ${GUI_FOG_ATLAS_HEIGHT.toFixed(1)}
      );

    /**
     * Sample the PRECOMPUTED original simplex3d_fractal mid fog.
     *
     * One texture fetch returns:
     *
     * R = current temporal state
     * G = next temporal state
     */
    float sampleMidFog(
      vec2 p,
      float t
    ){
      /**
       * p itself does not include temporal drift here.
       *
       * That drift was evaluated during baking using the original
       * expression.
       */
      vec2 localUv =
        clamp(
          p /
          FOG_P_EXTENT,
          vec2(0.0),
          vec2(1.0)
        );

      float wrappedTime =
        mod(
          t,
          FOG_PERIOD
        );

      float framePosition =
        wrappedTime /
        FOG_PERIOD *
        FOG_FRAME_COUNT;

      float frame =
        floor(
          framePosition
        );

      float blend =
        fract(
          framePosition
        );

      /**
       * Smooth interpolation between the two baked temporal states.
       */
      blend =
        blend *
        blend *
        (
          3.0 -
          2.0 *
          blend
        );

      float tileX =
        mod(
          frame,
          FOG_GRID_COLUMNS
        );

      float tileY =
        floor(
          frame /
          FOG_GRID_COLUMNS
        );

      /**
       * Stay on texel centers at the tile boundaries.
       *
       * This prevents LinearFilter from bleeding into neighboring
       * animation tiles without needing gutters.
       */
      vec2 pixel =
        vec2(
          tileX,
          tileY
        ) *
        FOG_SLICE_SIZE;

      pixel +=
        vec2(0.5);

      pixel +=
        localUv *
        (
          FOG_SLICE_SIZE -
          vec2(1.0)
        );

      vec2 packedTex =
        texture2D(
          u_fogVolumeMap,
          pixel /
          FOG_ATLAS_SIZE
        ).rg;

      float value =
        mix(
          packedTex.r,
          packedTex.g,
          blend
        );

      /**
       * Texture already stores the original normalized mid:
       *
       * fractal * 0.5 + 0.5
       */
      return value;
    }

    vec3 metalFog(
      vec2 p,
      float t,
      out float density,
      out float farNoise,
      out float midNoise
    ){
      /**
       * Keep far procedural for now.
       *
       * One simplex call instead of the original four-octave fractal.
       */
      vec3 pFar =
        vec3(
          p *
          vec2(
            0.85,
            1.25
          ) +
          vec2(
            t * 0.006,
            -t * 0.004
          ),
          t * 0.018
        );

      float far =
        simplex3d(
          pFar *
          2.0 +
          2.0
        );

      /**
       * The actual original multi-octave mid fog.
       */
      float mid =
        sampleMidFog(
          p,
          t
        );

      /**
       * Near remains one simplex.
       */
      vec3 pNear =
        vec3(
          p *
          vec2(
            2.8,
            3.6
          ) +
          vec2(
            t * 0.02,
            t * 0.012
          ),
          t * 0.04
        );

      float near =
        simplex3d(
          pNear *
          rot1 +
          10.0
        );

      far =
        far *
        0.5 +
        0.5;

      near =
        near *
        0.5 +
        0.5;

      farNoise =
        far;

      midNoise =
        mid;

      /**
       * ORIGINAL SHAPING.
       *
       * Do not tune this until we've compared the cached fog with
       * the procedural version.
       */
      float ridge =
        pow(
          1.0 -
          abs(
            mid *
            2.0 -
            1.0
          ),
          2.4
        );

      float dFar =
        smoothstep(
          0.28,
          0.78,
          far
        );

      float dMid =
        smoothstep(
          0.32,
          0.8,
          mid
        ) *
        mix(
          0.35,
          1.0,
          ridge
        );

      float dNear =
        smoothstep(
          0.45,
          0.85,
          near
        ) *
        0.45;

      density =
        dFar *
        0.55 +
        dMid *
        0.7 +
        dNear *
        0.35;

      density =
        clamp(
          density,
          0.0,
          1.0
        );

      vec3 col =
        mix(
          METAL *
          0.35,
          METAL,
          density
        );

      col =
        mix(
          col,
          METAL_HI,
          ridge *
          dMid *
          0.55
        );

      float near2 =
        near *
        near;

      float near4 =
        near2 *
        near2;

      float near8 =
        near4 *
        near4;

      col +=
        METAL_HI *
        near8 *
        0.12;

      return (
        col *
        density
      );
    }

    vec2 rotate2D(
      vec2 p,
      vec2 cs
    ){
      return vec2(
        p.x *
        cs.x -
        p.y *
        cs.y,

        p.x *
        cs.y +
        p.y *
        cs.x
      );
    }

    float godRays(
      vec2 uv,
      float fogDensity
    ){
      const vec2 lightPos =
        vec2(
          0.0,
          0.28
        );

      const float invDiameter =
        0.3571428571;

      vec2 delta =
        uv -
        lightPos;

      vec2 rayA =
        rotate2D(
          delta,
          u_godRayRotation
        );

      vec2 rayUvA =
        rayA *
        invDiameter +
        0.5;

      float shaftsA =
        texture2D(
          u_godRayMap,
          rayUvA
        ).r;

      vec2 inverseRotation =
        vec2(
          u_godRayRotation.x,
          -u_godRayRotation.y
        );

      vec2 rayB =
        rotate2D(
          delta *
          0.94,
          inverseRotation
        );

      vec2 rayUvB =
        rayB *
        invDiameter +
        0.5;

      float shaftsB =
        texture2D(
          u_godRayMap,
          rayUvB
        ).r;

      float shafts =
        min(
          shaftsA *
          0.72 +
          shaftsB *
          0.32,
          1.0
        );

      return (
        shafts *
        (
          0.35 +
          fogDensity *
          0.65
        )
      );
    }

    void main(){

      /**
       * Radial coordinate.
       */
      vec2 uv =
        2.0 *
        gl_FragCoord.xy /
        max(
          u_resolution.xy,
          vec2(1.0)
        ) -
        1.0;

      /**
       * ORIGINAL 1:1 fog coordinate system.
       *
       * Both axes divide by WIDTH.
       */
      vec2 p =
        gl_FragCoord.xy /
        max(
          u_resolution.x,
          1.0
        );

      float t =
        u_time;

      float radial =
        length(uv);

      float radialBase =
        1.0 -
        smoothstep(
          0.0,
          0.5,
          radial
        );

      vec3 washTint =
        mix(
          METAL,
          u_color,
          0.25
        );

      vec3 base =
        washTint *
        radialBase *
        u_colorIntensity;

      float centerGlow =
        1.0 -
        smoothstep(
          0.0,
          1.1,
          radial
        );

      centerGlow *=
        centerGlow *
        0.28;

      float depthVignette =
        mix(
          1.05,
          0.7,
          smoothstep(
            0.15,
            1.35,
            radial
          )
        );

      float fogDensity;
      float farNoise;
      float midNoise;

      vec3 fog =
        metalFog(
          p,
          t,
          fogDensity,
          farNoise,
          midNoise
        );

      /**
       * Reuse far rather than the separate original fractal.
       */
      float value =
        farNoise -
        0.25;

      /**
       * Reuse actual multi-octave mid fog for smoke modulation.
       */
      float smoke =
        mix(
          0.46,
          0.58,
          midNoise
        );

      float rays =
        godRays(
          uv,
          fogDensity
        );

      const vec3 ETHER_COLOR =
        vec3(
          0.492,
          0.572,
          0.681
        );

      const vec3 RAY_COLOR =
        vec3(
          0.516,
          0.596,
          0.708
        );

      vec3 etherLift =
        ETHER_COLOR *
        (
          centerGlow +
          value *
          0.18
        );

      vec3 rgb =
        base *
        0.7 +
        etherLift *
        0.85;

      rgb +=
        fog *
        0.8;

      rgb +=
        METAL *
        value *
        0.28;

      rgb =
        mix(
          rgb,
          rgb *
          smoke *
          1.15 +
          METAL *
          (
            smoke -
            0.5
          ) *
          0.16,
          0.32
        );

      rgb +=
        RAY_COLOR *
        rays *
        0.7;

      rgb *=
        depthVignette;

      gl_FragColor =
        vec4(
          rgb *
          u_intensity,
          1.0
        );
    }
    `;

    this.vertex = `
      void main(){
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
          u_resolution: {
            value:
              new THREE.Vector2(
                1600,
                1200
              )
          },

          u_time: {
            value:
              0.0
          },

          u_color: {
            value:
              new THREE.Color(
                0.42,
                0.50,
                0.60
              )
          },

          u_colorIntensity: {
            value:
              0.42
          },

          u_intensity: {
            value:
              0.38
          },

          u_godRayMap: {
            value:
              null
          },

          u_godRayRotation: {
            value:
              new THREE.Vector2(
                1.0,
                0.0
              )
          },

          u_fogVolumeMap: {
            value:
              null
          }
        }
      ]);
  }
}