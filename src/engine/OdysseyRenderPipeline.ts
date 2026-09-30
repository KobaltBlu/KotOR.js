import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { CopyShader } from "three/examples/jsm/shaders/CopyShader";

import { GameState } from "@/GameState";
import { RenderLayer } from "@/enums/engine";
import { TextureLoader } from "@/loaders";
import { OdysseyShaderPass } from "@/shaders/pass/OdysseyShaderPass";
import { ForceDistortionPass } from "@/shaders/pass/ForceDistortionPass";
import { OverbrightenPass } from "@/shaders/pass/OverbrightenPass";
import { ConvolutionBloomPass } from "@/shaders/pass/ConvolutionBloomPass";
import { DreamDistortionPass } from "@/shaders/pass/DreamDistortionPass";
import { FuryPass } from "@/shaders/pass/FuryPass";
import { MiniGameAspectMaskPass } from "@/shaders/pass/MiniGameAspectMaskPass";
import { resolveMiniGameAspectMaskPass } from "@/shaders/pass/MiniGameAspectMaskGates";
import { OdysseyLensFlarePass } from "@/shaders/pass/OdysseyLensFlarePass";
import { AccumulationBlurPass } from "@/shaders/pass/AccumulationBlurPass";
import { resolveSpeedBlurPass } from "@/shaders/pass/FrameBufferEffectGates";
import { MotionBlurController } from "@/engine/MotionBlurController";
import { runOdysseyDepthPrepass, runOdysseySoftDepthSplit } from "@/utility/odysseyDepthPrepass";
import { RenderPerfStats } from "@/utility/RenderPerfStats";
import { ModuleGpuWarmLog } from "@/three/odyssey/warmRoomGpuResources";
import { OdysseyLightingBinder } from "@/three/odyssey/OdysseyLightingBinder";
import { OdysseyUniformBuffers } from "@/three/odyssey/OdysseyUniformBuffers";

/**
 * EffectComposer setup, per-frame world/GUI compose, and depth prepass.
 */
export class OdysseyRenderPipeline {
  static composer: EffectComposer;
  static renderPass: RenderPass;
  static odysseyShaderPass: OdysseyShaderPass;
  static forceDistortionPass: ForceDistortionPass;
  static overbrightenPass: OverbrightenPass;
  static convolutionBloomPass: ConvolutionBloomPass;
  static dreamDistortionPass: DreamDistortionPass;
  static furyPass: FuryPass;
  static lensFlarePass: OdysseyLensFlarePass;
  static miniGameAspectMaskPass: MiniGameAspectMaskPass;
  static copyPass: ShaderPass;
  static renderPassGUI: RenderPass;
  static renderPassMGHud: RenderPass;
  static speedBlurPass: AccumulationBlurPass;

