import {
  SemanticProgramNode,
  SemanticFunctionNode,
  SemanticStatementNode,
  SemanticBlockNode,
  SemanticReturnNode,
  SemanticFunctionCallNode,
  SemanticLiteralNode,
  SemanticExpressionNode,
  SemanticVariableReferenceNode,
  SemanticAssignNode,
  SemanticBinaryNode,
  SemanticCompareNode,
  SemanticUnaryNode,
  SemanticIncDecNode,
  SemanticIfNode,
  SemanticElseNode,
  SemanticWhileNode,
  SemanticDoWhileNode,
  SemanticForNode,
  SemanticSwitchNode,
  SemanticPropertyNode,
  SemanticIndexNode,
  SemanticArrayLiteralNode,
  SemanticVariableNode,
  SemanticVariableListNode,
  SemanticBreakNode,
  SemanticContinueNode,
} from "./ASTSemanticTypes";
import {
  OP_CPDOWNSP,
  OP_RSADD,
  OP_CPTOPSP,
  OP_CONST,
  OP_ACTION,
  OP_LOGANDII,
  OP_LOGORII,
  OP_INCORII,
  OP_EXCORII,
  OP_BOOLANDII,
  OP_EQUAL,
  OP_NEQUAL,
  OP_GEQ,
  OP_GT,
  OP_LT,
  OP_LEQ,
  OP_SHLEFTII,
  OP_SHRIGHTII,
  OP_USHRIGHTII,
  OP_ADD,
  OP_SUB,
  OP_MUL,
  OP_DIV,
  OP_MODII,
  OP_NEG,
  OP_COMPI,
  OP_MOVSP,
  OP_RETN,
  OP_SAVEBP,
  OP_RESTOREBP,
  OP_CPTOPBP,
  OP_CPDOWNBP,
  OP_JMP,
  OP_JSR,
  OP_JZ,
  OP_JNZ,
  OP_NOTI,
  OP_DECISP,
  OP_INCISP,
  OP_NOP,
  OP_STORE_STATE,
} from "../NWScriptOPCodes";

// Minimal IR types: label-based, linear instruction list.
export type IRProgram = {
  functions: IRFunction[];
};

export type IRFunction = {
  name: string;
  isEngineAction?: boolean;
  arguments: IRValue[];
  returnType: IRType | null;
  returnSize: number;
  instructions: IRInstruction[];
  entryLabel: string;
};

export type IRType = {
  kind: "datatype";
  value: string;
  unary: number;
};

export type IRValue =
  | { kind: "const"; type: IRType; value: number | string }
  | { kind: "var"; name: string; isGlobal?: boolean; offset?: number; size?: number }
  | { kind: "temp"; id: number };

// IR instructions are deliberately concrete and label-based.
export type IRInstruction =
  | { op: "label"; name: string }
  | { op: "rsadd"; type: IRType }
  | { op: "movsp"; delta: number }
  | { op: "loadconst"; type: IRType; value: number | string }
  | { op: "loadvar"; type: IRType; varName: string; isGlobal?: boolean; size?: number }
  | { op: "storevar"; type: IRType; varName: string; isGlobal?: boolean; size?: number }
  | { op: "binop"; kind: "add" | "sub" | "mul" | "div" | "mod"; typeCode?: number }
  | { op: "compare"; kind: "eq" | "ne" | "gt" | "lt" | "ge" | "le"; typeCode?: number; size?: number }
  | { op: "logic"; kind: "and" | "or"; typeCode?: number }
  | { op: "unary"; kind: "neg" | "not"; typeCode?: number }
  | { op: "inc"; varName: string; isGlobal?: boolean; postfix?: boolean; size?: number }
  | { op: "dec"; varName: string; isGlobal?: boolean; postfix?: boolean; size?: number }
  | { op: "loadfield"; type: IRType; field: string; parent?: string }
  | { op: "storefield"; type: IRType; field: string; parent?: string }
  | { op: "loadindex"; type: IRType; indexLiteral?: number }
  | { op: "storeindex"; type: IRType; indexLiteral?: number }
  | { op: "cpdownsp"; offset: number; size: number }
  | { op: "jsr"; target: string }
  | { op: "jmp"; target: string }
  | { op: "jz"; target: string }
  | { op: "jnz"; target: string }
  | { op: "action"; id: number; argc: number; returnSize: number; argSize: number }
  | { op: "store_state"; bStackSize: number; stackSize: number }
  | { op: "return" }
  | { op: "nop" };

export type IRStructLayout = {
  name: string;
  size: number;
  fields: Record<string, { offset: number; size: number }>;
};

export type IRStackSlot = { offset: number; size: number };

export type IRStackFrame = {
  args: Record<string, IRStackSlot>;
  locals: Record<string, IRStackSlot>;
  frameSize: number;
  localsSize: number;
  argsSize: number;
};

export type IRLabelMap = Record<string, number>;

export type IRLayoutResult = {
  labels: IRLabelMap;
  stack: IRStackFrame;
  globals: Record<string, IRStackSlot>;
  size: number;
};

export type IREmittedFunction = {
  name: string;
  code: Uint8Array;
  layout: IRLayoutResult;
};

export type IREmittedProgram = {
  functions: IREmittedFunction[];
  total: Uint8Array;
};

type WritableBuffer = Uint8Array & {
  writeInt8(value: number, offset: number): void;
  writeInt16BE(value: number, offset: number): void;
  writeInt32BE(value: number, offset: number): void;
  writeUInt16BE(value: number, offset: number): void;
  writeFloatBE(value: number, offset: number): void;
};

const allocBuffer = (length: number): WritableBuffer => {
  if (typeof Buffer !== "undefined" && typeof Buffer.alloc === "function") {
    return Buffer.alloc(length) as WritableBuffer;
  }
  const arr = new Uint8Array(length) as WritableBuffer;
  const dv = new DataView(arr.buffer);
  arr.writeInt8 = (value: number, offset: number) => dv.setInt8(offset, value);
  arr.writeInt16BE = (value: number, offset: number) => dv.setInt16(offset, value, false);
  arr.writeInt32BE = (value: number, offset: number) => dv.setInt32(offset, value, false);
  arr.writeUInt16BE = (value: number, offset: number) => dv.setUint16(offset, value, false);
  arr.writeFloatBE = (value: number, offset: number) => dv.setFloat32(offset, value, false);
  return arr;
};

const concatBuffers = (buffers: Uint8Array[]) => {
  let totalLength = 0;
  for (let i = 0; i < buffers.length; i++) {
    totalLength += buffers[i].length;
  }
  const mergedArray = new Uint8Array(totalLength);
  let offset = 0;
  for (let i = 0; i < buffers.length; i++) {
    mergedArray.set(buffers[i], offset);
    offset += buffers[i].length;
  }
  return mergedArray;
};

/**
 * NWScriptIRBuilder
 * -----------------
 * Lowers a semantic program into a simple, label-based IR suitable for
 * a sizing pass (layout) and a separate emission pass.
 *
 * This builder currently creates IR function shells and preserves the
 * entry labels; you can extend `lowerFunction` to emit detailed IR from
 * statements/expressions.
 */
export class NWScriptIRBuilder {
  private tempId = 0;
  private breakLabels: string[] = [];
  private continueLabels: string[] = [];

  private newTemp(): IRValue {
    return { kind: "temp", id: this.tempId++ };
  }

  private newLabel(prefix: string): string {
    this.tempId += 1;
    return `${prefix}_${this.tempId.toString(16)}`;
  }

