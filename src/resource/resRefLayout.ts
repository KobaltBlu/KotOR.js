import { BinaryReader } from '@/utility/binary/BinaryReader';

/**
 * Fixed-width on-disk size for a ResRef in key tables, RIM/ERF rows, and TLK sound slots
 * (16-byte char storage, null-padded). Matches original-engine fixed-slot ResRef layout used
 * alongside {@link RESREF_GFF_MAX_PAYLOAD}-byte logical caps in GFF payloads.
 */
export const RESREF_FIXED_SLOT_BYTES = 16;

/**
 * Maximum ResRef string length in GFF field data (one length byte then that many characters).
 * Matches the original engine's ResRef capacity and keeps write paths consistent.
 */
export const RESREF_GFF_MAX_PAYLOAD = 16;

/**
 * Normalize a 16-byte fixed-slot string read from archives or the TLK index (strip trailing
 * null padding; other call sites may apply case or whitespace rules).
 */
export function normalizeResRefFromArchiveSlot(raw: string): string {
  if (raw == null) {
    return '';
  }
  return String(raw).replace(/\0[\s\S]*$/g, '');
}

/**
 * Read a GFF ResRef from the current reader position: one length byte, then up to
 * {@link RESREF_GFF_MAX_PAYLOAD} characters. If the length byte exceeds the cap (corrupt or
 * non-conformant data), only the first cap characters contribute to the string; the remaining
 * declared bytes are consumed so a linear read stays aligned with the on-disk layout.
 */
export function readGffResRefPayload(reader: BinaryReader): string {
  const L = reader.readByte();
  if (L === 0) {
    return '';
  }
  const capped = Math.min(L, RESREF_GFF_MAX_PAYLOAD);
  const chars = reader.readChars(capped);
  if (L > RESREF_GFF_MAX_PAYLOAD) {
    reader.skip(L - RESREF_GFF_MAX_PAYLOAD);
  }
  return chars.replace(/\0[\s\S]*$/g, '').slice(0, RESREF_GFF_MAX_PAYLOAD);
}

/**
 * Clamp a JS string for writing a GFF ResRef (length byte + payload): strip trailing NUL tail,
 * then truncate to {@link RESREF_GFF_MAX_PAYLOAD}.
 */
export function clampResRefForGffWrite(value: unknown): string {
  if (value == null) {
    return '';
  }
  const s = String(value).replace(/\0[\s\S]*$/g, '');
  return s.slice(0, RESREF_GFF_MAX_PAYLOAD);
}
