/**
 * Engine-aware NWScript symbol model parsed from nwscript.nss and script sources.
 *
 * Ported from NWScript Workbench (vscode-ext engineApi.ts) without vscode APIs.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file engineApiModel.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export type SymbolSourceKind = "engine" | "document" | "include";

export interface EngineParameter {
  type: string;
  name: string;
  defaultValue?: string;
  documentation?: string;
}

/** 1-based positions, matching Monaco. */
export interface NssPosition {
  line: number;
  column: number;
}

export interface NssRange {
  start: NssPosition;
  end: NssPosition;
}

export interface SymbolDefinition {
  resref: string;
  range: NssRange;
  selectionRange: NssRange;
}

interface SymbolSourceMetadata {
  sourceKind: SymbolSourceKind;
  sourceLabel: string;
  sourceAvailability: string;
  definition?: SymbolDefinition;
}

export interface EngineFunction extends SymbolSourceMetadata {
  kind: "function";
  name: string;
  returnType: string;
  parameters: EngineParameter[];
  actionId?: number;
  signature: string;
  documentation?: string;
  returnDocumentation?: string;
  curatedNotes: string[];
}

export interface EngineConstant extends SymbolSourceMetadata {
  kind: "constant" | "symbol";
  name: string;
  type: string;
  value?: string;
  declaration: string;
  documentation?: string;
  curatedNotes: string[];
}

export type EngineSymbol = EngineFunction | EngineConstant;

export interface LanguageSpecSource {
  label: string;
  availability: string;
  text: string;
  resref: string;
}

export interface EngineApiModel {
  source: LanguageSpecSource;
  functions: EngineFunction[];
  constants: EngineConstant[];
  symbols: EngineSymbol[];
  functionsByName: ReadonlyMap<string, readonly EngineFunction[]>;
  symbolsByName: ReadonlyMap<string, readonly EngineSymbol[]>;
}

interface ParsedDocumentation {
  description?: string;
  parameters: Map<string, string>;
  returns?: string;
}

interface Statement {
  code: string;
  documentation: string;
}

const CURATED_FUNCTION_NOTES: Readonly<Record<string, readonly string[]>> = {
  ActionDoCommand: [
    "The argument is an NWScript `action` value and is queued on the current object's action queue.",
  ],
  AssignCommand: [
    "The supplied `action` is queued for the target object, so its command context differs from the caller's.",
  ],
  DelayCommand: [
    "The second argument is an NWScript `action` expression that is scheduled for later execution, not a JavaScript-style callback.",
  ],
  GetObjectByTag: [
    "`nNth` is used to select among multiple objects that share the same tag; the active `nwscript.nss` remains authoritative for the exact signature and default value.",
  ],
  ExecuteScript: [
    "The executed script receives the supplied object as its script object/`OBJECT_SELF` context.",
  ],
};

const CURATED_SYMBOL_NOTES: Readonly<Record<string, readonly string[]>> = {
  OBJECT_INVALID: [
    "Use this sentinel when an object lookup can fail; engine APIs commonly return it for an invalid or missing object.",
  ],
  OBJECT_SELF: [
    "Represents the object currently executing the script. Its concrete object depends on the event or script invocation context.",
  ],
};

export const DEFAULT_LANGUAGE_SPEC: LanguageSpecSource = {
  label: "nwscript.nss",
  availability: "Loaded from the active game KEY/BIF",
  text: "",
  resref: "nwscript",
};

interface ParseSourceOptions {
  sourceKind: SymbolSourceKind;
  sourceLabel: string;
  sourceAvailability: string;
  includeFunctionDefinitions: boolean;
  assignActionIds: boolean;
  resref?: string;
}

export function parseEngineApi(source: LanguageSpecSource): EngineApiModel {
  const parsed = parseSourceSymbols(source.text ?? "", {
    sourceKind: "engine",
    sourceLabel: source.label,
    sourceAvailability: source.availability,
    includeFunctionDefinitions: false,
    assignActionIds: true,
    resref: source.resref || "nwscript",
  });

  const symbols: EngineSymbol[] = [...parsed.functions, ...parsed.constants];

  return {
    source,
    functions: parsed.functions,
    constants: parsed.constants,
    symbols,
    functionsByName: groupByName(parsed.functions),
    symbolsByName: groupByName(symbols),
  };
}

