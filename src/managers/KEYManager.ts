import { AsyncLoop } from "../utility/AsyncLoop";
import { BIFObject } from "../resource/BIFObject";
import { KEYObject } from "../resource/KEYObject";
import * as path from 'path';
import { BIFManager } from "./BIFManager";
import { IBIFEntry } from "../interface/resource/IBIFEntry";

/**
 * KEYManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file KEYManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class KEYManager {

  static Key: KEYObject = new KEYObject();

  static async Load( filepath: string){
    KEYManager.Key = new KEYObject();
    await KEYManager.Key.loadFile(filepath);
    await KEYManager.LoadBIFs();
  }

  static async LoadBIFs(){
    for(let i = 0; i < KEYManager.Key.bifs.length; i++){
      const bifRes: IBIFEntry = KEYManager.Key.bifs[i];
      const bifPath: string = bifRes.filename;
      const bif = new BIFObject(bifPath);
      await bif.load()
      BIFManager.bifIndexes.set( path.parse(bifRes.filename).name, i);
      BIFManager.bifs.set(i, bif);
    }
  }

}