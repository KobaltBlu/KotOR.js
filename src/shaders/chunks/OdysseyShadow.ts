import * as THREE from "three";

import { OdysseyLightingDebug } from "@/utility/odysseyLightingDebug";

/**
 * Shader / binder map capacity. Steady-state still targets 
 * NumShadowCastingLights (3) or Soft Shadows (1); the 4th slot is for
 * transient crossfade residency (MAX+1) so caster swaps can blend.
 */
export const MAX_ODYSSEY_SHADOW_MAPS = 4;

/**
 * Soft-shadow PCF half-width (5×5). Soft mode weights all taps; hard mode uses
 * center (distant) or a mild 3×3 (local) — see slot body tapWeight.
 * Loop bounds must stay compile-time constants (GLSL ES 1.00).
 */
export const ODYSSEY_SHADOW_PCF_RADIUS = 2;

/** @deprecated Prefer LOCAL/DISTANT soft texel spreads; kept for mid-blend docs. */
export const ODYSSEY_SHADOW_SOFT_TEXEL_SPREAD = 2.5;

/** Soft ON: local lamp UV tap spacing (wider penumbra). Default; live via OdysseyLightingDebug. */
export const ODYSSEY_SHADOW_SOFT_TEXEL_SPREAD_LOCAL = 3.0;
/** Soft ON: distant/sun UV tap spacing (tighter contact). */
export const ODYSSEY_SHADOW_SOFT_TEXEL_SPREAD_DISTANT = 0.65;

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

/** @deprecated Prefer LOCAL/DISTANT soft depth widths. */
export const ODYSSEY_SHADOW_SOFT_DEPTH_WIDTH = 0.008;

/** Soft ON: local lamp depth compare half-width (softer contact). */
export const ODYSSEY_SHADOW_SOFT_DEPTH_WIDTH_LOCAL = 0.012;
/** Soft ON: distant/sun depth compare half-width (crisper). */
export const ODYSSEY_SHADOW_SOFT_DEPTH_WIDTH_DISTANT = 0.003;

/** Multiplier on projection strength for local lamps. */
export const ODYSSEY_SHADOW_STRENGTH_SCALE_LOCAL = 0.50;
/** Multiplier on projection strength for area/sun lights. */
export const ODYSSEY_SHADOW_STRENGTH_SCALE_DISTANT = 1.35;

/**
 * Apply local↔distant strength scale to base opacity. Clamped to [0, 1].
 * Reads live scales from {@link OdysseyLightingDebug}.
 */
export function odysseyShadowAdaptiveStrength(
  baseStrength: number,
  distantFactor: number
): number {
  const f = Math.max(0, Math.min(1, distantFactor));
  const local = OdysseyLightingDebug.values.strengthScaleLocal;
  const distant = OdysseyLightingDebug.values.strengthScaleDistant;
  const scale = local * (1 - f) + distant * f;
  return Math.max(0, Math.min(1, baseStrength * scale));
}

