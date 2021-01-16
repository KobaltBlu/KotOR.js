/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The GameInitializer class. Handles the loading of game archives for use later during runtime
 */

class GameInitializer {


  static Init(props){

    props = $.extend({
      game: null,
      onLoad: null,
      onError: null
    }, props);

    if(GameInitializer.currentGame != props.game){
      GameInitializer.currentGame = props.game;

      loader.SetMessage("Loading Keys");
      Global.kotorKEY = new KEYObject(path.join(app_profile.directory, 'chitin.key'), () => {

        Global.kotorBIF = {};
        Global.kotorRIM = {};
        loader.SetMessage("Loading Game Resources");
        GameInitializer.LoadGameResources( () => {

          //Load the TLK File
          loader.SetMessage("Loading TLK File");
          Global.kotorTLK = new TLKObject(path.join(app_profile.directory, 'dialog.tlk'), () => {
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
    let data_dir = path.join(app_profile.directory, 'Data');
    //let bifs = ["2da", "items", "scripts", "templates" ];
    let loaded = 0;

    loader.SetMessage('Loading: BIF Archives');

    let bifs = Array.prototype.map.call(Global.kotorKEY.bifs, function(obj) {
      let args = obj.filename.split('\\').pop().split('.');
      if(args[1] == "bif")
        return args[0];
    });
    //console.log(bifs);
    let i = 0;
    let loadBif = () => {
      //console.log(path.join(app_profile.directory, Global.kotorKEY.bifs[i].filename));
      Global.kotorBIF[bifs[i]] = new BIFObject(path.join(app_profile.directory, Global.kotorKEY.bifs[i].filename), () => {
        i++
        if(i == Global.kotorKEY.BIFCount){

          if(onSuccess != null)
            onSuccess();

        }else{
          loadBif();
        }
      });
    };
    loadBif();
  }

  static LoadRIMs(onSuccess = null){
    if(GameKey != 'TSL'){
      let data_dir = path.join(app_profile.directory, 'rims');
      //let bifs = ["2da", "items", "scripts", "templates" ];
      let loaded = 0;

      loader.SetMessage('Loading: RIM Archives');

      fs.readdir(data_dir, (err, filenames) => {
        if (err)
          return;

        let rims = Array.prototype.map.call(filenames, function(obj) {
          let args = obj.split('\\').pop().split('.');
          if(args[1] == "rim")
            return args[0];
        });
        let i = 0;
        let loadRim = () => {
          //console.log(path.join(data_dir, filenames[i]));
          Global.kotorRIM[rims[i]] = new RIMObject(path.join(data_dir, filenames[i]), () => {
            i++
            if(i == rims.length){

              if(onSuccess != null)
                onSuccess();

            }else{
              loadRim();
            }
          });
        };
        loadRim();
      });
    }else{
      if(onSuccess != null)
        onSuccess();
    }
  }

  static LoadModules(onSuccess = null){
    let data_dir = path.join(app_profile.directory, 'modules');
    loader.SetMessage('Loading: Module Archives');

    fs.readdir(data_dir, (err, filenames) => {
      if (err)
        return;

      let rims = Array.prototype.map.call(filenames, function(obj) {
        let filename = obj.split('\\').pop();
        let args = filename.split('.');
        if(args[1] == "rim" && args[0].indexOf('_s') >= 0)
          return args[0];
      });
      let i = 0;
      let loadModule = () => {
        Global.kotorRIM[rims[i]] = new RIMObject(path.join(data_dir, filenames[i]), () => {
          i++
          if(i == rims.length){

            if(onSuccess != null)
              onSuccess();

          }else{
            loadModule();
          }
        });
      };
      loadModule();
    });
  }

  static Load2DAs(onSuccess = null){
    loader.SetMessage('Loading: 2DA\'s');
    Global.kotor2DA = {};
    let loaded = 0;
    let resourceCount = Global.kotorBIF['2da'].resources.length;
    for(let i = 0; i != resourceCount; i++){
      let res = Global.kotorBIF['2da'].resources[i];
      let ResKey = Global.kotorKEY.GetFileKeyByRes(res);

      //Load 2da's with the resource loader to it can pick up ones in the override folder
      ResourceLoader.loadResource(ResourceTypes['2da'], ResKey.ResRef, (d) => {
        Global.kotor2DA[ResKey.ResRef] = new TwoDAObject(d, () => {
          loaded++;
          if(loaded == resourceCount)
            if(onSuccess != null)
              onSuccess();
        });
      });

      /*Global.kotorBIF["2da"].GetResourceData(Global.kotorBIF["2da"].GetResourceByLabel(ResKey.ResRef, ResourceTypes['2da']), (d) => {
        Global.kotor2DA[ResKey.ResRef] = new TwoDAObject(d, () => {
          loaded++;
          if(loaded == resourceCount)
            if(onSuccess != null)
              onSuccess();
        });
      });*/
    }

  }

  static LoadTexturePacks(onSuccess = null){
    let data_dir = path.join(app_profile.directory, 'TexturePacks');
    //let bifs = ["2da", "items", "scripts", "templates" ];
    let loaded = 0;
    fs.readdir(data_dir, (err, filenames) => {
      if (err)
        return;

      let erfs = Array.prototype.map.call(filenames, function(obj) {
        let args = obj.split('\\').pop().split('.');
        if(args[1] == "erf")
          return args[0];
      });
      let i = 0;
      let loadERF = () => {
        loader.SetMessage('Loading: '+erfs[i]+'.erf');
        //console.log(path.join(data_dir, filenames[i]));
        Global.kotorERF[erfs[i]] = new ERFObject(path.join(data_dir, filenames[i]), () => {
          i++
          if(i == erfs.length){
            if(onSuccess != null)
              onSuccess();
          }else{
            loadERF();
          }
        });
      };
      loadERF();
    });
  }

  static LoadGameAudioResources( args = {} ){

    args = $.extend({
      folder: null,
      name: null,
      onSuccess: null,
    }, args);

    //console.log('Searching For Audio Files', args);
    let root = path.join(app_profile.directory, args.folder);
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

module.exports = GameInitializer;
