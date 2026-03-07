import { Shader } from "./Shader";
import * as THREE from "three";

/**
 * ShaderGUIBackground class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ShaderGUIBackground.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ShaderGUIBackground extends Shader {

  constructor(){
    super();
    this.name = 'background-gui';
    this.fragment = `
    varying vec2 v_uv;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform sampler2D map;

    #include <shadertoy_perlin>

    void main(){
      gl_FragColor = texture2D(map, v_uv);
      
      //perlin noise
      vec2 p = gl_FragCoord.xy/u_resolution.y;
      vec3 p3 = vec3(p, u_time*0.025);
      
      float value = simplex3d_fractal(p3*8.0+8.0);

      float min = 0.0;
      float max = 0.175;
      
      float x = smoothstep(min, max, v_uv.x);
      float y = smoothstep(min, max, v_uv.y);
      
      float x2 = smoothstep(min, max, 1.0 - v_uv.x);
      float y2 = smoothstep(min, max, 1.0 - v_uv.y);

      float grad = (x*x2*y*y2);
      float grad_inv = 1.0 - grad;

      value = value * grad;

      float alpha = grad + ( (value*value) * grad_inv);
      gl_FragColor.rgb *= alpha;
      gl_FragColor.a = alpha;
    }
    `;
    this.vertex = `
    varying vec2 v_uv;
    void main() {
      v_uv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `;
    this.uniforms = THREE.UniformsUtils.merge([
      // THREE.ShaderLib.basic.uniforms,
      {
        u_time: { value: 0.0 },
        u_resolution: { value: new THREE.Vector2(1600, 1200) },
        map: { value: null }
      }
    ])
  }

}