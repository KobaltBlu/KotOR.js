/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { AudioEmitter } from "../audio/AudioEmitter";
import { GameEffect } from "../effects";
import EngineLocation from "../engine/EngineLocation";
import { GameState } from "../GameState";
import { CExoLocString } from "../resource/CExoLocString";
import { GFFObject } from "../resource/GFFObject";
import { ModuleArea, ModuleTimeManager } from ".";
import * as THREE from "three";
import { CombatEngine } from "../combat";
import { ModuleObject, ModulePlayer } from ".";
import { AsyncLoop } from "../utility/AsyncLoop";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { NWScript } from "../nwscript/NWScript";
import { GFFField } from "../resource/GFFField";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { ResourceTypes } from "../resource/ResourceTypes";
import { ERFObject } from "../resource/ERFObject";
import { CurrentGame } from "../CurrentGame";
import * as path from "path";
import { RIMObject } from "../resource/RIMObject";
import { GFFStruct } from "../resource/GFFStruct";
import { GameEvent } from "../events";
import { FactionManager } from "../FactionManager";
import { GameFileSystem } from "../utility/GameFileSystem";
import { PartyManager, MenuManager, TLKManager, InventoryManager, TwoDAManager, ModuleObjectManager } from "../managers";
import { ResourceLoader, TextureLoader } from "../loaders";
import { AudioEngine } from "../audio/AudioEngine";
import { AudioEmitterType } from "../enums/audio/AudioEmitterType";

/* @file
 * The Module class.
 */

export class Module {
  area: ModuleArea;
  areas: ModuleArea[] = [];

  timeManager: ModuleTimeManager;
  scripts: any = {};
  archives: (RIMObject|ERFObject)[] = [];
  effects: any[] = [];
  eventQueue: any[] = [];
  customTokens: Map<any, any>;
  Expansion_Pack: any;
  Mod_Area_list: { Area_Name: number, ObjectId: number }[] = [];
  Mod_Creator_ID: number;
  Mod_CutSceneList: any[] = [];
  Mod_DawnHour: any;
  Mod_Description: any;
  Mod_DuskHour: any;
  Mod_Entry_Area: any;
  Mod_Entry_Dir_X: any;
  Mod_Entry_Dir_Y: any;
  Mod_Entry_X: any;
  Mod_Entry_Y: any;
  Mod_Entry_Z: any;
  Mod_Expan_List: any[] = [];
  Mod_GVar_List: any[] = [];
  Mod_Hak: any;
  Mod_ID: Buffer;
  Mod_IsSaveGame: number;
  Mod_Name: any;
  Mod_NextCharId0: number;
  Mod_NextCharId1: number;
  Mod_NextObjId0: number;
  Mod_NextObjId1: number;
  Mod_Tag: any;
  Mod_VO_ID: string;
  Mod_Version: any;
  Mod_XPScale: any;
  ifo: GFFObject;
  Area_Name: any;
  Mod_StartMovie: any;
  readyToProcessEvents: any;
  transWP: any;
  filename: string;
  static path: any;
  Mod_Transition: any;
  Mod_Effect_NxtId: any;

  constructor(onLoad?: Function){
    this.scripts = {};
    this.archives = [];
    this.effects = [];
    this.eventQueue = [];
    this.area = new ModuleArea();
    this.timeManager = new ModuleTimeManager();

    this.initProperties();

    this.customTokens = new Map();
  }

  update(delta: number = 0){
    if(this.area){
      this.area.update(delta);
    }
  }

