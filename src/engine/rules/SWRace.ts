import { TwoDAObject } from "../../resource/TwoDAObject";

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

  static From2DA(row: any = {}){
    const race = new SWRace();

    race.id = parseInt(row.__index);

    if(row.hasOwnProperty('label'))
      race.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    
    if(row.hasOwnProperty('abrev'))
      race.abrev = TwoDAObject.normalizeValue(row.abrev, 'string', '') as string;
    
    if(row.hasOwnProperty('name'))
      race.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;
    
    if(row.hasOwnProperty('convername'))
      race.converName = TwoDAObject.normalizeValue(row.convername, 'number', -1) as number;
    
    if(row.hasOwnProperty('convernamelower'))
      race.converNameLower = TwoDAObject.normalizeValue(row.convernamelower, 'number', -1) as number;
    
    if(row.hasOwnProperty('nameplural'))
      race.namePlural = TwoDAObject.normalizeValue(row.nameplural, 'number', -1) as number;
    
    if(row.hasOwnProperty('description'))
      race.description = TwoDAObject.normalizeValue(row.description, 'number', -1) as number;
    
    if(row.hasOwnProperty('appearance'))
      race.appearance = TwoDAObject.normalizeValue(row.appearance, 'number', -1) as number;
    
    if(row.hasOwnProperty('stradjust'))
      race.strAdjust = TwoDAObject.normalizeValue(row.stradjust, 'number', 0) as number;
    
    if(row.hasOwnProperty('dexadjust'))
      race.dexAdjust = TwoDAObject.normalizeValue(row.dexadjust, 'number', 0) as number;
    
    if(row.hasOwnProperty('intadjust'))
      race.intAdjust = TwoDAObject.normalizeValue(row.intadjust, 'number', 0) as number;
    
    if(row.hasOwnProperty('chaadjust'))
      race.chaAdjust = TwoDAObject.normalizeValue(row.chaadjust, 'number', 0) as number;
    
    if(row.hasOwnProperty('wisadjust'))
      race.wisAdjust = TwoDAObject.normalizeValue(row.wisadjust, 'number', 0) as number;
    
    if(row.hasOwnProperty('conadjust'))
      race.conAdjust = TwoDAObject.normalizeValue(row.conadjust, 'number', 0) as number;
    
    if(row.hasOwnProperty('endurance'))
      race.endurance = TwoDAObject.normalizeValue(row.endurance, 'number', 0) as number;
    
    if(row.hasOwnProperty('favored'))
      race.favored = TwoDAObject.normalizeValue(row.favored, 'number', -1) as number;
    
    if(row.hasOwnProperty('featstable'))
      race.featsTable = TwoDAObject.normalizeValue(row.featstable, 'string', '') as string;
    
    if(row.hasOwnProperty('biography'))
      race.biography = TwoDAObject.normalizeValue(row.biography, 'string', '') as number;
    
    if(row.hasOwnProperty('playerrace'))
      race.playerRace = TwoDAObject.normalizeValue(row.playerrace, 'boolean', false) as boolean;
    
    if(row.hasOwnProperty('constant'))
      race.constant = TwoDAObject.normalizeValue(row.constant, 'string', '') as string;
    
    if(row.hasOwnProperty('age'))
      race.age = TwoDAObject.normalizeValue(row.age, 'number', 18) as number;
    
    if(row.hasOwnProperty('toolsetdefaultclass'))
      race.toolsetDefaultClass = TwoDAObject.normalizeValue(row.toolsetdefaultclass, 'number', -1) as number;

    return race;
  }

}