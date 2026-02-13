import type { NWScriptInstance } from "../../nwscript/NWScriptInstance";
import type { NWScriptInstruction } from "../../nwscript/NWScriptInstruction";
import type { NWScriptStackVariable } from "../../nwscript/NWScriptStackVariable";

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
  base: NWScriptStackVariable[];
  local: NWScriptStackVariable[];
  instr: NWScriptInstruction;
  script: NWScriptInstance;
}