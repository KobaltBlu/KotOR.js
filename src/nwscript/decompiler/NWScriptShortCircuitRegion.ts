import type { NWScriptBasicBlock } from "@/nwscript/decompiler/NWScriptBasicBlock";
import type { NWScriptControlFlowGraph } from "@/nwscript/decompiler/NWScriptControlFlowGraph";
import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import {
  OP_CPTOPBP,
  OP_CPTOPSP,
  OP_JMP,
  OP_JNZ,
  OP_JZ,
  OP_LOGANDII,
  OP_LOGORII,
  OP_NOP,
} from "@/nwscript/NWScriptOPCodes";
import { toSignedInt32 } from "@/nwscript/decompiler/NWScriptOpcodeSemantics";

/** Compiler `&&` / `||` diamonds join within this many intra-procedural hops. */
export const LOGICAL_JOIN_MAX_DISTANCE = 48;

export type NWScriptShortCircuitOperator = "and" | "or";

/**
 * Compiler-neutral logical-region variants:
 * - `and_jz`: `lhs; CPTOP; JZ join; rhs; LOGANDII`
 * - `or_retail_double_jz`: BioWare dummy `CPTOP; JZ join` on the true arm
 * - `or_jmp_bypass`: OpenKnights / official `CPTOP; JMP join`
 * - `or_jnz_direct`: optimized `CPTOP; JNZ join` with no dummy arm
 */
export type NWScriptShortCircuitVariant =
  | "and_jz"
  | "or_retail_double_jz"
  | "or_jmp_bypass"
  | "or_jnz_direct";

export interface NWScriptShortCircuitRegion {
  operator: NWScriptShortCircuitOperator;
  variant: NWScriptShortCircuitVariant;
  header: NWScriptBasicBlock;
  join: NWScriptBasicBlock;
  evaluateBlocks: NWScriptBasicBlock[];
  bypassBlocks: NWScriptBasicBlock[];
  coveredBlocks: Set<NWScriptBasicBlock>;
}

function isCopyOpcode(code: number): boolean {
  return code === OP_CPTOPSP || code === OP_CPTOPBP;
}

function precedingNonNop(
  block: NWScriptBasicBlock,
  instruction: NWScriptInstruction
): NWScriptInstruction | undefined {
  const index = block.instructions.indexOf(instruction);
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidate = block.instructions[cursor];
    if (candidate.code !== OP_NOP) {
      return candidate;
    }
  }
  return undefined;
}

function firstSubstantiveOpcode(block: NWScriptBasicBlock): number | undefined {
  return block.instructions.find(instruction => instruction.code !== OP_NOP)?.code;
}

function conditionalJumpTarget(
  cfg: NWScriptControlFlowGraph,
  condition: NWScriptInstruction
): NWScriptBasicBlock | undefined {
  if (condition.offset === undefined) {
    return undefined;
  }
  return cfg.getBlockForAddress(condition.address + toSignedInt32(condition.offset)) ?? undefined;
}

function intraSuccessors(
  cfg: NWScriptControlFlowGraph,
  block: NWScriptBasicBlock
): NWScriptBasicBlock[] {
  return cfg.getIntraProceduralSuccessors(block, false)
    .filter(successor => !cfg.isBackEdge(block, successor));
}

function collectForwardRegion(
  cfg: NWScriptControlFlowGraph,
  starts: NWScriptBasicBlock[],
  join: NWScriptBasicBlock,
  excluded: Set<NWScriptBasicBlock>
): Set<NWScriptBasicBlock> {
  const joinAddress = join.startInstruction.address;
  const region = new Set<NWScriptBasicBlock>();
  const queue = [...starts];
  while (queue.length > 0) {
    const block = queue.shift()!;
    if (block === join || excluded.has(block) || region.has(block)) {
      continue;
    }
    if (block.startInstruction.address >= joinAddress) {
      continue;
    }
    region.add(block);
    for (const successor of intraSuccessors(cfg, block)) {
      if (
        successor !== join &&
        !excluded.has(successor) &&
        !region.has(successor) &&
        successor.startInstruction.address < joinAddress
      ) {
        queue.push(successor);
      }
    }
  }
  return region;
}

