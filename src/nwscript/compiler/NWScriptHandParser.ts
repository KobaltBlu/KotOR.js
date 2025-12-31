import { NWScriptLexer } from "./NWScriptLexer";
import type { Token } from "./NWScriptToken";

const NWEngineTypeUnaryTypeOffset = 0x10;
const NWCompileDataTypes: Record<string, number> = {
  void: 0x00,
  int: 0x03,
  float: 0x04,
  string: 0x05,
  object: 0x06,
  struct: 0x12,
  vector: 0x0A, // you use 'V' elsewhere; parser just needs unary to exist
  action: 0x0E,
};

type SourceInfo = Token["source"] | undefined;
type DataTypeNode = { type: "datatype"; unary: number; value: string; engine_type?: boolean; struct?: string };
type NameNode = { type: "name"; value: string; source?: SourceInfo };

type OperatorNode = { type: "operator"; value: string };

// Expression nodes produced by the hand parser
export interface LiteralNode { type: "literal"; datatype: DataTypeNode; value: number | string; source: SourceInfo; }
export interface VariableReferenceNode { type: "variable_reference"; name: string; source: SourceInfo; }
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
export interface StructNode { type: "struct"; name: string; properties: StructPropertyNode[]; source: SourceInfo; }

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
  | ExpressionNode;

export interface ProgramNode {
  type: "program";
  statements: StatementNode[];
  parsed?: boolean;
}

function dt(value: string, unary: number, engine_type = false): DataTypeNode {
  return { type: "datatype", value, unary, engine_type: engine_type || undefined };
}

export interface HandParserOptions {
  engineTypes?: Array<{ name: string; unary: number }>;
}

export class NWScriptHandParser {
  private lex: NWScriptLexer;
  private tok: Token;

  private engineTypesByLower = new Map<string, number>();

  constructor(source: string, opts?: HandParserOptions) {
    this.lex = new NWScriptLexer(source);
    this.tok = this.lex.next();

    for (const t of opts?.engineTypes ?? []) {
      this.engineTypesByLower.set(t.name.toLowerCase(), t.unary);
    }
  }

  private next(): void {
    this.tok = this.lex.next();
  }

  private is(type: Token["type"], value?: string): boolean {
    if (this.tok.type !== type) return false;
    if (value !== undefined) return this.tok.value === value;
    return true;
  }

  private expect(type: Token["type"], value?: string): Token {
    if (!this.is(type, value)) {
      const got = `${this.tok.type}:${this.tok.value}`;
      const want = `${type}${value ? ":" + value : ""}`;
      throw new Error(`Parse error: expected ${want}, got ${got} @ ${this.tok.source.first_line}:${this.tok.source.first_column}`);
    }
    const t = this.tok;
    this.next();
    return t;
  }

  /**
   * Accepts either a normal name token or a keyword token as an identifier.
   * Some legacy/decompiled scripts use keywords (e.g., TRUE) as identifiers in defines or vars.
   */
  private expectNameToken(): Token {
    if (this.tok.type === "name" || this.tok.type === "keyword") {
      const t = this.tok;
      this.next();
      return t;
    }
    const got = `${this.tok.type}:${this.tok.value}`;
    throw new Error(`Parse error: expected name, got ${got} @ ${this.tok.source.first_line}:${this.tok.source.first_column}`);
  }

  parseProgram(): ProgramNode {
    const statements: StatementNode[] = [];
    while (!this.is("eof")) {
      const st = this.parseTopLevelStatement();
      if (st) statements.push(st);
    }
    return { type: "program", statements };
  }

  private parseTopLevelStatement(): StatementNode | null {
    // allow stray semicolons
    if (this.is("punct", ";")) {
      this.next();
      return null;
    }

    if (this.is("keyword", "DEFINE")) return this.parseDefine();
    if (this.is("keyword", "INCLUDE")) return this.parseInclude();
    if (this.is("keyword", "STRUCT")) return this.parseStructDeclOrVar();
    return this.parseDeclOrStatement();
  }

