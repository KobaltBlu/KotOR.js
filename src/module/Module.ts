/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { AudioEmitter } from "../audio/AudioEmitter";
import { GameEffect } from "../effects";
import EngineLocation from "../engine/EngineLocation";
import { GameState } from "../GameState";
import { PartyManager } from "../managers/PartyManager";
import { CExoLocString } from "../resource/CExoLocString";
import { GFFObject } from "../resource/GFFObject";
import { ModuleArea, ModuleTimeManager } from "./";
import * as THREE from "three";
import { CombatEngine } from "../combat";
import { MenuManager } from "../gui";
import { TLKManager } from "../managers/TLKManager";
import { ModuleObject, ModulePlayer } from ".";
import { AsyncLoop } from "../utility/AsyncLoop";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { NWScript } from "../nwscript/NWScript";
import { TwoDAManager } from "../managers/TwoDAManager";
import { GFFField } from "../resource/GFFField";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { ResourceTypes } from "../resource/ResourceTypes";
import { ERFObject } from "../resource/ERFObject";
import { CurrentGame } from "../CurrentGame";
import { InventoryManager } from "../managers/InventoryManager";
import * as path from "path";
import * as fs from "fs";
import { TextureLoader } from "../loaders/TextureLoader";
import { RIMObject } from "../resource/RIMObject";
import { ApplicationProfile } from "../utility/ApplicationProfile";
import { ResourceLoader } from "../resource/ResourceLoader";
import { GFFStruct } from "../resource/GFFStruct";
import { GameEvent } from "../events";
import { FactionManager } from "../FactionManager";
import { GameFileSystem } from "../utility/GameFileSystem";

/* @file
 * The Module class.
 */

export class Module {
  area: ModuleArea;
  timeManager: ModuleTimeManager;
  scripts: any = {};
  archives: any[] = [];
  effects: any[] = [];
  eventQueue: any[] = [];
  customTokens: Map<any, any>;
  Expansion_Pack: any;
  Mod_Area_list: any[] = [];
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
  ifo: any;
  Area_Name: any;
  Mod_StartMovie: any;
  readyToProcessEvents: any;
  transWP: any;
  filename: string;
  static path: any;

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
      
      let Mod_Area_list = ifo.GetFieldByLabel('Mod_Area_list');
      let Mod_Area_listLen = Mod_Area_list.GetChildStructs().length;
      let Mod_Area = Mod_Area_list.ChildStructs[0];

      this.Area_Name = ifo.GetFieldByLabel('Area_Name', Mod_Area.GetFields()).GetValue();

      this.Mod_Area_list = [];
      //KOTOR modules should only ever have one area. But just incase lets loop through the list
      for(let i = 0; i < Mod_Area_listLen; i++){
        let Mod_Area = Mod_Area_list.ChildStructs[0];
        let area: any = {};

        if(Mod_Area.HasField('Area_Name'))
          area.Area_Name = Mod_Area.GetFieldByLabel('Area_Name').GetValue()

        if(Mod_Area.HasField('ObjectId'))
          area.ObjectId = Mod_Area.GetFieldByLabel('ObjectId').GetValue()

        this.Mod_Area_list.push(area);
      }

      //LISTS
      if(ifo.RootNode.HasField('Expansion_Pack')){
        this.Expansion_Pack = ifo.GetFieldByLabel('Expansion_Pack').GetValue();
      }else{
        this.Expansion_Pack = 0;
      }

      this.Mod_CutSceneList = [];
      this.Mod_Expan_List = [];
      this.Mod_GVar_List = [];

      this.Mod_Creator_ID = ifo.GetFieldByLabel('Mod_Creator_ID').GetValue();
      this.Mod_Description = ifo.GetFieldByLabel('Mod_Description').GetCExoLocString();

      this.Mod_Entry_Area = ifo.GetFieldByLabel('Mod_Entry_Area').GetValue();
      this.Mod_Entry_Dir_X = ifo.GetFieldByLabel('Mod_Entry_Dir_X').GetValue();
      this.Mod_Entry_Dir_Y = ifo.GetFieldByLabel('Mod_Entry_Dir_Y').GetValue();
      this.Mod_Entry_X = ifo.GetFieldByLabel('Mod_Entry_X').GetValue();
      this.Mod_Entry_Y = ifo.GetFieldByLabel('Mod_Entry_Y').GetValue();
      this.Mod_Entry_Z = ifo.GetFieldByLabel('Mod_Entry_Z').GetValue();

