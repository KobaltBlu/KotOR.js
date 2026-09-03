/**
 * Monaco extras: inlay hints, semantic tokens, folding, and code actions.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file nssEditorExtras.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import { scanCallSites, skipTrivia } from "./callSites";
import { parseScriptSymbols } from "./engineApiModel";
import { foldNss } from "./nssFolding";
import { modelForEditor } from "./nssIntelliSense";
import type { NssLanguageHost } from "./nssLanguageHost";
import { nextArgEnd } from "./nssScan";

const LANGUAGE_ID = "nwscript";

const SEMANTIC_LEGEND: monacoEditor.languages.SemanticTokensLegend = {
  tokenTypes: ["function", "enumMember", "variable", "type"],
  tokenModifiers: ["defaultLibrary"],
};

function includeInsertPosition(model: monacoEditor.editor.ITextModel): monacoEditor.IPosition {
  let last = -1;
  for (let i = 1; i <= model.getLineCount(); i += 1) {
    if (/^\s*#\s*include\s+"/i.test(model.getLineContent(i))) {
      last = i;
    }
  }
  if (last >= 0) {
    return { lineNumber: last + 1, column: 1 };
  }
  return { lineNumber: 1, column: 1 };
}

function startingConditionalActions(model: monacoEditor.editor.ITextModel): monacoEditor.languages.CodeAction[] {
  const text = model.getValue();
  const actions: monacoEditor.languages.CodeAction[] = [];
  const voidMatch = text.match(/\bvoid\s+StartingConditional\s*\(/);
  if (voidMatch && voidMatch.index != null) {
    const start = model.getPositionAt(voidMatch.index);
    actions.push({
      title: "Change StartingConditional to return int",
      kind: "quickfix",
      edit: {
        edits: [{
          resource: model.uri,
          versionId: model.getVersionId(),
          textEdit: {
            range: new monacoEditor.Range(start.lineNumber, start.column, start.lineNumber, start.column + 4),
            text: "int",
          },
        }],
      },
    });
  }

  const fn = text.match(/\bint\s+StartingConditional\s*\([^)]*\)\s*\{/);
  if (!fn || fn.index == null) return actions;
  const bodyStart = fn.index + fn[0].length;
  const body = text.slice(bodyStart);
  if (/\breturn\b/.test(body)) return actions;
  const close = body.lastIndexOf("}");
  if (close < 0) return actions;
  const insertAt = model.getPositionAt(bodyStart + close);
  actions.push({
    title: "Add return TRUE to StartingConditional",
    kind: "quickfix",
    edit: {
      edits: [{
        resource: model.uri,
        versionId: model.getVersionId(),
        textEdit: {
          range: new monacoEditor.Range(insertAt.lineNumber, insertAt.column, insertAt.lineNumber, insertAt.column),
          text: " return TRUE;\n",
        },
      }],
    },
  });
  return actions;
}

async function addIncludeAction(
  model: monacoEditor.editor.ITextModel,
  position: monacoEditor.Position,
  host: NssLanguageHost,
): Promise<monacoEditor.languages.CodeAction | undefined> {
  const word = model.getWordAtPosition(position);
  if (!word) return undefined;
  const name = word.word;
  if (!name) return undefined;

  const api = modelForEditor(model, host);
  if (api.symbolsByName.get(name)?.length) {
    return undefined;
  }

  const files = await host.listProjectNss();
  const currentResref = host.findTabForModel(model)?.file?.resref;
  for (const file of files) {
    if (file.resref === currentResref) continue;
    const parsed = parseScriptSymbols(
      file.text,
      "document",
      file.path,
      "Workspace",
      file.resref,
    );
    const found = [...parsed.functions, ...parsed.constants].some((symbol) => symbol.name === name);
    if (!found) continue;

    const insertAt = includeInsertPosition(model);
    return {
      title: `Add #include "${file.resref}"`,
      kind: "quickfix",
      edit: {
        edits: [{
          resource: model.uri,
          versionId: model.getVersionId(),
          textEdit: {
            range: new monacoEditor.Range(insertAt.lineNumber, insertAt.column, insertAt.lineNumber, insertAt.column),
            text: `#include "${file.resref}"\n`,
          },
        }],
      },
    };
  }
  return undefined;
}

export function registerNssEditorExtras(host: NssLanguageHost): void {
  monacoEditor.languages.registerInlayHintsProvider(LANGUAGE_ID, {
    provideInlayHints: (model, range) => {
      const api = modelForEditor(model, host);
      const text = model.getValue();
      const hints: monacoEditor.languages.InlayHint[] = [];

      for (const call of scanCallSites(text)) {
        const overloads = api.functionsByName.get(call.functionName);
        if (!overloads?.length) continue;
        const fn = overloads.find((item) => item.parameters.length >= call.argumentStarts.length)
          ?? overloads[0];
        if (!fn.parameters.length) continue;

        for (let i = 0; i < call.argumentStarts.length && i < fn.parameters.length; i += 1) {
          const start = skipTrivia(text, call.argumentStarts[i]);
          if (start >= call.closeOffset) continue;
          const position = model.getPositionAt(start);
          if (
            position.lineNumber < range.startLineNumber ||
            position.lineNumber > range.endLineNumber
          ) {
            continue;
          }
          const argText = text.slice(start, nextArgEnd(text, start, call.closeOffset)).trim();
          if (!argText) continue;
          if (argText === fn.parameters[i].name || argText.startsWith(fn.parameters[i].name + " ")) {
            continue;
          }
          hints.push({
            position,
            label: `${fn.parameters[i].name}:`,
            kind: monacoEditor.languages.InlayHintKind.Parameter,
            paddingRight: true,
          });
        }
      }

      return { hints, dispose: () => undefined };
    },
  });

  monacoEditor.languages.registerDocumentSemanticTokensProvider(LANGUAGE_ID, {
    getLegend: () => SEMANTIC_LEGEND,
    provideDocumentSemanticTokens: (model) => {
      const api = modelForEditor(model, host);
      const text = model.getValue();
      const data: number[] = [];
      let prevLine = 0;
      let prevChar = 0;
      let quote: string | undefined;
      let lineComment = false;
      let blockComment = false;

      for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        const next = text[i + 1];
        if (lineComment) {
          if (ch === "\n") lineComment = false;
          continue;
        }
        if (blockComment) {
          if (ch === "*" && next === "/") {
            blockComment = false;
            i += 1;
          }
          continue;
        }
        if (quote) {
          if (ch === "\\" && next) i += 1;
          else if (ch === quote) quote = undefined;
          continue;
        }
        if (ch === "/" && next === "/") {
          lineComment = true;
          i += 1;
          continue;
        }
        if (ch === "/" && next === "*") {
          blockComment = true;
          i += 1;
          continue;
        }
        if (ch === '"' || ch === "'") {
          quote = ch;
          continue;
        }
        if (!/[A-Za-z_]/.test(ch)) continue;

        let end = i + 1;
        while (end < text.length && /[A-Za-z0-9_]/.test(text[end])) end += 1;
        const name = text.slice(i, end);
        const symbols = api.symbolsByName.get(name);
        if (symbols?.length) {
          const symbol = symbols[0];
          const position = model.getPositionAt(i);
          const tokenType = symbol.kind === "function" ? 0 : symbol.kind === "constant" ? 1 : 2;
          const mods = symbol.sourceKind === "engine" ? 1 : 0;
          const deltaLine = position.lineNumber - 1 - prevLine;
          const deltaStart = deltaLine === 0
            ? position.column - 1 - prevChar
            : position.column - 1;
          data.push(deltaLine, deltaStart, name.length, tokenType, mods);
          prevLine = position.lineNumber - 1;
          prevChar = position.column - 1;
        }
        i = end - 1;
      }

      return { data: new Uint32Array(data) };
    },
    releaseDocumentSemanticTokens: () => undefined,
  });

  monacoEditor.languages.registerFoldingRangeProvider(LANGUAGE_ID, {
    provideFoldingRanges: (model) => {
      return foldNss(model.getValue()).map((range) => ({
        start: range.start + 1,
        end: range.end + 1,
        kind: undefined,
      }));
    },
  });

  monacoEditor.languages.registerCodeActionProvider(LANGUAGE_ID, {
    provideCodeActions: async (model, range) => {
      const actions = startingConditionalActions(model);
      const include = await addIncludeAction(
        model,
        new monacoEditor.Position(range.startLineNumber, range.startColumn),
        host,
      );
      if (include) actions.push(include);
      return { actions, dispose: () => undefined };
    },
  });
}
