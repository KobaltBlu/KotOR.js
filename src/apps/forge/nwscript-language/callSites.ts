/**
 * Call-site scanner for NWScript signature help and inlay hints.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file callSites.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export interface CallContext {
  functionName: string;
  argumentIndex: number;
}

export interface CallSite {
  functionName: string;
  argumentStarts: number[];
  closeOffset: number;
}

interface DelimiterFrame {
  kind: "paren" | "bracket" | "brace";
  functionName?: string;
  argumentIndex: number;
  argumentStarts: number[];
  declaration: boolean;
}

export function findCallContext(text: string, offset: number): CallContext | undefined {
  const stack = scan(text, offset).stack;
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const frame = stack[i];
    if (frame.kind === "paren" && frame.functionName && !frame.declaration) {
      return {
        functionName: frame.functionName,
        argumentIndex: frame.argumentIndex,
      };
    }
  }
  return undefined;
}

export function scanCallSites(text: string): CallSite[] {
  return scan(text, text.length).calls;
}

function scan(text: string, limit: number): { stack: DelimiterFrame[]; calls: CallSite[] } {
  const stack: DelimiterFrame[] = [];
  const calls: CallSite[] = [];
  let quote: string | undefined;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = 0; i < limit; i += 1) {
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

    if (ch === "(") {
      stack.push({
        kind: "paren",
        functionName: identifierBefore(text, i),
        argumentIndex: 0,
        argumentStarts: [i + 1],
        declaration: looksLikeDeclaration(text, i),
      });
      continue;
    }
    if (ch === "[") {
      stack.push({ kind: "bracket", argumentIndex: 0, argumentStarts: [i + 1], declaration: false });
      continue;
    }
    if (ch === "{") {
      stack.push({ kind: "brace", argumentIndex: 0, argumentStarts: [i + 1], declaration: false });
      continue;
    }
    if (ch === ")") {
      const frame = peek(stack, "paren");
      if (frame?.functionName && !frame.declaration) {
        calls.push({
          functionName: frame.functionName,
          argumentStarts: frame.argumentStarts.slice(),
          closeOffset: i,
        });
      }
      popDelimiter(stack, "paren");
      continue;
    }
    if (ch === "]") {
      popDelimiter(stack, "bracket");
      continue;
    }
    if (ch === "}") {
      popDelimiter(stack, "brace");
      continue;
    }
    if (ch === "," && stack.at(-1)?.kind === "paren") {
      const frame = stack[stack.length - 1];
      frame.argumentIndex += 1;
      frame.argumentStarts.push(i + 1);
    }
  }

  return { stack, calls };
}

function peek(stack: DelimiterFrame[], kind: DelimiterFrame["kind"]): DelimiterFrame | undefined {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (stack[i].kind === kind) return stack[i];
  }
  return undefined;
}

function popDelimiter(stack: DelimiterFrame[], kind: DelimiterFrame["kind"]): void {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (stack[i].kind === kind) {
      stack.splice(i, 1);
      return;
    }
  }
}

export function identifierBefore(text: string, offset: number): string | undefined {
  let end = offset;
  while (end > 0 && /\s/.test(text[end - 1])) {
    end -= 1;
  }
  let start = end;
  while (start > 0 && /[A-Za-z0-9_]/.test(text[start - 1])) {
    start -= 1;
  }
  const value = text.slice(start, end);
  return /^[A-Za-z_]\w*$/.test(value) ? value : undefined;
}

function looksLikeDeclaration(text: string, parenOffset: number): boolean {
  const name = identifierBefore(text, parenOffset);
  if (!name) return false;
  let end = parenOffset;
  while (end > 0 && /\s/.test(text[end - 1])) end -= 1;
  let start = end;
  while (start > 0 && /[A-Za-z0-9_]/.test(text[start - 1])) start -= 1;
  let i = start;
  while (i > 0 && /\s/.test(text[i - 1])) i -= 1;
  let typeEnd = i;
  let typeStart = typeEnd;
  while (typeStart > 0 && /[A-Za-z0-9_]/.test(text[typeStart - 1])) typeStart -= 1;
  const type = text.slice(typeStart, typeEnd);
  return /^(void|int|float|string|object|effect|event|location|talent|itemproperty|vector|action|struct)$/.test(type);
}

export function skipTrivia(text: string, offset: number): number {
  let i = offset;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  return i;
}
