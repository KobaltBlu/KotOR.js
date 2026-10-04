import { NWScriptDef } from "@/nwscript/NWScriptDef";
import { buildReconciledActionMap } from "@/nwscript/reconciledActions";

/** K2 public action table; colliding K1/K2 IDs are resolved explicitly by variant. */
export class NWScriptDefK2 extends NWScriptDef {}
NWScriptDefK2.Actions = buildReconciledActionMap("tsl");
