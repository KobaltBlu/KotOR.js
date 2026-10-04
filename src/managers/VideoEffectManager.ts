import { VideoEffect } from "@/engine/VideoEffect";
import { GameState } from "@/GameState";
import type { TwoDAObject } from "@/resource/TwoDAObject";
import * as THREE from "three";
import { KeyMapAction } from "@/enums/controls/KeyMapAction";
import { KeyMapper } from "@/controls/KeyMapper";

/**
 * VideoEffectManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file VideoEffectManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class VideoEffectManager {

  static videoEffects: VideoEffect[] = [];
  static videoEffect: VideoEffect;
  static videoEffectId: number = -1;
  static previousCameraPosition: THREE.Vector3 = new THREE.Vector3();
  static previousCameraQuaternion: THREE.Quaternion = new THREE.Quaternion();
  static currentBlurDirection: THREE.Vector2 = new THREE.Vector2();
  static currentMotionBlurAmount: number = 0;
  static blurDirectionInitialized: boolean = false;

  static getMovementInputAmount(): number {
    const controls = GameState.controls;
    if(!controls){
      return 0;
    }

    const keyboardMoving = [
      KeyMapAction.MoveForward,
      KeyMapAction.MoveBack,
      KeyMapAction.StrafeLeft,
      KeyMapAction.StrafeRight,
    ].some(action => KeyMapper.Actions[action]?.keyboardInput?.down);

    const stickMagnitude = Math.min(1, Math.sqrt(
      Math.pow(controls.gamePad?.stick_l_x?.value || 0, 2) +
      Math.pow(controls.gamePad?.stick_l_y?.value || 0, 2)
    ));

    return keyboardMoving ? 1 : stickMagnitude;
  }

  static updateCameraMotionBlurDirection(delta: number, timeDilationIntensity: number){
    const currentCamera = GameState.currentCamera;
    if(!currentCamera){
      VideoEffectManager.currentBlurDirection.set(0, 0);
      VideoEffectManager.currentMotionBlurAmount = 0;
      VideoEffectManager.blurDirectionInitialized = false;
      return;
    }

    const currentPosition = new THREE.Vector3();
    const currentQuaternion = new THREE.Quaternion();
    currentCamera.getWorldPosition(currentPosition);
    currentCamera.getWorldQuaternion(currentQuaternion);

    if(!VideoEffectManager.blurDirectionInitialized){
      VideoEffectManager.previousCameraPosition.copy(currentPosition);
      VideoEffectManager.previousCameraQuaternion.copy(currentQuaternion);
      VideoEffectManager.currentBlurDirection.set(0, 0);
      VideoEffectManager.currentMotionBlurAmount = 0;
      VideoEffectManager.blurDirectionInitialized = true;
      return;
    }

    const movementInputAmount = VideoEffectManager.getMovementInputAmount();
    if(movementInputAmount <= 0){
      VideoEffectManager.currentBlurDirection.multiplyScalar(0.6);
      VideoEffectManager.currentMotionBlurAmount *= 0.45;
      VideoEffectManager.previousCameraPosition.copy(currentPosition);
      VideoEffectManager.previousCameraQuaternion.copy(currentQuaternion);
      return;
    }

    const cameraDelta = currentPosition.clone().sub(VideoEffectManager.previousCameraPosition);
    const localCameraDelta = cameraDelta.applyQuaternion(currentQuaternion.clone().invert());
    const targetBlurDirection = new THREE.Vector2(
      -localCameraDelta.x,
      localCameraDelta.y + (localCameraDelta.z * 0.35)
    );

    const deltaScale = Math.max(delta, 0.0001);
    targetBlurDirection.multiplyScalar((timeDilationIntensity * 0.18 * movementInputAmount) / deltaScale);

    const targetLength = targetBlurDirection.length();
    if(targetLength > 0.015){
      targetBlurDirection.multiplyScalar(0.015 / targetLength);
    }

    const motionStrength = Math.min(1, targetBlurDirection.length() / 0.015);

    VideoEffectManager.currentBlurDirection.lerp(targetBlurDirection, 0.35);
    VideoEffectManager.currentMotionBlurAmount += (motionStrength - VideoEffectManager.currentMotionBlurAmount) * 0.35;

    VideoEffectManager.previousCameraPosition.copy(currentPosition);
    VideoEffectManager.previousCameraQuaternion.copy(currentQuaternion);
  }

  static SetVideoEffect(id: number = -1){
    if(VideoEffectManager.videoEffectId == id){ return; }

    VideoEffectManager.videoEffectId = id;
    if(VideoEffectManager.videoEffectId == -1){
      VideoEffectManager.Reset();
      return;
    }

    const vEffect = GameState.VideoEffectManager.videoEffects[id];
    if(!vEffect){
      VideoEffectManager.Reset();
      return;
    }

    VideoEffectManager.videoEffect = vEffect;
  }

  static getTimeDilationVisualIntensity(): number {
    const cheatConsoleManager = GameState.CheatConsoleManager;
    if(!cheatConsoleManager){
      return 0;
    }

    const worldScale = Math.max(0, cheatConsoleManager.getWorldDeltaScale?.() ?? cheatConsoleManager.currentTimeDilationWorldScale ?? 1);
    const playerSpeedMultiplier = Math.max(0, cheatConsoleManager.getCurrentTimeDilationPlayerSpeedMultiplier?.() ?? cheatConsoleManager.currentTimeDilationPlayerSpeedMultiplier ?? 1);
    const worldIntensity = THREE.MathUtils.clamp(1 - worldScale, 0, 1);
    const playerIntensity = THREE.MathUtils.clamp((playerSpeedMultiplier - 1) / 1.5, 0, 1);
    return Math.max(worldIntensity, playerIntensity * 0.5);
  }

  static Update(delta: number = 0){
    if(!GameState.odysseyShaderPass){ return; }

    const effect = VideoEffectManager.videoEffect;
    let saturation = 1;
    const modulation = new THREE.Vector3(1, 1, 1);
    let enableModulation = false;
    let enableScanlines = false;
    let grayscale = false;
    let blurStrength = 0;

    if(effect?.enableSaturation){
			saturation = effect.saturation;
			modulation.set(
				effect.modulation.red, effect.modulation.green, effect.modulation.blue
			);
			enableModulation = true;
		}

    if(effect?.enableScanNoise){
			enableScanlines = true;
			grayscale = true;
			GameState.odysseyShaderPass.uniforms.sCount.value = (Math.floor(Math.random() * 256) + 250)*0.5;
    }

    const timeDilationIntensity = VideoEffectManager.getTimeDilationVisualIntensity();
    VideoEffectManager.updateCameraMotionBlurDirection(delta, timeDilationIntensity);
    if(timeDilationIntensity > 0){
      saturation *= 1 - (0.12 * timeDilationIntensity);
      modulation.set(
        modulation.x * (1 - (0.03 * timeDilationIntensity)),
        modulation.y * (1 - (0.015 * timeDilationIntensity)),
        modulation.z * (1 + (0.05 * timeDilationIntensity))
      );
      enableModulation = true;
      blurStrength = THREE.MathUtils.clamp(timeDilationIntensity * VideoEffectManager.currentMotionBlurAmount * 0.8, 0, 1);
    }

    GameState.odysseyShaderPass.uniforms.bmodulate.value = enableModulation;
    GameState.odysseyShaderPass.uniforms.saturation.value = saturation;
    GameState.odysseyShaderPass.uniforms.modulation.value.copy(modulation);
    GameState.odysseyShaderPass.uniforms.bscanlines.value = enableScanlines;
    GameState.odysseyShaderPass.uniforms.grayscale.value = grayscale;
    GameState.odysseyShaderPass.uniforms.blurStrength.value = blurStrength;
    GameState.odysseyShaderPass.uniforms.blurDirection.value.copy(VideoEffectManager.currentBlurDirection);
  }

  static Reset(){
    VideoEffectManager.videoEffectId = -1;
    VideoEffectManager.videoEffect = undefined;
		VideoEffectManager.currentBlurDirection.set(0, 0);
		VideoEffectManager.currentMotionBlurAmount = 0;
		VideoEffectManager.blurDirectionInitialized = false;
		if(!GameState.odysseyShaderPass){ return; }
		GameState.odysseyShaderPass.resetHistory();
		GameState.odysseyShaderPass.uniforms.bmodulate.value = false;
		GameState.odysseyShaderPass.uniforms.saturation.value = 1;
		GameState.odysseyShaderPass.uniforms.modulation.value.set(1, 1, 1);
		GameState.odysseyShaderPass.uniforms.blurStrength.value = 0;
		GameState.odysseyShaderPass.uniforms.blurDirection.value.set(0, 0);
		
		GameState.odysseyShaderPass.uniforms.bscanlines.value = false;
		GameState.odysseyShaderPass.uniforms.grayscale.value = false;
  }

  static Init2DA(dataTable: TwoDAObject){
    if(!dataTable){ return; }

    for(let i = 0; i < dataTable.RowCount; i++){
      VideoEffectManager.videoEffects[i] = VideoEffect.From2DA(dataTable.rows[i]);
    }

  }

}