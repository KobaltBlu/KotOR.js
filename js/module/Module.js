/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The Module class.
 */

class Module {

  constructor(onLoad = null){
    this.scripts = {};
    this.archives = [];
    this.Init();

    this.customTokens = new Map();

  }

  Init(){
    $.extend(this, {
      audio: {
        AmbientSndDay: 0,
        AmbientSndDayVol: 0,
        AmbientSndNight: 0,
        AmbientSndNitVol: 0,
        EnvAudio: 0,
        MusicBattle: 0,
        MusicDay: 0,
        MusicDelay: 0,
        MusicNight: 0
      },
      instances: {
        cameras: [],
        creatures: [],
        doors: [],
        encounters: [],
        placeables: [],
        rooms: [],
        sounds: [],
        stores: [],
        triggers: [],
        waypoints: [],
        doorhooks: [],
        tracks: [],
        obstacles: [],
        party: [],
        player: null
      },
      area: new ModuleArea(),
      eventQueue: []
    });
    
    this.rooms = [];
  }

  tick(delta = 0 ){

    if(this.readyToProcessEvents){

      //Process EventQueue
      let eqLen = this.eventQueue.length - 1;
      for(let i = eqLen; i >= 0; i--){
        let event = this.eventQueue[i];
        
        if(event.id == Module.EventID.TIMED_EVENT){
          if( ( Game.time * 1000 ) >= event.time ){
            if(event.script instanceof NWScriptInstance){
              event.script.beginLoop({
                _instr: null, 
                index: -1, 
                seek: event.offset,
                onComplete: () => { 
                  //console.log('ScriptEvent: complete', event); 
                }
              });
            }

            this.eventQueue.splice(i, 1);
          }
        }
      }

    }

  }


  setReturnStrRef(enabled = false, str1 = -1, str2 = -1){
    Game.MenuMap.BTN_RETURN.setText(Global.kotorTLK.GetStringById(str1));
  }

  loadScene( onLoad = null, onProgress = null ){

    PartyManager.party = [];
    
    ModuleObject.ResetPlayerId();

    if(this.area.SunFogOn && this.area.SunFogColor){
      Game.globalLight.color.setHex('0x'+this.area.SunFogColor.toString(16));
    }else{
      Game.globalLight.color.setHex('0x'+this.area.DynAmbientColor.toString(16));
    }
    
    Game.globalLight.color.setRGB(
      THREE.Math.clamp(Game.globalLight.color.r, 0.2, 1),
      THREE.Math.clamp(Game.globalLight.color.g, 0.2, 1),
      THREE.Math.clamp(Game.globalLight.color.b, 0.2, 1),
    );

    Game.camera.position.setX(this['Mod_Entry_X']);
    Game.camera.position.setY(this['Mod_Entry_Y']);
    Game.camera.position.setZ(this['Mod_Entry_Z'] + 2);
    Game.camera.rotation.set(Math.PI / 2, -Math.atan2(this['Mod_Entry_Dir_X'], this['Mod_Entry_Dir_Y']), 0);

    //this.camera.pitch = THREE.Math.radToDeg(this.camera.rotation.y) * -1;
    //this.camera.yaw = THREE.Math.radToDeg(this.camera.rotation.x);

    let ypr = this.toEulerianAngle(Game.camera.quaternion);

    Game.camera.pitch = THREE.Math.radToDeg(ypr.pitch);
    Game.camera.yaw = THREE.Math.radToDeg(ypr.yaw) * -1;

    if (Game.camera.pitch > 89.0)
    Game.camera.pitch = 89.0;
    if (Game.camera.pitch < -89.0)
    Game.camera.pitch = -89.0;

    for(let i = 0; i < this.area.cameras.length; i++){
      let cam = this.area.cameras[i];
      cam.InitProperties();
      let camera = new THREE.PerspectiveCamera(cam.fov, $(window).innerWidth() / $(window).innerHeight(), 0.1, 1500);
      camera.up = new THREE.Vector3( 0, 1, 0 );
      camera.position.set(cam.position.x, cam.position.y, cam.position.z + cam.height);
      camera.rotation.reorder('YZX');
      let quat = new THREE.Quaternion().copy(cam.orientation);
      let rot = quat.multiplyVector3(new THREE.Vector3(1, 1, 0));
      camera.rotation.x = THREE.Math.degToRad(cam.pitch);
      camera.rotation.z = -Math.atan2(cam.orientation.w, -cam.orientation.x)*2;

      //Clipping hack
      camera.position.add(new THREE.Vector3(0, 0, 0.5).applyEuler(camera.rotation));

      camera.ingameID = cam.cameraID;
      Game.staticCameras.push(camera);

      camera._cam = cam;

    }

    Game.LoadScreen.setProgress(0);

    try{
      Game.InGameOverlay.SetMapTexture('lbl_map'+this.Mod_Entry_Area);
      Game.MenuMap.SetMapTexture('lbl_map'+this.Mod_Entry_Area);
    }catch(e){

    }

    this.area.loadScene( () => {
      if(typeof onLoad === 'function')
        onLoad();

      this.transWP = null;
    });

  }