export function parseScriptSymbols(
  text: string,
  sourceKind: "document" | "include",
  sourceLabel: string,
  sourceAvailability: string,
  resref?: string,
): { functions: EngineFunction[]; constants: EngineConstant[] } {
  return parseSourceSymbols(text, {
    sourceKind,
    sourceLabel,
    sourceAvailability,
    includeFunctionDefinitions: true,
    assignActionIds: false,
    resref,
  });
}

export function mergeTranslationUnit(
  engine: EngineApiModel,
  documentText: string,
  documentResref: string,
  documentLabel: string,
  includes: readonly { resref: string; source: string }[],
  isLanguageSpec: boolean,
): EngineApiModel {
  const scriptFunctions: EngineFunction[] = [];
  const scriptConstants: EngineConstant[] = [];

  if (!isLanguageSpec) {
    const current = parseScriptSymbols(
      documentText,
      "document",
      documentLabel,
      "Declared in the current script",
      documentResref,
    );
    scriptFunctions.push(...current.functions);
    scriptConstants.push(...current.constants);
  }

  for (const include of includes) {
    const parsed = parseScriptSymbols(
      include.source,
      "include",
      `${include.resref}.nss`,
      `Imported via #include "${include.resref}"`,
      include.resref,
    );
    scriptFunctions.push(...parsed.functions);
    scriptConstants.push(...parsed.constants);
  }

  const functions = [...scriptFunctions, ...engine.functions];
  const constants = [...scriptConstants, ...engine.constants];
  const symbols: EngineSymbol[] = [...functions, ...constants];

  return {
    source: engine.source,
    functions,
    constants,
    symbols,
    functionsByName: groupByName(functions),
    symbolsByName: groupByName(symbols),
  };
}

