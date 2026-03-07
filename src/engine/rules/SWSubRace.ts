import { TwoDAObject } from "../../resource/TwoDAObject";

export class SWSubRace {
  id: number;
  label: string;

  static From2DA(row: any = {}){
    const subRace = new SWSubRace();
    subRace.id = TwoDAObject.normalizeValue(row.__index, 'number', -1);
    subRace.label = TwoDAObject.normalizeValue(row.label, 'string', '');
    return subRace;
  }
}