import { TLKManager } from "../../managers/TLKManager";
import { TwoDAObject } from "../../resource/TwoDAObject";

export class SWSoundSet {
  id: number;
  label: string;
  resref: string;
  strref: number;
  gender: number;
  type: number;

  getName(){
    return this.strref != -1 ? TLKManager.GetStringById(this.strref).Value : this.label;
  }

  static From2DA(row: any = {}){
    const soundSet = new SWSoundSet();
    soundSet.id = TwoDAObject.normalizeValue(row.__index, 'number', -1);
    soundSet.label = TwoDAObject.normalizeValue(row.label, 'string', '');
    soundSet.resref = TwoDAObject.normalizeValue(row.resref, 'string', '');
    soundSet.strref = TwoDAObject.normalizeValue(row.strref, 'number', -1);
    soundSet.gender = TwoDAObject.normalizeValue(row.gender, 'number', -1);
    soundSet.type = TwoDAObject.normalizeValue(row.type, 'number', -1);
    return soundSet;
  }
}