  initScripts(onComplete = null){

    let initScripts = [];

    if(this.scripts.onModLoad != ''){
      initScripts.push('onModLoad');
    }
    
    if(this.scripts.onClientEntr != ''){
      initScripts.push('onClientEntr');
    }

    let keys = Object.keys(this.scripts);
    let loop = new AsyncLoop({
      array: initScripts,
      onLoop: async (key, asyncLoop) => {
        let _script = this.scripts[key];
        if(_script != '' && !(_script instanceof NWScriptInstance)){
          //let script = await NWScript.Load(_script);
          this.scripts[key] = await NWScript.Load(_script);
          if(this.scripts[key] instanceof NWScriptInstance){
            //this.scripts[key].name = _script;
            this.scripts[key].enteringObject = Game.player;
            this.scripts[key].run(Game.module.area, 0, () => {
              asyncLoop.next();
            });
          }else{
            console.error('Module failed to load script', _script, key);
            asyncLoop.next();
          }
        }else{
          asyncLoop.next();
        }
      }
    });
    loop.iterate(() => {
      //Load any MiniGame scripts if available
      this.miniGameScripts( () => {
        //Load the Module Area's onEnter Script
        if(this.area.scripts.onEnter instanceof NWScriptInstance){
          console.log('onEnter', this.area.scripts.onEnter)
          this.area.scripts.onEnter.enteringObject = Game.player;
          this.area.scripts.onEnter.debug.action = true;
          this.area.scripts.onEnter.run(this.area, 0, () => {
            if(typeof onComplete === 'function')
              onComplete();
          });
        }else{
          if(typeof onComplete === 'function')
            onComplete();
        }
      });
    });
    
  }

  miniGameScripts(onComplete = null){

    if(!Game.module.area.MiniGame){
      if(typeof onComplete === 'function')
        onComplete();
      return;
    }

    let loop = new AsyncLoop({
      array: this.area.MiniGame.Enemies,
      onLoop: (enemy, asyncLoop) => {
        if(enemy.scripts.onCreate instanceof NWScriptInstance){
          enemy.scripts.onCreate.run(enemy, 0, () => {
            asyncLoop.next();
          });
        }else{
          asyncLoop.next();
        }
      }
    });
    loop.iterate(() => {
      if(typeof onComplete === 'function')
        onComplete();
    });

  }

  getCameraStyle(){
    return Global.kotor2DA["camerastyle"].rows[this.area.CameraStyle];
  }

  setCustomToken(tokenNumber = 0, tokenValue = ''){
    this.customTokens.set(tokenNumber, tokenValue);
  }

  getCustomToken(tokenNumber){
    return this.customTokens.get(tokenNumber) || `<Missing CustomToken ${tokenNumber}>`;
  }

  initEventQueue(){
    //Load module EventQueue after the area is intialized so that ModuleObject ID's are set
    if(this.ifo.RootNode.HasField('EventQueue')){
      let eventQueue = this.ifo.GetFieldByLabel('EventQueue').GetChildStructs();
      for(let i = 0; i < eventQueue.length; i++){
        let event_struct = eventQueue[i];
        console.log(event_struct);
        let event = {
          id: event_struct.GetFieldByLabel('EventId').GetValue()
        }
        if(event.id == Module.EventID.TIMED_EVENT){

          let eventData = event_struct.GetFieldByLabel('EventData').GetChildStructs()[0];

          let script = new NWScript();
          script.name = eventData.GetFieldByLabel('Name').GetValue();
          script.init(
            eventData.GetFieldByLabel('Code').GetVoid(),
            eventData.GetFieldByLabel('CodeSize').GetValue()
          );

          let scriptInstance = script.newInstance();
          scriptInstance.isStoreState = true;
          scriptInstance.setCaller(ModuleObject.GetObjectById(event_struct.GetFieldByLabel('ObjectId').GetValue()) );

          let stackStruct = eventData.GetFieldByLabel('Stack').GetChildStructs()[0];
          scriptInstance.stack = NWScriptStack.FromActionStruct(stackStruct);

          event.script = scriptInstance;
          event.offset = eventData.GetFieldByLabel('InstructionPtr').GetValue();
          event.day = event_struct.GetFieldByLabel('Day').GetValue();
          event.time = event_struct.GetFieldByLabel('Time').GetValue();
          this.eventQueue.push(event);
        }
      }
    }
  }

