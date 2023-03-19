/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { Module } from "../module";
import { ResourceTypes } from "./ResourceTypes";
import { Utility } from "../utility/Utility";
import { ERFObject, ERFResource } from "./ERFObject";
import { GameState } from "../GameState";
import { AsyncLoop } from "../utility/AsyncLoop";
import { RIMObject } from "./RIMObject";
import { KEYManager } from "../managers/KEYManager";
import { RIMManager } from "../managers/RIMManager";
import { CacheScope } from "../enums/resource/CacheScope";
import { ResourceCacheScopes } from "../interface/resource/ResourceCacheScopes";
import { BIFManager } from "../managers/BIFManager";

/* @file
 * The ResourceLaoder class.
 */

export class ResourceLoader {

  static Resources: any = {};
  static cache: any = {};
  static CacheScopes: ResourceCacheScopes = {
    override: new Map(),
    global:   new Map(),
    module:   new Map(),
  };

  static InitCache(){
    const resourceTypes = Object.values(ResourceTypes).filter( t => typeof t === 'number' && t < 0xFFFF ) as number[];
    for(let i = 0; i < resourceTypes.length; i++){
      const restype = resourceTypes[i];
      ResourceLoader.CacheScopes[CacheScope.OVERRIDE].set(restype, new Map());
      ResourceLoader.CacheScopes[CacheScope.GLOBAL].set(restype, new Map());
      ResourceLoader.CacheScopes[CacheScope.MODULE].set(restype, new Map());
    }
  }

  static async InitOverrideCache(){
    ResourceLoader.ClearCache(CacheScope.OVERRIDE);

  }

  static async InitGlobalCache(){
    ResourceLoader.ClearCache(CacheScope.GLOBAL);

    let start = Date.now();
    console.log(`InitGlobalCache: Start`);

    const cacheableTemplates = [
      ResourceTypes['ncs'], ResourceTypes['utc'], ResourceTypes['uti'], 
      ResourceTypes['utd'], ResourceTypes['utp'], ResourceTypes['uts'],
      ResourceTypes['ute'], ResourceTypes['utt'], ResourceTypes['utw'],
      ResourceTypes['utm'], ResourceTypes['dlg'], ResourceTypes['ssf'],
    ];

    console.log('Caching Types:', cacheableTemplates);

    const scope = ResourceLoader.CacheScopes[CacheScope.GLOBAL];
    const keys = KEYManager.Key.keys.filter( k => cacheableTemplates.includes(k.ResType) );
    for(let i = 0; i < keys.length; i++){
      const key = keys[i];
      scope.get(key.ResType).set(
        key.ResRef.toLocaleLowerCase(), 
        await KEYManager.Key.GetFileDataAsync(key)
      );
    }
    let end = Date.now();
    console.log(`InitGlobalCache: End - ${((end-start)/1000)}s`);

  }

  static async InitModuleCache(archives: (RIMObject|ERFObject)[]){
    ResourceLoader.ClearCache(CacheScope.MODULE);

    let start = Date.now();
    console.log(`InitModuleCache: Start`);

    const scope = ResourceLoader.CacheScopes[CacheScope.MODULE];
    for(let i = 0; i < archives.length; i++){
      const archive = archives[i];
      if(archive instanceof RIMObject){
        const resources = archive.Resources;
        for(let i = 0; i < resources.length; i++){
          const resource = resources[i];
          scope.get(resource.ResType).set(
            resource.ResRef.toLocaleLowerCase(), 
            await archive.getResourceByKeyAsync(resource)
          );
        }
      }else if(archive instanceof ERFObject){
        const resources = archive.KeyList;
        for(let i = 0; i < resources.length; i++){
          const resource = resources[i];
          scope.get(resource.ResType).set(
            resource.ResRef.toLocaleLowerCase(), 
            await archive.getResourceByKeyAsync(resource)
          );
        }
      }
    }

    let end = Date.now();
    console.log(`InitModuleCache: End - ${((end-start)/1000)}s`);

  }

  static ClearCache(scope: CacheScope){
    if(!!ResourceLoader.CacheScopes[scope])
      ResourceLoader.CacheScopes[scope].forEach( cacheType => {
        cacheType.clear();
      });
  }

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

  static loadResourceAsync(resId: number, resRef: string): Promise<Buffer> {
    return new Promise((resolve: Function, reject: Function) => {
      ResourceLoader.loadResource(resId, resRef, (buffer: Buffer) => {
        resolve(buffer);
      }, () => {
        resolve(undefined);
      });
    });
  }

  static loadCachedResource(resId: number, resRef: string): Buffer {
    return ResourceLoader.getCache(resId, resRef.toLocaleLowerCase());
  }

  static _searchLocal(resId: number, resRef = '', onLoad?: Function, onError?: Function){
      this._searchOverride(resId, resRef, (data: Buffer) => {
        if(typeof onLoad === 'function')
          onLoad(data);
      }, (e: any) => {
        if(typeof onError === 'function')
          onError();
      });
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

  static getCache(resId: number, resRef: string): Buffer {

    if(ResourceLoader.CacheScopes[CacheScope.OVERRIDE].get(resId).has(resRef)){
      return ResourceLoader.CacheScopes[CacheScope.OVERRIDE].get(resId).get(resRef);
    }

    if(ResourceLoader.CacheScopes[CacheScope.MODULE].get(resId).has(resRef)){
      return ResourceLoader.CacheScopes[CacheScope.MODULE].get(resId).get(resRef);
    }

    if(ResourceLoader.CacheScopes[CacheScope.GLOBAL].get(resId).has(resRef)){
      return ResourceLoader.CacheScopes[CacheScope.GLOBAL].get(resId).get(resRef);
    }

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