  static build(program: SemanticProgramNode): IRProgram {
    const irFunctions: IRFunction[] = [];

    // Main or StartingConditional first, then other called functions if present.
    const funcs: SemanticFunctionNode[] = [];
    if (program.main) funcs.push(program.main);
    if (program.startingConditional) funcs.push(program.startingConditional);
    for (const f of program.functions || []) {
      if (!funcs.includes(f)) funcs.push(f);
    }

    for (const fn of funcs) {
      irFunctions.push(this.lowerFunction(fn));
    }

    return { functions: irFunctions };
  }

  // Lower a function to IR; currently handles returns, expressions, control-flow.
  private static lowerFunction(fn: SemanticFunctionNode): IRFunction {
    const entryLabel = `fn_${fn.name}`;
    const builder = new NWScriptIRBuilder();
    const instructions: IRInstruction[] = [{ op: "label", name: entryLabel }];
    builder.lowerStatements(fn.statements as SemanticStatementNode[], instructions);
    const retSize = NWScriptIRBuilder.getTypeSize(fn.returntype);

    return {
      name: fn.name,
      isEngineAction: (fn as any).is_engine_action || false,
      arguments: [],
      returnType: fn.returntype
        ? { kind: "datatype", value: fn.returntype.value, unary: fn.returntype.unary }
        : null,
      returnSize: retSize,
      instructions,
      entryLabel,
    };
  }

  private lowerStatements(stmts: SemanticStatementNode[], acc: IRInstruction[]) {
    for (const stmt of stmts) {
      this.lowerStatement(stmt, acc);
    }
  }

  private lowerStatement(stmt: SemanticStatementNode, acc: IRInstruction[]): void {
    switch (stmt.type) {
      case "block":
        this.lowerStatements((stmt as SemanticBlockNode).statements as SemanticStatementNode[], acc);
        break;
      case "return":
        if ((stmt as SemanticReturnNode).value) {
          this.lowerExpression((stmt as SemanticReturnNode).value as SemanticExpressionNode, acc);
        }
        acc.push({ op: "return" });
        break;
      case "function_call":
        this.lowerFunctionCall(stmt as SemanticFunctionCallNode, acc);
        break;
      case "literal":
        this.lowerLiteral(stmt as SemanticLiteralNode, acc);
        break;
      case "property":
        this.lowerProperty(stmt as SemanticPropertyNode, acc);
        break;
      case "index":
        this.lowerIndex(stmt as SemanticIndexNode, acc);
        break;
      case "array_literal":
        this.lowerArrayLiteral(stmt as SemanticArrayLiteralNode, acc);
        break;
      case "variable_reference":
        this.lowerVarRef(stmt as SemanticVariableReferenceNode, acc);
        break;
      case "assign":
        this.lowerAssign(stmt as SemanticAssignNode, acc);
        break;
      case "add":
      case "sub":
      case "mul":
      case "div":
      case "mod":
        this.lowerBinary(stmt as SemanticBinaryNode, acc);
        break;
      case "compare":
        this.lowerCompare(stmt as SemanticCompareNode, acc);
        break;
      case "neg":
      case "not":
        this.lowerUnary(stmt as SemanticUnaryNode, acc);
        break;
      case "inc":
      case "dec":
        this.lowerIncDec(stmt as SemanticIncDecNode, acc);
        break;
      case "if":
        this.lowerIf(stmt as unknown as SemanticIfNode, acc);
        break;
      case "while":
        this.lowerWhile(stmt as unknown as SemanticWhileNode, acc);
        break;
      case "do":
        this.lowerDoWhile(stmt as unknown as SemanticDoWhileNode, acc);
        break;
      case "for":
        this.lowerFor(stmt as unknown as SemanticForNode, acc);
        break;
      case "switch":
        this.lowerSwitch(stmt as unknown as SemanticSwitchNode, acc);
        break;
      case "break":
        this.lowerBreak(stmt as SemanticBreakNode, acc);
        break;
      case "continue":
        this.lowerContinue(stmt as SemanticContinueNode, acc);
        break;
      default:
        acc.push({ op: "nop" });
        break;
    }
  }

  private lowerLiteral(lit: SemanticLiteralNode, acc: IRInstruction[]) {
    const type: IRType = { kind: "datatype", value: lit.datatype.value, unary: lit.datatype.unary };
    acc.push({ op: "loadconst", type, value: lit.value });
  }

  private lowerArrayLiteral(arr: SemanticArrayLiteralNode, acc: IRInstruction[]) {
    // NWScript has no true arrays; array literals here are used for default
    // vector-ish arguments. Emit each element as its literal; caller decides
    // how many stack slots to reserve/consume.
    for (const el of arr.elements) {
      this.lowerExpression(el as SemanticExpressionNode, acc);
    }
  }

  private lowerProperty(prop: SemanticPropertyNode, acc: IRInstruction[]) {
    // Evaluate base
    this.lowerExpression(prop.left as SemanticExpressionNode, acc);
    const dt: IRType = prop.datatype
      ? { kind: "datatype", value: prop.datatype.value, unary: prop.datatype.unary }
      : { kind: "datatype", value: "int", unary: 0x03 };
    const parentStruct =
      (prop.left as any)?.datatype?.struct || (prop.left as any)?.datatype?.value || undefined;
    if (prop.right) {
      this.lowerExpression(prop.right as SemanticExpressionNode, acc);
      acc.push({ op: "storefield", type: dt, field: prop.name, parent: parentStruct });
    } else {
      acc.push({ op: "loadfield", type: dt, field: prop.name, parent: parentStruct });
    }
  }

  private lowerIndex(idx: SemanticIndexNode, acc: IRInstruction[]) {
    this.lowerExpression(idx.left as SemanticExpressionNode, acc);
    this.lowerExpression(idx.index as SemanticExpressionNode, acc);
    const dt: IRType = (idx as any).datatype
      ? { kind: "datatype", value: (idx as any).datatype.value, unary: (idx as any).datatype.unary }
      : { kind: "datatype", value: "int", unary: 0x03 };
    let litIdx: number | undefined;
    if (idx.index.type === "literal" && typeof (idx.index as any).value === "number") {
      litIdx = (idx.index as any).value;
    }
    // If part of assignment, store will be handled in assign lowering; otherwise load.
    acc.push({ op: "loadindex", type: dt, indexLiteral: litIdx });
  }
  private lowerVarRef(vr: SemanticVariableReferenceNode, acc: IRInstruction[]) {
    const dt: IRType = vr.datatype
      ? { kind: "datatype", value: vr.datatype.value, unary: vr.datatype.unary }
      : { kind: "datatype", value: "int", unary: 0x03 };
    acc.push({ op: "loadvar", type: dt, varName: vr.name, isGlobal: vr.is_global });
  }

  private lowerAssign(asn: SemanticAssignNode, acc: IRInstruction[]) {
    this.lowerExpression(asn.right as SemanticExpressionNode, acc);
    const left = asn.left as any;
    if (left.type === "variable_reference") {
      const vr = left as SemanticVariableReferenceNode;
      const dt: IRType = vr.datatype
        ? { kind: "datatype", value: vr.datatype.value, unary: vr.datatype.unary }
        : { kind: "datatype", value: "int", unary: 0x03 };
      acc.push({ op: "storevar", type: dt, varName: vr.name, isGlobal: vr.is_global });
    } else if (left.type === "property") {
      const prop = left as SemanticPropertyNode;
      const dt: IRType = prop.datatype
        ? { kind: "datatype", value: prop.datatype.value, unary: prop.datatype.unary }
        : { kind: "datatype", value: "int", unary: 0x03 };
      this.lowerExpression(prop.left as SemanticExpressionNode, acc);
      acc.push({ op: "storefield", type: dt, field: prop.name });
    } else if (left.type === "index") {
      const idx = left as SemanticIndexNode;
      const dt: IRType = (idx as any).datatype
        ? { kind: "datatype", value: (idx as any).datatype.value, unary: (idx as any).datatype.unary }
        : { kind: "datatype", value: "int", unary: 0x03 };
      this.lowerExpression(idx.left as SemanticExpressionNode, acc);
      this.lowerExpression(idx.index as SemanticExpressionNode, acc);
      let litIdx: number | undefined;
      if (idx.index.type === "literal" && typeof (idx.index as any).value === "number") {
        litIdx = (idx.index as any).value;
      }
      acc.push({ op: "storeindex", type: dt, indexLiteral: litIdx });
    } else {
      acc.push({ op: "nop" });
    }
  }

