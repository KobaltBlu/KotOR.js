import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { GFFField } from "@core/resource/GFFField";
import { GFFObject } from "@core/resource/GFFObject";
import * as path from "path";
import { CurrentGame } from "@engine/save/CurrentGame";
import type { ModuleCreature } from "@engine/module/ModuleCreature";
import type { ModuleItem } from "@engine/module/ModuleItem";
import { GameState } from "@engine/runtime/GameState";
import { BaseItemType } from "@core/enums/combat/BaseItemType";
import { UIIconTimerType } from "@engine/enums/engine/UIIconTimerType";
// import { PartyManager } from "@engine/managers/PartyManager";

/**
 * InventoryManager class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file InventoryManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InventoryManager {
  static inventory: ModuleItem[] = [];

  static getInventory( slot = 0, creature?: ModuleCreature ){
    if(!slot){
      return InventoryManager.inventory;
    }else{
      let equippable = [];
      for(let i = 0; i < InventoryManager.inventory.length; i++){
        let item = InventoryManager.inventory[i];
        if( InventoryManager.isItemUsableInSlot(item, slot) && InventoryManager.isItemUsableBy(item, creature)){
          equippable.push(item);
        }
      }
      return equippable;
    }
  }

  static getNonQuestInventory( slot = 0, creature?: ModuleCreature ){
    if(!slot){
      let equippable = [];
      for(let i = 0; i < InventoryManager.inventory.length; i++){
        let item = InventoryManager.inventory[i];
        if(!item.plot){
          equippable.push(item);
        }
      }
      return equippable;
    }else{
      let equippable = [];
      for(let i = 0; i < InventoryManager.inventory.length; i++){
        let item = InventoryManager.inventory[i];
        if(InventoryManager.isItemUsableInSlot(item, slot) && InventoryManager.isItemUsableBy(item, creature)){
          equippable.push(item);
        }
      }
      return equippable;
    }
  }

  static getQuestInventory(slot = 0, creature?: ModuleCreature){
    if(!slot){
      let equippable = [];
      for(let i = 0; i < InventoryManager.inventory.length; i++){
        let item = InventoryManager.inventory[i];
        if(item.plot){
          equippable.push(item);
        }
      }
      return equippable;
    }else{
      let equippable = [];
      for(let i = 0; i < InventoryManager.inventory.length; i++){
        let item = InventoryManager.inventory[i];
        if(InventoryManager.isItemUsableInSlot(item, slot) && InventoryManager.isItemUsableBy(item, creature)){
          equippable.push(item);
        }
      }
      return equippable;
    }
  }

  static getSellableInventory(slot = 0, creature?: ModuleCreature){
    return InventoryManager.getNonQuestInventory(slot, creature);
  }

  static isItemUsableBy( item?: ModuleItem, creature?: ModuleCreature): boolean {
    // if(!(item instanceof ModuleItem) || !(creature instanceof ModuleCreature))
      // return false;

    let droidorhuman = item.baseItem.droidOrHuman;
    
    return !droidorhuman || (
      (droidorhuman == 1 && creature.getRace() == 6) ||
      (droidorhuman == 2 && creature.getRace() == 5)
    );
    
  }

  static isItemUsableInSlot( item: ModuleItem, slot: any ): boolean {
    let baseItem = item.baseItem;
    return (baseItem.equipableSlots & slot || baseItem.equipableSlots === slot) ? true : false;
  }

  static addItem(template: GFFObject|ModuleItem = new GFFObject(), limitOne = false): ModuleItem {

    let item: ModuleItem;
    if(template instanceof GFFObject){
      item = new GameState.Module.ModuleArea.ModuleItem(template);
    }else if(template instanceof GameState.Module.ModuleArea.ModuleItem){
      item = template;
    }

    if(!(item instanceof GameState.Module.ModuleArea.ModuleItem)){
      throw 'You can only add an item of type ModuleItem to an inventory';
    }

    item.initProperties();
    // CreatureAcquireItem / SellItem clear Infinite (bit 2) on
    // copies that enter creature inventory — Infinite is store-stock only.
    item.setInfinite(0);
    if(item.getBaseItemId() == BaseItemType.CREDITS){
      GameState.PartyManager.AddGold(item.getStackSize());
      GameState.UINotificationManager.EnableUINotificationIconType(UIIconTimerType.CREDITS_RECEIVED);
    }else if(item.getBaseItemId() == BaseItemType.PAZAAK_CARD){
      GameState.PazaakManager.AddCard(item.getModelVariation(), item.getStackSize());
      GameState.UINotificationManager.EnableUINotificationIconType(UIIconTimerType.ITEM_RECEIVED);
    }else{
      GameState.UINotificationManager.EnableUINotificationIconType(UIIconTimerType.ITEM_RECEIVED);
      item.load();
      let hasItem = InventoryManager.getItemByTag(item.getTag());
      // stacks only identical items; differently upgraded variants must not merge.
      const canStack = hasItem && InventoryManager.canStackItems(hasItem as ModuleItem, item);
      if(hasItem && canStack){

        // Sanitize legacy Infinite flags left on party stacks from store buys.
        (hasItem as ModuleItem).setInfinite(0);

        if(!limitOne){
          (hasItem as ModuleItem).setStackSize((hasItem as ModuleItem).getStackSize() + item.getStackSize());
        }else{
          (hasItem as ModuleItem).setStackSize((hasItem as ModuleItem).getStackSize() + 1);
        }

        return hasItem as ModuleItem;
      }else{

        if(limitOne)
          item.setStackSize(1);

        InventoryManager.inventory.push(item);
        item.setPossessor(GameState.PartyManager.Player);
        return item;
      }
    }

  }

  static removeItemByResRef(resRef = '', nCount = 1){
    let item = InventoryManager.getItemByTag(resRef);
    if(item){
      GameState.UINotificationManager.EnableUINotificationIconType(UIIconTimerType.ITEM_LOST);
      let idx = InventoryManager.inventory.indexOf(item);
      if(nCount < item.getStackSize()){
        item.setStackSize( (item.getStackSize() - nCount) || 1 );
      }else{
        InventoryManager.inventory.splice(idx, 1);
      }
    }
  }

  static removeItem(item?: string|ModuleItem, nCount = 1){
    if(typeof item === 'string'){
      InventoryManager.removeItemByResRef(item, nCount);
    }else if(item instanceof GameState.Module.ModuleArea.ModuleItem){
      let idx = InventoryManager.inventory.indexOf(item);
      if(idx >= 0){
        GameState.UINotificationManager.EnableUINotificationIconType(UIIconTimerType.ITEM_LOST);
        if(nCount >= item.getStackSize()){
          InventoryManager.inventory.splice(idx, 1);
        }else{
          item.setStackSize( (item.getStackSize() - nCount) || 1 );
        }
      }else{
        //Item not in inventory
      }
    }else{
      console.warn('InventoryManager.removeItem() unknown item', item, nCount);
    }
  }

  static getItemByTag(sTag = ''){
    for(let i = 0; i < InventoryManager.inventory.length; i++){
      let item = InventoryManager.inventory[i];
      if(item.getTag().toLowerCase() == sTag.toLowerCase())
        return item;
    }
    return false;
  }

  /** Items with different upgrade state must not stack together. */
  static canStackItems(a: ModuleItem, b: ModuleItem): boolean {
    if(!a || !b) return false;
    if((a.getTag?.() || '').toLowerCase() !== (b.getTag?.() || '').toLowerCase()) return false;
    if((a.upgrades || 0) !== (b.upgrades || 0)) return false;
    if((a.upgradeLevel || 0) !== (b.upgradeLevel || 0)) return false;
    for(let i = 0; i < 6; i++){
      if((a.getUpgradeSlot?.(i) ?? -1) !== (b.getUpgradeSlot?.(i) ?? -1)) return false;
    }
    return true;
  }

  static itemFromJSON(json: any = {}){
    let item: any = {};
    let props = json.fields;
    for(let fieldName in props){
      let field = props[fieldName];
      if(field.type == 15){
        item[fieldName] = [];
        for(let i = 0; i < field.structs.length; i++){
          item[fieldName].push(InventoryManager.itemFromJSON(field.structs[i]));
        }
      }else{
        item[fieldName] = field.value;
      }
    }
    return item;
  }

  static Save(){
    return new Promise( async (resolve, reject) => {
      //console.log('InventoryManager.Save', 'Exporting...');
      let gff = new GFFObject();
      gff.FileType = 'INV ';

      let itemList = gff.RootNode.addField( new GFFField( GFFDataType.LIST, 'ItemList' ));
      for(let i = 0; i < InventoryManager.inventory.length; i++){
        itemList.addChildStruct( InventoryManager.inventory[i].save() );
      }

      await gff.export( path.join( CurrentGame.gameinprogress_dir, 'inventory.res') );
      resolve(gff);
    });
  }

}
