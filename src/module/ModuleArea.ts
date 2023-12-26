/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { GameState } from "../GameState";
import { GFFObject } from "../resource/GFFObject";
import { OdysseyModel3D } from "../three/odyssey";
import { AreaMap } from "./AreaMap";
import { AreaWeather } from "./AreaWeather";
import * as THREE from "three";
import { Module, ModuleAreaOfEffect, ModuleCamera, ModuleCreature, ModuleDoor, ModuleEncounter, ModuleItem, ModuleMGEnemy, ModuleMGObstacle, ModuleMGPlayer, ModuleMGTrack, ModuleMiniGame, ModuleObject, ModulePath, ModulePlaceable, ModulePlayer, ModuleRoom, ModuleSound, ModuleStore, ModuleTrigger, ModuleWaypoint } from ".";
import { AsyncLoop } from "../utility/AsyncLoop";
import { GFFField } from "../resource/GFFField";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFStruct } from "../resource/GFFStruct";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { NWScript } from "../nwscript/NWScript";
import { ResourceTypes } from "../resource/ResourceTypes";
import { LYTObject } from "../resource/LYTObject";
import { Utility } from "../utility/Utility";
import EngineLocation from "../engine/EngineLocation";
import { ModuleCreatureArmorSlot } from "../enums/module/ModuleCreatureArmorSlot";
import { OdysseyWalkMesh } from "../odyssey";
import { AudioLoader } from "../audio/AudioLoader";
import { EngineMode } from "../enums/engine/EngineMode";
import { CExoLocString } from "../resource/CExoLocString";
import { VISObject } from "../resource/VISObject";
import { TextureLoaderQueuedRef } from "../interface/loaders/TextureLoaderQueuedRef";
import { FollowerCamera } from "../engine/FollowerCamera";
import { MenuManager, TwoDAManager, PartyManager, ModuleObjectManager } from "../managers";
import { ResourceLoader, TextureLoader } from "../loaders";
import { AreaAudioProperties } from "../interface/area/AreaAudioProperties";
import { AudioEngine } from "../audio";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { BitWise } from "../utility/BitWise";

/* @file
 * The ModuleArea class.
 */

export class ModuleArea extends ModuleObject {

  cameras: ModuleCamera[] = [];
  creatures: ModuleCreature[] = [];
  doorhooks: any[] = [];
  doors: ModuleDoor[] = [];
  encounters: ModuleEncounter[] = [];
  items: ModuleItem[] = [];
  placeables: ModulePlaceable[] = [];
  sounds: ModuleSound[] = [];
  stores: ModuleStore[] = [];
  triggers: ModuleTrigger[] = [];
  waypoints: ModuleWaypoint[] = [];
  areaOfEffects: ModuleAreaOfEffect[] = [];
  miniGame: ModuleMiniGame;

  audio: AreaAudioProperties = {
    AmbientSndDay: 0,
    AmbientSndDayVol: 0,
    AmbientSndNight: 0,
    AmbientSndNitVol: 0,
    EnvAudio: 0,
    MusicBattle: 0,
    MusicDay: 0,
    MusicDelay: 0,
    MusicNight: 0
  };

  AlphaTest = 0.200000002980232;
  CameraStyle = 0;
  ChanceLightning = 0;
  ChanceRain = 0;
  ChanceSnow = 0;
  Comments = '';
  Creator_ID = 0;
  DayNightCycle = 0;
  DefaultEnvMap = '';
  DynAmbientColor = 6312778;
  Expansion_List: any[] = [];
  Flags = 1;

  Grass = {
    Ambient: 0,
    Density: 0,
    Diffuse: 0,
    Prob_LL: 0.25,
    Prob_LR: 0.25,
    Prob_UL: 0.25,
    Prob_UR: 0.25,
    QuadSize: 0,
    TexName: ''
  };

  ID = 0;
  IsNight = 0;
  LightingScheme = 0;
  LoadScreenID = 0;

  areaMap: AreaMap;

  ModListenCheck = 0;
  ModSpotCheck = 0;
  MoonAmbientColor = 0;
  MoonDiffuseColor = 0;
  MoonFogColor = 0;
  MoonFogFar = 100;
  MoonFogNear = 99;
  MoonFogOn = 0;
  MoonShadows = 0;
  AreaName: CExoLocString;
  NoHangBack = 0;
  NoRest = 0;
  OnEnter = "";
  OnExit = "";
  OnHeartbeat = "";
  OnUserDefined = "";
  PlayerOnly = 0;
  PlayerVsPlayer = 0;
  ShadowOpacity = 0;
  StealthXPEnabled = 0;
  StealthXPLoss = 0;
  StealthXPMax = 0;
  SunAmbientColor = 0;
  SunDiffuseColor = 0;
  SunFogColor = 0;
  SunFogFar = 2000;
  SunFogNear = 1000;
  SunFogOn = 0;
  SunShadows = 0;
  Tag = '';
  Unescapable: boolean = false;
  Version = 1;
  WindPower = 0;
  module: Module;
  _name: any;
  are: GFFObject;
  git: GFFObject;
  transWP: string|GFFObject;
  weather: AreaWeather;
  cameraBoundingBox: any;
  Alphatest: any;
  onEnter: any;
  onExit: any;
  onHeartbeat: any;
  onUserDefined: any;
  // scripts: { onEnter: any; onExit: any; onHeartbeat: any; onUserDefined: any; };
  fog: THREE.Fog;
  // _locals: any;
  path: ModulePath;
  visObject: VISObject;
  layout: LYTObject;
  walkmesh_rooms: any[];
  restrictMode: number;

  constructor(name = '', are = new GFFObject(), git = new GFFObject()){
    super(are);
    this.objectType |= ModuleObjectType.ModuleArea;
    this._name = name;
    this.are = are;
    this.git = git;

    this.transWP = '';
    this.weather = new AreaWeather(this);

  }

  dispose(){

    this.areaMap.dispose();

    //clear area room objects
    while (this.rooms.length){
      this.rooms[0].destroy();
    }

    //clear area areaOfEffect objects
    while (this.areaOfEffects.length){
      this.areaOfEffects[0].destroy();
    }

    //clear area creature objects
    while (this.creatures.length){
      this.creatures[0].destroy();
    }

    //clear area item objects
    while (this.items.length){
      this.items[0].destroy();
    }

    //clear area placeable objects
    while (this.placeables.length){
      this.placeables[0].destroy();
    }

    //clear area door objects
    while (this.doors.length){
      this.doors[0].destroy();
    }

    //clear area trigger objects
    while (this.triggers.length){
      this.triggers[0].destroy();
    }

    //clear area waypoint objects
    while (this.waypoints.length){
      this.waypoints[0].destroy();
    }

    //clear area sound objects
    while (this.sounds.length){
      this.sounds[0].destroy();
    }

    while (PartyManager.party.length){
      const pm = PartyManager.party.shift();
      pm.destroy();
    }

    this.weather.destroy();
    
  }

  update(delta: number = 0){
    let roomCount = this.rooms.length;
    let aoeCount = this.areaOfEffects.length;
    let trigCount = this.triggers.length;
    let encounterCount = this.encounters.length;
    let creatureCount = this.creatures.length;
    let placeableCount = this.placeables.length;
    let doorCount = this.doors.length;
    let partyCount = PartyManager.party.length;
    let animTexCount = GameState.AnimatedTextures.length;

    //update triggers
    for(let i = 0; i < trigCount; i++){
      this.triggers[i].update(delta);
    }

    //update encounters
    for(let i = 0; i < encounterCount; i++){
      this.encounters[i].update(delta);
    }
    
    //update aoe
    for(let i = 0; i < aoeCount; i++){
      this.areaOfEffects[i].update(delta);
    }

    //update party
    for(let i = 0; i < partyCount; i++){
      PartyManager.party[i].update(delta);
    }
    
    //update creatures
    for(let i = 0; i < creatureCount; i++){
      this.creatures[i].update(delta);
    }
    
    //update placeables
    for(let i = 0; i < placeableCount; i++){
      this.placeables[i].update(delta);
    }
    
    //update doors
    for(let i = 0; i < doorCount; i++){
      this.doors[i].update(delta);
    }

    //update animated textures
    for(let i = 0; i < animTexCount; i++){
      GameState.AnimatedTextures[i].Update(delta);
    }

    //unset party controlled
    for(let i = 0; i < partyCount; i++){
      PartyManager.party[i].controlled = false;
    }

    if(GameState.Mode == EngineMode.MINIGAME){
      this.miniGame.tick(delta);
    }

    //update rooms
    for(let i = 0; i < roomCount; i++){
      this.rooms[i].update(delta);
      this.rooms[i].hide();
    }

    this.updateRoomVisibility(delta);
    FollowerCamera.update(delta, this);

    this.weather.update(delta);
  }

