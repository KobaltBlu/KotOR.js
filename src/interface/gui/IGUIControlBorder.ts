import type {
  BufferGeometry,
  Color,
  Mesh,
} from "three";

import type { IGUIControlBorderFill } from "@/interface/gui/IGUIControlBorderFill";
import type { IGUIShaderMaterial } from "@/interface/gui/IGUIShaderMaterial";

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
  color: Color,
  corner: string,
  corner_material: IGUIShaderMaterial,
  edge: string,
  edge_material: IGUIShaderMaterial,
  fill: IGUIControlBorderFill,
  fillstyle: number,
  geometry: BufferGeometry,
  mesh: Mesh,
  dimension: number,
  inneroffset: number,
  inneroffsety: number,
  pulsing: number
}
