import type { IGFFStructJSON } from "@/interface/resource/IGFFStructJSON";
import type { GFFDataType } from "@/enums/resource/GFFDataType";

export interface IGFFFieldJSON {
  type: GFFDataType;
  value: any;
  structs?: IGFFStructJSON[];
}