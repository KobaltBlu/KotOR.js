import * as THREE from "three";

import { RETAIL_SHADOW_MIN_VERTEX_COLOR } from "@/utility/retailLighting";
import { ODYSSEY_SHADOW_MAP_DEPTH_BIAS } from "@/utility/odysseyShadowMap";

/**
 * Shader / binder map capacity. Steady-state still targets retail
 * NumShadowCastingLights (3) or Soft Shadows (1); the 4th slot is for
 * transient crossfade residency (MAX+1) so caster swaps can blend.
 */
export const MAX_ODYSSEY_SHADOW_MAPS = 4;

/**
 * Soft-shadow PCF half-width (5×5). Hard mode still compiles this loop but only
 * weights the center tap (see `odysseyShadowSoft`).
 */
export const ODYSSEY_SHADOW_PCF_RADIUS = 2;

/**
 * Soft-mode UV tap spacing in texels. >1 widens the penumbra to approximate
 * retail image-space Soft Shadows blur (1-texel 5×5 is still a hard contact).
 */
export const ODYSSEY_SHADOW_SOFT_TEXEL_SPREAD = 2.5;

/**
 * Fraction of influence radius where radial fade begins (smoothstep start/end).
 * Matches a soft throw falloff instead of a hard disk edge.
 */
export const ODYSSEY_SHADOW_INFLUENCE_FADE_START = 0.65;

/** Soft mode starts radial fade earlier for a gentler disk falloff. */
export const ODYSSEY_SHADOW_INFLUENCE_FADE_START_SOFT = 0.45;

/** UV border width (in shadow-map UV) used to soften frustum edge clipping. */
export const ODYSSEY_SHADOW_MAP_EDGE_FADE = 0.05;

/** Soft mode uses a wider UV border fade. */
export const ODYSSEY_SHADOW_MAP_EDGE_FADE_SOFT = 0.12;

/** Minimum worldNormal.z to apply the reduced floor receiver bias. */
export const ODYSSEY_SHADOW_CONTACT_NORMAL_Z = 0.5;

/**
 * Scale applied to constant/slope bias on floor-like receivers. Full map bias
 * opens a lit ring between boots and the cast silhouette under angled lamps.
 */
export const ODYSSEY_SHADOW_FLOOR_BIAS_SCALE = 0.15;

/**
 * Soft-shadow depth compare half-width in packed NDC depth. Approximates retail
 * image-space Soft Shadows blur without a second pass.
 */
export const ODYSSEY_SHADOW_SOFT_DEPTH_WIDTH = 0.008;

/**
 * Unrolled per-slot body — WebGL1/GLSL ES 1.00 cannot pass sampler2D into functions.
 * SLOT = 0|1|2|3, MAP = odysseyShadowMap0|1|2|3
 *
 * Soft and hard both floor toward RETAIL_SHADOW_MIN_VERTEX_COLOR (ProjectDynamicShadow).
 * Soft widens PCF / depth compare to approximate retail Soft Shadows blur; hard
 * uses a single center tap.
 */
