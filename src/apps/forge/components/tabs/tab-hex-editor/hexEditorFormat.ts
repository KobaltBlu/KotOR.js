/** Bytes per row in the hex grid (classic width). */
export const HEX_BYTES_PER_ROW = 16;

const HEX_U = "0123456789ABCDEF";

export function formatOffset8(offset: number): string {
  return (offset >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

/** How the left offset column is shown in the hex editor. */
export type HexEditorOffsetDisplay = "hex" | "dec";

/** Unsigned byte offset, space-padded (fits uint32 max width). */
export function formatOffsetDecimal(offset: number): string {
  return String(offset >>> 0).padStart(10, " ");
}

export function formatOffsetForDisplay(offset: number, mode: HexEditorOffsetDisplay): string {
  return mode === "dec" ? formatOffsetDecimal(offset) : formatOffset8(offset);
}

export function rowCount(byteLength: number): number {
  if (byteLength <= 0) return 0;
  return Math.ceil(byteLength / HEX_BYTES_PER_ROW);
}

export function rowIndexForOffset(offset: number): number {
  return Math.floor((offset >>> 0) / HEX_BYTES_PER_ROW);
}

export function offsetForRow(rowIndex: number): number {
  return rowIndex * HEX_BYTES_PER_ROW;
}

export function parseHexNibble(c: string): number | null {
  if (!c || c.length !== 1) return null;
  const code = c.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 65 && code <= 70) return code - 55;
  if (code >= 97 && code <= 102) return code - 87;
  return null;
}

/** Parse exactly two hex digits into 0–255, or null if invalid. */
export function parseByteHex2(two: string): number | null {
  if (two.length !== 2) return null;
  const hi = parseHexNibble(two[0]!);
  const lo = parseHexNibble(two[1]!);
  if (hi === null || lo === null) return null;
  return (hi << 4) | lo;
}

export function byteToHex2(b: number): string {
  const x = b & 0xff;
  return HEX_U[x >> 4] + HEX_U[x & 15];
}

export function asciiChar(b: number): string {
  const x = b & 0xff;
  if (x >= 0x20 && x <= 0x7e) return String.fromCharCode(x);
  return ".";
}

/**
 * Parse "Go to offset" input: decimal, `0x` hex, or bare hex (no prefix).
 * Returns unsigned 32-bit offset or null.
 */
export function parseGoToOffset(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  if (/^0x[0-9a-fA-F]+$/i.test(t)) {
    const n = parseInt(t.slice(2), 16);
    return Number.isFinite(n) && n >= 0 ? n >>> 0 : null;
  }
  if (/^\d+$/.test(t)) {
    const n = parseInt(t, 10);
    return Number.isFinite(n) && n >= 0 ? n >>> 0 : null;
  }
  if (/^[0-9a-fA-F]{1,8}$/i.test(t)) {
    const n = parseInt(t, 16);
    return Number.isFinite(n) ? n >>> 0 : null;
  }
  return null;
}
