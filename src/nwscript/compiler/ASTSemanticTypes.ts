import { ArrayLiteralNode, CallNode, IndexNode, LiteralNode } from "./ASTTypes";
import type { Token } from "./NWScriptToken";

export type SourceInfo = Token["source"] | undefined;

export interface AnnotatedNode {
  type: string;
  source?: SourceInfo;
}

// Program-level
export interface SemanticProgramNode extends AnnotatedNode {
  type: "program";
  statements: SemanticStatementNode[];
  functions: SemanticFunctionNode[];
  structs: SemanticStructNode[];
  scope: SemanticScope;
  basePointer: number;
  stackPointer: number;
  main?: SemanticFunctionNode;
  startingConditional?: SemanticFunctionNode;
  parsed?: boolean;
}

// Scope metadata (not part of AST, but handy to type)
export interface SemanticScope {
  arguments: SemanticArgumentNode[];
  variables: SemanticVariableNode[];
  constants: SemanticVariableNode[];
  program: SemanticProgramNode;
  returntype?: SemanticDataType;
  is_global: boolean;
  is_anonymous: boolean;
}

// Data types
export interface SemanticDataType {
  type: "datatype";
  value: string;
  unary: number;
  engine_type?: boolean;
  struct?: string;
}

// Structs
export interface SemanticStructNode extends AnnotatedNode {
  type: "struct";
  name: string;
  properties: SemanticStructPropertyNode[];
  is_global: boolean;
  stackPointer?: number;
}

export interface SemanticStructPropertyNode extends AnnotatedNode {
  type: "property";
  name: string;
  datatype: SemanticDataType;
}

// Functions
export interface SemanticFunctionNode extends AnnotatedNode {
  type: "function";
  name: string;
  header_only: boolean;
  defined?: boolean;
  called?: boolean;
  callIndex?: number;
  returntype: SemanticDataType;
  arguments: SemanticArgumentNode[];
  statements: SemanticStatementNode[];
}

export interface SemanticArgumentNode extends AnnotatedNode {
  type: "argument";
  name: string;
  datatype: SemanticDataType;
  value?: SemanticExpressionNode; // default value
  stackPointer?: number;
}

// Variables
export interface SemanticVariableNode extends AnnotatedNode {
  type: "variable";
  name: string;
  declare: boolean;
  is_const: boolean;
  is_global: boolean;
  datatype: SemanticDataType;
  value: SemanticExpressionNode | null;
  variable_reference?: SemanticVariableNode | SemanticStructPropertyNode;
  struct?: string;
  struct_reference?: SemanticStructNode | SemanticVariableNode;
  stackPointer?: number;
}

export interface SemanticVariableListNode extends AnnotatedNode {
  type: "variableList";
  is_const: boolean;
  declare: boolean;
  datatype: SemanticDataType;
  names: Array<{ name: string; source?: SourceInfo }>;
  value: SemanticExpressionNode | null;
  variables?: SemanticVariableNode[]; // filled during post-pass
}

// Expressions / calls / props
export interface SemanticVariableReferenceNode extends AnnotatedNode {
  type: "variable_reference";
  name: string;
  datatype?: SemanticDataType;
  is_global?: boolean;
  variable_reference?: SemanticVariableNode | SemanticStructPropertyNode;
}

export interface SemanticFunctionCallNode extends AnnotatedNode {
  type: "function_call";
  name: string;
  arguments: SemanticExpressionNode[];
  function_reference?: SemanticFunctionNode | EngineActionRef;
  action_id?: number; // engine action index, -1 if script function
}

export interface EngineActionRef {
  index: number;
  name: string;
  returntype: SemanticDataType;
  arguments: SemanticArgumentNode[];
}

export interface SemanticPropertyNode extends AnnotatedNode {
  type: "property";
  left: SemanticExpressionNode;
  name: string;
  datatype?: SemanticDataType;
  is_global?: boolean;
  property_reference?: SemanticStructPropertyNode;
  right?: SemanticExpressionNode; // if assignment
}

// Control flow
export interface SemanticBlockNode extends AnnotatedNode {
  type: "block";
  statements: SemanticStatementNode[];
}

export interface SemanticIfNode extends AnnotatedNode {
  type: "if";
  condition: SemanticExpressionNode;
  statements: SemanticStatementNode[];
  elseIfs: SemanticElseIfNode[];
  else: SemanticElseNode | null;
}

export interface SemanticElseIfNode extends AnnotatedNode {
  type: "elseif";
  condition: SemanticExpressionNode;
  statements: SemanticStatementNode[];
}

export interface SemanticElseNode extends AnnotatedNode {
  type: "else";
  statements: SemanticStatementNode[];
}