function parseSourceSymbols(
  text: string,
  options: ParseSourceOptions,
): { functions: EngineFunction[]; constants: EngineConstant[] } {
  const statements = scanTopLevelStatements(
    stripPreprocessorDirectives(text),
    options.includeFunctionDefinitions,
  );
  const functions: EngineFunction[] = [];
  const constants: EngineConstant[] = [];
  let actionId = 0;

  for (const statement of statements) {
    const code = normalizeDeclaration(statement.code);
    if (!code || code.startsWith("#")) {
      continue;
    }

    const functionMatch = code.match(
      /^(?:const\s+)?([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*\(([\s\S]*)\)$/,
    );
    if (functionMatch) {
      const returnType = functionMatch[1];
      const name = functionMatch[2];
      const parameters = parseParameters(functionMatch[3]);
      const docs = parseDocumentation(statement.documentation, parameters);

      for (const parameter of parameters) {
        parameter.documentation = docs.parameters.get(parameter.name);
      }

      const signature = `${returnType} ${name}(${parameters.map(formatParameter).join(", ")})`;
      functions.push({
        kind: "function",
        name,
        returnType,
        parameters,
        actionId: options.assignActionIds ? actionId : undefined,
        signature,
        documentation: docs.description,
        returnDocumentation: docs.returns,
        curatedNotes:
          options.sourceKind === "engine"
            ? [...(CURATED_FUNCTION_NOTES[name] ?? [])]
            : [],
        sourceKind: options.sourceKind,
        sourceLabel: options.sourceLabel,
        sourceAvailability: options.sourceAvailability,
      });
      if (options.assignActionIds) {
        actionId += 1;
      }
      continue;
    }

    const constantMatch = code.match(
      /^(?:const\s+)?([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/,
    );
    if (constantMatch) {
      const [, type, name, value] = constantMatch;
      const docs = parseDocumentation(statement.documentation, []);
      constants.push({
        kind: "constant",
        name,
        type,
        value: value.trim(),
        declaration: `${type} ${name} = ${value.trim()}`,
        documentation: docs.description,
        curatedNotes:
          options.sourceKind === "engine"
            ? [...(CURATED_SYMBOL_NOTES[name] ?? [])]
            : [],
        sourceKind: options.sourceKind,
        sourceLabel: options.sourceLabel,
        sourceAvailability: options.sourceAvailability,
      });
      continue;
    }

    const symbolMatch = code.match(
      /^(?:const\s+)?([A-Za-z_]\w*)\s+([A-Za-z_]\w*)$/,
    );
    if (symbolMatch) {
      const [, type, name] = symbolMatch;
      const docs = parseDocumentation(statement.documentation, []);
      constants.push({
        kind: "symbol",
        name,
        type,
        declaration: `${type} ${name}`,
        documentation: docs.description,
        curatedNotes:
          options.sourceKind === "engine"
            ? [...(CURATED_SYMBOL_NOTES[name] ?? [])]
            : [],
        sourceKind: options.sourceKind,
        sourceLabel: options.sourceLabel,
        sourceAvailability: options.sourceAvailability,
      });
    }
  }

  if (options.resref) {
    attachDefinitionLocations(text, [...functions, ...constants], options.resref);
  }

  return { functions, constants };
}

function attachDefinitionLocations(
  text: string,
  symbols: EngineSymbol[],
  resref: string,
): void {
  const masked = maskForTopLevelDeclarations(text);
  const searchOffsets = new Map<string, number>();
  const lineStarts = buildLineStarts(text);

  for (const symbol of symbols) {
    const key = `${symbol.kind}:${symbol.name}`;
    const searchStart = searchOffsets.get(key) ?? 0;
    const type = symbol.kind === "function" ? symbol.returnType : symbol.type;
    const pattern = symbol.kind === "function"
      ? new RegExp(
        `(?:\\bconst\\s+)?\\b${escapeRegExp(type)}\\s+${escapeRegExp(symbol.name)}\\s*\\(`,
        "g",
      )
      : new RegExp(
        `(?:\\bconst\\s+)?\\b${escapeRegExp(type)}\\s+${escapeRegExp(symbol.name)}\\b`,
        "g",
      );

    pattern.lastIndex = searchStart;
    const match = pattern.exec(masked);
    if (!match) {
      continue;
    }

    const nameOffsetInMatch = match[0].lastIndexOf(symbol.name);
    if (nameOffsetInMatch < 0) {
      continue;
    }

    const selectionStart = match.index + nameOffsetInMatch;
    const selectionEnd = selectionStart + symbol.name.length;
    const declarationEnd = findDeclarationEnd(masked, match.index, symbol.kind);

    symbol.definition = {
      resref,
      range: {
        start: positionAtOffset(lineStarts, match.index),
        end: positionAtOffset(lineStarts, declarationEnd),
      },
      selectionRange: {
        start: positionAtOffset(lineStarts, selectionStart),
        end: positionAtOffset(lineStarts, selectionEnd),
      },
    };

    searchOffsets.set(key, Math.max(selectionEnd, pattern.lastIndex));
  }
}

function maskForTopLevelDeclarations(text: string): string {
  const chars = text.split("");
  let quote: string | undefined;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let braceDepth = 0;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (lineComment) {
      if (ch === "\n") {
        lineComment = false;
      } else {
        chars[i] = " ";
      }
      continue;
    }

    if (blockComment) {
      if (ch === "*" && next === "/") {
        chars[i] = " ";
        chars[i + 1] = " ";
        blockComment = false;
        i += 1;
      } else if (ch !== "\n" && ch !== "\r") {
        chars[i] = " ";
      }
      continue;
    }

    if (quote) {
      if (ch !== "\n" && ch !== "\r") {
        chars[i] = " ";
      }
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = undefined;
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      chars[i] = " ";
      chars[i + 1] = " ";
      lineComment = true;
      i += 1;
      continue;
    }

    if (ch === "/" && next === "*") {
      chars[i] = " ";
      chars[i + 1] = " ";
      blockComment = true;
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'") {
      chars[i] = " ";
      quote = ch;
      continue;
    }

    if (ch === "{") {
      if (braceDepth === 0) {
        braceDepth = 1;
      } else {
        chars[i] = " ";
        braceDepth += 1;
      }
      continue;
    }

    if (ch === "}") {
      if (braceDepth > 0) {
        braceDepth -= 1;
        chars[i] = " ";
      }
      continue;
    }

    if (braceDepth > 0 && ch !== "\n" && ch !== "\r") {
      chars[i] = " ";
    }
  }

  return chars.join("");
}

function findDeclarationEnd(
  masked: string,
  start: number,
  kind: EngineSymbol["kind"],
): number {
  for (let i = start; i < masked.length; i += 1) {
    const ch = masked[i];
    if (ch === ";") {
      return i + 1;
    }
    if (kind === "function" && ch === "{") {
      return i + 1;
    }
  }
  return start;
}

function buildLineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\n") {
      starts.push(i + 1);
    }
  }
  return starts;
}

