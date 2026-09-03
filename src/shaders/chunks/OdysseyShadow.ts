import * as THREE from "three";

import { RETAIL_SHADOW_MIN_VERTEX_COLOR } from "@/utility/retailLighting";
import { ODYSSEY_SHADOW_MAP_DEPTH_BIAS } from "@/utility/odysseyShadowMap";

/** Primary shadow map PCF kernel radius (3×3). */
export const ODYSSEY_SHADOW_PCF_RADIUS = 1;

/**
 * Fraction of influence radius where radial fade begins (smoothstep start/end).
 * Matches a soft throw falloff instead of a hard disk edge.
 */
export const ODYSSEY_SHADOW_INFLUENCE_FADE_START = 0.65;

/** UV border width (in shadow-map UV) used to soften frustum edge clipping. */
export const ODYSSEY_SHADOW_MAP_EDGE_FADE = 0.05;

/**
 * World-space contact probes for floor receivers so occlusion is tested near
 * walkmesh / caster volume when decorative MDL floors sit below the WOK, and
 * so angled lights do not leave a bright collar at the feet (peter-panning).
 */
export const ODYSSEY_SHADOW_CONTACT_LIFT = 0.35;

/** Minimum worldNormal.z to treat a receiver as floor-like for contact probes. */
export const ODYSSEY_SHADOW_CONTACT_NORMAL_Z = 0.5;

/**
 * Scale applied to constant/slope bias on floor-like receivers. Full map bias
 * opens a lit ring between boots and the cast silhouette under angled lamps.
 */
export const ODYSSEY_SHADOW_FLOOR_BIAS_SCALE = 0.15;

