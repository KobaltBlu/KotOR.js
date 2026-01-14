import * as KotOR from "../KotOR";
import type { ForgeModule } from "./ForgeModule";
import { AreaMap } from "../../../module/AreaMap";
import { GroupType, type UI3DRenderer } from "../UI3DRenderer";
import { ProjectFileSystem } from "../ProjectFileSystem";
import { ForgeMiniGame } from "./ForgeMiniGame";
import { ForgeCreature } from "./ForgeCreature";
import { ForgeRoom } from "./ForgeRoom";
import { ForgeGameObject } from "./ForgeGameObject";
import { ForgeCamera } from "./ForgeCamera";
import { ForgeDoor } from "./ForgeDoor";
import { ForgeEncounter } from "./ForgeEncounter";
import { ForgePlaceable } from "./ForgePlaceable";
import { ForgeItem } from "./ForgeItem";
import { ForgeSound } from "./ForgeSound";
import { ForgeStore } from "./ForgeStore";
import { ForgeTrigger } from "./ForgeTrigger";
import { ForgeWaypoint } from "./ForgeWaypoint";

export class ForgeArea extends ForgeGameObject{

  git: KotOR.GFFObject;
  are: KotOR.GFFObject;
  layout: KotOR.LYTObject;
  visObject: KotOR.VISObject;

  module: ForgeModule;

  /**
   * ARE Fields
   */

  alphaTest: number = 0.200000002980232;

  cameraStyle: number = 0;

  chanceLightning: number = 0;

  chanceRain: number = 0;

  chanceSnow: number = 0;

  comments: string = '';

  creatorId: number = 0;

  dayNightCycle: boolean = false;

  defaultEnvMap: string = '';

  dynamicAmbientColor: number = 0;

  expansionList: any[] = [];

  flags: number = 0;

  grassAmbient: number = 0;

  grassDensity: number = 0.0;

  grassDiffuse: number = 0;

  grassProbLL: number = 0.0;

  grassProbLR: number = 0.0;

  grassProbUL: number = 0.0;

  grassProbUR: number = 0.0;

  grassQuadSize: number = 0.0;

  grassTexName: string = '';

  id: number = 0;

  isNight: boolean = false;

  lightingScheme: number = 0;

  loadScreenId: number = 0;

  areaMap: AreaMap = new AreaMap();

  modListenCheck: number = 0;

  modSpotCheck: number = 0;

  moonAmbientColor: number = 0;

  moonDiffuseColor: number = 0;

  moonFogColor: number = 0;

  moonFogFar: number = 0.0;

  moonFogNear: number = 0.0;

  moonFogOn: boolean = false;

  moonShadows: boolean = false;

  name: KotOR.CExoLocString = new KotOR.CExoLocString(-1);

  noHangBack: boolean = false;

  noRest: boolean = false;

  onEnter: string = '';

  onExit: string = '';

  onHeartbeat: string = '';

  onUserDefined: string = '';

  playerOnly: boolean = false;

  playerVsPlayer: boolean = false;

  shadowOpacity: number = 0;

  stealthXPEnabled: boolean = false;

  stealthXPLoss: number = 0;

  stealthXPMax: number = 0;

  sunAmbientColor: number = 0;

  sunDiffuseColor: number = 0;

  sunFogColor: number = 0;

  sunFogFar: number = 0.0;

  sunFogNear: number = 0.0;

  sunFogOn: boolean = false;

  sunShadows: boolean = false;

  tag: string = '';

  unescapable: boolean = false;

  version: number = 0;

  windPower: number = 0;

  /**
   * GIT Fields
   */

  areaProperties = {
    ambientSndDay: 0,
    ambientSndDayVol: 0,
    ambientSndNight: 0,
    ambientSndNitVol: 0,
    envAudio: 0,
    musicBattle: 0,
    musicDay: 0,
    musicDelay: 0,
    musicNight: 0,
  }

