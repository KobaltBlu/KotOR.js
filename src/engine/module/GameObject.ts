import * as THREE from "three";
import type { Action } from "@engine/actions/Action";
import { ActionQueue } from "@engine/actions/ActionQueue";
import { AudioEmitter } from "@engine/audio/AudioEmitter";
import { CollisionContext } from "@engine/movement/CollisionContext";
import {
  createCreatureMovementState,
  type CreatureMovementState,
} from "@engine/movement/creature-movement-state";
import { teleportObject } from "@engine/movement/teleport";
import { CombatData } from "@engine/combat/CombatData";
import type { EffectLink } from "@engine/effects";
import type { GameEffect } from "@engine/effects/GameEffect";
import EngineLocation from "@engine/runtime/EngineLocation";
import { ActionParameterType } from "@core/enums/actions/ActionParameterType";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameState } from "@engine/runtime/GameState";
import { IEffectIconListItem } from "@engine/interface/module/IEffectIconListItem";
import { SSFType } from "@core/enums/resource/SSFType";
import { NWScriptEvent } from "@engine/nwscript/events";
import { NWScriptInstance } from "@engine/nwscript/NWScriptInstance";
import { OdysseyModel, OdysseyModelAnimation, OdysseyWalkMesh } from "@engine/odyssey";
import { CExoLocString } from "@core/resource/CExoLocString";
import { GFFField } from "@core/resource/GFFField";
import { GFFObject } from "@core/resource/GFFObject";
import { GFFStruct } from "@core/resource/GFFStruct";
import { LIPObject } from "@core/resource/LIPObject";
import { OdysseyModel3D, OdysseyObject3D } from "@engine/render/three/odyssey";
import { Utility } from "@core/utility/Utility";
import { ComputedPath } from "@engine/pathfinding";
import type { Area } from "@engine/module/Area";
import type { Door } from "@engine/module/Door";
import type { Item } from "@engine/module/Item";
import type { AreaRoom } from "@engine/module/area/AreaRoom";
import {
  assignHostileActor as assignHostileActorHelper,
  getLastHostileActor as getLastHostileActorHelper,
} from "@engine/combat/last-hostile-actor";
import { EngineMode } from "@engine/enums/engine/EngineMode";
import { DLGObject } from "@engine/dialog/DLGObject";
import { Faction } from "@engine/world/Faction";
import { ScriptVarTable } from "@engine/world/ScriptVarTable";
import { SWPlaceableAppearance } from "@engine/rules/SWPlaceableAppearance";
import { SWCreatureAppearance } from "@engine/rules/SWCreatureAppearance";
import { SWDoorAppearance } from "@engine/rules/SWDoorAppearance";
import { IDialogAnimationState } from "@engine/interface/animation/IDialogAnimationState";
import { AILevel } from "@core/enums/module/AILevel";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { GameObjectConstant } from "@core/enums/module/GameObjectConstant";
import type { IPerceptionInfo } from "@engine/interface/engine/IPerceptionInfo";
import { PerceptionMask } from "@engine/enums/engine/PerceptionMask";
import { MDLLoader } from "@engine/loaders";
import { CombatRound, CombatRoundAction } from "@engine/combat";
import { BitWise } from "@core/utility/BitWise";
import { ActionType } from "@core/enums/actions/ActionType";
import { ScriptHook } from "@core/enums";
import { CombatActionType } from "@core/enums/combat/CombatActionType";
import { TalkVolume } from "@engine/enums/engine";
import type { SWPortrait } from "@engine/rules/SWPortrait";
import type { IHeardString } from "@engine/interface/dialog/IHeardString";
import type { SWRange } from "@engine/rules/SWRange";
import { TURN_SPEED_SLOW } from "@engine/movement/TurnSpeeds";
import type { SWAnimation } from "@engine/rules/SWAnimation";
import type { Trigger } from "@engine/module/Trigger";

