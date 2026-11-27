import {
  NWScriptASTNodeType,
  type NWScriptASTNode,
  type NWScriptBlockNode,
  type NWScriptFunctionNode,
  type NWScriptIfNode,
  type NWScriptIfElseNode,
  type NWScriptWhileNode,
  type NWScriptDoWhileNode,
  type NWScriptForNode,
  type NWScriptSwitchNode,
  type NWScriptProgramNode,
} from "@core/nwscript/decompiler/NWScriptAST";
import { NWScriptExpression, NWScriptExpressionType } from "@core/nwscript/decompiler/NWScriptExpression";
import type { NWScriptControlFlowGraph } from "@core/nwscript/decompiler/NWScriptControlFlowGraph";
import type { NWScriptFunction } from "@core/nwscript/decompiler/NWScriptFunctionAnalyzer";
import {
  collectCalleeEntryPcsFromStoreStateThunks,
  collectCalleeEntryPcsReachableFromBlock,
  collectCalleeEntryPcsTransitiveFromMainFamily,
} from "@core/nwscript/decompiler/NWScriptCallGraphReachability";
import { refineNwscriptAstFunctionParameterTypes } from "@core/nwscript/decompiler/NWScriptDecompilerTypeRefinementPass";
import { applyNwscriptNameInference } from "@core/nwscript/decompiler/NWScriptNameInferencePass";

export interface NwscriptDecompilerCleanupContext {
  cfg: NWScriptControlFlowGraph;
  functions: NWScriptFunction[];
}

/**
 * Optional AST cleanup after ControlNode conversion (analogous to NCSDecomp {@code CleanupPass}).
 * Currently: infer BioWare-style identifier names, fold straight-line call/const
 * initializers onto declarations, drop subroutine definitions that are never invoked
 * from script entry or transitively from {@code main}/{@code StartingConditional}
 * (so uncalled junk subs do not appear in NSS).
 */
export function applyNwscriptDecompilerCleanup(
  ast: NWScriptProgramNode,
  ctx?: NwscriptDecompilerCleanupContext
): void {
  if (ctx) {
    refineNwscriptAstFunctionParameterTypes(ast, ctx.functions);
  }
  applyNwscriptNameInference(ast);
  for (const fn of ast.functions) {
    cleanupFunctionBody(fn);
  }

  if (!ctx) {
    return;
  }
  const { cfg, functions } = ctx;
  const fromEntry = collectCalleeEntryPcsReachableFromBlock(cfg, cfg.entryBlock);
  const fromMainFamily = collectCalleeEntryPcsTransitiveFromMainFamily(functions);
  const fromStoreStateThunks = collectCalleeEntryPcsFromStoreStateThunks(cfg.script);
  const emitEntryPcs = new Set<number>([
    ...fromEntry,
    ...fromMainFamily,
    ...fromStoreStateThunks,
  ]);
  const referencedFunctionNames = collectReferencedFunctionNames(ast, emitEntryPcs);

  ast.functions = ast.functions.filter((fn) => {
    if (fn.type !== NWScriptASTNodeType.FUNCTION) {
      return true;
    }
    if (fn.name === "main" || fn.name === "StartingConditional") {
      return true;
    }
    if (referencedFunctionNames.has(fn.name)) {
      return true;
    }
    const pc = fn.entryBlock?.startInstruction.address;
    if (pc === undefined) {
      return true;
    }
    return emitEntryPcs.has(pc);
  });
}

/**
 * Calls captured inside STORE_STATE action thunks are intentionally outside normal CFG
 * reachability. Keep every transitive user routine referenced by the recovered AST so cleanup
 * can never leave an undefined `subN(...)` call behind.
 */
