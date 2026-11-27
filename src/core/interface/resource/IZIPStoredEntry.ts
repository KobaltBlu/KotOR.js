/**
 * One file inside a STORE-only (compression method 0) ZIP being built or read by {@link ZIPObject}.
 */
export interface IZIPStoredEntry {
  path: string;
  data: Uint8Array;
  /** Present after {@link ZIPObject.load}; omitted when building from {@link ZIPObject.addStoredEntry}. */
  crc32?: number;
}
