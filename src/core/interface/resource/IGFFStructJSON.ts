import type { IGFFFieldJSON } from "@core/interface/resource/IGFFFieldJSON";

/**
 * OpenKotOR GFF JSON struct shape
 * (`https://openkotor.com/schemas/gff.schema.json`).
 *
 * Field labels are object keys. `__struct_id` is omitted when the structure ID is -1.
 */
export interface IGFFStructJSON {
  __struct_id?: number;
  [fieldLabel: string]: IGFFFieldJSON | number | undefined;
}

/**
 * Root GFF document JSON, including the 4-character file type (e.g. UTC, ARE, GIT).
 */
export interface IGFFRootJSON extends IGFFStructJSON {
  __data_type: string;
}
