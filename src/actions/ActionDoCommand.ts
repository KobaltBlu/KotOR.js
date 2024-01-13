import { GameState } from "../GameState";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { Action } from "./Action";

/**
 * ActionDoCommand class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionDoCommand.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionDoCommand extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(groupId);
    this.type = ActionType.ActionDoCommand;

    //PARAMS
    // 0 - script_situation: NWScriptInstance

  }

  update(delta: number = 0): ActionStatus {
    let script = this.getParameter(0);
    if(script){
      script.setCaller(this.owner);
      script.runScript({
        seek: script.offset
      });
      return ActionStatus.COMPLETE;
    }else{
      console.error('ActionDoCommand: Not an instanceof NWScriptInstance');
      return ActionStatus.FAILED;
    }
    
    return ActionStatus.FAILED;
  }

}
