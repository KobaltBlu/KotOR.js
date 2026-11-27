import { TwoDAObject } from "@core/resource/TwoDAObject";

/** forceshields.2da row. */
export class SWForceShield {
  id: number = -1;
  visualeffectdef: number = -1;
  damageflags: number = 0;
  resistance: number = 0;
  amount: number = 0;
  vulnerflags: number = 0;

  static From2DA(row: any = {}): SWForceShield {
    const shield = new SWForceShield();
    shield.id = TwoDAObject.normalizeValue(row.__index ?? row.__rowIndex, 'number', -1) as number;
    shield.visualeffectdef = TwoDAObject.normalizeValue(row.visualeffectdef, 'number', -1) as number;
    shield.damageflags = TwoDAObject.normalizeValue(row.damageflags, 'number', 0) as number;
    shield.resistance = TwoDAObject.normalizeValue(row.resistance, 'number', 0) as number;
    shield.amount = TwoDAObject.normalizeValue(row.amount, 'number', 0) as number;
    shield.vulnerflags = TwoDAObject.normalizeValue(row.vulnerflags, 'number', 0) as number;
    return shield;
  }
}
