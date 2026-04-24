import type { IGFFStructJSON } from '@/interface/resource/IGFFStructJSON';
import type { GFFDataType } from '@/enums/resource/GFFDataType';

export interface IGFFFieldJSON {
  type: GFFDataType;
  /** Type-dependent: number, string, Uint8Array, vector/orientation object, CExoLocString, or nested data. Use structs for LIST/STRUCT. */
  value: unknown;
  structs?: IGFFStructJSON[];
}
