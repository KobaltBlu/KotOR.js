/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as THREE from "three";
import md5 from "blueimp-md5";

/* @file
 * The MaterialCache class.
 */

export class MaterialCache {
  static cache: any = {};

  static HashExists (hash: string){
    if(MaterialCache.cache.hasOwnProperty(hash)){
      return true;
    }
    return false;
  }

  static GenerateHash ( params: any[] = [] ){
    let string = '';
    for(let i = 0; i < params.length; i++){
      string += params[i];
    }
    return md5(string);
  }

  static CacheMaterial ( hash: string, material: THREE.Material){
    if(hash != null){
      if(!MaterialCache.HashExists(hash)){
        MaterialCache.cache[hash] = material;
      }
    }
  }

  static GetCachedMaterial (hash: string){
    if(MaterialCache.cache.hasOwnProperty(hash)){
      return MaterialCache.cache[hash];
    }
    return null;
  }

}
