import type { ITwoDARowData } from "@/resource/TwoDAObject";
import { TwoDAObject } from "@/resource/TwoDAObject";

export class SWDifficulty {
  name: number;
  desc: string;
  multiplier: number;

  apply2DA(row: ITwoDARowData | Record<string, string | number>): void {
    this.name = TwoDAObject.normalizeValue(row.name, 'number', -1);
    this.desc = TwoDAObject.normalizeValue(row.desc, 'string', '');
    this.multiplier = TwoDAObject.normalizeValue(row.multiplier, 'number', 0);
  }

  static From2DA(row: ITwoDARowData | Record<string, string | number>): SWDifficulty {
    const difficulty = new SWDifficulty();
    difficulty.apply2DA(row);
    return difficulty;
  }
}