function positionAtOffset(lineStarts: number[], offset: number): NssPosition {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const start = lineStarts[mid];
    const next = lineStarts[mid + 1] ?? Number.POSITIVE_INFINITY;
    if (offset < start) {
      high = mid - 1;
    } else if (offset >= next) {
      low = mid + 1;
    } else {
      return { line: mid + 1, column: offset - start + 1 };
    }
  }

  const line = Math.max(0, lineStarts.length - 1);
  return { line: line + 1, column: Math.max(0, offset - lineStarts[line]) + 1 };
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function renderSymbolDocumentation(
  symbol: EngineSymbol,
  source: LanguageSpecSource,
): string {
  const parts: string[] = [];
  const origin = symbolOriginLabel(symbol.sourceKind);

  if (symbol.kind === "function") {
    if (symbol.actionId !== undefined) {
      parts.push(
        `**${origin} function** · ACTION **#${symbol.actionId}** (\`${formatActionId(symbol.actionId)}\`)\n`,
      );
    } else {
      parts.push(`**${origin} function**\n`);
    }

    parts.push("```nwscript\n" + symbol.signature + "\n```\n");

    if (symbol.documentation) {
      parts.push(`\n${escapeMarkdownText(symbol.documentation)}\n`);
    }

    let returns = `**Returns:** \`${symbol.returnType}\``;
    if (symbol.returnDocumentation) {
      returns += ` — ${escapeMarkdownText(symbol.returnDocumentation)}`;
    }
    parts.push(`\n${returns}\n`);

    if (symbol.parameters.length > 0) {
      parts.push("\n**Parameters**\n");
      for (const parameter of symbol.parameters) {
        const defaultSuffix = parameter.defaultValue !== undefined
          ? ` = \`${escapeInlineCode(parameter.defaultValue)}\``
          : "";
        const description = parameter.documentation
          ? ` — ${escapeMarkdownText(parameter.documentation)}`
          : "";
        parts.push(`- \`${parameter.type} ${parameter.name}\`${defaultSuffix}${description}\n`);
      }
    }
  } else {
    parts.push(
      symbol.kind === "constant"
        ? `**${origin} constant**\n`
        : `**${origin} symbol**\n`,
    );
    parts.push("```nwscript\n" + symbol.declaration + "\n```\n");
    parts.push(`\n**Type:** \`${symbol.type}\``);
    if (symbol.value !== undefined) {
      parts.push(` \n**Value:** \`${escapeInlineCode(symbol.value)}\``);
    }
    parts.push("\n");
    if (symbol.documentation) {
      parts.push(`\n${escapeMarkdownText(symbol.documentation)}\n`);
    }
  }

  parts.push(
    `\n**Availability:** ${escapeMarkdownText(symbol.sourceAvailability)}\n\n` +
    `**Source:** ${escapeMarkdownText(symbol.sourceLabel)}`,
  );

  if (symbol.sourceKind === "engine") {
    parts.push(`\n\n**Language spec:** ${escapeMarkdownText(source.label)}`);
  }

  if (symbol.curatedNotes.length > 0) {
    parts.push("\n\n---\n\n**NWScript notes**\n\n");
    for (const note of symbol.curatedNotes) {
      parts.push(`- ${escapeMarkdownText(note)}\n`);
    }
  }

  return parts.join("");
}

export function symbolOriginLabel(kind: SymbolSourceKind): string {
  switch (kind) {
    case "document":
      return "Script";
    case "include":
      return "Included";
    default:
      return "Engine";
  }
}

