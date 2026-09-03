import { TwoDAObject } from "@/resource/TwoDAObject";

/** forceadjust.2da alignment-band row. */
export class SWForceAdjust {
  id: number = -1;
  goodcost: number = 1;
  evilcost: number = 1;

  static From2DA(row: any = {}): SWForceAdjust {
    const adjust = new SWForceAdjust();
    adjust.id = TwoDAObject.normalizeValue(row.__index ?? row.__rowIndex, 'number', -1) as number;
    adjust.goodcost = TwoDAObject.normalizeValue(row.goodcost, 'number', 1) as number;
    adjust.evilcost = TwoDAObject.normalizeValue(row.evilcost, 'number', 1) as number;
    return adjust;
  }
}