  private parseDeclOrStatement(): StatementNode {
    // const? datatype name ...
    // or control-flow statements
    if (this.is("keyword", "IF")) return this.parseIf();
    if (this.is("keyword", "SWITCH")) return this.parseSwitch();
    if (this.is("keyword", "WHILE")) return this.parseWhile();
    if (this.is("keyword", "DO")) return this.parseDoWhile();
    if (this.is("keyword", "FOR")) return this.parseFor();
    if (this.is("keyword", "RETURN")) return this.parseReturn();
    if (this.is("keyword", "BREAK")) return this.parseBreak();
    if (this.is("keyword", "CONTINUE")) return this.parseContinue();
    if (this.is("punct", "{")) return this.parseBlock();

    // attempt declaration: [const] datatype name ...
    const save = this.tok;

    const isConst = this.is("keyword", "CONST");
    if (isConst) this.next();

    const dataType = this.tryParseDataType();
    if (dataType) {
      // must be function or variable
      const nameTok = this.expectNameToken();
      const name = nameTok.value;

      // function?
      if (this.is("punct", "(")) {
        return this.finishFunctionDecl(isConst, dataType, name, nameTok);
      }

      // variable list
      return this.finishVariableDecl(isConst, dataType, name, nameTok);
    }

    // not a decl: reset not possible (we didn’t consume unless const/dataType matched)
    // expression statement: likely function call
    if (save !== this.tok) {
      // shouldn’t happen, but guard
    }

    const expr = this.parseExpression(0);
    this.expect("punct", ";");
    return expr;
  }

  private parseDefine(): DefineNode {
    this.expect("keyword", "DEFINE");
    const nameTok = this.expectNameToken();
    // value can be integer, name, datatype in your old grammar
    let value: DefineNode["value"];

    if (this.is("int")) {
      const t = this.expect("int");
      value = { type: "literal", datatype: dt("int", NWCompileDataTypes.int), value: parseInt(t.value, 10), source: t.source };
    } else if (this.is("keyword")) {
      // datatype define
      const d = this.tryParseDataType();
      if (!d) throw new Error("Invalid #define datatype");
      value = d;
    } else {
      const t = this.expect("name");
      value = { type: "name", value: t.value, source: t.source };
    }

    return { type: "define", name: { type: "name", value: nameTok.value, source: nameTok.source }, value };
  }

  private parseInclude(): IncludeNode {
    this.expect("keyword", "INCLUDE");
    // next token is typically a string, but some scripts use NAME; accept both
    let target: IncludeNode["value"];
    if (this.is("string")) {
      const t = this.expect("string");
      target = { type: "literal", datatype: dt("string", NWCompileDataTypes.string), value: t.value, source: t.source };
    } else {
      const t = this.expect("name");
      target = { type: "name", value: t.value, source: t.source };
    }
    return { type: "include", value: target };
  }

  private parseStructDeclOrVar(): StructNode | VariableNode | VariableListNode {
    const kw = this.expect("keyword", "STRUCT");
    const nameTok = this.expect("name");

    // Struct definition
    if (this.is("punct", "{")) {
      this.next(); // consume '{'

      const properties: any[] = [];
      while (!this.is("punct", "}")) {
        // datatype name ;
        const propType = this.mustParseDataType();
        const propNameTok = this.expectNameToken();
        this.expect("punct", ";");
        properties.push({
          type: "property",
          datatype: propType,
          name: propNameTok.value,
          source: propNameTok.source,
        });
      }
      this.expect("punct", "}");
      // optional ;
      if (this.is("punct", ";")) this.next();

      return {
        type: "struct",
        name: nameTok.value,
        properties,
        source: kw.source,
      };
    }

    // Struct-typed variable declaration: struct Name var1, var2;
    const structDatatype: DataTypeNode = {
      type: "datatype",
      value: nameTok.value,
      unary: NWCompileDataTypes.struct,
      struct: nameTok.value,
    };
    const firstVarName = this.expectNameToken();
    return this.finishVariableDecl(false, structDatatype, firstVarName.value, firstVarName);
  }

  private finishFunctionDecl(isConst: boolean, returntype: DataTypeNode, name: string, nameTok: Token): FunctionNode {
    // NOTE: NWScript doesn’t have const functions; keep flag ignored
    this.expect("punct", "(");

    const args: ArgumentNode[] = [];
    if (!this.is("punct", ")")) {
      while (true) {
        const argType = this.mustParseDataType();

        const argNameTok = this.expect("name");
        let defaultValue: any = undefined;

        if (this.is("op", "=")) {
          this.next();
          defaultValue = this.parseExpression(0);
        }

        args.push({
          type: "argument",
          datatype: argType,
          name: argNameTok.value,
          value: defaultValue,
          source: argNameTok.source,
        });

        if (this.is("punct", ",")) {
          this.next();
          continue;
        }
        break;
      }
    }

    this.expect("punct", ")");

    // header only?
    if (this.is("punct", ";")) {
      this.next();
      return {
        type: "function",
        header_only: true,
        name,
        returntype,
        arguments: args,
        statements: [],
        source: nameTok.source,
      };
    }

    const block = this.parseBlock();
    return {
      type: "function",
      header_only: false,
      name,
      returntype,
      arguments: args,
      statements: block.statements,
      source: nameTok.source,
    };
  }

