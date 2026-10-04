import * as THREE from "three";
import { Shader } from "@engine/render/shaders/Shader";
import { ODYSSEY_WIND_VERTEX_LIBRARY } from "@engine/render/shaders/odysseyWind";
import { GRASS_ALPHA_TEST_DEFAULT } from "@engine/managers/grass/grassHelpers";
import { ODYSSEY_UV_CHANNEL_DEFINES } from "@engine/render/shaders/chunks/OdysseyUvChannels";

/**
 * ShaderGrass — billboard grass with GPU wind tip sway.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ShaderGrass.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ShaderGrass extends Shader {

  constructor(){
    super();
    this.name = 'grass';
    this.uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib["common"],
      {
        map: { value: null },
        lightMap: { value: null },
        time: { value: 0 },
        ambientColor: { value: new THREE.Color(0xffffff) },
        diffuseColor: { value: new THREE.Color(0xffffff) },
        planeHeightJitter: { value: 0.05 },
        quadSize: { value: 1.0 },
        grassStiffness: { value: 1.0 },
        binFade: { value: 1.0 },
        alphaTest: { value: GRASS_ALPHA_TEST_DEFAULT },
      }
    ]) as any;
    this.vertex = `
    #include <common>
    #include <uv_pars_vertex>
    #include <logdepthbuf_pars_vertex>

    ${ODYSSEY_WIND_VERTEX_LIBRARY}

    attribute float instanceID;
    varying float vInstanceID;

    uniform float time;
    uniform float planeHeightJitter;
    uniform float quadSize;
    uniform float grassStiffness;
    uniform float binFade;
    uniform float windGrassDt;

    attribute float constraint;
    attribute float grassQuad;
    attribute float quadIdx;
    varying vec4 vSpriteSheet;

    attribute vec2 lightmapUV;
    varying vec2 vLightmapUV;
    varying float vBinFade;

    float rand01(float x) {
      return fract(sin(x * 12.9898) * 43758.5453);
    }

    void main() {
      vInstanceID = instanceID;
      vLightmapUV = lightmapUV;
      vBinFade = binFade;

      ${ODYSSEY_UV_CHANNEL_DEFINES}
      #include <uv_vertex>

      float uvFrameIndex = grassQuad;
      float framesX = 2.0;
      float framesY = 2.0;
      float column = floor(mod(uvFrameIndex, framesX));
      float row = floor((uvFrameIndex - column) / framesX);
      vSpriteSheet.x = column / framesX;
      vSpriteSheet.y = row / framesY;
      vSpriteSheet.z = (1.0 / framesX);
      vSpriteSheet.w = (1.0 / framesY);

      #include <begin_vertex>

      float planeHeightOffset = (rand01((vInstanceID * 29.0) + (quadIdx * 113.0)) - 0.5) * planeHeightJitter;
      transformed.y += planeHeightOffset;

      // Instance mid (blade root / bottom center) in world space
      vec4 midLocal = vec4(0.0, 0.0, 0.0, 1.0);
      #ifdef USE_INSTANCING
        midLocal = instanceMatrix * midLocal;
      #endif
      vec4 midWorld4 = modelMatrix * midLocal;
      vec3 midWorld = midWorld4.xyz;

      // Steady-state tip offset ≈ wind + gust (spring equilibrium, Z flattened)
      vec3 wind = odyssey_get_global_wind_no_point(midWorld, 1.0);
      float windMag = length(wind);
      if (windMag > 5.0) {
        wind *= (5.0 / windMag);
      }
      vec3 gust = odyssey_point_source_wind(midWorld);
      vec3 tipForce = wind + gust;
      tipForce.z = 0.0;

      if (constraint > 0.0) {
        float dt = clamp(windGrassDt, 0.0, 0.1);
        // Scale matches tip integration strength without per-blade CPU state.
        vec3 tipOffset = tipForce * grassStiffness * quadSize * max(dt * 8.0, 0.35);
        transformed.xyz += tipOffset * constraint;
      }

      #include <project_vertex>
      #include <logdepthbuf_vertex>
      #include <worldpos_vertex>
    }`;

    this.fragment = `
    uniform vec3 diffuse;
    uniform float opacity;
    uniform float alphaTest;
    uniform vec3 ambientColor;
    uniform vec3 diffuseColor;
    #include <common>
    #include <uv_pars_fragment>
    #include <map_pars_fragment>
    #include <fog_pars_fragment>
    #include <logdepthbuf_pars_fragment>
    varying float vInstanceID;
    varying vec4 vSpriteSheet;
    varying float vBinFade;
    #ifdef ODYSSEY_GRASS_LIGHTMAP
      uniform sampler2D lightMap;
      varying vec2 vLightmapUV;
    #endif
    void main() {
      vec2 uvTransform = vec2(
        vSpriteSheet.x + (vSpriteSheet.z * (1.0 - vUv.x)),
        vSpriteSheet.y + (vSpriteSheet.w * vUv.y)
      );
      vec4 texelColor = texture2D(map, uvTransform);
      vec3 lightmapColor = vec3(1.0);

      #ifdef ODYSSEY_GRASS_LIGHTMAP
        lightmapColor = texture2D(lightMap, vLightmapUV).rgb;
      #endif

      // ARE Grass_Ambient / Grass_Diffuse tinted by lightmap (white if both unset)
      vec3 tint = mix(ambientColor, diffuseColor, 0.5);
      if (dot(tint, tint) < 1e-6) {
        tint = vec3(1.0);
      }
      texelColor.rgb *= tint * lightmapColor;

      texelColor.a *= vBinFade;

      if (texelColor.a < alphaTest) {
        discard;
      }

      #include <logdepthbuf_fragment>

      gl_FragColor = vec4(texelColor.rgb, texelColor.a);
    }`;
  }

}
