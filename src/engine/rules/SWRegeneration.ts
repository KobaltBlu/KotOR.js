import { TwoDAObject } from "@/resource/TwoDAObject";

/** regeneration.2da row (0 combat, 1 out of combat). */
export class SWRegeneration {
  id: number = -1;
  forceregen: number = 0;
  healthregen: number = 0;

  static From2DA(row: any = {}): SWRegeneration {
    const regeneration = new SWRegeneration();
    regeneration.id = TwoDAObject.normalizeValue(row.__index ?? row.__rowIndex, 'number', -1) as number;
    regeneration.forceregen = TwoDAObject.normalizeValue(row.forceregen, 'number', 0) as number;
    regeneration.healthregen = TwoDAObject.normalizeValue(row.healthregen, 'number', 0) as number;
    return regeneration;
  }
}