export interface SemanticWhileNode extends AnnotatedNode {
  type: "while";
  condition: SemanticExpressionNode;
  statements: SemanticStatementNode[];
}

export interface SemanticDoWhileNode extends AnnotatedNode {
  type: "do";
  condition: SemanticExpressionNode;
  statements: SemanticStatementNode[];
}

export interface SemanticForNode extends AnnotatedNode {
  type: "for";
  initializer: SemanticVariableNode | SemanticVariableListNode | SemanticExpressionNode | null;
  condition: SemanticExpressionNode | null;
  incrementor: SemanticExpressionNode | null;
  statements: SemanticStatementNode[];
}

export interface SemanticSwitchNode extends AnnotatedNode {
  type: "switch";
  condition: SemanticExpressionNode;
  cases: SemanticCaseNode[];
  default: SemanticDefaultNode | null;
}

export interface SemanticCaseNode extends AnnotatedNode {
  type: "case";
  condition: SemanticExpressionNode;
  value: SemanticExpressionNode;
  statements: SemanticStatementNode[];
  fallthrough?: boolean;
}

export interface SemanticDefaultNode extends AnnotatedNode {
  type: "default";
  statements: SemanticStatementNode[];
}

// Returns / break / continue
export interface SemanticReturnNode extends AnnotatedNode {
  type: "return";
  value: SemanticExpressionNode | null;
}

export interface SemanticBreakNode extends AnnotatedNode { type: "break"; }
export interface SemanticContinueNode extends AnnotatedNode { type: "continue"; }

// Arithmetic / logical / unary / inc/dec
export interface SemanticCompareNode extends AnnotatedNode {
  type: "compare";
  left: SemanticExpressionNode;
  right: SemanticExpressionNode;
  operator: { type: "operator"; value: string };
  datatype: SemanticDataType;
}

export interface SemanticBinaryNode extends AnnotatedNode {
  type: "add" | "sub" | "mul" | "div" | "mod" | "incor" | "xor" | "booland" | "assign" | "compare";
  left: SemanticExpressionNode;
  right: SemanticExpressionNode;
  operator?: { type: "operator"; value: string };
  datatype?: SemanticDataType;
}

export interface SemanticUnaryNode extends AnnotatedNode {
  type: "not" | "neg" | "comp";
  value: SemanticExpressionNode;
  datatype?: SemanticDataType;
}

export interface SemanticIncDecNode extends AnnotatedNode {
  type: "inc" | "dec";
  value: SemanticExpressionNode;
  postFix?: boolean;
  datatype?: SemanticDataType;
  is_global?: boolean;
  variable_reference?: SemanticVariableNode | SemanticStructPropertyNode | SemanticStructNode | SemanticArgumentNode | undefined;
}

// Literals / arrays / index / call / property reuse existing shapes but typed as SemanticExpressionNode
export type SemanticLiteralNode = LiteralNode & { datatype: SemanticDataType };
export type SemanticArrayLiteralNode = ArrayLiteralNode & { datatype: SemanticDataType; elements: SemanticExpressionNode[] };
export type SemanticIndexNode = IndexNode & { left: SemanticExpressionNode; index: SemanticExpressionNode };
export type SemanticCallNode = CallNode & { callee: SemanticExpressionNode; arguments: SemanticExpressionNode[] };

// Unions
export type SemanticExpressionNode =
  | SemanticLiteralNode
  | SemanticVariableReferenceNode
  | SemanticArrayLiteralNode
  | SemanticFunctionCallNode
  | SemanticCallNode
  | SemanticIndexNode
  | SemanticPropertyNode
  | SemanticAssignNode
  | SemanticIncDecNode
  | SemanticUnaryNode
  | SemanticCompareNode
  | SemanticBinaryNode;

export interface SemanticAssignNode extends AnnotatedNode {
  type: "assign";
  left: SemanticExpressionNode;
  right: SemanticExpressionNode;
  operator: { type: "operator"; value: string };
  datatype?: SemanticDataType;
}

export type SemanticStatementNode =
  | SemanticStructNode
  | SemanticVariableNode
  | SemanticVariableListNode
  | SemanticFunctionNode
  | SemanticIfNode
  | SemanticElseIfNode
  | SemanticElseNode
  | SemanticWhileNode
  | SemanticDoWhileNode
  | SemanticForNode
  | SemanticSwitchNode
  | SemanticCaseNode
  | SemanticDefaultNode
  | SemanticReturnNode
  | SemanticBreakNode
  | SemanticContinueNode
  | SemanticBlockNode
  | SemanticExpressionNode;