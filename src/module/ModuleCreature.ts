import { GFFObject } from "@/resource/GFFObject";
import * as THREE from "three";
import { ModuleObject } from "@/module/ModuleObject";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleRoom } from "@/module/ModuleRoom";

import { AudioEmitter } from "@/audio/AudioEmitter";
import { CreatureClass } from "@/combat/CreatureClass";
import { EffectRacialType } from "@/effects";
import { animForSetState, getActiveSetStateType } from "@/effects/set-state";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleCreatureAnimState, isTransientCombatAnimIndex } from "@/enums/module/ModuleCreatureAnimState";
import { AILevel } from "@/enums/module/AILevel";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GameState } from "@/GameState";
import { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { NWScriptEvent } from "@/nwscript/events";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
import { CExoLocString } from "@/resource/CExoLocString";
import { MDLLoader, ResourceLoader } from "@/loaders";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { SSFObject } from "@/resource/SSFObject";
import { TalentFeat } from "@/talents/TalentFeat";
import { TalentObject } from "@/talents/TalentObject";
import { TalentSkill } from "@/talents/TalentSkill";
import { TalentSpell } from "@/talents/TalentSpell";
import { TalentObjectType } from "@/enums/engine/TalentObjectType";
import { OdysseyModel3D, OdysseyObject3D } from "@/three/odyssey";
import { applyHeadTrackingToHturn, stripHeadTrackingFromHturn } from "@/module/applyHeadTrackingToHturn";
import { OdysseyModel, OdysseyModelAnimation } from "@/odyssey";
import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import { LIPObject } from "@/resource/LIPObject";
import { Utility } from "@/utility/Utility";
import { testStringAgainstPattern } from "@/utility/listen-pattern";
import { drainHeardStringHead } from "@/combat/speak-string-broadcast";
import { EngineMode } from "@/enums/engine/EngineMode";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { SSFType } from "@/enums/resource/SSFType";
import { ActionType } from "@/enums/actions/ActionType";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import EngineLocation from "@/engine/EngineLocation";
import { FollowerCamera } from "@/engine/FollowerCamera";
import { AttackResult } from "@/enums/combat/AttackResult";
// import { ICombatAction } from "@/interface/combat/ICombatAction";
import { DLGObject } from "@/resource/DLGObject";
import {
  APPEARANCE_EVIL_BODY_ALIGN_MAX,
  SWCreatureAppearance,
} from "@/engine/rules/SWCreatureAppearance";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { SWBodyBag } from "@/engine/rules/SWBodyBag";
import {
  LevelUpAbilityIndex,
  createEmptyLevelStatRecord,
  type LevelStatRecord,
} from "@/engine/rules/level-up";
import { SkillType } from "@/enums/nwscript/SkillType";
import type { InterAreaWaypoint } from "@/engine/pathfinding/inter-area-path";
import { buildPathAroundCreature } from "@/engine/pathfinding/build-path-around-creature";
import { nudgeFriendlyCreatures } from "@/engine/pathfinding/nudge-friendlies";
import { resolvePlayerControlStep } from "@/engine/movement/player-control-policy";
import { tickExternalForceStep } from "@/engine/movement/external-force-policy";
import { commitMovement } from "@/engine/movement/movement-committer";
import {
  setMovementAuthority,
  ensureMovementState,
} from "@/engine/movement/creature-movement-state";
import { MovementAuthority } from "@/engine/movement/types";
import { findWalkableAttachmentAt } from "@/engine/movement/area-movement-queries";
import { applyWalkableAttachment } from "@/engine/movement/apply-walkable-attachment";
import { getUseRange } from "@/actions/use-range";
import { getAttackApproachPoint } from "@/combat/nearest-action-point";
import { ModulePlaceable } from "@/module/ModulePlaceable";
import type { ModuleEncounter } from "@/module/ModuleEncounter";
import { BaseItemType } from "@/enums/combat/BaseItemType";

import { ICreatureAnimationState } from "@/interface/animation/ICreatureAnimationState";
import { IOverlayAnimationState } from "@/interface/animation/IOverlayAnimationState";
import { IWeaponGestureState } from "@/interface/animation/IWeaponGestureState";
import { IGestureAnimationState } from "@/interface/animation/IGestureAnimationState";
import { AnimationPlaybackMode } from "@/enums/animation/AnimationPlaybackMode";
import {
  resolvePlaybackMode,
  resolveOverlayStopFlags,
  resolveOverlayStartFlags,
} from "@/module/animation/resolvePlaybackMode";
import { isAnimation2DAFlagSet } from "@/module/animation/animation2daFlag";
import {
  combatAnimationAttackKey,
  combatAnimationWeaponDigit,
  combatReactionClipDigit,
} from "@/module/animation/combat-wield-digit";
import type { CreatureAnimationContext } from "@/module/animation/CreatureAnimationContext";
import { resolveCreatureAnimation } from "@/module/animation/resolveCreatureAnimation";
import { resolveDebilitatedCreatureAnimation } from "@/module/animation/resolveDebilitatedCreatureAnimation";
import { WeaponWield } from "@/enums/combat/WeaponWield";
import { WeaponType } from "@/enums/combat/WeaponType";
import { CombatFeatType } from "@/enums/combat/CombatFeatType";
import { AutoPauseState } from "@/enums/engine/AutoPauseState";
import { AudioEngine } from "@/audio/AudioEngine";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { PerceptionType } from "@/enums/engine/PerceptionType";
import { AudioEmitterType } from "@/enums/audio/AudioEmitterType";
import { AudioPriorityGroup } from "@/enums/audio/AudioPriorityGroup";
import { CombatActionType } from "@/enums/combat/CombatActionType";
import {
  CombatMode,
  COMBAT_MODE_ACTIVITY_BIT,
  COMBAT_MODE_ACTIVITY_MASK,
} from "@/enums/combat/CombatMode";
import { CombatRound, CombatRoundAction, resolveAnimations2DARow } from "@/combat";
import { spawnWorldImpactVfx } from "@/combat/ranged-impact-vfx";
import { isGrenadeItemType } from "@/combat/item-cast-grenade";
import { CombatInformation } from "@/combat/CombatInformation";
import { GameEffectFactory } from "@/effects/GameEffectFactory";
import type { Action } from "@/actions/Action";
import { ModuleTriggerType } from "@/enums/module/ModuleTriggerType";
import { EngineDebugType } from "@/enums/engine/EngineDebugType";
import { TextSprite3D } from "@/engine/TextSprite3D";
import { UIIconTimerType } from "@/enums/engine/UIIconTimerType";
import { ExperienceType } from "@/enums/engine/ExperienceType";
import { ModuleObjectScript } from "@/enums/module/ModuleObjectScript";
import { MineSkillResult, resolvePassiveMineDetect } from "@/actions/mine-skill";
import { PerceptionMask } from "@/enums/engine/PerceptionMask";
import {
  COMBAT_STATE_DURATION_MS,
  ExcitedDurationRow,
  getExcitedDurationMs,
  hasLivingCombatTarget,
  setClientCombatMode,
  updateClientCombatMode,
} from "@/combat/combat-engagement";
import { queueAttackActions } from "@/combat/queue-attack-actions";
import { ensureCombatDispatcher } from "@/combat/ensure-combat-dispatcher";
import { getNearestEnemy } from "@/combat/nearest-enemy";
import {
  isChoreographedMeleeWeapon,
  resolveChoreographedState,
} from "@/combat/combat-dueling";
import {
  DETECT_FLAG_SEE_INVISIBLE,
  DETECT_FLAG_TRUE_SEEING,
  DETECT_FLAG_ULTRA_VISION,
  getAbilityEffectBonus,
  getAttackEffectBonus,
  getDetectFlags,
  getForceResistanceBonus,
  getSavingThrowEffectBonus,
} from "@/effects/effect-bonuses";
import { hasImmunityType } from "@/effects/haste-slow";
import { isCreatureBlind } from "@/effects/EffectBlindness";
import type { EffectSanctuary } from "@/effects/EffectSanctuary";
import { getAbilityModifier } from "@/engine/rules/skill-points";
import { Dice } from "@/utility/Dice";
import { DiceType } from "@/enums/combat/DiceType";
import {
  combineSavingThrow,
  rollSavingThrow,
  savingThrowTypeToImmunity,
} from "@/module/savingThrow/savingThrowMath";
import {
  getCreatureSpeedRates,
  coalesceDriveAnimRun,
  coalesceDriveAnimWalk,
  coalesceDriveMaxSpeed,
} from "@/engine/pathfinding/movement-rate";
import { resetWalkSpeedFactor } from "@/engine/pathfinding/tick-creature-walk";
import {
  tickForcePushLoco,
  isForcePushLocoActive,
  updateForcePushAnimFlags,
} from "@/engine/pathfinding/force-push-loco";
import {
  CreatureLocoState,
  isPartyFollowLocoActive,
  isCreatureLocoPaused,
  setCreatureLocoState,
} from "@/engine/pathfinding/creature-loco";
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
} from "@/controls/player-cam-relative-control";
import { ClientCameraMode } from "@/enums/engine/ClientCameraMode";
import {
  applyMobilityMovementBonus,
  clampMovementRateFactor,
} from "@/engine/pathfinding/locomotion";
import { ModuleCreatureAmbientState } from "@/enums/module/ModuleCreatureAmbientState";
import { GameEffectSetStateType } from "@/enums/effects/GameEffectSetStateType";
import type { SWAnimation } from "@/engine/rules/SWAnimation";

import { isCreature } from "@/module/guards/isCreature";
import { isDoor } from "@/module/guards/isDoor";
import { isEncounter } from "@/module/guards/isEncounter";
import { isObject } from "@/module/guards/isObject";
import { isPlaceable } from "@/module/guards/isPlaceable";

/** party-follow info fields (FollowInfo GFF struct). */
export interface CreaturePartyFollowInfo {
  followObject: number;
  followLocation: THREE.Vector3;
  lastLeaderPos: THREE.Vector3;
  lastFollowerPos: THREE.Vector3;
  maxSpeed: number;
  stickToPos: number;
  result: number;
  timeElapsed: number;
  inSafetyRange: number;
}

export function createDefaultPartyFollowInfo(): CreaturePartyFollowInfo {
  return {
    followObject: ModuleObjectConstant.OBJECT_INVALID,
    followLocation: new THREE.Vector3(0, 0, 0),
    lastLeaderPos: new THREE.Vector3(0, 0, 0),
    lastFollowerPos: new THREE.Vector3(0, 0, 0),
    maxSpeed: 0,
    stickToPos: 0,
    result: 2,
    timeElapsed: 0,
    // party-member defaults 0 after place/reset; only saved
    // FollowInfo.InSafetyRange=1 should hold chase until leader ≥7.
    inSafetyRange: 0,
  };
}

