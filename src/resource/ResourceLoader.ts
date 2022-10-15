/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { Module } from "../module/Module";

import * as fs from 'fs';
import * as path from 'path';
import { ResourceTypes } from "./ResourceTypes";
import { Utility } from "../utility/Utility";
import { ERFObject } from "./ERFObject";
import { GameState } from "../GameState";
import { AsyncLoop } from "../utility/AsyncLoop";
import { RIMObject } from "./RIMObject";
import { KEYManager } from "../managers/KEYManager";
import { RIMManager } from "../managers/RIMManager";
import { ProjectManager } from "../managers/ProjectManage";

/* @file
 * The ResourceLaoder class.
 */

export class ResourceLoader {

  static Resources: any = {};
  static cache: any = {};

  static loadResource(resId: number, resRef: string, onLoad?: Function, onError?: Function){
    
    if(resRef){

      let cache = ResourceLoader.getCache(resId, resRef);
      if(!cache){
        this._searchLocal(resId, resRef, (data: Buffer) => {
          ResourceLoader.setCache(resId, resRef, data);
          if(typeof onLoad === 'function')
            onLoad(data);
        }, (e: any) => {
          if(GameState.module instanceof Module){
            this._searchKeyTable(resId, resRef, (data: Buffer) => {
              ResourceLoader.setCache(resId, resRef, data);
              if(typeof onLoad === 'function')
                onLoad(data);
            }, (e: any) => {
              this._searchModuleArchives(resId, resRef, (data: Buffer) => {
                ResourceLoader.setCache(resId, resRef, data);
                if(typeof onLoad === 'function')
                  onLoad(data);
              }, (e: any) => {
                if(typeof onError === 'function')
                  onError(e);
              });
            });
          }else{
            this._searchKeyTable(resId, resRef, (data: Buffer) => {
              ResourceLoader.setCache(resId, resRef, data);
              if(typeof onLoad === 'function')
                onLoad(data);
            }, (e: any) => {
              if(typeof onError === 'function')
                onError(e);
            });
          }
        });
      }else{
        if(typeof onLoad === 'function')
          onLoad(cache);
      }

    }else{
      console.error('ResRef not set');
      if(typeof onError === 'function')
        onError();
    }

  }

  static loadResourceAsync(resId: number, resKey: string): Promise<Buffer> {
    return new Promise((resolve: Function, reject: Function) => {
      ResourceLoader.loadResource(resId, resKey, (buffer: Buffer) => {
        resolve(buffer);
      }, () => {
        resolve(undefined);
      });
    });
  }

  static _searchLocal(resId: number, resRef = '', onLoad?: Function, onError?: Function){
    if(ProjectManager.project){
      let projectFilePath = path.join(ProjectManager.project.directory, 'files', resRef + '.' + ResourceTypes.getKeyByValue(resId));
      //Check in the project directory
      Utility.FileExists(projectFilePath, (exists: boolean) => {
        //console.log('File Exists', exists, projectFilePath);
        if(exists){
          fs.readFile(projectFilePath, (err, data) => {
            if(err){
              this._searchOverride(resId, resRef, (data: Buffer) => {
                if(typeof onLoad === 'function')
                  onLoad(data);
              }, (e: any) => {
                if(onError != null)
                  onError();
              });
            }else{
              if(onLoad != null)
                onLoad(data);
            }
          });
        }else{
          this._searchOverride(resId, resRef, (data: Buffer) => {
            if(typeof onLoad === 'function')
              onLoad(data);
          }, (e: any) => {
            if(onError != null)
              onError();
          });
        }
      });
    }else{
      this._searchOverride(resId, resRef, (data: Buffer) => {
        if(typeof onLoad === 'function')
          onLoad(data);
      }, (e: any) => {
        if(onError != null)
          onError();
      });
    }
  }

  static _searchModuleArchives(resId: number, resRef = '', onLoad?: Function, onError?: Function){
    if(GameState.module instanceof Module){
      let loop = new AsyncLoop({
        array: GameState.module.archives,
        onLoop: (archive: RIMObject|ERFObject, asyncLoop: AsyncLoop) => {

          if(archive instanceof RIMObject){
            let resKey = archive.getResourceByKey(resRef, resId);
            if(resKey){
              archive.getRawResource(resRef, resId, (data: Buffer) => {
                if(typeof onLoad === 'function')
                  onLoad(data);
              });
            }else{
              asyncLoop.next();
            }
          }else if(archive instanceof ERFObject){
            let resKey = archive.getResourceByKey(resRef, resId);
            if(resKey){
              archive.getRawResource(resRef, resId, (data: Buffer) => {
                if(typeof onLoad === 'function')
                  onLoad(data);
              });
            }else{
              asyncLoop.next();
            }
          }else{
            asyncLoop.next();
          }
        
        }
      });
      loop.iterate(() => {
        if(typeof onError === 'function')
          onError();
      });
    }else{
      if(typeof onError === 'function')
      onError();
    }

  }

  static loadResourceSync(resId: number, resRef: string){
    
    let model: any;

    model = this._searchKeyTableSync(resId, resRef);
    if(model)
      return model;
    
    return;

  }

