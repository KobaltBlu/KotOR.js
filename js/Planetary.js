/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The Planetary class.
 */

class Planetary {

  static Init(){

    Planetary.planets = [];
    Planetary.currentIndex = -1;
    Planetary.current = undefined;
    let planetList = Global.kotor2DA.planetary.rows;
    for(let i = 0; i < Global.kotor2DA.planetary.RowCount; i++){
      Planetary.planets.push(
        new Planet(planetList[i])
      )
    }

  }

  static SetCurrentPlanet( index = 0 ){
    Planetary.currentIndex = index;
    Planetary.current = Planetary.planets[index];
  }

  static SetPlanetAvailable(index, bState){
    Planetary.planets[index].enabled = bState;
  }

  static SetPlanetSelectable(index, bState){
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
    let struct = new Struct();

    struct.AddField( new Field(GFFDataTypes.DWORD, 'GlxyMapNumPnts') ).SetValue(Planetary.planets.length);

    let planetMask = 0
    for(let i = 0; i < Planetary.planets.length; i++){
      let planet = Planetary.planets[i];
      if(planet.enabled){
        planetMask |= 1 << planet.id;
      }
      planetMask = planetMask >>> 0;
    }
    struct.AddField( new Field(GFFDataTypes.DWORD, 'GlxyMapPlntMsk') ).SetValue(planetMask);
    struct.AddField( new Field(GFFDataTypes.INT, 'GlxyMapSelPnt') ).GetValue(Planetary.current);

    return struct;
  }

}

class Planet {

  constructor(_2da = null){
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
    return Global.kotorTLK.TLKStrings[this.name].Value;
  }

  getDescription(){
    if(this.description)
      return Global.kotorTLK.TLKStrings[this.description].Value;
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



module.exports = {
  Planetary: Planetary,
  Planet: Planet
};