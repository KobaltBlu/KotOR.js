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
export const DestroyObject = defineAction({
  id: 241,
  name: "DestroyObject",
  comment: "241: Destroy oObject (irrevocably).\nThis will not work on modules and areas.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined }),
    floatParam("fDelay", { optional: true, default: 0.0 }),
    intParam("bNoFade", { optional: true, default: 0 }),
    floatParam("fDelayUntilFade", { optional: true, default: 0.0 }),
    intParam("bNoXP", { availability: "tsl", optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oObject, fDelay, bNoFade, fDelayUntilFade, bNoXP) {
    if (!oObject) return;
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleItem)) {
      const item = oObject as ModuleItem;

      if (GameState.InventoryManager?.inventory?.includes(item)) {
        GameState.InventoryManager.removeItem(item, item.getStackSize());
      } else {
        const inventoryOwners = [
          ...(GameState.PartyManager?.party || []),
          ...(GameState.module?.area?.creatures || []),
          ...(GameState.module?.area?.placeables || []),
        ];

        for (const inventoryOwner of inventoryOwners) {
          if (inventoryOwner?.inventory?.includes(item)) {
            inventoryOwner.removeItem(item, item.getStackSize());
            break;
          }
        }
      }

      item.destroy();
      return;
    }
    if (
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleCreature) ||
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModulePlaceable)
    ) {
      oObject.setWillDestroy(true);
      oObject.setDelayUntilDestroy(fDelay);
      oObject.setDelayUntilFade(fDelayUntilFade);
      oObject.setNoFadeOnDestroy(!!bNoFade);
      return;
    }
    oObject.destroy();
  },
});

export const CreateObject = defineAction({
  id: 243,
  name: "CreateObject",
  comment: "243: Create an object of the specified type at lLocation.",
  returnType: NWScriptDataType.OBJECT,
  params: [
    intParam("nObjectType"),
    stringParam("sTemplate"),
    locationParam<EngineLocation>("lLocation"),
    intParam("bUseAppearAnimation", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, nObjectType, sTemplate, lLocation, bUseAppearAnimation) {
    let buffer: Uint8Array;
    switch (nObjectType) {
      case 1: { // Creature
        buffer = ResourceLoader.loadCachedResource(ResourceTypes.utc, sTemplate);
        if (buffer) {
          const creature = new GameState.Module.ModuleArea.ModuleCreature(new GFFObject(buffer));
          creature.load();
          creature.clearAllActions();
          creature.position.copy(lLocation.position);
          creature.setFacing(lLocation.getFacing(), true);
          lLocation.area.attachObject(creature);
          creature.loadModel().then((model: OdysseyModel3D) => {
            model.userData.moduleObject = creature;
            model.hasCollision = true;
            model.name = creature.getTag();
            GameState.group.creatures.add(creature.container);
            creature.getCurrentRoom();
            creature.onSpawn();
          });
          return creature;
        }
        console.error("CreateObject: Failed to load creature template", sTemplate);
        return undefined;
      }
      case 64: { // Placeable
        buffer = ResourceLoader.loadCachedResource(ResourceTypes.utp, sTemplate);
        if (buffer) {
          const plc = new GameState.Module.ModuleArea.ModulePlaceable(new GFFObject(buffer));
          plc.load();
          plc.position.copy(lLocation.position);
          plc.rotation.set(0, 0, lLocation.getFacing());
          plc.loadModel().then((model: OdysseyModel3D) => {
            plc.loadWalkmesh(model.name).then((pwk: OdysseyWalkMesh) => {
              plc.model.userData.moduleObject = plc;
              model.hasCollision = true;
              model.name = plc.getTag();
              GameState.group.placeables.add(model);
              lLocation.area.attachObject(plc);
              try {
                if (pwk.mesh instanceof THREE.Object3D) model.add(pwk.mesh);
                model.userData.walkmesh = pwk;
                GameState.walkmeshList.push(pwk.mesh);
              } catch (e) {
                console.error("CreateObject: Failed to add pwk", model.name, pwk);
              }
              plc.getCurrentRoom();
              plc.onSpawn();
            });
          });
          return plc;
        }
        console.error("CreateObject: Failed to load placeable template", sTemplate);
        return undefined;
      }
    }
    return undefined;
  },
});

export const SetIsDestroyable = defineAction({
  id: 323,
  name: "SetIsDestroyable",
  comment: "323: Set the destroyable status of the caller.",
  returnType: NWScriptDataType.VOID,
  params: [
    intParam("bDestroyable"),
    intParam("bRaiseable", { optional: true, default: 1 }),
    intParam("bSelectableWhenDead", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, bDestroyable, bRaiseable, bSelectableWhenDead) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
      this.caller.isDestroyable = !!bDestroyable;
      this.caller.isRaisable = !!bRaiseable;
      this.caller.isDeadSelectable = !!bSelectableWhenDead;
    }
  },
});

export const lifecycleObjectActions = [
  DestroyObject,
  CreateObject,
  SetIsDestroyable,
] as const;
