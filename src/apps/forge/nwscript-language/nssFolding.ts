/**
 * Brace and grouped #include folding for NWScript.
 *
 * Line numbers are 0-based inclusive, matching the workbench scanner.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file nssFolding.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export interface NssFoldRange {
  start: number;
  end: number;
}

export function foldNss(text: string): NssFoldRange[] {
  const ranges: NssFoldRange[] = [];
  const braceStack: number[] = [];
  let includeStart = -1;
  let includeEnd = -1;
  const lines = text.split(/\r?\n/);
  let quote: string | undefined;
  let blockComment = false;

  const flushIncludes = (): void => {
    if (includeStart >= 0 && includeEnd > includeStart) {
      ranges.push({ start: includeStart, end: includeEnd });
    }
    includeStart = -1;
    includeEnd = -1;
  };

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const line = lines[lineNumber];
    if (!quote && !blockComment && /^\s*#\s*include\s+"/i.test(line)) {
      if (includeStart < 0) includeStart = lineNumber;
      includeEnd = lineNumber;
    } else {
      flushIncludes();
    }

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      const next = line[i + 1];
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
      if (ch === "/" && next === "/") break;
      if (ch === "/" && next === "*") {
        blockComment = true;
        i += 1;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }
      if (ch === "{") braceStack.push(lineNumber);
      else if (ch === "}") {
        const start = braceStack.pop();
        if (start != null && lineNumber > start) {
          ranges.push({ start, end: lineNumber });
        }
      }
    }
  }
  flushIncludes();
  return ranges;
}