  static initComposer(): void {
    OdysseyRenderPipeline.composer = new EffectComposer(GameState.renderer);
    // Dispose EffectComposer ctor HalfFloat RTs before replacing with Odyssey targets.
    OdysseyRenderPipeline.composer.renderTarget1?.dispose();
    OdysseyRenderPipeline.composer.renderTarget2?.dispose();

    const w = GameState.ResolutionManager.getViewportWidth();
    const h = GameState.ResolutionManager.getViewportHeight();
    // writeBuffer (RT1): color + depth + stencil (no DepthTexture) — post swaps /
    // ForceDistortion color snapshot. Stencil kept so mid-chain needsSwap still
    // allows force warp. readBuffer (RT2): world + soft blit DepthTexture.
    const postRT = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: true,
    };
    const worldRT = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: true,
    };
    OdysseyRenderPipeline.composer.renderTarget1 = new THREE.WebGLRenderTarget(w, h, postRT);
    OdysseyRenderPipeline.composer.renderTarget2 = new THREE.WebGLRenderTarget(w, h, worldRT);
    OdysseyRenderPipeline.composer.renderTarget2.depthTexture = new THREE.DepthTexture(w, h);
    OdysseyRenderPipeline.composer.renderTarget2.depthTexture.type = THREE.UnsignedShortType;
    OdysseyRenderPipeline.composer.writeBuffer = OdysseyRenderPipeline.composer.renderTarget1;
    OdysseyRenderPipeline.composer.readBuffer = OdysseyRenderPipeline.composer.renderTarget2;
    OdysseyRenderPipeline.renderPass = new RenderPass(GameState.scene, GameState.currentCamera);
    OdysseyRenderPipeline.odysseyShaderPass = new OdysseyShaderPass();
    OdysseyRenderPipeline.odysseyShaderPass.enabled = false;
    OdysseyRenderPipeline.forceDistortionPass = new ForceDistortionPass();
    OdysseyRenderPipeline.forceDistortionPass.enabled = false;
    OdysseyRenderPipeline.overbrightenPass = new OverbrightenPass();
    OdysseyRenderPipeline.overbrightenPass.enabled = false;
    OdysseyRenderPipeline.convolutionBloomPass = new ConvolutionBloomPass();
    OdysseyRenderPipeline.convolutionBloomPass.enabled = false;
    OdysseyRenderPipeline.dreamDistortionPass = new DreamDistortionPass();
    OdysseyRenderPipeline.dreamDistortionPass.enabled = false;
    OdysseyRenderPipeline.furyPass = new FuryPass();
    OdysseyRenderPipeline.furyPass.enabled = false;
    OdysseyRenderPipeline.lensFlarePass = new OdysseyLensFlarePass();
    OdysseyRenderPipeline.lensFlarePass.setLightsProvider(() => GameState.lightManager.getLensFlareLights());
    OdysseyRenderPipeline.lensFlarePass.setCameraProvider(() => GameState.currentCamera);
    OdysseyRenderPipeline.lensFlarePass.setAreaProvider(() => GameState.module?.area);
    OdysseyRenderPipeline.lensFlarePass.setDeltaProvider(() => GameState.deltaTime || 0);
    OdysseyRenderPipeline.miniGameAspectMaskPass = new MiniGameAspectMaskPass();
    OdysseyRenderPipeline.miniGameAspectMaskPass.enabled = false;
    OdysseyRenderPipeline.copyPass = new ShaderPass(CopyShader);
    OdysseyRenderPipeline.renderPassGUI = new RenderPass(GameState.scene_gui, GameState.camera_gui);
    OdysseyRenderPipeline.renderPassMGHud = new RenderPass(GameState.scene, GameState.currentCamera);
    // Swap camera layer mask for HUD-only draw after AccumulationBlurPass.
    const mgHudRender = OdysseyRenderPipeline.renderPassMGHud.render.bind(OdysseyRenderPipeline.renderPassMGHud);
    OdysseyRenderPipeline.renderPassMGHud.render = (
      renderer: THREE.WebGLRenderer,
      writeBuffer: THREE.WebGLRenderTarget,
      readBuffer: THREE.WebGLRenderTarget,
      deltaTime: number,
      maskActive: boolean
    ) => {
      const cam = OdysseyRenderPipeline.renderPassMGHud.camera as THREE.Camera | undefined;
      const prevMask = cam?.layers?.mask;
      if(cam){
        cam.layers.set(RenderLayer.MG_CAMERA_HUD);
      }
      mgHudRender(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
      if(cam && prevMask !== undefined){
        cam.layers.mask = prevMask;
      }
    };

    OdysseyRenderPipeline.speedBlurPass = new AccumulationBlurPass(MotionBlurController.speedBlurRatio);
    OdysseyRenderPipeline.speedBlurPass.enabled = false;
    MotionBlurController.boundSpeedBlurPass = OdysseyRenderPipeline.speedBlurPass;

    OdysseyRenderPipeline.renderPass.renderToScreen = false;
    OdysseyRenderPipeline.copyPass.renderToScreen = false;
    OdysseyRenderPipeline.renderPassGUI.renderToScreen = false;
    OdysseyRenderPipeline.renderPassMGHud.renderToScreen = false;

    OdysseyRenderPipeline.renderPass.clear = true;
    OdysseyRenderPipeline.odysseyShaderPass.clear = false;
    OdysseyRenderPipeline.copyPass.clear = false;
    OdysseyRenderPipeline.renderPassGUI.clear = false;
    OdysseyRenderPipeline.renderPassGUI.clearDepth = true;
    OdysseyRenderPipeline.renderPassMGHud.clear = false;
    OdysseyRenderPipeline.renderPassMGHud.clearDepth = true;
    OdysseyRenderPipeline.renderPassMGHud.enabled = false;

    OdysseyRenderPipeline.composer.addPass(OdysseyRenderPipeline.renderPass);
    OdysseyRenderPipeline.composer.addPass(OdysseyRenderPipeline.speedBlurPass);
    // MG camera HUD after accumulation blur (screen-stable gauges).
    OdysseyRenderPipeline.composer.addPass(OdysseyRenderPipeline.renderPassMGHud);
    // FrameBufferModifications order before GUI:
    // 0x01 overbrighten (visualizePass1 off in shipping) →
    // 0x02 convolution (visualizePass2 on) → 0x20 force distortion →
    // film/sat (VideoEffects) → K2 dream → K2 fury
    OdysseyRenderPipeline.composer.addPass(OdysseyRenderPipeline.overbrightenPass);
    OdysseyRenderPipeline.composer.addPass(OdysseyRenderPipeline.convolutionBloomPass);
    OdysseyRenderPipeline.composer.addPass(OdysseyRenderPipeline.forceDistortionPass);
    OdysseyRenderPipeline.composer.addPass(OdysseyRenderPipeline.odysseyShaderPass);
    OdysseyRenderPipeline.composer.addPass(OdysseyRenderPipeline.dreamDistortionPass);
    OdysseyRenderPipeline.composer.addPass(OdysseyRenderPipeline.furyPass);
    // lens flare render after FrameBufferModifications, before GUI.
    OdysseyRenderPipeline.composer.addPass(OdysseyRenderPipeline.lensFlarePass);
    // Soft 4:3 cockpit mask for swoop/turret — after world FX, before GUI.
    OdysseyRenderPipeline.composer.addPass(OdysseyRenderPipeline.miniGameAspectMaskPass);

    OdysseyRenderPipeline.composer.addPass(OdysseyRenderPipeline.renderPassGUI);
    OdysseyRenderPipeline.composer.addPass(OdysseyRenderPipeline.copyPass);

    OdysseyRenderPipeline.renderPass.clearDepth = true;
    OdysseyRenderPipeline.renderPassGUI.clearDepth = true;
    OdysseyRenderPipeline.renderPass.clear = true;
    OdysseyRenderPipeline.renderPassGUI.clear = false;
    OdysseyRenderPipeline.renderPass.needsSwap = false;
    OdysseyRenderPipeline.renderPassGUI.needsSwap = false;
    OdysseyRenderPipeline.renderPassMGHud.needsSwap = false;
  }

  static resizeComposerTargets(width: number, height: number): void {
    OdysseyRenderPipeline.composer.setSize(width * GameState.rendererUpscaleFactor, height * GameState.rendererUpscaleFactor);
    GameState.depthTarget.setSize(
      GameState.ResolutionManager.getViewportWidth() * GameState.rendererUpscaleFactor,
      GameState.ResolutionManager.getViewportHeight() * GameState.rendererUpscaleFactor
    );
    OdysseyRenderPipeline.syncDepthTextureSize(GameState.depthTarget);
    OdysseyRenderPipeline.syncDepthTextureSize(OdysseyRenderPipeline.composer.renderTarget2);
    // Keep world role on the stencil/DepthTexture target after setSize.
    OdysseyRenderPipeline.resetComposerBufferRoles();
  }

  /** Soft-particle / blit DepthTexture image size must match the RT. */
  static syncDepthTextureSize(rt: THREE.WebGLRenderTarget | undefined | null): void {
    const dt = rt?.depthTexture;
    if(!rt || !dt) return;
    if(!dt.image){
      dt.image = { width: rt.width, height: rt.height } as any;
    }else{
      dt.image.width = rt.width;
      dt.image.height = rt.height;
    }
    dt.needsUpdate = true;
  }

  /**
   * readBuffer must stay on renderTarget2 (stencil + DepthTexture) for world /
   * soft-split / force distortion. EffectComposer may leave buffers swapped
   * after a prior frame's CopyShader needsSwap.
   */
  static resetComposerBufferRoles(): void {
    const c = OdysseyRenderPipeline.composer;
    if(!c) return;
    c.readBuffer = c.renderTarget2;
    c.writeBuffer = c.renderTarget1;
  }

  static renderFrame(delta: number = 0): void {
    RenderPerfStats.beginFrame(GameState.renderer);
    ModuleGpuWarmLog.tickFrame(GameState.renderer);

    OdysseyRenderPipeline.resetComposerBufferRoles();
    OdysseyRenderPipeline.renderPass.camera = GameState.currentCamera;
    if(OdysseyRenderPipeline.renderPassMGHud){
      OdysseyRenderPipeline.renderPassMGHud.camera = GameState.currentCamera;
    }

    // Shadow selection runs in Update* via updateShadowSystems. Only re-select here
    // when that pass did not run (GUI/LOADING/debugger). Maps + uniforms are gated.
    if(GameState.areShadowsEnabled()){
      if(!GameState.shadowSystemsUpdatedThisFrame){
        const focus = GameState.PartyManager.getCurrentPlayer()?.position ?? GameState.currentCameraPosition;
        const shadowTarget = GameState.PartyManager.getCurrentPlayer() ?? GameState.currentCamera;
        if(GameState.lightManager && shadowTarget){
          GameState.lightManager.update(0, shadowTarget);
        }
        GameState.odysseyShadowManager?.update(GameState.currentCamera, focus, delta);
      }
      const mapsMarked = !!GameState.odysseyShadowManager?.markShadowMapForRender(GameState.renderer);
      if(mapsMarked){
        OdysseyLightingBinder.refreshSceneShadowMapUniforms(GameState.scene);
        GameState.odysseyShadowManager?.consumeUniformsRefreshNeeded();
      }else if(GameState.odysseyShadowManager?.consumeUniformsRefreshNeeded()){
        OdysseyLightingBinder.refreshSceneShadowMapUniforms(GameState.scene);
      }
    }

    OdysseyUniformBuffers.beginFrame(GameState.renderer);
    OdysseyLightingBinder.packShadowUbo(GameState.odysseyShadowManager);

    if(RenderPerfStats.enabled){
      RenderPerfStats.beginPhase('depthPre');
    }
    OdysseyRenderPipeline.renderDepthPrepass();
    if(RenderPerfStats.enabled){
      RenderPerfStats.endPhase();
    }

    MotionBlurController.syncMotionBlurRatio();

    if(OdysseyRenderPipeline.speedBlurPass){
      OdysseyRenderPipeline.speedBlurPass.ratio = MotionBlurController.speedBlurRatio;
      OdysseyRenderPipeline.speedBlurPass.enabled = resolveSpeedBlurPass({
        frameBufferIniEnabled: OdysseyRenderPipeline.isFrameBufferEffectsEnabled(),
        enableSpeedBlur: MotionBlurController.speedBlurEnabled,
      });
    }

    if(OdysseyRenderPipeline.forceDistortionPass){
      const needed = GameState.forceDistortionNeeded;
      GameState.forceDistortionNeeded = false;
      if(needed && !GameState.forceDistortionTexture){
        GameState.forceDistortionTexture = OdysseyRenderPipeline.createFallbackDistortionTexture();
        OdysseyRenderPipeline.forceDistortionPass.setDistortionTexture(GameState.forceDistortionTexture);
        void OdysseyRenderPipeline.ensureForceDistortionTexture();
      }
      const rooms = GameState.module?.area?.rooms;
      const roomedOk = !GameState.module?.area || !!(rooms && rooms.length > 0);
      OdysseyRenderPipeline.forceDistortionPass.enabled =
        needed &&
        roomedOk &&
        OdysseyRenderPipeline.isFrameBufferEffectsEnabled() &&
        !!GameState.forceDistortionTexture;
      if(OdysseyRenderPipeline.forceDistortionPass.enabled){
        OdysseyRenderPipeline.forceDistortionPass.setDistortionTexture(GameState.forceDistortionTexture);
      }
    }

    // Bloom: swap into DepthTexture-free writeBuffer unless force warp needs stencil.
    if(OdysseyRenderPipeline.convolutionBloomPass){
      OdysseyRenderPipeline.convolutionBloomPass.setPreserveStencil(
        !!OdysseyRenderPipeline.forceDistortionPass?.enabled
      );
    }

    const composer = OdysseyRenderPipeline.composer;
    const cam = GameState.currentCamera;
    const prevCamLayers = cam?.layers?.mask;
    const miniGame = GameState.module?.area?.miniGame;
    const mgCamera = miniGame?.player?.camera;
    const hudPass = OdysseyRenderPipeline.renderPassMGHud;
    if(hudPass){
      hudPass.enabled = !!mgCamera;
    }
    if(OdysseyRenderPipeline.miniGameAspectMaskPass){
      const maskOn = resolveMiniGameAspectMaskPass({
        engineMode: GameState.Mode,
        hasMiniGame: !!miniGame,
        miniGameType: miniGame?.type,
      });
      OdysseyRenderPipeline.miniGameAspectMaskPass.enabled = maskOn;
      if(maskOn){
        OdysseyRenderPipeline.miniGameAspectMaskPass.setMiniGameType(miniGame?.type);
      }
    }
    if(OdysseyRenderPipeline.lensFlarePass){
      const flareLights = GameState.lightManager?.getLensFlareLights?.() ?? [];
      OdysseyRenderPipeline.lensFlarePass.enabled =
        !!OdysseyRenderPipeline.lensFlarePass.renderLensFlares && flareLights.length > 0;
    }
    if(cam){
      cam.layers.enable(RenderLayer.DEFAULT);
      cam.layers.disable(RenderLayer.MG_CAMERA_HUD);
    }

    if(RenderPerfStats.enabled){
      OdysseyRenderPipeline.renderComposerWithPerfPhases(composer, delta);
    }else{
      composer.render(delta);
    }
    if(OdysseyRenderPipeline.renderPass){
      OdysseyRenderPipeline.renderPass.enabled = true;
    }
    if(cam && prevCamLayers !== undefined){
      cam.layers.mask = prevCamLayers;
    }

    if(GameState.areShadowsEnabled()){
      GameState.odysseyShadowManager?.noteShadowMapRendered();
    }

    if(RenderPerfStats.enabled){
      RenderPerfStats.endFrame();
      RenderPerfStats.maybeLog(60);
    }
  }

  /**
   * Run EffectComposer while attributing `renderer.info` draw deltas to
   * world / gui / post buckets (shadow depth is hooked via shadowMap.render).
   */
  static renderComposerWithPerfPhases(composer: { passes: any[]; render: (delta?: number) => void }, delta: number): void {
    const wraps: Array<{ pass: any; orig: (...args: any[]) => void }> = [];
    for(let i = 0; i < composer.passes.length; i++){
      const pass = composer.passes[i];
      if(!pass?.enabled || typeof pass.render !== 'function'){ continue; }
      const orig = pass.render.bind(pass);
      wraps.push({ pass, orig });
      const name = pass.constructor?.name || '';
      pass.render = (...args: any[]) => {
        if(pass === OdysseyRenderPipeline.renderPassGUI || pass === OdysseyRenderPipeline.renderPassMGHud){
          RenderPerfStats.beginPhase('gui');
        }else if(pass === OdysseyRenderPipeline.renderPass){
          RenderPerfStats.beginPhase('world');
        }else{
          RenderPerfStats.beginPhase('post');
        }
        const ret = orig(...args);
        RenderPerfStats.endPhase();
        return ret;
      };
      void name;
    }
    try {
      composer.render(delta);
    }finally{
      for(let i = 0; i < wraps.length; i++){
        wraps[i].pass.render = wraps[i].orig;
      }
    }
  }

  /**
   * SetFrameBuffer / AurEnableFrameBufferEffects — INI
   * "Graphics Options"."Frame Buffer" (defaults to "1" in swkotor*-config).
   */
  static isFrameBufferEffectsEnabled(): boolean {
    if(!GameState.iniConfig) return true;
    const raw = GameState.iniConfig.getProperty('Graphics Options.Frame Buffer');
    if(raw === undefined || raw === null || raw === '') return true;
    return String(raw) !== '0';
  }

  /**
   * Load Scene ctor global distortiontex for RenderForceDistortion.
   */
  static async ensureForceDistortionTexture(): Promise<void> {
    if(GameState.forceDistortionTexture && !(GameState.forceDistortionTexture as any)._forceDistortionFallback){
      return;
    }
    if(!GameState.forceDistortionTexture){
      GameState.forceDistortionTexture = OdysseyRenderPipeline.createFallbackDistortionTexture();
      if(OdysseyRenderPipeline.forceDistortionPass){
        OdysseyRenderPipeline.forceDistortionPass.setDistortionTexture(GameState.forceDistortionTexture);
      }
    }
    try {
      const tex = await TextureLoader.Load('distortiontex');
      if(tex){
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        GameState.forceDistortionTexture = tex;
        if(OdysseyRenderPipeline.forceDistortionPass){
          OdysseyRenderPipeline.forceDistortionPass.setDistortionTexture(tex);
        }
        if(OdysseyRenderPipeline.dreamDistortionPass){
          OdysseyRenderPipeline.dreamDistortionPass.setDistortionTexture(tex);
        }
        if(OdysseyRenderPipeline.furyPass){
          OdysseyRenderPipeline.furyPass.setDistortionTexture(tex);
        }
      }
    }catch(e){
      console.warn('Failed to load distortiontex', e);
    }
  }

  /** Procedural stand-in when distortiontex is absent from game files. */
  static createFallbackDistortionTexture(): THREE.DataTexture {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for(let i = 0; i < size * size; i++){
      const r = 128 + ((Math.random() * 48) | 0) - 24;
      const g = 128 + ((Math.random() * 48) | 0) - 24;
      data[i * 4] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = 128;
      data[i * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    (tex as any)._forceDistortionFallback = true;
    return tex;
  }

  /**
   * Soft-particle depth: prefer opaque→blit→soft split into the composer
   * readBuffer (skips MeshDepthMaterial full-scene prepass). Falls back to
   * the legacy depth override prepass when blit is unavailable.
   */
  static renderDepthPrepass(): void {
    if(!GameState.softDepthNeeded || !GameState.depthTarget || !GameState.renderer || !GameState.currentCamera) return;
    GameState.softDepthNeeded = false;

    const composer = OdysseyRenderPipeline.composer;
    const colorTarget = composer?.readBuffer;
    if(composer && colorTarget && OdysseyRenderPipeline.renderPass){
      const splitOk = runOdysseySoftDepthSplit({
        scene: GameState.scene,
        renderer: GameState.renderer,
        camera: GameState.currentCamera,
        colorTarget,
        depthSampleTarget: GameState.depthTarget,
      });
      if(splitOk){
        OdysseyRenderPipeline.renderPass.enabled = false;
        return;
      }
    }

    runOdysseyDepthPrepass({
      scene: GameState.scene,
      renderer: GameState.renderer,
      camera: GameState.currentCamera,
      depthTarget: GameState.depthTarget,
    });
  }
}
