import * as THREE from "three";

import { GameState } from "@/GameState";
import { AudioEngine } from "@/audio";
import { TextureLoader } from "@/loaders";
import { EngineState, EngineMode, GameEngineType } from "@/enums/engine";
import { AudioEngineChannel } from "@/enums/audio/AudioEngineChannel";
import { ModuleSaveTable } from "@/engine/ModuleSaveTable";
import { isVSyncEnabledRaw, runUpdateTick } from "@/engine/updateLoopSchedule";
import { GameDebuggerBridge } from "@/engine/GameDebuggerBridge";
import { OdysseyRenderPipeline } from "@/engine/OdysseyRenderPipeline";
import { GameStateEvents } from "@/engine/GameStateEvents";
import { AutoPauseManager, TextureAnimationManager } from "@/managers";
import { flushGuiMatrices } from "@/gui/guiMatrix";
import { EngineModeController } from '@/engine/EngineModeController';

/**
 * Main update loop, mode ticks, and viewport/shadow prep before render.
 */
export class GameLoop {

  static updateTime(delta: number = 0){
    GameState.time += delta;

    if(GameState.deltaTime > 1000)
      GameState.deltaTime = GameState.deltaTime % 1;
  }

  static Start(): void {
    if(GameState.Ready && !GameState.OnReadyCalled){
      GameState.OnReadyCalled = true;
      GameStateEvents.processEventListener('ready');
      window.dispatchEvent(new Event('resize'));

      if(GameState.forgePreviewHost){
        EngineModeController.SetEngineMode(EngineMode.LOADING);
        GameState.State = EngineState.RUNNING;
        AudioEngine.Unmute(AudioEngineChannel.ALL);
        AudioEngine.Mute(AudioEngineChannel.MOVIE);
        GameLoop.Update();
        return;
      }

      const onIntroComplete = () => {
        window.dispatchEvent(new Event('resize'));
        if(GameState.GameKey == GameEngineType.TSL){
          GameState.LegalScreenManager.Start();
          return;
        }
        GameState.MenuManager.MainMenu.Start();
        EngineModeController.SetEngineMode(EngineMode.GUI);
        GameState.State = EngineState.RUNNING;
        AudioEngine.Unmute(AudioEngineChannel.ALL);
        AudioEngine.Mute(AudioEngineChannel.MOVIE);
      };

      GameState.VideoManager.playMovieQueue(onIntroComplete).catch((e) => {
        console.error(e);
        onIntroComplete();
      });
      GameLoop.Update();
    }
  }

  static isVSyncEnabled(): boolean {
    if(!GameState.iniConfig) return isVSyncEnabledRaw(undefined, false);
    const raw = GameState.iniConfig.getProperty('Graphics Options.V-Sync');
    return isVSyncEnabledRaw(raw, true);
  }

  static scheduleNextUpdate(workMs = 0): void {
    GameState.updateLoop.schedule(
      GameLoop.isVSyncEnabled(),
      workMs,
      () => GameLoop.Update(),
    );
  }

  static applyVSyncOption(): void {
    GameState.updateLoop.applyOption(
      GameLoop.isVSyncEnabled(),
      () => GameLoop.Update(),
    );
  }

