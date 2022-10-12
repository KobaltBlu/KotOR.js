import { GameState } from "../GameState";
import { OdysseyModel } from "../odyssey";
import { OdysseyModel3D } from "../three/odyssey";
import { ModuleArea } from "./ModuleArea";
import * as THREE from "three";

export class AreaWeather {
  area: ModuleArea;
  model: OdysseyModel3D;
  ChanceSnow: number;
  ChanceRain: number;
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
      if(this.ChanceSnow == 100){
        GameState.ModelLoader.load({
          file: 'fx_snow',
          onLoad: (mdl: OdysseyModel) => {
            OdysseyModel3D.FromMDL(mdl, { 
              onComplete: (model: OdysseyModel3D) => {
                this.model = model;
                GameState.weather_effects.push(model);
                GameState.group.weather_effects.add(model);
                //TextureLoader.LoadQueue();
                resolve();
              },
              manageLighting: false
            });
          },
          onError: () => {
            resolve();
          }
        });
      }else if(this.ChanceRain == 100){
        GameState.ModelLoader.load({
          file: 'fx_rain',
          onLoad: (mdl: OdysseyModel) => {
            OdysseyModel3D.FromMDL(mdl, { 
              onComplete: (model: OdysseyModel3D) => {
                this.model = model;
                GameState.weather_effects.push(model);
                GameState.group.weather_effects.add(model);
                //TextureLoader.LoadQueue();
                resolve();
              },
              manageLighting: false
            });
          },
          onError: () => {
            resolve();
          }
        });
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
