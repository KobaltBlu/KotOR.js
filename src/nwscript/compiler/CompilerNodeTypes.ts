import type {
  SemanticProgramNode,
  SemanticFunctionNode,
  SemanticBlockNode,
  SemanticIfNode,
  SemanticElseIfNode,
  SemanticElseNode,
  SemanticWhileNode,
  SemanticDoWhileNode,
  SemanticForNode,
  SemanticSwitchNode,
  SemanticCaseNode,
  SemanticDefaultNode,
  SemanticReturnNode,
  SemanticBreakNode,
  SemanticContinueNode,
  SemanticStructNode,
  SemanticVariableNode,
  SemanticVariableListNode,
  SemanticVariableReferenceNode,
  SemanticArgumentNode,
  SemanticFunctionCallNode,
  SemanticPropertyNode,
  SemanticAssignNode,
  SemanticBinaryNode,
  SemanticCompareNode,
  SemanticUnaryNode,
  SemanticIncDecNode,
  SemanticLiteralNode,
  SemanticArrayLiteralNode,
  SemanticIndexNode,
  SemanticCallNode,
  SemanticExpressionNode,
  SemanticStatementNode,
} from "./ASTSemanticTypes";

type WithCompilerMeta<T> = T & { block_start?: number; block_end?: number };

export type CompilerProgramNode = SemanticProgramNode & {
  functions: CompilerFunctionNode[];
  structs: CompilerStructNode[];
  statements: CompilerStatementNode[];
};

export type CompilerFunctionNode = SemanticFunctionNode & {
  block_start?: number;
  block_end?: number;
  blockOffset?: number;
  blockSize?: number;
  block_start_jmp?: number;
  block_end_jmp?: number;
  preStatementsStackPointer?: number;
  postStatementsStackPointer?: number;
  returnStackPointer?: number;
  argumentsStackPointer?: number;
  retn_jmp?: number;
  block?: CompilerBlockNode;
  statements: CompilerStatementNode[];
  arguments: CompilerArgumentNode[];
};

export type CompilerStructNode = SemanticStructNode & { properties: CompilerStructPropertyNode[] };
export type CompilerStructPropertyNode = SemanticPropertyNode;
export type CompilerVariableNode = SemanticVariableNode;
export type CompilerVariableListNode = SemanticVariableListNode & { variables?: CompilerVariableNode[] };
export type CompilerVariableReferenceNode = SemanticVariableReferenceNode;
export type CompilerArgumentNode = SemanticArgumentNode;
export type CompilerFunctionCallNode = SemanticFunctionCallNode;
export type CompilerPropertyNode = SemanticPropertyNode;
export type CompilerAssignNode = SemanticAssignNode;
export type CompilerBinaryNode = SemanticBinaryNode;
export type CompilerCompareNode = SemanticCompareNode;
export type CompilerUnaryNode = SemanticUnaryNode;
export type CompilerIncDecNode = SemanticIncDecNode;
export type CompilerLiteralNode = SemanticLiteralNode;
export type CompilerArrayLiteralNode = SemanticArrayLiteralNode;
export type CompilerIndexNode = SemanticIndexNode;
export type CompilerCallNode = SemanticCallNode;

export type CompilerIfNode = WithCompilerMeta<SemanticIfNode> & {
  jz_start?: number;
  jz?: number;
  jmp_start?: number;
  jmp?: number;
  elseIfs: CompilerElseIfNode[];
  else: CompilerElseNode | null;
  statements: CompilerStatementNode[];
  condition: CompilerExpressionNode;
};

export type CompilerElseIfNode = WithCompilerMeta<SemanticElseIfNode> & {
  jz_start?: number;
  jz?: number;
  jmp_start?: number;
  jmp?: number;
  statements: CompilerStatementNode[];
  condition: CompilerExpressionNode;
};

export type CompilerElseNode = WithCompilerMeta<SemanticElseNode> & {
  statements: CompilerStatementNode[];
};

export type CompilerWhileNode = WithCompilerMeta<SemanticWhileNode> & {
  continue_start?: number;
  condition_start?: number;
  condition_end?: number;
  preStatementsSPCache?: number;
  statements: CompilerStatementNode[];
  condition: CompilerExpressionNode;
};

export type CompilerDoWhileNode = WithCompilerMeta<SemanticDoWhileNode> & {
  continue_start?: number;
  condition_start?: number;
  condition_end?: number;
  preStatementsSPCache?: number;
  statements_start?: number;
  statements_end?: number;
  statements: CompilerStatementNode[];
  condition: CompilerExpressionNode;
};

export type CompilerForNode = WithCompilerMeta<SemanticForNode> & {
  continue_start?: number;
  condition_start?: number;
  condition_end?: number;
  incrementor_start?: number;
  incrementor_end?: number;
  statements_start?: number;
  statements_end?: number;
  preStatementsSPCache?: number;
  initializer: CompilerVariableNode | CompilerVariableListNode | CompilerExpressionNode | null;
  condition: CompilerExpressionNode | null;
  incrementor: CompilerExpressionNode | null;
  statements: CompilerStatementNode[];
};

export type CompilerSwitchNode = WithCompilerMeta<SemanticSwitchNode> & {
  cases: CompilerCaseNode[];
  default: CompilerDefaultNode | null;
  condition: CompilerExpressionNode;
};

export type CompilerCaseNode = WithCompilerMeta<SemanticCaseNode> & {
  statements: CompilerStatementNode[];
  condition: CompilerExpressionNode;
  value: CompilerExpressionNode;
};

export type CompilerDefaultNode = WithCompilerMeta<SemanticDefaultNode> & {
  statements: CompilerStatementNode[];
};

export type CompilerReturnNode = SemanticReturnNode & {
  value: CompilerExpressionNode | null;
};

export type CompilerBlockNode = WithCompilerMeta<SemanticBlockNode> & {
  statements: CompilerStatementNode[];
};

export type CompilerContinueNode = WithCompilerMeta<SemanticContinueNode> & {
  block_start?: number;
  block_end?: number;
};
export type CompilerBreakNode = WithCompilerMeta<SemanticBreakNode> & {
  block_start?: number;
  block_end?: number;
};

export type CompilerExpressionNode =
  | CompilerLiteralNode
  | CompilerVariableReferenceNode
  | CompilerArrayLiteralNode
  | CompilerFunctionCallNode
  | CompilerCallNode
  | CompilerIndexNode
  | CompilerPropertyNode
  | CompilerAssignNode
  | CompilerIncDecNode
  | CompilerUnaryNode
  | CompilerCompareNode
  | CompilerBinaryNode;

export type CompilerStatementNode =
  | CompilerStructNode
  | CompilerVariableNode
  | CompilerVariableListNode
  | CompilerFunctionNode
  | CompilerIfNode
  | CompilerElseIfNode
  | CompilerElseNode
  | CompilerWhileNode
  | CompilerDoWhileNode
  | CompilerForNode
  | CompilerSwitchNode
  | CompilerCaseNode
  | CompilerDefaultNode
  | CompilerReturnNode
  | CompilerBreakNode
  | CompilerContinueNode
  | CompilerBlockNode
  | CompilerExpressionNode;