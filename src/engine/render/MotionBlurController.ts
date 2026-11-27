import { GameState } from "@engine/runtime/GameState";
import type { Creature } from "@engine/module/Creature";
import type { AccumulationBlurPass } from "@engine/render/shaders/pass/AccumulationBlurPass";

/**
 * SWMG_SetSpeedBlurEffect / Force Speed ApplyMotionBlur —
 * AccumulationBlurPass ratio + enable/disable and Force Speed VFX refcount.
 */
export class MotionBlurController {
  static speedBlurEnabled: boolean = false;
  static speedBlurRatio: number = 0.75;
  /** Force Speed progFX 0x641/0x642 refcount. */
  static motionBlurVFXCount: number = 0;
  /** Set by OdysseyRenderPipeline.initComposer. */
  static boundSpeedBlurPass?: AccumulationBlurPass;

  /**
   * SWMG_SetSpeedBlurEffect —
   * AurSetSpeedBlurRatio (default 0.75) + AurEnable/DisableSpeedBlur.
   * Accumulation via AccumulationBlurPass (RenderAccumulationBlur + 128^2 RenderFrameToTexture).
   */
  static SetSpeedBlurEffect(enabled: boolean, ratio: number = 0.75){
    const wasEnabled = MotionBlurController.speedBlurEnabled;
    MotionBlurController.speedBlurEnabled = !!enabled;
    if(typeof ratio === 'number' && Number.isFinite(ratio)){
      MotionBlurController.speedBlurRatio = ratio;
    }
    const pass = MotionBlurController.boundSpeedBlurPass;
    if(pass){
      pass.ratio = MotionBlurController.speedBlurRatio;
      if(!MotionBlurController.speedBlurEnabled && wasEnabled){
        pass.resetAccumulation();
      }
    }
  }

  /**
   * ApplyMotionBlur — progFX 0x641/0x642 on the player (not during MG).
   */
  static applyMotionBlurVFX(target: Creature | undefined, progFX: number){
    if(progFX !== 0x641 && progFX !== 0x642){
      return;
    }
    MotionBlurController.motionBlurVFXCount++;
    const player = GameState.PartyManager?.Player || GameState.PartyManager.getCurrentPlayer();
    const isPlayerTarget = !player || !!(target && player === target);
    const inMiniGame = !!GameState.module?.area?.miniGame;
    if(isPlayerTarget && MotionBlurController.motionBlurVFXCount === 1 && !inMiniGame){
      MotionBlurController.SetSpeedBlurEffect(true, 0.75);
    }
  }

  /**
   * RemoveMotionBlur — disable when refcount hits zero (outside MG).
   */
  static removeMotionBlurVFX(){
    MotionBlurController.motionBlurVFXCount--;
    if(MotionBlurController.motionBlurVFXCount < 0){
      MotionBlurController.motionBlurVFXCount = 0;
      return;
    }
    if(MotionBlurController.motionBlurVFXCount !== 0){
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
    if(MotionBlurController.motionBlurVFXCount <= 0 || !MotionBlurController.speedBlurEnabled){
      return;
    }
    // SWMG_SetSpeedBlurEffect owns ratio during minigames.
    if(GameState.module?.area?.miniGame){
      return;
    }
    const creature =
      GameState.PartyManager?.Player || GameState.PartyManager.getCurrentPlayer();
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
    MotionBlurController.speedBlurRatio = t * 0.75;
    if(MotionBlurController.boundSpeedBlurPass){
      MotionBlurController.boundSpeedBlurPass.ratio = MotionBlurController.speedBlurRatio;
    }
  }

  /** Clear Force Speed / MG blur state when unloading a module. */
  static resetForUnload(){
    MotionBlurController.motionBlurVFXCount = 0;
    MotionBlurController.SetSpeedBlurEffect(false);
    if(MotionBlurController.boundSpeedBlurPass){
      MotionBlurController.boundSpeedBlurPass.enabled = false;
    }
  }

  /** Leaving minigame: clear blur unless Force Speed VFX still holds it. */
  static onLeaveMinigame(){
    if(MotionBlurController.motionBlurVFXCount <= 0){
      MotionBlurController.SetSpeedBlurEffect(false);
    }
  }
}