  initProperties(){
    this.Expansion_Pack;
    this.Mod_Area_list = [];
    this.Mod_Creator_ID = 2; //UNUSED always set to 2
    this.Mod_CutSceneList = [];
    this.Mod_DawnHour;
    this.Mod_Description = new CExoLocString();
    this.Mod_DuskHour;
    this.Mod_Entry_Area;
    this.Mod_Entry_Dir_X;
    this.Mod_Entry_Dir_Y;
    this.Mod_Entry_X;
    this.Mod_Entry_Y;
    this.Mod_Entry_Z;

    this.Mod_Expan_List = [];
    this.Mod_GVar_List = [];

    this.Mod_Hak;
    this.Mod_ID = Buffer.alloc(16);
    this.Mod_IsSaveGame = 0;
    this.Mod_Name = new CExoLocString();

    this.Mod_NextCharId0 = 0; // DWORD Keeps track of which id to give the next character created
    this.Mod_NextCharId1 = 0; // DWORD -
    this.Mod_NextObjId0  = 0; // DWORD Keeps track of which id to give the next object created
    this.Mod_NextObjId1  = 0; // DWORD -


    this.scripts = {
      Mod_OnAcquirItem: '',
      Mod_OnActvtItem: '',
      Mod_OnClientEntr: '',
      Mod_OnClientLeav: '',
      Mod_OnHeartbeat: '',
      Mod_OnModLoad: '',
      Mod_OnModStart: '',
      Mod_OnPlrDeath: '',
      Mod_OnPlrDying: '',
      Mod_OnPlrLvlUp: '',
      Mod_OnPlrRest: '',
      Mod_OnSpawnBtnDn: '',
      Mod_OnUnAqreItem: '',
      Mod_OnUsrDefined: '',
    };

    this.Mod_Tag;
    this.Mod_VO_ID = '';
    this.Mod_Version;
    this.Mod_XPScale;
  }

