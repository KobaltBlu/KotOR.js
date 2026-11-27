import { TwoDAObject } from "@core/resource/TwoDAObject";

/** traps.2da row. */
export class SWTrap {
  id: number = -1;
  name: number = -1;
  model: string = '';
  explosionsound: string = '';
  resref: string = '';
  trapscript: string = '';
  detectdcmod: number = 0;
  disarmdcmod: number = 0;
  setdc: number = 1;

  get setDC(): number {
    return this.setdc;
  }

  get SetDC(): number {
    return this.setdc;
  }

  static From2DA(row: any = {}): SWTrap {
    const trap = new SWTrap();
    trap.id = TwoDAObject.normalizeValue(row.__index ?? row.__rowIndex, 'number', -1) as number;
    trap.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;
    trap.model = TwoDAObject.normalizeValue(row.model, 'string', '') as string;
    trap.explosionsound = TwoDAObject.normalizeValue(row.explosionsound, 'string', '') as string;
    trap.resref = TwoDAObject.normalizeValue(row.resref, 'string', '') as string;
    trap.trapscript = TwoDAObject.normalizeValue(row.trapscript, 'string', '') as string;
    trap.detectdcmod = TwoDAObject.normalizeValue(row.detectdcmod, 'number', 0) as number;
    trap.disarmdcmod = TwoDAObject.normalizeValue(row.disarmdcmod, 'number', 0) as number;
    trap.setdc = TwoDAObject.normalizeValue(
      row.setdc ?? row.SetDC ?? row.setDC,
      'number',
      1
    ) as number;
    return trap;
  }
}
