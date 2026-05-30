import { TLKManager } from "@/managers/TLKManager";
import { TwoDAObject } from "@/resource/TwoDAObject";

export class SWCreatureSize {
  id: number;
  label: string;
  acattachmod: number;
  strref: number;

  getName(){
    return this.strref != -1 ? TLKManager.GetStringById(this.strref).Value : this.label;
  }

  static From2DA(row: any = {}){
    const creatureSize = new SWCreatureSize();
    creatureSize.id = TwoDAObject.normalizeValue(row.__index, 'number', -1);
    creatureSize.label = TwoDAObject.normalizeValue(row.label, 'string', '');
    creatureSize.acattachmod = TwoDAObject.normalizeValue(row.acattachmod, 'number', -1);
    creatureSize.strref = TwoDAObject.normalizeValue(row.strref, 'number', -1);
    return creatureSize;
  }
}