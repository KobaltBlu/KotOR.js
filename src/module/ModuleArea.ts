/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { GameState } from "../GameState";
import { PartyManager } from "../managers/PartyManager";
import { GFFObject } from "../resource/GFFObject";
import { OdysseyModel3D } from "../three/odyssey";
import { AreaMap } from "./AreaMap";
import { AreaWeather } from "./AreaWeather";
import * as THREE from "three";
import { Module, ModuleCamera, ModuleCreature, ModuleDoor, ModuleEncounter, ModuleMGEnemy, ModuleMGObstacle, ModuleMGPlayer, ModuleMGTrack, ModuleObject, ModulePath, ModulePlaceable, ModulePlayer, ModuleRoom, ModuleSound, ModuleStore, ModuleTrigger, ModuleWaypoint } from ".";
import { AsyncLoop } from "../utility/AsyncLoop";
import { TextureLoader } from "../loaders/TextureLoader";
import { GFFField } from "../resource/GFFField";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFStruct } from "../resource/GFFStruct";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { NWScript } from "../nwscript/NWScript";
import { ResourceTypes } from "../resource/ResourceTypes";
import { ResourceLoader } from "../resource/ResourceLoader";
import { LYTObject } from "../resource/LYTObject";
import { Utility } from "../utility/Utility";
import EngineLocation from "../engine/EngineLocation";
import { ModuleCreatureArmorSlot } from "../enums/module/ModuleCreatureArmorSlot";
import { OdysseyWalkMesh } from "../odyssey";
import { AudioLoader } from "../audio/AudioLoader";
import { TwoDAManager } from "../managers/TwoDAManager";
import { EngineMode } from "../enums/engine/EngineMode";
import { CExoLocString } from "../resource/CExoLocString";
import { VISObject } from "../resource/VISObject";
import { MenuManager } from "../gui";
import { TextureLoaderQueuedRef } from "../interface/loaders/TextureLoaderQueuedRef";
import { FollowerCamera } from "../engine/FollowerCamera";

/* @file
 * The ModuleArea class.
 */

export class ModuleArea extends ModuleObject {

  cameras: ModuleCamera[] = [];
  creatures: ModuleCreature[] = [];
  doorhooks: any[] = [];
  doors: ModuleDoor[] = [];
  encounters: ModuleEncounter[] = [];
  obstacles: ModuleMGObstacle[] = [];
  items: any[] = [];
  party: any[] = [];
  placeables: ModulePlaceable[] = [];
  // rooms: ModuleRoom[] = [];
  sounds: ModuleSound[] = [];
  stores: ModuleStore[] = [];
  tracks: ModuleMGTrack[] = [];
  triggers: ModuleTrigger[] = [];
  waypoints: ModuleWaypoint[] = [];

