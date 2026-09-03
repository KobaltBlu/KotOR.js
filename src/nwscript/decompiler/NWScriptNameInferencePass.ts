import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import {
  NWScriptASTNodeType,
  type NWScriptASTNode,
  type NWScriptAssignmentNode,
  type NWScriptBlockNode,
  type NWScriptDoWhileNode,
  type NWScriptExpressionStatementNode,
  type NWScriptForNode,
  type NWScriptFunctionNode,
  type NWScriptGlobalVariableDeclarationNode,
  type NWScriptIfElseNode,
  type NWScriptIfNode,
  type NWScriptProgramNode,
  type NWScriptReturnNode,
  type NWScriptSwitchNode,
  type NWScriptVariableDeclarationNode,
  type NWScriptWhileNode,
} from "@/nwscript/decompiler/NWScriptAST";
import {
  nwscriptEngineActionStem,
  nwscriptEngineNameHint,
} from "@/nwscript/decompiler/NWScriptEngineNameHints";
import { NWScriptExpression, NWScriptExpressionType } from "@/nwscript/decompiler/NWScriptExpression";
import {
  nwscriptComposeHungarianName,
  nwscriptFallbackStem,
  nwscriptHungarianPrefix,
  nwscriptParseInternalVariableName,
  nwscriptSplitFieldAccess,
  nwscriptTagToPascalStem,
  nwscriptUniqueIdentifier,
  type NWScriptIdentifierKind,
} from "@/nwscript/decompiler/NWScriptHungarian";

