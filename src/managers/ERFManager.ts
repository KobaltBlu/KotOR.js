import { AsyncLoop } from "@/utility/AsyncLoop";
import * as path from 'path';
import { ERFObject } from "@/resource/ERFObject";

/**
 * ERFManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ERFManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ERFManager {

  static ERFs: Map<string, ERFObject> = new Map();

  static addERF(name: string, erf: ERFObject){
    ERFManager.ERFs.set(name, erf);
  }

}