import {
  type DialogModelVisibilityInput,
  resolveDialogModelVisibility,
} from "./gameobject/dialogModelVisibility";
import {
  applyTrapGroundGeometry,
  TRAP_GROUND_HALF_EXTENT,
  trapKitResRefFromRow,
} from "./gameobject/trapGroundGeometry";
import { GameObjectActionService } from "./gameobject/GameObjectActionService";
import { GameObjectDestructionService } from "./gameobject/GameObjectDestructionService";
import { GameObjectEffectService } from "./gameobject/GameObjectEffectService";
import { GameObjectHydrationService } from "./gameobject/GameObjectHydrationService";
import { GameObjectInventoryService } from "./gameobject/GameObjectInventoryService";
import { GameObjectPerceptionService } from "./gameobject/GameObjectPerceptionService";
import { GameObjectPresentationService } from "./gameobject/GameObjectPresentationService";
import { GameObjectScriptService } from "./gameobject/GameObjectScriptService";
import { GameObjectTrapService } from "./gameobject/GameObjectTrapService";

export type { DialogModelVisibilityInput } from "./gameobject/dialogModelVisibility";

/**
* GameObject class.
*
* Class representing is the base class for all objects found in an area.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file GameObject.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class GameObject {
  /** SetMine free-ground half-extent (CreateNewGeometry 2.0). */
  static readonly TRAP_GROUND_HALF_EXTENT = TRAP_GROUND_HALF_EXTENT;

  /**
   * Assign local-space trigger vertices for a square mine footprint.
   */
  static applyTrapGroundGeometry(
    trigger: Trigger,
    halfExtent: number = GameObject.TRAP_GROUND_HALF_EXTENT,
  ): void {
    applyTrapGroundGeometry(trigger, halfExtent);
  }

  /**
   * traps.2da `resref` for RecoverMine item restore.
   */
  static trapKitResRefFromRow(trapRow: any): string {
    return trapKitResRefFromRow(trapRow);
  }

  /** Resolve mesh visibility for DIALOG / MINIGAME. */
  static resolveDialogModelVisibility(input: DialogModelVisibilityInput): boolean {
    return resolveDialogModelVisibility(input);
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
  objectType: number = GameObjectType.GameObject;

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

  area?: Area;

  //Room
  room: AreaRoom;
  rooms: AreaRoom[] = [];
  /** ApplyShadowBlob — Fx_Shadow_S/M/L model attached under the object. */
  shadowBlobModel: OdysseyModel3D;
  /** gob shadows flag — TurnOffShadows / HideShadowBlob when false. */
  shadowsEnabled = true;
  roomIds: number[] = [];
  roomSize: THREE.Vector3;

  inventory: Item[] = [];

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
  /** Blueprint / instance ResRef (UTM StoreList, etc.) — hydrated from GFF ResRef. */
  resRef: string = '';
  template: GFFObject;

  plot: boolean = false;
  scripts: {[key: string]: NWScriptInstance} = { };
  /** Script-hook resrefs hydrated from GFF at load; used by loadScripts/save. */
  scriptResRefs: Partial<Record<string, string>> = {};
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

  lipObject: LIPObject;
  lookAtObject: GameObject;

  //last object effected
  lastTriggerEntered: GameObject;
  lastTriggerExited: GameObject;
  lastAreaEntered: GameObject;
  lastAreaExited: GameObject;
  lastModuleEntered: GameObject;
  lastModuleExited: GameObject;
  lastDoorEntered: Door;
  lastDoorExited: Door;
  lastPlaceableEntered: GameObject;
  lastPlaceableExited: GameObject;
  lastAoeEntered: GameObject;
  lastAoeExited: GameObject;

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
  trapCreator: GameObject = undefined;
  /** Tag of key that disarms this trap (GetTrapKeyTag); often same as KeyName. */
  trapKeyTag: string = '';
  /** Last object that disarmed a trap on this door/placeable/trigger. */
  lastDisarmedBy: GameObject = undefined;
  /** Last object that locked this door/placeable. */
  lastLockedBy: GameObject = undefined;
  /** Last object that unlocked this door/placeable. */
  lastUnlockedBy: GameObject = undefined;
  /** MetaMagic feat byte for the active spell context (GetMetaMagicFeat). */
  metaMagicFeat: number = 0xff;

  notBlastable: boolean = false;

  linkedToObject: GameObject;

  readonly actionService: GameObjectActionService;
  readonly inventoryService: GameObjectInventoryService;
  readonly trapService: GameObjectTrapService;
  readonly effectService: GameObjectEffectService;
  readonly presentationService: GameObjectPresentationService;
  readonly destructionService: GameObjectDestructionService;
  readonly perceptionService: GameObjectPerceptionService;
  readonly scriptService: GameObjectScriptService;
  readonly hydrationService: GameObjectHydrationService;

  constructor (gff = new GFFObject) {
    this.actionService = new GameObjectActionService(this);
    this.inventoryService = new GameObjectInventoryService(this);
    this.trapService = new GameObjectTrapService(this);
    this.effectService = new GameObjectEffectService(this);
    this.presentationService = new GameObjectPresentationService(this);
    this.destructionService = new GameObjectDestructionService(this);
    this.perceptionService = new GameObjectPerceptionService(this);
    this.scriptService = new GameObjectScriptService(this);
    this.hydrationService = new GameObjectHydrationService(this);
    this.helperColor.setHex( Math.random() * 0xFFFFFF );
    this.initialized = false;

    //this.gameObject = null;
    this.forceVector = new THREE.Vector3();
    this.container = new OdysseyObject3D();
    this.container.userData.gameObject = this;
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
    this.resRef = '';

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

  getScriptInstance(scriptKey: ScriptHook): NWScriptInstance | undefined {
    return this.scriptService.getScriptInstance(scriptKey);
  }

  /**
   * Attach to room
   * @param room
   */
  attachToRoom(room: AreaRoom){
    return this.presentationService.attachToRoom(room);
  }

  /**
   * Detach from room
   * @param room
   */
  detachFromRoom(room: AreaRoom){
    return this.presentationService.detachFromRoom(room);
  }

  markCollisionMatrixDirty(_reason?: string){
    this.collisionMatrixDirty = true;
    if(BitWise.InstanceOf(this.objectType, GameObjectType.Placeable) && this.isStatic?.()){
      this.room?.markCollisionPlaceablesDirty?.(_reason);
    }
  }

  markCollisionBoundsDirty(_reason?: string){
    this.collisionBoundsDirty = true;
    this.collisionMatrixDirty = true;
    if(BitWise.InstanceOf(this.objectType, GameObjectType.Placeable)){
      this.room?.markCollisionPlaceablesDirty?.(_reason);
    }
  }

  /**
   * Set the context (GameState, LBL_3DView, UI3DRenderer, etc.).
   * @param ctx
   */
  setContext(ctx: any = GameState){
    return this.presentationService.setContext(ctx);
  }

  /**
   * Get the model
   * @returns
   */
  getModel(){
    return this.presentationService.getModel();
  }

  /**
   * Check if the object is visible
   * @returns
   */
  isVisible(){
    return this.presentationService.isVisible();
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

    this.scriptService.updateHeartbeat(delta);

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
    return this.presentationService.updateRoomAttachment(_delta);
  }

  updateDestroy(delta: number = 0){
    return this.destructionService.updateDestroy(delta);
  }

  updateDestroyFade(delta: number = 0){
    return this.destructionService.updateDestroyFade(delta);
  }

  /**
   * Update the paused state
   * @param delta
   */
  updatePaused(delta: number = 0){
    return this.presentationService.updatePaused(delta);
  }

  /**
   * Update the model visibility
   */
  updateModelVisibility(){
    return this.presentationService.updateModelVisibility();
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
    return this.actionService.clearAllActions(skipUnclearable);
  }

  /**
   * Cancel path/drive locomotion only. Used by direct WASD/stick so combat
   * and unclearable dialog actions stay intact.
   */
  cancelLocomotionActions(){
    return this.actionService.cancelLocomotionActions();
  }

  /**
   * Clear the combat action
   * @param combatAction - Specific scheduled action, or omit to clear the current round action
   * @returns
   */
  clearCombatAction(combatAction: CombatRoundAction = undefined){
    return this.actionService.clearCombatAction(combatAction);
  }

  /**
   * Clear the combat action at index
   * @param index
   * @returns
   */
  clearCombatActionAtIndex(index: number = 0): boolean {
    return this.actionService.clearCombatActionAtIndex(index);
  }

  /**
   * Action play animation
   * @param anim
   * @param speed
   * @param time
   */
  actionPlayAnimation(anim = 0, speed = 1, time = 1){
    return this.actionService.actionPlayAnimation(anim, speed, time);
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
  actionDialogObject( target: GameObject, dialogResRef = '', ignoreStartRange = true, bPrivate = 0, nConvoType = 1, clearable = false, ignoreObjectNames: string[] = [], barkScreenX: number = -1, barkScreenY: number = -1, bUseLeader: boolean = false ){
    return this.actionService.actionDialogObject(target, dialogResRef, ignoreStartRange, bPrivate, nConvoType, clearable, ignoreObjectNames, barkScreenX, barkScreenY, bUseLeader);
  }

  /**
   * Action use object
   * @param object
   */
  actionUseObject( object: GameObject ){
    return this.actionService.actionUseObject(object);
  }

  /**
   * Action open door
   * @param door
   */
  actionOpenDoor( door: GameObject ){
    return this.actionService.actionOpenDoor(door);
  }

  /**
   * Action close door
   * @param door
   */
  actionCloseDoor( door: GameObject ){
    return this.actionService.actionCloseDoor(door);
  }

  /**
   * Action wait
   * @param time
   */
  actionWait( time = 0 ){
    return this.actionService.actionWait(time);
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
   * Base stub — type-specific resolution lives on Creature / Door / Placeable.
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
  onClick(callee: GameObject){

  }

  /**
   * Run OnUserDefined on the object slot instance.
   * Sync execution + resetForRun/init keep STORE_STATE / stack residue from polluting the next fire.
   */
  protected runUserDefinedScript(event: NWScriptEvent, script: NWScriptInstance | undefined): void {
    return this.scriptService.runUserDefinedScript(event, script);
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
    return this.scriptService.runSpellCastAtScript(event, script);
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
    return this.scriptService.scriptEventHandler(event);
  }

  /**
   * Heartbeat gate — only after onSpawn and module event processing is ready.
   */
  protected canProcessHeartbeat(): boolean {
    return this.scriptService.canProcessHeartbeat();
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
  protected bindTrapTriggeredScript(_nwscript: NWScriptInstance): ScriptHook | undefined {
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
  getInventory(): Item[] {
    return this.inventoryService.getInventory();
  }

  /**
   * Check if the object has the item by tag
   * @param sTag
   * @returns
   */
  hasItemByTag(sTag=''){
    return this.inventoryService.hasItemByTag(sTag);
  }

  /**
   * Add the item
   * Merges into existing stacks by tag up to baseitems.stacking.
   * @param item
   * @returns
   */
  addItem(item: Item){
    return this.inventoryService.addItem(item);
  }

  /**
   * Remove the item
   * @param item
   * @param nCount
   * @returns
   */
  removeItem(item: Item, nCount = 1): Item {
    return this.inventoryService.removeItem(item, nCount);
  }

  /**
   * Remove the item by tag
   * @param sTag
   * @param nCount
   * @returns
   */
  removeItemByTag(sTag = '', nCount = 1): Item {
    return this.inventoryService.removeItemByTag(sTag, nCount);
  }

  /**
   * Get the item
   * @param oItem
   * @returns
   */
  getItem(oItem: Item): Item {
    return this.inventoryService.getItem(oItem);
  }

  /**
   * Get the item by tag
   * @param sTag
   * @returns
   */
  getItemByTag(sTag = ''): Item {
    return this.inventoryService.getItemByTag(sTag);
  }

  /**
   * Get the gold
   * @returns
   */
  getGold(): number {
    return this.inventoryService.getGold();
  }

  /**
   * Add gold
   * @param nGold
   */
  addGold(nGold = 0): void {
    return this.inventoryService.addGold(nGold);
  }

  /**
   * Remove gold
   * @param nGold
   */
  removeGold(nGold = 0): void {
    return this.inventoryService.removeGold(nGold);
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
    return this.actionService.doCommand(script);
  }

  /**
   * Add a trap
   * @param nTrapId
   * @param owner
   */
  addTrap(nTrapId: number = -1, owner: GameObject){
    return this.trapService.addTrap(
      nTrapId,
      owner,
      (script) => this.bindTrapTriggeredScript(script),
    );
  }

  /**
   * Plant a free-ground trap trigger at a world position (not hosted on a creature/door).
   */
  static plantGroundTrap(
    area: Area,
    nTrapId: number,
    position: THREE.Vector3 | { x: number; y: number; z: number },
    owner: GameObject
  ){
    return GameObjectTrapService.plantGroundTrap(area, nTrapId, position, owner);
  }

  /**
   * Pass AL — SetTrapDetectedBy / GetTrapDetectedBy (DetectedBy object-id lists).
   * Returns TRUE when the detector was newly added or already present.
   */
  setTrapDetectedBy(detector: GameObject): boolean {
    return this.trapService.setTrapDetectedBy(detector);
  }

  /** Pass AL — TRUE if oCreature's id is on this trap's DetectedBy list. */
  isTrapDetectedBy(creature: GameObject): boolean {
    return this.trapService.isTrapDetectedBy(creature);
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
  assignHostileActor(hostileActor: GameObject | undefined, force: boolean = false){
    assignHostileActorHelper(this, hostileActor, force);
  }

  /**
   * ExecuteCommandget hostile actor — returns last_hostile_actor_id
   * when still a living creature (AOE resolves to creator); clears stale refs.
   */
  getLastHostileActor(): GameObject | undefined {
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
  onDialog(oSpeaker: GameObject, listenPatternNumber = -1, conversation: DLGObject = undefined, _matchedSubstrings: string[] = []): boolean {
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
    return this.perceptionService.speakString(str, volume);
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
  damage(amount = 0, oAttacker?: GameObject, delayTime = 0){
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
    return this.actionService.getComputedPath();
  }

  /**
   * Set the computed path
   * @param computedPath
   */
  setComputedPath(computedPath: ComputedPath){
    return this.actionService.setComputedPath(computedPath);
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

  /**
   * Get the camera hook position (world space).
   * Updates matrixWorld so dialog framing is not stuck at bind-pose / origin.
   */
  getCameraHookPosition(){
    return this.presentationService.getCameraHookPosition();
  }

  /**
   * Get the camera height
   * @returns
   */
  getCameraHeight(){
    return this.presentationService.getCameraHeight();
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
        // Cutscenes disable cull (camera cuts / close-ups); gameplay keeps it on.
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
    return this.presentationService.applyShadowBlob(resref);
  }

  /** HideShadowBlob / ShowShadowBlob — area shadows + per-object flag. */
  updateShadowBlobVisibility(){
    return this.presentationService.updateShadowBlobVisibility();
  }

  /**
   * SetShadowBlobOrientation — align foot blob to walkmesh ground normal.
   */
  updateShadowBlobOrientation(){
    return this.presentationService.updateShadowBlobOrientation();
  }

  /** Walkable face normal in world space, or +Z when no ground face. */
  getGroundNormalForShadowBlob(): THREE.Vector3 {
    return this.presentationService.getGroundNormalForShadowBlob();
  }

  /** TurnOffShadows — disable projection and foot blob. */
  setShadowsEnabled(enabled: boolean){
    return this.presentationService.setShadowsEnabled(enabled);
  }

  removeShadowBlob(){
    return this.presentationService.removeShadowBlob();
  }

  /**
   * Resolve Fx_Shadow_S/M/L from appearance.sizecategory (creatures).
   * size 1–2 → S, 4–5 → L, else M (ApplyShadowBlob).
   */
  static shadowBlobResRefFromSizeCategory(sizeCategory: number): string {
    return GameObjectPresentationService.shadowBlobResRefFromSizeCategory(sizeCategory);
  }

  /**
   * Resolve Fx_Shadow_S/M/L from placeables.2da ShadowSize.
   * 0 → S, 1 → M, 2 → L, else M (ApplyShadowBlob).
   */
  static shadowBlobResRefFromPlaceableShadowSize(shadowSize: number): string {
    return GameObjectPresentationService.shadowBlobResRefFromPlaceableShadowSize(shadowSize);
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
        caller: "GameObject.setPosition",
      });
    }catch(e){
      console.error('GameObject.setPosition failed ');
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
  setFacingObject( target: GameObject ){

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
  lookAt(oObject: GameObject | undefined){
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
  resistForce(oCaster: GameObject){
    return this.effectService.resistForce(oCaster);
  }

  /**
   * Initialize all effects for the object
   */
  initEffects(){
    return this.effectService.initEffects();
  }

  /**
   * Re-resolve effect CreatorId / ObjectList after all creatures are registered.
   */
  resolveEffectObjectReferences(){
    return this.effectService.resolveEffectObjectReferences();
  }

  /**
   * object.area_id for save export — area game ObjectId, not ARE template ID.
   */
  getSaveAreaId(): number {
    return this.hydrationService.getSaveAreaId();
  }

  /**
   * Add an effect to the object
   * @param effect - The effect to add
   * @param type - The type of effect
   * @param duration - The duration of the effect
   */
  addEffect(effect: GameEffect, type = 0, duration = 0){
    return this.effectService.addEffect(effect, type, duration);
  }

  /**
   * Get an effect by type
   * @param type
   * @returns
   */
  getEffect(type = -1){
    return this.effectService.getEffect(type);
  }

  /**
   * Check if the object has an effect by type
   * @param type
   * @returns
   */
  hasEffect(type = -1){
    return this.effectService.hasEffect(type);
  }

  /**
   * Remove all effects by creator
   * @param oCreator
   */
  removeEffectsByCreator( oCreator: GameObject ){
    return this.effectService.removeEffectsByCreator(oCreator);
  }

  /**
   * Remove every attached effect (ClearAllEffects).
   * @param retainSelfBuffs - SurrenderRetainBuffs: keep effects created by this object
   */
  clearAllEffects(retainSelfBuffs: boolean = false){
    return this.effectService.clearAllEffects(retainSelfBuffs);
  }

  /**
   * effect apply effect strip + IsEffectToIgnoreOnDeath.
   * Removes all non-EQUIPPED/INNATE effects except types listed in removefxondeath.2da
   * (Disguise, Beam, and beam VisualEffects).
   */
  clearEffectsOnDeath(){
    return this.effectService.clearEffectsOnDeath();
  }

  /**
   * IsEffectToIgnoreOnDeath — removefxondeath.2da EffectType column
   * uses NWScript EFFECT_TYPE_* (Disguise=62, Beam=21). Beam VFX also kept.
   */
  isEffectToIgnoreOnDeath(effect: GameEffect): boolean {
    return this.effectService.isEffectToIgnoreOnDeath(effect);
  }

  /**
   * Remove all effects by type
   * @param type
   */
  removeEffectsByType(type: number = -1){
    return this.effectService.removeEffectsByType(type);
  }

  /**
   * Remove an effect by type or GameEffect
   * @param type
   */
  removeEffect(effect: GameEffect){
    return this.effectService.removeEffect(effect);
  }

  /**
   * Jump to an EngineLocation — JumpToLocation / JumpToPoint action.
   * Cross-area: AddToArea. Cross-module (party leader): LoadModule + spawn XYZ.
   */
  JumpToLocation(lLocation: EngineLocation){
    return this.actionService.JumpToLocation(lLocation);
  }

  /**
   * Face a point
   * @param vPoint
   */
  FacePoint(vPoint=new THREE.Vector3){
    return this.actionService.FacePoint(vPoint);
  }

  /**
   * Get the x orientation
   * @returns
   */
  getXOrientation(){
    return this.xOrientation || 0;
  }

  /**
   * Get the y orientation
   * @returns
   */
  getYOrientation(){
    return this.yOrientation || 0;
  }

  /**
   * Get the z orientation
   * @returns
   */
  getZOrientation(){
    return this.zOrientation || 0;
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
    return this.portraitId || 0;
  }

  /**
   * Get the key name
   * @returns
   */
  getKeyName(){
    return this.keyName ?? null;
  }

  /**
   * Get the tag
   * @returns
   */
  getTag(){
    return this.tag || '';
  }

  /**
   * Get the template resref
   * @returns
   */
  getTemplateResRef(){
    return this.templateResRef || null;
  }

  /**
   * Get the resref
   * @returns
   */
  getResRef(){
    return this.resRef || null;
  }

  /**
   * Set the template resref
   * @param sRef
   */
  setTemplateResRef(sRef=''){
    this.templateResRef = sRef || '';
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
    return this.presentationService.computeBoundingBox(force);
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
    return this.presentationService.isOnScreen(frustum);
  }

  /**
   * GetReticlePoint — prefer lookathook.
   * Creatures / corpse placeables override (head_g / rootdummy).
   */
  getReticleNode(){
    return this.presentationService.getReticleNode();
  }

  /** Resolve a named model node (case-insensitive) for reticle anchors. */
  getModelNodeByName(name: string){
    return this.presentationService.getModelNodeByName(name);
  }

  /**
   * Set the listening state
   * @param bListenting
   */
  setListening(bListenting = false){
    return this.perceptionService.setListening(bListenting);
  }

  /**
   * Set the listening pattern (SetListenExpression).
   * Re-parses in place when the pattern number already exists.
   * @param sString
   * @param iNum
   */
  setListeningPattern(sString = '', iNum = 0){
    return this.perceptionService.setListeningPattern(sString, iNum);
  }

  /** Clear matched substrings (ClearMatchedExpressionStrings). */
  clearMatchedSubstrings(){
    return this.perceptionService.clearMatchedSubstrings();
  }

  /** Store listen-match captures for GetMatchedSubstring (EventHandler case 7). */
  setMatchedSubstrings(substrings: string[]){
    return this.perceptionService.setMatchedSubstrings(substrings);
  }

  /**
   * Get the listening state
   * @returns
   */
  getIsListening(){
    return this.perceptionService.getIsListening();
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
  isHostile(target: GameObject){
    return GameState.FactionManager.IsHostile(this, target);
  }

  /**
   * Check if the object is neutral to another object
   * @param target
   * @returns
   */
  isNeutral(target: GameObject){
    return GameState.FactionManager.IsNeutral(this, target);
  }

  /**
   * Check if the object is friendly to another object
   * @param target
   * @returns
   */
  isFriendly(target: GameObject){
    return GameState.FactionManager.IsFriendly(this, target);
  }

  /**
   * Get the reputation of the object with another object
   * @param target
   * @returns
   */
  getReputation(target: GameObject){
    return GameState.FactionManager.GetReputation(this, target);
  }

  /**
   * Get the primary perception range
   * @returns
   */
  getPerceptionRangePrimary(){
    return this.perceptionService.getPerceptionRangePrimary();
  }

  /**
   * Get the secondary perception range
   * @returns
   */
  getPerceptionRangeSecondary(){
    return this.perceptionService.getPerceptionRangeSecondary();
  }

  /**
   * Initialize the perception list.
   * SaveCreature writes every non-null
   * verbatim (including stale / OBJECT_INVALID ids). Resolve object refs when
   * possible, but never prune unresolved nodes — they must round-trip on save.
   */
  initPerceptionList(){
    return this.perceptionService.initPerceptionList();
  }

  /**
   * Notify the object that it has been heard by another object
   * @param object
   * @param heard
   * @returns
   */
  notifyPerceptionHeardObject(object: GameObject, heard = false){
    return this.perceptionService.notifyPerceptionHeardObject(object, heard);
  }

  /**
   * Notify the object that it has been seen by another object
   * @param object
   * @param seen
   * @returns
   */
  notifyPerceptionSeenObject(object: GameObject, seen = false){
    return this.perceptionService.notifyPerceptionSeenObject(object, seen);
  }

  /**
   * Check if the object has line of sight to another object.
   * visual LOS / hasVisualLos (combat / GetIsInUseRange) uses eye
   * height ~1.5 and does not clamp to perception range — pass
   * ignorePerceptionRange for those. GetIsInUseRange rays to the GetUseRange
   * point (doors/placeables), not object origin.
   */
  hasLineOfSight(
    oTarget: GameObject,
    max_distance = 30,
    opts?: {
      ignorePerceptionRange?: boolean;
      eyeHeight?: number;
      /** visual LOS / hasVisualLos excludes source + target object ids from hits. */
      ignoreObject?: GameObject;
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
    return this.perceptionService.hasLineOfSight(oTarget, max_distance, opts);
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
    return this.presentationService.dialogPlayAnimation(anim);
  }

  /**
   * Reset the dialog animation state
   */
  dialogResetAnimationState(){
    return this.presentationService.dialogResetAnimationState();
  }

  /**
   * Use an object
   * @param object
   */
  use(object: GameObject){
    console.warn("Method not implemented.", this.tag);
  }

  /**
   * Attack a creature. CutsceneAttack uses Creature.addCutsceneAttackActions.
   * @param target
   * @param feat
   * @param isCutsceneAttack - legacy; when true delegates to addCutsceneAttackActions
   * @param attackDamage
   * @param attackAnimation - animations.2da row when cutscene
   * @param attackResult
   */
  attackCreature(target: GameObject, feat?: any, isCutsceneAttack: boolean = false, attackDamage:number = 0, attackAnimation?: any, attackResult?: any) {
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
   * Base GameObject hydration is intentionally unsupported. Concrete object
   * facades must deserialize through their dedicated serializer.
   */
  initProperties(){
    throw new Error(
      `${this.constructor.name}.initProperties must use a concrete GameObject serializer`,
    );
  }

  /**
   * Get the SWVarTable save struct
   * @returns
   */
  getSWVarTableSaveStruct(){
    return this.hydrationService.getSWVarTableSaveStruct();
  }

  /**
   * Load named VarTable from a GFF LIST field.
   */
  loadNamedVarTable(field?: GFFField){
    return this.hydrationService.loadNamedVarTable(field);
  }

  /**
   * Write named VarTable into a new LIST field on the given parent struct/root.
   */
  writeNamedVarTable(parent: GFFStruct): GFFField {
    return this.hydrationService.writeNamedVarTable(parent);
  }

  /**
   * Copy TemplateResRef / ResRef from the load buffer before merge decisions.
   * Safe to call before initProperties.
   */
  seedResRefsFromTemplate(){
    return this.hydrationService.seedResRefsFromTemplate();
  }

  /**
   * Hydrate script-hook resrefs from a GFF struct once (init/load phase only).
   * @param scriptsNode Root or nested Scripts struct
   * @param scriptKeys GFF field labels / ScriptHook keys
   * @param defaultResRef when set, missing fields get this value (doors use "default")
   */
  hydrateScriptResRefsFromStruct(scriptsNode: { hasField?: (k: string) => boolean; getFieldByLabel?: (k: string) => { getValue: () => any } } | undefined, scriptKeys: string[], defaultResRef?: string){
    return this.hydrationService.hydrateScriptResRefsFromStruct(scriptsNode, scriptKeys, defaultResRef);
  }

  /**
   * Hydrate script-hook resrefs from this.template.RootNode (init/load phase only).
   */
  hydrateScriptResRefsFromTemplate(scriptKeys: string[], defaultResRef?: string){
    return this.hydrationService.hydrateScriptResRefsFromTemplate(scriptKeys, defaultResRef);
  }

  /**
   * Bind NWScript instances from already-hydrated scriptResRefs.
   */
  bindScriptsFromResRefs(scriptKeys: string[], warnLabel?: string){
    return this.hydrationService.bindScriptsFromResRefs(scriptKeys, warnLabel);
  }

  /**
   * Load ActionList from this object's template into the runtime action queue.
   * Skips if the queue already has entries (avoids double-load on re-init).
   */
  loadActionList(){
    return this.actionService.loadActionList();
  }

  /**
   * Convert the action queue to an action list field (delegates to ActionListSerializer).
   */
  actionQueueToActionList(){
    return this.actionService.actionQueueToActionList();
  }

  setOpacity(opacity: number){
    return this.presentationService.setOpacity(opacity);
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
    return this.destructionService.setWillDestroy(willDestroy);
  }

  setDelayUntilDestroy(delay: number = GameObject.FADE_TIME){
    return this.destructionService.setDelayUntilDestroy(delay);
  }

  setDelayUntilFade(delay: number){
    return this.destructionService.setDelayUntilFade(delay);
  }

  setFadeDuration(duration: number){
    return this.destructionService.setFadeDuration(duration);
  }

  getFadeDuration(): number {
    return this.destructionService.getFadeDuration(GameObject.FADE_TIME);
  }

  setNoFadeOnDestroy(noFade: boolean){
    return this.destructionService.setNoFadeOnDestroy(noFade);
  }

  /**
   * Destroy the object
   */
  destroy(){
    return this.destructionService.destroy();
  }

}