  static loadTexture(resId: number, resRef: string){



  }

  static setResource(resId: number, resRef: string, opts = {}){

    resRef = resRef.toLowerCase();

    if(typeof ResourceLoader.Resources[resId] === 'undefined'){
      ResourceLoader.Resources[resId] = {};
    }
    ResourceLoader.Resources[resId][resRef] = opts;
  }

  static getResource(resId: number, resRef: string){

    if(typeof ResourceLoader.Resources[resId] !== 'undefined'){
      if(typeof ResourceLoader.Resources[resId][resRef] !== 'undefined'){
        return ResourceLoader.Resources[resId][resRef];
      }
    }
    return null;
  }

  static clearCache(){
    ResourceLoader.cache = {};
  }

  static setCache(resId: number, resRef: string, opts: any = {}){

    resRef = resRef.toLowerCase();

    if(typeof ResourceLoader.cache[resId] === 'undefined')
      ResourceLoader.cache[resId] = {};

    ResourceLoader.cache[resId][resRef] = opts;

  }

  static getCache(resId: number, resRef: string){

    if(typeof ResourceLoader.cache[resId] !== 'undefined'){
      if(typeof ResourceLoader.cache[resId][resRef] !== 'undefined'){
        return ResourceLoader.cache[resId][resRef];
      }
    }
    return null;
  }

  //Check the module dlg arf archive (TSL ONLY)//if(GameState.GameKey == 'TSL'){
  // static _searchDLG(resId: number, resRef: string, onLoad?: Function, onError?: Function){

  //   if(!GameState.module || GameState.GameKey != 'TSL'){
  //     if(typeof onError === 'function')
  //       onError();
  //     return;
  //   }

  //   if(GameState.module.erf_dlg instanceof ERFObject){
    
  //     let resKey = GameState.module.erf_dlg.getResourceByKey(resRef, resId);
  //     if(resKey){
  //       GameState.module.erf_dlg.getRawResource(resRef, resId, (data) => {
  //         if(typeof onLoad === 'function')
  //           onLoad(data);
  //       });
  //     }else{
  //       if(typeof onError === 'function')
  //         onError();
  //     }

  //   }else{
  //     if(typeof onError === 'function')
  //       onError();
  //   }

  // }


  //Check the module RIM archive A
  static _searchRIMa(resId: number, resRef: string, onLoad?: Function, onError?: Function){
    throw new Error('deprecated! ResourceLoader._searchRIMa');
    // if(!GameState.module){
    //   if(typeof onError === 'function')
    //     onError();
    //   return;
    // }
    
    // let resKey = GameState.module.rim.getResourceByKey(resRef, resId);
    // if(resKey){
    //   GameState.module.rim.getRawResource(resRef, resId, (data) => {
    //     if(typeof onLoad === 'function')
    //       onLoad(data);
    //   });
    // }else{
    //   if(typeof onError === 'function')
    //     onError();
    // }
  }

  //Check the module RIM archive B
  static _searchRIMb(resId: number, resRef: string, onLoad?: Function, onError?: Function){
    throw new Error('deprecated! ResourceLoader._searchRIMb');
    // if(!GameState.module){
    //   if(typeof onError === 'function')
    //     onError();
    //   return;
    // }

    // let resKey = GameState.module.rim_s.getResourceByKey(resRef, resId);
    // if(resKey){
    //   GameState.module.rim_s.getRawResource(resRef, resId, (data) => {
    //     if(typeof onLoad === 'function')
    //       onLoad(data);
    //   });
    // }else{
    //   if(typeof onError === 'function')
    //     onError();
    // }
  }

  static _searchKeyTable(resId: number, resRef: string, onLoad?: Function, onError?: Function){
    let keyLookup = KEYManager.Key.GetFileKey(resRef, resId);
    if(keyLookup){
      KEYManager.Key.GetFileData(keyLookup, (data: Buffer) => {
        if(typeof onLoad === 'function')
          onLoad(data);
      });
    }else{
      if(typeof onError === 'function')
        onError();
    }
  }

  static _searchKeyTableSync(resId: number, resRef: string){
    let keyLookup = KEYManager.Key.GetFileKey(resRef, resId);
    if(keyLookup){
      return KEYManager.Key.GetFileDataSync(keyLookup);
    }else{
      return null;
    }
  }

  static _searchModules(resId: number, resRef: string, onLoad?: Function, onError?: Function){
    let found = false;
    RIMManager.RIMs.forEach( (rim: RIMObject) => {
      if(rim instanceof RIMObject){
        let res = rim.getResourceByKey(resRef, resId);
        if(res){
          //console.log('found');
          found = true;
          rim.GetResourceData(res, (data: Buffer) => {
            if(typeof onLoad === 'function')
              onLoad(data);
          });
          return;
        }
      }
    });

    if(!found){
      if(typeof onError === 'function')
        onError();
    }

  }

  static _searchOverride(resId: number, resRef: string, onLoad?: Function, onError?: Function){
    let overrideLookup = false;
    if(overrideLookup){
      //TODO: Check override folder
    }else{
      if(typeof onError === 'function')
        onError();
    }
  }

}