  miniGame: ForgeMiniGame;
  cameras: ForgeCamera[] = [];
  creatures: ForgeCreature[] = [];
  doors: ForgeDoor[] = [];
  encounters: ForgeEncounter[] = [];
  items: ForgeItem[] = [];
  miniGameList: ForgeMiniGame[] = [];
  placeables: ForgePlaceable[] = [];
  rooms: ForgeRoom[] = [];
  sounds: ForgeSound[] = [];
  stores: ForgeStore[] = [];
  triggers: ForgeTrigger[] = [];
  waypoints: ForgeWaypoint[] = [];
  useTemplate: boolean = true;

  constructor(git: KotOR.GFFObject = new KotOR.GFFObject(), are: KotOR.GFFObject = new KotOR.GFFObject()){
    super();
    this.git = git;
    this.are = are;
  }

  setContext(context: UI3DRenderer){
    this.context = context;
  }

  async load(){
    //BEGIN AREA LOAD

    if(this.are.RootNode.hasField('ObjectId'))
      this.id = this.are.getFieldByLabel('ObjectId').getValue();

    let rooms = this.are.getFieldByLabel('Rooms');

    this.alphaTest = this.are.getFieldByLabel('AlphaTest').getValue();
    this.cameraStyle = this.are.getFieldByLabel('CameraStyle').getValue();
    this.chanceLightning = this.are.getFieldByLabel('ChanceLightning').getValue();
    this.chanceRain = this.are.getFieldByLabel('ChanceRain').getValue();
    this.chanceSnow = this.are.getFieldByLabel('ChanceSnow').getValue();
    this.comments = this.are.getFieldByLabel('Comments').getValue();
    this.creatorId = this.are.getFieldByLabel('Creator_ID').getValue();
    this.dayNightCycle = this.are.getFieldByLabel('DayNightCycle').getValue();
    this.defaultEnvMap = this.are.getFieldByLabel('DefaultEnvMap').getValue();
    this.dynamicAmbientColor = this.are.getFieldByLabel('DynAmbientColor').getValue();
    this.expansionList = [];

    this.flags = this.are.getFieldByLabel('Flags').getValue();
    // this.grass = {
    //   ambient: this.are.getFieldByLabel('Grass_Ambient').getValue(),
    //   density: this.are.getFieldByLabel('Grass_Density').getValue(),
    //   diffuse: this.are.getFieldByLabel('Grass_Diffuse').getValue(),
    //   probability: {
    //     lowerLeft: this.are.getFieldByLabel('Grass_Prob_LL').getValue(),
    //     lowerRight: this.are.getFieldByLabel('Grass_Prob_LR').getValue(),
    //     upperLeft: this.are.getFieldByLabel('Grass_Prob_UL').getValue(),
    //     upperRight: this.are.getFieldByLabel('Grass_Prob_UR').getValue()
    //   },
    //   quadSize: this.are.getFieldByLabel('Grass_QuadSize').getValue(),
    //   textureName: this.are.getFieldByLabel('Grass_TexName').getValue()
    // };

    this.id = this.are.getFieldByLabel('ID').getValue();
    this.isNight = this.are.getFieldByLabel('IsNight').getValue();
    this.lightingScheme = this.are.getFieldByLabel('LightingScheme').getValue();
    this.loadScreenId = this.are.getFieldByLabel('LoadScreenID').getValue();

    let map = this.are.getFieldByLabel('Map').getChildStructs()[0];
    if(map){
      this.areaMap = AreaMap.FromStruct(map) as AreaMap;
    }

    if(this.are.RootNode.hasField('MiniGame')){
      this.miniGame = new ForgeMiniGame(
        this.are.getFieldByLabel('MiniGame').getChildStructs()[0]
      );
    }

    this.modListenCheck = this.are.getFieldByLabel('ModListenCheck').getValue();
    this.modSpotCheck = this.are.getFieldByLabel('ModSpotCheck').getValue();
    this.moonAmbientColor = this.are.getFieldByLabel('MoonAmbientColor').getValue();
    this.moonDiffuseColor = this.are.getFieldByLabel('MoonDiffuseColor').getValue();
    this.moonFogColor = this.are.getFieldByLabel('MoonFogColor').getValue();
    this.moonFogFar = this.are.getFieldByLabel('MoonFogFar').getValue();
    this.moonFogNear = this.are.getFieldByLabel('MoonFogNear').getValue();
    this.moonFogOn = !!this.are.getFieldByLabel('MoonFogOn').getValue();
    this.moonShadows = !!this.are.getFieldByLabel('MoonShadows').getValue();
    this.name = this.are.getFieldByLabel('Name').getCExoLocString();

    this.noHangBack = !!this.are.getFieldByLabel('NoHangBack').getValue();
    this.noRest = !!this.are.getFieldByLabel('NoRest').getValue();

    // if(this.are.RootNode.hasField(ModuleObjectScript.AreaOnEnter)){
    //   this.scriptResRefs.set(ModuleObjectScript.AreaOnEnter, this.are.getFieldByLabel(ModuleObjectScript.AreaOnEnter).getValue());
    // }

    // if(this.are.RootNode.hasField(ModuleObjectScript.AreaOnExit)){
    //   this.scriptResRefs.set(ModuleObjectScript.AreaOnExit, this.are.getFieldByLabel(ModuleObjectScript.AreaOnExit).getValue());
    // }

    // if(this.are.RootNode.hasField(ModuleObjectScript.AreaOnHeartbeat)){
    //   this.scriptResRefs.set(ModuleObjectScript.AreaOnHeartbeat, this.are.getFieldByLabel(ModuleObjectScript.AreaOnHeartbeat).getValue());
    // }

    // if(this.are.RootNode.hasField(ModuleObjectScript.AreaOnUserDefined)){
    //   this.scriptResRefs.set(ModuleObjectScript.AreaOnUserDefined, this.are.getFieldByLabel(ModuleObjectScript.AreaOnUserDefined).getValue());
    // }

    this.playerOnly = !!this.are.getFieldByLabel('PlayerOnly').getValue();
    this.playerVsPlayer = this.are.getFieldByLabel('PlayerVsPlayer').getValue();

    //Rooms
    for(let i = 0; i < rooms.childStructs.length; i++ ){
      let strt = rooms.childStructs[i];
      const roomName = this.are.getFieldByLabel('RoomName', strt.getFields()).getValue().toLowerCase();
      const envAudio = this.are.getFieldByLabel('EnvAudio', strt.getFields()).getValue();
      const ambientScale = this.are.getFieldByLabel('AmbientScale', strt.getFields()).getValue();
      const room = new ForgeRoom(roomName);
      room.setAmbientScale(ambientScale);
      room.setEnvAudio(envAudio);
      this.rooms.push(room);
    }

    this.shadowOpacity = this.are.getFieldByLabel('ShadowOpacity').getValue();

    this.stealthXPEnabled = this.are.getFieldByLabel('StealthXPEnabled').getValue();
    this.stealthXPLoss = this.are.getFieldByLabel('StealthXPLoss').getValue();
    this.stealthXPMax = this.are.getFieldByLabel('StealthXPMax').getValue();

    this.sunAmbientColor = this.are.getFieldByLabel('SunAmbientColor').getValue();
    this.sunDiffuseColor = this.are.getFieldByLabel('SunDiffuseColor').getValue();
    this.sunFogColor = this.are.getFieldByLabel('SunFogColor').getValue();
    this.sunFogFar = this.are.getFieldByLabel('SunFogFar').getValue();
    this.sunFogNear = this.are.getFieldByLabel('SunFogNear').getValue();
    this.sunFogOn = this.are.getFieldByLabel('SunFogOn').getValue();
    this.sunShadows = this.are.getFieldByLabel('SunShadows').getValue();
    this.tag = this.are.getFieldByLabel('Tag').getValue();
    this.unescapable = this.are.getFieldByLabel('Unescapable').getValue() ? true : false;
    this.version = this.are.getFieldByLabel('Version').getValue();
    this.windPower = this.are.getFieldByLabel('WindPower').getValue();

    // this.fog = undefined;

    // if(this.sun.fogOn){
    //   this.fog = new THREE.Fog(
    //     this.sun.fogColor,
    //     this.sun.fogNear,
    //     this.sun.fogFar
    //   );
    //   GameState.scene.fog = this.fog;
    // }else{
    //   GameState.scene.fog = undefined;
    // }

    //BEGIN GIT LOAD

    // const areaMap = this.git.getFieldByLabel('AreaMap');
    // const areaProps = this.git.getFieldByLabel('AreaProperties');
    // const areaEffects = this.git.getFieldByLabel('AreaEffectList');
    const cameras = this.git.getFieldByLabel('CameraList');
    const creatures = this.git.getFieldByLabel('Creature List');
    const doors = this.git.getFieldByLabel('Door List');
    const encounters = this.git.getFieldByLabel('Encounter List');
    const placeables = this.git.getFieldByLabel('Placeable List');
    const sounds = this.git.getFieldByLabel('SoundList');
    const stores = this.git.getFieldByLabel('StoreList');
    const triggers = this.git.getFieldByLabel('TriggerList');
    const waypoints = this.git.getFieldByLabel('WaypointList');

    // const areaPropsField = areaProps.getChildStructs()[0].getFields();
    // this.audio.ambient.day = this.git.getFieldByLabel('AmbientSndDay', areaPropsField).getValue();
    // this.audio.ambient.dayVolume = this.git.getFieldByLabel('AmbientSndDayVol', areaPropsField).getValue();
    // this.audio.ambient.night = this.git.getFieldByLabel('AmbientSndNight', areaPropsField).getValue();
    // this.audio.ambient.nightVolume = this.git.getFieldByLabel('AmbientSndNitVol', areaPropsField).getValue();
    // if(areaProps.getChildStructs()[0].hasField('EnvAudio')){
    //   this.audio.environmentAudio = this.git.getFieldByLabel('EnvAudio', areaPropsField).getValue();
    // }else{
    //   this.audio.environmentAudio = -1;
    // }
    
    // this.audio.music.battle = this.git.getFieldByLabel('MusicBattle', areaPropsField).getValue();
    // this.audio.music.day = this.git.getFieldByLabel('MusicDay', areaPropsField).getValue();
    // this.audio.music.delay = this.git.getFieldByLabel('MusicDelay', areaPropsField).getValue();
    // this.audio.music.night = this.git.getFieldByLabel('MusicNight', areaPropsField).getValue();
    // AudioEngine.GetAudioEngine().setAreaAudioProperties(this.audio);

    //Cameras
    if(cameras){
      for(let i = 0; i < cameras.childStructs.length; i++){
        const strt = cameras.childStructs[i];
        const camera = new ForgeCamera();
        camera.setGITInstance(strt);
        this.cameras.push(camera);
      }
    }

    // //AreaEffects
    // if(areaEffects){
    //   for(let i = 0; i < areaEffects.childStructs.length; i++){
    //     const strt = areaEffects.childStructs[i];
    //     this.attachObject( new ModuleAreaOfEffect(GFFObject.FromStruct(strt)) );
    //   }
    // }

    //Creatures
    if(creatures){
      for(let i = 0; i < creatures.childStructs.length; i++){
        const strt = creatures.childStructs[i];
        const creature = new ForgeCreature();
        creature.setGITInstance(strt);
        this.creatures.push(creature);
      }
    }

    //Triggers
    if(triggers){
      for(let i = 0; i < triggers.childStructs.length; i++){
        const strt = triggers.childStructs[i];
        const trigger = new ForgeTrigger();
        trigger.setGITInstance(strt);
        this.triggers.push(trigger);
      }
    }

    //Encounter
    if(encounters){
      for(let i = 0; i < encounters.childStructs.length; i++){
        const strt = encounters.childStructs[i];
        const encounter = new ForgeEncounter();
        encounter.setGITInstance(strt);
        this.encounters.push(encounter);
      }
    }

    //Doors
    if(doors){
      for(let i = 0; i < doors.childStructs.length; i++ ){
        const strt = doors.childStructs[i];
        const door = new ForgeDoor();
        door.setGITInstance(strt);
        this.doors.push(door);
      }
    }

    //Placeables
    if(placeables){
      for(let i = 0; i < placeables.childStructs.length; i++ ){
        const strt = placeables.childStructs[i];
        const placeable = new ForgePlaceable();
        placeable.setGITInstance(strt);
        this.placeables.push(placeable);
      }
    }

    //Sounds
    if(sounds){
      for(let i = 0; i < sounds.childStructs.length; i++ ){
        const strt = sounds.childStructs[i];
        const sound = new ForgeSound();
        sound.setGITInstance(strt);
        this.sounds.push(sound);
      }
    }

    //Stores
    if(stores){
      for(let i = 0; i < stores.childStructs.length; i++ ){
        const strt = stores.childStructs[i];
        const store = new ForgeStore();
        store.setGITInstance(strt);
        this.stores.push(store);
      }
    }

    //Waypoints
    if(waypoints){
      for(let i = 0; i < waypoints.childStructs.length; i++ ){
        const strt = waypoints.childStructs[i];
        const waypoint = new ForgeWaypoint();
        waypoint.setGITInstance(strt);
        this.waypoints.push(waypoint);
      }
    }

    // //AreaMapData
    // if(areaMap){
    //   const areaMapStruct = areaMap.getChildStructs()[0];
    //   if(areaMapStruct){
    //     this.areaMap.loadDataStruct(areaMapStruct);
    //   }
    // }

    // if(!(this.transWP instanceof GFFObject)){
    //   this.transWP = null;
    // }

    // if(this.git.RootNode.hasField('SWVarTable')){
    //   console.log("SWVarTable", this.git);
    //   let localBools = this.git.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0].getFieldByLabel('BitArray').getChildStructs();
    //   //console.log(localBools);
    //   for(let i = 0; i < localBools.length; i++){
    //     let data = localBools[i].getFieldByLabel('Variable').getValue();
    //     for(let bit = 0; bit < 32; bit++){
    //       this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
    //     }
    //   }
    // }

    // GameState.AlphaTest = this.alphaTest;

    // AudioEngine.GetAudioEngine().setReverbProfile(this.audio.environmentAudio);

    // FollowerCamera.setCameraStyle(this.getCameraStyle());
    // if(this.miniGame){
    //   FollowerCamera.setCameraFOV(this.miniGame.cameraViewAngle);
    // }else{
    //   FollowerCamera.setCameraFOV(FollowerCamera.DEFAULT_FOV);
    // }

    try{
      const lyt = await ProjectFileSystem.readFile(`${this.name.getValue()}.lyt`);
      if(lyt){
        this.layout = new KotOR.LYTObject(lyt);

        //Resort the rooms based on the LYT file because it matches the walkmesh transition index numbers
        let sortedRooms: ForgeRoom[] = [];
        for(let i = 0; i < this.layout.rooms.length; i++){
          let roomLYT = this.layout.rooms[i];
          for(let r = 0; r != this.rooms.length; r++ ){
            let room = this.rooms[r];
            if(room.roomName.toLowerCase() == roomLYT.name.toLowerCase()){
              room.position.copy(roomLYT.position);
              sortedRooms.push(room);
            }
          }
        }

        this.rooms = sortedRooms;

        // for(let i = 0; i < this.layout.doorhooks.length; i++){
        //   let _doorHook = this.layout.doorhooks[i];
        //   this.doorhooks.push(_doorHook);
        // }

        // if(this.miniGame){
        //   for(let i = 0; i < this.layout.tracks.length; i++){
        //     this.miniGame.tracks.push(new ModuleMGTrack(this.layout.tracks[i]));
        //   }
    
        //   for(let i = 0; i < this.layout.obstacles.length; i++){
        //     this.miniGame.obstacles.push(new ModuleMGObstacle(undefined, this.layout.obstacles[i]));
        //   }
        // }
      }

      const vis = await ProjectFileSystem.readFile(`${this.name.getValue()}.vis`);
      if(vis){
        this.visObject = new KotOR.VISObject(vis);
        this.visObject.read();
        this.visObject.attachArea(this as any);
      }

      console.log('lyt', this.layout);
      console.log('vis', this.visObject);
    }catch(e){
      console.error(e);
    }

    // await this.loadVis();
    // await this.loadLayout();
    // await this.loadScripts();
    // GameState.scene.fog = this.fog;

    await this.loadRooms();
    await this.loadCreatures();
    this.context.sceneGraphManager.rebuild();
  }

