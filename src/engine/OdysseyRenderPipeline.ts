import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { SSAARenderPass } from "three/examples/jsm/postprocessing/SSAARenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { BloomPass } from "three/examples/jsm/postprocessing/BloomPass";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass";
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
  static initComposer(): void {
    GameState.composer = new EffectComposer(GameState.renderer);
    // Enable stencil on composer targets for -equivalent shadow disks.
    // DepthTexture lets soft particles sample after an opaque split (WebGL2 blit path).
    const composerRT = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: true,
    };
    const w = GameState.ResolutionManager.getViewportWidth();
    const h = GameState.ResolutionManager.getViewportHeight();
    GameState.composer.renderTarget1 = new THREE.WebGLRenderTarget(w, h, composerRT);
    GameState.composer.renderTarget1.depthTexture = new THREE.DepthTexture(w, h);
    GameState.composer.renderTarget1.depthTexture.type = THREE.UnsignedShortType;
    GameState.composer.renderTarget2 = GameState.composer.renderTarget1.clone();
    if(!GameState.composer.renderTarget2.depthTexture){
      GameState.composer.renderTarget2.depthTexture = new THREE.DepthTexture(w, h);
      GameState.composer.renderTarget2.depthTexture.type = THREE.UnsignedShortType;
    }
    GameState.composer.writeBuffer = GameState.composer.renderTarget1;
    GameState.composer.readBuffer = GameState.composer.renderTarget2;
    GameState.renderPass = new RenderPass(GameState.scene, GameState.currentCamera);
    GameState.renderPassAA = new SSAARenderPass (GameState.scene, GameState.currentCamera);
    GameState.odysseyShaderPass = new OdysseyShaderPass();
    GameState.odysseyShaderPass.enabled = false;
    GameState.forceDistortionPass = new ForceDistortionPass();
    GameState.forceDistortionPass.enabled = false;
    GameState.overbrightenPass = new OverbrightenPass();
    GameState.overbrightenPass.enabled = false;
    GameState.convolutionBloomPass = new ConvolutionBloomPass();
    GameState.convolutionBloomPass.enabled = false;
    GameState.dreamDistortionPass = new DreamDistortionPass();
    GameState.dreamDistortionPass.enabled = false;
    GameState.furyPass = new FuryPass();
    GameState.furyPass.enabled = false;
    GameState.lensFlarePass = new OdysseyLensFlarePass();
    GameState.lensFlarePass.setLightsProvider(() => GameState.lightManager.getLensFlareLights());
    GameState.lensFlarePass.setCameraProvider(() => GameState.currentCamera);
    GameState.lensFlarePass.setAreaProvider(() => GameState.module?.area);
    GameState.lensFlarePass.setDeltaProvider(() => GameState.deltaTime || 0);
    GameState.miniGameAspectMaskPass = new MiniGameAspectMaskPass();
    GameState.miniGameAspectMaskPass.enabled = false;
    GameState.copyPass = new ShaderPass(CopyShader);
    GameState.renderPassGUI = new RenderPass(GameState.scene_gui, GameState.camera_gui);
    GameState.renderPassMGHud = new RenderPass(GameState.scene, GameState.currentCamera);
    // Swap camera layer mask for HUD-only draw after AccumulationBlurPass.
    const mgHudRender = GameState.renderPassMGHud.render.bind(GameState.renderPassMGHud);
    GameState.renderPassMGHud.render = (
      renderer: THREE.WebGLRenderer,
      writeBuffer: THREE.WebGLRenderTarget,
      readBuffer: THREE.WebGLRenderTarget,
      deltaTime: number,
      maskActive: boolean
    ) => {
      const cam = GameState.renderPassMGHud.camera as THREE.Camera | undefined;
      const prevMask = cam?.layers?.mask;
      if(cam){
        cam.layers.set(RenderLayer.MG_CAMERA_HUD);
      }
      mgHudRender(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
      if(cam && prevMask !== undefined){
        cam.layers.mask = prevMask;
      }
    };

    GameState.bloomPass = new BloomPass(0.5);
    GameState.bokehPass = new BokehPass(GameState.scene, GameState.currentCamera, {
      focus: 1.0,
      aperture:	0.0001,
      maxblur:	1.0,
    });

    GameState.speedBlurPass = new AccumulationBlurPass(GameState.speedBlurRatio);
    GameState.speedBlurPass.enabled = false;

    GameState.renderPassAA.sampleLevel = 1;

    GameState.renderPass.renderToScreen = false;
    GameState.copyPass.renderToScreen = false;
    GameState.renderPassGUI.renderToScreen = false;
    GameState.renderPassMGHud.renderToScreen = false;

    GameState.renderPass.clear = true;
    GameState.bloomPass.clear = false;
    GameState.odysseyShaderPass.clear = false;
    GameState.renderPassAA.clear = false;
    GameState.copyPass.clear = false;
    GameState.renderPassGUI.clear = false;
    GameState.renderPassGUI.clearDepth = true;
    GameState.renderPassMGHud.clear = false;
    GameState.renderPassMGHud.clearDepth = true;
    GameState.renderPassMGHud.enabled = false;

    GameState.bokehPass.needsSwap = true;
    GameState.bokehPass.enabled = false;

    GameState.composer.addPass(GameState.renderPass);
    GameState.composer.addPass(GameState.speedBlurPass);
    // MG camera HUD after accumulation blur (screen-stable gauges).
    GameState.composer.addPass(GameState.renderPassMGHud);
    // FrameBufferModifications order before GUI:
    // 0x01 overbrighten (visualizePass1 off in shipping) →
    // 0x02 convolution (visualizePass2 on) → 0x20 force distortion →
    // film/sat (VideoEffects) → K2 dream → K2 fury
    GameState.composer.addPass(GameState.overbrightenPass);
    GameState.composer.addPass(GameState.convolutionBloomPass);
    GameState.composer.addPass(GameState.forceDistortionPass);
    GameState.composer.addPass(GameState.odysseyShaderPass);
    GameState.composer.addPass(GameState.dreamDistortionPass);
    GameState.composer.addPass(GameState.furyPass);
    // lens flare render after FrameBufferModifications, before GUI.
    GameState.composer.addPass(GameState.lensFlarePass);
    // Soft 4:3 cockpit mask for swoop/turret — after world FX, before GUI.
    GameState.composer.addPass(GameState.miniGameAspectMaskPass);

    GameState.composer.addPass(GameState.renderPassGUI);
    GameState.composer.addPass(GameState.copyPass);

    GameState.renderPass.clearDepth = true;
    GameState.renderPassGUI.clearDepth = true;
    GameState.renderPass.clear = true;
    GameState.renderPassGUI.clear = false;
    GameState.renderPass.needsSwap = false;
    GameState.renderPassGUI.needsSwap = false;
    GameState.renderPassMGHud.needsSwap = false;
  }

  static resizeComposerTargets(width: number, height: number): void {
    GameState.composer.setSize(width * GameState.rendererUpscaleFactor, height * GameState.rendererUpscaleFactor);
    GameState.depthTarget.setSize(
      GameState.ResolutionManager.getViewportWidth() * GameState.rendererUpscaleFactor,
      GameState.ResolutionManager.getViewportHeight() * GameState.rendererUpscaleFactor
    );
    const rt = GameState.depthTarget;
    const dt = rt?.depthTexture;
    if(rt && dt){
      if(!dt.image){
        dt.image = { width: rt.width, height: rt.height } as any;
      }else{
        dt.image.width = rt.width;
        dt.image.height = rt.height;
      }
      dt.needsUpdate = true;
    }
  }

  static renderFrame(delta: number = 0): void {
    RenderPerfStats.beginFrame(GameState.renderer);
    ModuleGpuWarmLog.tickFrame(GameState.renderer);

    GameState.renderPass.camera = GameState.currentCamera;
    GameState.renderPassAA.camera = GameState.currentCamera;
    GameState.bokehPass.camera = GameState.currentCamera;
    if(GameState.renderPassMGHud){
      GameState.renderPassMGHud.camera = GameState.currentCamera;
    }

    // Shadow selection runs in Update* via updateShadowSystems. Only re-select here
    // when that pass did not run (GUI/LOADING/debugger). Maps + uniforms are gated.
    if(GameState.areShadowsEnabled()){
      if(!GameState.shadowSystemsUpdatedThisFrame){
        const focus = GameState.getCurrentPlayer()?.position ?? GameState.currentCameraPosition;
        const shadowTarget = GameState.getCurrentPlayer() ?? GameState.currentCamera;
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

    if(GameState.speedBlurPass){
      GameState.speedBlurPass.ratio = GameState.speedBlurRatio;
      GameState.speedBlurPass.enabled = resolveSpeedBlurPass({
        frameBufferIniEnabled: OdysseyRenderPipeline.isFrameBufferEffectsEnabled(),
        enableSpeedBlur: GameState.speedBlurEnabled,
      });
    }

    if(GameState.forceDistortionPass){
      const needed = GameState.forceDistortionNeeded;
      GameState.forceDistortionNeeded = false;
      if(needed && !GameState.forceDistortionTexture){
        GameState.forceDistortionTexture = OdysseyRenderPipeline.createFallbackDistortionTexture();
        GameState.forceDistortionPass.setDistortionTexture(GameState.forceDistortionTexture);
        void OdysseyRenderPipeline.ensureForceDistortionTexture();
      }
      const rooms = GameState.module?.area?.rooms;
      const roomedOk = !GameState.module?.area || !!(rooms && rooms.length > 0);
      GameState.forceDistortionPass.enabled =
        needed &&
        roomedOk &&
        OdysseyRenderPipeline.isFrameBufferEffectsEnabled() &&
        !!GameState.forceDistortionTexture;
      if(GameState.forceDistortionPass.enabled){
        GameState.forceDistortionPass.setDistortionTexture(GameState.forceDistortionTexture);
      }
    }

    const composer = GameState.composer;
    const cam = GameState.currentCamera;
    const prevCamLayers = cam?.layers?.mask;
    const miniGame = GameState.module?.area?.miniGame;
    const mgCamera = miniGame?.player?.camera;
    const hudPass = GameState.renderPassMGHud;
    if(hudPass){
      hudPass.enabled = !!mgCamera;
    }
    if(GameState.miniGameAspectMaskPass){
      const maskOn = resolveMiniGameAspectMaskPass({
        engineMode: GameState.Mode,
        hasMiniGame: !!miniGame,
        miniGameType: miniGame?.type,
      });
      GameState.miniGameAspectMaskPass.enabled = maskOn;
      if(maskOn){
        GameState.miniGameAspectMaskPass.setMiniGameType(miniGame?.type);
      }
    }
    if(GameState.lensFlarePass){
      const flareLights = GameState.lightManager?.getLensFlareLights?.() ?? [];
      GameState.lensFlarePass.enabled =
        !!GameState.lensFlarePass.renderLensFlares && flareLights.length > 0;
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
    if(GameState.renderPass){
      GameState.renderPass.enabled = true;
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
        if(pass === GameState.renderPassGUI || pass === GameState.renderPassMGHud){
          RenderPerfStats.beginPhase('gui');
        }else if(pass === GameState.renderPass){
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
      if(GameState.forceDistortionPass){
        GameState.forceDistortionPass.setDistortionTexture(GameState.forceDistortionTexture);
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
        if(GameState.forceDistortionPass){
          GameState.forceDistortionPass.setDistortionTexture(tex);
        }
        if(GameState.dreamDistortionPass){
          GameState.dreamDistortionPass.setDistortionTexture(tex);
        }
        if(GameState.furyPass){
          GameState.furyPass.setDistortionTexture(tex);
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

    const composer = GameState.composer;
    const colorTarget = composer?.readBuffer;
    if(composer && colorTarget && GameState.renderPass){
      const splitOk = runOdysseySoftDepthSplit({
        scene: GameState.scene,
        renderer: GameState.renderer,
        camera: GameState.currentCamera,
        colorTarget,
        depthSampleTarget: GameState.depthTarget,
      });
      if(splitOk){
        GameState.renderPass.enabled = false;
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
