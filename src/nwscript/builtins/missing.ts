import * as THREE from "three";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWModuleObjectType } from "@/enums/nwscript/NWModuleObjectType";
import { FeedbackOption } from "@/enums/engine/FeedbackOption";
import { GameState } from "@/GameState";
import { FeedbackMessageEntry } from "@/engine/FeedbackMessageEntry";
import { FeebackMessageColor } from "@/enums/engine/FeedbackMessageColor";
import type { GameEffect } from "@/effects/GameEffect";
import type { ModuleCreature, ModuleObject } from "@/module";
import { TalentSpell } from "@/talents/TalentSpell";
import { BitWise } from "@/utility/BitWise";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, effectParam, floatParam, intParam, objectParam, stringParam, vectorParam } from "@/nwscript/builtins/actionBuilder";

type StubFallback = any | (() => any);

function resolveFallback(fallback: StubFallback) {
  return typeof fallback === "function" ? fallback() : fallback;
}

function unimplemented(name: string, id: number, fallback?: StubFallback) {
  return function(this: NWScriptInstance, ...args: any[]) {
    console.error(`NWScript action not yet implemented: ${name} (#${id})`, {
      script: this.name,
      caller: this.caller,
      args,
    });
    return resolveFallback(fallback);
  };
}

const zeroVector = () => ({ x: 0.0, y: 0.0, z: 0.0 });

const OBJECT_TYPE_AREA = 32768;

function getAbilityScore(creature: ModuleCreature, nAbilityType: number): number {
  switch (nAbilityType) {
    case 0: return creature.getSTR();
    case 1: return creature.getDEX();
    case 2: return creature.getCON();
    case 3: return creature.getINT();
    case 4: return creature.getWIS();
    case 5: return creature.getCHA();
    default: return 0;
  }
}

function getObjectType(oTarget: ModuleObject | undefined): number {
  if (!BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleObject)) {
    return -1;
  }

  if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleArea)) return OBJECT_TYPE_AREA;
  if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleCreature)) return NWModuleObjectType.CREATURE;
  if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleItem)) return NWModuleObjectType.ITEM;
  if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleTrigger)) return NWModuleObjectType.TRIGGER;
  if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleDoor)) return NWModuleObjectType.DOOR;
  if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleAreaOfEffect)) return NWModuleObjectType.AOE;
  if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleWaypoint)) return NWModuleObjectType.WAYPOINT;
  if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModulePlaceable)) return NWModuleObjectType.PLACEABLE;
  if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleStore)) return NWModuleObjectType.STORE;
  if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleEncounter)) return NWModuleObjectType.ENCOUNTER;
  if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleSound)) return NWModuleObjectType.SOUND;

  return -1;
}

function getLOSBetweenPoints(vSource: { x: number; y: number; z: number }, vTarget: { x: number; y: number; z: number }): number {
  const area = GameState.module?.area;
  if (!area) {
    return 0;
  }

  const source = new THREE.Vector3(vSource?.x || 0, vSource?.y || 0, vSource?.z || 0);
  const target = new THREE.Vector3(vTarget?.x || 0, vTarget?.y || 0, vTarget?.z || 0);
  const direction = target.clone().sub(source);
  const distance = direction.length();

  if (distance <= 0.0001) {
    return 1;
  }

  direction.normalize();
  GameState.raycaster.ray.origin.copy(source);
  GameState.raycaster.ray.direction.copy(direction);
  GameState.raycaster.far = distance;

  for (let i = 0; i < area.doors.length; i++) {
    const door = area.doors[i];
    if (!door || door.isOpen()) continue;
    const box3 = door.box;
    if (!box3) continue;
    if (GameState.raycaster.ray.intersectsBox(box3) || box3.containsPoint(source)) {
      const intersects = door.collisionManager.walkmesh?.raycast(GameState.raycaster, door.collisionManager.walkmesh.faces);
      if (intersects?.some((hit: any) => hit.distance < distance)) {
        return 0;
      }
    }
  }

  for (let i = 0; i < area.rooms.length; i++) {
    const room = area.rooms[i];
    const walkmesh = room?.collisionManager?.walkmesh;
    if (!walkmesh?.aabbNodes?.length) continue;
    const intersects = walkmesh.raycast(GameState.raycaster, walkmesh.faces);
    if (intersects?.some((hit: any) => hit.distance > 0.01 && hit.distance < distance)) {
      return 0;
    }
  }

  return 1;
}