  static async GetModuleMod(modName = ''){
    return new Promise( (resolve, reject) => {
      let resource_path = path.join(Config.options.Games[GameKey].Location, 'modules', modName+'.mod');
      new ERFObject(path.join(Config.options.Games[GameKey].Location, 'modules', modName+'.mod'), (mod) => {
        console.log('Module.GetModuleMod success', resource_path);
        resolve(mod);
      }, () => {
        console.error('Module.GetModuleMod failed', resource_path);
        resolve(undefined);
      });
    });
  }

  static async GetModuleRimA(modName = ''){
    return new Promise( (resolve, reject) => {
      let resource_path = path.join(Config.options.Games[GameKey].Location, 'modules', modName+'.rim');
      new RIMObject(path.join(Config.options.Games[GameKey].Location, 'modules', modName+'.rim'), (rim) => {
        resolve(rim);
      }, () => {
        console.error('Module.GetModuleRimA failed', resource_path);
        resolve(undefined);
      });
    });
  }

  static async GetModuleRimB(modName = ''){
    return new Promise( (resolve, reject) => {
      let resource_path = path.join(Config.options.Games[GameKey].Location, 'modules', modName+'_s.rim');
      new RIMObject(path.join(Config.options.Games[GameKey].Location, 'modules', modName+'_s.rim'), (rim) => {
        resolve(rim);
      }, () => {
        console.error('Module.GetModuleRimB failed', resource_path);
        resolve(undefined);
      });
    });
  }

  static async GetModuleLipsLoc(){
    return new Promise( (resolve, reject) => {
      let resource_path = path.join(Config.options.Games[GameKey].Location, 'lips', 'localization.mod');
      new ERFObject(path.join(Config.options.Games[GameKey].Location, 'lips', 'localization.mod'), (mod) => {
        console.log('Module.GetModuleLipsLoc success', resource_path);
        resolve(mod);
      }, () => {
        console.error('Module.GetModuleLipsLoc failed', resource_path);
        resolve(undefined);
      });
    });
  }

  static async GetModuleLips(modName = ''){
    return new Promise( (resolve, reject) => {
      let resource_path = path.join(Config.options.Games[GameKey].Location, 'lips', modName+'_loc.mod');
      new ERFObject(path.join(Config.options.Games[GameKey].Location, 'lips', modName+'_loc.mod'), (mod) => {
        resolve(mod);
      }, () => {
        console.error('Module.GetModuleLips failed', resource_path);
        resolve(undefined);
      });
    });
  }

  static async GetModuleDLG(modName = ''){
    return new Promise( (resolve, reject) => {
      let resource_path = path.join(Config.options.Games[GameKey].Location, 'modules', modName+'_dlg.erf');
      new ERFObject(resource_path, (mod) => {
        resolve(mod);
      }, () => {
        console.error('Module.GetModuleDLG failed', resource_path);
        resolve(undefined);
      });
    });
  }

  static async GetModuleArchives(modName = '', onLoad = null){
    return new Promise( async (resolve, reject) => {
      let archives = [];
      let archive = undefined;

      let isModuleSaved = Game.SaveGame && Game.SaveGame.IsModuleSaved(modName);

      try{
        if(isModuleSaved){
          archive = await Game.SaveGame.GetModuleRim(modName);
          if(archive instanceof ERFObject){
            archives.push(archive);
          }

          //Locate the module's MOD file
          archive = await Module.GetModuleMod(modName);
          if(archive instanceof ERFObject){
            archives.push(archive);
          }

          //Locate the module's RIM_S file
          archive = await Module.GetModuleRimB(modName);
          if(archive instanceof RIMObject){
            archives.push(archive);
          }
        }else{
          //Locate the module's MOD file
          archive = await Module.GetModuleMod(modName);
          if(archive instanceof ERFObject){
            archives.push(archive);
          }

          //Locate the module's RIM file
          archive = await Module.GetModuleRimA(modName);
          if(archive instanceof RIMObject){
            archives.push(archive);
          }

          //Locate the module's RIM_S file
          archive = await Module.GetModuleRimB(modName);
          if(archive instanceof RIMObject){
            archives.push(archive);
          }
        }

        //Locate the module's LIPs file
        archive = await Module.GetModuleLips(modName);
        if(archive instanceof ERFObject){
          archives.push(archive);
        }

        //Locate the global LIPs file
        archive = await Module.GetModuleLipsLoc(modName);
        if(archive instanceof ERFObject){
          archives.push(archive);
        }

        //Locate the module's dialog MOD file (TSL)
        archive = await Module.GetModuleDLG(modName);
        if(archive instanceof ERFObject){
          archives.push(archive);
        }
      }catch(e){
        console.error(e);
      }
      
      //Return the archive array
      resolve(archives);
    });
  }

