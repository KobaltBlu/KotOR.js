import { TwoDAObject } from "@/resource/TwoDAObject";

/** plot.2da row. */
export class SWPlot {
  id: number = -1;
  label: string = '';
  xp: number = 0;

  static From2DA(row: any = {}): SWPlot {
    const plot = new SWPlot();
    plot.id = TwoDAObject.normalizeValue(row.__index ?? row.__rowIndex, 'number', -1) as number;
    plot.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    plot.xp = TwoDAObject.normalizeValue(row.xp, 'number', 0) as number;
    return plot;
  }

  static GetByLabel(rows: SWPlot[], label: string = ''): SWPlot | undefined {
    const wanted = label.toLowerCase();
    return rows.find((row) => row?.label?.toLowerCase() === wanted);
  }

  static GetByIndex(rows: SWPlot[], index: number): SWPlot | undefined {
    return rows[index];
  }
}
