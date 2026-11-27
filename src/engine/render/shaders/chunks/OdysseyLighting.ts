import * as THREE from "three";

/**
 * engine-aligned Odyssey lighting GLSL + uniform helpers.
 * Positions uploaded by OdysseyLightingBinder are world-space (xyz); w = quadratic atten.
 * Fragment code transforms light xyz / sun by viewMatrix to match view-space geometry.
 * Packed arrays avoid Three.js struct-array upload crashes.
 *
 * Attenuation: 1/(1 + (4.5/r²)*d²) with r = max(radius, 0.1) — light upload
 * Ambient-only: ambient channel only — light upload
 * Active loop capped at per-model allowed_lights (3); array size stays 8.
 */

export const MAX_ODYSSEY_LIGHTS = 8;
/** VertexProgram allowed_lights — GLSL accumulate loop bound. */
export const MAX_ODYSSEY_LIGHTS_LOOP = 3;

/** GLSL fragment lighting helpers (included once in Odyssey model fragment shader). */
export const ODYSSEY_LIGHTING_PARS_FRAGMENT = `
#ifndef MAX_ODYSSEY_LIGHTS
  #define MAX_ODYSSEY_LIGHTS 8
#endif
#ifndef MAX_ODYSSEY_LIGHTS_LOOP
  #define MAX_ODYSSEY_LIGHTS_LOOP 3
#endif

#ifdef USE_ODYSSEY_LIGHT_UBO
layout(std140) uniform OdysseyLighting {
  vec3 odysseyAmbientColor;
  vec3 odysseySunAmbientColor;
  vec3 odysseySunColor;
  vec3 odysseySunDirection;
  int numOdysseyLights;
  int odysseyHeadLightEnabled;
  vec3 odysseyHeadLightAmbient;
  vec3 odysseyHeadLightDiffuse;
  vec4 odysseyLightPos[ MAX_ODYSSEY_LIGHTS ];
  vec4 odysseyLightColor[ MAX_ODYSSEY_LIGHTS ];
};
#else
uniform vec3 odysseyAmbientColor;
uniform vec3 odysseySunAmbientColor;
uniform vec3 odysseySunColor;
uniform vec3 odysseySunDirection;
uniform int numOdysseyLights;
// Camera headlight (SetUpVertexProgramLightShaderConstants)
uniform int odysseyHeadLightEnabled;
uniform vec3 odysseyHeadLightAmbient;
uniform vec3 odysseyHeadLightDiffuse;
// xyz = world-space position (binder); viewMatrix applied in accumulate; w = quadratic atten (4.5/r²)
uniform vec4 odysseyLightPos[ MAX_ODYSSEY_LIGHTS ];
// rgb = light color (fade×color for rooms; authored color for nearest/gob
// VP SetUpVertexProgramLightShaderConstants; no light node.multiplier),
// w = ambientOnly
uniform vec4 odysseyLightColor[ MAX_ODYSSEY_LIGHTS ];
#endif

float odysseyAttenuation( const in float lightDistance, const in float quadratic ) {
  if ( quadratic <= 0.0 ) return 0.0;
  return 1.0 / ( 1.0 + quadratic * lightDistance * lightDistance );
}

// OpenGL FFP diffuse term: light * materialDiffuse (no π normalization).
vec3 odysseyDiffuse( const in vec3 diffuseColor ) {
  return diffuseColor;
}

vec3 odysseyBlinnPhong(
  const in vec3 lightDir,
  const in vec3 viewDir,
  const in vec3 normal,
  const in vec3 specularColor,
  const in float shininess
) {
  vec3 halfDir = normalize( lightDir + viewDir );
  float dotNH = max( dot( normal, halfDir ), 0.0 );
  return pow( dotNH, shininess ) * specularColor;
}

// Packed GL_LIGHT0..2 irradiance (light upload). Diffuse terms are
// lighting only — the caller multiplies by albedo afterward. Default TXI
// envmaps ADD env*(1-texAlpha) after lighting (not albedo LERP).
void odysseyAccumulatePointLights(
  const in vec3 geometryPosition,
  const in vec3 geometryNormal,
  const in vec3 geometryViewDir,
  const in vec3 specularColor,
  const in float shininess,
  const in float specularStrength,
  inout vec3 directDiffuse,
  inout vec3 directSpecular,
  inout vec3 indirectDiffuse
) {
  for ( int i = 0; i < MAX_ODYSSEY_LIGHTS_LOOP; i ++ ) {
    if ( i < numOdysseyLights ) {
      vec4 lightPos = odysseyLightPos[ i ];
      vec4 lightCol = odysseyLightColor[ i ];
      // World → view so lVector matches view-space geometryPosition / normals
      vec3 lightView = ( viewMatrix * vec4( lightPos.xyz, 1.0 ) ).xyz;
      vec3 lVector = lightView - geometryPosition;
      float lightDistance = length( lVector );
      float atten = odysseyAttenuation( lightDistance, lightPos.w );
      vec3 lightColor = lightCol.rgb * atten;
      if ( lightColor != vec3( 0.0 ) ) {
        if ( lightCol.w > 0.5 ) {
          // Ambient-only light node — light upload ambient channel, no N·L
          indirectDiffuse += lightColor;
        } else {
          vec3 lightDir = normalize( lVector );
          float dotNL = max( dot( geometryNormal, lightDir ), 0.0 );
          vec3 irradiance = dotNL * lightColor;
          directDiffuse += irradiance;
          directSpecular += irradiance * odysseyBlinnPhong( lightDir, geometryViewDir, geometryNormal, specularColor, shininess ) * specularStrength;
        }
      }
    }
  }
}

void odysseyAccumulateLights(
  const in vec3 geometryPosition,
  const in vec3 geometryNormal,
  const in vec3 geometryViewDir,
  const in vec3 specularColor,
  const in float shininess,
  const in float specularStrength,
  inout vec3 directDiffuse,
  inout vec3 directSpecular,
  inout vec3 indirectDiffuse
) {
  // Scene light-model ambient (DynAmbientColor → SetAmbient)
  indirectDiffuse += odysseyAmbientColor;

  // Directional sun/moon ambient channel (SetAsDay/Night day/night ambient) — no N·L
  indirectDiffuse += odysseySunAmbientColor;

  // Area sun/moon diffuse — world-space direction, transformed to view
  vec3 sunDir = normalize( mat3( viewMatrix ) * odysseySunDirection );
  float sunDotNL = max( dot( geometryNormal, sunDir ), 0.0 );
  if ( sunDotNL > 0.0 && length( odysseySunColor ) > 0.0 ) {
    vec3 sunIrradiance = sunDotNL * odysseySunColor;
    directDiffuse += sunIrradiance;
    directSpecular += sunIrradiance * odysseyBlinnPhong( sunDir, geometryViewDir, geometryNormal, specularColor, shininess ) * specularStrength;
  }

  // Camera headlight: ambient + view-space forward diffuse (reserved model slot).
  if ( odysseyHeadLightEnabled != 0 ) {
    indirectDiffuse += odysseyHeadLightAmbient;
    vec3 headDir = vec3( 0.0, 0.0, 1.0 );
    float headDotNL = max( dot( geometryNormal, headDir ), 0.0 );
    if ( headDotNL > 0.0 ) {
      vec3 headIrradiance = headDotNL * odysseyHeadLightDiffuse;
      directDiffuse += headIrradiance;
      directSpecular += headIrradiance * odysseyBlinnPhong( headDir, geometryViewDir, geometryNormal, specularColor, shininess ) * specularStrength;
    }
  }

  odysseyAccumulatePointLights(
    geometryPosition, geometryNormal, geometryViewDir,
    specularColor, shininess, specularStrength,
    directDiffuse, directSpecular, indirectDiffuse
  );
}
`;

