import { AsyncLoop } from "../utility/AsyncLoop";
import { BIFObject } from "../resource/BIFObject";
import { BIF, KEYObject } from "../resource/KEYObject";
import * as fs from 'fs';
import * as path from 'path';
import { ApplicationProfile } from "../utility/ApplicationProfile";
import { BIFManager } from "./BIFManager";

export class KEYManager {

  static Key: KEYObject;

  static Load( filepath: string, onComplete?: Function ){

    KEYManager.Key = new KEYObject(filepath, () => {
      KEYManager.LoadBIFs(onComplete);
    });

  }

  static LoadBIFs(onComplete?: Function){
    new AsyncLoop({
      array: KEYManager.Key.bifs,
      onLoop: async (bifRes: BIF, loop: AsyncLoop, index: number, count: number) => {
        const bifPath: string = bifRes.filename;
        new BIFObject(bifPath, (bif: BIFObject) => {
          BIFManager.bifIndexes.set( path.parse(bifRes.filename).name, index );
          BIFManager.bifs.set(index, bif);
          loop.next();
        });
      }
    }).iterate(onComplete);
  }

}