  private lowerBinary(bin: SemanticBinaryNode, acc: IRInstruction[]) {
    this.lowerExpression(bin.left as SemanticExpressionNode, acc);
    this.lowerExpression(bin.right as SemanticExpressionNode, acc);
    const typeCode = NWScriptIRBuilder.getBinaryOpTypeCode(
      bin.type,
      (bin.left as any)?.datatype,
      (bin.right as any)?.datatype
    );
    switch (bin.type) {
      case "add":
        acc.push({ op: "binop", kind: "add", typeCode });
        break;
      case "sub":
        acc.push({ op: "binop", kind: "sub", typeCode });
        break;
      case "mul":
        acc.push({ op: "binop", kind: "mul", typeCode });
        break;
      case "div":
        acc.push({ op: "binop", kind: "div", typeCode });
        break;
      case "mod":
        acc.push({ op: "binop", kind: "mod", typeCode });
        break;
      default:
        acc.push({ op: "nop" });
        break;
    }
  }

  private lowerCompare(cmp: SemanticCompareNode, acc: IRInstruction[]) {
    const op = cmp.operator?.value;
    if (op === "&&" || op === "||") {
      // Short-circuit lowering: evaluate left, branch if decisive, else evaluate right
      const lblShort = this.newLabel(op === "&&" ? "and_short" : "or_short");
      const lblEnd = this.newLabel(op === "&&" ? "and_end" : "or_end");
      // Evaluate left
      this.lowerExpression(cmp.left as SemanticExpressionNode, acc);
      // Duplicate top for branch check
      acc.push({ op: "loadconst", type: { kind: "datatype", value: "int", unary: 0x03 }, value: 0 });
      acc.push({ op: "compare", kind: "eq" });
      // For &&, if left == 0 jump short-circuit false; for ||, if left == 0 fall through to right
      if (op === "&&") {
        acc.push({ op: "jz", target: lblShort }); // if result of (left==0) is zero -> left !=0, continue; else jump short
      } else {
        acc.push({ op: "jnz", target: lblShort }); // if left == 0 then jnz? Actually jnz jumps when !=0; we want jump when left!=0 -> short-circuit true
      }
      // Evaluate right
      this.lowerExpression(cmp.right as SemanticExpressionNode, acc);
      // combine right with previous? Just leave right result on stack
      acc.push({ op: "jmp", target: lblEnd });
      // short-circuit path
      acc.push({ op: "label", name: lblShort });
      if (op === "&&") {
        // left was false => push 0
        acc.push({ op: "loadconst", type: { kind: "datatype", value: "int", unary: 0x03 }, value: 0 });
      } else {
        // left was true => push 1
        acc.push({ op: "loadconst", type: { kind: "datatype", value: "int", unary: 0x03 }, value: 1 });
      }
      acc.push({ op: "label", name: lblEnd });
      return;
    }

    this.lowerExpression(cmp.left as SemanticExpressionNode, acc);
    this.lowerExpression(cmp.right as SemanticExpressionNode, acc);
    const typeInfo = NWScriptIRBuilder.getCompareTypeInfo(
      (cmp.left as any)?.datatype,
      (cmp.right as any)?.datatype,
      (cmp as any)?.datatype
    );
    switch (op) {
      case "==":
        acc.push({ op: "compare", kind: "eq", typeCode: typeInfo.typeCode, size: typeInfo.size });
        break;
      case "!=":
        acc.push({ op: "compare", kind: "ne", typeCode: typeInfo.typeCode, size: typeInfo.size });
        break;
      case ">":
        acc.push({ op: "compare", kind: "gt", typeCode: typeInfo.typeCode, size: typeInfo.size });
        break;
      case "<":
        acc.push({ op: "compare", kind: "lt", typeCode: typeInfo.typeCode, size: typeInfo.size });
        break;
      case ">=":
        acc.push({ op: "compare", kind: "ge", typeCode: typeInfo.typeCode, size: typeInfo.size });
        break;
      case "<=":
        acc.push({ op: "compare", kind: "le", typeCode: typeInfo.typeCode, size: typeInfo.size });
        break;
      default:
        acc.push({ op: "nop" });
        break;
    }
  }

  private lowerUnary(un: SemanticUnaryNode, acc: IRInstruction[]) {
    this.lowerExpression(un.value as SemanticExpressionNode, acc);
    const typeCode = NWScriptIRBuilder.getUnaryTypeCode(un.type, (un as any).datatype || (un.value as any)?.datatype);
    switch (un.type) {
      case "neg":
        acc.push({ op: "unary", kind: "neg", typeCode });
        break;
      case "not":
        acc.push({ op: "unary", kind: "not", typeCode });
        break;
      default:
        acc.push({ op: "nop" });
        break;
    }
  }

  private lowerIncDec(id: SemanticIncDecNode, acc: IRInstruction[]) {
    const vr = id.value as any;
    if (vr && vr.type === "variable_reference") {
      const name = vr.name;
      const isPost = (id as any).postFix ?? (id as any).postfix;
      if (id.type === "inc") {
        acc.push({ op: "inc", varName: name, isGlobal: vr.is_global, postfix: isPost });
      } else {
        acc.push({ op: "dec", varName: name, isGlobal: vr.is_global, postfix: isPost });
      }
    } else {
      acc.push({ op: "nop" });
    }
  }

  private lowerIf(node: SemanticIfNode, acc: IRInstruction[]) {
    const lblElse = this.newLabel("else");
    const lblEnd = this.newLabel("endif");
    this.lowerExpression(node.condition as SemanticExpressionNode, acc);
    acc.push({ op: "jz", target: lblElse });
    this.lowerStatements(node.statements as SemanticStatementNode[], acc);
    acc.push({ op: "jmp", target: lblEnd });
    acc.push({ op: "label", name: lblElse });
    if (node.elseIfs && node.elseIfs.length) {
      for (const ei of node.elseIfs) {
        const lblNext = this.newLabel("elseif_next");
        this.lowerExpression(ei.condition as SemanticExpressionNode, acc);
        acc.push({ op: "jz", target: lblNext });
        this.lowerStatements(ei.statements as SemanticStatementNode[], acc);
        acc.push({ op: "jmp", target: lblEnd });
        acc.push({ op: "label", name: lblNext });
      }
    }
    if (node.else) {
      this.lowerStatements((node.else as SemanticElseNode).statements as SemanticStatementNode[], acc);
    }
    acc.push({ op: "label", name: lblEnd });
  }

  private lowerWhile(node: SemanticWhileNode, acc: IRInstruction[]) {
    const lblStart = this.newLabel("while_start");
    const lblEnd = this.newLabel("while_end");
    this.continueLabels.push(lblStart);
    this.breakLabels.push(lblEnd);
    acc.push({ op: "label", name: lblStart });
    this.lowerExpression(node.condition as SemanticExpressionNode, acc);
    acc.push({ op: "jz", target: lblEnd });
    this.lowerStatements(node.statements as SemanticStatementNode[], acc);
    acc.push({ op: "jmp", target: lblStart });
    acc.push({ op: "label", name: lblEnd });
    this.continueLabels.pop();
    this.breakLabels.pop();
  }