export function createEmptyOdysseyLightPosArray(): THREE.Vector4[] {
  const arr: THREE.Vector4[] = [];
  for(let i = 0; i < MAX_ODYSSEY_LIGHTS; i++){
    arr.push(new THREE.Vector4(0, 0, 0, 0));
  }
  return arr;
}

export function createEmptyOdysseyLightColorArray(): THREE.Vector4[] {
  const arr: THREE.Vector4[] = [];
  for(let i = 0; i < MAX_ODYSSEY_LIGHTS; i++){
    arr.push(new THREE.Vector4(0, 0, 0, 0));
  }
  return arr;
}

/** Explicit Odyssey lighting uniforms (no THREE.ShaderLib.phong lighting). */
export function createOdysseyLightingUniforms(): Record<string, { value: unknown }> {
  return {
    odysseyAmbientColor: { value: new THREE.Color(0, 0, 0) },
    odysseySunAmbientColor: { value: new THREE.Color(0, 0, 0) },
    odysseySunColor: { value: new THREE.Color(0, 0, 0) },
    odysseySunDirection: { value: new THREE.Vector3(4000, 4500, 7000).normalize() },
    numOdysseyLights: { value: 0 },
    odysseyHeadLightEnabled: { value: 0 },
    odysseyHeadLightAmbient: { value: new THREE.Color(0, 0, 0) },
    odysseyHeadLightDiffuse: { value: new THREE.Color(0, 0, 0) },
    odysseyLightPos: { value: createEmptyOdysseyLightPosArray() },
    odysseyLightColor: { value: createEmptyOdysseyLightColorArray() },
  };
}

