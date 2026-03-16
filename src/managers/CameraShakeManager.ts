import * as THREE from "three";

import { EngineMode } from "@/enums/engine/EngineMode";
import { GameState } from "@/GameState";
import { TwoDAManager } from "@/managers/TwoDAManager";
import { createScopedLogger, LogScope } from "@/utility/Logger";


const log = createScopedLogger(LogScope.Manager);

interface RumbleSample {
  magnitude: number;
  time: number;
  timeMax: number;
}

/**
 * CameraShakeManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CameraShakeManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CameraShakeManager {
  static position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  static quaternion: THREE.Quaternion =  new THREE.Quaternion(0, 0, 0, 1);
  static active: boolean = false;
  static cache: any = {
    position: new THREE.Vector3(0, 0, 0),
    quaternion: new THREE.Quaternion(0, 0, 0, 1),
  };
  static lsamples: RumbleSample[] = [];
  static rsamples: RumbleSample[] = [];
  static time: number = 0;

  static beforeRender() {
    if(GameState.Mode == EngineMode.INGAME){
      //Cache the current camera properties
      CameraShakeManager.cache.position.copy(GameState.currentCamera.position);
      //CameraShakeManager.cache.quaternion.copy(GameState.currentCamera.quaternion);
    }
  };

  static playRumblePattern(idx = 0) {
    CameraShakeManager.lsamples = [];
    CameraShakeManager.rsamples = [];
    CameraShakeManager.time = 0;
    let rumble = TwoDAManager.datatables.get('rumble').rows[idx];
    if(rumble){
      let lsamples = parseInt(rumble.lsamples);
      let rsamples = parseInt(rumble.rsamples);
      
      // Debug: Log the rumble data to understand the time units
      console.log('Rumble data for index', idx, ':', rumble);
      
      for(let i = 0; i < lsamples; i++){
        const time = parseFloat(rumble['ltime'+(i+1)]);
        
        CameraShakeManager.lsamples.push({
          magnitude: parseFloat(rumble['lmagnitude'+(i+1)]),
          time: time,
          timeMax: time
        })
      }
      
      for(let i = 0; i < rsamples; i++){
        const time = parseFloat(rumble['rtime'+(i+1)]);
        
        CameraShakeManager.rsamples.push({
          magnitude: parseFloat(rumble['rmagnitude'+(i+1)]),
          time: time,
          timeMax: time
        })
      }
      
      CameraShakeManager.active = (lsamples > 0 || rsamples > 0);
    }
  }

  static stopRumblePattern(idx: number){
    CameraShakeManager.lsamples = [];
    CameraShakeManager.rsamples = [];
    CameraShakeManager.time = 0;
    CameraShakeManager.active = false;
  }

  static update(delta: number = 0, camera: THREE.Camera) {
    if(GameState.Mode == EngineMode.INGAME){
      //GameState.currentCamera
      CameraShakeManager.position.set(0, 0, 0);

      // Process left samples (X-axis shake)
      for(let i = CameraShakeManager.lsamples.length - 1; i >= 0; i--){
        const sample = CameraShakeManager.lsamples[i];
        if(!sample){ continue; }
        if(sample.time <= 0){ continue; }

        // Clamp power to prevent negative values
        const lPower = Math.max(0, sample.time / sample.timeMax);

        CameraShakeManager.position.x += (((Math.random() * 2 - 1) * sample.magnitude) * lPower) * .1;
        sample.time -= delta * 2;
      }
      

      // Process right samples (Y-axis shake)
      for(let i = CameraShakeManager.rsamples.length - 1; i >= 0; i--){
        const sample = CameraShakeManager.rsamples[i];
        if(!sample){ continue; }
        if(sample.time <= 0){ continue; }

        // Clamp power to prevent negative values
        const rPower = Math.max(0, sample.time / sample.timeMax);

        CameraShakeManager.position.y += (((Math.random() * 2 - 1) * sample.magnitude) * rPower) * .1;
        sample.time -= delta * 2;
      }

      let lLeft = CameraShakeManager.lsamples.length;
      let rRight = CameraShakeManager.rsamples.length;
      while(lLeft--){
        const sample = CameraShakeManager.lsamples[lLeft];
        if(!sample){ continue; }
        if(sample.time > 0){ continue; }
        CameraShakeManager.lsamples.splice(lLeft, 1);
      }
      
      while(rRight--){
        const sample = CameraShakeManager.rsamples[rRight];
        if(!sample){ continue; }
        if(sample.time > 0){ continue; }
        CameraShakeManager.rsamples.splice(rRight, 1);
      }

      CameraShakeManager.position.applyQuaternion(GameState.currentCamera.quaternion);
      GameState.currentCamera.position.add(CameraShakeManager.position);

      CameraShakeManager.active = (CameraShakeManager.lsamples.length > 0 || CameraShakeManager.rsamples.length > 0);
    }
  }

  static afterRender() {
    if(GameState.Mode == EngineMode.INGAME){
      //Restore the current camera's cached properties
      GameState.currentCamera.position.copy(CameraShakeManager.cache.position);
      //GameState.currentCamera.copy(CameraShakeManager.cache.quaternion);
    }
  }
}
