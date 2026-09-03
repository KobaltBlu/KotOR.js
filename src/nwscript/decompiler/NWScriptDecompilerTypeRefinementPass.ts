import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import {
  type NWScriptASTNode,
  type NWScriptFunctionNode,
  type NWScriptProgramNode,
} from "@/nwscript/decompiler/NWScriptAST";
import {
  NWScriptExpression,
  NWScriptExpressionType,
} from "@/nwscript/decompiler/NWScriptExpression";
import type {
  NWScriptFunction,
  NWScriptFunctionParameter as AnalyzedParameter,
} from "@/nwscript/decompiler/NWScriptFunctionAnalyzer";
import { stackSlotsForDataType } from "@/nwscript/decompiler/NWScriptOpcodeSemantics";

interface ParameterSite {
  ast: NWScriptFunctionNode["parameters"][number];
  analyzed?: AnalyzedParameter;
}

/**
 * Reconcile scalar formal types after ControlNode conversion.
 *
 * Four-byte CPTOPSP/CPTOPBP instructions do not retain their source-language type. Typed ACTION
 * consumers can therefore refine a callee only while its body is being converted. When an
 * earlier-emitted caller merely forwards that value, its AST signature has already captured the
 * original integer placeholder. Treat direct parameter forwarding at user JSRs as an equality
 * constraint and propagate the one authoritative non-integer type through each connected set.
 *
 * This is deliberately conservative: incompatible non-integer evidence leaves the component
 * unchanged, and differently-sized formals are never joined.
 */
export function refineNwscriptAstFunctionParameterTypes(
  ast: NWScriptProgramNode,
  functions: NWScriptFunction[]
): void {
  const astFunctions = new Map(ast.functions.map(func => [func.name, func]));
  const analyzedFunctions = new Map(functions.map(func => [func.name, func]));
  const sites = new Map<string, ParameterSite>();
  const parent = new Map<string, string>();

  const keyFor = (functionName: string, index: number): string => `${functionName}:${index}`;
  const find = (key: string): string => {
    const current = parent.get(key) ?? key;
    if (current === key) {
      parent.set(key, key);
      return key;
    }
    const root = find(current);
    parent.set(key, root);
    return root;
  };
  const union = (left: string, right: string): void => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
  };

  for (const astFunction of ast.functions) {
    const analyzed = analyzedFunctions.get(astFunction.name);
    for (let index = 0; index < astFunction.parameters.length; index += 1) {
      const key = keyFor(astFunction.name, index);
      const analyzedParameter = analyzed?.parameters[index];
      // Conversion-time ACTION evidence mutates the analyzer model. Copy it into function nodes
      // that may have been materialized earlier in address order.
      if (analyzedParameter) astFunction.parameters[index].type = analyzedParameter.dataType;
      sites.set(key, { ast: astFunction.parameters[index], analyzed: analyzedParameter });
      parent.set(key, key);
    }
  }

  const visitExpression = (
    caller: NWScriptFunctionNode,
    expression: NWScriptExpression | undefined
  ): void => {
    if (!expression) return;
    if (expression.type === NWScriptExpressionType.FUNCTION_CALL) {
      const callee = astFunctions.get(expression.functionName);
      if (callee) {
        for (
          let index = 0;
          index < Math.min(expression.arguments.length, callee.parameters.length);
          index += 1
        ) {
          const argument = expression.arguments[index];
          if (argument.type !== NWScriptExpressionType.VARIABLE) continue;
          const callerIndex = caller.parameters.findIndex(
            parameter => parameter.name === argument.variableName
          );
          if (callerIndex < 0) continue;
          const callerParameter = caller.parameters[callerIndex];
          const calleeParameter = callee.parameters[index];
          if (
            stackSlotsForDataType(callerParameter.type) !==
            stackSlotsForDataType(calleeParameter.type)
          ) {
            continue;
          }
          union(keyFor(caller.name, callerIndex), keyFor(callee.name, index));
        }
      }
      for (const argument of expression.arguments) visitExpression(caller, argument);
    }
    visitExpression(caller, expression.left ?? undefined);
    visitExpression(caller, expression.right ?? undefined);
    for (const component of expression.components) visitExpression(caller, component);
  };

  const visitNode = (caller: NWScriptFunctionNode, node: NWScriptASTNode): void => {
    const expressionFields = node as unknown as {
      condition?: NWScriptExpression;
      expression?: NWScriptExpression;
      value?: NWScriptExpression;
      initializer?: NWScriptExpression;
    };
    visitExpression(caller, expressionFields.condition);
    visitExpression(caller, expressionFields.expression);
    visitExpression(caller, expressionFields.value);
    visitExpression(caller, expressionFields.initializer);
    for (const child of node.children) visitNode(caller, child);
  };

  for (const func of ast.functions) visitNode(func, func.body);

  const components = new Map<string, ParameterSite[]>();
  for (const [key, site] of sites) {
    const root = find(key);
    const component = components.get(root) ?? [];
    component.push(site);
    components.set(root, component);
  }

  for (const component of components.values()) {
    const authoritative = new Set(
      component
        .map(site => site.analyzed?.dataType ?? site.ast.type)
        .filter(dataType => dataType !== NWScriptDataType.INTEGER)
    );
    if (authoritative.size !== 1) continue;
    const dataType = Array.from(authoritative)[0];
    for (const site of component) {
      if (
        site.ast.type === NWScriptDataType.INTEGER &&
        stackSlotsForDataType(site.ast.type) === stackSlotsForDataType(dataType)
      ) {
        site.ast.type = dataType;
      }
      if (
        site.analyzed?.dataType === NWScriptDataType.INTEGER &&
        stackSlotsForDataType(site.analyzed.dataType) === stackSlotsForDataType(dataType)
      ) {
        site.analyzed.dataType = dataType;
      }
    }
  }

  // Keep expression annotations coherent for AST consumers even though NSS emission resolves a
  // variable by its declaration and identifier rather than by this cached datatype.
  for (const func of ast.functions) {
    const parameterTypes = new Map(func.parameters.map(parameter => [parameter.name, parameter.type]));
    const updateExpression = (expression: NWScriptExpression | undefined): void => {
      if (!expression) return;
      if (expression.type === NWScriptExpressionType.VARIABLE) {
        const dataType = parameterTypes.get(expression.variableName);
        if (dataType !== undefined) expression.dataType = dataType;
      }
      for (const argument of expression.arguments) updateExpression(argument);
      updateExpression(expression.left ?? undefined);
      updateExpression(expression.right ?? undefined);
      for (const component of expression.components) updateExpression(component);
    };
    const updateNode = (node: NWScriptASTNode): void => {
      const expressionFields = node as unknown as {
        condition?: NWScriptExpression;
        expression?: NWScriptExpression;
        value?: NWScriptExpression;
        initializer?: NWScriptExpression;
      };
      updateExpression(expressionFields.condition);
      updateExpression(expressionFields.expression);
      updateExpression(expressionFields.value);
      updateExpression(expressionFields.initializer);
      for (const child of node.children) updateNode(child);
    };
    updateNode(func.body);
  }
}