/** Non-lighting material uniforms formerly pulled from ShaderLib.phong. */
export function createOdysseyMaterialBaseUniforms(): Record<string, { value: unknown }> {
  return {
    diffuse: { value: new THREE.Color(0xffffff) },
    emissive: { value: new THREE.Color(0x000000) },
    specular: { value: new THREE.Color(0x111111) },
    shininess: { value: 30 },
    opacity: { value: 1 },
    map: { value: null },
    alphaMap: { value: null },
    lightMap: { value: null },
    lightMapIntensity: { value: 1 },
    aoMap: { value: null },
    aoMapIntensity: { value: 1 },
    emissiveMap: { value: null },
    bumpMap: { value: null },
    bumpScale: { value: 1 },
    normalMap: { value: null },
    normalScale: { value: new THREE.Vector2(1, 1) },
    displacementMap: { value: null },
    displacementScale: { value: 1 },
    displacementBias: { value: 0 },
    envMap: { value: null },
    envMapIntensity: { value: 1 },
    /** TXI envmapalpha — one-pass output alpha; not an RGB blend scale. */
    envMapAlpha: { value: 1 },
    // samples cubemaps with GL_REFLECTION_MAP (no X flip). Three defaults
    // CubeTexture to -1 for its loader convention; TPC faces are uploaded in GL order.
    flipEnvMap: { value: 1 },
    /** Three's environment rotation; the camera rotation comes from viewMatrix in the shader. */
    envMapRotation: { value: new THREE.Matrix3() },
    reflectivity: { value: 1 },
    refractionRatio: { value: 0.98 },
    specularMap: { value: null },
    fogDensity: { value: 0.00025 },
    fogNear: { value: 1 },
    fogFar: { value: 2000 },
    fogColor: { value: new THREE.Color(0xffffff) },
    uvTransform: { value: new THREE.Matrix3() },
    // Required by Three uv_vertex when USE_*MAP is set (r151+)
    mapTransform: { value: new THREE.Matrix3() },
    alphaMapTransform: { value: new THREE.Matrix3() },
    lightMapTransform: { value: new THREE.Matrix3() },
    aoMapTransform: { value: new THREE.Matrix3() },
    bumpMapTransform: { value: new THREE.Matrix3() },
    normalMapTransform: { value: new THREE.Matrix3() },
    displacementMapTransform: { value: new THREE.Matrix3() },
    emissiveMapTransform: { value: new THREE.Matrix3() },
    specularMapTransform: { value: new THREE.Matrix3() },
  };
}

/** Sampler slots that have a matching `<slot>Transform` mat3 for r151+ uv_vertex. */
const ODYSSEY_MAP_TRANSFORM_SLOTS = [
  'map',
  'alphaMap',
  'lightMap',
  'aoMap',
  'bumpMap',
  'normalMap',
  'displacementMap',
  'emissiveMap',
  'specularMap',
] as const;

export type OdysseyMapTransformSlot = (typeof ODYSSEY_MAP_TRANSFORM_SLOTS)[number];

/**
 * Sync Three uv_vertex transform uniforms from a bound texture matrix.
 * Always refreshes `uvTransform` for legacy ANIMATED_UV / GUI paths that still read it.
 */
export function syncOdysseyMapTransforms(
  uniforms: Record<string, { value: unknown }> | undefined,
  slot: string,
  texture: THREE.Texture | null | undefined,
): void {
  if(!uniforms || !(texture instanceof THREE.Texture)) return;
  texture.updateMatrix();
  if(uniforms.uvTransform){
    uniforms.uvTransform.value = texture.matrix;
  }
  if((ODYSSEY_MAP_TRANSFORM_SLOTS as readonly string[]).includes(slot)){
    const transformKey = `${slot}Transform`;
    if(uniforms[transformKey]){
      uniforms[transformKey].value = texture.matrix;
    }
  }
}

/**
 * Toggle USE_LIGHTMAP and USE_UV1 together.
 * WebGLProgram only emits `attribute vec2 uv1` under USE_UV1, which stock
 * materials get via material.lightMap.channel — Odyssey ShaderMaterials bind
 * lightmaps as uniforms and pin LIGHTMAP_UV→uv1 in OdysseyUvChannels, so the
 * attribute define must be set explicitly.
 */
export function enableOdysseyLightmapDefines(
  material: { defines?: Record<string, unknown>; needsUpdate?: boolean },
  enabled: boolean,
): void {
  material.defines = material.defines || {};
  if(enabled){
    material.defines.USE_LIGHTMAP = '';
    material.defines.USE_UV1 = '';
  }else{
    delete material.defines.USE_LIGHTMAP;
    delete material.defines.USE_UV1;
  }
  material.needsUpdate = true;
}