  setFromIFO( ifo: GFFObject, isLoadingSave = false ){
    if(ifo instanceof GFFObject){
      this.ifo = ifo;

      //Setup Module Calendar
      this.timeManager.setFromIFO(ifo);
      
      const areaList = ifo.getFieldByLabel('Mod_Area_list');
      const areaCount = areaList.getChildStructs().length;
      let Mod_Area = areaList.childStructs[0];

      this.Area_Name = ifo.getFieldByLabel('Area_Name', Mod_Area.getFields()).getValue();

      this.Mod_Area_list = [];
      //KOTOR modules should only ever have one area. But just incase lets loop through the list
      for(let i = 0; i < areaCount; i++){
        let Mod_Area = areaList.childStructs[0];
        const area: { Area_Name: number, ObjectId: number } = {} as any;

        if(Mod_Area.hasField('Area_Name'))
          area.Area_Name = Mod_Area.getFieldByLabel('Area_Name').getValue()

        if(Mod_Area.hasField('ObjectId'))
          area.ObjectId = Mod_Area.getFieldByLabel('ObjectId').getValue()

        this.Mod_Area_list.push(area);
      }

      //LISTS
      if(ifo.RootNode.hasField('Expansion_Pack')){
        this.Expansion_Pack = ifo.getFieldByLabel('Expansion_Pack').getValue();
      }else{
        this.Expansion_Pack = 0;
      }

      this.Mod_CutSceneList = [];
      this.Mod_Expan_List = [];
      this.Mod_GVar_List = [];

      this.Mod_Creator_ID = ifo.getFieldByLabel('Mod_Creator_ID').getValue();
      this.Mod_Description = ifo.getFieldByLabel('Mod_Description').getCExoLocString();

      this.Mod_Entry_Area = ifo.getFieldByLabel('Mod_Entry_Area').getValue();
      this.Mod_Entry_Dir_X = ifo.getFieldByLabel('Mod_Entry_Dir_X').getValue();
      this.Mod_Entry_Dir_Y = ifo.getFieldByLabel('Mod_Entry_Dir_Y').getValue();
      this.Mod_Entry_X = ifo.getFieldByLabel('Mod_Entry_X').getValue();
      this.Mod_Entry_Y = ifo.getFieldByLabel('Mod_Entry_Y').getValue();
      this.Mod_Entry_Z = ifo.getFieldByLabel('Mod_Entry_Z').getValue();

      this.Mod_Hak = ifo.getFieldByLabel('Mod_Hak').getValue();
      this.Mod_ID = ifo.getFieldByLabel('Mod_ID').getVoid(); //Generated by the toolset (Not sure if it is used in game)
      this.Mod_Name = ifo.getFieldByLabel('Mod_Name').getCExoLocString();

      //Mod_Tokens
      if(ifo.RootNode.hasField('Mod_Tokens') && isLoadingSave){
        let tokenList = ifo.getFieldByLabel('Mod_Tokens').getChildStructs();
        for(let i = 0, len = tokenList.length; i < len; i++){
          this.setCustomToken(
            tokenList[i].getFieldByLabel('Mod_TokensNumber').getValue(),
            tokenList[i].getFieldByLabel('Mod_TokensValue').getValue()
          );
        }
      }

      if(ifo.RootNode.hasField('Mod_PlayerList') && isLoadingSave){
        let playerList = ifo.getFieldByLabel('Mod_PlayerList').getChildStructs();
        if(playerList.length){
          PartyManager.PlayerTemplate = GFFObject.FromStruct(playerList[0]);
        }
      }

      //Scripts
      this.scripts.onAcquirItem = ifo.getFieldByLabel('Mod_OnAcquirItem').getValue();
      this.scripts.onActvItem = ifo.getFieldByLabel('Mod_OnActvtItem').getValue();
      this.scripts.onClientEntr = ifo.getFieldByLabel('Mod_OnClientEntr').getValue();
      this.scripts.onClientLeav = ifo.getFieldByLabel('Mod_OnClientLeav').getValue();
      this.scripts.onHeartbeat = ifo.getFieldByLabel('Mod_OnHeartbeat').getValue();
      this.scripts.onModLoad = ifo.getFieldByLabel('Mod_OnModLoad').getValue();
      this.scripts.onModStart = ifo.getFieldByLabel('Mod_OnModStart').getValue();
      this.scripts.onPlrDeath = ifo.getFieldByLabel('Mod_OnPlrDeath').getValue();
      this.scripts.onPlrDying = ifo.getFieldByLabel('Mod_OnPlrDying').getValue();
      this.scripts.onPlrLvlUp = ifo.getFieldByLabel('Mod_OnPlrLvlUp').getValue();
      this.scripts.onPlrRest = ifo.getFieldByLabel('Mod_OnPlrRest').getValue();
      this.scripts.onSpawnBtnDn = ifo.getFieldByLabel('Mod_OnSpawnBtnDn').getValue();
      this.scripts.onUnAqreItem = ifo.getFieldByLabel('Mod_OnUnAqreItem').getValue();
      this.scripts.onUsrDefined = ifo.getFieldByLabel('Mod_OnUsrDefined').getValue();

      if(ifo.RootNode.hasField('Mod_StartMovie')){
        this.Mod_StartMovie = ifo.getFieldByLabel('Mod_StartMovie').getValue();
      }else{
        this.Mod_StartMovie = '';
      }

      this.Mod_Tag = ifo.getFieldByLabel('Mod_Tag').getValue();

      if(ifo.RootNode.hasField('Mod_VO_ID')){
        this.Mod_VO_ID = ifo.getFieldByLabel('Mod_VO_ID').getValue();
      }

      this.Mod_Version = ifo.getFieldByLabel('Mod_Version').getValue();
      this.Mod_XPScale = ifo.getFieldByLabel('Mod_XPScale').getValue();

      if(ifo.RootNode.hasField('Mod_NextCharId0'))
        this.Mod_NextCharId0 = ifo.getFieldByLabel('Mod_NextCharId0').getValue();

      if(ifo.RootNode.hasField('Mod_NextCharId1'))
        this.Mod_NextCharId1 = ifo.getFieldByLabel('Mod_NextCharId1').getValue();

      if(ifo.RootNode.hasField('Mod_NextObjId0'))
        this.Mod_NextObjId0 = ifo.getFieldByLabel('Mod_NextObjId0').getValue();

      if(ifo.RootNode.hasField('Mod_NextObjId1'))
        this.Mod_NextObjId1 = ifo.getFieldByLabel('Mod_NextObjId1').getValue();

    }
  }

