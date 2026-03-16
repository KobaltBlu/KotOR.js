import { Action } from "@/actions/Action";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { createScopedLogger, LogScope } from "@/utility/Logger";


const log = createScopedLogger(LogScope.Game);

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
    super(actionId, groupId);
    this.type = ActionType.ActionDoCommand;

    //PARAMS
    // 0 - script_situation: NWScriptInstance

  }

  update(delta: number = 0): ActionStatus {
    const script = this.getParameter<NWScriptInstance>(0);
    if(!script){
      console.error('ActionDoCommand: Not an instanceof NWScriptInstance');
      return ActionStatus.FAILED;
    }
    
    script.setCaller(this.owner);
    script.seekTo(script.offset);
    script.runScript();
    return ActionStatus.COMPLETE;
  }

}
