import { GameState } from "../GameState";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { Action } from "./Action";

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
    super(groupId);
    this.type = ActionType.ActionSpeakStrRef;

    //PARAMS
    // 0 - int: strref
    // 0 - int: talk_volume
    
  }

  update(delta: number = 0): ActionStatus {
    const str = GameState.TLKManager.GetStringById( this.getParameter(0) ).Value;
    return ActionStatus.FAILED;
  }

}