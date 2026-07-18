import { GameState } from "@/GameState";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { TalkVolume } from "@/enums/engine/TalkVolume";
import { Action } from "@/actions/Action";

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