function stripPreprocessorDirectives(text: string): string {
  return text.replace(/^[ \t]*#[^\r\n]*(?:\r?\n|$)/gm, "\n");
}

function scanTopLevelStatements(
  text: string,
  includeFunctionDefinitions = false,
): Statement[] {
  const statements: Statement[] = [];
  const pendingComments: string[] = [];
  let code = "";
  let lineComment = "";
  let blockComment = "";
  let quote: string | undefined;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;
  let lineCodeSeen = false;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  const finishComment = (value: string, leading: boolean): void => {
    if (leading) {
      const cleaned = cleanComment(value);
      if (cleaned) {
        pendingComments.push(cleaned);
      }
    }
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      if (ch === "\n") {
        finishComment(lineComment, !lineCodeSeen && code.trim().length === 0);
        lineComment = "";
        inLineComment = false;
        lineCodeSeen = false;
      } else {
        lineComment += ch;
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        finishComment(blockComment, !lineCodeSeen && code.trim().length === 0);
        blockComment = "";
        inBlockComment = false;
        i += 1;
      } else {
        blockComment += ch;
      }
      continue;
    }

    if (quote) {
      code += ch;
      lineCodeSeen = true;
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = undefined;
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      lineComment = "";
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      blockComment = "";
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      code += ch;
      lineCodeSeen = true;
      continue;
    }

    if (ch === "(") parenDepth += 1;
    else if (ch === ")") parenDepth = Math.max(0, parenDepth - 1);
    else if (ch === "[") bracketDepth += 1;
    else if (ch === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    else if (ch === "{") {
      if (
        includeFunctionDefinitions &&
        braceDepth === 0 &&
        parenDepth === 0 &&
        bracketDepth === 0
      ) {
        const statementCode = code.trim();
        if (statementCode) {
          statements.push({
            code: statementCode,
            documentation: pendingComments.join("\n"),
          });
        }
        code = "";
        pendingComments.length = 0;
      }
      braceDepth += 1;
    } else if (ch === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      if (braceDepth === 0 && code.includes("{")) {
        code = "";
        pendingComments.length = 0;
        lineCodeSeen = true;
        continue;
      }
    }

    if (ch === ";" && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      const statementCode = code.trim();
      if (statementCode) {
        statements.push({
          code: statementCode,
          documentation: pendingComments.join("\n"),
        });
      }
      code = "";
      pendingComments.length = 0;
      lineCodeSeen = true;
      continue;
    }

    code += ch;
    if (ch === "\n") {
      lineCodeSeen = false;
    } else if (!/\s/.test(ch)) {
      lineCodeSeen = true;
    }
  }

  if (inLineComment) {
    finishComment(lineComment, !lineCodeSeen && code.trim().length === 0);
  }
  if (inBlockComment) {
    finishComment(blockComment, !lineCodeSeen && code.trim().length === 0);
  }

  return statements;
}

function normalizeDeclaration(code: string): string {
  return code.replace(/\s+/g, " ").trim();
}

function parseParameters(value: string): EngineParameter[] {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "void") {
    return [];
  }

  return splitTopLevel(trimmed, ",").map((raw, index) => {
    const part = raw.trim();
    const match = part.match(
      /^(?:const\s+)?([A-Za-z_]\w*)\s+([A-Za-z_]\w*)(?:\s*=\s*([\s\S]+))?$/,
    );
    if (!match) {
      return {
        type: "unknown",
        name: `arg${index + 1}`,
        defaultValue: undefined,
      };
    }
    return {
      type: match[1],
      name: match[2],
      defaultValue: match[3]?.trim(),
    };
  });
}

function splitTopLevel(value: string, delimiter: string): string[] {
  const result: string[] = [];
  let start = 0;
  let quote: string | undefined;
  let escaped = false;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = undefined;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "(") parenDepth += 1;
    else if (ch === ")") parenDepth -= 1;
    else if (ch === "[") bracketDepth += 1;
    else if (ch === "]") bracketDepth -= 1;
    else if (ch === "{") braceDepth += 1;
    else if (ch === "}") braceDepth -= 1;
    else if (
      ch === delimiter &&
      parenDepth === 0 &&
      bracketDepth === 0 &&
      braceDepth === 0
    ) {
      result.push(value.slice(start, i));
      start = i + 1;
    }
  }

  result.push(value.slice(start));
  return result;
}

