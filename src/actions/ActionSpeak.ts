import { Action } from "@/actions/Action";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { TalkVolume } from "@/enums/engine/TalkVolume";


/**
 * ActionSpeak class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionSpeak.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionSpeak extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionSpeak;

    //PARAMS
    // 0 - string: string to speak
    // 1 - int: talk_volume
    
  }

  update(_delta: number = 0): ActionStatus {
    if(!this.owner){
      return ActionStatus.FAILED;
    }

    this.owner.speakString(this.getParameter<string>(0), this.getParameter<TalkVolume>(1));
    return ActionStatus.COMPLETE;
  }

}