  private lowerDoWhile(node: SemanticDoWhileNode, acc: IRInstruction[]) {
    const lblStart = this.newLabel("do_start");
    const lblCond = this.newLabel("do_cond");
    const lblEnd = this.newLabel("do_end");
    this.continueLabels.push(lblCond);
    this.breakLabels.push(lblEnd);
    acc.push({ op: "label", name: lblStart });
    this.lowerStatements(node.statements as SemanticStatementNode[], acc);
    acc.push({ op: "label", name: lblCond });
    this.lowerExpression(node.condition as SemanticExpressionNode, acc);
    acc.push({ op: "jnz", target: lblStart });
    acc.push({ op: "label", name: lblEnd });
    this.continueLabels.pop();
    this.breakLabels.pop();
  }

  private lowerFor(node: SemanticForNode, acc: IRInstruction[]) {
    const lblStart = this.newLabel("for_start");
    const lblEnd = this.newLabel("for_end");
    const lblInc = this.newLabel("for_inc");
    this.continueLabels.push(lblInc);
    this.breakLabels.push(lblEnd);
    // initializer
    if (node.initializer) {
      this.lowerExpression(node.initializer as any, acc);
    }
    acc.push({ op: "label", name: lblStart });
    // condition
    if (node.condition) {
      this.lowerExpression(node.condition as SemanticExpressionNode, acc);
      acc.push({ op: "jz", target: lblEnd });
    }
    // body
    this.lowerStatements(node.statements as SemanticStatementNode[], acc);
    acc.push({ op: "label", name: lblInc });
    // incrementor
    if (node.incrementor) {
      this.lowerExpression(node.incrementor as SemanticExpressionNode, acc);
    }
    acc.push({ op: "jmp", target: lblStart });
    acc.push({ op: "label", name: lblEnd });
    this.continueLabels.pop();
    this.breakLabels.pop();
  }

  private lowerSwitch(node: SemanticSwitchNode, acc: IRInstruction[]) {
    const lblEnd = this.newLabel("switch_end");
    this.breakLabels.push(lblEnd);
    const caseLabels = node.cases.map((_c, i) => this.newLabel(`case_${i}`));
    const defaultLabel = node.default ? this.newLabel("default") : lblEnd;
    this.lowerExpression(node.condition as SemanticExpressionNode, acc);
    for (let i = 0; i < node.cases.length; i++) {
      this.lowerExpression(node.cases[i].value as SemanticExpressionNode, acc);
      acc.push({ op: "compare", kind: "eq" });
      acc.push({ op: "jnz", target: caseLabels[i] });
    }
    acc.push({ op: "jmp", target: defaultLabel });
    for (let i = 0; i < node.cases.length; i++) {
      acc.push({ op: "label", name: caseLabels[i] });
      this.lowerStatements(node.cases[i].statements as SemanticStatementNode[], acc);
      if (!node.cases[i].fallthrough) {
        acc.push({ op: "jmp", target: lblEnd });
      }
    }
    if (node.default) {
      acc.push({ op: "label", name: defaultLabel });
      this.lowerStatements(node.default.statements as SemanticStatementNode[], acc);
      acc.push({ op: "jmp", target: lblEnd });
    }
    acc.push({ op: "label", name: lblEnd });
    this.breakLabels.pop();
  }

  private lowerBreak(_node: SemanticBreakNode, acc: IRInstruction[]) {
    const target = this.breakLabels[this.breakLabels.length - 1];
    if (target) {
      acc.push({ op: "jmp", target });
    } else {
      acc.push({ op: "nop" });
    }
  }

  private lowerContinue(_node: SemanticContinueNode, acc: IRInstruction[]) {
    const target = this.continueLabels[this.continueLabels.length - 1];
    if (target) {
      acc.push({ op: "jmp", target });
    } else {
      acc.push({ op: "nop" });
    }
  }

  private lowerExpression(expr: SemanticExpressionNode, acc: IRInstruction[]) {
    switch (expr.type) {
      case "literal":
        this.lowerLiteral(expr as SemanticLiteralNode, acc);
        break;
      case "array_literal":
        this.lowerArrayLiteral(expr as SemanticArrayLiteralNode, acc);
        break;
      case "variable_reference":
        this.lowerVarRef(expr as SemanticVariableReferenceNode, acc);
        break;
      case "function_call":
        this.lowerFunctionCall(expr as SemanticFunctionCallNode, acc);
        break;
      case "property":
        this.lowerProperty(expr as SemanticPropertyNode, acc);
        break;
      case "index":
        this.lowerIndex(expr as SemanticIndexNode, acc);
        break;
      case "assign":
        this.lowerAssign(expr as SemanticAssignNode, acc);
        break;
      case "array_literal":
        this.lowerArrayLiteral(expr as SemanticArrayLiteralNode, acc);
        break;
      case "add":
      case "sub":
      case "mul":
      case "div":
      case "mod":
        this.lowerBinary(expr as SemanticBinaryNode, acc);
        break;
      case "compare":
        this.lowerCompare(expr as SemanticCompareNode, acc);
        break;
      case "neg":
      case "not":
        this.lowerUnary(expr as SemanticUnaryNode, acc);
        break;
      case "inc":
      case "dec":
        this.lowerIncDec(expr as SemanticIncDecNode, acc);
        break;
      default:
        acc.push({ op: "nop" });
        break;
    }
  }

  // Minimal lowering for function calls: emit an action placeholder or jsr placeholder.
  private lowerFunctionCall(call: SemanticFunctionCallNode, acc: IRInstruction[]) {
    const reversedArgs = [...call.arguments].reverse();
    const argSize = reversedArgs.reduce(
      (sum, a) => sum + NWScriptIRBuilder.getStatementSize(a as SemanticExpressionNode),
      0
    );

    const isEngine = call.function_reference && (call.function_reference as any).is_engine_action;
    const retSize = NWScriptIRBuilder.getTypeSize(call.function_reference?.returntype);

    // For script calls with return, preallocate return slot (RSADD)
    if (!isEngine && retSize > 0) {
      const retDt = call.function_reference?.returntype;
      if (retSize === 12) {
        // vector: three float slots
        for (let i = 0; i < 3; i++) {
          acc.push({
            op: "rsadd",
            type: { kind: "datatype", value: "float", unary: 0x04 },
          });
        }
      } else {
        acc.push({
          op: "rsadd",
          type: {
            kind: "datatype",
            value: retDt?.value ?? "int",
            unary: retDt?.unary ?? 0x03,
          },
        });
      }
    }

    // Emit arguments (reverse order), with action-type trampoline handling
    for (const arg of reversedArgs) {
      const dt = (arg as any).datatype;
      if (dt && dt.value === "action") {
        const afterLabel = this.newLabel("action_after");
        acc.push({ op: "store_state", bStackSize: 0, stackSize: 0 }); // computed at emit
        acc.push({ op: "jmp", target: afterLabel });
        this.lowerExpression(arg as SemanticExpressionNode, acc);
        acc.push({ op: "return" }); // end of trampoline
        acc.push({ op: "label", name: afterLabel });
      } else {
        this.lowerExpression(arg as SemanticExpressionNode, acc);
      }
    }

    if (isEngine) {
      acc.push({
        op: "action",
        id: call.action_id ?? 0,
        argc: reversedArgs.length,
        returnSize: retSize,
        argSize,
      });
      // ACTION pops args internally; SP change accounted via returnSize/argSize in encoder
    } else {
      const targetLabel = `fn_${call.name}`;
      acc.push({ op: "jsr", target: targetLabel });
      // Script calls: pop args only; return stays in preallocated slot
      if (argSize > 0) {
        acc.push({ op: "movsp", delta: -argSize });
      }
    }
  }

