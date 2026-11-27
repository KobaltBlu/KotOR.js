import { GameState } from "@/GameState";
import { Action } from "@/actions/Action";
import { ActionType } from "@/enums/actions/ActionType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";

/**
 * ActionDropItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionDropItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionDropItem extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionDropItem;
  }

  update(delta?: number): ActionStatus {
    if(!this.owner){
      return ActionStatus.FAILED;
    }

    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }

    const owner: ModuleCreature = this.owner as ModuleCreature;
    const item = this.getParameter<ModuleItem>(0);

    if(!BitWise.InstanceOfObject(item, ModuleObjectType.ModuleItem)){
      return ActionStatus.FAILED;
    }

    if(!owner.area){
      return ActionStatus.FAILED;
    }

    const droppedItem = owner.removeItem(item, item.getStackSize());
    if(!droppedItem){
      return ActionStatus.FAILED;
    }

    droppedItem.placedInWorld = true;
    droppedItem.setPossessor(undefined as any);
    droppedItem.position.copy(owner.position);
    droppedItem.rotation.copy(owner.rotation);
    owner.area.attachObject(droppedItem);

    droppedItem.load();
    droppedItem.loadModel().then((model) => {
      if(model){
        model.userData.moduleObject = droppedItem;
        model.name = droppedItem.getTag();
        GameState.group.placeables.add(model);
      }
      droppedItem.getCurrentRoom();
    }).catch((e) => {
      console.error(e);
    });

    return ActionStatus.COMPLETE;
  }

}
