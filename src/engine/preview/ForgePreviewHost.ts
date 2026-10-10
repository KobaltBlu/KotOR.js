import * as THREE from "three";
import { GameState } from "@engine/runtime/GameState";
import { AudioEngine } from "@engine/audio";
import { EngineMode } from "@engine/enums/engine";
import { EventManager } from "@engine/managers";
import { TextureLoader } from "@engine/loaders";
import { EngineModeController } from "@engine/runtime/EngineModeController";
import { ModuleLoadCoordinator } from "@engine/runtime/ModuleLoadCoordinator";
import { ViewportController } from "@engine/runtime/ViewportController";
import { ITextureLoaderQueuedRef } from "@engine/interface/loaders/ITextureLoaderQueuedRef";
import { collapseAreaRoomLightmaps } from "@engine/render/three/odyssey/OdysseyLightmapAtlas";
import { warmRoomGpuResources } from "@engine/render/three/odyssey/warmRoomGpuResources";
import { GUIListBox } from "@engine/gui/GUIListBox";

/**
 * Forge module preview: canvas host, resize observer, archive-based loads.
 * GameState keeps thin static wrappers for the public API.
 */
export class ForgePreviewHost {
  private static forgePreviewResizeObserver: ResizeObserver | null = null;

  /**
   * Initialize GameState for Forge module preview (no MainMenu / legal movies).
   * Safe to call again to reparent the canvas into a new host element.
   */
  static async InitForForgePreview(host: HTMLElement): Promise<void> {
    GameState.forgePreviewHost = true;
    GameState.setDOMElement(host);
    GameState.ResolutionManager.setViewportHost(host);
    ForgePreviewHost.attachForgePreviewResizeObserver(host);

    if(GameState.Ready && GameState.canvas){
      if(GameState.canvas.parentElement !== host){
        host.appendChild(GameState.canvas);
      }
      ForgePreviewHost.applyForgePreviewCanvasLayout();
      ViewportController.EventOnResize();
      ForgePreviewHost.ensureGuiListHexTextures();
      return;
    }
    await GameState.Init();
    ForgePreviewHost.ensureGuiListHexTextures();
    if(GameState.canvas){
      if(GameState.canvas.parentElement !== host){
        host.appendChild(GameState.canvas);
      }
      ForgePreviewHost.applyForgePreviewCanvasLayout();
      ViewportController.EventOnResize();
    }
  }

  /** AppState loads these for the full game; Forge preview must as well. */
  static ensureGuiListHexTextures(): void {
    if(GUIListBox.hexTextures?.size){ return; }
    GUIListBox.InitTextures?.();
  }

  /** Size/position the play canvas to the preview host without CSS stretch. */
  static applyForgePreviewCanvasLayout(): void {
    ViewportController.applyForgePreviewCanvasLayout();
  }

  static attachForgePreviewResizeObserver(host: HTMLElement): void {
    ForgePreviewHost.detachForgePreviewResizeObserver();
    if(typeof ResizeObserver === 'undefined'){
      return;
    }
    ForgePreviewHost.forgePreviewResizeObserver = new ResizeObserver(() => {
      if(!GameState.forgePreviewHost || GameState.ResolutionManager.viewportHost !== host){
        return;
      }
      GameState.ResolutionManager.syncWindowResolutionFromHost();
      GameState.ResolutionManager.recalculate();
      ForgePreviewHost.applyForgePreviewCanvasLayout();
      ViewportController.EventOnResize();
    });
    ForgePreviewHost.forgePreviewResizeObserver.observe(host);
  }

  static detachForgePreviewResizeObserver(): void {
    if(ForgePreviewHost.forgePreviewResizeObserver){
      ForgePreviewHost.forgePreviewResizeObserver.disconnect();
      ForgePreviewHost.forgePreviewResizeObserver = null;
    }
  }

  /** Tear down Forge preview viewport binding (call on Exit Preview). */
  static clearForgePreviewViewport(): void {
    ForgePreviewHost.detachForgePreviewResizeObserver();
    GameState.forgePreviewHost = false;
    GameState.ResolutionManager.setViewportHost(null);
    GameState.ResolutionManager.recalculate();
  }

