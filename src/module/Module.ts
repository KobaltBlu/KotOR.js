import * as THREE from "three";
import * as path from "path";
import { AudioEmitter } from "../audio/AudioEmitter";
import { GameEffect } from "../effects";
import EngineLocation from "../engine/EngineLocation";
import { GameState } from "../GameState";
import { CExoLocString } from "../resource/CExoLocString";
import { GFFObject } from "../resource/GFFObject";
// import { NWScript } from "../nwscript/NWScript";
import { GFFField } from "../resource/GFFField";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { ResourceTypes } from "../resource/ResourceTypes";
import { ERFObject } from "../resource/ERFObject";
import { CurrentGame } from "../CurrentGame";
import { RIMObject } from "../resource/RIMObject";
import { GFFStruct } from "../resource/GFFStruct";
import { GameEventFactory } from "../events/GameEventFactory";
import { ResourceLoader, TextureLoader } from "../loaders";
import { AudioEngine } from "../audio/AudioEngine";
import { AudioEmitterType } from "../enums/audio/AudioEmitterType";
import { IModuleScripts } from "../interface/module/IModuleScripts";
import { IAreaListItem } from "../interface/area/IAreaListItem";
import type { GameEvent } from "../events/GameEvent";
import { ModuleArea } from "./ModuleArea";
import { ModuleTimeManager } from "./ModuleTimeManager";

type ModuleScriptKeys = 'Mod_OnAcquirItem'|'Mod_OnActvtItem'|'Mod_OnClientEntr'|'Mod_OnClientLeav'|'Mod_OnHeartbeat'|'Mod_OnModLoad'|'Mod_OnModStart'|'Mod_OnPlrDeath'|'Mod_OnPlrDying'|'Mod_OnPlrLvlUp'|'Mod_OnPlrRest'|'Mod_OnSpawnBtnDn'|'Mod_OnUnAqreItem'|'Mod_OnUsrDefined';

