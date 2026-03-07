/**
 * Shader class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file Shader.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class Shader {
  fragment: string;
  vertex: string;
  uniforms: any[] = [];
  name: string;

  getVertex(){
    return this.vertex;
  }

  getFragment(){
    return this.fragment;
  }

  getUniforms(): any[] {
    return this.uniforms;
  }
}