import * as path from "path";

import { CacheScope } from "@/enums/resource/CacheScope";
import { IResourceCacheScopes } from "@/interface/resource/IResourceCacheScopes";
import { KEYManager } from "@/managers/KEYManager";
import { RIMManager } from "@/managers/RIMManager";
import { ERFObject } from "@/resource/ERFObject";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { RIMObject } from "@/resource/RIMObject";
import { GameFileSystem } from "@/utility/GameFileSystem";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Loader);

/**
 * ResourceLoader class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ResourceLoader.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
/** Per-resource-type, per-resref options (e.g. in-memory overrides). */
export type ResourceLoaderResources = Record<number, Record<string, unknown>>;
/** Fallback buffer cache when scope is null (resId -> resRef -> buffer). */
export type ResourceLoaderCache = Record<number, Record<string, Uint8Array>>;

/* eslint-disable @typescript-eslint/no-extraneous-class -- static-only loader API */
export class ResourceLoader {
  static Resources: ResourceLoaderResources = {};
  static cache: ResourceLoaderCache = {};
  static CacheScopes: IResourceCacheScopes = {
    override: new Map(),
    global:   new Map(),
    module:   new Map(),
    project:  new Map(),
  };
  static ModuleArchives: (RIMObject | ERFObject)[] = [];

  static InitCache(){
    log.trace("InitCache");
    const resourceTypes = Object.values(ResourceTypes).filter( t => typeof t === 'number' && t < 0xFFFF ) as number[];
    for(let i = 0; i < resourceTypes.length; i++){
      const restype = resourceTypes[i];
      ResourceLoader.CacheScopes[CacheScope.OVERRIDE].set(restype, new Map());
      ResourceLoader.CacheScopes[CacheScope.GLOBAL].set(restype, new Map());
      ResourceLoader.CacheScopes[CacheScope.MODULE].set(restype, new Map());
      ResourceLoader.CacheScopes[CacheScope.PROJECT].set(restype, new Map());
    }
    log.debug("InitCache done", resourceTypes.length, "types");
  }

  static async InitOverrideCache(){
    log.trace("InitOverrideCache");
    ResourceLoader.ClearCache(CacheScope.OVERRIDE);
    log.debug("InitOverrideCache done");
  }

  static async InitGlobalCache(){
    log.trace("InitGlobalCache");
    ResourceLoader.ClearCache(CacheScope.GLOBAL);
    const cacheableTemplates = [
      ResourceTypes['ncs'], ResourceTypes['utc'], ResourceTypes['uti'],
      ResourceTypes['utd'], ResourceTypes['utp'], ResourceTypes['uts'],
      ResourceTypes['ute'], ResourceTypes['utt'], ResourceTypes['utw'],
      ResourceTypes['utm'], ResourceTypes['dlg'], ResourceTypes['ssf'],
    ];

    log.info('Caching Types:', cacheableTemplates);

    const scope = ResourceLoader.CacheScopes[CacheScope.GLOBAL];
    const keys = KEYManager.Key.keys.filter( k => cacheableTemplates.includes(k.resType) );
    await Promise.all(keys.map(async (key) => {
      const buffer = await KEYManager.Key.getFileBuffer(key);
      scope.get(key.resType).set(
        key.resRef.toLocaleLowerCase(),
        buffer
      );
    }));
    log.debug("InitGlobalCache done", keys.length, "keys");
  }

  static async InitModuleCache(archives: (RIMObject|ERFObject)[]){
    log.trace("InitModuleCache", archives.length, "archives");
    ResourceLoader.ClearCache(CacheScope.MODULE);
    this.ModuleArchives = archives;

    const start = Date.now();
    log.info(`InitModuleCache: Start`);

    const scope = ResourceLoader.CacheScopes[CacheScope.MODULE];
    await Promise.all(archives.map(async (archive) => {
      if(archive instanceof RIMObject){
        const resources = archive.resources;
        for(let i = 0; i < resources.length; i++){
          const resource = resources[i];
          const buffer = await archive.getResourceBuffer(resource);
          // log.info('InitModuleCache: RIM', resource.resRef.toLocaleLowerCase(), buffer);
          scope.get(resource.resType).set(
            resource.resRef.toLocaleLowerCase(),
            buffer
          );
        }
      }else if(archive instanceof ERFObject){
        const keyList = archive.keyList;
        for(let i = 0; i < keyList.length; i++){
          const key = keyList[i];
          const buffer = await archive.getResourceBufferByResRef(key.resRef, key.resType);
          // log.info('InitModuleCache: ERF', resource.resRef.toLocaleLowerCase(), buffer);
          scope.get(key.resType).set(
            key.resRef.toLocaleLowerCase(),
            buffer
          );
        }
      }
    }));

    const end = Date.now();
    log.info(`InitModuleCache: End - ${((end-start)/1000)}s`);

  }

  static ClearCache(scope: CacheScope){
    log.trace("ClearCache", scope);
    if(ResourceLoader.CacheScopes[scope])
      ResourceLoader.CacheScopes[scope].forEach( cacheType => {
        cacheType.clear();
      });
  }

