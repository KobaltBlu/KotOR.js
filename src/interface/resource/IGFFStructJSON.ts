import type { IGFFFieldJSON } from "@/interface/resource/IGFFFieldJSON";

export interface IGFFStructJSON {
  type: number;
  fields: { [key: string]: IGFFFieldJSON; };
}