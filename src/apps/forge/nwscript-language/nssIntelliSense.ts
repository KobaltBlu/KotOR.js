/**
 * Monaco IntelliSense: completion, hover, and signature help for NWScript.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file nssIntelliSense.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import { findCallContext } from "./callSites";
import {
  formatParameter,
  formatParameterCompact,
  renderSymbolDocumentation,
  sourceSortPrefix,
  type EngineApiModel,
  type EngineFunction,
  type EngineParameter,
  type EngineSymbol,
} from "./engineApiModel";
import { nssEditorApi } from "./nssEditorApi";
import type { NssLanguageHost } from "./nssLanguageHost";
import { NSS_CONTROL_SNIPPETS, NSS_KEYWORDS } from "./nssSnippets";

const LANGUAGE_ID = "nwscript";

export function documentResref(
  model: monacoEditor.editor.ITextModel,
  host: NssLanguageHost,
): string {
  const tab = host.findTabForModel(model);
  const resref = tab?.file?.resref;
  if (resref) return resref;
  const path = model.uri.path || "";
  const base = path.split("/").pop() || "untitled";
  return base.replace(/\.nss$/i, "") || "untitled";
}

export function modelForEditor(
  model: monacoEditor.editor.ITextModel,
  host: NssLanguageHost,
): EngineApiModel {
  const tab = host.findTabForModel(model);
  const resref = documentResref(model, host);
  const text = model.getValue();
  const includes = tab?.resolvedIncludes ?? new Map<string, string>();
  return nssEditorApi.getModel(
    text,
    resref,
    includes,
    `${model.uri.toString()}|${model.getVersionId()}|${[...includes.keys()].join(",")}`,
  );
}

function dummyRange(): monacoEditor.IRange {
  return {
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: 1,
    endColumn: 1,
  };
}

function snippetItem(
  snippet: { label: string; insertText: string; documentation: string; filterText?: string; sortText?: string },
): monacoEditor.languages.CompletionItem {
  return {
    label: snippet.label,
    kind: monacoEditor.languages.CompletionItemKind.Snippet,
    insertText: snippet.insertText,
    insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: snippet.documentation,
    filterText: snippet.filterText,
    sortText: snippet.sortText,
    range: dummyRange(),
  };
}

function createFunctionSnippet(fn: EngineFunction): string {
  const args = fn.parameters.map((parameter, index) => `\${${index + 1}:${parameter.name}}`);
  return `${fn.name}(${args.join(", ")})`;
}

function markdown(value: string): monacoEditor.IMarkdownString {
  return { value };
}

function createCompletionItem(symbol: EngineSymbol, api: EngineApiModel): monacoEditor.languages.CompletionItem {
  if (symbol.kind === "function") {
    const detail = symbol.actionId !== undefined
      ? `${symbol.signature} · ACTION #${symbol.actionId}`
      : `${symbol.signature} · ${symbol.sourceLabel}`;
    return {
      label: {
        label: symbol.name,
        detail: `(${symbol.parameters.map(formatParameterCompact).join(", ")})`,
        description: symbol.returnType,
      },
      kind: monacoEditor.languages.CompletionItemKind.Function,
      detail,
      documentation: markdown(renderSymbolDocumentation(symbol, api.source)),
      insertText: createFunctionSnippet(symbol),
      insertTextRules: monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      sortText: `${sourceSortPrefix(symbol.sourceKind)}_0_${symbol.name}`,
      command: {
        id: "editor.action.triggerParameterHints",
        title: "Show NWScript signature help",
      },
      range: dummyRange(),
    };
  }

  return {
    label: {
      label: symbol.name,
      detail: symbol.value !== undefined ? ` = ${symbol.value}` : "",
      description: symbol.type,
    },
    kind: symbol.kind === "constant"
      ? monacoEditor.languages.CompletionItemKind.Constant
      : monacoEditor.languages.CompletionItemKind.Variable,
    detail: symbol.declaration,
    documentation: markdown(renderSymbolDocumentation(symbol, api.source)),
    insertText: symbol.name,
    sortText: `${sourceSortPrefix(symbol.sourceKind)}_1_${symbol.name}`,
    range: dummyRange(),
  };
}

function createSignatureInformation(
  fn: EngineFunction,
  api: EngineApiModel,
): monacoEditor.languages.SignatureInformation {
  return {
    label: fn.signature,
    documentation: markdown(renderSymbolDocumentation(fn, api.source)),
    parameters: fn.parameters.map((parameter) => {
      const label = formatParameter(parameter);
      const start = fn.signature.indexOf(label);
      return {
        label: start >= 0 ? [start, start + label.length] as [number, number] : label,
        documentation: parameterDocumentation(parameter),
      };
    }),
  };
}

function parameterDocumentation(parameter: EngineParameter): monacoEditor.IMarkdownString {
  let value = `**${parameter.name}** · \`${parameter.type}\``;
  if (parameter.defaultValue !== undefined) {
    value += `\n\nDefault: \`${parameter.defaultValue.replace(/`/g, "\\`")}\``;
  }
  if (parameter.documentation) {
    value += `\n\n${parameter.documentation}`;
  }
  return { value };
}

function canAcceptArgument(fn: EngineFunction, argumentIndex: number): boolean {
  return fn.parameters.length === 0
    ? argumentIndex === 0
    : argumentIndex < fn.parameters.length;
}

export function registerNssIntelliSense(host: NssLanguageHost): void {
  monacoEditor.languages.registerCompletionItemProvider(LANGUAGE_ID, {
    triggerCharacters: ["."],
    provideCompletionItems: (model) => {
      const api = modelForEditor(model, host);
      const suggestions: monacoEditor.languages.CompletionItem[] = [];

      for (const keyword of NSS_KEYWORDS) {
        suggestions.push({
          label: keyword,
          kind: monacoEditor.languages.CompletionItemKind.Keyword,
          insertText: keyword,
          sortText: `3_${keyword}`,
          range: dummyRange(),
        });
      }

      for (const engineType of host.getEngineTypes()) {
        suggestions.push({
          label: engineType.name,
          kind: monacoEditor.languages.CompletionItemKind.Keyword,
          insertText: engineType.name,
          documentation: `Engine Type #${engineType.index + 1}:\n\n${engineType.name}`,
          sortText: `3_${engineType.name}`,
          range: dummyRange(),
        });
      }

      for (const snippet of NSS_CONTROL_SNIPPETS) {
        suggestions.push(snippetItem(snippet));
      }

      for (const symbol of api.symbols) {
        suggestions.push(createCompletionItem(symbol, api));
      }

      return { suggestions, incomplete: false };
    },
  });

  monacoEditor.languages.registerHoverProvider(LANGUAGE_ID, {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) {
        return undefined;
      }

      const api = modelForEditor(model, host);
      const symbols = api.symbolsByName.get(word.word);
      if (!symbols?.length) {
        return undefined;
      }

      const contents = symbols.map((symbol) => markdown(renderSymbolDocumentation(symbol, api.source)));
      return {
        range: new monacoEditor.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn,
        ),
        contents,
      };
    },
  });

  monacoEditor.languages.registerSignatureHelpProvider(LANGUAGE_ID, {
    signatureHelpTriggerCharacters: ["(", ","],
    signatureHelpRetriggerCharacters: [","],
    provideSignatureHelp: (model, position, _token, context) => {
      const offset = model.getOffsetAt(position);
      const call = findCallContext(model.getValue(), offset);
      if (!call) {
        return { value: { signatures: [], activeSignature: 0, activeParameter: 0 }, dispose: () => undefined };
      }

      const api = modelForEditor(model, host);
      const overloads = api.functionsByName.get(call.functionName);
      if (!overloads?.length) {
        return { value: { signatures: [], activeSignature: 0, activeParameter: 0 }, dispose: () => undefined };
      }

      let activeSignature = 0;
      const previous = context.activeSignatureHelp?.activeSignature;
      if (
        previous !== undefined &&
        previous >= 0 &&
        previous < overloads.length &&
        canAcceptArgument(overloads[previous], call.argumentIndex)
      ) {
        activeSignature = previous;
      } else {
        const exact = overloads.findIndex((fn) => canAcceptArgument(fn, call.argumentIndex));
        activeSignature = exact >= 0 ? exact : 0;
      }

      const activeFunction = overloads[activeSignature] ?? overloads[0];
      const activeParameter = activeFunction.parameters.length > 0
        ? Math.min(call.argumentIndex, activeFunction.parameters.length - 1)
        : 0;

      return {
        value: {
          signatures: overloads.map((fn) => createSignatureInformation(fn, api)),
          activeSignature,
          activeParameter,
        },
        dispose: () => undefined,
      };
    },
  });
}
