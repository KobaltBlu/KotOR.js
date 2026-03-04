import { TLKManager } from "@/managers/TLKManager";
import { TwoDAObject } from "@/resource/TwoDAObject";
import type { ITwoDARowData } from "@/resource/TwoDAObject";

/**
 * SWRace class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SWRace.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SWRace {

  id: number = 0;
  label: string = '';
  abrev: string = '';
  name: number = -1;
  converName: number = -1;
  converNameLower: number = -1;
  namePlural: number = -1;
  description: number = -1;
  appearance: number = -1;
  strAdjust: number = 0;
  dexAdjust: number = 0;
  intAdjust: number = 0;
  chaAdjust: number = 0;
  wisAdjust: number = 0;
  conAdjust: number = 0;
  endurance: number = 0;
  favored: number = -1;
  featsTable: string = '';
  biography: number = -1;
  playerRace: boolean = false;
  constant: string = '';
  age: number = 18;
  toolsetDefaultClass: number = -1;

  getName(){
    return this.name != -1 ? TLKManager.GetStringById(this.name).Value : this.label;
  }

  static From2DA(row: ITwoDARowData | Record<string, string | number> = {}){
    const race = new SWRace();

    race.id = parseInt(row.__index);

    if(Object.hasOwn(row,'label'))
      race.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    
    if(Object.hasOwn(row,'abrev'))
      race.abrev = TwoDAObject.normalizeValue(row.abrev, 'string', '') as string;
    
    if(Object.hasOwn(row,'name'))
      race.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;
    
    if(Object.hasOwn(row,'convername'))
      race.converName = TwoDAObject.normalizeValue(row.convername, 'number', -1) as number;
    
    if(Object.hasOwn(row,'convernamelower'))
      race.converNameLower = TwoDAObject.normalizeValue(row.convernamelower, 'number', -1) as number;
    
    if(Object.hasOwn(row,'nameplural'))
      race.namePlural = TwoDAObject.normalizeValue(row.nameplural, 'number', -1) as number;
    
    if(Object.hasOwn(row,'description'))
      race.description = TwoDAObject.normalizeValue(row.description, 'number', -1) as number;
    
    if(Object.hasOwn(row,'appearance'))
      race.appearance = TwoDAObject.normalizeValue(row.appearance, 'number', -1) as number;
    
    if(Object.hasOwn(row,'stradjust'))
      race.strAdjust = TwoDAObject.normalizeValue(row.stradjust, 'number', 0) as number;
    
    if(Object.hasOwn(row,'dexadjust'))
      race.dexAdjust = TwoDAObject.normalizeValue(row.dexadjust, 'number', 0) as number;
    
    if(Object.hasOwn(row,'intadjust'))
      race.intAdjust = TwoDAObject.normalizeValue(row.intadjust, 'number', 0) as number;
    
    if(Object.hasOwn(row,'chaadjust'))
      race.chaAdjust = TwoDAObject.normalizeValue(row.chaadjust, 'number', 0) as number;
    
    if(Object.hasOwn(row,'wisadjust'))
      race.wisAdjust = TwoDAObject.normalizeValue(row.wisadjust, 'number', 0) as number;
    
    if(Object.hasOwn(row,'conadjust'))
      race.conAdjust = TwoDAObject.normalizeValue(row.conadjust, 'number', 0) as number;
    
    if(Object.hasOwn(row,'endurance'))
      race.endurance = TwoDAObject.normalizeValue(row.endurance, 'number', 0) as number;
    
    if(Object.hasOwn(row,'favored'))
      race.favored = TwoDAObject.normalizeValue(row.favored, 'number', -1) as number;
    
    if(Object.hasOwn(row,'featstable'))
      race.featsTable = TwoDAObject.normalizeValue(row.featstable, 'string', '') as string;
    
    if(Object.hasOwn(row,'biography'))
      race.biography = TwoDAObject.normalizeValue(row.biography, 'number', -1) as number;
    
    if(Object.hasOwn(row,'playerrace'))
      race.playerRace = TwoDAObject.normalizeValue(row.playerrace, 'boolean', false) as boolean;
    
    if(Object.hasOwn(row,'constant'))
      race.constant = TwoDAObject.normalizeValue(row.constant, 'string', '') as string;
    
    if(Object.hasOwn(row,'age'))
      race.age = TwoDAObject.normalizeValue(row.age, 'number', 18) as number;
    
    if(Object.hasOwn(row,'toolsetdefaultclass'))
      race.toolsetDefaultClass = TwoDAObject.normalizeValue(row.toolsetdefaultclass, 'number', -1) as number;

    return race;
  }

}