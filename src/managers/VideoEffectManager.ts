import * as THREE from 'three';
import { VideoEffect } from "@/engine/VideoEffect";
import { GameState } from "@/GameState";
import { TextureLoader } from "@/loaders";
import type { TwoDAObject } from "@/resource/TwoDAObject";
import { resolveAlwaysOnFrameBufferPasses } from "@/shaders/pass/FrameBufferEffectGates";

/**
 * VideoEffectManager class.
 *
 * Retail EnableVideoEffect / DisableVideoEffect — drives saturation, film noise,
 * K2 clairvoyance/dream, fury, and force-sight framebuffer flags.
 *
 * Always-on FB stages (overbrighten / convolution) use retail visualizePass*
 * gates via resolveAlwaysOnFrameBufferPasses — shipping leaves overbrighten off.
 *
 * @file VideoEffectManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class VideoEffectManager {

  static videoEffects: VideoEffect[] = [];
  static videoEffect: VideoEffect;
  static videoEffectId: number = -1;

  /** AurEnableForceSight flag (retail constant). Cubemap/scene path — not a color grade. */
  static forceSightActive: boolean = false;
  /** EffectForceSight refcount so VideoEffect + game effect can coexist. */
  static forceSightEffectCount: number = 0;

  /**
   * Debug override for retail visualizePass1 (overbrighten).
   * Shipping default is false (BSS zero / never written).
   */
  static debugVisualizeOverbrighten: boolean = false;

  static filmNoiseTexture: THREE.Texture | null = null;
  static furyTexture: THREE.Texture | null = null;
  static furyLevel: number = 0;

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
    void VideoEffectManager.applyK2Extras(vEffect);
  }

  /**
   * Retail AurEnableForceSight / AurDisableForceSight.
   * Cubemap / material path not yet ported — flag retained for callers.
   * Does not drive OdysseyShader color grade (that was non-retail).
   */
  static SetForceSight(active: boolean){
    if(active){
      VideoEffectManager.forceSightEffectCount++;
    }else{
      VideoEffectManager.forceSightEffectCount = Math.max(0, VideoEffectManager.forceSightEffectCount - 1);
    }
    VideoEffectManager.forceSightActive = VideoEffectManager.forceSightEffectCount > 0
      || !!(VideoEffectManager.videoEffect?.enableForceSight);
  }

  static async ensureFilmNoiseTexture(): Promise<void> {
    if(VideoEffectManager.filmNoiseTexture){ return; }
    try {
      const tex = await TextureLoader.Load('filmnoisetex');
      if(tex){
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        VideoEffectManager.filmNoiseTexture = tex;
        if(GameState.odysseyShaderPass){
          GameState.odysseyShaderPass.uniforms.tFilmNoise.value = tex;
        }
      }
    }catch(e){
      console.warn('Failed to load filmnoisetex', e);
    }
  }

  static async loadFuryTexture(level: number): Promise<void> {
    const clamped = Math.max(0, Math.min(3, level | 0));
    if(clamped <= 0){
      VideoEffectManager.furyLevel = 0;
      VideoEffectManager.furyTexture = null;
      if(GameState.furyPass){
        GameState.furyPass.setFuryTexture(null);
        GameState.furyPass.enabled = false;
      }
      return;
    }
    if(VideoEffectManager.furyLevel === clamped && VideoEffectManager.furyTexture){
      return;
    }
    const name = clamped === 2 ? 'fx_Fury02' : clamped === 3 ? 'fx_Fury03' : 'fx_Fury01';
    try {
      const tex = await TextureLoader.Load(name);
      if(tex){
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        VideoEffectManager.furyTexture = tex;
        VideoEffectManager.furyLevel = clamped;
        if(GameState.furyPass){
          GameState.furyPass.setFuryTexture(tex);
        }
      }
    }catch(e){
      console.warn(`Failed to load ${name}`, e);
    }
  }

  private static async applyK2Extras(effect: VideoEffect){
    if(effect.enableScanNoise){
      void VideoEffectManager.ensureFilmNoiseTexture();
    }
    if(effect.enableFury){
      await VideoEffectManager.loadFuryTexture(effect.furyLevel || 1);
    }else{
      await VideoEffectManager.loadFuryTexture(0);
    }
    VideoEffectManager.forceSightActive = VideoEffectManager.forceSightEffectCount > 0
      || !!effect.enableForceSight;
  }

  static Update(delta: number = 0){
    const fbOn = GameState.isFrameBufferEffectsEnabled();
    const effect = VideoEffectManager.videoEffect;

    // --- OdysseyShaderPass: saturation + film noise (VideoEffects only) ---
    if(GameState.odysseyShaderPass){
      const wantSat = !!(effect?.enableSaturation);
      const wantNoise = !!(effect?.enableScanNoise);

      if(wantSat){
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

      if(wantNoise){
        GameState.odysseyShaderPass.uniforms.bFilmNoise.value = true;
        if(VideoEffectManager.filmNoiseTexture){
          GameState.odysseyShaderPass.uniforms.tFilmNoise.value = VideoEffectManager.filmNoiseTexture;
        }else{
          void VideoEffectManager.ensureFilmNoiseTexture();
        }
      }else{
        GameState.odysseyShaderPass.uniforms.bFilmNoise.value = false;
      }

      // Force Sight is a scene/cubemap flag in retail — do not enable this pass for it.
      GameState.odysseyShaderPass.enabled = fbOn && (wantSat || wantNoise);
    }

    // --- Dream distortion (clairvoyance) ---
    if(GameState.dreamDistortionPass){
      const wantDream = !!(effect?.enableClairVoyance || effect?.enableClairVoyanceFull);
      if(wantDream){
        if(!GameState.forceDistortionTexture){
          GameState.forceDistortionTexture = GameState.createFallbackDistortionTexture();
          void GameState.ensureForceDistortionTexture();
        }
        GameState.dreamDistortionPass.setDistortionTexture(GameState.forceDistortionTexture);
        // EnableClairvoyance(1) vs EnableClairvoyanceFull(0): full = larger warp
        GameState.dreamDistortionPass.setFullMode(!!effect.enableClairVoyanceFull);
      }
      GameState.dreamDistortionPass.enabled =
        fbOn && wantDream && !!GameState.forceDistortionTexture;
    }

    // --- Fury ---
    if(GameState.furyPass){
      const wantFury = !!(effect?.enableFury) && !!VideoEffectManager.furyTexture;
      if(wantFury){
        if(!GameState.forceDistortionTexture){
          GameState.forceDistortionTexture = GameState.createFallbackDistortionTexture();
          void GameState.ensureForceDistortionTexture();
        }
        GameState.furyPass.setFuryTexture(VideoEffectManager.furyTexture);
        GameState.furyPass.setDistortionTexture(GameState.forceDistortionTexture);
      }
      GameState.furyPass.enabled = fbOn && wantFury;
    }

    // Always-on stages: retail mask 0x1F in a room, but visualizePass1 (overbrighten)
    // stays 0 in shipping while visualizePass2 (convolution) stays 1.
    const rooms = GameState.module?.area?.rooms;
    const roomedOk = !!(rooms && rooms.length > 0);
    const alwaysOn = resolveAlwaysOnFrameBufferPasses({
      frameBufferIniEnabled: fbOn,
      roomedArea: roomedOk,
      visualizeOverbrighten: VideoEffectManager.debugVisualizeOverbrighten,
    });
    if(GameState.overbrightenPass){
      GameState.overbrightenPass.enabled = alwaysOn.overbrighten;
    }
    if(GameState.convolutionBloomPass){
      GameState.convolutionBloomPass.enabled = alwaysOn.convolution;
    }

    void delta;
  }

  static Reset(){
    VideoEffectManager.videoEffectId = -1;
    VideoEffectManager.videoEffect = undefined;
    VideoEffectManager.forceSightActive = VideoEffectManager.forceSightEffectCount > 0;
    VideoEffectManager.furyLevel = 0;
    VideoEffectManager.furyTexture = null;

    if(GameState.odysseyShaderPass){
      GameState.odysseyShaderPass.uniforms.bmodulate.value = false;
      GameState.odysseyShaderPass.uniforms.saturation.value = 1;
      GameState.odysseyShaderPass.uniforms.modulation.value.set(1, 1, 1);
      GameState.odysseyShaderPass.uniforms.bFilmNoise.value = false;
      GameState.odysseyShaderPass.enabled = false;
    }
    if(GameState.dreamDistortionPass){
      GameState.dreamDistortionPass.enabled = false;
    }
    if(GameState.furyPass){
      GameState.furyPass.setFuryTexture(null);
      GameState.furyPass.enabled = false;
    }
  }

  static Init2DA(dataTable: TwoDAObject){
    if(!dataTable){ return; }

    for(let i = 0; i < dataTable.RowCount; i++){
      VideoEffectManager.videoEffects[i] = VideoEffect.From2DA(dataTable.rows[i]);
    }
  }

}
