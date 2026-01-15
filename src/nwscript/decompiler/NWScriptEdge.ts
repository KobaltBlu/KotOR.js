import type { NWScriptBasicBlock } from "./NWScriptBasicBlock";

/**
 * Represents an edge type in the control flow graph
 */
export enum EdgeType {
  FALLTHROUGH = 'fallthrough',
  JUMP = 'jump',
  TRUE_BRANCH = 'true_branch',
  FALSE_BRANCH = 'false_branch',
  CALL = 'call',
  RETURN = 'return',
  BACK_EDGE = 'back_edge',
  FORWARD_EDGE = 'forward_edge',
  CROSS_EDGE = 'cross_edge'
}

/**
 * Represents an edge in the control flow graph with metadata
 */
export class NWScriptEdge {
  /**
   * Source block
   */
  from: NWScriptBasicBlock;

  /**
   * Target block
   */
  to: NWScriptBasicBlock;

  /**
   * Type of edge
   */
  type: EdgeType;

  /**
   * Whether this is a back edge (target dominates source)
   */
  isBackEdge: boolean = false;

  /**
   * Whether this is a critical edge (from has multiple successors, to has multiple predecessors)
   */
  isCritical: boolean = false;

  /**
   * Condition for conditional branches (true/false)
   */
  condition?: boolean;

  /**
   * Weight/cost of this edge (for path analysis)
   */
  weight: number = 1.0;

  /**
   * Condition expression (for complex conditions)
   */
  conditionExpression?: any; // NWScriptExpression - using any to avoid circular dependency

  constructor(from: NWScriptBasicBlock, to: NWScriptBasicBlock, type: EdgeType, weight: number = 1.0) {
    this.from = from;
    this.to = to;
    this.type = type;
    this.weight = weight;
  }

  /**
   * Check if this edge connects the given blocks
   */
  connects(from: NWScriptBasicBlock, to: NWScriptBasicBlock): boolean {
    return this.from === from && this.to === to;
  }

  /**
   * Get string representation
   */
  toString(): string {
    return `${this.from.id} -> ${this.to.id} [${this.type}]`;
  }
}

