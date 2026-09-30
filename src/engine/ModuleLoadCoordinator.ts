import * as THREE from "three";
import { GameState } from "@/GameState";
import { AudioEngine, AudioEmitter } from "@/audio";
import { AudioEngineChannel } from "@/enums/audio/AudioEngineChannel";
import { AudioPriorityGroup } from "@/enums/audio/AudioPriorityGroup";
import { AudioEmitterType } from "@/enums/audio/AudioEmitterType";
import { EngineMode } from "@/enums/engine";
import { EventManager, VideoManager } from "@/managers";
import { ResourceLoader, TextureLoader } from "@/loaders";
import { SaveGame } from "@/engine/SaveGame";
import { consumeAreaTransitionLoadBackground } from "@/engine/area-transition-bmp";
import { ModuleSaveTable } from "@/engine/ModuleSaveTable";
import { planPostLoadRevealFade } from "@/engine/post-load-reveal-fade";
import { EngineModeController } from "@/engine/EngineModeController";
import { MotionBlurController } from "@/engine/MotionBlurController";
import { ITextureLoaderQueuedRef } from "@/interface/loaders/ITextureLoaderQueuedRef";
import { collapseAreaRoomLightmaps } from "@/three/odyssey/OdysseyLightmapAtlas";
import {
  warmRoomGpuResources,
  warmModuleGpu,
  collectModuleGpuTextureTargets,
  ModuleGpuWarmLog,
} from "@/three/odyssey/warmRoomGpuResources";
import { OdysseyUniformBuffers } from "@/three/odyssey/OdysseyUniformBuffers";
import { OdysseyLightingBinder } from "@/three/odyssey/OdysseyLightingBinder";
import { GameLoop } from '@/engine/GameLoop';
import { OdysseyRenderPipeline } from '@/engine/OdysseyRenderPipeline';

/**
 * Module load/unload, area-transition fades, and post-load GPU warm-up.
 * GameState keeps thin static wrappers for the public API.
 */
export class ModuleLoadCoordinator {
  static ResetModuleAudio(){
    GameState.CutsceneManager.audioEmitter =
    GameState.audioEmitter = new AudioEmitter(AudioEngine.GetAudioEngine(), AudioEngineChannel.VO);
    GameState.audioEmitter.type = AudioEmitterType.GLOBAL;
    GameState.audioEmitter.setPriorityGroupId(AudioPriorityGroup.ONE_SHOT_STREAMS);
    GameState.audioEmitter.load();
    AudioEngine.ensureGameBusesAudible();
  }

  /**
   * door/trigger area transition: StartGlobalFade(0, wait=0, length=0.5)
   * then load after the fade. Skips the pre-fade if a load is already in progress.
   */
  static LoadModuleWithAreaTransitionFade(name = '', waypoint: string = null){
    if(GameState.loadingModule || GameState.areaTransitionPending){
      return;
    }
    if(!name){
      return;
    }
    // door/trigger EventHandler → SetTransitionPending(1, nextId) before fade/load
    if(GameState.module?.area){
      GameState.module.area.setTransitionPending(true);
    }
    GameState.areaTransitionPending = true;
    const length = GameState.FadeOverlayManager.AREA_TRANSITION_FADE_LENGTH;
    GameState.FadeOverlayManager.FadeOut(length, 0, 0, 0, 0);
    const delayMs = Math.max(0, length) * 1000;
    setTimeout(() => {
      GameState.areaTransitionPending = false;
      void ModuleLoadCoordinator.LoadModule(name, waypoint);
    }, delayMs);
  }

  /**
   * Pass AI — fade then LoadModule, spawning at absolute XYZ (JumpToLocation cross-module).
   */
  static LoadModuleWithJumpSpawn(
    name: string,
    spawn: { x: number; y: number; z: number; ox: number; oy: number }
  ){
    if(GameState.loadingModule || GameState.areaTransitionPending){
      return;
    }
    if(!name){
      return;
    }
    GameState.pendingJumpSpawn = { ...spawn };
    ModuleLoadCoordinator.LoadModuleWithAreaTransitionFade(name, null);
  }