  attachObject(object: ForgeGameObject){
    if(!object){ return; }
    object.setArea(this);
    if(object instanceof ForgeRoom){
      this.rooms.push(object);
    }
    if(object instanceof ForgeCreature){
      this.creatures.push(object);
    }
    if(object instanceof ForgeMiniGame){
      this.miniGame = object;
    }
    this.context.sceneGraphManager.rebuild();
  }

  async loadCreatures(): Promise<void> {
    for(let i = 0; i < this.creatures.length; i++){
      const creature = this.creatures[i];
      creature.setContext(this.context);
      await creature.loadBlueprint();
      await creature.load();
      this.context.addObjectToGroup(creature.container, GroupType.CREATURE);
    }
  }

  /**
   * Load the area's rooms
   */
  async loadRooms(): Promise<void> {
    console.log('Loading Rooms');
    // this.walkEdges = [];
    // this.walkFaces = [];
    
    for(let i = 0; i < this.rooms.length; i++){
      const room = this.rooms[i];
      await room.load();
      const model = room.model;
      
      if(model instanceof KotOR.OdysseyModel3D){
        model.name = room.roomName;
        this.context.addObjectToGroup(room.container, GroupType.ROOMS);
      }
    }

    for(let j = 0; j < this.rooms.length; j++){
      this.rooms[j].linkRooms();
    }

    //Room Linking Pass 2
    for(let i = 0, iLen = this.rooms.length; i < iLen; i++ ){
      let room1 = this.rooms[i];
      //console.log(room1.linked_rooms);
      //Look for all rooms that can see this room
      for(let j = 0, jLen = this.rooms.length; j < jLen; j++){
        let room2 = this.rooms[j];
        //console.log(room2.linked_rooms);
        if(room2 instanceof ForgeRoom){
          const room1_room_links = this.visObject.getRoom(room1.roomName)?.rooms || [];
          const room2_room_links = this.visObject.getRoom(room2.roomName)?.rooms || [];
          const room2_links_to_room1 = room2_room_links.indexOf(room1.roomName) >= 0;
          const room1_links_to_room2 = room1_room_links.indexOf(room2.roomName) >= 0;

          const should_link = room2_links_to_room1 || room1_links_to_room2;
          //console.log('room', room1.roomName, room2.roomName, should_link);
          if(should_link && !room1.linkedRooms.has(room2.roomName)){
            room1.linkedRooms.set(room2.roomName, room2);
          }

          if(should_link && !room2.linkedRooms.has(room1.roomName)){
            room2.linkedRooms.set(room1.roomName, room1);
          }
        }
      }
      // this.walkmesh_rooms = [room1].concat(Array.from(room1.linkedRooms.values()));
    }
  }

