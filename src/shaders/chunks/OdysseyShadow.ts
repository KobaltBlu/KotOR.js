import * as THREE from "three";

import { RETAIL_SHADOW_MIN_VERTEX_COLOR } from "@/utility/retailLighting";
import { ODYSSEY_SHADOW_MAP_DEPTH_BIAS } from "@/utility/odysseyShadowMap";

/** Matches retail `maxShadowLights` / videoquality NumShadowCastingLights default. */
export const MAX_ODYSSEY_SHADOW_MAPS = 3;

/** Primary shadow map PCF kernel radius (3×3). */
export const ODYSSEY_SHADOW_PCF_RADIUS = 1;

/**
 * Fraction of influence radius where radial fade begins (smoothstep start/end).
 * Matches a soft throw falloff instead of a hard disk edge.
 */
export const ODYSSEY_SHADOW_INFLUENCE_FADE_START = 0.65;

/** UV border width (in shadow-map UV) used to soften frustum edge clipping. */
export const ODYSSEY_SHADOW_MAP_EDGE_FADE = 0.05;

/** Minimum worldNormal.z to apply the reduced floor receiver bias. */
export const ODYSSEY_SHADOW_CONTACT_NORMAL_Z = 0.5;

/**
 * Scale applied to constant/slope bias on floor-like receivers. Full map bias
 * opens a lit ring between boots and the cast silhouette under angled lamps.
 */
export const ODYSSEY_SHADOW_FLOOR_BIAS_SCALE = 0.15;

/**
 * Unrolled per-slot body — WebGL1/GLSL ES 1.00 cannot pass sampler2D into functions.
 * SLOT = 0|1|2, MAP = odysseyShadowMap0|1|2
 */
const ODYSSEY_SHADOW_SLOT_BODY = (slot: number, map: string) => `
  if ( odysseyShadowActive[ ${slot} ] > 0.0 && odysseyShadowStrength[ ${slot} ] > 0.0 ) {
    vec3 toLight${slot} = odysseyShadowLightWorld[ ${slot} ] - samplePos;
    float dist${slot} = length( toLight${slot}.xy );
    float influence${slot} = max( odysseyShadowInfluenceRadius[ ${slot} ], 1e-4 );
    float radiusFade${slot} = 1.0 - smoothstep(
      influence${slot} * ODYSSEY_SHADOW_INFLUENCE_FADE_START,
      influence${slot},
      dist${slot}
    );
    if ( radiusFade${slot} > 0.0 ) {
      vec4 shadowCoord${slot} = odysseyShadowMatrix[ ${slot} ] * vec4( samplePos, 1.0 );
      shadowCoord${slot}.xyz /= shadowCoord${slot}.w;
      if (
        shadowCoord${slot}.x >= 0.0 && shadowCoord${slot}.x <= 1.0 &&
        shadowCoord${slot}.y >= 0.0 && shadowCoord${slot}.y <= 1.0 &&
        shadowCoord${slot}.z >= 0.0 && shadowCoord${slot}.z <= 1.0
      ) {
        float edgeDist${slot} = min(
          min( shadowCoord${slot}.x, 1.0 - shadowCoord${slot}.x ),
          min( shadowCoord${slot}.y, 1.0 - shadowCoord${slot}.y )
        );
        float mapFade${slot} = smoothstep( 0.0, ODYSSEY_SHADOW_MAP_EDGE_FADE, edgeDist${slot} );
        float fade${slot} = radiusFade${slot} * mapFade${slot};
        if ( fade${slot} > 0.0 ) {
          float toLightLen${slot} = length( toLight${slot} );
          vec3 lightDir${slot} = toLightLen${slot} > 1e-4
            ? toLight${slot} / toLightLen${slot}
            : vec3( 0.0, 0.0, 1.0 );
          float cosTheta${slot} = clamp( dot( n, lightDir${slot} ), 0.0, 1.0 );
          float slopeBias${slot} = odysseyShadowSlopeBias
            * sqrt( 1.0 - cosTheta${slot} * cosTheta${slot} )
            / max( cosTheta${slot}, 0.05 );
          float biasScale${slot} = 1.0;
          #ifdef USE_LIGHTMAP
            if ( n.z > ODYSSEY_SHADOW_CONTACT_NORMAL_Z ) {
              biasScale${slot} = ODYSSEY_SHADOW_FLOOR_BIAS_SCALE;
            }
          #endif
          float compare${slot} = shadowCoord${slot}.z
            - ( odysseyShadowConstantBias + slopeBias${slot} ) * biasScale${slot};
          float shadow${slot} = 0.0;
          for ( int x${slot} = -ODYSSEY_SHADOW_PCF_RADIUS; x${slot} <= ODYSSEY_SHADOW_PCF_RADIUS; x${slot} ++ ) {
            for ( int y${slot} = -ODYSSEY_SHADOW_PCF_RADIUS; y${slot} <= ODYSSEY_SHADOW_PCF_RADIUS; y${slot} ++ ) {
              vec2 offset${slot} = vec2( float( x${slot} ), float( y${slot} ) ) * texelSize;
              float depth${slot} = unpackRGBAToDepth(
                texture2D( ${map}, shadowCoord${slot}.xy + offset${slot} )
              );
              shadow${slot} += step( compare${slot}, depth${slot} );
            }
          }
          shadow${slot} /= float(
            ( 2 * ODYSSEY_SHADOW_PCF_RADIUS + 1 ) * ( 2 * ODYSSEY_SHADOW_PCF_RADIUS + 1 )
          );
          float darkened${slot} = 1.0
            - odysseyShadowStrength[ ${slot} ] * ( 1.0 - RETAIL_SHADOW_MIN_VERTEX_COLOR );
          float lit${slot} = mix( darkened${slot}, 1.0, shadow${slot} );
          slotFactor *= mix( 1.0, lit${slot}, fade${slot} );
        }
      }
    }
  }
`;