  //ex: end_m01aa end_m01aa_s
  static BuildFromExisting(modName = null, waypoint = null, onComplete = null){
    console.log('BuildFromExisting', modName);
    let module = new Module();
    module.filename = modName;
    module.transWP = waypoint;
    Game.module = module;
    if(modName != null){
      try{
        Module.GetModuleArchives(modName).then( (archives) => {
          Game.module.archives = archives;

          ResourceLoader.loadResource(ResourceTypes['ifo'], 'module', (ifo_data) => {
            
            new GFFObject(ifo_data, (gff, rootNode) => {

              Game.module.ifo = gff;

              if(gff.RootNode.HasField('Mod_PauseTime')){
                Game.time = gff.GetFieldByLabel('Mod_PauseTime').GetValue() / 1000;
              }
              
              let Mod_Area_list = gff.GetFieldByLabel('Mod_Area_list');
              let Mod_Area_listLen = Mod_Area_list.GetChildStructs().length;
              let Mod_Area = Mod_Area_list.ChildStructs[0];

              module.Area_Name = gff.GetFieldByLabel('Area_Name', Mod_Area.GetFields()).GetValue();

              module.Mod_Area_list = [];
              //KOTOR modules should only ever have one area. But just incase lets loop through the list
              for(let i = 0; i < Mod_Area_listLen; i++){
                let Mod_Area = Mod_Area_list.ChildStructs[0];
                let area = { 'Area_Name': Mod_Area.GetFieldByLabel('Area_Name').GetValue() };
                module.Mod_Area_list.push(area);
              }

              //LISTS
              if(gff.RootNode.HasField('Expansion_Pack')){
                module.Expansion_Pack = gff.GetFieldByLabel('Expansion_Pack').GetValue();
              }else{
                module.Expansion_Pack = 0;
              }
              module.Mod_CutSceneList = [];
              module.Mod_Expan_List = [];
              module.Mod_GVar_List = [];

              module.Mod_Creator_ID = gff.GetFieldByLabel('Mod_Creator_ID').GetValue();
              module.Mod_DawnHour = gff.GetFieldByLabel('Mod_DawnHour').GetValue();
              module.Mod_Description = gff.GetFieldByLabel('Mod_Description').GetCExoLocString();
              module.Mod_DuskHour = gff.GetFieldByLabel('Mod_DuskHour').GetValue();

              module.Mod_Entry_Area = gff.GetFieldByLabel('Mod_Entry_Area').GetValue();
              module.Mod_Entry_Dir_X = gff.GetFieldByLabel('Mod_Entry_Dir_X').GetValue();
              module.Mod_Entry_Dir_Y = gff.GetFieldByLabel('Mod_Entry_Dir_Y').GetValue();
              module.Mod_Entry_X = gff.GetFieldByLabel('Mod_Entry_X').GetValue();
              module.Mod_Entry_Y = gff.GetFieldByLabel('Mod_Entry_Y').GetValue();
              module.Mod_Entry_Z = gff.GetFieldByLabel('Mod_Entry_Z').GetValue();

              module.Mod_Hak = gff.GetFieldByLabel('Mod_Hak').GetValue();
              module.Mod_ID = gff.GetFieldByLabel('Mod_ID').GetVoid(); //Generated by the toolset (Not sure if it is used in game)
              module.Mod_MinPerHour = gff.GetFieldByLabel('Mod_MinPerHour').GetValue();
              module.Mod_Name = gff.GetFieldByLabel('Mod_Name').GetCExoLocString();

              //Mod_Tokens
              if(gff.RootNode.HasField('Mod_Tokens') && Game.isLoadingSave){
                let tokenList = gff.GetFieldByLabel('Mod_Tokens').GetChildStructs();
                for(let i = 0, len = tokenList.length; i < len; i++){
                  module.setCustomToken(
                    tokenList[i].GetFieldByLabel('Mod_TokensNumber').GetValue(),
                    tokenList[i].GetFieldByLabel('Mod_TokensValue').GetValue()
                  );
                }
              }

              if(gff.RootNode.HasField('Mod_PlayerList') && Game.isLoadingSave){
                let playerList = gff.GetFieldByLabel('Mod_PlayerList').GetChildStructs();
                if(playerList.length){
                  PartyManager.Player = GFFObject.FromStruct(playerList[0]);
                }
              }

              //Scripts
              module.scripts.onAcquirItem = gff.GetFieldByLabel('Mod_OnAcquirItem').GetValue();
              module.scripts.onActvItem = gff.GetFieldByLabel('Mod_OnActvtItem').GetValue();
              module.scripts.onClientEntr = gff.GetFieldByLabel('Mod_OnClientEntr').GetValue();
              module.scripts.onClientLeav = gff.GetFieldByLabel('Mod_OnClientLeav').GetValue();
              module.scripts.onHeartbeat = gff.GetFieldByLabel('Mod_OnHeartbeat').GetValue();
              module.scripts.onModLoad = gff.GetFieldByLabel('Mod_OnModLoad').GetValue();
              module.scripts.onModStart = gff.GetFieldByLabel('Mod_OnModStart').GetValue();
              module.scripts.onPlrDeath = gff.GetFieldByLabel('Mod_OnPlrDeath').GetValue();
              module.scripts.onPlrDying = gff.GetFieldByLabel('Mod_OnPlrDying').GetValue();
              module.scripts.onPlrLvlUp = gff.GetFieldByLabel('Mod_OnPlrLvlUp').GetValue();
              module.scripts.onPlrRest = gff.GetFieldByLabel('Mod_OnPlrRest').GetValue();
              module.scripts.onSpawnBtnDn = gff.GetFieldByLabel('Mod_OnSpawnBtnDn').GetValue();
              module.scripts.onUnAqreItem = gff.GetFieldByLabel('Mod_OnUnAqreItem').GetValue();
              module.scripts.onUsrDefined = gff.GetFieldByLabel('Mod_OnUsrDefined').GetValue();

              module.Mod_StartDay = gff.GetFieldByLabel('Mod_StartDay').GetValue();
              module.Mod_StartHour = gff.GetFieldByLabel('Mod_StartHour').GetValue();
              module.Mod_StartMonth = gff.GetFieldByLabel('Mod_StartMonth').GetValue();
              if(gff.RootNode.HasField('Mod_StartMovie')){
                module.Mod_StartMovie = gff.GetFieldByLabel('Mod_StartMovie').GetValue();
              }else{
                module.Mod_StartMovie = '';
              }
              module.Mod_StartYear = gff.GetFieldByLabel('Mod_StartYear').GetValue();

              module.Mod_Tag = gff.GetFieldByLabel('Mod_Tag').GetValue();
              if(gff.RootNode.HasField('Mod_VO_ID')){
                module.Mod_VO_ID = gff.GetFieldByLabel('Mod_VO_ID').GetValue();
              }else{
                module.Mod_VO_ID = '';
              }
              module.Mod_Version = gff.GetFieldByLabel('Mod_Version').GetValue();
              module.Mod_XPScale = gff.GetFieldByLabel('Mod_XPScale').GetValue();

              ResourceLoader.loadResource(ResourceTypes['git'], module.Mod_Entry_Area, (data) => {
                new GFFObject(data, (git, rootNode) => {
                  Game.module.git = git;
                  ResourceLoader.loadResource(ResourceTypes['are'], module.Mod_Entry_Area, (data) => {
                    new GFFObject(data, (are, rootNode) => {
                      Game.module.are = are;
                      module.area = new ModuleArea(module.Mod_Entry_Area, are, git);
                      module.area.module = module;
                      module.area.SetTransitionWaypoint(module.transWP);
                      module.area.Load( () => {
                        
                        if(module.ifo.RootNode.HasField('Mod_NextObjId0'))
                          ModuleObject.COUNT = module.ifo.GetFieldByLabel('Mod_NextObjId0').GetValue();

                        //console.log(module);
                        if(typeof onComplete == 'function')
                          onComplete(module);
                      });                        
                    });
                  });
                });
              });
            });
          }, (err) => {
            console.error('LoadModule', err);
            Game.module = undefined;
          });
        });
      }catch(e){
        Game.module = undefined;
      }
    }
    return module;
  }