export const ODYSSEY_SHADOW_PARS_FRAGMENT = `
#ifndef RETAIL_SHADOW_MIN_VERTEX_COLOR
  #define RETAIL_SHADOW_MIN_VERTEX_COLOR ${RETAIL_SHADOW_MIN_VERTEX_COLOR}
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

#ifndef ODYSSEY_SHADOW_CONTACT_LIFT
  #define ODYSSEY_SHADOW_CONTACT_LIFT ${ODYSSEY_SHADOW_CONTACT_LIFT}
#endif

#ifndef ODYSSEY_SHADOW_CONTACT_NORMAL_Z
  #define ODYSSEY_SHADOW_CONTACT_NORMAL_Z ${ODYSSEY_SHADOW_CONTACT_NORMAL_Z}
#endif

#ifndef ODYSSEY_SHADOW_FLOOR_BIAS_SCALE
  #define ODYSSEY_SHADOW_FLOOR_BIAS_SCALE ${ODYSSEY_SHADOW_FLOOR_BIAS_SCALE}
#endif

uniform float odysseyBeamingProjectionAlpha;
uniform sampler2D odysseyShadowMap;
uniform mat4 odysseyShadowMatrix;
uniform vec2 odysseyShadowMapSize;
uniform float odysseyShadowStrength;
uniform float odysseyShadowInfluenceRadius;
uniform vec3 odysseyShadowLightWorld;
uniform float odysseyShadowConstantBias;
uniform float odysseyShadowSlopeBias;
uniform float odysseyShadowMapActive;

float odysseyUnpackShadowDepth( const in vec4 rgba ) {
  return unpackRGBAToDepth( rgba );
}

float odysseyShadowCompare( const in vec2 uv, const in float compare ) {
  float depth = odysseyUnpackShadowDepth( texture2D( odysseyShadowMap, uv ) );
  return step( compare, depth );
}

float odysseyShadowMapFactorAt( const in vec3 worldPos, const in vec3 worldNormal ) {
  float factor = 1.0;

  #ifdef USE_ODYSSEY_BEAMING
    if ( odysseyBeamingProjectionAlpha > 0.0 ) {
      return factor;
    }
  #endif

  if ( odysseyShadowMapActive <= 0.0 || odysseyShadowStrength <= 0.0 ) {
    return factor;
  }

  vec3 toLight = odysseyShadowLightWorld - worldPos;
  float dist = length( toLight.xy );
  float influence = max( odysseyShadowInfluenceRadius, 1e-4 );
  // Soft throw: full strength until fade start, then ease out to the influence edge.
  float radiusFade = 1.0 - smoothstep(
    influence * ODYSSEY_SHADOW_INFLUENCE_FADE_START,
    influence,
    dist
  );
  if ( radiusFade <= 0.0 ) {
    return factor;
  }

  // Three.js LightShadow.matrix already applies NDC→[0,1] viewport bias.
  vec4 shadowCoord = odysseyShadowMatrix * vec4( worldPos, 1.0 );
  shadowCoord.xyz /= shadowCoord.w;

  if (
    shadowCoord.x < 0.0 || shadowCoord.x > 1.0 ||
    shadowCoord.y < 0.0 || shadowCoord.y > 1.0 ||
    shadowCoord.z < 0.0 || shadowCoord.z > 1.0
  ) {
    return factor;
  }

  // Soften hard clipping at the shadow-map frustum border.
  float edgeDist = min(
    min( shadowCoord.x, 1.0 - shadowCoord.x ),
    min( shadowCoord.y, 1.0 - shadowCoord.y )
  );
  float mapFade = smoothstep( 0.0, ODYSSEY_SHADOW_MAP_EDGE_FADE, edgeDist );
  float fade = radiusFade * mapFade;
  if ( fade <= 0.0 ) {
    return factor;
  }

  float toLightLen = length( toLight );
  vec3 lightDir = toLightLen > 1e-4 ? toLight / toLightLen : vec3( 0.0, 0.0, 1.0 );
  float cosTheta = clamp( dot( normalize( worldNormal ), lightDir ), 0.0, 1.0 );
  float slopeBias = odysseyShadowSlopeBias * sqrt( 1.0 - cosTheta * cosTheta ) / max( cosTheta, 0.05 );
  // Floors: shrink bias so boots do not detach from the cast silhouette.
  float biasScale = normalize( worldNormal ).z > ODYSSEY_SHADOW_CONTACT_NORMAL_Z
    ? ODYSSEY_SHADOW_FLOOR_BIAS_SCALE
    : 1.0;
  float compare = shadowCoord.z - ( odysseyShadowConstantBias + slopeBias ) * biasScale;

  vec2 texelSize = vec2( 1.0 ) / odysseyShadowMapSize;
  float shadow = 0.0;
  for ( int x = -ODYSSEY_SHADOW_PCF_RADIUS; x <= ODYSSEY_SHADOW_PCF_RADIUS; x ++ ) {
    for ( int y = -ODYSSEY_SHADOW_PCF_RADIUS; y <= ODYSSEY_SHADOW_PCF_RADIUS; y ++ ) {
      vec2 offset = vec2( float( x ), float( y ) ) * texelSize;
      shadow += odysseyShadowCompare( shadowCoord.xy + offset, compare );
    }
  }
  float samples = float( ( 2 * ODYSSEY_SHADOW_PCF_RADIUS + 1 ) * ( 2 * ODYSSEY_SHADOW_PCF_RADIUS + 1 ) );
  shadow /= samples;

  float darkened = 1.0 - odysseyShadowStrength * ( 1.0 - RETAIL_SHADOW_MIN_VERTEX_COLOR );
  float lit = mix( darkened, 1.0, shadow );
  return mix( 1.0, lit, fade );
}

float odysseyComputeShadowMapFactor( const in vec3 worldPos, const in vec3 worldNormal ) {
  vec3 n = normalize( worldNormal );
  float f0 = odysseyShadowMapFactorAt( worldPos, n );
  if ( n.z <= ODYSSEY_SHADOW_CONTACT_NORMAL_Z ) {
    return f0;
  }

  // Vertical probe: decorative MDL floors below WOK / feet.
  float f = min(
    f0,
    odysseyShadowMapFactorAt( worldPos + vec3( 0.0, 0.0, ODYSSEY_SHADOW_CONTACT_LIFT ), n )
  );

  // Horizontal pull toward the lamp XY: closes the bright collar between boots
  // and the cast silhouette under angled lights (vertical-only lift mis-projects).
  vec3 toLight = odysseyShadowLightWorld - worldPos;
  float horizLen = length( toLight.xy );
  if ( horizLen > 1e-4 ) {
    vec2 h = toLight.xy / horizLen;
    float pull = ODYSSEY_SHADOW_CONTACT_LIFT * 0.6;
    f = min(
      f,
      odysseyShadowMapFactorAt( worldPos + vec3( h.x * pull, h.y * pull, 0.0 ), n )
    );
  }
  return f;
}
`;

export function createOdysseyShadowUniforms(){
  return {
    odysseyBeamingProjectionAlpha: { value: 0 },
    odysseyShadowMap: { value: null as THREE.Texture | null },
    odysseyShadowMatrix: { value: new THREE.Matrix4() },
    odysseyShadowMapSize: { value: new THREE.Vector2(1, 1) },
    odysseyShadowStrength: { value: 0 },
    odysseyShadowInfluenceRadius: { value: 0 },
    odysseyShadowLightWorld: { value: new THREE.Vector3() },
    odysseyShadowConstantBias: { value: ODYSSEY_SHADOW_MAP_DEPTH_BIAS },
    odysseyShadowSlopeBias: { value: 0.001 },
    odysseyShadowMapActive: { value: 0 },
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
