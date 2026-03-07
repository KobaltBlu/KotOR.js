import { Shader } from "./Shader";
import * as THREE from "three";

/**
 * ShaderGUIVoid class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ShaderGUIVoid.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ShaderGUIVoid extends Shader {

  constructor(){
    super();
    this.name = 'void-gui';
    this.fragment = `
    varying vec2 v_uv;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec3 u_color;
    uniform float u_colorIntensity;
    uniform float u_intensity;

    #include <shadertoy_perlin>

    void main(){
      //color radial gradient
      vec2 uv = gl_FragCoord.xy / (u_resolution.y/2.0);
      // uv = uv*2.0-1.0 - vec2(0.7,0.0);
      
      uv = 2.0 * gl_FragCoord.xy / u_resolution.xy - 1.0;
      float Length = length(uv);
      Length = 1.0-smoothstep(Length,0.0,0.5);
      gl_FragColor = vec4(u_color*Length,1.0) * u_colorIntensity;
      
      //perlin noise
      vec2 p = gl_FragCoord.xy/u_resolution.x;
      vec3 p3 = vec3(p, u_time*0.025);
      
      float value = simplex3d_fractal(p3*8.0+8.0);
      
      value = (value + 0.5) * 0.5;
      
      gl_FragColor = vec4( ( (gl_FragColor.rgb + value) * u_intensity ), 1.0);
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
        u_resolution: { value: new THREE.Vector2() },
        u_color: { value: new THREE.Color(0xFFFFFF) },
        u_colorIntensity: {value: 0.25 },
        u_intensity: {value: 0.15 },
      }
    ])
  }

}