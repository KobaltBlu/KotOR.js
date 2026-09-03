import { TwoDAObject } from "@/resource/TwoDAObject";

/** acbonus.2da row with dynamic class columns. */
export class SWACBonus {
  id: number = -1;
  bonuses: Record<string, number> = {};

  getBonus(column: string): number {
    return this.bonuses[(column || '').toLowerCase()] ?? 0;
  }

  static From2DA(row: any = {}): SWACBonus {
    const bonus = new SWACBonus();
    bonus.id = TwoDAObject.normalizeValue(row.__index ?? row.__rowIndex, 'number', -1) as number;
    Object.keys(row).forEach((column) => {
      if(column.startsWith('__')) return;
      bonus.bonuses[column.toLowerCase()] = TwoDAObject.normalizeValue(row[column], 'number', 0) as number;
    });
    return bonus;
  }
}
