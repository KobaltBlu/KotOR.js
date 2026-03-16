import { Action } from "@/actions/Action";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import type { ModuleCreature, ModuleItem, ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";


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

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionGiveItem;

    //PARAMS
    // 0 - dword: oItem
    // 1 - dword: oGiveTo
  }

  update(_delta: number = 0): ActionStatus {

    if(
      !BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature) &&
      !BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModulePlaceable) &&
      !BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleStore)
    ){
      return ActionStatus.FAILED;
    }

    const oItem = this.getParameter<ModuleItem>(0);
    if(!BitWise.InstanceOfObject(oItem, ModuleObjectType.ModuleItem)){
      return ActionStatus.FAILED;
    }

    const oGiveTo = this.getParameter<ModuleObject>(1);
    if(
      !BitWise.InstanceOfObject(oGiveTo, ModuleObjectType.ModuleCreature) &&
      !BitWise.InstanceOfObject(oGiveTo, ModuleObjectType.ModulePlaceable) &&
      !BitWise.InstanceOfObject(oGiveTo, ModuleObjectType.ModuleStore)
    ){
      return ActionStatus.FAILED;
    }

    if(GameState.PartyManager.party.indexOf(oGiveTo as any) >= 0){
      GameState.InventoryManager.addItem( oItem );
    }else{
      oGiveTo.addItem( oItem );
    }

    return ActionStatus.COMPLETE;

  }

}
