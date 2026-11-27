import { GameState } from "@engine/runtime/GameState";
import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import { TalkVolume } from "@engine/enums/engine/TalkVolume";
import { Action } from "@engine/actions/Action";

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
    // 0 - int: nStrRef (talk string reference index from dialog.tlk)
    // 1 - int: nTalkVolume (TalkVolume enum)
    
  }

  update(delta: number = 0): ActionStatus {
    if(!this.owner){
      return ActionStatus.FAILED;
    }

    const strRef = this.getParameter<number>(0);
    if(typeof strRef !== 'number'){
      return ActionStatus.FAILED;
    }

    const tlk = GameState.TLKManager.GetStringById(strRef);
    const text = tlk?.Value || '';
    if(!text){
      return ActionStatus.FAILED;
    }

    const volume = this.getParameter<TalkVolume>(1) ?? TalkVolume.TALK;
    this.owner.speakString(text, volume);

    if(volume !== TalkVolume.SILENT_TALK && volume !== TalkVolume.SILENT_SHOUT){
      GameState.MenuManager.InGameBark.barkFromStringRef(strRef);
    }

    return ActionStatus.COMPLETE;
  }

}