export const ActionMoveAwayFromObject = defineAction({
  id: 23,
  name: "ActionMoveAwayFromObject",
  comment: "23: Cause the action subject to move away from oFleeFrom.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<any>("oFleeFrom"),
    intParam("bRun", { optional: true, default: 0 }),
    floatParam("fMoveAwayRange", { optional: true, default: 40.0 }),
  ] as const,
  kotor: unimplemented("ActionMoveAwayFromObject", 23),
});

export const GetItemPossessor = defineAction({
  id: 29,
  name: "GetItemPossessor",
  comment: "29: Get the possessor of oItem.",
  returnType: NWScriptDataType.OBJECT,
  params: [objectParam<any>("oItem")] as const,
  kotor: unimplemented("GetItemPossessor", 29),
});

export const GetCasterLevel = defineAction({
  id: 84,
  name: "GetCasterLevel",
  comment: "84: Get the caster level of oCreature.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<any>("oCreature", { optional: true, default: undefined })] as const,
  kotor: unimplemented("GetCasterLevel", 84, 0),
});

export const GetObjectType = defineAction({
  id: 106,
  name: "GetObjectType",
  comment: "106: Get the object type (OBJECT_TYPE_*) of oTarget.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<any>("oTarget")] as const,
  kotor(this: NWScriptInstance, oTarget) {
    return getObjectType(oTarget);
  },
});

export const EffectEntangle = defineAction({
  id: 130,
  name: "EffectEntangle",
  comment: "130: Create an Entangle effect.",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor: unimplemented("EffectEntangle", 130),
});

export const GetAbilityScore = defineAction({
  id: 139,
  name: "GetAbilityScore",
  comment: "139: Get the ability score of type nAbilityType for a creature.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<any>("oCreature"), intParam("nAbilityType")] as const,
  kotor(this: NWScriptInstance, oCreature, nAbilityType) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return getAbilityScore(oCreature as ModuleCreature, nAbilityType);
    }
    return 0;
  },
});

export const EffectBodyFuel = defineAction({
  id: 224,
  name: "EffectBodyFuel",
  comment: "224: Create a Body Fuel effect.",
  returnType: NWScriptDataType.EFFECT,
  params: [] as const,
  kotor: unimplemented("EffectBodyFuel", 224),
});

export const AddMultiClass = defineAction({
  id: 389,
  name: "AddMultiClass",
  comment: "389: Add a new class to a creature.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nClassType"), objectParam<any>("oSource")] as const,
  kotor: unimplemented("AddMultiClass", 389),
});

export const GetItemActivated = defineAction({
  id: 439,
  name: "GetItemActivated",
  comment: "439: Get the item that was activated in an OnItemActivated script.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor: unimplemented("GetItemActivated", 439),
});

export const GetItemActivator = defineAction({
  id: 440,
  name: "GetItemActivator",
  comment: "440: Get the creature that activated the item in an OnItemActivated script.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor: unimplemented("GetItemActivator", 440),
});

export const GetTotalDamageDealt = defineAction({
  id: 345,
  name: "GetTotalDamageDealt",
  comment: "345: Get the total amount of damage that has been dealt to the caller.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor: unimplemented("GetTotalDamageDealt", 345, 0),
});

export const GetInventoryDisturbType = defineAction({
  id: 352,
  name: "GetInventoryDisturbType",
  comment: "352: Get the type of disturbance that caused OnInventoryDisturbed to fire.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor: unimplemented("GetInventoryDisturbType", 352, 0),
});

export const SurrenderToEnemies = defineAction({
  id: 476,
  name: "SurrenderToEnemies",
  comment: "476: Cause nearby creatures to surrender to enemies.",
  returnType: NWScriptDataType.VOID,
  params: [] as const,
  kotor: unimplemented("SurrenderToEnemies", 476),
});

export const EffectModifyAttacks = defineAction({
  id: 485,
  name: "EffectModifyAttacks",
  comment: "485: Create a Modify Attacks effect.",
  returnType: NWScriptDataType.EFFECT,
  params: [intParam("nAttacks")] as const,
  kotor: unimplemented("EffectModifyAttacks", 485),
});

