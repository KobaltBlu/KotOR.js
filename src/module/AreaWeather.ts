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

  update(delta: number = 0){
    if(this.model){
      this.model.position.copy( GameState.getCurrentPlayer().position ).add( new THREE.Vector3(0,0,3) );
      this.model.update(delta);
    }
  }

  async load(){
    return new Promise<void>( (resolve, reject) => {
      if(this.chanceSnow == 100){
        MDLLoader.loader.load('fx_snow')
        .then((mdl: OdysseyModel) => {
          OdysseyModel3D.FromMDL(mdl, {
            context: GameState,
            // manageLighting: false
          }).then((model: OdysseyModel3D) => {
            this.model = model;
            GameState.weather_effects.push(model);
            GameState.group.weather_effects.add(model);
            //TextureLoader.LoadQueue();
            resolve();
          }).catch(resolve);
        }).catch(resolve);
      }else if(this.chanceRain == 100){
        MDLLoader.loader.load('fx_rain')
        .then((mdl: OdysseyModel) => {
          OdysseyModel3D.FromMDL(mdl, {
            context: GameState,
            // manageLighting: false
          }).then((model: OdysseyModel3D) => {
            this.model = model;
            GameState.weather_effects.push(model);
            GameState.group.weather_effects.add(model);
            //TextureLoader.LoadQueue();
            resolve();
          }).catch(resolve);
        }).catch(resolve);
      }else{
        resolve();
      }
    });
  }

  destroy(){
    let index = GameState.weather_effects.indexOf(this.model);
    if(index >= 1){
      this.model.remove();
      this.model.dispose();
      GameState.weather_effects.splice(index, 1);
    }
    //Remove all weather effects
    // while(GameState.weather_effects.length){
    //   GameState.weather_effects[0].dispose();
    //   GameState.weather_effects.shift();
    // }
  }

}