  updatePaused(delta: number = 0){
    let roomCount = this.rooms.length;
    let trigCount = this.triggers.length;
    let encounterCount = this.encounters.length;
    let aoeCount = this.areaOfEffects.length;
    let creatureCount = this.creatures.length;
    let placeableCount = this.placeables.length;
    let doorCount = this.doors.length;
    let partyCount = PartyManager.party.length;

    //update triggers
    for(let i = 0; i < trigCount; i++){
      this.triggers[i].updatePaused(delta);
    }

    //update encounters
    for(let i = 0; i < encounterCount; i++){
      this.encounters[i].updatePaused(delta);
    }

    //update aoe
    for(let i = 0; i < aoeCount; i++){
      this.areaOfEffects[i].updatePaused(delta);
    }

    //update party
    for(let i = 0; i < partyCount; i++){
      PartyManager.party[i].updatePaused(delta);
    }
    
    //update creatures
    for(let i = 0; i < creatureCount; i++){
      this.creatures[i].updatePaused(delta);
    }
    
    //update placeables
    for(let i = 0; i < placeableCount; i++){
      this.placeables[i].updatePaused(delta);
    }
    
    //update doors
    for(let i = 0; i < doorCount; i++){
      this.doors[i].updatePaused(delta);
    }

    if(GameState.Mode == EngineMode.MINIGAME){
      this.miniGame.tickPaused(delta);
    }

    //update rooms
    for(let i = 0; i < roomCount; i++){
      this.rooms[i].hide();
    }

    this.updateRoomVisibility(delta);
    FollowerCamera.update(delta, this);
  }

  updateRoomVisibility(delta: number = 0){
    let roomList: ModuleRoom[] = [];
    let pos = undefined;

    switch(GameState.Mode){
      case EngineMode.DIALOG:
        pos = GameState.currentCamera.position.clone().add(GameState.playerFeetOffset);

        for(let i = 0, il = this.rooms.length; i < il; i++){
          const room = this.rooms[i];
          const inCamera = GameState.viewportFrustum.intersectsBox(room.box);
          if(!room.hasVISObject || room.box.containsPoint(pos) || inCamera){
            roomList.push(room);
          }
        }
  
        for(let i = 0; i < roomList.length; i++){
          roomList[i].show(true);
        }
      break;
      case EngineMode.MINIGAME:
        for(let i = 0, len = this.rooms.length; i < len; i++){
          let room = this.rooms[i];
          if(room) room.show(false);
        }
      break;
      case EngineMode.INGAME:
      case EngineMode.FREELOOK:
      default:
        let player = GameState.getCurrentPlayer();
        if(player && player.room){
          player.room.show(true);
        }

        //SKYBOX Fix
        if(player){
          for(let i = 0, len = this.rooms.length; i < len; i++){
            let room = this.rooms[i];
            if(!room.hasVISObject || room.box.containsPoint(player.position)){
              //Show the room, but don't recursively show it's children
              room.show(false);
            }
          }
        }
      break;
    }
  }

  reloadTextures(){
    MenuManager.LoadScreen.open();
    MenuManager.LoadScreen.LBL_HINT.setText('');
    GameState.loadingTextures = true;
    //Cleanup texture cache
    Array.from(TextureLoader.textures.keys()).forEach( (key) => {
      TextureLoader.textures.get(key).dispose();
      TextureLoader.textures.delete(key); 
    });


    for(let i = 0; i < this.rooms.length; i++){
      const room = this.rooms[i];
      //room.LoadModel();
    }

    new AsyncLoop({
      array: this.creatures,
      onLoop: (creature: ModuleCreature, asyncLoop: AsyncLoop) => {
        creature.loadModel().then(() => {
          asyncLoop.next();
        });
      }
    }).iterate(() => {
      new AsyncLoop({
        array: PartyManager.party,
        onLoop: (partyMember: ModuleCreature, asyncLoop: AsyncLoop) => {
          partyMember.loadModel().then(() => {
            asyncLoop.next();
          });
        }
      }).iterate(() => {
        new AsyncLoop({
          array: this.placeables,
          onLoop: (placeable: ModulePlaceable, asyncLoop: AsyncLoop) => {
            placeable.loadModel().then(() => {
              asyncLoop.next();
            });
          }
        }).iterate(() => {
          new AsyncLoop({
            array: this.doors,
            onLoop: (door: ModuleDoor, asyncLoop: AsyncLoop) => {
              door.loadModel().then(() => {
                asyncLoop.next();
              });
            }
          }).iterate(() => {
            new AsyncLoop({
              array: this.rooms,
              onLoop: (room: ModuleRoom, asyncLoop: AsyncLoop) => {
                room.loadModel().then(() => {
                  asyncLoop.next();
                });
              }
            }).iterate(() => {
              TextureLoader.LoadQueue(() => {
                MenuManager.LoadScreen.close();
                GameState.loadingTextures = false;
              }, (ref: TextureLoaderQueuedRef, index: number, count: number) => {
                MenuManager.LoadScreen.setProgress((index/count + 1) * 100);
                MenuManager.LoadScreen.LBL_HINT.setText('Loading: '+ref.name);
                //console.log('tex', textureName, index, count);
              });
            });
          });
        });
      });
    });
  }

  setTransitionWaypoint(sTag = ''){
    this.transWP = sTag;
  }

