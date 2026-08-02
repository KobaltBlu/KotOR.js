import { CutsceneMode } from "@/enums/dialog/CutsceneMode";
import { EngineMode } from "@/enums/engine/EngineMode";

export interface DialogModelVisibilityInput {
  mode: EngineMode;
  cutsceneMode: CutsceneMode;
  isPartyMember: boolean;
  /** StuntList participant — set via ModuleObject.setCutsceneMode(true). */
  objectCutsceneMode: boolean;
  roomModelVisible: boolean | undefined;
  hasRoom: boolean;
}

/**
 * Resolve mesh visibility for DIALOG / MINIGAME (ModuleObject.updateModelVisibility).
 * Animated cuts hide idle party at Mod_Entry (e.g. stunt_06 CUT002+).
 */
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
