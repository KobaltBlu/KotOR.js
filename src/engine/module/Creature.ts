import { GFFObject } from "@core/resource/GFFObject";
import * as THREE from "three";
import { GameObject } from "@engine/module/GameObject";
import type { Item } from "@engine/module/Item";
import type { AreaRoom } from "@engine/module/area/AreaRoom";

import { AudioEmitter } from "@engine/audio/AudioEmitter";
import { CreatureClass } from "@engine/combat/CreatureClass";
import { EffectRacialType } from "@engine/effects";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { ModuleCreatureAnimState, isTransientCombatAnimIndex } from "@core/enums/module/ModuleCreatureAnimState";
import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { GameState } from "@engine/runtime/GameState";
import { GameObjectLoadPipeline } from "@engine/module/serialization/GameObjectLoadPipeline";
import { creatureSerializer } from "@engine/module/serialization/CreatureSerializer";
import type { SerializeContext } from "@engine/module/serialization/types";
import { LevelStatListSerializer } from "@engine/module/serialization/LevelStatListSerializer";
import { NWScriptInstance } from "@engine/nwscript/NWScriptInstance";
import { NWScriptEvent } from "@engine/nwscript/events";
import { GFFField } from "@core/resource/GFFField";
import { GFFStruct } from "@core/resource/GFFStruct";
import { CExoLocString } from "@core/resource/CExoLocString";
import { MDLLoader, ResourceLoader } from "@engine/loaders";
import { ResourceTypes } from "@core/resource/ResourceTypes";
import { SSFObject } from "@core/resource/SSFObject";
import { TalentFeat } from "@engine/talents/TalentFeat";
import { TalentObject } from "@engine/talents/TalentObject";
import { TalentSkill } from "@engine/talents/TalentSkill";
import { TalentSpell } from "@engine/talents/TalentSpell";
import { TalentObjectType } from "@engine/enums/engine/TalentObjectType";
import { OdysseyModel3D, OdysseyObject3D } from "@engine/render/three/odyssey";
import { CreaturePerceptionService } from "@engine/module/creature/CreaturePerceptionService";
import { CreatureStatsService } from "@engine/module/creature/CreatureStatsService";
import { CreatureCombatService } from "@engine/module/creature/CreatureCombatService";
import { CreatureDeathCorpseService } from "@engine/module/creature/CreatureDeathCorpseService";
import { CreatureAnimationService } from "@engine/module/creature/CreatureAnimationService";
import { CreatureModelService } from "@engine/module/creature/CreatureModelService";
import { CreatureEquipmentService } from "@engine/module/creature/CreatureEquipmentService";
import type { CreaturePartyFollowInfo } from "@engine/module/creature/partyFollowInfo";
export type { CreaturePartyFollowInfo } from "@engine/module/creature/partyFollowInfo";
export { createDefaultPartyFollowInfo } from "@engine/module/creature/partyFollowInfo";

import { OdysseyModel, OdysseyModelAnimation } from "@engine/odyssey";
import { ModuleCreatureArmorSlot } from "@core/enums/module/ModuleCreatureArmorSlot";
import { LIPObject } from "@core/resource/LIPObject";
import { Utility } from "@core/utility/Utility";
import { testStringAgainstPattern } from "@core/utility/listen-pattern";
import { drainHeardStringHead } from "@engine/combat/speak-string-broadcast";
import { EngineMode } from "@engine/enums/engine/EngineMode";
import { GameEngineType } from "@core/enums/engine/GameEngineType";
import { getDefaultRuntimeContext } from "@engine/runtime/context";
import { ActionType } from "@core/enums/actions/ActionType";
import { ActionParameterType } from "@core/enums/actions/ActionParameterType";
import EngineLocation from "@engine/runtime/EngineLocation";
import { FollowerCamera } from "@engine/render/FollowerCamera";
import { AttackResult } from "@core/enums/combat/AttackResult";
// import { ICombatAction } from "@engine/interface/combat/ICombatAction";
import { DLGObject } from "@engine/dialog/DLGObject";
import {
  APPEARANCE_EVIL_BODY_ALIGN_MAX,
  SWCreatureAppearance,
} from "@engine/rules/SWCreatureAppearance";
import { GameEffectDurationType } from "@core/enums/effects/GameEffectDurationType";
import { SWBodyBag } from "@engine/rules/SWBodyBag";
import {
  type LevelStatRecord,
} from "@engine/rules/level-up";
import { SkillType } from "@core/enums/nwscript/SkillType";
import type { InterAreaWaypoint } from "@engine/pathfinding/inter-area-path";
import { buildPathAroundCreature } from "@engine/pathfinding/build-path-around-creature";
import { nudgeFriendlyCreatures } from "@engine/pathfinding/nudge-friendlies";
import { resolvePlayerControlStep } from "@engine/movement/player-control-policy";
import { tickExternalForceStep } from "@engine/movement/external-force-policy";
import { commitMovement } from "@engine/movement/movement-committer";
import {
  setMovementAuthority,
  ensureMovementState,
} from "@engine/movement/creature-movement-state";
import { MovementAuthority } from "@engine/movement/types";
import { findWalkableAttachmentAt } from "@engine/movement/area-movement-queries";
import { applyWalkableAttachment } from "@engine/movement/apply-walkable-attachment";
import { getUseRange } from "@engine/actions/use-range";
import { getAttackApproachPoint } from "@engine/combat/nearest-action-point";
import { Placeable } from "@engine/module/Placeable";
import type { Encounter } from "@engine/module/Encounter";
import { BaseItemType } from "@core/enums/combat/BaseItemType";
import { AreaSubAreaPositionFanout } from "@engine/module/occupancy";

import { ICreatureAnimationState } from "@engine/interface/animation/ICreatureAnimationState";
import { IOverlayAnimationState } from "@engine/interface/animation/IOverlayAnimationState";
import { IWeaponGestureState } from "@engine/interface/animation/IWeaponGestureState";
import { IGestureAnimationState } from "@engine/interface/animation/IGestureAnimationState";
import { AnimationPlaybackMode } from "@core/enums/animation/AnimationPlaybackMode";
import {
  resolvePlaybackMode,
  resolveOverlayStopFlags,
  resolveOverlayStartFlags,
} from "@engine/module/animation/resolvePlaybackMode";
import {
  isWalkingAnimation,
  isRunningAnimation,
} from "@engine/module/animation/animation2daFlag";
import {
  combatAnimationAttackKey,
  combatAnimationWeaponDigit,
  combatReactionClipDigit,
} from "@engine/module/animation/combat-wield-digit";
import type { CreatureAnimationContext } from "@engine/module/animation/CreatureAnimationContext";
import { resolveCreatureAnimation } from "@engine/module/animation/resolveCreatureAnimation";
import { resolveDebilitatedCreatureAnimation } from "@engine/module/animation/resolveDebilitatedCreatureAnimation";
import { WeaponWield } from "@core/enums/combat/WeaponWield";
import { WeaponType } from "@core/enums/combat/WeaponType";
import { CombatFeatType } from "@core/enums/combat/CombatFeatType";
import { AutoPauseState } from "@engine/enums/engine/AutoPauseState";
import { AudioEngine } from "@engine/audio/AudioEngine";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectConstant } from "@core/enums/module/GameObjectConstant";
import { AudioEmitterType } from "@core/enums/audio/AudioEmitterType";
import { AudioPriorityGroup } from "@core/enums/audio/AudioPriorityGroup";
import { CombatActionType } from "@core/enums/combat/CombatActionType";
import {
  CombatMode,
  COMBAT_MODE_ACTIVITY_BIT,
  COMBAT_MODE_ACTIVITY_MASK,
} from "@core/enums/combat/CombatMode";
import { CombatRound, CombatRoundAction, resolveAnimations2DARow } from "@engine/combat";
import { spawnWorldImpactVfx } from "@engine/combat/ranged-impact-vfx";
import { isGrenadeItemType } from "@engine/combat/item-cast-grenade";
import { CombatInformation } from "@engine/combat/CombatInformation";
import type { Action } from "@engine/actions/Action";
import { ModuleTriggerType } from "@core/enums/module/ModuleTriggerType";
import { EngineDebugType } from "@engine/enums/engine/EngineDebugType";
import { EngineDebugController } from "@engine/runtime/EngineDebugController";
import { TextSprite3D } from "@engine/render/TextSprite3D";
import { UIIconTimerType } from "@engine/enums/engine/UIIconTimerType";
import { ExperienceType } from "@engine/enums/engine/ExperienceType";
import { ScriptHook } from "@core/enums/module/ScriptHook";
import { MineSkillResult, resolvePassiveMineDetect } from "@engine/actions/mine-skill";
import { PerceptionMask } from "@engine/enums/engine/PerceptionMask";
import {
  ExcitedDurationRow,
} from "@engine/combat/combat-engagement";
import { queueAttackActions } from "@engine/combat/queue-attack-actions";
import { ensureCombatDispatcher } from "@engine/combat/ensure-combat-dispatcher";
import { getNearestEnemy } from "@engine/combat/nearest-enemy";
import {
  isChoreographedMeleeWeapon,
  resolveChoreographedState,
} from "@engine/combat/combat-dueling";
import {
  DETECT_FLAG_SEE_INVISIBLE,
  DETECT_FLAG_TRUE_SEEING,
  DETECT_FLAG_ULTRA_VISION,
  getAbilityEffectBonus,
  getAttackEffectBonus,
  getDetectFlags,
  getForceResistanceBonus,
  getSavingThrowEffectBonus,
} from "@engine/effects/effect-bonuses";
import { hasImmunityType } from "@engine/effects/haste-slow";
import { isCreatureBlind } from "@engine/effects/EffectBlindness";
import type { EffectSanctuary } from "@engine/effects/EffectSanctuary";
import { getAbilityModifier } from "@engine/rules/skill-points";
import { Dice } from "@core/utility/Dice";
import { DiceType } from "@core/enums/combat/DiceType";
import {
  combineSavingThrow,
  rollSavingThrow,
  savingThrowTypeToImmunity,
} from "@engine/module/savingThrow/savingThrowMath";
import {
  getCreatureSpeedRates,
  coalesceDriveAnimRun,
  coalesceDriveAnimWalk,
  coalesceDriveMaxSpeed,
} from "@engine/pathfinding/movement-rate";
import { resetWalkSpeedFactor } from "@engine/pathfinding/tick-creature-walk";
import {
  tickForcePushLoco,
  isForcePushLocoActive,
  tickForcePushSequence,
} from "@engine/pathfinding/force-push-loco";
import {
  CreatureLocoState,
  isPartyFollowLocoActive,
  setCreatureLocoState,
  tryWakePausedCreatureLoco,
} from "@engine/pathfinding/creature-loco";
import {
  cameraRelativeDesired,
  createPlayerCamRelativeState,
  driveAnimPlaybackRate,
  isDriveAnimRunning,
  playerApplyTurn,
  playerCombatFaceStep,
  playerDesiredFacingRad,
  playerIntegrateRk4,
  playerKillReleasedAxisVelocity,
  playerSetSWAnimationSpeedMag,
  playerShouldApplyTurn,
  playerStepAlongFacing,
  resolvePlayerDriveLimits,
  type PlayerCamRelativeState,
} from "@engine/controls/player-cam-relative-control";
import { ClientCameraMode } from "@engine/enums/engine/ClientCameraMode";
import {
  applyMobilityMovementBonus,
  clampMovementRateFactor,
} from "@engine/pathfinding/locomotion";
import { ModuleCreatureAmbientState } from "@core/enums/module/ModuleCreatureAmbientState";
import { GameEffectSetStateType } from "@core/enums/effects/GameEffectSetStateType";
import type { SWAnimation } from "@engine/rules/SWAnimation";

import { isCreature } from "@engine/module/guards/isCreature";
import { isDoor } from "@engine/module/guards/isDoor";
import { isEncounter } from "@engine/module/guards/isEncounter";
import { isGameObject } from "@engine/module/guards/isGameObject";
import { isPlaceable } from "@engine/module/guards/isPlaceable";


