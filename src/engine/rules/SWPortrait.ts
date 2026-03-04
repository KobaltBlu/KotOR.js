import type { ITwoDARowData } from "@/resource/TwoDAObject";
import { TwoDAObject } from "@/resource/TwoDAObject";

export class SWPortrait {
  static portraits: ITwoDARowData[] = [];
  id: number;
  appearancenumber: number;
  baseresref: string;
  sex: number;
  race: number;
  inanimatetype: string | number;
  plot: number;
  lowgore: number;
  appearance_s: number;
  appearance_l: number;
  forpc: number;
  baseresrefe: string;
  baseresrefve: string;
  baseresrefvve: string;
  baseresrefvvve: string;

  getPortraitGoodEvil(nGoodEvil: number){
    nGoodEvil = nGoodEvil > 50 ? 50 : nGoodEvil;
    const evilIndex = Math.floor(nGoodEvil/10);
    switch(evilIndex){
      case 0:
        return this.baseresrefvvve ? this.baseresrefvvve : this.baseresref;
      case 1:
        return this.baseresrefvve ? this.baseresrefvve : this.baseresref;
      case 2:
        return this.baseresrefve ? this.baseresrefve : this.baseresref;
      case 3:
        return this.baseresrefe ? this.baseresrefe : this.baseresref;
      case 4:
        return this.baseresref;
      default:
        return this.baseresref;
    }
  }

  static From2DA(row: ITwoDARowData | Record<string, string | number> = {}): SWPortrait {
    const portrait = new SWPortrait();

    if(Object.hasOwn(row,'__index'))
      portrait.id = TwoDAObject.normalizeValue(row.__index, 'number', 0);

    if(Object.hasOwn(row,'appearancenumber'))
      portrait.appearancenumber = TwoDAObject.normalizeValue(row.appearancenumber, 'number', 0);

    if(Object.hasOwn(row,'baseresref'))
      portrait.baseresref = TwoDAObject.normalizeValue(row.baseresref, 'string', '');

    if(Object.hasOwn(row,'sex'))
      portrait.sex = TwoDAObject.normalizeValue(row.sex, 'number', 0);

    if(Object.hasOwn(row,'race'))
      portrait.race = TwoDAObject.normalizeValue(row.race, 'number', 0);

    if(Object.hasOwn(row,'inanimatetype'))
      portrait.inanimatetype = TwoDAObject.normalizeValue(row.inanimatetype, 'number', 0);

    if(Object.hasOwn(row,'plot'))
      portrait.plot = TwoDAObject.normalizeValue(row.plot, 'number', 0);

    if(Object.hasOwn(row,'lowgore'))
      portrait.lowgore = TwoDAObject.normalizeValue(row.lowgore, 'number', 0);

    if(Object.hasOwn(row,'appearance_s'))
      portrait.appearance_s = TwoDAObject.normalizeValue(row.appearance_s, 'number', 0);

    if(Object.hasOwn(row,'appearance_l'))
      portrait.appearance_l = TwoDAObject.normalizeValue(row.appearance_l, 'number', 0);

    if(Object.hasOwn(row,'forpc'))
      portrait.forpc = TwoDAObject.normalizeValue(row.forpc, 'number', 0);

    if(Object.hasOwn(row,'baseresrefe'))
      portrait.baseresrefe = TwoDAObject.normalizeValue(row.baseresrefe, 'string', '');

    if(Object.hasOwn(row,'baseresrefve'))
      portrait.baseresrefve = TwoDAObject.normalizeValue(row.baseresrefve, 'string', '');

    if(Object.hasOwn(row,'baseresrefvve'))
      portrait.baseresrefvve = TwoDAObject.normalizeValue(row.baseresrefvve, 'string', '');

    if(Object.hasOwn(row,'baseresrefvvve'))
      portrait.baseresrefvvve = TwoDAObject.normalizeValue(row.baseresrefvvve, 'string', '');

    return portrait;
  }
}