export const GetFoundEnemyCreature = defineAction({
  id: 495,
  name: "GetFoundEnemyCreature",
  comment: "495: Returns the found enemy creature on a pathfind.",
  returnType: NWScriptDataType.OBJECT,
  params: [objectParam<any>("oTarget", { optional: true, default: undefined })] as const,
  kotor: unimplemented("GetFoundEnemyCreature", 495),
});

export const ActionCastFakeSpellAtObject = defineAction({
  id: 501,
  name: "ActionCastFakeSpellAtObject",
  comment: "501: Fake casting a spell at oTarget.",
  returnType: NWScriptDataType.VOID,
  params: [
    intParam("nSpell"),
    objectParam<any>("oTarget"),
    intParam("nProjectilePathType", { optional: true, default: 0 }),
  ] as const,
  kotor: unimplemented("ActionCastFakeSpellAtObject", 501),
});

export const GetHasInventory = defineAction({
  id: 570,
  name: "GetHasInventory",
  comment: "570: Determine whether oObject has an inventory.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<any>("oObject")] as const,
  kotor: unimplemented("GetHasInventory", 570, 0),
});

export const EffectLightsaberThrow = defineAction({
  id: 702,
  name: "EffectLightsaberThrow",
  comment: "702: Create a Lightsaber Throw effect.",
  returnType: NWScriptDataType.EFFECT,
  params: [
    objectParam<any>("oTarget1"),
    objectParam<any>("oTarget2", { optional: true, default: undefined }),
    objectParam<any>("oTarget3", { optional: true, default: undefined }),
    intParam("nAdvancedDamage", { optional: true, default: 0 }),
  ] as const,
  kotor: unimplemented("EffectLightsaberThrow", 702),
});

export const ChangeItemCost = defineAction({
  id: 747,
  name: "ChangeItemCost",
  comment: "747: Change the cost of an item.",
  returnType: NWScriptDataType.VOID,
  params: [stringParam("sItem"), floatParam("fCostMultiplier")] as const,
  kotor: unimplemented("ChangeItemCost", 747),
});

export const CancelPostDialogCharacterSwitch = defineAction({
  id: 757,
  name: "CancelPostDialogCharacterSwitch",
  comment: "757: Cancel the post-dialog switch back to the initiating NPC.",
  returnType: NWScriptDataType.VOID,
  params: [] as const,
  kotor: unimplemented("CancelPostDialogCharacterSwitch", 757),
});

export const GetInfluence = defineAction({
  availability: "tsl",
  id: 795,
  name: "GetInfluence",
  comment: "795: Get the PC's influence on a CNPC.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nNPC")] as const,
  tsl(this: NWScriptInstance, nNPC) {
    return GameState.PartyManager.InfluenceMap.get(nNPC) ?? -1;
  },
});

export const QueueMovie = defineAction({
  availability: "tsl",
  id: 806,
  name: "QueueMovie",
  comment: "806: Queue a movie to be played by PlayMovieQueue.",
  returnType: NWScriptDataType.VOID,
  params: [stringParam("sMovie"), intParam("nSkippable", { optional: true, default: 1 })] as const,
  tsl: unimplemented("QueueMovie", 806),
});

export const PlayMovieQueue = defineAction({
  availability: "tsl",
  id: 807,
  name: "PlayMovieQueue",
  comment: "807: Play the queued movies.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nAllowSkips", { optional: true, default: 1 })] as const,
  tsl: unimplemented("PlayMovieQueue", 807),
});

export const IsStealthed = defineAction({
  availability: "tsl",
  id: 810,
  name: "IsStealthed",
  comment: "810: Determine if the given creature is in Stealth mode.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<any>("oCreature")] as const,
  tsl(this: NWScriptInstance, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      const creature = oCreature as ModuleCreature;
      const stealthMode = !!creature.stealthMode;
      const stealthAnim = creature.animationState?.index === ModuleCreatureAnimState.WALK_STEALTH;
      return (stealthMode || stealthAnim) ? 1 : 0;
    }
    return 0;
  },
});

