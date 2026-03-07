import * as THREE from "three";
import {Shader} from "./Shader";

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

      uvGrid = vec2(vUv);
      uvGrid.x = (vUv.x / resX);
      uvGrid.y = (vUv.y / resY);

      float alpha = texture2D( alphaMap, vUv ).a;

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