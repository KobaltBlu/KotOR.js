import * as THREE from "three";

import { RETAIL_SHADOW_MIN_VERTEX_COLOR } from "@/utility/retailLighting";
import { ODYSSEY_SHADOW_MAP_DEPTH_BIAS } from "@/utility/odysseyShadowMap";

/** Primary shadow map PCF kernel radius (3×3). */
export const ODYSSEY_SHADOW_PCF_RADIUS = 1;

export const ODYSSEY_SHADOW_PARS_FRAGMENT = `
#ifndef RETAIL_SHADOW_MIN_VERTEX_COLOR
  #define RETAIL_SHADOW_MIN_VERTEX_COLOR ${RETAIL_SHADOW_MIN_VERTEX_COLOR}
#endif

#ifndef ODYSSEY_SHADOW_PCF_RADIUS
  #define ODYSSEY_SHADOW_PCF_RADIUS ${ODYSSEY_SHADOW_PCF_RADIUS}
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
  if ( dist > odysseyShadowInfluenceRadius ) {
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

  float toLightLen = length( toLight );
  vec3 lightDir = toLightLen > 1e-4 ? toLight / toLightLen : vec3( 0.0, 0.0, 1.0 );
  float cosTheta = clamp( dot( normalize( worldNormal ), lightDir ), 0.0, 1.0 );
  float slopeBias = odysseyShadowSlopeBias * sqrt( 1.0 - cosTheta * cosTheta ) / max( cosTheta, 0.05 );
  float compare = shadowCoord.z - odysseyShadowConstantBias - slopeBias;

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
  return mix( darkened, 1.0, shadow );
}

float odysseyComputeShadowMapFactor( const in vec3 worldPos, const in vec3 worldNormal ) {
  // Focus-centered local spot maps already stack body over floor texels; sample once.
  return odysseyShadowMapFactorAt( worldPos, normalize( worldNormal ) );
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