function parseDocumentation(
  raw: string,
  parameters: readonly EngineParameter[],
): ParsedDocumentation {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const parameterNames = new Set(parameters.map((parameter) => parameter.name));
  const parameterDocs = new Map<string, string>();
  const description: string[] = [];
  let returns: string | undefined;

  for (const line of lines) {
    const paramTag = line.match(/^@param\s+([A-Za-z_]\w*)\s*[-:]?\s*(.*)$/i);
    if (paramTag && parameterNames.has(paramTag[1])) {
      parameterDocs.set(paramTag[1], paramTag[2].trim());
      continue;
    }

    const parameterLine = line.match(/^[-*]?\s*([A-Za-z_]\w*)\s*(?::|\s+-\s+)\s*(.+)$/);
    if (parameterLine && parameterNames.has(parameterLine[1])) {
      parameterDocs.set(parameterLine[1], parameterLine[2].trim());
      continue;
    }

    const returnTag = line.match(/^@returns?\s*[-:]?\s*(.*)$/i)
      ?? line.match(/^returns?\s*(?::|\s+-\s+)\s*(.*)$/i)
      ?? line.match(/^returns?\s+(.+)$/i);
    if (returnTag) {
      returns = returnTag[1].trim();
      continue;
    }

    description.push(line);
  }

  return {
    description: description.length > 0 ? description.join("\n") : undefined,
    parameters: parameterDocs,
    returns,
  };
}

function cleanComment(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\*\s?/, "").trimEnd())
    .join("\n")
    .trim();
}

export function formatParameter(parameter: EngineParameter): string {
  return `${parameter.type} ${parameter.name}${
    parameter.defaultValue !== undefined ? ` = ${parameter.defaultValue}` : ""
  }`;
}

export function formatParameterCompact(parameter: EngineParameter): string {
  return `${parameter.type} ${parameter.name}${
    parameter.defaultValue !== undefined ? `=${parameter.defaultValue}` : ""
  }`;
}

function groupByName<T extends { name: string }>(values: readonly T[]): ReadonlyMap<string, readonly T[]> {
  const result = new Map<string, T[]>();
  for (const value of values) {
    const existing = result.get(value.name);
    if (existing) existing.push(value);
    else result.set(value.name, [value]);
  }
  return result;
}

export function formatActionId(value: number): string {
  return `0x${value.toString(16).toUpperCase().padStart(4, "0")}`;
}

export function escapeInlineCode(value: string): string {
  return value.replace(/`/g, "\\`");
}

export function escapeMarkdownText(value: string): string {
  return value.replace(/[\\`*_{}\[\]()#+\-.!|>]/g, "\\$&");
}

export function sourceSortPrefix(kind: SymbolSourceKind): string {
  switch (kind) {
    case "document":
      return "0";
    case "include":
      return "1";
    default:
      return "2";
  }
}

export function sourceRank(kind: SymbolSourceKind): number {
  switch (kind) {
    case "document":
      return 0;
    case "include":
      return 1;
    default:
      return 2;
  }
}

export function preferredSymbols(
  model: EngineApiModel,
  name: string,
  documentResref?: string,
  position?: NssPosition,
): EngineSymbol[] {
  const symbols = [...(model.symbolsByName.get(name) ?? [])];
  if (symbols.length === 0) {
    return [];
  }

  if (documentResref && position) {
    const declarations = symbols.filter(
      (symbol) =>
        symbol.definition?.resref === documentResref &&
        rangeContains(symbol.definition.selectionRange, position),
    );
    if (declarations.length > 0) {
      return declarations;
    }
  }

  const rank = Math.min(...symbols.map((symbol) => sourceRank(symbol.sourceKind)));
  return symbols.filter((symbol) => sourceRank(symbol.sourceKind) === rank);
}

export function rangeContains(range: NssRange, position: NssPosition): boolean {
  if (position.line < range.start.line || position.line > range.end.line) {
    return false;
  }
  if (position.line === range.start.line && position.column < range.start.column) {
    return false;
  }
  if (position.line === range.end.line && position.column > range.end.column) {
    return false;
  }
  return true;
}

export function rangeKey(range: NssRange): string {
  return `${range.start.line}:${range.start.column}-${range.end.line}:${range.end.column}`;
}

export function symbolDefinitionKey(symbol: EngineSymbol): string {
  if (!symbol.definition) {
    return `missing:${symbol.sourceKind}:${symbol.name}`;
  }
  return `${symbol.definition.resref}|${rangeKey(symbol.definition.selectionRange)}`;
}

export function uniqueDefinitions(symbols: readonly EngineSymbol[]): EngineSymbol[] {
  const result: EngineSymbol[] = [];
  const seen = new Set<string>();

  for (const symbol of symbols) {
    if (!symbol.definition) {
      continue;
    }
    const key = symbolDefinitionKey(symbol);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(symbol);
  }
  return result;
}
