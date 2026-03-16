import { Action } from "@/actions/Action";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { TalkVolume } from "@/enums/engine/TalkVolume";
import { GameState } from "@/GameState";


/**
 * ActionSpeakStrRef class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionSpeakStrRef.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionSpeakStrRef extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionSpeakStrRef;

    //PARAMS
    // 0 - int: strref
    // 1 - int: talk_volume
    
  }

  update(_delta: number = 0): ActionStatus {
    const str = GameState.TLKManager.GetStringById( this.getParameter<number>(0) ).Value;
    this.owner.speakString(str, this.getParameter<TalkVolume>(1));
    return ActionStatus.COMPLETE;
  }

}