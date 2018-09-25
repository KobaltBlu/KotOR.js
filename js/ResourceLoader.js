/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ResourceLaoder class.
 */

class ResourceLoader {

  static loadResource(resId = -1, resRef = null, onLoad = null, onError = null){

    if(resRef){

      this._searchLocal(resId, resRef, (data) => {
        if(typeof onLoad === 'function')
          onLoad(data);
      }, (e) => {
        if(Game.module instanceof Module){
          this._searchModuleArchives(resId, resRef, (data) => {
            if(typeof onLoad === 'function')
              onLoad(data);
          }, (e) => {
            this._searchKeyTable(resId, resRef, (data) => {
              if(typeof onLoad === 'function')
                onLoad(data);
            }, (e) => {
              if(typeof onError === 'function')
                onError(e);
            });
          });
        }else{
          this._searchKeyTable(resId, resRef, (data) => {
            if(typeof onLoad === 'function')
              onLoad(data);
          }, (e) => {
            if(typeof onError === 'function')
              onError(e);
          });
        }
      });

    }else{
      console.error('ResRef not set');
      if(typeof onError === 'function')
        onError();
    }

  }

  static _searchLocal(resId = -1, resRef = '', onLoad = null, onError = null){
    if(typeof Global.Project != 'undefined'){
      let projectFilePath = path.join(Global.Project.directory, 'files', resRef + '.' + ResourceTypes.getKeyByValue(resId));
      //Check in the project directory
      Utility.FileExists(projectFilePath, (exists) => {
        console.log('File Exists', exists, projectFilePath);
        if(exists){
          fs.readFile(projectFilePath, (err, data) => {
            if(err){
              this._searchOverride(resId, resRef, (data) => {
                if(typeof onLoad === 'function')
                  onLoad(data);
              }, (e) => {
                if(onError != null)
                  onError();
              });
            }else{
              if(onLoad != null)
                onLoad(data);
            }
          });
        }else{
          this._searchOverride(resId, resRef, (data) => {
            if(typeof onLoad === 'function')
              onLoad(data);
          }, (e) => {
            if(onError != null)
              onError();
          });
        }
      });
    }else{
      this._searchOverride(resId, resRef, (data) => {
        if(typeof onLoad === 'function')
          onLoad(data);
      }, (e) => {
        if(onError != null)
          onError();
      });
    }
  }

  static _searchModuleArchives(resId = -1, resRef = '', onLoad = null, onError = null){
    if(Game.module instanceof Module){
      let loop = new AsyncLoop({
        array: Game.module.archives,
        onLoop: (archive, asyncLoop) => {

          if(archive instanceof RIMObject){
            let resKey = archive.getResourceByKey(resRef, resId);
            if(resKey){
              archive.getRawResource(resRef, resId, (data) => {
                if(typeof onLoad === 'function')
                  onLoad(data);
              });
            }else{
              asyncLoop._Loop();
            }
          }else if(archive instanceof ERFObject){
            let resKey = archive.getResourceByKey(resRef, resId);
            if(resKey){
              archive.getRawResource(resRef, resId, (data) => {
                if(typeof onLoad === 'function')
                  onLoad(data);
              });
            }else{
              asyncLoop._Loop();
            }
          }else{
            asyncLoop._Loop();
          }
        
        }
      });
      loop.Begin(() => {
        if(typeof onError === 'function')
          onError();
      });
    }else{
      if(typeof onError === 'function')
      onError();
    }

  }

  static loadResourceSync(resId = -1, resRef = null){
    
    let model = null;

    model = this._searchKeyTableSync(resId, resRef);
    if(model)
      return model;
    
    return null;

  }

  static loadTexture(resId = -1, resRef = null){



  }

  static setResource(resId, resRef, opts = {}){

    resRef = resRef.toLowerCase();

    if(typeof ResourceLoader.Resources[resId] === 'undefined')
      ResourceLoader.Resources[resId] = {};

      ResourceLoader.Resources[resId][resRef] = opts;

  }

  static getResource(resId, resRef){

    if(typeof ResourceLoader.Resources[resId] !== 'undefined'){
      if(typeof ResourceLoader.Resources[resId][resRef] !== 'undefined'){
        return ResourceLoader.Resources[resId][resRef];
      }
    }
    return null;
  }

  //Check the module dlg arf archive (TSL ONLY)//if(GameKey == 'TSL'){
  static _searchDLG(resId = -1, resRef = null, onLoad = null, onError = null){

    if(!Game.module || GameKey != 'TSL'){
      if(typeof onError === 'function')
        onError();
      return;
    }

    if(Game.module.erf_dlg instanceof ERFObject){
    
      let resKey = Game.module.erf_dlg.getResourceByKey(resRef, resId);
      if(resKey){
        Game.module.erf_dlg.getRawResource(resRef, resId, (data) => {
          if(typeof onLoad === 'function')
            onLoad(data);
        });
      }else{
        if(typeof onError === 'function')
          onError();
      }

    }else{
      if(typeof onError === 'function')
        onError();
    }

  }


  //Check the module RIM archive A
  static _searchRIMa(resId = -1, resRef = null, onLoad = null, onError = null){

    if(!Game.module){
      if(typeof onError === 'function')
        onError();
      return;
    }
    
    let resKey = Game.module.rim.getResourceByKey(resRef, resId);
    if(resKey){
      Game.module.rim.getRawResource(resRef, resId, (data) => {
        if(typeof onLoad === 'function')
          onLoad(data);
      });
    }else{
      if(typeof onError === 'function')
        onError();
    }

  }

  //Check the module RIM archive B
  static _searchRIMb(resId = -1, resRef = null, onLoad = null, onError = null){

    if(!Game.module){
      if(typeof onError === 'function')
        onError();
      return;
    }

    let resKey = Game.module.rim_s.getResourceByKey(resRef, resId);
    if(resKey){
      Game.module.rim_s.getRawResource(resRef, resId, (data) => {
        if(typeof onLoad === 'function')
          onLoad(data);
      });
    }else{
      if(typeof onError === 'function')
        onError();
    }

  }

  static _searchKeyTable(resId = -1, resRef = null, onLoad = null, onError = null){
    let keyLookup = Global.kotorKEY.GetFileKey(resRef, resId);
    if(keyLookup){
      Global.kotorKEY.GetFileData(keyLookup, (data) => {
        if(typeof onLoad === 'function')
          onLoad(data);
      });
    }else{
      if(typeof onError === 'function')
        onError();
    }
  }

  static _searchKeyTableSync(resId = -1, resRef = null){
    let keyLookup = Global.kotorKEY.GetFileKey(resRef, resId);
    if(keyLookup){
      return Global.kotorKEY.GetFileDataSync(keyLookup);
    }else{
      return null;
    }
  }

  static _searchModules(resId = -1, resRef = null, onLoad = null, onError = null){
    let found = false;
    for(let key in Global.kotorRIM){
      let rim = Global.kotorRIM[key];
      if(rim instanceof RIMObject){
        let res = rim.getResourceByKey(resRef, resId);
        if(res){
          console.log('found');
          found = true;
          rim.GetResourceData(res, (data) => {
            if(typeof onLoad === 'function')
              onLoad(data);
          });
          return;
        }
      }
    }

    if(!found){
      if(typeof onError === 'function')
        onError();
    }

  }

  static _searchOverride(resId = -1, resRef = null, onLoad = null, onError = null){
    let overrideLookup = false;
    if(overrideLookup){
      //TODO: Check override folder
    }else{
      if(typeof onError === 'function')
        onError();
    }
  }

}

ResourceLoader.Resources = {};

module.exports = ResourceLoader;