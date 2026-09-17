import * as THREE from "three";
import type { Action } from "@/actions/Action";
import { ActionQueue } from "@/actions/ActionQueue";
import { AudioEmitter } from "@/audio/AudioEmitter";
import { CollisionContext } from "@/engine/CollisionContext";
import {
  createCreatureMovementState,
  type CreatureMovementState,
} from "@/engine/movement/creature-movement-state";
import { teleportObject } from "@/engine/movement/teleport";
import { CombatData } from "@/combat/CombatData";
import type { EffectLink } from "@/effects";
import type { GameEffect } from "@/effects/GameEffect";
import EngineLocation from "@/engine/EngineLocation";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { GameEffectType } from "@/enums/effects/GameEffectType";
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
import { hasVisualLos } from "@/engine/pathfinding/visual-los";
import { isStaticWalkClearDetailed } from "@/engine/pathfinding/static-walk-blockers";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleDoor } from "@/module/ModuleDoor";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleRoom } from "@/module/ModuleRoom";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { getSpeakStringNotifyPlan, listenerHearsSpeaker } from "@/combat/speak-string-broadcast";
import {
  assignHostileActor as assignHostileActorHelper,
  getLastHostileActor as getLastHostileActorHelper,
} from "@/combat/last-hostile-actor";
import { EngineMode } from "@/enums/engine/EngineMode";
import { CutsceneMode } from "@/enums/dialog/CutsceneMode";
import { DLGObject } from "@/resource/DLGObject";
import { Faction } from "@/engine/Faction";
import { ScriptVarTable } from "@/engine/ScriptVarTable";
import { SWPlaceableAppearance } from "@/engine/rules/SWPlaceableAppearance";
import { SWCreatureAppearance } from "@/engine/rules/SWCreatureAppearance";
import { SWDoorAppearance } from "@/engine/rules/SWDoorAppearance";
import { IDialogAnimationState } from "@/interface/animation/IDialogAnimationState";
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
import { getForceResistanceBonus } from "@/effects/effect-bonuses";
import type { SWAnimation } from "@/engine/rules/SWAnimation";
import type { ModuleTrigger } from "@/module/ModuleTrigger";

import { resolveScriptAnimationConstant } from "@/module/animation/resolveScriptAnimationConstant";
import { isCreature } from "@/module/guards/isCreature";
import { isPlaceable } from "@/module/guards/isPlaceable";

