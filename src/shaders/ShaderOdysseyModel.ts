import * as THREE from "three";
import { Shader } from "./Shader";

const odyssey_envmap_fragment = `
#ifdef USE_ENVMAP
  #ifdef ENV_WORLDPOS
    vec3 cameraToFrag;
    if ( isOrthographic ) {
      cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
    } else {
      cameraToFrag = normalize( vWorldPosition - cameraPosition );
    }
    vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
    #ifdef ENVMAP_MODE_REFLECTION
      vec3 reflectVec = reflect( cameraToFrag, worldNormal );
    #else
      vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
    #endif
  #else
    vec3 reflectVec = vReflect;
  #endif
  #ifdef ENVMAP_TYPE_CUBE
    vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
  #elif defined( ENVMAP_TYPE_CUBE_UV )
    vec4 envColor = textureCubeUV( envMap, reflectVec, 0.0 );
  #else
    vec4 envColor = vec4( 0.0 );
  #endif
  // #ifdef ENVMAP_BLENDING_MULTIPLY
  //   outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
  // #elif defined( ENVMAP_BLENDING_MIX )
  //   outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
  // #elif defined( ENVMAP_BLENDING_ADD )
  //   outgoingLight += envColor.xyz * specularStrength * reflectivity;
  // #endif
  #ifdef ENVMAP_BLENDING_MULTIPLY
    outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, (specularStrength * reflectivity) * (1.0 - diffuseColor.a) ); //odyssey uses the alpha of the texture to blend the envmap
  #elif defined( ENVMAP_BLENDING_MIX )
    outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity * (1.0 - diffuseColor.a) ); //odyssey uses the alpha of the texture to blend the envmap
  #elif defined( ENVMAP_BLENDING_ADD )
    outgoingLight += (envColor.xyz * specularStrength * reflectivity) * (1.0 - diffuseColor.a); //odyssey uses the alpha of the texture to blend the envmap
  #endif
#endif`

THREE.ShaderChunk.meshodyssey_vert = `
#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
  #include <uv_vertex>
  #include <uv2_vertex>
  #include <color_vertex>
  #include <morphcolor_vertex>
  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <normal_vertex>
  #include <begin_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <displacementmap_vertex>
  #include <project_vertex>
  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>
  vViewPosition = - mvPosition.xyz;
  #include <worldpos_vertex>
  #include <envmap_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>
}`;

THREE.ShaderChunk.meshodyssey_frag = `
#define PHONG

uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;

#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
// #include <cube_uv_reflection_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {

  #include <clipping_planes_fragment>

  vec4 diffuseColor = vec4( diffuse, opacity );
  ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
  vec3 totalEmissiveRadiance = emissive;

  #include <logdepthbuf_fragment>
  #include <map_fragment>
  #include <color_fragment>
  #include <alphamap_fragment>
  #include <alphatest_fragment>
  #include <specularmap_fragment>
  #include <normal_fragment_begin>
  #include <normal_fragment_maps>
  #include <emissivemap_fragment>
  
  // accumulation
  #include <lights_phong_fragment>
  #include <lights_fragment_begin>
  #include <lights_fragment_maps>
  #include <lights_fragment_end>

  // modulation
  #include <aomap_fragment>

  vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
  
  #include <envmap_fragment>
  #include <output_fragment>
  #include <tonemapping_fragment>
  #include <encodings_fragment>
  #include <fog_fragment>
  #include <premultiplied_alpha_fragment>
  #include <dithering_fragment>
}`;

