/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The GameInitializer class. Handles the loading of game archives for use later during runtime
 */

class GameInitializer {


  static Init(props){

    props = Object.assign({
      game: null,
      onLoad: null,
      onError: null
    }, props);

    if(GameInitializer.currentGame != props.game){
      GameInitializer.currentGame = props.game;

      loader.SetMessage("Loading Keys");
      Global.kotorKEY = new KEYObject(path.join(ApplicationProfile.directory, 'chitin.key'), () => {

        Global.kotorBIF = {};
        Global.kotorRIM = {};
        loader.SetMessage("Loading Game Resources");
        GameInitializer.LoadGameResources( () => {

          //Load the TLK File
          loader.SetMessage("Loading TLK File");
          Global.kotorTLK = new TLKObject(path.join(ApplicationProfile.directory, 'dialog.tlk'), () => {
            if(props.onLoad != null)
              props.onLoad();
          }, function(num, total){
            //onProgress
            loader.SetMessage("Loading TLK File: "+num+" / "+total);
          });
        });
      });

    }else{
      if(props.onLoad != null)
        props.onLoad();
    }

  }

  static LoadGameResources(onSuccess = null){


    //Load all biffs
    Global.kotorBIF = {};
    Global.kotorERF = {};
    Global.kotorRIM = {};
    Global.kotorMOD = {};
    Global.kotor2DA = {};

    loader.SetMessage("Loading BIF's");
    GameInitializer.LoadBIFs( () => {

      loader.SetMessage("Loading RIM's");
      GameInitializer.LoadRIMs( () => {

        GameInitializer.LoadModules( () => {

          //Load all of the 2da files into memory
          GameInitializer.Load2DAs( () => {
            loader.SetMessage('Loading: Texture Packs');
            GameInitializer.LoadTexturePacks( () => {

              GameInitializer.LoadGameAudioResources( {
                folder: 'streammusic',
                name: 'StreamMusic',
                onSuccess: () => {
                  GameInitializer.LoadGameAudioResources( {
                    folder: 'streamsounds',
                    name: 'StreamSounds',
                    onSuccess: () => {
                      if(GameKey != 'TSL'){
                        GameInitializer.LoadGameAudioResources( {
                          folder: 'streamwaves',
                          name: 'StreamWaves',
                          onSuccess: () => {

                            if(onSuccess != null)
                              onSuccess();
                          }
                        });
                      }else{
                        GameInitializer.LoadGameAudioResources( {
                          folder: 'streamvoice',
                          name: 'StreamSounds',
                          onSuccess: () => {

                            if(onSuccess != null)
                              onSuccess();
                          }
                        });
                      }
                    }
                  });
                }
              });
            });
          });

        });

      });

    });


  }

  static LoadBIFs(onSuccess = null){
    loader.SetMessage('Loading: BIF Archives');

    let bifs = Global.kotorKEY.bifs.map(function(obj) {
      let args = obj.filename.split(path.sep).pop().split('.');
      return {ext: args[1].toLowerCase(), name: args[0], filename: obj.filename};
    }).filter(function(file_obj){
      return file_obj.ext == 'bif';
    });

    let loop = new AsyncLoop({
      array: bifs,
      onLoop: (bif_object, asyncLoop) => {
        new BIFObject(path.join(ApplicationProfile.directory, bif_object.filename), (bif) => {
          if(bif instanceof BIFObject){
            bif.group = 'BIFs';
            Global.kotorBIF[bif_object.name] = bif;
          }
          asyncLoop.next();
        });
      }
    });
    loop.iterate(() => {
      if(typeof onSuccess === 'function')
        onSuccess();
    });
  }

  static LoadRIMs(onSuccess = null){
    if(GameKey != 'TSL'){
      let data_dir = path.join(ApplicationProfile.directory, 'rims');
      loader.SetMessage('Loading: RIM Archives');

      fs.readdir(data_dir, (err, filenames) => {
        if (err){
          console.warn('GameInitializer.LoadRIMs', err);
          if(typeof onSuccess === 'function')
            onSuccess();
            
          return;
        }

        let rims = filenames.map(function(file) {
          let filename = file.split(path.sep).pop();
          let args = filename.split('.');
          return {ext: args[1].toLowerCase(), name: args[0], filename: filename};
        }).filter(function(file_obj){
          return file_obj.ext == 'rim';
        });

        let loop = new AsyncLoop({
          array: rims,
          onLoop: (rim_obj, asyncLoop) => {
            new RIMObject(path.join(data_dir, rim_obj.filename), (rim) => {
              if(rim instanceof RIMObject){
                rim.group = 'RIMs';
                Global.kotorRIM[rim_obj.name] = rim;
              }
              asyncLoop.next();
            });
          }
        });
        loop.iterate(() => {
          if(typeof onSuccess === 'function')
            onSuccess();
        });
      });
    }else{
      if(onSuccess != null)
        onSuccess();
    }
  }