  //This should only be used inside KotOR Forge
  static FromProject(directory = null, onComplete = null){
    console.log('BuildFromExisting', directory);
    let module = new Module();
    module.transWP = null;
    Game.module = module;
    if(directory != null){

      fs.readFile(path.join(directory, 'module.ifo'), (err, ifo_data) => {
        new GFFObject(ifo_data, (gff, rootNode) => {
          console.log('Project ifo', gff);
          try{
          
            let Mod_Area_list = gff.GetFieldByLabel('Mod_Area_list');
            let Mod_Area_listLen = Mod_Area_list.GetChildStructs().length;
            let Mod_Area = Mod_Area_list.ChildStructs[0];

            //module.Area_Name = gff.GetFieldByLabel('Area_Name', Mod_Area.GetFields()).GetValue();

            module.Mod_Area_list = [];
            //KOTOR modules should only ever have one area. But just incase lets loop through the list
            for(let i = 0; i < Mod_Area_listLen; i++){
              let Mod_Area = Mod_Area_list.ChildStructs[0];
              let area = { 'Area_Name': Mod_Area.GetFieldByLabel('Area_Name').GetValue() };
              module.Mod_Area_list.push(area);
            }

            //LISTS
            if(gff.RootNode.HasField('Expansion_Pack')){
              module.Expansion_Pack = gff.GetFieldByLabel('Expansion_Pack').GetValue();
            }else{
              module.Expansion_Pack = 0;
            }
            module.Mod_CutSceneList = [];
            module.Mod_Expan_List = [];
            module.Mod_GVar_List = [];

            module.Mod_Creator_ID = gff.GetFieldByLabel('Mod_Creator_ID').GetValue();
            module.Mod_DawnHour = gff.GetFieldByLabel('Mod_DawnHour').GetValue();
            module.Mod_Description = gff.GetFieldByLabel('Mod_Description').GetCExoLocString();
            module.Mod_DuskHour = gff.GetFieldByLabel('Mod_DuskHour').GetValue();

            module.Mod_Entry_Area = gff.GetFieldByLabel('Mod_Entry_Area').GetValue();
            module.Mod_Entry_Dir_X = gff.GetFieldByLabel('Mod_Entry_Dir_X').GetValue();
            module.Mod_Entry_Dir_Y = gff.GetFieldByLabel('Mod_Entry_Dir_Y').GetValue();
            module.Mod_Entry_X = gff.GetFieldByLabel('Mod_Entry_X').GetValue();
            module.Mod_Entry_Y = gff.GetFieldByLabel('Mod_Entry_Y').GetValue();
            module.Mod_Entry_Z = gff.GetFieldByLabel('Mod_Entry_Z').GetValue();

            module.Mod_Hak = gff.GetFieldByLabel('Mod_Hak').GetValue();
            module.Mod_ID = gff.GetFieldByLabel('Mod_ID').GetVoid(); //Generated by the toolset (Not sure if it is used in game)
            module.Mod_MinPerHour = gff.GetFieldByLabel('Mod_MinPerHour').GetValue();
            module.Mod_Name = gff.GetFieldByLabel('Mod_Name').GetCExoLocString();

            if(gff.RootNode.HasField('Mod_PlayerList') && Game.isLoadingSave){
              let playerList = gff.GetFieldByLabel('Mod_PlayerList').GetChildStructs();
              if(playerList.length){
                PartyManager.Player = GFFObject.FromStruct(playerList[0]);
              }
            }

            //Scripts
            module.scripts.onAcquirItem = gff.GetFieldByLabel('Mod_OnAcquirItem').GetValue();
            module.scripts.onActvItem = gff.GetFieldByLabel('Mod_OnActvtItem').GetValue();
            module.scripts.onClientEntr = gff.GetFieldByLabel('Mod_OnClientEntr').GetValue();
            module.scripts.onClientLeav = gff.GetFieldByLabel('Mod_OnClientLeav').GetValue();
            module.scripts.onHeartbeat = gff.GetFieldByLabel('Mod_OnHeartbeat').GetValue();
            module.scripts.onModLoad = gff.GetFieldByLabel('Mod_OnModLoad').GetValue();
            module.scripts.onModStart = gff.GetFieldByLabel('Mod_OnModStart').GetValue();
            module.scripts.onPlrDeath = gff.GetFieldByLabel('Mod_OnPlrDeath').GetValue();
            module.scripts.onPlrDying = gff.GetFieldByLabel('Mod_OnPlrDying').GetValue();
            module.scripts.onPlrLvlUp = gff.GetFieldByLabel('Mod_OnPlrLvlUp').GetValue();
            module.scripts.onPlrRest = gff.GetFieldByLabel('Mod_OnPlrRest').GetValue();
            module.scripts.onSpawnBtnDn = gff.GetFieldByLabel('Mod_OnSpawnBtnDn').GetValue();
            module.scripts.onUnAqreItem = gff.GetFieldByLabel('Mod_OnUnAqreItem').GetValue();
            module.scripts.onUsrDefined = gff.GetFieldByLabel('Mod_OnUsrDefined').GetValue();

            module.Mod_StartDay = gff.GetFieldByLabel('Mod_StartDay').GetValue();
            module.Mod_StartHour = gff.GetFieldByLabel('Mod_StartHour').GetValue();
            module.Mod_StartMonth = gff.GetFieldByLabel('Mod_StartMonth').GetValue();
            if(gff.RootNode.HasField('Mod_StartMovie')){
              module.Mod_StartMovie = gff.GetFieldByLabel('Mod_StartMovie').GetValue();
            }else{
              module.Mod_StartMovie = '';
            }
            module.Mod_StartYear = gff.GetFieldByLabel('Mod_StartYear').GetValue();

            module.Mod_Tag = gff.GetFieldByLabel('Mod_Tag').GetValue();
            if(gff.RootNode.HasField('Mod_VO_ID')){
              module.Mod_VO_ID = gff.GetFieldByLabel('Mod_VO_ID').GetValue();
            }else{
              module.Mod_VO_ID = '';
            }
            module.Mod_Version = gff.GetFieldByLabel('Mod_Version').GetValue();
            module.Mod_XPScale = gff.GetFieldByLabel('Mod_XPScale').GetValue();

            console.log(module);

            fs.readFile(path.join(directory, module.Mod_Entry_Area+'.git'), (err, data) => {
              new GFFObject(data, (git, rootNode) => {
                console.log('Project git', git);
                fs.readFile(path.join(directory, module.Mod_Entry_Area+'.are'), (err, data) => {
                  new GFFObject(data, (are, rootNode) => {
                    console.log('Project are', are);
                    module.area = new ModuleArea(module.Mod_Entry_Area, are, git);
                    module.area.module = module;
                    module.area.SetTransitionWaypoint(module.transWP);
                    module.area.Load( () => {

                      //console.log(module);
                      if(typeof onComplete == 'function')
                        onComplete(module);
                    });                        
                  });
                });
              });
            });
          }catch(e){
            console.error(e);
          }
        });
      });
      
    }
    return module;
  }

