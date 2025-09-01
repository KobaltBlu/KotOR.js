import { GameState } from "../GameState";
import { OdysseyModel } from "../odyssey";
import { OdysseyModel3D } from "../three/odyssey";
import { ModuleArea } from "./ModuleArea";
import { WeatherCondition } from "../enums/module/WeatherCondition";
import * as THREE from "three";
import { MDLLoader } from "../loaders";

/**
* AreaWeather class.
* 
* Class representing the logic that powers area weather.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file AreaWeather.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class AreaWeather {

  area: ModuleArea;
  model: OdysseyModel3D;
  chanceSnow: number = 0;
  chanceRain: number = 0;
  chanceLightning: number = 0;
  currentWeather: WeatherCondition = WeatherCondition.CLEAR;
  started: boolean = false;

  constructor(area: ModuleArea){
    this.area = area;
  }

  /**
   * Update the weather model to animate the weather effect
   */
  update(delta: number = 0){
    if(this.model){
      this.model.position.copy( GameState.getCurrentPlayer().position ).add( new THREE.Vector3(0,0,3) );
      this.model.update(delta);
    }
  }

  /**
   * Get the weather condition based on the chance of snow, rain, and lightning
   * @returns WeatherCondition
   */
  getWeatherCondition(): WeatherCondition {
    const random = Math.random() * 100;
    if (random < this.chanceSnow) {
      return WeatherCondition.SNOW;
    } else if (random < this.chanceSnow + this.chanceRain) {
      return WeatherCondition.RAIN;
    } else if (random < this.chanceSnow + this.chanceRain + this.chanceLightning) {
      return WeatherCondition.LIGHTNING;
    }
    return WeatherCondition.CLEAR;
  }

  /**
   * Get the weather model name based on the weather condition
   * @returns string
   */
  getWeatherModelName(): string {
    switch(this.getWeatherCondition()){
      case WeatherCondition.SNOW:
        return 'fx_snow';
      case WeatherCondition.RAIN:
        return 'fx_rain';
      case WeatherCondition.LIGHTNING:
        return 'fx_lightning';
    }
    return '';
  }

  /**
   * Load the weather model
   */
  async load(){
    this.currentWeather = this.getWeatherCondition();
    const weatherModelName = this.getWeatherModelName();
    try{
      if(weatherModelName){
        const mdl = await MDLLoader.loader.load(weatherModelName);
        const model = await OdysseyModel3D.FromMDL(mdl, {
          context: GameState
        });
        this.model = model;
        GameState.group.weather_effects.add(model);
      }
    }catch(e){
      console.error(e);
    }
  }

  /**
   * Destroy the weather model
   */
  destroy(){
    if(this.model){
      this.model.remove();
      this.model.dispose();
      this.model = undefined;
    }
  }

}
