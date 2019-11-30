/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The InventoryManager class.
 */

class InventoryManager {

  static getInventory( slot = 0, creature = null ){
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

  static getNonQuestInventory( slot = 0, creature = null ){
    if(!slot){
      let equippable = [];
      for(let i = 0; i < InventoryManager.inventory.length; i++){
        let item = InventoryManager.inventory[i];
        if(!item.Plot){
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

  static getQuestInventory(slot = 0, creature = null){
    if(!slot){
      let equippable = [];
      for(let i = 0; i < InventoryManager.inventory.length; i++){
        let item = InventoryManager.inventory[i];
        if(item.Plot){
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

  static getSellableInventory(slot = 0, creature = null){
    return InventoryManager.getNonQuestInventory(slot, creature);
  }

  static isItemUsableBy( item, creature = null){
    if(creature == null)
      return true;

    let droidorhuman = parseInt(item.getBaseItem().droidorhuman);
    
    return !droidorhuman || (
      (droidorhuman == 1 && creature.getRace() == 6) ||
      (droidorhuman == 2 && creature.getRace() == 5)
    );
    
  }

  static isItemUsableInSlot( item, slot ){
    let baseItem = item.getBaseItem();
    return (parseInt(baseItem.equipableslots) & slot || parseInt(baseItem.equipableslots) === slot)
  }

  static addItem(template = new GFFObject(), onLoad = null, limitOne = false){

    let item = undefined;
    if(template instanceof GFFObject){
      item = new ModuleItem(template);
    }else if(template instanceof ModuleItem){
      item = template;
    }

    if(item instanceof ModuleItem){
      item.Load( () => {
        console.log('LOADED')
        let hasItem = InventoryManager.getItem(item.getTag());
        if(hasItem){

          if(!limitOne){
            hasItem.setStackSize(hasItem.getStackSize() + item.getStackSize());
          }else{
            hasItem.setStackSize(hasItem.getStackSize() + 1);
          }

          if(typeof onLoad === 'function')
            onLoad(hasItem);
        }else{

          if(limitOne)
            item.setStackSize(1);

          InventoryManager.inventory.push(item);
          if(typeof onLoad === 'function')
            onLoad(item);
        }
      });
    }else{
      throw 'You can only add an item of type ModuleItem to an inventory';
    }


    


    /*itm = Object.assign({
      AddCost: 100,
      BaseItem: 0,
      Charges: 0,
      Cost: 100,
      DELETING: 0,
      DescIdentified: new CExoLocString(),
      Description: new CExoLocString(),
      Dropable: 1,
      Identified: 1,
      LocalizedName: new CExoLocString(),
      MaxCharges: 0,
      ModelVariation: 1,
      NewItem: 1,
      NonEquippable: 0,
      Pickpocketable: 1,
      Plot: 0,
      PropertiesList: [],
      StackSize: 1,
      Stolen: 0,
      Tag: '',
      Upgrades: 0,
      XOrientation: 0,
      XPosition: 0,
      YOrientation: 0,
      YPosition: 0,
      ZOrientation: 0,
      ZPosition: 0
    }, itm);*/

  }

  static removeItem(resRef = '', nCount = 1){
    let item = InventoryManager.getItem(resRef);
    let idx = InventoryManager.inventory.indexOf(item);
    if(item){
      if(nCount < item.getStackSize()){
        item.setStackSize(item.getStackSize() - nCount);
      }else{
        InventoryManager.inventory.splice(idx, 1);
      }
    }
  }

  static getItem(resRef = ''){
    for(let i = 0; i<InventoryManager.inventory.length; i++){
      let item = InventoryManager.inventory[i];
      if(item.getTag().toLowerCase() == resRef.toLowerCase())
        return item;
    }
    return false;
  }

  static itemFromJSON(json){
    let item = {};
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

}
InventoryManager.inventory = [];




module.exports = InventoryManager;