export const ODYSSEY_SHADOW_PARS_FRAGMENT = `
#ifndef RETAIL_SHADOW_MIN_VERTEX_COLOR
  #define RETAIL_SHADOW_MIN_VERTEX_COLOR ${RETAIL_SHADOW_MIN_VERTEX_COLOR}
#endif

#ifndef MAX_ODYSSEY_SHADOW_MAPS
  #define MAX_ODYSSEY_SHADOW_MAPS ${MAX_ODYSSEY_SHADOW_MAPS}
#endif

#ifndef ODYSSEY_SHADOW_PCF_RADIUS
  #define ODYSSEY_SHADOW_PCF_RADIUS ${ODYSSEY_SHADOW_PCF_RADIUS}
#endif

#ifndef ODYSSEY_SHADOW_INFLUENCE_FADE_START
  #define ODYSSEY_SHADOW_INFLUENCE_FADE_START ${ODYSSEY_SHADOW_INFLUENCE_FADE_START}
#endif

#ifndef ODYSSEY_SHADOW_MAP_EDGE_FADE
  #define ODYSSEY_SHADOW_MAP_EDGE_FADE ${ODYSSEY_SHADOW_MAP_EDGE_FADE}
#endif

#ifndef ODYSSEY_SHADOW_CONTACT_NORMAL_Z
  #define ODYSSEY_SHADOW_CONTACT_NORMAL_Z ${ODYSSEY_SHADOW_CONTACT_NORMAL_Z}
#endif

#ifndef ODYSSEY_SHADOW_FLOOR_BIAS_SCALE
  #define ODYSSEY_SHADOW_FLOOR_BIAS_SCALE ${ODYSSEY_SHADOW_FLOOR_BIAS_SCALE}
#endif

uniform float odysseyBeamingProjectionAlpha;
uniform sampler2D odysseyShadowMap0;
uniform sampler2D odysseyShadowMap1;
uniform sampler2D odysseyShadowMap2;
uniform mat4 odysseyShadowMatrix[ MAX_ODYSSEY_SHADOW_MAPS ];
uniform vec2 odysseyShadowMapSize;
uniform float odysseyShadowStrength[ MAX_ODYSSEY_SHADOW_MAPS ];
uniform float odysseyShadowInfluenceRadius[ MAX_ODYSSEY_SHADOW_MAPS ];
uniform vec3 odysseyShadowLightWorld[ MAX_ODYSSEY_SHADOW_MAPS ];
uniform float odysseyShadowActive[ MAX_ODYSSEY_SHADOW_MAPS ];
uniform float odysseyShadowConstantBias;
uniform float odysseyShadowSlopeBias;
uniform float odysseyShadowMapActive;
uniform float odysseyShadowLightCount;

float odysseyShadowMapsAt( const in vec3 samplePos, const in vec3 worldNormal ) {
  vec3 n = normalize( worldNormal );
  vec2 texelSize = vec2( 1.0 ) / odysseyShadowMapSize;
  float slotFactor = 1.0;
  ${ODYSSEY_SHADOW_SLOT_BODY(0, 'odysseyShadowMap0')}
  if ( odysseyShadowLightCount > 1.0 ) {
    ${ODYSSEY_SHADOW_SLOT_BODY(1, 'odysseyShadowMap1')}
  }
  if ( odysseyShadowLightCount > 2.0 ) {
    ${ODYSSEY_SHADOW_SLOT_BODY(2, 'odysseyShadowMap2')}
  }
  return slotFactor;
}

// Compatibility alias for probes / older comments.
float odysseyShadowMapFactorAt( const in vec3 worldPos, const in vec3 worldNormal ) {
  return odysseyShadowMapsAt( worldPos, worldNormal );
}

float odysseyComputeShadowMapFactor( const in vec3 worldPos, const in vec3 worldNormal ) {
  float factor = 1.0;

  #ifdef USE_ODYSSEY_BEAMING
    if ( odysseyBeamingProjectionAlpha > 0.0 ) {
      return factor;
    }
  #endif

  if ( odysseyShadowMapActive <= 0.0 || odysseyShadowLightCount <= 0.0 ) {
    return factor;
  }

  // Retail projects each caster once per selected light. Sampling offset
  // receiver positions unions displaced silhouettes and visibly duplicates
  // the shadow, so contact is controlled by the floor bias above instead.
  return odysseyShadowMapsAt( worldPos, worldNormal );
}
`;