const ODYSSEY_SHADOW_SLOT_BODY = (slot: number, map: string) => `
  if ( ODYSSEY_SHADOW_ACTIVE( ${slot} ) > 0.0 && ODYSSEY_SHADOW_STRENGTH( ${slot} ) > 0.0 ) {
    vec3 toLight${slot} = odysseyShadowLightWorld[ ${slot} ].xyz - samplePos;
    float dist${slot} = length( toLight${slot}.xy );
    float influence${slot} = max( ODYSSEY_SHADOW_INFLUENCE( ${slot} ), 1e-4 );
    float distant${slot} = clamp( ODYSSEY_SHADOW_DISTANT( ${slot} ), 0.0, 1.0 );
    float fadeStart${slot} = mix(
      odysseyShadowInfluenceFadeStart,
      odysseyShadowInfluenceFadeStartSoft,
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
          odysseyShadowMapEdgeFade,
          odysseyShadowMapEdgeFadeSoft,
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
            * sqrt(1.0 - cosTheta${slot} * cosTheta${slot})
            / max( cosTheta${slot}, 0.05 );
          float biasScale${slot} = 1.0;
          #ifdef USE_LIGHTMAP
            if ( n.z > odysseyShadowContactNormalZ ) {
              biasScale${slot} = odysseyShadowFloorBiasScale;
            }
          #endif
          float compare${slot} = shadowCoord${slot}.z
            - ( odysseyShadowConstantBias + slopeBias${slot} ) * biasScale${slot};
          float shadow${slot} = 0.0;
          float weightSum${slot} = 0.0;
          float softSpread${slot} = mix(
            odysseyShadowSoftTexelSpreadLocal,
            odysseyShadowSoftTexelSpreadDistant,
            distant${slot}
          );
          float softDepthW${slot} = mix(
            odysseyShadowSoftDepthWidthLocal,
            odysseyShadowSoftDepthWidthDistant,
            distant${slot}
          );
          for ( int x${slot} = -ODYSSEY_SHADOW_PCF_RADIUS; x${slot} <= ODYSSEY_SHADOW_PCF_RADIUS; x${slot} ++ ) {
            for ( int y${slot} = -ODYSSEY_SHADOW_PCF_RADIUS; y${slot} <= ODYSSEY_SHADOW_PCF_RADIUS; y${slot} ++ ) {
              float hardCenter${slot} = ( x${slot} == 0 && y${slot} == 0 ) ? 1.0 : 0.0;
              float hardLocal3${slot} = (
                abs( float( x${slot} ) ) <= 1.0 && abs( float( y${slot} ) ) <= 1.0
              ) ? 1.0 : 0.0;
              // Soft OFF: local lamps use mild 3×3; distant stays center tap.
              float hardTap${slot} = mix( hardLocal3${slot}, hardCenter${slot}, distant${slot} );
              float tapWeight${slot} = mix( hardTap${slot}, 1.0, odysseyShadowSoft );
              if ( tapWeight${slot} > 0.0 ) {
                vec2 offset${slot} = vec2( float( x${slot} ), float( y${slot} ) )
                  * texelSize * mix(1.0, softSpread${slot}, odysseyShadowSoft);
                float depth${slot} = unpackRGBAToDepth(
                  texture2D( ${map}, shadowCoord${slot}.xy + offset${slot} )
                );
                float hard${slot} = step( compare${slot}, depth${slot} );
                float soft${slot} = smoothstep(
                  compare${slot} - softDepthW${slot},
                  compare${slot} + softDepthW${slot},
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
            - ODYSSEY_SHADOW_STRENGTH( ${slot} ) * ( 1.0 - odysseyShadowMinVertexColor );
          float lit${slot} = mix( darkened${slot}, 1.0, shadow${slot} );
          slotFactor *= mix( 1.0, lit${slot}, fade${slot} );
        }
      }
    }
  }
`;

