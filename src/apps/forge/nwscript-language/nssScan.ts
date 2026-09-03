/**
 * Text scans used by NSS navigation, highlights, and semantic tokens.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file nssScan.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { escapeRegExp, type NssPosition, type NssRange } from "./engineApiModel";

export interface IncludeTarget {
  resource: string;
  range: NssRange;
}

export function maskNonCode(text: string): string {
  const chars = text.split("");
  let quote: string | undefined;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = 0; i < chars.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (lineComment) {
      if (ch === "\n") lineComment = false;
      else chars[i] = " ";
    } else if (blockComment) {
      chars[i] = " ";
      if (ch === "*" && next === "/") {
        chars[i + 1] = " ";
        blockComment = false;
        i += 1;
      }
    } else if (quote) {
      chars[i] = " ";
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = undefined;
    } else if (ch === "/" && next === "/") {
      chars[i] = chars[i + 1] = " ";
      lineComment = true;
      i += 1;
    } else if (ch === "/" && next === "*") {
      chars[i] = chars[i + 1] = " ";
      blockComment = true;
      i += 1;
    } else if (ch === '"' || ch === "'") {
      chars[i] = " ";
      quote = ch;
    }
  }
  return chars.join("");
}

export function identifierOffsets(text: string, name: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  let quote: string | undefined;
  let escaped = false;
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
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
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

    if (!/[A-Za-z_]/.test(ch)) {
      continue;
    }

    let end = i + 1;
    while (end < text.length && /[A-Za-z0-9_]/.test(text[end])) {
      end += 1;
    }

    if (text.slice(i, end) === name) {
      ranges.push({ start: i, end });
    }
    i = end - 1;
  }

  return ranges;
}

export function includeFromLine(
  line: string,
  lineNumber1Based: number,
  column1Based?: number,
): IncludeTarget | undefined {
  const match = /^\s*#\s*include\s+"([^"]+)"/.exec(line);
  if (!match) {
    return undefined;
  }

  const value = match[1];
  const start = line.indexOf(value, match.index);
  if (start < 0) {
    return undefined;
  }

  const range: NssRange = {
    start: { line: lineNumber1Based, column: start + 1 },
    end: { line: lineNumber1Based, column: start + value.length + 1 },
  };

  if (column1Based != null) {
    const position: NssPosition = { line: lineNumber1Based, column: column1Based };
    if (position.column < range.start.column || position.column > range.end.column) {
      return undefined;
    }
  }

  return { resource: value, range };
}

export function matchingBrace(text: string, openBrace: number): number {
  let depth = 0;
  for (let i = openBrace; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}" && --depth === 0) return i;
  }
  return -1;
}

export function containingBlockEnd(text: string, functionBrace: number, offset: number): number {
  const stack: number[] = [];
  for (let i = functionBrace; i <= offset; i += 1) {
    if (text[i] === "{") stack.push(i);
    else if (text[i] === "}") stack.pop();
  }
  return matchingBrace(text, stack.at(-1) ?? functionBrace);
}

export interface LocalIdentifier {
  definition: NssRange;
  scope: NssRange;
}

export function resolveLocalIdentifier(
  text: string,
  offset: number,
  name: string,
  positionFromOffset: (o: number) => NssPosition,
): LocalIdentifier | undefined {
  const masked = maskNonCode(text);
  const functionPattern = /\b[A-Za-z_]\w*\s+[A-Za-z_]\w*\s*\(([^;{}]*)\)\s*\{/g;

  for (const match of masked.matchAll(functionPattern)) {
    const headerStart = match.index ?? 0;
    const openBrace = headerStart + match[0].lastIndexOf("{");
    const closeBrace = matchingBrace(masked, openBrace);
    if (closeBrace < 0 || offset < headerStart || offset > closeBrace) {
      continue;
    }

    const candidates: Array<{ offset: number; scopeStart: number; scopeEnd: number }> = [];
    const parameterText = match[1];
    const parameterStart = headerStart + match[0].indexOf(parameterText);
    const parameterPattern = /(?:^|,)\s*(?:const\s+)?[A-Za-z_]\w*\s+([A-Za-z_]\w*)/g;
    for (const parameter of parameterText.matchAll(parameterPattern)) {
      if (parameter[1] !== name) continue;
      const relativeName = parameter[0].lastIndexOf(name);
      const paramIndex = parameter.index ?? 0;
      candidates.push({
        offset: parameterStart + paramIndex + relativeName,
        scopeStart: parameterStart + paramIndex + relativeName,
        scopeEnd: closeBrace,
      });
    }

    const body = masked.slice(openBrace + 1, closeBrace);
    const declarationPattern = new RegExp(
      `\\b(?:const\\s+)?[A-Za-z_]\\w*\\s+(${escapeRegExp(name)})\\b(?=\\s*(?:=|;|,))`,
      "g",
    );
    for (const declaration of body.matchAll(declarationPattern)) {
      const declarationOffset = openBrace + 1 + (declaration.index ?? 0) + declaration[0].lastIndexOf(name);
      const blockEnd = containingBlockEnd(masked, openBrace, declarationOffset);
      if (declarationOffset <= offset + name.length && offset <= blockEnd) {
        candidates.push({
          offset: declarationOffset,
          scopeStart: declarationOffset,
          scopeEnd: blockEnd,
        });
      }
    }

    const declaration = candidates.sort((a, b) => b.offset - a.offset)[0];
    if (!declaration) {
      return undefined;
    }

    return {
      definition: {
        start: positionFromOffset(declaration.offset),
        end: positionFromOffset(declaration.offset + name.length),
      },
      scope: {
        start: positionFromOffset(declaration.scopeStart),
        end: positionFromOffset(declaration.scopeEnd),
      },
    };
  }

  return undefined;
}

export function nextArgEnd(text: string, start: number, close: number): number {
  let depth = 0;
  let quote: string | undefined;
  for (let i = start; i < close; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = undefined;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      if (depth === 0) return i;
      depth -= 1;
    } else if (ch === "," && depth === 0) {
      return i;
    }
  }
  return close;
}
