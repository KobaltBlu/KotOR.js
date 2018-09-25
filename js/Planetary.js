/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The Planetary class.
 */

class Planetary {

  static Init(){

    Planetary.planets = [];
    Planetary.current = null;
    let planetList = Global.kotor2DA.planetary.rows;
    for(let i = 0; i < Global.kotor2DA.planetary.RowCount; i++){
      Planetary.planets.push(
        new Planet(planetList[i])
      )
    }

  }

  static SetCurrentPlanet(iNum){
    Planetary.current = Planetary.planets[iNum];
  }

  static SetPlanetAvailable(iNum, bState){
    Planetary.planets[iNum].enabled = bState;
  }

  static SetPlanetSelectable(iNum, bState){
    Planetary.planets[iNum].selectable = bState;
  }

  static GetPlanetByGUITag(sTag = ''){

    for(let i = 0; i < Planetary.planets.length; i++){
      if(Planetary.planets[i].guitag === sTag){
        return Planetary.planets[i];
      }
    }

    return null;
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