/**
* ModuleCreature class.
*
* Class representing a creature found in module areas.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file ModuleCreature.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleCreature extends ModuleObject {
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
  attemptedMovementTarget: ModuleObject = undefined;
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
  encounterObjectId: number = ModuleObjectConstant.OBJECT_INVALID;
  /** already unlinked from encounter active count. */
  encounterUnlinked: boolean = false;
  /** item used for current spell cast (GetSpellCastItem). */
  spellCastItem: ModuleItem = undefined;
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
  foundEnemyCreature: ModuleObject | undefined;
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
    HEAD: ModuleItem; 
    ARMOR: ModuleItem; 
    ARMS: ModuleItem; 
    RIGHTHAND: ModuleItem; 
    RIGHTHAND2: ModuleItem; 
    LEFTHAND: ModuleItem; 
    LEFTHAND2: ModuleItem; 
    LEFTARMBAND: ModuleItem; 
    RIGHTARMBAND: ModuleItem; 
    IMPLANT: ModuleItem; 
    BELT: ModuleItem; 
    CLAW1: ModuleItem; 
    CLAW2: ModuleItem; 
    CLAW3: ModuleItem; 
    HIDE: ModuleItem; 
  };
  /** Stashed equipment while dialog UnequipItems/UnequipHItem is active. */
  dialogEquipmentStash: {
    HEAD?: ModuleItem;
    RIGHTHAND?: ModuleItem;
    LEFTHAND?: ModuleItem;
  } | undefined;
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
  private animationMissingLogged: boolean = false;
  deathStarted: boolean;
  /** Pass AL — last trap this creature detected. */
  lastTrapDetected: ModuleObject;
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
  private modelLoadGeneration: number = 0;

  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.objectType |= ModuleObjectType.ModuleCreature;
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
    this.encounterObjectId = ModuleObjectConstant.OBJECT_INVALID;
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
    this.perceptionRange = GameState.SWRuleSet.ranges[11];
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

    this.scripts[ModuleObjectScript.CreatureOnAttacked] = undefined;
    this.scripts[ModuleObjectScript.CreatureOnDamaged] = undefined;
    this.scripts[ModuleObjectScript.CreatureOnDeath] = undefined;
    this.scripts[ModuleObjectScript.CreatureOnDialog] = undefined;
    this.scripts[ModuleObjectScript.CreatureOnDisturbed] = undefined;
    this.scripts[ModuleObjectScript.CreatureOnEndDialog] = undefined;
    this.scripts[ModuleObjectScript.CreatureOnEndRound] = undefined;
    this.scripts[ModuleObjectScript.CreatureOnHeartbeat] = undefined;
    this.scripts[ModuleObjectScript.CreatureOnBlocked] = undefined;
    this.scripts[ModuleObjectScript.CreatureOnNotice] = undefined;
    this.scripts[ModuleObjectScript.CreatureOnRested] = undefined;
    this.scripts[ModuleObjectScript.CreatureOnSpawn] = undefined;
    this.scripts[ModuleObjectScript.CreatureOnSpellAt] = undefined;
    this.scripts[ModuleObjectScript.CreatureOnUserDefined] = undefined;

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
      GameState.GameKey === GameEngineType.TSL
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
    if(!GameState.module?.readyToProcessEvents) return;

    // : field438 == 1 → early return (paused / end-of-path)
    if(isCreatureLocoPaused(this) && !isForcePushLocoActive(this)){
      return;
    }

    if(isForcePushLocoActive(this)){
      tickForcePushLoco(this, delta);
      updateForcePushAnimFlags(this, delta);
      this._creatureLocoThisFrame = true;
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
   * Heartbeat/effects (super), damage, action queue, perception, combat timers,
   * regen, AI-level self-adjustment.
   */
  aiUpdate(delta: number = 0){
    if(this.destroyed || this.isRetainedCorpse) return;

    super.aiUpdate(delta);

    if(this.destroyed || this.willDestroy) return;
    if(!this.isReady) return;

    if(GameState.Mode != EngineMode.INGAME && GameState.Mode != EngineMode.MINIGAME && GameState.Mode != EngineMode.DIALOG){
      this._creatureLocoThisFrame = false;
      return;
    }

    this.action = this.actionQueue[0];

    if(!this.isDead()){
      // Process DamageList
      let elLen = this.damageList.length - 1;
      for(let i = elLen; i >= 0; i--){
        this.damageList[i].delay -= delta;
        if(this.damageList[i].delay <= 0){
          this.subtractHP(this.damageList[i].amount);

          let painsound = THREE.MathUtils.randInt(0, 1);
          switch(painsound){
            case 1:
              this.playSoundSet(SSFType.PAIN_2);
            break;
            default:
              this.playSoundSet(SSFType.PAIN_1);
            break;
          }

          this.damageList.splice(i, 1);
        }
      }

      this.deathStarted = false;

      // Corpses lock the action queue on DEAD; living NPCs in a scripted dead
      // pose (ActionPlayAnimation) must still tick their timed action.
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

    this.updateCombatStateTimer(delta);
    this.updateExcitedDuration(delta);
    updateClientCombatMode(this);
    this.updateCombat(delta);
    this.updateCasting(delta);

    this.updatePerceptionList(delta);
    this.updateListeningPatterns();

    // Deferred effects (when deferEventUpdate was set)
    if(this.deferEventUpdate){
      for(let i = 0, len = this.effects.length; i < len; i++){
        const effect = this.effects[i];
        if(effect) effect.update(delta);
      }
    }

    this.updateRegen(delta);
    this.adjustAILevel();

    this._creatureLocoThisFrame = false;
  }

  /**
   * AIUpdate AI-level self-adjustment.
   * Party/PC → VERY_HIGH; combat → NORMAL; else LOW (area occupied) or VERY_LOW.
   */
  adjustAILevel(){
    const scheduler = GameState.module?.aiScheduler;
    if(!scheduler) return;

    // Party / PC always VERY_HIGH
    if((this.isPlayer || this.isPM || this.isPartyMember()) && this.aiLevel !== AILevel.VERY_HIGH){
      scheduler.setAILevel(this, AILevel.VERY_HIGH);
      return;
    }

    if(this.isPlayer || this.isPM || this.isPartyMember()) return;

    if(this.combatData?.combatState){
      if(this.aiLevel !== AILevel.NORMAL && this.aiLevel !== AILevel.VERY_HIGH){
        scheduler.setAILevel(this, AILevel.NORMAL);
      }
      return;
    }

    // Demote non-combat NORMAL → LOW/VERY_LOW based on players in area
    if(this.aiLevel === AILevel.NORMAL){
      const areaOccupied = (this.area as any)?.playersInArea > 0 ||
        (GameState.PartyManager?.party?.length > 0 && this.area === GameState.module?.area);
      scheduler.setAILevel(this, areaOccupied ? AILevel.LOW : AILevel.VERY_LOW);
    }
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
    if(this.spawned){
      // Allow PC/party room attach while paused so auto-pause cannot leave a blank VIS
      if(!this.room && this.area){
        this.updateRoomAttachment(delta);
      }else{
        this.updateModelVisibility();
      }
    }
  }

  update( delta = 0 ){

    if(this.destroyed){
      return;
    }

    // KeepCorpse shells skip normal AI/effects — visual + eviction fade only
    if(this.isRetainedCorpse){
      this.updateRetainedCorpse(delta);
      return;
    }

    super.update(delta);

    if(this.destroyed){
      return;
    }

    // Converted to KeepCorpse during updateDestroy this frame
    if(this.isRetainedCorpse){
      this.updateRetainedCorpse(delta);
      return;
    }

    // : DestroyObjectDelay runs before remove; corpse must keep playing DIE→DEAD + model fade.
    if(this.willDestroy){
      this.updateCorpsePendingDestroy(delta);
      return;
    }

    if(this.audioEmitter){
      this.audioEmitter.setPosition(this.position.x, this.position.y, this.position.z + 1.0);
      this.footstepEmitter.setPosition(this.position.x, this.position.y, this.position.z);
    }

    this.forceVector.set(0, 0, 0);
    this.sphere.center.copy(this.position);
    this.sphere.radius = this.getHitDistance() * 2;

    if(GameState.Mode == EngineMode.INGAME || GameState.Mode == EngineMode.MINIGAME || GameState.Mode == EngineMode.DIALOG){

      if(this.animationState.index == ModuleCreatureAnimState.IDLE){
        this.footstepEmitter.isLooping = false;
        this.footstepEmitter.stop();
      }

      if(!this.isReady){
        //this.getModel.visible = true;
        return;
      }else{

      }

      //Get the first action in the queue
      this.action = this.actionQueue[0];

      /*if(this == GameState.getCurrentPlayer && this.room instanceof ModuleRoom){
        //this.room.show(true);
      }else if(this.room instanceof ModuleRoom){
        if(this.room.model instanceof OdysseyModel3D){
          if(this.model){
            this.model.visible = this.room.model.visible;
          }
        }
      }*/

      // Scripted defeat (e.g. k_ptar_dueler_ud ActionPlayAnimation(DEAD, …, 360))
      // must hold the corpse pose on living Min1HP/plot NPCs. Only auto get-up
      // when recovering from a real death (deathAnimationPlayed from DIE→DEAD).
      if(
        !this.isDead() &&
        this.deathAnimationPlayed &&
        (
          this.animationState.index == ModuleCreatureAnimState.DEAD ||
          this.animationState.index == ModuleCreatureAnimState.DEAD1
        )
      ){
        this.deathAnimationPlayed = false;
        this.setAnimationState(ModuleCreatureAnimState.GET_UP_DEAD);
      }

      if(!this.isDead()){
        // Damage list + action queue moved to aiUpdate / quicktickCreatureWalk / walk tick

        if(this.dialogAnimation && (GameState.Mode == EngineMode.DIALOG) && (!this.action || this.action.type != ActionType.ActionPlayAnimation)){
          if(this.model){

            if(!this.speed){
                
              let _animIsValid = (this.dialogAnimation.animation instanceof OdysseyModelAnimation);
              if(_animIsValid){
                let _animIsPlaying = (this.model.animationManager.currentAnimation == this.dialogAnimation.animation);
                if(!_animIsPlaying && !this.dialogAnimation.started){
                  let _newAnim = this.dialogAnimation.animation;
                  if(_newAnim instanceof OdysseyModelAnimation){
                    this.model.playAnimation( _newAnim, this.dialogAnimation.data.looping );
                    this.dialogAnimation.started = true;
                  }else{
                    //Kill the dialogAnimation if the animation isn't valid
                    this.dialogAnimation = null;
                  }
                }else if(!_animIsPlaying && this.dialogAnimation.started){
                  //Kill the dialogAnimation if it has already played
                  this.dialogAnimation = null;
                }
              }else{
                //Kill the dialogAnimation if the animation isn't valid
                this.dialogAnimation = null;
              }

            }
  
          }else{
            //Kill the dialogAnimation if there is no model to animate?
            this.dialogAnimation = null;
          }
        }else{
          this.dialogAnimation = null;
        }
      }else{
        this.getUpAnimationPlayed = false;
        if(
          this.deathStarted && 
          this.animationState.index != ModuleCreatureAnimState.DEAD && 
          this.animationState.index != ModuleCreatureAnimState.DIE
        ){
          this.setAnimationState(ModuleCreatureAnimState.DEAD);
          this.deathAnimationPlayed = true;
        }
        if(!this.deathStarted){
          this.deathAnimationPlayed = false;
          this.deathStarted = true;
          this.clearAllActions();
          this.onDeath();
          this.playAppearanceDeathVFX();
          this.playSoundSet(SSFType.DEAD);
          this.resetOverlayAnimationState();
          this.setAnimationState(ModuleCreatureAnimState.DIE);
        }
      }

      if(this.isDebilitated()){
        this.force = 0;
        this.speed = 0;
        if(!this.combatData.combatState){
          const state = getActiveSetStateType(this);
          this.setAnimationState(
            state > 0 ? animForSetState(state) : ModuleCreatureAnimState.PAUSE
          );
        }
      }

      //-------------------------//
      // BEGIN: Move Speed Logic //
      //-------------------------//

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
      const usePlayerControl =
        !forcePushLocked &&
        GameState.Mode != EngineMode.DIALOG &&
        (!!this.playerControl?.active || playerControlMoving) &&
        (this.controlled || this === GameState.getCurrentPlayer());

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

      //-----------------------//
      // END: Move Speed Logic //
      //-----------------------//

      this.pushGrassWindGust();

      // IDLE == PAUSE (10000); promote out-of-combat idle to combat ready while engaged.
      if(this.combatMode === CombatMode.COUNTERSPELL){
        if(
          this.animationState.index == ModuleCreatureAnimState.PAUSE ||
          this.animationState.index == ModuleCreatureAnimState.READY
        ){
          this.setAnimationState(ModuleCreatureAnimState.CASTOUT1_LP);
        }
      }else if(this.combatData.combatState && this.animationState.index == ModuleCreatureAnimState.PAUSE){
        this.setAnimationState(ModuleCreatureAnimState.READY);
      }

      // Combat / casting / perception / regen moved to aiUpdate
      this.updateAnimationState();
      this.updateItems(delta);

      if(this.model instanceof OdysseyModel3D && this.model.bonesInitialized){

        //BEGIN: Animation Optimization
        this.model.animateFrame = true;
        const inParty = GameState.PartyManager.party.indexOf(this) != -1;
        // Last-frame cull (visibility sync runs after creature ticks). Party,
        // dialog, cutscene, and TSL forceAlwaysUpdate keep posing.
        if(
          !this.forceAlwaysUpdate &&
          !this.model.visible &&
          !inParty &&
          !this.cutsceneMode &&
          GameState.Mode != EngineMode.DIALOG
        ){
          this.model.animateFrame = false;
        }
        //If the object is further than 50 meters, animate every other frame
        if(this.model.animateFrame && this.distanceToCamera > 50){
          this.model.animateFrame = this.model.oddFrame;
        }
        
        if(this.model.animateFrame){
          //If we can animate and there is fog, make sure the distance isn't greater than the far point of the fog effect
          if(!inParty && this.context.scene.fog){
            if(this.distanceToCamera >= this.context.scene.fog.far){
              this.model.animateFrame = false;
              //If the object is past the near point, and the near point is greater than zero, animate every other frame
            }else if(this.context.scene.fog.near && this.distanceToCamera >= this.context.scene.fog.near){
              this.model.animateFrame = this.model.oddFrame;
            }
          }
        }
        //END: Animation Optimization

        // Strip look before anim so blend does not start from a looked pose.
        if(this.model.hturn_g){
          stripHeadTrackingFromHturn(this.model.hturn_g);
        }

        if(GameState.Mode != EngineMode.DIALOG){
          const locomoting =
            this.animationState.index == ModuleCreatureAnimState.RUNNING ||
            this.animationState.index == ModuleCreatureAnimState.WALKING ||
            this.animationState.index == ModuleCreatureAnimState.WALKING_BACK;
          // Walk-back reuses walk rows with reverse playback.
          const playback =
            (locomoting ? this.animSpeed : this.movementSpeed) *
            (this.animationState.index == ModuleCreatureAnimState.WALKING_BACK ? -1 : 1);
          this.model.update(playback * delta);
          if(this.lipObject instanceof LIPObject){
            this.lipObject.update(delta, this.model);
          }
        }else{
          this.model.update( delta );
          if(this.lipObject instanceof LIPObject){
            this.lipObject.update(delta, this.model);
          }
          if(this.cutsceneMode && this.model){
            for(let i = 0, len = this.model.skins.length; i < len; i++){
              this.model.skins[i].frustumCulled = false;
            }
          }
        }

        this.updateHeadTracking(delta);
        // After body bones are posed so saber trails sample current matrixWorld.
        this.updateWeaponModels(delta);
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

      // Perception / listening moved to aiUpdate


      // Party companion stuck timer — FollowLeader TeleportForward is owned by
      // the FollowLeader SM (ActionFollowLeader.softTeleportForward). Do not also
      // advance the ring from collisionTimer while following (dual TeleportForward).
      if(this.npcId != undefined && this != (GameState.getCurrentPlayer() as any) && this.collisionTimer >= 2){
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

      // Stationary turn animations (body turn when idle/pause/ready; not head look)
      const stationaryTurnStates = [
        ModuleCreatureAnimState.IDLE,
        ModuleCreatureAnimState.PAUSE,
        ModuleCreatureAnimState.READY,
        ModuleCreatureAnimState.TURN_LEFT,
        ModuleCreatureAnimState.TURN_RIGHT
      ];
      if(this.turning !== 0 && stationaryTurnStates.includes(this.animationState.index)){
        const wantTurnLeft = this.turning < 0;
        if(wantTurnLeft && this.animationState.index !== ModuleCreatureAnimState.TURN_LEFT){
          this.setAnimationState(ModuleCreatureAnimState.TURN_LEFT);
        }else if(!wantTurnLeft && this.animationState.index !== ModuleCreatureAnimState.TURN_RIGHT){
          this.setAnimationState(ModuleCreatureAnimState.TURN_RIGHT);
        }
      }else if(this.turning === 0 && (this.animationState.index === ModuleCreatureAnimState.TURN_LEFT || this.animationState.index === ModuleCreatureAnimState.TURN_RIGHT)){
        this.setAnimationState(this.combatData.combatState ? ModuleCreatureAnimState.READY : ModuleCreatureAnimState.PAUSE);
      }

      //Update equipment
      if(this.equipment.HEAD){
        this.equipment.HEAD.update(delta);
      }
      if(this.equipment.ARMS){
        this.equipment.ARMS.update(delta);
      }

      if(this.equipment.RIGHTARMBAND){
        this.equipment.RIGHTARMBAND.update(delta);
      }

      if(this.equipment.LEFTARMBAND){
        this.equipment.LEFTARMBAND.update(delta);
      }

      // Hands: powered/item logic only — model tick is updateWeaponModels after body anim.
      if(this.equipment.RIGHTHAND){
        this.equipment.RIGHTHAND.updatePoweredAnimation?.();
      }

      if(this.equipment.LEFTHAND){
        this.equipment.LEFTHAND.updatePoweredAnimation?.();
      }

      if(this.equipment.ARMOR){
        this.equipment.ARMOR.update(delta);
      }
      
      if(this.equipment.BELT){
        this.equipment.BELT.update(delta);
      }

      if(this.equipment.CLAW1){
        this.equipment.CLAW1.update(delta);
      }

      if(this.equipment.CLAW2){
        this.equipment.CLAW2.update(delta);
      }

      if(this.equipment.CLAW3){
        this.equipment.CLAW3.update(delta);
      }

      // Effects / regen moved to aiUpdate

      if(!this.position.equals(this.lastPosition)){
        this.lastPosition.copy(this.position);
        this.positionChanged = true;
      }

      if(this.positionChanged){
        this.onPositionChanged();
      }
    }else{
      this.updateAnimationState();
      this.updateItems(delta);
      this.updateWeaponModels(delta);
    }

    // Decay stuck timer only when not in contact (MovementCommitter increments while colliding)
    if(!ensureMovementState(this).blockingObject){
      this.collisionTimer -= delta;
      if(this.collisionTimer < 0)
        this.collisionTimer = 0;
    }

    this.force = 0;
  }

  updateRegen(delta = 0){
    this.regenTimer -= delta;
    if(this.regenTimer <= 0){
      this.regenTimer = this.regenTimerMax;

      const regeneration = GameState.SWRuleSet.regenerations[this.combatData.combatState ? 0 : 1];
      if(regeneration){
        if(Number.isFinite(regeneration.forceregen)){
          this.addFP(Math.abs(regeneration.forceregen));
        }

        if(Number.isFinite(regeneration.healthregen) && !GameState.PartyManager.DisableHealthRegen){
          this.addHP(Math.abs(regeneration.healthregen));
        }
      }
    }
  }

  updateActionQueue(delta = 0){
    // AIUpdate always calls RunActions — there is
    // no debilitated early-out. Locomotion is gated in quicktickCreatureWalk / walk tick / move
    // actions; conversation Wait/Resume (k_ptar_calofade after EffectHorrified)
    // must still tick or Pause hangs forever.
    if(!GameState.module.readyToProcessEvents)
      return;

      
    this.actionQueue.process( delta );
    this.action = this.actionQueue[0];
    if(!(this.action)){
      const currentPlayer = GameState.getCurrentPlayer();
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

    if(this.isDead())
      return;

    const str = this.heardStrings[0];
    if(!this.isListening || !str){ return;  }

    // TestListenExpression — scan registered expressions in
    // order; first match wins. No exact-string fast path.
    let patternNum: number | undefined;
    let matchedSubstrings: string[] = [];
    for(let i = 0; i < this.listeningPatterns.length; i++){
      const entry = this.listeningPatterns[i];
      const result = testStringAgainstPattern(entry.pattern, str.string);
      if(result.matched){
        patternNum = entry.number;
        matchedSubstrings = result.substrings;
        break;
      }
    }
    // Always drain the head — unmatched shouts must not stall the queue.
    // BroadcastDialog only enqueues OnDialogue on a match (no backlog).
    drainHeardStringHead(this.heardStrings);
    if(typeof patternNum === 'undefined'){ return; }

    this.onDialog(str.speaker, patternNum, undefined, matchedSubstrings);
  }

  updatePerceptionList(delta = 0){

    if(this.isDead())
      return true;

    if(this.room){
      if(!this.room.model?.userData?.visActive){
        return;
      }
    }

    if(!this.spawned || !GameState.module.readyToProcessEvents){
      return;
    }

    if(this.perceptionTimer < 3){
      this.perceptionTimer += 1 * delta;
      return;
    }

    this.perceptionTimer = 0;

    //Check modules creatures
    const creatures = this.area?.creatures;
    if(!creatures){
      return;
    }
    let creatureLen = creatures.length;
    for(let i = 0; i < creatureLen; i++ ){
      let creature = creatures[i];
      //creature cannot perceive itself
      if(this == creature){
        continue;
      }

      if(creature.isDead()){
        this.notifyPerceptionSeenObject(creature, false);
        continue;
      }

      let distance = this.position.distanceTo(creature.position);
      const stealthed = creature.isStealthedOrInvisible();
      const detected = !stealthed || this.doStealthDetection(creature);
      if(distance < this.getPerceptionRangePrimary() && this.hasLineOfSight(creature) && detected){
        const wasSeen = this.hasSeenObject(creature);
        if(GameState.PartyManager.party.indexOf(this) == -1){
          if(this.isHostile(creature)){
            this.resetExcitedDuration();
          }
        }
        if(
          this == GameState.getCurrentPlayer() &&
          this.isHostile(creature)
        ){
          if(!wasSeen){
            GameState.AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.EnemySighted);
          }
          GameState.AutoPauseManager.RefreshEnemySightedLatch();
        }
        
        this.notifyPerceptionSeenObject(creature, true);
      }else if(distance < this.getPerceptionRangeSecondary() && detected){
        // Listen does not require LOS in; still require contested detect while stealthed
        this.notifyPerceptionSeenObject(creature, false);
        this.notifyPerceptionHeardObject(creature, true);
      }else{
        this.notifyPerceptionSeenObject(creature, false);
      }
    }

    //Check party creatures
    let partyLen = GameState.PartyManager.party.length;
    for(let i = 0; i < partyLen; i++ ){
      let creature = GameState.PartyManager.party[i];
      //creature cannot perceive itself
      if(this == creature){
        continue;
      }

      if(creature.isDead()){
        this.notifyPerceptionSeenObject(creature, false);
        continue;
      }

      let distance = this.position.distanceTo(creature.position);
      const stealthed = creature.isStealthedOrInvisible();
      const detected = !stealthed || this.doStealthDetection(creature);
      if(distance < this.getPerceptionRangePrimary() && this.hasLineOfSight(creature) && detected){
        if(GameState.PartyManager.party.indexOf(this) == -1){
          if(this.isHostile(creature)){
            this.resetExcitedDuration();
          }

          this.notifyPerceptionSeenObject(creature, true);
        }
      }else if(distance < this.getPerceptionRangeSecondary() && detected){
        this.notifyPerceptionSeenObject(creature, false);
        this.notifyPerceptionHeardObject(creature, true);
      }else{
        this.notifyPerceptionSeenObject(creature, false);
      }
    }

    // Passive trap detect — UpdateMineCheck:
    // Awareness + d10 (or d10+10) vs DetectDC; not ActionFlagMine.
    const detectMode = !!this.detectMode;
    const range = detectMode ? 20.0 : 3.0;
    for(let i = 0, triglen = this.area.triggers.length; i < triglen; i++){
      const trig = this.area.triggers[i];
      if(trig.type != ModuleTriggerType.TRAP){ continue; }
      if(trig.trapDetected){ continue; }
      if(!trig.trapDetectable && !(trig.setByPlayerParty && this.isPartyMember())){ continue; }

      const distance = this.position.distanceTo(trig.position);
      if(distance > range){ continue; }

      if(trig.setByPlayerParty && this.isPartyMember()){
        trig.detectTrap(this);
        continue;
      }

      // Hostile / non-friendly traps only (reputation < 90).
      if(typeof (this as any).isHostile === 'function' && !this.isHostile(trig as any)){
        continue;
      }

      const check = resolvePassiveMineDetect(this, trig, { detectMode });
      if(check.result === MineSkillResult.SUCCESS || check.result === MineSkillResult.OWNED){
        trig.detectTrap(this);
        if(
          this == GameState.getCurrentPlayer() &&
          check.result === MineSkillResult.SUCCESS
        ){
          GameState.AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.MineSighted);
        }
      }
    }

  }

  updateCombat(delta = 0){
    // this.combatData.update(delta);
    this.combatRound.update(delta);

    // Schedule with pending work but no ActionCombat (WAITING-splice /
    // ClearAllActions keep-schedule) — restore the dispatcher so drain can resume.
    ensureCombatDispatcher(this);

    if(this.combatData.lastAttackTarget instanceof ModuleObject && this.combatData.lastAttackTarget.isDead()){
      this.combatData.clearTarget(this.combatData.lastAttackTarget);
    }

    if(this.combatData.lastAttacker instanceof ModuleObject && this.combatData.lastAttacker.isDead())
      this.combatData.lastAttacker = undefined;

    if(this.combatData.lastAttemptedAttackTarget instanceof ModuleObject && this.combatData.lastAttemptedAttackTarget.isDead())
      this.combatData.lastAttemptedAttackTarget = undefined;

    if(this.combatData.lastAttemptedSpellTarget instanceof ModuleObject && this.combatData.lastAttemptedSpellTarget.isDead())
      this.combatData.lastAttemptedSpellTarget = undefined;

    if(this.combatData.lastDamager instanceof ModuleObject && this.combatData.lastDamager.isDead())
      this.combatData.lastDamager = undefined;

    if(this.combatData.lastHostileActor instanceof ModuleObject && this.combatData.lastHostileActor.isDead())
      this.assignHostileActor(undefined, true);

    if(this.combatData.lastSpellAttacker instanceof ModuleObject && this.combatData.lastSpellAttacker.isDead())
      this.combatData.lastSpellAttacker = undefined;

    if(this.isDead()){
      this.clearTarget();
      this.combatRound.clearActions();
    }

    // Auto-requeue only for hostile Damage engagement — not flourish (SpellCast reason).
    // QueueAttackActions prefers combat-round sticky / keeps queued
    // actions; never retarget to lastAttacker (who just hit the PC).
    if(this.isHostileCombatEngaged()){
      if(GameState.getCurrentPlayer() == this){
        if(!this.combatRound.scheduledActionList.length && !this.combatRound.action){
          queueAttackActions(this);
        }
      }
    }else if(!this.combatData.combatState){
      if(this.animationState.index == ModuleCreatureAnimState.READY){
        this.setAnimationState(ModuleCreatureAnimState.PAUSE);
      }
    }
  }

  updateCasting(delta = 0){
    // Live spell casts are owned by area.spellInstances (ticked/disposed in ModuleArea).
    // The legacy per-creature casting array is never populated; nothing to tick here.
  }

  clearTarget(){
    this.combatData.lastAttackTarget = undefined;
    this.combatData.lastDamager = undefined;
  }

  actionInRange(action: Action): boolean {
    if(action){
      if(action.type == ActionType.ActionCastSpell){
        const spell = new TalentSpell( action.getParameter(0) );
        const target: ModuleObject = action.getParameter(5);
        if(target instanceof ModuleObject){
          return spell.inRange(target, this);
        }else{
          return true;
        }
      }else if(action.type == ActionType.ActionItemCastSpell){
        const spell = new TalentSpell( action.getParameter(5) );
        const target: ModuleObject = action.getParameter(0);
        if(target instanceof ModuleObject){
          return spell.inRange(target, this);
        }else{
          return true;
        }
      }else if(action.type == ActionType.ActionPhysicalAttacks){
        const target: ModuleObject = action.getParameter(1);
        if(target instanceof ModuleObject){
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
  getBestAttackPoint(targeter: ModuleObject){
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

    if(!(this.model instanceof OdysseyModel3D))
      return;

    let currentAnimation = this.model.getAnimationName();

    // Overlay runs concurrently with drive — never early-return past locomotion.
    if(this.overlayAnimationState.animationName && !this.isDead()){
      const overlayOk = this.overlayAnimationState.animation
        && isAnimation2DAFlagSet(this.overlayAnimationState.animation.overlay);
      if(overlayOk){
        const overlayPlaying = this.model.animationManager?.overlayAnimation?.name?.toLowerCase()
          === this.overlayAnimationState.animationName.toLowerCase();
        if(!this.overlayAnimationState.started){
          this.overlayAnimationState.started = true;
          this.applyOverlayToBodyAndHead(
            this.overlayAnimationState.animationName,
            this.overlayAnimationState.animation
          );
        }else if(!overlayPlaying && !isAnimation2DAFlagSet(this.overlayAnimationState.animation.looping)){
          this.stopOverlayAnimation();
        }
      }else if(this.overlayAnimationState.started){
        this.stopOverlayAnimation();
      }
    }

    // Dialog listen/talk owns the pose while stationary (AnimationDialog drive block).
    if((GameState.Mode == EngineMode.DIALOG) && this.dialogAnimation && !this.speed && !this.isDead())
      return;

    if(this.animationState.animation){
      const desiredName = this.animationState.animation.name?.toLowerCase();
      // During base crossfade, oldest run may still be on the stack; treat desired
      // as playing if any active base run has that name (not only getAnimationName).
      const playingOnStack =
        !!desiredName &&
        !!this.model.animationManager?.hasActiveBaseNamed?.(desiredName);
      const nameMatches =
        !!desiredName &&
        currentAnimation?.toLowerCase() === desiredName;

      if(!nameMatches && !playingOnStack){
        if(!this.animationState.started){
          this.animationState.started = true;
          // Drive loco must loop — animations.2da often leaves walk/run as fireforget=0
          // looping≠1 (e.g. walkSS/runSS), which would end the clip and freeze/slide.
          const isDriveLoco =
            this.animationState.index == ModuleCreatureAnimState.RUNNING ||
            this.animationState.index == ModuleCreatureAnimState.WALKING ||
            this.animationState.index == ModuleCreatureAnimState.WALKING_BACK;
          // Living NPCs holding ActionPlayAnimation(DEAD) need a looping corpse pose.
          const scriptedDeadPose =
            !this.isDead() &&
            (
              this.animationState.index == ModuleCreatureAnimState.DEAD ||
              this.animationState.index == ModuleCreatureAnimState.DEAD1
            );
          let aLooping =
            isDriveLoco ||
            scriptedDeadPose ||
            (
              !this.animationState.animation.fireforget &&
              this.animationState.animation.looping
            );
          this.model.playAnimation(this.animationState.animation.name?.toLowerCase(), aLooping);
          if(this.model.animationManager?.currentAnimationState){
            this.model.animationManager.currentAnimationState.speed =
              this.animationState.speed < 0 ? this.animationState.speed : (this.animationState.speed || 1);
          }
        }else if(
          this.animationState.index == ModuleCreatureAnimState.DIE ||
          this.animationState.index == ModuleCreatureAnimState.DIE1
        ){
          // DIE fireforget finished → DEAD (corpses and living Min1HP scripted defeat).
          // SetAnimation keeps looping DEAD while DIE FAF plays; we promote here.
          const deadPose =
            this.animationState.index == ModuleCreatureAnimState.DIE1
              ? ModuleCreatureAnimState.DEAD1
              : ModuleCreatureAnimState.DEAD;
          this.setAnimationState(deadPose);
          if(this.isDead() || this.willDestroy){
            this.deathAnimationPlayed = true;
          }
        }else if(
          this.animationState.index == ModuleCreatureAnimState.DEAD ||
          this.animationState.index == ModuleCreatureAnimState.DEAD1
        ){
          // Scripted living dead pose — re-loop; never fall through to READY/PAUSE.
          this.animationState.started = false;
        }else if(this.combatData.combatState){
          // GetPauseReadyAnimation while engaged — don't drop to out-of-combat pause.
          if(this.animationState.index == ModuleCreatureAnimState.READY){
            this.animationState.started = false;
          }else{
            this.setAnimationState(ModuleCreatureAnimState.READY);
          }
        }else if(GameState.Mode == EngineMode.DIALOG && this.animationState.index != ModuleCreatureAnimState.PAUSE){
          // SetDialogAnimations owns the pose until the next entry — re-apply
          // looping talk/listen/READY instead of falling through to idle pause.
          this.animationState.started = false;
        }else if(
          (
            this.animationState.index == ModuleCreatureAnimState.RUNNING ||
            this.animationState.index == ModuleCreatureAnimState.WALKING ||
            this.animationState.index == ModuleCreatureAnimState.WALKING_BACK
          ) &&
          (
            (this.playerControl?.lastAnimMoveSpeed ?? 0) > 0 ||
            this.speed > 0
          )
        ){
          // Still driving locomotion — re-play clip; never demote to PAUSE (freeze/slide).
          this.animationState.started = false;
        }else{
          this.setAnimationState(ModuleCreatureAnimState.PAUSE);
        }
      }else if(playingOnStack && !this.animationState.started){
        // Clip already on stack (e.g. crossfade) — mark started without re-play
        this.animationState.started = true;
      }
    }else if(this.isDead() || this.willDestroy){
      if(
        this.animationState.index != ModuleCreatureAnimState.DEAD &&
        this.animationState.index != ModuleCreatureAnimState.DEAD1
      ){
        this.setAnimationState(ModuleCreatureAnimState.DEAD);
        this.deathAnimationPlayed = true;
      }
    }else{
      if(!this.animationMissingLogged){
        this.animationMissingLogged = true;
        // console.error('Animation Missing', this.getTag, this.getName, this.animationState);
      }
      this.setAnimationState(
        this.combatData.combatState ? ModuleCreatureAnimState.READY : ModuleCreatureAnimState.PAUSE
      );
    }

  }

  /**
   * Apply the current drive clip to the skeleton without requiring EngineMode
   * INGAME. loadModel runs under LOADING, where update skips animation — without
   * this, creatures render MDL bind/rest pose until the first real tick.
   */
  primeAnimationPose(){
    if(!(this.model instanceof OdysseyModel3D)){
      return;
    }
    if(!this.animationState.animation){
      this.setAnimationState(
        this.combatData.combatState ? ModuleCreatureAnimState.READY : ModuleCreatureAnimState.PAUSE
      );
    }
    this.updateAnimationState();
    // updateAnimationState may only setAnimationState (started=false) when the
    // clip was missing — drive play + pose on a second pass.
    if(this.animationState.animation && !this.animationState.started){
      this.updateAnimationState();
    }
    if(this.model.bonesInitialized){
      this.model.animateFrame = true;
      this.model.update(0.0000000000000000000001);
    }
  }

  damage(amount = 0, oAttacker: ModuleObject, delayTime = 0){
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
    const attackTargetGone = !(attackTarget instanceof ModuleObject) || attackTarget.isDead();
    const attemptedGone = !(attempted instanceof ModuleObject) || attempted.isDead();
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
    // Creatures: ModuleObject.JumpToLocation runs ActionJumpToPoint → applyLocalTeleport.
    // Placement via teleport / settleWalkableAttachment — not a locomotion solver.
    super.JumpToLocation(lLocation);
  }

  /**
   * Enqueue MoveToPoint. AddMoveToPointAction: timeout 0 = no
   * Jump fallback (ActionMoveTo*); timeout > 0 = ForceMove jump-on-expiry.
   * Arrive range: max(script fRange, GetUseRange) — ExecuteCommandMoveToObject.
   */
  moveToObject(target: ModuleObject, bRun = true, distance = 1.0, timeout = 0){

    if(target instanceof ModuleObject){
      // attempted-move object id (GetAttemptedMovementTarget)
      this.attemptedMovementTarget = target;

      let action = new GameState.ActionFactory.ActionMoveToPoint();
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

  detachFromRoom(room: ModuleRoom): void {
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
        let action = new GameState.ActionFactory.ActionMoveToPoint();
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
  moveToLocation(target: ModuleObject|EngineLocation, bRun = true, timeout = 0){

    if(target instanceof EngineLocation || target instanceof ModuleObject){

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
      for(let i = 0; i < GameState.PartyManager.party.length; i++){
        let creature = GameState.PartyManager.party[i];
        if(this == creature)
          continue;

        let d = target.position.distanceTo(creature.position);
        if(d < 1.0){
          distance = 2.0;
        }
      }

      let action = new GameState.ActionFactory.ActionMoveToPoint();
      action.setParameter(0, ActionParameterType.FLOAT, target.position.x);
      action.setParameter(1, ActionParameterType.FLOAT, target.position.y);
      action.setParameter(2, ActionParameterType.FLOAT, target.position.z);
      action.setParameter(3, ActionParameterType.DWORD, this.area?.id ?? target.area?.id ?? 0);
      action.setParameter(4, ActionParameterType.DWORD, target instanceof EngineLocation ? ModuleObjectConstant.OBJECT_INVALID : target.id );
      action.setParameter(5, ActionParameterType.INT, bRun ? 1 : 0);
      action.setParameter(6, ActionParameterType.FLOAT, Math.max(1.5, distance));
      action.setParameter(7, ActionParameterType.INT, 0);
      action.setParameter(8, ActionParameterType.FLOAT, timeout > 0 ? timeout : 0);
      this.actionQueue.add(action);

    }

  }

  jumpToObject(target: ModuleObject, bWalkStraight: number = 1){
    if(target instanceof ModuleObject){

      let action = new GameState.ActionFactory.ActionJumpToObject();
      action.setParameter(0, ActionParameterType.DWORD, target.id );
      // bWalkStraight → open/safe walk location requireLOS (default TRUE)
      action.setParameter(1, ActionParameterType.INT, bWalkStraight | 0);
      this.actionQueue.add(action);

    }

  }

  jumpToLocation(target: EngineLocation){
    if(target instanceof EngineLocation){
      let action = new GameState.ActionFactory.ActionJumpToPoint();
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
    const wasCombat = this.combatData.combatState;
    this.setCombatState(true, reason);
    this.setExcitedState(reason);
    // ActionMenuAttack / engage → client SetCombatMode(1)
    setClientCombatMode(this, true);
    // RemoveCombatInvisibilityEffects on hostile engagement
    if(!wasCombat){
      this.removeCombatInvisibilityEffects();
    }
  }

  /**
   * BroadcastCombatStateToParty.
   * Refreshes SetCombatState(1) on self when hostile to `other` (or `other` is self),
   * then party/faction mates in spot range get SetCombatState + SetExcitedState(Damage).
   * Used on attack start and OnPhysicalAttacked (including misses).
   */
  broadcastCombatStateToParty(other?: ModuleObject){
    const otherCreature = isCreature(other)
      ? (other as ModuleCreature)
      : undefined;

    const combatReasonFor = (subject: ModuleCreature): ExcitedDurationRow => {
      if(!otherCreature){
        return ExcitedDurationRow.SpellCast;
      }
      // BroadcastCombatStateToParty
      // reason 1 (Damage) when other's last attack/spell target is subject.
      const data = otherCreature.combatData;
      if(
        data.lastAttackTarget === subject ||
        data.lastSpellTarget === subject ||
        data.lastAttemptedAttackTarget === subject ||
        data.lastAttemptedSpellTarget === subject
      ){
        return ExcitedDurationRow.Damage;
      }
      return ExcitedDurationRow.SpellCast;
    };

    const selfOrMissing = !other || other === this;
    const hostileToOther = !!other && this.getReputation(other) < 11;
    if(selfOrMissing || hostileToOther){
      this.setCombatState(true, combatReasonFor(this));
    }

    if(this.plot){
      return;
    }

    const members: ModuleCreature[] = (this.isPartyMember() || this.faction?.id === 0)
      ? GameState.PartyManager.party
      : (this.faction?.creatures ?? []);

    for(let i = 0; i < members.length; i++){
      const member = members[i];
      if(!member || member.isDead()){
        continue;
      }

      const range = typeof member.getPerceptionRangePrimary === 'function'
        ? member.getPerceptionRangePrimary()
        : this.getPerceptionRangePrimary();
      const dx = this.position.x - member.position.x;
      const dy = this.position.y - member.position.y;
      const dz = this.position.z - member.position.z;
      if(dx * dx + dy * dy + dz * dz > range * range){
        continue;
      }

      // : GetReputation(member, arg1) < 11 — skip when other is self/friendly
      if(other && member.getReputation(other) >= 11){
        continue;
      }
      if(!other){
        continue;
      }

      member.setCombatState(true, combatReasonFor(member));
      member.setExcitedState(ExcitedDurationRow.Damage);
    }
  }

  /**
   * ResolveInitiative
   * sets = (== 0) — non-party AI refresh flag.
   */
  resolveInitiative(){
    // Party / player-UI creatures  → 0; others → 1
    this.combatAiRefreshPending = GameState.PartyManager?.party?.indexOf(this) < 0;
    if(!this.combatData.combatState){
      this.setCombatState(true, ExcitedDurationRow.SpellCast);
    }
  }

  /**
   * Compatibility wrapper — physical engagement uses Damage row.
   */
  resetExcitedDuration(){
    this.setCombatEngaged(ExcitedDurationRow.Damage);
  }

  /**
   * SetCombatState.
   * Active → refresh 8000ms timer; inactive → clear combat engagement.
   */
  setCombatState(active: boolean, reason: number = ExcitedDurationRow.Damage){
    if(!active){
      this.combatData.combatState = false;
      this.combatStateTimer = 0;
      this.combatStateReason = 0;
      // SetCombatState(0) clears attempted/current attack+spell targets
      this.combatData.lastAttemptedAttackTarget = undefined;
      this.combatData.lastAttackTarget = undefined;
      this.combatData.lastAttemptedSpellTarget = undefined;
      this.combatData.lastSpellTarget = undefined;
      // SetCombatState(0): ClearAllAttacks + RemoveAllActions, then
      // end combat round if a round is in progress. Mirrors combat-round teardown here.
      if(this.combatRound){
        if(this.combatRound.specialAttackList){
          this.combatRound.specialAttackList.length = 0;
        }
        this.combatRound.clearActions();
        if(this.combatRound.roundStarted){
          this.combatRound.endCombatRound({ skipQueueAttackActions: true });
        }
      }
      // Client combat camera follows SetCombatMode, not SetCombatState.
      return;
    }
    this.combatData.combatState = true;
    this.combatStateTimer = COMBAT_STATE_DURATION_MS;
    // : Damage reason (1) sticks; SpellCast (2) does not overwrite it.
    if(this.combatStateReason !== ExcitedDurationRow.Damage){
      this.combatStateReason = reason;
    }
  }

  /**
   * SetExcitedState — only extend if new DURATION is greater.
   * When extended for a client-controlled creature with GetNearestEnemy(30) present,
   * calls area PlayBattleMusic(1).
   */
  setExcitedState(row: ExcitedDurationRow | number){
    const duration = getExcitedDurationMs(row);
    if(duration <= this.excitedDuration){
      return;
    }
    this.excitedDuration = duration;
    // : GetClientObjectByObjectId must succeed (controlled PC)
    if(this !== GameState.getCurrentPlayer()){
      return;
    }
    const area = this.area;
    if(!area){
      return;
    }
    // GetNearestEnemy(this, 30.0, OBJECT_INVALID, OBJECT_INVALID)
    if(getNearestEnemy(this, 30)){
      area.playBattleMusic(true);
    }
  }

  /**
   * RemoveCombatInvisibilityEffects
   * strip INVISIBILITY when int[0]==1 and all SANCTUARY.
   */
  removeCombatInvisibilityEffects(){
    const effects = this.effects ? this.effects.slice() : [];
    for(let i = 0; i < effects.length; i++){
      const e = effects[i];
      if(!e) continue;
      if(e.type === GameEffectType.EffectInvisibility && e.getInt(0) === 1){
        this.removeEffect(e);
      }else if(e.type === GameEffectType.EffectSanctuary){
        this.removeEffect(e);
      }
    }
    if(this.stealthMode){
      this.stealthMode = false;
    }
  }

  cancelExcitedDuration(){
    const hadExcited = this.excitedDuration > 0;
    this.excitedDuration = 0;
    if(hadExcited && this === GameState.getCurrentPlayer() && this.area){
      this.area.playBattleMusic(false);
    }
  }

  /**
   * AIUpdate combat-state tick — countdown to SetCombatState(0).
   * While still closing on a living combat target (PhysicalAttacks / chase Move),
   * refresh the 8000ms timer instead of wiping the combat schedule mid-approach.
   */
  updateCombatStateTimer(delta = 0){
    if(this.instantItemCooldownMs > 0){
      this.instantItemCooldownMs = Math.max(0, this.instantItemCooldownMs - (1000 * delta));
    }
    if(this.isDead()){
      if(this.combatData.combatState){
        this.cancelCombat();
      }
      return;
    }
    if(!this.combatData.combatState) return;
    this.combatStateTimer -= (1000 * delta);
    if(this.combatStateTimer <= 0){
      if(this.isActivelyPursuingCombatTarget()){
        this.combatStateTimer = COMBAT_STATE_DURATION_MS;
        return;
      }
      this.setCombatState(false, this.combatStateReason);
      if(this.animationState.index == ModuleCreatureAnimState.READY){
        this.setAnimationState(ModuleCreatureAnimState.PAUSE);
      }
      this.weaponPowered(false);
    }
  }

  /**
   * True when a living combat target remains and the action queue / round is
   * still pursuing it (prevents 8s SetCombatState(0) during long approaches).
   */
  isActivelyPursuingCombatTarget(): boolean {
    if(!hasLivingCombatTarget(this)){
      return false;
    }
    if(this.combatRound?.action?.target && !this.combatRound.action.target.isDead?.()){
      return true;
    }
    const queue = this.actionQueue;
    if(!queue?.length){
      return false;
    }
    for(let i = 0; i < queue.length; i++){
      const action = queue[i];
      if(!action) continue;
      if(action.type === ActionType.ActionPhysicalAttacks){
        return true;
      }
      if(action.type === ActionType.ActionMoveToPoint){
        const moveTarget = action.getParameter?.(4);
        if(
          moveTarget &&
          (
            moveTarget === this.combatData.lastAttackTarget ||
            moveTarget === this.combatData.lastAttemptedAttackTarget ||
            moveTarget === this.combatRound?.action?.target ||
            moveTarget === this.combatRound?.newAttackTarget
          )
        ){
          return true;
        }
      }
    }
    return false;
  }

  /**
   * UpdateExcitedStateTimer — battle music timer only (not stance).
   * On expiry for a client-controlled creature → PlayBattleMusic(0).
   */
  updateExcitedDuration(delta = 0){
    if(this.isDead()){
      if(this.excitedDuration > 0){
        this.excitedDuration = 0;
        if(this === GameState.getCurrentPlayer() && this.area){
          this.area.playBattleMusic(false);
        }
      }
      return;
    }
    if(this.excitedDuration > 0){
      this.excitedDuration -= (1000 * delta);
      if(this.excitedDuration <= 0){
        this.excitedDuration = 0;
        if(this === GameState.getCurrentPlayer() && this.area){
          this.area.playBattleMusic(false);
        }
      }
    }
  }

  isDueling(): boolean {
    if(!(BitWise.InstanceOf(this.combatData.lastAttackTarget?.objectType, ModuleObjectType.ModuleCreature))) return false;
    const target = this.combatData.lastAttackTarget as ModuleCreature;
    if(target.combatData.lastAttackTarget != this) return false;
    return resolveChoreographedState(this, target);
  }

  /** ResolveChoreographedState weapon gate (excludes stun baton / ranged). */
  isDuelingWeaponEquipped(){
    return isChoreographedMeleeWeapon(this);
  }

  isDuelingObject( oObject: ModuleObject ){
    if(!(oObject instanceof ModuleObject)) return false;
    if(this.combatData.lastAttackTarget != oObject) return false;
    if(oObject.combatData.lastAttackTarget != this) return false;
    return resolveChoreographedState(this, oObject);
  }

  /**
   * Queue a normal attack (or feat attack). CutsceneAttack uses
   * {@link addCutsceneAttackActions} instead.
   */
  attackCreature(
    target: ModuleObject, feat?: TalentFeat, _isCutsceneAttack = false,
    attackDamage = 0, attackAnimation?: number | string, attackResult?: AttackResult
  ){
    // Legacy CutsceneAttack callers still pass the 3rd-arg true path
    if(_isCutsceneAttack){
      const animRow = typeof attackAnimation === 'number'
        ? attackAnimation
        : -1;
      this.addCutsceneAttackActions(
        target,
        animRow,
        attackResult ?? AttackResult.MISS,
        attackDamage
      );
      return;
    }

    if(target == undefined)
      return;

    if(target == this)
      target = GameState.PartyManager.party[0];

    if(target.isDead())
      return;

    // AddAttackActions — sticky GetAttemptedAttackTarget
    this.combatData.setAttemptedAttackTargetIfInvalid(target);

    let combatAction = new CombatRoundAction();
    combatAction.actionType = CombatActionType.ATTACK;
    combatAction.target = target;
    combatAction.animation = ModuleCreatureAnimState.ATTACK;
    combatAction.animationTime = 1500;

    if(feat){
      combatAction.actionType = CombatActionType.ATTACK_USE_FEAT;
      combatAction.setFeat(feat);
    }

    this.combatRound.addAction(combatAction);

    // AddAttackActions → BroadcastCombatStateToParty(this, this.id)
    this.broadcastCombatStateToParty(this);
    // ActionMenuAttack → SetCombatMode(1) on the attacker
    setClientCombatMode(this, true);

    if(!this.actionQueue.actionTypeExists(ActionType.ActionCombat)){
      const action = new GameState.ActionFactory.ActionCombat(0xFFFF);
      this.actionQueue.add(action);
    }

  }

  /**
   * queue cutscene attacks
   * queue cutscene attack.
   */
  addCutsceneAttackActions(
    target: ModuleObject,
    animationRow: number,
    attackResult: AttackResult,
    damage: number
  ){
    // passes oTarget through; ResolveAttack filters creature/door/placeable
    if(!target){
      return;
    }

    this.combatData.setAttemptedAttackTargetIfInvalid(target);

    const combatAction = new CombatRoundAction(this);
    combatAction.actionType = CombatActionType.ATTACK;
    combatAction.target = target;
    // animation_id = 0x2719 (ATTACK)
    combatAction.animation = ModuleCreatureAnimState.ATTACK;
    // (combatStretch + 3000) / 2 — stretch defaults to 0
    combatAction.animationTime = Math.floor((0 + CombatRound.ROUND_LENGTH) / 2);
    combatAction.resultsCalculated = true;
    combatAction.attackAnimation = animationRow | 0;
    combatAction.attackResult = attackResult;
    combatAction.attackDamage = damage | 0;

    const row = resolveAnimations2DARow(combatAction.attackAnimation);
    if(row?.name){
      combatAction.animationName = String(row.name);
      combatAction.swAnimation = OdysseyModelAnimation.GetAnimation2DA(combatAction.animationName);
    }

    this.combatRound.addAction(combatAction);

    // : no BroadcastCombatStateToParty on cutscene path
    // internal field==0 (PC) + client object: transient AI refresh + ClearAllActions(1)
    if(this.isPC){
      this.refreshTransientAIState();
      this.clearAllActions(true);
    }

    if(!this.actionQueue.actionTypeExists(ActionType.ActionCombat)){
      const action = new GameState.ActionFactory.ActionCombat(0xFFFF);
      this.actionQueue.add(action);
    }
  }

  /**
   * AddCutsceneMoveActions
   * AddCutsceneMoveActions.
   */
  addCutsceneMoveActions(
    destObject: ModuleObject | undefined,
    position: { x: number; y: number; z: number },
    shouldRun: number
  ){
    const combatAction = new CombatRoundAction(this);
    combatAction.actionType = CombatActionType.ATTACK_CUTSCENE_MOVE;
    combatAction.target = destObject;
    combatAction.moveToPosition = {
      x: position.x,
      y: position.y,
      z: position.z,
    };
    combatAction.shouldRun = shouldRun ? 1 : 0;

    this.combatRound.addAction(combatAction);

    // AddCutsceneMoveActions — same PC ClearAllActions(1) gate as attack
    if(this.isPC){
      this.refreshTransientAIState();
      this.clearAllActions(true);
    }

    if(!this.actionQueue.actionTypeExists(ActionType.ActionCombat)){
      const action = new GameState.ActionFactory.ActionCombat(0xFFFF);
      this.actionQueue.add(action);
    }
  }

  /**
   * Refresh transient AI action tracking, then rescan the action list.
   * Full per-action reverse is deferred; ClearAllActions(1) follows immediately
   * on the cutscene path.
   */
  refreshTransientAIState(){
    // Placeholder for transient AI field reset + action walk.
  }

  /**
   * NWScript ActionUseTalentOnObject — talent.objectType is a bitfield
   * (TalentObject|Spell/Feat/Skill), not a 0/1/2 enum.
   */
  useTalent(talent: TalentObject, oTarget: ModuleObject): Action {
    let action: Action;
    if(!(talent instanceof TalentObject)){
      return action;
    }

    if((talent.objectType & TalentObjectType.TalentSpell) !== 0){
      (talent as TalentSpell).useTalentOnObject(oTarget, this);
      return action;
    }

    if((talent.objectType & TalentObjectType.TalentFeat) !== 0){
      const combatAction = new CombatRoundAction();
      combatAction.actionType = CombatActionType.ATTACK_USE_FEAT;
      combatAction.target = oTarget;
      combatAction.setFeat(talent as TalentFeat);
      this.combatRound.addAction(combatAction);
      if(!this.actionQueue.actionTypeExists(ActionType.ActionCombat)){
        this.actionQueue.add(new GameState.ActionFactory.ActionCombat(0xFFFF));
      }
      return action;
    }

    if((talent.objectType & TalentObjectType.TalentSkill) !== 0){
      if(talent.id == 6){ //Security
        action = new GameState.ActionFactory.ActionUnlockObject();
        action.setParameter(0, ActionParameterType.DWORD, oTarget.id || ModuleObjectConstant.OBJECT_INVALID);
        this.actionQueue.add(action);
      }
    }
    return action;
  }

  getDebilitatedState(): number {
    // Prefer highest SetState (priority).
    if(isCreature(this)){
      const highest = getActiveSetStateType(this as ModuleCreature);
      if(highest > 0) return highest;
      // ambient_animation_state = 9 while force-pushed.
      const ambient = (this as ModuleCreature).ambientAnimState | 0;
      if(ambient === ModuleCreatureAmbientState.PRONE_FORCE_PUSHED){
        return GameEffectSetStateType.FORCEPUSH;
      }
    }
    const e = this.effects.find(eff => eff?.type == GameEffectType.EffectSetState);
    return e ? (e.getInt(0) | 0) : 0;
  }

  animationConstantToAnimation( animation_constant = 10000 ): SWAnimation | undefined {
    const animations = GameState.SWRuleSet.animations;

    const debilitated = resolveDebilitatedCreatureAnimation(
      this.getDebilitatedState(),
      {
        simple: this.isSimpleCreature(),
        fp_push_played: this.fp_push_played,
        fp_land_played: this.fp_land_played,
        fp_getup_played: this.fp_getup_played,
      },
      animations,
    );
    if(debilitated !== undefined){
      return debilitated;
    }

    return resolveCreatureAnimation(
      animation_constant,
      this.getAnimationResolveContext(),
      animations,
    );
  }

  private getAnimationResolveContext(): CreatureAnimationContext {
    return {
      simple: this.isSimpleCreature(),
      injured: this.isInjured(),
      poisoned: this.isPoisoned(),
      diseased: this.isDiseased(),
      weaponType: this.getCombatAnimationWeaponType(),
    };
  }

  setAnimationState(animState: ModuleCreatureAnimState){
    if(!animState){ return; }

    // SetAnimation — insert DIE/DIE1 before looping DEAD.
    animState = ModuleCreature.resolveEnterDeadTransition(animState, this.animationState?.index);

    this.animationState.index = animState;
    this.animationState.animation = this.animationConstantToAnimation(animState);
    this.animationState.started = false;
    if(this.animationState.animation){
      this.animationMissingLogged = false;
    }
  }
  
  resetAnimationState(){
    this.animationState = {
      index: ModuleCreatureAnimState.PAUSE,
      animation: undefined,
      started: false,
      speed: 1,
    }
  }

  playTwoDAAnimation(animation: SWAnimation){
    if(animation){
      // combat/cutscene swings use SetAnimation — clear dialog slot so
      // updateAnimationState is not blocked by a lingering dialog READY pose.
      this.dialogAnimation = null;
      this.resetAnimationState();
      this.animationState = {
        index: ModuleCreatureAnimState.PAUSE,
        animation: animation,
        started: false,
        speed: 1,
      }
    }
  }

  playOverlayAnimation(NWScriptAnimId = -1){
    this.resetOverlayAnimationState();
    let animationName = '';
    switch(NWScriptAnimId){
      case 123:
        animationName = 'diveroll';
      break;
      default:
        if(NWScriptAnimId >= 10000){
          const row = this.animationConstantToAnimation(NWScriptAnimId);
          if(row?.name){
            animationName = row.name.toLowerCase();
          }
        }
      break;
    }

    if(!animationName){ return; }

    const anim = OdysseyModelAnimation.GetAnimation2DA(animationName);
    const mode = resolvePlaybackMode(NWScriptAnimId, anim);
    if(mode === AnimationPlaybackMode.OVERLAY || (anim && isAnimation2DAFlagSet(anim.overlay))){
      this.overlayAnimationState.animationIndex = NWScriptAnimId;
      this.overlayAnimationState.animationName = animationName;
      this.overlayAnimationState.animation = anim;
      this.overlayAnimationState.stopFlag = resolveOverlayStopFlags(NWScriptAnimId);
      this.overlayAnimationState.started = false;
    }else if(anim){
      // Non-overlay NWScript overlay opcode still falls through to base play.
      this.playTwoDAAnimation(anim);
    }
  }

  /**
   * SetOverlayAnimation — body + head Gobs.
   */
  applyOverlayToBodyAndHead(name: string, data: SWAnimation){
    const flags = resolveOverlayStartFlags(this.overlayAnimationState?.animationIndex || 0);
    if(this.model instanceof OdysseyModel3D){
      this.model.playOverlayAnimation(name, data, flags);
    }
    if(this.head instanceof OdysseyModel3D){
      this.head.playOverlayAnimation(name, data, flags);
    }
  }

  /**
   * Stop overlay runs (dialog end / pose change). Uses stop flags 0x80 / 0x400.
   */
  stopOverlayAnimation(){
    const stopFlag = this.overlayAnimationState.stopFlag || 0x80;
    if(this.model instanceof OdysseyModel3D){
      this.model.animationManager?.stopOverlayAnimation(stopFlag);
    }
    if(this.head instanceof OdysseyModel3D){
      this.head.animationManager?.stopOverlayAnimation(stopFlag);
    }
    this.resetOverlayAnimationState();
  }

  /**
   * Apply a server animation ID using ResolvePlaybackMode (modes 0/1/2).
   */
  applyAnimationByMode(serverId: number, speed: number = 1){
    if(!serverId){ return; }
    const twoDA = this.animationConstantToAnimation(serverId);
    const mode = resolvePlaybackMode(serverId, twoDA);
    if(mode === AnimationPlaybackMode.OVERLAY){
      if(twoDA?.name){
        this.overlayAnimationState = {
          animationIndex: serverId,
          animationName: twoDA.name.toLowerCase(),
          animation: twoDA,
          started: false,
          speed: speed || 1,
          stopFlag: resolveOverlayStopFlags(serverId),
        };
      }
      return;
    }
    if(mode === AnimationPlaybackMode.REVERSE){
      this.setAnimationState(serverId as ModuleCreatureAnimState);
      this.animationState.speed = speed >= 0 ? -Math.abs(speed || 1) : speed;
      return;
    }
    // Mode 2 — weapon-primary clips prefer item Gob when equipped.
    if(twoDA?.name && String((twoDA as any).weapon) === '1'){
      this.startWeaponGesture(twoDA.name.toLowerCase(), this.getAnimationLength(serverId) || 1.5);
    }
    this.setAnimationState(serverId as ModuleCreatureAnimState);
    this.animationState.speed = speed || 1;
  }
  
  resetOverlayAnimationState(){
    this.overlayAnimationState = {
      animationIndex: -1,
      animationName: '',
      animation: undefined,
      started: false,
      speed: 1,
      stopFlag: 0x80,
    }
  }

  resetGestureState(){
    this.gestureState = {
      serverId: -1,
      animation: undefined,
      started: false,
      remaining: 0,
      active: false,
    };
  }

  resetWeaponGestureState(){
    this.weaponGestureState = {
      animationName: '',
      remaining: 0,
      active: false,
    };
  }

  /**
   * Play flourish clip on equipped weapon Gobs.
   * Does not schedule PowerItem off — sabers stay ignited until combat state expires.
   */
  startWeaponGesture(clipName: string, durationSec: number){
    if(!clipName){ return; }
    let played = false;
    if(this.equipment.RIGHTHAND?.playWeaponGesture(clipName)){ played = true; }
    if(this.equipment.LEFTHAND?.playWeaponGesture(clipName)){ played = true; }
    // Only arm the timer when a clip actually played on an item Gob.
    if(!played){ return; }
    this.weaponGestureState = {
      animationName: clipName,
      remaining: Math.max(durationSec, 0.1),
      active: true,
    };
  }

  dialogPlayOdysseyAnimation(anim: OdysseyModelAnimation, animationId: number = -1){
    console.log('dialogPlayOdysseyAnimation', anim)
    if(!this.model){ 
      console.warn('dialogPlayOdysseyAnimation failed');
      console.log(this, anim);
      return; 
    }
    // IsLoopingDialogStuntAnimation — l/wl CUT ids loop.
    const looping = animationId > 0x577 && animationId < 0x6c0;
    this.dialogAnimation = {
      animation: anim,
      data: {
        fireforget: looping ? 0 : 1,
        looping: looping ? 1 : 0
      } as any,
      started: false,
    };
  }

  dialogPlayAnimation(data: SWAnimation = {} as SWAnimation){
    console.log('dialogPlayAnimation', data)
    if(!this.model){ 
      console.warn('dialogPlayAnimation failed');
      console.log(this, data);
      return; 
    }
    this.dialogAnimation = { 
      animation: this.model.odysseyAnimationMap.get(data.name.toLowerCase().trim()),
      data: data,
      started: false,
    };
  }

  /**
   * CancelCombat.
   * ClearAllActions(1) → SetCombatState(0) → assign hostile actor(INVALID) →
   * ClearHostileActionsVersus(null) → end combat round → client SetCombatMode(0).
   */
  cancelCombat(){
    this.clearAllActions(true);
    // Heavy SetCombatState(0) already clears combat-round attacks/actions + ends the round.
    this.setCombatState(false);
    this.clearTarget();
    // assign hostile actor(INVALID, force)
    this.assignHostileActor(undefined, true);
    // ClearHostileActionsVersus(null): drop every queued hostile action group.
    this.clearHostileActionsVersus(undefined);
    if(this.combatRound){
      if(this.combatRound.roundStarted){
        this.combatRound.endCombatRound({ skipQueueAttackActions: true });
      }
      this.combatRound.clearActions();
    }
    // Client SetCombatMode(0) — UI/camera bit (distinct from stance clearCombatMode).
    setClientCombatMode(this, false);
    // Stance / CounterSpell activity bits.
    this.clearCombatMode();
    this.resetOverlayAnimationState();
    if(this.animationState.index == ModuleCreatureAnimState.READY){
      this.setAnimationState(ModuleCreatureAnimState.PAUSE);
    }
  }

  /**
   * SurrenderToEnemies.
   * @param retainSelfBuffs - 1 for SurrenderRetainBuffs (keep self-created effects)
   */
  surrenderToEnemies(retainSelfBuffs: boolean = false){
    this.cancelCombat();
    this.clearAllEffects(retainSelfBuffs);

    // walks area game_objects (GetCreatureByGameObjectID). Party members
    // are removed from area.creatures on join — include them like GetObjectsInShape.
    const nearby = ModuleCreature.collectSurrenderNearbyCreatures(
      this.area?.creatures,
      GameState.PartyManager?.party,
    );

    if(nearby.length){
      const origin = this.position;
      const radiusSq = 250 * 250; // 62500 — not the NWScript 10m comment
      for(let i = 0; i < nearby.length; i++){
        const other = nearby[i];
        if(!other || other === this) continue;
        const dx = other.position.x - origin.x;
        const dy = other.position.y - origin.y;
        const dz = other.position.z - origin.z;
        if(dx * dx + dy * dy + dz * dz > radiusSq) continue;
        // GetReputation(self, other) < 11
        if(this.getReputation(other) >= 11) continue;
        other.cancelCombat();
        other.clearAllEffects(retainSelfBuffs);
      }
    }

    // AddMember to FactionManager's primary faction (repute row 0 = Player)
    const playerFaction = GameState.FactionManager?.factions?.get(0);
    if(playerFaction && this.faction !== playerFaction){
      this.faction?.removeMember?.(this);
      this.faction = playerFaction;
      this.factionId = playerFaction.id;
      playerFaction.addMember(this);
    }
  }

  /**
   * ClearVisibleList + UpdateVisibleList(0)
   * used by ChangeFactionByFaction after AddMember.
   */
  clearVisibleList(){
    this.perceptionList = [];
    // Force UpdateVisibleList on next tick (bypass 3s throttle)
    this.perceptionTimer = 3;
    this.updatePerceptionList(0);
  }

  /**
   * ClearHostileActionsVersus
   * drop queued action groups whose head is a hostile action (Attack 0xC
   * CastSpell 0xF / ItemCastSpell 0x2E). When `versus` is provided the group
   * must also target it; when omitted (null) every hostile group is dropped.
   */
  clearHostileActionsVersus(versus?: ModuleCreature){
    if(!this.actionQueue?.length) return;
    const hostileTypes = [
      ActionType.ActionPhysicalAttacks,
      ActionType.ActionCastSpell,
      ActionType.ActionItemCastSpell,
    ];
    const groups = new Set<number>();
    for(let i = 0; i < this.actionQueue.length; i++){
      const action = this.actionQueue[i];
      if(!action) continue;
      if(!hostileTypes.includes(action.type)) continue;
      if(!versus){
        groups.add(action.groupId);
        continue;
      }
      if(!action.parameters?.length) continue;
      for(let p = 0; p < action.parameters.length; p++){
        if(action.getParameter(p) === versus){
          groups.add(action.groupId);
          break;
        }
      }
    }
    if(!groups.size) return;
    for(let i = this.actionQueue.length - 1; i >= 0; i--){
      if(groups.has(this.actionQueue[i].groupId)){
        this.actionQueue.splice(i, 1);
      }
    }
  }

  /**
   * PacifyCreature
   * area creatures that have this as a combat/hostile ref leave combat vs us.
   */
  pacifyCreature(){
    const area = this.area;
    if(!area?.creatures?.length) return;

    for(let i = 0; i < area.creatures.length; i++){
      const other = area.creatures[i];
      if(!other || other === this) continue;

      const cd = other.combatData;
      const engaged =
        cd.lastAttackTarget === this ||
        cd.lastAttemptedAttackTarget === this ||
        cd.lastAttacker === this ||
        cd.lastDamager === this ||
        cd.lastHostileActor === this ||
        cd.lastSpellTarget === this ||
        cd.lastAttemptedSpellTarget === this ||
        cd.lastSpellAttacker === this;

      if(!engaged) continue;

      other.setCombatState(false);
      if(cd.lastAttackTarget === this || cd.lastAttemptedAttackTarget === this){
        other.clearTarget();
      }
      if(cd.lastAttacker === this) cd.lastAttacker = undefined;
      if(cd.lastDamager === this) cd.lastDamager = undefined;
      if(cd.lastHostileActor === this) other.assignHostileActor(undefined, true);
      if(cd.lastSpellTarget === this) cd.lastSpellTarget = undefined;
      if(cd.lastAttemptedSpellTarget === this) cd.lastAttemptedSpellTarget = undefined;
      if(cd.lastSpellAttacker === this) cd.lastSpellAttacker = undefined;
      other.clearHostileActionsVersus(this);
    }
  }

  getModelAnimationByName( name: string ): OdysseyModelAnimation {
    return this.model.odysseyAnimationMap.get(name.toLowerCase().trim());
  }

  getDamageAnimation( attackAnimName: string ): SWAnimation {

    const attackAnimNamel = attackAnimName.toLowerCase().trim();
    
    let attackAnimIndex = -1;

    let modeltype = this.creatureAppearance.modeltype;
    let weaponWield = this.getCombatAnimationWeaponType();
    // Heavy (9) shares g7* clips / combatanimations *7 columns with rifle.
    const clipDigit = combatReactionClipDigit(weaponWield);
    
    const attackAnim = GameState.SWRuleSet.animationNameMap.get(attackAnimNamel);

    const combatAnimation = attackAnim?.combatAnimation;
    if(combatAnimation){
      const damageAnimID = combatAnimation.getDamageAnimation(weaponWield);
      const damageAnim = GameState.SWRuleSet.animationIdMap.get(damageAnimID);
      if(damageAnim && this.getModelAnimationByName(damageAnim.name)){
        return OdysseyModelAnimation.GetAnimation2DA(damageAnim.name);
      }
    }

    switch(modeltype){
      case 'S':
      case 'L':
        return OdysseyModelAnimation.GetAnimation2DA('cdamages')
          || this.animationConstantToAnimation(ModuleCreatureAnimState.DAMAGE);
    }
    //console.log(attackAnim);
    
    switch((attackAnimName || '').toLowerCase()){
      case 'c2a1':
        return OdysseyModelAnimation.GetAnimation2DA('c2d1')
          || this.animationConstantToAnimation(ModuleCreatureAnimState.DAMAGE);
      case 'c2a2':
        return OdysseyModelAnimation.GetAnimation2DA('c2d2')
          || this.animationConstantToAnimation(ModuleCreatureAnimState.DAMAGE);
      case 'c2a3':
        return OdysseyModelAnimation.GetAnimation2DA('c2d3')
          || this.animationConstantToAnimation(ModuleCreatureAnimState.DAMAGE);
      case 'c2a4':
        return OdysseyModelAnimation.GetAnimation2DA('c2d4')
          || this.animationConstantToAnimation(ModuleCreatureAnimState.DAMAGE);
      case 'c2a5':
        return OdysseyModelAnimation.GetAnimation2DA('c2d5')
          || this.animationConstantToAnimation(ModuleCreatureAnimState.DAMAGE);
    }

    return OdysseyModelAnimation.GetAnimation2DA('g'+clipDigit+'d1')
      || this.animationConstantToAnimation(ModuleCreatureAnimState.DAMAGE);

  }

  getDodgeAnimation( attackAnimName: string ): SWAnimation {

    const attackAnimNamel = attackAnimName.toLowerCase().trim();

    const modeltype = this.creatureAppearance.modeltype;
    const attackKey = this.getCombatAnimationAttackType();
    const weaponWield = this.getCombatAnimationWeaponType();
    const clipDigit = combatReactionClipDigit(weaponWield);
    
    const attackAnim = GameState.SWRuleSet.animationNameMap.get(attackAnimNamel);

    const combatAnimation = attackAnim?.combatAnimation;
    if(combatAnimation){
      if(combatAnimation.hits == 1 && [4, 2, 3].indexOf(weaponWield) >= 0){
        const dodgeAnimID = combatAnimation.getDodgeAnimation(weaponWield);
        const dodgeAnim = GameState.SWRuleSet.animationIdMap.get(dodgeAnimID);
        if(dodgeAnim && this.getModelAnimationByName(dodgeAnim.name)){
          //console.log('dodge/parry anim', this.getName, damageAnim.name)
          return OdysseyModelAnimation.GetAnimation2DA(dodgeAnim.name);
        }
      }
      
      const dodgeAnimID = combatAnimation.getDodgeAnimation(weaponWield);
      const dodgeAnim = GameState.SWRuleSet.animationIdMap.get(dodgeAnimID);
      if(dodgeAnim && this.getModelAnimationByName(dodgeAnim.name)){
        //console.log('dodge anim', this.getName, dodgeAnim.name)
        return OdysseyModelAnimation.GetAnimation2DA(dodgeAnim.name);
      }
    }

    switch(modeltype){
      case 'S':
      case 'L':
        return OdysseyModelAnimation.GetAnimation2DA('cdodgeg');
    }
    
    switch(attackAnimNamel){
      case 'c2a1':
        return OdysseyModelAnimation.GetAnimation2DA('c2d1')
      case 'c2a2':
        return OdysseyModelAnimation.GetAnimation2DA('c2d2')
      case 'c2a3':
        return OdysseyModelAnimation.GetAnimation2DA('c2d3')
      case 'c2a4':
        return OdysseyModelAnimation.GetAnimation2DA('c2d4')
      case 'c2a5':
        return OdysseyModelAnimation.GetAnimation2DA('c2d5')
    }

    return OdysseyModelAnimation.GetAnimation2DA('g'+clipDigit+'g1');

  }

  getParryAnimation( attackAnimName: string ): SWAnimation {

    const attackAnimNamel = attackAnimName.toLowerCase();

    const modeltype = this.creatureAppearance.modeltype;
    const attackKey = this.getCombatAnimationAttackType();
    const weaponWield = this.getCombatAnimationWeaponType();
    const clipDigit = combatReactionClipDigit(weaponWield);
    
    const attackAnim = GameState.SWRuleSet.animationNameMap.get(attackAnimNamel);

    /** Get the combat animation from the attack animation. */
    const combatAnimation = attackAnim?.combatAnimation;
    if(combatAnimation){
      const parryAnimID = combatAnimation.getParryAnimation(weaponWield);
      const parryAnim = GameState.SWRuleSet.animationIdMap.get(parryAnimID);
      if(parryAnim && this.getModelAnimationByName(parryAnim.name)){
        return OdysseyModelAnimation.GetAnimation2DA(parryAnim.name);
      }
    }

    switch(modeltype){
      case 'S':
      case 'L':
        return OdysseyModelAnimation.GetAnimation2DA('cdodgeg');
    }
    //console.log(attackAnim);
    switch(attackAnimNamel){
      case 'c2a1':
        return OdysseyModelAnimation.GetAnimation2DA('c2p1')
      case 'c2a2':
        return OdysseyModelAnimation.GetAnimation2DA('c2p2')
      case 'c2a3':
        return OdysseyModelAnimation.GetAnimation2DA('c2p3')
      case 'c2a4':
        return OdysseyModelAnimation.GetAnimation2DA('c2p4')
      case 'c2a5':
        return OdysseyModelAnimation.GetAnimation2DA('c2p5')
    }

    return OdysseyModelAnimation.GetAnimation2DA('g'+clipDigit+'g1');
    
  }

  /**
   * Attack family letter for combat clip names (m/b/g).
   * Matches UpdateWeaponClass weapon_type source: dual uses off-hand item.
   */
  getCombatAnimationAttackType(): string {
    return combatAnimationAttackKey(this.equipment);
  }

  /**
   * Combat animation weapon digit (g*r1 / m*a1 *).
   * Derived from equipped weapon class / wield type.
   */
  getCombatAnimationWeaponType(){
    return combatAnimationWeaponDigit(this.equipment, this.isSimpleCreature());
  }

  getEquippedWeaponType(){
    let lWeapon = this.equipment.LEFTHAND;
    let rWeapon = this.equipment.RIGHTHAND;
    let claw1 = this.equipment.CLAW1;
    let claw2 = this.equipment.CLAW2;
    let claw3 = this.equipment.CLAW3;

    if(rWeapon){
      return (rWeapon.getWeaponType());
    }

    if(lWeapon){
      return (lWeapon.getWeaponType());
    }

    if(claw1){
      return (claw1.getWeaponType());
    }

    if(claw2){
      return (claw2.getWeaponType());
    }

    if(claw3){
      return (claw3.getWeaponType());
    }

    return 0;
  }

  isRangedEquipped(){
    if(this.equipment.RIGHTHAND){
      return this.equipment.RIGHTHAND.isRangedWeapon();
    }

    if(this.equipment.LEFTHAND){
      return this.equipment.LEFTHAND.isRangedWeapon();
    }

    if(this.equipment.CLAW1){
      return this.equipment.CLAW1.isRangedWeapon();
    }

    if(this.equipment.CLAW2){
      return this.equipment.CLAW2.isRangedWeapon();
    }

    if(this.equipment.CLAW3){
      return this.equipment.CLAW3.isRangedWeapon();
    }

    return false;
  }

  private static isMeleeWeaponItem(item: ModuleItem | undefined): boolean {
    if(!item?.baseItem) return false;
    const wield = item.baseItem.weaponWield;
    return (
      wield === WeaponWield.STUN_BATON ||
      wield === WeaponWield.ONE_HANDED_SWORD ||
      wield === WeaponWield.TWO_HANDED_SWORD
    );
  }

  private static isRangedWeaponItem(item: ModuleItem | undefined): boolean {
    if(!item?.baseItem || isGrenadeItemType(item.baseItem.itemType)) return false;
    const wield = item.baseItem.weaponWield;
    return (
      wield === WeaponWield.BLASTER_PISTOL ||
      wield === WeaponWield.BLASTER_RIFLE ||
      wield === WeaponWield.BLASTER_HEAVY
    );
  }

  private collectWeaponCandidates(equipped: ModuleItem | undefined): ModuleItem[] {
    const candidates = (this.getInventory() || []).filter((item): item is ModuleItem => !!item);
    if(equipped && candidates.indexOf(equipped) < 0){
      candidates.push(equipped);
    }
    const offHand = this.equipment?.LEFTHAND;
    if(offHand && candidates.indexOf(offHand) < 0){
      candidates.push(offHand);
    }
    return candidates;
  }

  private static pickMostDamagingWeapon(
    candidates: ModuleItem[],
    predicate: (item: ModuleItem) => boolean
  ): ModuleItem | undefined {
    let best: ModuleItem | undefined;
    let bestScore = -1;
    for(let i = 0; i < candidates.length; i++){
      const item = candidates[i];
      if(!item || !predicate(item)) continue;
      const score = (item.baseItem?.dieToRoll || 0) * (item.baseItem?.numDice || 0);
      if(!best || score > bestScore){
        best = item;
        bestScore = score;
      }
    }
    return best;
  }

  /** Best melee in possession; falls back to ranged. */
  findMostDamagingMelee(offHand = false): ModuleItem | undefined {
    const equipped = offHand ? this.equipment.LEFTHAND : this.equipment.RIGHTHAND;
    const candidates = this.collectWeaponCandidates(equipped);
    return (
      ModuleCreature.pickMostDamagingWeapon(candidates, ModuleCreature.isMeleeWeaponItem) ||
      ModuleCreature.pickMostDamagingWeapon(candidates, ModuleCreature.isRangedWeaponItem)
    );
  }

  /** Best ranged in possession; falls back to melee. */
  findMostDamagingRanged(): ModuleItem | undefined {
    const candidates = this.collectWeaponCandidates(this.equipment.RIGHTHAND);
    return (
      ModuleCreature.pickMostDamagingWeapon(candidates, ModuleCreature.isRangedWeaponItem) ||
      ModuleCreature.pickMostDamagingWeapon(candidates, ModuleCreature.isMeleeWeaponItem)
    );
  }

  updateItems(delta = 0){

    // Weapon meshes are updated via updateWeaponModels() after body animation so
    // saber trails see fresh bone matrices and are not double-ticked per frame.
    if(this.equipment.RIGHTHAND){
      this.equipment.RIGHTHAND.updatePoweredAnimation?.();
    }

    if(this.equipment.LEFTHAND){
      this.equipment.LEFTHAND.updatePoweredAnimation?.();
    }

    if(this.weaponGestureState?.active){
      this.weaponGestureState.remaining -= delta;
      if(this.weaponGestureState.remaining <= 0){
        this.weaponGestureState.active = false;
        this.resetWeaponGestureState();
        // OnFlourishClipFinished → RestoreWeaponPoweredState (keep on while combat).
        if(this.combatData.combatState){
          this.weaponPowered(true);
        }
      }
    }

    if(this.gestureState?.active){
      this.gestureState.remaining -= delta;
      if(this.gestureState.remaining <= 0){
        this.resetGestureState();
        if(this.combatData.combatState){
          this.weaponPowered(true);
          if(
            this.animationState.index == ModuleCreatureAnimState.MELEE_COMBAT_WIELD ||
            this.animationState.index == ModuleCreatureAnimState.FLOURISH
          ){
            this.setAnimationState(ModuleCreatureAnimState.READY);
          }
        }
      }
    }

  }

  private getFootstepPriorityGroup(): AudioPriorityGroup {
    if(this === GameState.getCurrentPlayer()){
      return AudioPriorityGroup.PLAYER_FOOTSTEPS;
    }

    // Simple creatures route to creature footstep groups.
    if(this.isSimpleCreature()){
      return AudioPriorityGroup.MEDIUM_AND_SMALL_CREATURE_FOOTSTEPS;
    }

    return AudioPriorityGroup.MEDIUM_AND_SMALL_CREATURE_FOOTSTEPS;
  }

  private getSoundSetPriorityGroup(): AudioPriorityGroup {
    if(this === GameState.getCurrentPlayer()){
      return AudioPriorityGroup.PLAYER_CHAT;
    }

    // Prefer creature vocal groups for non-humanoid simple creatures.
    if(this.isSimpleCreature()){
      return AudioPriorityGroup.MEDIUM_AND_SMALL_CREATURE_VOCALIZATIONS;
    }

    return AudioPriorityGroup.NON_PLAYER_CHAT;
  }

  showLightSaberContactVisual(): void {
    const position = new THREE.Vector3();
    const hook = this.model?.lightsaberhook;
    if(hook){
      hook.getWorldPosition(position);
    }else{
      position.copy(this.position);
    }
    spawnWorldImpactVfx(0xfab, position, this.context);
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
    const eventName = String(event.event || '').toLowerCase();

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
    let lWeapon = this.equipment.LEFTHAND;
    let rWeapon = this.equipment.RIGHTHAND;
    let cWeapon1 = this.equipment.CLAW1;
    let cWeapon2 = this.equipment.CLAW2;
    let cWeapon3 = this.equipment.CLAW3;
    return (lWeapon) || (rWeapon) || (cWeapon1) || (cWeapon2) || (cWeapon3);
  }

  /**
   * True when legs should keep drive locomotion under a flourish overlay.
   * PlayerFlourishWeapons checks player-control forward/strafe != 0.
   */
  isFlourishMoving(): boolean {
    const pc = this.playerControl;
    if(pc && (this.isPlayer || this.isPM || this.isPC)){
      return Math.abs(pc.axisForward) > 1e-4 || Math.abs(pc.axisRight) > 1e-4;
    }
    return this.speed > 0.01 || this.force > 0.01;
  }

  flourish(){
    // PlayerFlourishWeapons: PowerItem + SetCombatState(1, 2);
    // moving → SetOverlayAnimation(MELEE_WIELD 0x27ad); standing → InsertFireForget(MELEE_COMBAT_WIELD 0x27ae).
    this.setCombatState(true, ExcitedDurationRow.SpellCast);
    let isSimple = this.isSimpleCreature();
    let weaponType = this.getCombatAnimationWeaponType();
    
    if(isSimple || !weaponType){ return; }

    this.weaponPowered(true);
    const moving = this.isFlourishMoving();

    if(moving){
      // Body/head overlay (G*F1, overlay=1) — drive keeps walk/run on base slot.
      const wieldOverlay = this.animationConstantToAnimation(ModuleCreatureAnimState.MELEE_WIELD);
      if(wieldOverlay?.name){
        this.overlayAnimationState = {
          animationIndex: ModuleCreatureAnimState.MELEE_WIELD,
          animationName: wieldOverlay.name.toLowerCase(),
          animation: wieldOverlay,
          started: false,
          speed: 1,
          stopFlag: resolveOverlayStopFlags(ModuleCreatureAnimState.MELEE_WIELD),
        };
      }
      // does not play body g*w1 clips on weapon MDLs here — PowerItem only.
      return;
    }

    // Standing: fire-forget body gesture (InsertFireForgetAnimation MELEE_COMBAT_WIELD, 0x5dc).
    const combatWield = this.animationConstantToAnimation(ModuleCreatureAnimState.MELEE_COMBAT_WIELD);
    const duration = 1.5;
    this.setAnimationState(ModuleCreatureAnimState.MELEE_COMBAT_WIELD);
    // Ensure clip resolves even if setAnimationState left animation undefined for edge types.
    if(!this.animationState.animation && combatWield){
      this.animationState.animation = combatWield;
      this.animationState.started = false;
    }
    this.gestureState = {
      serverId: ModuleCreatureAnimState.MELEE_COMBAT_WIELD,
      animation: combatWield || this.animationState.animation,
      started: false,
      remaining: duration,
      active: true,
    };
  }

  /**
   * PlayDrawAnimation(FLOURISH / 0x2806) — UpdateVisibleWeapons on MainHand/OffHand
   * equip when not instant. Hides the model swap behind the new weapon's g*w1.
   * Duration matches InsertFireForgetAnimation(..., 0x5dc).
   */
  playDrawAnimation(){
    if(this.isSimpleCreature()){ return; }
    const weaponType = this.getCombatAnimationWeaponType();
    if(!weaponType){ return; }

    // EquipItem → SetCombatState(1, 2) for hand slots when not instant.
    this.setCombatState(true, ExcitedDurationRow.SpellCast);
    this.weaponPowered(true);

    const draw = this.animationConstantToAnimation(ModuleCreatureAnimState.FLOURISH);
    // PlayDrawAnimation always uses 1500ms (0x5dc), not clip length.
    const duration = 1.5;
    this.setAnimationState(ModuleCreatureAnimState.FLOURISH);
    if(!this.animationState.animation && draw){
      this.animationState.animation = draw;
      this.animationState.started = false;
    }
    this.gestureState = {
      serverId: ModuleCreatureAnimState.FLOURISH,
      animation: draw || this.animationState.animation,
      started: false,
      remaining: duration,
      active: true,
    };
  }

  /**
   * True when engagement came from hostile combat (Damage), not flourish/SpellCast-only.
   * matches engine behavior client sync gate: SetCombatState client update iff arg2 == 1.
   */
  isHostileCombatEngaged(): boolean {
    return !!(this.combatData.combatState && this.combatStateReason === ExcitedDurationRow.Damage);
  }

  /**
   * Set the weapon powered state
   * @param on - Whether the weapon should be powered
   */
  weaponPowered(on: boolean = false): void {
    const weaponType = this.getCombatAnimationWeaponType();
    const isSimple = this.isSimpleCreature();
    if(isSimple || !weaponType){ return; }

    this.equipment.LEFTHAND?.setPowered(on);
    this.equipment.RIGHTHAND?.setPowered(on);
  }

  setLIP(lip: LIPObject){
    //console.log(lip);
    this.lipObject = lip;
  }

  getClosesetOpenSpot(oObject: ModuleObject){
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

  removeObjectFromTargetPositions(oObject: ModuleObject){
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

  setFacingObject( target: ModuleObject ){
    if(target instanceof ModuleObject){
      this.setFacing(
        Math.atan2(
          this.position.y - target.position.y,
          this.position.x - target.position.x
        ) + Math.PI/2,
        false
      );
    }
  }

  lookAt(oObject: ModuleObject | undefined){
    this.lookAtObject = oObject;
  }

  /**
   * GetReticlePoint
   * head / head_g / rootdummy (then ModuleObject lookathook fallback).
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
  private unwindHeadTrackingLook(){
    if(!(this.model instanceof OdysseyModel3D) || !this.model.hturn_g) return;
    this.headTrackingAngle = 0;
    this.headTrackingPitch = 0;
    applyHeadTrackingToHturn(this.model.hturn_g, 0, 0);
  }

  updateHeadTracking(delta: number){
    if(!this.lookAtObject){
      this.unwindHeadTrackingLook();
      return;
    }
    if(this.lookAtObject === this || this.lookAtObject.isDead()){
      this.lookAtObject = undefined;
      this.unwindHeadTrackingLook();
      return;
    }
    if(!(this.model instanceof OdysseyModel3D) || !this.model.hturn_g){
      return;
    }
    if(!this.headTrackingEnabled){
      this.unwindHeadTrackingLook();
      return;
    }

    let targetYaw = 0;
    let targetPitch = 0;

    const reticle = this.lookAtObject.getReticleNode();
    if(reticle){
      this.lookAtPosition.copy(reticle.getWorldPosition(this.lookAtPosition));
    }else if(this.lookAtObject.position){
      this.lookAtPosition.copy(this.lookAtObject.position);
    }else{
      this.lookAtObject = undefined;
      this.unwindHeadTrackingLook();
      return;
    }
    const dx = this.lookAtPosition.x - this.position.x;
    const dy = this.lookAtPosition.y - this.position.y;
    const dz = this.lookAtPosition.z - (this.position.z + this.getCameraHeight());
    const horizontalDist = Math.sqrt(dx * dx + dy * dy);

    const worldAngleToTarget = Math.atan2(dy, dx);
    const bodyFacing = this.rotation.z + Math.PI / 2;
    const relativeYaw = Utility.NormalizeRadian(worldAngleToTarget - bodyFacing);
    const relativePitch = Math.atan2(dz, horizontalDist);

    if(Math.abs(relativeYaw) <= this.headMaxHorizontalAngle){
      targetYaw = relativeYaw;
      targetPitch = THREE.MathUtils.clamp(relativePitch, -this.headMaxVerticalAngle, this.headMaxVerticalAngle);
    }

    const stepH = ModuleCreature.HEAD_TRACKING_H_SPEED * delta;
    const stepV = ModuleCreature.HEAD_TRACKING_V_SPEED * delta;

    const yawDiff = Utility.NormalizeRadian(targetYaw - this.headTrackingAngle);
    if(Math.abs(yawDiff) <= stepH){
      this.headTrackingAngle = targetYaw;
    }else{
      this.headTrackingAngle += Math.sign(yawDiff) * stepH;
    }

    const pitchDiff = targetPitch - this.headTrackingPitch;
    if(Math.abs(pitchDiff) <= stepV){
      this.headTrackingPitch = targetPitch;
    }else{
      this.headTrackingPitch += Math.sign(pitchDiff) * stepV;
    }

    // Do not force idle axes to 0 - that wipes female neck/hturn bind cancel
    // (+/-0.1745) after anim and makes Model B heads look down (p_bastilah).
    applyHeadTrackingToHturn(
      this.model.hturn_g,
      this.headTrackingAngle,
      this.headTrackingPitch,
    );
  }

  onClick(callee: ModuleObject){

    //You can't interact with yourself
    if(this === GameState.PartyManager.Player && GameState.getCurrentPlayer() === this){
      return;
    }

    if(this.isHostile(callee) && !this.isDead()){
      GameState.getCurrentPlayer().attackCreature(this, undefined);
    }else if(this.isDead() && this.canLootAsCorpse(callee)){
      this.clearAllActions();
      GameState.getCurrentPlayer().actionUseObject(this.getLootUseTarget() as ModuleObject);
    }else if(!this.isDead()){
      this.clearAllActions();
      if(this.getConversation() && this.getConversation().resref){
        GameState.getCurrentPlayer().actionDialogObject(this, this.getConversation().resref, false, undefined, undefined, true);
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
    //check if the creature is inside a trigger
    const triggers = this.area?.triggers;
    if(triggers){
      const tLen = triggers.length;
      for(let i = 0; i < tLen; i++){
        triggers[i].updateObjectInside(this);
      }
    }
    // Area of Effect enter/exit (UpdateSubAreas)
    const aoes = this.area?.areaOfEffects;
    const aLen = aoes?.length || 0;
    for(let i = 0; i < aLen; i++){
      aoes[i].updateObjectInside(this);
    }
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
    const onHeartbeat = this.scripts[ModuleObjectScript.CreatureOnHeartbeat];
    if(!onHeartbeat){ return; }
    onHeartbeat.run(this);
  }

  override triggerUserDefinedEvent(event: NWScriptEvent){
    this.runUserDefinedScript(event, this.scripts[ModuleObjectScript.CreatureOnUserDefined]);
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

    this.runSpellCastAtScript(event, this.scripts[ModuleObjectScript.CreatureOnSpellAt]);
  }

  override runSpawnScript(): void {
    const onSpawn = this.scripts[ModuleObjectScript.CreatureOnSpawn];
    if(onSpawn){
      onSpawn.run(this, 0);
      console.log('spawned', this.getName());
    }
  }

  override onCombatRoundEnd(){
    if(this.combatData.lastAttemptedAttackTarget instanceof ModuleObject && this.combatData.lastAttemptedAttackTarget.isDead())
      this.combatData.lastAttemptedAttackTarget = undefined;

    // end combat round fires ScriptEndRound without a CombatState gate.
    // Keep the dead check only so corpses do not re-run OnEndRound AI.
    if(this.isDead())
      return true;
    
    const nwscript = this.scripts[ModuleObjectScript.CreatureOnEndRound];
    if(!nwscript){ return true; }
    nwscript.run(this);
  }

  /**
   * Encounter unlink on destroy-self effect (arg2=0);
   * DestroySelf encounter action (arg2=1).
   */
  unlinkFromEncounter(fromDestroySelf: boolean = false){
    if(this.encounterUnlinked) return;
    if(this.encounterObjectId === ModuleObjectConstant.OBJECT_INVALID) return;

    const encounter = GameState.ModuleObjectManager.GetObjectById(this.encounterObjectId);
    if(
      encounter &&
      isEncounter(encounter)
    ){
      (encounter as ModuleEncounter).removeFromActiveCreatureCount(
        this.challengeRating || 0,
        fromDestroySelf ? 1 : 0
      );
    }
    this.encounterUnlinked = true;
  }

  override onDeath(){
    this.weaponPowered(false);
    const nwscript = this.scripts[ModuleObjectScript.CreatureOnDeath];
    if(nwscript){
      nwscript.run(this);
    }

    // effect apply → RemoveFromActiveCreatureCount(..., 0)
    this.unlinkFromEncounter(false);

    // effect apply strips combat/buff VFX before corpse schedule (else willDestroy
    // / KeepCorpse skips effect updates and leaves frozen emitters in the world).
    this.clearEffectsOnDeath();

    // SetAutoPaused Party Killed when a party member dies (not full wipe)
    if(GameState.PartyManager.party.indexOf(this) >= 0){
      GameState.GameOverManager?.NotifyPartyMemberDeath?.(this);
      // Pass AL — Mod_OnPlrDeath / GetLastPlayerDied
      GameState.module?.notifyPlayerDied?.(this);
      const anyAlive = GameState.PartyManager.party.some((pm) => pm && pm !== this && !pm.isDead());
      if(anyAlive){
        GameState.AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.PartyMemberKilled);
      }
    }

    // effect apply: GetDeadTemp (party + HP≤0) skips DestroyObjectDelay / KeepCorpse.
    // Dead PMs stay until TempDeath resurrection or party wipe — do not bag them.
    this.scheduleDestroyAsCorpse();
    return true;
  }

  /**
   * GetDeadTemp — true when this creature is in the
   * client party and current HP < 1 (awaiting combat-clear resurrection).
   */
  getDeadTemp(): boolean {
    if(!this.isPartyMember()) return false;
    return this.getHP() < 1;
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
    if(!this.isDestroyable) return;
    if(this.destroyed || this.serverDestroyed || this.isRetainedCorpse) return;
    // GetDeadTemp branch — no event 0xb / KeepCorpse for live party members
    if(this.isPartyMember()) return;
    // Re-apply after OnDeath DestroyObject(OBJECT_SELF) defaults so bare willDestroy
    // with delay 0 does not skip DestroyObjectDelay / FadeDelayOnDeath.
    if(this.corpseDestroyScheduled) return;

    const destroyDelayRaw = this.creatureAppearance?.destroyobjectdelay;
    const destroyDelay = (typeof destroyDelayRaw === 'number' && destroyDelayRaw >= 0)
      ? destroyDelayRaw
      : 3.0;

    // FadeDelayOnDeath INT ms when present; missing → KeepCorpse (client shell).
    const fadeDelayOnDeath = this.creatureAppearance?.fadedelayondeath;
    const hasFadeDelayOnDeath = typeof fadeDelayOnDeath === 'number' && fadeDelayOnDeath >= 0;
    this.keepCorpseOnDestroy = !hasFadeDelayOnDeath;
    const fadeDurationSec = hasFadeDelayOnDeath ? fadeDelayOnDeath / 1000 : 0;

    this.corpseDestroyScheduled = true;
    this.setWillDestroy(true);
    if(this.keepCorpseOnDestroy){
      // Wait DestroyObjectDelay, then enter retained shell (no opacity fade)
      this.setNoFadeOnDestroy(true);
      this.setFadeDuration(0);
      this.setDelayUntilFade(destroyDelay);
      this.setDelayUntilDestroy(destroyDelay);
    }else{
      this.setNoFadeOnDestroy(fadeDurationSec <= 0);
      this.setFadeDuration(fadeDurationSec);
      this.setDelayUntilFade(destroyDelay);
      this.setDelayUntilDestroy(destroyDelay + Math.max(fadeDurationSec, 0));
    }
  }

  /**
   * Continue death animation + model while waiting for DestroyObjectDelay / fade-out.
   */
  updateCorpsePendingDestroy(delta: number = 0){
    if(this.audioEmitter){
      this.audioEmitter.setPosition(this.position.x, this.position.y, this.position.z + 1.0);
      this.footstepEmitter?.setPosition(this.position.x, this.position.y, this.position.z);
    }

    if(this.isDead()){
      this.damageList = [];
      this.getUpAnimationPlayed = false;
      if(
        this.deathStarted &&
        this.animationState.index != ModuleCreatureAnimState.DEAD &&
        this.animationState.index != ModuleCreatureAnimState.DIE
      ){
        this.setAnimationState(ModuleCreatureAnimState.DEAD);
        this.deathAnimationPlayed = true;
      }
    }

    this.updateAnimationState();
    this.updateItems(delta);

    if(this.model instanceof OdysseyModel3D && this.model.bonesInitialized){
      this.model.animateFrame = true;
      this.model.update(delta);
      this.updateWeaponModels(delta);
    }
  }

  /** Tick wielded weapon models once per frame after the body pose is resolved. */
  updateWeaponModels(delta = 0){
    if(this.equipment.RIGHTHAND?.model instanceof OdysseyModel3D){
      this.equipment.RIGHTHAND.model.update(delta);
    }
    if(this.equipment.LEFTHAND?.model instanceof OdysseyModel3D){
      this.equipment.LEFTHAND.model.update(delta);
    }
  }

  /**
   * Resolve bodybag.2da row for this creature (UTC BodyBag, else appearance.body_bag).
   */
  getBodyBagRowId(): number {
    if(this.bodyBag > 0) return this.bodyBag;
    const fromAppearance = this.creatureAppearance?.body_bag;
    if(typeof fromAppearance === 'number' && fromAppearance > 0) return fromAppearance;
    return 0;
  }

  getBodyBagRule(): SWBodyBag | undefined {
    const rowId = this.getBodyBagRowId();
    return GameState.SWRuleSet?.bodyBags?.[rowId];
  }

  /**
   * Placeable appearance id for the bag — GetBodyBagAppearance.
   * bodybag.Appearance → else appearance.Body_Bag row's appearance → else 3.
   */
  getBodyBagAppearance(): number {
    const bags = GameState.SWRuleSet?.bodyBags;
    const readAppearance = (rowId: number): number | undefined => {
      const row = bags?.[rowId];
      if(!row) return undefined;
      return row.appearance > 0 ? row.appearance : undefined;
    };

    const primary = readAppearance(this.getBodyBagRowId());
    if(primary != null) return primary;

    const altRow = this.creatureAppearance?.body_bag;
    if(typeof altRow === 'number' && altRow >= 0){
      const secondary = readAppearance(altRow);
      if(secondary != null) return secondary;
    }
    return 3;
  }

  getBodyBagPlaceable(): ModulePlaceable | undefined {
    if(!this.bodyBagObjectId) return undefined;
    const bag = GameState.ModuleObjectManager.GetObjectById(this.bodyBagObjectId) as unknown as ModulePlaceable;
    if(isPlaceable(bag)){
      return bag as ModulePlaceable;
    }
    return undefined;
  }

  /** Target for ActionUseObject when looting a dead creature (bag if present, else corpse). */
  getLootUseTarget(): ModulePlaceable | ModuleCreature {
    const bag = this.getBodyBagPlaceable();
    if(bag && !bag.destroyed){
      return bag;
    }
    return this;
  }

  hasLootableContents(): boolean {
    if(this.gold > 0) return true;
    for(let i = 0; i < this.inventory.length; i++){
      if(this.inventory[i]?.isDropable?.()) return true;
    }
    const slots = Object.keys(this.equipment) as (keyof typeof this.equipment)[];
    for(let i = 0; i < slots.length; i++){
      if(this.equipment[slots[i]]?.isDropable?.()) return true;
    }
    return false;
  }

  /** Whether the player can loot this corpse (hostile, selectable dead, or linked bag). */
  canLootAsCorpse(from?: ModuleObject): boolean {
    if(!this.isDead() && !this.isRetainedCorpse) return false;
    if(this.getBodyBagPlaceable()) return true;
    if(from && this.isHostile(from)) return true;
    if(this.isDeadSelectable && this.hasLootableContents()) return true;
    return this.isDeadSelectable;
  }

  /**
   * Whether this creature should drop a body bag (loot / corpse / gold).
   */
  shouldSpawnBodyBag(): boolean {
    if(!this.isDestroyable) return false;
    if(GameState.PartyManager?.party?.indexOf(this) >= 0) return false;
    // Use objectType check — isPlayer(this) type-narrows ModuleCreature to never in the false branch
    if(BitWise.InstanceOf(this.objectType, ModuleObjectType.ModulePlayer)) return false;
    if(this.bodyBagObjectId) return false;

    const rule = this.getBodyBagRule();
    if(rule?.corpse) return true;

    if(this.gold > 0) return true;

    for(let i = 0; i < this.inventory.length; i++){
      if(this.inventory[i]?.isDropable?.()) return true;
    }

    const slots = Object.keys(this.equipment) as (keyof typeof this.equipment)[];
    for(let i = 0; i < slots.length; i++){
      const item = this.equipment[slots[i]];
      if(item?.isDropable?.()) return true;
    }

    return false;
  }

  /**
   * Create a body-bag placeable, move droppable loot into it, and schedule
   * EventSpawnBodyBag (~500ms) to load its model.
   * : destroy event 0xb when destroyable + dead.
   */
  spawnBodyBag(): number {
    if(!this.shouldSpawnBodyBag()) return ModuleObjectConstant.OBJECT_INVALID;

    const rule = this.getBodyBagRule();
    const bagId = ModulePlaceable.spawnBodyBagFrom(
      this,
      this.getBodyBagRowId(),
      rule,
      this.getBodyBagAppearance()
    );
    if(bagId !== ModuleObjectConstant.OBJECT_INVALID){
      this.bodyBagObjectId = bagId;
    }
    return bagId;
  }

  /**
   * event 0xb body: SpawnBodyBag then KeepCorpse or fade-out visual.
   * Called when DestroyObjectDelay elapses (and as destroy backup).
   */
  onServerDestroyEvent(){
    if(this.serverDestroyed || this.isRetainedCorpse) return;
    this.serverDestroyed = true;

    if(this.isDead() && this.isDestroyable && !this.bodyBagObjectId){
      this.spawnBodyBag();
    }

    const bag = this.getBodyBagPlaceable();
    const bagIsCorpseModel = !!bag?.isCorpse;

    // Corpse-model bags (Rancor/Krayt) show the placeable; no KeepCorpse shell
    if(this.keepCorpseOnDestroy && !bagIsCorpseModel){
      this.enterRetainedCorpse();
    }else if(bag){
      bag.setBodyBagVisible(true);
    }

    // event 0xb removes the object from GetGameObject / tag lookup so
    // GetIsObjectValid / GetObjectByTag fail (k_ptar_ramp Calo082 gate). KeepCorpse
    // shells stay in area.creatures for visuals only.
    GameState.ModuleObjectManager.RemoveObject(this);
    // Fade path continues via willDestroy / updateDestroyFade → destroy
  }

  /**
   * Convert to a runtime-only KeepCorpse shell (client corpse cache entry).
   * Stays in area.creatures for updates/selection but is excluded from save.
   */
  enterRetainedCorpse(){
    if(this.isRetainedCorpse || this.destroyed) return;

    const area = this.area;
    this.isRetainedCorpse = true;
    this.willDestroy = false;
    this.keepCorpseOnDestroy = false;
    this.retainedCorpseFadeRemaining = -1;
    this.retainedCorpseFadeTotal = 0;
    this.setOpacity(1);

    if(area){
      area.corpseCache.add(this);
    }

    const bag = this.getBodyBagPlaceable();
    if(bag && !bag.isCorpse){
      bag.setBodyBagVisible(false);
    }

    // Hold DEAD pose
    if(this.animationState.index != ModuleCreatureAnimState.DEAD){
      this.setAnimationState(ModuleCreatureAnimState.DEAD);
      this.deathAnimationPlayed = true;
    }
  }

  /** Corpse-cache overflow: reveal bag and fade this shell out. */
  beginRetainedCorpseFadeOut(fadeSec: number = 1.0){
    if(!this.isRetainedCorpse || this.destroyed) return;
    const bag = this.getBodyBagPlaceable();
    if(bag) bag.setBodyBagVisible(true);
    this.retainedCorpseFadeTotal = Math.max(0, fadeSec);
    this.retainedCorpseFadeRemaining = this.retainedCorpseFadeTotal;
    if(this.retainedCorpseFadeRemaining <= 0){
      this.disposeRetainedCorpse(false);
    }
  }

  /** Total fade length when eviction starts (for opacity). */
  retainedCorpseFadeTotal: number = 0;

  updateRetainedCorpse(delta: number = 0){
    if(this.destroyed || !this.isRetainedCorpse) return;

    if(this.audioEmitter){
      this.audioEmitter.setPosition(this.position.x, this.position.y, this.position.z + 1.0);
    }

    if(this.retainedCorpseFadeRemaining >= 0){
      this.retainedCorpseFadeRemaining -= delta;
      const total = this.retainedCorpseFadeTotal > 0 ? this.retainedCorpseFadeTotal : 1;
      const opacity = Math.max(0, this.retainedCorpseFadeRemaining / total);
      this.setOpacity(opacity);
      Object.values(this.equipment).forEach(item => {
        if(item && item.model instanceof OdysseyModel3D){
          item.model.setOpacity(opacity);
        }
      });
      if(this.retainedCorpseFadeRemaining <= 0){
        this.setOpacity(0);
        this.disposeRetainedCorpse(false);
        return;
      }
    }

    this.updateAnimationState();
    if(this.model instanceof OdysseyModel3D && this.model.bonesInitialized){
      this.model.animateFrame = true;
      this.model.update(delta);
    }
  }

  /**
   * Undo KeepCorpse / pending destroy without disposing the creature.
   * Used by EffectResurrection when a party member was wrongly bagged, or after
   * any TempDeath revive that must restore normal AI updates.
   */
  clearCorpseDestroyState(){
    const wasScriptHidden = !!(this.isRetainedCorpse || this.serverDestroyed);
    const stillInObjectList = GameState.ModuleObjectManager.ObjectList.has(this.id);
    if(this.isRetainedCorpse){
      const area = this.area;
      area?.corpseCache?.remove(this);
      this.isRetainedCorpse = false;
    }
    this.corpseDestroyScheduled = false;
    this.serverDestroyed = false;
    this.keepCorpseOnDestroy = false;
    this.retainedCorpseFadeRemaining = -1;
    this.retainedCorpseFadeTotal = 0;
    this.setWillDestroy(false);
    this.setDelayUntilDestroy(0);
    this.setDelayUntilFade(0);
    this.setNoFadeOnDestroy(false);
    this.setOpacity(1);
    // Party TempDeath revive after KeepCorpse removed the object from script tables
    if(wasScriptHidden && !stillInObjectList){
      GameState.ModuleObjectManager.RegisterObject(this);
    }
  }

  /**
   * Dispose a KeepCorpse shell. Does not destroy the linked body bag.
   */
  disposeRetainedCorpse(revealBag: boolean = false){
    if(this.destroyed) return;
    const area = this.area;
    area?.corpseCache?.remove(this);

    if(revealBag){
      const bag = this.getBodyBagPlaceable();
      if(bag) bag.setBodyBagVisible(true);
    }

    this.isRetainedCorpse = false;
    this.willDestroy = false;
    this.serverDestroyed = true;
    super.destroy();
    this.disposeCreatureVisuals();
  }

  override onDialog(oSpeaker: ModuleObject, listenPatternNumber = -1, conversation: DLGObject = undefined, matchedSubstrings: string[] = []){
    // EventHandler case 7: store captures on the object, then run OnDialogue.
    this.setMatchedSubstrings(matchedSubstrings || []);

    let nwscript = this.scripts[ModuleObjectScript.CreatureOnDialog];
    // : empty or "default" OnDialogue resref → k_hen_dialogue01 (written back into the slot).
    const resRef = nwscript?.name || '';
    if(!nwscript || !resRef || resRef.toLowerCase() === 'default'){
      const fallback = GameState.NWScript.Load('k_hen_dialogue01');
      if(fallback){
        this.scripts[ModuleObjectScript.CreatureOnDialog] = fallback;
        fallback.bindOwner(this, ModuleObjectScript.CreatureOnDialog);
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
    const nwscript = this.scripts[ModuleObjectScript.CreatureOnEndDialog];
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
    if(isObject(attacker)){
      this.assignHostileActor(attacker);
    }
    if(isCreature(attacker)){
      attacker.broadcastCombatStateToParty(this);
      attacker.removeCombatInvisibilityEffects();
    }
    this.broadcastCombatStateToParty(
      isObject(attacker)
        ? attacker
        : undefined
    );

    const nwscript = this.scripts[ModuleObjectScript.CreatureOnAttacked];
    if(!nwscript){ return; }
    const script_num = (GameState.PartyManager.party.indexOf(this) > -1) ? 2005 : 1005;
    nwscript.run(this, script_num);
  }

  override onDamaged(){
    if(this.isDead())
      return true;

    // effect apply — creatures do not BroadcastCombatStateToParty
    // (engagement is OnAttacked / harmful OnSpellCastAt). Door/placeable path is on
    // ModuleObject.onDamaged. Refresh ExcitedDuration Damage row when HP is lost.
    this.setExcitedState(ExcitedDurationRow.Damage);

    const nwscript = this.scripts[ModuleObjectScript.CreatureOnDamaged];
    if(!nwscript){ return true; }
    const script_num = (GameState.PartyManager.party.indexOf(this) > -1) ? 2006 : 1006;
    nwscript.run(this, script_num);
  }

  override onBlocked(){
    if(this == GameState.getCurrentPlayer())
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
    const nwscript = this.scripts[ModuleObjectScript.CreatureOnBlocked];
    if(!nwscript){ return; }
    const script_num = (GameState.PartyManager.party.indexOf(this) > -1) ? 2009 : 1009;
    nwscript.run(this, script_num);
  }

  use(object: ModuleObject){
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
    return this.isConfused()
      || this.isStunned()
      || this.isDroidStunned()
      || this.isParalyzed()
      || this.isFrightened()
      || this.isSleeping()
      || this.isChoking()
      || this.isForcePushed()
      || this.isHorrified()
      || this.isWhirlwind()
      || this.isCrushed()
      || this.isHeld()
      || this.isMindTricked()
      || this.isDroidScrambled()
      || this.isKnockedDown();
  }

  setCommadable(bCommandable = 0){
    this.isCommandable = bCommandable ? true : false;
  }

  getCommadable(){
    return this.isCommandable;
  }

  getItemInSlot(slot = 0){
    switch(slot){
      case ModuleCreatureArmorSlot.IMPLANT:
        return this.equipment.IMPLANT;
      break;
      case ModuleCreatureArmorSlot.HEAD:
        return this.equipment.HEAD;
      break;
      case ModuleCreatureArmorSlot.ARMS:
        return this.equipment.ARMS;
      break;
      case ModuleCreatureArmorSlot.LEFTARMBAND:
        return this.equipment.LEFTARMBAND;
      break;
      case ModuleCreatureArmorSlot.ARMOR:
        return this.equipment.ARMOR;
      break;
      case ModuleCreatureArmorSlot.RIGHTARMBAND:
        return this.equipment.RIGHTARMBAND;
      break;
      case ModuleCreatureArmorSlot.LEFTHAND:
        return this.equipment.LEFTHAND;
      break;
      case ModuleCreatureArmorSlot.BELT:
        return this.equipment.BELT;
      break;
      case ModuleCreatureArmorSlot.RIGHTHAND:
        return this.equipment.RIGHTHAND;
      break;
      case ModuleCreatureArmorSlot.CLAW1:
        return this.equipment.CLAW1;
      break;
      case ModuleCreatureArmorSlot.CLAW2:
        return this.equipment.CLAW2;
      break;
      case ModuleCreatureArmorSlot.CLAW3:
        return this.equipment.CLAW3;
      break;
      default:
        return null;
      break;
    }
  }

  getInventory(): ModuleItem[] {
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
    return this.race;
  }

  getSubRace(){
    return this.subrace;
  }

  getGender(){
    return this.gender;
  }

  getXP(){
    return this.experience;
  }

  setXP(value = 0){
    this.experience = value;
  }

  addXP(value = 0, xpType: ExperienceType = ExperienceType.PLOT){
    this.experience += parseInt(value.toString());
    if(this.isPartyMember()){
      GameState.UINotificationManager.EnableUINotificationIconType(xpType == ExperienceType.PLOT ? UIIconTimerType.PLOT_XP_RECEIVED : UIIconTimerType.STEALTH_XP_RECEIVED);
    }
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
  static #getPcPrestigeFactor(pc: ModuleCreature | undefined): { factor: number; bonus: number } {
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
            tier = ModuleCreature.#prestigeTierFromLevel(cls.level | 0);
            break;
          }
        }
      }
    }else if(pc.getHasFeat?.(FEAT_PRESTIGE_B)){
      if(goodEvil > 0x3b){
        for(let i = 0; i < (pc.classes?.length || 0) && i < 2; i++){
          const cls = pc.classes[i];
          if((cls?.id | 0) === CLASS_PRESTIGE_A){
            tier = ModuleCreature.#prestigeTierFromLevel(cls.level | 0);
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
      GameState.getCurrentPlayer?.() ||
      GameState.PartyManager.party?.[0];
    const { factor, bonus } = ModuleCreature.#getPcPrestigeFactor(pc);

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
    return this.subraceIndex;
  }

  setHP(nAmount = 0){
    // Keep currentHitPoints consistent with getHP for every subrace.
    // Default: getHP = maxHitPoints + currentHitPoints - hitPoints
    // Wookiee/Beast: getHP = hitPoints + currentHitPoints
    // EffectDeath setHP(-11) used only the default inversion, so beast NPCs
    // (e.g. Calo on Taris) stayed at positive HP with EffectDeath applied
    // GetIsObjectValid stayed true and k_ptar_ramp never started tar08_ramp.
    switch(this.subraceIndex){
      case 1: // WOOKIE
      case 2: // BEAST
        this.currentHitPoints = nAmount - this.hitPoints;
        break;
      default:
        this.currentHitPoints = nAmount - (this.maxHitPoints - this.hitPoints);
        break;
    }
  }

  addHP(nAmount = 0, ignoreMaxHitPoints = false){
    if(ignoreMaxHitPoints){
      this.currentHitPoints += nAmount;
    }else{
      let currentHP = this.getHP();
      if(currentHP < this.getMaxHP()){
        if(currentHP + nAmount > this.getMaxHP()){
          this.currentHitPoints += nAmount + (this.getMaxHP() - (currentHP + nAmount));
        }else{
          this.currentHitPoints += nAmount;
        }
      }
    }

    if(this.min1HP && this.getHP() < 1)
      this.setHP(1);
  }

  subtractHP(nAmount = 0){
    this.currentHitPoints -= nAmount;
    if(this.min1HP && this.getHP() < 1)
      this.setHP(1);
  }

  getHP(){
    switch(this.subraceIndex){
      case 0: //NONE
        return (this.maxHitPoints + this.currentHitPoints) - this.hitPoints;
      case 1: //WOOKIE
      case 2: //BEAST
        return this.hitPoints + this.currentHitPoints;
      default:
        return (this.maxHitPoints + this.currentHitPoints) - this.hitPoints;
    }
  }

  getMaxHP(){
    return this.maxHitPoints;
  }

  setMaxHP(nAmount = 0){
    return this.maxHitPoints = nAmount;
  }

  setMinOneHP(bMinOneHP = false){
    this.min1HP = bMinOneHP ? true : false;
  }

  /**
   * GetCurrentForcePoints: temporary + current.
   */
  getFP(){
    return (this.temporaryForce || 0) + (this.currentForce || 0);
  }

  getMaxFP(){
    return this.maxForcePoints;
  }

  setFP(nAmount = 0){
    this.temporaryForce = 0;
    this.currentForce = Math.max(0, nAmount);
  }

  addFP(nAmount = 0, ignoreMaxForcePoints = false){
    if(nAmount <= 0) return;
    if(ignoreMaxForcePoints){
      this.currentForce += nAmount;
    }else{
      const room = Math.max(0, this.getMaxFP() - this.getFP());
      this.currentForce += Math.min(nAmount, room);
    }
    if(this.getFP() < 0) this.setFP(0);
  }

  /**
   * UnReadySpell spend order: temporary FP first, then current.
   */
  subtractFP(nAmount = 0){
    if(nAmount <= 0) return;
    let remaining = nAmount;
    if(this.temporaryForce > 0){
      if(remaining <= this.temporaryForce){
        this.temporaryForce -= remaining;
        return;
      }
      remaining -= this.temporaryForce;
      this.temporaryForce = 0;
    }
    this.currentForce -= remaining;
    if(this.currentForce < 0) this.currentForce = 0;
  }

  /**
   * GetAdjustedForcePoints — forceadjust.2da by alignment band.
   */
  getAdjustedForcePointCost(spell: { forcepoints?: number; goodEvil?: string }): number {
    const base = typeof spell?.forcepoints === 'number' ? spell.forcepoints : (parseInt(String(spell?.forcepoints)) || 0);
    if(base <= 0) return 0;
    // NPCs outside party use base cost (arg2 == 0)
    if(!this.isPartyMember() && !this.isPC){
      return base;
    }
    const alignment = spell?.goodEvil || '-';
    if(alignment !== 'G' && alignment !== 'E'){
      return base;
    }
    const rowIndex = Math.min(10, Math.max(0, Math.floor(this.getGoodEvil() / 10)));
    const row = GameState.SWRuleSet.forceAdjustments[rowIndex];
    if(!row) return base;
    const mult = alignment === 'G' ? row.goodcost : row.evilcost;
    if(!isFinite(mult) || mult <= 0) return base;
    return Math.max(0, Math.floor(base * mult));
  }

  /**
   * FP available for Force-menu enable checks.
   * GetSelfForcePowers / GetHostileForcePowers: body_fuel → use HP instead of FP.
   */
  getForceMenuResource(): number {
    if(this.bodyFuel){
      return this.getHP();
    }
    return this.getFP();
  }

  /**
   * UnReadySpell — drain adjusted FP
   * (clamp at 0). Always succeeds when the spell row is valid; menu enable is
   * the soft FP/HP gate (GetSelfForcePowers / GetHostileForcePowers).
   */
  unreadySpell(spell: { forcepoints?: number; goodEvil?: string } | null | undefined): boolean {
    if(!spell) return false;
    const cost = this.getAdjustedForcePointCost(spell);
    if(cost > 0){
      this.subtractFP(cost);
    }
    return true;
  }

  /**
   * ForceMenuAction class-slot pick — first Jedi class (3/4/5) in the
   * first two class slots; otherwise 0.
   */
  getForceSpellClassIndex(): number {
    const limit = Math.min(2, this.classes?.length || 0);
    for(let i = 0; i < limit; i++){
      const id = this.classes[i]?.id | 0;
      if(id === 3 || id === 4 || id === 5){
        return i;
      }
    }
    return 0;
  }

  getCameraHeight(){
    if(this.model && this.model.camerahook){
      return this.model.camerahook.position.z;
    }else{
      return 1.5;
    }
  }

  /**
   * NWScript GetAC / simple AC — GetArmorClass.
   */
  getAC(){
    return this.getArmorClassVersus(undefined, false);
  }

  /**
   * Whether this creature currently SEES `object` (perception bit 0x01).
   * GetVisibleListElement bit_flags & 1 — match by object ref or saved ObjectId.
   */
  hasSeenObject(object: ModuleObject): boolean {
    if(!object || object === this) return true;
    const entry = this.perceptionList?.find(
      (o) => o.object === object || o.objectId === object.id
    );
    return !!(entry && (entry.data & PerceptionMask.SEEN));
  }

  /**
   * GetArmorClassVersus.
   * @param attacker - creature rolling the attack (for invis / SEEN gates)
   * @param touch - when true, omit armor / shield / natural equipment AC and
   * armor/shield effect AC (types 2–3); dodge + deflection still apply
   */
  getArmorClassVersus(attacker?: ModuleCreature, touch = false): number {
    let ac = 10;

    for(let i = 0; i < this.classes.length; i++){
      ac += this.classes[i].getACBonus() || 0;
    }

    // creaturesize.2da acattachmod by appearance.sizecategory
    const sizeCat = this.getAppearance()?.sizecategory ?? 3;
    const sizeRow = GameState.SWRuleSet?.creatureSizes?.[sizeCat];
    if(sizeRow && typeof sizeRow.acattachmod === 'number' && sizeRow.acattachmod !== -1){
      ac += sizeRow.acattachmod;
    }

    if(!touch){
      ac += this.naturalAC || 0;

      const armor = this.equipment.ARMOR;
      ac += armor?.getACBonus() || 0;

      // Shield / off-hand AC item (non-weapon with AC)
      const leftHand = this.equipment.LEFTHAND;
      if(leftHand && leftHand.getWeaponType() == WeaponType.INVALID){
        ac += leftHand.getACBonus() || 0;
      }
    }

    // Flat-footed / can't see attacker: deny positive DEX (negative still hurts).
    // : GetInvisible(attacker, defender) || !(SEEN bit) → no GetDEXMod / dodge field.
    const loseDex =
      !!attacker &&
      (this.isInvisibleToObserver(attacker) || !this.hasSeenObject(attacker));

    const armor = this.equipment.ARMOR;
    let dexBonus = Math.floor((this.getDEX() - 10) / 2);
    if(this.isDebilitated()){
      dexBonus = Math.min(dexBonus, 0);
    }
    if(armor){
      const maxDex = armor.baseItem?.dexBonus;
      if(typeof maxDex == 'number' && maxDex >= 0){
        dexBonus = Math.min(dexBonus, maxDex);
      }
    }
    if(loseDex){
      dexBonus = Math.min(dexBonus, 0);
    }
    ac += dexBonus;

    // Effect AC bonuses. int0=modifyType, int1=value
    // Touch: skip armor/shield enchantment (types 2–3); dodge/natural/deflection apply.
    let dodgeBonus = 0;
    let naturalBonus = 0;
    let armorEffect = 0;
    let shieldEffect = 0;
    let deflectEffect = 0;
    for(let i = 0; i < this.effects.length; i++){
      const effect = this.effects[i];
      if(
        effect.type != GameEffectType.EffectACIncrease &&
        effect.type != GameEffectType.EffectACDecrease
      ) continue;
      const modType = effect.getInt(0);
      const value = effect.getInt(1) || 0;
      const signed = effect.type == GameEffectType.EffectACIncrease ? value : -value;
      switch(modType){
        case 0: dodgeBonus += signed; break;     // AC_DODGE_BONUS
        case 1: naturalBonus += signed; break;   // AC_NATURAL_BONUS
        case 2: // AC_ARMOUR_ENCHANTMENT (max)
          if(!touch) armorEffect = Math.max(armorEffect, signed);
          break;
        case 3: // AC_SHIELD_ENCHANTMENT (max)
          if(!touch) shieldEffect = Math.max(shieldEffect, signed);
          break;
        case 4: deflectEffect = Math.max(deflectEffect, signed); break;
        default: dodgeBonus += signed; break;
      }
    }
    // applies effect dodge even when DEX is denied; natural effects apply on touch.
    ac += dodgeBonus + naturalBonus + armorEffect + shieldEffect + deflectEffect;

    // Dueling AC feat mod (GetTotalACFeatMod) — one-handed with free off-hand
    const rightHand = this.equipment.RIGHTHAND;
    const leftHand = this.equipment.LEFTHAND;
    if(
      rightHand && !leftHand &&
      (rightHand.getWeaponWield() == WeaponWield.ONE_HANDED_SWORD ||
        rightHand.getWeaponWield() == WeaponWield.BLASTER_PISTOL ||
        rightHand.getWeaponWield() == WeaponWield.STUN_BATON)
    ){
      if(this.getHasFeat(CombatFeatType.MASTER_DUELING)) ac += 3;
      else if(this.getHasFeat(CombatFeatType.ADVANCED_DUELING)) ac += 2;
      else if(this.getHasFeat(CombatFeatType.DUELING)) ac += 1;
    }

    if(this.isDebilitated()){
      ac -= 4;
    }

    return ac;
  }

  /**
   * ExecuteCommandDoTouchAttack.
   * @returns 0 miss, 1 hit, 2 critical
   */
  doTouchAttack(target: ModuleObject, ranged = false): number {
    if(!target) return 0;
    if(
      isDoor(target) ||
      isPlaceable(target)
    ){
      return 1;
    }
    if(!isCreature(target)){
      return 0;
    }
    const defender = target as ModuleCreature;

    // Concealment → miss (ResolveDefensiveEffects subset)
    let conceal = 0;
    for(let i = 0; i < defender.effects.length; i++){
      const e = defender.effects[i];
      if(e?.type === GameEffectType.EffectConcealment){
        conceal = Math.max(conceal, e.getInt(0) || 0);
      }
    }
    if(conceal > 0 && (Math.floor(Math.random() * 100) + 1) <= conceal){
      return 0;
    }

    const atkBonus =
      this.getBaseAttackBonus() +
      Math.floor(((ranged ? this.getDEX() : this.getSTR()) - 10) / 2) +
      getAttackEffectBonus(this);
    const touchAC = defender.getArmorClassVersus(this, true);
    const roll = Dice.rollD20(1);

    if(roll === 1) return 0;
    if(roll === 20){
      const confirm = Dice.rollD20(1);
      return (confirm + atkBonus) >= touchAC ? 2 : 1;
    }
    return (roll + atkBonus) >= touchAC ? 1 : 0;
  }

  getSTR(calculateBonuses = true){
    if(!calculateBonuses){
      return this.str;
    }else{
      return this.str +
      (this.equipment.HEAD?.getSTRBonus() || 0) +
      (this.equipment.ARMOR?.getSTRBonus() || 0) +
      (this.equipment.ARMS?.getSTRBonus() || 0) +
      (this.equipment.RIGHTHAND?.getSTRBonus() || 0) +
      (this.equipment.LEFTHAND?.getSTRBonus() || 0) +
      (this.equipment.LEFTARMBAND?.getSTRBonus() || 0) +
      (this.equipment.RIGHTARMBAND?.getSTRBonus() || 0) +
      (this.equipment.IMPLANT?.getSTRBonus() || 0) +
      (this.equipment.BELT?.getSTRBonus() || 0) +
      (this.equipment.CLAW1?.getSTRBonus() || 0) +
      (this.equipment.CLAW2?.getSTRBonus() || 0) +
      (this.equipment.HIDE?.getSTRBonus() || 0) +
      getAbilityEffectBonus(this, 0);
    }
  }

  getDEX(calculateBonuses = true){
    if(!calculateBonuses){
      return this.dex;
    }else{
      return this.dex +
      (this.equipment.HEAD?.getDEXBonus() || 0) +
      (this.equipment.ARMOR?.getDEXBonus() || 0) +
      (this.equipment.ARMS?.getDEXBonus() || 0) +
      (this.equipment.RIGHTHAND?.getDEXBonus() || 0) +
      (this.equipment.LEFTHAND?.getDEXBonus() || 0) +
      (this.equipment.LEFTARMBAND?.getDEXBonus() || 0) +
      (this.equipment.RIGHTARMBAND?.getDEXBonus() || 0) +
      (this.equipment.IMPLANT?.getDEXBonus() || 0) +
      (this.equipment.BELT?.getDEXBonus() || 0) +
      (this.equipment.CLAW1?.getDEXBonus() || 0) +
      (this.equipment.CLAW2?.getDEXBonus() || 0) +
      (this.equipment.HIDE?.getDEXBonus() || 0) +
      getAbilityEffectBonus(this, 1);
    }
  }

  getCON(calculateBonuses = true){
    if(!calculateBonuses){
      return this.con;
    }else{
      return this.con +
      (this.equipment.HEAD?.getCONBonus() || 0) +
      (this.equipment.ARMOR?.getCONBonus() || 0) +
      (this.equipment.ARMS?.getCONBonus() || 0) +
      (this.equipment.RIGHTHAND?.getCONBonus() || 0) +
      (this.equipment.LEFTHAND?.getCONBonus() || 0) +
      (this.equipment.LEFTARMBAND?.getCONBonus() || 0) +
      (this.equipment.RIGHTARMBAND?.getCONBonus() || 0) +
      (this.equipment.IMPLANT?.getCONBonus() || 0) +
      (this.equipment.BELT?.getCONBonus() || 0) +
      (this.equipment.CLAW1?.getCONBonus() || 0) +
      (this.equipment.CLAW2?.getCONBonus() || 0) +
      (this.equipment.HIDE?.getCONBonus() || 0) +
      getAbilityEffectBonus(this, 2);
    }
  }

  getCHA(calculateBonuses = true){
    if(!calculateBonuses){
      return this.cha;
    }else{
      return this.cha +
      (this.equipment.HEAD?.getCHABonus() || 0) +
      (this.equipment.ARMOR?.getCHABonus() || 0) +
      (this.equipment.ARMS?.getCHABonus() || 0) +
      (this.equipment.RIGHTHAND?.getCHABonus() || 0) +
      (this.equipment.LEFTHAND?.getCHABonus() || 0) +
      (this.equipment.LEFTARMBAND?.getCHABonus() || 0) +
      (this.equipment.RIGHTARMBAND?.getCHABonus() || 0) +
      (this.equipment.IMPLANT?.getCHABonus() || 0) +
      (this.equipment.BELT?.getCHABonus() || 0) +
      (this.equipment.CLAW1?.getCHABonus() || 0) +
      (this.equipment.CLAW2?.getCHABonus() || 0) +
      (this.equipment.HIDE?.getCHABonus() || 0) +
      getAbilityEffectBonus(this, 5);
    }
  }

  getWIS(calculateBonuses = true){
    if(!calculateBonuses){
      return this.wis;
    }else{
      return this.wis +
      (this.equipment.HEAD?.getWISBonus() || 0) +
      (this.equipment.ARMOR?.getWISBonus() || 0) +
      (this.equipment.ARMS?.getWISBonus() || 0) +
      (this.equipment.RIGHTHAND?.getWISBonus() || 0) +
      (this.equipment.LEFTHAND?.getWISBonus() || 0) +
      (this.equipment.LEFTARMBAND?.getWISBonus() || 0) +
      (this.equipment.RIGHTARMBAND?.getWISBonus() || 0) +
      (this.equipment.IMPLANT?.getWISBonus() || 0) +
      (this.equipment.BELT?.getWISBonus() || 0) +
      (this.equipment.CLAW1?.getWISBonus() || 0) +
      (this.equipment.CLAW2?.getWISBonus() || 0) +
      (this.equipment.HIDE?.getWISBonus() || 0) +
      getAbilityEffectBonus(this, 4);
    }
  }

  /**
   * Get the fortitude save — GetFortSavingThrow.
   * CON + FortSaveThrow + class/conditioning + effects.
   */
  getFortitudeSave(){
    return combineSavingThrow(this.getCreatureSavingThrowBase(1), getSavingThrowEffectBonus(this, 1));
  }

  /**
   * Get the reflex save — GetReflexSavingThrow.
   */
  getReflexSave(){
    return combineSavingThrow(this.getCreatureSavingThrowBase(2), getSavingThrowEffectBonus(this, 2));
  }

  /**
   * Get the will save — GetWillSavingThrow.
   */
  getWillSave(){
    return combineSavingThrow(this.getCreatureSavingThrowBase(3), getSavingThrowEffectBonus(this, 3));
  }

  /**
   * Fortitude save — SavingThrowRoll type 1.
   * @returns 0 fail, 1 success, 2 immune
   */
  fortitudeSave(nDC = 0, nSaveType = 0, oVersus: ModuleObject = undefined){
    return this.savingThrowRoll(1, nDC, nSaveType, oVersus);
  }

  /**
   * Reflex save — SavingThrowRoll type 2.
   * @returns 0 fail, 1 success, 2 immune
   */
  reflexSave(nDC = 0, nSaveType = 0, oVersus: ModuleObject = undefined){
    return this.savingThrowRoll(2, nDC, nSaveType, oVersus);
  }

  /**
   * Will save — SavingThrowRoll type 3.
   * @returns 0 fail, 1 success, 2 immune
   */
  willSave(nDC = 0, nSaveType = 0, oVersus: ModuleObject = undefined){
    return this.savingThrowRoll(3, nDC, nSaveType, oVersus);
  }

  private getConditioningSaveBonus(): number {
    if(this.getHasFeat?.(CombatFeatType.MASTER_CONDITIONING)) return 3;
    if(this.getHasFeat?.(CombatFeatType.IMPROVED_CONDITIONING)) return 2;
    if(this.getHasFeat?.(CombatFeatType.CONDITIONING)) return 1;
    return 0;
  }

  private getClassSavingThrowBonus(kind: number): number {
    let total = 0;
    const classes = this.classes || [];
    for(let i = 0; i < classes.length; i++){
      const creatureClass = classes[i];
      if(!creatureClass) continue;
      if(kind === 1){
        total += creatureClass.getFortSaveBonus?.() || 0;
      }else if(kind === 2){
        total += creatureClass.getRefSaveBonus?.() || 0;
      }else{
        total += creatureClass.getWillSaveBonus?.() || 0;
      }
    }
    return total + this.getConditioningSaveBonus();
  }

  private getCreatureSavingThrowBase(kind: number): number {
    let abilityMod = 0;
    let gffBonus = 0;
    if(kind === 1){
      abilityMod = CombatRound.GetMod(this.getCON());
      gffBonus = this.fortitudeSaveThrow | 0;
    }else if(kind === 2){
      abilityMod = CombatRound.GetMod(this.getDEX());
      if(this.isDebilitated?.() && abilityMod > 0){
        abilityMod = 0;
      }
      gffBonus = this.reflexSaveThrow | 0;
    }else{
      abilityMod = CombatRound.GetMod(this.getWIS());
      gffBonus = this.willSaveThrow | 0;
    }
    return abilityMod + gffBonus + this.getClassSavingThrowBonus(kind);
  }

  private savingThrowRoll(
    kind: number,
    nDC: number,
    nSaveType: number,
    oVersus?: ModuleObject
  ): number {
    const versus = isCreature(oVersus) ? oVersus : undefined;
    const base = this.getCreatureSavingThrowBase(kind);
    let effectBonus = getSavingThrowEffectBonus(this, kind, nSaveType | 0, versus);
    if(effectBonus > 20) effectBonus = 20;
    const d20 = Dice.roll(1, DiceType.d20);
    if(rollSavingThrow(combineSavingThrow(base, effectBonus), nDC, d20)){
      return 1;
    }

    const spellId = this.combatData?.lastForcePowerUsed?.id
      ?? (this as any).lastSpellId;
    let spellSchool: number | undefined;
    if(typeof spellId === 'number' && spellId >= 0){
      const spellRow = (GameState as any).SWRuleSet?.spells?.[spellId]
        ?? (GameState as any).TwoDAManager?.datatables?.get?.('spells')?.rows?.[spellId];
      const school = spellRow?.school ?? spellRow?.School;
      if(school !== undefined && school !== ''){
        spellSchool = parseInt(school, 10);
      }
    }
    const immunityType = savingThrowTypeToImmunity(nSaveType, spellSchool);
    if(immunityType && hasImmunityType(this, immunityType, versus)){
      return 2;
    }
    return 0;
  }

  getINT(calculateBonuses = true){
    if(!calculateBonuses){
      return this.int;
    }else{
      return this.int +
      (this.equipment.HEAD?.getINTBonus() || 0) +
      (this.equipment.ARMOR?.getINTBonus() || 0) +
      (this.equipment.ARMS?.getINTBonus() || 0) +
      (this.equipment.RIGHTHAND?.getINTBonus() || 0) +
      (this.equipment.LEFTHAND?.getINTBonus() || 0) +
      (this.equipment.LEFTARMBAND?.getINTBonus() || 0) +
      (this.equipment.RIGHTARMBAND?.getINTBonus() || 0) +
      (this.equipment.IMPLANT?.getINTBonus() || 0) +
      (this.equipment.BELT?.getINTBonus() || 0) +
      (this.equipment.CLAW1?.getINTBonus() || 0) +
      (this.equipment.CLAW2?.getINTBonus() || 0) +
      (this.equipment.HIDE?.getINTBonus() || 0) +
      getAbilityEffectBonus(this, 3);
    }
  }

  /**
   * CalculateSpellSaveDC
   * 5 + total level + WIS mod + CHA mod + Force Focus (+1/+2/+4).
   */
  getSpellSaveDC(){
    const wisMod = Math.floor((this.getWIS() - 10) / 2);
    const chaMod = Math.floor((this.getCHA() - 10) / 2);
    let dc = 5 + this.getTotalClassLevel() + wisMod + chaMod;
    if(this.getHasFeat(CombatFeatType.FORCE_FOCUS_MASTERY)){
      return dc + 4;
    }
    if(this.getHasFeat(CombatFeatType.FORCE_FOCUS_ADVANCED)){
      return dc + 2;
    }
    if(this.getHasFeat(CombatFeatType.FORCE_FOCUS)){
      return dc + 1;
    }
    return dc;
  }

  getSpellCasterLevel(){
    let level = 0;
    for(let i = 0; i < this.classes.length; i++){
      if(this.classes[i].spellcaster){
        level += this.classes[i].level;
      }
    }
    return level;
  }

  getIsPC(){
    return this.isPC;
  }

  getPortraitId(){
    return this.portraitId;
  }

  getPortraitResRef(){
    if(!this.portrait) return '';
    return this.portrait.getPortraitGoodEvil(this.goodEvil);
  }

  getWalkRateId(){
    return this.walkRate;
  }

  /** NWScript GetMovementRate — WalkRate id (0 if invalid). */
  getMovementRate(){
    return this.getWalkRateId() | 0;
  }

  getName(){
    return this.firstName instanceof CExoLocString ? this.firstName.getValue() : (this.firstName || '');
  }

  getAppearance(): SWCreatureAppearance | undefined {
    return this.creatureAppearance;
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
    const idx = this.animationState?.index;
    if(
      idx === ModuleCreatureAnimState.RUNNING ||
      idx === ModuleCreatureAnimState.WALKING ||
      idx === ModuleCreatureAnimState.WALKING_BACK
    ){
      this.setAnimationState(ModuleCreatureAnimState.PAUSE);
    }
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
      const animDist = nextAnim === ModuleCreatureAnimState.RUNNING
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
   */
  private updateServerLocomotionAnimationRate(){
    if(!(this.speed > 0)){
      this.animSpeed = 1;
      return;
    }
    const running = this.animationState.index == ModuleCreatureAnimState.RUNNING;
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
    return this.creatureAppearance?.hitdist ?? 1;
  }

  /** appearance.hitradius — unengaged DesiredAttackRange. */
  getHitRadius(){
    return this.creatureAppearance?.hitradius ?? 1;
  }

  /** appearance.creperspace — creature spacing / engaged DesiredAttackRange. */
  getCreaturePersonalSpace(){
    return this.creatureAppearance?.creperspace ?? 1;
  }

  /** appearance.perspace — pathfind / walkmesh personal radius. */
  getPathPersonalSpace(){
    return this.creatureAppearance?.perspace ?? 1;
  }

  getMainClass(){
    if(!this.classes.length)
      return false;

    return this.classes[this.classes.length - 1];
  }

  /**
   * @param subtractNegatives — GetLevel(stats, 1): subtract class.negativeLevels
   */
  getTotalClassLevel(subtractNegatives = false){
    let total = 0;
    for(let i = 0, len = this.classes.length; i < len; i++){
      const cls = this.classes[i];
      let lv = cls.level || 0;
      if(subtractNegatives){
        lv = Math.max(0, lv - (cls.negativeLevels || 0));
      }
      total += lv;
    }
    return total;
  }

  /**
   * GetForceItemMask — bit flags from equipped baseitem types
   * used by CastSpell forbid/require mask checks.
   */
  getForceItemMask(): number {
    let mask = 0;
    const slots = this.equipment;
    if(!slots) return 0;
    const items = [
      slots.HEAD, slots.ARMOR, slots.ARMS, slots.RIGHTHAND, slots.LEFTHAND,
      slots.LEFTARMBAND, slots.RIGHTARMBAND, slots.IMPLANT, slots.BELT,
      slots.RIGHTHAND2, slots.LEFTHAND2,
    ];
    for(let i = 0; i < items.length; i++){
      const item = items[i];
      if(!item) continue;
      const t = item.baseItemId | 0;
      switch(t){
        case 0x1f: mask |= 0x01; break;
        case 0x20: mask |= 0x02; break;
        case 0x21: mask |= 0x04; break;
        case 0x22: mask |= 0x08; break;
        case 0x23: mask |= 0x10; break;
        case 0x24: mask |= 0x20; break;
        case 0x27:
        case 0x28:
        case 0x29: mask |= 0x40; break;
      }
    }
    return mask;
  }

  getClassLevel(nClass = 0, subtractNegatives = false){
    for(let i = 0, len = this.classes.length; i < len; i++){
      if(this.classes[i].id == nClass){
        let lv = this.classes[i].level || 0;
        if(subtractNegatives){
          lv = Math.max(0, lv - (this.classes[i].negativeLevels || 0));
        }
        return lv;
      }
    }
    return 0;
  }

  //Does the creature have enough EXP to level up
  canLevelUp(){
    let level = this.getTotalClassLevel();
    const xp = GameState.SWRuleSet?.expTable?.expList?.[level];
    if(typeof xp === 'number'){
      return this.getXP() >= xp;
    }
    return false;
  }

  //Get the effective creature level based on the creatures current amount of EXP
  getEffectiveLevel(){
    let level = 0;
    const expList = GameState.SWRuleSet?.expTable?.expList;
    if(expList?.length){
      for(let i = 0; i < expList.length; i++){
        if(this.getXP() >= (expList[i] | 0)){
          level = i;
        }
      }
    }
    return level;
  }

  getBaseAttackBonus(){
    // Class BAB only; ability mods are applied in the attack-roll resolver
    let bab = 0;
    for(let i = 0, len = this.classes.length; i < len; i++){
      bab += this.classes[i].getBaseAttackBonus();
    }
    return bab;
  }

  getFeats(){
    return this.feats || [];
  }

  getFeat(id = 0){
    let feats = this.getFeats();
    for(let i = 0, len = feats.length; i < len; i++){
      if(feats[i].id == id){
        return feats[i];
      }
    }
    return null;
  }

  addFeat(feat: number|TalentFeat = 0){
    if(feat instanceof TalentFeat){
      if(!this.getFeat(feat.id)){
        this.feats.push(feat);
      }
    }else{
      if(!this.getFeat(feat)){
        this.feats.push(new TalentFeat(feat));
      }
    }
  }

  getHasFeat(id: number = 0){
    let feats = this.getFeats();
    for(let i = 0, len = feats.length; i < len; i++){
      if(feats[i].id == id){
        return true;
      }
    }
    // bonus_feats list from EffectBonusFeat
    if(this.effects?.length){
      for(let i = 0; i < this.effects.length; i++){
        const e = this.effects[i];
        if(e?.type === GameEffectType.EffectBonusFeat && e.getInt(0) === id){
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get the remaining uses for the given feat.
   * @param id The ID of the feat to get the remaining uses for.
   * @returns The remaining uses for the given feat.
   */
  getFeatRemainingUses(id: number = 0): number {
    if(!this.getHasFeat(id)){
      return 0;
    }
    return 100;
  }

  getHasSkill(value: number){
    return this.skills[value].rank > 0;
  }

  /**
   * Get whether the creature can use the given skill.
   * @param value The value of the skill to get whether the creature can use.
   * @returns True if the creature can use the given skill, false otherwise.
   */
  getCanUseSkill(value: number): boolean {
    // aliases the mine subskills 100–102 to Demolitions.
    const skillId = value === 100 || value === 101 || value === 102
      ? 1
      : value;
    const skill = this.skills[skillId];
    if(!skill) return false;
    if(!skill.isUntrained()){
      // stores ranks as signed bytes; 0xff is -1, not 255 ranks.
      return ((skill.rank << 24) >> 24) > 0;
    }
    if(skill.canAllClassesUse()){
      return true;
    }
    for(let i = 0; i < this.classes.length; i++){
      const classSkill = skill.classData.get(this.classes[i].skillstable);
      if(classSkill?.isClassSkill){
        return true;
      }
    }
    return false;
  }

  /**
   * Get the skill rank for the given skill.
   * @param value The value of the skill to get the skill rank for.
   * @param raw Whether to return the raw skill rank.
   * @returns The skill rank for the given skill.
   */
  getSkillRank(value: number, raw: boolean = false){
    const skills = this.skills;
    if(!skills || value < 0 || value >= skills.length){
      return 0;
    }

    const skill = skills[value] as TalentSkill;
    let rank = ((skill.rank << 24) >> 24);

    if(raw){
      return ModuleCreature.clampSkillRank(rank);
    }

    // Trained-only skills with no ranks contribute nothing.
    if(!skill.isUntrained?.() && rank === 0){
      return 0;
    }

    // Effect skill increase / decrease
    if(this.effects?.length){
      for(let i = 0; i < this.effects.length; i++){
        const e = this.effects[i];
        if(e?.type === GameEffectType.EffectSkillIncrease && e.getInt(0) === value){
          rank += e.getInt(1) || 0;
        }else if(e?.type === GameEffectType.EffectSkillDecrease){
          const id = e.getInt(0);
          if(id === value || id === 0xff){
            rank -= e.getInt(1) || 0;
          }
        }
      }
    }

    const keyRaw = skill.getKeyAbility?.() || skill.keyAbility || '';
    const keyNum = parseInt(String(keyRaw), 10);
    const key = Number.isNaN(keyNum) ? String(keyRaw).toLowerCase() : keyNum;

    switch(key){
      case 0:
      case 'str':
        rank += getAbilityModifier(this.getSTR());
        if(isCreatureBlind(this)) rank -= 4;
        break;
      case 1:
      case 'dex': {
        const dexMod = getAbilityModifier(this.getDEX());
        if(this.isDebilitated?.()){
          rank += dexMod < 0 ? dexMod : 0;
        }else{
          rank += dexMod;
        }
        if(isCreatureBlind(this)) rank -= 4;
        break;
      }
      case 2:
      case 'con':
        rank += getAbilityModifier(this.getCON());
        break;
      case 3:
      case 'int':
        rank += getAbilityModifier(this.getINT());
        break;
      case 4:
      case 'wis':
        rank += getAbilityModifier(this.getWIS());
        break;
      case 5:
      case 'cha':
        rank += getAbilityModifier(this.getCHA());
        break;
      default:
        break;
    }

    if(skill.hasArmorCheckPenalty?.() || skill.armorCheckPenalty){
      rank += (this.combatInformation?.armorCheckPen | 0);
    }

    rank += this.getSkillFeatBonus(value);

    return ModuleCreature.clampSkillRank(rank);
  }

  private static clampSkillRank(rank: number): number {
    if(rank > 0x7e) return 0x7f;
    if(rank < -0x7e) return -0x7f;
    return rank | 0;
  }

  /**
   * Get the skill feat bonus for the given skill.
   * @param skillId The ID of the skill to get the skill feat bonus for.
   * @returns The skill feat bonus for the given skill.
   */
  private getSkillFeatBonus(skillId: number): number {
    const has = (id: number) => !!this.getHasFeat?.(id);

    switch(skillId){
      case SkillType.COMPUTER_USE:
        if(has(CombatFeatType.GEAR_HEAD_MASTER)) return 3;
        if(has(CombatFeatType.GEAR_HEAD_ADEPT)) return 2;
        if(has(CombatFeatType.GEAR_HEAD)) return 1;
        return 0;
      case SkillType.DEMOLITIONS:
      case SkillType.STEALTH:
        if(has(CombatFeatType.MASTER_CAUTION)) return 3;
        if(has(CombatFeatType.IMPROVED_CAUTION)) return 2;
        if(has(CombatFeatType.CAUTIOUS)) return 1;
        return 0;
      case SkillType.AWARENESS:
      case SkillType.PERSUADE:
      case SkillType.TREAT_INJURY:
        if(has(CombatFeatType.MASTER__EMPATHY)) return 3;
        if(has(CombatFeatType.IMPROVED_EMPATHY)) return 2;
        if(has(CombatFeatType.EMPATHY)) return 1;
        return 0;
      case SkillType.REPAIR:
      case SkillType.SECURITY:
        if(has(CombatFeatType.GEAR_HEAD_MASTER)) return 3;
        if(has(CombatFeatType.GEAR_HEAD_ADEPT)) return 2;
        if(has(CombatFeatType.GEAR_HEAD)) return 1;
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Get whether the creature is stealthed or invisible.
   * @returns True if the creature is stealthed or invisible, false otherwise.
   */
  isStealthedOrInvisible(): boolean {
    if(this.stealthMode) return true;
    if(this.hasEffect?.(GameEffectType.EffectInvisibility)) return true;
    if(this.hasEffect?.(GameEffectType.EffectSanctuary)) return true;
    return false;
  }

  /**
   * Get whether the target is effect-hidden from this observer.
   * @param target The target to get whether is effect-hidden from this observer.
   * @returns True if the target is effect-hidden from this observer, false otherwise.
   */
  isInvisibleToObserver(target: ModuleCreature): boolean {
    if(!target || this === target) return false;

    const detect = getDetectFlags(this);
    if(detect & DETECT_FLAG_TRUE_SEEING){
      return false;
    }
    const seeInvis = !!(detect & DETECT_FLAG_SEE_INVISIBLE);
    const pierceDark = !!(detect & (DETECT_FLAG_ULTRA_VISION | DETECT_FLAG_TRUE_SEEING));

    const effects = target.effects || [];
    for(let i = 0; i < effects.length; i++){
      const e = effects[i];
      if(!e) continue;

      if(e.type === GameEffectType.EffectInvisibility){
        const mode = e.getInt(0) || 1;
        // mode 2 (darkness): UltraVision / True Seeing pierce
        if(mode === 2){
          if(!pierceDark) return true;
        }else if(mode === 1 || mode === 4){
          if(!seeInvis) return true;
        }else if(!seeInvis){
          return true;
        }
      }

      if(e.type === GameEffectType.EffectSanctuary){
        const hostile = typeof this.isHostile === 'function'
          ? this.isHostile(target)
          : (this.factionId !== target.factionId);
        if(!hostile) continue;
        const dc = (e as EffectSanctuary).getWillDC?.() || e.getInt(4) || 0;
        if(dc <= 0 || !this.willSave(dc, 0, target)){
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Spot check: observer Awareness vs target Hide while stealthed.
   * Returns true if this observer sees the target.
   */
  doSpotDetection(target: ModuleCreature): boolean {
    if(!target) return false;
    // DoSpotDetection: GetBlind observer fails spot
    if(isCreatureBlind(this)){
      return false;
    }
    if(!target.isStealthedOrInvisible()) return true;

    const hideRank = target.getSkillLevel?.(SkillType.STEALTH) || 0;
    if(hideRank < 1 && !target.stealthMode){
      return true;
    }

    const hideDice = Dice.roll(1, DiceType.d10);
    let awareness = this.getSkillLevel?.(SkillType.AWARENESS) || 0;
    const detectMode = !!this.detectMode;
    if(!detectMode){
      awareness = Math.floor(awareness / 2);
    }
    const spotDice = Dice.roll(1, DiceType.d10);

    let score = awareness + spotDice - hideRank - hideDice;

    const toTarget = target.position.clone().sub(this.position);
    toTarget.z = 0;
    if(toTarget.lengthSq() > 0.0001){
      toTarget.normalize();
      const facing = this.getFacingVector?.() || new THREE.Vector3(0, 1, 0);
      facing.z = 0;
      if(facing.lengthSq() > 0.0001){
        facing.normalize();
        const dot = toTarget.x * facing.x + toTarget.y * facing.y;
        if(dot < -0.707){
          score -= 5;
        }
      }
    }

    if(this.combatData?.combatState || this.combatRound?.roundStarted){
      score -= 10;
    }

    const targetMoving = (target.force || 0) > 0.01 || (target.speed || 0) > 0.01;
    const observerMoving = (this.force || 0) > 0.01 || (this.speed || 0) > 0.01;
    if(!targetMoving) score -= 5;
    if(!observerMoving) score += 5;

    const dist = this.position.distanceTo(target.position);
    const distFactor = dist / 3;
    if(distFactor > 2){
      score -= Math.floor(distFactor - 2);
    }

    return score >= 1;
  }

  doListenDetection(target: ModuleCreature): boolean {
    return this.doSpotDetection(target);
  }

  /**
   * True if this observer can detect a (possibly stealthed/invisible) target.
   */
  doStealthDetection(target: ModuleCreature): boolean {
    // Effect invisibility / sanctuary not pierced → cannot detect
    if(this.isInvisibleToObserver(target)){
      return false;
    }
    if(!target.isStealthedOrInvisible()){
      return true;
    }
    // Contested hide for stealth mode (and residual invis that was pierced)
    return this.doSpotDetection(target) || this.doListenDetection(target);
  }

  getSkillLevel(value: number){
    return this.getSkillRank(value, false);
  }

  /**
   * IsStealthCapable — skill + stealth device on belt/hide.
   */
  isStealthCapable(): boolean {
    if(this.area?.restrictMode) return false;
    if(this.getSkillLevel(2) < 1) return false; // SkillType.STEALTH
    const belt = this.equipment?.BELT;
    const hide = this.equipment?.HIDE;
    const isStealthDevice = (item: ModuleItem) =>
      !!item && (
        item.baseItemId === BaseItemType.STEALTH_UNIT ||
        item.baseItem?.itemType === 0x2c
      );
    if(isStealthDevice(belt)) return true;
    if(isStealthDevice(hide)) return true;
    return false;
  }

  /**
   * SetStealthMode — toggle invisibility for party stealth.
   */
  setStealthMode(enabled: boolean){
    const next = !!enabled;
    if(this.stealthMode === next) return;
    this.stealthMode = next;
    if(next){
      const effect = new GameState.GameEffectFactory.EffectInvisibility();
      effect.setCreator(this);
      effect.setDurationType(GameEffectDurationType.PERMANENT);
      // INVISIBILITY_TYPE_NORMAL = 1 — stripped on combat engagement
      effect.setInt(0, 1);
      this.addEffect(effect);
    }else{
      const effects = this.effects ? this.effects.slice() : [];
      for(let i = 0; i < effects.length; i++){
        if(effects[i]?.type === GameEffectType.EffectInvisibility){
          this.removeEffect(effects[i]);
        }
      }
    }
  }

  /**
   * SetDetectMode — sets detect_mode; modified movement rate
   * only applies LimitMovementSpeed for stealth in KotOR (detect is a no-op there).
   */
  setDetectMode(enabled: boolean){
    const next = !!enabled;
    if(this.detectMode === next) return;
    this.detectMode = next;
  }

  /**
   * SetActivity — set/clear activity bits with combat-mode exclusivity.
   */
  setActivity(bits: number, enable: boolean, _param3: number = 0){
    const mask = bits | 0;
    if(!mask) return;
    if(enable && (this.activity & mask) === mask){
      return;
    }

    // Entering / clearing a combat-mode bit clears other unlocked combat-mode bits
    if(
      ((mask & COMBAT_MODE_ACTIVITY_MASK) !== 0 && enable) ||
      (mask === COMBAT_MODE_ACTIVITY_MASK && !enable)
    ){
      for(const bit of [0x100, 0x200, 0x400, 0x800, 0x1000, 0x2000]){
        if((this.activity & bit) !== 0 && (this.activityLocked & bit) === 0 && (mask & bit) === 0){
          this.setActivity(bit, false, 0);
        }
      }
    }

    // Skill-mode group 0xf8 exclusivity (simplified)
    if(((mask & 0xf8) !== 0 && enable) || (mask === 0xf8 && !enable)){
      for(const bit of [0x08, 0x10, 0x20, 0x40, 0x80]){
        if((this.activity & bit) !== 0 && (this.activityLocked & bit) === 0 && (mask & bit) === 0){
          this.setActivity(bit, false, 0);
        }
      }
    }

    if(enable){
      this.activity |= mask;
    }else{
      this.activity &= ~mask;
    }

    if((mask & 1) !== 0){
      if(enable){
        if((this.activity & 0xc) === 0){
          this.setStealthMode(true);
        }else{
          this.activity &= ~1;
        }
      }else{
        this.setStealthMode(false);
      }
    }
    if((mask & 2) !== 0){
      this.setDetectMode(enable);
    }
    // dialog-stop (4) left as no-op beyond the bit itself (StopDialog on clear)
  }

  /**
   * ActivityManager
   * param 1 clears skill/combat soft modes; param 4 clears stealth/dialog for CounterSpell.
   */
  activityManager(reason: number){
    if(reason === 4){
      if((this.activity & 1) !== 0 && (this.activityLocked & 1) === 0){
        this.activity &= ~1;
        this.setStealthMode(false);
      }
      if((this.activity & 4) !== 0 && (this.activityLocked & 4) === 0){
        this.activity &= ~4;
      }
      if((this.activity & 8) !== 0 && (this.activityLocked & 8) === 0){
        this.activity &= ~8;
      }
      return;
    }

    if((this.activityLocked & COMBAT_MODE_ACTIVITY_MASK) !== COMBAT_MODE_ACTIVITY_MASK){
      for(const bit of [0x100, 0x200, 0x400, 0x800, 0x1000, 0x2000]){
        if((this.activity & bit) !== 0 && (this.activityLocked & bit) === 0){
          this.setActivity(bit, false, 0);
        }
      }
      this.activity &= ~COMBAT_MODE_ACTIVITY_MASK;
    }

    if(reason === 1){
      if((this.activity & 1) !== 0 && (this.activityLocked & 1) === 0){
        this.activity &= ~1;
        this.setStealthMode(false);
      }
      if((this.activity & 4) !== 0 && (this.activityLocked & 4) === 0){
        this.activity &= ~4;
      }
      for(const bit of [0x08, 0x10, 0x20, 0x40, 0x80]){
        if((this.activity & bit) !== 0 && (this.activityLocked & bit) === 0){
          this.activity &= ~bit;
        }
      }
    }
  }

  /**
   * SetCombatMode — maps mode → activity bit; defers while round started.
   */
  setCombatMode(mode: number, forceImmediate: boolean = false){
    const next = (mode | 0) as CombatMode;

    if(!forceImmediate && next === this.combatMode){
      return;
    }

    if(!forceImmediate && next !== CombatMode.COUNTERSPELL && this.combatRound?.roundStarted){
      this.pendingCombatMode = next;
      return;
    }

    const prev = this.combatMode;
    this.combatMode = next;
    this.applyCombatModeActivityTransition(prev, next);
  }

  /**
   * Match SetCombatMode activity transitions; CounterSpell uses the same bit mapping.
   */
  private applyCombatModeActivityTransition(prev: CombatMode, next: CombatMode){
    if(next === CombatMode.MODE_1){
      this.setActivity(0x400, true, 0);
      return;
    }
    if(prev === CombatMode.MODE_1){
      this.setActivity(0x400, false, 0);
      // stops here when leaving mode 1; still apply next when forced
      if(next === CombatMode.NONE) return;
    }

    if(next === CombatMode.MODE_2){
      this.setActivity(0x100, true, 0);
      return;
    }
    if(prev === CombatMode.MODE_2){
      this.setActivity(0x100, false, 0);
      if(next === CombatMode.NONE) return;
    }

    if(next === CombatMode.MODE_3){
      this.setActivity(0x200, true, 0);
      return;
    }
    if(prev === CombatMode.MODE_3){
      this.setActivity(0x200, false, 0);
      if(next === CombatMode.NONE) return;
    }

    if(next === CombatMode.COUNTERSPELL){
      this.setActivity(0x800, true, 0);
      return;
    }
    if(prev === CombatMode.COUNTERSPELL){
      this.setActivity(0x800, false, 0);
      if(next === CombatMode.NONE) return;
    }

    if(next === CombatMode.MODE_5){
      this.setActivity(0x1000, true, 0);
      return;
    }
    if(prev === CombatMode.MODE_5){
      this.setActivity(0x1000, false, 0);
      if(next === CombatMode.NONE) return;
    }

    if(next === CombatMode.MODE_6){
      this.setActivity(0x2000, true, 0);
      return;
    }
    if(prev === CombatMode.MODE_6){
      this.setActivity(0x2000, false, 0);
    }
  }

  /**
   * CounterSpell combat-mode enter
   * ActivityManager(4) then set mode 4 / activity 0x800 (or clear prior mode bit).
   */
  enterCounterSpellMode(){
    this.activityManager(4);
    if(this.combatMode === CombatMode.COUNTERSPELL){
      return;
    }
    const prev = this.combatMode;
    this.combatMode = CombatMode.COUNTERSPELL;
    if(prev === CombatMode.MODE_1){
      this.setActivity(0x400, false, 0);
    }else if(prev === CombatMode.MODE_2){
      this.setActivity(0x100, false, 0);
    }else if(prev === CombatMode.MODE_3){
      this.setActivity(0x200, false, 0);
    }else{
      this.setActivity(0x800, true, 0);
    }
  }

  /** Clear combat mode (QueueAttackActions / leave CounterSpell). */
  clearCombatMode(){
    this.pendingCombatMode = -1;
    if(this.combatMode === CombatMode.NONE) return;
    const prev = this.combatMode;
    this.combatMode = CombatMode.NONE;
    this.applyCombatModeActivityTransition(prev, CombatMode.NONE);
  }

  toggleStealthMode(){
    if(!this.isStealthCapable()) return false;
    this.setStealthMode(!this.stealthMode);
    return this.stealthMode;
  }

  getHasSpell(id = 0){
    return (this.getSpell(id) instanceof TalentSpell) ? true : false;
  }

  /**
   * Set the active Jedi Form spell id if the creature knows it.
   */
  setCurrentForm(formId = 0){
    if(formId && !this.getHasSpell(formId)) return;
    this.currentForm = formId || 0;
  }

  getCurrentForm(){
    return this.currentForm || 0;
  }

  /**
   * Whether the given form is active. Saber forms also require a lightsaber.
   */
  isFormActive(formId = 0){
    if(!formId || this.currentForm != formId) return false;
    if(formId >= 258 && formId <= 264){
      const right = this.equipment?.RIGHTHAND;
      const left = this.equipment?.LEFTHAND;
      return !!(right?.isLightsaber?.() || left?.isLightsaber?.());
    }
    return true;
  }

  getSpell(id = 0){
    for(let i = 0; i < this.classes.length; i++){
      let cls = this.classes[i];
      let spells = cls.getSpells();
      for(let j = 0, len = spells.length; j < len; j++){
        let spell = spells[j];
        if(spell.id == id)
          return spell;
      }
    }

    if(typeof this.equipment.RIGHTARMBAND != 'undefined'){
      let spells = this.equipment.RIGHTARMBAND.getSpells();
      for(let i = 0, len = spells.length; i < len; i++){
        if(spells[i].id == id){
          return spells[i];
        }
      }
    }

    if(typeof this.equipment.LEFTARMBAND != 'undefined'){
      let spells = this.equipment.LEFTARMBAND.getSpells();
      for(let i = 0, len = spells.length; i < len; i++){
        if(spells[i].id == id){
          return spells[i];
        }
      }
    }

    return undefined;
  }

  hasTalent(talent: TalentObject){
    if(typeof talent == 'undefined') return false;
    if((talent.objectType & TalentObjectType.TalentSpell) !== 0){
      return this.getHasSpell(talent.id) ? true : false;
    }
    if((talent.objectType & TalentObjectType.TalentFeat) !== 0){
      return this.getHasFeat(talent.id) ? true : false;
    }
    if((talent.objectType & TalentObjectType.TalentSkill) !== 0){
      return this.getHasSkill(talent.id) ? true : false;
    }
    return false;
  }

  getTalents(){

    let talents: TalentObject[] = [];

    //Merge Spell Talents from all classs
    for(let i = 0; i < this.classes.length; i++){
      talents = talents.concat(this.classes[i].getSpells());
    }

    //Merge Feat Talents
    talents = talents.concat(this.feats);
    //Merge Skill Talents
    talents = talents.concat(this.skills);

    return talents;

  }

  getSpells(): TalentSpell[] {
    const spells: TalentSpell[] = [];

    for(let i = 0, len = this.classes.length; i < len; i++){
      spells.push(...this.classes[i].getSpells());
    }

    if(typeof this.equipment.RIGHTARMBAND != 'undefined'){
      spells.push(...this.equipment.RIGHTARMBAND.getSpells());
    }

    if(typeof this.equipment.LEFTARMBAND != 'undefined'){
      spells.push(...this.equipment.LEFTARMBAND.getSpells());
    }

    return spells;
  }

  getClassSpells(){
    const spells = [];

    for(let i = 0, len = this.classes.length; i < len; i++){
      spells.push(...this.classes[i].getSpells());
    }

    return spells;
  }

  getRandomTalent(category = 0, category2 = 0){

    let talents = this.getTalents().filter( (talent: TalentObject) => talent.category == category || talent.category == category2 );
    let talent = talents[Math.floor(Math.random()*talents.length)];
    //console.log('getRandomTalent', talent);
    return talent;

  }

  getTalentBest(nCategory = 0, nCRMax = 0, nInclusion = 0, nExcludeType = -1, nExcludeId = -1){
    let talents = this.getTalents().filter( (talent: TalentObject) => ( talent.category > -1 && ( (talent.category & nCategory) == nCategory ) && talent.maxCR <= nCRMax ) );
    talents.sort((a: TalentObject, b: TalentObject) => (a.maxCR > b.maxCR) ? 1 : -1);
    //console.log('getTalentBest', talents);
    if(talents.length){
      return talents[0];
    }
    return undefined;
  }

  isSimpleCreature(){
    if(!this.creatureAppearance) return false;
    return this.creatureAppearance.modeltype === 'S' || this.creatureAppearance.modeltype === 'L';
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
    if(this.getTemplateResRef()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utc'], this.getTemplateResRef());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.merge(gff);
        this.initProperties();
        this.loadScripts();
        GameState.FactionManager.AddCreatureToFaction(this);
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
      GameState.FactionManager.AddCreatureToFaction(this);
    }
    
    if(!this.debugLabel){
      this.debugLabel = new TextSprite3D(`${this.getName()} | ${this.getTag()}`);
      this.debugLabel.setColor(this.helperColor);
      this.debugLabel.container.visible = !!this.context?.GetDebugState(EngineDebugType.OBJECT_LABELS);
      this.container.add(this.debugLabel.container);
    }
  }

  loadScripts (){

    const scriptKeys = [
      ModuleObjectScript.CreatureOnAttacked,
      ModuleObjectScript.CreatureOnDamaged,
      ModuleObjectScript.CreatureOnDeath,
      ModuleObjectScript.CreatureOnDialog,
      ModuleObjectScript.CreatureOnDisturbed,
      ModuleObjectScript.CreatureOnEndDialog,
      ModuleObjectScript.CreatureOnEndRound,
      ModuleObjectScript.CreatureOnHeartbeat,
      ModuleObjectScript.CreatureOnBlocked,
      ModuleObjectScript.CreatureOnNotice,
      ModuleObjectScript.CreatureOnRested,
      ModuleObjectScript.CreatureOnSpawn,
      ModuleObjectScript.CreatureOnSpellAt,
      ModuleObjectScript.CreatureOnUserDefined,
    ];

    const scriptsNode = this.template?.RootNode;
    if(!scriptsNode){ return; }
    
    for(const scriptKey of scriptKeys){
      if(scriptsNode.hasField(scriptKey)){
        const resRef = scriptsNode.getFieldByLabel(scriptKey).getValue();
        if(!resRef){ continue; }
        const nwscript = GameState.NWScript.Load(resRef);
        if(!nwscript){ 
          console.warn(`ModuleCreature.loadScripts: Failed to load script [${scriptKey}]:${resRef} for object ${this.name}`);
          continue; 
        }
        nwscript.bindOwner(this, scriptKey);
        this.scripts[scriptKey] = nwscript;
      }
    }

  }

  async loadModel (): Promise<OdysseyModel3D> {
    const generation = ++this.modelLoadGeneration;
    this.isReady = false;
    // Hide while rebuilding so bind/rest pose cannot flash if the container
    // is already in the scene (player path, equip / appearance reload).
    if(this.model instanceof OdysseyModel3D){
      this.model.visible = false;
    }
    await this.loadEquipmentModels();
    if(generation !== this.modelLoadGeneration){
      return this.model;
    }
    await this.loadBody(generation);
    if(generation !== this.modelLoadGeneration){
      return this.model;
    }
    if(this.model instanceof OdysseyModel3D){
      this.model.visible = false;
    }
    await this.loadHead(generation);
    if(generation !== this.modelLoadGeneration){
      return this.model;
    }
    this.isReady = true;
    this.settleWalkableAttachment();
    this.primeAnimationPose();
    this.update(0.0000000000000000000001);
    // updateModelVisibility is Mode-gated (INGAME); force visible after prime so a
    // stale room from the prior module cannot leave the mesh hidden under LOADING.
    if(this.model instanceof OdysseyModel3D){
      this.model.visible = true;
    }
    return this.model;
  }

  /**
   * Detach equipment / head meshes before disposing a body so recursive dispose
   * cannot destroy live ModuleItem.model instances that will be re-parented.
   */
  private detachEquippedModelsFromBody(){
    try{
      const rh = this.equipment.RIGHTHAND?.model;
      if(rh instanceof OdysseyModel3D){
        OdysseyModel3D.restoreAttachedEquipmentShadowCasting(rh);
      }
      if(rh?.parent) rh.parent.remove(rh);
    }catch(e){}
    try{
      const lh = this.equipment.LEFTHAND?.model;
      if(lh instanceof OdysseyModel3D){
        OdysseyModel3D.restoreAttachedEquipmentShadowCasting(lh);
      }
      if(lh?.parent) lh.parent.remove(lh);
    }catch(e){}
    try{
      const helm = this.equipment.HEAD?.model;
      if(helm instanceof OdysseyModel3D){
        OdysseyModel3D.restoreAttachedEquipmentShadowCasting(helm);
      }
      if(helm?.parent) helm.parent.remove(helm);
    }catch(e){}
    try{
      if(this.head?.parent) this.head.parent.remove(this.head);
    }catch(e){}
  }

  /** Enable rigid weapon/helm shadow casters on the creature rig. */
  private syncCreatureShadowCasters(){
    if(!this.shadowsEnabled){ return; }
    const mark = (model?: OdysseyModel3D) => {
      if(model instanceof OdysseyModel3D){
        OdysseyModel3D.markAttachedEquipmentShadowCasting(model, true);
      }
    };
    mark(this.equipment.RIGHTHAND?.model as OdysseyModel3D);
    mark(this.equipment.LEFTHAND?.model as OdysseyModel3D);
    mark(this.equipment.HEAD?.model as OdysseyModel3D);
  }

  async loadBody(generation?: number) {
    let appearance = this.creatureAppearance;
    let bodyVariation: string = this.equipment.ARMOR?.getBodyVariation() || '';
    let textureVariation: number = this.equipment.ARMOR?.getTextureVariation() || 1;
    const hasBodyVariation = !!(bodyVariation && bodyVariation.length);
    const maxBodyIndex = SWCreatureAppearance.maxBodyVariationIndex(
      GameState.GameKey === GameEngineType.TSL
    );
    const { model: bodyModel, texture: bodyTexture } = appearance.getBodyModelInfo(
      bodyVariation,
      textureVariation,
      maxBodyIndex,
      this.getGoodEvil(),
      hasBodyVariation,
    );
    this.bodyModel = bodyModel;
    this.bodyTexture = bodyTexture;

    if(!this.bodyModel || this.bodyModel.length === 0){
      if(generation !== undefined && generation !== this.modelLoadGeneration){
        return this.model;
      }
      this.detachEquippedModelsFromBody();
      if(this.model){
        this.model.removeFromParent();
        try{ this.model.dispose(); }catch(e){}
      }
      this.model = new OdysseyModel3D();
      return this.model;
    }
    
    try{
      const mdl = await MDLLoader.loader.load(this.bodyModel);
      // CreateSimple / CreateBTypeBody — appearance.2da ENVMAP
      // is applied to all body parts via envmap assign, falling back to "DEFAULT" when blank.
      const envMapOverride = appearance.envmap?.length ? appearance.envmap : 'DEFAULT';
      const model = await OdysseyModel3D.FromMDL(mdl, {
        castShadow: true,
        receiveShadow: false,
        shadowsEnabled: this.shadowsEnabled,
        textureVar: this.bodyTexture,
        isHologram: this.isHologram,
        envMapOverride: envMapOverride,
        context: this.context,
      });

      if(generation !== undefined && generation !== this.modelLoadGeneration){
        try{ model.dispose(); }catch(e){}
        return this.model;
      }

      this.detachEquippedModelsFromBody();
      if(this.model){
        this.model.removeFromParent();
        try{ this.model.dispose(); }catch(e){}
      }
      
      model.addEventListener('playEvent', this.playEvent.bind(this));

      this.model = model;
      this.model.userData.moduleObject = this;
      this.container.add(this.model);
      this.markCollisionBoundsDirty('model');
      this.computeBoundingBox();

      try{
        if(this.model.lhand instanceof OdysseyObject3D){
          if(this.equipment.LEFTHAND && this.equipment.LEFTHAND.model instanceof OdysseyModel3D){
            this.model.lhand.add(this.equipment.LEFTHAND.model);
          }
        }
      }catch(e){
        console.error('ModuleCreature.LoadBody', e);
      }

      try{
        if(this.model.rhand instanceof OdysseyObject3D){
          if(this.equipment.RIGHTHAND && this.equipment.RIGHTHAND.model instanceof OdysseyModel3D){
            this.model.rhand.add(this.equipment.RIGHTHAND.model);
          }
        }
      }catch(e){
        console.error('ModuleCreature.LoadBody', e);
      }

      this.syncCreatureShadowCasters();

      this.model.disableMatrixUpdate();
      const sizeCat = appearance.sizecategory ?? 3;
      void this.applyShadowBlob(ModuleObject.shadowBlobResRefFromSizeCategory(sizeCat));
      return this.model;
    }catch(e){
      console.error(e);
      this.model = new OdysseyModel3D();
      return this.model;
    }
  }

  /**
   * Resolve the live heads.2da row for rendered creatures.
   * creature appearance selection uses appearance.2da NORMALHEAD
   * BACKUPHEAD for normal creatures; do not treat UTC Appearance_Head as a
   * global render override here or NPCs collapse onto a shared heads row.
   */
  resolveAppearanceHeadId(): number {
    const appearance = this.creatureAppearance;
    if(!appearance) return -1;
    if(this.useBackupHead){
      return appearance.backuphead;
    }
    return appearance.normalhead;
  }

  /**
   * death anim path — play appearance.DeathVFX (visualeffects.2da id).
   * EffectVisualEffect attaches to the model's impact node (DeathVFXNode default).
   */
  playAppearanceDeathVFX(){
    const appearance = this.creatureAppearance;
    const vfxId = appearance?.deathvfx;
    if(!(typeof vfxId === 'number' && vfxId >= 0)) return;

    const vfx = new GameState.GameEffectFactory.EffectVisualEffect();
    vfx.setInt(0, vfxId);
    vfx.setDurationType(GameEffectDurationType.INSTANT);
    vfx.setCreator(this);
    const nodeName = (appearance.deathvfxnode || 'impact').replace(/\0[\s\S]*$/g, '').trim();
    if(nodeName){
      vfx.setString(0, nodeName);
    }
    this.addEffect(vfx);
  }

  async loadHead(generation?: number): Promise<OdysseyModel3D> {
    let appearance = this.creatureAppearance;
    let headId = this.resolveAppearanceHeadId();
    this.headModel = undefined;
    if(!( headId >= 0 && appearance.modeltype == 'B' )){
      return;
    }

    const headDetails = GameState.SWRuleSet.heads[headId];
    if(!headDetails){
      return;
    }

    const headTexture = headDetails.getTextureGoodEvil(this.getGoodEvil());
    this.headModel = headDetails.head;
    const mdl = await MDLLoader.loader.load(this.headModel);
 
    const head = await OdysseyModel3D.FromMDL(mdl, {
      context: this.context,
      castShadow: true,
      receiveShadow: false,
      shadowsEnabled: this.shadowsEnabled,
      isHologram: this.isHologram,
      textureVar: headTexture,
    });

    try
    {
      if(generation !== undefined && generation !== this.modelLoadGeneration){
        try{ head.dispose(); }catch(e){}
        return this.head;
      }

      try{
        const helm = this.equipment.HEAD?.model;
        if(helm?.parent) helm.parent.remove(helm);
      }catch(e){}

      if(this.head instanceof OdysseyModel3D){
        try{ this.head.parent?.remove(this.head); }catch(e){}
        try{ this.head.dispose(); }catch(e){}
      }

      this.head = head;
      this.head.userData.moduleObject = this;
      this.model.attachHead(head);

      try{
        if(this.head.gogglehook instanceof THREE.Object3D){
          if(this.equipment.HEAD && this.equipment.HEAD.model instanceof OdysseyModel3D){
            this.head.gogglehook.add(this.equipment.HEAD.model);
          }
        }
      }catch(e){
        console.error('ModuleCreature', e);
      }

      this.syncCreatureShadowCasters();
      
      this.head.disableMatrixUpdate();
      return this.head;
    }
    catch(e)
    {
      console.error(e);
    }
  }

  /*getEquip_ItemList{
    if(this.template.RootNode.hasField('Equip_ItemList')){
      return this.template.getFieldByLabel('Equip_ItemList').getChildStructs()
    }
    return [];
  }*/

  async equipItem(slot = 0x1, item: ModuleItem){
    if(!item){
      return;
    }

    // Skip appearance reload on unequip — ARMOR/HEAD re-equip awaits loadModel once.
    // An unawaited unequip reload races the awaited one and disposes hand weapons.
    this.unequipSlot(slot, false);
    if(GameState.module){
      GameState.module.lastItemEquipped = item;
    }
    item.onEquip(this);

    // Stamp hand slots before await so GN_GetWeaponType / attack resolve see the
    // new weapon immediately (ActionEquipItem does not await equipItem).
    switch(slot){
      case ModuleCreatureArmorSlot.RIGHTHAND:
        this.equipment.RIGHTHAND = item;
        await item.loadModel();
        if(item.model instanceof OdysseyModel3D)
          this.model?.rhand?.add(item.model);
        return;
      case ModuleCreatureArmorSlot.LEFTHAND:
        this.equipment.LEFTHAND = item;
        await item.loadModel();
        if(item.model instanceof OdysseyModel3D)
          this.model?.lhand?.add(item.model);
        return;
      case ModuleCreatureArmorSlot.RIGHTHAND2:
        this.equipment.RIGHTHAND2 = item;
        return;
      case ModuleCreatureArmorSlot.LEFTHAND2:
        this.equipment.LEFTHAND2 = item;
        return;
    }

    await item.loadModel();
    switch(slot){
      case ModuleCreatureArmorSlot.IMPLANT:
        this.equipment.IMPLANT = item;
      break;
      case ModuleCreatureArmorSlot.HEAD:
        this.equipment.HEAD = item;
        await this.loadModel();
      break;
      case ModuleCreatureArmorSlot.ARMS:
        this.equipment.ARMS = item;
      break;
      case ModuleCreatureArmorSlot.LEFTARMBAND:
        this.equipment.LEFTARMBAND = item;
      break;
      case ModuleCreatureArmorSlot.RIGHTARMBAND:
        this.equipment.RIGHTARMBAND = item;
      break;
      case ModuleCreatureArmorSlot.ARMOR:
        this.equipment.ARMOR = item;
        await this.loadModel();
      break;
      case ModuleCreatureArmorSlot.BELT:
        this.equipment.BELT = item;
      break;
      case ModuleCreatureArmorSlot.CLAW1:
        this.equipment.CLAW1 = item;
      break;
      case ModuleCreatureArmorSlot.CLAW2:
        this.equipment.CLAW2 = item;
      break;
      case ModuleCreatureArmorSlot.CLAW3:
        this.equipment.CLAW3 = item;
      break;
      case ModuleCreatureArmorSlot.HIDE:
        this.equipment.HIDE = item;
      break;
    }
  }

  /**
   * @param reloadModel When false, skip the body reload after clearing ARMOR/HEAD
   * (caller will reload). Default true for standalone unequip.
   */
  unequipSlot(slot = 0x1, reloadModel: boolean = true){
    try{
      switch(slot){
        case ModuleCreatureArmorSlot.IMPLANT:
          try{
            if(this.equipment.IMPLANT){
              const item = this.equipment.IMPLANT;
              this.equipment.IMPLANT = undefined;
              item.onUnEquip(this);
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.HEAD:
          if(this.equipment.HEAD){
            const item = this.equipment.HEAD;
            try{ item.model?.parent?.remove(item.model); }catch(e){}
            this.equipment.HEAD = undefined;
            item.onUnEquip(this);
            if(reloadModel){
              this.loadModel();
            }
          }
        break;
        case ModuleCreatureArmorSlot.ARMS:
          try{
            if(this.equipment.ARMS){
              const item = this.equipment.ARMS;
              this.equipment.ARMS = undefined;
              item.onUnEquip(this);
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.RIGHTARMBAND:
          try{
            if(this.equipment.RIGHTARMBAND){
              const item = this.equipment.RIGHTARMBAND;
              this.equipment.RIGHTARMBAND = undefined;
              item.onUnEquip(this);
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.LEFTARMBAND:
          try{
            if(this.equipment.LEFTARMBAND){
              const item = this.equipment.LEFTARMBAND;
              this.equipment.LEFTARMBAND = undefined;
              item.onUnEquip(this);
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.ARMOR:

          if(this.equipment.ARMOR){
            this.equipment.ARMOR.onUnEquip(this);
          }

          this.equipment.ARMOR = undefined;
          if(reloadModel){
            this.loadModel();
          }
        break;
        case ModuleCreatureArmorSlot.RIGHTHAND:
          try{
            if(this.equipment.RIGHTHAND){
              const item = this.equipment.RIGHTHAND;
              try{ this.model?.rhand?.remove(item.model); }catch(e){}
              this.equipment.RIGHTHAND = undefined;
              // Return to inventory — do not destroy (AI weapon switches).
              item.onUnEquip(this);
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.RIGHTHAND2:
          try{
            if(this.equipment.RIGHTHAND2){
              const item = this.equipment.RIGHTHAND2;
              this.equipment.RIGHTHAND2 = undefined;
              item.onUnEquip(this);
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.BELT:
          try{
            if(this.equipment.BELT){
              const item = this.equipment.BELT;
              try{ this.model?.rhand?.remove(item.model); }catch(e){}
              this.equipment.BELT = undefined;
              item.onUnEquip(this);
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.LEFTHAND:
          try{
            if(this.equipment.LEFTHAND){
              const item = this.equipment.LEFTHAND;
              try{ this.model?.lhand?.remove(item.model); }catch(e){}
              this.equipment.LEFTHAND = undefined;
              item.onUnEquip(this);
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.LEFTHAND2:
          try{
            if(this.equipment.LEFTHAND2){
              const item = this.equipment.LEFTHAND2;
              this.equipment.LEFTHAND2 = undefined;
              item.onUnEquip(this);
            }
          }catch(e){
            
          }
        break;
      }
    }catch(e){
      console.error('unequipItem', e);
    }
  }

  UnequipItems(){
    //this.unequipSlot(ModuleCreatureArmorSlot.ARMOR);
    this.unequipSlot(ModuleCreatureArmorSlot.LEFTHAND);
    this.unequipSlot(ModuleCreatureArmorSlot.RIGHTHAND);
  }

  UnequipHeadItem(){
    this.unequipSlot(ModuleCreatureArmorSlot.HEAD);
  }

  /**
   * Dialog HideEquippedItems — stash slot refs then unequip so ShowEquippedItems
   * can restore at conversation end (SetDialogDelay).
   */
  hideEquippedItemsForDialog(unequipItems: boolean = false, unequipHead: boolean = false){
    if(!this.dialogEquipmentStash){
      this.dialogEquipmentStash = {};
    }
    if(unequipItems){
      if(this.equipment.RIGHTHAND && this.dialogEquipmentStash.RIGHTHAND === undefined){
        this.dialogEquipmentStash.RIGHTHAND = this.equipment.RIGHTHAND;
      }
      if(this.equipment.LEFTHAND && this.dialogEquipmentStash.LEFTHAND === undefined){
        this.dialogEquipmentStash.LEFTHAND = this.equipment.LEFTHAND;
      }
      this.UnequipItems();
    }
    if(unequipHead){
      if(this.equipment.HEAD && this.dialogEquipmentStash.HEAD === undefined){
        this.dialogEquipmentStash.HEAD = this.equipment.HEAD;
      }
      this.UnequipHeadItem();
    }
  }

  /**
   * Dialog ShowEquippedItems — re-equip items stashed by hideEquippedItemsForDialog.
   */
  showEquippedItemsAfterDialog(){
    const stash = this.dialogEquipmentStash;
    if(!stash) return;
    const restore = (slot: number, item: ModuleItem | undefined) => {
      if(item){
        void this.equipItem(slot, item);
      }
    };
    restore(ModuleCreatureArmorSlot.RIGHTHAND, stash.RIGHTHAND);
    restore(ModuleCreatureArmorSlot.LEFTHAND, stash.LEFTHAND);
    restore(ModuleCreatureArmorSlot.HEAD, stash.HEAD);
    this.dialogEquipmentStash = undefined;
  }

  GetItemInSlot(slot = 0){

    switch(slot){
      case ModuleCreatureArmorSlot.IMPLANT:
        return this.equipment.IMPLANT;
      break;
      case ModuleCreatureArmorSlot.HEAD:
        return this.equipment.HEAD;
      break;
      case ModuleCreatureArmorSlot.ARMS:
        return this.equipment.ARMS;
      break;
      case ModuleCreatureArmorSlot.LEFTARMBAND:
        return this.equipment.LEFTARMBAND;
      break;
      case ModuleCreatureArmorSlot.ARMOR:
        return this.equipment.ARMOR;
      break;
      case ModuleCreatureArmorSlot.RIGHTARMBAND:
        return this.equipment.RIGHTARMBAND;
      break;
      case ModuleCreatureArmorSlot.LEFTHAND:
        return this.equipment.LEFTHAND;
      break;
      case ModuleCreatureArmorSlot.LEFTHAND2:
        return this.equipment.LEFTHAND2;
      break;
      case ModuleCreatureArmorSlot.BELT:
        return this.equipment.BELT;
      break;
      case ModuleCreatureArmorSlot.RIGHTHAND:
        return this.equipment.RIGHTHAND;
      break;
      case ModuleCreatureArmorSlot.RIGHTHAND2:
        return this.equipment.RIGHTHAND2;
      break;
      case ModuleCreatureArmorSlot.HIDE:
        return this.equipment.HIDE;
      break;
      case ModuleCreatureArmorSlot.CLAW1:
        return this.equipment.CLAW1;
      break;
      case ModuleCreatureArmorSlot.CLAW2:
        return this.equipment.CLAW2;
      break;
      case ModuleCreatureArmorSlot.CLAW3:
        return this.equipment.CLAW3;
      break;
      default:
        return null;
      break;
    }

  }

  setAppearance(appearance: number){
    this.appearance = appearance;
    this.creatureAppearance = GameState.AppearanceManager.GetCreatureAppearanceById(this.appearance);
    if(!this.creatureAppearance) return;

    this.headTrackingEnabled = this.creatureAppearance.headtrack !== 0;
    this.headMaxHorizontalAngle = (this.creatureAppearance.head_arc_h * Math.PI) / 180;
    this.headMaxVerticalAngle = (this.creatureAppearance.head_arc_v * Math.PI) / 180;
  }

  initProperties(){
    const needsRegister = !this.initialized;
    try{
      this.classes = [];
      this.feats = [];
      this.skills = GameState.SWRuleSet.skills.slice(0).map((skill: TalentSkill) => {
        return skill.clone();
      });
      
      if(needsRegister){
        if(BitWise.InstanceOf(this.objectType, ModuleObjectType.ModulePlayer)){
          // Prefer saved ObjectId from pc.utc so mid-combat Target/MasterID refs resolve.
          const savedId = this.template?.RootNode?.hasField('ObjectId')
            ? this.template.getFieldByLabel('ObjectId').getValue()
            : 0;
          if(savedId && savedId !== ModuleObjectConstant.OBJECT_INVALID){
            this.id = savedId;
          }else{
            this.id = GameState.ModuleObjectManager.GetNextPlayerId();
          }
        }else if(this.template.RootNode.hasField('ObjectId')){
          this.id = this.template.getFieldByLabel('ObjectId').getValue();
        }else if(this.template.RootNode.hasField('ID')){
          this.id = this.template.getFieldByLabel('ID').getValue();
        }
      }

      if(this.template.RootNode.hasField('Appearance_Type')){
        this.setAppearance(this.template.getFieldByLabel('Appearance_Type').getValue());
      }

      if(this.template.RootNode.hasField('AreaId')){
        // SaveCreature AreaId — area attach restores live area; keep as metadata only
        this.savedAreaId = this.template.getFieldByLabel('AreaId').getValue() >>> 0;
      }

      if(this.template.RootNode.hasField('Age'))
        this.age = this.template.getFieldByLabel('Age').getValue() | 0;

      if(this.template.RootNode.hasField('AIState'))
        this.aiState = this.template.getFieldByLabel('AIState').getValue() | 0;

      if(this.template.RootNode.hasField('AmbientAnimState'))
        this.ambientAnimState = this.template.getFieldByLabel('AmbientAnimState').getValue() | 0;

      if(this.template.RootNode.hasField('Appearance_Head'))
        this.appearanceHead = this.template.getFieldByLabel('Appearance_Head').getValue();

      if(this.template.RootNode.hasField('Color_Hair'))
        this.colorHair = this.template.getFieldByLabel('Color_Hair').getValue();
      if(this.template.RootNode.hasField('Color_Skin'))
        this.colorSkin = this.template.getFieldByLabel('Color_Skin').getValue();
      if(this.template.RootNode.hasField('Color_Tattoo1'))
        this.colorTattoo1 = this.template.getFieldByLabel('Color_Tattoo1').getValue();
      if(this.template.RootNode.hasField('Color_Tattoo2'))
        this.colorTattoo2 = this.template.getFieldByLabel('Color_Tattoo2').getValue();

      if(this.template.RootNode.hasField('DuplicatingHead'))
        this.duplicatingHead = this.template.getFieldByLabel('DuplicatingHead').getValue();
      if(this.template.RootNode.hasField('UseBackupHead'))
        this.useBackupHead = this.template.getFieldByLabel('UseBackupHead').getValue();
      if(this.template.RootNode.hasField('Tail'))
        this.tail = this.template.getFieldByLabel('Tail').getValue();
      if(this.template.RootNode.hasField('Wings'))
        this.wings = this.template.getFieldByLabel('Wings').getValue();

      if(this.template.RootNode.hasField('BodyBag'))
        this.bodyBag = this.template.getFieldByLabel('BodyBag').getValue();

      if(this.template.RootNode.hasField('BodyVariation'))
        this.bodyVariation = this.template.getFieldByLabel('BodyVariation').getValue();

      if(this.template.RootNode.hasField('Gold'))
        this.gold = this.template.getFieldByLabel('Gold').getValue();

      if(this.template.RootNode.hasField('ChallengeRating'))
        this.challengeRating = this.template.getFieldByLabel('ChallengeRating').getValue();

      if(this.template.RootNode.hasField('ClassList')){
        let classes = this.template.RootNode.getFieldByLabel('ClassList').getChildStructs();
        for(let i = 0; i < classes.length; i++){
          this.classes.push(
            CreatureClass.FromCreatureClassStruct(classes[i])
          );
        }
      }

      if(this.template.RootNode.hasField('Conversation')){
        this.conversation = DLGObject.FromResRef(this.template.getFieldByLabel('Conversation').getValue());
      }

      if(this.template.RootNode.hasField('CurrentForce'))
        this.currentForce = this.template.getFieldByLabel('CurrentForce').getValue();

      if(this.template.RootNode.hasField('HitPoints'))
        this.hitPoints = this.template.getFieldByLabel('HitPoints').getValue();

      // ReadStatsFromGff: CurrentHitPoints defaults to HitPoints when absent.
      if(this.template.RootNode.hasField('CurrentHitPoints')){
        this.currentHitPoints = this.template.getFieldByLabel('CurrentHitPoints').getValue();
      }else{
        this.currentHitPoints = this.hitPoints;
      }

      if(this.template.RootNode.hasField('Disarmable'))
        this.disarmable = this.template.getFieldByLabel('Disarmable').getValue();
    
      if(this.template.RootNode.hasField('Experience'))
        this.experience = this.template.RootNode.getFieldByLabel('Experience').getValue();

      if(this.template.RootNode.hasField('Listening')){
        this.setListening(this.template.RootNode.getFieldByLabel('Listening').getValue());
      }
      if(this.template.RootNode.hasField('Commandable')){
        this.setCommadable(this.template.RootNode.getFieldByLabel('Commandable').getValue());
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
      if(this.template.RootNode.hasField('StealthMode')){
        this.setActivity(1, !!this.template.RootNode.getFieldByLabel('StealthMode').getValue(), 0);
      }

      if(this.template.RootNode.hasField('ExpressionList')){
        let expressions = this.template.RootNode.getFieldByLabel('ExpressionList').getChildStructs();
        for(let i = 0; i < expressions.length; i++){
          this.setListeningPattern(
            expressions[i].getFieldByLabel('ExpressionString').getValue(),
            expressions[i].getFieldByLabel('ExpressionId').getValue()
          );
        }
      }
          
      if(this.template.RootNode.hasField('FactionID')){
        this.factionId = this.template.getFieldByLabel('FactionID').getValue();
        if((this.factionId & 0xFFFFFFFF) == -1){
          this.factionId = 0;
        }
      }
      this.faction = GameState.FactionManager.factions.get(this.factionId);

      if(this.template.RootNode.hasField('FeatList')){
        let feats = this.template.RootNode.getFieldByLabel('FeatList').getChildStructs();
        for(let i = 0; i < feats.length; i++){
          this.feats.push(
            new TalentFeat( feats[i].getFieldByLabel('Feat').getValue() )
          );
        }
      }

      if(this.template.RootNode.hasField('FirstName'))
        this.firstName = this.template.RootNode.getFieldByLabel('FirstName').getCExoLocString();
      
      if(this.template.RootNode.hasField('ForcePoints'))
        this.forcePoints = this.template.RootNode.getFieldByLabel('ForcePoints').getValue();
          
      if(this.template.RootNode.hasField('Gender'))
        this.gender = this.template.RootNode.getFieldByLabel('Gender').getValue();
    
      if(this.template.RootNode.hasField('GoodEvil')){
        this.goodEvil = this.template.RootNode.getFieldByLabel('GoodEvil').getValue();
        this.baseGoodEvil = this.goodEvil;
      }
        
      if(this.template.RootNode.hasField('Hologram'))
        this.isHologram = this.template.getFieldByLabel('Hologram').getValue();

      if(this.template.RootNode.hasField('Interruptable'))
        this.interruptable = this.template.getFieldByLabel('Interruptable').getValue();

      if(this.template.RootNode.hasField('IsPC'))
        this.isPC = this.template.getFieldByLabel('IsPC').getValue();

      if(this.template.RootNode.hasField('FollowInfo')){
        const followStruct = this.template.RootNode.getFieldByLabel('FollowInfo').getChildStructs()?.[0];
        if(followStruct){
          const info = createDefaultPartyFollowInfo();
          if(followStruct.hasField('FollowObject'))
            info.followObject = followStruct.getFieldByLabel('FollowObject').getValue() >>> 0;
          if(followStruct.hasField('FollowLocation'))
            info.followLocation.copy(followStruct.getFieldByLabel('FollowLocation').getVector() as THREE.Vector3);
          if(followStruct.hasField('LastLeaderPos'))
            info.lastLeaderPos.copy(followStruct.getFieldByLabel('LastLeaderPos').getVector() as THREE.Vector3);
          if(followStruct.hasField('LastFollowerPos'))
            info.lastFollowerPos.copy(followStruct.getFieldByLabel('LastFollowerPos').getVector() as THREE.Vector3);
          if(followStruct.hasField('MaxSpeed'))
            info.maxSpeed = followStruct.getFieldByLabel('MaxSpeed').getValue();
          if(followStruct.hasField('StickToPos'))
            info.stickToPos = followStruct.getFieldByLabel('StickToPos').getValue() | 0;
          if(followStruct.hasField('Result'))
            info.result = followStruct.getFieldByLabel('Result').getValue() >>> 0;
          if(followStruct.hasField('TimeElapsed'))
            info.timeElapsed = followStruct.getFieldByLabel('TimeElapsed').getValue() >>> 0;
          if(followStruct.hasField('InSafetyRange'))
            info.inSafetyRange = followStruct.getFieldByLabel('InSafetyRange').getValue() | 0;
          this.partyFollowInfo = info;
        }
      }

      if(this.template.RootNode.hasField('LvlStatList')){
        this.levelStats = [];
        const lvlList = this.template.RootNode.getFieldByLabel('LvlStatList').getChildStructs();
        for(let i = 0; i < lvlList.length; i++){
          const ls = lvlList[i];
          const rec = createEmptyLevelStatRecord();
          if(ls.hasField('LvlStatClass'))
            rec.classId = ls.getFieldByLabel('LvlStatClass').getValue() | 0;
          if(ls.hasField('LvlStatHitDie'))
            rec.hpChange = ls.getFieldByLabel('LvlStatHitDie').getValue() | 0;
          if(ls.hasField('LvlStatForce'))
            rec.fpChange = ls.getFieldByLabel('LvlStatForce').getValue() | 0;
          if(ls.hasField('LvlStatAbility'))
            rec.attributeIndex = ls.getFieldByLabel('LvlStatAbility').getValue() | 0;
          if(ls.hasField('SkillPoints'))
            rec.skillPointsRemaining = ls.getFieldByLabel('SkillPoints').getValue() | 0;
          if(ls.hasField('SkillList')){
            const skills = ls.getFieldByLabel('SkillList').getChildStructs();
            for(let s = 0; s < SkillType.MAX_SKILLS && s < skills.length; s++){
              rec.skillRankChanges[s] = skills[s].getFieldByLabel('Rank')?.getValue() | 0;
            }
          }
          if(ls.hasField('FeatList')){
            const feats = ls.getFieldByLabel('FeatList').getChildStructs();
            for(let f = 0; f < feats.length; f++){
              rec.feats.push(feats[f].getFieldByLabel('Feat')?.getValue() | 0);
            }
          }
          if(ls.hasField('KnownList0')){
            const known = ls.getFieldByLabel('KnownList0').getChildStructs();
            for(let k = 0; k < known.length; k++){
              rec.spellsAdded.push(known[k].getFieldByLabel('Spell')?.getValue() | 0);
            }
          }
          if(ls.hasField('KnownRemoveList0')){
            const removed = ls.getFieldByLabel('KnownRemoveList0').getChildStructs();
            for(let k = 0; k < removed.length; k++){
              rec.spellsRemoved.push(removed[k].getFieldByLabel('Spell')?.getValue() | 0);
            }
          }
          this.levelStats.push(rec);
        }
      }

      if(this.template.RootNode.hasField('LastName'))
        this.lastName = this.template.getFieldByLabel('LastName').getCExoLocString();

      if(this.template.RootNode.hasField('MaxHitPoints')){
        this.maxHitPoints = this.template.getFieldByLabel('MaxHitPoints').getValue();
      }
      // computes max HP from stats; toolset UTCs that omit MaxHitPoints
      // must not leave max at 0 (that made pause resolve as pauseinj).
      if(this.maxHitPoints <= 0 && this.hitPoints > 0){
        this.maxHitPoints = this.hitPoints;
      }

      if(this.template.RootNode.hasField('MaxForcePoints')){
        this.maxForcePoints = this.template.getFieldByLabel('MaxForcePoints').getValue();
      }
      // CurrentForce is the spendable pool (CreatureStats current FP).
      // Toolset UTCs often leave ForcePoints filled and CurrentForce at 0.
      if(this.currentForce <= 0 && this.forcePoints > 0){
        this.currentForce = this.maxForcePoints > 0
          ? Math.min(this.forcePoints, this.maxForcePoints)
          : this.forcePoints;
      }

      if(this.template.RootNode.hasField('Min1HP'))
        this.min1HP = this.template.getFieldByLabel('Min1HP').getValue();

      if(this.template.RootNode.hasField('NaturalAC'))
        this.naturalAC = this.template.getFieldByLabel('NaturalAC').getValue();

      if(this.template.RootNode.hasField('NoPermDeath'))
        this.noPermDeath = this.template.getFieldByLabel('NoPermDeath').getValue();

      if(this.template.RootNode.hasField('NotReorienting'))
        this.notReorienting = this.template.getFieldByLabel('NotReorienting').getValue();

      if(this.template.RootNode.hasField('PartyInteract'))
        this.partyInteract = this.template.getFieldByLabel('PartyInteract').getValue();

      if(this.template.RootNode.hasField('PerceptionRange')){
        this.perceptionRange = GameState.SWRuleSet.ranges[this.template.getFieldByLabel('PerceptionRange').getValue()];
      }else{
        //https://forum.neverwintervault.org/t/perception-range/3191/9
        //It appears that PerceptionRange isn't saved inside the GIT file.
        //The original game appears to use PercepRngDefault when a creature is reloaded from a SaveGame
        this.perceptionRange = GameState.SWRuleSet.ranges[11];
      }

      if(this.template.RootNode.hasField('Phenotype'))
        this.phenotype = this.template.getFieldByLabel('Phenotype').getValue();

      if(this.template.RootNode.hasField('Plot'))
        this.plot = this.template.getFieldByLabel('Plot').getValue();

      if(this.template.RootNode.hasField('IsDestroyable'))
        this.isDestroyable = !!this.template.getFieldByLabel('IsDestroyable').getValue();
      if(this.template.RootNode.hasField('IsRaiseable'))
        this.isRaisable = !!this.template.getFieldByLabel('IsRaiseable').getValue();
      if(this.template.RootNode.hasField('DeadSelectable'))
        this.isDeadSelectable = !!this.template.getFieldByLabel('DeadSelectable').getValue();

      if(this.template.RootNode.hasField('PortraitId')){
        this.portraitId = this.template.getFieldByLabel('PortraitId').getValue();
        this.portrait = GameState.SWRuleSet.portraits[this.portraitId];
      }
    
      if(this.template.RootNode.hasField('Race'))
        this.race = this.template.RootNode.getFieldByLabel('Race').getValue();

      if(this.template.RootNode.hasField('SkillList')){
        let skills = this.template.RootNode.getFieldByLabel('SkillList').getChildStructs();
        for(let i = 0; i < skills.length; i++){
          this.skills[i].rank = skills[i].getFieldByLabel('Rank').getValue();
        }
      }

      if(this.template.RootNode.hasField('SoundSetFile'))
        this.soundSetFile = this.template.RootNode.getFieldByLabel('SoundSetFile').getValue();

      if(this.template.RootNode.hasField('SpecAbilityList')){
        this.specialAbilities = [];
        const list = this.template.RootNode.getFieldByLabel('SpecAbilityList').getChildStructs();
        for(let i = 0; i < list.length; i++){
          const s = list[i];
          this.specialAbilities.push({
            spell: s.hasField('Spell') ? (s.getFieldByLabel('Spell').getValue() | 0) : 0,
            spellFlags: s.hasField('SpellFlags') ? (s.getFieldByLabel('SpellFlags').getValue() | 0) : 0,
            spellCasterLevel: s.hasField('SpellCasterLevel') ? (s.getFieldByLabel('SpellCasterLevel').getValue() | 0) : 0,
          });
        }
      }

      if(this.template.RootNode.hasField('StartingPackage'))
        this.startingPackage = this.template.RootNode.getFieldByLabel('StartingPackage').getValue() | 0;
    
      if(this.template.RootNode.hasField('SubRace'))
        this.subrace = this.template.RootNode.getFieldByLabel('SubRace').getValue();

      if(this.template.RootNode.hasField('Tag'))
        this.tag = this.template.getFieldByLabel('Tag').getValue();

      if(this.template.RootNode.hasField('TemplateResRef'))
        this.templateResRef = this.template.getFieldByLabel('TemplateResRef').getValue();

      if(this.template.RootNode.hasField('TextureVar'))
        this.textureVar = this.template.getFieldByLabel('TextureVar').getValue();

      // ReadStatsFromGff: MovementRate primary; WalkRate fallback if MovementRate missing
      if(this.template.RootNode.hasField('MovementRate')){
        this.walkRate = this.template.getFieldByLabel('MovementRate').getValue();
      }else if(this.template.RootNode.hasField('WalkRate')){
        this.walkRate = this.template.getFieldByLabel('WalkRate').getValue();
      }

      if(this.template.RootNode.hasField('Str'))
        this.str = this.template.getFieldByLabel('Str').getValue();
    
      if(this.template.RootNode.hasField('Dex'))
        this.dex = this.template.getFieldByLabel('Dex').getValue();
    
      if(this.template.RootNode.hasField('Con'))
        this.con = this.template.getFieldByLabel('Con').getValue();
    
      if(this.template.RootNode.hasField('Cha'))
        this.cha = this.template.getFieldByLabel('Cha').getValue();
    
      if(this.template.RootNode.hasField('Wis'))
        this.wis = this.template.getFieldByLabel('Wis').getValue();
    
      if(this.template.RootNode.hasField('Int'))
        this.int = this.template.getFieldByLabel('Int').getValue();

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

        if(this.template.RootNode.hasField('SubraceIndex'))
          this.subraceIndex = this.template.RootNode.getFieldByLabel('SubraceIndex').getValue();


      if(this.template.RootNode.hasField('SWVarTable')){
        let localBools = this.template.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0].getFieldByLabel('BitArray').getChildStructs();
        //console.log(localBools);
        for(let i = 0; i < localBools.length; i++){
          let data = localBools[i].getFieldByLabel('Variable').getValue();
          for(let bit = 0; bit < 32; bit++){
            this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
          }
        }
        let localNumbers = this.template.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0].getFieldByLabel('ByteArray').getChildStructs();
        //console.log(localNumbers);
        for(let i = 0; i < localNumbers.length; i++){
          let data = localNumbers[i].getFieldByLabel('Variable').getValue();
          this.setLocalNumber(i, data);
        }
      }

      if(this.template.RootNode.hasField('PM_Appearance'))
        this.pm_Appearance = this.template.RootNode.getFieldByLabel('PM_Appearance').getValue();

      if(this.template.RootNode.hasField('PM_IsDisguised'))
        this.pm_IsDisguised = !!this.template.RootNode.getFieldByLabel('PM_IsDisguised').getValue();

      try{
        if(this.template.RootNode.hasField('EffectList')){
          let effects = this.template.RootNode.getFieldByLabel('EffectList').getChildStructs() || [];
          for(let i = 0; i < effects.length; i++){
            let effect = GameEffectFactory.EffectFromStruct(effects[i]);
            if(effect){
              effect.setAttachedObject(this);
              effect.loadModel();
              //console.log('attached');
              this.effects.push(effect);
              //this.addEffect(effect);
            }
          }
        }
      }catch(e: any){
        console.error(e);
      }

      try{
        if(this.template.RootNode.hasField('Equip_ItemList')){
          let equipment = this.template.RootNode.getFieldByLabel('Equip_ItemList').getChildStructs() || [];
          for(let i = 0; i < equipment.length; i++){
            let strt = equipment[i];
            let equipped_item = undefined;
            let slot_type = strt.type;
            // Always FromStruct so Equip_ItemList Dropable/Pickpocketable survive UTI merge
            // (ReadItemsFromGff: LoadFromTemplate then re-apply Dropable from the struct).
            equipped_item = new GameState.Module.ModuleArea.ModuleItem(GFFObject.FromStruct(strt));
            
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
                console.warn('ModuleCreature.initProperties', 'Unhandled Equipment Slot', equipped_item);
              break;
            }
          }
        }
      }catch(e: any){
        console.error(e);
      }

      this.parseEquipmentSlots();

      if(this.template.RootNode.hasField('ItemList')){
        const inventory = this.template.RootNode.getFieldByLabel('ItemList').getChildStructs();
        for(let i = 0; i < inventory.length; i++){
          this.loadItem(GFFObject.FromStruct(inventory[i]));
        }
      }
      this.loadSoundSet();

      this.loadActionList();

      // CombatRoundData — LoadCombatRound only applies when RoundStarted != 0
      try{
        if(this.template.RootNode.hasField('CombatRoundData')){
          const crField = this.template.RootNode.getFieldByLabel('CombatRoundData');
          const crStructs = crField.getChildStructs?.() || [];
          const crStruct = crStructs[0];
          if(crStruct){
            if(this.combatRound.fromStruct(crStruct)){
              // does not GFF-persist CombatState; mid-round load must
              // re-enter combat so end combat round / OnEndRound / QueueAttackActions work.
              this.setCombatState(true, ExcitedDurationRow.Damage);
              this.setExcitedState(ExcitedDurationRow.Damage);
            }
          }
        }
      }catch(e: any){
        console.error('ModuleCreature.initProperties CombatRoundData', e);
      }

      // CombatInfo — LoadData
      try{
        if(this.template.RootNode.hasField('CombatInfo')){
          const ciField = this.template.RootNode.getFieldByLabel('CombatInfo');
          const ciStructs = ciField.getChildStructs?.() || [];
          const ciStruct = ciStructs[0];
          if(ciStruct){
            this.combatInformation.fromStruct(ciStruct);
            this.arcaneSpellFailure = this.combatInformation.arcaneSpellFail || this.arcaneSpellFailure;
          }
        }
      }catch(e: any){
        console.error('ModuleCreature.initProperties CombatInfo', e);
      }

      // After CombatInfo fromStruct: rebind equip DWORDs to live item objects.
      this.rebindCombatInfoEquipIds();

      //PerceptionList
      try{
        if(this.template.RootNode.hasField('PerceptionList')){
          let perceptionList = this.template.RootNode.getFieldByLabel('PerceptionList').getChildStructs();
          if(perceptionList.length){
            this.perceptionList = [];
          }

          for(let i = 0, len = perceptionList.length; i < len; i++){
            const perception = perceptionList[i];

            const objectId = perception.getFieldByLabel('ObjectId').getValue();
            const data = perception.getFieldByLabel('PerceptionData').getValue() as PerceptionType;

            this.perceptionList.push({
              object: undefined,
              objectId: objectId,
              data: data
            });
          }
        }
      }catch(e: any){
        console.error(e);
      }
    }catch(e: any){
      console.error(e);
    }

    // LoadCreature — ReadFieldINT("Animation", default 10000)
    // then SetAnimation. Always re-resolve after HP is loaded so pause is not
    // stuck on pauseinj from a pre-stats constructor resolve.
    let anim = ModuleCreatureAnimState.PAUSE;
    if(this.template.RootNode.hasField('Animation')){
      anim = this.template.getFieldByLabel('Animation').getValue();
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
      GameState.ModuleObjectManager.RegisterObject(this);
    }

    this.initialized = true;

  }

  async loadEquipmentModels(): Promise<void> {
    const array =  Object.keys(this.equipment);
    for(let i = 0; i < array.length; i++){
      const slot_key = array[i];
      let slot: ModuleItem = (this.equipment as any)[slot_key];
      if(!slot){
        continue;
      }
      const model = await slot.loadModel();
      if(slot_key == 'RIGHTHAND' || slot_key == 'LEFTHAND'){
        model.playAnimation('off', true);
      }
    }
  }

  parseEquipmentSlots(){
    let slots = Object.keys(this.equipment);
    for(let i = 0; i < slots.length; i++){
      const slotKey = slots[i];
      let item: ModuleItem = (this.equipment as any)[slotKey];
      if(item){
        item.setPossessor(this);
        if(!item.load()){
          (this.equipment as any)[slotKey] = undefined;
          item.destroy();
        }
      }
    }
  }

  /**
   * Point CombatInfo LeftEquip/RightEquip at live hand-item ids after load.
   */
  rebindCombatInfoEquipIds(){
    if(!this.combatInformation){
      return;
    }
    this.combatInformation.rightEquip =
      this.equipment.RIGHTHAND?.id ?? ModuleObjectConstant.OBJECT_INVALID;
    this.combatInformation.leftEquip =
      this.equipment.LEFTHAND?.id ?? ModuleObjectConstant.OBJECT_INVALID;
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

  loadItem( template: GFFObject ){
    let item = new GameState.Module.ModuleArea.ModuleItem(template);
    item.initProperties();
    if(!item.load()){
      return;
    }
    let hasItem = this.getItemByTag(item.getTag());
    if(hasItem){
      hasItem.setStackSize(hasItem.getStackSize() + 1);
      return hasItem;
    }else{
      this.inventory.push(item);
      return item;
    }
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
    if(this.destroyed || this.isRetainedCorpse) return;

    // EventHandler destroy (0xb) — fires at DestroyObjectDelay
    if(!this.serverDestroyed && this.timeSinceDestroyStarted >= this.delayUntilFade){
      this.onServerDestroyEvent();
      // KeepCorpse converts to retained shell — stop the destroy timer path
      if(this.isRetainedCorpse) return;
    }

    super.updateDestroyFade(delta);
    if(this.noFadeOnDestroy) return;
    if(this.timeSinceDestroyStarted >= this.delayUntilFade){
      const fadeElapsed = this.timeSinceDestroyStarted - this.delayUntilFade;
      const fadeLen = this.getFadeDuration();
      const opacity = fadeLen > 0 ? Math.max(0, 1 - (fadeElapsed / fadeLen)) : 0;
      Object.values(this.equipment).forEach(item => {
        if(item && item.model instanceof OdysseyModel3D){
          item.model.setOpacity(opacity);
        }
      });
    }
  }

  setOpacity(opacity: number){
    super.setOpacity(opacity);
    if(this.head instanceof OdysseyModel3D){
      this.head.setOpacity(opacity);
    }
  }

  destroy(): void {
    if(this.destroyed) return;

    // KeepCorpse shell — only disposeRetainedCorpse / cache eviction tears it down
    if(this.isRetainedCorpse){
      return;
    }

    // EventHandler destroy (0xb)
    this.unlinkFromEncounter(false);

    if(!this.serverDestroyed){
      this.onServerDestroyEvent();
      if(this.isRetainedCorpse){
        // Converted to KeepCorpse shell — do not dispose visuals
        return;
      }
    }

    super.destroy();
    this.disposeCreatureVisuals();
  }

  /** Tear down head/equipment/inventory visuals after ModuleObject.destroy. */
  disposeCreatureVisuals(){
    if(this.head instanceof OdysseyModel3D){
      if(this.head.parent instanceof THREE.Object3D){
        this.head.removeFromParent();
      }
      this.head.dispose();
      this.head = undefined;
    }

    if(this.equipment.ARMOR){
      this.equipment.ARMOR.destroy();
      this.equipment.ARMOR = undefined;
    }

    if(this.equipment.ARMS){
      this.equipment.ARMS.destroy();
      this.equipment.ARMS = undefined;
    }

    if(this.equipment.BELT){
      this.equipment.BELT.destroy();
      this.equipment.BELT = undefined;
    }

    if(this.equipment.CLAW1){
      this.equipment.CLAW1.destroy();
      this.equipment.CLAW1 = undefined;
    }

    if(this.equipment.CLAW2){
      this.equipment.CLAW2.destroy();
      this.equipment.CLAW2 = undefined;
    }

    if(this.equipment.CLAW3){
      this.equipment.CLAW3.destroy();
      this.equipment.CLAW3 = undefined;
    }

    if(this.equipment.HEAD){
      this.equipment.HEAD.destroy();
      this.equipment.HEAD = undefined;
    }

    if(this.equipment.HIDE){
      this.equipment.HIDE.destroy();
      this.equipment.HIDE = undefined;
    }

    if(this.equipment.IMPLANT){
      this.equipment.IMPLANT.destroy();
      this.equipment.IMPLANT = undefined;
    }

    if(this.equipment.LEFTARMBAND){
      this.equipment.LEFTARMBAND.destroy();
      this.equipment.LEFTARMBAND = undefined;
    }

    if(this.equipment.LEFTHAND){
      this.equipment.LEFTHAND.destroy();
      this.equipment.LEFTHAND = undefined;
    }

    if(this.equipment.LEFTHAND2){
      this.equipment.LEFTHAND2.destroy();
      this.equipment.LEFTHAND2 = undefined;
    }

    if(this.equipment.RIGHTARMBAND){
      this.equipment.RIGHTARMBAND.destroy();
      this.equipment.RIGHTARMBAND = undefined;
    }

    if(this.equipment.RIGHTHAND){
      this.equipment.RIGHTHAND.destroy();
      this.equipment.RIGHTHAND = undefined;
    }

    if(this.equipment.RIGHTHAND2){
      this.equipment.RIGHTHAND2.destroy();
      this.equipment.RIGHTHAND2 = undefined;
    }

    while(this.inventory.length){
      const item = this.inventory[0];
      if(item){
        item.destroy();
      }
      this.inventory.splice(0, 1);
    }
    
    GameState.FactionManager.RemoveCreatureFromFaction(this);

    if(this.debugLabel){
      this.debugLabel.dispose();
    }
  }

  /**
   * Sync combat information fields from live equipment/stats before SaveData.
   * Compute/Update fills these before SaveData.
   */
  syncCombatInformationForSave(){
    const info = this.combatInformation;
    if(!info) return;

    info.arcaneSpellFail = this.arcaneSpellFailure | 0;
    if(this.combatRound){
      info.numAttacks =
        ((this.combatRound.onHandAttacks || 0) + (this.combatRound.offHandAttacks || 0)) & 0xff;
    }

    const right = this.equipment.RIGHTHAND;
    const left = this.equipment.LEFTHAND;
    info.rightEquip = right?.id ?? ModuleObjectConstant.OBJECT_INVALID;
    info.leftEquip = left?.id ?? ModuleObjectConstant.OBJECT_INVALID;
    info.rightString = right?.getTag?.() || right?.getName?.() || '';
    info.leftString = left?.getTag?.() || left?.getName?.() || '';
    info.offHandWeaponEq = left ? 1 : 0;

    try{
      info.forceResistance = getForceResistanceBonus(this) & 0xff;
    }catch{
      /* keep prior */
    }

    if(right){
      info.onHandCritRng = right.getCriticalThreatRangeMin?.() ?? info.onHandCritRng;
      info.onHandCritMult = (right.getBaseItem?.()?.criticalHitMultiplier || 2) & 0xff;
    }else{
      // Unarmed defaults — CombatAttackData uses 1d4
      info.unarmedDamDice = info.unarmedDamDice || 1;
      info.unarmedDamDie = info.unarmedDamDie || 4;
      info.onHandCritRng = info.onHandCritRng || 20;
      info.onHandCritMult = info.onHandCritMult || 2;
    }

    if(left){
      info.offHandCritRng = left.getCriticalThreatRangeMin?.() ?? info.offHandCritRng;
      info.offHandCritMult = (left.getBaseItem?.()?.criticalHitMultiplier || info.offHandCritMult || 2) & 0xff;
    }

    // ACP: prefer prior loaded value; if zero and armor equipped with armorcheckpen flag, mark 1
    // (full armor.2da accheck magnitude remains Low residual)
    const armor = this.equipment.ARMOR;
    if(armor?.getBaseItem?.()?.armorCheckPen && !info.armorCheckPen){
      info.armorCheckPen = 1;
    }
  }

  /**
   * SaveClassInfo LvlStatList element (struct type 0).
   * Omits LvlStatAbility for level index 0 or when no ability bump.
   */
  saveLevelStatStruct(rec: LevelStatRecord, levelIndex: number): GFFStruct {
    const s = new GFFStruct(0);
    if(levelIndex > 0 && rec.attributeIndex >= 0 && rec.attributeIndex !== LevelUpAbilityIndex.NONE){
      s.addField( new GFFField(GFFDataType.BYTE, 'LvlStatAbility') ).setValue(rec.attributeIndex | 0);
    }
    s.addField( new GFFField(GFFDataType.BYTE, 'LvlStatHitDie') ).setValue(rec.hpChange | 0);
    s.addField( new GFFField(GFFDataType.BYTE, 'LvlStatForce') ).setValue(rec.fpChange | 0);
    s.addField( new GFFField(GFFDataType.BYTE, 'LvlStatClass') ).setValue(rec.classId | 0);
    if(rec.spellsAdded.length > 0){
      const known = s.addField( new GFFField(GFFDataType.LIST, 'KnownList0') );
      for(let i = 0; i < rec.spellsAdded.length; i++){
        const ks = new GFFStruct(0);
        ks.addField( new GFFField(GFFDataType.WORD, 'Spell') ).setValue(rec.spellsAdded[i] | 0);
        known.addChildStruct(ks);
      }
    }
    if(rec.spellsRemoved.length > 0){
      const rem = s.addField( new GFFField(GFFDataType.LIST, 'KnownRemoveList0') );
      for(let i = 0; i < rec.spellsRemoved.length; i++){
        const rs = new GFFStruct(0);
        rs.addField( new GFFField(GFFDataType.WORD, 'Spell') ).setValue(rec.spellsRemoved[i] | 0);
        rem.addChildStruct(rs);
      }
    }
    s.addField( new GFFField(GFFDataType.WORD, 'SkillPoints') ).setValue(rec.skillPointsRemaining | 0);
    const skillList = s.addField( new GFFField(GFFDataType.LIST, 'SkillList') );
    for(let i = 0; i < SkillType.MAX_SKILLS; i++){
      const sk = new GFFStruct(0);
      sk.addField( new GFFField(GFFDataType.BYTE, 'Rank') ).setValue((rec.skillRankChanges[i] | 0) & 0xff);
      skillList.addChildStruct(sk);
    }
    const featList = s.addField( new GFFField(GFFDataType.LIST, 'FeatList') );
    for(let i = 0; i < rec.feats.length; i++){
      const fs = new GFFStruct(0);
      fs.addField( new GFFField(GFFDataType.WORD, 'Feat') ).setValue(rec.feats[i] | 0);
      featList.addChildStruct(fs);
    }
    return s;
  }

  save(){

    let gff = new GFFObject();
    gff.FileType = 'UTC ';
    // Creature List element struct type
    gff.RootNode.type = 4;
    
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(this.id);

    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'AIState') ).setValue(this.aiState | 0);

    gff.RootNode.addField( this.actionQueueToActionList() );

    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'Age') ).setValue(this.age | 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'AmbientAnimState') ).setValue(this.ambientAnimState | 0);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'Animation') ).setValue(this.animationState.index);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Appearance_Head') ).setValue(this.appearanceHead | 0);
    gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'Appearance_Type') ).setValue(this.appearance);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'AreaId') ).setValue(
      this.getSaveAreaId() || (this.savedAreaId >>> 0)
    );
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'ArmorClass') ).setValue(this.getAC());
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'BodyBag') ).setValue(this.bodyBag);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Cha') ).setValue(this.cha);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ChallengeRating') ).setValue(this.challengeRating);

    //Classes
    let classList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'ClassList') );
    for(let i = 0; i < this.classes.length; i++){
      classList.addChildStruct( this.classes[i].save() );
    }
    // SaveStats: MClassLevUpIn = class_count - 1
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'MClassLevUpIn') ).setValue(
      Math.max(0, (this.classes?.length || 1) - 1)
    );

    // SaveClassInfo: LvlStatList only for is_pc && pt_controlled_npc == -1
    if(this.isPC && GameState.PartyManager.ControlledNPC === -1 && this.levelStats.length > 0){
      const lvlStatList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'LvlStatList') );
      for(let i = 0; i < this.levelStats.length; i++){
        lvlStatList.addChildStruct( this.saveLevelStatStruct(this.levelStats[i], i) );
      }
    }
    
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Color_Hair') ).setValue(this.colorHair | 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Color_Skin') ).setValue(this.colorSkin | 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Color_Tattoo1') ).setValue(this.colorTattoo1 | 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Color_Tattoo2') ).setValue(this.colorTattoo2 | 0);

    let combatInfoStruct = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'CombatInfo') );
    // SaveData — sync live fields before write
    this.syncCombatInformationForSave();
    combatInfoStruct.addChildStruct(this.combatInformation.toStruct(0xCAAA));

    let combatRoundDataStruct = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'CombatRoundData') );
    // SaveCreature: always add CombatRoundData (0xCADA); populate only when RoundStarted
    if(this.combatRound.roundStarted){
      combatRoundDataStruct.addChildStruct( this.combatRound.toStruct(0xCADA) );
    }else{
      combatRoundDataStruct.addChildStruct( new GFFStruct(0xCADA) );
    }
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Commandable') ).setValue(this.getCommadable() ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Con') ).setValue(this.con);
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Conversation') ).setValue(this.conversation ? this.conversation.resref : '');
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'CreatnScrptFird') ).setValue( this.spawned ? 1 : 0 );
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'CreatureSize') ).setValue(this.getAppearance()?.sizecategory ?? 3);
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'CurrentForce') ).setValue(this.currentForce);
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'CurrentHitPoints') ).setValue(this.currentHitPoints);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'DeadSelectable') ).setValue(this.isDeadSelectable ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Deity') ).setValue(this.deity || '');
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') ).setValue(
      this.description instanceof CExoLocString ? this.description : new CExoLocString()
    );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'DetectMode') ).setValue(this.detectMode ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Dex') ).setValue(this.dex);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Disarmable') ).setValue(this.disarmable ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'DuplicatingHead') ).setValue(this.duplicatingHead | 0);
    
    //Effects
    let effectList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'EffectList') );
    for(let i = 0; i < this.effects.length; i++){
      effectList.addChildStruct( this.effects[i].save() );
    }

    //Equipment — SaveCreature walks slot bits 1<<0.. 1<<17 (18 slots)
    let equipItemList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'Equip_ItemList') );
    for(let slot = 1, n = 0; n < 18; slot <<= 1, n++){
      const equipped = this.GetItemInSlot(slot);
      if(!equipped) continue;
      const equipItem = equipped.save();
      // SaveCreature writes ObjectId before SaveItem (inventory.res omits it)
      equipItem.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(equipped.id >>> 0);
      equipItem.setType(slot);
      equipItemList.addChildStruct(equipItem);
    }

    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Experience') ).setValue(this.experience);
    
    // SaveListenData: ExpressionList only when size > 0; element struct type 5
    if(this.listeningPatterns.length > 0){
      let expressionList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'ExpressionList') );
      for(let i = 0; i < this.listeningPatterns.length; i++){
        const entry = this.listeningPatterns[i];
        let expressionStruct = new GFFStruct(5);
        expressionStruct.addField( new GFFField(GFFDataType.INT, 'ExpressionId') ).setValue( entry.number );
        expressionStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'ExpressionString') ).setValue( entry.pattern );
        expressionList.addChildStruct(expressionStruct);
      }
    }

    gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'FactionID') ).setValue(this.faction ? this.faction.id : this.factionId);

    //Feats — SaveClassInfo only writes FeatList when feats.size > 0
    if(this.feats.length > 0){
      let featList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'FeatList') );
      for(let i = 0; i < this.feats.length; i++){
        const featStruct = this.feats[i].save();
        // FeatList element struct type is 1
        if(typeof featStruct.setType === 'function') featStruct.setType(1);
        featList.addChildStruct(featStruct);
      }
    }

    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'FirstName') ).setValue(
      this.firstName instanceof CExoLocString ? this.firstName : new CExoLocString()
    );
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'ForcePoints') ).setValue(this.forcePoints | 0);
    gff.RootNode.addField( new GFFField(GFFDataType.CHAR, 'FortSaveThrow') ).setValue(this.fortitudeSaveThrow);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Gender') ).setValue(this.gender);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Gold') ).setValue(this.gold || 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'GoodEvil') ).setValue(this.goodEvil);
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'HitPoints') ).setValue(this.hitPoints);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Int') ).setValue(this.int);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Interruptable') ).setValue(this.interruptable ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'IsDestroyable') ).setValue(this.isDestroyable ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'IsPC') ).setValue( this.isPC ? 1 : 0 );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'IsRaiseable') ).setValue(this.isRaisable ? 1 : 0);
    if(this.playerCreated){
      gff.RootNode.addField( new GFFField(GFFDataType.INT, 'PlayerCreated') ).setValue(1);
    }

    //Creature Inventory
    let itemList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'ItemList') );
    for(let i = 0; i < this.inventory.length; i++){
      const invItem = this.inventory[i];
      let itemStruct = invItem.save();
      // SaveCreature writes ObjectId before SaveItem
      itemStruct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(invItem.id >>> 0);
      itemList.addChildStruct(itemStruct);
    }

    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'JoiningXP') ).setValue( this.joiningXP ? this.joiningXP : 0 );
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LastName') ).setValue(
      this.lastName instanceof CExoLocString ? this.lastName : new CExoLocString()
    );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Listening') ).setValue( this.isListening );

    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'MaxForcePoints') ).setValue(this.maxForcePoints);
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'MaxHitPoints') ).setValue(this.maxHitPoints);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Min1HP') ).setValue(this.min1HP);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'MovementRate') ).setValue(this.getMovementRate());
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'NaturalAC') ).setValue(this.naturalAC);
    // NoPermDeath is not a K1 save field (absent from K1 binary)
    if(GameState.GameKey == GameEngineType.TSL){
      gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'NoPermDeath') ).setValue(this.noPermDeath ? 1 : 0);
    }
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'NotReorienting') ).setValue(this.notReorienting);

    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PM_IsDisguised') ).setValue( this.hasEffect(GameEffectType.EffectDisguise) ? 1 : 0 );
    if( this.hasEffect(GameEffectType.EffectDisguise) ){
      gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'PM_Appearance') ).setValue( this.appearance );
    }

    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PartyInteract') ).setValue(this.partyInteract);

    //Save PerceptionLists
    let perceptionList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'PerceptionList') );
    for(let i = 0; i < this.perceptionList.length; i++){
      let percept = this.perceptionList[i];

      let perceptionStruct = new GFFStruct();
      perceptionStruct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( percept.objectId );
      perceptionStruct.addField( new GFFField(GFFDataType.BYTE, 'PerceptionData') ).setValue( (percept.data & 0xFF) );
      perceptionList.addChildStruct(perceptionStruct);
    }

    // PerceptionRange is not written by SaveCreature / SaveStats (GIT)
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'Phenotype') ).setValue(this.phenotype);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Plot') ).setValue(this.plot ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'PortraitId') ).setValue(this.portraitId);
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'PregameCurrent') ).setValue(this.getHP() | 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Race') ).setValue(this.race);
    gff.RootNode.addField( new GFFField(GFFDataType.CHAR, 'RefSaveThrow') ).setValue(this.reflexSaveThrow);

    let swVarTable = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.addChildStruct( this.getSWVarTableSaveStruct() );

    //Scripts
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptAttacked') ).setValue(this.scripts[ModuleObjectScript.CreatureOnAttacked]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDamaged') ).setValue(this.scripts[ModuleObjectScript.CreatureOnDamaged]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDeath') ).setValue(this.scripts[ModuleObjectScript.CreatureOnDeath]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDialogue') ).setValue(this.scripts[ModuleObjectScript.CreatureOnDialog]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDisturbed') ).setValue(this.scripts[ModuleObjectScript.CreatureOnDisturbed]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptEndDialogu') ).setValue(this.scripts[ModuleObjectScript.CreatureOnEndDialog]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptEndRound') ).setValue(this.scripts[ModuleObjectScript.CreatureOnEndRound]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat') ).setValue(this.scripts[ModuleObjectScript.CreatureOnHeartbeat]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptOnBlocked') ).setValue(this.scripts[ModuleObjectScript.CreatureOnBlocked]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptOnNotice') ).setValue(this.scripts[ModuleObjectScript.CreatureOnNotice]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptRested') ).setValue(this.scripts[ModuleObjectScript.CreatureOnRested]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptSpawn') ).setValue(this.scripts[ModuleObjectScript.CreatureOnSpawn]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptSpellAt') ).setValue(this.scripts[ModuleObjectScript.CreatureOnSpellAt]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptUserDefine') ).setValue(this.scripts[ModuleObjectScript.CreatureOnUserDefined]?.name || '');

    //Skills
    let skillList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'SkillList') );
    for(let i = 0; i < 8; i++){
      skillList.addChildStruct( this.skills[i].save() );
    }

    gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'SkillPoints') ).setValue( this.skillPoints ? this.skillPoints : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'SoundSetFile') ).setValue(this.soundSetFile);

    // SaveClassInfo: SpecAbilityList only when special_abilities.size > 0
    if(this.specialAbilities.length > 0){
      const specAbilityList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'SpecAbilityList') );
      for(let i = 0; i < this.specialAbilities.length; i++){
        const sa = this.specialAbilities[i];
        if(!sa) continue;
        const saStruct = new GFFStruct(4);
        saStruct.addField( new GFFField(GFFDataType.WORD, 'Spell') ).setValue((sa.spell ?? 0) | 0);
        saStruct.addField( new GFFField(GFFDataType.BYTE, 'SpellFlags') ).setValue((sa.spellFlags ?? 0) | 0);
        saStruct.addField( new GFFField(GFFDataType.BYTE, 'SpellCasterLevel') ).setValue((sa.spellCasterLevel ?? 0) | 0);
        specAbilityList.addChildStruct(saStruct);
      }
    }

    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'StartingPackage') ).setValue(this.startingPackage | 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'StealthMode') ).setValue(this.stealthMode ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Str') ).setValue(this.str);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Subrace') ).setValue('');
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'SubraceIndex') ).setValue(this.subraceIndex | 0);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).setValue(this.tag);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Tail') ).setValue(this.tail | 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'UseBackupHead') ).setValue(this.useBackupHead ? 1 : 0);
    this.writeNamedVarTable(gff.RootNode);
    gff.RootNode.addField( new GFFField(GFFDataType.CHAR, 'WillSaveThrow') ).setValue(this.willSaveThrow);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Wings') ).setValue(this.wings | 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Wis') ).setValue(this.wis);

    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).setValue( this.position.x );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).setValue( this.position.y );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).setValue( this.position.z );

    let theta = this.rotation.z * Math.PI;

    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).setValue( 1 * Math.cos(theta) );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).setValue( 1 * Math.sin(theta) );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).setValue( 0 );

    // SaveCreature: FollowInfo when party_follow_info allocated (party members)
    if(this.isPM){
      const follow = this.partyFollowInfo || createDefaultPartyFollowInfo();
      this.partyFollowInfo = follow;
      const followField = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'FollowInfo') );
      const followStruct = new GFFStruct(0);
      followStruct.addField( new GFFField(GFFDataType.DWORD, 'FollowObject') ).setValue(follow.followObject >>> 0);
      followStruct.addField( new GFFField(GFFDataType.VECTOR, 'FollowLocation') ).setValue(follow.followLocation.clone());
      followStruct.addField( new GFFField(GFFDataType.VECTOR, 'LastLeaderPos') ).setValue(follow.lastLeaderPos.clone());
      followStruct.addField( new GFFField(GFFDataType.VECTOR, 'LastFollowerPos') ).setValue(follow.lastFollowerPos.clone());
      followStruct.addField( new GFFField(GFFDataType.FLOAT, 'MaxSpeed') ).setValue(follow.maxSpeed);
      followStruct.addField( new GFFField(GFFDataType.BYTE, 'StickToPos') ).setValue(follow.stickToPos | 0);
      followStruct.addField( new GFFField(GFFDataType.DWORD, 'Result') ).setValue(follow.result >>> 0);
      followStruct.addField( new GFFField(GFFDataType.DWORD, 'TimeElapsed') ).setValue(follow.timeElapsed >>> 0);
      followStruct.addField( new GFFField(GFFDataType.BYTE, 'InSafetyRange') ).setValue(follow.inSafetyRange | 0);
      followField.addChildStruct(followStruct);
    }

    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'fortbonus') ).setValue(this.fortbonus);
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'refbonus') ).setValue(this.refbonus);
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'willbonus') ).setValue(this.willbonus);

    this.template = gff;

    if(this.npcId >= 0){
      GameState.PartyManager.NPCS[this.npcId].template = this.template;
    }

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
