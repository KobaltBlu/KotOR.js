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
      area: {
        AlphaTest: 0.200000002980232,
        CameraStyle: 0,
        ChanceLightning: 0,
        ChanceRain: 0,
        ChanceSnow: 0,
        Comments: '',
        Creator_ID: 0,
        DayNightCycle: 0,
        DefaultEnvMap: '',
        DynAmbientColor: 6312778,
        Expansion_List: [],
        Flags: 1,
        Grass: {
          Ambient: 0,
          Density: 0,
          Diffuse: 0,
          Prob_LL: 0.25,
          Prob_LR: 0.25,
          Prob_UL: 0.25,
          Prob_UR: 0.25,
          QuadSize: 0,
          TexName: ''
        },
        ID: 0,
        IsNight: 0,
        LightingScheme: 0,
        LoadScreenID: 0,
        Map: {
          MapPt1X: 0.0,
          MapPt1Y: 0.0,
          MapPt2X: 0.0,
          MapPt2Y: 0.0,
          MapResX: 0,
          MapZoom: 1,
          NorthAxis: 3,
          WorldPt1X: 0.0,
          WorldPt1Y: 0.0,
          WorldPt2X: 0.0,
          WorldPt2Y: 0.0
        },
        scripts: {
          OnHangBack: '',
          OnRest: '',
          OnEnter: '',
          OnExit: '',
          OnHeartbeat: '',
          OnUserDefined: ''
        }
      }
    });
  }

  loadScene( onLoad = null, onProgress = null ){

    // this.doors = [];
    // this.placeables = [];
    PartyManager.party = [];
    // this.sounds = [];
    // this.stores = [];
    // this.encounters = [];
    // this.triggers = [];
    // this.waypoints = [];
    // this.creatures = [];
    this.rooms = [];

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

    Game.globalLight.color.setHex('0x'+this.area.DynAmbientColor.toString(16));

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
      camera.rotation.x = THREE.Math.degToRad(cam.pitch);
      camera.rotation.y = Math.atan2(cam.orientation.w, cam.orientation.x) * 2;
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
      Game.LoadScreen.setProgress(10);
      this.loadPlaceables( () => {
        Game.LoadScreen.setProgress(20);
        this.loadWaypoints( () => {
          Game.LoadScreen.setProgress(30);
          this.loadCreatures( () => {
            Game.LoadScreen.setProgress(40);
            this.loadSoundTemplates( () => {
              Game.LoadScreen.setProgress(50);
              this.loadTriggers( () => {
                Game.LoadScreen.setProgress(60);
                this.loadMGTracks( () => {
                  this.loadMGPlayer( () => {
                    this.loadMGEnemies( () => {
                      this.loadPlayer( () => {
                        this.loadParty( () => {
                          Game.LoadScreen.setProgress(70);
                          this.loadDoors( () => {
                            Game.LoadScreen.setProgress(80);
                            this.loadTextures( () => {
                              Game.LoadScreen.setProgress(90);
                              this.loadAudio( () => {
                                Game.LoadScreen.setProgress(100);
                                
                                
                                //console.log('Running module onEnter scripts');]
                                

                                

                                Game.isLoadingSave = false;

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
                });
              });
            });
          });
        });
      });
    });

  }

  initScripts(){
    if(this.scripts.OnModLoad != ''){
      ResourceLoader.loadResource(ResourceTypes['ncs'], this.scripts.OnModLoad, (buffer) => {
        let name = this.scripts.OnModLoad;
        
        this.scripts.OnModLoad = new NWScript(buffer);
        this.scripts.OnModLoad.enteringObject = Game.player;
        this.scripts.OnModLoad.name = name;
        this.scripts.OnModLoad.run(Game.module.area);
      });
    }

    if(this.scripts.OnClientEntr != ''){
      ResourceLoader.loadResource(ResourceTypes['ncs'], this.scripts.OnClientEntr, (buffer) => {
        let name = this.scripts.OnClientEntr;
        this.scripts.OnClientEntr = new NWScript(buffer);
        this.scripts.OnClientEntr.enteringObject = Game.player;
        this.scripts.OnClientEntr.name = name;
        this.scripts.OnClientEntr.run(Game.module.area);
      });
    }
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
      pTPL.RootNode.AddField( new Field(GFFDataTypes.INT, 'Age') ).SetValue(0);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.SHORT, 'ArmorClass') ).SetValue(10);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'BodyBag') ).SetValue(0);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'ChallengeRating') ).SetValue(0);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'FactionID') ).SetValue(0);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'PortraitId') ).SetValue(26);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'HitPoints') ).SetValue(25);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'CurrentHitPoints') ).SetValue(20);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'ForcePoints') ).SetValue(15);
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
  
      /*let armorStruct = new Struct(UTCObject.SLOT.ARMOR);
      armorStruct.AddField( new Field(GFFDataTypes.RESREF, 'EquippedRes') ).SetValue('g_a_jedirobe01');
      let rhStruct = new Struct(UTCObject.SLOT.RIGHTHAND);
      rhStruct.AddField( new Field(GFFDataTypes.RESREF, 'EquippedRes') ).SetValue('g_w_lghtsbr01');
  
      equipment.AddChildStruct( armorStruct );
      equipment.AddChildStruct( rhStruct );*/
  
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
                model.box = new THREE.Box3().setFromObject(model);
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
        Game.player.LoadScripts( () => {
          Game.player.LoadModel( (model) => {
            Game.player.model = model;
            let spawnLoc = this.getSpawnLocation();
            Game.player.position.x = spawnLoc.XPosition;
            Game.player.position.y = spawnLoc.YPosition;
            Game.player.position.z = spawnLoc.ZPosition;
            Game.player.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation));
            Game.player.model.box = new THREE.Box3().setFromObject(Game.player.model);
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
        player.LoadScripts( () => {
          player.LoadModel( (model) => {
  
            let spawnLoc = this.getSpawnLocation();
  
            player.position.x = spawnLoc.XPosition;
            player.position.y = spawnLoc.YPosition;
            player.position.z = spawnLoc.ZPosition;
            player.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation));
            model.box = new THREE.Box3().setFromObject(model);
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
              model.box = new THREE.Box3().setFromObject(model);
              model.moduleObject = track;
              //model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation));
              //model.buildSkeleton();
              model.hasCollision = true;
              Game.group.creatures.add( model );
    
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
                  model.box = new THREE.Box3().setFromObject(model);
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

            model.translateX(door.getX());
            model.translateY(door.getY());
            model.translateZ(door.getZ());

            model.rotation.set(0, 0, door.getBearing());
            door.model.box = door.box = new THREE.Box3().setFromObject(door.getModel());
            try{
              
              model.dwk = dwk;
              door.walkmesh = dwk;
              Game.walkmeshList.push( dwk.mesh );

              Game.scene.add(dwk.mesh);
              dwk.mesh.position.copy(model.getWorldPosition());
              dwk.mesh.quaternion.copy(model.getWorldQuaternion());

              Game.octree_walkmesh.add( dwk.mesh, {useFaces: true} );
              

            }catch(e){
              console.error('Failed to add dwk', model.name, pwk);
            }

            //try{ model.buildSkeleton(); }catch(e){}
            model.rebuildEmitters();

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
            try{ 
              //model.buildSkeleton();
              model.rebuildEmitters(); 
            }catch(e){}
            //model.rebuildEmitters();

            Game.group.placeables.add( model );

            try{
              model.add(pwk.model);
              model.pwk = pwk;
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
          wpObj.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(waypnt.getXOrientation(), waypnt.getYOrientation()))
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

        var trigGeom = trig.getGeometry();

        let material = new THREE.MeshBasicMaterial({
          color: new THREE.Color( 0xFFFFFF ),
          side: THREE.DoubleSide
        });
    
        switch(trig.getType()){
          case UTTObject.Type.GENERIC:
            material.color.setHex(0xFF0000)
          break;
          case UTTObject.Type.TRANSITION:
            material.color.setHex(0x00FF00)
          break;
          case UTTObject.Type.TRAP:
            material.color.setHex(0xFFEB00)
          break;
        }

        trig.mesh = new THREE.Mesh( trigGeom, material );
        trig.mesh.position.set(trig.getXPosition(), trig.getYPosition(), trig.getZPosition());

        /*
        Orientation values are wrong in savegames. If rotation is not set they are always placed correctly
        */

        //trig.mesh.rotation.set(trig.getXOrientation(), trig.getYOrientation(), trig.getZOrientation());

        trig.mesh.box = trig.box = new THREE.Box3().setFromObject(trig.mesh);

        trig.mesh.box.min.z -= 100;
        trig.mesh.box.max.z += 100;

        trig.mesh.moduleObject = trig;
        trig.mesh.visible = false;
        Game.group.triggers.add(trig.mesh);

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
            
            model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(crt.getXOrientation(), crt.getYOrientation()));

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

            room.model.wok = room.walkmesh;
            
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

          //room.model.rebuildEmitters();
          //Game.octree.add( this.room );

          room.model.box = new THREE.Box3().setFromObject(room.model);
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

  loadSoundTemplates ( onLoad = null, i = 0 ){

    console.log('Loading Sound Emitter')

    if(i < this.area.sounds.length){
      //console.log('sli', i, this.area.sounds.length);
      
      let snd = this.area.sounds[i];
      snd.Load( () => {
        snd.LoadSound( () => {
          //snd.LoadModel( (mesh) => {

            /*template.mesh.position.set(snd.props.XPosition, snd.props.YPosition, snd.props.ZPosition);
            template.mesh.moduleObject = snd;
            Game.group.sounds.add(template.mesh);*/

            process.nextTick( () => {
              this.loadSoundTemplates( onLoad, ++i );
            })
          //});
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
    });
  }

  //ex: end_m01aa end_m01aa_s
  static BuildFromExisting(modName = null, waypoint = null, onComplete = null){
    //console.log('BuildFromExisting');
    let module = new Module();
    module.transWP = waypoint;
    Game.module = module;
    if(modName != null){

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
        });
      });
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