  static Update(): void {
    runUpdateTick(() => {
    GameState.stats.begin();

    GameState.forwardVector.set(0, 0, -1);
    GameState.shadowSystemsUpdatedThisFrame = false;

    GameState.clock.update();
    const delta = GameState.clock.getDelta();
    GameStateEvents.processEventListener('beforeRender', [delta]);
    GameState.delta = delta;
    GameState.deltaTime += delta;
    GameState.deltaTimeFixed += delta;

    if(GameDebuggerBridge.tryUpdateWhileHalted(delta)){
      return;
    }

    GameState.controls.Update(delta);
    GameState.scene_cursor_holder.visible =
      GameState.Mode != EngineMode.MOVIE &&
      GameState.Mode != EngineMode.LEGAL &&
      !GameState.controls?.controllerHidesCursor;
    if(GameState.Mode == EngineMode.MOVIE || GameState.VideoManager.isMoviePlaying()){
      GameState.Mode = EngineMode.MOVIE;
      GameLoop.UpdateMovie(delta);
      return;
    }

    if(GameState.Mode == EngineMode.LEGAL){
      GameLoop.UpdateLegal(delta);
      return;
    }

    GameState.VideoEffectManager.Update(delta);
    TextureAnimationManager.update(delta);

    GameState.MenuManager.Update(delta);

    if(!GameState.loadingTextures && TextureLoader.queue.length){
      GameState.loadingTextures = true;
      TextureLoader.LoadQueue().then( () => {
        GameState.loadingTextures = false;
      });
    }

    if(GameState.MenuManager.InGamePause)
      GameState.MenuManager.InGamePause.hide();

    switch(GameState.Mode){
      case EngineMode.LOADING:
        break;
      case EngineMode.GUI:
        GameLoop.UpdateGUI(delta);
        break;
      case EngineMode.INGAME:
        GameLoop.UpdateIngame(delta);
        break;
      case EngineMode.DIALOG:
        GameLoop.UpdateDialog(delta);
        break;
      case EngineMode.MINIGAME:
        GameLoop.UpdateMinigame(delta);
        break;
      case EngineMode.FREELOOK:
        GameLoop.UpdateFreeLook(delta);
        break;
    }

    if(
      GameState.FadeOverlayManager.isFading() ||
      GameState.FadeOverlayManager.isObscuring()
    ){
      GameState.FadeOverlayManager.Update(delta);
    }

    if(GameState.MenuManager.InGameAreaTransition)
      GameState.MenuManager.InGameAreaTransition.updateAreaTransitionGUI();

    AudioEngine.GetAudioEngine().update(delta, GameState.currentCamera.position, GameState.currentCamera.rotation, GameState.forwardVector);

    OdysseyRenderPipeline.renderFrame(delta);

    if( ((GameState.Mode == EngineMode.MINIGAME || GameState.Mode == EngineMode.DIALOG) || (GameState.Mode == EngineMode.INGAME)) && GameState.State != EngineState.PAUSED){
      if(GameState.noClickTimer){
        GameState.noClickTimer -= (1 * delta);
        if(GameState.noClickTimer < 0){
          GameState.noClickTimer = 0;
        }
      }
    }

    GameState.stats.end();
    GameStateEvents.processEventListener('afterRender', [delta]);
    }, (workMs) => GameLoop.scheduleNextUpdate(workMs));
  }

  static UpdateMovie(delta: number = 0): void {
    GameState.VideoManager.update(delta);
    flushGuiMatrices();
    GameState.renderer.render(GameState.scene_movie, GameState.camera_gui);
    GameState.stats.end();
    GameStateEvents.processEventListener('afterRender', [delta]);
  }

  static UpdateGUI(_delta: number = 0): void {
    //NOP
  }

  static updateViewportFrustum(): void {
    if(!GameState.currentCamera) return;
    GameState.currentCamera.updateMatrixWorld();
    GameState.frustumMat4.multiplyMatrices(
      GameState.currentCamera.projectionMatrix,
      GameState.currentCamera.matrixWorldInverse
    );
    GameState.viewportFrustum.setFromProjectionMatrix(GameState.frustumMat4);
    GameState.currentCameraPosition.set(0, 0, 0);
    GameState.currentCameraPosition.applyMatrix4(GameState.currentCamera.matrixWorld);
  }

  static updateShadowSystems(_delta: number, focus?: THREE.Vector3): void {
    if(!GameState.areShadowsEnabled()){ return; }
    GameState.odysseyShadowManager?.update(
      GameState.currentCamera ?? undefined,
      focus ?? GameState.lightManager?.focusPosition,
      _delta
    );
    GameState.shadowSystemsUpdatedThisFrame = true;
  }

  static UpdateIngame(delta: number = 0): void {
    if(GameState.module?.readyToProcessEvents && GameState.module.area){
      GameState.module.area.updateRoomVisibility(0);
    }

    GameState.ModuleObjectManager.TickSelectableObjects(delta);

    GameState.CutsceneManager.tickPendingPartyDialogSwitch();

    GameState.currentCamera = GameState.camera;
    GameState.VideoEffectManager.SetVideoEffect(-1);
    if(GameState.PartyManager.getCurrentPlayer()){
      GameState.forwardVector.copy(GameState.PartyManager.getCurrentPlayer().forceVector).multiplyScalar(100);
      GameState.forwardVector.z = -1;
    }

    GameState.GameOverManager.UpdateDeathSequence(delta);
    const MAX_SIM_DELTA = 0.1;
    const simDelta = Math.min(
      delta * (GameState.timeScale > 0 ? GameState.timeScale : 1),
      MAX_SIM_DELTA
    );

    if(GameState.State != EngineState.PAUSED){
      GameLoop.updateTime(simDelta);
    }

    if(
      GameState.State == EngineState.PAUSED || GameState.MenuManager.activeModals.length
    ){
      GameState.module.tickPaused(simDelta);
    }else{
      GameState.module.tick(simDelta);

      if(GameState.MenuManager.InGameBark?.bVisible){
        GameState.MenuManager.InGameBark.update(delta);
      }
    }

    GameState.GameOverManager.TempDeathUpdate(delta);

    if(GameState.State != EngineState.PAUSED && !GameState.isLoadingSave){
      ModuleSaveTable.updateAutoSaveTimer(delta);
    }

    GameLoop.updateViewportFrustum();
    GameState.lightManager.update(delta, GameState.PartyManager.getCurrentPlayer());
    GameLoop.updateShadowSystems(delta, GameState.PartyManager.getCurrentPlayer()?.position ?? GameState.currentCameraPosition);
    GameState.windManager.update(delta);
    GameState.grassManager?.update(delta);
    GameState.module.area.updateRoomAnimatedLights(delta);
    GameState.module.area.updateRoomWindUniforms();
    GameState.CameraShakeManager.update(delta, GameState.currentCamera);

    AutoPauseManager.syncPauseOverlay({ requireInGameOverlay: true });
  }