  addEffect(effect?: GameEffect, lLocation?: EngineLocation){
    if(effect instanceof GameEffect){
      effect.loadModel();
      let object: any = {
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
  }

  tick(delta = 0){

    if(this.readyToProcessEvents){
      
      CombatEngine.Update(delta);

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
    MenuManager.MenuMap.BTN_RETURN.setText(TLKManager.GetStringById(str1).Value);
  }

  loadScene( onLoad?: Function, onProgress?: Function ){
    try{
      PartyManager.party = [];
      
      ModuleObjectManager.ResetPlayerId();

      if(this.area.SunFogOn && this.area.SunFogColor){
        GameState.globalLight.color.setHex(parseInt('0x'+this.area.SunFogColor.toString(16)));
      }else{
        GameState.globalLight.color.setHex(parseInt('0x'+this.area.DynAmbientColor.toString(16)));
      }
      
      GameState.globalLight.color.setRGB(
        THREE.MathUtils.clamp(GameState.globalLight.color.r, 0.2, 1),
        THREE.MathUtils.clamp(GameState.globalLight.color.g, 0.2, 1),
        THREE.MathUtils.clamp(GameState.globalLight.color.b, 0.2, 1),
      );

      GameState.camera.position.setX(this['Mod_Entry_X']);
      GameState.camera.position.setY(this['Mod_Entry_Y']);
      GameState.camera.position.setZ(this['Mod_Entry_Z'] + 2);
      GameState.camera.rotation.set(Math.PI / 2, -Math.atan2(this['Mod_Entry_Dir_X'], this['Mod_Entry_Dir_Y']), 0);

      //this.camera.pitch = THREE.MathUtils.radToDeg(this.camera.rotation.y) * -1;
      //this.camera.yaw = THREE.MathUtils.radToDeg(this.camera.rotation.x);

      let ypr = this.toEulerianAngle(GameState.camera.quaternion);

      GameState.camera.userData.pitch = THREE.MathUtils.radToDeg(ypr.pitch);
      GameState.camera.userData.yaw = THREE.MathUtils.radToDeg(ypr.yaw) * -1;

      if (GameState.camera.userData.pitch > 89.0)
        GameState.camera.userData.pitch = 89.0;
      if (GameState.camera.userData.pitch < -89.0)
        GameState.camera.userData.pitch = -89.0;

      MenuManager.LoadScreen.setProgress(0);

      try{
        MenuManager.InGameOverlay.miniMap.setAreaMap(this.area.areaMap);
        MenuManager.InGameOverlay.SetMapTexture('lbl_map'+this.Mod_Entry_Area);
        MenuManager.MenuMap.miniMap.setAreaMap(this.area.areaMap);
        MenuManager.MenuMap.SetMapTexture('lbl_map'+this.Mod_Entry_Area);
      }catch(e){
        console.error(e);
      }

      this.area.loadScene().then( () => {
        if(typeof onLoad === 'function')
          onLoad();

        this.transWP = null;
      });
    }catch(e){
      console.error(e);
    }

  }

  initScripts(onComplete?: Function){
    let initScripts = [];

    if(this.scripts.onModLoad != ''){
      initScripts.push('onModLoad');
    }
    
    if(this.scripts.onClientEntr != ''){
      initScripts.push('onClientEntr');
    }
    console.log('initScripts', initScripts);

    let keys = Object.keys(this.scripts);
    let loop = new AsyncLoop({
      array: initScripts,
      onLoop: async (key: string, asyncLoop: AsyncLoop) => {
        let _script = this.scripts[key];
        console.log(key, _script);
        if(typeof _script === 'string' && _script != ''){
          //let script = NWScript.Load(_script);
          this.scripts[key] = NWScript.Load(_script);
          if(this.scripts[key] instanceof NWScriptInstance){
            //this.scripts[key].name = _script;
            this.scripts[key].enteringObject = GameState.player;
            this.scripts[key].run(this.area, 0);
            asyncLoop.next();
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
      if(typeof onComplete === 'function')
        onComplete();
    });
    
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
        let event = GameEvent.EventFromStruct(event_struct);
        console.log(event_struct, event);
        if(event instanceof GameEvent){
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

    if(GameState.player instanceof ModuleObject){
      GameState.player.destroy();
      GameState.player = undefined;
    }

    //Clear emitters
    while (GameState.group.emitters.children.length){
      GameState.group.emitters.remove(GameState.group.emitters.children[0]);
    }
    
    if(this.area){
      this.area.dispose();
    }

  }

  save( isSaveGame = false ){

    return new Promise<void>( async (resolve, reject ) => {

      PartyManager.Save();

      let ifo = new GFFObject();
      ifo.FileType = 'IFO ';

      ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Creature List') );
      let eventQueue = ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'EventQueue') );
      for(let i = 0; i < this.eventQueue.length; i++){
        
        let event = this.eventQueue[i];
        if(event instanceof GameEvent){
          eventQueue.addChildStruct( event.export() );
        }

      }

      let areaList = ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_Area_list') );
      if(this.area){
        areaList.addChildStruct( this.area.saveAreaListStruct() );
        this.area.save();
      }

      ifo.RootNode.addField( new GFFField(GFFDataType.INT, 'Mod_Creator_ID') ).setValue(this.Mod_Creator_ID);
      ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_CutSceneList') );
      ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_DawnHour') ).setValue(this.timeManager.dawnHour);
      ifo.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Description') ).setValue( this.Mod_Description );
      ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_DuskHour') ).setValue(this.timeManager.duskHour);
      ifo.RootNode.addField( new GFFField(GFFDataType.DWORD64, 'Mod_Effect_NxtId') ).setValue(this.Mod_Effect_NxtId);
      ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_Entry_Area') ).setValue(this.Mod_Entry_Area);
      ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Dir_X') ).setValue(this.Mod_Entry_Dir_X);
      ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Dir_Y') ).setValue(this.Mod_Entry_Dir_Y);
      ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_X') ).setValue(this.Mod_Entry_X);
      ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Y') ).setValue(this.Mod_Entry_Y);
      ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Z') ).setValue(this.Mod_Entry_Z);
      ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_Expan_List') );
      ifo.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_Hak') ).setValue(this.Mod_Hak);
      ifo.RootNode.addField( new GFFField(GFFDataType.VOID, 'Mod_ID') );
      ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_IsNWMFile') ).setValue(0);
      ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_IsSaveGame') ).setValue( isSaveGame ? 1 : 0);
      ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_MinPerHour') ).setValue(this.timeManager.minutesPerHour);
      ifo.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Name') ).setValue( this.Mod_Name );
      ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_NextCharId0') ).setValue(this.Mod_NextCharId0);
      ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_NextCharId1') ).setValue(this.Mod_NextCharId1);
      ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_NextObjId0') ).setValue(this.Mod_NextObjId0);
      ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_NextObjId1') ).setValue(this.Mod_NextObjId1);
      ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnAcquirItem') ).setValue(this.scripts.onAcquirItem ? this.scripts.onAcquirItem.name : '');
      ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnActvtItem') ).setValue(this.scripts.onActvItem ? this.scripts.onActvItem.name : '');;
      ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnClientEntr') ).setValue(this.scripts.onClientEntr ? this.scripts.onClientEntr.name : '');;
      ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnClientLeav') ).setValue(this.scripts.onClientLeav ? this.scripts.onClientLeav.name : '');;
      ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnHeartbeat') ).setValue(this.scripts.onHeartbeat ? this.scripts.onHeartbeat.name : '');;
      ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnModLoad') ).setValue(this.scripts.onModLoad ? this.scripts.onModLoad.name : '');;
      ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnModStart') ).setValue(this.scripts.onModStart ? this.scripts.onModStart.name : '');;
      ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrDeath') ).setValue(this.scripts.onPlrDeath ? this.scripts.onPlrDeath.name : '');;
      ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrDying') ).setValue(this.scripts.onPlrDying ? this.scripts.onPlrDying.name : '');;
      ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrLvlUp') ).setValue(this.scripts.onPlrLvlUp ? this.scripts.onPlrLvlUp.name : '');;
      ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrRest') ).setValue(this.scripts.onPlrRest ? this.scripts.onPlrRest.name : '');;
      ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnSpawnBtnDn') ).setValue(this.scripts.onSpawnBtnDn ? this.scripts.onSpawnBtnDn.name : '');;
      ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnUnAqreItem') ).setValue(this.scripts.onUnAqreItem ? this.scripts.onUnAqreItem.name : '');;
      ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnUsrDefined') ).setValue(this.scripts.onUsrDefined ? this.scripts.onUsrDefined.name : '');;
      ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_PauseDay') ).setValue(this.timeManager.pauseDay);
      ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_PauseTime') ).setValue(this.timeManager.pauseTime);

      //Player
      let playerList = ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_PlayerList') );
      if(GameState.player instanceof ModulePlayer){
        playerList.addChildStruct( GameState.player.save().RootNode );
      }

      ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_StartDay') ).setValue(this.timeManager.day);
      ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_StartHour') ).setValue(this.timeManager.hour);
      ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Mod_StartMiliSec') ).setValue(this.timeManager.milisecond);
      ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Mod_StartMinute') ).setValue(this.timeManager.minute);
      ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_StartMonth') ).setValue(this.timeManager.month);
      ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Mod_StartSecond') ).setValue(this.timeManager.second);
      ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_StartYear') ).setValue(this.timeManager.year);
      ifo.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_Tag') ).setValue(this.Mod_Tag);
      ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_Tokens') );
      ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_Transition') ).setValue(this.Mod_Transition);
      ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_Version') ).setValue(this.Mod_Version);
      ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_XPScale') .setValue(this.Mod_XPScale));
      ifo.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
      ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'VarTable') );
      
      this.ifo = ifo;

      let sav = new ERFObject();

      sav.addResource('module', ResourceTypes['ifo'], this.ifo.getExportBuffer());
      for(let i = 0; i < this.areas.length; i++){
        const area = this.areas[i];
        sav.addResource(area._name, ResourceTypes['are'], area.are.getExportBuffer());
        sav.addResource(area._name, ResourceTypes['git'], area.git.getExportBuffer());
      }

      if(this.includeInSave()){
        await sav.export( path.join(CurrentGame.gameinprogress_dir, this.filename+'.sav') );
      }
      
      console.log('Current Module Exported', this.filename);

      await InventoryManager.Save();

      await PartyManager.ExportPartyMemberTemplates();

      await FactionManager.Export( path.join(CurrentGame.gameinprogress_dir, 'repute.fac') );

      resolve();

    });

  }

  includeInSave(){
    const modulesave2DA = TwoDAManager.datatables.get('modulesave');
    if(modulesave2DA){
      const moduleSave = modulesave2DA.getRowByColumnAndValue('modulename', this.filename);
      if(moduleSave){
        return parseInt(moduleSave.includeInSave) == 0 ? false : true;
      }
    }
    return true;
  }

  static async GetModuleMod(modName = ''){
    return new Promise<ERFObject>( (resolve, reject) => {
      let resource_path = path.join('modules', modName+'.mod');
      const mod = new ERFObject(resource_path);
      mod.load().then((mod: ERFObject) => {
        console.log('Module.GetModuleMod success', resource_path);
        resolve(mod);
      }, () => {
        console.error('Module.GetModuleMod failed', resource_path);
        resolve(undefined);
      });
    });
  }

  static async GetModuleRimA(modName = ''){
    return new Promise<RIMObject>( (resolve, reject) => {
      let resource_path = path.join('modules', modName+'.rim');
      const rim = new RIMObject(resource_path);
      rim.load().then( (rim: RIMObject) => {
        resolve(rim);
      }, () => {
        console.error('Module.GetModuleRimA failed', resource_path);
        resolve(undefined);
      });
    });
  }

  static async GetModuleRimB(modName = ''){
    return new Promise<RIMObject>( (resolve, reject) => {
      let resource_path = path.join('modules', modName+'_s.rim');
      const rim = new RIMObject(resource_path);
      rim.load().then((rim: RIMObject) => {
        resolve(rim);
      }, () => {
        console.error('Module.GetModuleRimB failed', resource_path);
        resolve(undefined);
      });
    });
  }

  static async GetModuleLipsLoc(){
    return new Promise<any>( (resolve, reject) => {
      let resource_path = path.join('lips', 'localization.mod');
      const mod = new ERFObject(resource_path);
      mod.load().then((mod: ERFObject) => {
        console.log('Module.GetModuleLipsLoc success', resource_path);
        resolve(mod);
      }, () => {
        console.error('Module.GetModuleLipsLoc failed', resource_path);
        resolve(undefined);
      });
    });
  }

  static async GetModuleLips(modName = ''){
    return new Promise<ERFObject>( (resolve, reject) => {
      let resource_path = path.join('lips', modName+'_loc.mod');
      const mod = new ERFObject(resource_path);
      mod.load().then((mod: ERFObject) => {
        resolve(mod);
      }, () => {
        console.error('Module.GetModuleLips failed', resource_path);
        resolve(undefined);
      });
    });
  }

  static async GetModuleDLG(modName = ''){
    return new Promise<ERFObject>( (resolve, reject) => {
      let resource_path = path.join('modules', modName+'_dlg.erf');
      const erf = new ERFObject(resource_path);
      erf.load().then((mod: ERFObject) => {
        resolve(mod);
      }, () => {
        console.error('Module.GetModuleDLG failed', resource_path);
        resolve(undefined);
      });
    });
  }

  static async GetModuleArchives(modName = ''): Promise<(RIMObject|ERFObject)[]> {
    return new Promise<(RIMObject|ERFObject)[]>( async (resolve, reject) => {
      let archives: any[] = [];
      let archive = undefined;

      let isModuleSaved = await CurrentGame.IsModuleSaved(modName);

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
      resolve(archives);
    });
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
  static BuildFromExisting(modName: string, waypoint?: any, onComplete?: Function){
    console.log('BuildFromExisting', modName);
    const module = new Module();
    module.filename = modName;
    module.transWP = waypoint;
    if(modName){
      try{
        ModuleObjectManager.Reset();
        Module.GetModuleArchives(modName).then( (archives) => {
          ResourceLoader.InitModuleCache(archives).then( () => {
            ResourceLoader.loadResource(ResourceTypes['ifo'], 'module').then((ifo_data: Buffer) => {
              new GFFObject(ifo_data, (ifo) => {
                module.setFromIFO(ifo, GameState.isLoadingSave);
                GameState.time = module.timeManager.pauseTime / 1000;

                ResourceLoader.loadResource(ResourceTypes['git'], module.Mod_Entry_Area).then((data: Buffer) => {
                  new GFFObject(data, (git) => {
                    ResourceLoader.loadResource(ResourceTypes['are'], module.Mod_Entry_Area).then((data: Buffer) => {
                      new GFFObject(data, (are) => {
                        module.area = new ModuleArea(module.Mod_Entry_Area, are, git);
                        module.areas = [module.area];
                        module.area.module = module;
                        module.area.setTransitionWaypoint(module.transWP);
                        module.area.load( () => {

                          if(module.Mod_NextObjId0)
                            ModuleObjectManager.COUNT = module.Mod_NextObjId0;

                          ModuleObjectManager.module = module;
                          if(typeof onComplete == 'function')
                            onComplete(module);
                        });                        
                      });
                    }).catch( (e) => {console.error(e)});
                  });
                }).catch( (e) => {console.error(e)});
              });
            }).catch( (e) => {console.error('LoadModule', e)});
          });
        });
      }catch(e){
        console.error('LoadModule', e);
      }
    }
    return module;
  }

  //This should only be used inside KotOR Forge
  static FromProject(directory?: string, onComplete?: Function){
    console.log('BuildFromExisting', directory);
    const module = new Module();
    module.transWP = null;
    if(directory != null){
      GameFileSystem.readFile(path.join(directory, 'module.ifo')).then( (ifo_data) => {
        new GFFObject(ifo_data, (ifo) => {
          //console.log('Module.FromProject', 'IFO', ifo);
          try{
            module.setFromIFO(ifo);
            GameState.time = module.timeManager.pauseTime / 1000;
            GameFileSystem.readFile(path.join(directory, module.Mod_Entry_Area+'.git')).then( (buffer) => {
              new GFFObject(buffer, (git) => {
                //console.log('Module.FromProject', 'GIT', git);
                GameFileSystem.readFile(path.join(directory, module.Mod_Entry_Area+'.are')).then( (buffer) => {
                  new GFFObject(buffer, (are) => {
                    //console.log('Module.FromProject', 'ARE', are);
                    module.area = new ModuleArea(module.Mod_Entry_Area, are, git);
                    module.area.module = module;
                    module.areas = [module.area];
                    module.area.setTransitionWaypoint(module.transWP);

                    ModuleObjectManager.module = module;
                    module.area.load( () => {
                      if(typeof onComplete == 'function')
                        onComplete(module);
                    });                        
                  });
                }).catch( (e) => {
                  console.error(e);
                });
              });
            }).catch( (e) => {
              console.error(e);
            });
          }catch(e){
            console.error(e);
          }
        });
      }).catch( (e) => {
        console.error(e);
      });
    }
    return module;
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

    ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Expansion_Pack', this.Expansion_Pack) );
    let areaList = ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_Area_list') );

    //KotOR only supports one Area per module
    if(this.area instanceof ModuleArea){
      let areaStruct = new GFFStruct(6);
      areaStruct.addField( new GFFField(GFFDataType.RESREF, 'Area_Name', this.area._name) );
      areaList.addChildStruct(areaStruct);
    }

    ifo.RootNode.addField( new GFFField(GFFDataType.INT, 'Mod_Creator_ID', this.Expansion_Pack) );
    ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_CutSceneList') );
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_DawnHour', this.timeManager.dawnHour) );
    ifo.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Description') ).setCExoLocString(this.Mod_Description);
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_DuskHour', this.timeManager.duskHour) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_Entry_Area', this.Mod_Entry_Area) );
    ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Dir_X', this.Mod_Entry_Dir_X) );
    ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Dir_Y', this.Mod_Entry_Dir_Y) );
    ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_X', this.Mod_Entry_X) );
    ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Y', this.Mod_Entry_Y) );
    ifo.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Z', this.Mod_Entry_Z) );

    ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_Expan_List') );
    ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_GVar_List') );

    ifo.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_Hak', this.Mod_Hak) );
    ifo.RootNode.addField( new GFFField(GFFDataType.VOID, 'Mod_ID') ).setData(this.Mod_ID || Buffer.alloc(16));
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_IsSaveGame', 0) );
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_MinPerHour', this.timeManager.minutesPerHour) );
    ifo.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Name') ).setCExoLocString(this.Mod_Name );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnAcquirItem', this.scripts.onAcquirItem) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnActvtItem', this.scripts.onActvItem) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnClientEntr', this.scripts.onClientEntr) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnClientLeav', this.scripts.onClientLeav) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnHeartbeat', this.scripts.onHeartbeat) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnModLoad', this.scripts.onModLoad) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnModStart', this.scripts.onModStart) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrDeath', this.scripts.onPlrDeath) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrDying', this.scripts.onPlrDying) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrLvlUp', this.scripts.onPlrLvlUp) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrRest', this.scripts.onPlrRest) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnSpawnBtnDn', this.scripts.onSpawnBtnDn) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnUnAqreItem', this.scripts.onUnAqreItem) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnUsrDefined', this.scripts.onUsrDefined) );
    ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Mod_StartDay', this.timeManager.day) );
    ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Mod_StartHour', this.timeManager.hour) );
    ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Mod_StartMonth', this.timeManager.month) );
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_StartMovie', this.Mod_StartMovie) );
    ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Mod_StartYear', this.timeManager.year) );
    ifo.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_Tag', this.Mod_Tag) );
    ifo.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_VO_ID', this.Mod_VO_ID) );
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_Version', this.Mod_Version) );
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_XPScale', this.Mod_XPScale) );

    return ifo;

  }

}
