import { Shader } from "@/shaders/Shader";
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

    #ifdef GUI_CHROME
      uniform sampler2D edgeMap;
      uniform sampler2D cornerMap;
      uniform sampler2D fillMap;
      uniform sampler2D highlightEdgeMap;
      uniform sampler2D highlightCornerMap;
      uniform sampler2D highlightFillMap;
      uniform float hasEdgeMap;
      uniform float hasCornerMap;
      uniform float hasFillMap;
      uniform float hasHighlightEdgeMap;
      uniform float hasHighlightCornerMap;
      uniform float hasHighlightFillMap;
      uniform float hovered;
      uniform float hoverMode;
      uniform vec3 highlightDiffuse;
      uniform vec3 fillDiffuse;
      uniform float edgeOpacity;
      uniform float fillOpacity;
      uniform float enableFrame;
      uniform float enableFill;
      varying float vRegion;

      vec4 sampleChromeMap(float region, float useHighlight){
        vec4 tex = vec4(1.0);
        float hasMap = 0.0;
        if(region < 0.5){
          if(useHighlight > 0.5){
            hasMap = hasHighlightEdgeMap;
            if(hasMap > 0.5) tex = texture2D(highlightEdgeMap, vUv);
          }else{
            hasMap = hasEdgeMap;
            if(hasMap > 0.5) tex = texture2D(edgeMap, vUv);
          }
        }else if(region < 1.5){
          if(useHighlight > 0.5){
            hasMap = hasHighlightCornerMap;
            if(hasMap > 0.5) tex = texture2D(highlightCornerMap, vUv);
          }else{
            hasMap = hasCornerMap;
            if(hasMap > 0.5) tex = texture2D(cornerMap, vUv);
          }
        }else{
          if(useHighlight > 0.5){
            hasMap = hasHighlightFillMap;
            if(hasMap > 0.5) tex = texture2D(highlightFillMap, vUv);
          }else{
            hasMap = hasFillMap;
            if(hasMap > 0.5) tex = texture2D(fillMap, vUv);
          }
        }
        if(hasMap < 0.5){
          return vec4(0.0);
        }
        return tex;
      }

      vec4 tintChrome(vec4 tex, float region, float useHighlight){
        vec3 tint = fillDiffuse;
        if(region < 1.5){
          tint = useHighlight > 0.5 ? highlightDiffuse : diffuse;
        }
        float a = region < 1.5 ? edgeOpacity : fillOpacity;
        return vec4(tex.rgb * tint, tex.a * a);
      }

      vec4 alphaOver(vec4 under, vec4 over){
        float outA = over.a + under.a * (1.0 - over.a);
        vec3 outRgb = (over.rgb * over.a + under.rgb * under.a * (1.0 - over.a)) / max(outA, 1e-5);
        return vec4(outRgb, outA);
      }
    #endif

    void main() {
      #include <clipping_planes_fragment>

      #ifdef GUI_CHROME
        float region = vRegion;
        if(region < 1.5){
          if(enableFrame < 0.5) discard;
        }else{
          if(enableFill < 0.5) discard;
        }

        vec4 borderSample = tintChrome(sampleChromeMap(region, 0.0), region, 0.0);
        vec4 highlightSample = tintChrome(sampleChromeMap(region, 1.0), region, 1.0);

        vec4 chromeColor;
        if(hovered < 0.5){
          chromeColor = borderSample;
        }else if(hoverMode < 0.5){
          chromeColor = highlightSample.a > 0.0 ? highlightSample : borderSample;
        }else{
          chromeColor = alphaOver(borderSample, highlightSample);
        }

        if(chromeColor.a <= 0.001) discard;

        vec4 diffuseColor = vec4(chromeColor.rgb, chromeColor.a * opacity);
        #include <logdepthbuf_fragment>
        #include <color_fragment>
        #include <alphamap_fragment>
        #include <alphatest_fragment>
        #include <specularmap_fragment>
        ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
        reflectedLight.indirectDiffuse += vec3( 1.0 );
        #include <aomap_fragment>
        reflectedLight.indirectDiffuse *= diffuseColor.rgb;
        vec3 outgoingLight = reflectedLight.indirectDiffuse;
        gl_FragColor = vec4( outgoingLight, diffuseColor.a );
        #include <tonemapping_fragment>
        #include <encodings_fragment>
        #include <fog_fragment>
        #include <premultiplied_alpha_fragment>
        #include <dithering_fragment>
      #else
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
      #endif
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

    #ifdef GUI_CHROME
      attribute float region;
      varying float vRegion;
    #endif
    
    void main() {
      #include <uv_vertex>
      #include <uv2_vertex>
      #include <color_vertex>
      #include <morphcolor_vertex>
      #ifdef GUI_CHROME
        vRegion = region;
      #endif
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
        edgeMap: { value: null },
        cornerMap: { value: null },
        fillMap: { value: null },
        highlightEdgeMap: { value: null },
        highlightCornerMap: { value: null },
        highlightFillMap: { value: null },
        hasEdgeMap: { value: 0 },
        hasCornerMap: { value: 0 },
        hasFillMap: { value: 0 },
        hasHighlightEdgeMap: { value: 0 },
        hasHighlightCornerMap: { value: 0 },
        hasHighlightFillMap: { value: 0 },
        hovered: { value: 0 },
        hoverMode: { value: 0 },
        highlightDiffuse: { value: new THREE.Color(1, 1, 0) },
        fillDiffuse: { value: new THREE.Color(1, 1, 1) },
        edgeOpacity: { value: 1 },
        fillOpacity: { value: 1 },
        enableFrame: { value: 1 },
        enableFill: { value: 1 },
      }
    ])
  }

}