function distancesFrom(
  cfg: NWScriptControlFlowGraph,
  start: NWScriptBasicBlock,
  maxDistance = LOGICAL_JOIN_MAX_DISTANCE
): Map<NWScriptBasicBlock, number> {
  const distances = new Map<NWScriptBasicBlock, number>([[start, 0]]);
  const queue = [start];
  while (queue.length > 0) {
    const block = queue.shift()!;
    if (block.isExit || block.exitType === "return") {
      continue;
    }
    const distance = distances.get(block)!;
    if (distance >= maxDistance) {
      continue;
    }
    for (const successor of intraSuccessors(cfg, block)) {
      if (distances.has(successor)) {
        continue;
      }
      distances.set(successor, distance + 1);
      queue.push(successor);
    }
  }
  return distances;
}

function findLogicalJoin(
  cfg: NWScriptControlFlowGraph,
  left: NWScriptBasicBlock,
  right: NWScriptBasicBlock,
  logicalOpcode: number
): NWScriptBasicBlock | undefined {
  const fromLeft = distancesFrom(cfg, left);
  const fromRight = distancesFrom(cfg, right);
  return Array.from(fromLeft.keys())
    .filter(block => fromRight.has(block) && firstSubstantiveOpcode(block) === logicalOpcode)
    .sort((leftBlock, rightBlock) =>
      (fromLeft.get(leftBlock)! + fromRight.get(leftBlock)!) -
      (fromLeft.get(rightBlock)! + fromRight.get(rightBlock)!)
    )[0];
}

function findBypassArm(
  cfg: NWScriptControlFlowGraph,
  start: NWScriptBasicBlock,
  join: NWScriptBasicBlock
): { blocks: Set<NWScriptBasicBlock>; variant: "or_retail_double_jz" | "or_jmp_bypass" } | undefined {
  const blocks = new Set<NWScriptBasicBlock>();
  let block: NWScriptBasicBlock | undefined = start;
  let sawCopy = false;
  let dummyJoinBranch = false;
  let sawJoinJump = false;

  while (block && block !== join) {
    if (blocks.has(block)) {
      return undefined;
    }
    blocks.add(block);

    const condition = block.conditionInstruction;
    const taken = condition ? conditionalJumpTarget(cfg, condition) : undefined;
    const isDummyJoinBranch =
      condition != null &&
      (condition.code === OP_JZ || condition.code === OP_JNZ) &&
      taken === join;

    for (const instruction of block.instructions) {
      if (instruction.code === OP_NOP) {
        continue;
      }
      if (instruction.code === OP_JMP) {
        const target = instruction.offset === undefined
          ? undefined
          : cfg.getBlockForAddress(instruction.address + toSignedInt32(instruction.offset));
        if (target === join) {
          sawJoinJump = true;
        }
        continue;
      }
      if (isDummyJoinBranch && instruction === condition) {
        dummyJoinBranch = true;
        continue;
      }
      if (!isCopyOpcode(instruction.code)) {
        return undefined;
      }
      sawCopy = true;
    }

    const successors = intraSuccessors(cfg, block);
    if (isDummyJoinBranch) {
      return sawCopy
        ? { blocks, variant: "or_retail_double_jz" }
        : undefined;
    }
    if (sawJoinJump && successors.every(successor => successor === join || blocks.has(successor))) {
      return sawCopy
        ? { blocks, variant: "or_jmp_bypass" }
        : undefined;
    }
    if (condition || successors.length !== 1) {
      return undefined;
    }
    block = successors[0];
  }

  return block === join && sawCopy
    ? { blocks, variant: "or_jmp_bypass" }
    : undefined;
}