const ODYSSEY_SHADOW_SLOT_BODY = (slot: number, map: string) => `
  if ( odysseyShadowActive[ ${slot} ] > 0.0 && odysseyShadowStrength[ ${slot} ] > 0.0 ) {
    vec3 toLight${slot} = odysseyShadowLightWorld[ ${slot} ] - samplePos;
    float dist${slot} = length( toLight${slot}.xy );
    float influence${slot} = max( odysseyShadowInfluenceRadius[ ${slot} ], 1e-4 );
    float fadeStart${slot} = mix(
      ODYSSEY_SHADOW_INFLUENCE_FADE_START,
      ODYSSEY_SHADOW_INFLUENCE_FADE_START_SOFT,
      odysseyShadowSoft
    );
    float radiusFade${slot} = 1.0 - smoothstep(
      influence${slot} * fadeStart${slot},
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
        float edgeFadeWidth${slot} = mix(
          ODYSSEY_SHADOW_MAP_EDGE_FADE,
          ODYSSEY_SHADOW_MAP_EDGE_FADE_SOFT,
          odysseyShadowSoft
        );
        float mapFade${slot} = smoothstep( 0.0, edgeFadeWidth${slot}, edgeDist${slot} );
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
          float weightSum${slot} = 0.0;
          float softSpread${slot} = mix( 1.0, ODYSSEY_SHADOW_SOFT_TEXEL_SPREAD, odysseyShadowSoft );
          for ( int x${slot} = -ODYSSEY_SHADOW_PCF_RADIUS; x${slot} <= ODYSSEY_SHADOW_PCF_RADIUS; x${slot} ++ ) {
            for ( int y${slot} = -ODYSSEY_SHADOW_PCF_RADIUS; y${slot} <= ODYSSEY_SHADOW_PCF_RADIUS; y${slot} ++ ) {
              float tapWeight${slot} = odysseyShadowSoft > 0.5
                ? 1.0
                : ( ( x${slot} == 0 && y${slot} == 0 ) ? 1.0 : 0.0 );
              if ( tapWeight${slot} > 0.0 ) {
                vec2 offset${slot} = vec2( float( x${slot} ), float( y${slot} ) )
                  * texelSize * softSpread${slot};
                float depth${slot} = unpackRGBAToDepth(
                  texture2D( ${map}, shadowCoord${slot}.xy + offset${slot} )
                );
                float hard${slot} = step( compare${slot}, depth${slot} );
                float soft${slot} = smoothstep(
                  compare${slot} - ODYSSEY_SHADOW_SOFT_DEPTH_WIDTH,
                  compare${slot} + ODYSSEY_SHADOW_SOFT_DEPTH_WIDTH,
                  depth${slot}
                );
                shadow${slot} += mix( hard${slot}, soft${slot}, odysseyShadowSoft ) * tapWeight${slot};
                weightSum${slot} += tapWeight${slot};
              }
            }
          }
          shadow${slot} /= max( weightSum${slot}, 1.0 );
          // ProjectDynamicShadow floor — never pure black (ShadowOpacity can exceed 100).
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

#ifndef ODYSSEY_SHADOW_SOFT_TEXEL_SPREAD
  #define ODYSSEY_SHADOW_SOFT_TEXEL_SPREAD ${ODYSSEY_SHADOW_SOFT_TEXEL_SPREAD}
#endif

#ifndef ODYSSEY_SHADOW_INFLUENCE_FADE_START
  #define ODYSSEY_SHADOW_INFLUENCE_FADE_START ${ODYSSEY_SHADOW_INFLUENCE_FADE_START}
#endif

#ifndef ODYSSEY_SHADOW_INFLUENCE_FADE_START_SOFT
  #define ODYSSEY_SHADOW_INFLUENCE_FADE_START_SOFT ${ODYSSEY_SHADOW_INFLUENCE_FADE_START_SOFT}
#endif

#ifndef ODYSSEY_SHADOW_MAP_EDGE_FADE
  #define ODYSSEY_SHADOW_MAP_EDGE_FADE ${ODYSSEY_SHADOW_MAP_EDGE_FADE}
#endif

#ifndef ODYSSEY_SHADOW_MAP_EDGE_FADE_SOFT
  #define ODYSSEY_SHADOW_MAP_EDGE_FADE_SOFT ${ODYSSEY_SHADOW_MAP_EDGE_FADE_SOFT}
#endif

#ifndef ODYSSEY_SHADOW_CONTACT_NORMAL_Z
  #define ODYSSEY_SHADOW_CONTACT_NORMAL_Z ${ODYSSEY_SHADOW_CONTACT_NORMAL_Z}
#endif

#ifndef ODYSSEY_SHADOW_FLOOR_BIAS_SCALE
  #define ODYSSEY_SHADOW_FLOOR_BIAS_SCALE ${ODYSSEY_SHADOW_FLOOR_BIAS_SCALE}
#endif

#ifndef ODYSSEY_SHADOW_SOFT_DEPTH_WIDTH
  #define ODYSSEY_SHADOW_SOFT_DEPTH_WIDTH ${ODYSSEY_SHADOW_SOFT_DEPTH_WIDTH}
#endif

uniform float odysseyBeamingProjectionAlpha;
uniform sampler2D odysseyShadowMap0;
uniform sampler2D odysseyShadowMap1;
uniform sampler2D odysseyShadowMap2;
uniform sampler2D odysseyShadowMap3;
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
uniform float odysseyShadowSoft;

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
  if ( odysseyShadowLightCount > 3.0 ) {
    ${ODYSSEY_SHADOW_SLOT_BODY(3, 'odysseyShadowMap3')}
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

  // Retail Soft Shadows: one soft disk. Hard: ProjectDynamicShadow per light.
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
    odysseyShadowMap3: { value: null as THREE.Texture | null },
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
    odysseyShadowSoft: { value: 0 },
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