  private finishVariableDecl(isConst: boolean, datatype: DataTypeNode, firstName: string, firstNameTok: Token): VariableNode | VariableListNode {
    // parse: name (, name)* (= expr)? ;
    const names: VariableListNode["names"] = [{ name: firstName, source: firstNameTok.source }];

    while (this.is("punct", ",")) {
      this.next();
      const n = this.expect("name");
      names.push({ name: n.value, source: n.source });
    }

    let value: ExpressionNode | null = null;
    if (this.is("op", "=")) {
      this.next();
      value = this.parseExpression(0);
    }

    this.expect("punct", ";");

    if (names.length === 1) {
      return {
        type: "variable",
        is_const: isConst,
        declare: true,
        datatype,
        name: names[0].name,
        value: value ?? null,
        source: names[0].source,
      };
    }

    return {
      type: "variableList",
      is_const: isConst,
      declare: true,
      datatype,
      names,
      value: value ?? null,
    };
  }

  private parseBlock(): BlockNode {
    this.expect("punct", "{");
    const statements: StatementNode[] = [];
    while (!this.is("punct", "}")) {
      const st = this.parseDeclOrStatement();
      if (st) statements.push(st);
    }
    this.expect("punct", "}");
    return { type: "block", statements };
  }

  private parseIf(): IfNode {
    const kw = this.expect("keyword", "IF");
    this.expect("punct", "(");
    const condition = this.parseExpression(0);
    this.expect("punct", ")");

    const thenBlock = this.is("punct", "{")
      ? this.parseBlock()
      : { type: "block", statements: [this.parseDeclOrStatement()].filter(Boolean) as StatementNode[] };

    const elseIfs: ElseIfNode[] = [];
    while (this.is("keyword", "ELSEIF")) {
      const e = this.expect("keyword", "ELSEIF");
      this.expect("punct", "(");
      const c = this.parseExpression(0);
      this.expect("punct", ")");

      const b = this.is("punct", "{")
        ? this.parseBlock()
        : { type: "block", statements: [this.parseDeclOrStatement()].filter(Boolean) as StatementNode[] };
      elseIfs.push({ type: "elseif", condition: c, statements: b.statements, source: e.source });
    }

    let elseBlock: ElseNode | null = null;
    if (this.is("keyword", "ELSE")) {
      this.next();
      const b = this.is("punct", "{")
        ? this.parseBlock()
        : { type: "block", statements: [this.parseDeclOrStatement()].filter(Boolean) as StatementNode[] };
      elseBlock = { type: "else", statements: b.statements };
    }

    return {
      type: "if",
      condition,
      statements: thenBlock.statements,
      elseIfs,
      else: elseBlock,
      source: kw.source,
    };
  }

  private parseWhile(): WhileNode {
    const kw = this.expect("keyword", "WHILE");
    this.expect("punct", "(");
    const condition = this.parseExpression(0);
    this.expect("punct", ")");
    const body = this.is("punct", "{")
      ? this.parseBlock()
      : { type: "block", statements: [this.parseDeclOrStatement()].filter(Boolean) as StatementNode[] };
    return { type: "while", condition, statements: body.statements, source: kw.source };
  }

  private parseDoWhile(): DoWhileNode {
    const kw = this.expect("keyword", "DO");
    const body = this.is("punct", "{")
      ? this.parseBlock()
      : { type: "block", statements: [this.parseDeclOrStatement()].filter(Boolean) as StatementNode[] };
    this.expect("keyword", "WHILE");
    this.expect("punct", "(");
    const condition = this.parseExpression(0);
    this.expect("punct", ")");
    this.expect("punct", ";");
    return { type: "do", condition, statements: body.statements, source: kw.source };
  }

