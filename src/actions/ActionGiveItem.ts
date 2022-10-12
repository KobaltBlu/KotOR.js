import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { Action } from "./Action";

export class ActionGiveItem extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionGiveItem;
  }

  update(delta: number = 0){

    if(!(this.item instanceof ModuleItem))
      return ActionStatus.FAILED;

    if(PartyManager.party.indexOf(this.target) >= 0){
      InventoryManager.addItem( item );
      return ActionStatus.COMPLETE;
    }else if(
      (this.target instanceof ModuleCreature) ||
      (this.target instanceof ModulePlaceable) ||
      (this.target instanceof ModuleStore)
    ){
      this.target.addItem( item );
      return ActionStatus.COMPLETE;
    }

    return ActionStatus.FAILED;

  }

}
