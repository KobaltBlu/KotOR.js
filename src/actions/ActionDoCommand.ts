import { ActionQueue, Action } from ".";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";

export class ActionDoCommand extends Action {

  constructor( groupId: number = ActionQueue.AUTO_INCREMENT_GROUP_ID ){
    super(groupId);
    this.type = ActionType.ActionDoCommand;

    //PARAMS
    // 0 - script_situation: NWScriptInstance

  }

  update(delta: number = 0): ActionStatus {
    let script = this.getParameter(0);
    if(script instanceof NWScriptInstance){
      script.setCaller(this.owner);
      script.beginLoop({
        _instr: null, 
        index: -1, 
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
