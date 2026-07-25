import * as THREE from "three";
import { Shader } from "@/shaders/Shader";
import { ODYSSEY_DANGLY_VERTEX_LIBRARY } from "@/shaders/odysseyDangly";
import {
  MAX_ODYSSEY_LIGHTS,
  ODYSSEY_LIGHTING_PARS_FRAGMENT,
  createOdysseyLightingUniforms,
  createOdysseyMaterialBaseUniforms,
} from "@/shaders/chunks/OdysseyLighting";

/**
 * ShaderOdysseyModel — Odyssey model materials with fully custom lighting.
 * No THREE lighting chunks, lights uniforms, or renderer light collection.
 */
export class ShaderOdysseyModel extends Shader {

  constructor(){
    super();

    this.name = 'odyssey';

    this.fragment = `
    uniform vec3 diffuse;
    uniform vec3 emissive;
    uniform vec3 selfIllumColor;
    uniform vec3 tweakColor;
    uniform vec3 specular;
    uniform float shininess;
    uniform float opacity;
    uniform float envMapAlpha;
    // Retail DoEnvMapTransform @ 0046f780 — camera world rotation (no translation).
    uniform mat3 envMapRotation;
    uniform float time;

    float randF(vec2 co) {
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    #ifdef WATER
      uniform float waterAlpha;
    #endif

    #ifdef USE_DIRT
      uniform sampler2D dirtMap;
      varying vec2 vDirtUv;
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
    #include <normal_pars_fragment>

    varying vec3 vViewPosition;

    ${ODYSSEY_LIGHTING_PARS_FRAGMENT}

    #ifdef WATER
      #ifdef USE_BUMPMAP
        uniform sampler2D bumpMap;
        uniform float bumpScale;
        vec2 dHdxy_fwd() {
          vec2 bumpUv = vUv;
          vec2 dSTdx = dFdx( bumpUv );
          vec2 dSTdy = dFdy( bumpUv );
          float Hll = bumpScale * texture2D( bumpMap, bumpUv ).x;
          float dBx = bumpScale * texture2D( bumpMap, bumpUv + dSTdx ).x - Hll;
          float dBy = bumpScale * texture2D( bumpMap, bumpUv + dSTdy ).x - Hll;
          return vec2( dBx, dBy );
        }
        vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
          vec3 vSigmaX = dFdx( surf_pos.xyz );
          vec3 vSigmaY = dFdy( surf_pos.xyz );
          vec3 vN = surf_norm;
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

    void main() {
      #include <clipping_planes_fragment>

      vec4 diffuseColor = vec4( diffuse, opacity );
      vec3 totalEmissiveRadiance = emissive;

      #include <logdepthbuf_fragment>

      // Diffuse texture alpha before the opacity multiply — retail masks reflections on
      // the texture alpha, so alpha controllers/opacity must not affect the env mask.
      float odysseyDiffuseAlpha = 1.0;
      #ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D( map, vUv );
        odysseyDiffuseAlpha = sampledDiffuseColor.a;
        diffuseColor *= sampledDiffuseColor;
      #endif

      #include <color_fragment>
      #include <alphamap_fragment>
      #include <alphatest_fragment>
      #include <specularmap_fragment>
      #include <normal_fragment_begin>
      #include <normal_fragment_maps>
      #include <emissivemap_fragment>

      // specularStrength from specularmap_fragment; use perturbed normal after normal maps
      vec3 geometryPosition = - vViewPosition;
      vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0.0, 0.0, 1.0 ) : normalize( vViewPosition );

      vec3 materialDiffuseColor = diffuseColor.rgb;
      vec3 materialSpecularColor = specular;
      float materialShininess = max( shininess, 1e-4 );

      // Retail multipass RenderEnvironmentMapped @ 0046ff70 (environmentMapDest==0):
      //   final = lit * mix(env, diffuse, diffuseTexAlpha)
      // Albedo is blended first; irradiance is applied afterward so reflections stay lit.
      // (ATI one-pass 0x13 mixes unlit env — we target the common multipass path.)
      vec3 albedo = materialDiffuseColor;
      vec4 envColor = vec4( 0.0 );
      #ifdef USE_ENVMAP
        // Per-fragment sample (ENV_WORLDPOS define keeps Three worldpos/envmap varyings).
        // FFP uses GL_REFLECTION_MAP (eye-space) then DoEnvMapTransform multiplies the
        // texture matrix by camera orientation → world-space cubemap direction.
        vec3 reflectVec;
        #ifdef ENVMAP_MODE_REFLECTION
          reflectVec = reflect( -normalize( vViewPosition ), normalize( normal ) );
        #else
          reflectVec = refract( -normalize( vViewPosition ), normalize( normal ), refractionRatio );
        #endif
        reflectVec = envMapRotation * reflectVec;
        #ifdef ENVMAP_TYPE_CUBE
          envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
        #elif defined( ENVMAP_TYPE_CUBE_UV )
          envColor = textureCubeUV( envMap, reflectVec, 0.0 );
        #elif defined( ENVMAP_TYPE_EQUIREC )
          reflectVec = normalize( reflectVec );
          vec2 sampleUV = equirectUv( reflectVec );
          envColor = texture2D( envMap, sampleUV );
        #endif
        #ifdef ENVMAP_BLENDING_LERP
          // Diffuse tex alpha only — do not scale by envMapAlpha (retail multipass
          // writes envmapalpha to output alpha, not the RGB blend mask).
          albedo = mix( envColor.xyz, materialDiffuseColor, odysseyDiffuseAlpha );
        #endif
      #endif

      // directDiffuse / indirectDiffuse = irradiance (no albedo yet)
      vec3 directDiffuse = vec3( 0.0 );
      vec3 directSpecular = vec3( 0.0 );
      vec3 indirectDiffuse = vec3( 0.0 );

      #ifdef USE_LIGHTMAP
        // Bake supplies static irradiance; type-1 lights overlay (EnableLightsDynamicOnly).
        // With envmap, both modulate the blended albedo (RenderEMLM / multipass).
        indirectDiffuse += texture2D( lightMap, vUv2 ).xyz * lightMapIntensity;
        odysseyAccumulatePointLights(
          geometryPosition, normal, geometryViewDir,
          materialSpecularColor, materialShininess, specularStrength,
          directDiffuse, directSpecular, indirectDiffuse
        );
      #else
        #ifndef IGNORE_LIGHTING
          odysseyAccumulateLights(
            geometryPosition, normal, geometryViewDir,
            materialSpecularColor, materialShininess, specularStrength,
            directDiffuse, directSpecular, indirectDiffuse
          );
        #endif
      #endif

      #ifdef USE_AOMAP
        float ambientOcclusion = ( texture2D( aoMap, vUv2 ).r - 1.0 ) * aoMapIntensity + 1.0;
        indirectDiffuse *= ambientOcclusion;
      #endif

      vec3 outgoingLight = ( directDiffuse + indirectDiffuse ) * odysseyDiffuse( albedo ) + directSpecular + totalEmissiveRadiance;

      // Retail PartTriMesh::Mat @ 00473900 — SelfIllumColor → GL_EMISSION (additive).
      // FFP then modulates by texture: emission * albedo ≈ fullbright textured at 1,1,1.
      #ifndef IGNORE_LIGHTING
        #ifdef SELFILLUMCOLOR
          outgoingLight += selfIllumColor * albedo;
        #endif
      #endif

      #ifdef IGNORE_LIGHTING
        // Unlit meshes: albedo (+ self-illum) only.
        // Lightmapped rooms keep the USE_LIGHTMAP irradiance * albedo result above.
        #ifndef USE_LIGHTMAP
          outgoingLight = albedo + totalEmissiveRadiance;
          #ifdef SELFILLUMCOLOR
            outgoingLight *= max(vec3(0.25), selfIllumColor);
          #endif
        #endif
      #endif

      // Water / rare blends — post-lighting combine (not the default multipass LERP).
      #ifdef USE_ENVMAP
        #ifdef ENVMAP_BLENDING_MULTIPLY
          outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, (specularStrength * reflectivity) * (1.0 - diffuseColor.a) );
        #elif defined( ENVMAP_BLENDING_MIX )
          outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity * (1.0 - diffuseColor.a) );
        #elif defined( ENVMAP_BLENDING_ADD )
          // Rare environmentMapDest != 0 variant: diffuse + env*(1-a), additive.
          outgoingLight += (envColor.xyz * specularStrength * reflectivity) * (1.0 - diffuseColor.a);
        #endif
      #endif

      // TSL dirt overlay — blend dirtytex over lit albedo using dirt alpha.
      #ifdef USE_DIRT
        vec4 dirtSample = texture2D( dirtMap, vDirtUv );
        outgoingLight = mix( outgoingLight, dirtSample.rgb, dirtSample.a );
      #endif

      #ifdef SABER
        sampledDiffuseColor = texture2D( map, vUv );
        gl_FragColor = sampledDiffuseColor;
      #else
        gl_FragColor = vec4( outgoingLight, diffuseColor.a );
      #endif

      #include <tonemapping_fragment>
      #include <encodings_fragment>
      #include <fog_fragment>
      #if defined( WATER )
        gl_FragColor.rgb *= waterAlpha;
        gl_FragColor.a = waterAlpha;
      #endif
      #ifdef HOLOGRAM
        vec2 uv = vUv;
        vec3 col = texture2D(map, vUv).rgb;
        float gray = dot(col, vec3(0.299, 0.587, 0.114));
        col.r = gray * 0.33;
        col.g = gray * 0.75;
        col.b = clamp(gray * 1.5, 0.0, 1.0);
        col = clamp(col*0.5+0.5*col*col*1.2,0.0,1.0);
        col *= 0.6 + 0.4*16.0*uv.x*uv.y*(1.0-uv.x)*(1.0-uv.y);
        col *= vec3(0.9,1.0,0.7);
        col *= 0.8+0.2*sin(10.0*time+uv.y*900.0);
        col *= 1.0-0.07*randF(vec2(time, tan(time)));
        gl_FragColor = vec4(col,0.5);
      #endif
      #include <premultiplied_alpha_fragment>
      #include <dithering_fragment>
    }
    `;

    this.vertex = `
    varying vec3 vViewPosition;
    #ifndef FLAT_SHADED
      varying vec3 vNormal;
    #endif
    #include <common>
    #ifdef AURORA
      uniform float time;
    #endif

    // Retail MdlNodeTriMesh animateuv — ProceduralAnimateHierarchy @ 00483630
    // animatedUV      = (uvDirectionX, uvDirectionY, uvJitter, uvJitterSpeed)
    // animatedUVState = (accumOffsetX, accumOffsetY, jitterPhase, 0)
    #ifdef ANIMATED_UV
      uniform vec4 animatedUV;
      uniform vec4 animatedUVState;

      float randF(vec2 co) {
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
      }

      vec2 odysseyAnimateUV( vec2 p ) {
        vec2 base = p + animatedUVState.xy;
        float jitter = animatedUV.z;
        if ( jitter == 0.0 ) return base;
        float halfJitter = jitter * 0.5;
        float phase = animatedUVState.z;
        vec2 a = vec2( randF( p + floor( phase ) ), randF( p.yx + floor( phase ) ) );
        vec2 b = vec2( randF( p + floor( phase ) + 1.0 ), randF( p.yx + floor( phase ) + 1.0 ) );
        return base + ( mix( a, b, fract( phase ) ) * jitter - halfJitter );
      }
    #endif

    #ifdef DANGLY
      attribute vec4 constraint;
      attribute vec3 danglyOffset;
      uniform float danglyDisplacement;
      uniform float danglyTightness;
      uniform float danglyPeriod;
      uniform float windDanglyElapsed;
      uniform float danglyWindLevel;
    #endif

    #ifdef USE_DIRT
      uniform float dirtWorldspace;
      uniform float dirtScale;
      varying vec2 vDirtUv;
    #endif

    #include <uv_pars_vertex>
    #include <uv2_pars_vertex>
    #include <displacementmap_pars_vertex>
    #include <envmap_pars_vertex>
    #include <color_pars_vertex>
    #include <fog_pars_vertex>
    #include <morphtarget_pars_vertex>
    #include <skinning_pars_vertex>
    #include <logdepthbuf_pars_vertex>
    #include <clipping_planes_pars_vertex>

    #ifdef DANGLY
    ${ODYSSEY_DANGLY_VERTEX_LIBRARY}
    #endif

    void main() {
      #include <uv_vertex>

      #ifdef ANIMATED_UV
        #if defined( USE_UV ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP ) || defined( USE_ROUGHNESSMAP ) || defined( USE_METALNESSMAP )
          vUv = ( uvTransform * vec3( odysseyAnimateUV( uv ), 1 ) ).xy;
        #endif
      #endif

      #include <uv2_vertex>
      #include <color_vertex>
      #include <beginnormal_vertex>
      #include <morphnormal_vertex>
      #include <skinbase_vertex>
      #include <skinnormal_vertex>
      #include <defaultnormal_vertex>

      #ifndef FLAT_SHADED
        vNormal = normalize( transformedNormal );
      #endif

      #include <begin_vertex>
      #include <morphtarget_vertex>
      #include <skinning_vertex>

      #ifdef USE_DISPLACEMENTMAP
        transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vUv ).x * displacementScale + displacementBias );
      #endif

      #ifdef DANGLY
        odyssey_apply_dangly_vertex(transformed, objectNormal, modelMatrix);
      #endif

      #ifdef FORCE_SHIELD
        transformed += objectNormal * 0.01;
      #endif

      #include <project_vertex>
      #include <logdepthbuf_vertex>
      #include <clipping_planes_vertex>
      vViewPosition = - mvPosition.xyz;
      #include <worldpos_vertex>

      #ifdef USE_DIRT
        if ( dirtWorldspace > 0.5 ) {
          vec4 dirtWorld = modelMatrix * vec4( transformed, 1.0 );
          vDirtUv = dirtWorld.xz * dirtScale;
        } else {
          #if defined( USE_UV )
            vDirtUv = vUv;
          #else
            vDirtUv = vec2( 0.0 );
          #endif
        }
      #endif

      #include <envmap_vertex>
      #include <fog_vertex>
    }
    `;

    this.uniforms = [
      createOdysseyMaterialBaseUniforms(),
      createOdysseyLightingUniforms(),
      { selfIllumColor: { value: new THREE.Color() } },
      { tweakColor: { value: new THREE.Color() } },
      { alphaTest: { value: 0.0 } },
      { time: { value: 0.0 } },
      { animatedUV: { value: new THREE.Vector4(0, 0, 0, 0) } },
      { animatedUVState: { value: new THREE.Vector4(0, 0, 0, 0) } },
      { waterAlpha: { value: 1 } },
      { danglyDisplacement: { value: 0 } },
      { danglyTightness: { value: 0 } },
      { danglyPeriod: { value: 0 } },
      { dirtMap: { value: null } },
      { dirtWorldspace: { value: 1 } },
      { dirtScale: { value: 0.1 } },
    ];
  }

}

export { MAX_ODYSSEY_LIGHTS };
