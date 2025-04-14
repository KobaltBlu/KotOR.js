import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import * as path from "path";
import { CurrentGame } from "../CurrentGame";
import type { ModuleCreature, ModuleItem } from "../module";
import { GameState } from "../GameState";
import { BaseItemType } from "../enums/combat/BaseItemType";
import { UIIconTimerType } from "../enums/engine/UIIconTimerType";
// import { PartyManager } from "./PartyManager";

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
      if(hasItem){

        if(!limitOne){
          hasItem.setStackSize(hasItem.getStackSize() + item.getStackSize());
        }else{
          hasItem.setStackSize(hasItem.getStackSize() + 1);
        }

        return hasItem;
      }else{

        if(limitOne)
          item.setStackSize(1);

        InventoryManager.inventory.push(item);
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
      //console.log('InventoryManager.Save()', 'Exporting...');
      let gff = new GFFObject();
      gff.FileType = 'INV ';

      let itemList = gff.RootNode.addField( new GFFField( GFFDataType.LIST, 'ItemList' ));
      for(let i = 0; i < InventoryManager.inventory.length; i++){
        itemList.addChildStruct( InventoryManager.inventory[i].save() );
      }

      await gff.export( path.join( CurrentGame.gameinprogress_dir, 'INVENTORY.res') );
      resolve(gff);
    });
  }

}
