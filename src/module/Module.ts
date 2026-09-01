import * as THREE from "three";
import * as path from "path";
import { AudioEmitter } from "@/audio/AudioEmitter";
import { GameEffect } from "@/effects";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import EngineLocation from "@/engine/EngineLocation";
import { GameState } from "@/GameState";
import { CExoLocString } from "@/resource/CExoLocString";
import { GFFObject } from "@/resource/GFFObject";
// import { NWScript } from "@/nwscript/NWScript";
import { GFFField } from "@/resource/GFFField";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { ERFObject } from "@/resource/ERFObject";
import { CurrentGame } from "@/engine/CurrentGame";
import { SaveLoadAudit } from "@/engine/SaveLoadAudit";
import { RIMObject } from "@/resource/RIMObject";
import { GFFStruct } from "@/resource/GFFStruct";
import { GameEventFactory } from "@/events/GameEventFactory";
import { ResourceLoader, TextureLoader } from "@/loaders";
import { AudioEngine } from "@/audio/AudioEngine";
import { AudioEmitterType } from "@/enums/audio/AudioEmitterType";
import { AudioPriorityGroup } from "@/enums/audio/AudioPriorityGroup";
import { IModuleScripts } from "@/interface/module/IModuleScripts";
import { IAreaListItem } from "@/interface/area/IAreaListItem";
import type { GameEvent } from "@/events/GameEvent";
import { ModuleArea } from "@/module/ModuleArea";
import { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import { ModuleTimeManager } from "@/module/ModuleTimeManager";
import { ModuleObjectScript } from "@/enums/module/ModuleObjectScript";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { ScriptVarTable } from "@/engine/ScriptVarTable";
import { ModuleSaveTable } from "@/engine/ModuleSaveTable";

export interface ModuleExpansionEntry {
  name: CExoLocString;
  id: number;
}

export interface ModuleCutSceneEntry {
  name: string;
  id: number;
}

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
  
  scripts: { [key: string]: NWScriptInstance };
  scriptResRefs: Map<ModuleScriptKeys, string> = new Map<ModuleScriptKeys, string>();

  timeManager: ModuleTimeManager;

  archives: (RIMObject|ERFObject)[] = [];
  effects: GameEffect[] = [];
  eventQueue: GameEvent[] = [];
  customTokens: Map<number, string>;
  transition: any;
  transWP: string;
  lastItemAcquired: any = undefined;
  /** Pass AG — OnItemActivated context for GetItemActivated* */
  itemActivated: ModuleItem = undefined;
  itemActivator: ModuleCreature = undefined;
  itemActivatedTarget: any = undefined;
  itemActivatedTargetLocation: EngineLocation = undefined;
  /** Pass AL — ModuleAccess last-player slots (retail 0x16c / 0x170 / 0x174) */
  lastPlayerDied: ModuleCreature = undefined;
  lastPlayerDying: ModuleCreature = undefined;
  lastRespawnButtonPresser: ModuleCreature = undefined;

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
  expansionList: ModuleExpansionEntry[] = [];

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
  cutSceneList: ModuleCutSceneEntry[] = [];

  /**
   * Retail limbo creature list (IFO "Creature List", struct type 4).
   */
  limboCreatures: ModuleCreature[] = [];

  /** Module-level SW locals (IFO SWVarTable) */
  _locals: { Booleans: boolean[]; Numbers: Record<number, number> } = { Booleans: [], Numbers: {} };
  scriptVarTable: ScriptVarTable = new ScriptVarTable();

  /**
   * always set to 2
   * @deprecated Deprecated: since NWN
   */
  creatorId: number = 2;

  filename: string;
  readyToProcessEvents: boolean = false;
  isSaveGame: boolean = false;
  /**
   * Retail DoUpdate flip-flop — alternates module vs area AIUpdate each frame.
   * 1 = next doUpdate runs module.aiUpdate; 0 = area.aiUpdate.
   */
  _doUpdateFlip: number = 1;
  /** Elapsed ms since last module heartbeat (retail 5999ms threshold). */
  _moduleHeartbeatElapsedMs: number = 0;
  _moduleHeartbeatInitialized: boolean = false;

  constructor(){
    this.scripts = {} as { [key in ModuleObjectScript]?: NWScriptInstance };
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
    this.effectNextId = 1;

    this.tag;
    this.voId = '';
    this.version;
    this.xpScale;
  }

  setFromIFO( ifo: GFFObject, isLoadingSave = false ){
    if(!(ifo instanceof GFFObject)){ return; }
    this.ifo = ifo;

    //Setup Module Calendar
    this.timeManager.setFromIFO(ifo, isLoadingSave);
    
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
      SaveLoadAudit.logLoadStage('Mod_Tokens', { tokens: this.customTokens.size });
    }

    if(ifo.RootNode.hasField('Mod_PlayerList') && isLoadingSave){
      const playerList = ifo.getFieldByLabel('Mod_PlayerList').getChildStructs();
      if(playerList.length){
        GameState.PartyManager.PlayerTemplate = GFFObject.FromStruct(playerList[0]);
        GameState.PartyManager.ActualPlayerTemplate = GameState.SaveGame.pc || GameState.PartyManager.PlayerTemplate;
        // if(GameState.PartyManager.PlayerTemplate.getFieldByLabel('IsPC').getValue()){
        // GameState.PartyManager.ActualPlayerTemplate = GameState.PartyManager.PlayerTemplate;
        // }else{
        // GameState.PartyManager.ActualPlayerTemplate = GameState.SaveGame.pc;
        // }
      }
    }

    //Scripts
    this.scriptResRefs.set(ModuleObjectScript.ModuleOnPlayerAcquireItem,  ifo.getFieldByLabel(ModuleObjectScript.ModuleOnPlayerAcquireItem).getValue());
    this.scriptResRefs.set(ModuleObjectScript.ModuleOnPlayerActivateItem,   ifo.getFieldByLabel(ModuleObjectScript.ModuleOnPlayerActivateItem).getValue());
    this.scriptResRefs.set(ModuleObjectScript.ModuleOnPlayerClientEnter,  ifo.getFieldByLabel(ModuleObjectScript.ModuleOnPlayerClientEnter).getValue());
    this.scriptResRefs.set(ModuleObjectScript.ModuleOnPlayerClientLeave,  ifo.getFieldByLabel(ModuleObjectScript.ModuleOnPlayerClientLeave).getValue());
    this.scriptResRefs.set(ModuleObjectScript.ModuleOnHeartbeat,   ifo.getFieldByLabel(ModuleObjectScript.ModuleOnHeartbeat).getValue());
    this.scriptResRefs.set(ModuleObjectScript.ModuleOnLoad,     ifo.getFieldByLabel(ModuleObjectScript.ModuleOnLoad).getValue());
    this.scriptResRefs.set(ModuleObjectScript.ModuleOnStart,    ifo.getFieldByLabel(ModuleObjectScript.ModuleOnStart).getValue());
    this.scriptResRefs.set(ModuleObjectScript.ModuleOnPlayerDeath,    ifo.getFieldByLabel(ModuleObjectScript.ModuleOnPlayerDeath).getValue());
    this.scriptResRefs.set(ModuleObjectScript.ModuleOnPlayerDying,    ifo.getFieldByLabel(ModuleObjectScript.ModuleOnPlayerDying).getValue());
    this.scriptResRefs.set(ModuleObjectScript.ModuleOnPlayerLevelUp,    ifo.getFieldByLabel(ModuleObjectScript.ModuleOnPlayerLevelUp).getValue());
    this.scriptResRefs.set(ModuleObjectScript.ModuleOnPlayerRest,     ifo.getFieldByLabel(ModuleObjectScript.ModuleOnPlayerRest).getValue());
    this.scriptResRefs.set(ModuleObjectScript.ModuleOnSpawnButtonDown,  ifo.getFieldByLabel(ModuleObjectScript.ModuleOnSpawnButtonDown).getValue());
    this.scriptResRefs.set(ModuleObjectScript.ModuleOnUnAcquireItem,  ifo.getFieldByLabel(ModuleObjectScript.ModuleOnUnAcquireItem).getValue());
    this.scriptResRefs.set(ModuleObjectScript.ModuleOnUserDefined,  ifo.getFieldByLabel(ModuleObjectScript.ModuleOnUserDefined).getValue());

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

    if(ifo.RootNode.hasField('Mod_Effect_NxtId')){
      const nxt = ifo.getFieldByLabel('Mod_Effect_NxtId').getValue();
      this.effectNextId = typeof nxt === 'bigint' ? Number(nxt) : (nxt || 1);
    }else{
      this.effectNextId = 1;
    }

    // Limbo creatures (retail LoadLimboCreatures)
    this.limboCreatures = [];
    if(isLoadingSave && ifo.RootNode.hasField('Creature List')){
      const limboList = ifo.getFieldByLabel('Creature List').getChildStructs();
      for(let i = 0; i < limboList.length; i++){
        const strt = limboList[i];
        if(strt.type !== 4 && strt.type !== undefined){
          // Retail only loads element type 4; accept missing type from older writers
        }
        try{
          const creature = new ModuleCreature(GFFObject.FromStruct(strt));
          creature.load();
          this.limboCreatures.push(creature);
        }catch(e){
          console.warn('Module.setFromIFO limbo creature', e);
        }
      }
      SaveLoadAudit.logLoadStage('limbo', { creatures: this.limboCreatures.length });
    }

    // Mod_CutSceneList / Mod_Expan_List
    this.cutSceneList = [];
    if(ifo.RootNode.hasField('Mod_CutSceneList')){
      const list = ifo.getFieldByLabel('Mod_CutSceneList').getChildStructs();
      for(let i = 0; i < list.length; i++){
        const s = list[i];
        this.cutSceneList.push({
          name: s.hasField('CutScene_Name') ? s.getFieldByLabel('CutScene_Name').getValue() : '',
          id: s.hasField('CutScene_ID') ? (s.getFieldByLabel('CutScene_ID').getValue() | 0) : 0,
        });
      }
    }
    this.expansionList = [];
    if(ifo.RootNode.hasField('Mod_Expan_List')){
      const list = ifo.getFieldByLabel('Mod_Expan_List').getChildStructs();
      for(let i = 0; i < list.length; i++){
        const s = list[i];
        this.expansionList.push({
          name: s.hasField('Expansion_Name') ? s.getFieldByLabel('Expansion_Name').getCExoLocString() : new CExoLocString(),
          id: s.hasField('Expansion_ID') ? (s.getFieldByLabel('Expansion_ID').getValue() | 0) : 0,
        });
      }
    }

    // Module SWVarTable / named VarTable
    this._locals = { Booleans: [], Numbers: {} };
    this.scriptVarTable = new ScriptVarTable();
    if(ifo.RootNode.hasField('SWVarTable')){
      const swStructs = ifo.getFieldByLabel('SWVarTable').getChildStructs();
      const swVarTableStruct = swStructs[0];
      if(swVarTableStruct?.hasField('BitArray')){
        const localBools = swVarTableStruct.getFieldByLabel('BitArray').getChildStructs();
        for(let i = 0; i < localBools.length; i++){
          const data = localBools[i].getFieldByLabel('Variable').getValue();
          for(let bit = 0; bit < 32; bit++){
            this._locals.Booleans[bit + (i * 32)] = ((data >> bit) % 2 != 0);
          }
        }
      }
      if(swVarTableStruct?.hasField('ByteArray')){
        const localNumbers = swVarTableStruct.getFieldByLabel('ByteArray').getChildStructs();
        for(let i = 0; i < localNumbers.length; i++){
          this._locals.Numbers[i] = localNumbers[i].getFieldByLabel('Variable').getValue();
        }
      }
    }
    if(ifo.RootNode.hasField('VarTable')){
      this.scriptVarTable.loadFromListField(ifo.getFieldByLabel('VarTable'));
    }
  }

  addObjectToLimbo(creature: ModuleCreature){
    if(!creature) return;
    if(this.limboCreatures.indexOf(creature) < 0){
      this.limboCreatures.push(creature);
    }
  }

  removeObjectFromLimbo(creature: ModuleCreature){
    const idx = this.limboCreatures.indexOf(creature);
    if(idx >= 0) this.limboCreatures.splice(idx, 1);
  }

  isObjectInLimbo(creature: ModuleCreature){
    return this.limboCreatures.indexOf(creature) >= 0;
  }

  getModuleSWVarTableSaveStruct(){
    const swVarTableStruct = new GFFStruct();
    const swVarTableBitArray = swVarTableStruct.addField(new GFFField(GFFDataType.LIST, 'BitArray'));
    for(let i = 0; i < 3; i++){
      const varStruct = new GFFStruct();
      let value = 0;
      const offset = 32 * i;
      for(let j = 0; j < 32; j++){
        if(this._locals.Booleans[offset + j]){
          value |= 1 << j;
        }
      }
      varStruct.addField(new GFFField(GFFDataType.DWORD, 'Variable')).setValue(value >>> 0);
      swVarTableBitArray.addChildStruct(varStruct);
    }
    const swVarTableByteArray = swVarTableStruct.addField(new GFFField(GFFDataType.LIST, 'ByteArray'));
    for(let i = 0; i < 8; i++){
      const varStruct = new GFFStruct();
      varStruct.addField(new GFFField(GFFDataType.BYTE, 'Variable')).setValue(Number(this._locals.Numbers[i] || 0));
      swVarTableByteArray.addChildStruct(varStruct);
    }
    return swVarTableStruct;
  }

  /** Retail module SWVarTable — Get/SetLocalBoolean on GetModule() */
  getLocalBoolean(index: number){
    return !!this._locals.Booleans[index];
  }

  getLocalNumber(index: number){
    return this._locals.Numbers[index] ? this._locals.Numbers[index] as number : 0;
  }

  setLocalBoolean(index: number, bool: boolean){
    this._locals.Booleans[index] = !!bool;
  }

  setLocalNumber(index: number, value: number){
    this._locals.Numbers[index] = value & 0xFF;
  }

  addEffect(effect?: GameEffect, lLocation?: EngineLocation){
    if(!(effect instanceof GameEffect)){ return; }

    // Retail location AOE: spawn ModuleAreaOfEffect at lLocation
    if(effect.type === GameEffectType.EffectAreaOfEffect && lLocation){
      const aoeEffect = effect as import("@/effects/EffectAreaOfEffect").EffectAreaOfEffect;
      aoeEffect.applyLocation = lLocation;
      effect.setCreator(this.area as any);
      effect.setAttachedObject(this as any);
      effect.loadModel();
      effect.onApply(this as any);
      this.effects.push(effect);
      return;
    }

    effect.loadModel();
    const object: any = {
      context: GameState,
      model: new THREE.Object3D(),
      position: lLocation.position,
      effects: [] as GameEffect[],
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
    object.audioEmitter.type = AudioEmitterType.POSITIONAL;
    object.audioEmitter.setMaxDistance(50);
    object.audioEmitter.setPriorityGroupId(AudioPriorityGroup.NORMAL_SPELL_EFFECTS);
    object.audioEmitter.load();
    object.audioEmitter.setPosition(lLocation.position.x, lLocation.position.y, lLocation.position.z);

    object.model.position.copy(lLocation.position);

    effect.setCreator(object);
    // Attach to the location node, not the module — impact models hang off
    // object.model so the VFX renders at lLocation.
    effect.setAttachedObject(object);
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

      //Process EffectList (module-level VFX / effects still tick every frame)
      let elLen = this.effects.length - 1;
      for(let i = elLen; i >= 0; i--){
        this.effects[i].update(delta);
      }

      // Retail UpdateState — budgeted AI + event drain + quick-walk
      GameState.ServerAIMaster.updateState(delta);

      // Retail DoUpdate — alternate module / area heartbeat
      this.doUpdate(delta);

      if(this.area){
        this.area.clientUpdate(delta);
      }

      this.timeManager.update(delta);

    }

  }

  /**
   * Retail DoUpdate — alternates each frame between
   * module AIUpdate and area AIUpdate.
   */
  doUpdate(delta: number = 0){
    if(this._doUpdateFlip){
      this._doUpdateFlip = 0;
      this.aiUpdate(delta);
    }else{
      this._doUpdateFlip = 1;
      if(this.area){
        this.area.aiUpdate(delta);
      }
    }
  }

  /**
   * Retail AIUpdate — Mod_OnHeartbeat every 5999ms.
   */
  aiUpdate(delta: number = 0){
    if(!this._moduleHeartbeatInitialized){
      this._moduleHeartbeatInitialized = true;
      this._moduleHeartbeatElapsedMs = 0;
      return;
    }
    this._moduleHeartbeatElapsedMs += 1000 * delta;
    if(this._moduleHeartbeatElapsedMs > 5999){
      this._moduleHeartbeatElapsedMs = 0;
      const onHeartbeat = this.scripts[ModuleObjectScript.ModuleOnHeartbeat];
      if(onHeartbeat){
        try{
          // Module scripts run against the area object (see initScripts)
          onHeartbeat.run(this.area ?? this, 0);
        }catch(e){
          console.error('Module.aiUpdate Mod_OnHeartbeat', e);
        }
      }
    }
  }

  tickPaused(delta = 0){
    if(this.readyToProcessEvents){
      // TimeStop exclusions still receive aiUpdate while paused
      GameState.ServerAIMaster.updateStatePaused(delta);
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

      // Scene ambient = ARE DynAmbientColor (SetAmbient). Sun/moon ambient
      // is the directional light ambient channel via applyLightingColors.

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
    for(let [key, resRef] of this.scriptResRefs){
      const script = GameState.NWScript.Load(resRef);
      if(!script){ continue; }
      this.scripts[key] = script;
    }

    const onLoad = this.scripts[ModuleObjectScript.ModuleOnLoad];
    if(onLoad){
      onLoad.enteringObject = GameState.PartyManager.party[0];
      onLoad.run(this.area, 0);
    }

    const onPlayerClientEnter = this.scripts[ModuleObjectScript.ModuleOnPlayerClientEnter];
    if(onPlayerClientEnter){
      onPlayerClientEnter.enteringObject = GameState.PartyManager.party[0];
      onPlayerClientEnter.run(this.area, 0);
    }
  }

  /** Pass AL — set lastPlayerDied + Mod_OnPlrDeath (retail ModuleAccess 0x16c). */
  notifyPlayerDied(creature: ModuleCreature){
    if(!creature) return;
    this.lastPlayerDied = creature;
    const script = this.scripts[ModuleObjectScript.ModuleOnPlayerDeath];
    if(script){
      const instance = script.newInstance();
      instance.run(this.area ?? this, 0);
    }
  }

  /** Pass AL — set lastPlayerDying + Mod_OnPlrDying (retail ModuleAccess 0x170). */
  notifyPlayerDying(creature: ModuleCreature){
    if(!creature) return;
    this.lastPlayerDying = creature;
    const script = this.scripts[ModuleObjectScript.ModuleOnPlayerDying];
    if(script){
      const instance = script.newInstance();
      instance.run(this.area ?? this, 0);
    }
  }

  /** Pass AL — set lastRespawnButtonPresser + Mod_OnSpawnBtnDn (retail ModuleAccess 0x174). */
  notifyRespawnButtonPresser(creature: ModuleCreature){
    if(!creature) return;
    this.lastRespawnButtonPresser = creature;
    const script = this.scripts[ModuleObjectScript.ModuleOnSpawnButtonDown];
    if(script){
      const instance = script.newInstance();
      instance.run(this.area ?? this, 0);
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

    const creatureList = ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Creature List') );
    for(let i = 0; i < this.limboCreatures.length; i++){
      const creature = this.limboCreatures[i];
      if(!creature) continue;
      const root = creature.save().RootNode;
      root.setType(4); // retail limbo element type
      creatureList.addChildStruct(root);
    }
    const eventQueue = ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'EventQueue') );
    for(let i = 0; i < this.eventQueue.length; i++){
      let event = this.eventQueue[i];
      if(!event) continue;
      const exported = event.export();
      if(exported){
        eventQueue.addChildStruct( exported );
      }
    }

    const areaList = ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_Area_list') );
    if(this.area){
      areaList.addChildStruct( this.area.saveAreaListStruct() );
      this.area.save();
    }

    ifo.RootNode.addField( new GFFField(GFFDataType.INT, 'Mod_Creator_ID') ).setValue(this.creatorId);
    const cutSceneList = ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_CutSceneList') );
    for(let i = 0; i < this.cutSceneList.length; i++){
      const entry = this.cutSceneList[i];
      const csStruct = new GFFStruct(1);
      csStruct.addField(new GFFField(GFFDataType.RESREF, 'CutScene_Name')).setValue(entry.name || '');
      csStruct.addField(new GFFField(GFFDataType.DWORD, 'CutScene_ID')).setValue(entry.id | 0);
      cutSceneList.addChildStruct(csStruct);
    }
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
    ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Expansion_Pack') ).setValue(this.expansionPack | 0);
    const expanList = ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_Expan_List') );
    for(let i = 0; i < this.expansionList.length; i++){
      const entry = this.expansionList[i];
      const exStruct = new GFFStruct(0);
      exStruct.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Expansion_Name')).setValue(entry.name || new CExoLocString());
      exStruct.addField(new GFFField(GFFDataType.INT, 'Expansion_ID')).setValue(entry.id | 0);
      expanList.addChildStruct(exStruct);
    }
    ifo.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_Hak') ).setValue(this.hak);
    const modIdField = ifo.RootNode.addField( new GFFField(GFFDataType.VOID, 'Mod_ID') );
    modIdField.setData(this.id instanceof Uint8Array && this.id.length ? this.id : new Uint8Array(16));
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_IsNWMFile') ).setValue(0);
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_IsSaveGame') ).setValue( isSaveGame ? 1 : 0);
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_MinPerHour') ).setValue(this.timeManager.minutesPerHour);
    ifo.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Name') ).setValue( this.name );
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_NextCharId0') ).setValue(this.nextCharId0);
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_NextCharId1') ).setValue(this.nextCharId1);
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_NextObjId0') ).setValue(this.nextObjId0);
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_NextObjId1') ).setValue(this.nextObjId1);
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnAcquirItem') ).setValue(this.scripts[ModuleObjectScript.ModuleOnPlayerAcquireItem]?.name || '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnActvtItem') ).setValue(this.scripts[ModuleObjectScript.ModuleOnPlayerActivateItem]?.name || '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnClientEntr') ).setValue(this.scripts[ModuleObjectScript.ModuleOnPlayerClientEnter]?.name || '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnClientLeav') ).setValue(this.scripts[ModuleObjectScript.ModuleOnPlayerClientLeave]?.name || '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnHeartbeat') ).setValue(this.scripts[ModuleObjectScript.ModuleOnHeartbeat]?.name || '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnModLoad') ).setValue(this.scripts[ModuleObjectScript.ModuleOnLoad]?.name || '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnModStart') ).setValue(this.scripts[ModuleObjectScript.ModuleOnStart]?.name || '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrDeath') ).setValue(this.scripts[ModuleObjectScript.ModuleOnPlayerDeath]?.name || '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrDying') ).setValue(this.scripts[ModuleObjectScript.ModuleOnPlayerDying]?.name || '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrLvlUp') ).setValue(this.scripts[ModuleObjectScript.ModuleOnPlayerLevelUp]?.name || '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnPlrRest') ).setValue(this.scripts[ModuleObjectScript.ModuleOnPlayerRest]?.name || '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnSpawnBtnDn') ).setValue(this.scripts[ModuleObjectScript.ModuleOnSpawnButtonDown]?.name || '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnUnAqreItem') ).setValue(this.scripts[ModuleObjectScript.ModuleOnUnAcquireItem]?.name || '');
    ifo.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Mod_OnUsrDefined') ).setValue(this.scripts[ModuleObjectScript.ModuleOnUserDefined]?.name || '');
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_PauseDay') ).setValue(this.timeManager.pauseDay);
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_PauseTime') ).setValue(this.timeManager.pauseTime);

    // Player — retail SavePlayers: list element type 0xBEAD + Mod_* wrapper fields
    const playerList = ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_PlayerList') );
    if(GameState.PartyManager.Player){
      const player = GameState.PartyManager.Player;
      const playerStruct = player.save().RootNode;
      playerStruct.type = 0xBEAD;
      const communityName = 'Bad StrRef';
      playerStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_CommntyName') ).setValue(communityName);
      playerStruct.addField( new GFFField(GFFDataType.BYTE, 'Mod_IsPrimaryPlr') ).setValue(1);
      playerStruct.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_FirstName') ).setValue(
        player.firstName instanceof CExoLocString ? player.firstName : new CExoLocString()
      );
      playerStruct.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_LastName') ).setValue(
        player.lastName instanceof CExoLocString ? player.lastName : new CExoLocString()
      );
      playerList.addChildStruct( playerStruct );
    }

    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_StartDay') ).setValue(this.timeManager.day);
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_StartHour') ).setValue(this.timeManager.hour);
    ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Mod_StartMiliSec') ).setValue(this.timeManager.milisecond);
    ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Mod_StartMinute') ).setValue(this.timeManager.minute);
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_StartMonth') ).setValue(this.timeManager.month);
    // Retail SaveModuleIFOStart does not write Mod_StartMovie (load-only in LoadModuleStart)
    ifo.RootNode.addField( new GFFField(GFFDataType.WORD, 'Mod_StartSecond') ).setValue(this.timeManager.second);
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_StartYear') ).setValue(this.timeManager.year);
    ifo.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_Tag') ).setValue(this.tag);
    const tokenList = ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'Mod_Tokens') );
    // Retail SaveModuleIFOStart skips built-in tokens 0..9
    this.customTokens.forEach( (tokenValue, tokenNumber) => {
      if(tokenNumber <= 9) return;
      const tokenStruct = new GFFStruct(7);
      tokenStruct.addField( new GFFField(GFFDataType.DWORD, 'Mod_TokensNumber') ).setValue(tokenNumber);
      tokenStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_TokensValue') ).setValue(tokenValue || '');
      tokenList.addChildStruct(tokenStruct);
    });
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_Transition') ).setValue(this.timeManager.transition);
    ifo.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Mod_Version') ).setValue(this.version);
    // Retail SaveModuleIFOStart does not write Mod_VO_ID (K1/TSL)
    ifo.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_XPScale') ).setValue(this.xpScale);
    // Module-level SWVarTable + named VarTable
    const swVarTable = ifo.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.addChildStruct( this.getModuleSWVarTableSaveStruct() );
    const varTable = ifo.RootNode.addField( new GFFField(GFFDataType.LIST, 'VarTable') );
    this.scriptVarTable.writeToListField(varTable);
    
    this.ifo = ifo;

    const sav = new ERFObject();
    // Retail module saves are MOD V1.0 ERFs
    sav.header.fileType = 'MOD ';
    sav.header.fileVersion = 'V1.0';
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

  /**
   * Retail IncludeModuleInSave (modulesave.2da IncludeInSave).
   * Default true when the table/row is missing.
   */
  includeInSave(){
    return ModuleSaveTable.includeInSave(this.filename);
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
      if(GameState.GameKey == GameEngineType.TSL){
      archive = await Module.GetModuleDLG(modName);
        if(archive instanceof ERFObject){
          archives.push(archive);
        }
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
    const transitionCalendar = !GameState.isLoadingSave && GameState.module?.filename
      ? GameState.module.timeManager.calendar.clone()
      : undefined;
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
      if(transitionCalendar){
        module.timeManager.pauseDay = transitionCalendar.pauseDay;
        module.timeManager.pauseTime = transitionCalendar.pauseTime;
        module.timeManager.calendar.advanceDayAndTime();
        module.timeManager.dayPhase = module.timeManager.computeDayPhase(module.timeManager.hour);
      }

      const gitBuffer = await ResourceLoader.loadResource(ResourceTypes['git'], module.entryArea);
      const git = new GFFObject(gitBuffer);

      const areBuffer = await ResourceLoader.loadResource(ResourceTypes['are'], module.entryArea);
      const are = new GFFObject(areBuffer)
      module.area = new ModuleArea(module.entryArea, are, git);
      module.areas = [module.area];
      module.area.module = module;
      module.area.setTransitionWaypoint(module.transWP);
      await module.area.load();

      // Retail area game ObjectId comes from Mod_Area_list (not ARE ID header).
      // Apply before AddObjectById so IFO/save ObjectId is preserved.
      if(module.areaList[0]?.objectId){
        module.area.id = module.areaList[0].objectId >>> 0;
      }
      GameState.ModuleObjectManager.RegisterObject(module.area);

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

    //Export.ifo

    //Export.are

    //Export.git

    return {
      are: null,
      git: null,
      ifo: null
    } as any;

  }

}