  static async LoadModule(name = '', waypoint: string = null, sMovie1 = '', sMovie2 = '', sMovie3 = '', sMovie4 = '', sMovie5 = '', sMovie6 = ''){
    try{
      if(GameState.loadingModule){
        return;
      }
      EventManager.FireEvent('module.load', {
        name: name,
        waypoint: waypoint?.toString(),
        sMovie1: sMovie1,
        sMovie2: sMovie2,
        sMovie3: sMovie3,
        sMovie4: sMovie4,
        sMovie5: sMovie5,
        sMovie6: sMovie6
      });
      GameState.loadingModule = true;
      // Destination ARE not loaded yet — fall back to load_<module> / loadscreens row / custom
      const loadBg = consumeAreaTransitionLoadBackground(name, 0);
      await GameState.MenuManager.LoadScreen.setLoadBackground(loadBg);
      // Clear any leftover K2 hold so the load cover FadeOut is not blocked.
      GameState.FadeOverlayManager.holdForScript = false;
      GameState.FadeOverlayManager.FadeOut(0, 0, 0, 0);
      EngineModeController.SetEngineMode(EngineMode.LOADING);
      GameState.MenuManager.ClearMenus();

      ModuleLoadCoordinator.UnloadModule();
      // Re-assert black cover after unload (UnloadModule clears fade state).
      GameState.FadeOverlayManager.FadeOut(0, 0, 0, 0);

      GameState.MenuManager.LoadScreen.setProgress(0);
      GameState.MenuManager.LoadScreen.showRandomHint();
      GameState.MenuManager.LoadScreen.open();

      await GameState.MenuManager.LoadInGameMenus();
      
      GameState.VideoEffectManager.SetVideoEffect(-1);
      GameState.ModuleObjectManager.playerSelectableObjects = [];
      GameState.VideoManager.queueMovie(sMovie1, true);
      GameState.VideoManager.queueMovie(sMovie2, true);
      GameState.VideoManager.queueMovie(sMovie3, true);
      GameState.VideoManager.queueMovie(sMovie4, true);
      GameState.VideoManager.queueMovie(sMovie5, true);
      GameState.VideoManager.queueMovie(sMovie6, true);
      EngineModeController.SetEngineMode(EngineMode.LOADING);
      
      if(GameState.module){
        // StallEventSaveGame → SaveModuleStart sets is_save_game = 1
        // TransPending remains set from LoadModuleWithAreaTransitionFade until after stall save
        // Skip stall-save when restoring a save (isLoadingSave) — GAMEINPROGRESS already extracted
        if(!GameState.isLoadingSave){
          try{ await GameState.module.save(true); }catch(e){
            console.error(e);
          }
          // StartNewModule: DoModuleEnterSaveCleanup then AutoSaveOnEnteringModule → DoPCAutosave
          try{
            await ModuleSaveTable.doModuleEnterSaveCleanup(name);
            if(ModuleSaveTable.shouldAutoSaveOnEnteringModule(name)){
              await SaveGame.AutoSaveOnModuleEnter(name);
            }
          }catch(e){
            console.error(e);
          }
        }
        if(GameState.module.area){
          GameState.module.area.setTransitionPending(false);
        }
        try{ GameState.module.dispose(); }catch(e){
          console.error(e);
        }
      }

      //Remove all cached scripts and kill all running instances
      GameState.NWScript.Reload();

      //Resets all keys to their default state
      GameState.controls.initKeys();
      await GameState.FactionManager.Load();

      const module = await GameState.Module.Load(name, waypoint);
      GameState.module = module;
      GameState.scene.visible = false;

      console.log('Module.loadScene');
      await module.loadScene();

      await TextureLoader.LoadQueue( (ref: ITextureLoaderQueuedRef) => {
        const material = ref.material as any;
        if(material?.map){
          GameState.renderer.initTexture(material.map);
        }
      });

      try {
        collapseAreaRoomLightmaps(module.area?.rooms || []);
      }catch(e){
        console.warn('Lightmap atlas collapse failed', e);
      }

      // Full GPU warm-up under LoadScreen: maps/lightmaps/env/bump/grass + programs.
      // Moves first-visible stalls off gameplay VIS / frustum reveals.
      const rooms = module.area?.rooms || [];
      warmRoomGpuResources(rooms, GameState.renderer);

      module.initEventQueue();

      console.log('Module.initScripts');
      await module.initScripts();

      GameState.scene.visible = true;
      
      AudioEngine.Unmute();
      VideoManager.playMovieQueue( async () => {
        const runSpawnScripts = !GameState.isLoadingSave;
        GameState.isLoadingSave = false;

        ModuleLoadCoordinator.ResetModuleAudio();

        GameState.renderer.setClearColor( new THREE.Color(GameState.module.area.sun.fogColor) );
        
        console.log('ModuleArea.initAreaObjects');
        // minigame areas: no party InGame HUD (swoop/turret).
        if(GameState.module.area.miniGame){
          EngineModeController.SetEngineMode(EngineMode.MINIGAME);
        }else{
          GameState.MenuManager.InGameOverlay.recalculatePosition();
          GameState.MenuManager.InGameOverlay.open();
          EngineModeController.SetEngineMode(EngineMode.INGAME);
          // Pass AE: PT_LAST_GUI_PNL — reopen death panel (GUI_PANEL_PLAYER_DEATH = 0)
          const lastGui = GameState.PartyManager?.LastGuiPanel | 0;
          const pc = GameState.PartyManager?.party?.[0];
          if(lastGui === 0 && pc?.isDead?.()){
            GameState.GameOverManager?.PopUpGUIPanel?.(pc, 0);
          }
        }
        await GameState.module.area.initAreaObjects(runSpawnScripts);
        console.log('ModuleArea: ready to play');
        GameState.module.readyToProcessEvents = true;
        // Snap camera + VIS/frustum before load UI hides (first world frame ready)
        GameState.module.area.primePostLoadReveal();
        await ModuleLoadCoordinator.warmModuleGpuForArea();

        if(GameState.Mode == EngineMode.INGAME){
          const anyCanLevel = GameState.PartyManager.party.some((p) => p.canLevelUp());
          if(anyCanLevel){
            GameState.audioEmitter.playSound('gui_level');
          }
        }

        //Reveal the area — MainLoop StartGlobalFade(1, wait=0.5, length=1.0)
        // FadeIn before LoadScreen.close so the fade plane is already opaque FADING_IN.
        AudioEngine.clearSoundModeStack();
        ModuleLoadCoordinator.applyPostLoadRevealFade();
        // MainLoop after StartSounds: SetSoundMode(0) again (clears BusyWait mute under load).
        GameState.MenuManager.LoadScreen.close();
        GameState.module.area.updateDayNightCycle();
        GameState.module.area.musicBackgroundPlay();
        GameState.module.area.ambientSoundPlay();
        GameState.loadingModule = false;
      });
    }catch(e){
      GameState.loadingModule = false;
      console.error(e);
      throw e;
    }
  }

