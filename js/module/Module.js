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
      area: new ModuleArea()
    });
    
    this.rooms = [];
  }

  loadScene( onLoad = null, onProgress = null ){

    PartyManager.party = [];
    this.rooms = []; // <------ Need to move this to the ModuleArea class

    for(let ri = 0; ri != this.area.rooms.length; ri++ ){
      let room = this.area.rooms[ri];
      let linked_rooms = [];
      if(this.area.visObject.GetRoom(room.RoomName)){
        linked_rooms = this.area.visObject.GetRoom(room.RoomName).rooms;
      }
      //console.log(room.RoomName, this.area.visObject.GetRoom(room.RoomName));
      this.rooms.push( 
        new ModuleRoom({
          room: room, 
          linked_rooms: linked_rooms
        }) 
      );
    }

    if(this.area.SunFogOn){
      Game.globalLight.color.setHex('0x'+this.area.SunFogColor.toString(16));
    }else{
      Game.globalLight.color.setHex('0x'+this.area.DynAmbientColor.toString(16));
    }
    //Game.globalLight.color.setRGB(0.8, 0.8, 0.8);

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
    
    this.loadRooms( () => {
      this.loadGrass( () => {
        Game.LoadScreen.setProgress(10);
        this.loadPlaceables( () => {
          Game.LoadScreen.setProgress(20);
          this.loadWaypoints( () => {
            Game.LoadScreen.setProgress(30);
            this.loadCreatures( () => {
              this.loadPlayer( () => {
                this.loadParty( () => {
                  Game.LoadScreen.setProgress(40);
                  //this.loadSoundTemplates( () => {
                    Game.LoadScreen.setProgress(50);
                    this.loadTriggers( () => {
                      Game.LoadScreen.setProgress(60);
                      this.loadMGTracks( () => {
                        this.loadMGPlayer( () => {
                          this.loadMGEnemies( () => {
                            Game.LoadScreen.setProgress(70);
                            this.loadDoors( () => {
                              Game.LoadScreen.setProgress(80);
                              this.loadTextures( () => {
                                Game.LoadScreen.setProgress(90);
                                this.loadAudio( () => {
                                  Game.LoadScreen.setProgress(100);
                                  
                                  
                                  //console.log('Running module onEnter scripts');]


                                  if(this.area.ChanceSnow == 100){
                                    Game.ModelLoader.load({
                                      file: 'fx_snow',
                                      onLoad: (mdl) => {
                                        THREE.AuroraModel.FromMDL(mdl, { 
                                          onComplete: (model) => {
                                            Game.weather_effects.push(model);
                                            Game.group.weather_effects.add(model);
                                            TextureLoader.LoadQueue();
                                          },
                                          manageLighting: false
                                        });
                                      }
                                    });
                                  }

                                  if(this.area.ChanceRain == 100){
                                    Game.ModelLoader.load({
                                      file: 'fx_rain',
                                      onLoad: (mdl) => {
                                        THREE.AuroraModel.FromMDL(mdl, { 
                                          onComplete: (model) => {
                                            Game.weather_effects.push(model);
                                            Game.group.weather_effects.add(model);
                                            TextureLoader.LoadQueue();
                                          },
                                          manageLighting: false
                                        });
                                      }
                                    });
                                  }

                                  //Game.onHeartbeat();

                                  if(typeof onLoad === 'function')
                                    onLoad();
                                });
                              });
                            });
                          });
                        });
                      });
                    });
                  //});
                });
              });
            });
          });
        });
      });
    });

  }

  initScripts(onComplete = null){

    let initScripts = [];

    if(this.scripts.OnModLoad != ''){
      initScripts.push('OnModLoad');
    }
    
    if(this.scripts.OnClientEntr != ''){
      initScripts.push('OnClientEntr');
    }

    let loop = new AsyncLoop({
      array: initScripts,
      onLoop: (script, asyncLoop) => {
        ResourceLoader.loadResource(ResourceTypes['ncs'], this.scripts[script], (buffer) => {
          console.log('InitScript', script, this.scripts[script]);
          let name = this.scripts[script];
          this.scripts[script] = new NWScript(buffer);
          this.scripts[script].enteringObject = Game.player;
          this.scripts[script].name = name;
          this.scripts[script].run(Game.module.area, 0, () => {
            asyncLoop._Loop();
          });
        });
      }
    });
    loop.Begin(() => {
      //Load any MiniGame scripts if available
      this.miniGameScripts( () => {
        //Load the Module Area's OnEnter Script
        if(this.area.scripts.OnEnter instanceof NWScript){
          console.log('onEnter', this.area.scripts.OnEnter)
          this.area.scripts.OnEnter.enteringObject = Game.player;
          this.area.scripts.OnEnter.run(this.area, 0, () => {
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
        if(enemy.scripts.onCreate instanceof NWScript){
          enemy.scripts.onCreate.run(enemy, 0, () => {
            asyncLoop._Loop();
          });
        }else{
          asyncLoop._Loop();
        }
      }
    });
    loop.Begin(() => {
      if(typeof onComplete === 'function')
        onComplete();
    });

  }

  getSpawnLocation(){

    if(Game.isLoadingSave){
      return {
        XPosition: PartyManager.Player.RootNode.GetFieldByLabel('XPosition').GetValue(),
        YPosition: PartyManager.Player.RootNode.GetFieldByLabel('YPosition').GetValue(),
        ZPosition: PartyManager.Player.RootNode.GetFieldByLabel('ZPosition').GetValue(),
        XOrientation: PartyManager.Player.RootNode.GetFieldByLabel('XOrientation').GetValue(),
        YOrientation: PartyManager.Player.RootNode.GetFieldByLabel('YOrientation').GetValue()
      };
    }else if(this.area.transWP){
      console.log('TransWP', this.area.transWP);
      return {
        XPosition: this.area.transWP.RootNode.GetFieldByLabel('XPosition').GetValue(),
        YPosition: this.area.transWP.RootNode.GetFieldByLabel('YPosition').GetValue(),
        ZPosition: this.area.transWP.RootNode.GetFieldByLabel('ZPosition').GetValue(),
        XOrientation: this.area.transWP.RootNode.GetFieldByLabel('XOrientation').GetValue(),
        YOrientation: this.area.transWP.RootNode.GetFieldByLabel('YOrientation').GetValue()
      }
    }else{
      console.log('No TransWP');
      return {
        XPosition: this['Mod_Entry_X'],
        YPosition: this['Mod_Entry_Y'],
        ZPosition: this['Mod_Entry_Z'],
        XOrientation: this['Mod_Entry_Dir_X'],
        YOrientation: this['Mod_Entry_Dir_Y']
      }
    }
  }

  getPlayerTemplate(){
    let spawnLoc = this.getSpawnLocation();
    if(PartyManager.Player){
      return PartyManager.Player;
    }else{
      let pTPL = new GFFObject();

      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'Appearance_Type') ).SetValue(GameKey == 'TSL' ? 134 : 177);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.CEXOLOCSTRING, 'FirstName') ).SetValue(GameKey == 'TSL' ? 'Leia Organa' : 'Galen Urso');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.INT, 'Age') ).SetValue(0);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.SHORT, 'ArmorClass') ).SetValue(10);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'BodyBag') ).SetValue(0);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'ChallengeRating') ).SetValue(0);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'FactionID') ).SetValue(0);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'PortraitId') ).SetValue(26);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'HitPoints') ).SetValue(100);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'MaxHitPoints') ).SetValue(100);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'CurrentHitPoints') ).SetValue(70);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'ForcePoints') ).SetValue(15);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'MaxForcePoints') ).SetValue(15);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'Commandable') ).SetValue(1);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'CurrentForce') ).SetValue(10);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'DeadSelectable') ).SetValue(1);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'DetectMode') ).SetValue(1);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'Disarmable') ).SetValue(1);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'IsDestroyable') ).SetValue(1);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'IsPC') ).SetValue(1);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'IsRaiseable') ).SetValue(1);
      let equipment = pTPL.RootNode.AddField( new Field(GFFDataTypes.LIST, 'Equip_ItemList') );
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptAttacked') ).SetValue('k_hen_attacked01');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptDamaged') ).SetValue('k_def_damage01');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptDeath') ).SetValue('');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptDialogue') ).SetValue('k_hen_dialogue01');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptDisturbed') ).SetValue('');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptEndDialogu') ).SetValue('');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptEndRound') ).SetValue('k_hen_combend01');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptHeartbeat') ).SetValue('k_hen_heartbt01');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptOnBlocked') ).SetValue('k_def_blocked01');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptOnNotice') ).SetValue('k_hen_percept01');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptRested') ).SetValue('');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptSpawn') ).SetValue('k_hen_spawn01');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptSpellAt') ).SetValue('k_def_spellat01');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptUserDefine') ).SetValue('k_def_userdef01');
  
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'GoodEvil') ).SetValue(50);
  
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'NaturalAC') ).SetValue(0);
  
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Con') ).SetValue(10);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Dex') ).SetValue(14);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Str') ).SetValue(10);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Wis') ).SetValue(10);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Cha') ).SetValue(10);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Int') ).SetValue(10);
  
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'fortbonus') ).SetValue(0);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'refbonus') ).SetValue(0);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'willbonus') ).SetValue(0);
  
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'PerceptionRange') ).SetValue(12);

      let classList = pTPL.RootNode.AddField( new Field(GFFDataTypes.LIST, 'ClassList') );
      for(let i = 0; i < 1; i++){
        let _class = new Struct();
        _class.AddField( new Field(GFFDataTypes.INT, 'Class') ).SetValue(0);
        _class.AddField( new Field(GFFDataTypes.SHORT, 'ClassLevel') ).SetValue(1);
        classList.AddChildStruct(_class);
      }
  
      let skillList = pTPL.RootNode.AddField( new Field(GFFDataTypes.LIST, 'SkillList') );
  
      for(let i = 0; i < 8; i++){
        let _skill = new Struct();
        _skill.AddField( new Field(GFFDataTypes.RESREF, 'Rank') ).SetValue(0);
        skillList.AddChildStruct(_skill);
      }
  
      let armorStruct = new Struct(UTCObject.SLOT.ARMOR);
      armorStruct.AddField( new Field(GFFDataTypes.RESREF, 'EquippedRes') ).SetValue('g_a_jedirobe01');
      let rhStruct = new Struct(UTCObject.SLOT.RIGHTHAND);
      rhStruct.AddField( new Field(GFFDataTypes.RESREF, 'EquippedRes') ).SetValue('g_w_lghtsbr01');
  
      equipment.AddChildStruct( armorStruct );
      equipment.AddChildStruct( rhStruct );
  
      // SoundSetFile
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'SoundSetFile') ).SetValue(85);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Race') ).SetValue(6);
  
      /*pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'XPosition') ).SetValue(spawnLoc.XPosition);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'YPosition') ).SetValue(spawnLoc.YPosition);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'ZPosition') ).SetValue(spawnLoc.ZPosition);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'XOrientation') ).SetValue(spawnLoc.XOrientation);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'YOrientation') ).SetValue(spawnLoc.YOrientation);*/
      PartyManager.Player = pTPL;
      PartyManager.Player.json = PartyManager.Player.ToJSON();
      return pTPL;
    }
  }

  loadMGPlayer( onLoad = null ){

    if(this.area.MiniGame){

      console.log('Loading MG Player')
      let player = this.area.MiniGame.Player;
      player.partyID = -1;
      PartyManager.party.push(player);
      player.Load( () => {
        player.LoadScripts( () => {
          player.LoadCamera( () => {
            player.LoadModel( (model) => {
              player.LoadGunBanks( () => {
                let track = Game.module.area.tracks.find(o => o.track === player.track);
                /*let spawnLoc = this.getSpawnLocation();
      
                model.translateX(spawnLoc.XPosition);
                model.translateY(spawnLoc.YPosition);
                model.translateZ(spawnLoc.ZPosition + 1);*/
                
                model.moduleObject = player;
                //model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation));
                //model.buildSkeleton();
                model.hasCollision = true;
                //track.model.getObjectByName('modelhook').add( model );
                //Game.group.party.add( track.model );

                player.setTrack(track.model);

                /*player.model = track.model;
                player.position = player.model.position;
                player.rotation = player.model.rotation;
                player.quaternion = player.model.quaternion;*/
      
                player.getCurrentRoom();
                player.computeBoundingBox();
      
                if(typeof onLoad === 'function')
                  onLoad();

              });
            });
          });
        });
      });

    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  loadPlayer( onLoad = null ){

    console.log('Loading Player')

    if(Game.player instanceof ModuleObject){
      Game.player.partyID = -1;
      if(!this.area.MiniGame)
        PartyManager.party.push(Game.player);

      //Reset the players actions between modules
      Game.player.clearAllActions();
      Game.player.force = 0;
      Game.player.animState = ModuleCreature.AnimState.IDLE;

      Game.player.Load( () => {
        if(GameKey == 'TSL'){
          Game.player.appearance = 134;
          Game.player.gender = 1;
          Game.player.portrait = 10;
        }
        Game.player.LoadScripts( () => {
          Game.player.LoadModel( (model) => {
            Game.player.model = model;
            let spawnLoc = this.getSpawnLocation();
            Game.player.position.x = spawnLoc.XPosition;
            Game.player.position.y = spawnLoc.YPosition;
            Game.player.position.z = spawnLoc.ZPosition;
            Game.player.setFacing(-Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation), true);

            //Game.player.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation));
            //Game.player.setFacing(Game.player.rotation.z);

            //Game.player.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation));
            Game.player.computeBoundingBox();
            Game.player.model.hasCollision = true;

            if(!this.area.MiniGame)
              Game.group.party.add( model );

            Game.player.getCurrentRoom();

            if(typeof onLoad === 'function')
              onLoad();
          });
        });
      });
    }else{
      let player = new ModuleCreature(this.getPlayerTemplate());
      player.partyID = -1;
      if(!this.area.MiniGame)
        PartyManager.party.push(player);

      
      player.Load( () => {
        if(GameKey == 'TSL'){
          player.appearance = 134;
          player.gender = 1;
          player.portrait = 10;
        }
        player.LoadScripts( () => {
          player.LoadModel( (model) => {
  
            let spawnLoc = this.getSpawnLocation();
  
            player.position.x = spawnLoc.XPosition;
            player.position.y = spawnLoc.YPosition;
            player.position.z = spawnLoc.ZPosition;
            player.setFacing(-Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation), true);
            //player.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation));
            player.computeBoundingBox();
            model.moduleObject = player;
            model.hasCollision = true;

            if(!this.area.MiniGame)
              Game.group.party.add( model );

            Game.player = player;
  
            player.getCurrentRoom();
  
            if(typeof onLoad === 'function')
              onLoad();
          });
        });
      });
    }

  }

  loadMGTracks( onLoad = null, i = 0 ){

    if(this.area.MiniGame){
      let loop = new AsyncLoop({
        array: this.area.tracks,
        onLoop: (track, asyncLoop) => {
          console.log('Loading MG Track', track);
          track.Load( () => {
            track.LoadModel( (model) => {
              console.log(model);
              model.moduleObject = track;
              //model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation));
              //model.buildSkeleton();
              model.hasCollision = true;
              Game.group.creatures.add( model );
    
              track.computeBoundingBox();
              track.getCurrentRoom();
              asyncLoop._Loop();
            });
          });
        }
      });
      loop.Begin(() => {
        if(typeof onLoad === 'function')
          onLoad();
      });
    }else if(typeof onLoad === 'function')
      onLoad();

  }

  loadMGEnemies( onLoad = null, i = 0 ){
    
    if(this.area.MiniGame){
      let loop = new AsyncLoop({
        array: this.area.MiniGame.Enemies,
        onLoop: (enemy, asyncLoop) => {
          console.log('Loading MG Enemy', enemy);
          enemy.Load( () => {
            enemy.LoadScripts( () => {
              enemy.LoadModel( (model) => {
                enemy.LoadGunBanks( () => {
                  let track = Game.module.area.tracks.find(o => o.track === enemy.track);
                  model.moduleObject = enemy;
                  model.hasCollision = true;
                  enemy.setTrack(track.model);
                  enemy.computeBoundingBox();
                  enemy.getCurrentRoom();
                  asyncLoop._Loop();

                });
              });
            });
          });
        }
      });
      loop.Begin(() => {
        if(typeof onLoad === 'function')
          onLoad();
      });
    }else if(typeof onLoad === 'function')
      onLoad();

  }

  loadParty( onLoad = null, i = 0 ){

    console.log('Loading Party Member')
    if(i < PartyManager.CurrentMembers.length){
      PartyManager.LoadPartyMember(i, () => {
        process.nextTick( () => {
          this.loadParty( onLoad, ++i );
        })
      });
    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  loadDoors( onLoad = null, i = 0) {
    //console.log('load doors');
    if(i < this.area.doors.length){
      let door = this.area.doors[i];
      door.Load( () => {
        door.LoadModel( (model) => {
          door.LoadWalkmesh(model.name, (dwk) => {

            door.position.x = door.getX();
            door.position.y = door.getY();
            door.position.z = door.getZ();
            model.rotation.set(0, 0, door.getBearing());
            door.computeBoundingBox();

            try{
              
              model.walkmesh = dwk;
              door.walkmesh = dwk;
              Game.walkmeshList.push( dwk.mesh );

              Game.scene.add(dwk.mesh);
              dwk.mesh.position.copy(model.getWorldPosition());
              dwk.mesh.quaternion.copy(model.getWorldQuaternion());

              if(door.openState){
                if(door.walkmesh && door.walkmesh.mesh){
                  if(Game.octree_walkmesh.objectsMap[door.walkmesh.mesh.uuid] == door.walkmesh.mesh){
                    Game.octree_walkmesh.remove(door.walkmesh.mesh)
                  }
                }
                door.model.playAnimation('opened1', true);
              }else{
                Game.octree_walkmesh.add( dwk.mesh, {useFaces: true} );
              }

            }catch(e){
              console.error('Failed to add dwk', model.name, pwk);
            }

            door.getCurrentRoom();

            Game.group.doors.add( model );

            this.loadDoors( onLoad, ++i );

          });
        });
      });

    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  loadPlaceables( onLoad = null, i = 0 ){

    if(i < this.area.placeables.length){
      //console.log('i', i, this.area.placeables.length);
      let plc = this.area.placeables[i];
      plc.Load( () => {
        plc.LoadModel( (model) => {
          plc.LoadWalkmesh(model.name, (pwk) => {
            //console.log('loaded', modelName);
            
            model.translateX(plc.getX());
            model.translateY(plc.getY());
            model.translateZ(plc.getZ());
            model.rotation.set(0, 0, plc.getBearing());

            Game.group.placeables.add( model );

            plc.computeBoundingBox();

            try{
              if(pwk.model instanceof THREE.Object3D)
                model.add(pwk.model);
                
              model.walkmesh = pwk;
              Game.walkmeshList.push(pwk.mesh);
              Game.octree_walkmesh.add( pwk.mesh, {useFaces: true} );
              Game.octree_walkmesh.rebuild();
            }catch(e){
              console.error('Failed to add pwk', model.name, pwk);
            }

            plc.getCurrentRoom();

            process.nextTick( () => {
              this.loadPlaceables( onLoad, ++i );
            })
          });
        });
      });

    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  loadWaypoints( onLoad = null, i = 0 ){

    if(i < this.area.waypoints.length){
      let waypnt = this.area.waypoints[i];
      //console.log('wli', i, this.area.waypoints.length);
      
      waypnt.Load( () => {
        //template.LoadModel( (mesh) => {

          /*template.mesh.position.set(waypnt.props.XPosition, waypnt.props.YPosition, waypnt.props.ZPosition);
          template.mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(waypnt.props['XOrientation'], waypnt.props['YOrientation']));

          template.mesh.moduleObject = waypnt;
          Game.group.waypoints.add(template.mesh);*/

          let wpObj = new THREE.Object3D();
          wpObj.name = waypnt.getTag();
          wpObj.position.set(waypnt.getXPosition(), waypnt.getYPosition(), waypnt.getZPosition());
          wpObj.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), Math.atan2(-waypnt.getYOrientation(), -waypnt.getXOrientation()));
          waypnt.rotation.z = Math.atan2(-waypnt.getYOrientation(), -waypnt.getXOrientation()) + Math.PI/2;
          Game.group.waypoints.add(wpObj);

          let _distance = 1000000000;
          let _currentRoom = null;
          for(let i = 0; i < Game.group.rooms.children.length; i++){
            let room = Game.group.rooms.children[i];
            if(room instanceof THREE.AuroraModel){
              let pos = wpObj.position.clone();
              if(room.box.containsPoint(pos)){
                let roomCenter = room.box.getCenter().clone();
                let distance = pos.distanceTo(roomCenter);
                if(distance < _distance){
                  _distance = distance;
                  _currentRoom = room;
                }
              }
            }
          }
          wpObj.area = _currentRoom;

          process.nextTick( () => {
            this.loadWaypoints( onLoad, ++i );
          })
        //});
      });

    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  loadTriggers( onLoad = null, i = 0 ){

    if(i < this.area.triggers.length){
      let trig = this.area.triggers[i];
      //console.log('tli', i, this.area.triggers.length);
      trig.InitProperties();
      trig.Load( () => {

        let _distance = 1000000000;
        let _currentRoom = null;
        for(let i = 0; i < Game.group.rooms.children.length; i++){
          let room = Game.group.rooms.children[i];
          if(room instanceof THREE.AuroraModel){
            let pos = trig.mesh.position.clone();
            if(room.box.containsPoint(pos)){
              let roomCenter = room.box.getCenter().clone();
              let distance = pos.distanceTo(roomCenter);
              if(distance < _distance){
                _distance = distance;
                _currentRoom = room;
              }
            }
          }
        }
        trig.mesh.area = _currentRoom;

        process.nextTick( () => {
          this.loadTriggers( onLoad, ++i );
        })

      });

    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  loadCreatures( onLoad = null, i = 0 ){

    console.log('Loading Creature')

    if(i < this.area.creatures.length){
      //console.log('cli', i, this.area.creatures.length);
      
      let crt = this.area.creatures[i];
      crt.Load( () => {
        crt.LoadScripts( () => {
          crt.LoadModel( (model) => {
            
            crt.model.moduleObject = crt;
            crt.position.x = (crt.getXPosition());
            crt.position.y = (crt.getYPosition());
            crt.position.z = (crt.getZPosition());

            
            //crt.setFacing(Math.atan2(crt.getXOrientation(), crt.getYOrientation()) + Math.PI/2, true);
            
            crt.setFacing(-Math.atan2(crt.getXOrientation(), crt.getYOrientation()), true);

            model.hasCollision = true;
            model.name = crt.getTag();
            //try{ model.buildSkeleton(); }catch(e){}
            Game.group.creatures.add( model );

            crt.getCurrentRoom();

            process.nextTick( () => {
              this.loadCreatures( onLoad, ++i );
            })
          });
        });
      });

    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  loadRooms( onLoad = null, i = 0 ){

    console.log('Loading Rooms')

    //console.log('Rooms:', this.rooms);

    if( i < this.rooms.length ){
      let room = this.rooms[i];

      room.load( (room) => {
        if(room.model instanceof THREE.AuroraModel){
          if(room.walkmesh instanceof AuroraWalkMesh){
            
            Game.walkmeshList.push( room.walkmesh.mesh );
            Game.octree_walkmesh.add( room.walkmesh.mesh, {useFaces: true} );
            Game.scene.add( room.walkmesh.mesh );

          }

          if(typeof room.model.walkmesh != 'undefined'){
            Game.collisionList.push(room.model.walkmesh);
          }
          
          room.model.translateX(room.room['x']);
          room.model.translateY(room.room['y']);
          room.model.translateZ(room.room['z']);
          room.model.moduleObject = room;
          room.model.name = room.room['RoomName'];
          Game.group.rooms.add(room.model);

          room.computeBoundingBox();
          if(room.model.animations.length){

            for(let animI = 0; animI < room.model.animations.length; animI++){
              if(room.model.animations[animI].name.indexOf('animloop') >= 0){
                room.model.animLoops.push(
                  room.model.animations[animI]
                );
              }
            }
          }
        }
        process.nextTick( () => {
          this.loadRooms( onLoad, ++i );
        })
      });
    }else{

      for(let j = 0; j < this.rooms.length; j++){
        this.rooms[j].link_rooms(this.rooms);
      }

      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  //This function is responsible for generating the grass for the current module.
  //I already see a lot of room for improvement here. The shader code will need to be moved to seprate shader files
  //to be pulled in at startup somehow. 
  loadGrass( onLoad = null ){

    let vertexShader = `
    //precision highp float; //Already defined in shader code
    //uniform mat4 modelViewMatrix; //Already defined in shader code
    //uniform mat4 projectionMatrix; //Already defined in shader code
    uniform float time;
    uniform float windPower;
    uniform vec3 playerPosition;
    uniform float alphaTest;
    //attribute vec3 position; //Already defined in shader code
    attribute vec3 offset;
    //attribute vec2 uv; //Already defined in shader code
    attribute vec2 uv2;
    attribute vec2 uv3;
    attribute vec2 uv4;
    attribute vec4 orientation;
    attribute float constraint;
    attribute vec4 grassUV;
    attribute float quadIdx;
    varying vec2 vUv;
    varying float vVi;
    varying float dist;
    varying float distCulled;

    ${THREE.ShaderChunk['fog_pars_vertex']}

    // http://www.geeks3d.com/20141201/how-to-rotate-a-vertex-by-a-quaternion-in-glsl/
    vec3 applyQuaternionToVector( vec4 q, vec3 v ){
      return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
    }

    void main() {
      float wind = constraint * windPower * ( cos(time) * 0.1 );
        
      vec3 vPosition = applyQuaternionToVector( orientation, position );
      vec3 newPos = offset + vPosition - vec3(0.5, 0.5, 0.0);

      vec3 windOffset = vec3(cos(wind), sin(wind), 0.0);

      dist = distance(vec2(playerPosition), vec2(offset));
      float radius = 1.0;

      vec3 trample = vec3(0.0, 0.0, 0.0);

      if(constraint == 1.0){
        
        if(dist < radius){
          vec3 collisionVector = playerPosition - offset;
          float strength = dist/radius;
          trample.x = collisionVector.x * (1.0 - strength);
          trample.y = collisionVector.y * (1.0 - strength);
          trample.z = -strength;
        }

      }

      float texIndex = grassUV.x;
      vVi = texIndex;

      if(quadIdx == 0.0){
        texIndex = grassUV.x;
      }else if(quadIdx == 1.0){
        texIndex = grassUV.y;
      }else if(quadIdx == 2.0){
        texIndex = grassUV.z;
      }else{
        texIndex = grassUV.w;
      }
      
      if(texIndex == 0.0){
        vUv = uv;
      }else if(texIndex == 1.0){
        vUv = uv4;
      }else if(texIndex == 2.0){
        vUv = uv3;
      }else{
        vUv = uv2;
      }

      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos + windOffset, 1.0);
    }`;

    

    let fragmentShader = `
    precision highp float;
    uniform sampler2D map;
    uniform vec3 ambientColor;
    uniform float alphaTest;
    varying vec2 vUv;
    varying float vVi;
    varying float dist;
    varying float distCulled;

    ${THREE.ShaderChunk[ "common" ]}
    ${THREE.ShaderChunk[ "fog_pars_fragment" ]}

    void main() {

      vec4 textureColor = texture2D(map, vUv);

      if (textureColor[3] < alphaTest) {
        discard;
      } else {
        gl_FragColor = textureColor;// * vec4(ambientColor, 1.0);
        ${THREE.ShaderChunk[ "fog_fragment" ]}
      }

    }`;

    this.grassMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge( [
        THREE.UniformsLib[ "fog" ],
        {
          map: { value: null },
          time: { value: 0 },
          ambientColor: { value: new THREE.Color().setHex('0x'+(this.area.SunFogColor).toString(16)) },
          windPower: { value: Game.module.area.WindPower },
          playerPosition: { value: new THREE.Vector3 },
          alphaTest: { value: this.area.AlphaTest }
        }
      ]),
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      color: new THREE.Color( 1, 1, 1 ),
      side: THREE.DoubleSide,
      transparent: false,
      fog: true,
      //blending: 5
    });

    this.grassMaterial.defines.USE_FOG = '';

    let getRandomGrassSpriteIndex = function(){
      let rnd = Math.random();
      if(rnd < Game.module.area.Grass.Prob_UL){
        return 0;
      }else if(rnd < Game.module.area.Grass.Prob_UL + Game.module.area.Grass.Prob_UR){
        return 1;
      }else if(rnd < Game.module.area.Grass.Prob_UL + Game.module.area.Grass.Prob_UR + Game.module.area.Grass.Prob_LL){
        return 2;
      }else{
        return 3;
      }
    };

    if(this.area.Grass.TexName){

      //Load in the grass texture
      TextureLoader.Load(this.area.Grass.TexName, (grassTexture) => {
        this.grassMaterial.uniforms.map.value = grassTexture;
        this.grassMaterial.uniformsNeedUpdate = true;
        this.grassMaterial.needsUpdate = true;
      });

      //Build the grass instance
      let grassGeometry = new THREE.Geometry();

      let uvs_array = [
        [], [], [], []
      ]
      
      for(let i = 0; i < 4; i++){
        let blade = new THREE.PlaneGeometry(this.area.Grass.QuadSize, this.area.Grass.QuadSize, 1);
        
        let uv1 = new THREE.Vector2(0, 0);
        let uv2 = new THREE.Vector2(1, 1);

        for(let j = 0; j < 4; j++){

          switch(j){
            case 1:
              uv1.set(0.5, 0);
              uv2.set(1, 0.5);
            break;
            case 2: 
              uv1.set(0, 0.5);
              uv2.set(0.5, 1);
            break;
            case 3:
              uv1.set(0.5, 0.5);
              uv2.set(1, 1);
            break;
            default:
              uv1.set(0, 0);
              uv2.set(0.5, 0.5);
            break;
          }

          let faceUV1 = [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()];
          let faceUV2 = [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()];

          faceUV1[ 0 ].set( uv1.x, uv2.y );
          faceUV1[ 1 ].set( uv1.x, uv1.y );
          faceUV1[ 2 ].set( uv2.x, uv2.y );
          faceUV2[ 0 ].set( uv1.x, uv1.y );
          faceUV2[ 1 ].set( uv2.x, uv1.y );
          faceUV2[ 2 ].set( uv2.x, uv2.y );

          uvs_array[j].push(faceUV1[0]);
          uvs_array[j].push(faceUV1[1]);
          uvs_array[j].push(faceUV1[2]);
          uvs_array[j].push(faceUV2[0]);
          uvs_array[j].push(faceUV2[1]);
          uvs_array[j].push(faceUV2[2]);

        }
        
        blade.rotateX(Math.PI/2);
        blade.rotateZ(Math.PI/4 * i);
        
        grassGeometry.merge(blade, new THREE.Matrix4());
        blade.dispose();
      }

      //Convert the geometry object to a BufferGeometry instance
      grassGeometry = new THREE.BufferGeometry().fromGeometry(grassGeometry);

      //The constraint array is a per vertex array to determine if the current vertex in the vertex shader
      //can be affected by wind. 1 = Wind 0 = No Wind
      let constraint = new Float32Array([
        1, 0, 1, 0, 0, 1,
        1, 0, 1, 0, 0, 1,
        1, 0, 1, 0, 0, 1,
        1, 0, 1, 0, 0, 1
      ]);
      grassGeometry.addAttribute('constraint', new THREE.BufferAttribute( constraint, 1) );

      //QuadIdx is used to track the current quad index inside the vertex shader
      let quadIdx = new Float32Array([
        0, 0, 0, 0, 0, 0,
        1, 1, 1, 1, 1, 1,
        2, 2, 2, 2, 2, 2,
        3, 3, 3, 3, 3, 3,
      ]);
      grassGeometry.addAttribute('quadIdx', new THREE.BufferAttribute( quadIdx, 1) );
      
      let geometry = new THREE.InstancedBufferGeometry();
      geometry.index = grassGeometry.index;
      geometry.attributes.position = grassGeometry.attributes.position;
      geometry.attributes.constraint = grassGeometry.attributes.constraint;
      geometry.attributes.quadIdx = grassGeometry.attributes.quadIdx;

      for(let i = 0; i < 4; i++){
        let uvs = new Float32Array( uvs_array[i].length * 2 );
        switch(i){
          case 1:
          case 2:
          case 3:
            grassGeometry.addAttribute( 'uv'+(i+1), new THREE.BufferAttribute( uvs, 2 ).copyVector2sArray( uvs_array[i] ) );
          break;
          default:
            grassGeometry.addAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ).copyVector2sArray( uvs_array[i] ) );
          break;
        }
      }

      geometry.attributes.uv = grassGeometry.attributes.uv;
      geometry.attributes.uv2 = grassGeometry.attributes.uv2;
      geometry.attributes.uv3 = grassGeometry.attributes.uv3;
      geometry.attributes.uv4 = grassGeometry.attributes.uv4;

      // per instance data
      let offsets = [];
      //let offsetsVec3 = [];
      let orientations = [];
      let grassUVs = [];
      let vector = new THREE.Vector4();

      this.grassInstances = [];

      let density = this.area.Grass.Density;

      let rLen = this.rooms.length;
      for(let i = 0; i < rLen; i++){
        let room = this.rooms[i];
        if(room.model.wok instanceof AuroraWalkMesh){
          if(room.model.wok.grassFaces.length){
            for(let i = 0; i < room.model.wok.grassFaces.length; i++){
              let face = room.model.wok.grassFaces[i];
  
              //FACE A
              let FA = room.model.wok.vertices[face.a];
              //FACE B
              let FB = room.model.wok.vertices[face.b];
              //FACE C
              let FC = room.model.wok.vertices[face.c];
  
              let triangle = new THREE.Triangle(FA,FB,FC);
              let area = triangle.getArea();
              let grassCount = ((area) * density)*.25;
  
              if(grassCount < 1){
                grassCount = 1;
              }

              let quadOffsetZ = Game.module.area.Grass.QuadSize/2;
  
              for(let j = 0; j < grassCount; j++){

                let instance = {
                  position: {x: 0, y: 0, z: 0},
                  orientation: {x: 0, y: 0, z: 0, w: 0},
                  uvs: {uv1: getRandomGrassSpriteIndex(), uv2: getRandomGrassSpriteIndex(), uv3: getRandomGrassSpriteIndex(), uv4: getRandomGrassSpriteIndex()}
                };
  
                // offsets
                let a = Math.random();
                let b = Math.random();
  
                if (a + b > 1) {
                  a = 1 - a;
                  b = 1 - b;
                }
  
                let c = 1 - a - b;
  
                vector.x = (a * FA.x) + (b * FB.x) + (c * FC.x);
                vector.y = (a * FA.y) + (b * FB.y) + (c * FC.y);
                vector.z = (a * FA.z) + (b * FB.z) + (c * FC.z) + quadOffsetZ;

                instance.position = {x: vector.x, y: vector.y, z: vector.z};
  
                // orientations
                let r = Math.floor(Math.random() * 360) + 0;
                let c1 = Math.cos( 0 / 2 );
                let c2 = Math.cos( 0 / 2 );
                let c3 = Math.cos( r / 2 );
  
                let s1 = Math.sin( 0 / 2 );
                let s2 = Math.sin( 0 / 2 );
                let s3 = Math.sin( r / 2 );
  
                vector.x = s1 * c2 * c3 + c1 * s2 * s3;
                vector.y = c1 * s2 * c3 - s1 * c2 * s3;
                vector.z = c1 * c2 * s3 + s1 * s2 * c3;
                vector.w = c1 * c2 * c3 - s1 * s2 * s3;
                
                instance.orientation = {x: vector.x, y: vector.y, z: vector.z, w: vector.w};

                this.grassInstances.push(instance);

              }
            }
          }
        }
      }

      let origin = new THREE.Vector3(0, 0, 0);
      this.grassInstances.sort( (a, b) => {
        let distA = origin.distanceTo(a.position);
        let distB = origin.distanceTo(b.position);
        return distA - distB;
      });

      for(let i = 0, il = this.grassInstances.length; i < il; i++){
        let instance = this.grassInstances[i];
        offsets.push( instance.position.x, instance.position.y, instance.position.z );
        orientations.push(instance.orientation.x, instance.orientation.y, instance.orientation.z, instance.orientation.w);
        grassUVs.push(instance.uvs.uv1, instance.uvs.uv2, instance.uvs.uv3, instance.uvs.uv4);
      }

      let offsetAttribute = new THREE.InstancedBufferAttribute( new Float32Array( offsets ), 3 ).setDynamic( true );
      let orientationAttribute = new THREE.InstancedBufferAttribute( new Float32Array( orientations ), 4 ).setDynamic( true );
      let grassUVAttribute = new THREE.InstancedBufferAttribute( new Float32Array( grassUVs ), 4 ).setDynamic( true );
      geometry.addAttribute( 'offset', offsetAttribute );
      geometry.addAttribute( 'orientation', orientationAttribute );
      geometry.addAttribute( 'grassUV', grassUVAttribute );
      //this.grassOffsets = offsetsVec3;
      this.grassMesh = new THREE.Mesh( geometry, Game.module.grassMaterial );
      this.grassMesh.frustumCulled = false;
      Game.group.grass.add(this.grassMesh);
    }

    if(typeof onLoad === 'function')
      onLoad();

  }

  loadSoundTemplates ( onLoad = null, i = 0 ){

    console.log('Loading Sound Emitter')

    if(i < this.area.sounds.length){
      let snd = this.area.sounds[i];
      snd.Load( () => {
        snd.LoadSound( () => {
          process.nextTick( () => {
            this.loadSoundTemplates( onLoad, ++i );
          });
        });
      });
    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  loadAudio( onLoad = null ){

    let ambientDay = Global.kotor2DA['ambientsound'].rows[this.area.audio.AmbientSndDay].resource;

    AudioLoader.LoadAmbientSound(ambientDay, (data) => {
      //console.log('Loaded Ambient Sound', ambientDay);
      Game.audioEngine.SetAmbientSound(data);

      let bgMusic = Global.kotor2DA['ambientmusic'].rows[this.area.audio.MusicDay].resource;

      AudioLoader.LoadMusic(bgMusic, (data) => {
        //console.log('Loaded Background Music', bgMusic);
        Game.audioEngine.SetBackgroundMusic(data);
        if(typeof onLoad === 'function')
          onLoad();

      }, () => {
        console.error('Background Music not found', bgMusic);
        if(typeof onLoad === 'function')
          onLoad();
      });

    }, () => {
      console.error('Ambient Audio not found', ambientDay);
      if(typeof onLoad === 'function')
        onLoad();
    });

  }

  loadTextures( onLoad = null){
    TextureLoader.LoadQueue(() => {
      if(typeof onLoad === 'function')
        onLoad();
    }, (texName) => {
      
    });
  }

  getCameraStyle(){
    return Global.kotor2DA["camerastyle"].rows[this.area.CameraStyle];
  }

  static GetModuleRim(modName = '', onLoad = null){
    
    if(Game.SaveGame){
      if(Game.SaveGame.IsModuleSaved(modName)){
        Game.SaveGame.GetModuleRim(modName, (rim) => {
          //console.log('HI2', rim);
          if(typeof onLoad === 'function')
            onLoad(rim);
        });
      }else{
        new RIMObject(path.join(Config.options.Games[GameKey].Location, 'modules', modName+'.rim'), (rim) => {
          if(typeof onLoad === 'function')
            onLoad(rim);
        });
      }
    }else{
      new RIMObject(path.join(Config.options.Games[GameKey].Location, 'modules', modName+'.rim'), (rim) => {
        if(typeof onLoad === 'function')
          onLoad(rim);
      });
    }

  }

  static GetModuleArchives(modName = '', onLoad = null){
    let archives = [];
    Module.GetModuleRim(modName, (rim) => {
      archives.push(rim);
      let _rim_s = path.join(Config.options.Games[GameKey].Location, 'modules', modName+'_s.rim');
      new RIMObject(_rim_s, (rim_s) => {
        archives.push(rim_s);

        //localization.mod
        fs.exists(path.join(Config.options.Games[GameKey].Location, 'lips', 'localization.mod'), (dirExists) => {
          if(dirExists){
    
            let mod_loc = new ERFObject( path.join(Config.options.Games[GameKey].Location, 'lips', 'localization.mod'), () => {
              archives.push(mod_loc);

              fs.exists( path.join(Config.options.Games[GameKey].Location, 'lips', modName+'_loc.mod'), (dirExists) => {
                if(dirExists){
                  let mod_loc2 = new ERFObject( path.join(Config.options.Games[GameKey].Location, 'lips', modName+'_loc.mod'), () => {
                    archives.push(mod_loc2);
                    if(GameKey == 'TSL'){
                      let _erf_dlg = path.join(Config.options.Games[GameKey].Location, 'modules', modName+'_dlg.erf');
                      let erf_dlg = new ERFObject(_erf_dlg, (dlg) => {
                        archives.push(erf_dlg);
                        if(typeof onLoad == 'function')
                          onLoad(archives);
                      });
                    }else{
                      if(typeof onLoad == 'function')
                        onLoad(archives);
                    }
                  });
                }else{
                  if(GameKey == 'TSL'){
                    let _erf_dlg = path.join(Config.options.Games[GameKey].Location, 'modules', modName+'_dlg.erf');
                    let erf_dlg = new ERFObject(_erf_dlg, (dlg) => {
                      archives.push(erf_dlg);
                      if(typeof onLoad == 'function')
                        onLoad(archives);
                    });
                  }else{
                    if(typeof onLoad == 'function')
                      onLoad(archives);
                  }
                }
              });

            });

          } else {
            fs.exists(path.join(Config.options.Games[GameKey].Location, 'lips', modName+'_loc.mod'), (dirExists) => {
              if(dirExists){
                let mod_loc2 = new ERFObject(path.join(Config.options.Games[GameKey].Location, 'lips', modName+'_loc.mod'), () => {
                  archives.push(mod_loc2);
                  if(GameKey == 'TSL'){
                    let _erf_dlg = path.join(Config.options.Games[GameKey].Location, 'modules', modName+'_dlg.erf');
                    let erf_dlg = new ERFObject(_erf_dlg, (dlg) => {
                      archives.push(erf_dlg);
                      if(typeof onLoad == 'function')
                        onLoad(archives);
                    });
                  }else{
                    if(typeof onLoad == 'function')
                      onLoad(archives);
                  }
                });
              }else{
                if(GameKey == 'TSL'){
                  let _erf_dlg = path.join(Config.options.Games[GameKey].Location, 'modules', modName+'_dlg.erf');
                  let erf_dlg = new ERFObject(_erf_dlg, (dlg) => {
                    archives.push(erf_dlg);
                    if(typeof onLoad == 'function')
                      onLoad(archives);
                  });
                }else{
                  if(typeof onLoad == 'function')
                    onLoad(archives);
                }
              }
            });
          }

        });
        
      });
    });
  }

  static GetLipArchives(modName = '', onLoad = null){

    fs.exists(path.join(Config.options.Games[GameKey].Location, 'lips', 'localization.mod'), (dirExists) => {
      if(dirExists){

        let mod_loc = new ERFObject(path.join(Config.options.Games[GameKey].Location, 'lips', 'localization.mod'), () => {
          archives.push(mod_loc);

          fs.exists(path.join(Config.options.Games[GameKey].Location, 'lips', modName+'_loc.mod'), (dirExists) => {
            if(dirExists){

            }
          });

        });

      }else{
        fs.exists(path.join(Config.options.Games[GameKey].Location, 'lips', modName+'_loc.mod'), (dirExists) => {
          if(dirExists){

          }
        });
      }
    })

  }

  //ex: end_m01aa end_m01aa_s
  static BuildFromExisting(modName = null, waypoint = null, onComplete = null){
    //console.log('BuildFromExisting');
    let module = new Module();
    module.transWP = waypoint;
    Game.module = module;
    if(modName != null){
      try{
        Module.GetModuleArchives(modName, (archives) => {
          Game.module.archives = archives;

          ResourceLoader.loadResource(ResourceTypes['ifo'], 'module', (ifo_data) => {
            
            new GFFObject(ifo_data, (gff, rootNode) => {
              
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
              module.Mod_Description = gff.GetFieldByLabel('Mod_Description').GetValue();
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
              module.scripts.OnAcquirItem = gff.GetFieldByLabel('Mod_OnAcquirItem').GetValue();
              module.scripts.OnActvtItem = gff.GetFieldByLabel('Mod_OnActvtItem').GetValue();
              module.scripts.OnClientEntr = gff.GetFieldByLabel('Mod_OnClientEntr').GetValue();
              module.scripts.OnClientLeav = gff.GetFieldByLabel('Mod_OnClientLeav').GetValue();
              module.scripts.OnHeartbeat = gff.GetFieldByLabel('Mod_OnHeartbeat').GetValue();
              module.scripts.OnModLoad = gff.GetFieldByLabel('Mod_OnModLoad').GetValue();
              module.scripts.OnModStart = gff.GetFieldByLabel('Mod_OnModStart').GetValue();
              module.scripts.OnPlrDeath = gff.GetFieldByLabel('Mod_OnPlrDeath').GetValue();
              module.scripts.OnPlrDying = gff.GetFieldByLabel('Mod_OnPlrDying').GetValue();
              module.scripts.OnPlrLvlUp = gff.GetFieldByLabel('Mod_OnPlrLvlUp').GetValue();
              module.scripts.OnPlrRest = gff.GetFieldByLabel('Mod_OnPlrRest').GetValue();
              module.scripts.OnSpawnBtnDn = gff.GetFieldByLabel('Mod_OnSpawnBtnDn').GetValue();
              module.scripts.OnUnAqreItem = gff.GetFieldByLabel('Mod_OnUnAqreItem').GetValue();
              module.scripts.OnUsrDefined = gff.GetFieldByLabel('Mod_OnUsrDefined').GetValue();

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
                  ResourceLoader.loadResource(ResourceTypes['are'], module.Mod_Entry_Area, (data) => {
                    new GFFObject(data, (are, rootNode) => {
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
    //console.log('BuildFromExisting');
    let module = new Module();
    module.transWP = null;
    Game.module = module;
    if(directory != null){

      fs.readFile(path.join(directory, 'module.ifo'), (err, ifo_data) => {
        
        new GFFObject(ifo_data, (gff, rootNode) => {
          
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
          module.Mod_Description = gff.GetFieldByLabel('Mod_Description').GetValue();
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
          module.scripts.OnAcquirItem = gff.GetFieldByLabel('Mod_OnAcquirItem').GetValue();
          module.scripts.OnActvtItem = gff.GetFieldByLabel('Mod_OnActvtItem').GetValue();
          module.scripts.OnClientEntr = gff.GetFieldByLabel('Mod_OnClientEntr').GetValue();
          module.scripts.OnClientLeav = gff.GetFieldByLabel('Mod_OnClientLeav').GetValue();
          module.scripts.OnHeartbeat = gff.GetFieldByLabel('Mod_OnHeartbeat').GetValue();
          module.scripts.OnModLoad = gff.GetFieldByLabel('Mod_OnModLoad').GetValue();
          module.scripts.OnModStart = gff.GetFieldByLabel('Mod_OnModStart').GetValue();
          module.scripts.OnPlrDeath = gff.GetFieldByLabel('Mod_OnPlrDeath').GetValue();
          module.scripts.OnPlrDying = gff.GetFieldByLabel('Mod_OnPlrDying').GetValue();
          module.scripts.OnPlrLvlUp = gff.GetFieldByLabel('Mod_OnPlrLvlUp').GetValue();
          module.scripts.OnPlrRest = gff.GetFieldByLabel('Mod_OnPlrRest').GetValue();
          module.scripts.OnSpawnBtnDn = gff.GetFieldByLabel('Mod_OnSpawnBtnDn').GetValue();
          module.scripts.OnUnAqreItem = gff.GetFieldByLabel('Mod_OnUnAqreItem').GetValue();
          module.scripts.OnUsrDefined = gff.GetFieldByLabel('Mod_OnUsrDefined').GetValue();

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

          fs.readFile(path.join(directory, module.Mod_Entry_Area+'.git'), (err, data) => {
            new GFFObject(data, (git, rootNode) => {
              fs.readFile(path.join(directory, module.Mod_Entry_Area+'.are'), (err, data) => {
                new GFFObject(data, (are, rootNode) => {
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

}

module.exports = Module;
