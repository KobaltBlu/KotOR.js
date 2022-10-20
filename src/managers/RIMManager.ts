import { RIMObject } from "../resource/RIMObject";
import { GameFileSystem } from "../utility/GameFileSystem";
import * as path from "path";

export class RIMManager {

  static RIMs: Map<string, RIMObject> = new Map();

  static Load( ){
    
    return new Promise<void>( async (resolve, reject) => {

      try{
        const filenames = await GameFileSystem.readdir('rims');

        let rims: any[] = filenames.map(function(file: string) {
          let filename = file.split(path.sep).pop();
          let args = filename.split('.');
          return {
            ext: args[1].toLowerCase(), 
            name: args[0], 
            filename: filename
          } as any;
        }).filter(function(file_obj: any){
          return file_obj.ext == 'rim';
        });

        for(let i = 0, len = rims.length; i < len; i++){
          try{
            await RIMManager.LoadRIMObject(rims[i]);
          }catch(e){ 
            console.error(e);
          }
        }
        resolve();
      }catch(err){
        console.warn('GameInitializer.LoadRIMs', err);
        resolve();
      }
      
    });

  }

  static LoadRIMObject( rimObj: any ){
    //{ext: args[1].toLowerCase(), name: args[0], filename: filename}
    return new Promise<RIMObject>( async (resolve, reject) => {
      new RIMObject(rimObj.filename, (rim: RIMObject) => {
        RIMManager.RIMs.set(rimObj.name, rim);
        resolve(rim);
      }, (err: any) => {
        reject(err);
      })
    });
  }

  static addRIM( name: string, rim: RIMObject ){
    RIMManager.RIMs
  }

}