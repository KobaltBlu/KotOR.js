import { TLKManager } from "@/managers/TLKManager";
import { TwoDAObject } from "@/resource/TwoDAObject";

export class SWGender {
  static genders: SWGender[] = [];
  id: number;
  name: number;
  gender: 'M'|'F'|'B'|'O'|'N'|string;
  graphic: number;
  constant: string;

  getName(){
    return TLKManager.GetStringById(this.name).Value;
  }

  static From2DA(row: any = {}){
    const gender = new SWGender();
    gender.id = TwoDAObject.normalizeValue(row.__index, 'number', -1);
    gender.name = TwoDAObject.normalizeValue(row.name, 'number', -1);
    gender.gender = TwoDAObject.normalizeValue(row.gender, 'string', '');
    gender.graphic = TwoDAObject.normalizeValue(row.graphic, 'number', -1);
    gender.constant = TwoDAObject.normalizeValue(row.constant, 'string', '');
    return gender;
  }
}