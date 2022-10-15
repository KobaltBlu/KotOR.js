import { TLKString } from "../resource/TLKString";
import * as path from "path";
import * as fs from "fs";
import { TLKObject } from "../resource/TLKObject";

export class TLKManager {

  static TLKStrings: TLKString[] = [];
  static TLKObject: TLKObject;

  static async LoadTalkTable(resource_path: string, onProgress?: Function){
    return new Promise<TLKObject>((resolve, reject) => {
      fs.readFile(resource_path, (err: any, buffer: Buffer) => {
        if(err){
          reject(undefined);
          return;
        }
        TLKManager.TLKObject = new TLKObject(undefined);
        TLKManager.TLKObject.LoadFromBuffer(buffer, (index: number = 0, count: number = 0) => {
          if(typeof onProgress === 'function') onProgress(index, count)
        }).then( () => {
          TLKManager.TLKStrings = TLKManager.TLKObject.TLKStrings;
          resolve(TLKManager.TLKObject);
        }).catch(() => {
          TLKManager.TLKStrings = TLKManager.TLKObject.TLKStrings;
          resolve(TLKManager.TLKObject);
        })
      });
    })
  }

  static GetStringById(index: number = 0){
    return TLKManager.TLKStrings[index];
  }

}