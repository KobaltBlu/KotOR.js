import type { IOdysseyControllerFrameGeneric } from "./IOdysseyControllerFrameGeneric";

/**
 * IOdysseyControllerGeneric interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IOdysseyControllerGeneric.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IOdysseyControllerGeneric {
  type: number;
  nodeType: number;
  frameCount: number;
  timeKeyIndex: number;
  dataValueIndex: number;
  columnCount: number;
  data: IOdysseyControllerFrameGeneric[],
}