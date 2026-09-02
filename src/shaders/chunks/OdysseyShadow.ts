import * as THREE from "three";
import { LightManager } from "@/managers/LightManager";
import { RETAIL_SHADOW_MIN_VERTEX_COLOR, RETAIL_SHADOW_DEPTH_BIAS } from "@/utility/retailLighting";

/** Max hull slots packed per frame (mode-0 cap + static + distant). */
export const MAX_ODYSSEY_SHADOW_HULLS = 8;
export const MAX_ODYSSEY_SHADOW_HULL_VERTS = 16;

/** Mesh-local position varying for per-receiver shadow tests (Plane::Transform parity). */
export const ODYSSEY_SHADOW_WORLD_PARS = `
#ifdef USE_ODYSSEY_SHADOW
  varying vec3 vOdysseyShadowLocalPos;
#endif
`;

export const ODYSSEY_SHADOW_WORLD_VERTEX = `
#ifdef USE_ODYSSEY_SHADOW
  vec4 odysseyShadowLocalPos = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    odysseyShadowLocalPos = instanceMatrix * odysseyShadowLocalPos;
  #endif
  vOdysseyShadowLocalPos = odysseyShadowLocalPos.xyz;
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
uniform vec4 odysseyShadowHullPlane[ MAX_ODYSSEY_SHADOW_HULLS ];
uniform vec4 odysseyShadowHullBasisU[ MAX_ODYSSEY_SHADOW_HULLS ];
uniform vec4 odysseyShadowHullBasisV[ MAX_ODYSSEY_SHADOW_HULLS ];

float odysseyComputeShadowFactor( vec3 localPos ) {
  float factor = 1.0;
  #ifdef USE_ODYSSEY_BEAMING
    if ( odysseyBeamingProjectionAlpha > 0.0 ) {
      return factor;
    }
  #endif
  for ( int hi = 0; hi < MAX_ODYSSEY_SHADOW_HULLS; hi ++ ) {
    if ( hi < numOdysseyShadowHulls ) {
      vec4 lightPos = odysseyShadowLightPos[ hi ];
      float strength = lightPos.w;
      if ( strength > 0.0 ) {
        vec4 meta = odysseyShadowHullMeta[ hi ];
        // meta.y = casterNearDist, meta.z = vertCount, meta.w = influenceRSq
        float influenceRSq = meta.w;
        vec3 d = localPos - lightPos.xyz;
        if ( dot( d, d ) <= influenceRSq ) {
          int vertCount = int( meta.z + 0.5 );
          if ( vertCount >= 3 ) {
            vec4 plane = odysseyShadowHullPlane[ hi ];
            vec3 n = plane.xyz;
            float planeD = plane.w;
            vec3 basisU = odysseyShadowHullBasisU[ hi ].xyz;
            vec3 basisV = odysseyShadowHullBasisV[ hi ].xyz;
            float distToPlane = dot( localPos, n ) + planeD;
            vec3 onPlane = localPos - n * distToPlane;
            vec2 p = vec2( dot( onPlane, basisU ), dot( onPlane, basisV ) );
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

export interface IReceiverShadowState {
  slots: IOdysseyShadowHullSlot[];
  activeHullCount: number;
  frameEpoch: number;
}

export function createReceiverShadowState(): IReceiverShadowState {
  return {
    slots: createEmptyOdysseyShadowHullSlots(),
    activeHullCount: 0,
    frameEpoch: 0,
  };
}

export interface IOdysseyShadowHullSlot {
  active: boolean;
  lightX: number;
  lightY: number;
  lightZ: number;
  strength: number;
  planeZ: number;
  planeNormal: THREE.Vector3;
  planeConstant: number;
  planeTangentU: THREE.Vector3;
  planeTangentV: THREE.Vector3;
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
      planeNormal: new THREE.Vector3(0, 0, 1),
      planeConstant: 0,
      planeTangentU: new THREE.Vector3(1, 0, 0),
      planeTangentV: new THREE.Vector3(0, 1, 0),
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
    odysseyShadowHullPlane: {
      value: Array.from({ length: MAX_ODYSSEY_SHADOW_HULLS }, () => new THREE.Vector4()),
    },
    odysseyShadowHullBasisU: {
      value: Array.from({ length: MAX_ODYSSEY_SHADOW_HULLS }, () => new THREE.Vector4()),
    },
    odysseyShadowHullBasisV: {
      value: Array.from({ length: MAX_ODYSSEY_SHADOW_HULLS }, () => new THREE.Vector4()),
    },
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
