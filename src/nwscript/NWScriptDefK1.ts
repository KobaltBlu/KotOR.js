import { NWScriptDef } from "@/nwscript/NWScriptDef";
import { buildReconciledActionMap } from "@/nwscript/reconciledActions";

/** K1 public action table; implementations live in named nwscript/builtins domains. */
export class NWScriptDefK1 extends NWScriptDef {}
NWScriptDefK1.Actions = buildReconciledActionMap("kotor");
