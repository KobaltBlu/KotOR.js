import { TwoDAObject } from "@/resource/TwoDAObject";

/**
 * GrenadeSND.2da row — surface material index → bounce/impact sound.
 * Loaded by Load2DArrays_GrenadeSound.
 * Rows share indices with surfacemat.2da (Dirt, Grass, Stone, …).
 *
 * @file SWGrenadeSound.ts
 */
export class SWGrenadeSound {
  id: number = -1;
  label: string = '';
  sound: string = '';

  getSoundResRef(): string {
    const s = (this.sound || '').trim();
    if(!s || s === '****' || s === '***') return '';
    return s;
  }

  static From2DA(row: any = {}): SWGrenadeSound {
    const entry = new SWGrenadeSound();
    entry.id = TwoDAObject.normalizeValue(row.__index, 'number', -1) as number;
    entry.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    entry.sound = TwoDAObject.normalizeValue(row.sound, 'string', '') as string;
    return entry;
  }
}