  /**
   * Load a module from in-memory archives (Forge playable preview).
   * Skips intro movies and does not write a save on dispose of prior module.
   */
  static async LoadModuleFromArchives(archives: any[], waypoint: string = null, modName = 'preview'){
    try{
      if(GameState.loadingModule){
        return;
      }
      EventManager.FireEvent('module.load', {
        name: modName,
        waypoint: waypoint?.toString(),
        preview: true,
      });
      GameState.loadingModule = true;
      try{
        await GameState.MenuManager.LoadScreen.setLoadBackground('load_'+modName);
      }catch(e){
        console.warn('LoadModuleFromArchives: load background', e);
      }
      GameState.FadeOverlayManager.FadeOut(0, 0, 0, 0);
      EngineModeController.SetEngineMode(EngineMode.LOADING);
      GameState.MenuManager.ClearMenus();

      ModuleLoadCoordinator.UnloadModule();
      // Re-assert black cover after unload (UnloadModule clears fade state).
      GameState.FadeOverlayManager.FadeOut(0, 0, 0, 0);

      try{
        GameState.MenuManager.LoadScreen.setProgress(0);
        GameState.MenuManager.LoadScreen.open();
      }catch(e){
        console.warn('LoadModuleFromArchives: load screen', e);
      }

      try{
        await GameState.MenuManager.LoadInGameMenus();
      }catch(e){
        console.warn('LoadModuleFromArchives: LoadInGameMenus', e);
      }

      GameState.VideoEffectManager.SetVideoEffect(-1);
      GameState.GameObjectManager.playerSelectableObjects = [];
      EngineModeController.SetEngineMode(EngineMode.LOADING);

      if(GameState.module){
        try{ GameState.module.dispose(); }catch(e){
          console.error(e);
        }
        GameState.module = undefined as any;
      }

      GameState.NWScript.Reload();
      GameState.controls.initKeys();
      await GameState.FactionManager.Load();

      if(!GameState.PartyManager.PlayerTemplate){
        GameState.PartyManager.PlayerTemplate = GameState.PartyManager.GeneratePlayerTemplate();
        GameState.PartyManager.ActualPlayerTemplate = GameState.PartyManager.PlayerTemplate;
      }

      const module = await GameState.Module.LoadFromArchives(archives, waypoint, modName);
      if(!module?.area){
        throw new Error('Failed to load module from archives');
      }
      GameState.module = module;
      GameState.scene.visible = false;

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

      const rooms = module.area?.rooms || [];
      warmRoomGpuResources(rooms, GameState.renderer);

      module.initEventQueue();
      await module.initScripts();

      GameState.scene.visible = true;
      AudioEngine.Unmute();

      const runSpawnScripts = true;
      GameState.isLoadingSave = false;
      ModuleLoadCoordinator.ResetModuleAudio();

      try{
        GameState.MenuManager.InGameOverlay.recalculatePosition();
        GameState.MenuManager.InGameOverlay.open();
      }catch(e){
        console.warn('LoadModuleFromArchives: overlay', e);
      }

      GameState.renderer.setClearColor( new THREE.Color(GameState.module.area.sun.fogColor) );

      EngineModeController.SetEngineMode(GameState.module.area.miniGame ? EngineMode.MINIGAME : EngineMode.INGAME);
      await GameState.module.area.initAreaObjects(runSpawnScripts);
      GameState.module.readyToProcessEvents = true;
      GameState.module.area.primePostLoadReveal();
      await ModuleLoadCoordinator.warmModuleGpuForArea();
      ModuleLoadCoordinator.applyPostLoadRevealFade();
      try{ GameState.MenuManager.LoadScreen.close(); }catch(e){}
      GameState.module.area.musicBackgroundPlay();
      GameState.loadingModule = false;
      GameState.canvas?.focus();
    }catch(e){
      GameState.loadingModule = false;
      console.error(e);
      throw e;
    }
  }
}
