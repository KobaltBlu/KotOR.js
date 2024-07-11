import { VideoEffect } from "../engine/VideoEffect";
import { GameState } from "../GameState";
import type { TwoDAObject } from "../resource/TwoDAObject";

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

  static Update(delta: number = 0){
    if(!VideoEffectManager.videoEffect){ return; }
    
    if(!GameState.odysseyShaderPass){ return; }
    
    const effect = VideoEffectManager.videoEffect;

    if(effect.enableSaturation){
			GameState.odysseyShaderPass.uniforms.saturation.value = effect.saturation;
			GameState.odysseyShaderPass.uniforms.modulation.value.set(
				effect.modulation.red, effect.modulation.green, effect.modulation.blue
			);
			GameState.odysseyShaderPass.uniforms.bmodulate.value = true;
		}else{
			GameState.odysseyShaderPass.uniforms.bmodulate.value = false;
			GameState.odysseyShaderPass.uniforms.saturation.value = 1;
			GameState.odysseyShaderPass.uniforms.modulation.value.set(1, 1, 1);
		}

    if(effect.enableScanNoise){
			GameState.odysseyShaderPass.uniforms.bscanlines.value = true;
			GameState.odysseyShaderPass.uniforms.grayscale.value = true;
			GameState.odysseyShaderPass.uniforms.sCount.value = (Math.floor(Math.random() * 256) + 250)*0.5;
		}else{
			GameState.odysseyShaderPass.uniforms.bscanlines.value = false;
			GameState.odysseyShaderPass.uniforms.grayscale.value = false;
    }
  }

  static Reset(){
    VideoEffectManager.videoEffectId = -1;
    VideoEffectManager.videoEffect = undefined;
		GameState.odysseyShaderPass.uniforms.bmodulate.value = false;
		GameState.odysseyShaderPass.uniforms.saturation.value = 1;
		GameState.odysseyShaderPass.uniforms.modulation.value.set(1, 1, 1);
		
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