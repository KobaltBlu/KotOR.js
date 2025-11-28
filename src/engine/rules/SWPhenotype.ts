import { TLKManager } from "../../managers/TLKManager";
import { TwoDAObject } from "../../resource/TwoDAObject";

export class SWPhenotype {
  id: number;
  label: string;
  name: number;

  getName(){
    return this.name != -1 ? TLKManager.GetStringById(this.name).Value : this.label;
  }

  static From2DA(row: any = {}){
    const phenotype = new SWPhenotype();
    phenotype.id = TwoDAObject.normalizeValue(row.__index, 'number', -1);
    phenotype.label = TwoDAObject.normalizeValue(row.label, 'string', '');
    phenotype.name = TwoDAObject.normalizeValue(row.name, 'number', -1);
    return phenotype;
  }
}