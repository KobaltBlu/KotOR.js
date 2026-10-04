import * as THREE from "three";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { WeaponWield } from "@/enums/combat/WeaponWield";
import { EngineMode } from "@/enums/engine/EngineMode";
import { ExperienceType } from "@/enums/engine/ExperienceType";
import { PerceptionMask } from "@/enums/engine/PerceptionMask";
import { TalentObjectType } from "@/enums/engine/TalentObjectType";
import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { NWModuleObjectType } from "@/enums/nwscript/NWModuleObjectType";
import EngineLocation from "@/engine/EngineLocation";
import { GameState } from "@/GameState";
import { ResourceLoader } from "@/loaders";
import type { ModuleArea, ModuleCreature, ModuleItem, ModuleObject, ModulePlaceable, ModuleStore, ModuleTrigger } from "@/module";
import { GFFObject } from "@/resource/GFFObject";
import { ResourceTypes } from "@/resource/ResourceTypes";
import type { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import type { OdysseyModel3D } from "@/three/odyssey";
import { AudioEngine } from "@/audio/AudioEngine";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, floatParam, intParam, locationParam, objectParam, stringParam, vectorParam } from "@/nwscript/builtins/actionBuilder";
export const ActionEquipMostDamagingMelee = defineAction({
  id: 399,
  name: "ActionEquipMostDamagingMelee",
  comment: "399: The creature will equip the melee weapon in its possession that can do the most damage.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oVersus", { optional: true, default: undefined }),
    intParam("bOffHand", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oVersus, bOffHand) {
    const target = oVersus ?? this.caller;
    if (GameState.PartyManager.party.indexOf(target as any) >= 0) return;
    if (!BitWise.InstanceOfObject(target, ModuleObjectType.ModuleCreature)) return;
    if (target.isSimpleCreature()) return;

    const inventory = (target as ModuleCreature).getInventory();
    const equipped = bOffHand ? (target as ModuleCreature).equipment.LEFTHAND : (target as ModuleCreature).equipment.RIGHTHAND;
    let weapon: ModuleItem | undefined = equipped;

    for (const item of inventory) {
      const bi = item.baseItem;
      if (
        bi.weaponWield === WeaponWield.STUN_BATON ||
        bi.weaponWield === WeaponWield.ONE_HANDED_SWORD ||
        bi.weaponWield === WeaponWield.TWO_HANDED_SWORD
      ) {
        if (!weapon || (bi.dieToRoll * bi.numDice) > (weapon.baseItem.dieToRoll * weapon.baseItem.numDice)) {
          weapon = item;
        }
      }
    }
    if (!weapon) {
      for (const item of inventory) {
        const bi = item.baseItem;
        if (
          bi.weaponWield === WeaponWield.BLASTER_PISTOL ||
          bi.weaponWield === WeaponWield.BLASTER_RIFLE ||
          bi.weaponWield === WeaponWield.BLASTER_HEAVY
        ) {
          if (!weapon || (bi.dieToRoll * bi.numDice) > (weapon.baseItem.dieToRoll * weapon.baseItem.numDice)) {
            weapon = item;
          }
        }
      }
    }
    if (!weapon || weapon === equipped) return;

    const action = new GameState.ActionFactory.ActionEquipItem();
    action.setParameter(0, ActionParameterType.DWORD, weapon);
    action.setParameter(1, ActionParameterType.INT, bOffHand ? ModuleCreatureArmorSlot.LEFTHAND : ModuleCreatureArmorSlot.RIGHTHAND);
    action.setParameter(2, ActionParameterType.INT, NW_FALSE);
    this.caller.actionQueue.add(action);
  },
});

export const ActionEquipMostDamagingRanged = defineAction({
  id: 400,
  name: "ActionEquipMostDamagingRanged",
  comment: "400: The creature will equip the range weapon in its possession that can do the most damage.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleObject | undefined>("oVersus", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oVersus) {
    const target = oVersus ?? this.caller;
    if (!BitWise.InstanceOfObject(target, ModuleObjectType.ModuleCreature)) return;
    if (target.isSimpleCreature()) return;

    const inventory = (target as ModuleCreature).getInventory();
    const equipped = (target as ModuleCreature).equipment.RIGHTHAND;
    let weapon: ModuleItem | undefined = equipped;

    for (const item of inventory) {
      const bi = item.baseItem;
      if (
        bi.weaponWield === WeaponWield.BLASTER_PISTOL ||
        bi.weaponWield === WeaponWield.BLASTER_RIFLE ||
        bi.weaponWield === WeaponWield.BLASTER_HEAVY
      ) {
        if (!weapon || (bi.dieToRoll * bi.numDice) > (weapon.baseItem.dieToRoll * weapon.baseItem.numDice)) {
          weapon = item;
        }
      }
    }
    if (!weapon) {
      for (const item of inventory) {
        const bi = item.baseItem;
        if (
          bi.weaponWield === WeaponWield.STUN_BATON ||
          bi.weaponWield === WeaponWield.ONE_HANDED_SWORD ||
          bi.weaponWield === WeaponWield.TWO_HANDED_SWORD
        ) {
          if (!weapon || (bi.dieToRoll * bi.numDice) > (weapon.baseItem.dieToRoll * weapon.baseItem.numDice)) {
            weapon = item;
          }
        }
      }
    }
    if (!weapon) return;

    const action = new GameState.ActionFactory.ActionEquipItem();
    action.setParameter(0, ActionParameterType.DWORD, weapon);
    action.setParameter(1, ActionParameterType.INT, ModuleCreatureArmorSlot.RIGHTHAND);
    action.setParameter(2, ActionParameterType.INT, NW_FALSE);
    this.caller.actionQueue.add(action);
  },
});

export const SetMaxHitPoints = defineAction({
  id: 758,
  name: "SetMaxHitPoints",
  comment: "758: Set the maximum hitpoints of oObject.\nThe objects maximum AND current hitpoints will be nMaxHP after the function is called.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined }),
    intParam("nMaxHP"),
  ] as const,
  kotor(this: NWScriptInstance, oObject, nMaxHP) {
    if (oObject) {
      oObject.setMaxHP(nMaxHP);
      oObject.setHP(nMaxHP);
    }
  },
});

export const equipmentObjectActions = [
  ActionEquipMostDamagingMelee,
  ActionEquipMostDamagingRanged,
  SetMaxHitPoints,
] as const;
