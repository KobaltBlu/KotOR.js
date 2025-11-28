import { TLKManager } from "../../managers/TLKManager";
import { TwoDAObject } from "../../resource/TwoDAObject";

export class SWCreatureSpeed {

  id: number;
  label: string;
  name: number;
  _2daname: string;
  walkrate: number;
  runrate: number;

  getName(){
    return this.name != -1 ? TLKManager.GetStringById(this.name).Value : this.label;
  }

  static From2DA(row: any = {}){
    const creatureSpeed = new SWCreatureSpeed();
    creatureSpeed.id = TwoDAObject.normalizeValue(row.__index, 'number', -1);
    creatureSpeed.label = TwoDAObject.normalizeValue(row.label, 'string', '');
    creatureSpeed.name = TwoDAObject.normalizeValue(row.name, 'number', -1);
    creatureSpeed._2daname = TwoDAObject.normalizeValue(row._2daname, 'string', '');
    creatureSpeed.walkrate = TwoDAObject.normalizeValue(row.walkrate, 'number', 1.00);
    creatureSpeed.runrate = TwoDAObject.normalizeValue(row.runrate, 'number', 1.00);
    return creatureSpeed;
  }
}