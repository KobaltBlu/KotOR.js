import type { Token } from "./NWScriptToken";

export type SourceInfo = Token["source"] | undefined;
export type DataTypeNode = { type: "datatype"; unary: number; value: string; engine_type?: boolean; struct?: string };
export type NameNode = { type: "name"; value: string; source?: SourceInfo };

export type OperatorNode = { type: "operator"; value: string };

// Expression nodes produced by the hand parser
export interface LiteralNode { type: "literal"; datatype: DataTypeNode; value: number | string; source: SourceInfo; }
export interface VariableReferenceNode { type: "variable_reference"; name: string; source: SourceInfo; terminated?: boolean; }
export interface ArrayLiteralNode { type: "array_literal"; elements: ExpressionNode[]; source: SourceInfo; }
export interface FunctionCallNode { type: "function_call"; name: string; arguments: ExpressionNode[]; source: SourceInfo; }
export interface CallNode { type: "call"; callee: ExpressionNode; arguments: ExpressionNode[]; source: SourceInfo; }
export interface IndexNode { type: "index"; left: ExpressionNode; index: ExpressionNode; source: SourceInfo; }
export interface AssignNode { type: "assign"; left: ExpressionNode; right: ExpressionNode; operator: OperatorNode; source: SourceInfo; }
export interface IncDecNode { type: "inc" | "dec"; value: ExpressionNode; postfix?: boolean; source: SourceInfo; }
export interface UnaryNode { type: "not" | "comp" | "neg"; value: ExpressionNode; source: SourceInfo; }
export interface CompareNode {
  type: "compare";
  datatype: DataTypeNode;
  left: ExpressionNode;
  right: ExpressionNode;
  operator: OperatorNode;
  source: SourceInfo;
}
export interface BinaryOpNode {
  type: "add" | "sub" | "mul" | "div" | "mod" | "incor" | "xor" | "booland" | "shift" | "binary";
  left: ExpressionNode;
  right: ExpressionNode;
  operator: OperatorNode;
  source: SourceInfo;
}

export type ExpressionNode =
  | LiteralNode
  | VariableReferenceNode
  | ArrayLiteralNode
  | FunctionCallNode
  | CallNode
  | IndexNode
  | StructPropertyNode
  | AssignNode
  | IncDecNode
  | UnaryNode
  | CompareNode
  | BinaryOpNode;

// Statement / program nodes
export interface DefineNode { type: "define"; name: NameNode; value: DataTypeNode | NameNode | LiteralNode; }
export interface IncludeNode { type: "include"; value: LiteralNode | NameNode; }

// Used both for struct field declarations (datatype known) and member access (datatype resolved later)
export interface StructPropertyNode { type: "property"; datatype?: DataTypeNode; name: string; left: ExpressionNode; source: SourceInfo; }
export interface StructNode { type: "struct"; datatype?: DataTypeNode; name: string; properties: StructPropertyNode[]; source: SourceInfo; }

export interface VariableNode {
  type: "variable";
  is_const: boolean;
  declare: true;
  datatype: DataTypeNode;
  name: string;
  value: ExpressionNode | null;
  source: SourceInfo;
}

export interface VariableListNode {
  type: "variableList";
  is_const: boolean;
  declare: true;
  datatype: DataTypeNode;
  names: Array<{ name: string; source: SourceInfo }>;
  value: ExpressionNode | null;
}

export interface ArgumentNode {
  type: "argument";
  datatype: DataTypeNode;
  name: string;
  value?: ExpressionNode;
  source: SourceInfo;
}

export interface FunctionNode {
  type: "function";
  header_only: boolean;
  name: string;
  returntype: DataTypeNode;
  arguments: ArgumentNode[];
  statements: StatementNode[];
  source: SourceInfo;
}

export interface ElseIfNode {
  type: "elseif";
  condition: ExpressionNode;
  statements: StatementNode[];
  source: SourceInfo;
}

export interface ElseNode {
  type: "else";
  statements: StatementNode[];
}

export interface IfNode {
  type: "if";
  condition: ExpressionNode;
  statements: StatementNode[];
  elseIfs: ElseIfNode[];
  else: ElseNode | null;
  source: SourceInfo;
}

export interface WhileNode { type: "while"; condition: ExpressionNode; statements: StatementNode[]; source: SourceInfo; }
export interface DoWhileNode { type: "do"; condition: ExpressionNode; statements: StatementNode[]; source: SourceInfo; }

export interface ForNode {
  type: "for";
  initializer: VariableNode | VariableListNode | ExpressionNode | null;
  condition: ExpressionNode | null;
  incrementor: ExpressionNode | null;
  statements: StatementNode[];
  source: SourceInfo;
}

export interface CaseNode { type: "case"; value: ExpressionNode; statements: StatementNode[]; source: SourceInfo; }
export interface DefaultNode { type: "default"; statements: StatementNode[]; source: SourceInfo; }

export interface SwitchNode {
  type: "switch";
  condition: ExpressionNode;
  cases: CaseNode[];
  default: DefaultNode | null;
  source: SourceInfo;
}

export interface ReturnNode { type: "return"; value: ExpressionNode | null; source: SourceInfo; }
export interface BreakNode { type: "break"; source: SourceInfo; }
export interface ContinueNode { type: "continue"; source: SourceInfo; }
export interface BlockNode { type: "block"; statements: StatementNode[]; }
export interface CommentNode { type: "comment"; value: string; source: SourceInfo; }

export type StatementNode =
  | DefineNode
  | IncludeNode
  | StructNode
  | VariableNode
  | VariableListNode
  | FunctionNode
  | IfNode
  | WhileNode
  | DoWhileNode
  | ForNode
  | SwitchNode
  | ReturnNode
  | BreakNode
  | ContinueNode
  | BlockNode
  | CommentNode
  | ExpressionNode;

export interface ProgramNode {
  type: "program";
  statements: StatementNode[];
  parsed?: boolean;
}