  // Size helpers -----------------------------------------------------
  private static getTypeSize(dt: any): number {
    if (!dt) return 0;
    // In NWScript, most types are 4-byte stack slots (int, float, string ref, object ref).
    // Vectors are 12 bytes; structs unknown -> sum of fields handled elsewhere.
    const val = dt.value ?? dt;
    if (val === "vector") return 12;
    return 4;
  }

  private static getStatementSize(expr: SemanticExpressionNode): number {
    switch (expr.type) {
      case "literal":
        return NWScriptIRBuilder.getTypeSize((expr as SemanticLiteralNode).datatype);
      case "array_literal": {
        const arr = expr as SemanticArrayLiteralNode;
        return arr.elements.reduce(
          (sum, el) => sum + NWScriptIRBuilder.getStatementSize(el as SemanticExpressionNode),
          0
        );
      }
      case "variable_reference":
        return NWScriptIRBuilder.getTypeSize((expr as SemanticVariableReferenceNode).datatype);
      case "property":
        return NWScriptIRBuilder.getTypeSize((expr as SemanticPropertyNode).datatype);
      case "index":
        return NWScriptIRBuilder.getTypeSize((expr as any).datatype);
      case "assign":
        return NWScriptIRBuilder.getStatementSize(
          (expr as SemanticAssignNode).right as SemanticExpressionNode
        );
      case "function_call":
        return NWScriptIRBuilder.getTypeSize(
          (expr as SemanticFunctionCallNode).function_reference?.returntype
        );
      default:
        return 4;
    }
  }

  // ---------------- Layout & Emit ----------------

  /**
   * Build IR, layout labels/stack, and emit concrete opcode buffers.
   */
  static layoutAndEmit(program: SemanticProgramNode): IREmittedProgram {
    const ir = this.build(program);
    const structLayouts = this.computeStructLayouts(program);
    const globals = this.computeGlobals(program, structLayouts);
    const fnMap = new Map<string, SemanticFunctionNode>();
    if (program.main) fnMap.set(program.main.name, program.main);
    if (program.startingConditional) fnMap.set(program.startingConditional.name, program.startingConditional);
    for (const f of program.functions || []) {
      fnMap.set(f.name, f);
    }

    const emitted: IREmittedFunction[] = [];
    for (const irFn of ir.functions) {
      const semanticFn = fnMap.get(irFn.name);
      const stack = this.buildStackFrame(semanticFn, structLayouts);
      const layout = this.layoutFunction(irFn, stack, structLayouts, globals);
      const code = this.emitFunction(irFn, layout, structLayouts, stack, globals);
      emitted.push({ name: irFn.name, code, layout });
    }

    // Build global init stub: reserve globals, run initializers via expression lowering, anchor BP at globals,
    // JSR into main/start, restore BP, pop globals, RETN.
    const globalStub: Uint8Array[] = [];
    const globalsList = (program.scope?.variables || []).filter((v: any) => v.is_global);
    // Reserve each global slot
    for (const g of globalsList) {
      const gSize = NWScriptIRBuilder.getTypeSize(g.datatype);
      const rs = allocBuffer(2);
      rs.writeInt8(OP_RSADD, 0);
      rs.writeInt8(g.datatype.unary ?? 0x03, 1);
      globalStub.push(rs);
      // Handle vector (12 bytes) by extra RSADDs if needed
      if (gSize === 12) {
        for (let i = 0; i < 2; i++) {
          const rsv = allocBuffer(2);
          rsv.writeInt8(OP_RSADD, 0);
          rsv.writeInt8(0x04, 1);
          globalStub.push(rsv);
        }
      }
    }
    // Lower initializers to SP-relative copies
    {
      let stubSp = globalsList.reduce((s, g) => s + NWScriptIRBuilder.getTypeSize(g.datatype), 0);
      const structLayoutsInit = this.computeStructLayouts(program);
      for (const g of globalsList) {
        const initInstrs: IRInstruction[] = [];
        if (g.value) {
          const builder = new NWScriptIRBuilder();
          builder.lowerExpression(g.value as any, initInstrs);
        } else {
          initInstrs.push({
            op: "loadconst",
            type: { kind: "datatype", value: g.datatype.value, unary: g.datatype.unary ?? 0x03 },
            value: 0,
          });
        }
        let pcInit = 0;
        for (const ii of initInstrs) {
          if (ii.op === "label") continue;
          const enc = this.encodeInstruction(
            ii,
            {},
            pcInit,
            stubSp,
            0,
            stubSp,
            { args: {}, locals: {}, frameSize: 0, localsSize: 0, argsSize: 0 },
            structLayoutsInit,
            globals,
            0
          );
          globalStub.push(enc.buffer);
          stubSp = enc.nextSp;
          pcInit += enc.buffer.length;
        }
        const gSize = NWScriptIRBuilder.getTypeSize(g.datatype);
        const cp = allocBuffer(8);
        cp.writeInt8(OP_CPDOWNSP, 0);
        cp.writeInt8(0x01, 1);
        cp.writeInt32BE(-stubSp, 2);
        cp.writeInt16BE(gSize, 6);
        globalStub.push(cp);
        const pop = allocBuffer(6);
        pop.writeInt8(OP_MOVSP, 0);
        pop.writeInt8(0x00, 1);
        pop.writeInt32BE(-gSize, 2);
        globalStub.push(pop);
        // Net: stubSp unchanged (reserved slot holds value)
      }
    }
    // Anchor BP at globals top
    const save = allocBuffer(2);
    save.writeInt8(OP_SAVEBP, 0);
    save.writeInt8(0x00, 1);
    globalStub.push(save);
    // Placeholder JSR; fill displacement later
    const jsr = allocBuffer(6);
    jsr.writeInt8(OP_JSR, 0);
    jsr.writeInt8(0x00, 1);
    globalStub.push(jsr);
    // Restore BP
    const restore = allocBuffer(2);
    restore.writeInt8(OP_RESTOREBP, 0);
    restore.writeInt8(0x00, 1);
    globalStub.push(restore);
    // Pop globals
    if (globalsList.length > 0) {
      const mov = allocBuffer(6);
      mov.writeInt8(OP_MOVSP, 0);
      mov.writeInt8(0x00, 1);
      const globalsSize = globalsList.reduce((s: number, g: any) => s + NWScriptIRBuilder.getTypeSize(g.datatype), 0);
      mov.writeInt32BE(-globalsSize, 2);
      globalStub.push(mov);
    }
    const r = allocBuffer(2);
    r.writeInt8(OP_RETN, 0);
    r.writeInt8(0x00, 1);
    globalStub.push(r);

    // Fix JSR displacement to jump to the first function block (immediately after stub)
    const stubLen = globalStub.reduce((n, b) => n + b.length, 0);
    const jsrPos = globalStub
      .map((b, i) => ({ b, i }))
      .find((x) => x.b === jsr)?.i ?? -1;
    if (jsrPos >= 0) {
      const offsetBeforeJsr = globalStub.slice(0, jsrPos).reduce((n, b) => n + b.length, 0);
      const disp = stubLen - (offsetBeforeJsr + jsr.length);
      jsr.writeInt32BE(disp, 2);
    }

    const total = concatBuffers([concatBuffers(globalStub), ...emitted.map((e) => e.code)]);
    return { functions: emitted, total };
  }

  private static computeStructLayouts(program: SemanticProgramNode): Record<string, IRStructLayout> {
    const layouts: Record<string, IRStructLayout> = {};
    for (const s of program.structs || []) {
      let offset = 0;
      const fields: Record<string, { offset: number; size: number }> = {};
      for (const prop of s.properties) {
        const size = NWScriptIRBuilder.getTypeSize(prop.datatype);
        fields[prop.name] = { offset, size };
        offset += size;
      }
      layouts[s.name] = { name: s.name, size: offset, fields };
    }
    return layouts;
  }