export function createOdysseyShadowUniforms(){
  const matrices: THREE.Matrix4[] = [];
  const strengths: number[] = [];
  const influences: number[] = [];
  const lightWorlds: THREE.Vector3[] = [];
  const active: number[] = [];
  for(let i = 0; i < MAX_ODYSSEY_SHADOW_MAPS; i++){
    matrices.push(new THREE.Matrix4());
    strengths.push(0);
    influences.push(0);
    lightWorlds.push(new THREE.Vector3());
    active.push(0);
  }
  return {
    odysseyBeamingProjectionAlpha: { value: 0 },
    odysseyShadowMap0: { value: null as THREE.Texture | null },
    odysseyShadowMap1: { value: null as THREE.Texture | null },
    odysseyShadowMap2: { value: null as THREE.Texture | null },
    /** @deprecated Alias of map0 for older binder paths. */
    odysseyShadowMap: { value: null as THREE.Texture | null },
    odysseyShadowMatrix: { value: matrices },
    odysseyShadowMapSize: { value: new THREE.Vector2(1, 1) },
    odysseyShadowStrength: { value: strengths },
    odysseyShadowInfluenceRadius: { value: influences },
    odysseyShadowLightWorld: { value: lightWorlds },
    odysseyShadowActive: { value: active },
    odysseyShadowConstantBias: { value: ODYSSEY_SHADOW_MAP_DEPTH_BIAS },
    odysseyShadowSlopeBias: { value: 0.001 },
    odysseyShadowMapActive: { value: 0 },
    odysseyShadowLightCount: { value: 0 },
  };
}

/** Enable shadow-map reception on Odyssey materials. */
export function enableOdysseyMaterialShadowReceive(material: THREE.Material | THREE.Material[]): void {
  const mats = Array.isArray(material) ? material : [material];
  for(let i = 0; i < mats.length; i++){
    const mat = mats[i];
    if(!(mat instanceof THREE.ShaderMaterial)){ continue; }
    mat.defines = mat.defines || {};
    mat.defines.USE_ODYSSEY_SHADOW = '';
    mat.needsUpdate = true;
  }
}
