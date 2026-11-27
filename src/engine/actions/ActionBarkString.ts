import { Action } from "@engine/actions/Action";
import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import { TalkVolume } from "@engine/enums/engine/TalkVolume";
import { GameState } from "@engine/runtime/GameState";

/**
 * ActionBarkString class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionBarkString.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionBarkString extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionBarkString;

    //PARAMS
    // 0 - int: nStrRef (talk string reference index from dialog.tlk)

  }

  update(delta: number = 0): ActionStatus {
    const strRef = this.getParameter<number>(0);
    if(typeof strRef !== 'number'){
      return ActionStatus.FAILED;
    }

    const tlk = GameState.TLKManager.GetStringById(strRef);
    const text = tlk?.Value || '';
    if(text){
      // Feed hear pipeline so GetHeardString / dialog listeners work.
      this.owner?.speakString(text, TalkVolume.TALK);
    }
    GameState.MenuManager.InGameBark.barkFromStringRef(strRef);
    return ActionStatus.COMPLETE;
  }

}
