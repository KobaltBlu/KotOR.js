import { Shader } from "@/shaders/Shader";
import * as THREE from "three";

import {
  GUI_FOG_VOLUME
} from "@/shaders/datatextures/fog.datatexture";

export class ShaderGUIVoid extends Shader {

  constructor(){
    super();

    this.name =
      'void-gui';

    this.fragment = `
    precision highp float;
    precision highp sampler3D;

    uniform float u_fogTime;
    uniform float u_heightOverWidth;

    uniform vec3 u_color;
    uniform float u_colorIntensity;
    uniform float u_intensity;

    uniform sampler2D u_godRayMap;
    uniform vec2 u_godRayRotation;

    uniform sampler3D u_fogVolume;

    varying vec2 vUv;
    out vec4 fragColor;

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

    const vec2 FOG_INV_P_EXTENT =
      vec2(
        ${(1 / GUI_FOG_VOLUME.pExtentX).toFixed(8)},
        ${(1 / GUI_FOG_VOLUME.pExtentY).toFixed(8)}
      );

    /**
     * Sample baked far / mid / near from the fog volume.
     *
     * R = far, G = mid, B = near (already normalized 0..1).
     * Temporal position is u_fogTime (CPU-wrapped 0..1).
     */
    vec3 sampleFogVolume(
      vec2 p
    ){
      vec2 localUv =
        clamp(
          p *
          FOG_INV_P_EXTENT,
          vec2(0.0),
          vec2(1.0)
        );

      return texture(
        u_fogVolume,
        vec3(
          localUv,
          u_fogTime
        )
      ).rgb;
    }

    vec3 metalFog(
      vec2 p,
      out float density,
      out float farNoise,
      out float midNoise
    ){
      vec3 fogNoise =
        sampleFogVolume(
          p
        );

      float far =
        fogNoise.r;

      float mid =
        fogNoise.g;

      float near =
        fogNoise.b;

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
        texture(
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
        texture(
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
       * Radial coordinate from fullscreen UV.
       */
      vec2 uv =
        vUv *
        2.0 -
        1.0;

      /**
       * ORIGINAL 1:1 fog coordinate system.
       *
       * Both axes are relative to width: p.y spans height/width.
       */
      vec2 p =
        vec2(
          vUv.x,
          vUv.y *
          u_heightOverWidth
        );

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

      fragColor =
        vec4(
          rgb *
          u_intensity,
          1.0
        );
    }
    `;

    this.vertex = `
      varying vec2 vUv;

      void main(){
        vUv = uv;

        /**
         * Clip-space fullscreen quad (PlaneGeometry 2x2).
         */
        gl_Position =
          vec4(
            position.xy,
            0.0,
            1.0
          );
      }
    `;

    this.uniforms =
      THREE.UniformsUtils.merge([
        {
          u_fogTime: {
            value:
              0.0
          },

          u_heightOverWidth: {
            value:
              0.75
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

          u_fogVolume: {
            value:
              null
          }
        }
      ]) as any;
  }
}