/**
 * Module class.
 * 
 * Class representing an ingame module.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file Module.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class Module {

  static ModuleArea: typeof ModuleArea = ModuleArea;

  ifo: GFFObject;

  areaName: string;
  area: ModuleArea;
  areas: ModuleArea[] = [];
  entryArea: string;
  entryDirectionX: number;
  entryDirectionY: number;
  entryX: number;
  entryY: number;
  entryZ: number;
  
  scripts: IModuleScripts = {} as IModuleScripts;
  scriptResRefs: Map<ModuleScriptKeys, string> = new Map<ModuleScriptKeys, string>();

  timeManager: ModuleTimeManager;

  archives: (RIMObject|ERFObject)[] = [];
  effects: GameEffect[] = [];
  eventQueue: GameEvent[] = [];
  customTokens: Map<number, string>;
  transition: any;
  transWP: string;

  /**
   * List of Areas in the module
   */
  areaList: IAreaListItem[] = [];

  /**
   * Description of module
   */
  description: CExoLocString;

  /**
   * Game hour at which dawn begins (0-23). Area lighting will begin transitioning from Night to Day colors over the course of 1 game hour.
   */
  dawnHour: number;

  /**
   * Game hour at which dusk begins (0-23). Area lighting will begin transitioning from Day to Night colors over the course of 1 game hour
   */
  duskHour: number;

  /**
   * Bit flags specifying what expansion packs are required to run this module. Once a bit is set, it is never unset. Bit 0 = Expansion 1, Bit 1 = Expansion 2, etc
   */
  expansionPack: number = 0;

  /**
   * Arbitrarily generated 16-byte number sequence assigned when toolset creates a new module. It is never
   * modified afterward by toolset. The game saves out 32 bytes instead of 16. Applications other than the toolset
   * can set this to all null bytes when creating a new IFO file.
   */
  id: Uint8Array = new Uint8Array(16);

  /**
   * Name of module
   */
  name: CExoLocString;

  /**
   * Module's Tag
   */
  tag: string;

  /**
   * Name of the modules Voice Over folder
   */
  voId: string;

  /**
   * Module version. Is always set to 3. 
   */
  version: number = 3;

  /**
   * Percentage by which to multiply all XP gained through killing creatures.
   */
  xpScale: number = 10;

  /**
   * ResRef of movie in 'movies' folder to play when starting module
   */
  startMovie: string = '';

  /**
   * Keeps track of which id to give the next character created
   */
  nextCharId0: number;

  /**
   * Keeps track of which id to give the next character created
   */
  nextCharId1: number;

  /**
   * Keeps track of which id to give the next object created
   */
  nextObjId0: number;

  /**
   * Keeps track of which id to give the next object created
   */
  nextObjId1: number;

  /**
   * ID to use for the next Effect
   */
  effectNextId: number;
  
  /** 
   * @deprecated Deprecated: since NWN
   */
  expansionList: any[] = [];

  /** 
   * @deprecated Deprecated: since NWN
   */
  globalVariableList: any[] = [];

  /** 
   * @deprecated Obsolete: since NWN
   */
  hak: string;

  /** 
   * @deprecated Deprecated: since NWN
   */
  cutSceneList: any[] = [];

  /** 
   * always set to 2
   * @deprecated Deprecated: since NWN
   */
  creatorId: number = 2;

  filename: string;
  readyToProcessEvents: boolean = false;
  isSaveGame: boolean = false;

  constructor(){
    this.scripts = {} as IModuleScripts;
    this.archives = [];
    this.effects = [];
    this.eventQueue = [];
    this.area = new ModuleArea();
    this.timeManager = new ModuleTimeManager();
    this.customTokens = new Map();

    this.initProperties();
  }

  update(delta: number = 0){
    if(this.area){
      this.area.update(delta);
    }
  }

  initProperties(){
    this.expansionPack;
    this.areaList = [];
    this.dawnHour;
    this.description = new CExoLocString();
    this.duskHour;
    this.entryArea;
    this.entryDirectionX;
    this.entryDirectionY;
    this.entryX;
    this.entryY;
    this.entryZ;
    
    this.isSaveGame = false;
    this.name = new CExoLocString();

    this.nextCharId0 = 0; // DWORD Keeps track of which id to give the next character created
    this.nextCharId1 = 0; // DWORD -
    this.nextObjId0  = 0; // DWORD Keeps track of which id to give the next object created
    this.nextObjId1  = 0; // DWORD -

    this.tag;
    this.voId = '';
    this.version;
    this.xpScale;
  }

  setFromIFO( ifo: GFFObject, isLoadingSave = false ){
    if(!(ifo instanceof GFFObject)){ return; }
    this.ifo = ifo;

    //Setup Module Calendar
    this.timeManager.setFromIFO(ifo);
    
    const areaList = ifo.getFieldByLabel('Mod_Area_list');
    const areaCount = areaList.getChildStructs().length;
    let Mod_Area = areaList.childStructs[0];

    this.areaName = ifo.getFieldByLabel('Area_Name', Mod_Area.getFields()).getValue();

    this.areaList = [];
    //KOTOR modules should only ever have one area. But just incase lets loop through the list
    for(let i = 0; i < areaCount; i++){
      let Mod_Area = areaList.childStructs[0];
      const area: IAreaListItem = {} as any;

      if(Mod_Area.hasField('Area_Name'))
        area.areaName = Mod_Area.getFieldByLabel('Area_Name').getValue()

      if(Mod_Area.hasField('ObjectId'))
        area.objectId = Mod_Area.getFieldByLabel('ObjectId').getValue()

      this.areaList.push(area);
    }

    //LISTS
    if(ifo.RootNode.hasField('Expansion_Pack')){
      this.expansionPack = ifo.getFieldByLabel('Expansion_Pack').getValue();
    }else{
      this.expansionPack = 0;
    }

    this.creatorId = ifo.getFieldByLabel('Mod_Creator_ID').getValue();
    this.description = ifo.getFieldByLabel('Mod_Description').getCExoLocString();

    this.entryArea = ifo.getFieldByLabel('Mod_Entry_Area').getValue();
    this.entryDirectionX = ifo.getFieldByLabel('Mod_Entry_Dir_X').getValue();
    this.entryDirectionY = ifo.getFieldByLabel('Mod_Entry_Dir_Y').getValue();
    this.entryX = ifo.getFieldByLabel('Mod_Entry_X').getValue();
    this.entryY = ifo.getFieldByLabel('Mod_Entry_Y').getValue();
    this.entryZ = ifo.getFieldByLabel('Mod_Entry_Z').getValue();

    this.hak = ifo.getFieldByLabel('Mod_Hak').getValue();
    this.id = ifo.getFieldByLabel('Mod_ID').getVoid(); //Generated by the toolset (Not sure if it is used in game)
    this.name = ifo.getFieldByLabel('Mod_Name').getCExoLocString();

    //Mod_Tokens
    if(ifo.RootNode.hasField('Mod_Tokens') && isLoadingSave){
      const tokenList = ifo.getFieldByLabel('Mod_Tokens').getChildStructs();
      for(let i = 0, len = tokenList.length; i < len; i++){
        this.setCustomToken(
          tokenList[i].getFieldByLabel('Mod_TokensNumber').getValue(),
          tokenList[i].getFieldByLabel('Mod_TokensValue').getValue()
        );
      }
    }

    if(ifo.RootNode.hasField('Mod_PlayerList') && isLoadingSave){
      const playerList = ifo.getFieldByLabel('Mod_PlayerList').getChildStructs();
      if(playerList.length){
        GameState.PartyManager.PlayerTemplate = GFFObject.FromStruct(playerList[0]);
        GameState.PartyManager.ActualPlayerTemplate = GameState.SaveGame.pc || GameState.PartyManager.PlayerTemplate;
        // if(GameState.PartyManager.PlayerTemplate.getFieldByLabel('IsPC').getValue()){
        //   GameState.PartyManager.ActualPlayerTemplate = GameState.PartyManager.PlayerTemplate;
        // }else{
        //   GameState.PartyManager.ActualPlayerTemplate = GameState.SaveGame.pc;
        // }
      }
    }

    //Scripts
    this.scriptResRefs.set('Mod_OnAcquirItem',  ifo.getFieldByLabel('Mod_OnAcquirItem').getValue());
    this.scriptResRefs.set('Mod_OnActvtItem',   ifo.getFieldByLabel('Mod_OnActvtItem').getValue());
    this.scriptResRefs.set('Mod_OnClientEntr',  ifo.getFieldByLabel('Mod_OnClientEntr').getValue());
    this.scriptResRefs.set('Mod_OnClientLeav',  ifo.getFieldByLabel('Mod_OnClientLeav').getValue());
    this.scriptResRefs.set('Mod_OnHeartbeat',   ifo.getFieldByLabel('Mod_OnHeartbeat').getValue());
    this.scriptResRefs.set('Mod_OnModLoad',     ifo.getFieldByLabel('Mod_OnModLoad').getValue());
    this.scriptResRefs.set('Mod_OnModStart',    ifo.getFieldByLabel('Mod_OnModStart').getValue());
    this.scriptResRefs.set('Mod_OnPlrDeath',    ifo.getFieldByLabel('Mod_OnPlrDeath').getValue());
    this.scriptResRefs.set('Mod_OnPlrDying',    ifo.getFieldByLabel('Mod_OnPlrDying').getValue());
    this.scriptResRefs.set('Mod_OnPlrLvlUp',    ifo.getFieldByLabel('Mod_OnPlrLvlUp').getValue());
    this.scriptResRefs.set('Mod_OnPlrRest',     ifo.getFieldByLabel('Mod_OnPlrRest').getValue());
    this.scriptResRefs.set('Mod_OnSpawnBtnDn',  ifo.getFieldByLabel('Mod_OnSpawnBtnDn').getValue());
    this.scriptResRefs.set('Mod_OnUnAqreItem',  ifo.getFieldByLabel('Mod_OnUnAqreItem').getValue());
    this.scriptResRefs.set('Mod_OnUsrDefined',  ifo.getFieldByLabel('Mod_OnUsrDefined').getValue());

    if(ifo.RootNode.hasField('Mod_StartMovie')){
      this.startMovie = ifo.getFieldByLabel('Mod_StartMovie').getValue();
    }else{
      this.startMovie = '';
    }

    this.tag = ifo.getFieldByLabel('Mod_Tag').getValue();

    if(ifo.RootNode.hasField('Mod_VO_ID')){
      this.voId = ifo.getFieldByLabel('Mod_VO_ID').getValue();
    }

    this.version = ifo.getFieldByLabel('Mod_Version').getValue();
    this.xpScale = ifo.getFieldByLabel('Mod_XPScale').getValue();

    if(ifo.RootNode.hasField('Mod_NextCharId0'))
      this.nextCharId0 = ifo.getFieldByLabel('Mod_NextCharId0').getValue();

    if(ifo.RootNode.hasField('Mod_NextCharId1'))
      this.nextCharId1 = ifo.getFieldByLabel('Mod_NextCharId1').getValue();

    if(ifo.RootNode.hasField('Mod_NextObjId0'))
      this.nextObjId0 = ifo.getFieldByLabel('Mod_NextObjId0').getValue();

    if(ifo.RootNode.hasField('Mod_NextObjId1'))
      this.nextObjId1 = ifo.getFieldByLabel('Mod_NextObjId1').getValue();
  }

  addEffect(effect?: GameEffect, lLocation?: EngineLocation){
    if(!(effect instanceof GameEffect)){ return; }

    effect.loadModel();
    const object: any = {
      model: new THREE.Object3D(),
      position: lLocation.position,
      dispose: function(){
        this.onRemove();
        this.removeEffect(this);
      },
      removeEffect: function(effect: GameEffect){
        let index = this.effects.indexOf(effect);
        if(index >= 0){
          this.effects.splice(index, 1);
        }
      }
    };

    object.audioEmitter = new AudioEmitter(AudioEngine.GetAudioEngine());
    object.audioEmitter.maxDistance = 50;
    object.audioEmitter.type = AudioEmitterType.POSITIONAL;
    object.audioEmitter.load();
    object.audioEmitter.setPosition(lLocation.position.x, lLocation.position.y, lLocation.position.z);

    object.model.position.copy(lLocation.position);

    effect.setCreator(object);
    effect.setAttachedObject(this);
    effect.onApply(object);
    this.effects.push(effect);

    GameState.group.effects.add(object.model);
  }

  addEvent(event: GameEvent){
    if(this.eventQueue.indexOf(event) >= 0){ return; }
    this.eventQueue.push(event);
  }

  tick(delta = 0){

    if(this.readyToProcessEvents){

      //Process EventQueue
      let eqLen = this.eventQueue.length - 1;
      for(let i = eqLen; i >= 0; i--){
        let event = this.eventQueue[i];
        
        if( this.timeManager.pauseDay >= event.day && this.timeManager.pauseTime >= event.time ){
          event.execute();
          this.eventQueue.splice(i, 1);
        }
      }

      //Process EffectList
      let elLen = this.effects.length - 1;
      for(let i = elLen; i >= 0; i--){
        this.effects[i].update(delta);
      }

      if(this.area){
        this.area.update(delta);
      }

      this.timeManager.update(delta);

    }

  }

  tickPaused(delta = 0){
    if(this.readyToProcessEvents){
      if(this.area){
        this.area.updatePaused(delta);
      }
    }
  }

  setReturnStrRef(enabled = false, str1 = -1, str2 = -1){
    GameState.MenuManager.MenuMap.BTN_RETURN.setText(GameState.TLKManager.GetStringById(str1).Value);
  }

  async loadScene(){
    try{
      GameState.PartyManager.party = [];
      
      GameState.ModuleObjectManager.ResetPlayerId();

      if(this.area.sun.fogOn && this.area.sun.fogColor){
        GameState.globalLight.color.setHex(parseInt('0x'+this.area.sun.fogColor.toString(16)));
      }else{
        GameState.globalLight.color.setHex(parseInt('0x'+this.area.dynamicAmbientColor.toString(16)));
      }
      
      GameState.globalLight.color.setRGB(
        THREE.MathUtils.clamp(GameState.globalLight.color.r, 0.2, 1),
        THREE.MathUtils.clamp(GameState.globalLight.color.g, 0.2, 1),
        THREE.MathUtils.clamp(GameState.globalLight.color.b, 0.2, 1),
      );

      GameState.camera.position.setX(this.entryX);
      GameState.camera.position.setY(this.entryY);
      GameState.camera.position.setZ(this.entryZ + 2);
      GameState.camera.rotation.set(Math.PI / 2, -Math.atan2(this.entryDirectionX, this.entryDirectionY), 0);

      //this.camera.pitch = THREE.MathUtils.radToDeg(this.camera.rotation.y) * -1;
      //this.camera.yaw = THREE.MathUtils.radToDeg(this.camera.rotation.x);

      const ypr = this.toEulerianAngle(GameState.camera.quaternion);

      GameState.camera.userData.pitch = THREE.MathUtils.radToDeg(ypr.pitch);
      GameState.camera.userData.yaw = THREE.MathUtils.radToDeg(ypr.yaw) * -1;

      if (GameState.camera.userData.pitch > 89.0)
        GameState.camera.userData.pitch = 89.0;
      if (GameState.camera.userData.pitch < -89.0)
        GameState.camera.userData.pitch = -89.0;

      GameState.MenuManager.LoadScreen.setProgress(0);

      await this.area.loadScene();
      this.transWP = null;
    }catch(e){
      console.error(e);
    }
  }

  async initScripts(){
    const scriptKeys = Array.from(this.scriptResRefs.keys());
    const scriptResRefs = Array.from(this.scriptResRefs.values());
    for(let i = 0; i < scriptResRefs.length; i++){
      const resRef = scriptResRefs[i];
      if(!resRef){ continue; }

      const key = scriptKeys[i];
      const script = GameState.NWScript.Load(resRef);
      if(!script){ continue; }

      if(key == 'Mod_OnAcquirItem'){
        this.scripts.onAcquireItem = script;
      }else if(key == 'Mod_OnActvtItem'){
        this.scripts.onActivateItem = script;
      }else if(key == 'Mod_OnClientEntr'){
        this.scripts.onClientEnter = script;
      }else if(key == 'Mod_OnClientLeav'){
        this.scripts.onClientLeave = script;
      }else if(key == 'Mod_OnHeartbeat'){
        this.scripts.onHeartbeat = script;
      }else if(key == 'Mod_OnModLoad'){
        this.scripts.onModuleLoad = script;
      }else if(key == 'Mod_OnModStart'){
        this.scripts.onModuleStart = script;
      }else if(key == 'Mod_OnPlrDeath'){
        this.scripts.onPlayerDeath = script;
      }else if(key == 'Mod_OnPlrDying'){
        this.scripts.onPlayerDying = script;
      }else if(key == 'Mod_OnPlrLvlUp'){
        this.scripts.onPlayerLevelUp = script;
      }else if(key == 'Mod_OnPlrRest'){
        this.scripts.onPlayerRest = script;
      }else if(key == 'Mod_OnSpawnBtnDn'){
        this.scripts.onSpawnButtonDown = script;
      }else if(key == 'Mod_OnUnAqreItem'){
        this.scripts.onUnAcquireItem = script;
      }else if(key == 'Mod_OnUsrDefined'){
        this.scripts.onUserDefined = script;
      }
    }

    if(this.scripts.onModuleLoad){
      this.scripts.onModuleLoad.enteringObject = GameState.PartyManager.party[0];
      this.scripts.onModuleLoad.run(this.area, 0);
    }

    if(this.scripts.onClientEnter){
      this.scripts.onClientEnter.enteringObject = GameState.PartyManager.party[0];
      this.scripts.onClientEnter.run(this.area, 0);
    }
  }

  setCustomToken(tokenNumber = 0, tokenValue = ''){
    this.customTokens.set(tokenNumber, tokenValue);
  }

  getCustomToken(tokenNumber: any){
    return this.customTokens.get(tokenNumber) || `<Missing CustomToken ${tokenNumber}>`;
  }

  initEventQueue(){
    //Load module EventQueue after the area is intialized so that ModuleObject ID's are set
    if(this.ifo.RootNode.hasField('EventQueue')){
      let eventQueue = this.ifo.getFieldByLabel('EventQueue').getChildStructs();
      for(let i = 0; i < eventQueue.length; i++){
        let event_struct = eventQueue[i];
        let event = GameEventFactory.EventFromStruct(event_struct);
        console.log(event_struct, event);
        if(event){
          this.eventQueue.push(event);
        }
      }
    }
  }

  dispose(){
    GameState.collisionList = [];
    
    //Remove all effects
    if(this){
      while(this.effects.length){
        this.effects[0].dispose();
        this.effects.shift();
      }
    }

    //Cleanup texture cache
    Array.from(TextureLoader.textures.keys()).forEach( (key) => {
      TextureLoader.textures.get(key).dispose();
      TextureLoader.textures.delete(key); 
    });

    //Clear walkmesh list
    while (GameState.walkmeshList.length){
      let wlkmesh = GameState.walkmeshList.shift();
      //wlkmesh.dispose();
      GameState.group.room_walkmeshes.remove(wlkmesh);
    }

    if(GameState.PartyManager.Player){
      GameState.PartyManager.Player.destroy();
      GameState.PartyManager.Player = undefined;
    }

    //Clear emitters
    while (GameState.group.emitters.children.length){
      GameState.group.emitters.remove(GameState.group.emitters.children[0]);
    }
    
    if(this.area){
      this.area.dispose();
    }
  }

  async save( isSaveGame = false ){
    GameState.PartyManager.Save();

    const ifo = new GFFObject();
    ifo.FileType = 'IFO ';

    ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Creature List') );
    const eventQueue = ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'EventQueue') );
    for(let i = 0; i < this.eventQueue.length; i++){
      let event = this.eventQueue[i];
      if(event){
        eventQueue.addChildStruct( event.export() );
      }
    }

    const areaList = ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_Area_list') );
    if(this.area){
      areaList.addChildStruct( this.area.saveAreaListStruct() );
      this.area.save();
    }

    ifo.RootNode.addField( new GFFField(GFFDataType.INT, 'Mod_Creator_ID') ).setValue(this.creatorId);
    ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_CutSceneList') );
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_DawnHour') ).setValue(this.timeManager.dawnHour);
    ifo.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Description') ).setValue( this.description );
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_DuskHour') ).setValue(this.timeManager.duskHour);
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD64, 'Mod_Effect_NxtId') ).setValue(this.effectNextId);
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_Entry_Area') ).setValue(this.entryArea);
    ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Dir_X') ).setValue(this.entryDirectionX);
    ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Dir_Y') ).setValue(this.entryDirectionY);
    ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_X') ).setValue(this.entryX);
    ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Y') ).setValue(this.entryY);
    ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Z') ).setValue(this.entryZ);
    ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_Expan_List') );
    ifo.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_Hak') ).setValue(this.hak);
    ifo.RootNode.addField( new GFFField(GFFDataType.VOID, 'Mod_ID') );
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_IsNWMFile') ).setValue(0);
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_IsSaveGame') ).setValue( isSaveGame ? 1 : 0);
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_MinPerHour') ).setValue(this.timeManager.minutesPerHour);
    ifo.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Name') ).setValue( this.name );
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_NextCharId0') ).setValue(this.nextCharId0);
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_NextCharId1') ).setValue(this.nextCharId1);
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_NextObjId0') ).setValue(this.nextObjId0);
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_NextObjId1') ).setValue(this.nextObjId1);
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnAcquirItem') ).setValue(this.scripts.onAcquireItem ? this.scripts.onAcquireItem.name : '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnActvtItem') ).setValue(this.scripts.onActivateItem ? this.scripts.onActivateItem.name : '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnClientEntr') ).setValue(this.scripts.onClientEnter ? this.scripts.onClientEnter.name : '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnClientLeav') ).setValue(this.scripts.onClientLeave ? this.scripts.onClientLeave.name : '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnHeartbeat') ).setValue(this.scripts.onHeartbeat ? this.scripts.onHeartbeat.name : '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnModLoad') ).setValue(this.scripts.onModuleLoad ? this.scripts.onModuleLoad.name : '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnModStart') ).setValue(this.scripts.onModuleStart ? this.scripts.onModuleStart.name : '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrDeath') ).setValue(this.scripts.onPlayerDeath ? this.scripts.onPlayerDeath.name : '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrDying') ).setValue(this.scripts.onPlayerDying ? this.scripts.onPlayerDying.name : '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrLvlUp') ).setValue(this.scripts.onPlayerLevelUp ? this.scripts.onPlayerLevelUp.name : '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrRest') ).setValue(this.scripts.onPlayerRest ? this.scripts.onPlayerRest.name : '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnSpawnBtnDn') ).setValue(this.scripts.onSpawnButtonDown ? this.scripts.onSpawnButtonDown.name : '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnUnAqreItem') ).setValue(this.scripts.onUnAcquireItem ? this.scripts.onUnAcquireItem.name : '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnUsrDefined') ).setValue(this.scripts.onUserDefined ? this.scripts.onUserDefined.name : '');
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_PauseDay') ).setValue(this.timeManager.pauseDay);
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_PauseTime') ).setValue(this.timeManager.pauseTime);

    //Player
    const playerList = ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_PlayerList') );
    if(GameState.PartyManager.Player){
      playerList.addChildStruct( GameState.PartyManager.Player.save().RootNode );
    }

    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_StartDay') ).setValue(this.timeManager.day);
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_StartHour') ).setValue(this.timeManager.hour);
    ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Mod_StartMiliSec') ).setValue(this.timeManager.milisecond);
    ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Mod_StartMinute') ).setValue(this.timeManager.minute);
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_StartMonth') ).setValue(this.timeManager.month);
    ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Mod_StartSecond') ).setValue(this.timeManager.second);
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_StartYear') ).setValue(this.timeManager.year);
    ifo.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_Tag') ).setValue(this.tag);
    ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_Tokens') );
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_Transition') ).setValue(this.transition);
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_Version') ).setValue(this.version);
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_XPScale') .setValue(this.xpScale));
    ifo.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'VarTable') );
    
    this.ifo = ifo;

    const sav = new ERFObject();
    sav.addResource('module', ResourceTypes['ifo'], this.ifo.getExportBuffer());
    for(let i = 0; i < this.areas.length; i++){
      const area = this.areas[i];
      sav.addResource(area.name, ResourceTypes['are'], area.are.getExportBuffer());
      sav.addResource(area.name, ResourceTypes['git'], area.git.getExportBuffer());
    }

    if(this.includeInSave()){
      await sav.export( path.join(CurrentGame.gameinprogress_dir, this.filename+'.sav') );
    }
    
    console.log('Current Module Exported', this.filename);

    await GameState.InventoryManager.Save();
    await GameState.PartyManager.ExportPartyMemberTemplates();
    await GameState.FactionManager.Export( path.join(CurrentGame.gameinprogress_dir, 'repute.fac') );
  }

  includeInSave(){
    const modulesave2DA = GameState.TwoDAManager.datatables.get('modulesave');
    if(modulesave2DA){
      const moduleSave = modulesave2DA.getRowByColumnAndValue('modulename', this.filename);
      if(moduleSave){
        return parseInt(moduleSave.includeInSave) == 0 ? false : true;
      }
    }
    return true;
  }

  static async GetModuleMod(resRef = ''){
    const resource_path = path.join('modules', `${resRef}.mod`);
    try{
      const mod = new ERFObject(resource_path);
      await mod.load();
      console.log('Module.GetModuleMod success', resource_path);
      return mod;
    }catch(e){
      console.error('Module.GetModuleMod failed', resource_path);
      console.error(e);
      return undefined;
    }
  }

  static async GetModuleRimA(resRef = ''): Promise<RIMObject> {
    const resourcePath = path.join('modules', `${resRef}.rim`);
    try{
      const rim = new RIMObject(resourcePath);
      await rim.load();
      return rim;
    }catch(e){
      console.error('Module.GetModuleRimA failed', resourcePath);
      console.error(e);
      return undefined;
    }
  }

  static async GetModuleRimB(resRef = ''): Promise<RIMObject> {
    const resourcePath = path.join('modules', `${resRef}_s.rim`);
    try{
      const rim = new RIMObject(resourcePath);
      await rim.load();
      return rim;
    }catch(e){
      console.log('Module.GetModuleRimB failed', resourcePath);
      console.error(e);
      return undefined;
    }
  }

  static async GetModuleLipsLoc(): Promise<ERFObject> {
    const resourcePath = path.join('lips', 'localization.mod');
    try{
      const mod = new ERFObject(resourcePath);
      await mod.load();
      console.log('Module.GetModuleLipsLoc success', resourcePath);
      return mod;
    }catch(e){
      console.log('Module.GetModuleLipsLoc failed', resourcePath);
      console.error(e);
      return undefined;
    }
  }

  static async GetModuleLips(resRef = ''): Promise<ERFObject> {
    const resource_path = path.join('lips', `${resRef}_loc.mod`);
    try{
      const mod = new ERFObject(resource_path);
      await mod.load();
      return mod;
    }catch(e){
      console.log('Module.GetModuleLips failed', resource_path);
      console.error(e);
      return undefined;
    }
  }

  static async GetModuleDLG(resRef = ''): Promise<ERFObject> {
    let resourcePath = path.join('modules', `${resRef}_dlg.erf`);
    try{
      const erf = new ERFObject(resourcePath);
      await erf.load();
      return erf;
    }catch(e){
      console.log('Module.GetModuleDLG failed', resourcePath);
      console.error(e);
      return undefined;
    }
  }

  static async GetModuleArchives(modName = ''): Promise<(RIMObject|ERFObject)[]> {
    const archives: any[] = [];
    let archive = undefined;

    const isModuleSaved = await CurrentGame.IsModuleSaved(modName);

    try{
      if(isModuleSaved){
        archive = await CurrentGame.GetModuleRim(modName);
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
      archive = await Module.GetModuleLipsLoc();
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
    return archives;
  }

  static async GetModuleProjectArchives(modName = ''): Promise<(RIMObject|ERFObject)[]> {
    return new Promise<(RIMObject|ERFObject)[]> ( async (resolve, reject) => {
      let archives: any[] = [];
      let archive = undefined;

      try{
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
  static async Load(modName: string, waypoint?: string){
    console.log('Load', modName);
    const module = new Module();
    module.filename = modName;
    module.transWP = waypoint;
    if(!modName){ return module; }
    try{
      GameState.ModuleObjectManager.Reset();
      const archives = await Module.GetModuleArchives(modName);
      await ResourceLoader.InitModuleCache(archives);
      const ifo_data = await ResourceLoader.loadResource(ResourceTypes['ifo'], 'module');
      const ifo = new GFFObject(ifo_data);
      module.setFromIFO(ifo, GameState.isLoadingSave);
      GameState.time = module.timeManager.pauseTime / 1000;

      const gitBuffer = await ResourceLoader.loadResource(ResourceTypes['git'], module.entryArea);
      const git = new GFFObject(gitBuffer);

      const areBuffer = await ResourceLoader.loadResource(ResourceTypes['are'], module.entryArea);
      const are = new GFFObject(areBuffer)
      module.area = new ModuleArea(module.entryArea, are, git);
      module.areas = [module.area];
      module.area.module = module;
      module.area.setTransitionWaypoint(module.transWP);
      await module.area.load();

      if(module.nextObjId0)
        GameState.ModuleObjectManager.COUNT = module.nextObjId0;

      GameState.ModuleObjectManager.module = module;

      if(GameState.isLoadingSave){
        console.log('Module', 'SaveGame.loadInventory');
        await GameState.SaveGame.loadInventory();
      }

      return module;
    }catch(e){
      console.log(`Module.Load: failed to load module.`);
      console.error(e);
    }
  }

  toEulerianAngle(q: any){
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
    } as any;

  }

  toolsetExportIFO(){
    let ifo = new GFFObject();
    ifo.FileType = 'IFO ';

    ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Expansion_Pack', this.expansionPack) );
    let areaList = ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_Area_list') );

    //KotOR only supports one Area per module
    if(this.area instanceof ModuleArea){
      let areaStruct = new GFFStruct(6);
      areaStruct.addField( new GFFField(GFFDataType.RESREF, 'Area_Name', this.area.name) );
      areaList.addChildStruct(areaStruct);
    }

    ifo.RootNode.addField( new GFFField(GFFDataType.INT, 'Mod_Creator_ID', this.expansionPack) );
    ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_CutSceneList') );
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_DawnHour', this.timeManager.dawnHour) );
    ifo.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Description') ).setCExoLocString(this.description);
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_DuskHour', this.timeManager.duskHour) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_Entry_Area', this.entryArea) );
    ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Dir_X', this.entryDirectionX) );
    ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Dir_Y', this.entryDirectionY) );
    ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_X', this.entryX) );
    ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Y', this.entryY) );
    ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Z', this.entryZ) );

    ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_Expan_List') );
    ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_GVar_List') );

    ifo.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_Hak', this.hak) );
    ifo.RootNode.addField( new GFFField(GFFDataType.VOID, 'Mod_ID') ).setData(this.id || new Uint8Array(16));
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_IsSaveGame', 0) );
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_MinPerHour', this.timeManager.minutesPerHour) );
    ifo.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Name') ).setCExoLocString(this.name );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnAcquirItem', this.scripts.onAcquireItem) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnActvtItem', this.scripts.onActivateItem) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnClientEntr', this.scripts.onClientEnter) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnClientLeav', this.scripts.onClientLeave) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnHeartbeat', this.scripts.onHeartbeat) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnModLoad', this.scripts.onModuleLoad) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnModStart', this.scripts.onModuleStart) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrDeath', this.scripts.onPlayerDeath) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrDying', this.scripts.onPlayerDying) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrLvlUp', this.scripts.onPlayerLevelUp) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrRest', this.scripts.onPlayerRest) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnSpawnBtnDn', this.scripts.onSpawnButtonDown) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnUnAqreItem', this.scripts.onUnAcquireItem) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnUsrDefined', this.scripts.onUserDefined) );
    ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Mod_StartDay', this.timeManager.day) );
    ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Mod_StartHour', this.timeManager.hour) );
    ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Mod_StartMonth', this.timeManager.month) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_StartMovie', this.startMovie) );
    ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Mod_StartYear', this.timeManager.year) );
    ifo.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_Tag', this.tag) );
    ifo.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_VO_ID', this.voId) );
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_Version', this.version) );
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_XPScale', this.xpScale) );

    return ifo;

  }

}