/**
 * DeNCS-style identifier inference after ControlNode conversion.
 *
 * Converter/simulator still emit localVar_i / globalVar_i / intParamN. This pass remaps those
 * identifiers using hungarian type prefixes and assignment/call evidence, then folds a
 * straight-line first assignment onto the matching declaration when it is not control-dependent.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file NWScriptNameInferencePass.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

interface NamedSlot {
  originalName: string;
  dataType: NWScriptDataType;
  kind: NWScriptIdentifierKind;
  index: number;
}

const AMBIGUOUS = Symbol("ambiguous");

type StemEvidence = string | typeof AMBIGUOUS;

export function applyNwscriptNameInference(ast: NWScriptProgramNode): void {
  const reserved = collectReservedNames(ast);
  const globalMap = renameGlobals(ast, reserved);
  for (const func of ast.functions) {
    renameFunctionIdentifiers(func, ast, globalMap, reserved);
    foldStraightLineDeclarationInitializers(func);
  }
}

function collectReservedNames(ast: NWScriptProgramNode): Set<string> {
  const reserved = new Set<string>();
  for (const func of ast.functions) reserved.add(func.name);
  for (const struct of ast.structs ?? []) reserved.add(struct.name);
  return reserved;
}

function renameGlobals(
  ast: NWScriptProgramNode,
  reserved: Set<string>
): Map<string, string> {
  const slots: NamedSlot[] = [];
  for (const decl of ast.globals) {
    const parsed = nwscriptParseInternalVariableName(decl.name);
    if (!parsed || parsed.kind !== "global") continue;
    slots.push({
      originalName: decl.name,
      dataType: decl.dataType,
      kind: "global",
      index: parsed.index,
    });
  }
  const stems = collectProgramStems(ast, new Set(slots.map(slot => slot.originalName)));
  const taken = new Set(reserved);
  const rename = uniquifySlots(slots, stems, taken);
  applyRenameToGlobals(ast, rename);
  return rename;
}

function renameFunctionIdentifiers(
  func: NWScriptFunctionNode,
  ast: NWScriptProgramNode,
  globalMap: Map<string, string>,
  reserved: Set<string>
): void {
  const slots: NamedSlot[] = [];
  for (const param of func.parameters) {
    const parsed = nwscriptParseInternalVariableName(param.name);
    if (!parsed || parsed.kind !== "param") continue;
    slots.push({
      originalName: param.name,
      dataType: param.type,
      kind: "param",
      index: parsed.index,
    });
  }
  for (const decl of func.locals) {
    const parsed = nwscriptParseInternalVariableName(decl.name);
    if (!parsed || parsed.kind !== "local") continue;
    slots.push({
      originalName: decl.name,
      dataType: decl.dataType,
      kind: "local",
      index: parsed.index,
    });
  }
  const originalNames = new Set(slots.map(slot => slot.originalName));
  const stems = collectFunctionStems(func, originalNames);
  applyParameterUsageStems(func, slots, stems);
  const taken = new Set([...reserved, ...globalMap.values()]);
  const rename = uniquifySlots(slots, stems, taken);
  for (const param of func.parameters) {
    const next = rename.get(param.name);
    if (next) param.name = next;
  }
  for (const decl of func.locals) {
    const next = rename.get(decl.name);
    if (next) decl.name = next;
    if (decl.initializer) remapExpression(decl.initializer, rename, globalMap);
  }
  visitNodeForRename(func.body, rename, globalMap);
}

function uniquifySlots(
  slots: NamedSlot[],
  stems: Map<string, StemEvidence>,
  taken: Set<string>
): Map<string, string> {
  const rename = new Map<string, string>();
  for (const slot of slots) {
    const stem = stems.get(slot.originalName);
    const inferred =
      typeof stem === "string"
        ? nwscriptComposeHungarianName(slot.dataType, stem)
        : undefined;
    const fallback = fallbackName(slot);
    const desired = inferred ?? fallback;
    const unique = nwscriptUniqueIdentifier(desired, taken);
    taken.add(unique);
    rename.set(slot.originalName, unique);
  }
  return rename;
}

function fallbackName(slot: NamedSlot): string {
  return `${nwscriptHungarianPrefix(slot.dataType)}${nwscriptFallbackStem(slot.kind)}${slot.index}`;
}

function collectProgramStems(
  ast: NWScriptProgramNode,
  names: Set<string>
): Map<string, StemEvidence> {
  const stems = new Map<string, StemEvidence>();
  for (const decl of ast.globals) {
    if (!names.has(decl.name) || !decl.initializer) continue;
    recordStem(stems, decl.name, stemFromExpression(decl.initializer, decl.dataType));
  }
  for (const func of ast.functions) {
    visitNodeForStems(func.body, names, stems, true);
  }
  return stems;
}

function collectFunctionStems(
  func: NWScriptFunctionNode,
  names: Set<string>
): Map<string, StemEvidence> {
  const stems = new Map<string, StemEvidence>();
  for (const decl of func.locals) {
    if (!names.has(decl.name) || !decl.initializer) continue;
    recordStem(stems, decl.name, stemFromExpression(decl.initializer, decl.dataType));
  }
  visitNodeForStems(func.body, names, stems, false);
  return stems;
}

function applyParameterUsageStems(
  func: NWScriptFunctionNode,
  slots: NamedSlot[],
  stems: Map<string, StemEvidence>
): void {
  const paramNames = new Set(
    slots.filter(slot => slot.kind === "param").map(slot => slot.originalName)
  );
  if (paramNames.size === 0) return;
  const usage = new Map<string, { roles: Set<string>; other: boolean }>();
  const visit = (expression: NWScriptExpression | undefined): void => {
    if (!expression) return;
    if (expression.type === NWScriptExpressionType.FUNCTION_CALL) {
      const hint = nwscriptEngineNameHint(expression.functionName);
      for (let index = 0; index < expression.arguments.length; index += 1) {
        const argument = expression.arguments[index];
        visit(argument);
        if (argument.type !== NWScriptExpressionType.VARIABLE) continue;
        if (argument.isGlobal) continue;
        const { base } = nwscriptSplitFieldAccess(argument.variableName);
        if (!paramNames.has(base)) continue;
        const record = usage.get(base) ?? { roles: new Set<string>(), other: false };
        if (
          hint?.seedArgIndex === index &&
          hint.seedRole &&
          argument.dataType === NWScriptDataType.STRING
        ) {
          record.roles.add(hint.seedRole);
        } else {
          record.other = true;
        }
        usage.set(base, record);
      }
    }
    visit(expression.left ?? undefined);
    visit(expression.right ?? undefined);
    for (const component of expression.components) visit(component);
  };
  visitNodeExpressions(func.body, visit);
  for (const decl of func.locals) visit(decl.initializer);
  for (const slot of slots) {
    if (slot.kind !== "param") continue;
    if (stems.has(slot.originalName)) continue;
    const record = usage.get(slot.originalName);
    if (!record || record.other || record.roles.size !== 1) continue;
    recordStem(stems, slot.originalName, Array.from(record.roles)[0]);
  }
}

function recordStem(
  stems: Map<string, StemEvidence>,
  name: string,
  stem: string | undefined
): void {
  if (!stem) return;
  const existing = stems.get(name);
  if (existing === undefined) {
    stems.set(name, stem);
    return;
  }
  if (existing === AMBIGUOUS) return;
  if (existing !== stem) stems.set(name, AMBIGUOUS);
}

function stemFromExpression(
  expression: NWScriptExpression,
  dataType: NWScriptDataType
): string | undefined {
  if (expression.type === NWScriptExpressionType.CONSTANT) {
    if (dataType !== NWScriptDataType.STRING) return undefined;
    if (typeof expression.value !== "string") return undefined;
    return nwscriptTagToPascalStem(expression.value);
  }
  if (expression.type !== NWScriptExpressionType.FUNCTION_CALL) return undefined;
  return stemFromFunctionCall(expression);
}

function stemFromFunctionCall(expression: NWScriptExpression): string | undefined {
  const hint = nwscriptEngineNameHint(expression.functionName);
  if (hint?.seedArgIndex !== undefined) {
    const argument = expression.arguments[hint.seedArgIndex];
    if (
      argument?.type === NWScriptExpressionType.CONSTANT &&
      typeof argument.value === "string"
    ) {
      const fromTag = nwscriptTagToPascalStem(argument.value);
      if (fromTag) return fromTag;
    }
  }
  return nwscriptEngineActionStem(expression.functionName);
}

function visitNodeForStems(
  node: NWScriptASTNode,
  names: Set<string>,
  stems: Map<string, StemEvidence>,
  globalsOnly: boolean
): void {
  if (node.type === NWScriptASTNodeType.ASSIGNMENT) {
    const assignment = node as NWScriptAssignmentNode;
    const { base, suffix } = nwscriptSplitFieldAccess(assignment.variable);
    if (!suffix && names.has(base) && assignment.isGlobal === globalsOnly) {
      recordStem(stems, base, stemFromExpression(assignment.value, assignment.value.dataType));
    }
    return;
  }
  if (node.type === NWScriptASTNodeType.EXPRESSION_STATEMENT) {
    const statement = node as NWScriptExpressionStatementNode;
    const assignment = unwrapAssignmentExpression(statement.expression);
    if (assignment) {
      const { base, suffix } = nwscriptSplitFieldAccess(assignment.variable);
      if (!suffix && names.has(base) && assignment.isGlobal === globalsOnly) {
        recordStem(stems, base, stemFromExpression(assignment.value, assignment.value.dataType));
      }
    }
  }
  visitChildNodes(node, child => visitNodeForStems(child, names, stems, globalsOnly));
}

function unwrapAssignmentExpression(
  expression: NWScriptExpression
): { variable: string; value: NWScriptExpression; isGlobal: boolean } | undefined {
  if (expression.type !== NWScriptExpressionType.ASSIGNMENT || !expression.left || !expression.right) {
    return undefined;
  }
  if (expression.left.type !== NWScriptExpressionType.VARIABLE) return undefined;
  return {
    variable: expression.left.variableName,
    value: expression.right,
    isGlobal: expression.left.isGlobal,
  };
}

function applyRenameToGlobals(ast: NWScriptProgramNode, rename: Map<string, string>): void {
  const emptyLocal = new Map<string, string>();
  for (const decl of ast.globals) {
    const next = rename.get(decl.name);
    if (next) decl.name = next;
    if (decl.initializer) remapExpression(decl.initializer, emptyLocal, rename);
  }
  for (const func of ast.functions) {
    visitNodeForRename(func.body, emptyLocal, rename);
    for (const decl of func.locals) {
      if (decl.initializer) remapExpression(decl.initializer, emptyLocal, rename);
    }
  }
}

function visitNodeForRename(
  node: NWScriptASTNode,
  localMap: Map<string, string>,
  globalMap: Map<string, string>
): void {
  if (node.type === NWScriptASTNodeType.ASSIGNMENT) {
    const assignment = node as NWScriptAssignmentNode;
    assignment.variable = remapAccess(assignment.variable, assignment.isGlobal ? globalMap : localMap);
    remapExpression(assignment.value, localMap, globalMap);
    return;
  }
  visitNodeExpressions(node, expression => remapExpression(expression, localMap, globalMap));
  visitChildNodes(node, child => visitNodeForRename(child, localMap, globalMap));
}

function remapAccess(name: string, map: Map<string, string>): string {
  const { base, suffix } = nwscriptSplitFieldAccess(name);
  const next = map.get(base);
  return next ? `${next}${suffix}` : name;
}

function remapExpression(
  expression: NWScriptExpression,
  localMap: Map<string, string>,
  globalMap: Map<string, string>
): void {
  if (expression.type === NWScriptExpressionType.VARIABLE) {
    expression.variableName = remapAccess(
      expression.variableName,
      expression.isGlobal ? globalMap : localMap
    );
  }
  if (expression.left) remapExpression(expression.left, localMap, globalMap);
  if (expression.right) remapExpression(expression.right, localMap, globalMap);
  for (const argument of expression.arguments) remapExpression(argument, localMap, globalMap);
  for (const component of expression.components) remapExpression(component, localMap, globalMap);
}

function foldStraightLineDeclarationInitializers(func: NWScriptFunctionNode): void {
  const declarations = new Map(func.locals.map(decl => [decl.name, decl]));
  const folded = new Set<string>();
  const kept: NWScriptASTNode[] = [];
  let inPrefix = true;
  for (const statement of func.body.statements) {
    if (!inPrefix) {
      kept.push(statement);
      continue;
    }
    const assignment = asFoldableAssignment(statement);
    if (!assignment) {
      inPrefix = false;
      kept.push(statement);
      continue;
    }
    const declaration = !assignment.isGlobal ? declarations.get(assignment.variable) : undefined;
    if (
      !declaration ||
      declaration.initializer ||
      folded.has(assignment.variable) ||
      assignment.value.type !== NWScriptExpressionType.FUNCTION_CALL ||
      expressionUsesName(assignment.value, assignment.variable)
    ) {
      inPrefix = false;
      kept.push(statement);
      continue;
    }
    declaration.initializer = assignment.value;
    folded.add(assignment.variable);
  }
  if (folded.size === 0) return;
  func.body.statements = kept;
  func.body.children = [...kept];
}

function asFoldableAssignment(
  statement: NWScriptASTNode
): { variable: string; value: NWScriptExpression; isGlobal: boolean } | undefined {
  if (statement.type === NWScriptASTNodeType.ASSIGNMENT) {
    const assignment = statement as NWScriptAssignmentNode;
    if (nwscriptSplitFieldAccess(assignment.variable).suffix) return undefined;
    return {
      variable: assignment.variable,
      value: assignment.value,
      isGlobal: assignment.isGlobal,
    };
  }
  if (statement.type === NWScriptASTNodeType.EXPRESSION_STATEMENT) {
    const unwrapped = unwrapAssignmentExpression(
      (statement as NWScriptExpressionStatementNode).expression
    );
    if (!unwrapped || nwscriptSplitFieldAccess(unwrapped.variable).suffix) return undefined;
    return unwrapped;
  }
  return undefined;
}

function expressionUsesName(expression: NWScriptExpression, name: string): boolean {
  if (expression.type === NWScriptExpressionType.VARIABLE) {
    return nwscriptSplitFieldAccess(expression.variableName).base === name;
  }
  if (expression.left && expressionUsesName(expression.left, name)) return true;
  if (expression.right && expressionUsesName(expression.right, name)) return true;
  for (const argument of expression.arguments) {
    if (expressionUsesName(argument, name)) return true;
  }
  for (const component of expression.components) {
    if (expressionUsesName(component, name)) return true;
  }
  return false;
}

function visitNodeExpressions(
  node: NWScriptASTNode,
  visit: (expression: NWScriptExpression) => void
): void {
  switch (node.type) {
    case NWScriptASTNodeType.EXPRESSION_STATEMENT:
      visit((node as NWScriptExpressionStatementNode).expression);
      break;
    case NWScriptASTNodeType.ASSIGNMENT:
      visit((node as NWScriptAssignmentNode).value);
      break;
    case NWScriptASTNodeType.RETURN: {
      const value = (node as NWScriptReturnNode).value;
      if (value) visit(value);
      break;
    }
    case NWScriptASTNodeType.IF:
      visit((node as NWScriptIfNode).condition);
      break;
    case NWScriptASTNodeType.IF_ELSE:
      visit((node as NWScriptIfElseNode).condition);
      break;
    case NWScriptASTNodeType.WHILE:
      visit((node as NWScriptWhileNode).condition);
      break;
    case NWScriptASTNodeType.DO_WHILE:
      visit((node as NWScriptDoWhileNode).condition);
      break;
    case NWScriptASTNodeType.FOR: {
      const forNode = node as NWScriptForNode;
      if (forNode.condition) visit(forNode.condition);
      break;
    }
    case NWScriptASTNodeType.SWITCH:
      visit((node as NWScriptSwitchNode).expression);
      break;
    case NWScriptASTNodeType.VARIABLE_DECLARATION: {
      const initializer = (node as NWScriptVariableDeclarationNode).initializer;
      if (initializer) visit(initializer);
      break;
    }
    case NWScriptASTNodeType.GLOBAL_VARIABLE_DECLARATION: {
      const initializer = (node as NWScriptGlobalVariableDeclarationNode).initializer;
      if (initializer) visit(initializer);
      break;
    }
    default:
      break;
  }
}

function visitChildNodes(node: NWScriptASTNode, visit: (child: NWScriptASTNode) => void): void {
  switch (node.type) {
    case NWScriptASTNodeType.IF: {
      const branch = node as NWScriptIfNode;
      visit(branch.thenBody);
      if (branch.elseBody) visit(branch.elseBody);
      break;
    }
    case NWScriptASTNodeType.IF_ELSE: {
      const branch = node as NWScriptIfElseNode;
      visit(branch.thenBody);
      visit(branch.elseBody);
      break;
    }
    case NWScriptASTNodeType.WHILE:
      visit((node as NWScriptWhileNode).body);
      break;
    case NWScriptASTNodeType.DO_WHILE:
      visit((node as NWScriptDoWhileNode).body);
      break;
    case NWScriptASTNodeType.FOR: {
      const forNode = node as NWScriptForNode;
      if (forNode.init) visit(forNode.init);
      if (forNode.increment) visit(forNode.increment);
      visit(forNode.body);
      break;
    }
    case NWScriptASTNodeType.SWITCH: {
      const switchNode = node as NWScriptSwitchNode;
      for (const switchCase of switchNode.cases) visit(switchCase.body);
      if (switchNode.defaultCase) visit(switchNode.defaultCase.body);
      break;
    }
    case NWScriptASTNodeType.BLOCK:
      for (const statement of (node as NWScriptBlockNode).statements) visit(statement);
      break;
    default:
      for (const child of node.children ?? []) visit(child);
      break;
  }
}