export const GetRandomDestination = defineAction({
  availability: "tsl",
  id: 815,
  name: "GetRandomDestination",
  comment: "815: Get a random destination vector for a creature.",
  returnType: NWScriptDataType.VECTOR,
  params: [objectParam<any>("oCreature"), intParam("rangeLimit")] as const,
  tsl(this: NWScriptInstance, oCreature, rangeLimit) {
    if (!BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return zeroVector();
    }

    const creature = oCreature as ModuleCreature;
    const faces = creature.room?.collisionManager?.walkmesh?.walkableFaces || creature.area?.walkFaces || [];
    if (!faces.length) {
      return creature.position.clone();
    }

    const maxDistance = rangeLimit > 0 ? Number(rangeLimit) : Infinity;
    const candidates = faces.filter((face: any) => face?.centroid && creature.position.distanceTo(face.centroid) <= maxDistance);
    const pool = candidates.length ? candidates : faces;
    const face = pool[Math.floor(Math.random() * pool.length)];

    if (!face?.centroid) {
      return creature.position.clone();
    }

    return creature.area?.getNearestWalkablePoint(face.centroid.clone(), creature.getHitDistance()) || face.centroid.clone();
  },
});

export const IsFormActive = defineAction({
  availability: "tsl",
  id: 816,
  name: "IsFormActive",
  comment: "816: Determine whether the given form is active on a creature.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<any>("oCreature"), intParam("nFormID")] as const,
  tsl: unimplemented("IsFormActive", 816, 0),
});

export const GetSpellBaseForcePointCost = defineAction({
  availability: "tsl",
  id: 818,
  name: "GetSpellBaseForcePointCost",
  comment: "818: Return the base Force Point cost of a spell.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nSpellID")] as const,
  tsl(this: NWScriptInstance, nSpellID) {
    const spell = GameState.TwoDAManager.datatables.get("spells")?.rows[nSpellID];
    if (!spell) {
      return 0;
    }

    const forcePoints = parseInt(spell.forcepoints as any, 10);
    return isNaN(forcePoints) ? 0 : forcePoints;
  },
});

export const HasLineOfSight = defineAction({
  availability: "tsl",
  id: 820,
  name: "HasLineOfSight",
  comment: "820: Determine whether there is a clear line of sight between two points.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    vectorParam<any>("vSource"),
    vectorParam<any>("vTarget"),
    objectParam<any>("oSource", { optional: true, default: undefined }),
    objectParam<any>("oTarget", { optional: true, default: undefined }),
  ] as const,
  tsl(this: NWScriptInstance, vSource, vTarget, oSource, oTarget) {
    if (
      BitWise.InstanceOfObject(oSource, ModuleObjectType.ModuleObject) &&
      BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleObject)
    ) {
      return (oSource as ModuleObject).hasLineOfSight(oTarget as ModuleObject) ? 1 : 0;
    }

    return getLOSBetweenPoints(vSource, vTarget);
  },
});

export const AdjustCreatureAttributes = defineAction({
  availability: "tsl",
  id: 833,
  name: "AdjustCreatureAttributes",
  comment: "833: Adjust a creature attribute by the specified amount.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<any>("oObject"), intParam("nAttribute"), intParam("nAmount")] as const,
  tsl: unimplemented("AdjustCreatureAttributes", 833),
});

export const GetPUPOwner = defineAction({
  availability: "tsl",
  id: 841,
  name: "GetPUPOwner",
  comment: "841: Get the owner of a party puppet.",
  returnType: NWScriptDataType.OBJECT,
  params: [objectParam<any>("oPUP", { optional: true, default: undefined })] as const,
  tsl: unimplemented("GetPUPOwner", 841),
});

export const GetIsPuppet = defineAction({
  availability: "tsl",
  id: 842,
  name: "GetIsPuppet",
  comment: "842: Determine whether the target is a party puppet.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<any>("oPUP", { optional: true, default: undefined })] as const,
  tsl: unimplemented("GetIsPuppet", 842, 0),
});

export const ActionFollowOwner = defineAction({
  availability: "tsl",
  id: 843,
  name: "ActionFollowOwner",
  comment: "843: Have the creature follow its owner.",
  returnType: NWScriptDataType.VOID,
  params: [floatParam("fRange", { optional: true, default: 2.5 })] as const,
  tsl: unimplemented("ActionFollowOwner", 843),
});

