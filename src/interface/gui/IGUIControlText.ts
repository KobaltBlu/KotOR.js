import { OdysseyTexture } from "../../three/odyssey/OdysseyTexture";

/**
 * IGUIControlText interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IGUIControlText.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IGUIControlText {
  color: THREE.Color,
  font: string, //fnt_d16x16b
  strref: number,
  text: string,
  alignment: number, //9 //18 //17
  pulsing: number

  geometry: THREE.BufferGeometry,
  material: THREE.ShaderMaterial,
  mesh: THREE.Mesh,
  texture: OdysseyTexture,
}