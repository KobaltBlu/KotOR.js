/**
 * Pure helpers for the Forge 2DA table editor (rows, columns, selection, TSV).
 *
 * @file twoDAEditorOps.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type { TwoDAObject } from "@/resource/TwoDAObject";

export interface TwoDACellRef {
  row: number;
  column: string;
}

/** Rectangular range in visible-column index space (inclusive). */
export interface TwoDASelRange {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

export interface TwoDASearchMatch {
  row: number;
  column: string;
}

export type TwoDASortDir = "asc" | "desc";

export function createEmptyRow(twoDAObject: TwoDAObject, index: number): any {
  const newRow: any = { __index: index, __rowlabel: String(index) };
  for (let i = 1; i < twoDAObject.columns.length; i++) {
    newRow[twoDAObject.columns[i]] = "****";
  }
  return newRow;
}

export function cloneRow(source: any, index: number): any {
  const cloned = JSON.parse(JSON.stringify(source));
  cloned.__index = index;
  cloned.__rowlabel = String(index);
  return cloned;
}

export function collectRows(twoDAObject: TwoDAObject): any[] {
  return Object.keys(twoDAObject.rows)
    .map(Number)
    .sort((a, b) => a - b)
    .map((key) => twoDAObject.rows[key]);
}

/** Rebuild row map; overwrites __rowlabel with the new index. */
export function rebuildRows(twoDAObject: TwoDAObject, rows: any[]): void {
  twoDAObject.rows = {};
  rows.forEach((row, i) => {
    row.__index = i;
    row.__rowlabel = String(i);
    twoDAObject.rows[i] = row;
  });
  twoDAObject.RowCount = rows.length;
  twoDAObject.CellCount = twoDAObject.ColumnCount * twoDAObject.RowCount;
}

/** Rebuild row map; keeps each row's existing __rowlabel. */
export function rebuildRowsPreserveLabels(twoDAObject: TwoDAObject, rows: any[]): void {
  twoDAObject.rows = {};
  rows.forEach((row, i) => {
    const label = row.__rowlabel != null ? String(row.__rowlabel) : String(i);
    row.__index = i;
    row.__rowlabel = label;
    twoDAObject.rows[i] = row;
  });
  twoDAObject.RowCount = rows.length;
  twoDAObject.CellCount = twoDAObject.ColumnCount * twoDAObject.RowCount;
}

export function getVisibleColumns(
  columns: string[],
  showRowLabel: boolean,
  hiddenColumns: ReadonlySet<string>,
): string[] {
  return columns.filter((col) => {
    if (col === "__rowlabel" && !showRowLabel) return false;
    if (hiddenColumns.has(col)) return false;
    return true;
  });
}

export function normalizeRange(range: TwoDASelRange): TwoDASelRange {
  return {
    r0: Math.min(range.r0, range.r1),
    c0: Math.min(range.c0, range.c1),
    r1: Math.max(range.r0, range.r1),
    c1: Math.max(range.c0, range.c1),
  };
}

export function makeCellRange(row: number, colIndex: number): TwoDASelRange {
  return { r0: row, c0: colIndex, r1: row, c1: colIndex };
}

export function makeRowRange(row: number, colCount: number): TwoDASelRange {
  const last = Math.max(0, colCount - 1);
  return { r0: row, c0: 0, r1: row, c1: last };
}

export function makeAllRange(rowCount: number, colCount: number): TwoDASelRange {
  return {
    r0: 0,
    c0: 0,
    r1: Math.max(0, rowCount - 1),
    c1: Math.max(0, colCount - 1),
  };
}

export function rangeContains(range: TwoDASelRange, row: number, colIndex: number): boolean {
  const n = normalizeRange(range);
  return row >= n.r0 && row <= n.r1 && colIndex >= n.c0 && colIndex <= n.c1;
}

export function isCellSelected(
  ranges: TwoDASelRange[],
  row: number,
  colIndex: number,
): boolean {
  return ranges.some((r) => rangeContains(r, row, colIndex));
}

export function countSelectedCells(ranges: TwoDASelRange[]): number {
  const seen = new Set<string>();
  for (const raw of ranges) {
    const n = normalizeRange(raw);
    for (let r = n.r0; r <= n.r1; r++) {
      for (let c = n.c0; c <= n.c1; c++) {
        seen.add(`${r}:${c}`);
      }
    }
  }
  return seen.size;
}

export function selectionBounds(ranges: TwoDASelRange[]): TwoDASelRange | null {
  if (!ranges.length) return null;
  let r0 = Infinity;
  let c0 = Infinity;
  let r1 = -Infinity;
  let c1 = -Infinity;
  for (const raw of ranges) {
    const n = normalizeRange(raw);
    r0 = Math.min(r0, n.r0);
    c0 = Math.min(c0, n.c0);
    r1 = Math.max(r1, n.r1);
    c1 = Math.max(c1, n.c1);
  }
  if (!Number.isFinite(r0)) return null;
  return { r0, c0, r1, c1 };
}

export function selectionSummary(ranges: TwoDASelRange[]): string {
  if (!ranges.length) return "";
  const cells = countSelectedCells(ranges);
  if (cells <= 1) return "";
  const b = selectionBounds(ranges);
  if (!b) return `${cells} cells`;
  const rows = b.r1 - b.r0 + 1;
  const cols = b.c1 - b.c0 + 1;
  if (ranges.length === 1) return `${rows}R × ${cols}C`;
  return `${cells} cells · ${ranges.length} ranges`;
}

export function cellContains(value: string, query: string, caseSensitive: boolean): boolean {
  if (!query) return false;
  if (caseSensitive) return value.includes(query);
  return value.toLowerCase().includes(query.toLowerCase());
}

export function replaceInCell(
  value: string,
  query: string,
  replacement: string,
  caseSensitive: boolean,
): string {
  if (!query) return value;
  if (caseSensitive) {
    return value.split(query).join(replacement);
  }
  const lowerValue = value.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let result = "";
  let cursor = 0;
  let idx = lowerValue.indexOf(lowerQuery, cursor);
  while (idx !== -1) {
    result += value.slice(cursor, idx) + replacement;
    cursor = idx + query.length;
    idx = lowerValue.indexOf(lowerQuery, cursor);
  }
  result += value.slice(cursor);
  return result;
}

export function computeSearchMatches(
  twoDAObject: TwoDAObject,
  query: string,
  visibleColumns: string[],
  caseSensitive: boolean,
): TwoDASearchMatch[] {
  const q = query.trim();
  if (!q) return [];
  const matches: TwoDASearchMatch[] = [];
  for (let r = 0; r < twoDAObject.RowCount; r++) {
    const row = twoDAObject.rows[r];
    if (!row) continue;
    for (const column of visibleColumns) {
      const value = String(row[column] ?? "");
      if (cellContains(value, q, caseSensitive)) {
        matches.push({ row: r, column });
      }
    }
  }
  return matches;
}

function escapeTsvCell(value: string): string {
  if (/[\t\n\r"]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rangeToTsv(
  twoDAObject: TwoDAObject,
  range: TwoDASelRange,
  visibleColumns: string[],
): string {
  const n = normalizeRange(range);
  const lines: string[] = [];
  for (let r = n.r0; r <= n.r1; r++) {
    const row = twoDAObject.rows[r];
    if (!row) continue;
    const cells: string[] = [];
    for (let c = n.c0; c <= n.c1; c++) {
      const col = visibleColumns[c];
      if (!col) continue;
      cells.push(escapeTsvCell(String(row[col] ?? "")));
    }
    lines.push(cells.join("\t"));
  }
  return lines.join("\n");
}

export function rangesToTsv(
  twoDAObject: TwoDAObject,
  ranges: TwoDASelRange[],
  visibleColumns: string[],
): string {
  if (!ranges.length) return "";
  if (ranges.length === 1) {
    const n = normalizeRange(ranges[0]);
    if (n.r0 === n.r1 && n.c0 === n.c1) {
      const col = visibleColumns[n.c0];
      const row = twoDAObject.rows[n.r0];
      return col && row ? String(row[col] ?? "") : "";
    }
    return rangeToTsv(twoDAObject, ranges[0], visibleColumns);
  }
  return ranges.map((r) => rangeToTsv(twoDAObject, r, visibleColumns)).join("\n\n");
}

export function parseTsv(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalized.length) return [[""]];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === "\t") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  rows.push(row);
  // Drop a trailing empty row from a final newline
  if (rows.length > 1 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") {
    rows.pop();
  }
  return rows;
}

export function clearCellsInRanges(
  twoDAObject: TwoDAObject,
  ranges: TwoDASelRange[],
  visibleColumns: string[],
): void {
  const seen = new Set<string>();
  for (const raw of ranges) {
    const n = normalizeRange(raw);
    for (let r = n.r0; r <= n.r1; r++) {
      const row = twoDAObject.rows[r];
      if (!row) continue;
      for (let c = n.c0; c <= n.c1; c++) {
        const col = visibleColumns[c];
        if (!col || col === "__rowlabel") continue;
        const key = `${r}:${col}`;
        if (seen.has(key)) continue;
        seen.add(key);
        row[col] = "****";
      }
    }
  }
}

export function pasteTsvAt(
  twoDAObject: TwoDAObject,
  grid: string[][],
  startRow: number,
  startColIndex: number,
  visibleColumns: string[],
): void {
  if (!grid.length) return;
  for (let dr = 0; dr < grid.length; dr++) {
    const targetRow = startRow + dr;
    while (targetRow >= twoDAObject.RowCount) {
      const idx = twoDAObject.RowCount;
      twoDAObject.rows[idx] = createEmptyRow(twoDAObject, idx);
      twoDAObject.RowCount++;
    }
    twoDAObject.CellCount = twoDAObject.ColumnCount * twoDAObject.RowCount;
    const row = twoDAObject.rows[targetRow];
    if (!row) continue;
    const line = grid[dr] || [];
    for (let dc = 0; dc < line.length; dc++) {
      const col = visibleColumns[startColIndex + dc];
      if (!col || col === "__rowlabel") continue;
      row[col] = line[dc];
    }
  }
}

export function addColumn(twoDAObject: TwoDAObject, name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "__rowlabel") return false;
  if (twoDAObject.columns.includes(trimmed)) return false;
  twoDAObject.columns.push(trimmed);
  twoDAObject.ColumnCount = twoDAObject.columns.length - 1;
  for (const row of collectRows(twoDAObject)) {
    row[trimmed] = "****";
  }
  twoDAObject.CellCount = twoDAObject.ColumnCount * twoDAObject.RowCount;
  return true;
}