  static LoadModules(onSuccess = null){
    let data_dir = path.join(ApplicationProfile.directory, 'modules');
    loader.SetMessage('Loading: Module Archives');
    
    fs.readdir(data_dir, (err, filenames) => {
      if (err){
        console.warn('GameInitializer.LoadModules', err);
        if(typeof onSuccess === 'function')
          onSuccess();
          
        return;
      }

      let modules = filenames.map(function(file) {
        let filename = file.split(path.sep).pop();
        let args = filename.split('.');
        return {ext: args[1].toLowerCase(), name: args[0], filename: filename};
      }).filter(function(file_obj){
        return file_obj.ext == 'rim' || file_obj.ext == 'mod';
      });

      let loop = new AsyncLoop({
        array: modules,
        onLoop: (module_obj, asyncLoop) => {
          switch(module_obj.ext){
            case 'rim':
              new RIMObject(path.join(data_dir, module_obj.filename), (rim) => {
                if(rim instanceof RIMObject){
                  rim.group = 'Module';
                  Global.kotorRIM[module_obj.name] = rim;
                }
                asyncLoop.next();
              });
            break;
            case 'mod':
              new ERFObject(path.join(data_dir, module_obj.filename), (mod) => {
                if(mod instanceof ERFObject){
                  mod.group = 'Module';
                  Global.kotorMOD[module_obj.name] = mod;
                }
                asyncLoop.next();
              });
            break;
            default:
              console.warn('GameInitializer.LoadModules', 'Encountered incorrect filetype', module_obj);
              asyncLoop.next();
            break;
          }
        }
      });
      loop.iterate(() => {
        if(typeof onSuccess === 'function')
          onSuccess();
      });
    });
  }

  static Load2DAs(onSuccess = null){
    loader.SetMessage('Loading: 2DA\'s');
    
    let ResKey = undefined;
    let loop = new AsyncLoop({
      array: Global.kotorBIF['2da'].resources,
      onLoop: (twoDA_res, asyncLoop) => {
        ResKey = Global.kotorKEY.GetFileKeyByRes(twoDA_res);
        //Load 2da's with the resource loader to it can pick up ones in the override folder
        ResourceLoader.loadResource(ResourceTypes['2da'], ResKey.ResRef, (d) => {
          Global.kotor2DA[ResKey.ResRef] = new TwoDAObject(d, () => {
            asyncLoop.next();
          });
        });
      }
    });
    loop.iterate(() => {
      if(typeof onSuccess === 'function')
        onSuccess();
    });
  }

  static LoadTexturePacks(onSuccess = null){
    let data_dir = path.join(ApplicationProfile.directory, 'TexturePacks');

    fs.readdir(data_dir, (err, filenames) => {
      if (err){
        console.warn('GameInitializer.LoadTexturePacks', err);
        if(typeof onSuccess === 'function')
          onSuccess();

        return;
      }

      let erfs = filenames.map(function(file) {
        let filename = file.split(path.sep).pop();
        let args = filename.split('.');
        return {ext: args[1].toLowerCase(), name: args[0], filename: filename};
      }).filter(function(file_obj){
        return file_obj.ext == 'erf';
      });

      let loop = new AsyncLoop({
        array: erfs,
        onLoop: (erf_obj, asyncLoop) => {
          new ERFObject(path.join(data_dir, erf_obj.filename), (erf) => {
            if(erf instanceof ERFObject){
              erf.group = 'Textures';
              Global.kotorERF[erf_obj.name] = erf;
            }
            asyncLoop.next();
          });
        }
      });
      loop.iterate(() => {
        if(typeof onSuccess === 'function')
          onSuccess();
      });
    });
  }

  static LoadGameAudioResources( args = {} ){

    args = Object.assign({
      folder: null,
      name: null,
      onSuccess: null,
    }, args);

    //console.log('Searching For Audio Files', args);
    let root = path.join(ApplicationProfile.directory, args.folder);
    let dir = {name: args.folder, dirs: [], files: []};

    recursive(root, (err, files) => {
      // Files is an array of filename
      for(let i = 0; i!=files.length; i++){
        let f = files[i];

        let _parsed = path.parse(f);

        let ext = _parsed.ext.substr(1,  _parsed.ext.length);

        if(typeof ResourceTypes[ext] != 'undefined'){
          //console.log(ext);
          ResourceLoader.setResource(ResourceTypes[ext], _parsed.name.toLowerCase(), {
            inArchive: false,
            file: f,
            resref: _parsed.name,
            resid: ResourceTypes[ext],
            ext: ext,
            offset: 0,
            length: 0
          });
        }

      }

      if(args.onSuccess != null)
        args.onSuccess();

    });
  }

}

GameInitializer.currentGame = null;