  private static collectLocals(stmts: SemanticStatementNode[], bucket: SemanticVariableNode[]) {
    for (const stmt of stmts) {
      if (!stmt) continue;
      switch (stmt.type) {
        case "variable":
          bucket.push(stmt as SemanticVariableNode);
          break;
        case "variableList": {
          const vars = (stmt as SemanticVariableListNode).variables || [];
          bucket.push(...vars);
          break;
        }
        case "block":
          this.collectLocals((stmt as SemanticBlockNode).statements as SemanticStatementNode[], bucket);
          break;
        case "if":
          this.collectLocals((stmt as SemanticIfNode).statements as SemanticStatementNode[], bucket);
          for (const ei of (stmt as SemanticIfNode).elseIfs || []) {
            this.collectLocals(ei.statements as SemanticStatementNode[], bucket);
          }
          if ((stmt as SemanticIfNode).else) {
            this.collectLocals(((stmt as SemanticIfNode).else as SemanticElseNode).statements as SemanticStatementNode[], bucket);
          }
          break;
        case "while":
        case "do":
        case "for":
        case "switch":
          // Traverse nested statements for locals
          this.collectLocals((stmt as any).statements as SemanticStatementNode[], bucket);
          break;
        default:
          break;
      }
    }
  }

  private static buildStackFrame(
    fn: SemanticFunctionNode | undefined,
    structLayouts: Record<string, IRStructLayout>
  ): IRStackFrame {
    const args: Record<string, IRStackSlot> = {};
    const locals: Record<string, IRStackSlot> = {};
    let argsSize = 0;
    if (fn?.arguments) {
      for (const arg of fn.arguments) {
        const size = NWScriptIRBuilder.getTypeSize(arg.datatype);
        args[arg.name] = { offset: 0, size }; // temp, corrected below
        argsSize += size;
      }
    }

    let localsSize = 0;
    const localVars: SemanticVariableNode[] = [];
    if (fn?.statements) {
      this.collectLocals(fn.statements as SemanticStatementNode[], localVars);
    }
    for (const v of localVars) {
      const size =
        v.datatype?.struct && structLayouts[v.datatype.struct]
          ? structLayouts[v.datatype.struct].size
          : NWScriptIRBuilder.getTypeSize(v.datatype);
      localsSize += size;
    }

    // Assign locals offsets relative to top after locals are reserved: negative distance
    let localCursor = -localsSize;
    for (const v of localVars) {
      const size =
        v.datatype?.struct && structLayouts[v.datatype.struct]
          ? structLayouts[v.datatype.struct].size
          : NWScriptIRBuilder.getTypeSize(v.datatype);
      locals[v.name] = { offset: localCursor, size };
      localCursor += size;
    }

    // Args sit beneath locals; offset is negative distance from top after locals reserve.
    let argCursor = -localsSize;
    for (const arg of fn?.arguments || []) {
      const slot = args[arg.name];
      if (!slot) continue;
      slot.offset = argCursor - slot.size;
      argCursor -= slot.size;
    }

    return { args, locals, frameSize: argsSize + localsSize, localsSize, argsSize };
  }

  private static computeGlobals(
    program: SemanticProgramNode,
    structLayouts: Record<string, IRStructLayout>
  ): Record<string, IRStackSlot> {
    const globals: Record<string, IRStackSlot> = {};
    let offset = 0;
    const addGlobal = (name: string, dt: any) => {
      const size =
        dt?.struct && structLayouts[dt.struct] ? structLayouts[dt.struct].size : NWScriptIRBuilder.getTypeSize(dt);
      offset -= size;
      globals[name] = { offset, size };
    };
    for (const v of program.scope?.variables || []) {
      if (v.is_global) addGlobal(v.name, v.datatype);
    }
    for (const c of program.scope?.constants || []) {
      if ((c as any).is_global) addGlobal(c.name, c.datatype);
    }
    return globals;
  }

  private static layoutFunction(
    fn: IRFunction,
    stack: IRStackFrame,
    structLayouts: Record<string, IRStructLayout>,
    globals: Record<string, IRStackSlot>
  ): IRLayoutResult {
    const labels: IRLabelMap = {};
    let pc = 0;
    for (const instr of fn.instructions) {
      if (instr.op === "label") {
        labels[instr.name] = pc;
        continue;
      }
      pc += this.estimateInstructionSize(instr, structLayouts);
    }
    return { labels, stack, globals, size: pc };
  }

  private static estimateInstructionSize(instr: IRInstruction, _structs: Record<string, IRStructLayout>): number {
    switch (instr.op) {
      case "label":
        return 0;
      case "rsadd":
        return 2;
      case "movsp":
        return 6;
      case "nop":
        return 1;
      case "loadconst":
        if (instr.type.value === "string" && typeof instr.value === "string") {
          return instr.value.length + 4; // matches CONST string len (base 6 + len -2)
        }
        if (instr.type.unary === 0x07 || instr.type.value === "vector") {
          return 6 * 3;
        }
        return 6;
      case "store_state":
        return 6;
      case "loadvar":
      case "storevar":
      case "loadfield":
      case "storefield":
      case "loadindex":
      case "storeindex":
      case "cpdownsp":
        return 8;
      case "binop":
      case "compare":
      case "logic":
      case "unary":
      case "inc":
      case "dec":
        return 2;
      case "jsr":
      case "jmp":
      case "jz":
      case "jnz":
        return 6;
      case "action":
        return 5;
      case "return":
        return 2;
      default:
        return 2;
    }
  }

  private static emitFunction(
    fn: IRFunction,
    layout: IRLayoutResult,
    structLayouts: Record<string, IRStructLayout>,
    stack: IRStackFrame,
    globals: Record<string, IRStackSlot>
  ): Uint8Array {
    const buffers: Uint8Array[] = [];
    let pc = 0;
    let sp = 0;
    let bp = 0;
    // Prologue: reserve locals
    if (stack.localsSize > 0) {
      const buf = allocBuffer(6);
      buf.writeInt8(OP_MOVSP, 0);
      buf.writeInt8(0x00, 1);
      buf.writeInt32BE(stack.localsSize, 2);
      buffers.push(buf);
      sp += stack.localsSize;
      pc += buf.length;
    }
    const entrySp = sp;
    for (const instr of fn.instructions) {
      if (instr.op === "label") {
        continue;
      }
      const buf = this.encodeInstruction(
        instr,
        layout.labels,
        pc,
        sp,
        bp,
        entrySp,
        stack,
        structLayouts,
        globals,
        fn.returnSize
      );
      sp = buf.nextSp;
      bp = buf.nextBp;
      buffers.push(buf.buffer);
      pc += buf.buffer.length;
    }
    return concatBuffers(buffers);
  }

  private static resolveVarOffset(
    name: string,
    stack: IRStackFrame,
    globals: Record<string, IRStackSlot>
  ): { slot: IRStackSlot | undefined; isGlobal: boolean } {
    if (stack.locals[name]) return { slot: stack.locals[name], isGlobal: false };
    if (stack.args[name]) return { slot: stack.args[name], isGlobal: false };
    if (globals[name]) return { slot: globals[name], isGlobal: true };
    return { slot: undefined, isGlobal: false };
  }