  load(onLoad?: Function){

    //BEGIN AREA LOAD

    if(this.are.RootNode.hasField('ObjectId'))
      this.id = this.are.getFieldByLabel('ObjectId').getValue();

    let rooms = this.are.getFieldByLabel('Rooms');

    this.Alphatest = this.are.getFieldByLabel('AlphaTest').getValue();
    this.CameraStyle = this.are.getFieldByLabel('CameraStyle').getValue();
    this.ChanceLightning = this.are.getFieldByLabel('ChanceLightning').getValue();
    this.ChanceRain = this.are.getFieldByLabel('ChanceRain').getValue();
    this.ChanceSnow = this.are.getFieldByLabel('ChanceSnow').getValue();
    this.Comments = this.are.getFieldByLabel('Comments').getValue();
    this.Creator_ID = this.are.getFieldByLabel('Creator_ID').getValue();
    this.DayNightCycle = this.are.getFieldByLabel('DayNightCycle').getValue();
    this.DefaultEnvMap = this.are.getFieldByLabel('DefaultEnvMap').getValue();
    this.DynAmbientColor = this.are.getFieldByLabel('DynAmbientColor').getValue();
    this.Expansion_List = [];

    this.Flags = this.are.getFieldByLabel('Flags').getValue();
    this.Grass = {
      Ambient: this.are.getFieldByLabel('Grass_Ambient').getValue(),
      Density: this.are.getFieldByLabel('Grass_Density').getValue(),
      Diffuse: this.are.getFieldByLabel('Grass_Diffuse').getValue(),
      Prob_LL: this.are.getFieldByLabel('Grass_Prob_LL').getValue(),
      Prob_LR: this.are.getFieldByLabel('Grass_Prob_LR').getValue(),
      Prob_UL: this.are.getFieldByLabel('Grass_Prob_UL').getValue(),
      Prob_UR: this.are.getFieldByLabel('Grass_Prob_UR').getValue(),
      QuadSize: this.are.getFieldByLabel('Grass_QuadSize').getValue(),
      TexName: this.are.getFieldByLabel('Grass_TexName').getValue()
    };

    this.ID = this.are.getFieldByLabel('ID').getValue();
    this.IsNight = this.are.getFieldByLabel('IsNight').getValue();
    this.LightingScheme = this.are.getFieldByLabel('LightingScheme').getValue();
    this.LoadScreenID = this.are.getFieldByLabel('LoadScreenID').getValue();

    let map = this.are.getFieldByLabel('Map').getChildStructs()[0];
    if(map){
      this.areaMap = AreaMap.FromStruct(map);
    }

    if(this.are.RootNode.hasField('MiniGame')){
      this.miniGame = new ModuleMiniGame(
        this.are.getFieldByLabel('MiniGame').getChildStructs()[0]
      );
    }


    this.ModListenCheck = this.are.getFieldByLabel('ModListenCheck').getValue();
    this.ModSpotCheck = this.are.getFieldByLabel('ModSpotCheck').getValue();
    this.MoonAmbientColor = this.are.getFieldByLabel('MoonAmbientColor').getValue();
    this.MoonDiffuseColor = this.are.getFieldByLabel('MoonDiffuseColor').getValue();
    this.MoonFogColor = this.are.getFieldByLabel('MoonFogColor').getValue();
    this.MoonFogFar = this.are.getFieldByLabel('MoonFogFar').getValue();
    this.MoonFogNear = this.are.getFieldByLabel('MoonFogNear').getValue();
    this.MoonFogOn = this.are.getFieldByLabel('MoonFogOn').getValue();
    this.MoonShadows = this.are.getFieldByLabel('MoonShadows').getValue();
    this.AreaName = this.are.getFieldByLabel('Name').getCExoLocString();

    this.NoHangBack = this.are.getFieldByLabel('NoHangBack').getValue();
    this.NoRest = this.are.getFieldByLabel('NoRest').getValue();

    this.onEnter = this.are.getFieldByLabel('OnEnter').getValue();
    this.onExit = this.are.getFieldByLabel('OnExit').getValue();
    this.onHeartbeat = this.are.getFieldByLabel('OnHeartbeat').getValue();
    this.onUserDefined = this.are.getFieldByLabel('OnUserDefined').getValue();

    this.scripts = {
      onEnter: this.onEnter,
      onExit: this.onExit,
      onHeartbeat: this.onHeartbeat,
      onUserDefined: this.onUserDefined
    };

    this.PlayerOnly = this.are.getFieldByLabel('PlayerOnly').getValue();
    this.PlayerVsPlayer = this.are.getFieldByLabel('PlayerVsPlayer').getValue();

    //Rooms
    for(let i = 0; i < rooms.childStructs.length; i++ ){
      let strt = rooms.childStructs[i];
      const room = new ModuleRoom({
        ambientScale: this.are.getFieldByLabel('AmbientScale', strt.getFields()).getValue(),
        envAudio: this.are.getFieldByLabel('EnvAudio', strt.getFields()).getValue(),
        roomName: this.are.getFieldByLabel('RoomName', strt.getFields()).getValue().toLowerCase()
      });
      room.area = this;
      this.rooms.push(room);
    }

    this.ShadowOpacity = this.are.getFieldByLabel('ShadowOpacity').getValue();
    this.StealthXPEnabled = this.are.getFieldByLabel('StealthXPEnabled').getValue();
    this.StealthXPLoss = this.are.getFieldByLabel('StealthXPLoss').getValue();
    this.StealthXPMax = this.are.getFieldByLabel('StealthXPMax').getValue();
    this.SunAmbientColor = this.are.getFieldByLabel('SunAmbientColor').getValue();
    this.SunDiffuseColor = this.are.getFieldByLabel('SunDiffuseColor').getValue();
    this.SunFogColor = this.are.getFieldByLabel('SunFogColor').getValue();
    this.SunFogFar = this.are.getFieldByLabel('SunFogFar').getValue();
    this.SunFogNear = this.are.getFieldByLabel('SunFogNear').getValue();
    this.SunFogOn = this.are.getFieldByLabel('SunFogOn').getValue();
    this.SunShadows = this.are.getFieldByLabel('SunShadows').getValue();
    this.Tag = this.are.getFieldByLabel('Tag').getValue();
    this.Unescapable = this.are.getFieldByLabel('Unescapable').getValue() ? true : false;
    this.Version = this.are.getFieldByLabel('Version').getValue();
    this.WindPower = this.are.getFieldByLabel('WindPower').getValue();

    this.fog = undefined;

    if(this.SunFogOn){
      this.fog = new THREE.Fog(
        this.SunFogColor,
        this.SunFogNear,
        this.SunFogFar
      );
    }else{
      GameState.scene.fog = undefined;
    }

    //BEGIN GIT LOAD

    let areaMap = this.git.getFieldByLabel('AreaMap');
    let areaProps = this.git.getFieldByLabel('AreaProperties');
    let areaEffects = this.git.getFieldByLabel('AreaEffectList');
    let cameras = this.git.getFieldByLabel('CameraList');
    let creatures = this.git.getFieldByLabel('Creature List');
    let doors = this.git.getFieldByLabel('Door List');
    let encounters = this.git.getFieldByLabel('Encounter List');
    let placeables = this.git.getFieldByLabel('Placeable List');
    let sounds = this.git.getFieldByLabel('SoundList');
    let stores = this.git.getFieldByLabel('StoreList');
    let triggers = this.git.getFieldByLabel('TriggerList');
    let waypoints = this.git.getFieldByLabel('WaypointList');

    let areaPropsField = areaProps.getChildStructs()[0].getFields();

    this.audio.AmbientSndDay = this.git.getFieldByLabel('AmbientSndDay', areaPropsField).getValue();
    this.audio.AmbientSndDayVol = this.git.getFieldByLabel('AmbientSndDayVol', areaPropsField).getValue();
    this.audio.AmbientSndNight = this.git.getFieldByLabel('AmbientSndNight', areaPropsField).getValue();
    this.audio.AmbientSndNitVol = this.git.getFieldByLabel('AmbientSndNitVol', areaPropsField).getValue();
    if(areaProps.getChildStructs()[0].hasField('EnvAudio')){
      this.audio.EnvAudio = this.git.getFieldByLabel('EnvAudio', areaPropsField).getValue();
    }else{
      this.audio.EnvAudio = -1;
    }
    
    this.audio.MusicBattle = this.git.getFieldByLabel('MusicBattle', areaPropsField).getValue();
    this.audio.MusicDay = this.git.getFieldByLabel('MusicDay', areaPropsField).getValue();
    this.audio.MusicDelay = this.git.getFieldByLabel('MusicDelay', areaPropsField).getValue();
    this.audio.MusicNight = this.git.getFieldByLabel('MusicNight', areaPropsField).getValue();
    AudioEngine.GetAudioEngine().SetAreaAudioProperties(this.audio);

    //Cameras
    if(cameras){
      for(let i = 0; i < cameras.childStructs.length; i++){
        const strt = cameras.childStructs[i];
        const camera = new ModuleCamera(GFFObject.FromStruct(strt) );
        this.cameras.push(camera);
      }
    }

    //AreaEffects
    if(areaEffects){
      for(let i = 0; i < areaEffects.childStructs.length; i++){
        let strt = areaEffects.childStructs[i];
        this.attachObject( new ModuleAreaOfEffect(GFFObject.FromStruct(strt)) );
      }
    }

    //Creatures
    if(creatures){
      for(let i = 0; i < creatures.childStructs.length; i++){
        let strt = creatures.childStructs[i];
        this.attachObject( new ModuleCreature(GFFObject.FromStruct(strt)) );
      }
    }

    //Triggers
    if(triggers){
      for(let i = 0; i < triggers.childStructs.length; i++){
        let strt = triggers.childStructs[i];
        this.attachObject( new ModuleTrigger(GFFObject.FromStruct(strt)) );
      }
    }

    //Encounter
    if(encounters){
      for(let i = 0; i < encounters.childStructs.length; i++){
        let strt = encounters.childStructs[i];
        this.attachObject( new ModuleEncounter(GFFObject.FromStruct(strt)) );
      }
    }

    //Doors
    if(doors){
      for(let i = 0; i < doors.childStructs.length; i++ ){
        let strt = doors.childStructs[i];
        this.attachObject( new ModuleDoor(GFFObject.FromStruct(strt)) );
      }
    }

    //Placeables
    if(placeables){
      for(let i = 0; i < placeables.childStructs.length; i++ ){
        let strt = placeables.childStructs[i];
        this.attachObject( new ModulePlaceable(GFFObject.FromStruct(strt)) );
      }
    }

    //Sounds
    if(sounds){
      for(let i = 0; i < sounds.childStructs.length; i++ ){
        let strt = sounds.childStructs[i];
        this.attachObject( new ModuleSound(GFFObject.FromStruct(strt), AudioEngine.GetAudioEngine()) );
      }
    }

    //Stores
    if(stores){
      for(let i = 0; i < stores.childStructs.length; i++ ){
        let strt = stores.childStructs[i];
        this.attachObject( new ModuleStore(GFFObject.FromStruct(strt)) );
      }
    }

    //Waypoints
    if(waypoints){
      for(let i = 0; i < waypoints.childStructs.length; i++ ){
        let strt = waypoints.childStructs[i];

        if(this.transWP){
          if(typeof this.transWP === 'string'){
            if(this.transWP.toLowerCase() == strt.getFieldByLabel('Tag').getValue().toLowerCase()){
              this.transWP = GFFObject.FromStruct(strt);
            }
          }else if(this.transWP instanceof GFFObject){
            if(this.transWP.getFieldByLabel('Tag').getValue().toLowerCase() == strt.getFieldByLabel('Tag').getValue().toLowerCase()){
              this.transWP = GFFObject.FromStruct(strt);
            }
          }
        }
        
        this.attachObject( new ModuleWaypoint(GFFObject.FromStruct(strt)) );
      }
    }

    //AreaMapData
    if(areaMap){
      const areaMapStruct = areaMap.getChildStructs()[0];
      if(areaMapStruct){
        this.areaMap.loadDataStruct(areaMapStruct);
      }
    }

    if(!(this.transWP instanceof GFFObject)){
      this.transWP = null;
    }

    if(this.git.RootNode.hasField('SWVarTable')){
      console.log("SWVarTable", this.git);
      let localBools = this.git.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0].getFieldByLabel('BitArray').getChildStructs();
      //console.log(localBools);
      for(let i = 0; i < localBools.length; i++){
        let data = localBools[i].getFieldByLabel('Variable').getValue();
        for(let bit = 0; bit < 32; bit++){
          this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
        }
      }
    }

    GameState.AlphaTest = this.Alphatest;

    AudioEngine.GetAudioEngine().SetReverbProfile(this.audio.EnvAudio);