export const ActionSwitchWeapons = defineAction({
  availability: "tsl",
  id: 853,
  name: "ActionSwitchWeapons",
  comment: "853: Force the creature to switch between weapon configurations.",
  returnType: NWScriptDataType.VOID,
  params: [] as const,
  tsl(this: NWScriptInstance) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
      (this.caller as ModuleCreature).switchWeapons();
    }
  },
});

export const GetSpellAcquired = defineAction({
  availability: "tsl",
  id: 784,
  name: "GetSpellAcquired",
  comment: "784: Determine whether the target has access to a spell.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nSpell"), objectParam<any>("oCreature", { optional: true, default: undefined })] as const,
  tsl(this: NWScriptInstance, nSpell, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return (oCreature as ModuleCreature).getHasSpell(nSpell) ? 1 : 0;
    }
    return 0;
  },
});

export const UnlockAllSongs = defineAction({
  availability: "tsl",
  id: 855,
  name: "UnlockAllSongs",
  comment: "855: Mark all songs as unlocked.",
  returnType: NWScriptDataType.VOID,
  params: [] as const,
  tsl(this: NWScriptInstance) {
    // Intentionally fail-soft for now.
  },
});

export const DisableMap = defineAction({
  availability: "tsl",
  id: 856,
  name: "DisableMap",
  comment: "856: Disable or re-enable the player's maps.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nFlag", { optional: true, default: 0 })] as const,
  tsl(this: NWScriptInstance, nFlag) {
    GameState.FeedbackMessageManager?.SetFeedbackTypeEnabled(FeedbackOption.MiniMap, !nFlag);
  },
});

export const DetonateMine = defineAction({
  availability: "tsl",
  id: 857,
  name: "DetonateMine",
  comment: "857: Detonate a mine object.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<any>("oMine")] as const,
  tsl(this: NWScriptInstance, oMine) {
    if (BitWise.InstanceOfObject(oMine, ModuleObjectType.ModuleObject)) {
      oMine.setNoFadeOnDestroy?.(true);
      oMine.setWillDestroy?.(true);
    }
  },
});

export const DisableHealthRegen = defineAction({
  availability: "tsl",
  id: 858,
  name: "DisableHealthRegen",
  comment: "858: Disable or re-enable innate party health regeneration.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nFlag", { optional: true, default: 0 })] as const,
  tsl(this: NWScriptInstance, nFlag) {
    GameState.disableHealthRegen = !!nFlag;
  },
});

export const SetCurrentForm = defineAction({
  availability: "tsl",
  id: 859,
  name: "SetCurrentForm",
  comment: "859: Set the current Jedi Form on a creature.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<any>("oCreature"), intParam("nFormID")] as const,
  tsl(this: NWScriptInstance, oCreature, nFormID) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      (oCreature as any).currentFormId = nFormID;
    }
  },
});

export const SetDisableTransit = defineAction({
  availability: "tsl",
  id: 860,
  name: "SetDisableTransit",
  comment: "860: Disable or enable area transit.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nFlag", { optional: true, default: 0 })] as const,
  tsl(this: NWScriptInstance, nFlag) {
    if (GameState.module?.area) {
      GameState.module.area.unescapable = !!nFlag;
    }
  },
});

export const SetInputClass = defineAction({
  availability: "tsl",
  id: 861,
  name: "SetInputClass",
  comment: "861: Set the active input class.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nClass")] as const,
  tsl(this: NWScriptInstance, nClass) {
    // Intentionally fail-soft for now.
  },
});

export const SetForceAlwaysUpdate = defineAction({
  availability: "tsl",
  id: 862,
  name: "SetForceAlwaysUpdate",
  comment: "862: Force an object to keep updating outside normal range limits.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<any>("oObject"), intParam("nFlag")] as const,
  tsl(this: NWScriptInstance, oObject, nFlag) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      (oObject as any).forceAlwaysUpdate = !!nFlag;
    }
  },
});

export const EnableRain = defineAction({
  availability: "tsl",
  id: 863,
  name: "EnableRain",
  comment: "863: Enable or disable rain.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nFlag")] as const,
  tsl(this: NWScriptInstance, nFlag) {
    if (GameState.module?.area) {
      GameState.module.area.weather.started = !!nFlag;
    }
  },
});

