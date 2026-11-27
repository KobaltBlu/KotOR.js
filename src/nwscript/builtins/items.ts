import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import { ResourceLoader } from "@/loaders";
import type { ModuleCreature, ModuleItem, ModuleObject } from "@/module";
import { GFFObject } from "@/resource/GFFObject";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { BitWise } from "@/utility/BitWise";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, intParam, objectParam, stringParam } from "@/nwscript/builtins/actionBuilder";

export const GetItemPossessedBy = defineAction({
  id: 30,
  name: "GetItemPossessedBy",
  comment: "30: Get the object possessed by oCreature with the tag sItemTag.",
  returnType: NWScriptDataType.OBJECT,
  params: [
    objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined }),
    stringParam("sItemTag"),
  ] as const,

  kotor(this: NWScriptInstance, oCreature, sItemTag) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleObject)) {
      return oCreature.getItemByTag(sItemTag);
    }

    return undefined;
  },
});

export const CreateItemOnObject = defineAction({
  id: 31,
  name: "CreateItemOnObject",
  comment: "31: Create an item with the template sItemTemplate in oTarget's inventory.",
  returnType: NWScriptDataType.OBJECT,
  params: [
    stringParam("sItemTemplate"),
    objectParam<ModuleObject>("oTarget"),
    intParam("nStackSize", { optional: true, default: 1 }),
    intParam("bHideMessage", { availability: "tsl", optional: true, default: 0 }),
  ] as const,

  async kotor(this: NWScriptInstance, sItemTemplate, oTarget, nStackSize, bHideMessage) {
    const buffer = ResourceLoader.loadCachedResource(ResourceTypes.uti, sItemTemplate);
    if (!buffer) {
      return undefined;
    }

    const item = new GameState.Module.ModuleArea.ModuleItem(new GFFObject(buffer));
    item.initProperties();
    item.setStackSize(nStackSize);

    if (GameState.PartyManager.party.indexOf(oTarget as any) > -1) {
      GameState.InventoryManager.addItem(item);
    } else {
      oTarget.addItem(item);
    }

    return item;
  },
});

export const ActionEquipItem = defineAction({
  id: 32,
  name: "ActionEquipItem",
  comment: "32: Equip oItem into nInventorySlot.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject>("oItem"),
    intParam("nInventorySlot"),
    intParam("bLockActions", { optional: true, default: 0 }),
  ] as const,

  kotor(this: NWScriptInstance, oItem, nInventorySlot, bLockActions) {
    if (!BitWise.InstanceOfObject(oItem, ModuleObjectType.ModuleItem)) {
      return;
    }

    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
      return;
    }

    let slot = nInventorySlot as ModuleCreatureArmorSlot;
    const obj = this.caller as ModuleCreature;

    const slotMap: {[key: number]: ModuleCreatureArmorSlot} = {
      0: ModuleCreatureArmorSlot.HEAD,
      1: ModuleCreatureArmorSlot.ARMOR,
      3: ModuleCreatureArmorSlot.ARMS,
      4: ModuleCreatureArmorSlot.RIGHTHAND,
      5: ModuleCreatureArmorSlot.LEFTHAND,
      7: ModuleCreatureArmorSlot.LEFTARMBAND,
      8: ModuleCreatureArmorSlot.RIGHTARMBAND,
      9: ModuleCreatureArmorSlot.IMPLANT,
      10: ModuleCreatureArmorSlot.BELT,
      14: ModuleCreatureArmorSlot.CLAW1,
      15: ModuleCreatureArmorSlot.CLAW2,
      16: ModuleCreatureArmorSlot.CLAW3,
      17: ModuleCreatureArmorSlot.HIDE,
    };

    if(slotMap.hasOwnProperty(nInventorySlot)){
      slot = slotMap[nInventorySlot];
    }

    const action = new GameState.ActionFactory.ActionEquipItem();
    action.setParameter(0, ActionParameterType.DWORD, oItem);
    action.setParameter(1, ActionParameterType.INT, slot);
    action.setParameter(2, ActionParameterType.INT, bLockActions ? NW_TRUE : NW_FALSE);
    obj.actionQueue.addFront(action);
  },
});

