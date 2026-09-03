/**
 * NSS source line ↔ NCS code-offset maps produced during decompile.
 *
 * Lines are 1-based (Monaco). Offsets are code offsets after the NCS header.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file nssCodeLineMap.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export interface NssCodeLineMap {
  nssLineToCodeOffset: Map<number, number>;
  codeOffsetToNssLine: Map<number, number>;
}

export function createEmptyNssCodeLineMap(): NssCodeLineMap {
  return {
    nssLineToCodeOffset: new Map(),
    codeOffsetToNssLine: new Map(),
  };
}

export function stampNssCodeLine(map: NssCodeLineMap, nssLine: number, codeOffset: number | undefined): void {
  if (nssLine < 1 || codeOffset == null || !Number.isFinite(codeOffset)) {
    return;
  }
  map.nssLineToCodeOffset.set(nssLine, codeOffset);
  if (!map.codeOffsetToNssLine.has(codeOffset)) {
    map.codeOffsetToNssLine.set(codeOffset, nssLine);
  }
}

/** Shift 1-based generator lines so they match a file that prepends a header. */
export function shiftNssCodeLineMap(map: NssCodeLineMap, lineDelta: number): NssCodeLineMap {
  if (!lineDelta) {
    return map;
  }
  const shifted = createEmptyNssCodeLineMap();
  for (const [line, offset] of map.nssLineToCodeOffset) {
    stampNssCodeLine(shifted, line + lineDelta, offset);
  }
  return shifted;
}

export function nearestNssLineForCodeOffset(map: NssCodeLineMap, codeOffset: number): number | undefined {
  const exact = map.codeOffsetToNssLine.get(codeOffset);
  if (exact != null) {
    return exact;
  }
  let bestLine: number | undefined;
  let bestOffset = -1;
  for (const [offset, line] of map.codeOffsetToNssLine) {
    if (offset <= codeOffset && offset > bestOffset) {
      bestOffset = offset;
      bestLine = line;
    }
  }
  return bestLine;
}

export function codeOffsetForNssLine(map: NssCodeLineMap, nssLine: number): number | undefined {
  const exact = map.nssLineToCodeOffset.get(nssLine);
  if (exact != null) {
    return exact;
  }
  let bestOffset: number | undefined;
  let bestLine = -1;
  for (const [line, offset] of map.nssLineToCodeOffset) {
    if (line <= nssLine && line > bestLine) {
      bestLine = line;
      bestOffset = offset;
    }
  }
  return bestOffset;
}
