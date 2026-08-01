import * as THREE from "three";
import type { Action } from "@/actions/Action";
import { ActionQueue } from "@/actions/ActionQueue";
import { AudioEmitter } from "@/audio/AudioEmitter";
import { CollisionManager } from "@/engine/CollisionManager";
import { CombatData } from "@/combat/CombatData";
import type { EffectLink } from "@/effects";
import type { GameEffect } from "@/effects/GameEffect";
import EngineLocation from "@/engine/EngineLocation";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { CombatFeatType } from "@/enums/combat/CombatFeatType";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameEffectSetStateType } from "@/enums/effects/GameEffectSetStateType";
import { GameEngineType } from "@/enums/engine";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModulePlaceableAnimState } from "@/enums/module/ModulePlaceableAnimState";
import { NWScriptEventType } from "@/enums/nwscript/NWScriptEventType";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GameState } from "@/GameState";
import { IEffectIconListItem } from "@/interface/module/IEffectIconListItem";
import { SSFType } from "@/enums/resource/SSFType";
import { NWScriptEvent } from "@/nwscript/events";
import { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { OdysseyModel, OdysseyModelAnimation, OdysseyWalkMesh } from "@/odyssey";
import { CExoLocString } from "@/resource/CExoLocString";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { GFFStruct } from "@/resource/GFFStruct";
import { LIPObject } from "@/resource/LIPObject";
import { OdysseyModel3D, OdysseyObject3D } from "@/three/odyssey";
import { Utility } from "@/utility/Utility";
import { ComputedPath } from "@/engine/pathfinding";
import {
  applyMobilityMovementBonus,
  clampMovementRateFactor,
} from "@/engine/pathfinding/locomotion";
import { clearLineOfSight } from "@/engine/pathfinding/clear-line-of-sight";
import { noNonWalkPolysDetailed } from "@/engine/pathfinding/no-non-walk-polys";
import type { ModuleArea, ModuleDoor, ModuleItem, ModuleRoom } from "@/module";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { ExcitedDurationRow } from "@/combat/combat-engagement";
import { getSpeakStringNotifyPlan } from "@/combat/speak-string-broadcast";
import { EngineMode } from "@/enums/engine/EngineMode";
import { DLGObject } from "@/resource/DLGObject";
import { Faction } from "@/engine/Faction";
import { ScriptVarTable } from "@/engine/ScriptVarTable";
import { ITwoDAAnimation } from "@/interface/twoDA/ITwoDAAnimation";
import { SWPlaceableAppearance } from "@/engine/rules/SWPlaceableAppearance";
import { SWCreatureAppearance } from "@/engine/rules/SWCreatureAppearance";
import { SWDoorAppearance } from "@/engine/rules/SWDoorAppearance";
import { IDialogAnimationState } from "@/interface/animation/IDialogAnimationState";
import {
  flourishAnimationRow,
  meleeCombatWieldAnimationRow,
  meleeWieldAnimationRow,
} from "@/module/animation/flourish-wield-dispatch";
import { AILevel } from "@/enums/module/AILevel";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import type { IPerceptionInfo } from "@/interface/engine/IPerceptionInfo";
import { PerceptionMask } from "@/enums/engine/PerceptionMask";
import { MDLLoader } from "@/loaders";
import { CombatRound, CombatRoundAction } from "@/combat";
import { Dice } from "@/utility/Dice";
import { DiceType } from "@/enums/combat/DiceType";
import { BitWise } from "@/utility/BitWise";
import { ActionType } from "@/enums/actions/ActionType";
import { NWScript } from "@/nwscript/NWScript";
import { CombatActionType, EngineDebugType, ModuleObjectScript, ModuleTriggerType, SkillType, TalkVolume } from "@/enums";
import type { SWPortrait } from "@/engine/rules/SWPortrait";
import type { IHeardString } from "@/interface/dialog/IHeardString";
import type { SWRange } from "@/engine/rules/SWRange";
import { TURN_SPEED_SLOW } from "@/engine/TurnSpeeds";
import { getForceResistanceBonus, getSavingThrowEffectBonus } from "@/effects/effect-bonuses";
import { getActiveSetStateType } from "@/effects/set-state";
import { ModuleCreatureAmbientState } from "@/enums/module/ModuleCreatureAmbientState";
import {
  SAVING_THROW_FORTITUDE,
  SAVING_THROW_REFLEX,
  SAVING_THROW_WILL,
  getCreatureSavingThrowBase,
  savingThrowRoll,
} from "@/combat/saving-throw";
import {
  applyTrapGroundGeometry,
  trapKitResRefFromRow,
} from "@/actions/trap-geometry";


/**
* ModuleObject class.
* 
* Class representing is the base class for all objects found in an area.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModuleObject.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleObject {
  facingSpeed: number = TURN_SPEED_SLOW;
  helperColor: THREE.Color = new THREE.Color(0xFFFFFF);

  combatOrder: number;
  combatRoundTimer: number;
  controlled: boolean;
  id: number;
  /**
   * Retail CSWMiniGameObject::mgo_index — slot in client MiniGameObjectArray (0xff = unset).
   * Synced to `id` on register so NWScript StackPushObject / StoreState use the slot
   * (retail ExecuteCommandSWMG_GetObjectByName @ 005cb6d0 pushes mgo_index).
   */
  mgoIndex: number = 0xff;
  initialized: boolean;
  isPlayer: boolean = false;
  isPM: boolean = false;
  name: string;
  objectType: number = ModuleObjectType.ModuleObject;

  effectIconList: IEffectIconListItem[] = [];

  container: OdysseyObject3D;
  forceVector: THREE.Vector3 = new THREE.Vector3();
  position: THREE.Vector3 = new THREE.Vector3();
  lastPosition: THREE.Vector3 = new THREE.Vector3();
  rotation: THREE.Euler = new THREE.Euler();
  quaternion: THREE.Quaternion = new THREE.Quaternion();
  _triangle: THREE.Triangle = new THREE.Triangle();
  wm_c_point: THREE.Vector3 = new THREE.Vector3();
  box: THREE.Box3 = new THREE.Box3();
  sphere: THREE.Sphere = new THREE.Sphere();
  v20: THREE.Vector2 = new THREE.Vector2();
  v21: THREE.Vector2 = new THREE.Vector2();
  tmpPos: THREE.Vector3 = new THREE.Vector3();
  openSpot: any;

  audioEmitter: AudioEmitter;
  footstepEmitter: AudioEmitter;

  collisionManager: CollisionManager = new CollisionManager(this);
  invalidateCollision: boolean = false;
  combatData: CombatData = new CombatData(this);
  combatRound = new CombatRound(this);

  facing: number;
  wasFacing: number;
  force: number;
  speed: number;
  movementSpeed: number;

  area: ModuleArea;

  //Room
  room: ModuleRoom;
  rooms: ModuleRoom[] = [];
  /** Retail ApplyShadowBlob — Fx_Shadow_S/M/L model attached under the object. */
  shadowBlobModel: OdysseyModel3D;
  roomIds: number[] = [];
  roomSize: THREE.Vector3;

  inventory: ModuleItem[] = [];

  model: OdysseyModel3D;
  xOrientation: number;
  yOrientation: number;
  zOrientation: number;

  dialogAnimation: {
    animation: OdysseyModelAnimation,
    data: ITwoDAAnimation,
    started: boolean,
  };

  dialogAnimationState: IDialogAnimationState = {
    animationIndex: -1,
    animation: undefined,
    data: undefined,
    started: false,
  };

  templateResRef: string = '';
  template: GFFObject;

  plot: boolean = false;
  scripts: {[key: string]: NWScriptInstance} = { };
  tag: string = '';
  bearing: number = 0;
  collisionTimer: number = 0;
  perceptionTimer: number = 0;
  tweakColor: number = 0xFFFFFF;
  useTweakColor: boolean = false;
  hp: number = 0;
  currentHP: number = 0;

  factionId: number = 0;
  faction: Faction;

  effects: GameEffect[] = [];
  casting: any[] = [];
  damageList: any[] = [];
  _locals: { Booleans: any[]; Numbers: {}; };
  /** Retail named VarTable (CSWSScriptVarTable) — round-trip from saves */
  scriptVarTable: ScriptVarTable = new ScriptVarTable();
  objectsInside: any[];
  lockDialogOrientation: boolean = false;
  lastInventoryDisturbType: number = 0;
  lastInventoryDisturbItem: any = undefined;
  lastItemAcquired: any = undefined;
  context: any;

  heartbeatTimer: any;
  _heartbeatTimerOffset: number;
  _heartbeatTimeout: number;
  /**
   * Retail CSWSObject::ai_level — priority in CServerAIMaster lists.
   * INVALID until registered via ServerAIMaster.addObject.
   */
  aiLevel: AILevel = AILevel.INVALID;
  /** Elapsed world-time accumulator for the per-object 6s heartbeat (ms). */
  _aiHeartbeatElapsedMs: number = 0;
  /** World time (ms) of the last aiUpdate — used to accumulate skipped-frame delta. */
  _lastAIUpdateWorldMs: number = 0;
  /** Set by ServerAIMaster quick-walk pass so aiUpdate skips re-processing move actions. */
  _quickWalkedThisFrame: boolean = false;

  //Perception
  heardStrings: IHeardString[] = [];
  perceptionList: IPerceptionInfo[] = [];
  isListening: boolean;
  /**
   * Registered listen expressions in registration order (retail expression_list).
   * Keyed by pattern number via SetListenExpression; first match wins on scan.
   */
  listeningPatterns: Array<{ pattern: string; number: number }> = [];
  /**
   * Per-node captures from the last listen match (retail matched_expression_strings).
   * Indexed by GetMatchedSubstring after OnDialogue.
   */
  matchedSubstrings: string[] = [];
  perceptionRange: SWRange;
  
  spawned: boolean = false;
  _inventoryPointer: number;

  //stats
  fortitudeSaveThrow: number;
  reflexSaveThrow: number;
  willSaveThrow: number;
  min1HP: boolean;

  //attributes
  placedInWorld: boolean = false;
  linkedToModule: string = '';
  linkedToFlags: number = 0;
  linkedTo: string = '';
  transitionDestin: CExoLocString = new CExoLocString();
  description: any;
  commandable: any = true;
  autoRemoveKey: any;
  animState: any;
  keyName: any;
  loadScreenID: any;
  locName: any;
  localizedName: any;
  hasMapNote: boolean;
  mapNote: CExoLocString;
  mapNoteEnabled: boolean;
  portraitId: number;
  portrait: SWPortrait;
  setByPlayerParty: any;
  highlightHeight: any;
  appearance: number = -1;
  cursor: any;
  isDeadSelectable: boolean = true;
  isDestroyable: boolean = true;
  isRaisable: boolean = true;
  playerCreated: boolean = false;

  //complex animation varaibles
  fp_push_played: any;
  fp_land_played: any;
  fp_getup_played: any;

  /**
   * Retail CSWSObject::spell_target_position — stamped by item/force casts for
   * GetSpellTargetLocation when the spell has no creature target.
   */
  spellTargetPosition: THREE.Vector3 = new THREE.Vector3();

  deferEventUpdate: any;
  distanceToCamera: any;
  facingAnim: boolean;
  mesh: THREE.Mesh;
  geometry: any;
  vertices: any;
  type: any;
  isReady: boolean = false;

  //Actions
  actionQueue: ActionQueue;
  action: Action;

  #computedPath: ComputedPath;
  
  lipObject: LIPObject;
  lookAtObject: ModuleObject;

  //last object effected
  lastTriggerEntered: ModuleObject;
  lastTriggerExited: ModuleObject;
  lastAreaEntered: ModuleObject;
  lastAreaExited: ModuleObject;
  lastModuleEntered: ModuleObject;
  lastModuleExited: ModuleObject;
  lastDoorEntered: ModuleDoor;
  lastDoorExited: ModuleDoor;
  lastPlaceableEntered: ModuleObject;
  lastPlaceableExited: ModuleObject;
  lastAoeEntered: ModuleObject;
  lastAoeExited: ModuleObject;

  conversation: DLGObject;
  cutsceneMode: boolean;

  trapDetectable: boolean;
  trapDetectDC: number;
  trapDisarmable: boolean;
  trapDisarmDC: number;
  trapOneShot: boolean;
  trapType: number;
  trapFlag: boolean;
  /** Pass AL — creature object ids that have detected this trap (retail DetectedBy lists). */
  trapDetectedByIds: number[] = [];
  /** Visual / script “detected” latch (triggers); set by SetTrapDetectedBy / detectTrap. */
  trapDetected: boolean = false;
  ownerDemolitions: number = -1;

  notBlastable: boolean = false;

  linkedToObject: ModuleObject;

  constructor (gff = new GFFObject) {
    this.helperColor.setHex( Math.random() * 0xFFFFFF );
    this.initialized = false;

    //this.moduleObject = null;
    this.forceVector = new THREE.Vector3();
    this.container = new OdysseyObject3D();
    this.container.userData.moduleObject = this;
    this.position = this.container.position;
    this.rotation = this.container.rotation;
    this.quaternion = this.container.quaternion;
    this._triangle = new THREE.Triangle();
    // this.wm_c_point = new THREE.Vector3();

    this.box = new THREE.Box3();
    this.sphere = new THREE.Sphere();
    this.facing = 0;
    this.wasFacing = 0;
    this.force = 0;
    this.speed = 0;
    this.movementSpeed = 1;
    this.room = undefined;
    this.rooms = [];
    this.roomSize = new THREE.Vector3();
    this.model = null;
    this.dialogAnimation = null;
    this.template = undefined;
    this.plot = false;
    this.inventory = [];
    this.scripts = {
      onAttacked: undefined,
      onDamaged: undefined,
      onDeath: undefined,
      onDialog: undefined,
      onDisturbed: undefined,
      onEndDialog: undefined,
      onEndRound: undefined,
      onHeartbeat: undefined,
      onBlocked: undefined,
      onNotice: undefined,
      onRested: undefined,
      onSpawn: undefined,
      onSpellAt: undefined,
      onUserDefined: undefined
    };

    this.tag = '';
    this.templateResRef = '';

    this.xOrientation = 0;
    this.yOrientation = 0;
    this.zOrientation = 0;
    this.bearing = 0;
    this.collisionTimer = 0;
    this.perceptionTimer = 0;

    this.tweakColor = 0;
    this.useTweakColor = false;

    this.hp = 0;
    this.currentHP = 0;

    this.actionQueue = new ActionQueue();
    this.actionQueue.setOwner( this );
    this.effects = [];
    this.casting = [];
    this.damageList = [];

    this._locals = {
      Booleans: [],
      Numbers: {}
    };
    this.scriptVarTable = new ScriptVarTable();

    this.objectsInside = [];
    this.lockDialogOrientation = false;

    this.context = GameState;
    this._heartbeatTimerOffset = Math.floor(Math.random() * 600) + 100;
    // Retail object heartbeat fires every 5999ms; stagger start like the old 3s path.
    this._heartbeatTimeout = 6000;
    this._aiHeartbeatElapsedMs = this._heartbeatTimerOffset;
    this.aiLevel = AILevel.INVALID;
    this._lastAIUpdateWorldMs = 0;
    this._quickWalkedThisFrame = false;

    //Combat Info
    this.combatData.initialize();

    //Always add the object to it's own perceptionList
    this.perceptionList = [
      {
        object: this,
        objectId: this.id,
        data: PerceptionMask.SEEN_AND_HEARD
      }
    ];
    
    this.isListening = false;
    this.listeningPatterns = [];
    this.matchedSubstrings = [];
    this.combatData.initiative = 0;

    this.spawned = false;

    //Pointers
    this._inventoryPointer = 0;

    this.v20 = new THREE.Vector2();
    this.v21 = new THREE.Vector2();

    this.fortitudeSaveThrow = 0;
    this.reflexSaveThrow = 0;
    this.willSaveThrow = 0;

  }

  getScriptInstance(scriptKey: ModuleObjectScript): NWScriptInstance | undefined {
    const script = this.scripts[scriptKey];
    if(!script || !script.nwscript){ return undefined; }
    return this.scripts[scriptKey].newInstance();
  }

  /**
   * Attach to room
   * @param room 
   */
  attachToRoom(room: ModuleRoom){
    this.detachFromRoom(this.room);
    this.room = room;
    this.room.attachChildObject(this);
  }

  /**
   * Detach from room
   * @param room 
   */
  detachFromRoom(room: ModuleRoom){
    if(!room) return;
    room.removeChildObject(this); 
    this.room = undefined;
  }

  /**
   * Set the context
   * @param ctx 
   */
  setContext(ctx = GameState){
    this.context = ctx;
    if(this.model instanceof OdysseyModel3D){
      this.model.emitters.forEach( (emitter) => {
        emitter.context = this.context;
      });
    }
  }

  /**
   * Get the model
   * @returns 
   */
  getModel(){
    if(this.model instanceof THREE.Object3D)
      return this.model;
    else
      return this.model = new OdysseyModel3D();
  }

  /**
   * Check if the object is visible
   * @returns 
   */
  isVisible(){
    return this.getModel().visible;
  }

  /**
   * Get the hit distance
   * @returns 
   */
  getHitDistance(){
    return 1;
  }

  /**
   * Recalc movement_rate_factor from MSI/MSD effects.
   * Retail: best increase (absolute %) × (100 − best decrease %) / 100,
   * clamped to [0.125, 1.5] like GetWalkRate / GetRunRate.
   * TSL GetMovementRateFactor @ 0068f140: Mobility feat (0xc3) adds +0.1 before clamp.
   */
  updateMovementSpeed(){
    let bestIncrease = 100;
    let bestDecrease = 0;

    for(let i = 0, len = this.effects.length; i < len; i++){
      const effect = this.effects[i];
      if(effect.type == GameEffectType.EffectMovementSpeedIncrease){
        let pct = effect.getInt(0) | 0;
        if(pct < 100) pct += 100;
        if(pct > bestIncrease) bestIncrease = pct;
      }else if(effect.type == GameEffectType.EffectMovementSpeedDecrease){
        const pct = effect.getInt(0) | 0;
        if(pct > 0 && pct < 100 && pct > bestDecrease){
          bestDecrease = pct;
        }
      }
    }

    let factor = (bestIncrease / 100) * ((100 - bestDecrease) / 100);
    // TSL Mobility (feat 0xc3 / 195) — GetMovementRateFactor +0.1
    const hasMobility =
      typeof (this as { getHasFeat?: (id: number) => boolean }).getHasFeat === 'function' &&
      (this as { getHasFeat: (id: number) => boolean }).getHasFeat(CombatFeatType.MOBILITY);
    factor = applyMobilityMovementBonus(
      factor,
      hasMobility,
      GameState.GameKey === GameEngineType.TSL
    );
    this.movementSpeed = clampMovementRateFactor(factor);
  }

  /**
   * Retail CSWSObject::AIUpdate — scheduled by ServerAIMaster (budgeted, may skip frames).
   * Heartbeat (6s), effect list, and subclass action-queue work.
   * @param delta Accumulated world-time seconds since last aiUpdate (or frame delta when first run).
   */
  aiUpdate(delta = 0){
    if(this.willDestroy || this.destroyed){
      if(this.actionQueue && this.actionQueue.length > 0){
        this.actionQueue.clear();
      }
      return;
    }

    // Retail heartbeat threshold: 5999ms
    this._aiHeartbeatElapsedMs += 1000 * delta;
    if(this._aiHeartbeatElapsedMs > 5999){
      if(GameState.module){
        this.triggerHeartbeat();
      }
      this._aiHeartbeatElapsedMs = 0;
    }

    if(!this.deferEventUpdate){
      for(let i = 0, len = this.effects.length; i < len; i++){
        const effect = this.effects[i];
        if(effect) effect.update(delta);
      }
    }
  }

  /**
   * Per-frame client/visual update (retail CClientAIMaster object pass).
   * Destroy fade, camera distance, room check, shadow blob, sphere sync.
   * Server AI (heartbeat / effects / actions) lives in aiUpdate.
   * @param delta 
   */
  update(delta = 0){

    this.updateDestroy(delta);
    if(this.willDestroy || this.destroyed){
      if(this.actionQueue && this.actionQueue.length > 0){
        this.actionQueue.clear();
      }
      return;
    }

    if(GameState.currentCamera){
      this.distanceToCamera = this.position.distanceTo(GameState.currentCameraPosition);
    }

    // Triggers/doors are static — roomCheck findWalkableFace would snap Z by +0.005.
    // They attach rooms via their own getCurrentRoom() without mutating position.
    if(this.spawned
      && !BitWise.InstanceOfObject(this, ModuleObjectType.ModuleTrigger)
      && !BitWise.InstanceOfObject(this, ModuleObjectType.ModuleDoor)){
      this.collisionManager.roomCheck(delta);
    }

    if(this.shadowBlobModel){
      // Retail ShowShadowBlob / HideShadowBlob — tied to area shadow enable + shadowAlpha.
      this.shadowBlobModel.visible = GameState.areaShadowsEnabled && GameState.shadowAlpha > 0;
    }

    this.sphere.center.copy(this.position);
    this.sphere.radius = this.getHitDistance() * 2;

  }

  updateDestroy(delta: number = 0){
    if(this.willDestroy && !this.destroyed){
      this.timeSinceDestroyStarted += delta;
      this.updateDestroyFade(delta);
      const fadeLen = this.getFadeDuration();
      const fadeEndTime = this.noFadeOnDestroy ? 0 : (this.delayUntilFade + fadeLen);
      const destroyTime = Math.max(this.delayUntilDestroy, fadeEndTime);
      if(this.timeSinceDestroyStarted >= destroyTime){
        this.destroy();
      }
    }
  }

  updateDestroyFade(delta: number = 0){
    if(this.noFadeOnDestroy || this.destroyed) return;
    if(this.timeSinceDestroyStarted >= this.delayUntilFade){
      const fadeElapsed = this.timeSinceDestroyStarted - this.delayUntilFade;
      const fadeLen = this.getFadeDuration();
      const opacity = fadeLen > 0 ? Math.max(0, 1 - (fadeElapsed / fadeLen)) : 0;
      this.setOpacity(opacity);
    }
  }

  /**
   * Update the paused state
   * @param delta 
   */
  updatePaused(delta: number = 0){
    // this.force = 0;
    // this.forceVector.set(0, 0, 0);
    if(this.spawned){
      // Allow PC/party room attach while paused so auto-pause cannot leave a blank VIS
      if(
        !this.room &&
        this.area &&
        !BitWise.InstanceOfObject(this, ModuleObjectType.ModuleTrigger) &&
        !BitWise.InstanceOfObject(this, ModuleObjectType.ModuleDoor)
      ){
        this.collisionManager.roomCheck(delta);
      }else{
        this.updateModelVisibility();
      }
    }
  }

  /**
   * Update the model visibility
   */
  updateModelVisibility(){
    if(!this.model){ return; }
    this.model.wasOffscreen = !this.model.visible;

    if(GameState.Mode == EngineMode.INGAME){
      if(!this.room){
        this.model.visible = true;
        return;
      }else{
        this.model.visible = !!this.room?.model?.visible;
      }

      //Check to see if the model is inside the current camera's frustum
      if(!this.isOnScreen()){
        this.model.visible = false;
      }
      return;
    }
    
    if(GameState.Mode == EngineMode.DIALOG || GameState.Mode == EngineMode.MINIGAME){
      this.model.visible = true;
    }
  }

  /**
   * Clear all actions
   * @param skipUnclearable — retail ActionManager(1) / ClearAllActions(1): keep
   *   unclearable actions (dialog), ClearAllAttacks on the combat round, and
   *   interrupt combat-round pause so a newly queued CAST_SPELL / attack can
   *   dispatch via ActionCombat immediately.
   *
   * Retail CSWSObject::ClearAllActions @ 004ccd80 (commandable path) keeps
   * conversation control actions via a per-action callback. EffectHorrified /
   * SetState must not drop Pause/Wait/Resume or dialogs hang (tar08_calo082).
   *
   * Retail CSWSObject::ClearAllActions @ 004ccd80 does **not** RemoveAllActions
   * on the combat-round schedule — that is a separate call (GUI ClearAll /
   * CancelCombat / SetCombatState(0)). Keeping the schedule lets the player
   * queue multiple attacks/spells while in combat.
   */
  clearAllActions(skipUnclearable = false){
    // Retail ClearAllActions(1) → ClearAllAttacks only (not RemoveAllActions).
    // clearAllActions(false) is our aggressive reset (party/dialog) — also
    // RemoveAllActions so leftover combat-queue entries cannot resume.
    if(skipUnclearable){
      this.combatRound?.clearAllAttacks?.();
    }else{
      this.combatRound?.clearActions?.();
    }
    // Player ActionManager clear: drop roundPaused / infinitePause so the next
    // scheduled combat action is not stuck behind a cancelled attack pause.
    if(skipUnclearable && this.combatRound?.roundPaused){
      this.combatRound.resetCombatAnimations?.(0);
    }
    this.setComputedPath(undefined);
    //Reset the anim state
    //this.animState = 0;
    //this.actionQueue.clear();
    if(skipUnclearable){
      let i = this.actionQueue.length;
      while(i--){
        let action = this.actionQueue[i];
        // Retail CSWSObject::ClearAllActions @ 004ccd80 (commandable path) uses
        // a per-action keep/drop callback. Conversation Pause/Wait/Resume must
        // survive SetState clears (EffectHorrified in k_ptar_calofade) or the
        // dialog stays paused forever with pendingAdvance.
        if(
          action.type == ActionType.ActionDialogObject ||
          action.type == ActionType.ActionPauseDialog ||
          action.type == ActionType.ActionResumeDialog ||
          action.type == ActionType.ActionWait
        ){
          continue;
        }
        if(typeof action.clearable !== 'undefined'){
          if(action.clearable){
            this.actionQueue.splice(i, 1).map((a) => a.dispose());
          }
        }else{
          this.actionQueue.splice(i, 1).map((a) => a.dispose());
        }
      }
    }else{
      this.actionQueue.clear();
    }

    // Retail CancelGuiTimingEvent clears actions; clearing actions must also StopGuiTimingBar.
    GameState.GuiTimingBarManager?.cancelFor?.(this);

    this.combatData.reset();
    if(this.collisionManager){
      this.collisionManager.foundEnemyCreature = undefined;
    }
    // Drop sticky walk / approach / player-control axes after cancel
    (this as any).clearLocomotionState?.(true);
    //this.clearTarget();
  }

  /**
   * Cancel path/drive locomotion only. Used by direct WASD/stick so combat
   * and unclearable dialog actions stay intact.
   */
  cancelLocomotionActions(){
    let i = this.actionQueue.length;
    while(i--){
      const action = this.actionQueue[i];
      if(!action) continue;
      if(
        action.type === ActionType.ActionMoveToPoint ||
        action.type === ActionType.ActionFollowLeader ||
        action.type === ActionType.ActionForceFollowObject ||
        action.type === ActionType.ActionDrive ||
        action.type === ActionType.ActionJumpToPoint ||
        action.type === ActionType.ActionJumpToObject ||
        action.type === ActionType.ActionRandomWalk
      ){
        this.actionQueue.splice(i, 1).map((a) => a.dispose());
      }
    }
    this.setComputedPath(undefined);
    (this as any).clearLocomotionState?.(false);
  }

  /**
   * Clear the combat action
   * @param combatAction - Specific scheduled action, or omit to clear the current round action
   * @returns 
   */
  clearCombatAction(combatAction: CombatRoundAction = undefined){
    if(combatAction){
      return this.combatRound.clearAction(combatAction);
    }
    if(this.combatRound?.action){
      this.combatRound.action = undefined;
      return true;
    }
    return false;
  }

  /**
   * Clear the combat action at index
   * @param index 
   * @returns 
   */
  clearCombatActionAtIndex(index: number = 0): boolean {
    if(index < 0 || !this.combatRound?.scheduledActionList?.length) return false;
    if(index >= this.combatRound.scheduledActionList.length) return false;
    return !!this.combatRound.scheduledActionList.splice(index, 1).length;
  }

  /**
   * Action play animation
   * @param anim 
   * @param speed 
   * @param time 
   */
  actionPlayAnimation(anim = 0, speed = 1, time = 1){
    if(typeof anim === 'string')
      throw 'anim cannot be a string!';

    const animConstant = this.getAnimationNameById(anim);
    if(animConstant >= 10000){
      const action = new GameState.ActionFactory.ActionPlayAnimation();
      action.setParameter(0, ActionParameterType.INT, animConstant);
      action.setParameter(1, ActionParameterType.FLOAT, speed || 1);
      action.setParameter(2, ActionParameterType.FLOAT, time);
      this.actionQueue.add(action);
    }else{
      console.error('actionPlayAnimation', animConstant, anim);
    }
  }

  /**
   * Action dialog object
   * @param target 
   * @param dialogResRef 
   * @param ignoreStartRange 
   * @param bPrivate 
   * @param nConvoType 
   * @param clearable 
   * @param ignoreObjectNames - sNameObjectToIgnore1-6 (AddToDialogNonDependantList)
   * @param barkScreenX - TSL nBarkX (−1 default)
   * @param barkScreenY - TSL nBarkY (−1 default)
   */
  actionDialogObject( target: ModuleObject, dialogResRef = '', ignoreStartRange = true, bPrivate = 0, nConvoType = 1, clearable = false, ignoreObjectNames: string[] = [], barkScreenX: number = -1, barkScreenY: number = -1, bUseLeader: boolean = false ){
    const action = new GameState.ActionFactory.ActionDialogObject();
    action.setParameter(0, ActionParameterType.DWORD, target.id);
    action.setParameter(1, ActionParameterType.STRING, dialogResRef);
    action.setParameter(2, ActionParameterType.INT, bPrivate ? 1 : 0);
    action.setParameter(3, ActionParameterType.INT, nConvoType);
    action.setParameter(4, ActionParameterType.INT, ignoreStartRange ? 1 : 0);
    // bUseLeader: force party leader as listener (param 5); else OBJECT_INVALID → owner
    if(bUseLeader && GameState.PartyManager?.party?.[0]){
      action.setParameter(5, ActionParameterType.DWORD, GameState.PartyManager.party[0].id);
    }else{
      action.setParameter(5, ActionParameterType.DWORD, ModuleObjectConstant.OBJECT_INVALID);
    }
    // Params 6–11: ignore-object names (retail CGuiInGame::AddToDialogNonDependantList)
    for(let i = 0; i < 6; i++){
      action.setParameter(6 + i, ActionParameterType.STRING, ignoreObjectNames[i] ?? '');
    }
    action.setParameter(12, ActionParameterType.INT, barkScreenX);
    action.setParameter(13, ActionParameterType.INT, barkScreenY);
    action.setParameter(14, ActionParameterType.INT, bUseLeader ? 1 : 0);
    action.clearable = clearable;
    console.log('ModuleObject.actionDialogObject', action);
    this.actionQueue.add(action);
  }

  /**
   * Action use object
   * @param object 
   */
  actionUseObject( object: ModuleObject ){
    const action = new GameState.ActionFactory.ActionUseObject();
    action.setParameter(0, ActionParameterType.DWORD, object.id);
    this.actionQueue.add(action);
  }

  /**
   * Action open door
   * @param door 
   */
  actionOpenDoor( door: ModuleObject ){
    const action = new GameState.ActionFactory.ActionOpenDoor();
    action.setParameter(0, ActionParameterType.DWORD, door.id);
    action.setParameter(1, ActionParameterType.INT, 0);
    this.actionQueue.add(action);
  }

  /**
   * Action close door
   * @param door 
   */
  actionCloseDoor( door: ModuleObject ){
    const action = new GameState.ActionFactory.ActionCloseDoor();
    action.setParameter(0, ActionParameterType.DWORD, door.id);
    action.setParameter(1, ActionParameterType.INT, 0);
    this.actionQueue.add(action);
  }

  /**
   * Action wait
   * @param time 
   */
  actionWait( time = 0 ){
    const action = new GameState.ActionFactory.ActionWait();
    action.setParameter(0, ActionParameterType.FLOAT, time);
    this.actionQueue.add(action);
  }

  isSimpleCreature(){
    return false;
  }

  /**
   * Gets the length (duration) of an animation state in seconds
   * 
   * @param animationState - The animation state constant (e.g., ModuleCreatureAnimState.WALKING)
   * @returns The animation length in seconds, or 0 if not found
   */
  getAnimationLength(animationState: number): number {
    if (!this.model || !(this.model instanceof OdysseyModel3D)) {
      return 0;
    }

    // Get the animation data from the 2DA table
    const animationData = this.animationConstantToAnimation(animationState);
    if (!animationData || !animationData.name) {
      return 0;
    }

    // Find the animation in the model's animation list
    const animation = this.model.odysseyAnimationMap.get(animationData.name.toLowerCase().trim());
    if (!animation) {
      return 0;
    }

    return animation.length;
  }

  /**
   * Gets the length (duration) of an animation by name in seconds
   * 
   * @param animationName - The name of the animation (e.g., "walking", "attack")
   * @returns The animation length in seconds, or 0 if not found
   */
  getAnimationLengthByName(animationName: string): number {
    if (!this.model || !(this.model instanceof OdysseyModel3D)) {
      return 0;
    }

    // Find the animation in the model's animation list
    const animation = this.model.odysseyAnimationMap.get(animationName.toLowerCase().trim());
    if (!animation) {
      return 0;
    }

    return animation.length;
  }

  /**
   * Gets the current playing animation length in seconds
   * 
   * @returns The current animation length in seconds, or 0 if no animation is playing
   */
  getCurrentAnimationLength(): number {
    if (!this.model || !(this.model instanceof OdysseyModel3D)) {
      return 0;
    }

    const currentAnimation = this.model.animationManager.currentAnimation;
    if (!currentAnimation) {
      return 0;
    }

    return currentAnimation.length;
  }

  /**
   * Get the animation name by id
   * @param id 
   * @returns 
   */
  getAnimationNameById(id = -1){

    if(typeof id === 'string')
      throw 'getAnimation id cannot be a string';

    if(id >= 10000)
      return id;

    switch(id){
      case 0:  //PAUSE
        return ModuleCreatureAnimState.PAUSE;
      case 1:  //PAUSE2
        return ModuleCreatureAnimState.PAUSE2;
      case 2:  //LISTEN
        return ModuleCreatureAnimState.LISTEN;
      case 3:  //MEDITATE
        return ModuleCreatureAnimState.MEDITATE;
      case 4:  //WORSHIP
        return ModuleCreatureAnimState.WORSHIP;
      case 5:  //TALK_NORMAL
        return ModuleCreatureAnimState.TALK_NORMAL;
      case 6:  //TALK_PLEADING
        return ModuleCreatureAnimState.TALK_PLEADING;
      case 7:  //TALK_FORCEFUL
        return ModuleCreatureAnimState.TALK_FORCEFUL;
      case 8:  //TALK_LAUGHING
        return ModuleCreatureAnimState.TALK_LAUGHING;
      case 9:  //TALK_SAD
        return ModuleCreatureAnimState.TALK_SAD;
      case 10: //GET_LOW
        return ModuleCreatureAnimState.GET_LOW;
      case 11: //GET_MID
        return ModuleCreatureAnimState.GET_MID;
      case 12: //PAUSE_TIRED
        return ModuleCreatureAnimState.PAUSE_TIRED;
      case 13: //PAUSE_DRUNK
        return ModuleCreatureAnimState.PAUSE_DRUNK;
      case 14: //FLIRT
        return ModuleCreatureAnimState.FLIRT;
      case 15: //USE_COMPUTER
        return ModuleCreatureAnimState.USE_COMPUTER;
      case 16: //DANCE
        return ModuleCreatureAnimState.DANCE;
      case 17: //DANCE1
        return ModuleCreatureAnimState.DANCE1;
      case 18: //HORROR
        return ModuleCreatureAnimState.HORROR;
      case 19: //READY
        return ModuleCreatureAnimState.READY;
      case 20: //DEACTIVATE
        return ModuleCreatureAnimState.DEACTIVATE;
      case 21: //SPASM
        return ModuleCreatureAnimState.SPASM;
      case 22: //SLEEP
        return ModuleCreatureAnimState.SLEEP;
      case 23: //PRONE
        return ModuleCreatureAnimState.PRONE;
      case 24: //PAUSE3
        return ModuleCreatureAnimState.PAUSE3;
      case 25: //WELD
        return ModuleCreatureAnimState.WELD;
      case 26: //DEAD
        return ModuleCreatureAnimState.DEAD;
      case 27: //TALK_INJURED
        return ModuleCreatureAnimState.TALK_INJURED;
      case 28: //LISTEN_INJURED
        return ModuleCreatureAnimState.LISTEN_INJURED;
      case 29: //TREAT_INJURED
        return ModuleCreatureAnimState.TREAT_INJURED_LP;
      case 30: //DEAD_PRONE
        return ModuleCreatureAnimState.DEAD_PRONE;
      case 31: //KNEEL_TALK_ANGRY
        return ModuleCreatureAnimState.KNEEL_TALK_ANGRY;
      case 32: //KNEEL_TALK_SAD
        return ModuleCreatureAnimState.KNEEL_TALK_SAD;
      case 35: //MEDITATE LOOP
        return ModuleCreatureAnimState.MEDITATE;
      case 100: //HEAD_TURN_LEFT
        return ModuleCreatureAnimState.HEAD_TURN_LEFT;
      case 101: //HEAD_TURN_RIGHT
        return ModuleCreatureAnimState.HEAD_TURN_RIGHT;
      case 102: //PAUSE_SCRATCH_HEAD
        return ModuleCreatureAnimState.PAUSE_SCRATCH_HEAD;
      case 103: //PAUSE_BORED
        return ModuleCreatureAnimState.PAUSE_BORED;
      case 104: //SALUTE
        return ModuleCreatureAnimState.SALUTE;
      case 105: //BOW
        return ModuleCreatureAnimState.BOW;
      case 106: //GREETING
        return ModuleCreatureAnimState.GREETING;
      case 107: //TAUNT
        return ModuleCreatureAnimState.TAUNT;
      case 108: //VICTORY1
        return ModuleCreatureAnimState.VICTORY;
      case 109: //VICTORY2
        return ModuleCreatureAnimState.VICTORY;
      case 110: //VICTORY3
        return ModuleCreatureAnimState.VICTORY;
      case 112: //INJECT
        return ModuleCreatureAnimState.INJECT;
      case 113: //USE_COMPUTER
        return ModuleCreatureAnimState.USE_COMPUTER;
      case 114: //PERSUADE
        return ModuleCreatureAnimState.PERSUADE;
      case 115: //ACTIVATE
        return ModuleCreatureAnimState.ACTIVATE_ITEM;
      case 116: //CHOKE
        return ModuleCreatureAnimState.CHOKE;
      case 117: //THROW_HIGH
        return ModuleCreatureAnimState.THROW_HIGH;
      case 118: //THROW_LOW
        return ModuleCreatureAnimState.THROW_LOW;
      case 119: //CUSTOM01
        return ModuleCreatureAnimState.CUSTOM01;
      case 120: //TREAT_INJURED
        return ModuleCreatureAnimState.TREAT_INJURED;
      case 123: //DIVE_ROLL
        return ModuleCreatureAnimState.DIVE_ROLL;

      // Placeable animation constants
      case 200: 
        return ModulePlaceableAnimState.ACTIVATE;
      case 201: 
        return ModulePlaceableAnimState.DEACTIVATE;
      case 202: 
        return ModulePlaceableAnimState.OPEN;
      case 203: 
        return ModulePlaceableAnimState.CLOSE;
      case 204: 
        return ModulePlaceableAnimState.ANIMLOOP01;
      case 205: 
        return ModulePlaceableAnimState.ANIMLOOP02;
      case 206: 
        return ModulePlaceableAnimState.ANIMLOOP03;
      case 207: 
        return ModulePlaceableAnimState.ANIMLOOP04;
      case 208: 
        return ModulePlaceableAnimState.ANIMLOOP05;
      case 209: 
        return ModulePlaceableAnimState.ANIMLOOP06;
      case 210: 
        return ModulePlaceableAnimState.ANIMLOOP07;
      case 211: 
        return ModulePlaceableAnimState.ANIMLOOP08;
      case 212: 
        return ModulePlaceableAnimState.ANIMLOOP09;
      case 213: 
        return ModulePlaceableAnimState.ANIMLOOP10;
    }

    //console.error('Animation case missing', id);
    return ModuleCreatureAnimState.PAUSE;
  }

  /**
   * Get the animation constant to animation
   * @param animation_constant 
   * @returns 
   */
  animationConstantToAnimation( animation_constant = 10000 ): ITwoDAAnimation{

    const animations2DA = GameState.TwoDAManager.datatables.get('animations');
    if(animations2DA){

      const debilitatedState = (() => {
        // Prefer highest SetState (retail field_0x8ed priority).
        if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleCreature)){
          const highest = getActiveSetStateType(this as ModuleCreature);
          if(highest > 0) return highest;
          // Retail ambient_animation_state = 9 while force-pushed.
          const ambient = (this as ModuleCreature).ambientAnimState | 0;
          if(ambient === ModuleCreatureAmbientState.PRONE_FORCE_PUSHED){
            return GameEffectSetStateType.FORCEPUSH;
          }
        }
        const e = this.effects.find(eff => eff?.type == GameEffectType.EffectSetState);
        return e ? (e.getInt(0) | 0) : 0;
      })();
      if(debilitatedState > 0){
        switch(debilitatedState){
          case 1: //Confused
            return animations2DA.rows[15];
          case 2: //Frightened
            return animations2DA.rows[73];
          case 3: //Droid Stun
            return animations2DA.rows[270];
          case 4: //Stunned
            return animations2DA.rows[78];
          case 5: //Paralyzed
            return animations2DA.rows[78];
          case 6: //Sleep
            return animations2DA.rows[76];
          case 7: //Choke
            if(this.isSimpleCreature()){
              return animations2DA.rows[264];
            }else{
              return animations2DA.rows[72];
            }
          break;
          case 8: //Horrified
            return animations2DA.rows[74];
          case 9: //Force Pushed
            if(!this.fp_push_played)
              return animations2DA.rows[84];
            if(!this.fp_land_played)
              return animations2DA.rows[85];
            if(!this.fp_getup_played)
              return animations2DA.rows[86];
          break;
          case 10: //Whirlwind
            return animations2DA.rows[75];
          case 14: //Knockdown hold (K2 SetState 0x0E)
            return animations2DA.rows[85];
          case 15: //Crush (K2) — choke-like victim pose; ambient 16 set separately
            if(this.isSimpleCreature()){
              return animations2DA.rows[264];
            }else{
              return animations2DA.rows[72];
            }
          case 16: //Droid Confused — confused pose; not IsDebilitated in retail
            return animations2DA.rows[15];
          case 17: //Held (K2 0x11) — choke-like lock
            if(this.isSimpleCreature()){
              return animations2DA.rows[264];
            }else{
              return animations2DA.rows[72];
            }
          case 18: //Mind Trick — stun cohort
          case 19: //Droid Scramble — stun cohort
            return animations2DA.rows[78];
        }
      }
      
      switch( animation_constant ){
        case ModuleCreatureAnimState.PAUSE:
        case ModuleCreatureAnimState.PAUSE_ALT:
          if(this.isPoisoned() || this.isDiseased()) return animations2DA.rows[15];
          if(this.isSimpleCreature()){
            return animations2DA.rows[256];
          }else{
            return this.isInjured() ? animations2DA.rows[8] : animations2DA.rows[6];
          }
        break;
        case ModuleCreatureAnimState.PAUSE2:
          if(this.isPoisoned() || this.isDiseased()) return animations2DA.rows[15];
          if(this.isSimpleCreature()){
            return animations2DA.rows[257];
          }else{
            return this.isInjured() ? animations2DA.rows[8] : animations2DA.rows[7];
          }
        break;
        case ModuleCreatureAnimState.PAUSE3:
          if(this.isPoisoned() || this.isDiseased()) return animations2DA.rows[15];
          return this.isInjured() ? animations2DA.rows[8] : animations2DA.rows[359];
        break;
        case ModuleCreatureAnimState.PAUSE4:
          if(this.isPoisoned() || this.isDiseased()) return animations2DA.rows[15];
          return this.isInjured() ? animations2DA.rows[8] : animations2DA.rows[357];
        break;
        case ModuleCreatureAnimState.PAUSE_SCRATCH_HEAD:
          if(this.isPoisoned()) return animations2DA.rows[15];
          if(this.isSimpleCreature()){
            return animations2DA.rows[12];
          }else{
            return this.isInjured() ? animations2DA.rows[8] : animations2DA.rows[7];
          }
        break;
        case ModuleCreatureAnimState.PAUSE_BORED:
          return animations2DA.rows[13];
        break;
        case ModuleCreatureAnimState.PAUSE_TIRED:
          return animations2DA.rows[14];
        break;
        case ModuleCreatureAnimState.PAUSE_DRUNK:
          return animations2DA.rows[15];
        break;
        case ModuleCreatureAnimState.PAUSE_INJ:
          return animations2DA.rows[8];
        break;
        case ModuleCreatureAnimState.DEAD:
          if(this.isSimpleCreature()){
            return animations2DA.rows[275];
          }else{
            return animations2DA.rows[81];
          }
        break;
        case ModuleCreatureAnimState.DEAD1:
          if(this.isSimpleCreature()){
            return animations2DA.rows[275];
          }else{
            return animations2DA.rows[83];
          }
        break;
        case ModuleCreatureAnimState.DIE:
          if(this.isSimpleCreature()){
            return animations2DA.rows[274];
          }else{
            return animations2DA.rows[80];
          }
        break;
        case ModuleCreatureAnimState.DIE1:
          return animations2DA.rows[82];
        break;
        case ModuleCreatureAnimState.GET_UP_DEAD:
          return animations2DA.rows[381];
        break;
        case ModuleCreatureAnimState.GET_UP_DEAD1:
          return animations2DA.rows[382];
        break;
        case ModuleCreatureAnimState.WALK_INJ:
          if(this.isSimpleCreature()){
            return animations2DA.rows[254];
          }else{
            return animations2DA.rows[1];
          }
        break;
        case ModuleCreatureAnimState.WALKING:
          if(this.isSimpleCreature()){
            return this.isInjured() ? animations2DA.rows[254] : animations2DA.rows[253];
          }else{
            if(!this.isInjured()){
              switch(this.getCombatAnimationWeaponType()){
                case 2:
                  return animations2DA.rows[338];
                case 3:
                  return animations2DA.rows[341];
                case 4:
                  return animations2DA.rows[339];
                case 7:
                  return animations2DA.rows[340];
                case 9:
                  return animations2DA.rows[340];
                default:
                  return animations2DA.rows[0];
              }
            }else{
              return animations2DA.rows[1];
            }
          }
        break;
        // Retail anim 0x2713 — walk-back uses same weapon walk set (reverse playback)
        case ModuleCreatureAnimState.WALKING_BACK:
          if(this.isSimpleCreature()){
            return animations2DA.rows[253];
          }else{
            if(!this.isInjured()){
              switch(this.getCombatAnimationWeaponType()){
                case 2:
                  return animations2DA.rows[338];
                case 3:
                  return animations2DA.rows[341];
                case 4:
                  return animations2DA.rows[339];
                case 7:
                  return animations2DA.rows[340];
                case 9:
                  return animations2DA.rows[340];
                default:
                  return animations2DA.rows[0];
              }
            }else{
              return animations2DA.rows[1];
            }
          }
        break;
        case ModuleCreatureAnimState.RUNNING:
          if(this.isSimpleCreature()){
            return animations2DA.rows[255];
          }else{
            if(!this.isInjured()){
              switch(this.getCombatAnimationWeaponType()){
                case 1:
                  return animations2DA.rows[343];
                case 2:
                  return animations2DA.rows[345];
                case 3:
                  return animations2DA.rows[345];
                case 4:
                  return animations2DA.rows[3];
                case 7:
                  return animations2DA.rows[340];
                case 9:
                  return animations2DA.rows[340];
                default:
                  return animations2DA.rows[2];
              }
            }else{
              return animations2DA.rows[4];
            }
          }
        break;
        case ModuleCreatureAnimState.RUN_INJ:
          return animations2DA.rows[4];
        break;
        //COMBAT READY
        case ModuleCreatureAnimState.READY:
        case ModuleCreatureAnimState.READY_ALT:
          if(this.isSimpleCreature()){
            return animations2DA.rows[278];
          }else{
            switch(this.getCombatAnimationWeaponType()){
              case 1:
                return animations2DA.rows[92];
              case 2:
                return animations2DA.rows[133];
              case 3:
                return animations2DA.rows[174];
              case 4:
                return animations2DA.rows[215];
              case 5:
                return animations2DA.rows[223];
              case 6:
                return animations2DA.rows[237];
              case 7:
                return animations2DA.rows[245];
              case 9:
                return animations2DA.rows[84]; //84 == pushed | 85 == hit ground prone back | 86 == get up from ground prone
              default:
                return animations2DA.rows[249];
            }
          }
        break;
        case ModuleCreatureAnimState.DODGE:
          if(this.isSimpleCreature()){
            return animations2DA.rows[281];
          }else{
            return animations2DA.rows[302];
          }
        break;
        case ModuleCreatureAnimState.PARRY:
          // Same pose family as dodge for SetAnimation(PARRY) fallback
          if(this.isSimpleCreature()){
            return animations2DA.rows[281];
          }else{
            return animations2DA.rows[302];
          }
        break;
        case ModuleCreatureAnimState.SPASM:
          if(this.isSimpleCreature()){
            return animations2DA.rows[268];
          }else{
            return animations2DA.rows[77];
          }
        break;
        case ModuleCreatureAnimState.TAUNT:
          if(this.isSimpleCreature()){
            return animations2DA.rows[263];
          }else{
            return animations2DA.rows[33];
          }
        break;
        case ModuleCreatureAnimState.GREETING:
          return animations2DA.rows[31];
        break;
        case ModuleCreatureAnimState.LISTEN:
          return animations2DA.rows[18];
        break;
        case ModuleCreatureAnimState.LISTEN_INJURED:
          return animations2DA.rows[371];
        break;
        case ModuleCreatureAnimState.TALK_NORMAL:
          return animations2DA.rows[25];
        break;
        case ModuleCreatureAnimState.TALK_PLEADING:
          return animations2DA.rows[27];
        break;
        case ModuleCreatureAnimState.TALK_FORCEFUL:
          return animations2DA.rows[26];
        break;
        case ModuleCreatureAnimState.TALK_LAUGHING:
          return animations2DA.rows[29];
        break;
        case ModuleCreatureAnimState.TALK_SAD:
          return animations2DA.rows[28];
        break;
        case ModuleCreatureAnimState.TALK_INJURED:
          return animations2DA.rows[370];
        break;
        case ModuleCreatureAnimState.SALUTE:
          return animations2DA.rows[16];
        break;
        case ModuleCreatureAnimState.BOW:
          return animations2DA.rows[19];
        break;
        case ModuleCreatureAnimState.VICTORY:
          if(this.isSimpleCreature()){
            return animations2DA.rows[260];
          }else{
            return animations2DA.rows[17];
          }
        break;
        case ModuleCreatureAnimState.HEAD_TURN_LEFT:
          if(this.isSimpleCreature()){
            return animations2DA.rows[258];
          }else{
            return animations2DA.rows[11];
          }
        break;
        case ModuleCreatureAnimState.HEAD_TURN_RIGHT:
          if(this.isSimpleCreature()){
            return animations2DA.rows[259];
          }else{
            return animations2DA.rows[10];
          }
        break;
        case ModuleCreatureAnimState.TURN_LEFT:
          if(this.isSimpleCreature()){
            return animations2DA.rows[253];
          }else{
            return animations2DA.rows[290];
          }
        break;
        case ModuleCreatureAnimState.TURN_RIGHT:
          if(this.isSimpleCreature()){
            return animations2DA.rows[253];
          }else{
            return animations2DA.rows[291];
          }
        break;
        case ModuleCreatureAnimState.GET_LOW:
          return animations2DA.rows[40];
        break;
        case ModuleCreatureAnimState.GET_MID:
          return animations2DA.rows[41];
        break;
        case ModuleCreatureAnimState.INJECT:
          return animations2DA.rows[37];
        break;
        case ModuleCreatureAnimState.DAMAGE:
          return animations2DA.rows[303];
        break;
        case ModuleCreatureAnimState.USE_COMPUTER_LP:
          return animations2DA.rows[44];
        break;
        case ModuleCreatureAnimState.WHIRLWIND:
          return animations2DA.rows[75];
        break;
        case ModuleCreatureAnimState.DEACTIVATE:
          return animations2DA.rows[270];
        break;
        case ModuleCreatureAnimState.FLIRT:
          return animations2DA.rows[32];
        break;
        case ModuleCreatureAnimState.USE_COMPUTER:
          return animations2DA.rows[43];
        break;
        case ModuleCreatureAnimState.DANCE:
          return animations2DA.rows[53];
        break;
        case ModuleCreatureAnimState.DANCE1:
          return animations2DA.rows[54];
        break;
        case ModuleCreatureAnimState.HORROR:
          return animations2DA.rows[74];
        break;
        case ModuleCreatureAnimState.USE_COMPUTER2:
          return animations2DA.rows[43];
        break;
        case ModuleCreatureAnimState.PERSUADE:
          return animations2DA.rows[68];
        break;
        case ModuleCreatureAnimState.ACTIVATE_ITEM:
          return animations2DA.rows[38];
        break;
        case ModuleCreatureAnimState.UNLOCK_DOOR:
          return animations2DA.rows[47];
        break;
        case ModuleCreatureAnimState.THROW_HIGH:
          return animations2DA.rows[57];
        break;
        case ModuleCreatureAnimState.THROW_LOW:
          return animations2DA.rows[58];
        break;
        case ModuleCreatureAnimState.UNLOCK_CONTAINER:
          return animations2DA.rows[48];
        break;
        case ModuleCreatureAnimState.DISABLE_MINE:
          return animations2DA.rows[51];
        break;
        case ModuleCreatureAnimState.WALK_STEALTH:
          return animations2DA.rows[5];
        break;
        case ModuleCreatureAnimState.UNLOCK_DOOR2:
          return animations2DA.rows[47];
        break;
        case ModuleCreatureAnimState.UNLOCK_CONTAINER2:
          return animations2DA.rows[48];
        break;
        case ModuleCreatureAnimState.ACTIVATE_ITEM2:
          return animations2DA.rows[38];
        break;
        case ModuleCreatureAnimState.SLEEP:
          return animations2DA.rows[76];
        break;
        case ModuleCreatureAnimState.PARALYZED:
          return animations2DA.rows[78];
        break;
        case ModuleCreatureAnimState.PRONE:
          return animations2DA.rows[79];
        break;
        case ModuleCreatureAnimState.SET_MINE:
          return animations2DA.rows[52];
        break;
        case ModuleCreatureAnimState.DISABLE_MINE2:
          return animations2DA.rows[51];
        break;
        case ModuleCreatureAnimState.CUSTOM01:
          return animations2DA.rows[346];
        break;
        case ModuleCreatureAnimState.FBLOCK:
          return animations2DA.rows[355];
        break;
        case ModuleCreatureAnimState.CHOKE:
          if(this.isSimpleCreature()){
            return animations2DA.rows[264];
          }else{
            return animations2DA.rows[72];
          }
        break;
        case ModuleCreatureAnimState.WELD:
          return animations2DA.rows[360];
        break;
        case ModuleCreatureAnimState.TREAT_INJURED:
          return animations2DA.rows[34];
        break;
        case ModuleCreatureAnimState.TREAT_INJURED_LP:
          return animations2DA.rows[35];
        break;
        case ModuleCreatureAnimState.CATCH_SABER:
          return animations2DA.rows[71];
        break;
        case ModuleCreatureAnimState.THROW_SABER_LP:
          return animations2DA.rows[70];
        break;
        case ModuleCreatureAnimState.THROW_SABER:
          return animations2DA.rows[69];
        break;
        case ModuleCreatureAnimState.KNEEL_TALK_ANGRY:
          return animations2DA.rows[384];
        break;
        case ModuleCreatureAnimState.KNEEL_TALK_SAD:
          return animations2DA.rows[385];
        break;
        case ModuleCreatureAnimState.KNOCKED_DOWN:
          return animations2DA.rows[85];
        break;
        case ModuleCreatureAnimState.KNOCKED_DOWN2:
          return animations2DA.rows[85];
        break;
        case ModuleCreatureAnimState.DEAD_PRONE:
          return animations2DA.rows[375];
        break;
        case ModuleCreatureAnimState.KNEEL:
          return animations2DA.rows[23];
        break;
        case ModuleCreatureAnimState.KNEEL1:
          return animations2DA.rows[23];
        break;
        // MELEE_WIELD (10157 / 0x27ad) — SetOverlayAnimation while moving (PlayerFlourishWeapons).
        case ModuleCreatureAnimState.MELEE_WIELD:
          return animations2DA.rows[meleeWieldAnimationRow(this.getCombatAnimationWeaponType())];
        // MELEE_COMBAT_WIELD (10158 / 0x27ae) — standing InsertFireForgetAnimation path.
        case ModuleCreatureAnimState.MELEE_COMBAT_WIELD:
          return animations2DA.rows[meleeCombatWieldAnimationRow(this.getCombatAnimationWeaponType())];
        case ModuleCreatureAnimState.FLOURISH:
          return animations2DA.rows[flourishAnimationRow(this.getCombatAnimationWeaponType())];
        break;
        
        //BEGIN TSL ANIMATIONS
        case ModuleCreatureAnimState.TOUCH_HEART:
          return animations2DA.rows[462];
        break;
        case ModuleCreatureAnimState.ROLL_EYES:
          return animations2DA.rows[463];
        break;
        case ModuleCreatureAnimState.USE_ITEM_ON_OTHER:
          return animations2DA.rows[464];
        break;
        case ModuleCreatureAnimState.STAND_ATTENTION:
          return animations2DA.rows[465];
        break;
        case ModuleCreatureAnimState.NOD_YES:
          return animations2DA.rows[466];
        break;
        case ModuleCreatureAnimState.NOD_NO:
          return animations2DA.rows[467];
        break;
        case ModuleCreatureAnimState.POINT:
          return animations2DA.rows[468];
        break;
        case ModuleCreatureAnimState.POINT_LP:
          return animations2DA.rows[469];
        break;
        case ModuleCreatureAnimState.POINT_DOWN:
          return animations2DA.rows[470];
        break;
        case ModuleCreatureAnimState.SCANNING:
          return animations2DA.rows[471];
        break;
        case ModuleCreatureAnimState.SHRUG:
          return animations2DA.rows[472];
        break;
        case ModuleCreatureAnimState.SIT_CHAIR:
          return animations2DA.rows[316];
        break;
        case ModuleCreatureAnimState.SIT_CHAIR_DRUNK:
          return animations2DA.rows[317];
        break;
        case ModuleCreatureAnimState.SIT_CHAIR_PAZAAK:
          return animations2DA.rows[318];
        break;
        case ModuleCreatureAnimState.SIT_CHAIR_COMP1:
          return animations2DA.rows[316];
        break;
        case ModuleCreatureAnimState.SIT_CHAIR_COMP2:
          return animations2DA.rows[316];
        break;
        case ModuleCreatureAnimState.CUT_HANDS:
          return animations2DA.rows[557];
        break;
        case ModuleCreatureAnimState.L_HAND_CHOP:
          return animations2DA.rows[558];
        break;
        case ModuleCreatureAnimState.COLLAPSE:
          return animations2DA.rows[559];
        break;
        case ModuleCreatureAnimState.COLLAPSE_LP:
          return animations2DA.rows[560];
        break;
        case ModuleCreatureAnimState.COLLAPSE_STAND:
          return animations2DA.rows[561];
        break;
        case ModuleCreatureAnimState.BAO_DUR_POWER_PUNCH:
          return animations2DA.rows[562];
        break;
        case ModuleCreatureAnimState.POINT_UP:
          return animations2DA.rows[563];
        break;
        case ModuleCreatureAnimState.POINT_UP_LOWER:
          return animations2DA.rows[564];
        break;
        case ModuleCreatureAnimState.HOOD_OFF:
          return animations2DA.rows[565];
        break;
        case ModuleCreatureAnimState.HOOD_ON:
          return animations2DA.rows[566];
        break;
        case ModuleCreatureAnimState.DIVE_ROLL:
          return animations2DA.rows[567];
        break;
        //END TSL ANIMATIONS

      }

    }

  }

  /**
   * Set the facing
   * @param facing 
   * @param instant 
   */
  setFacing(facing = 0, instant = false, speed = TURN_SPEED_SLOW){
    this.wasFacing = Utility.NormalizeRadian(this.rotation.z);
    this.facing = Utility.NormalizeRadian(facing);
    this.facingAnim = !instant;
    this.facingSpeed = speed;

    if(instant){
      this.rotation.z = this.wasFacing = this.facing;
    }
  }

  /**
   * On hover input event
   */
  onHover(){
    
  }

  /**
   * On click input event
   * @param callee 
   */
  onClick(callee: ModuleObject){

  }

  /**
   * Trigger the user defined event
   * Retail: CSWSArea::EventHandler SignalEvent 0x0B @ 0050d6c0 runs script_on_user_defined;
   * CSWSModule::EventHandler case 0x0B @ 004c5120 runs Mod_OnUsrDefined.
   * @param event
   */
  triggerUserDefinedEvent( event: NWScriptEvent ){
    if(!(event instanceof NWScriptEvent)){ return; }

    let onUserDefined: NWScriptInstance;
    if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleCreature)){
      onUserDefined = this.scripts[ModuleObjectScript.CreatureOnUserDefined];
    }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModulePlaceable)){
      onUserDefined = this.scripts[ModuleObjectScript.PlaceableOnUserDefined];
    }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleDoor)){
      onUserDefined = this.scripts[ModuleObjectScript.DoorOnUserDefined];
    }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleTrigger)){
      onUserDefined = this.scripts[ModuleObjectScript.TriggerOnUserDefined];
    }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleArea)){
      onUserDefined = this.scripts[ModuleObjectScript.AreaOnUserDefined];
    }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleAreaOfEffect)){
      onUserDefined = this.scripts[ModuleObjectScript.AoEOnUserDefined];
    }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleEncounter)){
      onUserDefined = this.scripts[ModuleObjectScript.EncounterOnUserDefined];
    }
    
    if(!onUserDefined){ return; }
    // Match onDamaged / onSpellAt: always newInstance(). Reusing the stored
    // template instance can leave STORE_STATE / stack residue across UD events
    // (Deadeye duel latch GetLocalBoolean(0) observed stuck after a partial run).
    const instance = onUserDefined.nwscript
      ? onUserDefined.nwscript.newInstance()
      : onUserDefined.newInstance();
    instance.run(this, parseInt(event.getInt(0)));
  }

  /**
   * Trigger the spell cast at event
   * Retail creature EventHandler case 2 @ 004ff7a0 / placeable-door @ 005883d4:
   * harmful → BroadcastCombatStateToParty + SetExcitedState.
   * @param event
   */
  triggerSpellCastAtEvent( event: NWScriptEvent ){
    if(!(event instanceof NWScriptEvent)){ return; }

    const caster = event.getObject(0);
    const harmful = !!event.getInt(1);

    if(harmful && BitWise.InstanceOfObject(caster, ModuleObjectType.ModuleCreature)){
      const c = caster as ModuleCreature;
      if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleCreature)){
        // Creature target: engage both sides (retail @ 004ff835 / 004ff863)
        const target = this as any as ModuleCreature;
        c.broadcastCombatStateToParty(target);
        c.setExcitedState(ExcitedDurationRow.SpellCast);
        c.removeCombatInvisibilityEffects();
        target.broadcastCombatStateToParty(c);
        target.setExcitedState(ExcitedDurationRow.Damage);
      }else{
        // Door / placeable: engage caster only (retail @ 005883d4)
        c.broadcastCombatStateToParty();
        c.setExcitedState(ExcitedDurationRow.SpellCast);
        c.removeCombatInvisibilityEffects();
      }
    }

    let onSpellAt: NWScriptInstance;
    if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleCreature)){
      onSpellAt = this.scripts[ModuleObjectScript.CreatureOnSpellAt];
    }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModulePlaceable)){
      onSpellAt = this.scripts[ModuleObjectScript.PlaceableOnSpellCastAt];
    }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleDoor)){
      onSpellAt = this.scripts[ModuleObjectScript.DoorOnSpellCastAt];
    }

    if(!onSpellAt){ return; }
    const instance = onSpellAt.nwscript.newInstance();
    instance.lastSpellCaster = caster;
    instance.lastSpell = event.getInt(0);
    instance.lastSpellHarmful = harmful;
    instance.run(this);
  }

  /**
   * Script event handler
   * @param event 
   */
  scriptEventHandler( event: NWScriptEvent ){
    // console.log('scriptEventHandler', this.tag, event);
    if(event instanceof NWScriptEvent){
      switch(event.type){
        case NWScriptEventType.EventUserDefined:
          this.triggerUserDefinedEvent( event );
        break;
        case NWScriptEventType.EventSpellCastAt:
          this.triggerSpellCastAtEvent( event );
        break;
        default:
          console.error('scriptEventHandler', 'Unhandled Event', event, this);
        break;
      }
    }
  }

  /**
   * Trigger the heartbeat
   */
  triggerHeartbeat(){
    //Only allow the heartbeat script to run after the onspawn is called
    if(!(this.spawned === true && GameState.module.readyToProcessEvents)){
      return;
    }

    let onHeartbeat: NWScriptInstance;
    if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleCreature)){
      onHeartbeat = this.scripts[ModuleObjectScript.CreatureOnHeartbeat];
    }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModulePlaceable)){
      onHeartbeat = this.scripts[ModuleObjectScript.PlaceableOnHeartbeat];
    }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleDoor)){
      onHeartbeat = this.scripts[ModuleObjectScript.DoorOnHeartbeat];
    }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleTrigger)){
      onHeartbeat = this.scripts[ModuleObjectScript.TriggerOnHeartbeat];
    }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleEncounter)){
      onHeartbeat = this.scripts[ModuleObjectScript.EncounterOnHeartbeat];
    }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleMGObstacle)){
      onHeartbeat = this.scripts[ModuleObjectScript.MGObstacleOnHeartbeat];
    }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleMGEnemy)){
      onHeartbeat = this.scripts[ModuleObjectScript.MGEnemyOnHeartbeat];
    }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleMGPlayer)){
      onHeartbeat = this.scripts[ModuleObjectScript.MGPlayerOnHeartbeat];
    }
    if(!onHeartbeat){ return; }

    onHeartbeat.run(this);
  }

  /**
   * Get the appearance
   * @returns 
   */
  getAppearance(): SWPlaceableAppearance|SWCreatureAppearance|SWDoorAppearance {
    return;
  }

  /**
   * On spawn
   * @param runScript 
   */
  onSpawn(runScript = true){

    let onSpawn: NWScriptInstance;
    if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleCreature)){
      onSpawn = this.scripts[ModuleObjectScript.CreatureOnSpawn];
    }

    if(runScript && onSpawn){
      onSpawn.run(this, 0);
      console.log('spawned', this.getName());
    }
    
    this.spawned = true;
    
    this.initEffects();
    this.computeBoundingBox();
  }

  /**
   * Get the name
   * @returns 
   */
  getName(): any {
    console.warn("Method not implemented.", this.tag);
    return '';
  }

  /**
   * Get the race
   * @returns 
   */
  getRace(): any {
    console.warn("Method not implemented.", this.tag);
    return 0;
  }

  //----------------------//
  // INVENTORY MANAGEMENT
  //----------------------//

  /**
   * Check if the object has the item by tag
   * @param sTag 
   * @returns 
   */
  hasItemByTag(sTag=''){
    sTag = sTag.toLowerCase();
    if(this.isPartyMember()){
      return !!GameState.InventoryManager.getItemByTag(sTag);
    }

    for(let i = 0; i < this.inventory.length; i++){
      const cItem = this.inventory[i];
      if(cItem.tag.toLocaleLowerCase() == sTag)
        return true;
    }
    
    return false;
  }

  /**
   * Add the item
   * @param item 
   * @returns 
   */
  addItem(item: ModuleItem){
    item.load();
    
    const eItem = this.getItemByTag(item.getTag());
    if(eItem){
      eItem.setStackSize(eItem.getStackSize() + item.getStackSize());
      return eItem;
    }else{
      this.inventory.push(item);
      return item;
    }
  }

  /**
   * Remove the item
   * @param item 
   * @param nCount 
   * @returns 
   */
  removeItem(item: ModuleItem, nCount = 1): ModuleItem {
    const eItem = this.getItemByTag(item.getTag());

    if(!eItem){
      return undefined;
    }

    const idx = this.inventory.indexOf(eItem);

    if(nCount < eItem.getStackSize()){
      eItem.setStackSize(eItem.getStackSize() - nCount);
    }else{
      this.inventory.splice(idx, 1);
    }

    return eItem.clone();
  }

  /**
   * Remove the item by tag
   * @param sTag 
   * @param nCount 
   * @returns 
   */
  removeItemByTag(sTag = '', nCount = 1): ModuleItem {
    const eItem = this.getItemByTag(sTag);

    if(!eItem){
      return undefined;
    }

    const idx = this.inventory.indexOf(eItem);

    if(nCount < eItem.getStackSize()){
      eItem.setStackSize(eItem.getStackSize() - nCount);
    }else{
      this.inventory.splice(idx, 1);
    }

    return eItem.clone();
  }

  /**
   * Get the item
   * @param oItem 
   * @returns 
   */
  getItem(oItem: ModuleItem): ModuleItem {
    if(!oItem){ return undefined; }

    for(let i = 0; i < this.inventory.length; i++){
      const cItem = this.inventory[i];
      if(cItem == oItem)
        return cItem;
    }
    return undefined;
  }

  /**
   * Get the item by tag
   * @param sTag 
   * @returns 
   */
  getItemByTag(sTag = ''): ModuleItem {
    if(this.isPartyMember()){
      return GameState.InventoryManager.getItemByTag(sTag) as ModuleItem;
    }

    for(let i = 0; i < this.inventory.length; i++){
      let item = this.inventory[i];
      if(item.getTag() == sTag)
        return item;
    }
    return;
  }

  /**
   * Get the gold
   * @returns 
   */
  getGold(): number {
    if(this.isPartyMember()){
      return GameState.PartyManager.Gold;
    }
    return 0;
  }

  /**
   * Add gold
   * @param nGold 
   */
  addGold(nGold = 0): void {
    if(this.isPartyMember()){
      GameState.PartyManager.AddGold(nGold);
      return;
    }
  }

  /**
   * Remove gold
   * @param nGold 
   */
  removeGold(nGold = 0): void {
    if(this.isPartyMember()){
      GameState.PartyManager.AddGold(-Math.abs(nGold));
      return;
    }
  }

  /**
   * Update the collision
   * @param delta 
   */
  updateCollision(delta: number = 0){
    //stub
  }

  /**
   * Do a command
   * @param script 
   */
  doCommand(script: NWScriptInstance){
    //console.log('doCommand', this.getTag(), script, action, instruction);
    let action = new GameState.ActionFactory.ActionDoCommand();
    action.setParameter(0, ActionParameterType.SCRIPT_SITUATION, script);
    this.actionQueue.add(action);
  }

  /**
   * Add a trap
   * @param nTrapId 
   * @param owner 
   */
  addTrap(nTrapId: number = -1, owner: ModuleObject){
    const trap = GameState.TwoDAManager.datatables.get('traps')?.rows[nTrapId];
    if(!trap){ return; }

    if(trap.trapscript?.length && trap.trapscript != '****'){
      const nwscript = NWScript.Load(trap.trapscript);
      nwscript.caller = this;
      if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleTrigger)){
        this.scripts[ModuleObjectScript.TriggerOnTrapTriggered] = nwscript;
      }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModulePlaceable)){
        this.scripts[ModuleObjectScript.PlaceableOnTrapTriggered] = nwscript;
      }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleDoor)){
        this.scripts[ModuleObjectScript.DoorOnTrapTriggered] = nwscript;
      }
    }

    this.trapType = nTrapId;

    this.ownerDemolitions = owner.getSkillLevel(SkillType.DEMOLITIONS);
    const d20 = 20;

    const nDetectDC = !isNaN(parseInt(trap.detectdcmod)) ? parseInt(trap.detectdcmod) : 0;
    this.trapDetectDC = nDetectDC + d20 + this.ownerDemolitions;
    this.trapDetectable = true;

    const nDisarmDC = !isNaN(parseInt(trap.disarmdcmod)) ? parseInt(trap.disarmdcmod) : 0;
    this.trapDisarmDC = nDisarmDC + d20 + this.ownerDemolitions;
    this.trapDisarmable = true;

    const trigger = new GameState.Module.ModuleArea.ModuleTrigger();
    trigger.initialized = true;
    trigger.name = GameState.TLKManager.GetStringById(parseInt(trap.name))?.Value;
    trigger.factionId = owner.factionId;
    trigger.type = ModuleTriggerType.TRAP;
    trigger.trapType = nTrapId;
    trigger.setByPlayerParty = owner.isPartyMember();
    trigger.trapDetectDC = this.trapDetectDC;
    trigger.trapDisarmDC = this.trapDisarmDC;
    trigger.trapDetectable = true;
    trigger.trapDisarmable = true;
    trigger.ownerDemolitions = -1;
    trigger.position.copy(this.position);

    trigger.linkedToObject = this;
    this.linkedToObject = trigger;

    // Retail CreateNewGeometry(2.0) + traps.2da resref for RecoverMine
    trigger.trapResRef = trapKitResRefFromRow(trap);
    applyTrapGroundGeometry(trigger);

    trigger.load();

    this.area.triggers.push(trigger);
  }

  /**
   * Plant a free-ground trap trigger at a world position (not hosted on a creature/door).
   */
  static plantGroundTrap(
    area: ModuleArea,
    nTrapId: number,
    position: THREE.Vector3 | { x: number; y: number; z: number },
    owner: ModuleObject
  ){
    if(!area){ return undefined; }
    const trap = GameState.TwoDAManager.datatables.get('traps')?.rows[nTrapId];
    if(!trap){ return undefined; }

    const d20 = 20;
    const ownerDemolitions = owner.getSkillLevel(SkillType.DEMOLITIONS);
    const nDetectDC = !isNaN(parseInt(trap.detectdcmod)) ? parseInt(trap.detectdcmod) : 0;
    const nDisarmDC = !isNaN(parseInt(trap.disarmdcmod)) ? parseInt(trap.disarmdcmod) : 0;

    const trigger = new GameState.Module.ModuleArea.ModuleTrigger();
    trigger.initialized = true;
    trigger.name = GameState.TLKManager.GetStringById(parseInt(trap.name))?.Value;
    trigger.factionId = owner.factionId;
    trigger.type = ModuleTriggerType.TRAP;
    trigger.trapType = nTrapId;
    trigger.setByPlayerParty = owner.isPartyMember();
    trigger.trapDetectDC = nDetectDC + d20 + ownerDemolitions;
    trigger.trapDisarmDC = nDisarmDC + d20 + ownerDemolitions;
    trigger.trapDetectable = true;
    trigger.trapDisarmable = true;
    trigger.ownerDemolitions = ownerDemolitions;
    trigger.position.set(position.x, position.y, position.z);
    trigger.area = area;

    if(trap.trapscript?.length && trap.trapscript != '****'){
      const nwscript = NWScript.Load(trap.trapscript);
      nwscript.caller = trigger;
      trigger.scripts[ModuleObjectScript.TriggerOnTrapTriggered] = nwscript;
    }

    // Retail CreateNewGeometry(2.0, plantPos) @ SetMine; resref for RecoverMine kit
    trigger.trapResRef = trapKitResRefFromRow(trap);
    applyTrapGroundGeometry(trigger);

    trigger.load();
    area.triggers.push(trigger);
    return trigger;
  }

  /**
   * Pass AL — SetTrapDetectedBy / GetTrapDetectedBy (retail DetectedBy object-id lists).
   * Returns TRUE when the detector was newly added or already present.
   */
  setTrapDetectedBy(detector: ModuleObject): boolean {
    if(!detector || detector.id == null){
      return false;
    }
    const id = detector.id;
    if(this.trapDetectedByIds.indexOf(id) < 0){
      this.trapDetectedByIds.push(id);
    }
    this.trapDetected = true;
    if(BitWise.InstanceOfObject(detector, ModuleObjectType.ModuleCreature)){
      (detector as ModuleCreature).lastTrapDetected = this;
    }
    return true;
  }

  /** Pass AL — TRUE if oCreature's id is on this trap's DetectedBy list. */
  isTrapDetectedBy(creature: ModuleObject): boolean {
    if(!creature || creature.id == null){
      return false;
    }
    return this.trapDetectedByIds.indexOf(creature.id) >= 0;
  }

  //---------------//
  // STATUS CHECKS
  //---------------//

  /**
   * Check if the object is in conversation
   * @returns 
   */
  isInConversation(){
    return (GameState.Mode == EngineMode.DIALOG) && (GameState.CutsceneManager.owner == this || GameState.CutsceneManager.listener == this);
  }

  /**
   * Check if the object is dead
   * @returns 
   */
  isDead(){
    return this.getHP() <= 0;
  }

  /**
   * Retail CSWSCreature::IsInjured @ 004eff30 — current/max < 0.2.
   * Invalid max HP must not count as injured (avoids 0/0 → NaN → pauseinj on load).
   */
  isInjured(){
    const max = this.getMaxHP();
    if(!(max > 0)) return false;
    return this.getHP() / max < 0.2;
  }

  /**
   * Check if the object is debilitated
   * @returns 
   */
  isDebilitated() {
    return false;
  }

  /**
   * Check if the object is stunned
   * @returns 
   */
  isStunned() {
    return false;
  }

  /**
   * Check if the object is paralyzed
   * @returns 
   */
  isParalyzed() {
    return false;
  }

  /**
   * Check if the object is poisoned
   * @returns 
   */
  isPoisoned() {
    return false;
  }

  /**
   * Check if the object is diseased
   * @returns 
   */
  isDiseased(): any {
    return false;
  }

  /**
   * Get the combat animation weapon type
   * @returns 
   */
  getCombatAnimationWeaponType() {
    return 0
  }

  /**
   * Check if the object is dueling
   * @returns 
   */
  isDueling(): boolean {
    return false;
  }

  /**
   * Check if the action is in range
   * @param action 
   * @returns 
   */
  actionInRange(action: Action){
    return true;
  }

  //---------------//
  // SCRIPT EVENTS
  //---------------//

  /**
   * On damaged
   */
  onDamaged(){
    if(this.isDead())
      return true;

    // Retail OnApplyDamage door/placeable @ 004e055f — BroadcastCombatStateToParty(attacker, INVALID)
    if(
      BitWise.InstanceOfObject(this, ModuleObjectType.ModulePlaceable) ||
      BitWise.InstanceOfObject(this, ModuleObjectType.ModuleDoor)
    ){
      const damager = this.combatData.lastDamager ?? this.combatData.lastAttacker;
      if(BitWise.InstanceOfObject(damager, ModuleObjectType.ModuleCreature)){
        (damager as ModuleCreature).broadcastCombatStateToParty();
      }
    }

    let onDamaged: NWScriptInstance;
    if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleCreature)){
      onDamaged = this.scripts[ModuleObjectScript.CreatureOnDamaged];
    }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModulePlaceable)){
      onDamaged = this.scripts[ModuleObjectScript.PlaceableOnDamaged];
    }else if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleDoor)){
      onDamaged = this.scripts[ModuleObjectScript.DoorOnDamaged];
    }

    if(onDamaged){
      onDamaged.run(this);
    }
  }

  /**
   * On death
   */
  onDeath(){
    //stub
  }

  /**
   * On combat round end
   */
  onCombatRoundEnd() {
    //stub
  }

  /**
   * On dialog
   * @param oSpeaker 
   * @param listenPatternNumber 
   * @param conversation 
   * @returns 
   */
  onDialog(oSpeaker: ModuleObject, listenPatternNumber = -1, conversation: DLGObject = undefined, _matchedSubstrings: string[] = []): boolean {
    //stub
    return false;
  }

  /**
   * On attacked — placeable uses retail EventHandler 0xf attacker broadcast.
   * Creatures / doors override with their own handlers.
   */
  onAttacked(attackType: CombatActionType){
    if(BitWise.InstanceOfObject(this, ModuleObjectType.ModulePlaceable)){
      const attacker = this.combatData.lastAttacker;
      if(BitWise.InstanceOfObject(attacker, ModuleObjectType.ModuleCreature)){
        const atk = attacker as ModuleCreature;
        atk.broadcastCombatStateToParty();
        atk.removeCombatInvisibilityEffects();
      }
      const isSpell = attackType == CombatActionType.CAST_SPELL || attackType == CombatActionType.ITEM_CAST_SPELL;
      const onAttacked = this.scripts[
        isSpell ? ModuleObjectScript.PlaceableOnSpellCastAt : ModuleObjectScript.PlaceableOnMeleeAttacked
      ];
      if(onAttacked){
        onAttacked.run(this);
      }
    }
  }

  /**
   * On blocked
   */
  onBlocked(){
    //stub
  }

  speakString(str: string, volume: TalkVolume){
    // Retail CSWSObject::BroadcastDialog @ 004cd760 — area objects in range with
    // listening set. Party members live in PartyManager.party (not always in
    // area.creatures), so they must be notified for every volume that notifies.
    const plan = getSpeakStringNotifyPlan(volume);
    const talkVolume = volume;
    const rangeSquared = plan.range * plan.range;
    // Keep original case — CSWSExpression captures slice from the original-case
    // input; matching lowercases internally when case-insensitive.
    const spoken = str;
    const notified = new Set<number>();

    const pushHeard = (creature: any) => {
      if(!creature || creature === (this as any) || creature.isDead?.()) return;
      const id = creature.id;
      if(id != null){
        if(notified.has(id)) return;
        notified.add(id);
      }
      const d2 = this.position.distanceToSquared(creature.position);
      if(d2 > rangeSquared) return;
      creature.heardStrings.push({
        speaker: this,
        string: spoken,
        volume: talkVolume
      });
    };

    if(plan.notifyParty){
      const party = GameState.PartyManager?.party;
      if(party){
        for(let i = 0, len = party.length; i < len; i++){
          pushHeard(party[i]);
        }
      }
    }

    if(plan.notifyCreatures){
      const creatures = GameState.module?.area?.creatures;
      if(creatures){
        for(let i = 0, len = creatures.length; i < len; i++){
          pushHeard(creatures[i]);
        }
      }
    }
  }

  /**
   * Reset the excited duration
   */
  resetExcitedDuration() {
    console.warn("Method not implemented.", this.tag);
  }

  /**
   * Set the commandable state (retail CSWSObject field49_0xe8).
   */
  setCommadable(arg0: any) {
    this.commandable = !!arg0;
  }

  /**
   * Get the commandable state. Placeables default true; creatures override
   * with isCommandable (debuffs / SetCommandable).
   */
  getCommadable(){
    return !!this.commandable;
  }

  /**
   * Damage the object
   * @param amount 
   * @param oAttacker 
   * @param delayTime 
   */
  damage(amount = 0, oAttacker?: ModuleObject, delayTime = 0){
    this.subtractHP(amount);
    this.combatData.lastDamager = oAttacker;
    this.combatData.lastAttacker = oAttacker;
    this.onDamaged();
  }

  /**
   * Get the current room
   * @returns 
   */
  getCurrentRoom(){
    this.collisionManager.findWalkableFace();
  }

  /**
   * Get the computed path
   * @returns 
   */
  getComputedPath(){
    return this.#computedPath;
  }

  /**
   * Set the computed path
   * @param computedPath 
   */
  setComputedPath(computedPath: ComputedPath){
    if(!!this.#computedPath){
      this.#computedPath.dispose();
    }
    this.#computedPath = computedPath;
    if(!this.#computedPath) return;

    this.#computedPath.owner = this;
    if(this.context?.debug[EngineDebugType.PATH_FINDING]){
      this.#computedPath.enableHelper = true;
    }
    this.#computedPath.buildHelperLine();
  }

  #tmpLIOVec3 = new THREE.Vector3();
  /**
   * Check if a line intersects the object
   * @param line 
   * @returns 
   */
  checkLineIntersectsObject(line: THREE.Line3){
    line.closestPointToPoint(this.position, true, this.#tmpLIOVec3);
    // Check if the closest point is within the radius of the point
    return this.#tmpLIOVec3.distanceTo(this.position) <= this.getHitDistance();
  }

  // findWalkableFace(object?: ModuleObject){
  //   let face;
  //   let room;
  //   for(let i = 0, il = this.area.rooms.length; i < il; i++){
  //     room = this.area.rooms[i];
  //     if(room.walkmesh){
  //       for(let j = 0, jl = room.walkmesh.walkableFaces.length; j < jl; j++){
  //         face = room.walkmesh.walkableFaces[j];
  //         if(face.triangle.containsPoint(this.position)){
  //           this.groundFace = face;
  //           this.lastGroundFace = this.groundFace;
  //           this.surfaceId = this.groundFace.walkIndex;
  //           this.attachToRoom(room);
  //           face.triangle.closestPointToPoint(this.position, this.collisionManager.wm_c_point);
  //           this.position.z = this.collisionManager.wm_c_point.z + .005;
  //         }
  //       }
  //     }
  //   }
  //   return face;
  // }

  #tmpCHVec3 = new THREE.Vector3();

  /**
   * Get the camera hook position (world space).
   * Updates matrixWorld so dialog framing is not stuck at bind-pose / origin.
   */
  getCameraHookPosition(){
    if(this.model && this.model.camerahook){
      this.model.updateMatrixWorld(true);
      this.model.camerahook.getWorldPosition(this.#tmpCHVec3);
      // Stale graph / not yet parented — fall back to object position + head height
      if(
        this.#tmpCHVec3.lengthSq() < 1e-6
        && this.position.lengthSq() > 1e-4
      ){
        this.#tmpCHVec3.copy(this.position);
        this.#tmpCHVec3.z += 1.5;
      }
      return this.#tmpCHVec3;
    }

    this.#tmpCHVec3.copy(this.position);
    this.#tmpCHVec3.z += 1.5;
    return this.#tmpCHVec3;
  }

  /**
   * Get the camera height
   * @returns 
   */
  getCameraHeight(){
    if(this.model && this.model.camerahook){
      // Retail object height is an offset from the object's world position.
      // Returning world Z here caused OldHitCheck to add position.z twice.
      return this.model.camerahook.position.z;
    }
    return 1.5;
  }

  /**
   * Set the cutscene mode
   * @param state 
   */
  setCutsceneMode(state: boolean = false){
    console.log('setCutsceneMode', this.getTag(), state);
    this.cutsceneMode = state;
    if(this.model && this.model.skins){
      for(let i = 0, len = this.model.skins.length; i < len; i++){
        this.model.skins[i].frustumCulled = !state;
      }
    }
  }

  /**
   * Apply a visual effect
   * @param resref 
   */
  applyVisualEffect(resref = 'v_light'){
    if(this.model instanceof OdysseyModel3D){
      MDLLoader.loader.load(resref).then( (mdl: OdysseyModel) => {
        OdysseyModel3D.FromMDL(mdl, { 
          context: this.context,
          // manageLighting: false
        }).then( (effectMDL: OdysseyModel3D) => {
          if(this.model instanceof OdysseyModel3D){
            this.model.effects.push(effectMDL);
            this.model.add(effectMDL);
            const anim = effectMDL.playAnimation(0, false);
            setTimeout(() => {
              effectMDL.stopAnimation();
              this.model.remove(effectMDL);
              effectMDL.disableEmitters();
              setTimeout( () => {
                if(this.model instanceof OdysseyModel3D){
                  let index = this.model.effects.indexOf(effectMDL);
                  effectMDL.dispose();
                  this.model.effects.splice(index, 1);
                }
              }, 5000);
            }, (anim ? anim.length * 1000 : 1500) )
          }
        }).catch(() => {

        });
      }).catch(() => {

      });
    }
  }

  /**
   * Retail CSWCAnimBase::ApplyShadowBlob — attach Fx_Shadow_S/M/L under the model root.
   * Blob models have shadows turned off (TurnOffShadows).
   */
  async applyShadowBlob(resref: string): Promise<void> {
    this.removeShadowBlob();
    if(!resref || !(this.model instanceof OdysseyModel3D)){ return; }
    try{
      const mdl = await MDLLoader.loader.load(resref);
      if(!mdl || !(this.model instanceof OdysseyModel3D)){ return; }
      const blob = await OdysseyModel3D.FromMDL(mdl, {
        context: this.context,
        castShadow: false,
        receiveShadow: false,
        manageLighting: true,
        static: true,
      });
      blob.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if(mesh.isMesh){
          mesh.castShadow = false;
          mesh.receiveShadow = false;
        }
      });
      this.shadowBlobModel = blob;
      this.model.add(blob);
    }catch(_e){
      // Missing Fx_Shadow_* models is non-fatal (e.g. incomplete installs).
    }
  }

  removeShadowBlob(){
    if(this.shadowBlobModel){
      this.shadowBlobModel.removeFromParent();
      try{ this.shadowBlobModel.dispose(); }catch(_e){}
      this.shadowBlobModel = undefined;
    }
  }

  /**
   * Resolve retail Fx_Shadow_S/M/L from appearance.sizecategory (creatures).
   * size 1–2 → S, 4–5 → L, else M (CSWCCreature::ApplyShadowBlob).
   */
  static shadowBlobResRefFromSizeCategory(sizeCategory: number): string {
    switch(sizeCategory | 0){
      case 1:
      case 2:
        return 'Fx_Shadow_S';
      case 4:
      case 5:
        return 'Fx_Shadow_L';
      default:
        return 'Fx_Shadow_M';
    }
  }

  /**
   * Resolve retail Fx_Shadow_S/M/L from placeables.2da ShadowSize.
   * 0 → S, 1 → M, 2 → L, else M (CSWCPlaceable::ApplyShadowBlob).
   */
  static shadowBlobResRefFromPlaceableShadowSize(shadowSize: number): string {
    switch(shadowSize | 0){
      case 0: return 'Fx_Shadow_S';
      case 2: return 'Fx_Shadow_L';
      case 1:
      default: return 'Fx_Shadow_M';
    }
  }

  /**
   * Set the position
   * @param x 
   * @param y 
   * @param z 
   */
  setPosition(x: THREE.Vector3|number = 0, y = 0, z = 0){
    if(x instanceof THREE.Vector3){
      z = x.z;
      y = x.y;
      x = x.x;
    }

    try{
      this.position.set(x, y, z);
      this.computeBoundingBox();
      this.updateCollision();
    }catch(e){
      console.error('ModuleObject.setPosition failed ');
    }
  }

  /**
   * Get the position
   * @returns 
   */
  getPosition(){
    return this.position;
  }

  /**
   * Get the orientation
   * @returns 
   */
  getOrientation(){
    return this.rotation;
  }

  /**
   * Get the facing
   * @returns 
   */
  getFacing(){
    return this.rotation.z;
  }

  /**
   * Set the facing object
   * @param target 
   */
  setFacingObject( target: ModuleObject ){

  }

  /**
   * Get the rotation
   * @returns 
   */
  getRotation(){
    return Math.floor(this.getFacing() * 180) + 180;
  }

  /**
   * Get the location
   * @returns 
   */
  getLocation(){
    const rotation = this.getRotationFromBearing();

    const location = new EngineLocation(
      this.position.x, this.position.y, this.position.z,
      rotation.x, rotation.y, rotation.z,
      this.area || GameState?.module?.area
    );

    return location;
  }

  /**
   * Creature/object forward as an EngineLocation orientation vector.
   * Matches EngineLocation.setFacing and FollowerCamera.getCreatureForwardXY:
   * (−sin(θ), cos(θ)) for model yaw θ (rotation.z).
   * Retail GetLocation / GetScriptLocation copies this live orientation.
   * @param bearing model yaw in radians (defaults to this.rotation.z)
   */
  getRotationFromBearing( bearing: number = undefined ){
    const theta = (typeof bearing == 'number') ? bearing : this.rotation.z;

    return new THREE.Vector3(
      -Math.sin(theta),
      Math.cos(theta),
      0
    );
  }

  /**
   * Look at an object
   * @param oObject 
   */
  lookAt(oObject: ModuleObject | undefined){
    return;
  }

  /**
   * Check if the object is static
   * @returns 
   */
  isStatic(){
    return false;
  }

  /**
   * Check if the object is useable
   * @returns 
   */
  isUseable(){
    return false;
  }

  /**
   * Get the conversation
   * @returns 
   */
  getConversation(): DLGObject {
    return this.conversation;
  }

  /**
   * Get the fortitude save — retail GetFortSavingThrow @ 005ab810.
   * Creatures: CON + FortSaveThrow + class/conditioning + effects.
   */
  getFortitudeSave(){
    if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleCreature)){
      return getCreatureSavingThrowBase(this as unknown as ModuleCreature, SAVING_THROW_FORTITUDE)
        + getSavingThrowEffectBonus(this, SAVING_THROW_FORTITUDE);
    }
    return this.fortitudeSaveThrow + getSavingThrowEffectBonus(this, SAVING_THROW_FORTITUDE);
  }

  /**
   * Get the reflex save — retail GetReflexSavingThrow @ 005ab8f0.
   */
  getReflexSave(){
    if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleCreature)){
      return getCreatureSavingThrowBase(this as unknown as ModuleCreature, SAVING_THROW_REFLEX)
        + getSavingThrowEffectBonus(this, SAVING_THROW_REFLEX);
    }
    return this.reflexSaveThrow + getSavingThrowEffectBonus(this, SAVING_THROW_REFLEX);
  }

  /**
   * Fortitude save — retail SavingThrowRoll type 1 @ 005b92b0.
   * @returns 0 fail, 1 success, 2 immune
   */
  fortitudeSave(nDC = 0, nSaveType = 0, oVersus: any = undefined){
    return savingThrowRoll(this, SAVING_THROW_FORTITUDE, nDC, nSaveType, oVersus);
  }

  /**
   * Get the CON
   * @returns 
   */
  getCON(): number {
    return 0;;
  }

  /**
   * Reflex save — retail SavingThrowRoll type 2 @ 005b92b0.
   * @returns 0 fail, 1 success, 2 immune
   */
  reflexSave(nDC = 0, nSaveType = 0, oVersus: any = undefined){
    return savingThrowRoll(this, SAVING_THROW_REFLEX, nDC, nSaveType, oVersus);
  }

  /**
   * Get the DEX
   * @returns 
   */
  getDEX(): number {
    return 0;
  }

  /**
   * Get the will save — retail GetWillSavingThrow @ 005ab880.
   */
  getWillSave(){
    if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleCreature)){
      return getCreatureSavingThrowBase(this as unknown as ModuleCreature, SAVING_THROW_WILL)
        + getSavingThrowEffectBonus(this, SAVING_THROW_WILL);
    }
    return this.willSaveThrow + getSavingThrowEffectBonus(this, SAVING_THROW_WILL);
  }

  /**
   * Will save — retail SavingThrowRoll type 3 @ 005b92b0.
   * @returns 0 fail, 1 success, 2 immune
   */
  willSave(nDC = 0, nSaveType = 0, oVersus: any = undefined){
    return savingThrowRoll(this, SAVING_THROW_WILL, nDC, nSaveType, oVersus);
  }

  /**
   * Get the WIS
   * @returns 
   */
  getWIS(): number {
    return 0;
  }

  /**
   * Get the skill level
   * @param value 
   * @returns 
   */
  getSkillLevel(value: number = 0): number {
    return 0;
  }
  
  /**
   * Resist force
   * @param oCaster 
   * @returns 
   */
  resistForce(oCaster: ModuleObject){
    if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleCreature) && BitWise.InstanceOfObject(oCaster, ModuleObjectType.ModuleCreature)){
      //https://gamefaqs.gamespot.com/boards/516675-star-wars-knights-of-the-old-republic/62811657
      //1d20 + target level + ForceResistance± vs. DC of caster level + 10
      const frBonus = getForceResistanceBonus(this);
      let roll = Dice.roll(1, DiceType.d20, (this as any).getTotalClassLevel() + frBonus);
      return (roll > 10 + (oCaster as any).getTotalClassLevel());
    }
    return 0;
  }

  /**
   * Initialize all effects for the object
   */
  initEffects(){
    // Drop any EffectDamage that was incorrectly persisted (retail OnApplyDamage
    // returns 1 → never inserted into EffectList). Re-applying would re-deal HP.
    for(let i = this.effects.length - 1; i >= 0; i--){
      if(this.effects[i]?.type === GameEffectType.EffectDamage){
        this.effects.splice(i, 1);
      }
    }

    for(let i = 0, len = this.effects.length; i < len; i++){
      const effect = this.effects[i];
      if(!effect ){ continue; }

      effect.initialize();
      //effect.setCreator(this);
      effect.setAttachedObject(this);
      effect.onApply(this);
    }
  }

  /**
   * Re-resolve effect CreatorId / ObjectList after all creatures are registered.
   */
  resolveEffectObjectReferences(){
    for(let i = 0, len = this.effects.length; i < len; i++){
      this.effects[i]?.resolveObjectReferences?.();
    }
  }

  /**
   * Retail object.area_id for save export — area game ObjectId, not ARE template ID.
   */
  getSaveAreaId(): number {
    return (this.area?.id ?? GameState.module?.area?.id ?? 0) >>> 0;
  }

  /**
   * Add an effect to the object
   * @param effect - The effect to add
   * @param type - The type of effect
   * @param duration - The duration of the effect
   */
  addEffect(effect: GameEffect, type = 0, duration = 0){
    if(!effect){
      console.warn('AddEffect', 'Invalid GameEffect', effect);
      return;
    }

    if(effect.type == GameEffectType.EffectLink){
      const e1 = (effect as EffectLink).effect1;
      const e2 = (effect as EffectLink).effect2;
      //EFFECT LEFT
      if(e1){
        e1.setDurationType(type);
        e1.setDuration(duration);
        this.addEffect(e1, type, duration);
      }

      //EFFECT RIGHT
      if(e2){
        e2.setDurationType(type);
        e2.setDuration(duration);
        this.addEffect(e2, type, duration);
      }
      return;
    }

    // NWScript Effect* helpers usually initialize before ApplyEffect; engine
    // paths (combat VFX, etc.) often skip it — load 2DA / resolve ints here.
    if(!effect.initialized){
      effect.initialize();
    }
    // Retail: allocate effect id from module Mod_Effect_NxtId when not loaded from save
    if(!effect.id && GameState.module){
      if(typeof GameState.module.effectNextId !== 'number' || isNaN(GameState.module.effectNextId)){
        GameState.module.effectNextId = 1;
      }
      effect.setId(GameState.module.effectNextId++);
    }
    effect.setAttachedObject(this);
    effect.loadModel();
    effect.onApply(this);
    // Immunities / invalid modes return before super.onApply() — do not keep rejected effects
    if(!effect.applied){
      return;
    }
    // Retail CSWSObject::ApplyEffect @ 004d14f0 — OnApplyDamage returns 1 so the
    // effect is freed and never inserted into EffectList. Keeping it caused
    // re-apply (and OnDamaged) during initEffects on module load.
    if(effect.type === GameEffectType.EffectDamage){
      return;
    }
    this.effects.push(effect);
  }

  /**
   * Get an effect by type
   * @param type 
   * @returns 
   */
  getEffect(type = -1){
    for(let i = 0; i < this.effects.length; i++){
      if(this.effects[i].type == type){
        return this.effects[i];
      }
    }
    return undefined;
  }

  /**
   * Check if the object has an effect by type
   * @param type 
   * @returns 
   */
  hasEffect(type = -1){
    return this.getEffect(type) ? true : false;
  }

  /**
   * Remove all effects by creator
   * @param oCreator 
   */
  removeEffectsByCreator( oCreator: ModuleObject ){
    if(!(oCreator instanceof ModuleObject)){
      return;
    }
    let eIndex = this.effects.length - 1;
    let effect = this.effects[eIndex];
    while(effect){
      if(effect.getCreator() == oCreator){
        let index = this.effects.indexOf(effect);
        if(index >= 0){
          this.effects.splice(index, 1)[0].onRemove();
        }
      }
      effect = this.effects[--eIndex];
    }
  }

  /**
   * Remove every attached effect (retail ClearAllEffects @ 004d0940).
   * @param retainSelfBuffs - SurrenderRetainBuffs: keep effects created by this object
   */
  clearAllEffects(retainSelfBuffs: boolean = false){
    const effects = this.effects ? this.effects.slice() : [];
    for(let i = 0; i < effects.length; i++){
      const effect = effects[i];
      if(!effect) continue;
      const duration = effect.getDurationType?.() ?? (effect.subType & 0x07);
      // Retail skips EQUIPPED (3) and INNATE (4)
      if(duration === 3 || duration === 4) continue;
      if(effect.type === 0x09) continue; // EffectSetStateInternal
      if(retainSelfBuffs && effect.creator === this) continue;
      this.removeEffect(effect);
    }
  }

  /**
   * Retail OnApplyDeath effect strip @ 004e0ac0 + IsEffectToIgnoreOnDeath @ 004df420.
   * Removes all non-EQUIPPED/INNATE effects except types listed in removefxondeath.2da
   * (Disguise, Beam, and beam VisualEffects).
   */
  clearEffectsOnDeath(){
    const effects = this.effects ? this.effects.slice() : [];
    for(let i = 0; i < effects.length; i++){
      const effect = effects[i];
      if(!effect) continue;
      const duration = effect.getDurationType?.() ?? (effect.subType & 0x07);
      if(duration === 3 || duration === 4) continue; // EQUIPPED / INNATE
      if(effect.type === 0x09) continue; // EffectSetStateInternal
      if(this.isEffectToIgnoreOnDeath(effect)) continue;
      this.removeEffect(effect);
    }
  }

  /**
   * Retail IsEffectToIgnoreOnDeath @ 004df420 — removefxondeath.2da EffectType column
   * uses NWScript EFFECT_TYPE_* (Disguise=62, Beam=21). Beam VFX also kept.
   */
  isEffectToIgnoreOnDeath(effect: GameEffect): boolean {
    if(!effect) return false;
    // EFFECT_DISGUISE = 62 → GameEffectType.EffectDisguise (0x3E)
    if(effect.type === GameEffectType.EffectDisguise) return true;
    // EFFECT_BEAM = 21 → GameEffectType.EffectBeam (0x20)
    if(effect.type === GameEffectType.EffectBeam) return true;
    // VisualEffect that is a beam (type_fd 'B') — retail CLoopingVisualEffect::GetIsBeam
    if(effect.type === GameEffectType.EffectVisualEffect){
      const vfx = (effect as any).visualEffect;
      if(vfx?.type_fd === 'B') return true;
    }
    return false;
  }

  /**
   * Remove all effects by type
   * @param type 
   */
  removeEffectsByType(type: number = -1){
    let effect = this.getEffect(type);
    while(effect){
      let index = this.effects.indexOf(effect);
      if(index >= 0){
        this.effects.splice(index, 1)[0].onRemove();
      }
      effect = this.getEffect(type);
    }
  }

  /**
   * Remove an effect by type or GameEffect
   * @param type 
   */
  removeEffect(effect: GameEffect){
    if(!effect){ return; }
    const arrIdx = this.effects.indexOf(effect);
    if(arrIdx == -1){ return; }
    this.effects.splice(arrIdx, 1)[0].onRemove();
  }

  /**
   * Jump to an EngineLocation — retail JumpToLocation / AIActionJumpToPoint.
   * Cross-area: AddToArea. Cross-module (party leader): LoadModule + spawn XYZ.
   */
  JumpToLocation(lLocation: EngineLocation){
    if(!lLocation) return;
    if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleCreature)){
      const action = new GameState.ActionFactory.ActionJumpToPoint();
      action.setParameter(0, ActionParameterType.FLOAT, lLocation.position.x);
      action.setParameter(1, ActionParameterType.FLOAT, lLocation.position.y);
      action.setParameter(2, ActionParameterType.FLOAT, lLocation.position.z);
      const areaId = lLocation.area?.id ?? GameState.module?.area?.id ?? 0;
      action.setParameter(3, ActionParameterType.DWORD, areaId);
      action.setParameter(4, ActionParameterType.INT, 1);
      action.setParameter(5, ActionParameterType.FLOAT, 20.0);
      action.setParameter(6, ActionParameterType.FLOAT, lLocation.rotation.x);
      action.setParameter(7, ActionParameterType.FLOAT, lLocation.rotation.y);
      // Instant jump: run one update (retail AddActionToFront + process)
      action.owner = this;
      action.update(0);
      return;
    }
    this.position.set( lLocation.position.x, lLocation.position.y, lLocation.position.z );
    this.computeBoundingBox();
    this.setFacing(-Math.atan2(lLocation.rotation.x, lLocation.rotation.y) + Math.PI/2, true);
    this.collisionManager.groundFace = undefined;
    this.collisionManager.lastGroundFace = undefined;
  }

  /**
   * Face a point
   * @param vPoint 
   */
  FacePoint(vPoint=new THREE.Vector3){
    let tangent = vPoint.clone().sub(this.position.clone());
    let atan = Math.atan2(-tangent.y, -tangent.x);
    this.setFacing(atan + Math.PI/2, true);
  }

  /**
   * Get the x orientation
   * @returns 
   */
  getXOrientation(){
    if(this.template.RootNode.hasField('XOrientation')){
      return this.template.RootNode.getFieldByLabel('XOrientation').getValue();
    }
    return 0;
  }

  /**
   * Get the y orientation
   * @returns 
   */
  getYOrientation(){
    if(this.template.RootNode.hasField('XOrientation')){
      return this.template.RootNode.getFieldByLabel('XOrientation').getValue();
    }
    return 0;
  }

  /**
   * Get the z orientation
   * @returns 
   */
  getZOrientation(){
    if(this.template.RootNode.hasField('ZOrientation')){
      return this.template.RootNode.getFieldByLabel('ZOrientation').getValue();
    }
    return 0;
  }

  /**
   * Get the linked to module
   * @returns 
   */
  getLinkedToModule(){
    return this.linkedToModule;
  }

  /**
   * Get the linked to flags
   * @returns 
   */
  getLinkedToFlags(){
    return this.linkedToFlags;
  }

  /**
   * Get the linked to
   * @returns 
   */
  getLinkedTo(){
    return this.linkedTo;
  }

  /**
   * Get the transition destin
   * @returns 
   */
  getTransitionDestin(){
    if(this.transitionDestin instanceof CExoLocString){
      return this.transitionDestin.getValue();
    }
    return '';
  }

  /**
   * Get the portrait id
   * @returns 
   */
  getPortraitId(){
    if(this.template.RootNode.hasField('PortraitId')){
      return this.template.RootNode.getFieldByLabel('PortraitId').getValue();
    }
    return 0;
  }

  /**
   * Get the key name
   * @returns 
   */
  getKeyName(){
    if(this.template.RootNode.hasField('KeyName')){
      return this.template.RootNode.getFieldByLabel('KeyName').getValue();
    }
    return null;
  }

  /**
   * Get the tag
   * @returns 
   */
  getTag(){
    if(this.tag){
      return this.tag
    }
    
    if(this.template && this.template.RootNode && this.template.RootNode.hasField('Tag')){
      return this.template.RootNode.getFieldByLabel('Tag').getValue()
    }

    return '';
  }

  /**
   * Get the template resref
   * @returns 
   */
  getTemplateResRef(){
    if(this.template.RootNode.hasField('TemplateResRef')){
      return this.template.RootNode.getFieldByLabel('TemplateResRef').getValue()
    }
    return null;
  }

  /**
   * Get the resref
   * @returns 
   */
  getResRef(){
    if(this.template.RootNode.hasField('ResRef')){
      return this.template.RootNode.getFieldByLabel('ResRef').getValue()
    }
    return null;
  }

  /**
   * Set the template resref
   * @param sRef 
   */
  setTemplateResRef(sRef=''){
    if(this.template.RootNode.hasField('TemplateResRef')){
      this.template.RootNode.getFieldByLabel('TemplateResRef').setValue(sRef)
    }else{
      this.template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'TemplateResRef') ).setValue(sRef)
    }
    
  }

  /**
   * Set the HP
   * Retail CSWSObject::DoDamage clamps to 1 when min1hp is set.
   * @param value 
   */
  setHP(value = 0){
    this.currentHP = value;
    if(this.min1HP && this.currentHP < 1){
      this.currentHP = 1;
    }
  }

  /**
   * Add HP
   * @param value 
   * @param ignoreMaxHitPoints 
   */
  addHP(value = 0, ignoreMaxHitPoints = false){
    this.currentHP = (this.getHP() + value);
  }

  /**
   * Subtract HP
   * @param value 
   */
  subtractHP(value = 0){
    this.setHP(this.getHP() - value);
  }

  /**
   * Get the HP
   * @returns 
   */
  getHP(){
    return this.currentHP;
  }

  /**
   * Get the max HP
   * @returns 
   */
  getMaxHP(){
    return this.hp;
  }

  /**
   * Set the max HP
   * @param value 
   */
  setMaxHP(value = 0){
    return this.hp = value;
  }

  /**
   * Set the min one HP
   * @param value 
   */
  setMinOneHP(value: boolean = false){
    this.min1HP = value;
  }

  /**
   * Add FP
   * @param nAmount 
   * @param ignoreMaxForcePoints 
   */
  addFP(nAmount = 0, ignoreMaxForcePoints = false){}

  /**
   * Subtract FP
   * @param nAmount 
   */
  subtractFP(nAmount = 0){}

  /**
   * Get the AC
   * @returns 
   */
  getAC(){
    return 10;
  }

  /**
   * Check if the object is a party member
   * @returns 
   */
  isPartyMember(){
    return this.isPM;//GameState.PartyManager.party.indexOf(this as any) >= 0;
  }

  /**
   * Compute the bounding box
   * @param force 
   */
  computeBoundingBox(force: boolean = false){
    if(this.container){
      this.container.updateMatrixWorld(true);
      this.container.updateMatrix();
      if(force){
        this.container.traverse( n => {
          n.updateMatrixWorld(true);
          n.updateMatrix();
        })
      }
    }

    if(this.model){
      this.model.updateMatrixWorld(true);
      this.model.updateMatrix();
    }
    
    if(this.model instanceof THREE.Object3D)
      this.box.setFromObject(this.model);
  }

  /**
   * Check if the object is on screen
   * @param frustum 
   * @returns 
   */
  isOnScreen(frustum = GameState.viewportFrustum){
    if(this.area && this.area.fog){
      if(this.distanceToCamera >= this.area.fog.far){
        return false;
      }
    }

    this.box.getBoundingSphere(this.sphere);
    return frustum.intersectsSphere(this.sphere);
  }

  /**
   * Retail CSWCObject::GetReticlePoint @ 0063d560 — prefer lookathook.
   * Creatures / corpse placeables override (head_g / rootdummy).
   */
  getReticleNode(){
    if(!this.model){ return; }

    if(this.model.lookathook){
      return this.model.lookathook;
    }

    if(this.model.talkdummy){
      return this.model.talkdummy;
    }

    if(this.model.headhook){
      return this.model.headhook;
    }

    if(this.model.rootdummy){
      return this.model.rootdummy;
    }

    if(this.model.camerahook){
      return this.model.camerahook;
    }

    return this.model;
  }

  /** Resolve a named model node (case-insensitive) for reticle anchors. */
  getModelNodeByName(name: string){
    if(!this.model || !name){ return undefined; }
    const key = name.toLowerCase();
    if(typeof (this.model as any)[key] !== 'undefined' && (this.model as any)[key]){
      return (this.model as any)[key];
    }
    if(this.model.nodes?.has(key)){
      return this.model.nodes.get(key);
    }
    if(this.model.nodes?.has(name)){
      return this.model.nodes.get(name);
    }
    return undefined;
  }

  /**
   * Set the listening state
   * @param bListenting 
   */
  setListening(bListenting = false){
    this.isListening = bListenting ? true : false;;
  }

  /**
   * Set the listening pattern (retail CSWSObject::SetListenExpression).
   * Re-parses in place when the pattern number already exists.
   * @param sString
   * @param iNum
   */
  setListeningPattern(sString = '', iNum = 0){
    const number = iNum | 0;
    const pattern = typeof sString === 'string' ? sString : '';
    for(let i = 0; i < this.listeningPatterns.length; i++){
      if(this.listeningPatterns[i].number === number){
        this.listeningPatterns[i].pattern = pattern;
        return;
      }
    }
    this.listeningPatterns.push({ pattern, number });
  }

  /** Clear matched substrings (retail ClearMatchedExpressionStrings). */
  clearMatchedSubstrings(){
    this.matchedSubstrings = [];
  }

  /** Store listen-match captures for GetMatchedSubstring (EventHandler case 7). */
  setMatchedSubstrings(substrings: string[]){
    this.matchedSubstrings = substrings ? substrings.slice() : [];
  }

  /**
   * Get the listening state
   * @returns 
   */
  getIsListening(){
    return this.isListening ? true : false;
  }

  /**
   * Get the local boolean
   * @param index 
   * @returns 
   */
  getLocalBoolean(index: number){
    return !!this._locals.Booleans[index];
  }

  /**
   * Get the local number
   * @param index 
   * @returns 
   */
  getLocalNumber(index: number){
    return (this._locals.Numbers as any)[index] ? (this._locals.Numbers as any)[index] as number : 0;
  }

  /**
   * Set the local boolean
   * @param index 
   * @param bool 
   */
  setLocalBoolean(index: number, bool: boolean){
    this._locals.Booleans[index] = !!bool;
  }

  /**
   * Set the local number
   * @param index 
   * @param value 
   */
  setLocalNumber(index: number, value: number){
    (this._locals.Numbers as any)[index] = value;
  }

  /**
   * Check if the object is hostile to another object
   * @param target 
   * @returns 
   */
  isHostile(target: ModuleObject){
    return GameState.FactionManager.IsHostile(this, target);
  }

  /**
   * Check if the object is neutral to another object
   * @param target 
   * @returns 
   */
  isNeutral(target: ModuleObject){
    return GameState.FactionManager.IsNeutral(this, target);
  }

  /**
   * Check if the object is friendly to another object
   * @param target 
   * @returns 
   */
  isFriendly(target: ModuleObject){
    return GameState.FactionManager.IsFriendly(this, target);
  }

  /**
   * Get the reputation of the object with another object
   * @param target 
   * @returns 
   */
  getReputation(target: ModuleObject){
    return GameState.FactionManager.GetReputation(this, target);
  }

  /**
   * Get the primary perception range
   * @returns 
   */
  getPerceptionRangePrimary(){
    if(!this.perceptionRange){ return 1; }
    return this.perceptionRange.primaryRange;
  }

  /**
   * Get the secondary perception range
   * @returns 
   */
  getPerceptionRangeSecondary(){
    if(!this.perceptionRange){ return 1; }
    return this.perceptionRange.secondaryRange;
  }

  /**
   * Initialize the perception list.
   * Retail SaveCreature @ 005009af writes every non-null CSWVisibilityNode
   * verbatim (including stale / OBJECT_INVALID ids). Resolve object refs when
   * possible, but never prune unresolved nodes — they must round-trip on save.
   */
  initPerceptionList(){
    let length = this.perceptionList.length;
    while(length--){
      let perceptionObject = this.perceptionList[length];
      if(perceptionObject){
        if(typeof perceptionObject.object == 'undefined' && perceptionObject.objectId){
          const resolved = GameState.ModuleObjectManager.GetObjectById(perceptionObject.objectId);
          if(resolved instanceof ModuleObject){
            perceptionObject.object = resolved;
          }
          // else leave object undefined; keep objectId/data for save round-trip
        }
      }
    }
  }

  /**
   * Notify the object that it has been heard by another object
   * @param object 
   * @param heard 
   * @returns 
   */
  notifyPerceptionHeardObject(object: ModuleObject, heard = false){
    if(!object) return;

    let triggerOnNotice = false;
    let exists = this.perceptionList.filter( (o) => o.object == object );
    if(exists.length){
      let existingObject = exists[0];
      const wasHeard = !!(existingObject.data & PerceptionMask.HEARD);
      triggerOnNotice = (wasHeard != heard);
      if(heard){
        existingObject.data |= PerceptionMask.HEARD;
      }else{
        existingObject.data &= ~PerceptionMask.HEARD;
      }
    }else{
      if(heard){
        let newObject = {
          object: object,
          objectId: object.id,
          data: PerceptionMask.HEARD
        };
        this.perceptionList.push(newObject);
        triggerOnNotice = true;
        if(object.isPlayer && this.isHostile(object)){
          this.area.subtractStealthXP();
        }
      }else{
        if(object.isPlayer && this.isHostile(object)){
          this.area.addStealthXP();
        }
      }
    }

    let onNotice: NWScriptInstance;
    if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleCreature)){
      onNotice = this.scripts[ModuleObjectScript.CreatureOnNotice];
    }

    if(triggerOnNotice && onNotice){
      const instance = onNotice.nwscript.newInstance();
      // Retail sets discrete event flags (0x904 Heard / 0x90c Inaudible) — not cumulative list bits
      instance.lastPerceived = {
        object: object,
        objectId: object.id,
        data: heard ? PerceptionMask.HEARD : PerceptionMask.INAUDIBLE
      };
      instance.run(this);
      return true;
    }
  }

  /**
   * Notify the object that it has been seen by another object
   * @param object 
   * @param seen 
   * @returns 
   */
  notifyPerceptionSeenObject(object: ModuleObject, seen = false){
    if(!object) return;

    let triggerOnNotice = false;
    let exists = this.perceptionList.filter( (o) => o.object == object );
    if(exists.length){
      let existingObject = exists[0];
      const wasSeen = !!(existingObject.data & PerceptionMask.SEEN);
      triggerOnNotice = (wasSeen != seen);
      if(seen){
        existingObject.data |= PerceptionMask.SEEN;
      }else{
        existingObject.data &= ~PerceptionMask.SEEN;
      }
    }else{
      if(seen){
        let newObject = {
          object: object,
          objectId: object.id,
          data: PerceptionMask.SEEN
        };
        this.perceptionList.push(newObject);
        triggerOnNotice = true;
        if(object.isPlayer && this.isHostile(object)){
          this.area.subtractStealthXP();
        }
      }else{
        if(object.isPlayer && this.isHostile(object)){
          this.area.addStealthXP();
        }
      }
    }

    let onNotice: NWScriptInstance;
    if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleCreature)){
      onNotice = this.scripts[ModuleObjectScript.CreatureOnNotice];
    }

    if(triggerOnNotice && onNotice){
      const instance = onNotice.nwscript.newInstance();
      // Retail sets discrete event flags (0x908 Seen / 0x910 Vanished)
      instance.lastPerceived = {
        object: object,
        objectId: object.id,
        data: seen ? PerceptionMask.SEEN : PerceptionMask.INVISIBLE
      };
      instance.run(this);
      return true;
    }
  }

  #tmpPositionA = new THREE.Vector3();
  #tmpPositionB = new THREE.Vector3();
  #tmpDirection = new THREE.Vector3();

  /**
   * Check if the object has line of sight to another object.
   * Retail ClearLineOfSight @ 0050c330 (combat / GetIsInUseRange) uses eye
   * height ~1.5 and does not clamp to perception range — pass
   * ignorePerceptionRange for those. GetIsInUseRange rays to the GetUseRange
   * point (doors/placeables), not object origin.
   */
  hasLineOfSight(
    oTarget: ModuleObject,
    max_distance = 30,
    opts?: {
      ignorePerceptionRange?: boolean;
      eyeHeight?: number;
      /** Retail ClearLineOfSight excludes source + target object ids from hits. */
      ignoreObject?: ModuleObject;
      /** End point override (retail GetIsInUseRange → nearest action point). */
      toPosition?: THREE.Vector3;
      /**
       * Skip room walkmesh face tests. Use-range ClearLineOfSight is
       * NoNonWalkPolysDetailed, not a full walkable-face raycast — room meshes
       * false-block short door/placeable interactions.
       */
      skipRoomWalkmesh?: boolean;
    }
  ){
    if(!this.spawned || !GameState.module.readyToProcessEvents)
      return false;
    
    if(!(oTarget instanceof ModuleObject)){
      return false;
    }

    const eyeHeight = typeof opts?.eyeHeight === 'number' ? opts.eyeHeight : 1;
    const ignoreObject = opts?.ignoreObject ?? oTarget;
    this.#tmpPositionA.copy(this.position);
    if(opts?.toPosition){
      this.#tmpPositionB.copy(opts.toPosition);
    }else{
      this.#tmpPositionB.copy(oTarget.position);
    }
    // Distance check uses eye-adjusted endpoints for range only
    const distance = Math.hypot(
      this.#tmpPositionB.x - this.#tmpPositionA.x,
      this.#tmpPositionB.y - this.#tmpPositionA.y,
      (this.#tmpPositionB.z + eyeHeight) - (this.#tmpPositionA.z + eyeHeight)
    );
    if(distance < 0.05){
      return true;
    }

    if(!opts?.ignorePerceptionRange && this.perceptionRange){
      const primaryRange = this.getPerceptionRangePrimary();
      if(distance > primaryRange){
        return false;
      }
      max_distance = primaryRange;
    }else{
      if(distance > max_distance){
        return false;
      }
    }

    if(opts?.skipRoomWalkmesh){
      // Use-range: Detailed-only (personal_space 0.001), no AABB LOS
      const ignoreIds = [this.id, ignoreObject?.id].filter((id) => id != null) as number[];
      const a = this.#tmpPositionA.clone();
      const b = this.#tmpPositionB.clone();
      a.z += eyeHeight;
      b.z += eyeHeight;
      return noNonWalkPolysDetailed(this.area, a, b, {
        personalSpace: 0.001,
        ignoreObjectIds: ignoreIds,
        skipMesh: true,
      }).clear;
    }

    return clearLineOfSight(this.area, this.#tmpPositionA, this.#tmpPositionB, {
      eyeHeight,
      ignoreSource: this,
      ignoreObject,
    });
  }
  
  /**
   * Set the animation state
   * @param animState 
   */
  setAnimationState(animState: any){
    this.animState = animState;
  }

  /**
   * Play an animation
   * @param anim 
   */
  dialogPlayAnimation(anim: ITwoDAAnimation = {} as ITwoDAAnimation){
    console.log('dialogPlayAnimation',anim);
    if(!this.model){ 
      console.warn('dialogPlayAnimation failed');
      console.log(this, anim);
      return; 
    }

    const odysseyAnimation = this.model.odysseyAnimations.find( (a) => a.name.toLocaleLowerCase() == anim.name.toLocaleLowerCase() );
    if(!odysseyAnimation){
      return;
    }

    this.dialogAnimation = {
      animation: odysseyAnimation,
      data: anim,
      started: false,
    };
  }

  /**
   * Reset the dialog animation state
   */
  dialogResetAnimationState(){
    this.dialogAnimationState = {
      animationIndex: -1,
      animation: undefined,
      data: undefined,
      started: false,
    };
  }

  /**
   * Use an object
   * @param object 
   */
  use(object: ModuleObject){
    console.warn("Method not implemented.", this.tag);
  }

  /**
   * Attack a creature. CutsceneAttack uses ModuleCreature.addCutsceneAttackActions.
   * @param target
   * @param feat
   * @param isCutsceneAttack - legacy; when true delegates to addCutsceneAttackActions
   * @param attackDamage
   * @param attackAnimation - animations.2da row when cutscene
   * @param attackResult
   */
  attackCreature(target: ModuleObject, feat?: any, isCutsceneAttack: boolean = false, attackDamage:number = 0, attackAnimation?: any, attackResult?: any) {
    console.warn("Method not implemented.", this.tag, target);
  }
  /**
   * Set the commandable state
   * @param arg0 
   */
  setCommandable(arg0: boolean) {
    this.setCommadable(arg0);
  }

  /**
   * Play a sound set
   * @param ssfType 
   */
  playSoundSet(ssfType: SSFType){
    console.warn("Method not implemented.", this.tag);
  }
  
  /**
   * Initialize the properties
   */
  initProperties(){

    const needsRegister = !this.initialized;

    if(needsRegister){
      if(this.template.RootNode.hasField('ObjectId')){
        this.id = this.template.getFieldByLabel('ObjectId').getValue();
      }else if(this.template.RootNode.hasField('ID')){
        this.id = this.template.getFieldByLabel('ID').getValue();
      }
    }
    
    if(this.template.RootNode.hasField('Animation'))
      this.animState = this.template.getFieldByLabel('Animation').getValue();
    
    if(this.template.RootNode.hasField('Appearance')){
      this.appearance = this.template.getFieldByLabel('Appearance').getValue();
    }
    
    if(this.template.RootNode.hasField('Description'))
      this.description = this.template.getFieldByLabel('Description').getCExoLocString();
    
    if(this.template.RootNode.hasField('ObjectId'))
      this.id = this.template.getFieldByLabel('ObjectId').getValue();

    if(this.template.RootNode.hasField('AutoRemoveKey'))
      this.autoRemoveKey = this.template.getFieldByLabel('AutoRemoveKey').getValue();

    if(this.template.RootNode.hasField('Commandable'))
      this.commandable = this.template.getFieldByLabel('Commandable').getValue();

    if(this.template.RootNode.hasField('Cursor'))
      this.cursor = this.template.getFieldByLabel('Cursor').getValue();

    if(this.template.RootNode.hasField('Faction')){
      this.factionId = this.template.getFieldByLabel('Faction').getValue();
      if((this.factionId & 0xFFFFFFFF) == -1){
        this.factionId = 0;
      }
      this.faction = GameState.FactionManager.factions.get(this.factionId);
    }

    if(this.template.RootNode.hasField('Geometry')){
      this.geometry = this.template.getFieldByLabel('Geometry').getChildStructs();

      //Push verticies
      for(let i = 0; i < this.geometry.length; i++){
        let tgv = this.geometry[i];
        this.vertices[i] = new THREE.Vector3( 
          tgv.getFieldByLabel('PointX').getValue(),
          tgv.getFieldByLabel('PointY').getValue(),
          tgv.getFieldByLabel('PointZ').getValue()
        );
      }
    }

    if(this.template.RootNode.hasField('HasMapNote'))
      this.hasMapNote = this.template.getFieldByLabel('HasMapNote').getValue();

    if(this.template.RootNode.hasField('HighlightHeight'))
      this.highlightHeight = this.template.getFieldByLabel('HighlightHeight').getValue();

    if(this.template.RootNode.hasField('KeyName'))
      this.keyName = this.template.getFieldByLabel('KeyName').getValue();

    if(this.template.RootNode.hasField('LinkedTo'))
      this.linkedTo = this.template.getFieldByLabel('LinkedTo').getValue();

    if(this.template.RootNode.hasField('LinkedToFlags'))
      this.linkedToFlags = this.template.getFieldByLabel('LinkedToFlags').getValue();
  
    if(this.template.RootNode.hasField('LinkedToModule'))
      this.linkedToModule = this.template.RootNode.getFieldByLabel('LinkedToModule').getValue();
        
    if(this.template.RootNode.hasField('LoadScreenID'))
      this.loadScreenID = this.template.getFieldByLabel('LoadScreenID').getValue();

    if(this.template.RootNode.hasField('LocName'))
      this.locName = this.template.getFieldByLabel('LocName').getCExoLocString();

    if(this.template.RootNode.hasField('LocalizedName'))
      this.localizedName = this.template.getFieldByLabel('LocalizedName').getCExoLocString();

    if(this.template.RootNode.hasField('MapNote'))
      this.mapNote = this.template.getFieldByLabel('MapNote').getCExoLocString();

    if(this.template.RootNode.hasField('MapNoteEnabled'))
      this.mapNoteEnabled = this.template.getFieldByLabel('MapNoteEnabled').getValue();

    if(this.template.RootNode.hasField('PortraidId')){
      this.portraitId = this.template.getFieldByLabel('PortraidId').getValue();
      this.portrait = GameState.SWRuleSet.portraits[this.portraitId];
    }

    if(this.template.RootNode.hasField('SetByPlayerParty'))
      this.setByPlayerParty = this.template.getFieldByLabel('SetByPlayerParty').getValue();

    if(this.template.RootNode.hasField('Tag'))
      this.tag = this.template.getFieldByLabel('Tag').getValue();

    if(this.template.RootNode.hasField('TemplateResRef'))
      this.templateResRef = this.template.getFieldByLabel('TemplateResRef').getValue();

    if(this.template.RootNode.hasField('TransitionDestin'))
      this.transitionDestin = this.template.getFieldByLabel('TransitionDestin').getCExoLocString();

    if(this.template.RootNode.hasField('TrapDetectable'))
      this.trapDetectable = this.template.RootNode.getFieldByLabel('TrapDetectable').getValue();

    if(this.template.RootNode.hasField('TrapDisarmable'))
      this.trapDisarmable = this.template.RootNode.getFieldByLabel('TrapDisarmable').getValue();

    if(this.template.RootNode.hasField('TrapOneShot'))
      this.trapOneShot = this.template.getFieldByLabel('TrapOneShot').getValue();

    if(this.template.RootNode.hasField('TrapType'))
      this.trapType = this.template.getFieldByLabel('TrapType').getValue();

    if(this.template.RootNode.hasField('Type'))
      this.type = this.template.getFieldByLabel('Type').getValue();

    if(this.template.RootNode.hasField('XPosition'))
      this.position.x = this.template.RootNode.getFieldByLabel('XPosition').getValue();

    if(this.template.RootNode.hasField('YPosition'))
      this.position.y = this.template.RootNode.getFieldByLabel('YPosition').getValue();

    if(this.template.RootNode.hasField('ZPosition'))
      this.position.z = this.template.RootNode.getFieldByLabel('ZPosition').getValue();

    if(this.template.RootNode.hasField('XOrientation'))
      this.xOrientation = this.template.RootNode.getFieldByLabel('XOrientation').getValue();

    if(this.template.RootNode.hasField('YOrientation'))
      this.yOrientation = this.template.RootNode.getFieldByLabel('YOrientation').getValue();

    if(this.template.RootNode.hasField('ZOrientation'))
      this.zOrientation = this.template.RootNode.getFieldByLabel('ZOrientation').getValue();
      
    if(this.template.RootNode.hasField('FortSaveThrow'))
      this.fortitudeSaveThrow = this.template.RootNode.getFieldByLabel('FortSaveThrow').getValue();

    if(this.template.RootNode.hasField('RefSaveThrow'))
      this.reflexSaveThrow = this.template.RootNode.getFieldByLabel('RefSaveThrow').getValue();

    if(this.template.RootNode.hasField('WillSaveThrow'))
      this.willSaveThrow = this.template.RootNode.getFieldByLabel('WillSaveThrow').getValue();

    if(this.template.RootNode.hasField('SWVarTable')){
      let swVarTableStruct = this.template.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0];
      if(swVarTableStruct){
        if(swVarTableStruct.hasField('BitArray')){
          let localBools = swVarTableStruct.getFieldByLabel('BitArray').getChildStructs();
          for(let i = 0; i < localBools.length; i++){
            let data = localBools[i].getFieldByLabel('Variable').getValue();
            for(let bit = 0; bit < 32; bit++){
              this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
            }
          }
        }

        if(swVarTableStruct.hasField('ByteArray')){
          let localNumbers = swVarTableStruct.getFieldByLabel('ByteArray').getChildStructs();
          for(let i = 0; i < localNumbers.length; i++){
            let data = localNumbers[i].getFieldByLabel('Variable').getValue();
            this.setLocalNumber(i, data);
          }
        }
      }
    }

    if(this.template.RootNode.hasField('VarTable')){
      this.loadNamedVarTable(this.template.RootNode.getFieldByLabel('VarTable'));
    }

    this.loadActionList();

    // Retail AddToArea / Load*: register after Tag is known (RegisterObject = ObjectList + tag lookup).
    if(needsRegister){
      GameState.ModuleObjectManager.RegisterObject(this);
    }

    this.initialized = true;

  }

  /**
   * Save the object
   */
  Save(){
    //TODO

    let gff = new GFFObject();

    return gff;

  }

  /**
   * Get the SWVarTable save struct
   * @returns 
   */
  getSWVarTableSaveStruct(){
    let swVarTableStruct = new GFFStruct();

    let swVarTableBitArray = swVarTableStruct.addField( new GFFField(GFFDataType.LIST, 'BitArray') );

    for(let i = 0; i < 3; i++){
      let varStruct = new GFFStruct();
      let value = 0;
      let offset = 32 * i;
      for(let j = 0; j < 32; j++){
        if(this.getLocalBoolean(offset + j) == true){
          value |= 1 << j;
        }
      }
      value = value >>> 0;
      varStruct.addField( new GFFField(GFFDataType.DWORD, 'Variable') ).setValue( value );
      swVarTableBitArray.addChildStruct(varStruct);
    }

    let swVarTableByteArray = swVarTableStruct.addField( new GFFField(GFFDataType.LIST, 'ByteArray') );

    for(let i = 0; i < 8; i++){
      let varStruct = new GFFStruct();
      varStruct.addField( new GFFField(GFFDataType.BYTE, 'Variable') ).setValue( Number(this.getLocalNumber(i)) );
      swVarTableByteArray.addChildStruct(varStruct);
    }
    return swVarTableStruct;
  }

  /**
   * Load named VarTable from a GFF LIST field (retail CSWSScriptVarTable).
   */
  loadNamedVarTable(field?: GFFField){
    this.scriptVarTable.loadFromListField(field);
  }

  /**
   * Write named VarTable into a new LIST field on the given parent struct/root.
   */
  writeNamedVarTable(parent: GFFStruct): GFFField {
    const list = parent.addField(new GFFField(GFFDataType.LIST, 'VarTable'));
    this.scriptVarTable.writeToListField(list);
    return list;
  }

  /**
   * Load ActionList from this object's template into the runtime action queue.
   * Skips if the queue already has entries (avoids double-load on re-init).
   */
  loadActionList(){
    try{
      if(this.actionQueue.length){
        return;
      }
      if(!this.template?.RootNode?.hasField('ActionList')){
        return;
      }
      const actionStructs = this.template.RootNode.getFieldByLabel('ActionList').getChildStructs();
      for(let i = 0, len = actionStructs.length; i < len; i++){
        const action = GameState.ActionFactory.FromStruct(actionStructs[i]);
        if(action){
          this.actionQueue.add(action);
        }
      }
    }catch(e: any){
      console.error(e);
    }
  }

  /**
   * Convert the action queue to an action list
   * @returns 
   */
  actionQueueToActionList(){
    const actionList = new GFFField(GFFDataType.LIST, 'ActionList');

    for(let i = 0, len = this.actionQueue.length; i < len; i++){
      const action = this.actionQueue[i] as Action;
      if(!action){ continue; }
      actionList.addChildStruct(action.toStruct());
    }

    return actionList;
  }

  setOpacity(opacity: number){
    if(this.model instanceof OdysseyModel3D){
      this.model.setOpacity(opacity);
    }
  }

  /**
   * Destroyed
   */
  destroyed: boolean = false;

  /**
   * Will destroy
   */
  willDestroy: boolean = false;

  /**
   * Time since destroy started in seconds
   */
  timeSinceDestroyStarted: number = 0;

  /**
   * Delay until destroy in seconds
   */
  delayUntilDestroy: number = 0;

  /**
   * Delay until fade in seconds
   */
  delayUntilFade: number = 0;

  /**
   * No fade on destroy
   */
  noFadeOnDestroy: boolean = false;

  /** Retail creature ctor SetFadeOutTime(8000). */
  static FADE_TIME: number = 8.0;

  /**
   * Fade-out length in seconds (retail CSWSObject::SetFadeOutTime default 8000ms).
   */
  fadeDuration: number = 8.0;

  setWillDestroy(willDestroy: boolean){
    this.willDestroy = willDestroy;
    this.timeSinceDestroyStarted = 0;
  }

  setDelayUntilDestroy(delay: number = ModuleObject.FADE_TIME){
    this.delayUntilDestroy = delay;
    this.timeSinceDestroyStarted = 0;
  }

  setDelayUntilFade(delay: number){
    if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleCreature) || BitWise.InstanceOfObject(this, ModuleObjectType.ModulePlaceable)){
      this.delayUntilFade = delay;
      return;
    }
    this.delayUntilFade = 0;
  }

  setFadeDuration(duration: number){
    this.fadeDuration = Math.max(0, duration);
  }

  getFadeDuration(): number {
    return this.fadeDuration > 0 ? this.fadeDuration : ModuleObject.FADE_TIME;
  }

  setNoFadeOnDestroy(noFade: boolean){
    if(BitWise.InstanceOfObject(this, ModuleObjectType.ModuleCreature) || BitWise.InstanceOfObject(this, ModuleObjectType.ModulePlaceable)){
      this.noFadeOnDestroy = noFade;
      return;
    }
    this.noFadeOnDestroy = false;
  }

  /**
   * Destroy the object
   */
  destroy(){
    this.destroyed = true;
    try{ console.log('destroy', this.getTag(), this);}catch(e: any){}
    try{
      this.container.removeFromParent();

      this.removeShadowBlob();

      if(this.model instanceof OdysseyModel3D){
        this.model.removeFromParent();
        this.model.dispose();
        this.model = undefined;
      }

      if(this.mesh instanceof THREE.Mesh){
        this.mesh.removeFromParent();

        (this.mesh.material as THREE.Material).dispose();
        this.mesh.geometry.dispose();

        this.mesh.material = undefined;
        this.mesh.geometry = undefined;
        this.mesh = undefined;
      }

      //cleanup audio emitter
      if(this.audioEmitter){
        this.audioEmitter.destroy();
        this.audioEmitter = undefined;
      }

      if(this.footstepEmitter){
        this.footstepEmitter.destroy();
        this.footstepEmitter = undefined;
      }

      // Dispose all game effects
      if(this.effects && this.effects.length > 0){
        for(let i = this.effects.length - 1; i >= 0; i--){
          if(this.effects[i]){
            this.effects[i].onRemove();
          }
        }
        this.effects.length = 0;
      }

      //Cleanup scripts
      Object.keys(this.scripts).forEach( (key) => {
        if(this.scripts[key] instanceof NWScriptInstance){
          this.scripts[key].dispose();
        }
        this.scripts = {};
      });

      //Clear action queue
      if(this.actionQueue){
        this.actionQueue.clear();
        this.actionQueue = undefined;
      }

      //Clear computed path
      if(this.#computedPath){
        this.#computedPath.dispose();
        this.#computedPath = undefined;
      }

      //Clear perception list
      if(this.perceptionList){
        this.perceptionList.length = 0;
      }

      //Clear inventory
      if(this.inventory){
        for(let i = this.inventory.length - 1; i >= 0; i--){
          if(this.inventory[i]){
            this.inventory[i].destroy();
          }
        }
        this.inventory.length = 0;
      }

      //Clear rooms array
      if(this.rooms){
        this.rooms.length = 0;
      }

      //Clear objects inside
      if(this.objectsInside){
        this.objectsInside.length = 0;
      }

      //Dispose Three.js utility objects
      if(this.forceVector){
        this.forceVector = undefined;
      }
      // if(this.position){
      //   this.position = undefined;
      // }
      // if(this.rotation){
      //   this.rotation = undefined;
      // }
      // if(this.quaternion){
      //   this.quaternion = undefined;
      // }
      if(this.box){
        this.box = undefined;
      }
      if(this.sphere){
        this.sphere = undefined;
      }
      if(this.v20){
        this.v20 = undefined;
      }
      if(this.v21){
        this.v21 = undefined;
      }

      if(this.area){
        this.area.detachObject(this);
      }else if (GameState.module.area){
        GameState.module.area.detachObject(this);
      }

      //Clear references to prevent circular references
      this.area = undefined;
      this.room = undefined;
      this.lookAtObject = undefined;
      this.lastTriggerEntered = undefined;
      this.lastTriggerExited = undefined;
      this.lastAreaEntered = undefined;
      this.lastAreaExited = undefined;
      this.lastModuleEntered = undefined;
      this.lastModuleExited = undefined;
      this.lastDoorEntered = undefined;
      this.lastDoorExited = undefined;
      this.lastPlaceableEntered = undefined;
      this.lastPlaceableExited = undefined;
      this.lastAoeEntered = undefined;
      this.lastAoeExited = undefined;
      this.conversation = undefined;
      this.linkedToObject = undefined;

      GameState.ModuleObjectManager.RemoveObject(this); 
    }catch(e){
      console.error('ModuleObject.destroy', e);
    }
  }

}