export const ActionUnequipItem = defineAction({
  id: 33,
  name: "ActionUnequipItem",
  comment: "33: Unequip oItem from whatever slot it is currently in.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oItem", { optional: true, default: undefined }),
    intParam("bLockActions", { optional: true, default: 0 }),
  ] as const,

  kotor(this: NWScriptInstance, oItem, bLockActions) {
    if (typeof oItem !== "object") {
      return;
    }

    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
      return;
    }

    const obj = this.caller as ModuleCreature;
    const action = new GameState.ActionFactory.ActionUnequipItem();
    action.setParameter(0, ActionParameterType.DWORD, oItem);
    action.setParameter(1, ActionParameterType.DWORD, undefined);
    action.setParameter(2, ActionParameterType.INT, bLockActions ? NW_TRUE : NW_FALSE);
    obj.actionQueue.add(action);
  },
});

export const ActionPickUpItem = defineAction({
  id: 34,
  name: "ActionPickUpItem",
  comment: "34: Pick up oItem from the ground.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oItem", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oItem) {
    if (typeof oItem !== "object") {
      return;
    }

    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
      return;
    }

    const obj = this.caller as ModuleCreature;
    const action = new GameState.ActionFactory.ActionPickUpItem();
    action.setParameter(0, ActionParameterType.DWORD, oItem);
    obj.actionQueue.add(action);
  },
});

export const ActionPutDownItem = defineAction({
  id: 35,
  name: "ActionPutDownItem",
  comment: "35: Put down oItem on the ground.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oItem", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oItem) {
    if (typeof oItem !== "object") {
      return;
    }

    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
      return;
    }

    const obj = this.caller as ModuleCreature;
    const action = new GameState.ActionFactory.ActionDropItem();
    action.setParameter(0, ActionParameterType.DWORD, oItem);
    obj.actionQueue.add(action);
  },
});

export const GetItemStackSize = defineAction({
  id: 138,
  name: "GetItemStackSize",
  comment: "138: Get the stack size of an item.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oItem", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oItem) {
    if (BitWise.InstanceOfObject(oItem, ModuleObjectType.ModuleItem)) {
      return (oItem as ModuleItem).getStackSize();
    }

    return 0;
  },
});

export const SetItemStackSize = defineAction({
  id: 150,
  name: "SetItemStackSize",
  comment: "150: Set the stack size of an item.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oItem", { optional: true, default: undefined }),
    intParam("nStackSize", { optional: true, default: 1 }),
  ] as const,

  kotor(this: NWScriptInstance, oItem, nStackSize) {
    if (BitWise.InstanceOfObject(oItem, ModuleObjectType.ModuleItem)) {
      (oItem as ModuleItem).setStackSize(nStackSize || 1);
    }
  },
});

export const GetGoldPieceValue = defineAction({
  id: 311,
  name: "GetGoldPieceValue",
  comment: "311: Get the gold piece value of oItem.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oItem", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oItem) {
    if (BitWise.InstanceOfObject(oItem, ModuleObjectType.ModuleItem)) {
      const item = oItem as ModuleItem;
      return (item.cost || 0) + (item.addCost || 0);
    }

    return 0;
  },
});

export const GetBaseItemType = defineAction({
  id: 397,
  name: "GetBaseItemType",
  comment: "397: Get the base item type (BASE_ITEM_*) of oItem.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oItem", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oItem) {
    if (BitWise.InstanceOfObject(oItem, ModuleObjectType.ModuleItem)) {
      return (oItem as ModuleItem).getBaseItemId();
    }

    return 256;
  },
});

export const itemsActions = [
  GetItemPossessedBy,
  CreateItemOnObject,
  ActionEquipItem,
  ActionUnequipItem,
  ActionPickUpItem,
  ActionPutDownItem,
  GetItemStackSize,
  SetItemStackSize,
  GetGoldPieceValue,
  GetBaseItemType,
] as const;
