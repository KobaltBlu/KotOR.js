import { GameState } from "@engine/runtime/GameState";
import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import { TalkVolume } from "@engine/enums/engine/TalkVolume";
import { Action } from "@engine/actions/Action";

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
    // 0 - string: sStringToSpeak (text to speak)
    // 1 - int: nTalkVolume (TalkVolume enum: TALK, WHISPER, SHOUT, SILENT_TALK, SILENT_SHOUT)
    
  }

  update(delta: number = 0): ActionStatus {
    if(!this.owner){
      return ActionStatus.FAILED;
    }

    const text = this.getParameter<string>(0) || '';
    const volume = this.getParameter<TalkVolume>(1) ?? TalkVolume.TALK;
    this.owner.speakString(text, volume);

    // Visible bark for non-silent volumes (hear pipeline already handled above).
    if(text && volume !== TalkVolume.SILENT_TALK && volume !== TalkVolume.SILENT_SHOUT){
      GameState.MenuManager.InGameBark.barkFromString(text);
    }

    return ActionStatus.COMPLETE;
  }

}