      this.Mod_Hak = ifo.GetFieldByLabel('Mod_Hak').GetValue();
      this.Mod_ID = ifo.GetFieldByLabel('Mod_ID').GetVoid(); //Generated by the toolset (Not sure if it is used in game)
      this.Mod_Name = ifo.GetFieldByLabel('Mod_Name').GetCExoLocString();

      //Mod_Tokens
      if(ifo.RootNode.HasField('Mod_Tokens') && isLoadingSave){
        let tokenList = ifo.GetFieldByLabel('Mod_Tokens').GetChildStructs();
        for(let i = 0, len = tokenList.length; i < len; i++){
          this.setCustomToken(
            tokenList[i].GetFieldByLabel('Mod_TokensNumber').GetValue(),
            tokenList[i].GetFieldByLabel('Mod_TokensValue').GetValue()
          );
        }
      }

      if(ifo.RootNode.HasField('Mod_PlayerList') && isLoadingSave){
        let playerList = ifo.GetFieldByLabel('Mod_PlayerList').GetChildStructs();
        if(playerList.length){
          PartyManager.Player = GFFObject.FromStruct(playerList[0]);
        }
      }

      //Scripts
      this.scripts.onAcquirItem = ifo.GetFieldByLabel('Mod_OnAcquirItem').GetValue();
      this.scripts.onActvItem = ifo.GetFieldByLabel('Mod_OnActvtItem').GetValue();
      this.scripts.onClientEntr = ifo.GetFieldByLabel('Mod_OnClientEntr').GetValue();
      this.scripts.onClientLeav = ifo.GetFieldByLabel('Mod_OnClientLeav').GetValue();
      this.scripts.onHeartbeat = ifo.GetFieldByLabel('Mod_OnHeartbeat').GetValue();
      this.scripts.onModLoad = ifo.GetFieldByLabel('Mod_OnModLoad').GetValue();
      this.scripts.onModStart = ifo.GetFieldByLabel('Mod_OnModStart').GetValue();
      this.scripts.onPlrDeath = ifo.GetFieldByLabel('Mod_OnPlrDeath').GetValue();
      this.scripts.onPlrDying = ifo.GetFieldByLabel('Mod_OnPlrDying').GetValue();
      this.scripts.onPlrLvlUp = ifo.GetFieldByLabel('Mod_OnPlrLvlUp').GetValue();
      this.scripts.onPlrRest = ifo.GetFieldByLabel('Mod_OnPlrRest').GetValue();
      this.scripts.onSpawnBtnDn = ifo.GetFieldByLabel('Mod_OnSpawnBtnDn').GetValue();
      this.scripts.onUnAqreItem = ifo.GetFieldByLabel('Mod_OnUnAqreItem').GetValue();
      this.scripts.onUsrDefined = ifo.GetFieldByLabel('Mod_OnUsrDefined').GetValue();

      if(ifo.RootNode.HasField('Mod_StartMovie')){
        this.Mod_StartMovie = ifo.GetFieldByLabel('Mod_StartMovie').GetValue();
      }else{
        this.Mod_StartMovie = '';
      }

      this.Mod_Tag = ifo.GetFieldByLabel('Mod_Tag').GetValue();

      if(ifo.RootNode.HasField('Mod_VO_ID')){
        this.Mod_VO_ID = ifo.GetFieldByLabel('Mod_VO_ID').GetValue();
      }

      this.Mod_Version = ifo.GetFieldByLabel('Mod_Version').GetValue();
      this.Mod_XPScale = ifo.GetFieldByLabel('Mod_XPScale').GetValue();

      if(ifo.RootNode.HasField('Mod_NextCharId0'))
        this.Mod_NextCharId0 = ifo.GetFieldByLabel('Mod_NextCharId0').GetValue();

      if(ifo.RootNode.HasField('Mod_NextCharId1'))
        this.Mod_NextCharId1 = ifo.GetFieldByLabel('Mod_NextCharId1').GetValue();

      if(ifo.RootNode.HasField('Mod_NextObjId0'))
        this.Mod_NextObjId0 = ifo.GetFieldByLabel('Mod_NextObjId0').GetValue();