export const ODYSSEY_SHADOW_PARS_FRAGMENT = `
#ifndef MAX_ODYSSEY_SHADOW_MAPS
  #define MAX_ODYSSEY_SHADOW_MAPS ${MAX_ODYSSEY_SHADOW_MAPS}
#endif

#ifndef ODYSSEY_SHADOW_PCF_RADIUS
  #define ODYSSEY_SHADOW_PCF_RADIUS ${ODYSSEY_SHADOW_PCF_RADIUS}
#endif

uniform sampler2D odysseyShadowMap0;
uniform sampler2D odysseyShadowMap1;
uniform sampler2D odysseyShadowMap2;
uniform sampler2D odysseyShadowMap3;

#ifdef USE_ODYSSEY_SHADOW_UBO
layout(std140) uniform OdysseyShadow {
  mat4 odysseyShadowMatrix[ MAX_ODYSSEY_SHADOW_MAPS ];
  vec4 odysseyShadowLightWorld[ MAX_ODYSSEY_SHADOW_MAPS ];
  vec4 odysseyShadowStrength4;
  vec4 odysseyShadowInfluence4;
  vec4 odysseyShadowActive4;
  vec4 odysseyShadowDistant4;
  float odysseyShadowMapSizeX;
  float odysseyShadowMapSizeY;
  float odysseyBeamingProjectionAlpha;
  float odysseyShadowMapActive;
  float odysseyShadowLightCount;
  float odysseyShadowSoft;
  float odysseyShadowConstantBias;
  float odysseyShadowSlopeBias;
  float odysseyShadowSoftTexelSpreadLocal;
  float odysseyShadowSoftTexelSpreadDistant;
  float odysseyShadowSoftDepthWidthLocal;
  float odysseyShadowSoftDepthWidthDistant;
  float odysseyShadowInfluenceFadeStart;
  float odysseyShadowInfluenceFadeStartSoft;
  float odysseyShadowMapEdgeFade;
  float odysseyShadowMapEdgeFadeSoft;
  float odysseyShadowFloorBiasScale;
  float odysseyShadowContactNormalZ;
  float odysseyShadowMinVertexColor;
  float odysseyShadowPad0;
};
#define ODYSSEY_SHADOW_STRENGTH(i) odysseyShadowStrength4[i]
#define ODYSSEY_SHADOW_INFLUENCE(i) odysseyShadowInfluence4[i]
#define ODYSSEY_SHADOW_ACTIVE(i) odysseyShadowActive4[i]
#define ODYSSEY_SHADOW_DISTANT(i) odysseyShadowDistant4[i]
#else
uniform float odysseyBeamingProjectionAlpha;
uniform mat4 odysseyShadowMatrix[ MAX_ODYSSEY_SHADOW_MAPS ];
uniform vec2 odysseyShadowMapSize;
uniform float odysseyShadowStrength[ MAX_ODYSSEY_SHADOW_MAPS ];
uniform float odysseyShadowInfluenceRadius[ MAX_ODYSSEY_SHADOW_MAPS ];
uniform vec3 odysseyShadowLightWorld[ MAX_ODYSSEY_SHADOW_MAPS ];
uniform float odysseyShadowActive[ MAX_ODYSSEY_SHADOW_MAPS ];
uniform float odysseyShadowDistantFactor[ MAX_ODYSSEY_SHADOW_MAPS ];
uniform float odysseyShadowConstantBias;
uniform float odysseyShadowSlopeBias;
uniform float odysseyShadowMapActive;
uniform float odysseyShadowLightCount;
uniform float odysseyShadowSoft;
uniform float odysseyShadowSoftTexelSpreadLocal;
uniform float odysseyShadowSoftTexelSpreadDistant;
uniform float odysseyShadowSoftDepthWidthLocal;
uniform float odysseyShadowSoftDepthWidthDistant;
uniform float odysseyShadowInfluenceFadeStart;
uniform float odysseyShadowInfluenceFadeStartSoft;
uniform float odysseyShadowMapEdgeFade;
uniform float odysseyShadowMapEdgeFadeSoft;
uniform float odysseyShadowFloorBiasScale;
uniform float odysseyShadowContactNormalZ;
uniform float odysseyShadowMinVertexColor;
#define ODYSSEY_SHADOW_STRENGTH(i) odysseyShadowStrength[i]
#define ODYSSEY_SHADOW_INFLUENCE(i) odysseyShadowInfluenceRadius[i]
#define ODYSSEY_SHADOW_ACTIVE(i) odysseyShadowActive[i]
#define ODYSSEY_SHADOW_DISTANT(i) odysseyShadowDistantFactor[i]
#endif

float odysseyShadowMapsAt( const in vec3 samplePos, const in vec3 worldNormal ) {
  vec3 n = normalize( worldNormal );
  #ifdef USE_ODYSSEY_SHADOW_UBO
    vec2 texelSize = vec2( 1.0 / max( odysseyShadowMapSizeX, 1.0 ), 1.0 / max( odysseyShadowMapSizeY, 1.0 ) );
  #else
    vec2 texelSize = vec2( 1.0 ) / odysseyShadowMapSize;
  #endif
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

  // Soft Shadows: one soft disk. Hard: ProjectDynamicShadow per light.
  return odysseyShadowMapsAt( worldPos, worldNormal );
}
`;

export function createOdysseyShadowUniforms(){
  const matrices: THREE.Matrix4[] = [];
  const strengths: number[] = [];
  const influences: number[] = [];
  const lightWorlds: THREE.Vector3[] = [];
  const active: number[] = [];
  const distantFactors: number[] = [];
  const d = OdysseyLightingDebug.values;
  for(let i = 0; i < MAX_ODYSSEY_SHADOW_MAPS; i++){
    matrices.push(new THREE.Matrix4());
    strengths.push(0);
    influences.push(0);
    lightWorlds.push(new THREE.Vector3());
    active.push(0);
    distantFactors.push(0);
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
    odysseyShadowDistantFactor: { value: distantFactors },
    odysseyShadowConstantBias: { value: d.constantBias },
    odysseyShadowSlopeBias: { value: d.slopeBias },
    odysseyShadowMapActive: { value: 0 },
    odysseyShadowLightCount: { value: 0 },
    odysseyShadowSoft: { value: 0 },
    odysseyShadowSoftTexelSpreadLocal: { value: d.softTexelSpreadLocal },
    odysseyShadowSoftTexelSpreadDistant: { value: d.softTexelSpreadDistant },
    odysseyShadowSoftDepthWidthLocal: { value: d.softDepthWidthLocal },
    odysseyShadowSoftDepthWidthDistant: { value: d.softDepthWidthDistant },
    odysseyShadowInfluenceFadeStart: { value: d.influenceFadeStart },
    odysseyShadowInfluenceFadeStartSoft: { value: d.influenceFadeStartSoft },
    odysseyShadowMapEdgeFade: { value: d.mapEdgeFade },
    odysseyShadowMapEdgeFadeSoft: { value: d.mapEdgeFadeSoft },
    odysseyShadowFloorBiasScale: { value: d.floorBiasScale },
    odysseyShadowContactNormalZ: { value: d.contactNormalZ },
    odysseyShadowMinVertexColor: { value: d.minVertexColor },
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
