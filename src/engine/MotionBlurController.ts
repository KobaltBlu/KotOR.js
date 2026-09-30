import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";

/**
 * SWMG_SetSpeedBlurEffect / Force Speed ApplyMotionBlur —
 * AccumulationBlurPass ratio + enable/disable and Force Speed VFX refcount.
 */
export class MotionBlurController {
  /**
   * SWMG_SetSpeedBlurEffect —
   * AurSetSpeedBlurRatio (default 0.75) + AurEnable/DisableSpeedBlur.
   * Accumulation via AccumulationBlurPass (RenderAccumulationBlur + 128^2 RenderFrameToTexture).
   */
  static SetSpeedBlurEffect(enabled: boolean, ratio: number = 0.75){
    const wasEnabled = GameState.speedBlurEnabled;
    GameState.speedBlurEnabled = !!enabled;
    if(typeof ratio === 'number' && Number.isFinite(ratio)){
      GameState.speedBlurRatio = ratio;
    }
    if(GameState.speedBlurPass){
      GameState.speedBlurPass.ratio = GameState.speedBlurRatio;
      if(!GameState.speedBlurEnabled && wasEnabled){
        GameState.speedBlurPass.resetAccumulation();
      }
    }
  }

  /**
   * ApplyMotionBlur — progFX 0x641/0x642 on the player (not during MG).
   */
  static applyMotionBlurVFX(target: ModuleCreature | undefined, progFX: number){
    if(progFX !== 0x641 && progFX !== 0x642){
      return;
    }
    GameState.motionBlurVFXCount++;
    const player = GameState.PartyManager?.Player || GameState.getCurrentPlayer();
    const isPlayerTarget = !player || !!(target && player === target);
    const inMiniGame = !!GameState.module?.area?.miniGame;
    if(isPlayerTarget && GameState.motionBlurVFXCount === 1 && !inMiniGame){
      MotionBlurController.SetSpeedBlurEffect(true, 0.75);
    }
  }

  /**
   * RemoveMotionBlur — disable when refcount hits zero (outside MG).
   */
  static removeMotionBlurVFX(){
    GameState.motionBlurVFXCount--;
    if(GameState.motionBlurVFXCount < 0){
      GameState.motionBlurVFXCount = 0;
      return;
    }
    if(GameState.motionBlurVFXCount !== 0){
      return;
    }
    if(!GameState.module?.area?.miniGame){
      MotionBlurController.SetSpeedBlurEffect(false);
    }
  }

  /**
   * UpdateMotionBlur — ratio = clamp(speed/driveMax, 1) * 0.75.
   *
   * Must run AFTER locomotion this frame. WASD calls cancelLocomotionActions
   * (zeros speed) in controls.Update before creature.update; pathfinding
   * creature loco sets speed before area.update. Syncing here (Render) sees the
   * post-movement speed for both.
   *
   * Prefers playerControl.lastAnimMoveSpeed when live,
   * else creature.speed (creature walk update).
   */
  static syncMotionBlurRatio(){
    if(GameState.motionBlurVFXCount <= 0 || !GameState.speedBlurEnabled){
      return;
    }
    // SWMG_SetSpeedBlurEffect owns ratio during minigames.
    if(GameState.module?.area?.miniGame){
      return;
    }
    const creature =
      GameState.PartyManager?.Player || GameState.getCurrentPlayer();
    if(!creature){
      return;
    }
    const driveMax = creature.getAppearance()?.drivemaxspeed || 0;
    if(!(driveMax > 0)){
      return;
    }
    const anim = creature.playerControl?.lastAnimMoveSpeed ?? 0;
    const raw = typeof creature.speed === 'number' ? creature.speed : 0;
    // Pathfinding never writes lastAnimMoveSpeed; WASD does.
    const speed = anim > 0 ? anim : raw;
    let t = speed / driveMax;
    if(t > 1) t = 1;
    if(t < 0) t = 0;
    GameState.speedBlurRatio = t * 0.75;
    if(GameState.speedBlurPass){
      GameState.speedBlurPass.ratio = GameState.speedBlurRatio;
    }
  }

  /** Clear Force Speed / MG blur state when unloading a module. */
  static resetForUnload(){
    GameState.motionBlurVFXCount = 0;
    MotionBlurController.SetSpeedBlurEffect(false);
    if(GameState.speedBlurPass){
      GameState.speedBlurPass.enabled = false;
    }
  }

  /** Leaving minigame: clear blur unless Force Speed VFX still holds it. */
  static onLeaveMinigame(){
    if(GameState.motionBlurVFXCount <= 0){
      MotionBlurController.SetSpeedBlurEffect(false);
    }
  }
}
