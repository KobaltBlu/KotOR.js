import { RIMObject } from "../resource/RIMObject";

export class RIMManager {

  static RIMs: Map<string, RIMObject> = new Map();

  static Load( rimObjs: any[] ){
    return new Promise<RIMObject>( async (resolve, reject) => {
      for(let i = 0, len = rimObjs.length; i < len; i++){
        try{
          await RIMManager.LoadRIMObject(rimObjs[i]);
        }catch(e){

        }
      }
    });
  }

  static LoadRIMObject( rimObj: any ){
    //{ext: args[1].toLowerCase(), name: args[0], filename: filename}
    return new Promise<RIMObject>( async (resolve, reject) => {
      new RIMObject(rimObj.name, (rim: RIMObject) => {
        RIMManager.RIMs.set(rimObj.filename, rim);
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