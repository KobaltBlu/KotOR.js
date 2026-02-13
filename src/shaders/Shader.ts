import * as THREE from "three";

/**
 * Uniforms are either a single merged object or an array of objects to merge (for UniformsUtils.merge).
 */
export type ShaderUniforms = { [uniform: string]: THREE.IUniform } | Array<{ [uniform: string]: THREE.IUniform }>;

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
  uniforms: ShaderUniforms = [];
  name: string;

  getVertex(): string {
    return this.vertex;
  }

  getFragment(): string {
    return this.fragment;
  }

  getUniforms(): ShaderUniforms {
    return this.uniforms;
  }
}