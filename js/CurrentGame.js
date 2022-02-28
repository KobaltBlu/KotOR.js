class CurrentGame {

  static IsModuleSaved( name = '' ){
    return new Promise( (resolve, reject) => {
      try{
        fs.readdir(CurrentGame.gameinprogress_dir, (err, files = []) => {
          for(let i = 0; i < files.length; i++){
            let file = files[i];
            let file_path = path.join( CurrentGame.gameinprogress_dir, file );
            let file_info = path.parse(file);
            let ext = file_info.ext.split('.').pop();
            if(file_info.name.toLowerCase() == name.toLowerCase()){
              resolve(true);
              return;
            }
          }
          resolve(false);
        });
      }catch(e){
        resolve(false);
      }
    });  
  }

  static GetModuleRim( name = ''){

    return new Promise( (resolve, reject) => {
      fs.readFile( path.join( CurrentGame.gameinprogress_dir, name.toLowerCase()+'.sav'), (error, data) => {
        if(!error){
          new ERFObject(data, (rim) => {
            // console.log('CurrentGame', 'GetModuleRim', name, rim);
            resolve(rim);
          });
        }else{
          // console.error('CurrentGame', 'GetModuleRim', name, e);
          reject(e);
        }
      });
    });
  }

  static ClearGameInProgressFolder(){
    if(fs.existsSync(CurrentGame.gameinprogress_dir)){
      fs.rmdirSync(CurrentGame.gameinprogress_dir, { recursive: true });
    }
  }

  static InitGameInProgressFolder(){
    CurrentGame.ClearGameInProgressFolder();
    fs.mkdirSync(CurrentGame.gameinprogress_dir);
  }

  static ExtractERFToGameInProgress( erf ){
    return new Promise( (resolve, reject) => {
      if(erf instanceof ERFObject){
        let loop = new AsyncLoop({
          array: erf.KeyList,
          onLoop: (erf_key, asyncLoop) => {
            erf.exportRawResource( CurrentGame.gameinprogress_dir, erf_key.ResRef, erf_key.ResType, () => {
              asyncLoop.next();
            });
          }
        });
        loop.iterate(() => {
          resolve();
        });
      }else{
        resolve();
      }
    });
  }

  static ExportToSaveFolder( folder = undefined ){
    return new Promise( async (resolve, reject) => {
      let sav = new ERFObject();
      fs.readdir(CurrentGame.gameinprogress_dir, async (err, files) => {
        let loop = new AsyncLoop({
          array: files,
          onLoop: (file, asyncLoop) => {
            let file_path = path.join( CurrentGame.gameinprogress_dir, file );
            let file_info = path.parse(file);
            let ext = file_info.ext.split('.').pop();
            if(typeof ResourceTypes[ext] != 'undefined'){
              fs.readFile( file_path, (error, data) => {
                if(!error){
                  sav.addResource(file_info.name, ResourceTypes[ext], data);
                  asyncLoop.next();
                }else{
                  // console.log('ExportCurrentGameFolder', 'file open error', file, error);
                  asyncLoop.next();
                }
              });
            }else{
              // console.log('ExportCurrentGameFolder', 'Unhandled file', file);
              asyncLoop.next();
            }
          }
        });
        loop.iterate( async () => {
          await sav.export( path.join(folder, 'SAVEGAME.sav') );
          resolve(sav);
        });
      });
    });
  }

}

CurrentGame.gameinprogress_dir = path.join(app_profile.directory, 'gameinprogress');
CurrentGame.ClearGameInProgressFolder();

module.exports = CurrentGame;