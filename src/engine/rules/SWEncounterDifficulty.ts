import { TwoDAObject } from "@/resource/TwoDAObject";

export class SWEncounterDifficulty {

  index: number;
  label: string;
  strref: number;
  value: number;

  constructor(index: number = 0, label: string = '', strref: number = -1, value: number = 0){
    this.index = index;
    this.label = label;
    this.strref = strref;
    this.value = value;
  }

  static From2DA(row: any): SWEncounterDifficulty {
    const difficulty = new SWEncounterDifficulty();
    difficulty.index = TwoDAObject.normalizeValue(row.__rowIndex, 'number', 0) as number;
    difficulty.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    difficulty.strref = TwoDAObject.normalizeValue(row.strref, 'number', -1) as number;
    difficulty.value = TwoDAObject.normalizeValue(row.value, 'number', 0) as number;
    return difficulty;
  }
}