export interface DialogModelVisibilityInput {
  mode: EngineMode;
  cutsceneMode: CutsceneMode;
  isPartyMember: boolean;
  /** StuntList participant — set via ModuleObject.setCutsceneMode(true). */
  objectCutsceneMode: boolean;
  roomModelVisible: boolean | undefined;
  hasRoom: boolean;
}

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
  /** SetMine free-ground half-extent (CreateNewGeometry 2.0). */
  static readonly TRAP_GROUND_HALF_EXTENT = 2.0;

  /**
   * Assign local-space trigger vertices for a square mine footprint.
   */
  static applyTrapGroundGeometry(
    trigger: ModuleTrigger,
    halfExtent: number = ModuleObject.TRAP_GROUND_HALF_EXTENT,
  ): void {
    if(!trigger) return;
    const h = Math.max(0.1, Number(halfExtent) || ModuleObject.TRAP_GROUND_HALF_EXTENT);
    trigger.vertices = [
      new THREE.Vector3(-h,  h, 0),
      new THREE.Vector3(-h, -h, 0),
      new THREE.Vector3( h,  h, 0),
      new THREE.Vector3( h, -h, 0),
    ];
  }

  /**
   * traps.2da `resref` for RecoverMine item restore.
   */
  static trapKitResRefFromRow(trapRow: any): string {
    if(!trapRow) return '';
    const resref = (trapRow.resref || '').toString().trim();
    if(!resref || resref === '****') return '';
    return resref;
  }

  /** Resolve mesh visibility for DIALOG / MINIGAME. */
  static resolveDialogModelVisibility(input: DialogModelVisibilityInput): boolean {
    if(input.mode == EngineMode.MINIGAME){
      return true;
    }
    if(input.mode != EngineMode.DIALOG){
      return true;
    }
    if(
      input.cutsceneMode == CutsceneMode.ANIMATED &&
      input.isPartyMember &&
      !input.objectCutsceneMode
    ){
      return false;
    }
    if(!input.hasRoom){
      return true;
    }
    return !!input.roomModelVisible;
  }

  facingSpeed: number = TURN_SPEED_SLOW;
  helperColor: THREE.Color = new THREE.Color(0xFFFFFF);

  combatOrder: number;
  combatRoundTimer: number;
  controlled: boolean;
  id: number;
  /**
   * mgo_index — slot in client MiniGameObjectArray (0xff = unset).
   * Synced to `id` on register so NWScript StackPushObject / StoreState use the slot
   * (ExecuteCommandSWMG_GetObjectByName pushes mgo_index).
   */
  mgoIndex: number = 0xff;
  initialized: boolean;
  isPlayer: boolean = false;
  isPM: boolean = false;
  name: string;
  objectType: number = ModuleObjectType.ModuleObject;

  effectIconList: IEffectIconListItem[] = [];

  container: OdysseyObject3D;
  /**
   * Scratch XY displacement for the current frame (PlayerControl RK4 output,
   * residual ExternalForce impulse). Not a second locomotion solver — policies
   * resolve then MovementCommitter commits. Prefer policy-local vectors when adding paths.
   */
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
  /** Unused — no surround/openSpot attack slot picker. */
  openSpot: any;

  audioEmitter: AudioEmitter;
  footstepEmitter: AudioEmitter;

  collisionContext: CollisionContext = new CollisionContext(this);
  /** @deprecated Use collisionContext — alias during rename window. */
  get collisionManager(): CollisionContext {
    return this.collisionContext;
  }
  set collisionManager(value: CollisionContext){
    this.collisionContext = value;
  }
  /** Contact / authority / frame ownership — not owned by CollisionContext geometry. */
  movementState: CreatureMovementState = createCreatureMovementState();
  invalidateCollision: boolean = false;
  combatData: CombatData = new CombatData(this);
  combatRound = new CombatRound(this);

  facing: number;
  wasFacing: number;
  force: number;
  speed: number;
  movementSpeed: number;

  area?: ModuleArea;

  //Room
  room: ModuleRoom;
  rooms: ModuleRoom[] = [];
  /** ApplyShadowBlob — Fx_Shadow_S/M/L model attached under the object. */
  shadowBlobModel: OdysseyModel3D;
  /** gob shadows flag — TurnOffShadows / HideShadowBlob when false. */
  shadowsEnabled = true;
  roomIds: number[] = [];
  roomSize: THREE.Vector3;

  inventory: ModuleItem[] = [];

  model: OdysseyModel3D;
  xOrientation: number;
  yOrientation: number;
  zOrientation: number;

  dialogAnimation: {
    animation: OdysseyModelAnimation,
    data: SWAnimation,
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
  collisionBoundsDirty: boolean = true;
  collisionMatrixDirty: boolean = true;
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
  /** named VarTable  — round-trip from saves */
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
   * Priority in AIScheduler lists.
   * INVALID until registered via aiScheduler.addObject.
   */
  aiLevel: AILevel = AILevel.INVALID;
  /** Elapsed world-time accumulator for the per-object 6s heartbeat (ms). */
  _aiHeartbeatElapsedMs: number = 0;
  /** World time (ms) of the last aiUpdate — used to accumulate skipped-frame delta. */
  _lastAIUpdateWorldMs: number = 0;
  /** Set by AIScheduler creature loco pass so aiUpdate skips re-processing move actions. */
  _creatureLocoThisFrame: boolean = false;

  //Perception
  heardStrings: IHeardString[] = [];
  perceptionList: IPerceptionInfo[] = [];
  isListening: boolean;
  /**
   * Registered listen expressions in registration order (expression_list).
   * Keyed by pattern number via SetListenExpression; first match wins on scan.
   */
  listeningPatterns: Array<{ pattern: string; number: number }> = [];
  /**
   * Per-node captures from the last listen match (matched_expression_strings).
   * Indexed by GetMatchedSubstring after OnDialogue.
   */
  matchedSubstrings: string[] = [];
  perceptionRange: SWRange;

  spawned: boolean = false;
  _inventoryPointer: number;

  //stats
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
  /** TSL SetForceAlwaysUpdate — keep updating past 250m cutscene range. */
  forceAlwaysUpdate: boolean = false;
  /** TSL EnableRendering — when false, skip drawing this object. */
  enableRendering: boolean = true;

  //complex animation varaibles
  fp_push_played: any;
  fp_land_played: any;
  fp_getup_played: any;

  /**
   * spell_target_position — stamped by item/force casts for
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
  /** Pass AL — creature object ids that have detected this trap (DetectedBy lists). */
  trapDetectedByIds: number[] = [];
  /** Visual / script “detected” latch (triggers); set by SetTrapDetectedBy / detectTrap. */
  trapDetected: boolean = false;
  ownerDemolitions: number = -1;
  /** Creature that created/set this trap (GetTrapCreator). */
  trapCreator: ModuleObject = undefined;
  /** Tag of key that disarms this trap (GetTrapKeyTag); often same as KeyName. */
  trapKeyTag: string = '';
  /** Last object that disarmed a trap on this door/placeable/trigger. */
  lastDisarmedBy: ModuleObject = undefined;
  /** Last object that locked this door/placeable. */
  lastLockedBy: ModuleObject = undefined;
  /** Last object that unlocked this door/placeable. */
  lastUnlockedBy: ModuleObject = undefined;
  /** MetaMagic feat byte for the active spell context (GetMetaMagicFeat). */
  metaMagicFeat: number = 0xff;

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
    // this.wm_c_point = new THREE.Vector3;

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
    // object heartbeat fires every 5999ms; stagger start like the old 3s path.
    this._heartbeatTimeout = 6000;
    this._aiHeartbeatElapsedMs = this._heartbeatTimerOffset;
    this.aiLevel = AILevel.INVALID;
    this._lastAIUpdateWorldMs = 0;
    this._creatureLocoThisFrame = false;

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

  }

  getScriptInstance(scriptKey: ModuleObjectScript): NWScriptInstance | undefined {
    const script = this.scripts[scriptKey];
    if(!script){ return undefined; }
    if(!script.scriptKey){
      script.bindOwner(this, scriptKey);
    }
    return script;
  }

  /**
   * Attach to room
   * @param room
   */
  attachToRoom(room: ModuleRoom){
    this.detachFromRoom(this.room);
    this.room = room;
    this.room.attachChildObject(this);
    this.markCollisionBoundsDirty();
  }

  /**
   * Detach from room
   * @param room
   */
  detachFromRoom(room: ModuleRoom){
    if(!room) return;
    room.removeChildObject(this);
    this.room = undefined;
    this.markCollisionBoundsDirty();
  }

  markCollisionMatrixDirty(_reason?: string){
    this.collisionMatrixDirty = true;
    if(BitWise.InstanceOf(this.objectType, ModuleObjectType.ModulePlaceable) && this.isStatic?.()){
      this.room?.markCollisionPlaceablesDirty?.(_reason);
    }
  }

  markCollisionBoundsDirty(_reason?: string){
    this.collisionBoundsDirty = true;
    this.collisionMatrixDirty = true;
    if(BitWise.InstanceOf(this.objectType, ModuleObjectType.ModulePlaceable)){
      this.room?.markCollisionPlaceablesDirty?.(_reason);
    }
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
   * Scheduled by Module.aiScheduler (budgeted, may skip frames).
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

    // heartbeat threshold: 5999ms
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
   * Per-frame object update — destroy fade, camera distance, room check, shadow blob, sphere sync.
   * Budgeted logic (heartbeat / effects / actions) lives in aiUpdate.
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

    this.updateRoomAttachment(delta);

    if(this.shadowBlobModel){
      this.updateShadowBlobVisibility();
      this.updateShadowBlobOrientation();
    }

    this.sphere.center.copy(this.position);
    this.sphere.radius = this.getHitDistance() * 2;

  }

  /**
   * Refresh room/model visibility. Creatures override to run walkmesh roomCheck.
   * Doors/triggers override as a no-op — they use getCurrentRoom.
   */
  protected updateRoomAttachment(_delta: number = 0){
    if(this.spawned){
      this.updateModelVisibility();
    }
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
      this.updateModelVisibility();
    }
  }

  /**
   * Update the model visibility
   */
  updateModelVisibility(){
    if(!this.model){ return; }
    this.model.wasOffscreen = !this.model.visible;

    // FreeLook: controlled PC is not drawn (camera on FreeLookHook).
    if(GameState.Mode == EngineMode.FREELOOK){
      const player = GameState.getCurrentPlayer();
      if(player && this.id === player.id){
        this.model.visible = false;
        return;
      }
    }

    if(GameState.Mode == EngineMode.INGAME){
      if(!this.room){
        this.model.visible = true;
        return;
      }else{
        // VIS / gameplay gate — not room mesh draw cull (frustum may hide
        // room.model while visActive stays true; mirrors LightManager).
        this.model.visible = !!this.room?.model?.userData?.visActive;
      }

      //Check to see if the model is inside the current camera's frustum
      if(!this.isOnScreen()){
        this.model.visible = false;
      }
      return;
    }

    if(GameState.Mode == EngineMode.DIALOG || GameState.Mode == EngineMode.MINIGAME){
      this.model.visible = ModuleObject.resolveDialogModelVisibility({
        mode: GameState.Mode,
        cutsceneMode: GameState.CutsceneManager?.cutsceneMode ?? CutsceneMode.DIALOG,
        isPartyMember: this.isPartyMember(),
        objectCutsceneMode: !!this.cutsceneMode,
        hasRoom: !!this.room,
        roomModelVisible: this.room?.model?.userData?.visActive,
      });
    }
  }

  /**
   * Clear all actions
   * @param skipUnclearable — ActionManager(1) / ClearAllActions(1): keep
   * unclearable actions (dialog), ClearAllAttacks on the combat round, and
   * interrupt combat-round pause so a newly queued CAST_SPELL / attack can
   * dispatch via ActionCombat immediately.
   *
   * ClearAllActions (commandable path) keeps
   * conversation control actions via a per-action callback. EffectHorrified
   * SetState must not drop Pause/Wait/Resume or dialogs hang (tar08_calo082).
   *
   * ClearAllActions does **not** RemoveAllActions
   * on the combat-round schedule — that is a separate call (GUI ClearAll
   * CancelCombat / SetCombatState(0)). Keeping the schedule lets the player
   * queue multiple attacks/spells while in combat.
   */
  clearAllActions(skipUnclearable = false){
    // ClearAllActions(1) → ClearAllAttacks only (not RemoveAllActions).
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
    //this.actionQueue.clear;
    if(skipUnclearable){
      let i = this.actionQueue.length;
      while(i--){
        let action = this.actionQueue[i];
        // ClearAllActions (commandable path) uses
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

    // CancelGuiTimingEvent clears actions; clearing actions must also StopGuiTimingBar.
    GameState.GuiTimingBarManager?.cancelFor?.(this);

    // ClearAllActions does not clear GetAttackTarget /
    // GetAttemptedAttackTarget (or spell targets). GN_EquipAppropriateWeapon runs
    // after ClearAllActions and needs GetAttackTarget for the melee switch.
    // Those fields clear on SetCombatState(0) / cancelCombat instead.
    if((this as { foundEnemyCreature?: unknown }).foundEnemyCreature !== undefined){
      (this as { foundEnemyCreature?: unknown }).foundEnemyCreature = undefined;
    }
    // Drop sticky walk / approach / player-control axes after cancel
    (this as any).clearLocomotionState?.(true);
    //this.clearTarget;
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

    const animConstant = resolveScriptAnimationConstant(anim);
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
    // Params 6–11: ignore-object names (AddToDialogNonDependantList)
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
   * @deprecated
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
   * @deprecated
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
   * Polymorphic animation-constant → animations.2da row lookup.
   * Base stub — type-specific resolution lives on ModuleCreature / Door / Placeable.
   */
  animationConstantToAnimation( _animationConstant = 10000 ): SWAnimation | undefined {
    return undefined;
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
      this.markCollisionMatrixDirty("facing");
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
   * Run OnUserDefined on the object slot instance.
   * Sync execution + resetForRun/init keep STORE_STATE / stack residue from polluting the next fire.
   */
  protected runUserDefinedScript(event: NWScriptEvent, script: NWScriptInstance | undefined): void {
    if(!(event instanceof NWScriptEvent) || !script){ return; }
    script.run(this, parseInt(event.getInt(0)));
  }

  /**
   * Trigger the user defined event — subtypes override.
   * : EventHandler SignalEvent 0x0B runs script_on_user_defined;
   * EventHandler case 0x0B runs Mod_OnUsrDefined.
   */
  triggerUserDefinedEvent( _event: NWScriptEvent ){
    //stub
  }

  /**
   * Run OnSpellCastAt / ScriptSpellAt with lastSpell* fields populated.
   */
  protected runSpellCastAtScript(event: NWScriptEvent, script: NWScriptInstance | undefined): void {
    if(!(event instanceof NWScriptEvent) || !script){ return; }
    script.lastSpellCaster = event.getObject(0);
    script.lastSpell = event.getInt(0);
    script.lastSpellHarmful = !!event.getInt(1);
    script.run(this);
  }

  /**
   * Trigger the spell cast at event — subtypes override.
   * creature EventHandler case 2 / placeable-door:
   * harmful → BroadcastCombatStateToParty + SetExcitedState.
   */
  triggerSpellCastAtEvent( _event: NWScriptEvent ){
    //stub
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
   * Heartbeat gate — only after onSpawn and module event processing is ready.
   */
  protected canProcessHeartbeat(): boolean {
    return this.spawned === true && !!GameState.module?.readyToProcessEvents;
  }

  /**
   * Trigger the heartbeat — subtypes override.
   */
  triggerHeartbeat(){
    //stub
  }

  /**
   * Get the appearance
   * @returns
   */
  getAppearance(): SWPlaceableAppearance|SWCreatureAppearance|SWDoorAppearance {
    return;
  }

  /**
   * Subtype OnSpawn / ScriptSpawn — creatures override.
   */
  protected runSpawnScript(): void {
    //stub
  }

  /**
   * On spawn
   * @param runScript
   */
  onSpawn(runScript = true){
    if(runScript){
      this.runSpawnScript();
    }

    this.spawned = true;

    this.initEffects();
    this.computeBoundingBox();
  }

  /**
   * Bind trapscript into the host's OnTrapTriggered slot — trigger/placeable/door override.
   */
  protected bindTrapTriggeredScript(_nwscript: NWScriptInstance): ModuleObjectScript | undefined {
    return undefined;
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
   * Get the object's inventory bag.
   * Party members override this to return the shared party inventory.
   */
  getInventory(): ModuleItem[] {
    return this.inventory;
  }

  /**
   * Check if the object has the item by tag
   * @param sTag
   * @returns
   */
  hasItemByTag(sTag=''){
    return !!this.getItemByTag(sTag);
  }

  /**
   * Add the item
   * Merges into existing stacks by tag up to baseitems.stacking.
   * @param item
   * @returns
   */
  addItem(item: ModuleItem){
    item.load();

    const tag = (item.getTag() || '').toLowerCase();
    const maxStack = (item.baseItem?.stacking | 0) || 1;
    let remaining = item.getStackSize() | 0;
    let lastMerged: ModuleItem = undefined;

    for(let i = 0; i < this.inventory.length && remaining > 0; i++){
      const eItem = this.inventory[i];
      if((eItem.getTag() || '').toLowerCase() !== tag){
        continue;
      }

      const room = maxStack - (eItem.getStackSize() | 0);
      if(room <= 0){
        continue;
      }

      const add = Math.min(room, remaining);
      eItem.setStackSize((eItem.getStackSize() | 0) + add);
      remaining -= add;
      lastMerged = eItem;
    }

    if(remaining <= 0){
      item.setStackSize(0);
      return lastMerged || item;
    }

    item.setStackSize(remaining);
    this.inventory.push(item);
    return item;
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
    sTag = (sTag || '').toLowerCase();
    const inventory = this.getInventory();
    for(let i = 0; i < inventory.length; i++){
      const item = inventory[i];
      if((item.getTag() || '').toLowerCase() == sTag)
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
    //console.log('doCommand', this.getTag, script, action, instruction);
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
    const trap = GameState.SWRuleSet.traps[nTrapId];
    if(!trap){ return; }

    if(trap.trapscript?.length && trap.trapscript != '****'){
      const nwscript = NWScript.Load(trap.trapscript);
      if(nwscript){
        const trapKey = this.bindTrapTriggeredScript(nwscript);
        if(trapKey){
          this.scripts[trapKey] = nwscript;
          nwscript.bindOwner(this, trapKey);
        }
      }
    }

    this.trapType = nTrapId;
    this.trapCreator = owner;
    this.trapFlag = true;

    this.ownerDemolitions = owner.getSkillLevel(SkillType.DEMOLITIONS);
    const d20 = 20;

    const nDetectDC = trap.detectdcmod;
    this.trapDetectDC = nDetectDC + d20 + this.ownerDemolitions;
    this.trapDetectable = true;

    const nDisarmDC = trap.disarmdcmod;
    this.trapDisarmDC = nDisarmDC + d20 + this.ownerDemolitions;
    this.trapDisarmable = true;

    const trigger = new GameState.Module.ModuleArea.ModuleTrigger();
    trigger.initialized = true;
    trigger.name = GameState.TLKManager.GetStringById(trap.name)?.Value;
    trigger.factionId = owner.factionId;
    trigger.type = ModuleTriggerType.TRAP;
    trigger.trapType = nTrapId;
    trigger.setByPlayerParty = owner.isPartyMember();
    trigger.trapDetectDC = this.trapDetectDC;
    trigger.trapDisarmDC = this.trapDisarmDC;
    trigger.trapDetectable = true;
    trigger.trapDisarmable = true;
    trigger.ownerDemolitions = -1;
    trigger.trapCreator = owner;
    trigger.position.copy(this.position);

    trigger.linkedToObject = this;
    this.linkedToObject = trigger;

    // CreateNewGeometry(2.0) + traps.2da resref for RecoverMine
    trigger.trapResRef = ModuleObject.trapKitResRefFromRow(trap);
    ModuleObject.applyTrapGroundGeometry(trigger);

    trigger.load();

    this.area?.attachObject(trigger);
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
    const trap = GameState.SWRuleSet.traps[nTrapId];
    if(!trap){ return undefined; }

    const d20 = 20;
    const ownerDemolitions = owner.getSkillLevel(SkillType.DEMOLITIONS);
    const nDetectDC = trap.detectdcmod;
    const nDisarmDC = trap.disarmdcmod;

    const trigger = new GameState.Module.ModuleArea.ModuleTrigger();
    trigger.initialized = true;
    trigger.name = GameState.TLKManager.GetStringById(trap.name)?.Value;
    trigger.factionId = owner.factionId;
    trigger.type = ModuleTriggerType.TRAP;
    trigger.trapType = nTrapId;
    trigger.setByPlayerParty = owner.isPartyMember();
    trigger.trapDetectDC = nDetectDC + d20 + ownerDemolitions;
    trigger.trapDisarmDC = nDisarmDC + d20 + ownerDemolitions;
    trigger.trapDetectable = true;
    trigger.trapDisarmable = true;
    trigger.ownerDemolitions = ownerDemolitions;
    trigger.trapCreator = owner;
    trigger.position.set(position.x, position.y, position.z);

    if(trap.trapscript?.length && trap.trapscript != '****'){
      const nwscript = NWScript.Load(trap.trapscript);
      trigger.scripts[ModuleObjectScript.TriggerOnTrapTriggered] = nwscript;
      if(nwscript){
        nwscript.bindOwner(trigger, ModuleObjectScript.TriggerOnTrapTriggered);
      }
    }

    // CreateNewGeometry(2.0, plantPos) @ SetMine; resref for RecoverMine kit
    trigger.trapResRef = ModuleObject.trapKitResRefFromRow(trap);
    ModuleObject.applyTrapGroundGeometry(trigger);

    trigger.load();
    area.attachObject(trigger);
    return trigger;
  }

  /**
   * Pass AL — SetTrapDetectedBy / GetTrapDetectedBy (DetectedBy object-id lists).
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
    if(isCreature(detector)){
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
   *.
   * @param hostileActor - attacker / damager / harmful caster (or undefined to clear)
   * @param force - when true, write the id without plot/faction/alive checks (CancelCombat clear)
   */
  assignHostileActor(hostileActor: ModuleObject | undefined, force: boolean = false){
    assignHostileActorHelper(this, hostileActor, force);
  }

  /**
   * ExecuteCommandget hostile actor — returns last_hostile_actor_id
   * when still a living creature (AOE resolves to creator); clears stale refs.
   */
  getLastHostileActor(): ModuleObject | undefined {
    return getLastHostileActorHelper(this);
  }

  /**
   * IsInjured — current/max < 0.2.
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
   * On damaged — virtual lifecycle hook; subtypes override.
   */
  onDamaged(){
    //stub
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
   * Creature ScriptEndDialogu / placeable OnEndDialogue — end-of-conversation.
   */
  onEndDialog(){
    //stub
  }

  /**
   * On attacked — virtual lifecycle hook; subtypes override.
   */
  onAttacked(_attackType: CombatActionType){
    //stub
  }

  /**
   * On blocked
   */
  onBlocked(){
    //stub
  }

  speakString(str: string, volume: TalkVolume){
    // BroadcastDialog — area objects in range with
    // listening set. Party members live in PartyManager.party (not always in
    // area.creatures), so they must be notified for every volume that notifies.
    const plan = getSpeakStringNotifyPlan(volume);
    const talkVolume = volume;
    const rangeSquared = plan.range * plan.range;
    // Keep original case — captures slice from the original-case
    // input; matching lowercases internally when case-insensitive.
    const spoken = str;
    const notified = new Set<number>();

    const pushHeard = (creature: any, requireHeardPerception: boolean) => {
      if(!creature || creature === (this as any) || creature.isDead?.()) return;
      const id = creature.id;
      if(id != null){
        if(notified.has(id)) return;
        notified.add(id);
      }
      const d2 = this.position.distanceToSquared(creature.position);
      if(d2 > rangeSquared) return;
      // : creature→creature needs HEARD visibility bit. Party path skips
      // (forces mutual party perception).
      if(requireHeardPerception && !listenerHearsSpeaker(creature, this)) return;
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
          pushHeard(party[i], false);
        }
      }
    }

    if(plan.notifyCreatures){
      const creatures = this.area?.creatures;
      if(creatures){
        for(let i = 0, len = creatures.length; i < len; i++){
          pushHeard(creatures[i], true);
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
   * Set the commandable state.
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
    this.assignHostileActor(oAttacker);
    this.onDamaged();
  }

  /**
   * Get the current room via deprecated findWalkableFace shim.
   * Prefer findWalkableAttachmentAt for queries without mutation.
   */
  getCurrentRoom(){
    this.collisionContext.findWalkableFace();
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
      // object height is an offset from the object's world position.
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
   * @deprecated
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
   * ApplyShadowBlob — attach Fx_Shadow_S/M/L under the model root.
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
      this.updateShadowBlobOrientation();
      this.updateShadowBlobVisibility();
    }catch(_e){
      // Missing Fx_Shadow_* models is non-fatal (e.g. incomplete installs).
    }
  }

  /** HideShadowBlob / ShowShadowBlob — area shadows + per-object flag. */
  updateShadowBlobVisibility(){
    if(!this.shadowBlobModel){ return; }
    if(GameState.Mode == EngineMode.FREELOOK){
      const player = GameState.getCurrentPlayer();
      if(player && this.id === player.id){
        this.shadowBlobModel.visible = false;
        return;
      }
    }
    this.shadowBlobModel.visible = GameState.areShadowsEnabled() && this.shadowsEnabled;
  }

  /**
   * SetShadowBlobOrientation — align foot blob to walkmesh ground normal.
   */
  updateShadowBlobOrientation(){
    if(!this.shadowBlobModel){ return; }
    const up = ModuleObject._shadowBlobUp;
    const groundNormal = this.getGroundNormalForShadowBlob();
    if(groundNormal.lengthSq() < 1e-8){ return; }
    ModuleObject._shadowBlobQuat.setFromUnitVectors(up, groundNormal);
    this.shadowBlobModel.quaternion.copy(ModuleObject._shadowBlobQuat);
  }

  /** Walkable face normal in world space, or +Z when no ground face. */
  getGroundNormalForShadowBlob(): THREE.Vector3 {
    const face = this.collisionManager.groundFace;
    if(face?.normal){
      ModuleObject._shadowBlobNormal.copy(face.normal);
      if(this.room?.model?.matrixWorld){
        ModuleObject._shadowBlobNormal.applyMatrix3(
          ModuleObject._shadowBlobNormalMatrix.getNormalMatrix(this.room.model.matrixWorld)
        );
      }
      return ModuleObject._shadowBlobNormal.normalize();
    }
    return ModuleObject._shadowBlobUp;
  }

  /** TurnOffShadows — disable projection and foot blob. */
  setShadowsEnabled(enabled: boolean){
    this.shadowsEnabled = !!enabled;
    this.updateShadowBlobVisibility();
  }

  private static _shadowBlobUp = new THREE.Vector3(0, 0, 1);
  private static _shadowBlobNormal = new THREE.Vector3();
  private static _shadowBlobNormalMatrix = new THREE.Matrix3();
  private static _shadowBlobQuat = new THREE.Quaternion();

  removeShadowBlob(){
    if(this.shadowBlobModel){
      this.shadowBlobModel.removeFromParent();
      try{ this.shadowBlobModel.dispose(); }catch(_e){}
      this.shadowBlobModel = undefined;
    }
  }

  /**
   * Resolve Fx_Shadow_S/M/L from appearance.sizecategory (creatures).
   * size 1–2 → S, 4–5 → L, else M (ApplyShadowBlob).
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
   * Resolve Fx_Shadow_S/M/L from placeables.2da ShadowSize.
   * 0 → S, 1 → M, 2 → L, else M (ApplyShadowBlob).
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
  /**
   * Authoritative placement / teleport.
   * Does not slide, set blockers, or fire OnBlocked.
   * Prefer this for Jump / spawn / scripted relocation.
   */
  setPosition(x: THREE.Vector3|number = 0, y = 0, z = 0){
    if(x instanceof THREE.Vector3){
      z = x.z;
      y = x.y;
      x = x.x;
    }
    try{
      teleportObject(this, x, y, z, {
        findGround: false,
        caller: "ModuleObject.setPosition",
      });
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
      this.area
    );

    return location;
  }

  /**
   * Creature/object forward as an EngineLocation orientation vector.
   * Matches EngineLocation.setFacing and FollowerCamera.getCreatureForwardXY:
   * (−sin(θ), cos(θ)) for model yaw θ (rotation.z).
   * GetLocation / GetScriptLocation copies this live orientation.
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
   * Get the CON
   * @returns
   */
  getCON(): number {
    return 0;;
  }

  /**
   * Get the DEX
   * @returns
   */
  getDEX(): number {
    return 0;
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
    if(isCreature(this) && isCreature(oCaster)){
      //https://gamefaqs.gamespot.com/boards-star-wars-knights-of-the-old-republic
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
    // Drop any EffectDamage that was incorrectly persisted (effect apply
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
   * object.area_id for save export — area game ObjectId, not ARE template ID.
   */
  getSaveAreaId(): number {
    return (this.area?.id ?? 0) >>> 0;
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
    // : allocate effect id from module Mod_Effect_NxtId when not loaded from save
    if(!effect.id && GameState.module){
      if(typeof GameState.module.effectNextId !== 'number' || isNaN(GameState.module.effectNextId)){
        GameState.module.effectNextId = 1;
      }
      effect.setId(GameState.module.effectNextId++);
    }
    effect.setAttachedObject(this);
    effect.loadModel();
    effect.onApply(this);
    // Immunities / invalid modes return before super.onApply — do not keep rejected effects
    if(!effect.applied){
      return;
    }
    // ApplyEffect — effect apply returns 1 so the
    // effect is freed and never inserted into EffectList. Keeping it caused
    // re-apply (and OnDamaged) during initEffects on module load.
    // OnApplyResurrection / OnApplyHeal also return 1 (instant free).
    if(
      effect.type === GameEffectType.EffectDamage ||
      effect.type === GameEffectType.EffectResurrection ||
      effect.type === GameEffectType.EffectHeal
    ){
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
   * Remove every attached effect (ClearAllEffects).
   * @param retainSelfBuffs - SurrenderRetainBuffs: keep effects created by this object
   */
  clearAllEffects(retainSelfBuffs: boolean = false){
    const effects = this.effects ? this.effects.slice() : [];
    for(let i = 0; i < effects.length; i++){
      const effect = effects[i];
      if(!effect) continue;
      const duration = effect.getDurationType?.() ?? (effect.subType & 0x07);
      // skips EQUIPPED (3) and INNATE (4)
      if(duration === 3 || duration === 4) continue;
      if(effect.type === 0x09) continue; // EffectSetStateInternal
      if(retainSelfBuffs && effect.creator === this) continue;
      this.removeEffect(effect);
    }
  }

  /**
   * effect apply effect strip + IsEffectToIgnoreOnDeath.
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
   * IsEffectToIgnoreOnDeath — removefxondeath.2da EffectType column
   * uses NWScript EFFECT_TYPE_* (Disguise=62, Beam=21). Beam VFX also kept.
   */
  isEffectToIgnoreOnDeath(effect: GameEffect): boolean {
    if(!effect) return false;
    // EFFECT_DISGUISE = 62 → GameEffectType.EffectDisguise (0x3E)
    if(effect.type === GameEffectType.EffectDisguise) return true;
    // EFFECT_BEAM = 21 → GameEffectType.EffectBeam (0x20)
    if(effect.type === GameEffectType.EffectBeam) return true;
    // VisualEffect that is a beam (type_fd 'B') — GetIsBeam
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
   * Jump to an EngineLocation — JumpToLocation / JumpToPoint action.
   * Cross-area: AddToArea. Cross-module (party leader): LoadModule + spawn XYZ.
   */
  JumpToLocation(lLocation: EngineLocation){
    if(!lLocation) return;
    if(isCreature(this)){
      const action = new GameState.ActionFactory.ActionJumpToPoint();
      action.setParameter(0, ActionParameterType.FLOAT, lLocation.position.x);
      action.setParameter(1, ActionParameterType.FLOAT, lLocation.position.y);
      action.setParameter(2, ActionParameterType.FLOAT, lLocation.position.z);
      const areaId = lLocation.area?.id ?? this.area?.id ?? 0;
      action.setParameter(3, ActionParameterType.DWORD, areaId);
      action.setParameter(4, ActionParameterType.INT, 1);
      action.setParameter(5, ActionParameterType.FLOAT, 20.0);
      action.setParameter(6, ActionParameterType.FLOAT, lLocation.rotation.x);
      action.setParameter(7, ActionParameterType.FLOAT, lLocation.rotation.y);
      // Instant jump: run one update (AddActionToFront + process)
      action.owner = this;
      action.update(0);
      return;
    }
    this.position.set( lLocation.position.x, lLocation.position.y, lLocation.position.z );
    this.markCollisionMatrixDirty("position");
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
   * DoDamage clamps to 1 when min1hp is set.
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
    if(!force && !this.collisionBoundsDirty && !this.collisionMatrixDirty){
      return this.box;
    }

    if(this.collisionManager?.refreshObjectBounds){
      this.collisionManager.refreshObjectBounds(force);
      return this.box;
    }

    if(this.container){
      this.container.updateMatrixWorld(force);
      this.container.updateMatrix();
      if(force){
        this.container.traverse( n => {
          n.updateMatrixWorld(true);
          n.updateMatrix();
        })
      }
    }

    if(this.model){
      this.model.updateMatrixWorld(force);
      this.model.updateMatrix();
    }

    if(this.model instanceof THREE.Object3D)
      this.box.setFromObject(this.model);

    this.collisionBoundsDirty = false;
    this.collisionMatrixDirty = false;
    return this.box;
  }

  boxContainsPoint(point: THREE.Vector3){
    return point.x >= this.box.min.x && point.x <= this.box.max.x &&
      point.y >= this.box.min.y && point.y <= this.box.max.y;
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

    // Keep world AABB in sync with position (committers mark dirty; must refresh
    // before sphere test or spawn-box cull hides moved creatures).
    if(this.collisionMatrixDirty || this.collisionBoundsDirty){
      this.computeBoundingBox();
    }

    this.box.getBoundingSphere(this.sphere);
    return frustum.intersectsSphere(this.sphere);
  }

  /**
   * GetReticlePoint — prefer lookathook.
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
   * Set the listening pattern (SetListenExpression).
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

  /** Clear matched substrings (ClearMatchedExpressionStrings). */
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
   * SaveCreature writes every non-null 
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
          this.area?.subtractStealthXP();
        }
      }else{
        if(object.isPlayer && this.isHostile(object)){
          this.area?.addStealthXP();
        }
      }
    }

    let onNotice: NWScriptInstance;
    if(isCreature(this)){
      onNotice = this.scripts[ModuleObjectScript.CreatureOnNotice];
    }

    if(triggerOnNotice && onNotice){
      // sets discrete event flags (0x904 Heard / 0x90c Inaudible) — not cumulative list bits
      onNotice.lastPerceived = {
        object: object,
        objectId: object.id,
        data: heard ? PerceptionMask.HEARD : PerceptionMask.INAUDIBLE
      };
      onNotice.run(this);
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
          this.area?.subtractStealthXP();
        }
      }else{
        if(object.isPlayer && this.isHostile(object)){
          this.area?.addStealthXP();
        }
      }
    }

    let onNotice: NWScriptInstance;
    if(isCreature(this)){
      onNotice = this.scripts[ModuleObjectScript.CreatureOnNotice];
    }

    if(triggerOnNotice && onNotice){
      // sets discrete event flags (0x908 Seen / 0x910 Vanished)
      onNotice.lastPerceived = {
        object: object,
        objectId: object.id,
        data: seen ? PerceptionMask.SEEN : PerceptionMask.INVISIBLE
      };
      onNotice.run(this);
      return true;
    }
  }

  #tmpPositionA = new THREE.Vector3();
  #tmpPositionB = new THREE.Vector3();
  #tmpDirection = new THREE.Vector3();

  /**
   * Check if the object has line of sight to another object.
   * visual LOS / hasVisualLos (combat / GetIsInUseRange) uses eye
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
      /** visual LOS / hasVisualLos excludes source + target object ids from hits. */
      ignoreObject?: ModuleObject;
      /** End point override (GetIsInUseRange → nearest action point). */
      toPosition?: THREE.Vector3;
      /**
       * Skip room walkmesh face tests. Use-range visual LOS / hasVisualLos is
       * static walk blockers (detailed), not a full walkable-face raycast — room meshes
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

    if(!this.area){
      return false;
    }

    if(opts?.skipRoomWalkmesh){
      // Use-range: Detailed-only (personal_space 0.001), no AABB LOS
      const ignoreIds = [this.id, ignoreObject?.id].filter((id) => id != null) as number[];
      if(isCreature(this)){
        const ignoreDoor = ((this as unknown) as ModuleCreature).pathFindIgnoreObjectId | 0;
        if(ignoreDoor) ignoreIds.push(ignoreDoor);
      }
      const a = this.#tmpPositionA.clone();
      const b = this.#tmpPositionB.clone();
      a.z += eyeHeight;
      b.z += eyeHeight;
      return isStaticWalkClearDetailed(this.area, a, b, {
        personalSpace: 0.001,
        ignoreObjectIds: ignoreIds,
        skipMesh: true,
      }).clear;
    }

    return hasVisualLos(this.area, this.#tmpPositionA, this.#tmpPositionB, {
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
  dialogPlayAnimation(anim: SWAnimation = {} as SWAnimation){
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

    // AddToArea / Load*: register after Tag is known (RegisterObject = ObjectList + tag lookup).
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
   * Load named VarTable from a GFF LIST field.
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

  /** creature ctor SetFadeOutTime(8000). */
  static FADE_TIME: number = 8.0;

  /**
   * Fade-out length in seconds (SetFadeOutTime default 8000ms).
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
    if(isCreature(this) || isPlaceable(this)){
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
    if(isCreature(this) || isPlaceable(this)){
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
      });
      this.scripts = {};

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
      // this.position = undefined;
      // }
      // if(this.rotation){
      // this.rotation = undefined;
      // }
      // if(this.quaternion){
      // this.quaternion = undefined;
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

      this.area?.detachObject(this);

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
