import type { OdysseyModelClass } from "../../enums/odyssey/OdysseyModelClass";
import type { IOdysseyArrayDefinition } from "./IOdysseyArrayDefinition";

/**
 * IOdysseyModelHeader interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IOdysseyModelHeader.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IOdysseyModelHeader {
  classification: OdysseyModelClass;
  subClassification: number;
  smoothing: boolean;
  fogged: boolean
  childModelCount: number;

  animationArrayDefinition: IOdysseyArrayDefinition;

  parentModelPointer: number;

  boundingMinX: number;
  boundingMinY: number;
  boundingMinZ: number;
  boundingMaxX: number;
  boundingMaxY: number;
  boundingMaxZ: number;
  radius: number;
  scale: number;
  
  superModelName: string;
}