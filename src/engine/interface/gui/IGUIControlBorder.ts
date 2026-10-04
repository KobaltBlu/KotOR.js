import type { IGUIControlBorderFill } from "@engine/interface/gui/IGUIControlBorderFill";

/**
 * IGUIControlBorder interface.
 * 
 * Data-only border/highlight descriptor. Drawables live on the control chrome mesh.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IGUIControlBorder.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IGUIControlBorder {
  color: THREE.Color;
  corner: string;
  edge: string;
  fill: IGUIControlBorderFill;
  fillstyle: number;
  dimension: number;
  inneroffset: number;
  inneroffsety: number;
  pulsing: number;
}