function regionResult(
  operator: NWScriptShortCircuitOperator,
  variant: NWScriptShortCircuitVariant,
  header: NWScriptBasicBlock,
  join: NWScriptBasicBlock,
  evaluate: Set<NWScriptBasicBlock>,
  bypass: Set<NWScriptBasicBlock>
): NWScriptShortCircuitRegion {
  const covered = new Set<NWScriptBasicBlock>([...evaluate, ...bypass]);
  covered.add(header);
  covered.delete(join);
  return {
    operator,
    variant,
    header,
    join,
    evaluateBlocks: Array.from(evaluate)
      .filter(block => block !== join)
      .sort((left, right) => left.startInstruction.address - right.startInstruction.address),
    bypassBlocks: Array.from(bypass).sort((left, right) =>
      left.startInstruction.address - right.startInstruction.address
    ),
    coveredBlocks: covered,
  };
}

/**
 * Classify a compiler-generated `&&` / `||` value region. Returns undefined for source-level
 * `if`/`while` headers. The logical join is excluded so a later structured condition can
 * consume `LOGANDII` / `LOGORII`.
 */
export function classifyShortCircuitRegion(
  cfg: NWScriptControlFlowGraph,
  header: NWScriptBasicBlock
): NWScriptShortCircuitRegion | undefined {
  const condition = header.conditionInstruction;
  if (!condition || (condition.code !== OP_JZ && condition.code !== OP_JNZ)) {
    return undefined;
  }
  const duplicate = precedingNonNop(header, condition);
  if (!duplicate || !isCopyOpcode(duplicate.code)) {
    return undefined;
  }

  const successors = intraSuccessors(cfg, header);
  if (successors.length !== 2) {
    return undefined;
  }

  const taken = conditionalJumpTarget(cfg, condition);
  const fallthrough = successors.find(successor => successor !== taken);
  if (!taken || !fallthrough) {
    return undefined;
  }

  if (condition.code === OP_JNZ && firstSubstantiveOpcode(taken) === OP_LOGORII) {
    const evaluate = collectForwardRegion(cfg, [header, fallthrough], taken, new Set());
    evaluate.add(header);
    if (evaluate.size === 0) {
      return undefined;
    }
    return regionResult("or", "or_jnz_direct", header, taken, evaluate, new Set());
  }

  if (condition.code === OP_JZ && successors.includes(taken)) {
    const evaluate = collectForwardRegion(cfg, [fallthrough], taken, new Set());
    const combines = Array.from(evaluate).some(block =>
      block.instructions.some(instruction => instruction.code === OP_LOGANDII) &&
      intraSuccessors(cfg, block).includes(taken)
    );
    if (combines) {
      evaluate.add(header);
      return regionResult("and", "and_jz", header, taken, evaluate, new Set());
    }
  }

  const join = findLogicalJoin(cfg, successors[0], successors[1], OP_LOGORII);
  if (!join) {
    return undefined;
  }
  const bypass =
    findBypassArm(cfg, successors[0], join) ??
    findBypassArm(cfg, successors[1], join);
  if (!bypass) {
    return undefined;
  }

  const evaluate = collectForwardRegion(cfg, successors, join, bypass.blocks);
  evaluate.add(header);
  return regionResult("or", bypass.variant, header, join, evaluate, bypass.blocks);
}

/**
 * Index every logical value region in a CFG so structure recovery can treat dummy
 * bypass blocks as scaffolding instead of source-level `if`s.
 */
export function indexShortCircuitRegions(
  cfg: NWScriptControlFlowGraph
): {
  byHeader: Map<NWScriptBasicBlock, NWScriptShortCircuitRegion>;
  covering: Map<NWScriptBasicBlock, NWScriptShortCircuitRegion>;
} {
  const byHeader = new Map<NWScriptBasicBlock, NWScriptShortCircuitRegion>();
  const covering = new Map<NWScriptBasicBlock, NWScriptShortCircuitRegion>();
  for (const block of cfg.blocks.values()) {
    const region = classifyShortCircuitRegion(cfg, block);
    if (!region) {
      continue;
    }
    byHeader.set(block, region);
    for (const covered of region.coveredBlocks) {
      if (!covering.has(covered) || covering.get(covered)!.header === covered) {
        covering.set(covered, region);
      }
    }
  }
  return { byHeader, covering };
}
