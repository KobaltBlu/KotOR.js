import { Action } from "@/actions/Action";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";

/**
 * ActionPlaySound class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionPlaySound.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionPlaySound extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionPlaySound;

    //PARAMS
    // 0 - string: sSoundName (sound resref)
  }

  update(delta: number = 0): ActionStatus {
    const resRef = this.getParameter<string>(0);
    if(!resRef || !this.owner){
      return ActionStatus.FAILED;
    }

    if(this.owner.audioEmitter){
      this.owner.audioEmitter.playSound(resRef);
    }

    return ActionStatus.COMPLETE;
  }

}
