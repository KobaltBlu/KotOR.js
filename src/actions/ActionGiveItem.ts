import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { InventoryManager } from "../managers/InventoryManager";
import { PartyManager } from "../managers/PartyManager";
import { ModuleCreature, ModuleItem, ModulePlaceable, ModuleStore } from "../module";
import { Action } from "./Action";

export class ActionGiveItem extends Action {
  item: ModuleItem;

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionGiveItem;
  }

  update(delta: number = 0){

    if(!(this.item instanceof ModuleItem))
      return ActionStatus.FAILED;

    if(PartyManager.party.indexOf(this.target) >= 0){
      InventoryManager.addItem( this.item );
      return ActionStatus.COMPLETE;
    }else if(
      (this.target instanceof ModuleCreature) ||
      (this.target instanceof ModulePlaceable) ||
      (this.target instanceof ModuleStore)
    ){
      this.target.addItem( this.item );
      return ActionStatus.COMPLETE;
    }

    return ActionStatus.FAILED;

  }

}