  static async loadResource(resId: number, resRef: string): Promise<Uint8Array> {
    log.trace("loadResource", resId, resRef);
    if(!resId){
      throw new Error(`Invalid resId ${resId}`);
    }

    if(!resRef){
      throw new Error(`Invalid resRef ${resRef}`);
    }

    //Resource Cache
    let data = ResourceLoader.getCache(resId, resRef);
    if(data){
      log.trace("loadResource cache hit", resRef);
      return data;
    }

    data = await this.searchLocal(resId, resRef);
    if(data){
      log.trace("loadResource searchLocal hit", resRef);
      ResourceLoader.setCache(null, resId, resRef, data);
      return data;
    }

    data = await this.searchKeyTable(resId, resRef);
    if(data){
      log.trace("loadResource searchKeyTable hit", resRef);
      ResourceLoader.setCache(null, resId, resRef, data);
      return data;
    }

    data = await this.searchModuleArchives(resId, resRef);
    if(data){
      log.trace("loadResource searchModuleArchives hit", resRef);
      ResourceLoader.setCache(null, resId, resRef, data);
      return data;
    }

    //Resource Not Found
    log.warn("loadResource not found", resRef, resId);
    throw new Error(`Resource not found: ResRef: ${resRef} ResId: ${resId}`);
  }

  static loadCachedResource(resId: number, resRef: string): Uint8Array | undefined {
    log.trace("loadCachedResource", resId, resRef);
    return ResourceLoader.getCache(resId, resRef.toLocaleLowerCase());
  }

  static setResource(resId: number, resRef: string, opts = {}){
    log.trace("setResource", resId, resRef);
    resRef = resRef.toLowerCase();

    if(typeof ResourceLoader.Resources[resId] === 'undefined'){
      ResourceLoader.Resources[resId] = {};
    }
    ResourceLoader.Resources[resId][resRef] = opts;
  }

  static getResource(resId: number, resRef: string){
    log.trace("getResource", resId, resRef);
    if(typeof ResourceLoader.Resources[resId] !== 'undefined'){
      if(typeof ResourceLoader.Resources[resId][resRef] !== 'undefined'){
        return ResourceLoader.Resources[resId][resRef];
      }
    }
    return null;
  }

  static clearCache(){
    log.trace("clearCache");
    ResourceLoader.cache = {};
  }

  static getCache(resId: number, resRef: string): Uint8Array | undefined {
    log.trace("getCache", resId, resRef);
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

  static setCache(type: CacheScope | null, resId: number, resRef: string, buffer: Uint8Array): void {
    log.trace("setCache", type, resId, resRef, buffer.length);
    const scope = type !== null ? ResourceLoader.CacheScopes[type] : null;
    if(scope){
      scope.get(resId).set(resRef, buffer);
      return;
    }

    if (typeof ResourceLoader.cache[resId] === 'undefined') {
      ResourceLoader.cache[resId] = {};
    }
    ResourceLoader.cache[resId][resRef] = buffer;
  }

  static async searchLocal(resId: number, resRef = ''): Promise<Uint8Array | undefined> {
    log.trace("searchLocal", resId, resRef);
    const data = await this.searchOverride(resId, resRef);
    if(data){
      return data;
    }
    return undefined;
  }

  /**
   * Search for a resource in the game Override folder (loose files).
   * Used when the resource was not pre-cached by InitOverrideCache (e.g. added after init)
   * or when loading without a prior full override scan.
   * Path is Override/{resRef}.{ext} where ext is derived from resId via ResourceTypes.
   */
  static async searchOverride(resId: number, resRef = ''): Promise<Uint8Array | undefined> {
    log.trace("searchOverride", resId, resRef);
    if (!resRef) {
      return undefined;
    }
    const ext = Object.keys(ResourceTypes).find(
      (k) => typeof ResourceTypes[k] === "number" && ResourceTypes[k] === resId
    );
    if (!ext) {
      return undefined;
    }
    const normalizedRef = resRef.toLowerCase();
    const filepath = path.join("Override", `${normalizedRef}.${ext}`);
    try {
      const exists = await GameFileSystem.exists(filepath);
      if (!exists) {
        return undefined;
      }
      const buffer = await GameFileSystem.readFile(filepath);
      if (!buffer || !buffer.length) {
        return undefined;
      }
      return buffer;
    } catch {
      return undefined;
    }
  }

  static async searchModuleArchives(resId: number, resRef = ''): Promise<Uint8Array | undefined> {
    log.trace("searchModuleArchives", resId, resRef, this.ModuleArchives.length);
    const archiveCount = this.ModuleArchives.length;

    for(let i = 0; i < archiveCount; i++){
      const archive = this.ModuleArchives[i];
      if(archive instanceof RIMObject){
        if(!archive.hasResource(resRef, resId)){ continue; }
        const data = await archive.getResourceBufferByResRef(resRef, resId);
        if(data){
          return data;
        }
      }else if(archive instanceof ERFObject){
        if(!archive.hasResource(resRef, resId)){ continue; }
        const data = await archive.getResourceBufferByResRef(resRef, resId);
        if(data){
          return data;
        }
      }
    }

    return undefined;
  }

  static async searchKeyTable(resId: number, resRef: string): Promise<Uint8Array | undefined> {
    log.trace("searchKeyTable", resId, resRef);
    const keyLookup = KEYManager.Key.getFileKey(resRef, resId);
    if(keyLookup){
      return await KEYManager.Key.getFileBuffer(keyLookup);
    }
    return undefined;
  }

  static async searchModules(resId: number, resRef: string): Promise<Uint8Array | undefined> {
    log.trace("searchModules", resId, resRef);
    const rims = Array.from(RIMManager.RIMs.values());
    const rimCount = rims.length;

    for(let i = 0; i < rimCount; i++){
      const rim = rims[i];
      if(!rim || !rim.hasResource(resRef, resId)){ continue; }

      return await rim.getResourceBufferByResRef(resRef, resId);
    }
  }

}