/**
* Creature class.
*
* Class representing a creature found in module areas.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file Creature.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class Creature extends GameObject {
  /**
   * SetAnimation — when entering looping DEAD/DEAD1 from a non-dead
   * pose, insert DIE/DIE1 fireforget before the corpse hold.
   */
  static resolveEnterDeadTransition(
    requested: ModuleCreatureAnimState,
    current: ModuleCreatureAnimState | undefined | null,
  ): ModuleCreatureAnimState {
    const isDeadFamily =
      current === ModuleCreatureAnimState.DIE ||
      current === ModuleCreatureAnimState.DIE1 ||
      current === ModuleCreatureAnimState.DEAD ||
      current === ModuleCreatureAnimState.DEAD1;
    if(requested === ModuleCreatureAnimState.DEAD){
      return isDeadFamily ? requested : ModuleCreatureAnimState.DIE;
    }
    if(requested === ModuleCreatureAnimState.DEAD1){
      return isDeadFamily ? requested : ModuleCreatureAnimState.DIE1;
    }
    return requested;
  }

  /**
   * SurrenderToEnemies walks area game objects. Party members are
   * removed from area.creatures on join, so merge them in without duplicates.
   */
  static collectSurrenderNearbyCreatures<T extends object>(
    areaCreatures: (T | null | undefined)[] | undefined | null,
    party: (T | null | undefined)[] | undefined | null,
  ): T[] {
    const nearby: T[] = [];
    if(areaCreatures?.length){
      for(let i = 0; i < areaCreatures.length; i++){
        const creature = areaCreatures[i];
        if(creature) nearby.push(creature);
      }
    }
    if(party?.length){
      for(let i = 0; i < party.length; i++){
        const member = party[i];
        if(member && nearby.indexOf(member) === -1){
          nearby.push(member);
        }
      }
    }
    return nearby;
  }

  debugLabel: TextSprite3D;
  pm_IsDisguised: boolean; //polymorphIsDisguised
  pm_Appearance: number; //polymorphAppearance
  anim: any;
  head: OdysseyModel3D;
  aiStyle: number;
  isCommandable: boolean;
  bodyBag: number;
  /** Object id of the body-bag placeable spawned from this corpse (client link). */
  bodyBagObjectId: number = 0;
  bodyVariation: number;
  /** Carried credits moved into body bags as g_i_credits001. */
  gold: number;
  /**
   * SetKeepCorpse — transient client shell after event 0xb.
   * Runtime-only; never serialized.
   */
  isRetainedCorpse: boolean = false;
  /**
   * True once destroy event 0xb has run (bag spawned / authority removed).
   * Excludes the creature from area save even while a fade visual remains.
   */
  serverDestroyed: boolean = false;
  /** Missing FadeDelayOnDeath → KeepCorpse path at event 0xb. */
  keepCorpseOnDestroy: boolean = false;
  /** Eviction fade timer for retained shells (seconds remaining). */
  retainedCorpseFadeRemaining: number = -1;
  /** Party stealth mode (stealth_mode). */
  stealthMode: boolean = false;
  /** TSL SetFakeCombatState — combat anims without real combat. */
  fakeCombatState: boolean = false;
  /** Last object targeted by ActionMoveToObject / ForceMove (GetAttemptedMovementTarget). */
  attemptedMovementTarget: GameObject = undefined;
  /**
   * path_find_info ignore-object id (DoDoorAction IGNORE).
   * Skipped as a door blocker in static walk blockers / path cost checks.
   * Also set to the live attack target during PhysicalAttacks approach.
   */
  pathFindIgnoreObjectId: number = 0;
  /**
   * path_find_info field3_0xc — combat approach pad
   * (DesiredAttackRange − target cre_personal_space). 0 = use default perspace.
   */
  pathFindApproachPersonalSpace: number = 0;
  /**
   * Temporary drive / walk-line personal space override for narrow corridor
   * escape (e.g. doorway jam recovery). < 0 = unset (use appearance perspace).
   */
  pathFindDrivePersonalSpace: number = -1;
  /**
   * Search / detect mode (detect_mode).
   * KotOR defaults ON (constructor + Load* force SetActivity(2,1)); no player UI toggle.
   * Affects passive mine range/bonus and contested Awareness vs Stealth.
   */
  detectMode: boolean = true;
  /** Silence / Psychic Static */
  silenced: boolean = false;
  /** Deafness flag (perception / ASF parent) */
  deaf: boolean = false;
  /** Max ArcaneSpellFailure percent from effects */
  arcaneSpellFailure: number = 0;
  /** combat information — creature CombatInfo GFF (0xCAAA). */
  combatInformation: CombatInformation = new CombatInformation();
  /** body_fuel_ @ — Body Fuel active */
  bodyFuel: boolean = false;
  /** Lightsaber Throw in progress */
  throwingLightsaber: boolean = false;
  /** saber throw projectile rate */
  lightsaberThrowRate: number = 37;
  /**
   * Inter-area waypoint list (path_find_info /36).
   * Populated by beginInterAreaPath; advanced by CheckInterArea.
   */
  interAreaWaypoints: InterAreaWaypoint[] = [];
  /**
   * CPathfindInformation
   * transition object ids excluded after buildWalkPath (in-area) failure (failed portals).
   */
  interAreaExcludedIds: number[] = [];
  /** Remembered dest for recompute after portal exclusion. */
  interAreaDestAreaId: number = -1;
  interAreaPreferModule: string = '';
  /**
   * When true (camera mode DRIVE / explicit), WASD routes through AddDriveAction.
   */
  driveControlActive: boolean = false;
  /**
   * activity_ bitfield (SetActivity).
   * Combat modes use 0x100–0x2000; stealth=1, detect=2, dialog=4.
   * Default includes detect (2) — matches engine behavior ctor.
   */
  activity: number = 0x2;
  /** Bits that ActivityManager / SetActivity will not auto-clear. */
  activityLocked: number = 0;
  /** SetCombatMode (stance / activity bits). */
  combatMode: CombatMode = CombatMode.NONE;
  /**
   * creature client combat-mode bit (UI + combat camera).
   * Distinct from stance `combatMode` and from SetCombatState timer.
   */
  clientCombatMode: boolean = false;
  /** Deferred combat mode while round_started. */
  pendingCombatMode: number = -1;
  isHasted: boolean = false;
  isSlowed: boolean = false;
  limitMovementSpeed: boolean = false;
  /**
   * Extra locomotion multiplier (FollowLeader rate bands, path approach ease).
   * Applied after effect movementSpeed; not clamped to GetWalkRate bounds.
   */
  locomotionScale: number = 1;
  /**
   * When set, forceVector uses this XY direction instead of facing
   * (walk-back toward a goal behind the creature).
   */
  moveDirOverride: { x: number; y: number } | undefined;
  /** creature vision/detect bits. */
  visionFlags: number = 0;

  cha: number;
  con: number;
  dex: number;
  int: number;
  str: number;
  wis: number;
  fortbonus: number;
  refbonus: number;
  willbonus: number;
  fortitudeSaveThrow: number;
  reflexSaveThrow: number;
  willSaveThrow: number;

  challengeRating: number;
  /**
   * encounter game-object id when spawned from an encounter.
   * OBJECT_INVALID when not an encounter creature.
   */
  encounterObjectId: number = GameObjectConstant.OBJECT_INVALID;
  /** already unlinked from encounter active count. */
  encounterUnlinked: boolean = false;
  /** item used for current spell cast (GetSpellCastItem). */
  spellCastItem: Item = undefined;
  /**
   * base_class_level — stamped before item SpellCastAndImpact from the
   * last class level; GetCasterLevel returns this while itemSpellCastActive.
   */
  baseClassLevel: number = 0;
  /** true during item SpellCastAndImpact / delayed impact. */
  itemSpellCastActive: boolean = false;
  classes: CreatureClass[];
  comment: string;
  currentForce: number;
  /** Temporary force points spent before currentForce (CreatureStats temp FP). */
  temporaryForce: number;
  /** Active Jedi Form spell id (TSL); 0 = none. */
  currentForm: number;
  currentHitPoints: number;
  deity: string;
  disarmable: number;
  isHologram: boolean;
  experience: number;
  feats: TalentFeat[];
  firstName: CExoLocString;
  forcePoints: number;
  gender: number = 0;
  goodEvil: number = 50;
  /**
   * base_npc_alignment — template GoodEvil used by HandleAlignmentInfluence
   * for non-Kreia sync (not overwritten by live influence math).
   */
  baseGoodEvil: number = 50;
  hitPoints: number;
  interruptable: number;
  isPC: number;
  lastName: CExoLocString;
  /** — present for party members. */
  readonly creaturePerceptionService: CreaturePerceptionService;
  readonly statsService: CreatureStatsService;
  readonly combatService: CreatureCombatService;
  readonly deathCorpseService: CreatureDeathCorpseService;
  readonly animationService: CreatureAnimationService;
  readonly modelService: CreatureModelService;
  readonly equipmentService: CreatureEquipmentService;

  partyFollowInfo: CreaturePartyFollowInfo | undefined;
  /** history (LvlStatList) for the real PC. */
  levelStats: LevelStatRecord[];
  maxHitPoints: number;
  naturalAC: number;
  noPermDeath: number;
  notReorienting: number;
  palletID: number;
  partyInteract: number;
  phenotype: number;
  /** Appearance_Head (0xFF = use appearance.2da normalhead/backuphead). */
  appearanceHead: number;
  /** Color_Hair / Color_Skin / Color_Tattoo* */
  colorHair: number;
  colorSkin: number;
  colorTattoo1: number;
  colorTattoo2: number;
  duplicatingHead: number;
  useBackupHead: number;
  tail: number;
  wings: number;
  race: number;
  skills: TalentSkill[];
  soundSetFile: number;
  specialAbilities: any[];
  subrace: number;
  subraceIndex: number;
  /** SaveStats Age */
  age: number;
  /** SaveStats AIState */
  aiState: number;
  /** SaveCreature AmbientAnimState */
  ambientAnimState: number;
  /** SaveStats StartingPackage */
  startingPackage: number;
  /** AreaId from last save (DWORD); live area is this.area */
  savedAreaId: number = 0;
  templateList: any[];
  textureVar: number;
  walkRate: number;
  blockingTimer: number;
  /**
   * Pathfail / GetFoundEnemyCreature — AI/pathing side effect of OnBlocked hex,
   * not physical movement contact. Owned by the creature, not CollisionContext.
   */
  foundEnemyCreature: GameObject | undefined;
  /**
   * Creature locomotion mode (internal field).
   * 3 = FollowLeader, 4..6 = ForcePushed, 1 = paused, -1 = repath.
   */
  creatureLocoState: number;
  /** distance traveled during Force Push slide. */
  forcePushDistanceTraveled: number;
  /** True once force-push loco reaches path end (land/getup phase). */
  forcePushArrived: boolean;
  /** Seconds since force-push arrival (drives fp_land / fp_getup). */
  forcePushArriveElapsed: number;
  /** Force Push slide / land / get-up still running. */
  forcePushSequenceActive: boolean;
  forcePushAnimPhase: number;
  /** AI-state mask; SetAIState effects AND bits out while they last. */
  aiStateMask: number = 0xffff;
  /**
   * creature walk update — previous frame speed factor.
   */
  walkSpeedFactor: number;
  /**
   * pathfind-info — consecutive walk frame distance
   * TestDistance fails before giving up (hex while < 6).
   */
  pathBlockFailCount: number;
  /**
   * Camera-relative client controller state.
   * Used for direct WASD / stick; ActionDrive remains the discrete server path.
   */
  playerControl: PlayerCamRelativeState;
  groundTilt: THREE.Vector3;
  up: THREE.Vector3;
  declare lipObject: LIPObject;
  walk: boolean;
  targetPositions: any[];
  declare audioEmitter: AudioEmitter;
  declare footstepEmitter: AudioEmitter;
  maxForcePoints: any;
  /** TSL bonus force points pool (Set/Add/GetBonusForcePoints). */
  bonusForcePoints: number = 0;
  bodyModel: any;
  bodyTexture: any;
  headModel: any;
  ssf: SSFObject;
  joiningXP: any;
  skillPoints: any;
  npcId: number;
  /**
   * TSL assigned puppet slot id.
   * Set by AssignPUP; -1 when none.
   */
  assignedPuppetId: number = -1;
  /**
   * TSL SetIsPuppet flag.
   * True after AddPartyPuppet; GetIsPuppet reads this.
   */
  isPuppet: boolean = false;
  // appearance: any;

  /**
   * Drive / base-layer animation (walk, run, ready, combat). Parallel to overlay + weapon gesture.
   * Maps DriveAnimationUpdate output onto the body Gob base slot.
   */
  animationState: ICreatureAnimationState;
  /** Mode-1 overlay (dialog/emote) — must not block drive locomotion. */
  overlayAnimationState: IOverlayAnimationState;
  /** Standing fire-forget body gesture (e.g. flourish while idle). */
  gestureState: IGestureAnimationState;
  /** Weapon-item Gob gesture (equip draw / PowerItem paths — not moving flourish). */
  weaponGestureState: IWeaponGestureState;
  /** Last XY used for grass point-source gusts. */
  private _grassGustLastX = Number.NaN;
  private _grassGustLastY = Number.NaN;
  
  equipment: { 
    HEAD: Item; 
    ARMOR: Item; 
    ARMS: Item; 
    RIGHTHAND: Item; 
    RIGHTHAND2: Item; 
    LEFTHAND: Item; 
    LEFTHAND2: Item; 
    LEFTARMBAND: Item; 
    RIGHTARMBAND: Item; 
    IMPLANT: Item; 
    BELT: Item; 
    CLAW1: Item; 
    CLAW2: Item; 
    CLAW3: Item; 
    HIDE: Item; 
  };
  /** Stashed equipment while dialog UnequipItems/UnequipHItem is active. */
  dialogEquipmentStash: {
    HEAD?: Item;
    RIGHTHAND?: Item;
    LEFTHAND?: Item;
  } | undefined;
  /**
   * animations.2da hideequippeditems — hand weapon meshes hidden for the
   * duration of the flagged clip (distinct from dialog unequip).
   */
  animationHideEquippedItemsActive: boolean = false;
  regenTimer: number;
  regenTimerMax: number;
  /** Battle-music timer (ms). / ExcitedDuration.2da. */
  excitedDuration: number;
  /** Combat engagement timer (ms).; SetCombatState refreshes to 8000. */
  combatStateTimer: number;
  /** ResolveInitiative — non-party AI combat refresh pending. */
  combatAiRefreshPending: boolean = false;
  /** 1=Damage, 2=SpellCast; Damage sticks over SpellCast. */
  combatStateReason: number;
  /**
   * InstantUseItem lockout. While > 0 during hostile combat,
   * inventory Use Item shows TLK 42409.
   */
  instantItemCooldownMs: number;
  turning: number;
  deathAnimationPlayed: boolean;
  /** One-shot guard for Animation Missing console spam. */
  animationMissingLogged: boolean = false;
  deathStarted: boolean;
  /** Pass AL — last trap this creature detected. */
  lastTrapDetected: GameObject;
  getUpAnimationPlayed: boolean;
  /** True once scheduleDestroyAsCorpse applied appearance DestroyObjectDelay / FadeDelayOnDeath. */
  corpseDestroyScheduled: boolean;
  animSpeed: number;
  selectedNPC: number;
  creatureAppearance: SWCreatureAppearance | undefined;

  /**
   * Head tracking enabled
   */
  headTrackingEnabled: boolean = true;
  /** K2 SetOrientOnClick — when false, skip facing the player on dialog click. Default true. */
  orientOnClick: boolean = true;
  /**
   * Head tracking angle
   */
  headTrackingAngle: number = 0;
  /**
   * Head tracking pitch
   */
  headTrackingPitch: number = 0;
  /**
   * Head max horizontal angle
   */
  headMaxHorizontalAngle: number = Math.PI / 6;
  /**
   * Head max vertical angle
   */
  headMaxVerticalAngle: number = Math.PI / 3;
  /**
   * Bumps on each loadModel so overlapping armor/head rebuilds discard stale
   * bodies instead of disposing live hand/headgear models attached to them.
   */
  modelLoadGeneration: number = 0;

  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.creaturePerceptionService = new CreaturePerceptionService(this);
    this.statsService = new CreatureStatsService(this);
    this.combatService = new CreatureCombatService(this);
    this.deathCorpseService = new CreatureDeathCorpseService(this);
    this.animationService = new CreatureAnimationService(this);
    this.modelService = new CreatureModelService(this);
    this.equipmentService = new CreatureEquipmentService(this);
    this.objectType |= GameObjectType.Creature;
    this.deferEventUpdate = true;

    this.template = gff;

    this.isReady = false;
    this.anim = null;
    this.head = null;
    this.deathAnimationPlayed = false;
    this.aiStyle = 0;
    this.corpseDestroyScheduled = false;

    this.isCommandable = true;

    this.lastTriggerEntered = null;
    this.lastTriggerExited = null;
    this.lastAreaEntered = null;
    this.lastAreaExited = null;
    this.lastModuleEntered = null;
    this.lastModuleExited = null;
    this.lastDoorEntered = null;
    this.lastDoorExited = null;
    this.lastPlaceableEntered = null;
    this.lastPlaceableExited = null;
    this.lastAoeEntered = null;
    this.lastAoeExited = null;

    //Last target this creature attempted to attack
    this.combatData.lastAttemptedAttackTarget = undefined;
    //Last target attacked by this creature
    this.combatData.lastAttackTarget = undefined;
    //Last target attacked with a spell by this creature
    this.combatData.lastSpellTarget = undefined;
    //Last attempted target attacked with a spell by this creature
    this.combatData.lastAttemptedSpellTarget = undefined;
    //Last creature who damaged this creature
    this.combatData.lastDamager = undefined;
    //Last creature who attacked this creature
    this.combatData.lastAttacker = undefined;
    // last_hostile_actor_id
    this.combatData.lastHostileActor = undefined;
    //Last creature who attacked this creature with a spell
    this.combatData.lastSpellAttacker = undefined;
    //Last Combat Feat Used
    this.combatData.lastCombatFeatUsed = undefined;
    //Last Force Power Used
    this.combatData.lastForcePowerUsed = undefined;
    //Last Attack Result
    this.combatData.lastAttackResult = undefined;

    this.excitedDuration = 0;
    this.combatStateTimer = 0;
    this.combatStateReason = 0;
    this.clientCombatMode = false;
    this.instantItemCooldownMs = 0;

    this.cha = 0;
    this.con = 0;
    this.dex = 0; 
    this.int = 0;
    this.str = 0;
    this.wis = 0;
    this.fortbonus = 0;
    this.refbonus = 0;
    this.willbonus = 0;
    this.fortitudeSaveThrow = 0;
    this.reflexSaveThrow = 0;
    this.willSaveThrow = 0;

    this.appearance = 0;
    this.pm_Appearance = 0;
    this.pm_IsDisguised = false;
    this.bodyBag = 0;
    this.bodyVariation = 0;
    this.gold = 0;
    this.challengeRating = 0;
    this.encounterObjectId = GameObjectConstant.OBJECT_INVALID;
    this.encounterUnlinked = false;
    this.spellCastItem = undefined;
    this.baseClassLevel = 0;
    this.itemSpellCastActive = false;
    this.classes = [];
    this.comment = '';
    this.currentForce = 0;
    this.temporaryForce = 0;
    this.currentForm = 0;
    this.currentHitPoints = 0; //The Creature's current hit points, not counting any bonuses. This value may be higher or lower than the creature's maximum hit points.
    this.regenTimer = 0;
    this.regenTimerMax = 6;
    this.deity = '';
    this.description = '';
    this.disarmable = 0;
    this.isHologram = false;
    this.resetAnimationState();
    this.resetOverlayAnimationState();
    this.resetGestureState();
    this.resetWeaponGestureState();

    this.equipment = {
      HEAD: undefined,
      ARMOR: undefined,
      ARMS: undefined,
      RIGHTHAND: undefined,
      RIGHTHAND2: undefined,
      LEFTHAND: undefined,
      LEFTHAND2: undefined,
      LEFTARMBAND: undefined,
      RIGHTARMBAND: undefined,
      IMPLANT: undefined,
      BELT: undefined,
    
      CLAW1: undefined,
      CLAW2: undefined,
      CLAW3: undefined,
      HIDE:  undefined,
    };

    this.experience = 0;
    this.feats = [];
    this.firstName = new CExoLocString();
    this.forcePoints = 0;
    this.gender = 0;
    this.goodEvil = 50;
    this.baseGoodEvil = 50;
    this.hitPoints = 0; //Base Maximum Hit Points, not considering any bonuses. See Section 3.4 for more details.
    this.interruptable = 1;
    this.isPC = 0;
    this.lastName = new CExoLocString();
    this.partyFollowInfo = undefined;
    this.levelStats = [];
    this.maxHitPoints = 0; //Maximum Hit Points, after considering all bonuses and penalties.
    this.min1HP = false;
    this.naturalAC = 0;
    this.noPermDeath = 0;
    this.notReorienting = 0;
    this.palletID = 0; //for use in biowares editor
    this.partyInteract = 0;
    this.perceptionRange = getDefaultRuntimeContext().getSWRuleSet?.()?.ranges?.[11];
    this.phenotype = 0;
    /** Appearance_Head 0xFF = use appearance.2da normalhead/backuphead. */
    this.appearanceHead = 255;
    this.colorHair = 0;
    this.colorSkin = 0;
    this.colorTattoo1 = 0;
    this.colorTattoo2 = 0;
    this.duplicatingHead = 255;
    this.useBackupHead = 0;
    this.tail = 0;
    this.wings = 0;
    this.plot = false;
    this.portraitId = 0;
    this.race = 0;

    this.scripts[ScriptHook.CreatureOnAttacked] = undefined;
    this.scripts[ScriptHook.CreatureOnDamaged] = undefined;
    this.scripts[ScriptHook.CreatureOnDeath] = undefined;
    this.scripts[ScriptHook.CreatureOnDialog] = undefined;
    this.scripts[ScriptHook.CreatureOnDisturbed] = undefined;
    this.scripts[ScriptHook.CreatureOnEndDialog] = undefined;
    this.scripts[ScriptHook.CreatureOnEndRound] = undefined;
    this.scripts[ScriptHook.CreatureOnHeartbeat] = undefined;
    this.scripts[ScriptHook.CreatureOnBlocked] = undefined;
    this.scripts[ScriptHook.CreatureOnNotice] = undefined;
    this.scripts[ScriptHook.CreatureOnRested] = undefined;
    this.scripts[ScriptHook.CreatureOnSpawn] = undefined;
    this.scripts[ScriptHook.CreatureOnSpellAt] = undefined;
    this.scripts[ScriptHook.CreatureOnUserDefined] = undefined;

    this.skills = [];

    this.soundSetFile = 0;
    this.specialAbilities = [];
    this.subrace = 0;
    this.subraceIndex = 0;
    this.age = 0;
    this.aiState = 0;
    this.ambientAnimState = 0;
    this.startingPackage = 0;
    this.savedAreaId = 0;
    this.tag = '';
    this.templateList = [];
    this.templateResRef = '';
    this.textureVar = 1;
    this.walkRate = 7;

    this.xOrientation = 0;
    this.yOrientation = 0;
    this.zOrientation = 0;

    this.perceptionList = [];

    // Do not resolve pause/inj here — HP is still 0 until initProperties.
    // SetAnimation runs after ReadStatsFromGff (LoadCreature).
    this.combatData.combatActionTimer = 3; 
    this.combatData.combatState = false;
    this.combatData.lastAttackAction = ActionType.ActionInvalid;
    this.blockingTimer = 0;
    this.walkSpeedFactor = 0;
    this.pathBlockFailCount = 0;
    this.playerControl = createPlayerCamRelativeState();

    this.fp_push_played = false;
    this.fp_land_played = false;
    this.fp_getup_played = false;
    this.creatureLocoState = CreatureLocoState.PathWalk;
    this.forcePushDistanceTraveled = 0;
    this.forcePushArrived = false;
    this.forcePushArriveElapsed = 0;
    this.forcePushSequenceActive = false;
    this.forcePushAnimPhase = -1;

    // this.groundFace = undefined;
    this.groundTilt = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 0, 1);

    this.lockDialogOrientation = false;
    this.lipObject = undefined;
    this.walk = false;
    this.locomotionScale = 1;
    this.moveDirOverride = undefined;

    this.isListening = false;
    this.listeningPatterns = [];
    this.matchedSubstrings = [];
    this.heardStrings = [];

    this.targetPositions = [];
    let numNodes = 8;
    for (let i = 0; i < numNodes; i++) {
      let angle = (i / (numNodes/2)) * Math.PI; // Calculate the angle at which the element will be placed.
                                            // For a semicircle, we would use (i / numNodes) * Math.PI.
      this.targetPositions.push({
        angle:        angle,
        object:       undefined,
        cos:          Math.cos(angle),
        sin:          Math.sin(angle),
        owner:        this,
        targetVector: new THREE.Vector3()
      });
    }

    try{

      this.audioEmitter = new AudioEmitter(AudioEngine.GetAudioEngine());
      this.audioEmitter.type = AudioEmitterType.POSITIONAL;
      // this.audioEmitter.setMaxDistance(50);
      this.audioEmitter.setPriorityGroupId(AudioPriorityGroup.COMBAT);
      this.audioEmitter.load();

      this.footstepEmitter = new AudioEmitter(AudioEngine.GetAudioEngine());
      this.footstepEmitter.type = AudioEmitterType.POSITIONAL;
      // this.footstepEmitter.setMaxDistance(10);
      this.footstepEmitter.setPriorityGroupId(AudioPriorityGroup.MEDIUM_AND_SMALL_CREATURE_FOOTSTEPS);
      this.footstepEmitter.load();
    }catch(e){
      console.error('AudioEmitter failed to create on object', e);
    }

  }

  /**
   * Recalc movement_rate_factor from MSI/MSD effects.
   * : best increase (absolute %) × (100 − best decrease %) / 100,
   * clamped to [0.125, 1.5] like GetWalkRate / GetRunRate.
   * TSL GetMovementRateFactor: Mobility feat (0xc3) adds +0.1 before clamp.
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
    const hasMobility = this.getHasFeat(CombatFeatType.MOBILITY);
    factor = applyMobilityMovementBonus(
      factor,
      hasMobility,
      getDefaultRuntimeContext().getGameKey() === 'k2'
    );
    this.movementSpeed = clampMovementRateFactor(factor);
  }

  /**
   * Creature locomotion — every-frame locomotion for movers.
   * Advances the head MoveTo/Follow/Drive action so motion never skips frames
   * when aiUpdate is budget-deferred. Sets _creatureLocoThisFrame so aiUpdate
   * does not re-process the same action.
   * Routes on creatureLocoState (field438): ForcePush → FollowLeader → path walk.
   * Force Push (∈ {4,5,6}) runs even while debilitated.
   */
  creatureLocoUpdate(delta: number = 0){
    if(this.destroyed || this.willDestroy || this.isRetainedCorpse) return;
    if(this.isDead()) return;
    if(!getDefaultRuntimeContext().isReadyToProcessEvents()) return;

    // Force Push / Force Jump run even while paused or debilitated.
    if(isForcePushLocoActive(this)){
      tickForcePushLoco(this, delta);
      this._creatureLocoThisFrame = true;
      return;
    }

    // Paused / end-of-path: wake when a new locomotion action is at queue head
    // (e.g. PhysicalAttacks front-queues MoveToPoint without changing loco state).
    if(!tryWakePausedCreatureLoco(this, this.actionQueue?.[0]?.type)){
      return;
    }

    if(this.isDebilitated()) return;

    const action = this.actionQueue?.[0];
    if(!action) return;
    const type = action.type;

    // field438 == 3 → FollowLeader; party follow leader action stamps 3.
    if(type === ActionType.ActionFollowLeader){
      setCreatureLocoState(this, CreatureLocoState.PartyFollow);
      this.actionQueue.process(delta);
      this.action = this.actionQueue[0];
      this._creatureLocoThisFrame = true;
      return;
    }

    // Stale FollowLeader mode without the action — pause like end-of-path.
    if(isPartyFollowLocoActive(this)){
      setCreatureLocoState(this, CreatureLocoState.Paused);
    }

    if(
      type !== ActionType.ActionMoveToPoint &&
      type !== ActionType.ActionForceFollowObject &&
      type !== ActionType.ActionDrive
    ){
      return;
    }

    this.actionQueue.process(delta);
    this.action = this.actionQueue[0];
    this._creatureLocoThisFrame = true;
  }

  /**
   * Scheduled by Module.aiScheduler.
   * Heartbeat/effects (super), then ordered service ticks: damage, action queue,
   * combat, perception, deferred effects, regen, AI level.
   */
  aiUpdate(delta: number = 0){
    if(this.destroyed || this.isRetainedCorpse) return;

    super.aiUpdate(delta);

    if(this.destroyed || this.willDestroy) return;
    if(!this.isReady) return;

    const mode = getDefaultRuntimeContext().getMode();
    if(mode != EngineMode.INGAME && mode != EngineMode.MINIGAME && mode != EngineMode.DIALOG){
      this._creatureLocoThisFrame = false;
      return;
    }

    this.action = this.actionQueue[0];

    if(!this.isDead()){
      this.combatService.processDamageList(delta);
      this.deathStarted = false;

      // Corpses lock the action queue on DEAD; living NPCs in a scripted dead
      // pose (ActionPlayAnimation) must still tick their timed action.
      // Damage above may have just killed this creature.
      const corpseActionLock =
        this.isDead() && this.animationState.index == ModuleCreatureAnimState.DEAD;
      if(!corpseActionLock){
        if(!this._creatureLocoThisFrame){
          this.updateActionQueue(delta);
        }else{
          this.action = this.actionQueue[0];
        }
      }
    }else{
      this.damageList = [];
    }

    this.combatService.updateCombatTick(delta);
    this.creaturePerceptionService.updatePerceptionList(delta);
    this.creaturePerceptionService.updateListeningPatterns();

    // Deferred effects (when deferEventUpdate was set)
    if(this.deferEventUpdate){
      for(let i = 0, len = this.effects.length; i < len; i++){
        const effect = this.effects[i];
        if(effect) effect.update(delta);
      }
    }

    this.statsService.updateRegen(delta);
    this.combatService.adjustAILevel();

    this._creatureLocoThisFrame = false;
  }

  /**
   * AIUpdate AI-level self-adjustment.
   * Party/PC → VERY_HIGH; combat → NORMAL; else LOW (area occupied) or VERY_LOW.
   */
  adjustAILevel(){
    return this.combatService.adjustAILevel();
  }

  /**
   * Walkmesh room attach + model visibility (findWalkableFace when unroomed).
   */
  protected updateRoomAttachment(delta: number = 0){
    if(this.spawned){
      this.collisionManager.roomCheck(delta);
    }
  }

  updatePaused(delta: number = 0){
    if(!this.spawned) return;
    // Allow PC/party room attach while paused so auto-pause cannot leave a blank VIS
    if(!this.room && this.area){
      this.updateRoomAttachment(delta);
    }else{
      this.updateModelVisibility();
    }
  }

  /**
   * Per-frame visual/loco tick. Domain work is ordered service calls; movement
   * (player cam, force coast, external force, facing) stays on the facade.
   */
  update( delta = 0 ){

    if(this.destroyed){
      return;
    }

    // KeepCorpse shells skip normal AI/effects — visual + eviction fade only
    if(this.isRetainedCorpse){
      this.deathCorpseService.updateRetainedCorpse(delta);
      return;
    }

    super.update(delta);

    if(this.destroyed){
      return;
    }

    // Converted to KeepCorpse during updateDestroy this frame
    if(this.isRetainedCorpse){
      this.deathCorpseService.updateRetainedCorpse(delta);
      return;
    }

    // DestroyObjectDelay runs before remove; corpse must keep playing DIE→DEAD + model fade.
    if(this.willDestroy){
      this.deathCorpseService.updateCorpsePendingDestroy(delta);
      return;
    }

    if(this.audioEmitter){
      this.audioEmitter.setPosition(this.position.x, this.position.y, this.position.z + 1.0);
      this.footstepEmitter.setPosition(this.position.x, this.position.y, this.position.z);
    }

    this.forceVector.set(0, 0, 0);
    this.sphere.center.copy(this.position);
    this.sphere.radius = this.getHitDistance() * 2;

    const mode = getDefaultRuntimeContext().getMode();
    if(mode == EngineMode.INGAME || mode == EngineMode.MINIGAME || mode == EngineMode.DIALOG){

      if(this.animationState.index == ModuleCreatureAnimState.IDLE){
        this.footstepEmitter.isLooping = false;
        this.footstepEmitter.stop();
      }

      if(!this.isReady){
        return;
      }

      this.action = this.actionQueue[0];

      tickForcePushSequence(this, delta);

      this.deathCorpseService.updateDeathTransition();
      if(!this.isDead()){
        this.animationService.updateDialogAnimation();
      }
      this.animationService.updateDebilitatedPose();

      const playerControlCommitted = this.updateLocomotionFrame(delta);

      this.pushGrassWindGust();
      this.animationService.promoteIdleCombatAnimation();

      this.animationService.updateAnimationState();
      this.equipmentService.updateItems(delta);

      if(this.model instanceof OdysseyModel3D && this.model.bonesInitialized){
        this.animationService.updateModelPlayback(delta);
        // After body bones are posed so saber trails sample current matrixWorld.
        this.equipmentService.updateWeaponModels(delta);
      }

      // Contact OnBlocked for PlayerControl / Drive / Walk / ExternalForce is
      // owned by MovementCommitter. Residual impulse coasts use ExternalForcePolicy.
      if(this.forceVector.length() && !playerControlCommitted){
        const disp = this.forceVector.clone();
        tickExternalForceStep(this, disp, delta);
        this.forceVector.set(0, 0, 0);
        const state = ensureMovementState(this);
        if(state.blockingObject != state.lastBlockingObject){
          const enteredBlock =
            !!state.blockingObject &&
            state.blockingObject !== state.lastBlockingObject;
          state.lastBlockingObject = state.blockingObject;
          if(enteredBlock){
            this.onBlocked();
          }
        }
      }

      // Party companion stuck timer — FollowLeader TeleportForward is owned by
      // the FollowLeader SM (ActionFollowLeader.softTeleportForward). Do not also
      // advance the ring from collisionTimer while following (dual TeleportForward).
      if(this.npcId != undefined && this != (GameState.PartyManager.getCurrentPlayer() as any) && this.collisionTimer >= 2){
        this.collisionTimer = 0;
      }

      this.turning = 0;
      if(this.facingAnim){
        const current = Utility.NormalizeRadian(this.rotation.z);
        const target = this.facing;
        const remaining = Utility.NormalizeRadian(target - current);
        const step = this.facingSpeed * delta;
        if(Math.abs(remaining) <= step){
          this.rotation.z = target;
          this.wasFacing = target;
          this.facingAnim = false;
        }else{
          this.rotation.z = Utility.NormalizeRadian(current + Math.sign(remaining) * step);
          this.turning = Math.sign(remaining);
        }
        this.markCollisionMatrixDirty("facing");
      }

      this.animationService.updateStationaryTurnAnimation();
      this.equipmentService.updateWearableEquipment(delta);

      if(!this.position.equals(this.lastPosition)){
        this.lastPosition.copy(this.position);
        this.positionChanged = true;
      }

      if(this.positionChanged){
        this.onPositionChanged();
      }
    }else{
      this.animationService.updateAnimationState();
      this.equipmentService.updateItems(delta);
      this.equipmentService.updateWeaponModels(delta);
    }

    // Decay stuck timer only when not in contact (MovementCommitter increments while colliding)
    if(!ensureMovementState(this).blockingObject){
      this.collisionTimer -= delta;
      if(this.collisionTimer < 0)
        this.collisionTimer = 0;
    }

    this.force = 0;
  }

  /**
   * Move-speed / player-control / server-loco / force-coast for one frame.
   * Kept on the facade (tightly coupled to movement authority).
   * @returns true when player control already committed displacement this frame
   */
  private updateLocomotionFrame(delta: number): boolean {
    if(
      this.isDead() ||
      (
        this.animationState.index == ModuleCreatureAnimState.DIE ||
        this.animationState.index == ModuleCreatureAnimState.DIE1 ||
        this.animationState.index == ModuleCreatureAnimState.GET_UP_DEAD ||
        this.animationState.index == ModuleCreatureAnimState.GET_UP_DEAD1
      )
    ){
      this.force = 0;
      this.speed = 0;
      this.animSpeed = 1;
      this.forceVector.set(0, 0, 0);
      if(this.playerControl){
        this.playerControl.active = false;
        this.playerControl.velX = 0;
        this.playerControl.velY = 0;
        this.playerControl.accelX = 0;
        this.playerControl.accelY = 0;
        this.playerControl.lastAnimMoveSpeed = 0;
        this.playerControl.driveFlags = 0;
      }
    }

    const actionType = this.action?.type;
    const serverLocomotionActive =
      actionType === ActionType.ActionDrive ||
      actionType === ActionType.ActionMoveToPoint ||
      actionType === ActionType.ActionFollowLeader ||
      actionType === ActionType.ActionForceFollowObject;
    const playerControlMoving =
      !!this.playerControl &&
      Math.hypot(this.playerControl.velX, this.playerControl.velY) > 0;
    // Direct WASD/stick overrides path actions while axes are held. Keep
    // running the controller after release so drag can decelerate.
    // Dialog mode still ticks creatures; sticky axes must not keep coasting.
    // Force Push: force-push loco only SetPosition — no cam turn.
    const forcePushLocked =
      this.isForcePushed() ||
      isForcePushLocoActive(this);
    const runtime = getDefaultRuntimeContext();
    const usePlayerControl =
      !forcePushLocked &&
      runtime.getMode() != EngineMode.DIALOG &&
      (!!this.playerControl?.active || playerControlMoving) &&
      (this.controlled || this === runtime.getCurrentPlayer?.());

    let playerControlCommitted = false;
    if(usePlayerControl){
      this.applyPlayerCamRelativeControl(delta);
      if(this.forceVector.lengthSq() > 1e-12){
        setMovementAuthority(this, MovementAuthority.PlayerControl);
        const result = resolvePlayerControlStep(this, this.forceVector);
        commitMovement(this, result, { delta });
        this.forceVector.set(0, 0, 0);
        playerControlCommitted = true;
      }
    }else if(forcePushLocked){
      // Hold still for player RK4; creature loco owns the slide.
      this.forceVector.set(0, 0, 0);
      this.force = 0;
      this.speed = 0;
      if(this.playerControl){
        this.playerControl.velX = 0;
        this.playerControl.velY = 0;
        this.playerControl.accelX = 0;
        this.playerControl.accelY = 0;
        this.playerControl.lastAnimMoveSpeed = 0;
      }
    }else if(serverLocomotionActive){
      this.forceVector.set(0, 0, 0);
      this.force = 0;
      this.updateServerLocomotionAnimationRate();
    }else if(this.force > 0 || this.moveDirOverride){
      // Legacy force-mover leftovers (RandomWalk etc. enqueue MoveTo now).
      // Keep a minimal coast path for any remaining force setters.
      this.forceVector.z = 0;
      this.speed += (this.getMovementSpeed() * 2.5) * this.force * delta;
      if(this.speed > this.getMovementSpeed()){
        this.speed = this.getMovementSpeed();
      }
      let forceDelta = Math.max(this.force * delta, this.speed * delta);
      if(this.speed){
        this.animSpeed = this.speed / this.getRunSpeed();
      }else{
        this.animSpeed = 1;
      }
      if(!this.forceVector.length()){
        if(this.moveDirOverride){
          const ox = this.moveDirOverride.x;
          const oy = this.moveDirOverride.y;
          const len = Math.hypot(ox, oy);
          if(len > 1e-8){
            this.forceVector.x = (ox / len) * forceDelta;
            this.forceVector.y = (oy / len) * forceDelta;
          }
        }else{
          this.forceVector.x = ( Math.cos(this.rotation.z + Math.PI/2) * forceDelta );
          this.forceVector.y = ( Math.sin(this.rotation.z + Math.PI/2) * forceDelta );
        }
        if(this.forceVector.length()){
          if(this.moveDirOverride && this.isWalking()){
            this.setAnimationState(ModuleCreatureAnimState.WALKING_BACK);
          }else if(this.animSpeed > 0.75){
            this.setAnimationState(ModuleCreatureAnimState.RUNNING);
          }else{
            this.setAnimationState(ModuleCreatureAnimState.WALKING);
          }
        }
      }else{
        this.forceVector.multiplyScalar(forceDelta);
      }
      if(this.force < 1){
        this.speed -= (this.getMovementSpeed() * 2.5) * delta;
      }
      if(this.speed < 0){
        this.speed = 0;
      }
      if(!this.forceVector.length() && ( this.animationState.index == ModuleCreatureAnimState.RUNNING || this.animationState.index == ModuleCreatureAnimState.WALKING || this.animationState.index == ModuleCreatureAnimState.WALKING_BACK )){
        if(this.combatMode === CombatMode.COUNTERSPELL){
          this.setAnimationState(ModuleCreatureAnimState.CASTOUT1_LP);
        }else{
          this.setAnimationState(
            this.combatData.combatState ? ModuleCreatureAnimState.READY : ModuleCreatureAnimState.PAUSE
          );
        }
        this.speed = 0;
        this.force = 0;
      }
    }else{
      this.forceVector.set(0, 0, 0);
      this.force = 0;
      if(this.speed > 0){
        this.speed = 0;
      }
      // creature walk update end-of-path: vtable(0x2710 / PAUSE).
      // Walk/run clips are forced looping — without this, a transit or cancelled
      // move leaves the creature frozen on the last walk frame forever.
      this.clearLocomotionAnimation();
    }

    return playerControlCommitted;
  }

  updateRegen(delta = 0){
    return this.statsService.updateRegen(delta);
  }

  updateActionQueue(delta = 0){
    // AIUpdate always calls RunActions — there is
    // no debilitated early-out. Locomotion is gated in quicktickCreatureWalk / walk tick / move
    // actions; conversation Wait/Resume (k_ptar_calofade after EffectHorrified)
    // must still tick or Pause hangs forever.
    const runtime = getDefaultRuntimeContext();
    if(!runtime.isReadyToProcessEvents())
      return;

      
    this.actionQueue.process( delta );
    this.action = this.actionQueue[0];
    if(!(this.action)){
      const currentPlayer = runtime.getCurrentPlayer?.();
      if(
        this.isPartyMember() &&
        this != currentPlayer &&
        !this.facingAnim
      ){
        if(this.combatData.combatState){
          // Do not keep staring at the PC once combat starts.
          if(this.lookAtObject === currentPlayer){
            this.lookAtObject = undefined;
          }
        }else{
          this.lookAtObject = currentPlayer;
          const targetFacing = Math.atan2(
            this.position.y - currentPlayer.position.y,
            this.position.x - currentPlayer.position.x
          ) + Math.PI/2;
          const diff = Math.abs(Utility.NormalizeRadian(targetFacing - this.rotation.z));
          if(diff > Math.PI / 6){
            this.setFacing(targetFacing, false);
          }
        }
      }
    }

  }

  updateListeningPatterns(){
    return this.creaturePerceptionService.updateListeningPatterns();
  }

  updatePerceptionList(delta = 0){
    return this.creaturePerceptionService.updatePerceptionList(delta);
  }

  updateCombat(delta = 0){
    return this.combatService.updateCombat(delta);
  }

  updateCasting(delta = 0){
    return this.combatService.updateCasting(delta);
  }

  clearTarget(){
    return this.combatService.clearTarget();
  }

  actionInRange(action: Action): boolean {
    if(action){
      if(action.type == ActionType.ActionCastSpell){
        const spell = new TalentSpell( action.getParameter(0) );
        const target: GameObject = action.getParameter(5);
        if(target instanceof GameObject){
          return spell.inRange(target, this);
        }else{
          return true;
        }
      }else if(action.type == ActionType.ActionItemCastSpell){
        const spell = new TalentSpell( action.getParameter(5) );
        const target: GameObject = action.getParameter(0);
        if(target instanceof GameObject){
          return spell.inRange(target, this);
        }else{
          return true;
        }
      }else if(action.type == ActionType.ActionPhysicalAttacks){
        const target: GameObject = action.getParameter(1);
        if(target instanceof GameObject){
          // Distance to target origin (no openSpot / surround slot).
          const distance = this.position.distanceTo(target.position);
          return distance < ( (this.combatData.getEquippedWeaponType() == 1 || this.combatData.getEquippedWeaponType() == 3) ? 2.0 : 15.0 );
        }else{
          return true;
        }
      }else{
        console.warn(`actionInRange: Invalid action type ${action.type}`, action)
      }
    }else{
      console.warn(`actionInRange: Invalid action`, action)
    }
    return true;
  }

  /**
   * Attack-approach destination for `targeter` toward this object.
   * No surround picker — creature origin / door-placeable action point.
   */
  getBestAttackPoint(targeter: GameObject){
    const p = getAttackApproachPoint(this, targeter);
    return { x: p.x, y: p.y, z: p.z };
  }

  /**
   * Moving creatures inject short-lived point gusts so grass tips part.
   * Gated to outdoor areas with wind; capped by WindManager.MAX_POINT_SOURCES.
   */
  private pushGrassWindGust(): void {
    const wm = GameState.windManager;
    const area = this.area;
    if(!wm || !area){
      return;
    }
    if((area.flags & 1) !== 0){
      return;
    }
    if(this.isDead?.()){
      return;
    }

    const locomoting =
      this.animationState.index == ModuleCreatureAnimState.RUNNING ||
      this.animationState.index == ModuleCreatureAnimState.WALKING ||
      this.animationState.index == ModuleCreatureAnimState.WALKING_BACK ||
      this.forceVector.lengthSq() > 1e-6;

    if(!locomoting){
      this._grassGustLastX = this.position.x;
      this._grassGustLastY = this.position.y;
      return;
    }

    if(Number.isNaN(this._grassGustLastX)){
      this._grassGustLastX = this.position.x;
      this._grassGustLastY = this.position.y;
      return;
    }

    const dx = this.position.x - this._grassGustLastX;
    const dy = this.position.y - this._grassGustLastY;
    if((dx * dx + dy * dy) < 0.04){
      return;
    }

    this._grassGustLastX = this.position.x;
    this._grassGustLastY = this.position.y;
    wm.addPointSourceWind(this.position, 2.5, 0.2, 1.0);
  }

  updateAnimationState(){
    return this.animationService.updateAnimationState();
  }

  /**
   * Apply the current drive clip to the skeleton without requiring EngineMode
   * INGAME. loadModel runs under LOADING, where update skips animation — without
   * this, creatures render MDL bind/rest pose until the first real tick.
   */
  primeAnimationPose(){
    return this.animationService.primeAnimationPose();
  }

  damage(amount = 0, oAttacker: GameObject, delayTime = 0){
    if(delayTime){
      this.damageList.push({amount: amount, delay: delayTime});
    }else{
      this.subtractHP(amount);
    }
    this.combatData.lastDamager = oAttacker;
    this.combatData.lastAttacker = oAttacker;
    this.assignHostileActor(oAttacker);

    // Only adopt the damager as attack target when we have no live focus
    // including sticky attempted target — so a hit from another creature cannot
    // pull the PC off a queued combat target.
    const attackTarget = this.combatData.lastAttackTarget;
    const attempted = this.combatData.lastAttemptedAttackTarget;
    const attackTargetGone = !(attackTarget instanceof GameObject) || attackTarget.isDead();
    const attemptedGone = !(attempted instanceof GameObject) || attempted.isDead();
    if(attackTargetGone && attemptedGone){
      this.combatData.lastAttackTarget = oAttacker;
    }

    if(typeof oAttacker != 'undefined')
      this.onDamaged();
  }

  /** True while this creature owns an in-progress spell cast (area.spellInstances). */
  hasActiveSpellCast(): boolean {
    const instances = this.area?.spellInstances;
    if(!instances?.length) return false;
    for(let i = 0; i < instances.length; i++){
      const inst = instances[i];
      if(inst && inst.owner === this && !inst.completed){
        return true;
      }
    }
    return false;
  }

  canMove(){
    return !this.isParalyzed() && !this.isStunned() && (
      this.animationState.index != ModuleCreatureAnimState.DEAD && 
      this.animationState.index != ModuleCreatureAnimState.DEAD1 && 
      this.animationState.index != ModuleCreatureAnimState.DIE && 
      this.animationState.index != ModuleCreatureAnimState.DIE1 && 
      this.animationState.index != ModuleCreatureAnimState.GET_UP_DEAD && 
      this.animationState.index != ModuleCreatureAnimState.GET_UP_DEAD1
    ) && !this.hasActiveSpellCast();
  }

  getCurrentAction(){
    if(this.actionQueue.length){
      return this.actionQueue[0].type;
    }
    return 65535;
  }

  JumpToLocation(lLocation: EngineLocation): void {
    // Creatures: GameObject.JumpToLocation runs ActionJumpToPoint → applyLocalTeleport.
    // Placement via teleport / settleWalkableAttachment — not a locomotion solver.
    super.JumpToLocation(lLocation);
  }

  /**
   * Enqueue MoveToPoint. AddMoveToPointAction: timeout 0 = no
   * Jump fallback (ActionMoveTo*); timeout > 0 = ForceMove jump-on-expiry.
   * Arrive range: max(script fRange, GetUseRange) — ExecuteCommandMoveToObject.
   */
  moveToObject(target: GameObject, bRun = true, distance = 1.0, timeout = 0){

    if(target instanceof GameObject){
      // attempted-move object id (GetAttemptedMovementTarget)
      this.attemptedMovementTarget = target;

      let action = getDefaultRuntimeContext().createAction('ActionMoveToPoint');
      action.setParameter(0, ActionParameterType.FLOAT, target.position.x);
      action.setParameter(1, ActionParameterType.FLOAT, target.position.y);
      action.setParameter(2, ActionParameterType.FLOAT, target.position.z);
      action.setParameter(3, ActionParameterType.DWORD, this.area?.id ?? target.area?.id ?? 0);
      action.setParameter(4, ActionParameterType.DWORD, target.id);
      action.setParameter(5, ActionParameterType.INT, bRun ? 1 : 0);
      const use = getUseRange(this, target, false);
      action.setParameter(6, ActionParameterType.FLOAT, Math.max(use.range, distance));
      action.setParameter(7, ActionParameterType.INT, 0);
      action.setParameter(8, ActionParameterType.FLOAT, timeout > 0 ? timeout : 0);
      this.actionQueue.add(action);
    }

  }

  detachFromRoom(room: AreaRoom): void {
    if(!room) return;
    const index = room.creatures.indexOf(this);
    if(index >= 0){
      room.creatures.splice(index, 1);
    }
  }

  randomWalk(){

    if(this.room && this.room.collisionManager.walkmesh){
      let run = false;
      let maxDistance = 1.5
      let position = new THREE.Vector3();

      const faces = this.room.collisionManager.walkmesh.walkableFaces;
      const face = faces[Math.floor(Math.random()*faces.length)];
      if(face){
        position.copy(face.centroid);
        let action = getDefaultRuntimeContext().createAction('ActionMoveToPoint');
        action.setParameter(0, ActionParameterType.FLOAT, position.x);
        action.setParameter(1, ActionParameterType.FLOAT, position.y);
        action.setParameter(2, ActionParameterType.FLOAT, position.z);
        action.setParameter(3, ActionParameterType.DWORD, this.area?.id ?? 0);
        action.setParameter(4, ActionParameterType.DWORD, 0xFFFFFFFF);
        action.setParameter(5, ActionParameterType.INT, run ? 1 : 0);
        action.setParameter(6, ActionParameterType.FLOAT, Math.max(1.5, maxDistance));
        action.setParameter(7, ActionParameterType.INT, 0);
        action.setParameter(8, ActionParameterType.FLOAT, 30.0);
        this.actionQueue.add(action);
      }

    }

  }

  /**
   * Enqueue MoveToPoint. ActionMoveToLocation timeout 0;
   * ActionForceMoveToLocation passes script timeout (default 30).
   */
  moveToLocation(target: GameObject|EngineLocation, bRun = true, timeout = 0){

    if(target instanceof EngineLocation || target instanceof GameObject){

      let distance = 0.1;
      let creatures = this.area?.creatures ?? [];

      //Check if creatures are too close to location
      for(let i = 0; i < creatures.length; i++){
        let creature = creatures[i];
        if(this == creature)
          continue;

        let d = target.position.distanceTo(creature.position);
        if(d < 1.0){
          distance = 2.0;
        }
      }

      //Check if party are too close to location
      const party = getDefaultRuntimeContext().getParty?.() ?? [];
      for(let i = 0; i < party.length; i++){
        let creature = party[i];
        if(this == creature)
          continue;

        let d = target.position.distanceTo(creature.position);
        if(d < 1.0){
          distance = 2.0;
        }
      }

      let action = getDefaultRuntimeContext().createAction('ActionMoveToPoint');
      action.setParameter(0, ActionParameterType.FLOAT, target.position.x);
      action.setParameter(1, ActionParameterType.FLOAT, target.position.y);
      action.setParameter(2, ActionParameterType.FLOAT, target.position.z);
      action.setParameter(3, ActionParameterType.DWORD, this.area?.id ?? target.area?.id ?? 0);
      action.setParameter(4, ActionParameterType.DWORD, target instanceof EngineLocation ? GameObjectConstant.OBJECT_INVALID : target.id );
      action.setParameter(5, ActionParameterType.INT, bRun ? 1 : 0);
      action.setParameter(6, ActionParameterType.FLOAT, Math.max(1.5, distance));
      action.setParameter(7, ActionParameterType.INT, 0);
      action.setParameter(8, ActionParameterType.FLOAT, timeout > 0 ? timeout : 0);
      this.actionQueue.add(action);

    }

  }

  jumpToObject(target: GameObject, bWalkStraight: number = 1){
    if(target instanceof GameObject){

      let action = getDefaultRuntimeContext().createAction('ActionJumpToObject');
      action.setParameter(0, ActionParameterType.DWORD, target.id );
      // bWalkStraight → open/safe walk location requireLOS (default TRUE)
      action.setParameter(1, ActionParameterType.INT, bWalkStraight | 0);
      this.actionQueue.add(action);

    }

  }

  jumpToLocation(target: EngineLocation){
    if(target instanceof EngineLocation){
      let action = getDefaultRuntimeContext().createAction('ActionJumpToPoint');
      action.setParameter(0, ActionParameterType.FLOAT, target.position.x);
      action.setParameter(1, ActionParameterType.FLOAT, target.position.y);
      action.setParameter(2, ActionParameterType.FLOAT, target.position.z);
      const areaId = target.area?.id ?? this.area?.id ?? 0;
      action.setParameter(3, ActionParameterType.DWORD, areaId);
      action.setParameter(4, ActionParameterType.INT, 0);
      action.setParameter(5, ActionParameterType.FLOAT, 20.0);
      action.setParameter(6, ActionParameterType.FLOAT, target.rotation.x);
      action.setParameter(7, ActionParameterType.FLOAT, target.rotation.y);
      this.actionQueue.add(action);
    }

  }

  /**
   * Enter/refresh combat. AddAttackActions → BroadcastCombatStateToParty →
   * SetCombatState(1) (8000ms) + SetExcitedState (ExcitedDuration.2da).
   */
  setCombatEngaged(reason: ExcitedDurationRow = ExcitedDurationRow.Damage){
    return this.combatService.setCombatEngaged(reason);
  }

  /**
   * BroadcastCombatStateToParty.
   * Refreshes SetCombatState(1) on self when hostile to `other` (or `other` is self),
   * then party/faction mates in spot range get SetCombatState + SetExcitedState(Damage).
   * Used on attack start and OnPhysicalAttacked (including misses).
   */
  broadcastCombatStateToParty(other?: GameObject){
    return this.combatService.broadcastCombatStateToParty(other);
  }

  /**
   * ResolveInitiative
   * sets = (== 0) — non-party AI refresh flag.
   */
  resolveInitiative(){
    return this.combatService.resolveInitiative();
  }

  /**
   * Compatibility wrapper — physical engagement uses Damage row.
   */
  resetExcitedDuration(){
    return this.combatService.resetExcitedDuration();
  }

  /**
   * SetCombatState.
   * Active → refresh 8000ms timer; inactive → clear combat engagement.
   */
  setCombatState(active: boolean, reason: number = ExcitedDurationRow.Damage){
    return this.combatService.setCombatState(active, reason);
  }

  /**
   * SetExcitedState — only extend if new DURATION is greater.
   * When extended for a client-controlled creature with GetNearestEnemy(30) present,
   * calls area PlayBattleMusic(1).
   */
  setExcitedState(row: ExcitedDurationRow | number){
    return this.combatService.setExcitedState(row);
  }

  /**
   * RemoveCombatInvisibilityEffects
   * strip INVISIBILITY when int[0]==1 and all SANCTUARY.
   */
  removeCombatInvisibilityEffects(){
    return this.combatService.removeCombatInvisibilityEffects();
  }

  cancelExcitedDuration(){
    return this.combatService.cancelExcitedDuration();
  }

  /**
   * AIUpdate combat-state tick — countdown to SetCombatState(0).
   * While still closing on a living combat target (PhysicalAttacks / chase Move),
   * refresh the 8000ms timer instead of wiping the combat schedule mid-approach.
   */
  updateCombatStateTimer(delta = 0){
    return this.combatService.updateCombatStateTimer(delta);
  }

  /**
   * True when a living combat target remains and the action queue / round is
   * still pursuing it (prevents 8s SetCombatState(0) during long approaches).
   */
  isActivelyPursuingCombatTarget(): boolean {
    return this.combatService.isActivelyPursuingCombatTarget();
  }

  /**
   * UpdateExcitedStateTimer — battle music timer only (not stance).
   * On expiry for a client-controlled creature → PlayBattleMusic(0).
   */
  updateExcitedDuration(delta = 0){
    return this.combatService.updateExcitedDuration(delta);
  }

  isDueling(): boolean {
    return this.combatService.isDueling();
  }

  /** ResolveChoreographedState weapon gate (excludes stun baton / ranged). */
  isDuelingWeaponEquipped(){
    return this.combatService.isDuelingWeaponEquipped();
  }

  isDuelingObject(oObject: GameObject){
    return this.combatService.isDuelingObject(oObject);
  }

  /**
   * Queue a normal attack (or feat attack). CutsceneAttack uses
   * {@link addCutsceneAttackActions} instead.
   */
  /**
   * Attack ordered by the player (action menu / clicking a hostile).
   */
  playerAttackCreature(target: GameObject, feat?: TalentFeat){
    return this.combatService.playerAttackCreature(target, feat);
  }

  attackCreature(target: GameObject, feat?: TalentFeat, _isCutsceneAttack = false, attackDamage = 0, attackAnimation?: number | string, attackResult?: AttackResult){
    return this.combatService.attackCreature(target, feat, _isCutsceneAttack, attackDamage, attackAnimation, attackResult);
  }

  /**
   * queue cutscene attacks
   * queue cutscene attack.
   */
  addCutsceneAttackActions(target: GameObject, animationRow: number, attackResult: AttackResult, damage: number){
    return this.combatService.addCutsceneAttackActions(target, animationRow, attackResult, damage);
  }

  /**
   * AddCutsceneMoveActions
   * AddCutsceneMoveActions.
   */
  addCutsceneMoveActions(destObject: GameObject | undefined, position: { x: number; y: number; z: number }, shouldRun: number){
    return this.combatService.addCutsceneMoveActions(destObject, position, shouldRun);
  }

  /**
   * Refresh transient AI action tracking, then rescan the action list.
   * Full per-action reverse is deferred; ClearAllActions(1) follows immediately
   * on the cutscene path.
   */
  refreshTransientAIState(){
    return this.combatService.refreshTransientAIState();
  }

  /**
   * NWScript ActionUseTalentOnObject — talent.objectType is a bitfield
   * (TalentObject|Spell/Feat/Skill), not a 0/1/2 enum.
   */
  useTalent(talent: TalentObject, oTarget: GameObject): Action {
    return this.combatService.useTalent(talent, oTarget);
  }

  getDebilitatedState(): number {
    return this.combatService.getDebilitatedState();
  }

  animationConstantToAnimation(animation_constant = 10000): SWAnimation | undefined {
    return this.animationService.animationConstantToAnimation(animation_constant);
  }


  setAnimationState(animState: ModuleCreatureAnimState){
    return this.animationService.setAnimationState(animState);
  }
  
  resetAnimationState(){
    return this.animationService.resetAnimationState();
  }

  playTwoDAAnimation(animation: SWAnimation){
    return this.animationService.playTwoDAAnimation(animation);
  }

  playOverlayAnimation(NWScriptAnimId = -1){
    return this.animationService.playOverlayAnimation(NWScriptAnimId);
  }

  /**
   * SetOverlayAnimation — body + head Gobs.
   */
  applyOverlayToBodyAndHead(name: string, data: SWAnimation){
    return this.animationService.applyOverlayToBodyAndHead(name, data);
  }

  /**
   * Stop overlay runs (dialog end / pose change). Uses stop flags 0x80 / 0x400.
   */
  stopOverlayAnimation(){
    return this.animationService.stopOverlayAnimation();
  }

  /**
   * Apply a server animation ID using ResolvePlaybackMode (modes 0/1/2).
   */
  applyAnimationByMode(serverId: number, speed: number = 1){
    return this.animationService.applyAnimationByMode(serverId, speed);
  }
  
  resetOverlayAnimationState(){
    return this.animationService.resetOverlayAnimationState();
  }

  resetGestureState(){
    return this.animationService.resetGestureState();
  }

  resetWeaponGestureState(){
    return this.animationService.resetWeaponGestureState();
  }

  /**
   * Play flourish clip on equipped weapon Gobs.
   * Does not schedule PowerItem off — sabers stay ignited until combat state expires.
   */
  startWeaponGesture(clipName: string, durationSec: number){
    return this.animationService.startWeaponGesture(clipName, durationSec);
  }

  dialogPlayOdysseyAnimation(anim: OdysseyModelAnimation, animationId: number = -1){
    return this.animationService.dialogPlayOdysseyAnimation(anim, animationId);
  }

  dialogPlayAnimation(data: SWAnimation = {} as SWAnimation){
    return this.animationService.dialogPlayAnimation(data);
  }

  /**
   * CancelCombat.
   * ClearAllActions(1) → SetCombatState(0) → assign hostile actor(INVALID) →
   * ClearHostileActionsVersus(null) → end combat round → client SetCombatMode(0).
   */
  cancelCombat(){
    return this.combatService.cancelCombat();
  }

  /**
   * SurrenderToEnemies.
   * @param retainSelfBuffs - 1 for SurrenderRetainBuffs (keep self-created effects)
   */
  surrenderToEnemies(retainSelfBuffs: boolean = false){
    return this.combatService.surrenderToEnemies(retainSelfBuffs);
  }

  /**
   * ClearVisibleList + UpdateVisibleList(0)
   * used by ChangeFactionByFaction after AddMember.
   */
  clearVisibleList(){
    return this.combatService.clearVisibleList();
  }

  /**
   * ClearHostileActionsVersus
   * drop queued action groups whose head is a hostile action (Attack 0xC
   * CastSpell 0xF / ItemCastSpell 0x2E). When `versus` is provided the group
   * must also target it; when omitted (null) every hostile group is dropped.
   */
  clearHostileActionsVersus(versus?: Creature){
    return this.combatService.clearHostileActionsVersus(versus);
  }

  /**
   * PacifyCreature
   * area creatures that have this as a combat/hostile ref leave combat vs us.
   */
  pacifyCreature(){
    return this.combatService.pacifyCreature();
  }

  getModelAnimationByName(name: string): OdysseyModelAnimation {
    return this.animationService.getModelAnimationByName(name);
  }

  getDamageAnimation(attackAnimName: string): SWAnimation {
    return this.animationService.getDamageAnimation(attackAnimName);
  }

  getDodgeAnimation(attackAnimName: string): SWAnimation {
    return this.animationService.getDodgeAnimation(attackAnimName);
  }

  getParryAnimation(attackAnimName: string): SWAnimation {
    return this.animationService.getParryAnimation(attackAnimName);
  }

  /**
   * Attack family letter for combat clip names (m/b/g).
   * Matches UpdateWeaponClass weapon_type source: dual uses off-hand item.
   */
  getCombatAnimationAttackType(): string {
    return this.animationService.getCombatAnimationAttackType();
  }

  /**
   * Combat animation weapon digit (g*r1 / m*a1 *).
   * Derived from equipped weapon class / wield type.
   */
  getCombatAnimationWeaponType(){
    return this.animationService.getCombatAnimationWeaponType();
  }

  getEquippedWeaponType(){
    return this.combatService.getEquippedWeaponType();
  }

  isRangedEquipped(){
    return this.combatService.isRangedEquipped();
  }





  /** Best melee in possession; falls back to ranged. */
  findMostDamagingMelee(offHand = false): Item | undefined {
    return this.equipmentService.findMostDamagingMelee(offHand);
  }

  /** Best ranged in possession; falls back to melee. */
  findMostDamagingRanged(): Item | undefined {
    return this.equipmentService.findMostDamagingRanged();
  }

  updateItems(delta = 0){
    return this.equipmentService.updateItems(delta);
  }

  private getFootstepPriorityGroup(): AudioPriorityGroup {
    if(this === GameState.PartyManager.getCurrentPlayer()){
      return AudioPriorityGroup.PLAYER_FOOTSTEPS;
    }

    // Simple creatures route to creature footstep groups.
    if(this.isSimpleCreature()){
      return AudioPriorityGroup.MEDIUM_AND_SMALL_CREATURE_FOOTSTEPS;
    }

    return AudioPriorityGroup.MEDIUM_AND_SMALL_CREATURE_FOOTSTEPS;
  }

  private getSoundSetPriorityGroup(): AudioPriorityGroup {
    if(this === GameState.PartyManager.getCurrentPlayer()){
      return AudioPriorityGroup.PLAYER_CHAT;
    }

    // Prefer creature vocal groups for non-humanoid simple creatures.
    if(this.isSimpleCreature()){
      return AudioPriorityGroup.MEDIUM_AND_SMALL_CREATURE_VOCALIZATIONS;
    }

    return AudioPriorityGroup.NON_PLAYER_CHAT;
  }

  showLightSaberContactVisual(): void {
    return this.animationService.showLightSaberContactVisual();
  }

  /**
   * PlaySwingSound — weaponsounds row from weaponmattype,
   * preferring off-hand when it is a lightsaber.
   */
  private getPlaySwingWeaponSound(){
    const rh = this.equipment.RIGHTHAND;
    const lh = this.equipment.LEFTHAND;
    if(lh?.isLightsaber?.()){
      return lh.weaponSound;
    }
    return rh?.weaponSound || lh?.weaponSound;
  }

  playEvent(event: THREE.Event){
    this.audioEmitter.setPosition(this.position.x, this.position.y, this.position.z);
    this.footstepEmitter.setPosition(this.position.x, this.position.y, this.position.z);
    this.footstepEmitter.setPriorityGroupId(this.getFootstepPriorityGroup());
    
    const appearance = this.creatureAppearance;
    const swingSounds = this.getPlaySwingWeaponSound();
    const rhSounds = this.equipment.RIGHTHAND?.weaponSound;
    const lhSounds = this.equipment.LEFTHAND?.weaponSound;
    const footstepSounds = GameState.SWRuleSet.footSteps[appearance.footsteptype];

    let weaponSoundResRef = '';
    let rhWeaponSoundResRef = '';
    let lhWeaponSoundResRef = '';
    let footstepSoundResRef = '';
    let footstepIsLooping = false;

    // MDL event names match RegisterCallbacks casing; compare case-insensitively.
    const eventName = String((event as any).event || '').toLowerCase();

    switch(eventName){
      case 'snd_footstep':
        if(footstepSounds){
          const isRolling = footstepSounds.isRolling();
          footstepSoundResRef = isRolling ? footstepSounds.getRollingResRef() : footstepSounds.getSurfaceSoundResRef(this.collisionManager.surfaceId);
          footstepIsLooping = isRolling;
        }
      break;
      case 'swingshort':
        weaponSoundResRef = swingSounds?.getSwingShortResRef() || '';
      break;
      case 'swinglong':
        weaponSoundResRef = swingSounds?.getSwingLongResRef() || '';
      break;
      case 'swingtwirl':
        weaponSoundResRef = swingSounds?.getSwingTwirlResRef() || '';
      break;
      case 'hitparry':
        // HitParryEvent → PlaySwingSound("Parry", 2)
        weaponSoundResRef = swingSounds?.getHitParryResRef() || '';
      break;
      case 'contact':
        // HitContactEvent → ShowLightSaberContactVisual (VFX only)
        this.showLightSaberContactVisual();
      break;
      case 'clash':
        // HitClashEvent → PlaySwingSound("Clash", 2)
        weaponSoundResRef = swingSounds?.getClashResRef() || '';
      break;
      case 'hit':
        if(this.combatData.combatAction && this.combatData.combatAction.hits && this.combatData.combatAction.damage){
          this.combatData.combatAction.target.damage(this.combatData.combatAction.damage, this);
        }

        rhWeaponSoundResRef = rhSounds?.getLeatherResRef() || '';
        lhWeaponSoundResRef = lhSounds?.getLeatherResRef() || '';
      break;
    }

    if(footstepSoundResRef && footstepIsLooping && !this.footstepEmitter.isPlayingSound(footstepSoundResRef)){
      console.log('Playing rolling sound', footstepSoundResRef);
      this.footstepEmitter.playSound(footstepSoundResRef);
    }else if(footstepSoundResRef){
      this.footstepEmitter.playSoundFireAndForget(footstepSoundResRef);
    }

    if(weaponSoundResRef){
      this.audioEmitter.setPriorityGroupId(AudioPriorityGroup.COMBAT);
      this.audioEmitter.playSoundFireAndForget(weaponSoundResRef);
    }else if(rhWeaponSoundResRef || lhWeaponSoundResRef){
      this.audioEmitter.setPriorityGroupId(AudioPriorityGroup.COMBAT);
      if(rhWeaponSoundResRef){
        this.audioEmitter.playSoundFireAndForget(rhWeaponSoundResRef);
      }
      if(lhWeaponSoundResRef && lhWeaponSoundResRef !== rhWeaponSoundResRef){
        this.audioEmitter.playSoundFireAndForget(lhWeaponSoundResRef);
      }
    }
  }

  hasWeapons(){
    return this.equipmentService.hasWeapons();
  }

  /**
   * True when legs should keep drive locomotion under a flourish overlay.
   * PlayerFlourishWeapons checks player-control forward/strafe != 0.
   */
  isFlourishMoving(): boolean {
    return this.animationService.isFlourishMoving();
  }

  flourish(){
    return this.combatService.flourish();
  }

  /**
   * PlayDrawAnimation(FLOURISH / 0x2806) — UpdateVisibleWeapons on MainHand/OffHand
   * equip when not instant. Hides the model swap behind the new weapon's g*w1.
   * Duration matches InsertFireForgetAnimation(..., 0x5dc).
   */
  playDrawAnimation(){
    return this.combatService.playDrawAnimation();
  }

  /**
   * True when engagement came from hostile combat (Damage), not flourish/SpellCast-only.
   * matches engine behavior client sync gate: SetCombatState client update iff arg2 == 1.
   */
  isHostileCombatEngaged(): boolean {
    return this.combatService.isHostileCombatEngaged();
  }

  /**
   * Set the weapon powered state
   * @param on - Whether the weapon should be powered
   */
  weaponPowered(on: boolean = false): void {
    return this.combatService.weaponPowered(on);
  }

  setLIP(lip: LIPObject){
    //console.log(lip);
    this.lipObject = lip;
  }

  getClosesetOpenSpot(oObject: GameObject){
    let maxDistance = Infinity;
    let radius = this.creatureAppearance?.hitdist ?? 1;
    let closest = undefined;
    let distance = 0;
    let origin = this.position;

    let alreadyClaimedSpot = false;

    //Check to see if oObject already has claimed a targetPosition around this creature
    for(let i = 0, len = this.targetPositions.length; i < len; i++){
      let targetPosition = this.targetPositions[i];
      if(targetPosition.object == oObject){
        closest = targetPosition;
        alreadyClaimedSpot = true;
        break;
      }
    }

    if(!alreadyClaimedSpot){
      for(let i = 0, len = this.targetPositions.length; i < len; i++){
        let targetPosition = this.targetPositions[i];
        if(targetPosition.object == undefined){
          //Generate the target vector for the
          targetPosition.targetVector.x = origin.x + (targetPosition.cos * radius);
          targetPosition.targetVector.y = origin.y + (targetPosition.sin * radius);
          targetPosition.targetVector.z = origin.z;
          distance = targetPosition.targetVector.distanceTo(oObject.position);

          //is this target position is closer to oObject
          if(distance < maxDistance){
            //Set the current targetPosition as the current closest position
            closest = targetPosition;
            //Update the maxDistance
            maxDistance = distance;
          }
        }
      }
      if(typeof closest != 'undefined'){
        const creatures = this.area?.creatures;
        if(creatures){
          for(let i = 0, len = creatures.length; i < len; i++){
            creatures[i].removeObjectFromTargetPositions(oObject);
          }
        }

        for(let i = 0, len = GameState.PartyManager.party.length; i < len; i++){
          GameState.PartyManager.party[i].removeObjectFromTargetPositions(oObject);
        }
        closest.object = oObject;
      }
    }
    return closest;
  }

  removeObjectFromTargetPositions(oObject: GameObject){
    if(typeof oObject != 'undefined'){
      for(let i = 0, len = this.targetPositions.length; i < len; i++){
        if(this.targetPositions[i].object == oObject){
          this.targetPositions[i].object = undefined;
        }
      }
    }
  }

  setFacingVector( facing = new THREE.Vector3() ){
    this.xOrientation = facing.x;
    this.yOrientation = facing.y;

    if(this.model instanceof OdysseyModel3D)
      this.model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(this.xOrientation, this.yOrientation));
  }

  getFacingVector(){
    if((this.model instanceof OdysseyModel3D)){
      let facing = new THREE.Vector3(0, 1, 0);
      facing.applyQuaternion(this.model.quaternion);
      return facing;
    }
    return new THREE.Vector3(0, 0, 0);
  }

  getFacing(){
    return this.rotation.z;
  }

  setFacingObject( target: GameObject ){
    if(target instanceof GameObject){
      this.setFacing(
        Math.atan2(
          this.position.y - target.position.y,
          this.position.x - target.position.x
        ) + Math.PI/2,
        false
      );
    }
  }

  lookAt(oObject: GameObject | undefined){
    return this.animationService.lookAt(oObject);
  }

  /**
   * GetReticlePoint
   * head / head_g / rootdummy (then GameObject lookathook fallback).
   */
  getReticleNode(){
    if(!this.model){ return; }

    if(this.model.headhook){
      return this.model.headhook;
    }

    const headG = this.getModelNodeByName('head_g');
    if(headG){
      return headG;
    }

    if(this.model.rootdummy){
      return this.model.rootdummy;
    }

    return super.getReticleNode();
  }

  static readonly HEAD_TRACKING_H_SPEED = Math.PI * 2;
  static readonly HEAD_TRACKING_V_SPEED = Math.PI * 0.25;
  lookAtPosition: THREE.Vector3 = new THREE.Vector3();

  /** Unwind look compose on hturn when tracking has no valid target. */

  updateHeadTracking(delta: number){
    return this.animationService.updateHeadTracking(delta);
  }

  onClick(callee: GameObject){

    //You can't interact with yourself
    if(this === GameState.PartyManager.Player && GameState.PartyManager.getCurrentPlayer() === this){
      return;
    }

    if(this.isHostile(callee) && !this.isDead()){
      GameState.PartyManager.getCurrentPlayer().playerAttackCreature(this, undefined);
    }else if(this.isDead() && this.canLootAsCorpse(callee)){
      this.clearAllActions();
      GameState.PartyManager.getCurrentPlayer().actionUseObject(this.getLootUseTarget() as GameObject);
    }else if(!this.isDead()){
      this.clearAllActions();
      if(this.getConversation() && this.getConversation().resref){
        GameState.PartyManager.getCurrentPlayer().actionDialogObject(this, this.getConversation().resref, false, undefined, undefined, true);
      }
    }
    
  }

  positionChanged: boolean = false;

  /**
   * Called when the creature's position changes
   */
  onPositionChanged(){
    this.positionChanged = false;
    // Keep cull / trigger AABB current when position changes outside setPosition.
    this.computeBoundingBox?.();
    AreaSubAreaPositionFanout.update(this);
    // ProcessPoint on leader walk — feed party follow ring
    if(GameState.PartyManager.party[0] === this){
      GameState.PartyManager.processLeaderFollowPoint(this);
    }
  }

  //---------------//
  // SCRIPT EVENTS
  //---------------//

  override triggerHeartbeat(){
    if(!this.canProcessHeartbeat()){ return; }
    const onHeartbeat = this.scripts[ScriptHook.CreatureOnHeartbeat];
    if(!onHeartbeat){ return; }
    onHeartbeat.run(this);
  }

  override triggerUserDefinedEvent(event: NWScriptEvent){
    this.runUserDefinedScript(event, this.scripts[ScriptHook.CreatureOnUserDefined]);
  }

  /**
   * creature EventHandler case 2:
   * harmful → BroadcastCombatStateToParty + SetExcitedState on both sides.
   */
  override triggerSpellCastAtEvent(event: NWScriptEvent){
    if(!(event instanceof NWScriptEvent)){ return; }

    const caster = event.getObject(0);
    const harmful = !!event.getInt(1);

    if(harmful && isCreature(caster)){
      // EventHandler OnSpellCastAt sets last hostile when harmful
      this.assignHostileActor(caster);
      caster.broadcastCombatStateToParty(this);
      caster.setExcitedState(ExcitedDurationRow.SpellCast);
      caster.removeCombatInvisibilityEffects();
      this.broadcastCombatStateToParty(caster);
      this.setExcitedState(ExcitedDurationRow.Damage);
    }

    this.runSpellCastAtScript(event, this.scripts[ScriptHook.CreatureOnSpellAt]);
  }

  override runSpawnScript(): void {
    const onSpawn = this.scripts[ScriptHook.CreatureOnSpawn];
    if(onSpawn){
      onSpawn.run(this, 0);
      console.log('spawned', this.getName());
    }
  }

  override onCombatRoundEnd(runScript: boolean = true){
    if(this.combatData.lastAttemptedAttackTarget instanceof GameObject && this.combatData.lastAttemptedAttackTarget.isDead())
      this.combatData.lastAttemptedAttackTarget = undefined;

    // No CombatState gate; the caller decides whether OnEndRound runs.
    // Keep the dead check so corpses never re-run OnEndRound AI.
    if(!runScript || this.isDead())
      return true;
    
    const nwscript = this.scripts[ScriptHook.CreatureOnEndRound];
    if(!nwscript){ return true; }
    nwscript.run(this);
  }

  /**
   * Encounter unlink on destroy-self effect (arg2=0);
   * DestroySelf encounter action (arg2=1).
   */
  unlinkFromEncounter(fromDestroySelf: boolean = false){
    return this.deathCorpseService.unlinkFromEncounter(fromDestroySelf);
  }

  override onDeath(){
    return this.deathCorpseService.onDeath();
  }

  /**
   * GetDeadTemp — true when this creature is in the
   * client party and current HP < 1 (awaiting combat-clear resurrection).
   */
  getDeadTemp(): boolean {
    return this.deathCorpseService.getDeadTemp();
  }

  /**
   * Begin destroy scheduling for a destroyable corpse.
   * effect apply: wait appearance.DestroyObjectDelay (default 3.0s),
   * then event `0xb` spawns the bag and either SetFadeOutTime (FadeDelayOnDeath ms)
   * or SetKeepCorpse (missing FadeDelayOnDeath) — not an 8s fade-as-authority.
   * Non-destroyable corpses stay selectable with loot on the creature.
   * GetDeadTemp party members skip this path entirely.
   */
  scheduleDestroyAsCorpse(){
    return this.deathCorpseService.scheduleDestroyAsCorpse();
  }

  /**
   * Continue death animation + model while waiting for DestroyObjectDelay / fade-out.
   */
  updateCorpsePendingDestroy(delta: number = 0){
    return this.deathCorpseService.updateCorpsePendingDestroy(delta);
  }

  /** Tick wielded weapon models once per frame after the body pose is resolved. */
  updateWeaponModels(delta = 0){
    return this.equipmentService.updateWeaponModels(delta);
  }

  /**
   * Resolve bodybag.2da row for this creature (UTC BodyBag, else appearance.body_bag).
   */
  getBodyBagRowId(): number {
    return this.deathCorpseService.getBodyBagRowId();
  }

  getBodyBagRule(): SWBodyBag | undefined {
    return this.deathCorpseService.getBodyBagRule();
  }

  /**
   * Placeable appearance id for the bag — GetBodyBagAppearance.
   * bodybag.Appearance → else appearance.Body_Bag row's appearance → else 3.
   */
  getBodyBagAppearance(): number {
    return this.deathCorpseService.getBodyBagAppearance();
  }

  getBodyBagPlaceable(): Placeable | undefined {
    return this.deathCorpseService.getBodyBagPlaceable();
  }

  /** Target for ActionUseObject when looting a dead creature (bag if present, else corpse). */
  getLootUseTarget(): Placeable | Creature {
    return this.deathCorpseService.getLootUseTarget();
  }

  hasLootableContents(): boolean {
    return this.deathCorpseService.hasLootableContents();
  }

  /** Whether the player can loot this corpse (hostile, selectable dead, or linked bag). */
  canLootAsCorpse(from?: GameObject): boolean {
    return this.deathCorpseService.canLootAsCorpse(from);
  }

  /**
   * Whether this creature should drop a body bag (loot / corpse / gold).
   */
  shouldSpawnBodyBag(): boolean {
    return this.deathCorpseService.shouldSpawnBodyBag();
  }

  /**
   * Create a body-bag placeable, move droppable loot into it, and schedule
   * EventSpawnBodyBag (~500ms) to load its model.
   * : destroy event 0xb when destroyable + dead.
   */
  spawnBodyBag(): number {
    return this.deathCorpseService.spawnBodyBag();
  }

  /**
   * event 0xb body: SpawnBodyBag then KeepCorpse or fade-out visual.
   * Called when DestroyObjectDelay elapses (and as destroy backup).
   */
  onServerDestroyEvent(){
    return this.deathCorpseService.onServerDestroyEvent();
  }

  /**
   * Convert to a runtime-only KeepCorpse shell (client corpse cache entry).
   * Stays in area.creatures for updates/selection but is excluded from save.
   */
  enterRetainedCorpse(){
    return this.deathCorpseService.enterRetainedCorpse();
  }

  /** Corpse-cache overflow: reveal bag and fade this shell out. */
  beginRetainedCorpseFadeOut(fadeSec: number = 1.0){
    return this.deathCorpseService.beginRetainedCorpseFadeOut(fadeSec);
  }

  /** Total fade length when eviction starts (for opacity). */
  retainedCorpseFadeTotal: number = 0;

  updateRetainedCorpse(delta: number = 0){
    return this.deathCorpseService.updateRetainedCorpse(delta);
  }

  /**
   * Undo KeepCorpse / pending destroy without disposing the creature.
   * Used by EffectResurrection when a party member was wrongly bagged, or after
   * any TempDeath revive that must restore normal AI updates.
   */
  clearCorpseDestroyState(){
    return this.deathCorpseService.clearCorpseDestroyState();
  }

  /**
   * Dispose a KeepCorpse shell. Does not destroy the linked body bag.
   */
  disposeRetainedCorpse(revealBag: boolean = false){
    return this.deathCorpseService.disposeRetainedCorpse(revealBag);
  }

  override onDialog(oSpeaker: GameObject, listenPatternNumber = -1, conversation: DLGObject = undefined, matchedSubstrings: string[] = []){
    // EventHandler case 7: store captures on the object, then run OnDialogue.
    this.setMatchedSubstrings(matchedSubstrings || []);

    let nwscript = this.scripts[ScriptHook.CreatureOnDialog];
    // : empty or "default" OnDialogue resref → k_hen_dialogue01 (written back into the slot).
    const resRef = nwscript?.name || '';
    if(!nwscript || !resRef || resRef.toLowerCase() === 'default'){
      const fallback = GameState.NWScript.Load('k_hen_dialogue01');
      if(fallback){
        this.scripts[ScriptHook.CreatureOnDialog] = fallback;
        fallback.bindOwner(this, ScriptHook.CreatureOnDialog);
        nwscript = fallback;
      }
    }
    if(!nwscript){ return false; }
    nwscript.listenPatternNumber = listenPatternNumber;
    nwscript.listenPatternSpeaker = oSpeaker;
    nwscript.conversation = conversation;
    nwscript.run(this, 0);
    return true;
  }

  /**
   * ScriptEndDialogu — k_def_endconv → k_ai_master case 1011
   * (re-enable commandable, DCR if enemy seen, else post-dialog walk).
   */
  override onEndDialog(){
    const nwscript = this.scripts[ScriptHook.CreatureOnEndDialog];
    if(!nwscript){ return; }
    // Wrappers hardcode KOTOR_DEFAULT_EVENT_ON_GLOBAL_DIALOGUE_END (1011).
    // Party templates leave this slot empty.
    const script_num = (GameState.PartyManager.party.indexOf(this) > -1) ? 2011 : 1011;
    nwscript.run(this, script_num);
  }

  override onAttacked(attackType: CombatActionType){
    // EventHandler physical-attacked (0xf) — runs for hit and miss.
    // BroadcastCombatStateToParty on attacker + target refreshes 8000ms combat + party ExcitedDuration.
    const attacker = this.combatData.lastAttacker;
    // assign hostile actor(attacker) before ScriptAttacked
    if(isGameObject(attacker)){
      this.assignHostileActor(attacker);
    }
    if(isCreature(attacker)){
      attacker.broadcastCombatStateToParty(this);
      attacker.removeCombatInvisibilityEffects();
    }
    this.broadcastCombatStateToParty(
      isGameObject(attacker)
        ? attacker
        : undefined
    );

    const nwscript = this.scripts[ScriptHook.CreatureOnAttacked];
    if(!nwscript){ return; }
    const script_num = (GameState.PartyManager.party.indexOf(this) > -1) ? 2005 : 1005;
    nwscript.run(this, script_num);
  }

  override onDamaged(){
    if(this.isDead())
      return true;

    // effect apply — creatures do not BroadcastCombatStateToParty
    // (engagement is OnAttacked / harmful OnSpellCastAt). Door/placeable path is on
    // GameObject.onDamaged. Refresh ExcitedDuration Damage row when HP is lost.
    this.setExcitedState(ExcitedDurationRow.Damage);

    const nwscript = this.scripts[ScriptHook.CreatureOnDamaged];
    if(!nwscript){ return true; }
    const script_num = (GameState.PartyManager.party.indexOf(this) > -1) ? 2006 : 1006;
    nwscript.run(this, script_num);
  }

  override onBlocked(){
    if(this == GameState.PartyManager.getCurrentPlayer())
      return;

    const state = ensureMovementState(this);
    const blocker = state.blockingObject;
    // buildPathAroundCreature:
    // GetReputation(blocker, mover) < 11 → pathfail with foundEnemy=blocker;
    // if mover commandable → return without hex;
    // both arcs fail → pathfail with foundEnemy=INVALID;
    // splice ok + hostile on arc → pathfail with that enemy.
    if(isCreature(blocker)){
      const runPathfail = () => {
        GameState.NWScript.Run('k_def_pathfail01', this);
      };

      // walk step distance test → nudgeFriendlyCreatures before hex/pathfail
      const bumpTo = this.position.clone();
      const lastVel = state.actualVelocity;
      if(lastVel?.lengthSq?.() > 1e-8){
        bumpTo.addScaledVector(lastVel.clone().normalize(), 1);
      }else if(this.forceVector?.lengthSq?.() > 1e-8){
        bumpTo.addScaledVector(this.forceVector.clone().normalize(), 1);
      }else{
        const facing = this.facing ?? this.rotation?.z ?? 0;
        bumpTo.x += Math.cos(facing);
        bumpTo.y += Math.sin(facing);
      }
      if(nudgeFriendlyCreatures(this, blocker, bumpTo, this.position)){
        state.blockingObject = undefined;
        this.collisionTimer = 0;
        return;
      }

      // : reputation of blocker toward this mover (GetReputation < 11)
      const hostileBlocker = (blocker.getReputation?.(this) ?? 100) < 11;
      if(hostileBlocker){
        this.foundEnemyCreature = blocker;
        runPathfail();
        // : commandable mover skips hex after hostile pathfail
        if(this.getCommadable?.()){
          return;
        }
      }else{
        this.foundEnemyCreature = undefined;
      }

      const result = buildPathAroundCreature(this, blocker);
      if(result.spliced){
        if(result.foundEnemyOnPath && (result.foundEnemyOnPath.getReputation?.(this) ?? 100) < 11){
          this.foundEnemyCreature = result.foundEnemyOnPath;
          runPathfail();
        }
        return;
      }

      // Both CW/CCW failed — clears foundEnemy then pathfail
      this.foundEnemyCreature = undefined;
      runPathfail();
      return;
    }

    this.foundEnemyCreature = undefined;
    const nwscript = this.scripts[ScriptHook.CreatureOnBlocked];
    if(!nwscript){ return; }
    const script_num = (GameState.PartyManager.party.indexOf(this) > -1) ? 2009 : 1009;
    nwscript.run(this, script_num);
  }

  use(object: GameObject){
    const bag = this.getBodyBagPlaceable();
    if(bag && !bag.destroyed){
      bag.use(object);
      return;
    }
    if(this.hasInventory() || this.hasLootableContents()){
      GameState.MenuManager.MenuContainer.AttachContainer(this);
      GameState.MenuManager.MenuContainer.open();
    }
  }

  hasInventory(){
    return this.inventory.length;
  }

  retrieveInventory(){
    while(this.inventory.length){
      GameState.InventoryManager.addItem(this.inventory.pop())
    }
  }

  isUseable(){
    if(this.isRetainedCorpse){
      // Selectable shell that routes loot to the linked bag
      return !!this.getBodyBagPlaceable() || this.isDeadSelectable;
    }
    if(!this.isDead()) return true;
    if(this.getBodyBagPlaceable()) return true;
    return this.isDeadSelectable;
  }

  isDead(){
    return this.getHP() <= 0 && !this.min1HP;
  }

  /**
   * IsInjured — skip when appearance.disableinjuredanim.
   */
  isInjured(){
    if(this.getAppearance()?.disableinjuredanim) return false;
    return super.isInjured();
  }

  isDiseased(){
    return this.hasEffect(GameEffectType.EffectDisease);
  }

  isPoisoned(){
    return this.hasEffect(GameEffectType.EffectPoison);
  }

  hasSetState(state: number){
    return !!(this.effects || []).find(
      e => e?.applied && e.type === GameEffectType.EffectSetState && e.getInt(0) === state
    );
  }

  isConfused(){
    return this.hasSetState(1);
  }

  isFrightened(){
    return this.hasSetState(2);
  }

  isDroidStunned(){
    return this.hasSetState(3);
  }

  isStunned(){
    return this.hasSetState(4);
  }

  isParalyzed(){
    return this.hasSetState(5);
  }

  isSleeping(){
    return this.hasSetState(6);
  }

  isChoking(){
    return this.hasSetState(7);
  }

  isHorrified(){
    return this.hasSetState(8);
  }

  isForcePushed(){
    return this.hasSetState(9);
  }

  isWhirlwind(){
    return this.hasSetState(10);
  }

  /** K2 EffectCrush — SetState 15 */
  isCrushed(){
    return this.hasSetState(15);
  }

  /** K2 companion SetState from Knockdown — SetState 14 */
  isKnockdownHeld(){
    return this.hasSetState(14);
  }

  /** K2 EffectDroidConfused — SetState 16 (not IsDebilitated in) */
  isDroidConfused(){
    return this.hasSetState(16);
  }

  /** K2 SetState 0x11 */
  isHeld(){
    return this.hasSetState(17);
  }

  /** K2 EffectMindTrick — SetState 18 */
  isMindTricked(){
    return this.hasSetState(18);
  }

  /** K2 EffectDroidScramble — SetState 19 */
  isDroidScrambled(){
    return this.hasSetState(19);
  }

  isKnockedDown(){
    return !!(this.effects || []).find(
      e => e?.type === GameEffectType.EffectKnockdown && e.applied
    ) || this.isKnockdownHeld();
  }

  /** EffectEntangle — aborts CastSpell mid-cast. */
  isEntangled(){
    return this.hasEffect(GameEffectType.EffectEntangle);
  }

  isDebilitated(){
    return this.combatService.isDebilitated();
  }

  setCommadable(bCommandable = 0){
    this.isCommandable = bCommandable ? true : false;
  }

  getCommadable(){
    return this.isCommandable;
  }

  getItemInSlot(slot = 0){
    return this.equipmentService.getItemInSlot(slot);
  }

  getInventory(): Item[] {
    if(this.isPartyMember()){
      return GameState.InventoryManager.getInventory();
    }
    return this.inventory;
  }

  getXOrientation(){
    return this.xOrientation;
  }

  getYOrientation(){
    return this.yOrientation;
  }

  getZOrientation(){
    return this.zOrientation;
  }

  getRotation(){
    if(this.model){
      return Math.floor(this.rotation.z * 180) + 180
    }
    return 0;
  }

  getRace(){
    return this.statsService.getRace();
  }

  getSubRace(){
    return this.statsService.getSubRace();
  }

  getGender(){
    return this.statsService.getGender();
  }

  getXP(){
    return this.statsService.getXP();
  }

  setXP(value = 0){
    return this.statsService.setXP(value);
  }

  addXP(value = 0, xpType: ExperienceType = ExperienceType.PLOT){
    return this.statsService.addXP(value, xpType);
  }

  getGoodEvil(){
    return this.goodEvil;
  }

  /**
   * Sets the alignment of the creature.
   * @param value - The alignment to set the creature to.
   */
  setGoodEvil(value: number = 0){
    const oldValue = this.goodEvil;
    this.goodEvil = value;
    if(this.goodEvil < 0) this.goodEvil = 0;
    if(this.goodEvil > 100) this.goodEvil = 100;
    if(this.isPartyMember()){
      GameState.UINotificationManager.EnableUINotificationIconType(value >= oldValue ? UIIconTimerType.LIGHT_SHIFT : UIIconTimerType.DARK_SHIFT);
    }
    this.refreshAppearanceAlignment(oldValue);
    this.fanoutAlignmentInfluenceIfPC();
  }

  /**
   * Set live goodEvil without light/dark UI icons (HandleAlignmentInfluence).
   */
  setGoodEvilQuiet(value: number = 0){
    const oldValue = this.goodEvil;
    this.goodEvil = value;
    if(this.goodEvil < 0) this.goodEvil = 0;
    if(this.goodEvil > 100) this.goodEvil = 100;
    this.refreshAppearanceAlignment(oldValue);
  }

  /** Prestige tier from class level (HandleAlignmentInfluence). */
  static #prestigeTierFromLevel(level: number): number {
    const lv = level | 0;
    if(lv <= 0) return 0;
    if(lv < 7) return 1;
    if(lv < 11) return 2;
    if(lv < 15) return 3;
    if(lv < 19) return 4;
    return 5;
  }

  /** PC prestige multiplier (1 + 0.2 * tier) + CHA*3 bonus. */
  static #getPcPrestigeFactor(pc: Creature | undefined): { factor: number; bonus: number } {
    if(!pc){
      return { factor: 1.0, bonus: 0 };
    }
    const FEAT_PRESTIGE_A = 0x95;
    const FEAT_PRESTIGE_B = 0xa7;
    const CLASS_PRESTIGE_A = 0x0c;
    const CLASS_PRESTIGE_B = 0x0f;

    const cha = typeof pc.getCHA === 'function' ? (pc.getCHA() | 0) : (pc.cha | 0);
    const bonus = cha * 3;
    let tier = 0;
    const goodEvil = pc.getGoodEvil?.() ?? pc.goodEvil | 0;

    if(pc.getHasFeat?.(FEAT_PRESTIGE_A)){
      if(goodEvil < 0x29){
        for(let i = 0; i < (pc.classes?.length || 0) && i < 2; i++){
          const cls = pc.classes[i];
          if((cls?.id | 0) === CLASS_PRESTIGE_B){
            tier = Creature.#prestigeTierFromLevel(cls.level | 0);
            break;
          }
        }
      }
    }else if(pc.getHasFeat?.(FEAT_PRESTIGE_B)){
      if(goodEvil > 0x3b){
        for(let i = 0; i < (pc.classes?.length || 0) && i < 2; i++){
          const cls = pc.classes[i];
          if((cls?.id | 0) === CLASS_PRESTIGE_A){
            tier = Creature.#prestigeTierFromLevel(cls.level | 0);
            break;
          }
        }
      }
    }

    return { factor: 1.0 + tier * 0.2, bonus };
  }

  /**
   * Handle the alignment influence for the creature.
   * Kreia: influence.2da (SWRuleSet) + PC align + prestige math → goodEvil.
   * Other CNPCs: goodEvil = baseGoodEvil.
   */
  handleAlignmentInfluence(){
    if(GameState.GameKey !== GameEngineType.TSL){
      return;
    }

    const clampAlign = (v: number) => {
      if(v < 0) return 0;
      if(v > 100) return 100;
      return v | 0;
    };

    const tag = (this.getTag?.() || this.tag || '').toLowerCase();
    if(tag !== 'kreia'){
      const base = typeof this.baseGoodEvil === 'number'
        ? this.baseGoodEvil
        : (this.goodEvil | 0);
      this.setGoodEvilQuiet(clampAlign(base));
      return;
    }

    const row = GameState.SWRuleSet?.GetInfluenceByTag?.(tag);
    if(!row){
      return;
    }

    let npcId = -1;
    if(typeof this.npcId === 'number' && this.npcId >= 0){
      npcId = this.npcId | 0;
    }else{
      npcId = GameState.PartyManager.npcIdFromTag(tag);
    }
    if(npcId < 0){
      npcId = GameState.PartyManager.npcIdFromTag('kreia');
    }

    let influence = GameState.PartyManager.getInfluence(npcId);
    if(influence === -1){
      influence = clampAlign(row.baseInfluence);
      GameState.PartyManager.InfluenceMap.set(npcId, influence);
    }

    const pcAlign = GameState.GlobalVariableManager?.GetGlobalNumber?.('G_PC_Align_Val') ?? 50;
    const pc =
      GameState.PartyManager.Player ||
      GameState.PartyManager.getCurrentPlayer?.() ||
      GameState.PartyManager.party?.[0];
    const { factor, bonus } = Creature.#getPcPrestigeFactor(pc);

    const baseNpc = typeof this.baseGoodEvil === 'number'
      ? this.baseGoodEvil
      : (this.goodEvil | 0);

    let combined = (influence | 0) + (bonus | 0);
    if(combined > 100) combined = 100;
    if(combined < 0) combined = 0;

    const inflNorm = ((combined - 50) * factor) / 50.0;
    const pcNorm = ((pcAlign | 0) - 50) / 50.0;
    const product = pcNorm * inflNorm;

    let next: number;
    if(product >= 0){
      next = baseNpc + (100 - baseNpc) * product;
    }else{
      next = (product + 1.0) * baseNpc;
    }

    this.setGoodEvilQuiet(clampAlign(Math.round(next)));
  }

  /**
   * Adds to the alignment of the creature.
   * @param value - The amount to add to the alignment.
   */
  addGoodEvil(value: number = 0){
    const oldValue = this.goodEvil;
    this.goodEvil += value;
    if(this.goodEvil < 0) this.goodEvil = 0;
    if(this.goodEvil > 100) this.goodEvil = 100;
    if(this.isPartyMember()){
      GameState.UINotificationManager.EnableUINotificationIconType(value >= 0 ? UIIconTimerType.LIGHT_SHIFT : UIIconTimerType.DARK_SHIFT);
    }
    this.refreshAppearanceAlignment(oldValue);
    this.fanoutAlignmentInfluenceIfPC();
  }

  /**
   * Adjusts the alignment of the creature.
   * @param value - The amount to adjust the alignment by.
   * @param alignment - The alignment to adjust the creature's alignment to. 1 = NEUTRAL, 2 = LIGHT, 3 = DARK
   */
  adjustAlignment(value: number = 0, alignment: number = 0){
    value = Math.abs(value);
    const oldValue = this.goodEvil;
    let alignmentShifted = 0
    if(alignment == 1){
      /**
       * Shifted to DARK
       */
      if(this.goodEvil > 50){
        this.goodEvil -= value;
        if(this.goodEvil < 50){
          this.goodEvil = 50;
        }
        alignmentShifted = 3;
      }
      /**
       * Shifted to LIGHT
       */
      else{
        this.goodEvil += value;
        if(this.goodEvil > 50){
          this.goodEvil = 50;
        }
        alignmentShifted = 2;
      }
    }
    /**
     * Shift light
     */
    else if(alignment == 2){
      this.goodEvil += value;
      alignmentShifted = 2;
    }
    /**
     * Shift dark
     */
    else if(alignment == 3){
      this.goodEvil -= value;
      alignmentShifted = 3;
    }
    if(this.goodEvil < 0) this.goodEvil = 0;
    if(this.goodEvil > 100) this.goodEvil = 100;
    if(this.isPartyMember() && (alignmentShifted == 2 || alignmentShifted == 3)){
      GameState.UINotificationManager.EnableUINotificationIconType(alignmentShifted == 2 ? UIIconTimerType.LIGHT_SHIFT : UIIconTimerType.DARK_SHIFT);
    }
    this.refreshAppearanceAlignment(oldValue);
    this.fanoutAlignmentInfluenceIfPC();
  }

  /**
   * TSL: when the PC's alignment changes, refresh companion HandleAlignmentInfluence.
   */
  fanoutAlignmentInfluenceIfPC(){
    if(GameState.GameKey !== GameEngineType.TSL){
      return;
    }
    if(!(this.getIsPC?.() || this.isPC || this === GameState.PartyManager?.Player)){
      return;
    }
    GameState.PartyManager.fanoutAlignmentInfluenceFromPC?.();
  }

  /**
   * SetAppearanceAlignment — reload body/head when GoodEvil crosses
   * headtex bands or the TEX*Evil threshold (GoodEvil < 0x29).
   */
  refreshAppearanceAlignment(oldGoodEvil: number){
    if(!this.isReady || !this.model) return;
    const headBand = (v: number) => Math.min(4, Math.floor(Math.min(v | 0, 50) / 10));
    const bodyEvil = (v: number) => (v | 0) < APPEARANCE_EVIL_BODY_ALIGN_MAX;
    if(
      headBand(oldGoodEvil) !== headBand(this.goodEvil) ||
      bodyEvil(oldGoodEvil) !== bodyEvil(this.goodEvil)
    ){
      void this.loadModel();
    }
  }

  getSubraceIndex(){
    return this.statsService.getSubraceIndex();
  }

  setHP(nAmount = 0){
    return this.statsService.setHP(nAmount);
  }

  addHP(nAmount = 0, ignoreMaxHitPoints = false){
    return this.statsService.addHP(nAmount, ignoreMaxHitPoints);
  }

  subtractHP(nAmount = 0){
    return this.statsService.subtractHP(nAmount);
  }

  getHP(){
    return this.statsService.getHP();
  }

  getMaxHP(){
    return this.statsService.getMaxHP();
  }

  setMaxHP(nAmount = 0){
    return this.statsService.setMaxHP(nAmount);
  }

  setMinOneHP(bMinOneHP = false){
    return this.statsService.setMinOneHP(bMinOneHP);
  }

  /**
   * GetCurrentForcePoints: temporary + current.
   */
  getFP(){
    return this.statsService.getFP();
  }

  getMaxFP(){
    return this.statsService.getMaxFP();
  }

  setFP(nAmount = 0){
    return this.statsService.setFP(nAmount);
  }

  addFP(nAmount = 0, ignoreMaxForcePoints = false){
    return this.statsService.addFP(nAmount, ignoreMaxForcePoints);
  }

  /**
   * UnReadySpell spend order: temporary FP first, then current.
   */
  subtractFP(nAmount = 0){
    return this.statsService.subtractFP(nAmount);
  }

  /**
   * GetAdjustedForcePoints — forceadjust.2da by alignment band.
   */
  getAdjustedForcePointCost(spell: { forcepoints?: number; goodEvil?: string }): number {
    return this.statsService.getAdjustedForcePointCost(spell);
  }

  /**
   * FP available for Force-menu enable checks.
   * GetSelfForcePowers / GetHostileForcePowers: body_fuel → use HP instead of FP.
   */
  getForceMenuResource(): number {
    return this.statsService.getForceMenuResource();
  }

  /**
   * UnReadySpell — drain adjusted FP
   * (clamp at 0). Always succeeds when the spell row is valid; menu enable is
   * the soft FP/HP gate (GetSelfForcePowers / GetHostileForcePowers).
   */
  unreadySpell(spell: { forcepoints?: number; goodEvil?: string } | null | undefined): boolean {
    return this.statsService.unreadySpell(spell);
  }

  /**
   * ForceMenuAction class-slot pick — first Jedi class (3/4/5) in the
   * first two class slots; otherwise 0.
   */
  getForceSpellClassIndex(): number {
    return this.statsService.getForceSpellClassIndex();
  }

  getCameraHeight(){
    return this.statsService.getCameraHeight();
  }

  /**
   * NWScript GetAC / simple AC — GetArmorClass.
   */
  getAC(){
    return this.statsService.getAC();
  }

  /**
   * Whether this creature currently SEES `object` (perception bit 0x01).
   * GetVisibleListElement bit_flags & 1 — match by object ref or saved ObjectId.
   */
  hasSeenObject(object: GameObject): boolean {
    return this.creaturePerceptionService.hasSeenObject(object);
  }

  /**
   * GetArmorClassVersus.
   * @param attacker - creature rolling the attack (for invis / SEEN gates)
   * @param touch - when true, omit armor / shield / natural equipment AC and
   * armor/shield effect AC (types 2–3); dodge + deflection still apply
   */
  getArmorClassVersus(attacker?: Creature, touch = false): number {
    return this.statsService.getArmorClassVersus(attacker, touch);
  }

  /**
   * ExecuteCommandDoTouchAttack.
   * @returns 0 miss, 1 hit, 2 critical
   */
  doTouchAttack(target: GameObject, ranged = false): number {
    return this.statsService.doTouchAttack(target, ranged);
  }

  getSTR(calculateBonuses = true){
    return this.statsService.getSTR(calculateBonuses);
  }

  getDEX(calculateBonuses = true){
    return this.statsService.getDEX(calculateBonuses);
  }

  getCON(calculateBonuses = true){
    return this.statsService.getCON(calculateBonuses);
  }

  getCHA(calculateBonuses = true){
    return this.statsService.getCHA(calculateBonuses);
  }

  getWIS(calculateBonuses = true){
    return this.statsService.getWIS(calculateBonuses);
  }

  /**
   * Get the fortitude save — GetFortSavingThrow.
   * CON + FortSaveThrow + class/conditioning + effects.
   */
  getFortitudeSave(){
    return this.statsService.getFortitudeSave();
  }

  /**
   * Get the reflex save — GetReflexSavingThrow.
   */
  getReflexSave(){
    return this.statsService.getReflexSave();
  }

  /**
   * Get the will save — GetWillSavingThrow.
   */
  getWillSave(){
    return this.statsService.getWillSave();
  }

  /**
   * Fortitude save — SavingThrowRoll type 1.
   * @returns 0 fail, 1 success, 2 immune
   */
  fortitudeSave(nDC = 0, nSaveType = 0, oVersus: GameObject = undefined){
    return this.statsService.fortitudeSave(nDC, nSaveType, oVersus);
  }

  /**
   * Reflex save — SavingThrowRoll type 2.
   * @returns 0 fail, 1 success, 2 immune
   */
  reflexSave(nDC = 0, nSaveType = 0, oVersus: GameObject = undefined){
    return this.statsService.reflexSave(nDC, nSaveType, oVersus);
  }

  /**
   * Will save — SavingThrowRoll type 3.
   * @returns 0 fail, 1 success, 2 immune
   */
  willSave(nDC = 0, nSaveType = 0, oVersus: GameObject = undefined){
    return this.statsService.willSave(nDC, nSaveType, oVersus);
  }





  getINT(calculateBonuses = true){
    return this.statsService.getINT(calculateBonuses);
  }

  /**
   * CalculateSpellSaveDC
   * 5 + total level + WIS mod + CHA mod + Force Focus (+1/+2/+4).
   */
  getSpellSaveDC(){
    return this.statsService.getSpellSaveDC();
  }

  getSpellCasterLevel(){
    return this.statsService.getSpellCasterLevel();
  }

  getIsPC(){
    return this.statsService.getIsPC();
  }

  getPortraitId(){
    return this.statsService.getPortraitId();
  }

  getPortraitResRef(){
    return this.statsService.getPortraitResRef();
  }

  getWalkRateId(){
    return this.statsService.getWalkRateId();
  }

  /** NWScript GetMovementRate — WalkRate id (0 if invalid). */
  getMovementRate(){
    return this.statsService.getMovementRate();
  }

  getName(){
    return this.statsService.getName();
  }

  getAppearance(): SWCreatureAppearance | undefined {
    return this.statsService.getAppearance();
  }

  isWalking(){
    if(this.playerControl?.active){
      return !!this.playerControl.walking;
    }
    if(this.action && this.action.type == ActionType.ActionMoveToPoint){
      return !this.action.getParameter(5) ? true : false;
    }
    if(this.action && this.action.type == ActionType.ActionFollowLeader){
      return !!this.walk;
    }
    if(this.action && this.action.type == ActionType.ActionForceFollowObject){
      return !!this.walk;
    }
    if(this.action && this.action.type == ActionType.ActionDrive){
      const flags = this.action.getParameter<number>(4) ?? 0;
      return (flags & 0x03) !== 0x03;
    }
    return this.walk;
  }

  private resolveCreatureSpeed(){
    const speeds = GameState.SWRuleSet?.creatureSpeeds;
    const table = speeds?.length
      ? {
          rows: Object.fromEntries(
            speeds.map((s, i) => [i, {
              walkrate: s.walkrate,
              runrate: s.runrate,
              '2daname': s.twoDAName,
              label: s.label,
            }])
          ),
        }
      : GameState.TwoDAManager.datatables.get('creaturespeed');
    const token = this.creatureAppearance?.moverate;
    return getCreatureSpeedRates(this.getWalkRateId(), token, table as any);
  }

  getRunSpeed(){
    return this.resolveCreatureSpeed().run;
  }

  getWalkSpeed(){
    return this.resolveCreatureSpeed().walk;
  }

  /**
   * Clear locomotion sticky state (walk / scale / override / tickCreatureWalk ramp).
   * Called from Action.dispose and clearAllActions.
   * @param resetPlayerControl When true (action dispose), also zero cam-relative axes/velocity.
   */
  clearLocomotionState(resetPlayerControl: boolean = false){
    this.force = 0;
    this.speed = 0;
    this.walk = false;
    this.locomotionScale = 1;
    this.moveDirOverride = undefined;
    resetWalkSpeedFactor(this);
    // creature walk update end-of-path: SetAnimation(10000 / PAUSE).
    // Walk/run clips are forced looping, so they never demote on their own.
    this.clearLocomotionAnimation();
    if(resetPlayerControl && this.playerControl){
      this.playerControl.active = false;
      this.playerControl.axisForward = 0;
      this.playerControl.axisRight = 0;
      this.playerControl.velX = 0;
      this.playerControl.velY = 0;
      this.playerControl.accelX = 0;
      this.playerControl.accelY = 0;
      this.playerControl.facingErrorDeg = 0;
      this.playerControl.lastAnimMoveSpeed = 0;
      this.playerControl.driveFlags = 0;
    }
  }

  /**
   * Drop sticky walk/run/back to idle. Combat / counterspell promote on next update.
   */
  clearLocomotionAnimation(){
    return this.animationService.clearLocomotionAnimation();
  }

  /**
   * Drive stick / approach loco is blocked only while a dialog-classified clip
   * owns the pose. Combat/move actions on the queue must still allow walk/run.
   */
  isDriveAnimationBlocked(): boolean {
    return this.animationService.isDriveAnimationBlocked();
  }

  /**
   * Apply side effects from animations.2da flags when the current clip changes:
   * hideequippeditems, play-out-of-place (via server ID), attack payload retain.
   */
  syncAnimationFlagSideEffects(next: SWAnimation | undefined, serverId: number = 0, previous?: SWAnimation | undefined){
    return this.animationService.syncAnimationFlagSideEffects(next, serverId, previous);
  }

  setPlayOutOfPlaceActive(active: boolean){
    return this.animationService.setPlayOutOfPlaceActive(active);
  }

  /**
   * Hide hand weapon meshes while an animations.2da hideequippeditems clip plays.
   * Distinct from dialog UnequipItems.
   */
  hideEquippedItemsForAnimation(){
    return this.animationService.hideEquippedItemsForAnimation();
  }

  /**
   * Restore hand weapon meshes after a hideequippeditems clip ends.
   */
  showEquippedItemsAfterAnimation(){
    return this.animationService.showEquippedItemsAfterAnimation();
  }

  /**
   * True when the defender's current clip is parry-classified (animations.2da).
   */
  isCurrentAnimationParry(): boolean {
    return this.animationService.isCurrentAnimationParry();
  }

  /**
   * Explicit ground/room attachment refresh (spawn / model-load settle).
   * Not a locomotion solver — uses findWalkableAttachmentAt + apply.
   */
  settleWalkableAttachment(): void {
    const hit = findWalkableAttachmentAt(this.area, this.position, this.room);
    applyWalkableAttachment(this, hit);
  }

  /** @deprecated No locomotion solver — use settleWalkableAttachment / teleport. */
  updateCollision(_delta: number = 0){
    this.settleWalkableAttachment();
  }

  /**
   * Control — RK4 accel/drag + turn + DriveAnimationUpdate gate.
   */
  applyPlayerCamRelativeControl(delta: number = 0){
    const ctrl = this.playerControl;
    if(!ctrl) return;
    const appearance = this.getAppearance();
    const walking = !!ctrl.walking;
    // GetMaxSpeed / GetDriveAcceleration: activity_ bit 0 = stealth, not detect
    const limits = resolvePlayerDriveLimits(
      !!this.stealthMode,
      appearance?.driveaccl ?? 0,
      appearance?.drivemaxspeed ?? 0,
      appearance?.driveanimwalk ?? 0
    );
    const driveAccl = limits.driveAccl;
    const driveMax = coalesceDriveMaxSpeed(appearance?.drivemaxspeed ?? 0);
    const vmax = limits.maxSpeed * (this.movementSpeed > 0 ? this.movementSpeed : 1);

    // cameraRelativeDesired applies walk ×0.5 on the stick vector only
    const desired = cameraRelativeDesired(
      ctrl.axisForward,
      ctrl.axisRight,
      FollowerCamera.facing,
      walking
    );
    playerKillReleasedAxisVelocity(
      ctrl,
      ctrl.axisForward,
      ctrl.axisRight,
      FollowerCamera.facing
    );

    const stickZero =
      Math.abs(ctrl.axisForward) < 1e-4 && Math.abs(ctrl.axisRight) < 1e-4;
    const prevAnimSpeed = ctrl.lastAnimMoveSpeed;

    const step = playerIntegrateRk4(ctrl, desired.x, desired.y, driveAccl, vmax, delta);
    this.speed = step.speed;
    this.force = step.speed > 1e-4 ? 1 : 0;

    // SetSWAnimationSpeed(mag, 0): total |v|; 0 when |v| <= 1
    let animMoveSpeed = playerSetSWAnimationSpeedMag(step.speed);
    // DriveAnimationUpdate: stealth clamps to drive_anim_walk before gate
    if(this.stealthMode && animMoveSpeed > 0){
      const walkCap = coalesceDriveAnimWalk(appearance?.driveanimwalk ?? 0);
      if(animMoveSpeed > walkCap) animMoveSpeed = walkCap;
    }

    // : turn only while stick non-zero, toward stick world desired (not velocity).
    // Full-release coast freezes facing.
    if(!stickZero && step.speed > 1e-4){
      const desiredFacing = playerDesiredFacingRad(desired.x, desired.y);
      let facingError = ((desiredFacing - this.rotation.z) * 180) / Math.PI;
      while(facingError > 180) facingError -= 360;
      while(facingError < -180) facingError += 360;
      ctrl.facingErrorDeg = facingError;
      if(playerShouldApplyTurn(facingError, prevAnimSpeed)){
        const minTurn = FollowerCamera.minTurnRateDeg;
        const maxTurn = FollowerCamera.maxTurnRateDeg;
        const nextFacing = playerApplyTurn(
          this.rotation.z,
          desiredFacing,
          step.speed,
          vmax,
          minTurn,
          maxTurn,
          delta
        );
        // SetOrientation applies the rate-limited yaw immediately.
        // Do not route through facingAnim (TURN_SPEED_SLOW) — that overrides Min/MaxTurnRate.
        this.setFacing(nextFacing, true);
      }
    }else if(
      stickZero &&
      step.speed <= 1e-4 &&
      (GameState.clientCameraMode | 0) === ClientCameraMode.COMBAT
    ){
      // Control camera_mode 6 idle face toward last hostile target @ 900°/s
      const target = FollowerCamera.getCombatLookTarget(this);
      if(
        target &&
        target !== this &&
        !target.destroyed &&
        this.getReputation(target) <= 10
      ){
        const dx = target.position.x - this.position.x;
        const dy = target.position.y - this.position.y;
        if(dx * dx + dy * dy > 1e-8){
          const targetYaw = Math.atan2(dy, dx) - Math.PI / 2;
          this.setFacing(
            playerCombatFaceStep(this.rotation.z, targetYaw, delta),
            true
          );
        }
      }
    }

    // : pos += normalize(orientation) * |RK4 delta| (facing-aligned; no slide).
    const stepMag = Math.hypot(step.dx, step.dy);
    const aligned = playerStepAlongFacing(stepMag, this.rotation.z);
    this.forceVector.set(aligned.dx, aligned.dy, 0);

    // DriveAnimationUpdate: run when speed > 0.6*DriveMaxSpeed, else
    // walk while SetSWAnimationSpeed mag > 0. On key release, coasts:
    // run → walk (below 0.6*Vmax) → idle (|v|<=1) while RK4 still slides to 0.25.
    // Only change the base clip when the state changes — restarting walk every
    // frame (setAnimationState clears started) is not.
    if(animMoveSpeed > 0){
      let nextAnim: ModuleCreatureAnimState;
      if(isDriveAnimRunning(animMoveSpeed, driveMax) && !walking && !this.stealthMode){
        nextAnim = ModuleCreatureAnimState.RUNNING;
      }else if(ctrl.axisForward < -0.2){
        nextAnim = ModuleCreatureAnimState.WALKING_BACK;
      }else{
        nextAnim = ModuleCreatureAnimState.WALKING;
      }
      if(this.animationState.index !== nextAnim){
        this.setAnimationState(nextAnim);
      }
      const clip = this.animationState.animation;
      const useRunDist = isRunningAnimation(clip) ||
        (!isWalkingAnimation(clip) && nextAnim === ModuleCreatureAnimState.RUNNING);
      const animDist = useRunDist
        ? coalesceDriveAnimRun(appearance.driveanimrun)
        : coalesceDriveAnimWalk(appearance.driveanimwalk);
      this.animSpeed = Math.max(
        0.1,
        driveAnimPlaybackRate(
          animMoveSpeed,
          animDist,
          this.getAnimationLength(nextAnim)
        )
      );
    }else{
      ctrl.facingErrorDeg = 0;
      if(
        this.animationState.index == ModuleCreatureAnimState.RUNNING ||
        this.animationState.index == ModuleCreatureAnimState.WALKING ||
        this.animationState.index == ModuleCreatureAnimState.WALKING_BACK
      ){
        if(this.combatMode === CombatMode.COUNTERSPELL){
          this.setAnimationState(ModuleCreatureAnimState.CASTOUT1_LP);
        }else{
          this.setAnimationState(
            this.combatData.combatState ? ModuleCreatureAnimState.READY : ModuleCreatureAnimState.PAUSE
          );
        }
      }
      this.animSpeed = 1;
    }

    // SetSWAnimationSpeed — next frame's turn gate reads this 
    ctrl.lastAnimMoveSpeed = animMoveSpeed;

    // Consume one-shot axes each frame (keyboard processors re-assert while held)
    if(!ctrl.active){
      ctrl.axisForward = 0;
      ctrl.axisRight = 0;
    }
  }

  /**
   * Path/Drive animation pacing uses appearance walkdist/rundist and the
   * actual world speed produced by creature walk update/creature drive update.
   * Prefer animations.2da walking/running flags on the current clip when set.
   */
  private updateServerLocomotionAnimationRate(){
    if(!(this.speed > 0)){
      this.animSpeed = 1;
      return;
    }
    const anim = this.animationState.animation;
    const running = isRunningAnimation(anim)
      || (!isWalkingAnimation(anim) && this.animationState.index == ModuleCreatureAnimState.RUNNING);
    const animState = running
      ? ModuleCreatureAnimState.RUNNING
      : this.animationState.index == ModuleCreatureAnimState.WALKING_BACK
        ? ModuleCreatureAnimState.WALKING_BACK
        : ModuleCreatureAnimState.WALKING;
    const animDist = running
      ? (this.creatureAppearance?.rundist || 5.4)
      : (this.creatureAppearance?.walkdist || 1.7);
    this.animSpeed = Math.max(
      0.1,
      driveAnimPlaybackRate(this.speed, animDist, this.getAnimationLength(animState))
    );
  }

  getMovementSpeed(){
    const scale = (this.locomotionScale > 0 ? this.locomotionScale : 1) * this.movementSpeed;
    // LimitMovementSpeed caps to walk while slowed
    if(this.limitMovementSpeed){
      return this.getWalkSpeed() * scale;
    }
    return (this.isWalking() ? this.getWalkSpeed() : this.getRunSpeed()) * scale;
  }

  getHitDistance(){
    return this.statsService.getHitDistance();
  }

  /** appearance.hitradius — unengaged DesiredAttackRange. */
  getHitRadius(){
    return this.statsService.getHitRadius();
  }

  /** appearance.creperspace — creature spacing / engaged DesiredAttackRange. */
  getCreaturePersonalSpace(){
    return this.statsService.getCreaturePersonalSpace();
  }

  /** appearance.perspace — pathfind / walkmesh personal radius. */
  getPathPersonalSpace(){
    return this.statsService.getPathPersonalSpace();
  }

  getMainClass(){
    return this.statsService.getMainClass();
  }

  /**
   * @param subtractNegatives — GetLevel(stats, 1): subtract class.negativeLevels
   */
  getTotalClassLevel(subtractNegatives = false){
    return this.statsService.getTotalClassLevel(subtractNegatives);
  }

  /**
   * GetForceItemMask — bit flags from equipped baseitem types
   * used by CastSpell forbid/require mask checks.
   */
  getForceItemMask(): number {
    return this.statsService.getForceItemMask();
  }

  getClassLevel(nClass = 0, subtractNegatives = false){
    return this.statsService.getClassLevel(nClass, subtractNegatives);
  }

  //Does the creature have enough EXP to level up
  canLevelUp(){
    return this.statsService.canLevelUp();
  }

  //Get the effective creature level based on the creatures current amount of EXP
  getEffectiveLevel(){
    return this.statsService.getEffectiveLevel();
  }

  getBaseAttackBonus(){
    return this.statsService.getBaseAttackBonus();
  }

  getFeats(){
    return this.statsService.getFeats();
  }

  getFeat(id = 0){
    return this.statsService.getFeat(id);
  }

  addFeat(feat: number|TalentFeat = 0){
    return this.statsService.addFeat(feat);
  }

  getHasFeat(id: number = 0){
    return this.statsService.getHasFeat(id);
  }

  /**
   * Get the remaining uses for the given feat.
   * @param id The ID of the feat to get the remaining uses for.
   * @returns The remaining uses for the given feat.
   */
  getFeatRemainingUses(id: number = 0): number {
    return this.statsService.getFeatRemainingUses(id);
  }

  getHasSkill(value: number){
    return this.statsService.getHasSkill(value);
  }

  /**
   * Get whether the creature can use the given skill.
   * @param value The value of the skill to get whether the creature can use.
   * @returns True if the creature can use the given skill, false otherwise.
   */
  getCanUseSkill(value: number): boolean {
    return this.statsService.getCanUseSkill(value);
  }

  /**
   * Get the skill rank for the given skill.
   * @param value The value of the skill to get the skill rank for.
   * @param raw Whether to return the raw skill rank.
   * @returns The skill rank for the given skill.
   */
  getSkillRank(value: number, raw: boolean = false){
    return this.statsService.getSkillRank(value, raw);
  }


  /**
   * Get the skill feat bonus for the given skill.
   * @param skillId The ID of the skill to get the skill feat bonus for.
   * @returns The skill feat bonus for the given skill.
   */

  /**
   * Get whether the creature is stealthed or invisible.
   * @returns True if the creature is stealthed or invisible, false otherwise.
   */
  isStealthedOrInvisible(): boolean {
    return this.creaturePerceptionService.isStealthedOrInvisible();
  }

  /**
   * Get whether the target is effect-hidden from this observer.
   * @param target The target to get whether is effect-hidden from this observer.
   * @returns True if the target is effect-hidden from this observer, false otherwise.
   */
  isInvisibleToObserver(target: Creature): boolean {
    return this.creaturePerceptionService.isInvisibleToObserver(target);
  }

  /**
   * Spot check: observer Awareness vs target Hide while stealthed.
   * Returns true if this observer sees the target.
   */
  doSpotDetection(target: Creature): boolean {
    return this.creaturePerceptionService.doSpotDetection(target);
  }

  doListenDetection(target: Creature): boolean {
    return this.creaturePerceptionService.doListenDetection(target);
  }

  /**
   * True if this observer can detect a (possibly stealthed/invisible) target.
   */
  doStealthDetection(target: Creature): boolean {
    return this.creaturePerceptionService.doStealthDetection(target);
  }

  getSkillLevel(value: number){
    return this.statsService.getSkillLevel(value);
  }

  /**
   * IsStealthCapable — skill + stealth device on belt/hide.
   */
  isStealthCapable(): boolean {
    return this.combatService.isStealthCapable();
  }

  /**
   * SetStealthMode — toggle invisibility for party stealth.
   */
  setStealthMode(enabled: boolean){
    return this.combatService.setStealthMode(enabled);
  }

  /**
   * SetDetectMode — sets detect_mode; modified movement rate
   * only applies LimitMovementSpeed for stealth in KotOR (detect is a no-op there).
   */
  setDetectMode(enabled: boolean){
    return this.combatService.setDetectMode(enabled);
  }

  /**
   * SetActivity — set/clear activity bits with combat-mode exclusivity.
   */
  setActivity(bits: number, enable: boolean, _param3: number = 0){
    return this.combatService.setActivity(bits, enable, _param3);
  }

  /**
   * ActivityManager
   * param 1 clears skill/combat soft modes; param 4 clears stealth/dialog for CounterSpell.
   */
  activityManager(reason: number){
    return this.combatService.activityManager(reason);
  }

  /**
   * SetCombatMode — maps mode → activity bit; defers while round started.
   */
  setCombatMode(mode: number, forceImmediate: boolean = false){
    return this.combatService.setCombatMode(mode, forceImmediate);
  }

  /**
   * Match SetCombatMode activity transitions; CounterSpell uses the same bit mapping.
   */

  /**
   * CounterSpell combat-mode enter
   * ActivityManager(4) then set mode 4 / activity 0x800 (or clear prior mode bit).
   */
  enterCounterSpellMode(){
    return this.combatService.enterCounterSpellMode();
  }

  /** Clear combat mode (QueueAttackActions / leave CounterSpell). */
  clearCombatMode(){
    return this.combatService.clearCombatMode();
  }

  toggleStealthMode(){
    return this.combatService.toggleStealthMode();
  }

  getHasSpell(id = 0){
    return this.statsService.getHasSpell(id);
  }

  /**
   * Set the active Jedi Form spell id if the creature knows it.
   */
  setCurrentForm(formId = 0){
    return this.statsService.setCurrentForm(formId);
  }

  getCurrentForm(){
    return this.statsService.getCurrentForm();
  }

  /**
   * Whether the given form is active. Saber forms also require a lightsaber.
   */
  isFormActive(formId = 0){
    return this.statsService.isFormActive(formId);
  }

  getSpell(id = 0){
    return this.statsService.getSpell(id);
  }

  hasTalent(talent: TalentObject){
    return this.statsService.hasTalent(talent);
  }

  getTalents(){
    return this.statsService.getTalents();
  }

  getSpells(): TalentSpell[] {
    return this.statsService.getSpells();
  }

  getClassSpells(){
    return this.statsService.getClassSpells();
  }

  getRandomTalent(category = 0, category2 = 0){
    return this.statsService.getRandomTalent(category, category2);
  }

  getTalentBest(nCategory = 0, nCRMax = 0, nInclusion = 0, nExcludeType = -1, nExcludeId = -1){
    return this.statsService.getTalentBest(nCategory, nCRMax, nInclusion, nExcludeType, nExcludeId);
  }

  isSimpleCreature(){
    return this.statsService.isSimpleCreature();
  }

  setListening(bVal = false){
    this.isListening = bVal ? true : false;
  }

  /** NWScript GetPersonalSpace — appearance.perspace. */
  getPersonalSpace(){
    return this.creatureAppearance?.perspace ?? 1;
  }

  initEffects(): void {
    const eRacialType = new EffectRacialType();
    eRacialType.setSubType(GameEffectDurationType.INNATE);
    eRacialType.setSkipOnLoad(true);
    eRacialType.setInt(0, this.getRace());
    this.addEffect(eRacialType);
    
    this.initPerceptionList();
    this.settleWalkableAttachment();
    
    super.initEffects();
  }

  load(){
    this.seedResRefsFromTemplate();
    if(this.getTemplateResRef()){
      const merged = GameObjectLoadPipeline.mergeBlueprint(this.template, {
        refField: 'TemplateResRef',
        resourceKey: 'utc',
        runtimeResRef: this.getTemplateResRef(),
      });
      if(merged){
        this.initProperties();
        this.loadScripts();
      }else{
        console.error('Failed to load character template');
        if(this.template instanceof GFFObject){
          this.initProperties();
          this.loadScripts();
        }
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.initProperties();
      this.loadScripts();
    }
    if(this.initialized){
      GameState.FactionManager.AddCreatureToFaction(this);
    }
    
    if(!this.debugLabel){
      this.debugLabel = new TextSprite3D(`${this.getName()} | ${this.getTag()}`);
      this.debugLabel.setColor(this.helperColor);
      this.debugLabel.container.visible = EngineDebugController.GetDebugState(EngineDebugType.OBJECT_LABELS);
      this.container.add(this.debugLabel.container);
    }
  }

  loadScripts (){

    const scriptKeys = [
      ScriptHook.CreatureOnAttacked,
      ScriptHook.CreatureOnDamaged,
      ScriptHook.CreatureOnDeath,
      ScriptHook.CreatureOnDialog,
      ScriptHook.CreatureOnDisturbed,
      ScriptHook.CreatureOnEndDialog,
      ScriptHook.CreatureOnEndRound,
      ScriptHook.CreatureOnHeartbeat,
      ScriptHook.CreatureOnBlocked,
      ScriptHook.CreatureOnNotice,
      ScriptHook.CreatureOnRested,
      ScriptHook.CreatureOnSpawn,
      ScriptHook.CreatureOnSpellAt,
      ScriptHook.CreatureOnUserDefined,
    ];

    this.hydrateScriptResRefsFromTemplate(scriptKeys);
    this.bindScriptsFromResRefs(scriptKeys, 'Creature.loadScripts');

  }

  async loadModel(): Promise<OdysseyModel3D> {
    return await this.modelService.loadModel();
  }

  /**
   * Detach equipment / head meshes before disposing a body so recursive dispose
   * cannot destroy live Item.model instances that will be re-parented.
   */

  /** Enable rigid weapon/helm shadow casters on the creature rig. */

  async loadBody(generation?: number){
    return await this.modelService.loadBody(generation);
  }

  /**
   * Resolve the live heads.2da row for rendered creatures.
   * creature appearance selection uses appearance.2da NORMALHEAD
   * BACKUPHEAD for normal creatures; do not treat UTC Appearance_Head as a
   * global render override here or NPCs collapse onto a shared heads row.
   */
  resolveAppearanceHeadId(): number {
    return this.modelService.resolveAppearanceHeadId();
  }

  /**
   * death anim path — play appearance.DeathVFX (visualeffects.2da id).
   * EffectVisualEffect attaches to the model's impact node (DeathVFXNode default).
   */
  playAppearanceDeathVFX(){
    return this.modelService.playAppearanceDeathVFX();
  }

  async loadHead(generation?: number): Promise<OdysseyModel3D> {
    return await this.modelService.loadHead(generation);
  }

  /*getEquip_ItemList{
    if(this.template.RootNode.hasField('Equip_ItemList')){
      return this.template.getFieldByLabel('Equip_ItemList').getChildStructs()
    }
    return [];
  }*/

  async equipItem(slot = 0x1, item: Item){
    return await this.equipmentService.equipItem(slot, item);
  }

  /**
   * @param reloadModel When false, skip the body reload after clearing ARMOR/HEAD
   * (caller will reload). Default true for standalone unequip.
   */
  unequipSlot(slot = 0x1, reloadModel: boolean = true){
    return this.equipmentService.unequipSlot(slot, reloadModel);
  }

  UnequipItems(){
    return this.equipmentService.UnequipItems();
  }

  UnequipHeadItem(){
    return this.equipmentService.UnequipHeadItem();
  }

  /**
   * Dialog HideEquippedItems — stash slot refs then unequip so ShowEquippedItems
   * can restore at conversation end (SetDialogDelay).
   */
  hideEquippedItemsForDialog(unequipItems: boolean = false, unequipHead: boolean = false){
    return this.equipmentService.hideEquippedItemsForDialog(unequipItems, unequipHead);
  }

  /**
   * Dialog ShowEquippedItems — re-equip items stashed by hideEquippedItemsForDialog.
   */
  showEquippedItemsAfterDialog(){
    return this.equipmentService.showEquippedItemsAfterDialog();
  }

  GetItemInSlot(slot = 0){
    return this.equipmentService.GetItemInSlot(slot);
  }

  setAppearance(appearance: number){
    return this.modelService.setAppearance(appearance);
  }

  initProperties(){
    const needsRegister = !this.initialized;
    const runtime = getDefaultRuntimeContext();
    const rules = runtime.getSWRuleSet?.();
    try{
      this.classes = [];
      this.feats = [];
      this.skills = (rules?.skills ?? []).slice(0).map((skill: TalentSkill) => {
        return skill.clone();
      });

      creatureSerializer.deserialize(this, this.template, runtime.toDeserializeContext());

      if(needsRegister){
        if(BitWise.InstanceOf(this.objectType, GameObjectType.PlayerCharacter)){
          if(!this.id || this.id === GameObjectConstant.OBJECT_INVALID){
            this.id = runtime.getNextPlayerId?.() ?? 0;
          }
        }
      }

      const pendingAppearance = (this as any)._pendingAppearance;
      if(pendingAppearance !== undefined){
        this.setAppearance(pendingAppearance);
        delete (this as any)._pendingAppearance;
      }

      const conversationResRef = (this as any)._conversationResRef;
      if(conversationResRef !== undefined){
        this.deferConversation(conversationResRef);
        delete (this as any)._conversationResRef;
      }

      // LoadCreature / LoadCreatureData / LoadCharacterFromIFO:
      // DetectMode GFF is read then ignored; SetActivity(2,1) always enables detect.
      // StealthMode goes through SetActivity(1, value) — blocked while detect activity bit is set
      // (same as; stealth is typically off on load).
      if((this.activity & 2) === 0){
        this.setActivity(2, true, 0);
      }else{
        this.setDetectMode(true);
      }
      const pendingStealthMode = (this as any)._pendingStealthMode;
      if(pendingStealthMode !== undefined){
        this.setActivity(1, pendingStealthMode, 0);
        delete (this as any)._pendingStealthMode;
      }

      const pendingListeningPatterns = (this as any)._pendingListeningPatterns;
      if(pendingListeningPatterns !== undefined){
        for(let i = 0; i < pendingListeningPatterns.length; i++){
          this.setListeningPattern(
            pendingListeningPatterns[i].pattern,
            pendingListeningPatterns[i].number,
          );
        }
        delete (this as any)._pendingListeningPatterns;
      }
          
      this.faction = GameState.FactionManager.factions.get(this.factionId);

      const pendingPerceptionRangeId = (this as any)._pendingPerceptionRangeId;
      if(pendingPerceptionRangeId !== undefined){
        this.perceptionRange = rules?.ranges?.[pendingPerceptionRangeId];
        delete (this as any)._pendingPerceptionRangeId;
      }else{
        //https://forum.neverwintervault.org/t/perception-range/3191/9
        //It appears that PerceptionRange isn't saved inside the GIT file.
        //The original game appears to use PercepRngDefault when a creature is reloaded from a SaveGame
        this.perceptionRange = rules?.ranges?.[11];
      }

      this.portrait = rules?.portraits?.[this.portraitId];

      try{
        for(let i = 0; i < this.effects.length; i++){
          const effect = this.effects[i];
          effect.setAttachedObject(this);
          effect.loadModel();
        }
      }catch(e: any){
        console.error(e);
      }

      try{
        const pendingEquipmentEntries = (this as any)._pendingEquipmentEntries;
        if(pendingEquipmentEntries !== undefined){
          for(let i = 0; i < pendingEquipmentEntries.length; i++){
            const entry = pendingEquipmentEntries[i];
            let equipped_item = undefined;
            const slot_type = entry.slotType;
            // Always FromStruct so Equip_ItemList Dropable/Pickpocketable survive UTI merge
            // (ReadItemsFromGff: LoadFromTemplate then re-apply Dropable from the struct).
            equipped_item = new GameState.Module.Area.Item(GFFObject.FromStruct(entry.struct));
            
            switch(slot_type){
              case ModuleCreatureArmorSlot.HEAD:
                this.equipment.HEAD = equipped_item;
              break;
              case ModuleCreatureArmorSlot.ARMS:
                this.equipment.ARMS = equipped_item;
              break;
              case ModuleCreatureArmorSlot.ARMOR:
                this.equipment.ARMOR = equipped_item;
              break;
              case ModuleCreatureArmorSlot.LEFTHAND:
                this.equipment.LEFTHAND = equipped_item;
              break;
              case ModuleCreatureArmorSlot.LEFTHAND2:
                this.equipment.LEFTHAND2 = equipped_item;
              break;
              case ModuleCreatureArmorSlot.RIGHTHAND:
                this.equipment.RIGHTHAND = equipped_item;
              break;
              case ModuleCreatureArmorSlot.RIGHTHAND2:
                this.equipment.RIGHTHAND2 = equipped_item;
              break;
              case ModuleCreatureArmorSlot.LEFTARMBAND:
                this.equipment.LEFTARMBAND = equipped_item;
              break;
              case ModuleCreatureArmorSlot.RIGHTARMBAND:
                this.equipment.RIGHTARMBAND = equipped_item;
              break;
              case ModuleCreatureArmorSlot.IMPLANT:
              this.equipment.IMPLANT = equipped_item;
              break;
              case ModuleCreatureArmorSlot.BELT:
                this.equipment.BELT = equipped_item;
              break;

              //Simple Creature Slots
              case ModuleCreatureArmorSlot.HIDE:
                this.equipment.HIDE = equipped_item;
              break;
              case ModuleCreatureArmorSlot.CLAW1:
                this.equipment.CLAW1 = equipped_item;
              break;
              case ModuleCreatureArmorSlot.CLAW2:
                this.equipment.CLAW2 = equipped_item;
              break;
              case ModuleCreatureArmorSlot.CLAW3:
                this.equipment.CLAW3 = equipped_item;
              break;
              default:
                console.warn('Creature.initProperties', 'Unhandled Equipment Slot', equipped_item);
              break;
            }
          }
          delete (this as any)._pendingEquipmentEntries;
        }
      }catch(e: any){
        console.error(e);
      }

      this.parseEquipmentSlots();

      const pendingInventoryEntries = (this as any)._pendingInventoryEntries;
      if(pendingInventoryEntries !== undefined){
        for(let i = 0; i < pendingInventoryEntries.length; i++){
          this.loadItem(GFFObject.FromStruct(pendingInventoryEntries[i].struct));
        }
        delete (this as any)._pendingInventoryEntries;
      }
      this.loadSoundSet();


      if((this as any)._pendingCombatRoundStarted){
        // CombatState is not persisted; a restored active round must re-enter
        // combat after registration so its timers and end-round hooks resume.
        this.setCombatState(true, ExcitedDurationRow.Damage);
        this.setExcitedState(ExcitedDurationRow.Damage);
        delete (this as any)._pendingCombatRoundStarted;
      }

      // After CombatInfo fromStruct: rebind equip DWORDs to live item objects.
      this.rebindCombatInfoEquipIds();
    }catch(e: any){
      console.error(e);
    }

    // LoadCreature — ReadFieldINT("Animation", default 10000)
    // then SetAnimation. Always re-resolve after HP is loaded so pause is not
    // stuck on pauseinj from a pre-stats constructor resolve.
    let anim = ModuleCreatureAnimState.PAUSE;
    const pendingAnimation = (this as any)._pendingAnimation;
    if(pendingAnimation !== undefined){
      anim = pendingAnimation;
      delete (this as any)._pendingAnimation;
    }
    if(!anim || anim === ModuleCreatureAnimState.INVALID){
      anim = ModuleCreatureAnimState.PAUSE;
    }
    // Mid-duel saves stamp ATTACK/ATTACK_DUELING which have no 2DA mapping
    // demote to READY/PAUSE so load does not spam Animation Missing.
    const resolved = this.animationConstantToAnimation(anim);
    const inCombat = !!(this.combatData?.combatState || this.combatRound?.roundStarted);
    if(!resolved || isTransientCombatAnimIndex(anim)){
      anim = inCombat ? ModuleCreatureAnimState.READY : ModuleCreatureAnimState.PAUSE;
    }
    this.setAnimationState(anim);

    if(needsRegister){
      runtime.register(this);
    }

    this.initialized = true;

  }

  async loadEquipmentModels(): Promise<void> {
    return await this.modelService.loadEquipmentModels();
  }

  parseEquipmentSlots(){
    return this.equipmentService.parseEquipmentSlots();
  }

  /**
   * Point CombatInfo LeftEquip/RightEquip at live hand-item ids after load.
   */
  rebindCombatInfoEquipIds(){
    return this.equipmentService.rebindCombatInfoEquipIds();
  }

  loadSoundSet(){
    const soundSet = GameState.SWRuleSet?.soundSets?.[this.soundSetFile];
    const resref = soundSet?.resref;
    if(resref){
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes.ssf, resref.toLowerCase());
      this.ssf = new SSFObject(buffer);
      return;
    }
    const soundset2DA = GameState.TwoDAManager.datatables.get('soundset');
    if(soundset2DA){
      let ss_row = soundset2DA.rows[this.soundSetFile];
      if(ss_row){
        const buffer = ResourceLoader.loadCachedResource(ResourceTypes.ssf, ss_row.resref.toLowerCase());
        this.ssf = new SSFObject(buffer);
      }
    }
  }

  loadItem(template: GFFObject){
    return this.equipmentService.loadItem(template);
  }

  playSoundSet(type = -1){
    if(!(this.ssf instanceof SSFObject)){
      return;
    }
    const resref = this.ssf.GetSoundResRef(type).replace(/\0.*$/g,'');
    if(resref != ''){
      if(this.audioEmitter){
        this.audioEmitter.setPriorityGroupId(this.getSoundSetPriorityGroup());
        this.audioEmitter.playSoundFireAndForget(resref);
      }
    }
  }

  updateDestroyFade(delta: number = 0): void {
    return this.deathCorpseService.updateDestroyFade(delta);
  }

  setOpacity(opacity: number){
    super.setOpacity(opacity);
    if(this.head instanceof OdysseyModel3D){
      this.head.setOpacity(opacity);
    }
  }

  destroy(): void {
    return this.deathCorpseService.destroy();
  }

  /** Tear down head/equipment/inventory visuals after GameObject.destroy. */
  disposeCreatureVisuals(){
    return this.deathCorpseService.disposeCreatureVisuals();
  }

  /**
   * Sync combat information fields from live equipment/stats before SaveData.
   * Compute/Update fills these before SaveData.
   */
  syncCombatInformationForSave(){
    return this.equipmentService.syncCombatInformationForSave();
  }

  /**
   * SaveClassInfo LvlStatList element (struct type 0).
   * Omits LvlStatAbility for level index 0 or when no ability bump.
   */
  saveLevelStatStruct(rec: LevelStatRecord, levelIndex: number): GFFStruct {
    return LevelStatListSerializer.serializeRecord(rec, levelIndex);
  }

  save(context?: SerializeContext){
    const runtime = getDefaultRuntimeContext();
    const gff = creatureSerializer.serialize(this, {
      gameKey: runtime.getGameKey(),
      controlledNpcIndex: runtime.getControlledNpcIndex?.() ?? -1,
      ...(context ?? {}),
    });
    this.template = gff;
    return gff;
  }

  static GenerateTemplate(){
    let template = new GFFObject();
    template.FileType = 'UTC ';

    template.RootNode.addField( new GFFField(GFFDataType.WORD, 'Appearance_Type') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'BodyBag') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'BodyVariation') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Cha') );
    template.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ChallengeRating') );
    template.RootNode.addField( new GFFField(GFFDataType.LIST, 'ClassList') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Comment') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Con') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Conversation') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'CurrentForce') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'CurrentHitPoints') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Deity') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Dex') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Disarmable') );
    template.RootNode.addField( new GFFField(GFFDataType.LIST, 'Equip_ItemList') );
    template.RootNode.addField( new GFFField(GFFDataType.WORD, 'FactionID') );
    template.RootNode.addField( new GFFField(GFFDataType.LIST, 'FeatList') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'FirstName') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'ForcePoints') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Gender') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'GoodEvil') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'HitPoints') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Int') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Interruptable') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'IsPC') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LastName') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'LawfulChaotic') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'MaxHitPoints') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Min1HP') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'NaturalAC') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'NoPermDeath') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'NotReorienting') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PalletID') ).setValue(4);
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PartyInteract') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PerceptionRange') );
    template.RootNode.addField( new GFFField(GFFDataType.INT, 'Phenotype') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Plot') );
    template.RootNode.addField( new GFFField(GFFDataType.WORD, 'PortraitId') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Race') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptAttacked') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDamaged') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDeath') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDialogue') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDisturbed') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptEndDialogu') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptEndRound') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptOnBlocked') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptOnNotice') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptRested') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptSpawn') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptSpellAt') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptUserDefine') );
    let skillList = template.RootNode.addField( new GFFField(GFFDataType.LIST, 'SkillList') );
    template.RootNode.addField( new GFFField(GFFDataType.WORD, 'SoundSetFile') )
    template.RootNode.addField( new GFFField(GFFDataType.LIST, 'SpecAbilityList') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Str') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Subrace') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'SubraceIndex') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') );
    template.RootNode.addField( new GFFField(GFFDataType.LIST, 'TemplateList') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'TemplateResRef') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TextureVar') );
    template.RootNode.addField( new GFFField(GFFDataType.INT, 'WalkRate') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Wis') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'fortbonus') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'refbonus') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'willbonus') );

    for(let i = 0; i < 8; i++){
      let _skill = new GFFStruct();
      _skill.addField( new GFFField(GFFDataType.RESREF, 'Rank') ).setValue(0);
      skillList.addChildStruct(_skill);
    }

    return template;
  }

}