  private static encodeInstruction(
    instr: IRInstruction,
    labels: IRLabelMap,
    pc: number,
    sp: number,
    bp: number,
    entrySp: number,
    stack: IRStackFrame,
    structLayouts: Record<string, IRStructLayout>,
    globals: Record<string, IRStackSlot>,
    currentFnReturnSize: number
  ): { buffer: Uint8Array; nextSp: number; nextBp: number } {
    let nextSp = sp;
    let nextBp = bp;
    switch (instr.op) {
      case "rsadd": {
        const buf = allocBuffer(2);
        buf.writeInt8(OP_RSADD, 0);
        buf.writeInt8(instr.type.unary, 1);
        nextSp += 4;
        return { buffer: buf, nextSp, nextBp };
      }
      case "movsp": {
        const buf = allocBuffer(6);
        buf.writeInt8(OP_MOVSP, 0);
        buf.writeInt8(0x00, 1);
        buf.writeInt32BE(instr.delta, 2);
        nextSp += instr.delta;
        return { buffer: buf, nextSp, nextBp };
      }
      case "loadconst": {
        if (instr.type.unary === 0x07 || instr.type.value === "vector") {
          // Encode as three floats if possible
          const vals = Array.isArray(instr.value) ? instr.value : [0, 0, 0];
          const buffers: Uint8Array[] = [];
          for (let i = 0; i < 3; i++) {
            const b = allocBuffer(6);
            b.writeInt8(OP_CONST, 0);
            b.writeInt8(0x04, 1); // float
            b.writeFloatBE(typeof vals[i] === "number" ? vals[i] : 0, 2);
            buffers.push(b);
            nextSp += 4;
          }
          return { buffer: concatBuffers(buffers), nextSp, nextBp };
        }
        const buf = allocBuffer(
          instr.type.value === "string" && typeof instr.value === "string"
            ? instr.value.length + 4
            : 6
        );
        buf.writeInt8(OP_CONST, 0);
        buf.writeInt8(instr.type.unary, 1);
        if (instr.type.value === "string" && typeof instr.value === "string") {
          buf.writeInt16BE(instr.value.length, 2);
          for (let i = 0; i < instr.value.length; i++) {
            buf.writeInt8(instr.value.charCodeAt(i), 4 + i);
          }
        } else if (instr.type.value === "float") {
          buf.writeFloatBE(Number(instr.value ?? 0), 2);
        } else {
          buf.writeInt32BE(Number(instr.value ?? 0), 2);
        }
        nextSp += NWScriptIRBuilder.getTypeSize(instr.type);
        return { buffer: buf, nextSp, nextBp };
      }
      case "loadvar": {
        const { slot, isGlobal } = this.resolveVarOffset(instr.varName, stack, globals);
        const size = instr.size ?? slot?.size ?? 4;
        const buf = allocBuffer(8);
        if (isGlobal) {
          buf.writeInt8(OP_CPTOPBP, 0);
          buf.writeInt8(0x01, 1);
          const offset = slot?.offset ?? 0;
          buf.writeInt32BE(offset, 2);
          buf.writeInt16BE(size, 6);
        } else {
          buf.writeInt8(OP_CPTOPSP, 0);
          buf.writeInt8(0x01, 1);
          const offset = (slot?.offset ?? 0) - (sp - entrySp);
          buf.writeInt32BE(offset, 2);
          buf.writeInt16BE(size, 6);
        }
        nextSp += size;
        return { buffer: buf, nextSp, nextBp };
      }
      case "storevar": {
        const { slot, isGlobal } = this.resolveVarOffset(instr.varName, stack, globals);
        const size = instr.size ?? slot?.size ?? 4;
        const buf = allocBuffer(8);
        if (isGlobal) {
          buf.writeInt8(OP_CPDOWNBP, 0);
          buf.writeInt8(0x01, 1);
          const offset = slot?.offset ?? 0;
          buf.writeInt32BE(offset, 2);
          buf.writeInt16BE(size, 6);
        } else {
          buf.writeInt8(OP_CPDOWNSP, 0);
          buf.writeInt8(0x01, 1);
          const offset = (slot?.offset ?? 0) - (sp - entrySp) + size;
          buf.writeInt32BE(offset, 2);
          buf.writeInt16BE(size, 6);
        }
        return { buffer: buf, nextSp, nextBp };
      }
      case "binop": {
        const buf = allocBuffer(2);
        let opcode = OP_ADD;
        switch (instr.kind) {
          case "sub":
            opcode = OP_SUB;
            break;
          case "mul":
            opcode = OP_MUL;
            break;
          case "div":
            opcode = OP_DIV;
            break;
          case "mod":
            opcode = OP_MODII;
            break;
          default:
            opcode = OP_ADD;
            break;
        }
        buf.writeInt8(opcode, 0);
        buf.writeInt8(instr.typeCode ?? 0x20, 1);
        nextSp += -4 - 4 + 4;
        return { buffer: buf, nextSp, nextBp };
      }
      case "compare": {
        const isTT = instr.typeCode === 0x24;
        const buf = allocBuffer(isTT ? 4 : 2);
        let opcode = OP_EQUAL;
        switch (instr.kind) {
          case "ne":
            opcode = OP_NEQUAL;
            break;
          case "gt":
            opcode = OP_GT;
            break;
          case "lt":
            opcode = OP_LT;
            break;
          case "ge":
            opcode = OP_GEQ;
            break;
          case "le":
            opcode = OP_LEQ;
            break;
          default:
            opcode = OP_EQUAL;
            break;
        }
        buf.writeInt8(opcode, 0);
        buf.writeInt8(instr.typeCode ?? 0x20, 1);
        if (isTT && instr.size) {
          buf.writeInt16BE(instr.size, 2);
        }
        nextSp += -4 - 4 + 4;
        return { buffer: buf, nextSp, nextBp };
      }
      case "logic": {
        const buf = allocBuffer(2);
        const opcode = instr.kind === "and" ? OP_LOGANDII : OP_LOGORII;
        buf.writeInt8(opcode, 0);
        buf.writeInt8(instr.typeCode ?? 0x20, 1);
        nextSp += -4 - 4 + 4;
        return { buffer: buf, nextSp, nextBp };
      }
      case "unary": {
        const buf = allocBuffer(2);
        const opcode = instr.kind === "not" ? OP_NOTI : OP_NEG;
        buf.writeInt8(opcode, 0);
        buf.writeInt8(instr.typeCode ?? 0x20, 1);
        // operand consumed, result pushes 4
        nextSp += -4 + 4;
        return { buffer: buf, nextSp, nextBp };
      }
      case "inc":
      case "dec": {
        const buf = allocBuffer(2);
        const opcode = instr.op === "inc" ? OP_INCISP : OP_DECISP;
        buf.writeInt8(opcode, 0);
        buf.writeInt8(0x03, 1);
        // inc/dec leaves stack unchanged
        return { buffer: buf, nextSp, nextBp };
      }
      case "loadfield": {
        const layout =
          (instr.parent && structLayouts[instr.parent]) ||
          (instr.type.value && structLayouts[instr.type.value]) ||
          undefined;
        const fieldInfo = layout?.fields[instr.field];
        const fieldOffset = fieldInfo?.offset ?? 0;
        const fieldSize = fieldInfo?.size ?? NWScriptIRBuilder.getTypeSize(instr.type);
        const structSize = layout?.size ?? fieldSize;
        const buf = allocBuffer(8);
        buf.writeInt8(OP_CPTOPSP, 0);
        buf.writeInt8(0x01, 1);
        // struct is below the top; offset from top into the struct payload
        buf.writeInt32BE(-structSize + fieldOffset, 2);
        buf.writeInt16BE(fieldSize, 6);
        nextSp += fieldSize;
        return { buffer: buf, nextSp, nextBp };
      }
      case "storefield": {
        const layout =
          (instr.parent && structLayouts[instr.parent]) ||
          (instr.type.value && structLayouts[instr.type.value]) ||
          undefined;
        const fieldInfo = layout?.fields[instr.field];
        const fieldSize = fieldInfo?.size ?? NWScriptIRBuilder.getTypeSize(instr.type);
        const structSize = layout?.size ?? fieldSize;
        const fieldOffset = fieldInfo?.offset ?? 0;
        // value is on top, struct is beneath value
        const buf = allocBuffer(8);
        buf.writeInt8(OP_CPDOWNSP, 0);
        buf.writeInt8(0x01, 1);
        buf.writeInt32BE(-(structSize + fieldSize) + fieldOffset, 2);
        buf.writeInt16BE(fieldSize, 6);
        return { buffer: buf, nextSp, nextBp };
      }
      case "loadindex":
      case "storeindex": {
        const vecSize = instr.type.unary === 0x07 || instr.type.value === "vector" ? 12 : 4;
        const eltSize = instr.type.unary === 0x07 || instr.type.value === "vector" ? 4 : instr.type.unary === 0x04 ? 4 : 4;
        const idx = instr.indexLiteral ?? 0;
        if (instr.op === "loadindex") {
          const buf = allocBuffer(8);
          buf.writeInt8(OP_CPTOPSP, 0);
          buf.writeInt8(0x01, 1);
          // stack: [ ... baseVec ][ index ]
          const offset = -(vecSize + 4) + idx * eltSize;
          buf.writeInt32BE(offset, 2);
          buf.writeInt16BE(eltSize, 6);
          nextSp += eltSize;
          return { buffer: buf, nextSp, nextBp };
        } else {
          const buf = allocBuffer(8);
          buf.writeInt8(OP_CPDOWNSP, 0);
          buf.writeInt8(0x01, 1);
          // stack: [ ... baseVec ][ index ][ value ]
          const offset = -(vecSize + 4 + eltSize) + idx * eltSize;
          buf.writeInt32BE(offset, 2);
          buf.writeInt16BE(eltSize, 6);
          return { buffer: buf, nextSp, nextBp };
        }
      }
      case "cpdownsp": {
        const buf = allocBuffer(8);
        buf.writeInt8(OP_CPDOWNSP, 0);
        buf.writeInt8(0x01, 1);
        buf.writeInt32BE(instr.offset, 2);
        buf.writeInt16BE(instr.size, 6);
        return { buffer: buf, nextSp, nextBp };
      }
      case "jsr": {
        const buf = allocBuffer(6);
        buf.writeInt8(OP_JSR, 0);
        const target = labels[instr.target] ?? 0;
        const disp = target - (pc + buf.length);
        buf.writeInt32BE(disp, 2);
        return { buffer: buf, nextSp, nextBp };
      }
      case "jmp":
      case "jz":
      case "jnz": {
        const buf = allocBuffer(6);
        const opcode = instr.op === "jmp" ? OP_JMP : instr.op === "jz" ? OP_JZ : OP_JNZ;
        buf.writeInt8(opcode, 0);
        const target = labels[instr.target] ?? 0;
        const disp = target - (pc + buf.length);
        buf.writeInt32BE(disp, 2);
        return { buffer: buf, nextSp, nextBp };
      }
      case "action": {
        const buf = allocBuffer(5);
        buf.writeInt8(OP_ACTION, 0);
        buf.writeInt8(0x00, 1);
        buf.writeUInt16BE(instr.id, 2);
        buf.writeInt8(instr.argc, 4);
        nextSp += instr.returnSize - instr.argSize;
        return { buffer: buf, nextSp, nextBp };
      }
      case "store_state": {
        // Size globals: globals offsets are negative; capture total span
        const minGlobal = Math.min(0, ...Object.values(globals || {}).map((g) => g.offset));
        const bStackSize = (instr as any).bStackSize ?? -minGlobal;
        const stackSize = (instr as any).stackSize ?? (sp - entrySp);
        const buf = allocBuffer(6);
        buf.writeInt8(OP_STORE_STATE, 0);
        buf.writeInt8(0x00, 1);
        buf.writeInt16BE(bStackSize, 2);
        buf.writeInt16BE(stackSize, 4);
        return { buffer: buf, nextSp, nextBp };
      }
      case "return": {
        const bufs: Uint8Array[] = [];
        // Restore BP
        {
          const b = allocBuffer(2);
          b.writeInt8(OP_RESTOREBP, 0);
          b.writeInt8(0x00, 1);
          bufs.push(b);
        }
        if (stack.localsSize > 0) {
          const m = allocBuffer(6);
          m.writeInt8(OP_MOVSP, 0);
          m.writeInt8(0x00, 1);
          m.writeInt32BE(-stack.localsSize, 2);
          bufs.push(m);
        }
        const r = allocBuffer(2);
        r.writeInt8(OP_RETN, 0);
        r.writeInt8(0x00, 1);
        bufs.push(r);
        nextSp = 0;
        nextBp = 0;
        return { buffer: concatBuffers(bufs), nextSp, nextBp };
      }
      case "nop":
      default: {
        const buf = allocBuffer(1);
        buf.writeInt8(OP_NOP, 0);
        return { buffer: buf, nextSp, nextBp };
      }
    }
  }

