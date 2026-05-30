/**
 * Forge SSF editor — TLK string normalization (no React / tab UI).
 * Kept beside {@link TabSSFEditorState} so Jest can import without loading TabSSFEditor.
 */

/** Normalize TLK `SoundResRef` for display and preview. */
export function normalizeSoundResRef(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") {
    return raw.replace(/\0[\s\S]*$/g, "").trim();
  }
  if (Array.isArray(raw)) {
    const s = raw
      .map((c) => (typeof c === "string" ? c : String.fromCharCode(Number(c) & 0xff)))
      .join("");
    return s.replace(/\0[\s\S]*$/g, "").trim();
  }
  return String(raw)
    .replace(/\0[\s\S]*$/g, "")
    .trim();
}