    FollowerCamera.setCameraStyle(this.getCameraStyle());
    if(this.miniGame){
      FollowerCamera.setCameraFOV(this.miniGame.cameraViewAngle);
    }else{
      FollowerCamera.setCameraFOV(FollowerCamera.DEFAULT_FOV);
    }

    this.loadVis( () => {
      this.loadLayout( () => {
        this.loadPath( () => {
          this.loadScripts();
          GameState.scene.fog = this.fog;
          if(typeof onLoad == 'function')
            onLoad(this);
        });
      });
    });

  }

  getCameraStyle(){
    const cameraStyle2DA = TwoDAManager.datatables.get('camerastyle');
    if(cameraStyle2DA){
      return cameraStyle2DA.rows[this.CameraStyle];
    }
    return cameraStyle2DA.rows[0];
  }

  loadPath(onLoad?: Function){
    console.log('ModuleArea.loadPath');
    this.path = new ModulePath(this._name);
    this.path.load( () => {
      if(typeof onLoad == 'function')
        onLoad(this);
    });
  }

  loadVis(onLoad?: Function){
    console.log('ModuleArea.loadVis');
    ResourceLoader.loadResource(ResourceTypes['vis'], this._name).then((visData: Buffer) => {
      this.visObject = new VISObject(visData, this);
      if(typeof onLoad == 'function')
        onLoad(this);
    }).catch( (e) => {
      console.error(e);
      this.visObject = new VISObject(null, this);
      if(typeof onLoad == 'function')
        onLoad(this);
    });
  }

  loadLayout(onLoad?: Function){
    console.log('ModuleArea.loadLayout');
    ResourceLoader.loadResource(ResourceTypes['lyt'], this._name).then((data: Buffer) => {
      this.layout = new LYTObject(data);

      //Resort the rooms based on the LYT file because it matches the walkmesh transition index numbers
      let sortedRooms = [];
      for(let i = 0; i < this.layout.rooms.length; i++){
        let roomLYT = this.layout.rooms[i];
        for(let r = 0; r != this.rooms.length; r++ ){
          let room = this.rooms[r];
          if(room.roomName.toLowerCase() == roomLYT['name'].toLowerCase()){
            room.position.copy(roomLYT.position);
            sortedRooms.push(room);
          }
        }
      }

      this.rooms = sortedRooms;

      for(let i = 0; i < this.layout.doorhooks.length; i++){
        let _doorHook = this.layout.doorhooks[i];
        this.doorhooks.push(_doorHook);
      }

      if(this.miniGame){
        for(let i = 0; i < this.layout.tracks.length; i++){
          this.miniGame.tracks.push(new ModuleMGTrack(this.layout.tracks[i]));
        }
  
        for(let i = 0; i < this.layout.obstacles.length; i++){
          this.miniGame.obstacles.push(new ModuleMGObstacle(undefined, this.layout.obstacles[i]));
        }
      }

      //Room Linking Pass 1
      for(let ri = 0; ri < this.rooms.length; ri++ ){
        let room = this.rooms[ri];
        let linked_rooms = [];
        if(this.visObject.GetRoom(room.roomName)){
          linked_rooms = this.visObject.GetRoom(room.roomName).rooms;
        }
        room.setLinkedRooms(linked_rooms);
      }

      if(typeof onLoad == 'function')
        onLoad();

    }).catch( (e) => {
      console.error(e);
      this.layout = new LYTObject();
      if(typeof onLoad == 'function')
        onLoad();
    });
  }

  cleanupUninitializedObjects(){

    let i = this.creatures.length
    while (i--) {
      if (!(this.creatures[i] instanceof ModuleCreature) || !this.creatures[i].initialized) { 
        this.creatures.splice(i, 1);
      } 
    }

    i = this.placeables.length
    while (i--) {
      if (!(this.placeables[i] instanceof ModulePlaceable) || !this.placeables[i].initialized) { 
        this.placeables.splice(i, 1);
      } 
    }

    i = this.doors.length
    while (i--) {
      if (!(this.doors[i] instanceof ModuleDoor) || !this.doors[i].initialized) { 
        this.doors.splice(i, 1);
      } 
    }

    i = this.sounds.length
    while (i--) {
      if (!(this.sounds[i] instanceof ModuleSound) || !this.sounds[i].initialized) { 
        this.sounds.splice(i, 1);
      } 
    }

    i = this.waypoints.length
    while (i--) {
      if (!(this.waypoints[i] instanceof ModuleWaypoint) || !this.waypoints[i].initialized) { 
        this.waypoints.splice(i, 1);
      } 
    }

    i = this.triggers.length
    while (i--) {
      if (!(this.triggers[i] instanceof ModuleTrigger) || !this.triggers[i].initialized) { 
        this.triggers.splice(i, 1);
      } 
    }

    i = this.stores.length
    while (i--) {
      if (!(this.stores[i] instanceof ModuleStore) || !this.stores[i].initialized) { 
        this.stores.splice(i, 1);
      } 
    }

  }

  async loadScene(){
    try{
      try { await this.loadRooms(); } catch(e){ console.error(e); }

      MenuManager.LoadScreen.setProgress(10);
      
      try { await this.loadPlayer(); } catch(e){ console.error(e); }

      try { await this.loadCameras(); } catch(e){ console.error(e); }

      try { await this.loadPlaceables(); } catch(e){ console.error(e); }

      MenuManager.LoadScreen.setProgress(20);

      try { await this.loadWaypoints(); } catch(e){ console.error(e); }

      MenuManager.LoadScreen.setProgress(30);

      try { await this.loadAreaEffects(); } catch(e){ console.error(e); }
      try { await this.loadCreatures(); } catch(e){ console.error(e); }
      try { await this.loadParty(); } catch(e){ console.error(e); }

      MenuManager.LoadScreen.setProgress(40);

      try { await this.loadSoundTemplates(); } catch(e){ console.error(e); }

      MenuManager.LoadScreen.setProgress(50);

      try { await this.loadTriggers(); } catch(e){ console.error(e); }

      try { await this.loadEncounters(); } catch(e){ console.error(e); }

      MenuManager.LoadScreen.setProgress(60);

      if(this.miniGame){
        try { await this.miniGame.load(); } catch(e){ console.error(e); }
      }

      MenuManager.LoadScreen.setProgress(70);

      try { await this.loadDoors(); } catch(e){ console.error(e); }

      try { await this.loadStores(); } catch(e){ console.error(e); }

      MenuManager.LoadScreen.setProgress(80);
      try { await this.loadTextures(); } catch(e){ console.error(e); }

      MenuManager.LoadScreen.setProgress(90);

      try { await this.loadAudio(); } catch(e){ console.error(e); }
      try { await this.loadBackgroundMusic(); } catch(e){ console.error(e); }

      MenuManager.LoadScreen.setProgress(100);

      FollowerCamera.facing = Utility.NormalizeRadian(GameState.player.getFacing() - Math.PI/2);

      try { await this.weather.load(); } catch(e){ console.error(e); }

      this.transWP = null;

      this.cleanupUninitializedObjects();
      this.detectRoomObjects();
    }catch(e){
      console.error(e);
    }

  }

  loadCameras(){
    for(let i = 0; i < this.cameras.length; i++){
      const camera = this.cameras[i];
      camera.load();
      GameState.staticCameras.push(camera.perspectiveCamera);
    }
  }

  getSpawnLocation(){

    if(GameState.isLoadingSave){
      return new EngineLocation(
        PartyManager.PlayerTemplate.RootNode.getFieldByLabel('XPosition').getValue(),
        PartyManager.PlayerTemplate.RootNode.getFieldByLabel('YPosition').getValue(),
        PartyManager.PlayerTemplate.RootNode.getFieldByLabel('ZPosition').getValue(),
        PartyManager.PlayerTemplate.RootNode.getFieldByLabel('XOrientation').getValue(),
        PartyManager.PlayerTemplate.RootNode.getFieldByLabel('YOrientation').getValue(),
        0
      );
    }else if(this.transWP instanceof GFFObject){
      console.log('TransWP', this.transWP);
      return new EngineLocation(
        this.transWP.RootNode.getFieldByLabel('XPosition').getValue(),
        this.transWP.RootNode.getFieldByLabel('YPosition').getValue(),
        this.transWP.RootNode.getFieldByLabel('ZPosition').getValue(),
        this.transWP.RootNode.getFieldByLabel('XOrientation').getValue(),
        this.transWP.RootNode.getFieldByLabel('YOrientation').getValue(),
        0
      );
    }else{
      console.log('No TransWP');
      return new EngineLocation(
        GameState.module['Mod_Entry_X'],
        GameState.module['Mod_Entry_Y'],
        GameState.module['Mod_Entry_Z'],
        GameState.module['Mod_Entry_Dir_X'],
        GameState.module['Mod_Entry_Dir_Y'],
        0
      );
    }

  }

  getPlayerTemplate(): GFFObject {
    if(PartyManager.PlayerTemplate){
      PartyManager.PlayerTemplate.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( ModuleObjectManager.GetNextPlayerId() );
      return PartyManager.PlayerTemplate;
    }else{
      return PartyManager.ResetPlayerTemplate();
    }
  }

  attachObject(object: ModuleObject){
    if(!object) return;
    object.area = this;

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleCreature)){
      this.creatures.push(object as ModuleCreature);
    }

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModulePlaceable)){
      this.placeables.push(object as ModulePlaceable);
    }

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleDoor)){
      this.doors.push(object as ModuleDoor);
    }

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleTrigger)){
      this.triggers.push(object as ModuleTrigger);
    }

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleEncounter)){
      this.encounters.push(object as ModuleEncounter);
    }

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleStore)){
      this.stores.push(object as ModuleStore);
    }

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleWaypoint)){
      this.waypoints.push(object as ModuleWaypoint);
    }

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleSound)){
      this.sounds.push(object as ModuleSound);
    }

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleAreaOfEffect)){
      this.areaOfEffects.push(object as ModuleAreaOfEffect);
    }
  }

  detachObject(object: ModuleObject){
    if(!object) return;

    object.area = undefined;

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleCreature)){
      const idx = this.creatures.indexOf(object as ModuleCreature);
      if(idx >= 0){
        this.creatures.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModulePlaceable)){
      const idx = this.placeables.indexOf(object as ModulePlaceable);
      if(idx >= 0){
        this.placeables.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleDoor)){
      const idx = this.doors.indexOf(object as ModuleDoor);
      if(idx >= 0){
        this.doors.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleTrigger)){
      const idx = this.triggers.indexOf(object as ModuleTrigger);
      if(idx >= 0){
        this.triggers.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleEncounter)){
      const idx = this.encounters.indexOf(object as ModuleEncounter);
      if(idx >= 0){
        this.encounters.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleStore)){
      const idx = this.stores.indexOf(object as ModuleStore);
      if(idx >= 0){
        this.stores.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleWaypoint)){
      const idx = this.waypoints.indexOf(object as ModuleWaypoint);
      if(idx >= 0){
        this.waypoints.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleSound)){
      const idx = this.sounds.indexOf(object as ModuleSound);
      if(idx >= 0){
        this.sounds.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleAreaOfEffect)){
      const idx = this.areaOfEffects.indexOf(object as ModuleAreaOfEffect);
      if(idx >= 0){
        this.areaOfEffects.splice(idx, 1);
      }
    }else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleItem)){
      const idx = this.items.indexOf(object as ModuleItem);
      if(idx >= 0){
        this.items.splice(idx, 1);
      }
    }else{
      console.warn(`destroyObject: unhandled objectType, ${object.objectType}`);
    }
  }

  async loadPlayer(): Promise<void> {
    return new Promise<void>( (resolve, reject) => {
      console.log('Loading Player', GameState.player)
      try{
        if(GameState.player instanceof ModuleCreature){
          GameState.player.partyID = -1;

          if(!this.miniGame){
            PartyManager.party[ PartyManager.GetCreatureStartingPartyIndex(GameState.player) ] = GameState.player;
            GameState.group.party.add( GameState.player.container );
          }

          //Reset the players actions between modules
          GameState.player.clearAllActions();
          GameState.player.force = 0;
          GameState.player.collisionData.groundFace = undefined;
          GameState.player.collisionData.lastGroundFace = undefined;
          GameState.player.load();
          GameState.player.loadModel().then( (model: OdysseyModel3D) => {
            GameState.player.model = model;
            GameState.player.model.hasCollision = true;
            //let spawnLoc = this.getSpawnLocation();
            let spawnLoc = PartyManager.GetSpawnLocation(GameState.player);
            GameState.player.position.copy(spawnLoc.position);
            GameState.player.setFacing(-Math.atan2(spawnLoc.rotation.x, spawnLoc.rotation.y), true);

            GameState.player.getCurrentRoom();
            // GameState.player.computeBoundingBox(true);

            resolve();
          }).catch(() => {
            resolve();
          });
        }else{
          let player = new ModulePlayer( this.getPlayerTemplate() );
          player.partyID = -1;
          
          player.load();
          GameState.player = player;
        
          if(!this.miniGame){
            PartyManager.party[ PartyManager.GetCreatureStartingPartyIndex(player) ] = player;
            GameState.group.party.add( player.container );
          }

          player.loadModel().then( (model: OdysseyModel3D) => {
            model.userData.moduleObject = player;
            model.hasCollision = true;

            let spawnLoc = this.getSpawnLocation();

            player.position.copy(spawnLoc.position);
            player.setFacing(-Math.atan2(spawnLoc.rotation.x, spawnLoc.rotation.y), true);
            //player.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation));

            player.getCurrentRoom();
            player.computeBoundingBox(true);

            resolve();
          });
        }
      }catch(e){
        console.error(e);
      }
    });
  }

  async loadParty(): Promise<void> {
    return new Promise<void>( (resolve, reject) => {
      console.log('Loading Party Member')
      let loop = new AsyncLoop({
        array: PartyManager.CurrentMembers,
        onLoop: (currentMember: any, asyncLoop: AsyncLoop) => {
          PartyManager.LoadPartyMember(asyncLoop.index-1, () => {
            asyncLoop.next();
          });
        }
      });
      loop.iterate(() => {
        resolve();
      });
    });
  }

  async loadRooms(): Promise<void> {
    return new Promise<void>( (resolve, reject) => {
      console.log('Loading Rooms');
      let loop = new AsyncLoop({
        array: this.rooms,
        onLoop: (room: ModuleRoom, asyncLoop: AsyncLoop) => {
          room.loadModel().then( (model: OdysseyModel3D) => {
            if(room.model instanceof OdysseyModel3D){

              if(room.collisionData.walkmesh instanceof OdysseyWalkMesh){
                GameState.walkmeshList.push( room.collisionData.walkmesh.mesh );
                GameState.group.room_walkmeshes.add( room.collisionData.walkmesh.mesh );
              }
    
              if(typeof room.model.walkmesh != 'undefined'){
                GameState.collisionList.push(room.model.walkmesh);
              }
              
              room.model.name = room.roomName;
              GameState.group.rooms.add(room.container);
    
              room.computeBoundingBox();
              room.model.updateMatrix();
              
            }
            
            asyncLoop.next();
          });
        }
      });
      loop.iterate(() => {
        for(let j = 0; j < this.rooms.length; j++){
          this.rooms[j].link_rooms(this.rooms);
        }

        //Room Linking Pass 2
        for(let i = 0, iLen = this.rooms.length; i < iLen; i++ ){
          let room1 = this.rooms[i];
          //console.log(room1.linked_rooms);
          //Look for all rooms that can see this room
          for(let j = 0, jLen = this.rooms.length; j < jLen; j++){
            let room2 = this.rooms[j];
            //console.log(room2.linked_rooms);
            if(room2 instanceof ModuleRoom){
              let room2_links_to_room1 = room2.linked_rooms.indexOf(room1) >= 0;
              let room1_links_to_room2 = room1.linked_rooms.indexOf(room2) >= 0;
  
              let should_link = room2_links_to_room1 || room1_links_to_room2;
              //console.log('room', room1.roomName, room2.roomName, should_link);
              if(should_link && room1.linked_rooms.indexOf(room2) == -1 ){
                room1.linked_rooms.push(room2);
              }
  
              if(should_link && room2.linked_rooms.indexOf(room1) == -1 ){
                room2.linked_rooms.push(room1);
              }
            }
          }
          this.walkmesh_rooms = [room1].concat(room1.linked_rooms);
        }
        resolve();
      });

    });
  }

  async loadDoors(): Promise<void> {
    return new Promise<void>( (resolve, reject) => {
      console.log('Loading Doors');
      let loop = new AsyncLoop({
        array: this.doors,
        onLoop: (door: ModuleDoor, asyncLoop: AsyncLoop) => {
          door.load();
  
          // door.position.x = door.getX();
          // door.position.y = door.getY();
          // door.position.z = door.getZ();
          door.rotation.set(0, 0, door.getBearing());
          door.loadModel().then( (model: OdysseyModel3D) => {
            door.loadWalkmesh(model.name, (dwk: OdysseyWalkMesh) => {
              door.computeBoundingBox();
              try{
                model.userData.walkmesh = dwk;
                door.collisionData.walkmesh = dwk;
                GameState.walkmeshList.push( dwk.mesh );
  
                if(dwk.mesh instanceof THREE.Object3D){
                  dwk.mat4.makeRotationFromEuler(door.rotation);
                  dwk.mat4.setPosition( door.position.x, door.position.y, door.position.z);
                  dwk.mesh.geometry.applyMatrix4(dwk.mat4);
                  dwk.updateMatrix();
                  //dwk.mesh.position.copy(door.position);
                  // if(!door.isOpen()){
                  //   GameState.group.room_walkmeshes.add( dwk.mesh );
                  // }
                }

                if(door.model instanceof OdysseyModel3D){
                  door.box.setFromObject(door.model);
                }
  
                if(door.openState){
                  door.model.playAnimation('opened1', true);
                }
              }catch(e){
                console.error('Failed to add dwk', model.name, dwk, e);
              }
  
              door.getCurrentRoom();
              GameState.group.doors.add( door.container );

              asyncLoop.next();
            });
          });
        }
      });
      loop.iterate(() => {
        resolve();
      });

    });
  }

  async loadPlaceables(): Promise<void> {
    return new Promise<void>( (resolve, reject) => {
      console.log('Loading Placeables');
      let loop = new AsyncLoop({
        array: this.placeables,
        onLoop: (plc: ModulePlaceable, asyncLoop: AsyncLoop) => {
          plc.load();
          plc.position.set(plc.getX(), plc.getY(), plc.getZ());
          plc.rotation.set(0, 0, plc.getBearing());
          plc.loadModel().then( (model: OdysseyModel3D) => {
            GameState.group.placeables.add( plc.container );
            plc.loadWalkmesh(model.name, (pwk: OdysseyWalkMesh) => {
              GameState.walkmeshList.push( pwk.mesh );
              plc.computeBoundingBox();

              if(pwk.mesh instanceof THREE.Object3D){
                pwk.mat4.makeRotationFromEuler(plc.rotation);
                pwk.mat4.setPosition( plc.position.x, plc.position.y, plc.position.z + .01 );
                pwk.mesh.geometry.applyMatrix4(pwk.mat4);
                pwk.updateMatrix();
                //pwk.mesh.position.copy(plc.position);
                GameState.group.room_walkmeshes.add( pwk.mesh );
              }
  
              plc.getCurrentRoom();
              plc.position.set(plc.getX(), plc.getY(), plc.getZ());
              plc.computeBoundingBox();
  
              asyncLoop.next()
            });
          });
        }
      });
      loop.iterate(() => {
        resolve();
      });
    });
  }

  async loadWaypoints(): Promise<void> {
    return new Promise<void>( (resolve, reject) => {
      console.log('Loading Waypoints');
      let loop = new AsyncLoop({
        array: this.waypoints,
        onLoop: (waypnt: ModuleWaypoint, asyncLoop: AsyncLoop) => {
          waypnt.load();
          let wpObj = new THREE.Object3D();
          wpObj.name = waypnt.getTag();
          wpObj.position.copy(waypnt.position);
          wpObj.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), Math.atan2(-waypnt.getYOrientation(), -waypnt.getXOrientation()));
          waypnt.rotation.z = Math.atan2(-waypnt.getYOrientation(), -waypnt.getXOrientation()) + Math.PI/2;
          GameState.group.waypoints.add(wpObj);

          let _distance = 1000000000;
          let _currentRoom = null;
          let roomCenter = new THREE.Vector3();
          for(let i = 0; i < GameState.group.rooms.children.length; i++){
            let room = GameState.group.rooms.children[i];
            if(room instanceof OdysseyModel3D){
              if(room.box.containsPoint(wpObj.position)){
                room.box.getCenter(roomCenter);
                let distance = wpObj.position.distanceTo(roomCenter);
                if(distance < _distance){
                  _distance = distance;
                  _currentRoom = room;
                }
              }
            }
          }
          wpObj.userData.area = _currentRoom;
          this.areaMap.addMapNote(waypnt);
          asyncLoop.next();
        }
      });
      loop.iterate(() => {
        resolve();
      });
    });
  }

  async loadEncounters(): Promise<void>{
    return new Promise<void>( (resolve, reject) => {
      console.log('Loading Encounters');
      let loop = new AsyncLoop({
        array: this.encounters,
        onLoop: (encounter: ModuleEncounter, asyncLoop: AsyncLoop) => {
          try{
            encounter.load();
            let _distance = 1000000000;
            let _currentRoom = null;
            let roomCenter = new THREE.Vector3();
            for(let i = 0; i < GameState.group.rooms.children.length; i++){
              let room = GameState.group.rooms.children[i];
              if(room instanceof OdysseyModel3D){
                if(room.box.containsPoint(encounter.mesh.position)){
                  room.box.getCenter(roomCenter);
                  let distance = encounter.mesh.position.distanceTo(roomCenter);
                  if(distance < _distance){
                    _distance = distance;
                    _currentRoom = room;
                  }
                }
              }
            }
            encounter.mesh.userData.area = _currentRoom;
            asyncLoop.next();
          }catch(e){
            console.error(e);
            asyncLoop.next();
          }
        }
      });
      loop.iterate(() => {
        resolve();
      });
    });
  }

  async loadAreaEffects(): Promise<void>{
    return new Promise<void>( (resolve, reject) => {
      console.log('Loading AreaEffects');
      let loop = new AsyncLoop({
        array: this.areaOfEffects,
        onLoop: (aoe: ModuleAreaOfEffect, asyncLoop: AsyncLoop) => {
          try{
            aoe.load();
            GameState.group.effects.add( aoe.container );
            asyncLoop.next();
          }catch(e){
            console.error(e);
            asyncLoop.next();
          }
        }
      });
      loop.iterate(() => {
        resolve();
      });
    });
  }

  async loadTriggers(): Promise<void>{
    return new Promise<void>( (resolve, reject) => {
      console.log('Loading Triggers');
      let loop = new AsyncLoop({
        array: this.triggers,
        onLoop: (trig: ModuleTrigger, asyncLoop: AsyncLoop) => {
          try{
            trig.load();
            let _distance = 1000000000;
            let _currentRoom = null;
            let roomCenter = new THREE.Vector3();
            for(let i = 0; i < GameState.group.rooms.children.length; i++){
              let room = GameState.group.rooms.children[i];
              if(room instanceof OdysseyModel3D){
                if(room.box.containsPoint(trig.mesh.position)){
                  room.box.getCenter(roomCenter);
                  let distance = trig.mesh.position.distanceTo(roomCenter);
                  if(distance < _distance){
                    _distance = distance;
                    _currentRoom = room;
                  }
                }
              }
            }
            trig.mesh.userData.area = _currentRoom;
            asyncLoop.next();
          }catch(e){
            console.error(e);
            asyncLoop.next();
          }
        }
      });
      loop.iterate(() => {
        resolve();
      });
    });
  }

  async loadCreatures(): Promise<void>{
    return new Promise<void>( (resolve, reject) => {
      console.log('Loading Creatures');
      let loop = new AsyncLoop({
        array: this.creatures,
        onLoop: (creature: ModuleCreature, asyncLoop: AsyncLoop) => {
          creature.load();
          creature.loadModel().then( (model: OdysseyModel3D) => {
            creature.model.userData.moduleObject = creature;
            
            //creature.setFacing(Math.atan2(creature.getXOrientation(), creature.getYOrientation()) + Math.PI/2, true);
            creature.setFacing(-Math.atan2(creature.getXOrientation(), creature.getYOrientation()), true);

            model.hasCollision = true;
            model.name = creature.getTag();
            GameState.group.creatures.add( creature.container );

            creature.getCurrentRoom();
            creature.updateCollision(0.0000000000000000000001);
            creature.update(0.0000000000000000000001);
            creature.computeBoundingBox();

            asyncLoop.next();
          });
        }
      });
      loop.iterate(() => {
        resolve();
      });

    });
  }

  async loadStores(): Promise<void>{
    return new Promise<void>( (resolve, reject) => {
      console.log('Loading Stores');
      let loop = new AsyncLoop({
        array: this.stores,
        onLoop: (store: ModuleStore, asyncLoop: AsyncLoop) => {
          store.load();
          asyncLoop.next();
        }
      });
      loop.iterate(() => {
        resolve();
      });

    });
  }

  async loadSoundTemplates(): Promise<void>{
    return new Promise<void>( (resolve, reject) => {
      console.log('Loading Sound Emitter');
      let loop = new AsyncLoop({
        array: this.sounds,
        onLoop: (sound: ModuleSound, asyncLoop: AsyncLoop) => {
          sound.load();
          sound.loadSound( () => {
            asyncLoop.next();
          });
        }
      });
      loop.iterate(() => {
        resolve();
      });
    });
  }

  loadAudio(): Promise<void>{
    return new Promise<void>( (resolve, reject) => {
      const ambientsound2DA = TwoDAManager.datatables.get('ambientsound');
      if(ambientsound2DA){
        let ambientDay = ambientsound2DA.rows[this.audio.AmbientSndDay].resource;

        AudioLoader.LoadAmbientSound(ambientDay, (data: Buffer) => {
          //console.log('Loaded Ambient Sound', ambientDay);
          AudioEngine.GetAudioEngine().SetAmbientSound(data);
          resolve();
        }, () => {
          console.error('Ambient Audio not found', ambientDay);
          resolve();
        });
      }else{
        resolve();
      }
    });
  }

  loadBackgroundMusic(): Promise<void>{
    return new Promise<void>( (resolve, reject) => {
      const ambientmusic2DA = TwoDAManager.datatables.get('ambientmusic');
      if(ambientmusic2DA){
        let bgMusic = ambientmusic2DA.rows[this.audio.MusicDay].resource;

        AudioLoader.LoadMusic(bgMusic, (data: Buffer) => {
          //console.log('Loaded Background Music', bgMusic);
          AudioEngine.GetAudioEngine().SetBackgroundMusic(data);
          resolve();
        }, () => {
          console.error('Background Music not found', bgMusic);
          resolve();
        });
      }else{
        resolve();
      }
    });
  }

  async loadTextures(): Promise<void>{
    return new Promise<void>( (resolve, reject) => {
      resolve();
    });
  }

  loadScripts(){
    console.log('ModuleArea.loadScripts');
    let keys = Object.keys(this.scripts);
    for(let i = 0; i < keys.length; i++){
      const key = keys[i];
      let _script = this.scripts[key];
      if( (typeof _script === 'string' && _script != '') ){
        this.scripts[key] = NWScript.Load(_script);
      }
    }
  }

  async initAreaObjects(runSpawnScripts = false){

    for(let i = 0; i < this.doors.length; i++){
      if(this.doors[i] instanceof ModuleObject){
        this.doors[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < this.placeables.length; i++){
      if(this.placeables[i] instanceof ModuleObject){
        this.placeables[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < this.triggers.length; i++){
      if(this.triggers[i] instanceof ModuleObject){
        this.triggers[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < this.waypoints.length; i++){
      if(this.waypoints[i] instanceof ModuleObject){
        this.waypoints[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < this.creatures.length; i++){
      if(this.creatures[i] instanceof ModuleObject){
        this.creatures[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < PartyManager.party.length; i++){
      if(PartyManager.party[i] instanceof ModuleObject){
        PartyManager.party[i].onSpawn(runSpawnScripts);
      }
    }

    if(this.miniGame){
      this.miniGame.initMiniGameObjects();
    }

    this.runStartScripts();

  }

  runOnEnterScripts(){
    if(this.scripts.onEnter instanceof NWScriptInstance){
      console.log('onEnter', this.scripts.onEnter, GameState.player)
      this.scripts.onEnter.enteringObject = GameState.player;
      this.scripts.onEnter.debug.action = true;
      this.scripts.onEnter.run(this, 0);
    }
  }

  async runStartScripts(){
    if(this.miniGame) this.miniGame.runMiniGameScripts();
    this.runOnEnterScripts();
  }

  detectRoomObjects(){
    for(let i = 0, len = this.rooms.length; i < len; i++){
      this.rooms[i].detectChildObjects();
    }
  }

  isPointWalkable(point: any){
    for(let i = 0, len = this.rooms.length; i < len; i++){
      if(this.rooms[i].collisionData.walkmesh && this.rooms[i].collisionData.walkmesh.isPointWalkable(point)){
        return true;
      }
    }
    return false;
  }

  getNearestWalkablePoint(point: any){
    let nearest = Infinity;
    let nearest_point = undefined;

    let p = undefined;
    let p_dist = 0;
    for(let i = 0, len = this.rooms.length; i < len; i++){
      if(this.rooms[i].collisionData.walkmesh){
        p = this.rooms[i].collisionData.walkmesh.getNearestWalkablePoint(point);
        if(p){
          p_dist = p.distanceTo(point);
          if(p_dist < nearest){
            nearest_point = p;
            nearest = p_dist;
          }
        }
      }
    }
    return nearest_point;
  }

  setRestrictMode( restrictMode = 0 ){
    this.restrictMode = restrictMode;
  }

  toolsetExportARE(){
    let are = new GFFObject();
    are.FileType = 'ARE ';
    are.RootNode.addField(
      new GFFField(GFFDataType.FLOAT, 'AlphaTest', this.AlphaTest)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.INT, 'CameraStyle', this.CameraStyle)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.INT, 'ChanceLightning', this.ChanceLightning)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.INT, 'ChanceRain', this.ChanceRain)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.INT, 'ChanceSnow', this.ChanceSnow)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.CEXOSTRING, 'Comments', this.Comments)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.INT, 'Creator_ID', this.Creator_ID)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.BYTE, 'DayNightCycle', this.DayNightCycle)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.RESREF, 'DefaultEnvMap', this.DefaultEnvMap)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.DWORD, 'DynAmbientColor', this.DynAmbientColor)
    );

    are.RootNode.addField(
      new GFFField(GFFDataType.LIST, 'Expansion_List')
    );

    are.RootNode.addField(
      new GFFField(GFFDataType.DWORD, 'Flags', this.Flags)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.DWORD, 'Grass_Ambient', this.Grass.Ambient)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.FLOAT, 'Grass_Density', this.Grass.Density)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.DWORD, 'Grass_Diffuse', this.Grass.Diffuse)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.FLOAT, 'Grass_Prob_LL', this.Grass.Prob_LL)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.FLOAT, 'Grass_Prob_LR', this.Grass.Prob_LR)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.FLOAT, 'Grass_Prob_UL', this.Grass.Prob_UL)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.FLOAT, 'Grass_Prob_UR', this.Grass.Prob_UR)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.FLOAT, 'Grass_QuadSize', this.Grass.QuadSize)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.RESREF, 'Grass_TexName', this.Grass.TexName)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.INT, 'ID', this.ID)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.BYTE, 'IsNight', this.IsNight)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.BYTE, 'LightingScheme', this.LightingScheme)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.WORD, 'LoadScreenID', this.LoadScreenID)
    );

    let mapField = new GFFField(GFFDataType.STRUCT, 'Map');
    mapField.addChildStruct(this.areaMap.export());
    are.RootNode.addField(mapField);


    are.RootNode.addField(
      new GFFField(GFFDataType.INT, 'ModListenCheck', this.ModListenCheck)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.INT, 'ModSpotCheck', this.ModSpotCheck)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.DWORD, 'MoonAmbientColor', this.MoonAmbientColor)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.DWORD, 'MoonDiffuseColor', this.MoonDiffuseColor)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.DWORD, 'MoonFogColor', this.MoonFogColor)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.FLOAT, 'MoonFogFar', this.MoonFogFar)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.FLOAT, 'MoonFogNear', this.MoonFogNear)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.BYTE, 'MoonFogOn', this.MoonFogOn)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.BYTE, 'MoonShadows', this.MoonShadows)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.CEXOLOCSTRING, 'Name').setCExoLocString(this.AreaName)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.BYTE, 'NoHangBack', this.NoHangBack)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.BYTE, 'NoRest', this.NoRest)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.RESREF, 'OnEnter', this.onEnter)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.RESREF, 'OnExit', this.onExit)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.RESREF, 'OnHeartbeat', this.onHeartbeat)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.RESREF, 'OnUserDefined', this.onUserDefined)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.BYTE, 'PlayerOnly', this.PlayerOnly)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.BYTE, 'PlayerVsPlayer', this.PlayerVsPlayer)
    );

    let roomsField = new GFFField(GFFDataType.LIST, 'Rooms');
    for(let i = 0, len = this.rooms.length; i < len; i++){
      roomsField.addChildStruct(this.rooms[i].toToolsetInstance());
    }
    are.RootNode.addField(roomsField);

    are.RootNode.addField(
      new GFFField(GFFDataType.BYTE, 'ShadowOpacity', this.ShadowOpacity)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.BYTE, 'StealthXPEnabled', this.StealthXPEnabled)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.DWORD, 'StealthXPLoss', this.StealthXPLoss)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.DWORD, 'StealthXPMax', this.StealthXPMax)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.DWORD, 'SunAmbientColor', this.SunAmbientColor)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.DWORD, 'SunDiffuseColor', this.SunDiffuseColor)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.DWORD, 'SunFogColor', this.SunFogColor)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.FLOAT, 'SunFogFar', this.SunFogFar)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.FLOAT, 'SunFogNear', this.SunFogNear)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.BYTE, 'SunFogOn', this.SunFogOn)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.BYTE, 'SunShadows', this.SunShadows)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.RESREF, 'Tag', this.Tag)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.BYTE, 'Unescapable', this.Unescapable)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.DWORD, 'Version', this.Version)
    );
    are.RootNode.addField(
      new GFFField(GFFDataType.INT, 'WindPower', this.WindPower)
    );

    return are;

  }

  getAreaPropertiesStruct(){
    let struct = new GFFStruct();
    struct.addField( new GFFField(GFFDataType.INT, 'AmbientSndDay') ).setValue(this.audio.AmbientSndDay);
    struct.addField( new GFFField(GFFDataType.INT, 'AmbientSndDayVol') ).setValue(this.audio.AmbientSndDayVol);
    struct.addField( new GFFField(GFFDataType.INT, 'AmbientSndNight') ).setValue(this.audio.AmbientSndNight);
    struct.addField( new GFFField(GFFDataType.INT, 'AmbientSndNitVol') ).setValue(this.audio.AmbientSndNitVol);
    struct.addField( new GFFField(GFFDataType.INT, 'EnvAudio') ).setValue(this.audio.EnvAudio);
    
    struct.addField( new GFFField(GFFDataType.INT, 'MusicBattle') ).setValue(this.audio.MusicBattle);
    struct.addField( new GFFField(GFFDataType.INT, 'MusicDay') ).setValue(this.audio.MusicDay);
    struct.addField( new GFFField(GFFDataType.INT, 'MusicDelay') ).setValue(this.audio.MusicDelay);
    struct.addField( new GFFField(GFFDataType.INT, 'MusicNight') ).setValue(this.audio.MusicNight);

    struct.addField( new GFFField(GFFDataType.BYTE, 'RestrictMode') ).setValue(this.restrictMode ? 1 : 0);
    struct.addField( new GFFField(GFFDataType.DWORD, 'StealthXPCurrent') ).setValue(0);
    struct.addField( new GFFField(GFFDataType.BYTE, 'StealthXPLoss') ).setValue(0);
    struct.addField( new GFFField(GFFDataType.DWORD, 'StealthXPMax') ).setValue(0);
    struct.addField( new GFFField(GFFDataType.DWORD, 'SunFogColor') ).setValue(0);
    
    struct.addField( new GFFField(GFFDataType.BYTE, 'TransPendCurrID') ).setValue(0);
    struct.addField( new GFFField(GFFDataType.BYTE, 'TransPendNextID') ).setValue(0);
    struct.addField( new GFFField(GFFDataType.BYTE, 'TransPending') ).setValue(0);
    struct.addField( new GFFField(GFFDataType.BYTE, 'Unescapable') ).setValue(this.Unescapable);
    return struct;
  }

  saveAreaListStruct(){
    let areaStruct = new GFFStruct();
    areaStruct.addField( new GFFField(GFFDataType.RESREF, 'Area_Name') ).setValue(this._name);
    areaStruct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(this.id);
    //unescapable
    return areaStruct;
  }

  save(){
    let git = new GFFObject();
    git.FileType = 'GIT ';

    let aoeList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'AreaEffectList') );
    for(let i = 0; i < this.areaOfEffects.length; i++){
      aoeList.addChildStruct( this.areaOfEffects[i].save().RootNode );
    }

    let areaMapField = git.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'AreaMap') );
    areaMapField.addChildStruct( this.areaMap.exportData() );

    let areaPropertiesField = git.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'AreaProperties') );
    areaPropertiesField.addChildStruct( this.getAreaPropertiesStruct() );

    let cameraList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'CameraList') );
    for(let i = 0; i < this.cameras.length; i++){
      cameraList.addChildStruct( this.cameras[i].save().RootNode );
    }

    let creatureList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'Creature List') );
    for(let i = 0; i < this.creatures.length; i++){
      creatureList.addChildStruct( this.creatures[i].save().RootNode );
    }

    git.RootNode.addField( new GFFField(GFFDataType.LIST, 'CurrentWeather') ).setValue(0);

    let doorList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'Door List') );
    for(let i = 0; i < this.doors.length; i++){
      doorList.addChildStruct( this.doors[i].save().RootNode );
    }

    let encounterList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'Encounter List') );
    for(let i = 0; i < this.encounters.length; i++){
      encounterList.addChildStruct( this.encounters[i].save().RootNode );
    }

    //Area Items List
    let list = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'List') );

    let placeableList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'Placeable List') );
    for(let i = 0; i < this.placeables.length; i++){
      placeableList.addChildStruct( this.placeables[i].save().RootNode );
    }

    //SWVarTable
    let swVarTable = git.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.addChildStruct( this.getSWVarTableSaveStruct() );

    let soundList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'SoundList') );
    for(let i = 0; i < this.sounds.length; i++){
      soundList.addChildStruct( this.sounds[i].save().RootNode );
    }

    let storeList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'StoreList') );
    for(let i = 0; i < this.stores.length; i++){
      storeList.addChildStruct( this.stores[i].save().RootNode );
    }
    
    git.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TransPendCurrID') ).setValue(0);
    git.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TransPendNextID') ).setValue(0);
    git.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TransPending') ).setValue(0);

    let triggerList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'TriggerList') );
    for(let i = 0; i < this.triggers.length; i++){
      triggerList.addChildStruct( this.triggers[i].save().RootNode );
    }

    git.RootNode.addField( new GFFField(GFFDataType.LIST, 'VarTable') );

    let waypointList = git.RootNode.addField( new GFFField(GFFDataType.LIST, 'WaypointList') );
    for(let i = 0; i < this.waypoints.length; i++){
      waypointList.addChildStruct( this.waypoints[i].save().RootNode );
    }
    
    git.RootNode.addField( new GFFField(GFFDataType.BYTE, 'WeatherStarted') ).setValue(0);

    this.git = git;

    this.are.FileType = 'ARE ';

    return {git: git, are: this.are};
  }
  
  toolsetExportGIT(){
    let git = new GFFObject();
    git.FileType = 'GIT ';

    let areaPropertiesStruct = new GFFStruct(14);
    areaPropertiesStruct.addField( new GFFField(GFFDataType.INT, 'AmbientSndDay') ).setValue(this.audio.AmbientSndDay);
    areaPropertiesStruct.addField( new GFFField(GFFDataType.INT, 'AmbientSndDayVol') ).setValue(this.audio.AmbientSndDayVol);
    areaPropertiesStruct.addField( new GFFField(GFFDataType.INT, 'AmbientSndNight') ).setValue(this.audio.AmbientSndNight);
    areaPropertiesStruct.addField( new GFFField(GFFDataType.INT, 'AmbientSndNitVol') ).setValue(this.audio.AmbientSndNitVol);
    areaPropertiesStruct.addField( new GFFField(GFFDataType.INT, 'EnvAudio') ).setValue(this.audio.EnvAudio);
    areaPropertiesStruct.addField( new GFFField(GFFDataType.INT, 'MusicBattle') ).setValue(this.audio.MusicBattle);
    areaPropertiesStruct.addField( new GFFField(GFFDataType.INT, 'MusicDay') ).setValue(this.audio.MusicDay);
    areaPropertiesStruct.addField( new GFFField(GFFDataType.INT, 'MusicDelay') ).setValue(this.audio.MusicDelay);
    areaPropertiesStruct.addField( new GFFField(GFFDataType.INT, 'MusicNight') ).setValue(this.audio.MusicNight);

    let areaPropertiesField = new GFFField(GFFDataType.STRUCT, 'AreaProperties');
    areaPropertiesField.addChildStruct(areaPropertiesStruct);
    git.RootNode.addField(areaPropertiesField);

    let camerasField = new GFFField(GFFDataType.LIST, 'CameraList');
    for(let i = 0, len = this.cameras.length; i < len; i++){
      camerasField.addChildStruct(this.cameras[i].toToolsetInstance());
    }
    git.RootNode.addField(camerasField);

    let creaturesField = new GFFField(GFFDataType.LIST, 'Creature List');
    for(let i = 0, len = this.creatures.length; i < len; i++){
      creaturesField.addChildStruct(this.creatures[i].toToolsetInstance());
    }
    git.RootNode.addField(creaturesField);

    let doorsField = new GFFField(GFFDataType.LIST, 'Door List');
    for(let i = 0, len = this.doors.length; i < len; i++){
      doorsField.addChildStruct(this.doors[i].toToolsetInstance());
    }
    git.RootNode.addField(doorsField);

    let encountersField = new GFFField(GFFDataType.LIST, 'Encounter List');
    for(let i = 0, len = this.encounters.length; i < len; i++){
      encountersField.addChildStruct(this.encounters[i].toToolsetInstance());
    }
    git.RootNode.addField(encountersField);

    let listField = new GFFField(GFFDataType.LIST, 'List');
    git.RootNode.addField(listField);

    let placeablesField = new GFFField(GFFDataType.LIST, 'Placeable List');
    for(let i = 0, len = this.placeables.length; i < len; i++){
      placeablesField.addChildStruct(this.placeables[i].toToolsetInstance());
    }
    git.RootNode.addField(placeablesField);

    let soundsField = new GFFField(GFFDataType.LIST, 'SoundList');
    for(let i = 0, len = this.sounds.length; i < len; i++){
      soundsField.addChildStruct(this.sounds[i].toToolsetInstance());
    }
    git.RootNode.addField(soundsField);

    let storesField = new GFFField(GFFDataType.LIST, 'StoreList');
    for(let i = 0, len = this.stores.length; i < len; i++){
      storesField.addChildStruct(this.stores[i].toToolsetInstance());
    }
    git.RootNode.addField(storesField);

    let triggersField = new GFFField(GFFDataType.LIST, 'TriggerList');
    for(let i = 0, len = this.triggers.length; i < len; i++){
      triggersField.addChildStruct(this.triggers[i].toToolsetInstance());
    }
    git.RootNode.addField(triggersField);

    git.RootNode.addField(new GFFField(GFFDataType.BYTE, 'UseTemplates')).setValue(1);

    let waypointsField = new GFFField(GFFDataType.LIST, 'WaypointList');
    for(let i = 0, len = this.waypoints.length; i < len; i++){
      waypointsField.addChildStruct(this.waypoints[i].toToolsetInstance());
    }
    git.RootNode.addField(waypointsField);

    return git;
  }

}
