/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { GFFDataType } from "./enums/resource/GFFDataType";
import { TLKManager } from "./managers/TLKManager";
import { TwoDAManager } from "./managers/TwoDAManager";
import { GFFField } from "./resource/GFFField";
import { GFFStruct } from "./resource/GFFStruct";
import { TwoDAObject } from "./resource/TwoDAObject";

/* @file
 * The Planetary class.
 */

export class Planetary {
  static planets: any[];
  static currentIndex: number;
  static current: any;

  static Init(){

    Planetary.planets = [];
    Planetary.currentIndex = -1;
    const planetary2DA = TwoDAManager.datatables.get('planetary');
    Planetary.current = undefined;
    let planetList = planetary2DA.rows;
    for(let i = 0; i < planetary2DA.RowCount; i++){
      Planetary.planets.push(
        new Planet(planetList[i])
      )
    }

  }

  static SetCurrentPlanet( index = 0 ){
    Planetary.currentIndex = index;
    Planetary.current = Planetary.planets[index];
  }

  static SetPlanetAvailable(index: number, bState: boolean){
    Planetary.planets[index].enabled = bState;
  }

  static SetPlanetSelectable(index: number, bState: boolean){
    Planetary.planets[index].selectable = bState;
  }

  static GetPlanetByGUITag(sTag = ''){

    for(let i = 0; i < Planetary.planets.length; i++){
      if(Planetary.planets[i].guitag === sTag){
        return Planetary.planets[i];
      }
    }

    return null;
  }

  static SaveStruct(){
    let struct = new GFFStruct();

    struct.AddField( new GFFField(GFFDataType.DWORD, 'GlxyMapNumPnts') ).SetValue(Planetary.planets.length);

    let planetMask = 0
    for(let i = 0; i < Planetary.planets.length; i++){
      let planet = Planetary.planets[i];
      if(planet.enabled){
        planetMask |= 1 << planet.id;
      }
      planetMask = planetMask >>> 0;
    }
    struct.AddField( new GFFField(GFFDataType.DWORD, 'GlxyMapPlntMsk') ).SetValue(planetMask);
    struct.AddField( new GFFField(GFFDataType.INT, 'GlxyMapSelPnt') ).SetValue(Planetary.current);

    return struct;
  }

}

export class Planet {
  id: number;
  label: any;
  name: any;
  description: any;
  icon: any;
  model: any;
  guitag: any;
  enabled: boolean;
  selectable: boolean;

  constructor(_2da: any = {}){
    this.id = parseInt(TwoDAObject.cellParser(_2da['(Row Label)']));
    this.label = TwoDAObject.cellParser(_2da.label);
    this.name = TwoDAObject.cellParser(_2da.name);
    this.description = TwoDAObject.cellParser(_2da.description);
    this.icon = TwoDAObject.cellParser(_2da.icon);
    this.model = TwoDAObject.cellParser(_2da.model);
    this.guitag = TwoDAObject.cellParser(_2da.guitag);

    this.enabled = false;
    this.selectable = false;
  }

  getId(){
    return this.id;
  }

  getLabel(){
    return this.label;
  }

  getName(){
    return TLKManager.TLKStrings[this.name].Value;
  }

  getDescription(){
    if(this.description)
      return TLKManager.TLKStrings[this.description].Value;
    else
      return '';
  }

  getIcon(){
    return this.icon;
  }

  getModel(){
    return this.model;
  }

}