  static UnloadModule(){
    if(GameState.module){
      EventManager.FireEvent('module.unload', {
        name: GameState.module.name
      });
    }
    GameState.GameOverManager?.Reset?.();
    GameState.MenuManager.ClearMenus();
    GameState.deltaTime = 0;
    ResourceLoader.clearCache();

    GameState.scene.visible = false;
    EngineModeController.SetEngineMode(EngineMode.LOADING);
    GameState.ModuleObjectManager.Reset();
    GameState.renderer.setClearColor(new THREE.Color(0, 0, 0));
    GameState.AlphaTest = 0;
    GameState.holdWorldFadeInForDialog = false;
    GameState.areaTransitionPending = false;
    GameState.FadeOverlayManager.Reset();
    // SWMG_SetSpeedBlurEffect / Force Speed leave AurEnableSpeedBlur set; clear so
    // AccumulationBlurPass does not smear the next module (AurDisableSpeedBlur).
    MotionBlurController.resetForUnload();
    const audioEngine = AudioEngine.GetAudioEngine();
    audioEngine.reset();

    GameState.lightManager.clearLights();
    GameState.windManager.clear();
    GameState.grassManager?.clear();

    GameState.CursorManager.selected = undefined;
    GameState.CursorManager.selectedObject = undefined;
    GameState.CursorManager.hovered = undefined;
    GameState.CursorManager.hoveredObject = undefined;

    GameState.staticCameras = [];
    GameState.CutsceneManager.clearOnModuleUnload();

    AudioEngine.Mute();
  }

