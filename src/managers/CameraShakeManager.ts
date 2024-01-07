
import * as THREE from "three";
import { EngineMode } from "../enums/engine/EngineMode";
import { GameState } from "../GameState";
import { TwoDAManager } from "./TwoDAManager";

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
  static lsamples: any[] = [];
  static rsamples: any[] = [];
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
      
      for(let i = 0; i < lsamples; i++){
        CameraShakeManager.lsamples.push({
          lmagnitude: parseFloat(rumble['lmagnitude'+(i+1)]),
          ltime: parseFloat(rumble['ltime'+(i+1)]),
          ltimeMax: parseFloat(rumble['ltime'+(i+1)])
        })
      }
      
      for(let i = 0; i < rsamples; i++){
        CameraShakeManager.rsamples.push({
          rmagnitude: parseFloat(rumble['rmagnitude'+(i+1)]),
          rtime: parseFloat(rumble['rtime'+(i+1)]),
          rtimeMax: parseFloat(rumble['rtime'+(i+1)])
        })
      }
    }
  }

  static stopRumblePattern(idx: number){
    CameraShakeManager.lsamples = [];
    CameraShakeManager.rsamples = [];
    CameraShakeManager.time = 0;
  }

  static update(delta: number = 0, camera: THREE.Camera) {
    if(GameState.Mode == EngineMode.INGAME){
      //GameState.currentCamera
      CameraShakeManager.position.set(0, 0, 0);

      for(let i = 0; i < CameraShakeManager.lsamples.length; i++){
        let sample = CameraShakeManager.lsamples[i];
        if(sample.ltime > 0){
          let lPower = (sample.ltime/sample.ltimeMax);
          CameraShakeManager.position.x += (((Math.random() * 2 - 1) * sample.lmagnitude) * lPower) * .1;
          sample.ltime -= delta*2;
        }
      }

      for(let i = 0; i < CameraShakeManager.rsamples.length; i++){
        let sample = CameraShakeManager.rsamples[i];
        if(sample.rtime > 0){
          let rPower = (sample.rtime/sample.rtimeMax);
          CameraShakeManager.position.y += (((Math.random() * 2 - 1) * sample.rmagnitude) * rPower) * .1;
          sample.rtime -= delta*2;
        }
      }

      CameraShakeManager.position.applyQuaternion(GameState.currentCamera.quaternion);
      GameState.currentCamera.position.add(CameraShakeManager.position);

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
