import type { NWScriptInstance } from "../../nwscript/NWScriptInstance";
import type { NWScriptInstruction } from "../../nwscript/NWScriptInstruction";

export interface NWScriptStoreState {
  offset: number;
  base: any[];
  local: any[];
  instr: NWScriptInstruction;
  script: NWScriptInstance;
}