  toEulerianAngle(q){
  	let ysqr = q.y * q.y;

  	// roll (x-axis rotation)
  	let t0 = +2.0 * (q.w * q.x + q.y * q.z);
  	let t1 = +1.0 - 2.0 * (q.x * q.x + ysqr);
  	let roll = Math.atan2(t0, t1);

  	// pitch (y-axis rotation)
  	let t2 = +2.0 * (q.w * q.y - q.z * q.x);
  	t2 = t2 > 1.0 ? 1.0 : t2;
  	t2 = t2 < -1.0 ? -1.0 : t2;
  	let pitch = Math.asin(t2);

  	// yaw (z-axis rotation)
  	let t3 = +2.0 * (q.w * q.z + q.x *q.y);
  	let t4 = +1.0 - 2.0 * (ysqr + q.z * q.z);
  	let yaw = Math.atan2(t3, t4);

    return {yaw: yaw, pitch: pitch, roll: roll};
  }

  Save(){

    //Export .ifo

    //Export .are

    //Export .git

    return {
      are: null,
      git: null,
      ifo: null
    };

  }

  static FromJSON(path){
    let module = new Module();
    if(path != null){
      let json = JSON.parse(fs.readFileSync(path, 'utf8'));

      module = Object.assign(new Module(), json);

      //module.area = new ModuleArea();
      module.area = Object.assign(new ModuleArea(), json.area);

    }else{
      this.path = Global.Project.directory;
    }
    return module;
  }

