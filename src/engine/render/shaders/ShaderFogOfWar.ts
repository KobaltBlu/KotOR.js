import * as THREE from "three";
import {Shader} from "@engine/render/shaders/Shader";
import { ODYSSEY_UV_CHANNEL_DEFINES } from "@engine/render/shaders/chunks/OdysseyUvChannels";

/**
 * ShaderFogOfWar class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ShaderFogOfWar.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ShaderFogOfWar extends Shader {
  constructor(){
    super();

    this.name = 'odyssey-fow';

    this.fragment = `
    uniform vec2 mapRes;
    uniform vec3 diffuse;
    uniform float opacity;
    vec2 uvGrid;

    #include <common>
    #include <color_pars_fragment>
    #include <uv_pars_fragment>
    #include <map_pars_fragment>
    #include <alphamap_pars_fragment>

    void main() {
      vec4 diffuseColor = vec4( diffuse, opacity );
      float resX = (1.0/mapRes.x) * 2.0;
      float resY = (1.0/mapRes.y) * 2.0;

      #ifdef USE_MAP
        vec2 mapUv = vMapUv;
      #elif defined( USE_UV )
        vec2 mapUv = vUv;
      #else
        vec2 mapUv = vec2( 0.0 );
      #endif

      uvGrid = mapUv;
      uvGrid.x = (mapUv.x / resX);
      uvGrid.y = (mapUv.y / resY);

      #ifdef USE_ALPHAMAP
        float alpha = texture2D( alphaMap, vAlphaMapUv ).r;
      #elif defined( USE_UV )
        float alpha = texture2D( alphaMap, vUv ).r;
      #else
        float alpha = 1.0;
      #endif

      #ifdef USE_MAP
        vec4 color1 = texture2D( map, uvGrid );
        vec4 color2 = texture2D( map, uvGrid + 0.5 );
        diffuseColor *= mix(color1, color2, 0.5);
        diffuseColor.a = 1.0;
      #endif

      diffuseColor.a = alpha;

      gl_FragColor = diffuseColor;
    }
`;
    this.vertex = `
    uniform vec2 mapRes;
    #include <common>
    #include <uv_pars_vertex>
    #include <color_pars_vertex>

    void main() {
      ${ODYSSEY_UV_CHANNEL_DEFINES}
      #include <uv_vertex>
      #include <color_vertex>

      #include <begin_vertex>
      #include <project_vertex>
    }
`;

    this.uniforms = THREE.UniformsUtils.merge([
      THREE.ShaderLib.basic.uniforms,
      {
        map: { value: null },
        alphaMap: { value: null },
        mapRes: { value: new THREE.Vector2(0, 0) },
      }
    ]);

  }
}