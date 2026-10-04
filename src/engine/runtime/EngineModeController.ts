import { GameState } from "@engine/runtime/GameState";
import { AudioEngine } from "@engine/audio";
import { AudioEngineChannel } from "@core/enums/audio/AudioEngineChannel";
import { EngineMode } from "@engine/enums/engine";
import { FollowerCamera } from "@engine/render/FollowerCamera";
import { MotionBlurController } from "@engine/render/MotionBlurController";

/**
 * Engine mode transitions (INGAME, GUI, LOADING, minigame, dialog, freelook).
 * GameState keeps thin static wrappers for the public API.
 */
export class EngineModeController {
  static RestoreEnginePlayMode(): void {
    if(GameState.module){
      if(GameState.module.area.miniGame){
        console.log('RestoreEnginePlayMode: MINIGAME');
        EngineModeController.SetEngineMode(EngineMode.MINIGAME)
      }else{
        console.log('RestoreEnginePlayMode: INGAME');
        EngineModeController.SetEngineMode(EngineMode.INGAME);
      }
    }else{
      console.log('RestoreEnginePlayMode: GUI');
      EngineModeController.SetEngineMode(EngineMode.GUI);
    }
  }

  static SetEngineMode(mode: EngineMode){
    if(GameState.Mode == mode){
      return;
    }
    const prev = GameState.Mode;
    console.log('SetEngineMode: ', mode);
    GameState.Mode = mode;

    // Force dialog PVS recompute on enter (camera room may differ from player).
    if(mode == EngineMode.DIALOG && prev != EngineMode.DIALOG){
      if(GameState.module?.area){
        GameState.module.area.lastRoom = undefined;
      }
    }

    // Freelook camera enter/exit
    if(mode == EngineMode.FREELOOK && prev != EngineMode.FREELOOK){
      FollowerCamera.beginFreeLook();
    }else if(prev == EngineMode.FREELOOK && mode != EngineMode.FREELOOK){
      FollowerCamera.endFreeLook();
    }

    if(mode == EngineMode.LOADING){
      if(GameState.MenuManager.LoadScreen){
        GameState.MenuManager.LoadScreen.setProgress(0);
        GameState.MenuManager.LoadScreen.open();
      }
    }

    if(mode != EngineMode.INGAME){
      if(GameState.MenuManager.InGameBark)
        GameState.MenuManager.InGameBark.close();
  
      if(GameState.MenuManager.InGameAreaTransition)
        GameState.MenuManager.InGameAreaTransition.hideAreaTransition();
    }

    // Minigame: keep party InGameOverlay off the menu stack so GUI pop
    // (options etc.) cannot reshow the HUD via Remove → show.
    if(mode == EngineMode.MINIGAME){
      const overlay = GameState.MenuManager.InGameOverlay;
      if(overlay && (overlay.isVisible() || GameState.MenuManager.activeMenus.indexOf(overlay) >= 0)){
        overlay.close();
      }
    }else{
      if(prev == EngineMode.MINIGAME){
        FollowerCamera.detachMinigameCamera();
        // MG scripts may leave SWMG_SetSpeedBlurEffect on; Force Speed VFX keeps it.
        MotionBlurController.onLeaveMinigame();
      }
      if(mode == EngineMode.INGAME && GameState.module && !GameState.module.area?.miniGame){
        const overlay = GameState.MenuManager.InGameOverlay;
        if(overlay && GameState.MenuManager.activeMenus.indexOf(overlay) < 0){
          overlay.recalculatePosition();
          overlay.open();
        }
      }
    }

    if(!(mode == EngineMode.INGAME || mode == EngineMode.DIALOG || mode == EngineMode.FREELOOK || mode == EngineMode.MINIGAME)){
      AudioEngine.Mute(AudioEngineChannel.SFX);
    }

    if(mode == EngineMode.INGAME || mode == EngineMode.DIALOG || mode == EngineMode.FREELOOK || mode == EngineMode.MINIGAME){
      AudioEngine.Unmute(AudioEngineChannel.SFX);
    }

    if(mode == EngineMode.GUI && GameState.FadeOverlayManager.material.visible){
      GameState.FadeOverlayManager.material.visible = false;
    }
  }
}
