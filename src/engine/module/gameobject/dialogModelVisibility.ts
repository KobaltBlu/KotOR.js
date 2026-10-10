import { CutsceneMode } from '@core/enums/dialog/CutsceneMode';
import { EngineMode } from '@engine/enums/engine/EngineMode';

export interface DialogModelVisibilityInput {
  mode: EngineMode;
  cutsceneMode: CutsceneMode;
  isPartyMember: boolean;
  /** StuntList participant — set through the object's cutscene state. */
  objectCutsceneMode: boolean;
  roomModelVisible: boolean | undefined;
  hasRoom: boolean;
}

export function resolveDialogModelVisibility(input: DialogModelVisibilityInput): boolean {
  if(input.mode == EngineMode.MINIGAME){
    return true;
  }
  if(input.mode != EngineMode.DIALOG){
    return true;
  }
  if(
    input.cutsceneMode == CutsceneMode.ANIMATED &&
    input.isPartyMember &&
    !input.objectCutsceneMode
  ){
    return false;
  }
  if(!input.hasRoom){
    return true;
  }
  return !!input.roomModelVisible;
}
