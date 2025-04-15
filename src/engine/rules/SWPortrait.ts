import { TwoDAObject } from "../../resource/TwoDAObject";

export class SWPortrait {
  static portraits: any[] = [];
  id: number;
  appearancenumber: number;
  baseresref: string;
  sex: number;
  race: number;
  inanimatetype: any;
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
        return !!this.baseresrefvvve ? this.baseresrefvvve : this.baseresref;
      case 1:
        return !!this.baseresrefvve ? this.baseresrefvve : this.baseresref;
      case 2:
        return !!this.baseresrefve ? this.baseresrefve : this.baseresref;
      case 3:
        return !!this.baseresrefe ? this.baseresrefe : this.baseresref;
      case 4:
        return this.baseresref;
      default:
        return this.baseresref; 
    }
  }

  static From2DA(row: any = {}){
    const portrait = new SWPortrait();

    if(row.hasOwnProperty('id'))
      portrait.id = TwoDAObject.normalizeValue(row.id, 'number', 0);

    if(row.hasOwnProperty('appearancenumber'))
      portrait.appearancenumber = TwoDAObject.normalizeValue(row.appearancenumber, 'number', 0);

    if(row.hasOwnProperty('baseresref'))
      portrait.baseresref = TwoDAObject.normalizeValue(row.baseresref, 'string', '');

    if(row.hasOwnProperty('sex'))
      portrait.sex = TwoDAObject.normalizeValue(row.sex, 'number', 0);

    if(row.hasOwnProperty('race'))
      portrait.race = TwoDAObject.normalizeValue(row.race, 'number', 0);

    if(row.hasOwnProperty('inanimatetype'))
      portrait.inanimatetype = TwoDAObject.normalizeValue(row.inanimatetype, 'number', 0);

    if(row.hasOwnProperty('plot'))
      portrait.plot = TwoDAObject.normalizeValue(row.plot, 'number', 0);

    if(row.hasOwnProperty('lowgore'))
      portrait.lowgore = TwoDAObject.normalizeValue(row.lowgore, 'number', 0);

    if(row.hasOwnProperty('appearance_s'))
      portrait.appearance_s = TwoDAObject.normalizeValue(row.appearance_s, 'number', 0);

    if(row.hasOwnProperty('appearance_l'))
      portrait.appearance_l = TwoDAObject.normalizeValue(row.appearance_l, 'number', 0);

    if(row.hasOwnProperty('forpc'))
      portrait.forpc = TwoDAObject.normalizeValue(row.forpc, 'number', 0);

    if(row.hasOwnProperty('baseresrefe'))
      portrait.baseresrefe = TwoDAObject.normalizeValue(row.baseresrefe, 'string', '');

    if(row.hasOwnProperty('baseresrefve'))
      portrait.baseresrefve = TwoDAObject.normalizeValue(row.baseresrefve, 'string', '');

    if(row.hasOwnProperty('baseresrefvve'))
      portrait.baseresrefvve = TwoDAObject.normalizeValue(row.baseresrefvve, 'string', '');

    if(row.hasOwnProperty('baseresrefvvve'))
      portrait.baseresrefvvve = TwoDAObject.normalizeValue(row.baseresrefvvve, 'string', '');

    return portrait;
  }
}