  private parseFor(): ForNode {
    const kw = this.expect("keyword", "FOR");
    this.expect("punct", "(");

    // initializer can be decl or expression or empty
    let initializer: ForNode["initializer"] = null;
    if (!this.is("punct", ";")) {
      // try decl form
      const isConst = this.is("keyword", "CONST");
      if (isConst) this.next();
      const dtype = this.tryParseDataType();
      if (dtype) {
        const nameTok = this.expect("name");
        initializer = this.finishVariableDecl(isConst, dtype, nameTok.value, nameTok);
      } else {
        initializer = this.parseExpression(0);
        this.expect("punct", ";");
      }
    } else {
      this.expect("punct", ";");
    }

    // condition
    let condition: ForNode["condition"] = null;
    if (!this.is("punct", ";")) condition = this.parseExpression(0);
    this.expect("punct", ";");

    // incrementor
    let incrementor: ForNode["incrementor"] = null;
    if (!this.is("punct", ")")) incrementor = this.parseExpression(0);
    this.expect("punct", ")");

    const body = this.is("punct", "{")
      ? this.parseBlock()
      : { type: "block", statements: [this.parseDeclOrStatement()].filter(Boolean) as StatementNode[] };
    return { type: "for", initializer, condition, incrementor, statements: body.statements, source: kw.source };
  }

  private parseSwitch(): SwitchNode {
    const kw = this.expect("keyword", "SWITCH");
    this.expect("punct", "(");
    const condition = this.parseExpression(0);
    this.expect("punct", ")");
    this.expect("punct", "{");

    const cases: CaseNode[] = [];
    let def: DefaultNode | null = null;

    while (!this.is("punct", "}")) {
      if (this.is("keyword", "CASE")) {
        const ckw = this.expect("keyword", "CASE");
        const caseValue = this.parseExpression(0);
        this.expect("punct", ":");

        const statements: StatementNode[] = [];
        while (!this.is("keyword", "CASE") && !this.is("keyword", "DEFAULT") && !this.is("punct", "}")) {
          const st = this.parseDeclOrStatement();
          if (st) statements.push(st);
        }

        cases.push({ type: "case", value: caseValue, statements, source: ckw.source });
        continue;
      }

      if (this.is("keyword", "DEFAULT")) {
        const dkw = this.expect("keyword", "DEFAULT");
        this.expect("punct", ":");

        const statements: StatementNode[] = [];
        while (!this.is("keyword", "CASE") && !this.is("punct", "}")) {
          const st = this.parseDeclOrStatement();
          if (st) statements.push(st);
        }
        def = { type: "default", statements, source: dkw.source };
        continue;
      }

      // If we get here, recover by consuming one token.
      this.next();
    }

    this.expect("punct", "}");
    return { type: "switch", condition, cases, default: def, source: kw.source };
  }

  private parseReturn(): ReturnNode {
    const kw = this.expect("keyword", "RETURN");
    if (this.is("punct", ";")) {
      this.next();
      return { type: "return", value: null, source: kw.source };
    }
    const value = this.parseExpression(0);
    this.expect("punct", ";");
    return { type: "return", value, source: kw.source };
  }

  private parseBreak(): BreakNode {
    const kw = this.expect("keyword", "BREAK");
    this.expect("punct", ";");
    return { type: "break", source: kw.source };
  }

  private parseContinue(): ContinueNode {
    const kw = this.expect("keyword", "CONTINUE");
    this.expect("punct", ";");
    return { type: "continue", source: kw.source };
  }

  // -------------------------
  // Data type parsing
  // -------------------------
  private tryParseDataType(): DataTypeNode | null {
    if (this.is("keyword", "VOID")) { this.next(); return dt("void", NWCompileDataTypes.void); }
    if (this.is("keyword", "INT")) { this.next(); return dt("int", NWCompileDataTypes.int); }
    if (this.is("keyword", "FLOAT")) { this.next(); return dt("float", NWCompileDataTypes.float); }
    if (this.is("keyword", "STRING")) { this.next(); return dt("string", NWCompileDataTypes.string); }
    if (this.is("keyword", "OBJECT")) { this.next(); return dt("object", NWCompileDataTypes.object); }
    if (this.is("keyword", "VECTOR")) { this.next(); return dt("vector", NWCompileDataTypes.vector); }
    if (this.is("keyword", "ACTION")) { this.next(); return dt("action", NWCompileDataTypes.action); }

    // engine types are identifiers that got injected from nwscript.nss defines
    if (this.is("name")) {
      const lower = this.tok.value.toLowerCase();
      const unary = this.engineTypesByLower.get(lower);
      if (unary !== undefined) {
        const v = this.tok.value;
        this.next();
        return { type: "datatype", value: v.toLowerCase(), unary, engine_type: true };
      }
    }

    return null;
  }

  private mustParseDataType(): DataTypeNode {
    const d = this.tryParseDataType();
    if (!d) throw new Error(`Parse error: expected datatype @ ${this.tok.source.first_line}:${this.tok.source.first_column}`);
    return d;
  }

