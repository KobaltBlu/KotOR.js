/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ResourceTypes } from "../resource/ResourceTypes";
import { ERFObject, ERFResource } from "../resource/ERFObject";
import { AsyncLoop } from "../utility/AsyncLoop";
import { RIMObject, RIMResource } from "../resource/RIMObject";
import { CacheScope } from "../enums/resource/CacheScope";
import { ResourceCacheScopes } from "../interface/resource/ResourceCacheScopes";
import { KEYManager } from "../managers/KEYManager";
import { RIMManager } from "../managers/RIMManager";

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
  static ModuleArchives: (RIMObject | ERFObject)[] = [];

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
    const keys = KEYManager.Key.keys.filter( k => cacheableTemplates.includes(k.resType) );
    for(let i = 0; i < keys.length; i++){
      const key = keys[i];
      scope.get(key.resType).set(
        key.resRef.toLocaleLowerCase(), 
        await KEYManager.Key.getFileBuffer(key)
      );
    }
    let end = Date.now();
    console.log(`InitGlobalCache: End - ${((end-start)/1000)}s`);

  }

  static async InitModuleCache(archives: (RIMObject|ERFObject)[]){
    ResourceLoader.ClearCache(CacheScope.MODULE);
    this.ModuleArchives = archives;

    let start = Date.now();
    console.log(`InitModuleCache: Start`);

    const scope = ResourceLoader.CacheScopes[CacheScope.MODULE];
    for(let i = 0; i < archives.length; i++){
      const archive = archives[i];
      if(archive instanceof RIMObject){
        const resources = archive.resources;
        for(let i = 0; i < resources.length; i++){
          const resource = resources[i];
          const buffer = await archive.getResourceByKeyAsync(resource);
          // console.log('InitModuleCache: RIM', resource.resRef.toLocaleLowerCase(), buffer);
          scope.get(resource.resType).set(
            resource.resRef.toLocaleLowerCase(), 
            buffer
          );
        }
      }else if(archive instanceof ERFObject){
        const resources = archive.keyList;
        for(let i = 0; i < resources.length; i++){
          const resource = resources[i];
          const buffer = await archive.getResourceByKeyAsync(resource);
          // console.log('InitModuleCache: ERF', resource.resRef.toLocaleLowerCase(), buffer);
          scope.get(resource.resType).set(
            resource.resRef.toLocaleLowerCase(), 
            buffer
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

  static async loadResource(resId: number, resRef: string): Promise<Buffer> {

    if(!resId){
      throw new Error(`Invalid resId ${resId}`);
    }

    if(!resRef){
      throw new Error(`Invalid resRef ${resRef}`);
    }

    //Resource Cache
    let data = ResourceLoader.getCache(resId, resRef);
    if(data){
      return data;
    }

    data = await this.searchLocal(resId, resRef);
    if(data){
      ResourceLoader.setCache(resId, resRef, data);
      return data;
    }

    data = await this.searchKeyTable(resId, resRef);
    if(data){
      ResourceLoader.setCache(resId, resRef, data);
      return data;
    }

    data = await this.searchModuleArchives(resId, resRef);
    if(data){
      ResourceLoader.setCache(resId, resRef, data);
      return data;
    }

    //Resource Not Found
    if(!data){
      throw new Error(`Resource not found: ResRef: ${resRef} ResId: ${resId}`);
    }

  }

  static loadCachedResource(resId: number, resRef: string): Buffer {
    return ResourceLoader.getCache(resId, resRef.toLocaleLowerCase());
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

  static async searchLocal(resId: number, resRef = ''): Promise<Buffer> {
    let data = await this.searchOverride(resId, resRef);
    if(data){
      return data;
    }
  }

  static async searchOverride(resId: number, resRef = ''): Promise<Buffer> {
    //TODO
    return;
  }

  static async searchModuleArchives(resId: number, resRef = ''): Promise<Buffer> {
    let data: Buffer;
    const archiveCount = this.ModuleArchives.length;

    for(let i = 0; i < archiveCount; i++){
      const archive = this.ModuleArchives;
      if(archive instanceof RIMObject){
        let key = archive.getResourceByKey(resRef, resId);
        if(!key){ continue; }

        let data = await archive.getResourceByKeyAsync(key);
        if(data){ break; }
      }else if(archive instanceof ERFObject){
        data = await archive.getRawResource(resRef, resId);
        if(data){ break; }
      }
    }

    return data;
  }

  static async searchKeyTable(resId: number, resRef: string): Promise<Buffer> {
    let keyLookup = KEYManager.Key.getFileKey(resRef, resId);
    if(keyLookup){
      return await KEYManager.Key.getFileBuffer(keyLookup);
    }
  }

  static async searchModules(resId: number, resRef: string): Promise<Buffer> {
    const rims = Array.from(RIMManager.RIMs.values());
    const rimCount = rims.length;

    let data: Buffer;
    let rim: RIMObject;
    let res: RIMResource;
    for(let i = 0; i < rimCount; i++){
      rim = rims[i];
      if(!rim){ continue; }

      res = rim.getResourceByKey(resRef, resId);
      if(!res){ continue; }

      data = await rim.getResourceByKeyAsync(res);
    }

    return data;
  }

}
