import { TwoDAObject } from '@/resource/TwoDAObject';

export class SWFaction {
  id: number;
  label: string;

  reputationMap: Map<string, number> = new Map();

  getReputation(key: string = ''): number {
    return this.reputationMap.get(key.toLocaleLowerCase()) ?? 0;
  }

  getName(): string {
    return this.label;
  }

  static From2DA(row: Record<string, string | number> = {}) {
    const faction = new SWFaction();
    faction.id = TwoDAObject.normalizeValue(row.__index, 'number', -1) as number;
    faction.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;

    Object.keys(row).forEach((key) => {
      if (key.startsWith('__index') || key.startsWith('__rowlabel') || key.startsWith('label')) {
        return;
      }
      faction.reputationMap.set(key, TwoDAObject.normalizeValue(row[key], 'number', 0) as number);
    });

    return faction;
  }
}