  /**
   * After primePostLoadReveal: world FadeIn unless hold or dialog already active.
   * Forces hold when dialog is active so the deferred first entry releases with
   * HOLD_WORLD_FADE_IN_*. Re-enables dialog send and flushes any queued entry.
   */
  static applyPostLoadRevealFade(): void {
    const plan = planPostLoadRevealFade({
      holdWorldFadeInForDialog: GameState.holdWorldFadeInForDialog,
      cutsceneActive: !!GameState.CutsceneManager?.active,
      mode: GameState.Mode,
    });
    if(plan.forceHold){
      GameState.holdWorldFadeInForDialog = true;
    }
    if(plan.assertDialogMode){
      EngineModeController.SetEngineMode(EngineMode.DIALOG);
    }
    if(plan.startWorldFadeIn){
      GameState.FadeOverlayManager.FadeIn(
        GameState.FadeOverlayManager.WORLD_FADE_IN_LENGTH,
        0, 0, 0,
        GameState.FadeOverlayManager.WORLD_FADE_IN_WAIT
      );
    }
    // After hold/fade decision: allow entry send and flush queued first entry.
    GameState.CutsceneManager?.enableDialogSendAndFlush?.();
  }

  static ReloadTextureCache(){
    if(GameState.module && GameState.module.area){
      GameState.module.area.reloadTextures();
    }
  }

  /**
   * Upload textures, compile shaders, and draw all module geometry once while
   * the load screen is up (after camera / VIS frustum are primed).
   */
  static async warmModuleGpuForArea(): Promise<void> {
    const area = GameState.module?.area;
    const renderer = GameState.renderer;
    const camera = GameState.currentCamera;
    const scene = GameState.scene;
    if(!area || !renderer || !camera){
      return;
    }

    const skipRoots = new Set<THREE.Object3D>();
    if(GameState.group?.debug){
      skipRoots.add(GameState.group.debug);
    }

    GameLoop.updateViewportFrustum();
    GameLoop.updateShadowSystems(0, GameState.PartyManager.getCurrentPlayer()?.position ?? GameState.currentCameraPosition);

    await warmModuleGpu({
      renderer,
      scene,
      camera,
      textureTargets: collectModuleGpuTextureTargets(area, GameState.PartyManager.party),
      skipRoots,
      colorTargetTemplate: OdysseyRenderPipeline.composer?.readBuffer ?? null,
      beforeRender: () => {
        OdysseyUniformBuffers.beginFrame(renderer);
        OdysseyLightingBinder.packShadowUbo(GameState.odysseyShadowManager);
        if(GameState.areShadowsEnabled()){
          GameState.odysseyShadowManager?.markShadowMapForRender(renderer);
        }
      },
    });

    ModuleGpuWarmLog.startPostRevealFrameWatch(120);
  }
}