export function renameColumn(twoDAObject: TwoDAObject, oldName: string, newName: string): boolean {
  if (oldName === "__rowlabel") return false;
  const trimmed = newName.trim();
  if (!trimmed || trimmed === "__rowlabel") return false;
  if (trimmed === oldName) return true;
  if (twoDAObject.columns.includes(trimmed)) return false;
  const idx = twoDAObject.columns.indexOf(oldName);
  if (idx < 0) return false;
  twoDAObject.columns[idx] = trimmed;
  for (const row of collectRows(twoDAObject)) {
    row[trimmed] = row[oldName];
    delete row[oldName];
  }
  return true;
}

export function deleteColumn(twoDAObject: TwoDAObject, name: string): boolean {
  if (name === "__rowlabel") return false;
  const idx = twoDAObject.columns.indexOf(name);
  if (idx < 0) return false;
  twoDAObject.columns.splice(idx, 1);
  twoDAObject.ColumnCount = Math.max(0, twoDAObject.columns.length - 1);
  for (const row of collectRows(twoDAObject)) {
    delete row[name];
  }
  twoDAObject.CellCount = twoDAObject.ColumnCount * twoDAObject.RowCount;
  return true;
}

function compareCellValues(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  const aNum = a !== "" && a !== "****" && !Number.isNaN(na) && String(na) === a.trim();
  const bNum = b !== "" && b !== "****" && !Number.isNaN(nb) && String(nb) === b.trim();
  if (aNum && bNum) return na - nb;
  return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
}

export function sortRowsByColumn(
  twoDAObject: TwoDAObject,
  column: string,
  dir: TwoDASortDir,
): void {
  const rows = collectRows(twoDAObject);
  const factor = dir === "asc" ? 1 : -1;
  rows.sort((ra, rb) => {
    const va = String(ra[column] ?? "");
    const vb = String(rb[column] ?? "");
    return factor * compareCellValues(va, vb);
  });
  rebuildRowsPreserveLabels(twoDAObject, rows);
}

export async function writeClipboardText(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // fall through
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

export async function readClipboardText(): Promise<string> {
  try {
    if (navigator.clipboard?.readText) {
      return await navigator.clipboard.readText();
    }
  } catch {
    // fall through
  }
  return "";
}