  private static getTypeCodeFromNode(dt: any, fallback: number): number {
    if (!dt || typeof dt !== "object") return fallback;
    const val = dt.value ?? dt;
    switch (val) {
      case "int":
        return 0x20; // II
      case "float":
        return 0x21; // FF
      case "object":
        return 0x22; // OO
      case "string":
        return 0x23; // SS
      case "vector":
        return 0x3A; // VV
      default:
        // engine/struct types default to int-size compare/add variants
        return fallback;
    }
  }

  private static getBinaryOpTypeCode(op: string, left: any, right: any): number {
    const l = left?.value ?? left;
    const r = right?.value ?? right;
    // Mixed numeric cases
    if (op === "mul" || op === "div") {
      if (l === "vector" && r === "float") return 0x3B; // VF
      if (l === "float" && r === "vector") return 0x3C; // FV
    }
    if (l === "vector" && r === "vector") return 0x3A; // VV
    if (l === "int" && r === "float") return 0x25; // IF
    if (l === "float" && r === "int") return 0x26; // FI
    if (l === "float" && r === "float") return 0x21; // FF
    if (l === "string" && r === "string") return 0x23; // SS
    if (l === "object" && r === "object") return 0x22; // OO
    if (typeof left?.unary === "number" && left.unary >= 0x30 && left.unary <= 0x39) return left.unary; // engine
    if (typeof right?.unary === "number" && right.unary >= 0x30 && right.unary <= 0x39) return right.unary;
    return 0x20; // default int/int
  }

  private static getCompareTypeInfo(left: any, right: any, dt: any): { typeCode: number; size?: number } {
    const l = left?.value ?? left;
    const r = right?.value ?? right;
    const base = dt?.value ?? dt;
    // Engine type support
    if (typeof dt?.unary === "number" && dt.unary >= 0x30 && dt.unary <= 0x39) return { typeCode: dt.unary };
    if (typeof left?.unary === "number" && left.unary >= 0x30 && left.unary <= 0x39)
      return { typeCode: left.unary };
    if (typeof right?.unary === "number" && right.unary >= 0x30 && right.unary <= 0x39)
      return { typeCode: right.unary };

    // Struct/vector => TT with size
    if (l === "vector" || r === "vector" || base === "vector") return { typeCode: 0x24, size: 12 };
    if (base === "struct") return { typeCode: 0x24, size: dt?.size ?? 0 };

    // Standard types
    if (l === "float" || r === "float" || base === "float") return { typeCode: 0x21 };
    if (l === "object" || r === "object" || base === "object") return { typeCode: 0x22 };
    if (l === "string" || r === "string" || base === "string") return { typeCode: 0x23 };

    return { typeCode: 0x20 };
  }

  private static getUnaryTypeCode(op: string, dt: any): number {
    const val = dt?.value ?? dt;
    if (op === "not") return 0x03; // NOTI uses int
    if (val === "float") return 0x04; // NEGF
    return 0x03; // default int
  }
}

