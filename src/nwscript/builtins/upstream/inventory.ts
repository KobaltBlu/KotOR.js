import { GameState } from "@/GameState";
import type { ModuleCreature, ModuleObject, ModuleArea, ModuleDoor, ModuleEncounter, ModuleItem, ModuleMGEnemy, ModuleMGObstacle, ModuleMGPlayer, ModulePlaceable, ModuleSound, ModuleStore, ModuleTrigger } from "@/module";
import type { TalentObject } from "@/talents/TalentObject";
import type { GameEffect } from "@/effects/GameEffect";
import type { GameEvent } from "@/events/GameEvent";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import type { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import type { OdysseyModel3D } from "@/three/odyssey";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import { BitWise } from "@/utility/BitWise";
import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";

/** Upstream 002dfe03, action #29: upstream-body-changed. */
export const GetItemPossessor: INWScriptDefAction = {
    comment: "29: Get the possessor of oItem\n* Return value on error: OBJECT_INVALID\n",
    name: "GetItemPossessor",
    type: NWScriptDataType.OBJECT,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleItem)){
        return (args[0] as ModuleItem).possessor || undefined;
      }
      return undefined;
    }
  };

/** Upstream 002dfe03, action #266: upstream-body-changed. */
export const SetItemNonEquippable: INWScriptDefAction = {
    comment: "266: Flag the specified item as being non-equippable or not.  Set bNonEquippable\nto TRUE to prevent this item from being equipped, and FALSE to allow\nthe normal equipping checks to determine if the item can be equipped.\nNOTE: This will do nothing if the object passed in is not an item.  Items that\nare already equipped when this is called will not automatically be\nunequipped.  These items will just be prevented from being re-equipped\nshould they be unequipped.\n",
    name: "SetItemNonEquippable",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [ModuleObject, number]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleItem)){
        (args[0] as ModuleItem).nonEquippable = !!args[1];
      }
    }
  };

/** Upstream 002dfe03, action #271: upstream-body-changed. */
export const GiveItem: INWScriptDefAction = {
    comment: "271: Give oItem to oGiveTo (instant; for similar Action use ActionGiveItem)\nIf oItem is not a valid item, or oGiveTo is not a valid object, nothing will\nhappen.\n",
    name: "GiveItem",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject, ModuleObject]){
      if(!BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleItem)){
        return;
      }

      if(!BitWise.InstanceOfObject(args[1], ModuleObjectType.ModuleObject)){
        return;
      }

      if(GameState.PartyManager.party.indexOf(args[1] as any) >= 0){
        GameState.InventoryManager.addItem(args[0] as ModuleItem);
      }else{
        args[1].addItem(args[0] as ModuleItem);
      }
    }
  };

/** Upstream 002dfe03, action #282: upstream-body-changed. */
export const GetModuleItemAcquired: INWScriptDefAction = {
    comment: "282: Use this in an OnItemAcquired script to get the item that was acquired.\n* Returns OBJECT_INVALID if the module is not valid.\n",
    name: "GetModuleItemAcquired",
    type: NWScriptDataType.OBJECT,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      return GameState.module?.lastItemAcquired ?? undefined;
    }
  };

/** Upstream 002dfe03, action #332: upstream-body-changed. */
export const GetIdentified: INWScriptDefAction = {
    comment: "332: Determined whether oItem has been identified.\n",
    name: "GetIdentified",
    type: NWScriptDataType.INTEGER,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleItem)){
        return (args[0] as ModuleItem).identified ? NW_TRUE : NW_FALSE;
      }
      return NW_FALSE;
    }
  };

/** Upstream 002dfe03, action #333: upstream-body-changed. */
export const SetIdentified: INWScriptDefAction = {
    comment: "333: Set whether oItem has been identified.\n",
    name: "SetIdentified",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [ModuleObject, number]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleItem)){
        (args[0] as ModuleItem).identified = args[1] ? true : false;
      }
      return;
    }
  };

/** Upstream 002dfe03, action #352: upstream-body-changed. */
export const GetInventoryDisturbType: INWScriptDefAction = {
    comment: "352: Get the type of disturbance (INVENTORY_DISTURB_*) that caused the caller's\nOnInventoryDisturbed script to fire.  This will only work for creatures and\nplaceables.\n",
    name: "GetInventoryDisturbType",
    type: NWScriptDataType.INTEGER,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      return this.caller.lastInventoryDisturbType ?? 0;
    }
  };

/** Upstream 002dfe03, action #353: upstream-body-changed. */
export const GetInventoryDisturbItem: INWScriptDefAction = {
    comment: "353: get the item that caused the caller's OnInventoryDisturbed script to fire.\n* Returns OBJECT_INVALID if the caller is not a valid object.\n",
    name: "GetInventoryDisturbItem",
    type: NWScriptDataType.OBJECT,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      return this.caller.lastInventoryDisturbItem ?? undefined;
    }
  };

/** Upstream 002dfe03, action #398: upstream-body-changed. */
export const GetItemHasItemProperty: INWScriptDefAction = {
    comment: "398: Determines whether oItem has nProperty.\n- oItem\n- nProperty: ITEM_PROPERTY_*\n* Returns FALSE if oItem is not a valid item, or if oItem does not have\nnProperty.\n",
    name: "GetItemHasItemProperty",
    type: NWScriptDataType.INTEGER,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [ModuleObject, number]){
      if(!BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleItem)){
        return NW_FALSE;
      }
      const properties = (args[0] as ModuleItem).properties || [];
      for(let i = 0, len = properties.length; i < len; i++){
        if((properties[i] as any).propertyName == args[1]){
          return NW_TRUE;
        }
      }
      return NW_FALSE;
    }
  };

/** Upstream 002dfe03, action #401: upstream-body-changed. */
export const GetItemACValue: INWScriptDefAction = {
    comment: "401: Get the Armour Class of oItem.\n* Return 0 if the oItem is not a valid item, or if oItem has no armour value.\n",
    name: "GetItemACValue",
    type: NWScriptDataType.INTEGER,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleItem)){
        return (args[0] as ModuleItem).getACBonus();
      }
      return 0;
    }
  };

/** Upstream 002dfe03, action #570: upstream-body-changed. */
export const GetHasInventory: INWScriptDefAction = {
    comment: "570: Determine whether oObject has an inventory.\n* Returns TRUE for creatures and stores, and checks to see if an item or placeable object is a container.\n* Returns FALSE for all other object types.\n",
    name: "GetHasInventory",
    type: NWScriptDataType.INTEGER,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModulePlaceable)){
        return (args[0] as ModulePlaceable).hasInventory ? NW_TRUE : NW_FALSE;
      }
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleCreature)){
        return NW_TRUE;
      }
      return NW_FALSE;
    }
  };

/** Upstream 002dfe03, action #747: upstream-body-changed. */
export const ChangeItemCost: INWScriptDefAction = {
    comment: "747: ChangeItemCost\nChange the cost of an item\n",
    name: "ChangeItemCost",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.STRING, NWScriptDataType.FLOAT],
    action: function(this: NWScriptInstance, args: [ModuleObject, number]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleItem)){
        (args[0] as ModuleItem).cost = args[1];
      }
      return;
    }
  };