  audio = {
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

  Map = {
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
  }

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
  MiniGame: any;
  cameraBoundingBox: any;
  Alphatest: any;
  onEnter: any;
  onExit: any;
  onHeartbeat: any;
  onUserDefined: any;
  // scripts: { onEnter: any; onExit: any; onHeartbeat: any; onUserDefined: any; };
  fog: any;
  // _locals: any;
  path: ModulePath;
  visObject: VISObject;
  layout: LYTObject;
  walkmesh_rooms: any[];
  restrictMode: number;

  constructor(name = '', are = new GFFObject(), git = new GFFObject()){
    super(are);
    this._name = name;
    this.are = are;
    this.git = git;

    this.transWP = '';
    this.weather = new AreaWeather(this);

  }

  dispose(){

    //Clear room geometries
    while (this.rooms.length){
      this.rooms[0].destroy();
    }

    //Clear creature geometries
    while (this.creatures.length){
      this.creatures[0].destroy();
    }

    //Clear item geometries
    while (this.items.length){
      this.items[0].destroy();
    }

    //Clear placeable geometries
    while (this.placeables.length){
      this.placeables[0].destroy();
    }

    //Clear door geometries
    while (this.doors.length){
      this.doors[0].destroy();
    }

    //Clear trigger geometries
    while (this.triggers.length){
      this.triggers[0].destroy();
    }

    while (PartyManager.party.length){
      const pm = PartyManager.party.shift();
      pm.destroy();
    }

    //Clear sound geometries
    while (GameState.group.sounds.children.length){
      GameState.group.sounds.remove(GameState.group.sounds.children[0]);
    }

    //Clear grass geometries
    while (GameState.group.grass.children.length){
      (GameState.group.grass.children[0] as any).geometry.dispose();
      (GameState.group.grass.children[0] as any).material.dispose();
      GameState.group.grass.remove(GameState.group.grass.children[0]);
    }

    this.weather.destroy();
    
  }

  update(delta: number = 0){
    let roomCount = this.rooms.length;
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
      for(let i = 0; i < this.MiniGame.Enemies.length; i++){
        this.MiniGame.Enemies[i].update(delta);
      }
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
      for(let i = 0; i < this.MiniGame.Enemies.length; i++){
        this.MiniGame.Enemies[i].update(delta);
      }
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
    
    if(GameState.Mode == EngineMode.DIALOG){
      pos = GameState.currentCamera.position.clone().add(GameState.playerFeetOffset);
      for(let i = 0, il = this.rooms.length; i < il; i++){
        const room = this.rooms[i];
        if(!room.hasVISObject || room.box.containsPoint(pos)){
          roomList.push(room);
        }
      }

      for(let i = 0; i < roomList.length; i++){
        roomList[i].show(true);
      }
    }else if(PartyManager.party[0]){
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
    }
  }

  reloadTextures(){
    MenuManager.LoadScreen.Open();
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
        creature.LoadModel().then(() => {
          asyncLoop.next();
        });
      }
    }).iterate(() => {
      new AsyncLoop({
        array: PartyManager.party,
        onLoop: (partyMember: ModuleCreature, asyncLoop: AsyncLoop) => {
          partyMember.LoadModel().then(() => {
            asyncLoop.next();
          });
        }
      }).iterate(() => {
        new AsyncLoop({
          array: this.placeables,
          onLoop: (placeable: ModulePlaceable, asyncLoop: AsyncLoop) => {
            placeable.LoadModel().then(() => {
              asyncLoop.next();
            });
          }
        }).iterate(() => {
          new AsyncLoop({
            array: this.doors,
            onLoop: (door: ModuleDoor, asyncLoop: AsyncLoop) => {
              door.LoadModel().then(() => {
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
                MenuManager.LoadScreen.Close();
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

  SetTransitionWaypoint(sTag = ''){
    this.transWP = sTag;
  }

  Load(onLoad?: Function){

    //BEGIN AREA LOAD

    if(this.are.RootNode.HasField('ObjectId'))
      this.id = this.are.GetFieldByLabel('ObjectId').GetValue();

    let rooms = this.are.GetFieldByLabel('Rooms');

    this.Alphatest = this.are.GetFieldByLabel('AlphaTest').GetValue();
    this.CameraStyle = this.are.GetFieldByLabel('CameraStyle').GetValue();
    this.ChanceLightning = this.are.GetFieldByLabel('ChanceLightning').GetValue();
    this.ChanceRain = this.are.GetFieldByLabel('ChanceRain').GetValue();
    this.ChanceSnow = this.are.GetFieldByLabel('ChanceSnow').GetValue();
    this.Comments = this.are.GetFieldByLabel('Comments').GetValue();
    this.Creator_ID = this.are.GetFieldByLabel('Creator_ID').GetValue();
    this.DayNightCycle = this.are.GetFieldByLabel('DayNightCycle').GetValue();
    this.DefaultEnvMap = this.are.GetFieldByLabel('DefaultEnvMap').GetValue();
    this.DynAmbientColor = this.are.GetFieldByLabel('DynAmbientColor').GetValue();
    this.Expansion_List = [];

    this.Flags = this.are.GetFieldByLabel('Flags').GetValue();
    this.Grass = {
      Ambient: this.are.GetFieldByLabel('Grass_Ambient').GetValue(),
      Density: this.are.GetFieldByLabel('Grass_Density').GetValue(),
      Diffuse: this.are.GetFieldByLabel('Grass_Diffuse').GetValue(),
      Prob_LL: this.are.GetFieldByLabel('Grass_Prob_LL').GetValue(),
      Prob_LR: this.are.GetFieldByLabel('Grass_Prob_LR').GetValue(),
      Prob_UL: this.are.GetFieldByLabel('Grass_Prob_UL').GetValue(),
      Prob_UR: this.are.GetFieldByLabel('Grass_Prob_UR').GetValue(),
      QuadSize: this.are.GetFieldByLabel('Grass_QuadSize').GetValue(),
      TexName: this.are.GetFieldByLabel('Grass_TexName').GetValue()
    };

    this.ID = this.are.GetFieldByLabel('ID').GetValue();
    this.IsNight = this.are.GetFieldByLabel('IsNight').GetValue();
    this.LightingScheme = this.are.GetFieldByLabel('LightingScheme').GetValue();
    this.LoadScreenID = this.are.GetFieldByLabel('LoadScreenID').GetValue();

    let map = this.are.GetFieldByLabel('Map').GetChildStructs()[0];

    this.Map = {
      MapPt1X: map.GetFieldByLabel('MapPt1X').GetValue(),
      MapPt1Y: map.GetFieldByLabel('MapPt1Y').GetValue(),
      MapPt2X: map.GetFieldByLabel('MapPt2X').GetValue(),
      MapPt2Y: map.GetFieldByLabel('MapPt2Y').GetValue(),
      MapResX: map.GetFieldByLabel('MapResX').GetValue(),
      MapZoom: map.GetFieldByLabel('MapZoom').GetValue(),
      NorthAxis: map.GetFieldByLabel('NorthAxis').GetValue(),
      WorldPt1X: map.GetFieldByLabel('WorldPt1X').GetValue(),
      WorldPt1Y: map.GetFieldByLabel('WorldPt1Y').GetValue(),
      WorldPt2X: map.GetFieldByLabel('WorldPt2X').GetValue(),
      WorldPt2Y: map.GetFieldByLabel('WorldPt2Y').GetValue()
    };

    this.MiniGame = null;

    if(this.are.RootNode.HasField('MiniGame')){

      let MG = this.are.GetFieldByLabel('MiniGame').GetChildStructs()[0];

      this.MiniGame = {
        Bump_Plane: MG.GetFieldByLabel('Bump_Plane').GetValue(),
        CameraViewAngle: MG.GetFieldByLabel('CameraViewAngle').GetValue(),
        DOF: MG.GetFieldByLabel('DOF').GetValue(),
        DoBumping: MG.GetFieldByLabel('DoBumping').GetValue(),
        Enemies: [],
        Far_Clip: MG.GetFieldByLabel('Far_Clip').GetValue(),
        LateralAccel: MG.GetFieldByLabel('LateralAccel').GetValue(),
        Mouse: {}, //TODO
        MovementPerSec: MG.GetFieldByLabel('MovementPerSec').GetValue(),
        Music: MG.GetFieldByLabel('Music').GetValue(),
        Near_Clip: MG.GetFieldByLabel('Near_Clip').GetValue(),
        Obstacles: [],
        Type: MG.GetFieldByLabel('Type').GetValue(),
        UseInertia: MG.GetFieldByLabel('UseInertia').GetValue()
      };

      this.MiniGame.Player = new ModuleMGPlayer(GFFObject.FromStruct(MG.GetFieldByLabel('Player').GetChildStructs()[0]));

      let enemies = MG.GetFieldByLabel('Enemies').GetChildStructs();
      for(let i = 0; i < enemies.length; i++){
        this.MiniGame.Enemies.push(
          new ModuleMGEnemy(
            GFFObject.FromStruct(enemies[i])
          )
        );
      }

    }


    this.ModListenCheck = this.are.GetFieldByLabel('ModListenCheck').GetValue();
    this.ModSpotCheck = this.are.GetFieldByLabel('ModSpotCheck').GetValue();
    this.MoonAmbientColor = this.are.GetFieldByLabel('MoonAmbientColor').GetValue();
    this.MoonDiffuseColor = this.are.GetFieldByLabel('MoonDiffuseColor').GetValue();
    this.MoonFogColor = this.are.GetFieldByLabel('MoonFogColor').GetValue();
    this.MoonFogFar = this.are.GetFieldByLabel('MoonFogFar').GetValue();
    this.MoonFogNear = this.are.GetFieldByLabel('MoonFogNear').GetValue();
    this.MoonFogOn = this.are.GetFieldByLabel('MoonFogOn').GetValue();
    this.MoonShadows = this.are.GetFieldByLabel('MoonShadows').GetValue();
    this.AreaName = this.are.GetFieldByLabel('Name').GetCExoLocString();

    this.NoHangBack = this.are.GetFieldByLabel('NoHangBack').GetValue();
    this.NoRest = this.are.GetFieldByLabel('NoRest').GetValue();

    this.onEnter = this.are.GetFieldByLabel('OnEnter').GetValue();
    this.onExit = this.are.GetFieldByLabel('OnExit').GetValue();
    this.onHeartbeat = this.are.GetFieldByLabel('OnHeartbeat').GetValue();
    this.onUserDefined = this.are.GetFieldByLabel('OnUserDefined').GetValue();

    this.scripts = {
      onEnter: this.onEnter,
      onExit: this.onExit,
      onHeartbeat: this.onHeartbeat,
      onUserDefined: this.onUserDefined
    };

    this.PlayerOnly = this.are.GetFieldByLabel('PlayerOnly').GetValue();
    this.PlayerVsPlayer = this.are.GetFieldByLabel('PlayerVsPlayer').GetValue();

    //Rooms
    for(let i = 0; i < rooms.ChildStructs.length; i++ ){
      let strt = rooms.ChildStructs[i];
      
      this.rooms.push(
        new ModuleRoom({
          ambientScale: this.are.GetFieldByLabel('AmbientScale', strt.GetFields()).GetValue(),
          envAudio: this.are.GetFieldByLabel('EnvAudio', strt.GetFields()).GetValue(),
          roomName: this.are.GetFieldByLabel('RoomName', strt.GetFields()).GetValue().toLowerCase()
        })
      );
    }

    this.ShadowOpacity = this.are.GetFieldByLabel('ShadowOpacity').GetValue();
    this.StealthXPEnabled = this.are.GetFieldByLabel('StealthXPEnabled').GetValue();
    this.StealthXPLoss = this.are.GetFieldByLabel('StealthXPLoss').GetValue();
    this.StealthXPMax = this.are.GetFieldByLabel('StealthXPMax').GetValue();
    this.SunAmbientColor = this.are.GetFieldByLabel('SunAmbientColor').GetValue();
    this.SunDiffuseColor = this.are.GetFieldByLabel('SunDiffuseColor').GetValue();
    this.SunFogColor = this.are.GetFieldByLabel('SunFogColor').GetValue();
    this.SunFogFar = this.are.GetFieldByLabel('SunFogFar').GetValue();
    this.SunFogNear = this.are.GetFieldByLabel('SunFogNear').GetValue();
    this.SunFogOn = this.are.GetFieldByLabel('SunFogOn').GetValue();
    this.SunShadows = this.are.GetFieldByLabel('SunShadows').GetValue();
    this.Tag = this.are.GetFieldByLabel('Tag').GetValue();
    this.Unescapable = this.are.GetFieldByLabel('Unescapable').GetValue() ? true : false;
    this.Version = this.are.GetFieldByLabel('Version').GetValue();
    this.WindPower = this.are.GetFieldByLabel('WindPower').GetValue();

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

    let areaProps = this.git.GetFieldByLabel('AreaProperties');
    let cameras = this.git.GetFieldByLabel('CameraList');
    let creatures = this.git.GetFieldByLabel('Creature List');
    let doors = this.git.GetFieldByLabel('Door List');
    let encounters = this.git.GetFieldByLabel('Encounter List');
    let placeables = this.git.GetFieldByLabel('Placeable List');
    let sounds = this.git.GetFieldByLabel('SoundList');
    let stores = this.git.GetFieldByLabel('StoreList');
    let triggers = this.git.GetFieldByLabel('TriggerList');
    let waypoints = this.git.GetFieldByLabel('WaypointList');

    let areaPropsField = areaProps.GetChildStructs()[0].GetFields();

    this.audio.AmbientSndDay = this.git.GetFieldByLabel('AmbientSndDay', areaPropsField).GetValue();
    this.audio.AmbientSndDayVol = this.git.GetFieldByLabel('AmbientSndDayVol', areaPropsField).GetValue();
    this.audio.AmbientSndNight = this.git.GetFieldByLabel('AmbientSndNight', areaPropsField).GetValue();
    this.audio.AmbientSndNitVol = this.git.GetFieldByLabel('AmbientSndNitVol', areaPropsField).GetValue();
    if(areaProps.GetChildStructs()[0].HasField('EnvAudio')){
      this.audio.EnvAudio = this.git.GetFieldByLabel('EnvAudio', areaPropsField).GetValue();
    }else{
      this.audio.EnvAudio = -1;
    }
    
    this.audio.MusicBattle = this.git.GetFieldByLabel('MusicBattle', areaPropsField).GetValue();
    this.audio.MusicDay = this.git.GetFieldByLabel('MusicDay', areaPropsField).GetValue();
    this.audio.MusicDelay = this.git.GetFieldByLabel('MusicDelay', areaPropsField).GetValue();
    this.audio.MusicNight = this.git.GetFieldByLabel('MusicNight', areaPropsField).GetValue();

    //Cameras
    for(let i = 0; i < cameras.ChildStructs.length; i++){
      let strt = cameras.ChildStructs[i];
      this.cameras.push( new ModuleCamera(GFFObject.FromStruct(strt) ) );
    }

    //Creatures
    for(let i = 0; i < creatures.ChildStructs.length; i++){
      let strt = creatures.ChildStructs[i];
      this.creatures.push( new ModuleCreature(GFFObject.FromStruct(strt)) );
    }

    //Triggers
    for(let i = 0; i < triggers.ChildStructs.length; i++){
      let strt = triggers.ChildStructs[i];
      this.triggers.push( new ModuleTrigger(GFFObject.FromStruct(strt)) );
    }

    //Encounter
    for(let i = 0; i < encounters.ChildStructs.length; i++){
      let strt = encounters.ChildStructs[i];
      this.encounters.push( new ModuleEncounter(GFFObject.FromStruct(strt)) );
    }

    //Doors
    for(let i = 0; i < doors.ChildStructs.length; i++ ){
      let strt = doors.ChildStructs[i];
      this.doors.push( new ModuleDoor(GFFObject.FromStruct(strt)) );
    }

    //Placeables
    for(let i = 0; i < placeables.ChildStructs.length; i++ ){
      let strt = placeables.ChildStructs[i];
      this.placeables.push( new ModulePlaceable(GFFObject.FromStruct(strt)) );
    }

    //Sounds
    for(let i = 0; i < sounds.ChildStructs.length; i++ ){
      let strt = sounds.ChildStructs[i];
      this.sounds.push( new ModuleSound(GFFObject.FromStruct(strt), GameState.audioEngine) );
    }

    //Stores
    for(let i = 0; i < stores.ChildStructs.length; i++ ){
      let strt = stores.ChildStructs[i];
      this.stores.push( new ModuleStore(GFFObject.FromStruct(strt)) );
    }

    //Waypoints
    for(let i = 0; i < waypoints.ChildStructs.length; i++ ){
      let strt = waypoints.ChildStructs[i];

      if(this.transWP){
        if(typeof this.transWP === 'string'){
          if(this.transWP.toLowerCase() == strt.GetFieldByLabel('Tag').GetValue().toLowerCase()){
            this.transWP = GFFObject.FromStruct(strt);
          }
        }else if(this.transWP instanceof GFFObject){
          if(this.transWP.GetFieldByLabel('Tag').GetValue().toLowerCase() == strt.GetFieldByLabel('Tag').GetValue().toLowerCase()){
            this.transWP = GFFObject.FromStruct(strt);
          }
        }
      }
      
      this.waypoints.push( new ModuleWaypoint(GFFObject.FromStruct(strt)) );
    }

    if(!(this.transWP instanceof GFFObject)){
      this.transWP = null;
    }

    if(this.git.RootNode.HasField('SWVarTable')){
      console.log("SWVarTable", this.git);
      let localBools = this.git.RootNode.GetFieldByLabel('SWVarTable').GetChildStructs()[0].GetFieldByLabel('BitArray').GetChildStructs();
      //console.log(localBools);
      for(let i = 0; i < localBools.length; i++){
        let data = localBools[i].GetFieldByLabel('Variable').GetValue();
        for(let bit = 0; bit < 32; bit++){
          this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
        }
      }
    }

    GameState.AlphaTest = this.Alphatest;

    GameState.audioEngine.SetReverbProfile(this.audio.EnvAudio);

    FollowerCamera.setCameraStyle(this.getCameraStyle());
    if(this.MiniGame){
      FollowerCamera.setCameraFOV(this.MiniGame.CameraViewAngle);
    }else{
      FollowerCamera.setCameraFOV(FollowerCamera.DEFAULT_FOV);
    }

    this.LoadVis( () => {
      this.LoadLayout( () => {
        this.loadPath( () => {
          this.LoadScripts();
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
    this.path.Load( () => {
      if(typeof onLoad == 'function')
        onLoad(this);
    });
  }

  LoadVis(onLoad?: Function){
    console.log('ModuleArea.LoadVis');
    ResourceLoader.loadResource(ResourceTypes['vis'], this._name, (visData: Buffer) => {
      this.visObject = new VISObject(visData);
      if(typeof onLoad == 'function')
        onLoad(this);
    }, () => {
      this.visObject = new VISObject();
      if(typeof onLoad == 'function')
        onLoad(this);
    });
  }

  LoadLayout(onLoad?: Function){
    console.log('ModuleArea.LoadLayout');
    ResourceLoader.loadResource(ResourceTypes['lyt'], this._name, (data: Buffer) => {
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

      for(let i = 0; i < this.layout.tracks.length; i++){
        this.tracks.push(new ModuleMGTrack(this.layout.tracks[i]));
      }

      for(let i = 0; i < this.layout.obstacles.length; i++){
        this.obstacles.push(new ModuleMGObstacle(undefined, this.layout.obstacles[i]));
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

    }, () => {
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

  async loadScene( onLoad?: Function ){
    try{
      await this.loadRooms();

      MenuManager.LoadScreen.setProgress(10);

      await this.loadCameras();

      await this.loadPlaceables();

      MenuManager.LoadScreen.setProgress(20);

      await this.loadWaypoints();

      MenuManager.LoadScreen.setProgress(30);

      await this.loadCreatures();
      await this.loadPlayer();
      await this.loadParty();

      MenuManager.LoadScreen.setProgress(40);

      await this.loadSoundTemplates();

      MenuManager.LoadScreen.setProgress(50);

      await this.loadTriggers();

      await this.loadEncounters();

      MenuManager.LoadScreen.setProgress(60);

      await this.loadMGTracks();
      await this.loadMGPlayer();
      await this.loadMGEnemies();

      MenuManager.LoadScreen.setProgress(70);

      await this.loadDoors();

      await this.loadStores();

      MenuManager.LoadScreen.setProgress(80);
      await this.loadTextures();

      MenuManager.LoadScreen.setProgress(90);

      await this.loadAudio();
      await this.loadBackgroundMusic();

      MenuManager.LoadScreen.setProgress(100);

      FollowerCamera.facing = Utility.NormalizeRadian(GameState.player.GetFacing() - Math.PI/2);

      await this.weather.load();

      this.transWP = null;

      this.cleanupUninitializedObjects();
      this.detectRoomObjects();

      if(typeof onLoad === 'function')
        onLoad();
    }catch(e){
      console.error(e);
    }

  }

  loadCameras(){
    for(let i = 0; i < this.cameras.length; i++){
      const camera = this.cameras[i];
      camera.Load();
      GameState.staticCameras.push(camera.perspectiveCamera);
    }
  }

  getSpawnLocation(){

    if(GameState.isLoadingSave){
      return new EngineLocation(
        PartyManager.Player.RootNode.GetFieldByLabel('XPosition').GetValue(),
        PartyManager.Player.RootNode.GetFieldByLabel('YPosition').GetValue(),
        PartyManager.Player.RootNode.GetFieldByLabel('ZPosition').GetValue(),
        PartyManager.Player.RootNode.GetFieldByLabel('XOrientation').GetValue(),
        PartyManager.Player.RootNode.GetFieldByLabel('YOrientation').GetValue(),
        0
      );
    }else if(this.transWP instanceof GFFObject){
      console.log('TransWP', this.transWP);
      return new EngineLocation(
        this.transWP.RootNode.GetFieldByLabel('XPosition').GetValue(),
        this.transWP.RootNode.GetFieldByLabel('YPosition').GetValue(),
        this.transWP.RootNode.GetFieldByLabel('ZPosition').GetValue(),
        this.transWP.RootNode.GetFieldByLabel('XOrientation').GetValue(),
        this.transWP.RootNode.GetFieldByLabel('YOrientation').GetValue(),
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
    if(PartyManager.Player){
      return PartyManager.Player;
    }else{
      let pTPL = new GFFObject();

      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'Appearance_Type') ).SetValue(GameState.GameKey == 'TSL' ? 134 : 177);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'FirstName') ).SetValue(GameState.GameKey == 'TSL' ? 'Leia Organa' : 'Luke Skywalker');
      pTPL.RootNode.AddField( new GFFField(GFFDataType.INT, 'Age') ).SetValue(0);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'ArmorClass') ).SetValue(10);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'BodyBag') ).SetValue(0);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'ChallengeRating') ).SetValue(0);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'FactionID') ).SetValue(0);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'PortraitId') ).SetValue(GameState.GameKey == 'TSL' ? 10 : 26);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'HitPoints') ).SetValue(100);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'MaxHitPoints') ).SetValue(100);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'CurrentHitPoints') ).SetValue(70);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'ForcePoints') ).SetValue(15);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'MaxForcePoints') ).SetValue(15);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'Commandable') ).SetValue(1);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'CurrentForce') ).SetValue(10);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'DeadSelectable') ).SetValue(1);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'DetectMode') ).SetValue(1);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'Disarmable') ).SetValue(1);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'IsDestroyable') ).SetValue(1);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'IsPC') ).SetValue(1);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'IsRaiseable') ).SetValue(1);
      let equipment = pTPL.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Equip_ItemList') );
      pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptAttacked') ).SetValue('k_hen_attacked01');
      pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptDamaged') ).SetValue('k_def_damage01');
      pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptDeath') ).SetValue('');
      pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptDialogue') ).SetValue('k_hen_dialogue01');
      pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptDisturbed') ).SetValue('');
      pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptEndDialogu') ).SetValue('');
      pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptEndRound') ).SetValue('k_hen_combend01');
      pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat') ).SetValue('k_hen_heartbt01');
      pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptOnBlocked') ).SetValue('k_def_blocked01');
      pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptOnNotice') ).SetValue('k_hen_percept01');
      pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptRested') ).SetValue('');
      pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptSpawn') ).SetValue('k_hen_spawn01');
      pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptSpellAt') ).SetValue('k_def_spellat01');
      pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptUserDefine') ).SetValue('k_def_userdef01');
  
      pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'GoodEvil') ).SetValue(50);
  
      pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'NaturalAC') ).SetValue(0);
  
      pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Con') ).SetValue(10);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Dex') ).SetValue(14);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Str') ).SetValue(10);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Wis') ).SetValue(10);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Cha') ).SetValue(10);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Int') ).SetValue(10);
  
      pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'fortbonus') ).SetValue(0);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'refbonus') ).SetValue(0);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'willbonus') ).SetValue(0);
  
      pTPL.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'PerceptionRange') ).SetValue(12);

      let classList = pTPL.RootNode.AddField( new GFFField(GFFDataType.LIST, 'ClassList') );
      for(let i = 0; i < 1; i++){
        let _class = new GFFStruct();
        _class.AddField( new GFFField(GFFDataType.INT, 'Class') ).SetValue(0);
        _class.AddField( new GFFField(GFFDataType.SHORT, 'ClassLevel') ).SetValue(1);
        _class.AddField( new GFFField(GFFDataType.LIST, 'KnownList0') );
        classList.AddChildStruct(_class);
      }
  
      let skillList = pTPL.RootNode.AddField( new GFFField(GFFDataType.LIST, 'SkillList') );
  
      for(let i = 0; i < 8; i++){
        let _skill = new GFFStruct();
        _skill.AddField( new GFFField(GFFDataType.RESREF, 'Rank') ).SetValue(0);
        skillList.AddChildStruct(_skill);
      }
  
      let armorStruct = new GFFStruct(ModuleCreatureArmorSlot.ARMOR);
      armorStruct.AddField( new GFFField(GFFDataType.RESREF, 'EquippedRes') ).SetValue('g_a_jedirobe01');
      let rhStruct = new GFFStruct(ModuleCreatureArmorSlot.RIGHTHAND);
      rhStruct.AddField( new GFFField(GFFDataType.RESREF, 'EquippedRes') ).SetValue('g_w_lghtsbr01');
  
      equipment.AddChildStruct( armorStruct );
      equipment.AddChildStruct( rhStruct );
  
      // SoundSetFile
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'SoundSetFile') ).SetValue(85);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Race') ).SetValue(6);
  
      /*let spawnLoc = this.getSpawnLocation();
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'XPosition') ).SetValue(spawnLoc.XPosition);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'YPosition') ).SetValue(spawnLoc.YPosition);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'ZPosition') ).SetValue(spawnLoc.ZPosition);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'XOrientation') ).SetValue(spawnLoc.XOrientation);
      pTPL.RootNode.AddField( new GFFField(GFFDataType.WORD, 'YOrientation') ).SetValue(spawnLoc.YOrientation);*/
      PartyManager.Player = pTPL;
      PartyManager.Player.json = PartyManager.Player.ToJSON();
      return pTPL;
    }
  }

  async loadMGPlayer(): Promise<void>{
    return new Promise<void>( (resolve, reject) => {
      if(this.MiniGame){
        console.log('Loading MG Player')
        let player: ModuleMGPlayer = this.MiniGame.Player;
        (player as any).partyID = -1;
        PartyManager.party.push(player as any);
        player.Load( ( object: ModuleMGPlayer ) => {
          
          if(typeof object == 'undefined'){
            // asyncLoop.next();
            return;
          }

          player.LoadCamera( () => {
            player.LoadModel( (model: OdysseyModel3D) => {
              player.LoadGunBanks( () => {
                let track = this.tracks.find(o => o.track === player.trackName);
                model.userData.moduleObject = player;
                model.hasCollision = true;
                player.setTrack(track.model);
      
                player.getCurrentRoom();
                // player.computeBoundingBox();
      
                resolve();
              });
            });
          });
        });
      }else{
        resolve();
      }
    });
  }

  async loadPlayer(): Promise<void> {
    return new Promise<void>( (resolve, reject) => {
      console.log('Loading Player', GameState.player)

      if(GameState.player instanceof ModuleCreature){
        GameState.player.partyID = -1;

        if(!this.MiniGame){
          PartyManager.party[ PartyManager.GetCreatureStartingPartyIndex(GameState.player) ] = GameState.player;
          GameState.group.party.add( GameState.player.container );
        }

        //Reset the players actions between modules
        GameState.player.clearAllActions();
        GameState.player.force = 0;
        GameState.player.animState = ModuleCreatureAnimState.IDLE;
        GameState.player.collisionData.groundFace = undefined;
        GameState.player.collisionData.lastGroundFace = undefined;
        GameState.player.Load();
        GameState.player.LoadModel().then( (model: OdysseyModel3D) => {
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
        player.id = ModuleObject.GetNextPlayerId();
        
        player.Load();
        GameState.player = player;
      
        if(!this.MiniGame){
          PartyManager.party[ PartyManager.GetCreatureStartingPartyIndex(player) ] = player;
          GameState.group.party.add( player.container );
        }

        player.LoadModel().then( (model: OdysseyModel3D) => {
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
    });
  }

  async loadMGTracks(): Promise<void>{
    return new Promise<void>( (resolve, reject) => {
      if(this.MiniGame){
        let trackIndex = 0;
        let loop = new AsyncLoop({
          array: this.tracks,
          onLoop: (track: ModuleMGTrack, asyncLoop: AsyncLoop) => {
            track.Load( () => {
              track.LoadModel( (model: OdysseyModel3D) => {
                track.model = model;
                model.userData.moduleObject = track;
                model.userData.index = trackIndex;
                //model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation));
                model.hasCollision = true;
                GameState.group.creatures.add( track.container );
      
                track.computeBoundingBox();
                track.getCurrentRoom();
                trackIndex++;
                asyncLoop.next();
              });
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

  async loadMGEnemies(): Promise<void> {
    return new Promise<void>( (resolve, reject) => {
    
      if(this.MiniGame){
        let loop = new AsyncLoop({
          array: this.MiniGame.Enemies,
          onLoop: (enemy: ModuleMGEnemy, asyncLoop: AsyncLoop) => {
            enemy.Load();
            enemy.LoadModel( (model: OdysseyModel3D) => {
              enemy.LoadGunBanks( () => {
                let track = this.tracks.find(o => o.track === enemy.trackName);
                model.userData.moduleObject = enemy;
                model.hasCollision = true;
                enemy.setTrack(track.model);
                enemy.computeBoundingBox();
                enemy.getCurrentRoom();
                asyncLoop.next();

              });
            });
          }
        });
        loop.iterate(() => {
          resolve();
        });
      }else
        resolve();
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
          door.Load();
  
          // door.position.x = door.getX();
          // door.position.y = door.getY();
          // door.position.z = door.getZ();
          door.rotation.set(0, 0, door.getBearing());
          door.LoadModel().then( (model: OdysseyModel3D) => {
            door.LoadWalkmesh(model.name, (dwk: OdysseyWalkMesh) => {
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
                  if(!door.openState){
                    GameState.group.room_walkmeshes.add( dwk.mesh );
                  }
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
          plc.Load();
          plc.position.set(plc.getX(), plc.getY(), plc.getZ());
          plc.rotation.set(0, 0, plc.getBearing());
          plc.LoadModel().then( (model: OdysseyModel3D) => {
            GameState.group.placeables.add( plc.container );
            plc.LoadWalkmesh(model.name, (pwk: OdysseyWalkMesh) => {
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
          waypnt.Load();
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
            encounter.Load();
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

  async loadTriggers(): Promise<void>{
    return new Promise<void>( (resolve, reject) => {
      console.log('Loading Triggers');
      let loop = new AsyncLoop({
        array: this.triggers,
        onLoop: (trig: ModuleTrigger, asyncLoop: AsyncLoop) => {
          try{
            trig.Load();
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
          creature.Load();
          creature.LoadModel().then( (model: OdysseyModel3D) => {
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
          store.Load();
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
          sound.Load();
          sound.LoadSound( () => {
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
          GameState.audioEngine.SetAmbientSound(data);
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
          GameState.audioEngine.SetBackgroundMusic(data);
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

  LoadScripts(){
    console.log('ModuleArea.LoadScripts');
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
        await this.doors[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < this.placeables.length; i++){
      if(this.placeables[i] instanceof ModuleObject){
        await this.placeables[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < this.triggers.length; i++){
      if(this.triggers[i] instanceof ModuleObject){
        await this.triggers[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < this.waypoints.length; i++){
      if(this.waypoints[i] instanceof ModuleObject){
        await this.waypoints[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < this.creatures.length; i++){
      if(this.creatures[i] instanceof ModuleObject){
        await this.creatures[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < PartyManager.party.length; i++){
      if(PartyManager.party[i] instanceof ModuleObject){
        await PartyManager.party[i].onSpawn(runSpawnScripts);
      }
    }

    if(this.MiniGame){
      for(let i = 0; i < this.MiniGame.Enemies.length; i++){
        if(this.MiniGame.Enemies[i] instanceof ModuleObject){
          await this.MiniGame.Enemies[i].onCreate();
        }
      }

      for(let i = 0; i < this.MiniGame.Obstacles.length; i++){
        if(this.MiniGame.Obstacles[i] instanceof ModuleObject){
          await this.MiniGame.Obstacles[i].onCreate();
        }
      }

      await this.MiniGame.Player.onCreate();
    }

    await this.runStartScripts();

  }

  runOnEnterScripts(){
    return new Promise<void>( (resolve, reject) => {
      if(this.scripts.onEnter instanceof NWScriptInstance){
        console.log('onEnter', this.scripts.onEnter, GameState.player)
        this.scripts.onEnter.enteringObject = GameState.player;
        this.scripts.onEnter.debug.action = true;
        this.scripts.onEnter.runAsync(this, 0).then( () => {
          resolve();
        });
      }else{
        resolve();
      }
    });
  }

  runMiniGameScripts(){
    return new Promise<void>( (resolve, reject) => {

      if(!this.MiniGame){
        resolve();
        return;
      }

      let loop = new AsyncLoop({
        array: this.MiniGame.Enemies,
        onLoop: (enemy: ModuleMGEnemy, asyncLoop: AsyncLoop) => {
          if(enemy.scripts.onCreate instanceof NWScriptInstance){
            enemy.scripts.onCreate.runAsync(enemy, 0).then( () => {
              asyncLoop.next();
            });
          }else{
            asyncLoop.next();
          }
        }
      });
      loop.iterate(() => {
        resolve();
      });

    });

  }

  async runStartScripts(){
    await this.runMiniGameScripts();
    await this.runOnEnterScripts();
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
    are.RootNode.AddField(
      new GFFField(GFFDataType.FLOAT, 'AlphaTest', this.AlphaTest)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.INT, 'CameraStyle', this.CameraStyle)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.INT, 'ChanceLightning', this.ChanceLightning)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.INT, 'ChanceRain', this.ChanceRain)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.INT, 'ChanceSnow', this.ChanceSnow)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.CEXOSTRING, 'Comments', this.Comments)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.INT, 'Creator_ID', this.Creator_ID)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.BYTE, 'DayNightCycle', this.DayNightCycle)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.RESREF, 'DefaultEnvMap', this.DefaultEnvMap)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.DWORD, 'DynAmbientColor', this.DynAmbientColor)
    );

    are.RootNode.AddField(
      new GFFField(GFFDataType.LIST, 'Expansion_List')
    );

    are.RootNode.AddField(
      new GFFField(GFFDataType.DWORD, 'Flags', this.Flags)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.DWORD, 'Grass_Ambient', this.Grass.Ambient)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.FLOAT, 'Grass_Density', this.Grass.Density)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.DWORD, 'Grass_Diffuse', this.Grass.Diffuse)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.FLOAT, 'Grass_Prob_LL', this.Grass.Prob_LL)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.FLOAT, 'Grass_Prob_LR', this.Grass.Prob_LR)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.FLOAT, 'Grass_Prob_UL', this.Grass.Prob_UL)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.FLOAT, 'Grass_Prob_UR', this.Grass.Prob_UR)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.FLOAT, 'Grass_QuadSize', this.Grass.QuadSize)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.RESREF, 'Grass_TexName', this.Grass.TexName)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.INT, 'ID', this.ID)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.BYTE, 'IsNight', this.IsNight)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.BYTE, 'LightingScheme', this.LightingScheme)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.WORD, 'LoadScreenID', this.LoadScreenID)
    );

    let mapStruct = new GFFStruct(14);
    mapStruct.AddField( new GFFField(GFFDataType.FLOAT, 'MapPt1X') ).SetValue(this.Map.MapPt1X);
    mapStruct.AddField( new GFFField(GFFDataType.FLOAT, 'MapPt1Y') ).SetValue(this.Map.MapPt1Y);
    mapStruct.AddField( new GFFField(GFFDataType.FLOAT, 'MapPt2X') ).SetValue(this.Map.MapPt2X);
    mapStruct.AddField( new GFFField(GFFDataType.INT, 'MapPt2Y') ).SetValue(this.Map.MapPt2Y);
    mapStruct.AddField( new GFFField(GFFDataType.INT, 'MapResX') ).SetValue(this.Map.MapResX);
    mapStruct.AddField( new GFFField(GFFDataType.INT, 'MapZoom') ).SetValue(this.Map.MapZoom);
    mapStruct.AddField( new GFFField(GFFDataType.INT, 'NorthAxis') ).SetValue(this.Map.NorthAxis);
    mapStruct.AddField( new GFFField(GFFDataType.FLOAT, 'WorldPt1X') ).SetValue(this.Map.WorldPt1X);
    mapStruct.AddField( new GFFField(GFFDataType.FLOAT, 'WorldPt1Y') ).SetValue(this.Map.WorldPt1Y);
    mapStruct.AddField( new GFFField(GFFDataType.FLOAT, 'WorldPt2X') ).SetValue(this.Map.WorldPt2X);
    mapStruct.AddField( new GFFField(GFFDataType.FLOAT, 'WorldPt2Y') ).SetValue(this.Map.WorldPt2Y);

    let mapField = new GFFField(GFFDataType.STRUCT, 'Map');
    mapField.AddChildStruct(mapStruct);
    are.RootNode.AddField(mapField);


    are.RootNode.AddField(
      new GFFField(GFFDataType.INT, 'ModListenCheck', this.ModListenCheck)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.INT, 'ModSpotCheck', this.ModSpotCheck)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.DWORD, 'MoonAmbientColor', this.MoonAmbientColor)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.DWORD, 'MoonDiffuseColor', this.MoonDiffuseColor)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.DWORD, 'MoonFogColor', this.MoonFogColor)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.FLOAT, 'MoonFogFar', this.MoonFogFar)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.FLOAT, 'MoonFogNear', this.MoonFogNear)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.BYTE, 'MoonFogOn', this.MoonFogOn)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.BYTE, 'MoonShadows', this.MoonShadows)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.CEXOLOCSTRING, 'Name').SetCExoLocString(this.AreaName)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.BYTE, 'NoHangBack', this.NoHangBack)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.BYTE, 'NoRest', this.NoRest)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.RESREF, 'OnEnter', this.onEnter)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.RESREF, 'OnExit', this.onExit)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.RESREF, 'OnHeartbeat', this.onHeartbeat)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.RESREF, 'OnUserDefined', this.onUserDefined)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.BYTE, 'PlayerOnly', this.PlayerOnly)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.BYTE, 'PlayerVsPlayer', this.PlayerVsPlayer)
    );

    let roomsField = new GFFField(GFFDataType.LIST, 'Rooms');
    for(let i = 0, len = this.rooms.length; i < len; i++){
      roomsField.AddChildStruct(this.rooms[i].toToolsetInstance());
    }
    are.RootNode.AddField(roomsField);

    are.RootNode.AddField(
      new GFFField(GFFDataType.BYTE, 'ShadowOpacity', this.ShadowOpacity)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.BYTE, 'StealthXPEnabled', this.StealthXPEnabled)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.DWORD, 'StealthXPLoss', this.StealthXPLoss)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.DWORD, 'StealthXPMax', this.StealthXPMax)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.DWORD, 'SunAmbientColor', this.SunAmbientColor)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.DWORD, 'SunDiffuseColor', this.SunDiffuseColor)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.DWORD, 'SunFogColor', this.SunFogColor)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.FLOAT, 'SunFogFar', this.SunFogFar)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.FLOAT, 'SunFogNear', this.SunFogNear)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.BYTE, 'SunFogOn', this.SunFogOn)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.BYTE, 'SunShadows', this.SunShadows)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.RESREF, 'Tag', this.Tag)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.BYTE, 'Unescapable', this.Unescapable)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.DWORD, 'Version', this.Version)
    );
    are.RootNode.AddField(
      new GFFField(GFFDataType.INT, 'WindPower', this.WindPower)
    );

    return are;

  }

  getAreaMapStruct(){
    let struct = new GFFStruct();
    struct.AddField( new GFFField(GFFDataType.VOID, 'AreaMapData') ).SetData(Buffer.alloc(20));
    struct.AddField( new GFFField(GFFDataType.DWORD, 'AreaMapDataSize') ).SetValue(20);
    struct.AddField( new GFFField(GFFDataType.INT, 'AreaMapResX') ).SetValue(15);
    struct.AddField( new GFFField(GFFDataType.INT, 'AreaMapResY') ).SetValue(8);
    return struct;
  }

  getAreaPropertiesStruct(){
    let struct = new GFFStruct();
    struct.AddField( new GFFField(GFFDataType.INT, 'AmbientSndDay') ).SetValue(this.audio.AmbientSndDay);
    struct.AddField( new GFFField(GFFDataType.INT, 'AmbientSndDayVol') ).SetValue(this.audio.AmbientSndDayVol);
    struct.AddField( new GFFField(GFFDataType.INT, 'AmbientSndNight') ).SetValue(this.audio.AmbientSndNight);
    struct.AddField( new GFFField(GFFDataType.INT, 'AmbientSndNitVol') ).SetValue(this.audio.AmbientSndNitVol);
    struct.AddField( new GFFField(GFFDataType.INT, 'EnvAudio') ).SetValue(this.audio.EnvAudio);
    
    struct.AddField( new GFFField(GFFDataType.INT, 'MusicBattle') ).SetValue(this.audio.MusicBattle);
    struct.AddField( new GFFField(GFFDataType.INT, 'MusicDay') ).SetValue(this.audio.MusicDay);
    struct.AddField( new GFFField(GFFDataType.INT, 'MusicDelay') ).SetValue(this.audio.MusicDelay);
    struct.AddField( new GFFField(GFFDataType.INT, 'MusicNight') ).SetValue(this.audio.MusicNight);

    struct.AddField( new GFFField(GFFDataType.BYTE, 'RestrictMode') ).SetValue(this.restrictMode ? 1 : 0);
    struct.AddField( new GFFField(GFFDataType.DWORD, 'StealthXPCurrent') ).SetValue(0);
    struct.AddField( new GFFField(GFFDataType.BYTE, 'StealthXPLoss') ).SetValue(0);
    struct.AddField( new GFFField(GFFDataType.DWORD, 'StealthXPMax') ).SetValue(0);
    struct.AddField( new GFFField(GFFDataType.DWORD, 'SunFogColor') ).SetValue(0);
    
    struct.AddField( new GFFField(GFFDataType.BYTE, 'TransPendCurrID') ).SetValue(0);
    struct.AddField( new GFFField(GFFDataType.BYTE, 'TransPendNextID') ).SetValue(0);
    struct.AddField( new GFFField(GFFDataType.BYTE, 'TransPending') ).SetValue(0);
    struct.AddField( new GFFField(GFFDataType.BYTE, 'Unescapable') ).SetValue(this.Unescapable);
    return struct;
  }

  saveAreaListStruct(){
    let areaStruct = new GFFStruct();
    areaStruct.AddField( new GFFField(GFFDataType.RESREF, 'Area_Name') ).SetValue(this._name);
    areaStruct.AddField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).SetValue(this.id);
    //unescapable
    return areaStruct;
  }

  save(){
    let git = new GFFObject();
    git.FileType = 'GIT ';

    let aoeList = git.RootNode.AddField( new GFFField(GFFDataType.LIST, 'AreaEffectList') );
    let areaMapField = git.RootNode.AddField( new GFFField(GFFDataType.STRUCT, 'AreaMap') );
    areaMapField.AddChildStruct( this.getAreaMapStruct() );

    let areaPropertiesField = git.RootNode.AddField( new GFFField(GFFDataType.STRUCT, 'AreaProperties') );
    areaPropertiesField.AddChildStruct( this.getAreaPropertiesStruct() );

    let cameraList = git.RootNode.AddField( new GFFField(GFFDataType.LIST, 'CameraList') );
    for(let i = 0; i < this.cameras.length; i++){
      cameraList.AddChildStruct( this.cameras[i].save().RootNode );
    }

    let creatureList = git.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Creature List') );
    for(let i = 0; i < this.creatures.length; i++){
      creatureList.AddChildStruct( this.creatures[i].save().RootNode );
    }

    git.RootNode.AddField( new GFFField(GFFDataType.LIST, 'CurrentWeather') ).SetValue(0);

    let doorList = git.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Door List') );
    for(let i = 0; i < this.doors.length; i++){
      doorList.AddChildStruct( this.doors[i].save().RootNode );
    }

    let encounterList = git.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Encounter List') );
    for(let i = 0; i < this.encounters.length; i++){
      encounterList.AddChildStruct( this.encounters[i].save().RootNode );
    }

    //Area Items List
    let list = git.RootNode.AddField( new GFFField(GFFDataType.LIST, 'List') );

    let placeableList = git.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Placeable List') );
    for(let i = 0; i < this.placeables.length; i++){
      placeableList.AddChildStruct( this.placeables[i].save().RootNode );
    }

    //SWVarTable
    let swVarTable = git.RootNode.AddField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.AddChildStruct( this.getSWVarTableSaveStruct() );

    let soundList = git.RootNode.AddField( new GFFField(GFFDataType.LIST, 'SoundList') );
    for(let i = 0; i < this.sounds.length; i++){
      soundList.AddChildStruct( this.sounds[i].save().RootNode );
    }

    let storeList = git.RootNode.AddField( new GFFField(GFFDataType.LIST, 'StoreList') );
    for(let i = 0; i < this.stores.length; i++){
      storeList.AddChildStruct( this.stores[i].save().RootNode );
    }
    
    git.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TransPendCurrID') ).SetValue(0);
    git.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TransPendNextID') ).SetValue(0);
    git.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TransPending') ).SetValue(0);

    let triggerList = git.RootNode.AddField( new GFFField(GFFDataType.LIST, 'TriggerList') );
    for(let i = 0; i < this.triggers.length; i++){
      triggerList.AddChildStruct( this.triggers[i].save().RootNode );
    }

    git.RootNode.AddField( new GFFField(GFFDataType.LIST, 'VarTable') );

    let waypointList = git.RootNode.AddField( new GFFField(GFFDataType.LIST, 'WaypointList') );
    for(let i = 0; i < this.waypoints.length; i++){
      waypointList.AddChildStruct( this.waypoints[i].save().RootNode );
    }
    
    git.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'WeatherStarted') ).SetValue(0);

    this.git = git;

    this.are.FileType = 'ARE ';

    return {git: git, are: this.are};
  }
  
  toolsetExportGIT(){
    let git = new GFFObject();
    git.FileType = 'GIT ';

    let areaPropertiesStruct = new GFFStruct(14);
    areaPropertiesStruct.AddField( new GFFField(GFFDataType.INT, 'AmbientSndDay') ).SetValue(this.audio.AmbientSndDay);
    areaPropertiesStruct.AddField( new GFFField(GFFDataType.INT, 'AmbientSndDayVol') ).SetValue(this.audio.AmbientSndDayVol);
    areaPropertiesStruct.AddField( new GFFField(GFFDataType.INT, 'AmbientSndNight') ).SetValue(this.audio.AmbientSndNight);
    areaPropertiesStruct.AddField( new GFFField(GFFDataType.INT, 'AmbientSndNitVol') ).SetValue(this.audio.AmbientSndNitVol);
    areaPropertiesStruct.AddField( new GFFField(GFFDataType.INT, 'EnvAudio') ).SetValue(this.audio.EnvAudio);
    areaPropertiesStruct.AddField( new GFFField(GFFDataType.INT, 'MusicBattle') ).SetValue(this.audio.MusicBattle);
    areaPropertiesStruct.AddField( new GFFField(GFFDataType.INT, 'MusicDay') ).SetValue(this.audio.MusicDay);
    areaPropertiesStruct.AddField( new GFFField(GFFDataType.INT, 'MusicDelay') ).SetValue(this.audio.MusicDelay);
    areaPropertiesStruct.AddField( new GFFField(GFFDataType.INT, 'MusicNight') ).SetValue(this.audio.MusicNight);

    let areaPropertiesField = new GFFField(GFFDataType.STRUCT, 'AreaProperties');
    areaPropertiesField.AddChildStruct(areaPropertiesStruct);
    git.RootNode.AddField(areaPropertiesField);

    let camerasField = new GFFField(GFFDataType.LIST, 'CameraList');
    for(let i = 0, len = this.cameras.length; i < len; i++){
      camerasField.AddChildStruct(this.cameras[i].toToolsetInstance());
    }
    git.RootNode.AddField(camerasField);

    let creaturesField = new GFFField(GFFDataType.LIST, 'Creature List');
    for(let i = 0, len = this.creatures.length; i < len; i++){
      creaturesField.AddChildStruct(this.creatures[i].toToolsetInstance());
    }
    git.RootNode.AddField(creaturesField);

    let doorsField = new GFFField(GFFDataType.LIST, 'Door List');
    for(let i = 0, len = this.doors.length; i < len; i++){
      doorsField.AddChildStruct(this.doors[i].toToolsetInstance());
    }
    git.RootNode.AddField(doorsField);

    let encountersField = new GFFField(GFFDataType.LIST, 'Encounter List');
    for(let i = 0, len = this.encounters.length; i < len; i++){
      encountersField.AddChildStruct(this.encounters[i].toToolsetInstance());
    }
    git.RootNode.AddField(encountersField);

    let listField = new GFFField(GFFDataType.LIST, 'List');
    git.RootNode.AddField(listField);

    let placeablesField = new GFFField(GFFDataType.LIST, 'Placeable List');
    for(let i = 0, len = this.placeables.length; i < len; i++){
      placeablesField.AddChildStruct(this.placeables[i].toToolsetInstance());
    }
    git.RootNode.AddField(placeablesField);

    let soundsField = new GFFField(GFFDataType.LIST, 'SoundList');
    for(let i = 0, len = this.sounds.length; i < len; i++){
      soundsField.AddChildStruct(this.sounds[i].toToolsetInstance());
    }
    git.RootNode.AddField(soundsField);

    let storesField = new GFFField(GFFDataType.LIST, 'StoreList');
    for(let i = 0, len = this.stores.length; i < len; i++){
      storesField.AddChildStruct(this.stores[i].toToolsetInstance());
    }
    git.RootNode.AddField(storesField);

    let triggersField = new GFFField(GFFDataType.LIST, 'TriggerList');
    for(let i = 0, len = this.triggers.length; i < len; i++){
      triggersField.AddChildStruct(this.triggers[i].toToolsetInstance());
    }
    git.RootNode.AddField(triggersField);

    git.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'UseTemplates')).SetValue(1);

    let waypointsField = new GFFField(GFFDataType.LIST, 'WaypointList');
    for(let i = 0, len = this.waypoints.length; i < len; i++){
      waypointsField.AddChildStruct(this.waypoints[i].toToolsetInstance());
    }
    git.RootNode.AddField(waypointsField);

    return git;
  }

}