export const DisplayMessageBox = defineAction({
  availability: "tsl",
  id: 864,
  name: "DisplayMessageBox",
  comment: "864: Display a generic message box with a string reference.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nStrRef"), stringParam("sIcon", { optional: true, default: "" })] as const,
  tsl(this: NWScriptInstance, nStrRef, sIcon) {
    GameState.MenuManager.InGameConfirm?.fromStringRef?.(nStrRef);
  },
});

export const DisplayDatapad = defineAction({
  availability: "tsl",
  id: 865,
  name: "DisplayDatapad",
  comment: "865: Display a datapad popup for an item object.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<any>("oDatapad")] as const,
  tsl(this: NWScriptInstance, oDatapad) {
    const entry = new FeedbackMessageEntry();
    entry.color = FeebackMessageColor.INFO;
    entry.type = 0;
    entry.message = BitWise.InstanceOfObject(oDatapad, ModuleObjectType.ModuleObject) ? `${oDatapad.getName?.() || oDatapad.getTag?.() || "Datapad"}` : "Datapad";
    GameState.FeedbackMessageManager?.AddEntry(entry);
  },
});

export const RemoveEffectByID = defineAction({
  availability: "tsl",
  id: 867,
  name: "RemoveEffectByID",
  comment: "867: Remove an effect by ID.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<any>("oCreature"), intParam("nEffectID")] as const,
  tsl(this: NWScriptInstance, oCreature, nEffectID) {
    // Effect instance IDs are not currently tracked; fail-soft no-op.
  },
});

export const RemoveEffectByExactMatch = defineAction({
  availability: "tsl",
  id: 868,
  name: "RemoveEffectByExactMatch",
  comment: "868: Remove an effect by exact match on type/int0/int1.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<any>("oCreature"), effectParam<GameEffect>("eEffect")] as const,
  tsl(this: NWScriptInstance, oCreature, eEffect) {
    if (!BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleObject) || !eEffect) {
      return;
    }

    const match = oCreature.effects.find((effect: GameEffect) => {
      return effect?.type === eEffect.type && effect?.getInt?.(0) === eEffect.getInt?.(0) && effect?.getInt?.(1) === eEffect.getInt?.(1);
    });

    if (match) {
      oCreature.removeEffect(match);
    }
  },
});

export const SetFakeCombatState = defineAction({
  availability: "tsl",
  id: 791,
  name: "SetFakeCombatState",
  comment: "791: Toggle fake combat state on a creature.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<any>("oObject"), intParam("nEnable")] as const,
  tsl: unimplemented("SetFakeCombatState", 791),
});

export const GrantFeat = defineAction({
  availability: "tsl",
  id: 786,
  name: "GrantFeat",
  comment: "786: Grants the target a feat without regard for prerequisites.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nFeat"), objectParam<any>("oCreature")] as const,
  tsl(this: NWScriptInstance, nFeat, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      (oCreature as ModuleCreature).addFeat(nFeat);
    }
  },
});

export const GrantSpell = defineAction({
  availability: "tsl",
  id: 787,
  name: "GrantSpell",
  comment: "787: Grants the target a spell without regard for prerequisites.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nSpell"), objectParam<any>("oCreature")] as const,
  tsl(this: NWScriptInstance, nSpell, oCreature) {
    if (!BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return;
    }

    const creature = oCreature as ModuleCreature;
    if (creature.getHasSpell(nSpell)) {
      return;
    }

    const cls = creature.classes.find((candidate) => candidate?.spellcaster) || creature.classes[0];
    if (!cls) {
      return;
    }

    cls.addSpell(new TalentSpell(nSpell));
  },
});

export const SetOrientOnClick = defineAction({
  availability: "tsl",
  id: 794,
  name: "SetOrientOnClick",
  comment: "794: Set whether a creature reorients when clicked for dialog.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<any>("oCreature", { optional: true, default: undefined }),
    intParam("nState", { optional: true, default: 1 }),
  ] as const,
  tsl(this: NWScriptInstance, oCreature, nState) {
    const creature = BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)
      ? (oCreature as ModuleCreature)
      : (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature) ? this.caller as ModuleCreature : undefined);

    if (creature) {
      creature.orientOnClick = !!nState;
    }
  },
});

