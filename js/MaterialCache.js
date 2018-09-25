/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MaterialCache class.
 */

class MaterialCache {

  static HashExists (hash = null){
    if(MaterialCache.cache.hasOwnProperty(hash)){
      return true;
    }
    return false;
  }

  static GenerateHash ( params = [] ){
    let string = '';
    for(let i = 0; i < params.length; i++){
      string += params[i];
    }
    return MD5(string);
  }

  static CacheMaterial ( hash = null, material = null){
    if(hash != null){
      if(!MaterialCache.HashExists(hash)){
        MaterialCache.cache[hash] = material;
      }
    }
  }

  static GetCachedMaterial (hash = null){
    if(MaterialCache.cache.hasOwnProperty(hash)){
      return MaterialCache.cache[hash];
    }
    return null;
  }

}

MaterialCache.cache = {};

module.exports = MaterialCache;