      if(ifo.RootNode.HasField('Mod_NextObjId1'))
        this.Mod_NextObjId1 = ifo.GetFieldByLabel('Mod_NextObjId1').GetValue();

    }
  }

  addEffect(effect?: GameEffect, lLocation?: EngineLocation){
    if(effect instanceof GameEffect){
      let object: any = {
        model: new THREE.Object3D(),
        position: lLocation.position,
        dispose: function(){
          this.onRemove();
          this.removeEffect(this);
        },
        removeEffect: function(effect: GameEffect){
          let index = GameState.module.effects.indexOf(effect);
          if(index >= 0){
            GameState.module.effects.splice(index, 1);
          }
        }
      };

      object.audioEmitter = new AudioEmitter({
        engine: GameState.audioEngine,
        props: object,
        template: {
          sounds: [],
          isActive: true,
          isLooping: false,
          isRandom: false,
          isRandomPosition: false,
          interval: 0,
          intervalVariation: 0,
          maxDistance: 50,
          volume: 127,
          positional: 1
        },
        onLoad: () => {
        },
        onError: () => {
        }
      });
      GameState.audioEngine.AddEmitter(object.audioEmitter);
      object.audioEmitter.SetPosition(lLocation.position.x, lLocation.position.y, lLocation.position.z);

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
      
      ModuleObject.ResetPlayerId();

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

      for(let i = 0, len = this.area.cameras.length; i < len; i++){
        let cam = this.area.cameras[i];
        cam.InitProperties();
        let camera = new THREE.PerspectiveCamera(cam.fov, window.innerWidth / window.innerHeight, 0.1, 1500);
        camera.up = new THREE.Vector3( 0, 1, 0 );
        camera.position.set(cam.position.x, cam.position.y, cam.position.z + cam.height);
        camera.rotation.reorder('YZX');
        let quat = new THREE.Quaternion().copy(cam.orientation);
        camera.rotation.x = THREE.MathUtils.degToRad(cam.pitch);
        camera.rotation.z = -Math.atan2(cam.orientation.w, -cam.orientation.x)*2;

        //Clipping hack
        camera.position.add(new THREE.Vector3(0, 0, 0.5).applyEuler(camera.rotation));

        camera.userData.ingameID = cam.cameraID;
        GameState.staticCameras.push(camera);

        camera.userData._cam = cam;
      }

      MenuManager.LoadScreen.setProgress(0);

      try{
        MenuManager.InGameOverlay.SetMapTexture('lbl_map'+this.Mod_Entry_Area);
        MenuManager.MenuMap.SetMapTexture('lbl_map'+this.Mod_Entry_Area);
      }catch(e){
        console.error(e);
      }

      this.area.loadScene( () => {
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
        if(_script != '' && !(_script instanceof NWScriptInstance)){
          //let script = await NWScript.Load(_script);
          this.scripts[key] = await NWScript.Load(_script);
          if(this.scripts[key] instanceof NWScriptInstance){
            //this.scripts[key].name = _script;
            this.scripts[key].enteringObject = GameState.player;
            this.scripts[key].run(GameState.module.area, 0, () => {
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
      if(typeof onComplete === 'function')
        onComplete();
    });
    
  }

  getCameraStyle(){
    const cameraStyle2DA = TwoDAManager.datatables.get('camerastyle');
    if(cameraStyle2DA){
      return cameraStyle2DA.rows[this.area.CameraStyle];
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
    if(this.ifo.RootNode.HasField('EventQueue')){
      let eventQueue = this.ifo.GetFieldByLabel('EventQueue').GetChildStructs();
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
    if(GameState.module){
      while(GameState.module.effects.length){
        GameState.module.effects[0].dispose();
        GameState.module.effects.shift();
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
      GameState.octree_walkmesh.remove(wlkmesh);
    }

    GameState.octree_walkmesh.rebuild();

    if(GameState.module instanceof Module){

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

    GameState.module = undefined;

  }

  save( isSaveGame = false ){

    return new Promise<void>( async (resolve, reject ) => {

      PartyManager.Save();

      let ifo = new GFFObject();
      ifo.FileType = 'IFO ';

      ifo.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Creature List') );
      let eventQueue = ifo.RootNode.AddField( new GFFField(GFFDataType.LIST, 'EventQueue') );
      for(let i = 0; i < this.eventQueue.length; i++){
        
        let event = this.eventQueue[i];
        if(event instanceof GameEvent){
          eventQueue.AddChildStruct( event.export() );
        }

      }

      let areaList = ifo.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Mod_Area_list') );
      for(let i = 0; i < this.Mod_Area_list.length; i++){
        areaList.AddChildStruct( this.Mod_Area_list[i].saveAreaListStruct() );
        this.Mod_Area_list[i].save();
      }

      ifo.RootNode.AddField( new GFFField(GFFDataType.INT, 'Mod_Creator_ID') ).SetValue(this.Mod_Creator_ID);
      ifo.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Mod_CutSceneList') );
      ifo.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Mod_DawnHour') ).SetValue(this.timeManager.dawnHour);
      ifo.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Description') ).SetValue( this.Mod_Description );
      ifo.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Mod_DuskHour') ).SetValue(this.timeManager.duskHour);
      ifo.RootNode.AddField( new GFFField(GFFDataType.DWORD64, 'Mod_Effect_NxtId') ).SetValue(this.Mod_Effect_NxtId);
      ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_Entry_Area') ).SetValue(this.Mod_Entry_Area);
      ifo.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Dir_X') ).SetValue(this.Mod_Entry_Dir_X);
      ifo.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Dir_Y') ).SetValue(this.Mod_Entry_Dir_Y);
      ifo.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_X') ).SetValue(this.Mod_Entry_X);
      ifo.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Y') ).SetValue(this.Mod_Entry_Y);
      ifo.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Z') ).SetValue(this.Mod_Entry_Z);
      ifo.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Mod_Expan_List') );
      ifo.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_Hak') ).SetValue(this.Mod_Hak);
      ifo.RootNode.AddField( new GFFField(GFFDataType.VOID, 'Mod_ID') );
      ifo.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Mod_IsNWMFile') ).SetValue(0);
      ifo.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Mod_IsSaveGame') ).SetValue( isSaveGame ? 1 : 0);
      ifo.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Mod_MinPerHour') ).SetValue(this.timeManager.minutesPerHour);
      ifo.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Name') ).SetValue( this.Mod_Name );
      ifo.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Mod_NextCharId0') ).SetValue(this.Mod_NextCharId0);
      ifo.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Mod_NextCharId1') ).SetValue(this.Mod_NextCharId1);
      ifo.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Mod_NextObjId0') ).SetValue(this.Mod_NextObjId0);
      ifo.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Mod_NextObjId1') ).SetValue(this.Mod_NextObjId1);
      ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnAcquirItem') ).SetValue(this.scripts.onAcquirItem ? this.scripts.onAcquirItem.name : '');
      ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnActvtItem') ).SetValue(this.scripts.onActvItem ? this.scripts.onActvItem.name : '');;
      ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnClientEntr') ).SetValue(this.scripts.onClientEntr ? this.scripts.onClientEntr.name : '');;
      ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnClientLeav') ).SetValue(this.scripts.onClientLeav ? this.scripts.onClientLeav.name : '');;
      ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnHeartbeat') ).SetValue(this.scripts.onHeartbeat ? this.scripts.onHeartbeat.name : '');;
      ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnModLoad') ).SetValue(this.scripts.onModLoad ? this.scripts.onModLoad.name : '');;
      ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnModStart') ).SetValue(this.scripts.onModStart ? this.scripts.onModStart.name : '');;
      ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrDeath') ).SetValue(this.scripts.onPlrDeath ? this.scripts.onPlrDeath.name : '');;
      ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrDying') ).SetValue(this.scripts.onPlrDying ? this.scripts.onPlrDying.name : '');;
      ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrLvlUp') ).SetValue(this.scripts.onPlrLvlUp ? this.scripts.onPlrLvlUp.name : '');;
      ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrRest') ).SetValue(this.scripts.onPlrRest ? this.scripts.onPlrRest.name : '');;
      ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnSpawnBtnDn') ).SetValue(this.scripts.onSpawnBtnDn ? this.scripts.onSpawnBtnDn.name : '');;
      ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnUnAqreItem') ).SetValue(this.scripts.onUnAqreItem ? this.scripts.onUnAqreItem.name : '');;
      ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnUsrDefined') ).SetValue(this.scripts.onUsrDefined ? this.scripts.onUsrDefined.name : '');;
      ifo.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Mod_PauseDay') ).SetValue(this.timeManager.pauseDay);
      ifo.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Mod_PauseTime') ).SetValue(this.timeManager.pauseTime);

      //Player
      let playerList = ifo.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Mod_PlayerList') );
      if(GameState.player instanceof ModulePlayer){
        playerList.AddChildStruct( GameState.player.save().RootNode );
      }

      ifo.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Mod_StartDay') ).SetValue(this.timeManager.day);
      ifo.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Mod_StartHour') ).SetValue(this.timeManager.hour);
      ifo.RootNode.AddField( new GFFField(GFFDataType.WORD, 'Mod_StartMiliSec') ).SetValue(this.timeManager.milisecond);
      ifo.RootNode.AddField( new GFFField(GFFDataType.WORD, 'Mod_StartMinute') ).SetValue(this.timeManager.minute);
      ifo.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Mod_StartMonth') ).SetValue(this.timeManager.month);
      ifo.RootNode.AddField( new GFFField(GFFDataType.WORD, 'Mod_StartSecond') ).SetValue(this.timeManager.second);
      ifo.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Mod_StartYear') ).SetValue(this.timeManager.year);
      ifo.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_Tag') ).SetValue(this.Mod_Tag);
      ifo.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Mod_Tokens') );
      ifo.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Mod_Transition') ).SetValue(this.Mod_Transition);
      ifo.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Mod_Version') ).SetValue(this.Mod_Version);
      ifo.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Mod_XPScale') .SetValue(this.Mod_XPScale));
      ifo.RootNode.AddField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
      ifo.RootNode.AddField( new GFFField(GFFDataType.LIST, 'VarTable') );
      
      this.ifo = ifo;

      let sav = new ERFObject();

      sav.addResource('module', ResourceTypes['ifo'], this.ifo.GetExportBuffer());
      for(let i = 0; i < this.Mod_Area_list.length; i++){
        let area = this.Mod_Area_list[i];
        sav.addResource(area._name, ResourceTypes['are'], area.are.GetExportBuffer());
        sav.addResource(area._name, ResourceTypes['git'], area.git.GetExportBuffer());
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
  Mod_Effect_NxtId(Mod_Effect_NxtId: any) {
    throw new Error("Method not implemented.");
  }
  Mod_Transition(Mod_Transition: any) {
    throw new Error("Method not implemented.");
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
      new ERFObject(resource_path, (mod: ERFObject) => {
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
      new RIMObject(resource_path, (rim: RIMObject) => {
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
      new RIMObject(resource_path, (rim: RIMObject) => {
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
      new ERFObject(resource_path, (mod: ERFObject) => {
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
      new ERFObject(resource_path, (mod: ERFObject) => {
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
      new ERFObject(resource_path, (mod: ERFObject) => {
        resolve(mod);
      }, () => {
        console.error('Module.GetModuleDLG failed', resource_path);
        resolve(undefined);
      });
    });
  }

  static async GetModuleArchives(modName = ''){
    return new Promise<any[]>( async (resolve, reject) => {
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

  static async GetModuleProjectArchives(modName = ''){
    return new Promise<any[]>( async (resolve, reject) => {
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
    let module = new Module();
    module.filename = modName;
    module.transWP = waypoint;
    GameState.module = module;
    if(modName){
      try{
        Module.GetModuleArchives(modName).then( (archives) => {
          // console.log('archives', archives);
          GameState.module.archives = archives;

          ResourceLoader.loadResource(ResourceTypes['ifo'], 'module', (ifo_data: Buffer) => {
            
            new GFFObject(ifo_data, (ifo) => {

              GameState.module.setFromIFO(ifo, GameState.isLoadingSave);
              GameState.time = GameState.module.timeManager.pauseTime / 1000;

              ResourceLoader.loadResource(ResourceTypes['git'], module.Mod_Entry_Area, (data: Buffer) => {
                new GFFObject(data, (git) => {
                  ResourceLoader.loadResource(ResourceTypes['are'], module.Mod_Entry_Area, (data: Buffer) => {
                    new GFFObject(data, (are) => {
                      module.area = new ModuleArea(module.Mod_Entry_Area, are, git);
                      module.Mod_Area_list = [module.area];
                      module.area.module = module;
                      module.area.SetTransitionWaypoint(module.transWP);
                      module.area.Load( () => {

                        if(module.Mod_NextObjId0)
                          ModuleObject.COUNT = module.Mod_NextObjId0;

                        if(typeof onComplete == 'function')
                          onComplete(module);
                      });                        
                    });
                  });
                });
              });
            });
          }, (err: any) => {
            console.error('LoadModule', err);
            GameState.module = undefined;
          });
        });
      }catch(e){
        console.error('LoadModule', e);
        GameState.module = undefined;
      }
    }
    return module;
  }

  //This should only be used inside KotOR Forge
  static FromProject(directory?: string, onComplete?: Function){
    console.log('BuildFromExisting', directory);
    let module = new Module();
    module.transWP = null;
    GameState.module = module;
    if(directory != null){

      GameFileSystem.readFile(path.join(directory, 'module.ifo')).then( (ifo_data) => {
        new GFFObject(ifo_data, (ifo) => {
          //console.log('Module.FromProject', 'IFO', ifo);
          try{
            GameState.module.setFromIFO(ifo);
            GameState.time = GameState.module.timeManager.pauseTime / 1000;
            GameFileSystem.readFile(path.join(directory, module.Mod_Entry_Area+'.git')).then( (buffer) => {
              new GFFObject(buffer, (git) => {
                //console.log('Module.FromProject', 'GIT', git);
                GameFileSystem.readFile(path.join(directory, module.Mod_Entry_Area+'.are')).then( (buffer) => {
                  new GFFObject(buffer, (are) => {
                    //console.log('Module.FromProject', 'ARE', are);
                    module.area = new ModuleArea(module.Mod_Entry_Area, are, git);
                    module.area.module = module;
                    module.Mod_Area_list = [module.area];
                    module.area.SetTransitionWaypoint(module.transWP);
                    module.area.Load( () => {
                      if(typeof onComplete == 'function')
                        onComplete(module);
                    });                        
                  });
                }).catch( () => {
          
                });
              });
            }).catch( () => {
      
            });
          }catch(e){
            console.error(e);
          }
        });
      }).catch( () => {

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

    ifo.RootNode.AddField( new GFFField(GFFDataType.WORD, 'Expansion_Pack', this.Expansion_Pack) );
    let areaList = ifo.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Mod_Area_list') );

    //KotOR only supports one Area per module
    if(this.area instanceof ModuleArea){
      let areaStruct = new GFFStruct(6);
      areaStruct.AddField( new GFFField(GFFDataType.RESREF, 'Area_Name', this.area._name) );
      areaList.AddChildStruct(areaStruct);
    }

    ifo.RootNode.AddField( new GFFField(GFFDataType.INT, 'Mod_Creator_ID', this.Expansion_Pack) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Mod_CutSceneList') );
    ifo.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Mod_DawnHour', this.timeManager.dawnHour) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Description') ).SetCExoLocString(this.Mod_Description);
    ifo.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Mod_DuskHour', this.timeManager.duskHour) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_Entry_Area', this.Mod_Entry_Area) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Dir_X', this.Mod_Entry_Dir_X) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Dir_Y', this.Mod_Entry_Dir_Y) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_X', this.Mod_Entry_X) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Y', this.Mod_Entry_Y) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Z', this.Mod_Entry_Z) );

    ifo.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Mod_Expan_List') );
    ifo.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Mod_GVar_List') );

    ifo.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_Hak', this.Mod_Hak) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.VOID, 'Mod_ID') ).SetData(this.Mod_ID || Buffer.alloc(16));
    ifo.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Mod_IsSaveGame', 0) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Mod_MinPerHour', this.timeManager.minutesPerHour) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Name') ).SetCExoLocString(this.Mod_Name );
    ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnAcquirItem', this.scripts.onAcquirItem) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnActvtItem', this.scripts.onActvItem) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnClientEntr', this.scripts.onClientEntr) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnClientLeav', this.scripts.onClientLeav) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnHeartbeat', this.scripts.onHeartbeat) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnModLoad', this.scripts.onModLoad) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnModStart', this.scripts.onModStart) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrDeath', this.scripts.onPlrDeath) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrDying', this.scripts.onPlrDying) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrLvlUp', this.scripts.onPlrLvlUp) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrRest', this.scripts.onPlrRest) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnSpawnBtnDn', this.scripts.onSpawnBtnDn) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnUnAqreItem', this.scripts.onUnAqreItem) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_OnUsrDefined', this.scripts.onUsrDefined) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.WORD, 'Mod_StartDay', this.timeManager.day) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.WORD, 'Mod_StartHour', this.timeManager.hour) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.WORD, 'Mod_StartMonth', this.timeManager.month) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Mod_StartMovie', this.Mod_StartMovie) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.WORD, 'Mod_StartYear', this.timeManager.year) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_Tag', this.Mod_Tag) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_VO_ID', this.Mod_VO_ID) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Mod_Version', this.Mod_Version) );
    ifo.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Mod_XPScale', this.Mod_XPScale) );

    return ifo;

  }

}
