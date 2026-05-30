import type { NWScriptControlFlowGraph } from "@/nwscript/decompiler/NWScriptControlFlowGraph";
import type { NWScriptBasicBlock } from "@/nwscript/decompiler/NWScriptBasicBlock";
import type { NWScriptFunction } from "@/nwscript/decompiler/NWScriptFunctionAnalyzer";
import { OP_JSR } from "@/nwscript/NWScriptOPCodes";

/**
 * JSR callee entry PCs reachable from a CFG start block (BFS over successors, mirroring
 * how {@link NWScriptControlFlowGraph} models JSR as an edge into the callee).
 * Used to omit uncalled subroutines from decompiled source (NCSDecomp-style reachability).
 */
export function collectCalleeEntryPcsReachableFromBlock(
  cfg: NWScriptControlFlowGraph,
  start: NWScriptBasicBlock | null
): Set<number> {
  const callees = new Set<number>();
  if (!start) {
    return callees;
  }

  const visited = new Set<NWScriptBasicBlock>();
  const queue: NWScriptBasicBlock[] = [start];

  while (queue.length > 0) {
    const block = queue.shift()!;
    if (visited.has(block)) {
      continue;
    }
    visited.add(block);

    for (const instr of block.instructions) {
      if (instr.code === OP_JSR && instr.offset !== undefined) {
        callees.add(instr.address + instr.offset);
      }
    }

    for (const succ of block.successors) {
      if (!visited.has(succ)) {
        queue.push(succ);
      }
    }
  }

  return callees;
}

/**
 * Callee entry PCs reachable by following OP_JSR from {@code main}/StartingConditional bodies only
 * (transitive). Catches helpers called from main even when the global CFG entry BFS ordering misses them;
 * combine with {@link collectCalleeEntryPcsReachableFromBlock} for STORE_STATE thunk callees.
 */
export function collectCalleeEntryPcsTransitiveFromMainFamily(functions: NWScriptFunction[]): Set<number> {
  const subsByEntry = new Map<number, NWScriptFunction>();
  for (const f of functions) {
    if (!f.isMain) {
      subsByEntry.set(f.entryBlock.startInstruction.address, f);
    }
  }

  const out = new Set<number>();
  const seen = new Set<NWScriptFunction>();
  const stack = functions.filter(f => f.isMain);

  while (stack.length > 0) {
    const f = stack.pop()!;
    if (seen.has(f)) {
      continue;
    }
    seen.add(f);

    for (const block of f.bodyBlocks) {
      for (const instr of block.instructions) {
        if (instr.code === OP_JSR && instr.offset !== undefined) {
          const t = instr.address + instr.offset;
          out.add(t);
          const callee = subsByEntry.get(t);
          if (callee) {
            stack.push(callee);
          }
        }
      }
    }
  }

  return out;
}

/**
 * Blocks that jump to {@code target} (predecessors with a terminating jump/call to this block).
 * Same as {@link NWScriptBasicBlock.predecessors}; exposed for switch/loop heuristics (NCSDecomp "origins").
 */
export function jumpOriginBlocks(target: NWScriptBasicBlock): NWScriptBasicBlock[] {
  return Array.from(target.predecessors).sort((a, b) => a.id - b.id);
}
