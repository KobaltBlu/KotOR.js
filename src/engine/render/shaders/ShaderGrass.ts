import * as THREE from "three";
import { Shader } from "@engine/render/shaders/Shader";
import { ODYSSEY_WIND_VERTEX_LIBRARY } from "@engine/render/shaders/odysseyWind";
import {
  GRASS_ALPHA_TEST_DEFAULT,
  GRASS_LOD_FAR_DIST,
  GRASS_LOD_FULL_DIST,
  GRASS_LOD_MID_DIST,
  GRASS_LOD_MID_FRACTION,
  GRASS_LOD_TRANSITION,
} from "@engine/managers/grass/grassHelpers";

const f = (n: number) => n.toFixed(4);

/**
 * ShaderGrass — instanced crossed-card grass clumps.
 *
 * Vertex: blades bend in world space about their root (length preserving
 * arc), driven by area wind (rolling waves + flutter), point-source gusts and
 * the persistent trample field. Per-blade distance LOD shrinks culled blades
 * into the ground and widens survivors so far fields stay full.
 *
 * Fragment: same 2×2 ARE grass atlas, lightmap/ARE tint, root occlusion,
 * per-clump colour variation and mip-aware alpha so distant grass keeps body.
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
        quadSize: { value: 1.0 },
        grassStiffness: { value: 1.0 },
        alphaTest: { value: GRASS_ALPHA_TEST_DEFAULT },
        grassTrampleMap: { value: null },
        grassTrampleWindow: { value: new THREE.Vector4() },
      }
    ]) as any;

    this.vertex = `
    #include <common>
    #include <logdepthbuf_pars_vertex>

    ${ODYSSEY_WIND_VERTEX_LIBRARY}

    uniform float time;
    uniform float quadSize;
    uniform float grassStiffness;
    uniform sampler2D grassTrampleMap;
    uniform vec4 grassTrampleWindow;

    attribute float quadIdx;
    attribute vec3 grassQuads;
    attribute vec2 lightmapUV;
    // x = LOD rank, y = random seed, z = colour variation, w = dryness
    attribute vec4 bladeParams;

    varying vec2 vGrassUv;
    varying vec4 vSpriteSheet;
    varying vec2 vLightmapUV;
    varying float vHeight;
    varying float vFlatten;
    varying vec2 vTint;

    const float LOD_FULL = ${f(GRASS_LOD_FULL_DIST)};
    const float LOD_MID = ${f(GRASS_LOD_MID_DIST)};
    const float LOD_FAR = ${f(GRASS_LOD_FAR_DIST)};
    const float LOD_MID_FRACTION = ${f(GRASS_LOD_MID_FRACTION)};
    const float LOD_TRANSITION = ${f(GRASS_LOD_TRANSITION)};

    float grass_lod_fraction(float d) {
      if (d <= LOD_FULL) return 1.0;
      if (d <= LOD_MID) return mix(1.0, LOD_MID_FRACTION, (d - LOD_FULL) / (LOD_MID - LOD_FULL));
      if (d < LOD_FAR) return LOD_MID_FRACTION * (1.0 - (d - LOD_MID) / (LOD_FAR - LOD_MID));
      return 0.0;
    }

    vec2 grass_trample(vec2 rootXY) {
      if (grassTrampleWindow.w < 0.5) return vec2(0.0);
      vec2 local = rootXY - grassTrampleWindow.xy;
      float size = grassTrampleWindow.z;
      float edge = size * 0.04;
      float inside = smoothstep(0.0, edge, local.x) * smoothstep(0.0, edge, local.y) *
                     smoothstep(0.0, edge, size - local.x) * smoothstep(0.0, edge, size - local.y);
      if (inside <= 0.0) return vec2(0.0);
      vec2 enc = texture2D(grassTrampleMap, rootXY / size).rg;
      return ((enc * 255.0 - 128.0) / 127.0) * inside;
    }

    void main() {
      float t = uv.y;
      vHeight = t;
      vLightmapUV = lightmapUV;

      // Atlas cell for this card (2×2 ARE grass atlas, LL/LR/UL/UR).
      float cell = quadIdx < 0.5 ? grassQuads.x : (quadIdx < 1.5 ? grassQuads.y : grassQuads.z);
      float column = mod(cell, 2.0);
      float row = floor(cell / 2.0);
      vSpriteSheet = vec4(column * 0.5, row * 0.5, 0.5, 0.5);
      float mirror = fract(bladeParams.y * 7.31 + quadIdx * 0.37) > 0.5 ? 1.0 : 0.0;
      vGrassUv = vec2(mix(uv.x, 1.0 - uv.x, mirror), uv.y);
      vTint = bladeParams.zw;

      mat4 instMat = mat4(1.0);
      #ifdef USE_INSTANCING
        instMat = instanceMatrix;
      #endif
      mat4 world = modelMatrix * instMat;
      vec3 root = (world * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      vec3 upAxis = mat3(world) * vec3(0.0, 1.0, 0.0);
      vec3 up = normalize(upAxis);
      vec3 wp = (world * vec4(position, 1.0)).xyz;
      vec3 offset = wp - root;
      float h = dot(offset, up);
      vec3 across = offset - up * h;

      // ---- distance LOD -------------------------------------------------
      float dist = distance(cameraPosition, root);
      float keep = grass_lod_fraction(dist);
      float vis = clamp((keep - bladeParams.x) / LOD_TRANSITION, 0.0, 1.0);
      float widen = clamp(inversesqrt(max(keep, 0.08)), 1.0, 1.7);
      across *= widen * vis;
      h *= vis;

      // ---- bend (radians, world XY) -------------------------------------
      float seed = bladeParams.y;
      vec3 gw = odyssey_get_global_wind_no_point(root, 1.0);
      float windLevel = length(windGlobal);
      vec2 windDir = windLevel > 1e-4 ? windGlobal.xy / max(length(windGlobal.xy), 1e-4) : vec2(0.0);
      // Gust fronts rolling across the field in the wind direction.
      float wave = 0.5 + 0.5 * sin(dot(root.xy, windDir) * 0.32 - time * 1.7 + seed * 0.9);
      wave *= wave;
      vec2 windBend = gw.xy * 0.22 + windDir * windLevel * (0.06 + 0.16 * wave);
      // Per-blade flutter; a faint idle breeze keeps calm fields alive.
      float flutterAmp = 0.025 + 0.045 * windLevel;
      vec2 flutter = vec2(
        sin(time * (2.1 + seed * 1.3) + seed * 6.2831),
        cos(time * (1.7 + seed * 1.1) + seed * 3.917)
      ) * flutterAmp;
      vec2 gust = odyssey_point_source_wind(root).xy * 0.45;

      vec2 tr = grass_trample(root.xy);
      float flatAmt = clamp(length(tr), 0.0, 1.0);
      vFlatten = flatAmt;

      vec2 bend = (windBend + flutter) * grassStiffness * (1.0 - 0.85 * flatAmt) + gust + tr * 1.35;
      float angle = length(bend);
      if (angle > 1.45) {
        bend *= 1.45 / angle;
        angle = 1.45;
      }

      if (angle > 1e-4 && h > 0.0) {
        vec3 dir = vec3(bend / angle, 0.0);
        // Remove any up component so the arc stays in the blade/bend plane.
        dir = normalize(dir - up * dot(dir, up) + 1e-5);
        // Wind curves blades from the tip; a foot folds them from the base.
        float curve = mix(t, sqrt(t), flatAmt);
        float a = angle * curve;
        wp = root + across + dir * (h * sin(a)) + up * (h * cos(a));
      } else {
        wp = root + across + up * h;
      }

      vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      #include <logdepthbuf_vertex>
    }`;

    this.fragment = `
    uniform float opacity;
    uniform float alphaTest;
    uniform vec3 ambientColor;
    uniform vec3 diffuseColor;
    uniform sampler2D map;
    #include <common>
    #include <logdepthbuf_pars_fragment>
    varying vec2 vGrassUv;
    varying vec4 vSpriteSheet;
    varying float vHeight;
    varying float vFlatten;
    varying vec2 vTint;
    #ifdef ODYSSEY_GRASS_LIGHTMAP
      uniform sampler2D lightMap;
      varying vec2 vLightmapUV;
    #endif

    void main() {
      // Small inset keeps mip sampling from bleeding across atlas cells.
      vec2 cellUv = clamp(vec2(1.0 - vGrassUv.x, vGrassUv.y), 0.004, 0.996);
      vec2 uv = vSpriteSheet.xy + vSpriteSheet.zw * cellUv;
      vec4 texelColor = texture2D(map, uv);

      // Mipmaps average alpha toward zero; push it back up with distance so
      // far blades keep their body instead of dissolving under the cutoff.
      vec2 texSize = vec2(textureSize(map, 0));
      vec2 dx = dFdx(uv * texSize);
      vec2 dy = dFdy(uv * texSize);
      float mip = max(0.0, 0.5 * log2(max(dot(dx, dx), dot(dy, dy))));
      texelColor.a *= 1.0 + mip * 0.25;

      if (texelColor.a < alphaTest) {
        discard;
      }

      vec3 lightmapColor = vec3(1.0);
      #ifdef ODYSSEY_GRASS_LIGHTMAP
        lightmapColor = texture2D(lightMap, vLightmapUV).rgb;
      #endif

      vec3 tint = mix(ambientColor, diffuseColor, 0.5);
      if (dot(tint, tint) < 1e-6) {
        tint = vec3(1.0);
      }

      vec3 color = texelColor.rgb * tint * lightmapColor;
      // Per-clump brightness + a little sun-bleached dryness for variety.
      color *= vTint.x;
      color *= mix(vec3(1.0), vec3(1.1, 1.04, 0.78), vTint.y);
      // Self-shadowing deep in the clump, lighter tips.
      float occlusion = mix(0.55, 1.0, smoothstep(0.0, 0.7, vHeight));
      color *= occlusion * (1.0 + 0.1 * vHeight * vHeight);
      // Flattened grass catches more light along the blade.
      color *= 1.0 + 0.12 * vFlatten;

      #include <logdepthbuf_fragment>

      gl_FragColor = vec4(color, 1.0);
    }`;
  }

}
