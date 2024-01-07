import { WalkmeshEdge } from "./WalkmeshEdge";

/**
 * WalkmeshPerimeter class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file WalkmeshPerimeter.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class WalkmeshPerimeter {
  closed: boolean = false;
  start: number = -1;
  next: number = -1;
  edges: WalkmeshEdge[] = [];

  constructor(){

  }
}