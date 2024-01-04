import type { IGUIControlBorderFill } from "./IGUIControlBorderFill";

/**
 * IGUIControlBorder interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IGUIControlBorder.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IGUIControlBorder {
  color: THREE.Color,
  corner: string,
  corner_material: THREE.ShaderMaterial,
  edge: string,
  edge_material: THREE.ShaderMaterial,
  fill: IGUIControlBorderFill,
  fillstyle: number,
  geometry: THREE.BufferGeometry,
  mesh: THREE.Mesh,
  dimension: number,
  inneroffset: number,
  inneroffsety: number,
  pulsing: number
}