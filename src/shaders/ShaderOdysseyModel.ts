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
    uniform float time;
    uniform vec4 animatedUV;
    uniform vec4 animationVectorMap;
    uniform vec4 animationVectorBump;

    float randF(vec2 co) {
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    vec2 UVJitter( vec2 p ) {
      float x = (sin( (25.0 * p.y + 30.0 * p.x + 6.28 * 0.3477) + (randF(vec2(time, tan(time)))) ) * (animatedUV.z * 0.1));
      float y = (sin( (25.0 * p.y + 30.0 * p.x + 6.28 * 0.7812) + (randF(vec2(time, tan(time)))) ) * (animatedUV.w * 0.1));
      return vec2(p.x + x + ((animatedUV.x * 50.0) * time), p.y + y + ((animatedUV.y * 50.0) * time));
    }

    #ifdef CYCLE_BUMP
      varying vec2 vUvBumpCycle;
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
    #include <normal_pars_fragment>

    varying vec3 vViewPosition;

    ${ODYSSEY_LIGHTING_PARS_FRAGMENT}

    #ifdef WATER
      #ifdef USE_BUMPMAP
        uniform sampler2D bumpMap;
        uniform float bumpScale;
        vec2 dHdxy_fwd() {
          vec2 bumpUv = vUv;
          #ifdef CYCLE_BUMP
            bumpUv = vUvBumpCycle;
          #endif
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

      #ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D( map, vUv );
        #if defined( ANIMATED_UV )
          sampledDiffuseColor = texture2D( map, UVJitter(vUv) );
        #endif
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

      vec3 directDiffuse = vec3( 0.0 );
      vec3 directSpecular = vec3( 0.0 );
      vec3 indirectDiffuse = vec3( 0.0 );

      #ifdef USE_LIGHTMAP
        // Retail: static lighting is baked into the lightmap (ComputeStaticLighting).
        // Runtime GL/point lights must not re-light these surfaces (would double-light).
        // Area sun/ambient also excluded — lightmap already includes that contribution.
        indirectDiffuse += texture2D( lightMap, vUv2 ).xyz * lightMapIntensity * materialDiffuseColor;
      #else
        #ifndef IGNORE_LIGHTING
          odysseyAccumulateLights(
            geometryPosition, normal, geometryViewDir,
            materialDiffuseColor, materialSpecularColor, materialShininess, specularStrength,
            directDiffuse, directSpecular, indirectDiffuse
          );
        #endif
      #endif

      #ifdef USE_AOMAP
        float ambientOcclusion = ( texture2D( aoMap, vUv2 ).r - 1.0 ) * aoMapIntensity + 1.0;
        indirectDiffuse *= ambientOcclusion;
      #endif

      vec3 outgoingLight = directDiffuse + indirectDiffuse + directSpecular + totalEmissiveRadiance;

      #ifdef IGNORE_LIGHTING
        // Unlit / self-illum meshes: albedo (+ self-illum) only.
        // Lightmapped rooms keep the baked USE_LIGHTMAP result above.
        #ifndef USE_LIGHTMAP
          outgoingLight = diffuseColor.rgb + totalEmissiveRadiance;
          #ifdef SELFILLUMCOLOR
            outgoingLight *= max(vec3(0.25), selfIllumColor);
          #endif
        #endif
      #endif

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
        #elif defined( ENVMAP_TYPE_EQUIREC )
          reflectVec = normalize( reflectVec );
          vec2 sampleUV = equirectUv( reflectVec );
          vec4 envColor = texture2D( envMap, sampleUV );
        #else
          vec4 envColor = vec4( 0.0 );
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

    #ifdef CYCLE_MAP
      uniform vec4 animationVectorMap;
    #endif

    #ifdef CYCLE_BUMP
      varying vec2 vUvBumpCycle;
      uniform vec4 animationVectorBump;
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

      #ifdef CYCLE_MAP
        float mapFramesX = animationVectorMap.x;
        float mapFramesY = animationVectorMap.y;
        float mapTotalFrames = animationVectorMap.z;
        float mapFPS = animationVectorMap.w;

        float mapDeltaMax = (1.0 / mapFPS) * mapTotalFrames;
        float mapTime = mod(time, mapDeltaMax) / mapDeltaMax;
        float mapFrameNumber = floor(mod(mapTime * mapTotalFrames, mapTotalFrames));
        float mapColumn = floor(mod(mapFrameNumber, mapFramesX));
        float mapRow = floor((mapFrameNumber - mapColumn) / mapFramesX);
        float mapRowFlipped = mapRow;
        float mapColumnNorm = mapColumn / mapFramesX;
        float mapRowNorm = mapRowFlipped / mapFramesY;

        mat3 cycleTransform = mat3(
          uvTransform[0][0], uvTransform[0][1], uvTransform[0][2],
          uvTransform[1][0], uvTransform[1][1], uvTransform[1][2],
          mapColumnNorm, mapRowNorm, uvTransform[2][2]
        );
        #if defined( USE_UV ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP ) || defined( USE_ROUGHNESSMAP ) || defined( USE_METALNESSMAP )
          vUv = ( cycleTransform * vec3( uv, 1 ) ).xy;
        #endif
      #endif

      #ifdef CYCLE_BUMP
        float bumpFramesX = animationVectorBump.x;
        float bumpFramesY = animationVectorBump.y;
        float bumpTotalFrames = animationVectorBump.z;
        float bumpFPS = animationVectorBump.w;

        float bumpDeltaMax = (1.0 / bumpFPS) * bumpTotalFrames;
        float bumpTime = mod(time, bumpDeltaMax) / bumpDeltaMax;
        float bumpFrameNumber = floor(mod(bumpTime * bumpTotalFrames, bumpTotalFrames));
        float bumpColumn = floor(mod(bumpFrameNumber, bumpFramesX));
        float bumpRow = floor((bumpFrameNumber - bumpColumn) / bumpFramesX);
        float bumpRowFlipped = bumpRow;
        float bumpColumnNorm = bumpColumn / bumpFramesX;
        float bumpRowNorm = bumpRowFlipped / bumpFramesY;
        vec2 cycleUV = vec2(bumpColumnNorm, bumpRowNorm);
        vec2 frameUV = uv / vec2(bumpFramesX, bumpFramesY);
        vUvBumpCycle = cycleUV + frameUV;
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
        vec2 displacementUv = vUv;
        #ifdef CYCLE_BUMP
          displacementUv = vUvBumpCycle;
        #endif
        transformed += normalize( objectNormal ) * ( texture2D( displacementMap, displacementUv ).x * displacementScale + displacementBias );
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
      { waterAlpha: { value: 1 } },
      { animationVectorMap : { value: new THREE.Vector4(0, 0, 0, 0) } },
      { animationVectorBump : { value: new THREE.Vector4(0, 0, 0, 0) } },
      { danglyDisplacement: { value: 0 } },
      { danglyTightness: { value: 0 } },
      { danglyPeriod: { value: 0 } },
    ];
  }

}

export { MAX_ODYSSEY_LIGHTS };
