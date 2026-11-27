import type { IGFFStructJSON } from "@core/interface/resource/IGFFStructJSON";

/** OpenKotOR / BioWare GFF JSON field type names. */
export type IGFFFieldTypeName =
  | 'byte'
  | 'char'
  | 'word'
  | 'short'
  | 'dword'
  | 'int'
  | 'dword64'
  | 'int64'
  | 'float'
  | 'double'
  | 'cexostring'
  | 'cexolocstring'
  | 'resref'
  | 'void'
  | 'struct'
  | 'list'
  | 'vector'
  | 'orientation';

export interface IGFFVector3JSON {
  x: number;
  y: number;
  z: number;
}

export interface IGFFVector4JSON {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** Localized substrings keyed by language/gender id, plus optional TLK string ref. */
export interface IGFFCExoLocStringJSON {
  id?: number;
  [languageGenderId: string]: string | number | undefined;
}

/**
 * OpenKotOR GFF JSON field shape
 * (`https://openkotor.com/schemas/gff.schema.json`).
 */
export interface IGFFFieldJSON {
  type: IGFFFieldTypeName;
  value?: number | string | IGFFStructJSON | IGFFStructJSON[] | IGFFVector3JSON | IGFFVector4JSON | IGFFCExoLocStringJSON;
  value64?: string;
  id?: number;
  __struct_id?: number;
}