  // -------------------------
  // Expression parsing (Pratt)
  // -------------------------
  private lbp(op: string): number {
    // mirrors the jison operator precedence blocks (roughly)
    switch (op) {
      case "=":
      case "+=":
      case "-=":
      case "*=":
      case "/=":
      case "%=":
      case "|=":
      case "&=":
      case "^=":
      case "<<=":
      case ">>=":
      case ">>>=":
        return 10;

      case "||": return 20;
      case "&&": return 30;

      case "|": return 40;
      case "^": return 50;
      case "&": return 60;

      case "==":
      case "!=": return 70;

      case "<":
      case ">":
      case "<=":
      case ">=": return 80;

      case "<<":
      case ">>":
      case ">>>": return 90;

      case "+":
      case "-": return 100;

      case "*":
      case "/":
      case "%": return 110;

      case "++":
      case "--": return 120;

      case ".": return 140;

      default: return 0;
    }
  }

  private parseExpression(rbp: number): ExpressionNode {
    let left = this.nud();

    while (true) {
      // postfix call / index handled in led as well
      if (this.is("punct", "(") || this.is("punct", "[")) {
        left = this.ledPostfix(left);
        continue;
      }

      if (!this.is("op") && !this.is("punct", ".")) break;

      const op = this.is("punct", ".") ? "." : this.tok.value;
      const lbp = this.lbp(op);
      if (lbp <= rbp) break;

      // consume operator
      const opTok = this.tok;
      this.next();

      left = this.led(left, op, opTok);
    }

    return left;
  }

  private nud(): ExpressionNode {
    // prefix ops
    if (this.is("op", "++")) {
      const t = this.tok; this.next();
      const v = this.parseExpression(120);
      return { type: "inc", value: v, source: t.source };
    }
    if (this.is("op", "--")) {
      const t = this.tok; this.next();
      const v = this.parseExpression(120);
      return { type: "dec", value: v, source: t.source };
    }
    if (this.is("op", "!")) {
      const t = this.tok; this.next();
      const v = this.parseExpression(120);
      return { type: "not", value: v, source: t.source };
    }
    if (this.is("op", "~")) {
      const t = this.tok; this.next();
      const v = this.parseExpression(120);
      return { type: "comp", value: v, source: t.source };
    }
    if (this.is("op", "-")) {
      const t = this.tok; this.next();
      const v = this.parseExpression(120);
      return { type: "neg", value: v, source: t.source };
    }

    // literals
    if (this.is("int")) {
      const t = this.expect("int");
      return { type: "literal", datatype: dt("int", NWCompileDataTypes.int), value: parseInt(t.value, 10), source: t.source };
    }
    if (this.is("float")) {
      const t = this.expect("float");
      return { type: "literal", datatype: dt("float", NWCompileDataTypes.float), value: parseFloat(t.value), source: t.source };
    }
    if (this.is("hex")) {
      const t = this.expect("hex");
      return { type: "literal", datatype: dt("int", NWCompileDataTypes.int), value: parseInt(t.value, 16), source: t.source };
    }
    if (this.is("string")) {
      const t = this.expect("string");
      return { type: "literal", datatype: dt("string", NWCompileDataTypes.string), value: t.value, source: t.source };
    }
    if (this.is("keyword", "TRUE")) {
      const t = this.tok; this.next();
      return { type: "literal", datatype: dt("int", NWCompileDataTypes.int), value: 1, source: t.source };
    }
    if (this.is("keyword", "FALSE")) {
      const t = this.tok; this.next();
      return { type: "literal", datatype: dt("int", NWCompileDataTypes.int), value: 0, source: t.source };
    }
    if (this.is("keyword", "NULL")) {
      const t = this.tok; this.next();
      return { type: "literal", datatype: dt("object", NWCompileDataTypes.object), value: 0, source: t.source };
    }
    if (this.is("keyword", "OBJECT_SELF")) {
      const t = this.tok; this.next();
      return { type: "literal", datatype: dt("object", NWCompileDataTypes.object), value: 0, source: t.source };
    }
    if (this.is("keyword", "OBJECT_INVALID")) {
      const t = this.tok; this.next();
      return { type: "literal", datatype: dt("object", NWCompileDataTypes.object), value: 1, source: t.source };
    }

    // parens
    if (this.is("punct", "(")) {
      this.next();
      const e = this.parseExpression(0);
      this.expect("punct", ")");
      return e;
    }

    // array literal (non-standard NWScript, but tolerate for decompiled/legacy input): [a, b, c]
    if (this.is("punct", "[")) {
      const openTok = this.tok;
      this.next(); // consume '['
      const elements: any[] = [];
      if (!this.is("punct", "]")) {
        while (true) {
          elements.push(this.parseExpression(0));
          if (this.is("punct", ",")) { this.next(); continue; }
          break;
        }
      }
      this.expect("punct", "]");
      return { type: "array_literal", elements, source: openTok.source };
    }

    // name: variable ref or function call (postfix handles call)
    if (this.is("name")) {
      const t = this.expect("name");
      return { type: "variable_reference", name: t.value, source: t.source };
    }

    throw new Error(`Parse error: unexpected token ${this.tok.type}:${this.tok.value} @ ${this.tok.source.first_line}:${this.tok.source.first_column}`);
  }

