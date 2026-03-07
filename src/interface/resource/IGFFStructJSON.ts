import type { IGFFFieldJSON } from "./IGFFFieldJSON";

export interface IGFFStructJSON {
  type: number;
  fields: { [key: string]: IGFFFieldJSON; };
}