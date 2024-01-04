import type { NWScriptInstance } from "../../nwscript/NWScriptInstance";
import type { NWScriptInstruction } from "../../nwscript/NWScriptInstruction";

/**
 * INWScriptStoreState interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file INWScriptStoreState.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface INWScriptStoreState {
  offset: number;
  base: any[];
  local: any[];
  instr: NWScriptInstruction;
  script: NWScriptInstance;
}