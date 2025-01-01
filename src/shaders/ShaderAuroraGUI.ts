import { Shader } from "./Shader";
import * as THREE from "three";

/**
 * ShaderAuroraGUI class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ShaderAuroraGUI.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ShaderAuroraGUI extends Shader {

  constructor(){
    super();
    this.name = 'odyssey-gui';
    this.fragment = `
    uniform vec3 diffuse;
    uniform float opacity;
    #ifndef FLAT_SHADED
      varying vec3 vNormal;
    #endif
    #include <common>
    #include <dithering_pars_fragment>
    #include <color_pars_fragment>
    #include <uv_pars_fragment>
    #include <uv2_pars_fragment>
    #include <map_pars_fragment>
    #include <alphamap_pars_fragment>
    #include <alphatest_pars_fragment>
    #include <aomap_pars_fragment>
    #include <lightmap_pars_fragment>
    #include <envmap_common_pars_fragment>
    #include <envmap_pars_fragment>
    #include <fog_pars_fragment>
    #include <specularmap_pars_fragment>
    #include <logdepthbuf_pars_fragment>
    #include <clipping_planes_pars_fragment>
    void main() {
      #include <clipping_planes_fragment>
      vec4 diffuseColor = vec4( diffuse, opacity );
      #include <logdepthbuf_fragment>
      #include <map_fragment>
      #include <color_fragment>
      #include <alphamap_fragment>
      #include <alphatest_fragment>
      #include <specularmap_fragment>
      ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
      #ifdef USE_LIGHTMAP
        vec4 lightMapTexel = texture2D( lightMap, vUv2 );
        reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
      #else
        reflectedLight.indirectDiffuse += vec3( 1.0 );
      #endif
      #include <aomap_fragment>
      reflectedLight.indirectDiffuse *= diffuseColor.rgb;
      vec3 outgoingLight = reflectedLight.indirectDiffuse;
      #include <envmap_fragment>
      #include <output_fragment>
      #include <tonemapping_fragment>
      #include <encodings_fragment>
      #include <fog_fragment>
      #include <premultiplied_alpha_fragment>
      #include <dithering_fragment>
    }
    `;
    this.vertex = `
    #include <common>
    #include <uv_pars_vertex>
    #include <uv2_pars_vertex>
    #include <envmap_pars_vertex>
    #include <color_pars_vertex>
    #include <fog_pars_vertex>
    #include <morphtarget_pars_vertex>
    #include <skinning_pars_vertex>
    #include <logdepthbuf_pars_vertex>
    #include <clipping_planes_pars_vertex>
    uniform float rotation;
    uniform vec2 center;
    
    void main() {
      #include <uv_vertex>
      #include <uv2_vertex>
      #include <color_vertex>
      #include <morphcolor_vertex>
      #if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
        #include <beginnormal_vertex>
        #include <morphnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <defaultnormal_vertex>
      #endif
      #include <begin_vertex>
      #include <morphtarget_vertex>
      #include <skinning_vertex>
      #include <project_vertex>
      #include <logdepthbuf_vertex>
      #include <clipping_planes_vertex>
      #include <worldpos_vertex>
      #include <envmap_vertex>
      #include <fog_vertex>

      #if defined ( BILLBOARD )
        mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );

        vec2 scale;
        scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
        scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
      
        #ifndef USE_SIZEATTENUATION
      
          bool isPerspective = isPerspectiveMatrix( projectionMatrix );
      
          if ( isPerspective ) scale *= - mvPosition.z;
      
        #endif
      
        vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
      
        vec2 rotatedPosition;
        rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
        rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
      
        mvPosition.xy += rotatedPosition;
      
        gl_Position = projectionMatrix * mvPosition;
      #endif
    }
    `;
    this.uniforms = THREE.UniformsUtils.merge([
      THREE.ShaderLib.basic.uniforms,
      {
        alphaTest: { value: 1 },
        map: { value: null },
        bounds: { value: new THREE.Vector4(0, 0, 0, 0) },
        scissorBounds: { value: new THREE.Vector4(0, 0, 0, 0) },
      }
    ])
  }

}