  toolsetExportIFO(){
    let ifo = new GFFObject();
    ifo.FileType = 'IFO ';

    ifo.RootNode.AddField( new Field(GFFDataTypes.WORD, 'Expansion_Pack', this.Expansion_Pack) );
    let areaList = ifo.RootNode.AddField( new Field(GFFDataTypes.LIST, 'Mod_Area_list') );

    //KotOR only supports one Area per module
    if(this.area instanceof ModuleArea){
      let areaStruct = new Struct(6);
      areaStruct.AddField( new Field(GFFDataTypes.RESREF, 'Area_Name', this.area._name) );
      areaList.AddChildStruct(areaStruct);
    }

    ifo.RootNode.AddField( new Field(GFFDataTypes.INT, 'Mod_Creator_ID', this.Expansion_Pack) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.LIST, 'Mod_CutSceneList') );
    ifo.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Mod_DawnHour', this.Mod_DawnHour) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.CEXOLOCSTRING, 'Mod_Description') ).CExoLocString = this.Mod_Description;
    ifo.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Mod_DuskHour', this.Mod_DuskHour) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Mod_Entry_Area', this.Mod_Entry_Area) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'Mod_Entry_Dir_X', this.Mod_Entry_Dir_X) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'Mod_Entry_Dir_Y', this.Mod_Entry_Dir_Y) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'Mod_Entry_X', this.Mod_Entry_X) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'Mod_Entry_Y', this.Mod_Entry_Y) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'Mod_Entry_Z', this.Mod_Entry_Z) );

    let expanList = ifo.RootNode.AddField( new Field(GFFDataTypes.LIST, 'Mod_Expan_List') );
    let gvarList = ifo.RootNode.AddField( new Field(GFFDataTypes.LIST, 'Mod_GVar_List') );

    ifo.RootNode.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Mod_Hak', this.Mod_Hak) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.VOID, 'Mod_ID') ).SetData(this.Mod_ID);
    ifo.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Mod_IsSaveGame', 0) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Mod_MinPerHour', this.Mod_MinPerHour) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.CEXOLOCSTRING, 'Mod_Name') ).CExoLocString = this.Mod_Name;
    ifo.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Mod_OnAcquirItem', this.onAcquirItem) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Mod_OnActvtItem', this.onActvItem) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Mod_OnClientEntr', this.onClientEntr) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Mod_OnClientLeav', this.onClientLeav) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Mod_OnHeartbeat', this.onHeartbeat) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Mod_OnModLoad', this.onModLoad) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Mod_OnModStart', this.onModStart) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Mod_OnPlrDeath', this.onPlrDeath) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Mod_OnPlrDying', this.onPlrDying) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Mod_OnPlrLvlUp', this.onPlrLvlUp) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Mod_OnPlrRest', this.onPlrRest) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Mod_OnSpawnBtnDn', this.onSpawnBtnDn) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Mod_OnUnAqreItem', this.onUnAqreItem) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Mod_OnUsrDefined', this.onUsrDefined) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.WORD, 'Mod_StartDay', this.Mod_StartDay) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.WORD, 'Mod_StartHour', this.Mod_StartHour) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.WORD, 'Mod_StartMonth', this.Mod_StartMonth) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Mod_StartMovie', this.Mod_StartMovie) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.WORD, 'Mod_StartYear', this.Mod_StartYear) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Mod_Tag', this.Mod_Tag) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Mod_VO_ID', this.Mod_VO_ID) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.DWORD, 'Mod_Version', this.Mod_Version) );
    ifo.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Mod_XPScale', this.Mod_XPScale) );

    return ifo;

  }

}

Module.EventID = {
  TIMED_EVENT: 1,
  ENTERED_TRIGGER: 2,
  LEFT_TRIGGER: 3,
  REMOVE_FROM_AREA: 4,
  APPLY_EFFECT: 5,
  CLOSE_OBJECT: 6,
  OPEN_OBJECT: 7,
  SPELL_IMPACT: 8,
  PLAY_ANIMATION: 9,
  SIGNAL_EVENT: 10,
  DESTROY_OBJECT: 11,
  UNLOCK_OBJECT: 12,
  LOCK_OBJECT: 13,
  REMOVE_EFFECT: 14,
  ON_MELEE_ATTACKED: 15,
  DECREMENT_STACKSIZE: 16,
  SPAWN_BODY_BAG: 17,
  FORCED_ACTION: 18,
  ITEM_ON_HIT_SPELL_IMPACT: 19,
  BROADCAST_AOO: 20,
  BROADCAST_SAFE_PROJECTILE: 21,
  FEEDBACK_MESSAGE: 22,
  ABILITY_EFFECT_APPLIED: 23,
  SUMMON_CREATURE: 24,
  AQUIRE_ITEM: 25
}

module.exports = Module;