export const SetKeepStealthInDialog = defineAction({
  availability: "tsl",
  id: 819,
  name: "SetKeepStealthInDialog",
  comment: "819: Set whether OBJECT_SELF keeps stealth while entering dialog.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nStealthState")] as const,
  tsl(this: NWScriptInstance, nStealthState) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
      (this.caller as ModuleCreature).keepStealthInDialog = !!nStealthState;
    }
  },
});

export const SetCreatureAILevel = defineAction({
  availability: "tsl",
  id: 834,
  name: "SetCreatureAILevel",
  comment: "834: Set the creature AI priority/level.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<any>("oObject"), intParam("nPriority")] as const,
  tsl(this: NWScriptInstance, oObject, nPriority) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleCreature)) {
      (oObject as ModuleCreature).aiLevel = nPriority;
    }
  },
});

export const ResetCreatureAILevel = defineAction({
  availability: "tsl",
  id: 835,
  name: "ResetCreatureAILevel",
  comment: "835: Reset the creature AI priority/level to default.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<any>("oObject")] as const,
  tsl(this: NWScriptInstance, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleCreature)) {
      (oObject as ModuleCreature).aiLevel = 2;
    }
  },
});

export const AdjustCreatureSkills = defineAction({
  availability: "tsl",
  id: 869,
  name: "AdjustCreatureSkills",
  comment: "869: Adjust a creature skill rank by the specified amount.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<any>("oObject"), intParam("nSkill"), intParam("nAmount")] as const,
  tsl(this: NWScriptInstance, oObject, nSkill, nAmount) {
    if (!BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleCreature)) {
      return;
    }

    const creature = oObject as ModuleCreature;
    const skill = creature.skills?.[nSkill];
    if (!skill) {
      return;
    }

    skill.rank = Math.max(0, (skill.rank || 0) + nAmount);
  },
});

export const GetSkillRankBase = defineAction({
  availability: "tsl",
  id: 870,
  name: "GetSkillRankBase",
  comment: "870: Return the base skill rank excluding effects and items.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nSkill"), objectParam<any>("oObject", { optional: true, default: undefined })] as const,
  tsl(this: NWScriptInstance, nSkill, oObject) {
    const target = BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleCreature)
      ? (oObject as ModuleCreature)
      : (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature) ? this.caller as ModuleCreature : undefined);

    if (!target) {
      return 0;
    }

    return target.skills?.[nSkill]?.rank ?? 0;
  },
});

export const EnableRendering = defineAction({
  availability: "tsl",
  id: 871,
  name: "EnableRendering",
  comment: "871: Enable or disable rendering on the target object.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<any>("oObject"), intParam("bEnable")] as const,
  tsl(this: NWScriptInstance, oObject, bEnable) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      oObject.renderEnabled = !!bEnable;
      oObject.container.visible = !!bEnable;
      if (oObject.model) {
        oObject.model.visible = !!bEnable;
      }
    }
  },
});

export const GetCombatActionsPending = defineAction({
  availability: "tsl",
  id: 872,
  name: "GetCombatActionsPending",
  comment: "872: Return TRUE if the creature has actions pending in its combat action queue.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<any>("oCreature")] as const,
  tsl(this: NWScriptInstance, oCreature) {
    if (!BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return 0;
    }

    const creature = oCreature as ModuleCreature;
    return (creature.combatRound.scheduledActionList.length > 0 || !!creature.combatRound.action) ? 1 : 0;
  },
});

export const SaveNPCByObject = defineAction({
  availability: "tsl",
  id: 873,
  name: "SaveNPCByObject",
  comment: "873: Save the party member at the given index from the supplied object.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nNPC"), objectParam<any>("oidCharacter")] as const,
  tsl(this: NWScriptInstance, nNPC, oidCharacter) {
    if (BitWise.InstanceOfObject(oidCharacter, ModuleObjectType.ModuleCreature)) {
      GameState.PartyManager.AddAvailableNPCByObject(nNPC, oidCharacter as ModuleCreature);
    }
  },
});