  /**
   * Get a room by name
   * @param roomName - The name of the room to get
   * @returns The room or null if it is not found
   */
  getRoomByName(roomName: string): ForgeRoom | null {
    return this.rooms.find(room => room.roomName.toLocaleLowerCase() === roomName.toLocaleLowerCase()) || null;
  }

  exportToARE(){
    const are = new KotOR.GFFObject();
    are.FileType = 'ARE ';

    // AlphaTest
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'AlphaTest', this.alphaTest));

    // CameraStyle
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'CameraStyle', this.cameraStyle));

    // ChanceLightning
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'ChanceLightning', this.chanceLightning));

    // ChanceRain
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'ChanceRain', this.chanceRain));

    // ChanceSnow
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'ChanceSnow', this.chanceSnow));

    // Comments
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comments', this.comments));

    // Creator_ID
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'Creator_ID', this.creatorId));

    // DayNightCycle
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'DayNightCycle', this.dayNightCycle ? 1 : 0));

    // DefaultEnvMap
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'DefaultEnvMap', this.defaultEnvMap));

    // DynAmbientColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'DynAmbientColor', this.dynamicAmbientColor));

    // Expansion_List
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Expansion_List'));

    // Flags
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Flags', this.flags));

    // Grass_Ambient
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Grass_Ambient', this.grassAmbient));

    // Grass_Density
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Grass_Density', this.grassDensity));

    // Grass_Diffuse
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Grass_Diffuse', this.grassDiffuse));

    // Grass_Prob_LL
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Grass_Prob_LL', this.grassProbLL));

    // Grass_Prob_LR
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Grass_Prob_LR', this.grassProbLR));

    // Grass_Prob_UL
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Grass_Prob_UL', this.grassProbUL));

    // Grass_Prob_UR
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Grass_Prob_UR', this.grassProbUR));

    // Grass_QuadSize
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Grass_QuadSize', this.grassQuadSize));

    // Grass_TexName
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Grass_TexName', this.grassTexName));

    // ID
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'ID', this.id));

    // IsNight
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'IsNight', this.isNight ? 1 : 0));

    // LightingScheme
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'LightingScheme', this.lightingScheme));

    // LoadScreenID
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.WORD, 'LoadScreenID', this.loadScreenId));

    // Map (STRUCT with nested structure)
    const mapField =  are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.STRUCT, 'Map'));
    mapField?.addChildStruct(this.areaMap.export());

    if(this.miniGame){
      const miniGameField = are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.STRUCT, 'MiniGame'));
      miniGameField?.addChildStruct(this.miniGame.exportToGFFStruct());
    }

    // ModListenCheck
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'ModListenCheck', this.modListenCheck));

    // ModSpotCheck
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'ModSpotCheck', this.modSpotCheck));

    // MoonAmbientColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'MoonAmbientColor', this.moonAmbientColor));

    // MoonDiffuseColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'MoonDiffuseColor', this.moonDiffuseColor));

    // MoonFogColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'MoonFogColor', this.moonFogColor));

    // MoonFogFar
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MoonFogFar', this.moonFogFar));

    // MoonFogNear
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MoonFogNear', this.moonFogNear));

    // MoonFogOn
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'MoonFogOn', this.moonFogOn ? 1 : 0));

    // MoonShadows
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'MoonShadows', this.moonShadows ? 1 : 0));

    // Name
    const nameField = are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Name'))!;
    // const nameLocString = new KotOR.CExoLocString();
    // nameLocString.addSubString(name, 0); // Male English (StringID 0 = language 0, gender 0)
    // nameField.setCExoLocString(nameLocString);
    nameField.setCExoLocString(this.name);

    // NoHangBack
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'NoHangBack', this.noHangBack ? 1 : 0));

    // NoRest
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'NoRest', this.noRest ? 1 : 0));

    // OnEnter
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnEnter', this.onEnter));

    // OnExit
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnExit', this.onExit));

    // OnHeartbeat
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnHeartbeat', this.onHeartbeat));

    // OnUserDefined
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnUserDefined', this.onUserDefined));

    // PlayerOnly
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PlayerOnly', this.playerOnly ? 1 : 0));

    // PlayerVsPlayer
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PlayerVsPlayer', this.playerVsPlayer ? 1 : 0));

    // Rooms
    const roomsField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Rooms');
    for(let i = 0, len = this.rooms.length; i < len; i++){
      const roomStruct = new KotOR.GFFStruct(3);
      roomStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'RoomName', this.rooms[i].roomName));
      roomStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'EnvAudio', this.rooms[i].envAudio));
      roomStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'AmbientScale', this.rooms[i].ambientScale));
      roomsField.addChildStruct(roomStruct);
    }
    are.RootNode.addField(roomsField);

    // ShadowOpacity
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'ShadowOpacity', this.shadowOpacity));

    // StealthXPEnabled
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'StealthXPEnabled', this.stealthXPEnabled ? 1 : 0));

    // StealthXPLoss
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'StealthXPLoss', this.stealthXPLoss));

    // StealthXPMax
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'StealthXPMax', this.stealthXPMax));

    // SunAmbientColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'SunAmbientColor', this.sunAmbientColor));

    // SunDiffuseColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'SunDiffuseColor', this.sunDiffuseColor));

    // SunFogColor
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'SunFogColor', this.sunFogColor));

    // SunFogFar
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'SunFogFar', this.sunFogFar));

    // SunFogNear
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'SunFogNear', this.sunFogNear));

    // SunFogOn
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'SunFogOn', this.sunFogOn ? 1 : 0));

    // SunShadows
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'SunShadows', this.sunShadows ? 1 : 0));

    // Tag
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', this.tag));

    // Unescapable
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Unescapable', this.unescapable ? 1 : 0));

    // Version
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Version', this.version));

    // WindPower
    are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'WindPower', this.windPower));

    return are;
  }

  exportToGIT(){
    const git = new KotOR.GFFObject();
    git.FileType = 'GIT ';

    // AreaProperties (STRUCT)
    const areaPropertiesField = new KotOR.GFFField(KotOR.GFFDataType.STRUCT, 'AreaProperties');
    const areaPropertiesStruct = new KotOR.GFFStruct(100);
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'AmbientSndDay', this.areaProperties.ambientSndDay));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'AmbientSndDayVol', this.areaProperties.ambientSndDayVol));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'AmbientSndNight', this.areaProperties.ambientSndNight));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'AmbientSndNitVol', this.areaProperties.ambientSndNitVol));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'EnvAudio', this.areaProperties.envAudio));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'MusicBattle', this.areaProperties.musicBattle));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'MusicDay', this.areaProperties.musicDay));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'MusicDelay', this.areaProperties.musicDelay));
    areaPropertiesStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'MusicNight', this.areaProperties.musicNight));
    areaPropertiesField.addChildStruct(areaPropertiesStruct);
    git.RootNode.addField(areaPropertiesField);

    // CameraList
    const cameraListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'CameraList');
    for(let i = 0, len = this.cameras.length; i < len; i++){
      cameraListField.addChildStruct(this.cameras[i].getGITInstance());
    }
    git.RootNode.addField(cameraListField);

    // Creature List
    const creatureListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Creature List');
    for(let i = 0, len = this.creatures.length; i < len; i++){
      creatureListField.addChildStruct(this.creatures[i].getGITInstance());
    }
    git.RootNode.addField(creatureListField);

    // Door List
    const doorListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Door List');
    for(let i = 0, len = this.doors.length; i < len; i++){
      doorListField.addChildStruct(this.doors[i].getGITInstance());
    }
    git.RootNode.addField(doorListField);

    // Encounter List
    const encounterListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Encounter List');
    for(let i = 0, len = this.encounters.length; i < len; i++){
      encounterListField.addChildStruct(this.encounters[i].getGITInstance());
    }
    git.RootNode.addField(encounterListField);

    // List (generic/unnamed list for items)
    const listField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'List');
    for(let i = 0, len = this.items.length; i < len; i++){
      listField.addChildStruct(this.items[i].getGITInstance());
    }
    git.RootNode.addField(listField);

    // Placeable List
    const placeableListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Placeable List');
    for(let i = 0, len = this.placeables.length; i < len; i++){
      placeableListField.addChildStruct(this.placeables[i].getGITInstance());
    }
    git.RootNode.addField(placeableListField);

    // SoundList
    const soundListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'SoundList');
    for(let i = 0, len = this.sounds.length; i < len; i++){
      soundListField.addChildStruct(this.sounds[i].getGITInstance());
    }
    git.RootNode.addField(soundListField);

    // StoreList
    const storeListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'StoreList');
    for(let i = 0, len = this.stores.length; i < len; i++){
      storeListField.addChildStruct(this.stores[i].getGITInstance());
    }
    git.RootNode.addField(storeListField);

    // TriggerList
    const triggerListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'TriggerList');
    for(let i = 0, len = this.triggers.length; i < len; i++){
      triggerListField.addChildStruct(this.triggers[i].getGITInstance());
    }
    git.RootNode.addField(triggerListField);

    // UseTemplates
    git.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'UseTemplates', this.useTemplate ? 1 : 0));

    // WaypointList
    const waypointListField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'WaypointList');
    for(let i = 0, len = this.waypoints.length; i < len; i++){
      waypointListField.addChildStruct(this.waypoints[i].getGITInstance());
    }
    git.RootNode.addField(waypointListField);

    return git;
  }
  
}