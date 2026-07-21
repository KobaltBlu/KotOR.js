import { NWScriptASTNodeType, type NWScriptProgramNode } from "@/nwscript/decompiler/NWScriptAST";
import type { NWScriptControlFlowGraph } from "@/nwscript/decompiler/NWScriptControlFlowGraph";
import type { NWScriptFunction } from "@/nwscript/decompiler/NWScriptFunctionAnalyzer";
import {
  collectCalleeEntryPcsFromStoreStateThunks,
  collectCalleeEntryPcsReachableFromBlock,
  collectCalleeEntryPcsTransitiveFromMainFamily,
  expandCalleeEntryPcsTransitive,
} from "@/nwscript/decompiler/NWScriptCallGraphReachability";

export interface NwscriptDecompilerCleanupContext {
  cfg: NWScriptControlFlowGraph;
  functions: NWScriptFunction[];
}

/**
 * Optional AST cleanup after ControlNode conversion (analogous to NCSDecomp {@code CleanupPass}).
 * Currently: drop subroutine definitions that are never invoked from script entry or transitively
 * from {@code main}/{@code StartingConditional} (so uncalled junk subs do not appear in NSS).
 * STORE_STATE thunk JSR callees (DelayCommand / AssignCommand) are treated as reachable seeds.
 */
export function applyNwscriptDecompilerCleanup(
  ast: NWScriptProgramNode,
  ctx?: NwscriptDecompilerCleanupContext
): void {
  if (!ctx) {
    return;
  }
  const { cfg, functions } = ctx;
  const fromEntry = collectCalleeEntryPcsReachableFromBlock(cfg, cfg.entryBlock);
  const fromMainFamily = collectCalleeEntryPcsTransitiveFromMainFamily(functions);
  const fromThunks = collectCalleeEntryPcsFromStoreStateThunks(cfg.script);
  const emitEntryPcs = expandCalleeEntryPcsTransitive(
    [...fromEntry, ...fromMainFamily, ...fromThunks],
    functions
  );

  ast.functions = ast.functions.filter((fn) => {
    if (fn.type !== NWScriptASTNodeType.FUNCTION) {
      return true;
    }
    if (fn.name === "main" || fn.name === "StartingConditional") {
      return true;
    }
    const pc = fn.entryBlock?.startInstruction.address;
    if (pc === undefined) {
      return true;
    }
    return emitEntryPcs.has(pc);
  });
}
