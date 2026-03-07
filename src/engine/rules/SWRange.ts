import { TLKManager } from "../../managers/TLKManager";
import { TwoDAObject } from "../../resource/TwoDAObject";

const RANGE_TYPES = {
  SPELL: 0,
  WEAPON: 1,
  PERCEPTION: 2,
  PARTY: 3,
  TRAP: 4,
  DEBUG: 5,
} as const;

export class SWRange {
  id: number;
  label: string;
  primaryRange: number;
  secondaryRange: number;
  name: number;

  getName(){
    return this.name != -1 ? TLKManager.GetStringById(this.name).Value : this.label;
  }

  getType(){
    switch(this.id){
      case 0:
      case 1:
      case 2:
      case 3:
      case 4:
      case 19:
        return RANGE_TYPES.SPELL;
      case 5:
      case 6:
      case 7:
        return RANGE_TYPES.WEAPON;
      case 8:
      case 9:
      case 10:
      case 11:
      case 12:
      case 13:
        return RANGE_TYPES.PERCEPTION;
      case 14:
      case 15:
      case 16:
      case 18:
        return RANGE_TYPES.PARTY;
      case 17:
        return RANGE_TYPES.TRAP;
      case 20:
        return RANGE_TYPES.DEBUG;
    }
    return RANGE_TYPES.SPELL;
  }

  static From2DA(row: any = {}){
    const range = new SWRange();
    range.id = TwoDAObject.normalizeValue(row.__index, 'number', -1);
    range.label = TwoDAObject.normalizeValue(row.label, 'string', '');
    range.primaryRange = TwoDAObject.normalizeValue(row.primaryrange, 'number', 0);
    range.secondaryRange = TwoDAObject.normalizeValue(row.secondaryrange, 'number', 0);
    range.name = TwoDAObject.normalizeValue(row.name, 'number', -1);
    return range;
  }
}