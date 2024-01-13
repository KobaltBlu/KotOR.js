import { GameState } from "../GameState";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import type { ModuleItem } from "../module/ModuleItem";
import { BitWise } from "../utility/BitWise";
import { Action } from "./Action";

/**
 * ActionGiveItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionGiveItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionGiveItem extends Action {
  item: ModuleItem;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(groupId);
    this.type = ActionType.ActionGiveItem;
  }

  update(delta: number = 0): ActionStatus {

    if(!BitWise.InstanceOfObject(this.item, ModuleObjectType.ModuleItem))
      return ActionStatus.FAILED;

    if(GameState.PartyManager.party.indexOf(this.target as any) >= 0){
      GameState.InventoryManager.addItem( this.item );
      return ActionStatus.COMPLETE;
    }else if(
      BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature) ||
      BitWise.InstanceOfObject(this.target, ModuleObjectType.ModulePlaceable) ||
      BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleStore)
    ){
      this.target.addItem( this.item );
      return ActionStatus.COMPLETE;
    }

    return ActionStatus.FAILED;

  }

}
