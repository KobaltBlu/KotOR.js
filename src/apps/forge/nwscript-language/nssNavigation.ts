/**
 * Monaco navigation: definition, references, rename, highlights, and #include links.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file nssNavigation.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import {
  preferredSymbols,
  rangeKey,
  symbolDefinitionKey,
  uniqueDefinitions,
  type EngineApiModel,
  type EngineSymbol,
  type NssPosition,
  type NssRange,
} from "./engineApiModel";
import { nssEditorApi } from "./nssEditorApi";
import { documentResref, modelForEditor } from "./nssIntelliSense";
import type { NssEditorTabLike, NssLanguageHost } from "./nssLanguageHost";
import { identifierOffsets, includeFromLine, resolveLocalIdentifier, type LocalIdentifier } from "./nssScan";

const LANGUAGE_ID = "nwscript";
const NSS_SCHEME = "forge-nss";

interface IdentifierTarget {
  name: string;
  range: NssRange;
  symbols: EngineSymbol[];
  local?: LocalIdentifier;
}

export function nssResourceUri(resref: string): monacoEditor.Uri {
  const clean = resref.replace(/\.nss$/i, "").toLowerCase();
  return monacoEditor.Uri.from({ scheme: NSS_SCHEME, path: `/${clean}.nss` });
}

export function resrefFromUri(uri: monacoEditor.Uri): string | undefined {
  if (uri.scheme !== NSS_SCHEME) return undefined;
  const base = (uri.path || "").split("/").pop() || "";
  return base.replace(/\.nss$/i, "") || undefined;
}

function toMonacoRange(range: NssRange): monacoEditor.Range {
  return new monacoEditor.Range(
    range.start.line,
    range.start.column,
    range.end.line,
    range.end.column,
  );
}

function toNssPosition(position: monacoEditor.Position): NssPosition {
  return { line: position.lineNumber, column: position.column };
}

function offsetToNssPosition(model: monacoEditor.editor.ITextModel, offset: number): NssPosition {
  const pos = model.getPositionAt(offset);
  return { line: pos.lineNumber, column: pos.column };
}

function identifierRanges(model: monacoEditor.editor.ITextModel, name: string): monacoEditor.Range[] {
  return identifierOffsets(model.getValue(), name).map(({ start, end }) => {
    const s = model.getPositionAt(start);
    const e = model.getPositionAt(end);
    return new monacoEditor.Range(s.lineNumber, s.column, e.lineNumber, e.column);
  });
}

function includeAtPosition(
  model: monacoEditor.editor.ITextModel,
  position: monacoEditor.Position,
) {
  return includeFromLine(model.getLineContent(position.lineNumber), position.lineNumber, position.column);
}

function resolveIdentifierTarget(
  model: monacoEditor.editor.ITextModel,
  position: monacoEditor.Position,
  host: NssLanguageHost,
): IdentifierTarget | undefined {
  const word = model.getWordAtPosition(position);
  if (!word) return undefined;

  const range: NssRange = {
    start: { line: position.lineNumber, column: word.startColumn },
    end: { line: position.lineNumber, column: word.endColumn },
  };

  const offset = model.getOffsetAt(position);
  const local = resolveLocalIdentifier(
    model.getValue(),
    offset,
    word.word,
    (o) => offsetToNssPosition(model, o),
  );
  if (local) {
    return { name: word.word, range, symbols: [], local };
  }

  const api = modelForEditor(model, host);
  const symbols = preferredSymbols(
    api,
    word.word,
    documentResref(model, host),
    toNssPosition(position),
  ).filter((symbol) => symbol.definition);
  if (symbols.length === 0) {
    return undefined;
  }
  return { name: word.word, range, symbols };
}

function locationForSymbol(
  model: monacoEditor.editor.ITextModel,
  symbol: EngineSymbol,
  host: NssLanguageHost,
): monacoEditor.languages.Location | undefined {
  if (!symbol.definition) return undefined;
  const current = documentResref(model, host);
  if (symbol.definition.resref === current) {
    return { uri: model.uri, range: toMonacoRange(symbol.definition.selectionRange) };
  }
  return {
    uri: nssResourceUri(symbol.definition.resref),
    range: toMonacoRange(symbol.definition.selectionRange),
  };
}

function revealInTab(tab: NssEditorTabLike, range: NssRange): void {
  tab.show();
  if (tab.editor) {
    tab.editor.revealLineInCenter(range.start.line);
    tab.editor.setPosition({ lineNumber: range.start.line, column: range.start.column });
    tab.editor.focus();
  }
}

function isNssFileTab(tab: NssEditorTabLike, resref: string): boolean {
  const tabResref = String(tab.file?.resref || "").toLowerCase();
  const tabExt = String(tab.file?.ext || "nss").toLowerCase();
  return tabResref === resref.toLowerCase() && tabExt === "nss";
}

function findNssTab(host: NssLanguageHost, resref: string): NssEditorTabLike | undefined {
  return host.listNssTabs().find((tab) => isNssFileTab(tab, resref));
}

function waitForTab(host: NssLanguageHost, resref: string, timeoutMs = 4000): Promise<NssEditorTabLike | undefined> {
  const existing = findNssTab(host, resref);
  if (existing?.editor) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const tab = findNssTab(host, resref);
      if (tab?.editor) {
        resolve(tab);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        resolve(tab);
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}

async function openNssAt(host: NssLanguageHost, resref: string, range: NssRange): Promise<void> {
  const existing = findNssTab(host, resref);
  if (existing) {
    revealInTab(existing, range);
    return;
  }

  let buffer = resref.toLowerCase() === "nwscript" ? host.getNwscriptBuffer() : undefined;
  if ((!buffer || !buffer.length) && host.loadNssBuffer) {
    buffer = await host.loadNssBuffer(resref);
  }
  host.openNss(resref, buffer?.length ? buffer : undefined);
  const tab = await waitForTab(host, resref);
  if (tab) {
    revealInTab(tab, range);
  }
}

function modelForText(
  resref: string,
  text: string,
  includes?: Map<string, string>,
): EngineApiModel {
  return nssEditorApi.getModel(text, resref, includes ?? new Map(), `ref|${resref}|${text.length}|${[...(includes?.keys() ?? [])].join(",")}`);
}

function offsetToPosition(text: string, offset: number): NssPosition {
  let line = 1;
  let column = 1;
  for (let i = 0; i < offset && i < text.length; i += 1) {
    if (text[i] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

async function collectReferenceFiles(
  host: NssLanguageHost,
  sourceModel: monacoEditor.editor.ITextModel,
): Promise<Array<{ text: string; resref: string; path?: string; model?: monacoEditor.editor.ITextModel }>> {
  const files = new Map<string, { text: string; resref: string; path?: string; model?: monacoEditor.editor.ITextModel }>();
  const sourceResref = documentResref(sourceModel, host);
  files.set(sourceResref.toLowerCase(), {
    text: sourceModel.getValue(),
    resref: sourceResref,
    model: sourceModel,
  });

  for (const tab of host.listNssTabs()) {
    const resref = tab.file?.resref;
    if (!resref) continue;
    const text = tab.editor?.getModel()?.getValue() ?? tab.code;
    files.set(resref.toLowerCase(), {
      text,
      resref,
      path: tab.file?.path,
      model: tab.editor?.getModel() ?? undefined,
    });
  }

  for (const file of await host.listProjectNss()) {
    const key = file.resref.toLowerCase();
    if (!files.has(key)) {
      files.set(key, { text: file.text, resref: file.resref, path: file.path });
    }
  }

  return [...files.values()];
}

async function collectReferences(
  target: IdentifierTarget,
  sourceModel: monacoEditor.editor.ITextModel,
  host: NssLanguageHost,
  includeDeclaration: boolean,
): Promise<monacoEditor.languages.Location[]> {
  if (target.local) {
    const declarationKey = rangeKey(target.local.definition);
    const scope = toMonacoRange(target.local.scope);
    return identifierRanges(sourceModel, target.name)
      .filter((range) => scope.containsRange(range))
      .filter((range) => {
        const key = `${range.startLineNumber}:${range.startColumn}-${range.endLineNumber}:${range.endColumn}`;
        return includeDeclaration || key !== declarationKey;
      })
      .map((range) => ({ uri: sourceModel.uri, range }));
  }

  const definitionKeys = new Set(
    target.symbols.filter((symbol) => symbol.definition).map(symbolDefinitionKey),
  );
  if (definitionKeys.size === 0) {
    return [];
  }

  const references: monacoEditor.languages.Location[] = [];
  const seen = new Set<string>();
  const files = await collectReferenceFiles(host, sourceModel);

  for (const file of files) {
    const includes = host.resolveIncludes ? await host.resolveIncludes(file.text) : new Map<string, string>();
    const api = modelForText(file.resref, file.text, includes);
    const visible = preferredSymbols(api, target.name);
    if (!visible.some((symbol) => definitionKeys.has(symbolDefinitionKey(symbol)))) {
      continue;
    }

    const declarations = new Set(
      visible
        .filter((symbol) => definitionKeys.has(symbolDefinitionKey(symbol)))
        .filter((symbol) => symbol.definition?.resref === file.resref)
        .map((symbol) => rangeKey(symbol.definition!.selectionRange)),
    );

    const uri = file.model?.uri ?? nssResourceUri(file.resref);
    for (const offset of identifierOffsets(file.text, target.name)) {
      const start = offsetToPosition(file.text, offset.start);
      const end = offsetToPosition(file.text, offset.end);
      const key = `${start.line}:${start.column}-${end.line}:${end.column}`;
      if (!includeDeclaration && declarations.has(key)) {
        continue;
      }
      const locKey = `${file.resref}|${key}`;
      if (seen.has(locKey)) continue;
      seen.add(locKey);
      references.push({
        uri,
        range: new monacoEditor.Range(start.line, start.column, end.line, end.column),
      });
    }
  }

  return references;
}

export function registerNssNavigation(host: NssLanguageHost): void {
  monacoEditor.editor.registerEditorOpener({
    openCodeEditor: async (_source, resource, selection) => {
      const resref = resrefFromUri(resource);
      if (!resref) return false;
      const range: NssRange = !selection
        ? { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }
        : "startLineNumber" in selection
          ? {
            start: { line: selection.startLineNumber, column: selection.startColumn },
            end: { line: selection.endLineNumber, column: selection.endColumn },
          }
          : {
            start: { line: selection.lineNumber, column: selection.column },
            end: { line: selection.lineNumber, column: selection.column },
          };
      await openNssAt(host, resref, range);
      return true;
    },
  });

  monacoEditor.languages.registerDefinitionProvider(LANGUAGE_ID, {
    provideDefinition: (model, position) => {
      const include = includeAtPosition(model, position);
      if (include) {
        const resref = include.resource.replace(/\.nss$/i, "");
        return [{ uri: nssResourceUri(resref), range: new monacoEditor.Range(1, 1, 1, 1) }];
      }

      const target = resolveIdentifierTarget(model, position, host);
      if (!target) return [];

      if (target.local) {
        return [{ uri: model.uri, range: toMonacoRange(target.local.definition) }];
      }

      const locations: monacoEditor.languages.Location[] = [];
      for (const symbol of uniqueDefinitions(target.symbols)) {
        const location = locationForSymbol(model, symbol, host);
        if (location) {
          locations.push(location);
        }
      }
      return locations;
    },
  });

  monacoEditor.languages.registerReferenceProvider(LANGUAGE_ID, {
    provideReferences: async (model, position, context) => {
      const target = resolveIdentifierTarget(model, position, host);
      if (!target) return [];
      return collectReferences(target, model, host, context.includeDeclaration);
    },
  });

  monacoEditor.languages.registerRenameProvider(LANGUAGE_ID, {
    resolveRenameLocation: (model, position) => {
      if (includeAtPosition(model, position)) {
        return {
          rejectReason: "Rename Symbol does not rename #include resource files.",
          range: new monacoEditor.Range(1, 1, 1, 1),
          text: "",
        };
      }
      const target = resolveIdentifierTarget(model, position, host);
      if (!target) {
        return {
          rejectReason: "No NWScript symbol at this location.",
          range: new monacoEditor.Range(position.lineNumber, position.column, position.lineNumber, position.column),
          text: "",
        };
      }
      if (!target.local && target.symbols.every((symbol) => symbol.sourceKind === "engine")) {
        return {
          rejectReason: "Engine API symbols come from the active nwscript.nss and cannot be renamed from a script.",
          range: toMonacoRange(target.range),
          text: target.name,
        };
      }
      return {
        range: toMonacoRange(target.range),
        text: target.name,
      };
    },
    provideRenameEdits: async (model, position, newName) => {
      if (!/^[A-Za-z_]\w*$/.test(newName)) {
        return {
          rejectReason: `${JSON.stringify(newName)} is not a valid NWScript identifier.`,
        };
      }
      const target = resolveIdentifierTarget(model, position, host);
      if (!target) {
        return { edits: [] };
      }
      if (!target.local && target.symbols.every((symbol) => symbol.sourceKind === "engine")) {
        return {
          rejectReason: "Engine API symbols come from the active nwscript.nss and cannot be renamed from a script.",
        };
      }

      const locations = await collectReferences(target, model, host, true);
      const edits: monacoEditor.languages.IWorkspaceTextEdit[] = [];
      const projectPatches = new Map<string, { replacements: NssRange[] }>();
      const projectFiles = await host.listProjectNss();

      for (const location of locations) {
        const openModel = monacoEditor.editor.getModel(location.uri);
        if (openModel) {
          edits.push({
            resource: location.uri,
            versionId: openModel.getVersionId(),
            textEdit: {
              range: location.range,
              text: newName,
            },
          });
          continue;
        }

        const resref = resrefFromUri(location.uri);
        if (!resref) continue;
        const project = projectFiles.find((file) => file.resref.toLowerCase() === resref.toLowerCase());
        if (!project || !host.writeProjectFile) continue;
        const existing = projectPatches.get(project.path) ?? { replacements: [] };
        existing.replacements.push({
          start: { line: location.range.startLineNumber, column: location.range.startColumn },
          end: { line: location.range.endLineNumber, column: location.range.endColumn },
        });
        projectPatches.set(project.path, existing);
      }

      for (const [path, patch] of projectPatches) {
        const project = projectFiles.find((file) => file.path === path);
        if (!project || !host.writeProjectFile) continue;
        const lines = project.text.split(/\r?\n/);
        const ordered = patch.replacements.sort((a, b) =>
          b.start.line - a.start.line || b.start.column - a.start.column,
        );
        for (const replacement of ordered) {
          const lineIndex = replacement.start.line - 1;
          const line = lines[lineIndex];
          if (line == null) continue;
          const start = replacement.start.column - 1;
          const end = replacement.end.column - 1;
          lines[lineIndex] = line.slice(0, start) + newName + line.slice(end);
        }
        await host.writeProjectFile(path, lines.join("\n"));
      }

      return { edits };
    },
  });

  monacoEditor.languages.registerDocumentHighlightProvider(LANGUAGE_ID, {
    provideDocumentHighlights: (model, position) => {
      const target = resolveIdentifierTarget(model, position, host);
      if (!target) return [];

      if (target.local) {
        const declarationKey = rangeKey(target.local.definition);
        const scope = toMonacoRange(target.local.scope);
        return identifierRanges(model, target.name)
          .filter((range) => scope.containsRange(range))
          .map((range) => {
            const key = `${range.startLineNumber}:${range.startColumn}-${range.endLineNumber}:${range.endColumn}`;
            return {
              range,
              kind: key === declarationKey
                ? monacoEditor.languages.DocumentHighlightKind.Write
                : monacoEditor.languages.DocumentHighlightKind.Read,
            };
          });
      }

      const currentResref = documentResref(model, host);
      const declarationRanges = new Set(
        target.symbols
          .filter((symbol) => symbol.definition?.resref === currentResref)
          .map((symbol) => rangeKey(symbol.definition!.selectionRange)),
      );

      return identifierRanges(model, target.name).map((range) => {
        const key = `${range.startLineNumber}:${range.startColumn}-${range.endLineNumber}:${range.endColumn}`;
        return {
          range,
          kind: declarationRanges.has(key)
            ? monacoEditor.languages.DocumentHighlightKind.Write
            : monacoEditor.languages.DocumentHighlightKind.Read,
        };
      });
    },
  });

  monacoEditor.languages.registerLinkProvider(LANGUAGE_ID, {
    provideLinks: (model) => {
      const links: monacoEditor.languages.ILink[] = [];
      for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber += 1) {
        const include = includeFromLine(model.getLineContent(lineNumber), lineNumber);
        if (!include) continue;
        const resref = include.resource.replace(/\.nss$/i, "");
        links.push({
          range: toMonacoRange(include.range),
          url: nssResourceUri(resref),
          tooltip: `Open ${resref}.nss`,
        });
      }
      return { links };
    },
  });
}
