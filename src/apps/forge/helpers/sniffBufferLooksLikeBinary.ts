const DEFAULT_SAMPLE = 8192;

/**
 * Heuristic: should this buffer open in a hex view instead of a text editor?
 * - NUL in the sample → binary
 * - C0/C1 control characters (except tab/LF/CR) above a small ratio → binary
 * - Invalid UTF-8 (replacement chars when decoding) → binary
 */
export function sniffBufferLooksLikeBinary(
  bytes: Uint8Array,
  options?: { sampleMaxBytes?: number },
): boolean {
  const sampleMax = options?.sampleMaxBytes ?? DEFAULT_SAMPLE;
  const n = Math.min(sampleMax, bytes.length);
  if (n === 0) {
    return false;
  }
  const slice = bytes.subarray(0, n);

  for (let i = 0; i < slice.length; i++) {
    if (slice[i] === 0) {
      return true;
    }
  }

  let badControl = 0;
  for (let i = 0; i < slice.length; i++) {
    const b = slice[i]!;
    if (b < 32 && b !== 9 && b !== 10 && b !== 13) {
      badControl++;
    }
  }
  if (badControl / slice.length > 0.02) {
    return true;
  }

  const text = new TextDecoder("utf-8", { fatal: false }).decode(slice);
  if (text.includes("\uFFFD")) {
    return true;
  }

  return false;
}