function collectReferencedFunctionNames(
  ast: NWScriptProgramNode,
  rootEntryPcs: ReadonlySet<number>
): Set<string> {
  const functionsByName = new Map(ast.functions.map(fn => [fn.name, fn]));
  const referenced = new Set<string>();
  const visitedFunctions = new Set<string>();

  const visitExpression = (expression: NWScriptExpression | undefined): void => {
    if (!expression) return;
    if (expression.type === NWScriptExpressionType.FUNCTION_CALL) {
      if (functionsByName.has(expression.functionName)) {
        referenced.add(expression.functionName);
      }
      for (const argument of expression.arguments) visitExpression(argument);
    }
    visitExpression(expression.left ?? undefined);
    visitExpression(expression.right ?? undefined);
    for (const component of expression.components) visitExpression(component);
  };

  const visitNode = (node: NWScriptASTNode): void => {
    const expressionFields = node as unknown as {
      condition?: NWScriptExpression;
      expression?: NWScriptExpression;
      value?: NWScriptExpression;
      initializer?: NWScriptExpression;
    };
    visitExpression(expressionFields.condition);
    visitExpression(expressionFields.expression);
    visitExpression(expressionFields.value);
    visitExpression(expressionFields.initializer);
    for (const child of node.children) visitNode(child);
  };

  for (const global of ast.globals) visitNode(global);
  if (ast.mainBody) visitNode(ast.mainBody);
  for (const fn of ast.functions) {
    const entryPc = fn.entryBlock?.startInstruction.address;
    if (
      fn.name === "main" ||
      fn.name === "StartingConditional" ||
      (entryPc !== undefined && rootEntryPcs.has(entryPc))
    ) {
      visitNode(fn);
    }
  }

  const pending = [...referenced];
  while (pending.length > 0) {
    const name = pending.pop()!;
    if (visitedFunctions.has(name)) continue;
    visitedFunctions.add(name);
    const before = new Set(referenced);
    const fn = functionsByName.get(name);
    if (fn) visitNode(fn);
    for (const discovered of referenced) {
      if (!before.has(discovered)) pending.push(discovered);
    }
  }
  return referenced;
}

function cleanupFunctionBody(fn: NWScriptFunctionNode): void {
  cleanupBlock(fn.body);
  const last = fn.body.statements[fn.body.statements.length - 1];
  if (
    last?.type === NWScriptASTNodeType.RETURN &&
    !(last as { value?: unknown }).value
  ) {
    // RETN has no source-level value operand. For non-void procedures the compiler writes the
    // result into the caller reservation in a predecessor and still shares the same terminal
    // RETN block; the converter already emitted `return value` at that CPDOWNSP. A trailing bare
    // return is therefore epilogue scaffolding (and is illegal NSS in a non-void function).
    fn.body.statements.pop();
    fn.body.children = [...fn.body.statements];
  }
}

/** Remove bytecode-level epilogues after an unconditional source-level terminator. */
function cleanupBlock(block: NWScriptBlockNode): void {
  const kept: NWScriptASTNode[] = [];
  for (const statement of block.statements) {
    cleanupNestedBlocks(statement);
    kept.push(statement);
    if (statementAlwaysTerminates(statement)) {
      break;
    }
  }
  block.statements = kept;
  block.children = [...kept];
}

function statementAlwaysTerminates(statement: NWScriptASTNode): boolean {
  if (
    statement.type === NWScriptASTNodeType.RETURN ||
    statement.type === NWScriptASTNodeType.BREAK ||
    statement.type === NWScriptASTNodeType.CONTINUE
  ) {
    return true;
  }
  if (statement.type === NWScriptASTNodeType.IF_ELSE) {
    const branch = statement as NWScriptIfElseNode;
    return blockAlwaysTerminates(branch.thenBody) && blockAlwaysTerminates(branch.elseBody);
  }
  return false;
}

function blockAlwaysTerminates(block: NWScriptBlockNode): boolean {
  const last = block.statements[block.statements.length - 1];
  return last !== undefined && statementAlwaysTerminates(last);
}

function cleanupNestedBlocks(node: NWScriptASTNode): void {
  switch (node.type) {
    case NWScriptASTNodeType.IF:
      cleanupBlock((node as NWScriptIfNode).thenBody);
      break;
    case NWScriptASTNodeType.IF_ELSE: {
      const ifElse = node as NWScriptIfElseNode;
      cleanupBlock(ifElse.thenBody);
      cleanupBlock(ifElse.elseBody);
      break;
    }
    case NWScriptASTNodeType.WHILE:
      cleanupBlock((node as NWScriptWhileNode).body);
      break;
    case NWScriptASTNodeType.DO_WHILE:
      cleanupBlock((node as NWScriptDoWhileNode).body);
      break;
    case NWScriptASTNodeType.FOR: {
      const forNode = node as NWScriptForNode;
      cleanupBlock(forNode.body);
      if (forNode.init?.type === NWScriptASTNodeType.BLOCK) {
        cleanupBlock(forNode.init as NWScriptBlockNode);
      }
      if (forNode.increment?.type === NWScriptASTNodeType.BLOCK) {
        cleanupBlock(forNode.increment as NWScriptBlockNode);
      }
      break;
    }
    case NWScriptASTNodeType.SWITCH: {
      const switchNode = node as NWScriptSwitchNode;
      for (const switchCase of switchNode.cases) cleanupBlock(switchCase.body);
      if (switchNode.defaultCase) cleanupBlock(switchNode.defaultCase.body);
      break;
    }
    case NWScriptASTNodeType.BLOCK:
      cleanupBlock(node as NWScriptBlockNode);
      break;
  }
}
