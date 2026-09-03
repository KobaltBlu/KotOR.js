import { TwoDAObject } from "@/resource/TwoDAObject";

/** poison.2da row. Columns vary between game versions and may be accessed dynamically. */
export class SWPoison {
  [column: string]: any;
  id: number = -1;

  static From2DA(row: any = {}): SWPoison {
    const poison = new SWPoison();
    poison.id = TwoDAObject.normalizeValue(row.__index ?? row.__rowIndex, 'number', -1) as number;

    Object.keys(row).forEach((column) => {
      if(column.startsWith('__')) return;
      const value = row[column];
      const numeric = Number(value);
      poison[column.toLowerCase()] = value !== '' && value !== '****' && Number.isFinite(numeric)
        ? TwoDAObject.normalizeValue(value, 'number', 0)
        : TwoDAObject.normalizeValue(value, 'string', '');
    });

    return poison;
  }
}
