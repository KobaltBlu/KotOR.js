import * as THREE from "three";
import { LightManager } from "@/managers/LightManager";
import { RETAIL_SHADOW_MIN_VERTEX_COLOR, RETAIL_SHADOW_DEPTH_BIAS } from "@/utility/retailLighting";

/** Max hull slots packed per frame (mode-0 cap + static + distant). */
export const MAX_ODYSSEY_SHADOW_HULLS = 8;
export const MAX_ODYSSEY_SHADOW_HULL_VERTS = 16;

/** World-position varying for shadow tests — independent of Three envmap chunks (r149 has no worldpos_pars_fragment). */
export const ODYSSEY_SHADOW_WORLD_PARS = `
#ifdef USE_ODYSSEY_SHADOW
  varying vec3 vOdysseyShadowWorldPos;
#endif
`;

export const ODYSSEY_SHADOW_WORLD_VERTEX = `
#ifdef USE_ODYSSEY_SHADOW
  vec4 odysseyShadowWorldPos = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    odysseyShadowWorldPos = instanceMatrix * odysseyShadowWorldPos;
  #endif
  vOdysseyShadowWorldPos = ( modelMatrix * odysseyShadowWorldPos ).xyz;
#endif
`;

export const ODYSSEY_SHADOW_PARS_FRAGMENT = `
#ifndef MAX_ODYSSEY_SHADOW_HULLS
  #define MAX_ODYSSEY_SHADOW_HULLS ${MAX_ODYSSEY_SHADOW_HULLS}
#endif
#ifndef MAX_ODYSSEY_SHADOW_HULL_VERTS
  #define MAX_ODYSSEY_SHADOW_HULL_VERTS ${MAX_ODYSSEY_SHADOW_HULL_VERTS}
#endif
#ifndef RETAIL_SHADOW_MIN_VERTEX_COLOR
  #define RETAIL_SHADOW_MIN_VERTEX_COLOR ${RETAIL_SHADOW_MIN_VERTEX_COLOR}
#endif

uniform float odysseyShadowAlpha;
uniform float odysseyBeamingProjectionAlpha;
uniform int numOdysseyShadowHulls;
uniform vec4 odysseyShadowLightPos[ MAX_ODYSSEY_SHADOW_HULLS ];
uniform vec4 odysseyShadowHullMeta[ MAX_ODYSSEY_SHADOW_HULLS ];
uniform vec4 odysseyShadowHullEdges[ MAX_ODYSSEY_SHADOW_HULLS * MAX_ODYSSEY_SHADOW_HULL_VERTS ];

float odysseyComputeShadowFactor( vec3 worldPos ) {
  float factor = 1.0;
  vec2 p = worldPos.xy;
  for ( int hi = 0; hi < MAX_ODYSSEY_SHADOW_HULLS; hi ++ ) {
    if ( hi < numOdysseyShadowHulls ) {
      vec4 lightPos = odysseyShadowLightPos[ hi ];
      float strength = lightPos.w;
      if ( strength > 0.0 ) {
        vec4 meta = odysseyShadowHullMeta[ hi ];
        float influenceRSq = meta.w;
        vec3 d = worldPos - lightPos.xyz;
        if ( dot( d, d ) <= influenceRSq ) {
          int vertCount = int( meta.z + 0.5 );
          if ( vertCount >= 3 ) {
            float inside = 1.0;
            int signVal = 0;
            for ( int ei = 0; ei < MAX_ODYSSEY_SHADOW_HULL_VERTS; ei ++ ) {
              if ( ei < vertCount ) {
                vec4 edge = odysseyShadowHullEdges[ hi * MAX_ODYSSEY_SHADOW_HULL_VERTS + ei ];
                vec2 a = edge.xy;
                vec2 b = edge.zw;
                float cross = ( b.x - a.x ) * ( p.y - a.y ) - ( b.y - a.y ) * ( p.x - a.x );
                if ( abs( cross ) >= 1e-8 ) {
                  int edgeSign = cross > 0.0 ? 1 : -1;
                  if ( signVal == 0 ) {
                    signVal = edgeSign;
                  } else if ( signVal != edgeSign ) {
                    inside = 0.0;
                  }
                }
              }
            }
            if ( inside > 0.5 && signVal != 0 ) {
              float recvDist = length( d );
              if ( recvDist > meta.y + ${RETAIL_SHADOW_DEPTH_BIAS} ) {
                float keep = 1.0 - strength * ( 1.0 - RETAIL_SHADOW_MIN_VERTEX_COLOR );
                factor = min( factor, keep );
              }
            }
          }
        }
      }
    }
  }
  return factor;
}
`;

export interface IOdysseyShadowHullSlot {
  active: boolean;
  lightX: number;
  lightY: number;
  lightZ: number;
  strength: number;
  planeZ: number;
  casterNearDist: number;
  influenceRSq: number;
  hullVertCount: number;
  hullVerts: THREE.Vector2[];
}

export function createEmptyOdysseyShadowHullSlots(count = MAX_ODYSSEY_SHADOW_HULLS): IOdysseyShadowHullSlot[] {
  const slots: IOdysseyShadowHullSlot[] = [];
  for(let i = 0; i < count; i++){
    const verts: THREE.Vector2[] = [];
    for(let v = 0; v < MAX_ODYSSEY_SHADOW_HULL_VERTS; v++){
      verts.push(new THREE.Vector2());
    }
    slots.push({
      active: false,
      lightX: 0,
      lightY: 0,
      lightZ: 0,
      strength: 0,
      planeZ: 0,
      casterNearDist: 0,
      influenceRSq: 0,
      hullVertCount: 0,
      hullVerts: verts,
    });
  }
  return slots;
}

export function createOdysseyShadowUniforms(){
  const hullEdges: THREE.Vector4[] = [];
  for(let i = 0; i < MAX_ODYSSEY_SHADOW_HULLS * MAX_ODYSSEY_SHADOW_HULL_VERTS; i++){
    hullEdges.push(new THREE.Vector4());
  }
  return {
    odysseyShadowAlpha: { value: 0 },
    odysseyBeamingProjectionAlpha: { value: 0 },
    numOdysseyShadowHulls: { value: 0 },
    odysseyShadowLightPos: {
      value: Array.from({ length: MAX_ODYSSEY_SHADOW_HULLS }, () => new THREE.Vector4()),
    },
    odysseyShadowHullMeta: {
      value: Array.from({ length: MAX_ODYSSEY_SHADOW_HULLS }, () => new THREE.Vector4()),
    },
    odysseyShadowHullEdges: { value: hullEdges },
  };
}

/** Enable shader-based shadow reception on Odyssey materials. */
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

export function odysseyShadowHullCapacity(): number {
  return Math.max(1, LightManager.MAXSHADOWLIGHTS) + 2;
}
