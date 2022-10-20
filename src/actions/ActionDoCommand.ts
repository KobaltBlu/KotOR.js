import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { Action } from "./Action";

export class ActionDoCommand extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionDoCommand;

    //PARAMS
    // 0 - script_situation: NWScriptInstance

  }

  update(delta: number = 0){
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
