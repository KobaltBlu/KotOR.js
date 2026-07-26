import * as THREE from "three";

/**
 * Retail-aligned Odyssey lighting GLSL + uniform helpers.
 * Positions uploaded by OdysseyLightingBinder are view-space (xyz); w = quadratic atten.
 * Packed arrays avoid Three.js struct-array upload crashes.
 *
 * Attenuation: 1/(1 + (4.5/r²)*d²) with r = max(radius, 0.1) — SetLightGL @ 004a2a00
 * Ambient-only: ambient channel only — SetLightGL @ 004a2a00
 * Active loop capped at retail per-model allowed_lights (3); array size stays 8.
 */

export const MAX_ODYSSEY_LIGHTS = 8;
/** Retail VertexProgram allowed_lights — GLSL accumulate loop bound. */
export const MAX_ODYSSEY_LIGHTS_LOOP = 3;

/** GLSL fragment lighting helpers (included once in Odyssey model fragment shader). */
export const ODYSSEY_LIGHTING_PARS_FRAGMENT = `
#ifndef MAX_ODYSSEY_LIGHTS
  #define MAX_ODYSSEY_LIGHTS 8
#endif
#ifndef MAX_ODYSSEY_LIGHTS_LOOP
  #define MAX_ODYSSEY_LIGHTS_LOOP 3
#endif

uniform vec3 odysseyAmbientColor;
uniform vec3 odysseySunAmbientColor;
uniform vec3 odysseySunColor;
uniform vec3 odysseySunDirection;
uniform int numOdysseyLights;
// Camera headlight (SetUpVertexProgramLightShaderConstants @ 004a50d0)
uniform int odysseyHeadLightEnabled;
uniform vec3 odysseyHeadLightAmbient;
uniform vec3 odysseyHeadLightDiffuse;
// xyz = view-space position (binder-transformed), w = quadratic attenuation coeff (4.5/r²)
uniform vec4 odysseyLightPos[ MAX_ODYSSEY_LIGHTS ];
// rgb = light color (fade×color for rooms; authored color for nearest/gob —
// VP SetUpVertexProgramLightShaderConstants @ 004a50d0; no PartLight.multiplier),
// w = ambientOnly
uniform vec4 odysseyLightColor[ MAX_ODYSSEY_LIGHTS ];

float odysseyRetailAttenuation( const in float lightDistance, const in float quadratic ) {
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

// Packed GL_LIGHT0..2 irradiance (SetLightGL @ 004a2a00). Diffuse terms are
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
      // lightPos.xyz already view-space (OdysseyLightingBinder)
      vec3 lVector = lightPos.xyz - geometryPosition;
      float lightDistance = length( lVector );
      float atten = odysseyRetailAttenuation( lightDistance, lightPos.w );
      vec3 lightColor = lightCol.rgb * atten;
      if ( lightColor != vec3( 0.0 ) ) {
        if ( lightCol.w > 0.5 ) {
          // Ambient-only PartLight — SetLightGL ambient channel, no N·L
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
  // Scene light-model ambient (DynAmbientColor → CAurScene::SetAmbient)
  indirectDiffuse += odysseyAmbientColor;

  // Directional sun/moon ambient channel (SetAsDay/Night vtable+0x18) — no N·L
  indirectDiffuse += odysseySunAmbientColor;

  // Area sun/moon diffuse (gidy_sun_diff) — direction is view-space
  vec3 sunDir = normalize( odysseySunDirection );
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
    /** TXI envmapalpha — retail one-pass output alpha; not an RGB blend scale. */
    envMapAlpha: { value: 1 },
    // Retail samples cubemaps with GL_REFLECTION_MAP (no X flip). Three defaults
    // CubeTexture to -1 for its loader convention; TPC faces are uploaded in GL order.
    flipEnvMap: { value: 1 },
    /** DoEnvMapTransform @ 0046f780 — camera world rotation; identity until binder uploads. */
    envMapRotation: { value: new THREE.Matrix3() },
    reflectivity: { value: 1 },
    refractionRatio: { value: 0.98 },
    specularMap: { value: null },
    fogDensity: { value: 0.00025 },
    fogNear: { value: 1 },
    fogFar: { value: 2000 },
    fogColor: { value: new THREE.Color(0xffffff) },
    uvTransform: { value: new THREE.Matrix3() },
    // Required by Three uv2_vertex when USE_LIGHTMAP / USE_AOMAP is set
    uv2Transform: { value: new THREE.Matrix3() },
  };
}