  static UpdateDialog(delta: number = 0): void {
    if(GameState.State != EngineState.PAUSED){
      GameLoop.updateTime(delta);
    }
    const isEntryMode = GameState.MenuManager.InGameDialog.isVisible() && !GameState.MenuManager.InGameDialog.LB_REPLIES.isVisible() && GameState.scene_cursor_holder.visible;
    if(isEntryMode){
      GameState.scene_cursor_holder.visible = false;
    }
    GameState.CutsceneManager.update(delta);
    if(GameState.State == EngineState.PAUSED || GameState.MenuManager.activeModals.length){
      GameState.module.tickPaused(delta);
    }else{
      GameState.module.tick(delta);
    }
    if(GameState.MenuManager.InGameBark?.bVisible){
      GameState.MenuManager.InGameBark.update(delta);
    }
    GameLoop.updateViewportFrustum();
    GameState.lightManager.update(delta, GameState.currentCamera);
    GameLoop.updateShadowSystems(delta, GameState.currentCamera?.position ?? GameState.currentCameraPosition);
    GameState.windManager.update(delta);
    GameState.grassManager?.update(delta);
    GameState.module.area.updateRoomAnimatedLights(delta);
    GameState.module.area.updateRoomWindUniforms();
    GameState.CameraShakeManager.update(delta, GameState.currentCamera);

    AutoPauseManager.syncPauseOverlay({ requireInGameOverlay: true });
  }

  static UpdateMinigame(delta: number = 0): void {
    if(GameState.State != EngineState.PAUSED){
      GameLoop.updateTime(delta);
    }

    if(GameState.module){
      if(GameState.State == EngineState.PAUSED || GameState.MenuManager.activeModals.length){
        GameState.module.tickPaused(delta);
      }else{
        GameState.module.tick(delta);
      }
    }

    GameLoop.updateViewportFrustum();
    GameState.lightManager.update(delta, GameState.PartyManager.getCurrentPlayer());
    GameLoop.updateShadowSystems(delta, GameState.PartyManager.getCurrentPlayer()?.position ?? GameState.currentCameraPosition);
    GameState.windManager.update(delta);
    GameState.grassManager?.update(delta);
    GameState.module.area.updateRoomAnimatedLights(delta);
    GameState.module.area.updateRoomWindUniforms();
    GameState.CameraShakeManager.update(delta, GameState.currentCamera);

    AutoPauseManager.syncPauseOverlay({ requireInGameOverlay: false });
  }

  static UpdateFreeLook(delta: number = 0): void {
    GameState.VideoEffectManager.SetVideoEffect(-1);
    const player = GameState.PartyManager.getCurrentPlayer();
    if(player){
      const appearance = player.getAppearance();
      if(appearance){
        const effectId = appearance.freelookeffect;
        if(!isNaN(effectId) && effectId >= 0){
          GameState.VideoEffectManager.SetVideoEffect(effectId);
        }
      }
    }

    GameState.currentCamera = GameState.camera;
    GameState.scene_cursor_holder.visible = false;

    if(GameState.State != EngineState.PAUSED){
      GameLoop.updateTime(delta);
    }

    if(GameState.module){
      if(GameState.State == EngineState.PAUSED || GameState.MenuManager.activeModals.length){
        GameState.module.tickPaused(delta);
      }else{
        GameState.module.tick(delta);
      }
    }

    GameLoop.updateViewportFrustum();
    GameState.lightManager.update(delta, GameState.PartyManager.getCurrentPlayer());
    GameLoop.updateShadowSystems(delta, GameState.PartyManager.getCurrentPlayer()?.position ?? GameState.currentCameraPosition);
    GameState.windManager.update(delta);
    GameState.grassManager?.update(delta);
    if(GameState.module?.area){
      GameState.module.area.updateRoomAnimatedLights(delta);
      GameState.module.area.updateRoomWindUniforms();
    }
    GameState.CameraShakeManager.update(delta, GameState.currentCamera);
  }

  static UpdateLegal(delta: number = 0): void {
    GameState.LegalScreenManager.Update(delta);
    GameState.renderer.render(GameState.LegalScreenManager.scene, GameState.camera_gui);
    GameState.stats.end();
    GameStateEvents.processEventListener('afterRender', [delta]);
  }
}