/**
 * ShaderOdysseyModel class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ShaderOdysseyModel.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ShaderOdysseyModel extends Shader {

  constructor(){
    super();

    this.name = 'odyssey';

    this.fragment = `
    #define PHONG
    
    uniform vec3 diffuse;
    uniform vec3 emissive;
    uniform vec3 selfIllumColor;
    uniform vec3 tweakColor;
    uniform vec3 specular;
    uniform float shininess;
    uniform float opacity;
    uniform float time;
    uniform vec4 animatedUV; // MDL animatedUV properties
    uniform vec4 animationVector; // Water TXI animation
  
    float randF(vec2 co) {
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }
  
    vec2 UVJitter( vec2 p ) {
      // convert Vertex position <-1,+1> to texture coordinate <0,1> and some shrinking so the effect dont overlap screen
      //p.x=( 0.55*p.x)+0.5;
      //p.y=(-0.55*p.y)+0.5;
      // wave distortion
      float x = (sin( (25.0 * p.y + 30.0 * p.x + 6.28 * 0.3477) + (randF(vec2(time, tan(time)))) ) * (animatedUV.z * 0.1));
      float y = (sin( (25.0 * p.y + 30.0 * p.x + 6.28 * 0.7812) + (randF(vec2(time, tan(time)))) ) * (animatedUV.w * 0.1));
      return vec2(p.x + x + ((animatedUV.x * 50.0) * time), p.y + y + ((animatedUV.y * 50.0) * time));
    }

    #ifdef CYCLE
      varying vec2 vUvCycle;
    #endif
  
    #ifdef WATER
      uniform float waterAlpha;
    #endif

    #include <common>
    #include <packing>
    #include <dithering_pars_fragment>
    #include <color_pars_fragment>
    #include <uv_pars_fragment>
    #include <uv2_pars_fragment>
    #include <map_pars_fragment>
    #include <alphamap_pars_fragment>
    #include <alphatest_pars_fragment>
    #include <aomap_pars_fragment>
    #include <lightmap_pars_fragment>
    #include <emissivemap_pars_fragment>
    #include <envmap_common_pars_fragment>
    #include <envmap_pars_fragment>
    #include <cube_uv_reflection_fragment>
    #include <fog_pars_fragment>
    #include <bsdfs>
    
    //ADD Animated to PointLight struct
    uniform bool receiveShadow;
    uniform vec3 ambientLightColor;
    uniform vec3 lightProbe[ 9 ];

    // get the irradiance (radiance convolved with cosine lobe) at the point 'normal' on the unit sphere
    // source: https://graphics.stanford.edu/papers/envmap/envmap.pdf
    vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
      // normal is assumed to have unit length
      float x = normal.x, y = normal.y, z = normal.z;
      // band 0
      vec3 result = shCoefficients[ 0 ] * 0.886227;
      // band 1
      result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
      result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
      result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
      // band 2
      result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
      result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
      result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
      result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
      result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
      return result;
    }

    vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
      vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
      vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
      return irradiance;
    }

    vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
      vec3 irradiance = ambientLightColor;
      return irradiance;
    }

    float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
      #if defined ( PHYSICALLY_CORRECT_LIGHTS )
        // based upon Frostbite 3 Moving to Physically-based Rendering
        // page 32, equation 26: E[window1]
        // https://seblagarde.files.wordpress.com/2015/07/course_notes_moving_frostbite_to_pbr_v32.pdf
        float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
        if ( cutoffDistance > 0.0 ) {
          distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
        }
        return distanceFalloff;
      #else
        if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
          return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );
        }
        return 1.0;
      #endif
    }

    float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
      return smoothstep( coneCosine, penumbraCosine, angleCosine );
    }

    #if NUM_DIR_LIGHTS > 0
      struct DirectionalLight {
        vec3 direction;
        vec3 color;
      };
      uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
      void getDirectionalLightInfo( const in DirectionalLight directionalLight, const in GeometricContext geometry, out IncidentLight light ) {
        light.color = directionalLight.color;
        light.direction = directionalLight.direction;
        light.visible = true;
      }
    #endif
    #if NUM_POINT_LIGHTS > 0
      struct PointLight {
        vec3 position;
        vec3 color;
        float distance;
        float animated;
        float decay;
      };
      uniform PointLight pointLights[ NUM_POINT_LIGHTS ];

      // light is an out parameter as having it as a return value caused compiler errors on some devices
      void getPointLightInfo( const in PointLight pointLight, const in GeometricContext geometry, out IncidentLight light ) {
        vec3 lVector = pointLight.position - geometry.position;
        light.direction = normalize( lVector );
        float lightDistance = length( lVector );
        light.color = pointLight.color;
        light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
        light.visible = ( light.color != vec3( 0.0 ) );
      }
    #endif
    #if NUM_SPOT_LIGHTS > 0
      struct SpotLight {
        vec3 position;
        vec3 direction;
        vec3 color;
        float distance;
        float decay;
        float coneCos;
        float penumbraCos;
      };
      uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
      // light is an out parameter as having it as a return value caused compiler errors on some devices
      void getSpotLightInfo( const in SpotLight spotLight, const in GeometricContext geometry, out IncidentLight light ) {
        vec3 lVector = spotLight.position - geometry.position;
        light.direction = normalize( lVector );
        float angleCos = dot( light.direction, spotLight.direction );
        float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
        if ( spotAttenuation > 0.0 ) {
          float lightDistance = length( lVector );
          light.color = spotLight.color * spotAttenuation;
          light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
          light.visible = ( light.color != vec3( 0.0 ) );
        } else {
          light.color = vec3( 0.0 );
          light.visible = false;
        }
      }
    #endif
    #if NUM_RECT_AREA_LIGHTS > 0
      struct RectAreaLight {
        vec3 color;
        vec3 position;
        vec3 halfWidth;
        vec3 halfHeight;
      };
      // Pre-computed values of LinearTransformedCosine approximation of BRDF
      // BRDF approximation Texture is 64x64
      uniform sampler2D ltc_1; // RGBA Float
      uniform sampler2D ltc_2; // RGBA Float
      uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];  
    #endif
    #if NUM_HEMI_LIGHTS > 0
      struct HemisphereLight {
        vec3 direction;
        vec3 skyColor;
        vec3 groundColor;
      };
      uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
      vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
        float dotNL = dot( normal, hemiLight.direction );
        float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
        vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
        return irradiance;
      }
    #endif
    //END Animated to PointLight struct

    #include <normal_pars_fragment>
    #include <lights_phong_pars_fragment>
    #include <shadowmap_pars_fragment>
    #ifdef WATER
      #ifdef USE_BUMPMAP
        uniform sampler2D bumpMap;
        uniform float bumpScale;
        vec2 dHdxy_fwd() {
          vec2 dSTdx = dFdx( vUvCycle );
          vec2 dSTdy = dFdy( vUvCycle );
          float Hll = bumpScale * texture2D( bumpMap, vUvCycle ).x;
          float dBx = bumpScale * texture2D( bumpMap, vUvCycle + dSTdx ).x - Hll;
          float dBy = bumpScale * texture2D( bumpMap, vUvCycle + dSTdy ).x - Hll;
          return vec2( dBx, dBy );
        }
        vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
          vec3 vSigmaX = dFdx( surf_pos.xyz );
          vec3 vSigmaY = dFdy( surf_pos.xyz );
          vec3 vN = surf_norm; // normalized
          vec3 R1 = cross( vSigmaY, vN );
          vec3 R2 = cross( vN, vSigmaX );
          float fDet = dot( vSigmaX, R1 ) * faceDirection;
          vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
          return normalize( abs( fDet ) * surf_norm - vGrad );
        }
      #endif
    #else
      #include <bumpmap_pars_fragment>
    #endif
    #include <normalmap_pars_fragment>
    #include <specularmap_pars_fragment>
    #include <logdepthbuf_pars_fragment>
    #include <clipping_planes_pars_fragment>
  
    void RE_Direct_Anim( const in IncidentLight directLight, const in GeometricContext geometry, const in BlinnPhongMaterial material, const in float amount, inout ReflectedLight reflectedLight ) {
      float dotNL = saturate( dot( geometry.normal, directLight.direction ) );
      vec3 irradiance = dotNL * directLight.color;
      reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor ) * amount;
      reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometry.viewDir, geometry.normal, material.specularColor, material.specularShininess ) * material.specularStrength * amount;
    }
  
    //float rand(vec2 co) {
    //  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    //}
  
    vec2 uResolution = vec2(640.0, 480.0);
  
  
    void main() {
      #include <clipping_planes_fragment>

      vec4 diffuseColor = vec4( diffuse, opacity );
      ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
      ReflectedLight animatedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
      vec3 totalEmissiveRadiance = emissive;

      #include <logdepthbuf_fragment>

      // #include <map_fragment> 
      #ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D( map, vUv );
        #if defined( ANIMATED_UV )
          sampledDiffuseColor = texture2D( map, UVJitter(vUv) );
        #endif
        // sampledDiffuseColor = mapTexelToLinear( sampledDiffuseColor );
        diffuseColor *= sampledDiffuseColor;
      #endif

      #include <color_fragment>
      #include <alphamap_fragment>
      #include <alphatest_fragment>
      #include <specularmap_fragment>
      #include <normal_fragment_begin>
      #include <normal_fragment_maps>
      #include <emissivemap_fragment>
      // accumulation
      #include <lights_phong_fragment>
      
      //BEGIN Custom LIGHT - "lights_fragment_begin"
      // #include <lights_fragment_begin>
      GeometricContext geometry;
      geometry.position = - vViewPosition;
      geometry.normal = normal;
      geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
      #ifdef CLEARCOAT
        geometry.clearcoatNormal = clearcoatNormal;
      #endif
      IncidentLight directLight;
      #if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
        PointLight pointLight;
        #if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
        PointLightShadow pointLightShadow;
        #endif
        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
          pointLight = pointLights[ i ];
          getPointLightInfo( pointLight, geometry, directLight );
          #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
          pointLightShadow = pointLightShadows[ i ];
          directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
          #endif
          RE_Direct( directLight, geometry, material, reflectedLight );
          
          RE_Direct_Anim( directLight, geometry, material, pointLight.animated, animatedLight );
        }
        #pragma unroll_loop_end
      #endif
      #if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
        SpotLight spotLight;
        #if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
        SpotLightShadow spotLightShadow;
        #endif
        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
          spotLight = spotLights[ i ];
          getSpotLightInfo( spotLight, geometry, directLight );
          #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
          spotLightShadow = spotLightShadows[ i ];
          directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
          #endif
          RE_Direct( directLight, geometry, material, reflectedLight );
        }
        #pragma unroll_loop_end
      #endif
      #if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
        DirectionalLight directionalLight;
        #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
        DirectionalLightShadow directionalLightShadow;
        #endif
        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
          directionalLight = directionalLights[ i ];
          getDirectionalLightInfo( directionalLight, geometry, directLight );
          #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
          directionalLightShadow = directionalLightShadows[ i ];
          directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
          #endif
          RE_Direct( directLight, geometry, material, reflectedLight );
        }
        #pragma unroll_loop_end
      #endif
      #if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
        RectAreaLight rectAreaLight;
        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
          rectAreaLight = rectAreaLights[ i ];
          RE_Direct_RectArea( rectAreaLight, geometry, material, reflectedLight );
        }
        #pragma unroll_loop_end
      #endif
      #if defined( RE_IndirectDiffuse )
        vec3 iblIrradiance = vec3( 0.0 );
        vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
        irradiance += getLightProbeIrradiance( lightProbe, geometry.normal );
        #if ( NUM_HEMI_LIGHTS > 0 )
          #pragma unroll_loop_start
          for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
            irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry.normal );
          }
          #pragma unroll_loop_end
        #endif
      #endif
      #if defined( RE_IndirectSpecular )
        vec3 radiance = vec3( 0.0 );
        vec3 clearcoatRadiance = vec3( 0.0 );
      #endif
      //END Custom LIGHT
  
      #include <lights_fragment_maps>
      #include <lights_fragment_end>

      // modulation
      #include <aomap_fragment>

      #ifndef AURORA
        vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
      #else
        #ifdef USE_LIGHTMAP
          reflectedLight.indirectDiffuse = vec3(0.0);
          reflectedLight.indirectDiffuse += PI * texture2D( lightMap, vUv2 ).xyz * lightMapIntensity;
          reflectedLight.indirectDiffuse *= BRDF_Lambert( diffuseColor.rgb );
          //vec3 outgoingLight = (reflectedLight.indirectDiffuse + animatedLight); // shadow intensity hardwired to 0.5 here
  
          vec3 outgoingLight = reflectedLight.indirectDiffuse + (((animatedLight.directDiffuse * 0.5) + animatedLight.indirectDiffuse + animatedLight.directSpecular + animatedLight.indirectSpecular + totalEmissiveRadiance));
        #else
          //reflectedLight.indirectDiffuse = vec3(diffuseColor.rgb);
          #ifdef SELFILLUMCOLOR
            vec3 outgoingLight = (reflectedLight.directDiffuse) + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
          #else
            vec3 outgoingLight = (reflectedLight.directDiffuse) + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
          #endif
        #endif
      #endif
      
      #ifdef IGNORE_LIGHTING
        //outgoingLight = vec3(diffuseColor.rgb + animatedLight);
        //mix(diffuseColor.rgb, reflectedLight.directDiffuse, 0.75)
        //outgoingLight = max(diffuseColor.rgb, mix( diffuseColor.rgb, emissive, 0.5 ));
        outgoingLight = (diffuseColor.rgb) + (((animatedLight.directDiffuse * 0.5) + animatedLight.indirectDiffuse + animatedLight.directSpecular + animatedLight.indirectSpecular + totalEmissiveRadiance));
        #ifdef SELFILLUMCOLOR
          outgoingLight = (diffuseColor.rgb) + (((animatedLight.directDiffuse * 0.5) + animatedLight.indirectDiffuse + animatedLight.directSpecular + animatedLight.indirectSpecular + totalEmissiveRadiance));
          outgoingLight *= max(vec3(0.25), selfIllumColor);
        #endif
        //outgoingLight = max( diffuseColor.rgb, diffuseColor.rgb * emissive );// + (((animatedLight.directDiffuse * 0.5) + animatedLight.indirectDiffuse + animatedLight.directSpecular + animatedLight.indirectSpecular + totalEmissiveRadiance)* 0.5);
      #endif
      #ifdef USE_ENVMAP
        #ifdef ENV_WORLDPOS
          vec3 cameraToFrag;
          
          if ( isOrthographic ) {
            cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
          }  else {
            cameraToFrag = normalize( vWorldPosition - cameraPosition );
          }
          vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
          #ifdef ENVMAP_MODE_REFLECTION
            vec3 reflectVec = reflect( cameraToFrag, worldNormal );
          #else
            vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
          #endif
        #else
          vec3 reflectVec = vReflect;
        #endif
        #ifdef ENVMAP_TYPE_CUBE
          vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
        #elif defined( ENVMAP_TYPE_CUBE_UV )
          vec4 envColor = textureCubeUV( envMap, reflectVec, 0.0 );
        #elif defined( ENVMAP_TYPE_EQUIREC )
          reflectVec = normalize( reflectVec );
          vec2 sampleUV = equirectUv( reflectVec );
          vec4 envColor = texture2D( envMap, sampleUV );
        #else
          vec4 envColor = vec4( 0.0 );
        #endif
        #ifndef ENVMAP_TYPE_CUBE_UV
          //envColor = envMapTexelToLinear( envColor );
        #endif
        #ifdef ENVMAP_BLENDING_MULTIPLY
          outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, (specularStrength * reflectivity) * (1.0 - diffuseColor.a) );
        #elif defined( ENVMAP_BLENDING_MIX )
          outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity * (1.0 - diffuseColor.a) );
        #elif defined( ENVMAP_BLENDING_ADD )
          outgoingLight += (envColor.xyz * specularStrength * reflectivity) * (1.0 - diffuseColor.a);
        #endif
      #endif
      #ifdef SABER
        sampledDiffuseColor = texture2D( map, vUv );
        gl_FragColor = sampledDiffuseColor;
      #else
        gl_FragColor = vec4( outgoingLight, diffuseColor.a );
      #endif
      
      //#ifdef USE_TWEAK_COLOR
      //  float average = (gl_FragColor.r + gl_FragColor.g + gl_FragColor.b) / 3.0;
      //  gl_FragColor.rgb = (vec3(average, average, average) * tweakColor);
      //#endif

      #include <tonemapping_fragment>
      #include <encodings_fragment>
      #include <fog_fragment>
      #if defined( WATER )
        gl_FragColor.rgb *= waterAlpha;
        gl_FragColor.a = waterAlpha;
      #endif
      #ifdef HOLOGRAM
        
        vec2 q = vUv;
        vec2 uv = vUv;
        vec3 oricol = outgoingLight.xyz;
        vec3 col = texture2D(map, vUv).rgb;
        float gray = dot(col, vec3(0.299, 0.587, 0.114));
  
        col.r = gray * 0.33;
        col.g = gray * 0.75;
        col.b = clamp(gray * 1.5, 0.0, 1.0);
  
        col = clamp(col*0.5+0.5*col*col*1.2,0.0,1.0);
        col *= 0.6 + 0.4*16.0*uv.x*uv.y*(1.0-uv.x)*(1.0-uv.y);
        col *= vec3(0.9,1.0,0.7);
        col *= 0.8+0.2*sin(10.0*time+uv.y*900.0);
        col *= 1.0-0.07*rand(vec2(time, tan(time)));
        gl_FragColor = vec4(col,0.5);
        
      #endif
      #include <premultiplied_alpha_fragment>
      #include <dithering_fragment>
    }
    `;

    this.vertex = `
    #define PHONG
    varying vec3 vViewPosition;
    #ifndef FLAT_SHADED
      varying vec3 vNormal;
    #endif
    #include <common>
    #ifdef AURORA
      uniform float time;
    #endif

    #ifdef CYCLE
      // varying mat3 cycleTransform;
      varying vec2 vUvCycle;
      uniform vec4 animationVector;
    #endif
  
    #ifdef DANGLY
      attribute vec4 constraint;
      uniform float danglyDisplacement;
      uniform float danglyTightness;
      uniform float danglyPeriod;
    #endif
    #include <uv_pars_vertex>
    #include <uv2_pars_vertex>
    #include <displacementmap_pars_vertex>
    #include <envmap_pars_vertex>
    #include <color_pars_vertex>
    #include <fog_pars_vertex>
    #include <morphtarget_pars_vertex>
    #include <skinning_pars_vertex>
    #include <shadowmap_pars_vertex>
    #include <logdepthbuf_pars_vertex>
    #include <clipping_planes_pars_vertex>
    
    void main() {
      #ifdef CYCLE
        //SpriteSheet Calculations
        float framesX = animationVector.x;
        float framesY = animationVector.y;
        float totalFrames = animationVector.z;
        float fps = animationVector.w;
        
        float deltaMax = (1.0 / fps) * totalFrames;
        float fTime = mod(time, deltaMax) / deltaMax;
        float frameNumber = floor(mod( fTime * totalFrames, totalFrames ));

        float column = floor(mod( frameNumber, framesX ));
        float row = floor( (frameNumber - column) / framesX );

        float columnNorm = column / framesX;
        float rowNorm = row / framesY;

        vec2 cycleUV = vec2(
          columnNorm,
          rowNorm
        );
        
        vUvCycle = cycleUV + uv;
        mat3 cycleTransform = mat3(
          uvTransform[0][0], uvTransform[0][1], uvTransform[0][2],
          uvTransform[1][0], uvTransform[1][1], uvTransform[1][2],
          columnNorm, rowNorm, uvTransform[2][2]
        );
        #if defined( USE_UV ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP ) || defined( USE_ROUGHNESSMAP ) || defined( USE_METALNESSMAP )
          vUv = ( cycleTransform * vec3( uv, 1 ) ).xy;
        #endif
      #else
        #include <uv_vertex>
      #endif

      #include <uv2_vertex>
      #include <color_vertex>
      #include <beginnormal_vertex>
      #include <morphnormal_vertex>
      #include <skinbase_vertex>
      #include <skinnormal_vertex>
      #include <defaultnormal_vertex>

      #ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED
        vNormal = normalize( transformedNormal );
      #endif

      #include <begin_vertex>
      #include <morphtarget_vertex>
      #include <skinning_vertex>

      #ifdef USE_DISPLACEMENTMAP
        transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vUvCycle ).x * displacementScale + displacementBias );
      #endif

      #ifdef DANGLY
        float wind = (1.0 * danglyPeriod) * ( cos(time) );
        transformed += vec3(sin(wind) * constraint.x * 2.0, sin(wind) * constraint.y * 2.0, sin(wind) * constraint.z * 2.0 * danglyTightness) * (constraint.w / 255.0) * (danglyDisplacement * 0.1);
      #endif
  
      #ifdef FORCE_SHIELD
        //Expand the vertex along it's normal direction
        transformed += objectNormal * 0.01;
      #endif
  
      #include <project_vertex>
      #include <logdepthbuf_vertex>
      #include <clipping_planes_vertex>
      vViewPosition = - mvPosition.xyz;
      #include <worldpos_vertex>
      #include <envmap_vertex>
      #include <shadowmap_vertex>
      #include <fog_vertex>
    }
    `;

    // this.vertex = THREE.ShaderChunk.meshodyssey_vert;
    // this.fragment = THREE.ShaderChunk.meshodyssey_frag;

    this.uniforms = [
      THREE.ShaderLib.phong.uniforms,
      { diffuse: { value: new THREE.Color() } },
      { selfIllumColor: { value: new THREE.Color() } },
      { tweakColor: { value: new THREE.Color() } },
      { alphaTest: { value: 0.0 } },
      { time: { value: 0.0 } },
      { animatedUV: { value: new THREE.Vector4(0, 0, 0, 0) } },
      { waterAlpha: { value: 1 } },
      { animationVector : { value: new THREE.Vector4(0, 0, 0, 0) } },
      { danglyDisplacement: { value: 0 } },
      { danglyTightness: { value: 0 } },
      { danglyPeriod: { value: 0 } }
    ];

  }

}