  private ledPostfix(left: ExpressionNode): ExpressionNode {
    // function call: <name>(args)
    if (this.is("punct", "(")) {
      this.expect("punct", "(");
      const args: any[] = [];
      if (!this.is("punct", ")")) {
        while (true) {
          args.push(this.parseExpression(0));
          if (this.is("punct", ",")) { this.next(); continue; }
          break;
        }
      }
      this.expect("punct", ")");

      // If left is a variable_reference, treat it as function_call by name.
      if (left?.type === "variable_reference") {
        return {
          type: "function_call",
          name: left.name,
          arguments: args,
          source: left.source,
        };
      }

      // otherwise: call expression (not really used in NWScript, but keep a node)
      return { type: "call", callee: left, arguments: args, source: left.source };
    }

    // index: left[expr] (rare in NWScript, but keep)
    if (this.is("punct", "[")) {
      this.expect("punct", "[");
      const idx = this.parseExpression(0);
      this.expect("punct", "]");
      return { type: "index", left, index: idx, source: left.source };
    }

    return left;
  }

  private led(left: ExpressionNode, op: string, opTok: Token): ExpressionNode {
    // member: left.name
    if (op === ".") {
      const propTok = this.expect("name");
      return { type: "property", left, name: propTok.value, source: opTok.source };
    }

    // assignment (right associative)
    if (op.endsWith("=") && op !== "==" && op !== "!=" && op !== "<=" && op !== ">=") {
      const right = this.parseExpression(this.lbp(op) - 1);
      return { type: "assign", left, right, operator: { type: "operator", value: op }, source: opTok.source };
    }

    // postfix inc/dec
    if (op === "++") {
      return { type: "inc", value: left, postfix: true, source: opTok.source };
    }
    if (op === "--") {
      return { type: "dec", value: left, postfix: true, source: opTok.source };
    }

    // comparisons + logical
    if (op === "==" || op === "!=" || op === "<" || op === ">" || op === "<=" || op === ">=" || op === "&&" || op === "||") {
      const right = this.parseExpression(this.lbp(op));
      return {
        type: "compare",
        datatype: dt("int", NWCompileDataTypes.int),
        left,
        right,
        operator: { type: "operator", value: op },
        source: opTok.source,
      };
    }

    // arithmetic
    if (op === "+" || op === "-" || op === "*" || op === "/" || op === "%") {
      const right = this.parseExpression(this.lbp(op));
      const type = op === "+" ? "add" : op === "-" ? "sub" : op === "*" ? "mul" : op === "/" ? "div" : "mod";
      return { type, left, right, operator: { type: "operator", value: op }, source: opTok.source };
    }

    // bitwise-ish nodes to match your jison output
    if (op === "|") {
      const right = this.parseExpression(this.lbp(op));
      return { type: "incor", left, right, operator: { type: "operator", value: op }, source: opTok.source };
    }
    if (op === "^") {
      const right = this.parseExpression(this.lbp(op));
      return { type: "xor", left, right, operator: { type: "operator", value: op }, source: opTok.source };
    }
    if (op === "&") {
      const right = this.parseExpression(this.lbp(op));
      return { type: "booland", left, right, operator: { type: "operator", value: op }, source: opTok.source };
    }

    // shifts are not wired into your compiler yet; still emit a node so the AST is faithful
    if (op === "<<" || op === ">>" || op === ">>>") {
      const right = this.parseExpression(this.lbp(op));
      return { type: "shift", left, right, operator: { type: "operator", value: op }, source: opTok.source };
    }

    // fallback
    const right = this.parseExpression(this.lbp(op));
    return { type: "binary", left, right, operator: { type: "operator", value: op }, source: opTok.source };
  }
}