export const SavePUPByObject = defineAction({
  availability: "tsl",
  id: 874,
  name: "SavePUPByObject",
  comment: "874: Save the party puppet at the given index from the supplied object.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nPUP"), objectParam<any>("oidPuppet")] as const,
  tsl(this: NWScriptInstance, nPUP, oidPuppet) {
    if (GameState.PartyManager.Puppets[nPUP]) {
      GameState.PartyManager.Puppets[nPUP].available = BitWise.InstanceOfObject(oidPuppet, ModuleObjectType.ModuleCreature) ? true : GameState.PartyManager.Puppets[nPUP].available;
    }
  },
});

export const RebuildPartyTable = defineAction({
  availability: "tsl",
  id: 876,
  name: "RebuildPartyTable",
  comment: "876: Rebuild the persisted party table structures.",
  returnType: NWScriptDataType.VOID,
  params: [] as const,
  tsl(this: NWScriptInstance) {
    GameState.PartyManager.RebuildPortraitOrder();
  },
});

export const ModifyReflexSavingThrowBase = defineAction({
  availability: "tsl",
  id: 828,
  name: "ModifyReflexSavingThrowBase",
  comment: "828: Modify a creature's base Reflex save.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<any>("aObject"), intParam("aModValue")] as const,
  tsl(this: NWScriptInstance, aObject, aModValue) {
    if (BitWise.InstanceOfObject(aObject, ModuleObjectType.ModuleObject)) {
      aObject.reflexSaveThrow += aModValue;
    }
  },
});

export const ModifyFortitudeSavingThrowBase = defineAction({
  availability: "tsl",
  id: 829,
  name: "ModifyFortitudeSavingThrowBase",
  comment: "829: Modify a creature's base Fortitude save.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<any>("aObject"), intParam("aModValue")] as const,
  tsl(this: NWScriptInstance, aObject, aModValue) {
    if (BitWise.InstanceOfObject(aObject, ModuleObjectType.ModuleObject)) {
      aObject.fortitudeSaveThrow += aModValue;
    }
  },
});

export const ModifyWillSavingThrowBase = defineAction({
  availability: "tsl",
  id: 830,
  name: "ModifyWillSavingThrowBase",
  comment: "830: Modify a creature's base Will save.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<any>("aObject"), intParam("aModValue")] as const,
  tsl(this: NWScriptInstance, aObject, aModValue) {
    if (BitWise.InstanceOfObject(aObject, ModuleObjectType.ModuleObject)) {
      aObject.willSaveThrow += aModValue;
    }
  },
});

export const missingActions = [
  ActionMoveAwayFromObject,
  GetItemPossessor,
  GetCasterLevel,
  GetObjectType,
  EffectEntangle,
  GetAbilityScore,
  EffectBodyFuel,
  AddMultiClass,
  GetTotalDamageDealt,
  GetInventoryDisturbType,
  GetItemActivated,
  GetItemActivator,
  SurrenderToEnemies,
  EffectModifyAttacks,
  GetFoundEnemyCreature,
  ActionCastFakeSpellAtObject,
  GetHasInventory,
  EffectLightsaberThrow,
  ChangeItemCost,
  CancelPostDialogCharacterSwitch,
  GetInfluence,
  QueueMovie,
  PlayMovieQueue,
  IsStealthed,
  GetRandomDestination,
  IsFormActive,
  GetSpellBaseForcePointCost,
  HasLineOfSight,
  AdjustCreatureAttributes,
  GetPUPOwner,
  GetIsPuppet,
  ActionFollowOwner,
  ActionSwitchWeapons,
  GetSpellAcquired,
  SetFakeCombatState,
  UnlockAllSongs,
  DisableMap,
  DetonateMine,
  DisableHealthRegen,
  SetCurrentForm,
  SetDisableTransit,
  SetInputClass,
  SetForceAlwaysUpdate,
  EnableRain,
  DisplayMessageBox,
  DisplayDatapad,
  RemoveEffectByID,
  RemoveEffectByExactMatch,
  GrantFeat,
  GrantSpell,
  SetOrientOnClick,
  SetKeepStealthInDialog,
  SetCreatureAILevel,
  ResetCreatureAILevel,
  AdjustCreatureSkills,
  GetSkillRankBase,
  EnableRendering,
  GetCombatActionsPending,
  SaveNPCByObject,
  SavePUPByObject,
  ModifyReflexSavingThrowBase,
  ModifyFortitudeSavingThrowBase,
  ModifyWillSavingThrowBase,
  RebuildPartyTable,
] as const;
