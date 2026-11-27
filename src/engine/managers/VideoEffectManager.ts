import * as THREE from 'three';
import { VideoEffect } from "@engine/render/VideoEffect";
import { GameState } from "@engine/runtime/GameState";
import { TextureLoader } from "@engine/loaders";
import type { TwoDAObject } from "@core/resource/TwoDAObject";
import { resolveAlwaysOnFrameBufferPasses } from "@engine/render/shaders/pass/FrameBufferEffectGates";
import { OdysseyRenderPipeline } from '@engine/render/OdysseyRenderPipeline';

/**
 * VideoEffectManager class.
 *
 * EnableVideoEffect / DisableVideoEffect — drives saturation, film noise,
 * K2 clairvoyance/dream, fury, and force-sight framebuffer flags.
 *
 * Always-on FB stages (overbrighten / convolution) use visualizePass*
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

  /** AurEnableForceSight flag (constant). Cubemap/scene path — not a color grade. */
  static forceSightActive: boolean = false;
  /** EffectForceSight refcount so VideoEffect + game effect can coexist. */
  static forceSightEffectCount: number = 0;

  /**
   * Debug override for visualizePass1 (overbrighten).
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
   * AurEnableForceSight / AurDisableForceSight.
   * Cubemap / material path not yet ported — flag retained for callers.
   * Does not drive OdysseyShader color grade (that was non-).
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
        if(OdysseyRenderPipeline.odysseyShaderPass){
          OdysseyRenderPipeline.odysseyShaderPass.uniforms.tFilmNoise.value = tex;
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
      if(OdysseyRenderPipeline.furyPass){
        OdysseyRenderPipeline.furyPass.setFuryTexture(null);
        OdysseyRenderPipeline.furyPass.enabled = false;
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
        if(OdysseyRenderPipeline.furyPass){
          OdysseyRenderPipeline.furyPass.setFuryTexture(tex);
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
    const fbOn = OdysseyRenderPipeline.isFrameBufferEffectsEnabled();
    const effect = VideoEffectManager.videoEffect;

    // --- OdysseyShaderPass: saturation + film noise (VideoEffects only) ---
    if(OdysseyRenderPipeline.odysseyShaderPass){
      const wantSat = !!(effect?.enableSaturation);
      const wantNoise = !!(effect?.enableScanNoise);

      if(wantSat){
        OdysseyRenderPipeline.odysseyShaderPass.uniforms.saturation.value = effect.saturation;
        OdysseyRenderPipeline.odysseyShaderPass.uniforms.modulation.value.set(
          effect.modulation.red, effect.modulation.green, effect.modulation.blue
        );
        OdysseyRenderPipeline.odysseyShaderPass.uniforms.bmodulate.value = true;
      }else{
        OdysseyRenderPipeline.odysseyShaderPass.uniforms.bmodulate.value = false;
        OdysseyRenderPipeline.odysseyShaderPass.uniforms.saturation.value = 1;
        OdysseyRenderPipeline.odysseyShaderPass.uniforms.modulation.value.set(1, 1, 1);
      }

      if(wantNoise){
        OdysseyRenderPipeline.odysseyShaderPass.uniforms.bFilmNoise.value = true;
        if(VideoEffectManager.filmNoiseTexture){
          OdysseyRenderPipeline.odysseyShaderPass.uniforms.tFilmNoise.value = VideoEffectManager.filmNoiseTexture;
        }else{
          void VideoEffectManager.ensureFilmNoiseTexture();
        }
      }else{
        OdysseyRenderPipeline.odysseyShaderPass.uniforms.bFilmNoise.value = false;
      }

      // Force Sight is a scene/cubemap flag in — do not enable this pass for it.
      OdysseyRenderPipeline.odysseyShaderPass.enabled = fbOn && (wantSat || wantNoise);
    }

    // --- Dream distortion (clairvoyance) ---
    if(OdysseyRenderPipeline.dreamDistortionPass){
      const wantDream = !!(effect?.enableClairVoyance || effect?.enableClairVoyanceFull);
      if(wantDream){
        if(!GameState.forceDistortionTexture){
          GameState.forceDistortionTexture = OdysseyRenderPipeline.createFallbackDistortionTexture();
          void OdysseyRenderPipeline.ensureForceDistortionTexture();
        }
        OdysseyRenderPipeline.dreamDistortionPass.setDistortionTexture(GameState.forceDistortionTexture);
        // EnableClairvoyance(1) vs EnableClairvoyanceFull(0): full = larger warp
        OdysseyRenderPipeline.dreamDistortionPass.setFullMode(!!effect.enableClairVoyanceFull);
      }
      OdysseyRenderPipeline.dreamDistortionPass.enabled =
        fbOn && wantDream && !!GameState.forceDistortionTexture;
    }

    // --- Fury ---
    if(OdysseyRenderPipeline.furyPass){
      const wantFury = !!(effect?.enableFury) && !!VideoEffectManager.furyTexture;
      if(wantFury){
        if(!GameState.forceDistortionTexture){
          GameState.forceDistortionTexture = OdysseyRenderPipeline.createFallbackDistortionTexture();
          void OdysseyRenderPipeline.ensureForceDistortionTexture();
        }
        OdysseyRenderPipeline.furyPass.setFuryTexture(VideoEffectManager.furyTexture);
        OdysseyRenderPipeline.furyPass.setDistortionTexture(GameState.forceDistortionTexture);
      }
      OdysseyRenderPipeline.furyPass.enabled = fbOn && wantFury;
    }

    // Always-on stages: mask 0x1F in a room, but visualizePass1 (overbrighten)
    // stays 0 in shipping while visualizePass2 (convolution) stays 1.
    const rooms = GameState.module?.area?.rooms;
    const roomedOk = !!(rooms && rooms.length > 0);
    const alwaysOn = resolveAlwaysOnFrameBufferPasses({
      frameBufferIniEnabled: fbOn,
      roomedArea: roomedOk,
      visualizeOverbrighten: VideoEffectManager.debugVisualizeOverbrighten,
    });
    if(OdysseyRenderPipeline.overbrightenPass){
      OdysseyRenderPipeline.overbrightenPass.enabled = alwaysOn.overbrighten;
    }
    if(OdysseyRenderPipeline.convolutionBloomPass){
      OdysseyRenderPipeline.convolutionBloomPass.enabled = alwaysOn.convolution;
    }

    void delta;
  }

  static Reset(){
    VideoEffectManager.videoEffectId = -1;
    VideoEffectManager.videoEffect = undefined;
    VideoEffectManager.forceSightActive = VideoEffectManager.forceSightEffectCount > 0;
    VideoEffectManager.furyLevel = 0;
    VideoEffectManager.furyTexture = null;

    if(OdysseyRenderPipeline.odysseyShaderPass){
      OdysseyRenderPipeline.odysseyShaderPass.uniforms.bmodulate.value = false;
      OdysseyRenderPipeline.odysseyShaderPass.uniforms.saturation.value = 1;
      OdysseyRenderPipeline.odysseyShaderPass.uniforms.modulation.value.set(1, 1, 1);
      OdysseyRenderPipeline.odysseyShaderPass.uniforms.bFilmNoise.value = false;
      OdysseyRenderPipeline.odysseyShaderPass.enabled = false;
    }
    if(OdysseyRenderPipeline.dreamDistortionPass){
      OdysseyRenderPipeline.dreamDistortionPass.enabled = false;
    }
    if(OdysseyRenderPipeline.furyPass){
      OdysseyRenderPipeline.furyPass.setFuryTexture(null);
      OdysseyRenderPipeline.furyPass.enabled = false;
    }
  }

  static Init2DA(dataTable: TwoDAObject){
    if(!dataTable){ return; }

    for(let i = 0; i < dataTable.RowCount; i++){
      VideoEffectManager.videoEffects[i] = VideoEffect.From2DA(dataTable.rows[i]);
    }
  }

}
