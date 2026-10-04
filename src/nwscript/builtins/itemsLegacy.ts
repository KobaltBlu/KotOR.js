import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import { ResourceLoader } from "@/loaders";
import type { ModuleCreature, ModuleItem, ModuleObject } from "@/module";
import type EngineLocation from "@/engine/EngineLocation";
import type { OdysseyModel3D } from "@/three/odyssey";
import { GFFObject } from "@/resource/GFFObject";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { BitWise } from "@/utility/BitWise";
import { defineAction, intParam, locationParam, objectParam, stringParam } from "@/nwscript/builtins/actionBuilder";

export const ActionGiveItem = defineAction({
  id: 135,
  name: "ActionGiveItem",
  comment: "135: Give oItem to oGiveTo\nIf oItem is not a valid item, or oGiveTo is not a valid object, nothing will\nhappen.\n",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleObject>("oItem"), objectParam<ModuleObject>("oGiveTo")] as const,
  kotor(this, oItem, oGiveTo) {
    if (!BitWise.InstanceOfObject(oItem, ModuleObjectType.ModuleItem)) {
      return;
    }

    if (!BitWise.InstanceOfObject(oGiveTo, ModuleObjectType.ModuleObject)) {
      return;
    }

    const action = new GameState.ActionFactory.ActionGiveItem();
    action.setParameter(0, ActionParameterType.DWORD, oItem.id);
    action.setParameter(1, ActionParameterType.DWORD, oGiveTo.id);
    this.caller.actionQueue.add(action);
  },
});

export const ActionTakeItem = defineAction({
  id: 136,
  name: "ActionTakeItem",
  comment: "136: Take oItem from oTakeFrom\nIf oItem is not a valid item, or oTakeFrom is not a valid object, nothing\nwill happen.\n",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleObject>("oItem"), objectParam<ModuleObject>("oTakeFrom")] as const,
  kotor(this, oItem, oTakeFrom) {
    if (!BitWise.InstanceOfObject(oItem, ModuleObjectType.ModuleItem)) {
      return;
    }

    if (!BitWise.InstanceOfObject(oTakeFrom, ModuleObjectType.ModuleObject)) {
      return;
    }

    const action = new GameState.ActionFactory.ActionTakeItem();
    action.setParameter(0, ActionParameterType.DWORD, oItem.id);
    action.setParameter(1, ActionParameterType.DWORD, oTakeFrom.id);
    this.caller.actionQueue.add(action);
  },
});

export const GetItemInSlot = defineAction({
  id: 155,
  name: "GetItemInSlot",
  comment: "155: Get the object which is in oCreature's specified inventory slot\n- nInventorySlot: INVENTORY_SLOT_*\n- oCreature\n* Returns OBJECT_INVALID if oCreature is not a valid creature or there is no\nitem in nInventorySlot.\n",
  returnType: NWScriptDataType.OBJECT,
  params: [intParam("nInventorySlot"), objectParam<ModuleObject>("oCreature")] as const,
  kotor(this, nInventorySlot, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      const obj = oCreature as ModuleCreature;
      switch (nInventorySlot) {
        case 0:
          return obj.getItemInSlot(ModuleCreatureArmorSlot.HEAD);
        case 1:
          return obj.getItemInSlot(ModuleCreatureArmorSlot.ARMOR);
        case 3:
          return obj.getItemInSlot(ModuleCreatureArmorSlot.ARMS);
        case 4:
          return obj.getItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND);
        case 5:
          return obj.getItemInSlot(ModuleCreatureArmorSlot.LEFTHAND);
        case 7:
          return obj.getItemInSlot(ModuleCreatureArmorSlot.LEFTARMBAND);
        case 8:
          return obj.getItemInSlot(ModuleCreatureArmorSlot.RIGHTARMBAND);
        case 9:
          return obj.getItemInSlot(ModuleCreatureArmorSlot.IMPLANT);
        case 10:
          return obj.getItemInSlot(ModuleCreatureArmorSlot.BELT);
        case 14:
          return obj.getItemInSlot(ModuleCreatureArmorSlot.CLAW1);
        case 15:
          return obj.getItemInSlot(ModuleCreatureArmorSlot.CLAW2);
        case 16:
          return obj.getItemInSlot(ModuleCreatureArmorSlot.CLAW3);
        case 17:
          return obj.getItemInSlot(ModuleCreatureArmorSlot.HIDE);
      }
    }

    return undefined;
  },
});

export const GetNumStackedItems = defineAction({
  id: 475,
  name: "GetNumStackedItems",
  comment: "475: Get the number of stacked items that oItem comprises.\n",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oItem")] as const,
  kotor(this, oItem) {
    if (BitWise.InstanceOfObject(oItem, ModuleObjectType.ModuleItem)) {
      return (oItem as ModuleItem).getStackSize();
    }
    return 0;
  },
});

export const CreateItemOnFloor = defineAction({
  id: 766,
  name: "CreateItemOnFloor",
  comment: "766. CreateItemOnFloor\nShould only be used for items that have been created on the ground, and will\nbe destroyed without ever being picked up or equipped.  Returns true if successful\n",
  returnType: NWScriptDataType.OBJECT,
  params: [stringParam("sItemTemplate"), locationParam<EngineLocation>("lLocation"), intParam("nStackSize")] as const,
  kotor(this, sItemTemplate, lLocation, nStackSize) {
    const buffer = ResourceLoader.loadCachedResource(ResourceTypes.uti, sItemTemplate);
    if (buffer) {
      const item = new GameState.Module.ModuleArea.ModuleItem(new GFFObject(buffer));
      item.placedInWorld = true;
      item.position.copy(lLocation.position);
      item.rotation.order = "ZYX";
      item.rotation.set(lLocation.getFacing(), Math.PI / 2, 0);
      item.load();
      item.loadModel().then((model: OdysseyModel3D) => {
        item.model.userData.moduleObject = item;

        model.name = item.getTag();
        GameState.group.placeables.add(model);
        GameState.module.area.items.push(item);

        item.getCurrentRoom();
      });
      return true as any;
    }
    console.error("CreateItemOnFloor", "Failed to load item template", [sItemTemplate, lLocation, nStackSize]);
    return false as any;
  },
});

export const itemsLegacyActions = [
  ActionGiveItem,
  ActionTakeItem,
  GetItemInSlot,
  GetNumStackedItems,
  CreateItemOnFloor,
] as const;
