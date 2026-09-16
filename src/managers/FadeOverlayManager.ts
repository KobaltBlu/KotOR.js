import * as THREE from "three";
import { GameState } from "@/GameState";
import { FadeOverlayState } from "@/enums/engine/FadeOverlayState";

/**
 * FadeOverlayManager — / StartGlobalFade.
 *
 * Timing mirrors SetFade and Draw:
 * wait then linear alpha; hitch clamp 5s; elapsed seed 0.1.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file FadeOverlayManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class FadeOverlayManager {

  static geometry = new THREE.PlaneGeometry( 1, 1, 1 );
  static material = new THREE.MeshBasicMaterial( {color: 0x000000, side: THREE.FrontSide, transparent: true, opacity: 0} );
  static plane = new THREE.Mesh( FadeOverlayManager.geometry, FadeOverlayManager.material );

  /** Fade length (seconds) — SetFade. */
  static duration = 0;
  /** Total elapsed since SetFade (seconds), includes wait —. */
  static elapsed = 0;
  /** Pre-fade wait (seconds) —. */
  static wait = 0;
  static state: FadeOverlayState = FadeOverlayState.NONE;

  /**
   * K2 SetFadeUntilScript (GUI): StartGlobalFade / StopGlobalFade
   * no-op until SetGlobalFadeIn clears this and starts a fade-in.
   */
  static holdForScript: boolean = false;

  /** renderOrder so video player (9999991+) can always draw on top of the fade */
  static readonly FADE_RENDER_ORDER = 9999990;

  /**
   * post-LevelLoad world fade-in (MainLoop → StartGlobalFade
   * direction=1, wait=0.5, length=1.0).
   */
  static readonly WORLD_FADE_IN_WAIT = 0.5;
  static readonly WORLD_FADE_IN_LENGTH = 1.0;

  /**
   * HoldWorldFadeInForDialog release (HandleDialogEntry / SetGlobalDialogState(0)):
   * StartGlobalFade(1, wait=0, length=1.0, black).
   */
  static readonly HOLD_WORLD_FADE_IN_LENGTH = 1.0;
  static readonly HOLD_WORLD_FADE_IN_WAIT = 0;

  /** RunDeathSequence StartGlobalFade(0, wait=12, length=1). */
  static readonly DEATH_FADE_WAIT = 12.0;
  static readonly DEATH_FADE_LENGTH = 1.0;

  /** HurryDeathSequence StartGlobalFade(0, wait=0, length=0.5). */
  static readonly DEATH_HURRY_FADE_LENGTH = 0.5;

  /** Door/trigger area transition StartGlobalFade(0, wait=0, length=0.5). */
  static readonly AREA_TRANSITION_FADE_LENGTH = 0.5;

  /**
   * Party-leader→PC swap before StartDialog (K1 / K2):
   * StartGlobalFade(0, wait=0, length=0.75).
   * Fade-in uses holdWorldFadeInForDialog → HOLD_WORLD_FADE_IN_* on first entry.
   */
  static readonly PARTY_DIALOG_SWITCH_FADE_OUT_LENGTH = 0.75;

  /** SetFade seeds elapsed to 0.1 (0x3dcccccd). */
  static readonly ELAPSED_SEED = 0.1;

  /** Draw hitch clamp: only advance when frame dt < 5s. */
  static readonly HITCH_CLAMP_SEC = 5.0;

  /** IsGlobalFadeObscuring threshold (alpha > 0.001). */
  static readonly OBSCURING_ALPHA = 0.001;

  static Initialize(){
    FadeOverlayManager.plane.position.z = 499;
    FadeOverlayManager.plane.renderOrder = FadeOverlayManager.FADE_RENDER_ORDER;
    FadeOverlayManager.material.visible = false;
    GameState.scene_gui.add( FadeOverlayManager.plane );
  }

  /**
   * Clear fade state and hide the overlay (StopGlobalFade / unload).
   * Also clears holdForScript.
   */
  static Reset(){
    FadeOverlayManager.holdForScript = false;
    FadeOverlayManager.duration = 0;
    FadeOverlayManager.elapsed = 0;
    FadeOverlayManager.wait = 0;
    FadeOverlayManager.state = FadeOverlayState.NONE;
    FadeOverlayManager.material.opacity = 0;
    FadeOverlayManager.material.visible = false;
  }

  /** Hide overlay without clearing holdForScript (death UI drain). */
  static Stop(){
    FadeOverlayManager.duration = 0;
    FadeOverlayManager.elapsed = 0;
    FadeOverlayManager.wait = 0;
    FadeOverlayManager.state = FadeOverlayState.NONE;
    FadeOverlayManager.material.opacity = 0;
    FadeOverlayManager.material.visible = false;
  }

  static isFading(): boolean {
    return FadeOverlayManager.state === FadeOverlayState.FADING_IN ||
           FadeOverlayManager.state === FadeOverlayState.FADING_OUT;
  }

  /** IsGlobalFadeObscuring — panel alpha > 0.001. */
  static isObscuring(): boolean {
    return FadeOverlayManager.material.visible &&
           FadeOverlayManager.material.opacity > FadeOverlayManager.OBSCURING_ALPHA;
  }

  /** IsFadeDone: inactive (elapsed==0 / terminal state) or elapsed > wait + length. */
  static isFadeDone(): boolean {
    if(FadeOverlayManager.state === FadeOverlayState.NONE ||
       FadeOverlayManager.state === FadeOverlayState.FADED_IN ||
       FadeOverlayManager.state === FadeOverlayState.FADED_OUT){
      return true;
    }
    return FadeOverlayManager.elapsed > FadeOverlayManager.wait + FadeOverlayManager.duration;
  }

  /**
   * Fade out (StartGlobalFade dir=0). No-op while holdForScript is set.
   * Instant length 0 → snap to opaque (FADED_OUT).
   */
  static FadeOut(duration = 0, r = 0, g = 0, b = 0, nWait = 0){
    if(FadeOverlayManager.holdForScript){
      return;
    }
    FadeOverlayManager.beginFade(FadeOverlayState.FADING_OUT, duration, r, g, b, nWait);
  }

  /**
   * Fade in (StartGlobalFade dir=1). No-op while holdForScript is set.
   * Callers that must lift the hold (SetGlobalFadeIn) clear holdForScript first.
   * Instant length 0 → snap to clear (FADED_IN).
   */
  static FadeIn(duration = 0, r = 0, g = 0, b = 0, nWait = 0){
    if(FadeOverlayManager.holdForScript){
      return;
    }
    FadeOverlayManager.beginFade(FadeOverlayState.FADING_IN, duration, r, g, b, nWait);
  }

  static FadeInFromCutscene(){
    if(FadeOverlayManager.holdForScript){
      return;
    }
    if(FadeOverlayManager.state == FadeOverlayState.FADED_OUT || FadeOverlayManager.state == FadeOverlayState.FADING_OUT){
      FadeOverlayManager.FadeIn(
        FadeOverlayManager.HOLD_WORLD_FADE_IN_LENGTH,
        0, 0, 0,
        FadeOverlayManager.HOLD_WORLD_FADE_IN_WAIT
      );
    }
  }

  private static beginFade(
    state: FadeOverlayState.FADING_IN | FadeOverlayState.FADING_OUT,
    duration: number,
    r: number,
    g: number,
    b: number,
    nWait: number
  ){
    const length = Math.max(0, duration);
    const wait = Math.max(0, nWait);
    FadeOverlayManager.material.visible = true;
    FadeOverlayManager.material.color.setRGB(r, g, b);
    FadeOverlayManager.duration = length;
    FadeOverlayManager.wait = wait;
    FadeOverlayManager.elapsed = FadeOverlayManager.ELAPSED_SEED;
    FadeOverlayManager.state = state;

    // SetFade: out starts α=0, in starts α=1.
    // Length 0: instant cut to final alpha (out→1, in→0) then terminal state.
    if(length === 0 && wait === 0){
      if(state === FadeOverlayState.FADING_OUT){
        FadeOverlayManager.material.opacity = 1;
        FadeOverlayManager.state = FadeOverlayState.FADED_OUT;
      }else{
        FadeOverlayManager.material.opacity = 0;
        FadeOverlayManager.material.visible = false;
        FadeOverlayManager.state = FadeOverlayState.FADED_IN;
      }
      return;
    }

    FadeOverlayManager.material.opacity = state === FadeOverlayState.FADING_OUT ? 0 : 1;
  }

  /**
   * Draw — wait then linear ramp; hitch clamp 5s.
   */
  static Update(delta = 0){
    if(FadeOverlayManager.state === FadeOverlayState.NONE ||
       FadeOverlayManager.state === FadeOverlayState.FADED_IN ||
       FadeOverlayManager.state === FadeOverlayState.FADED_OUT){
      return;
    }

    const dt = Math.max(0, delta);
    if(dt < FadeOverlayManager.HITCH_CLAMP_SEC){
      FadeOverlayManager.elapsed += dt;
    }

    const wait = FadeOverlayManager.wait;
    const length = FadeOverlayManager.duration;
    const elapsed = FadeOverlayManager.elapsed;

    // Hold start alpha during wait
    if(elapsed <= wait){
      FadeOverlayManager.material.opacity =
        FadeOverlayManager.state === FadeOverlayState.FADING_OUT ? 0 : 1;
      FadeOverlayManager.material.visible = true;
      return;
    }

    const t = length > 0 ? Math.min((elapsed - wait) / length, 1) : 1;
    let targetOpacity: number;
    switch(FadeOverlayManager.state){
      case FadeOverlayState.FADING_IN:
        targetOpacity = 1 - t;
        break;
      case FadeOverlayState.FADING_OUT:
        targetOpacity = t;
        break;
      default:
        return;
    }

    FadeOverlayManager.material.opacity = Math.max(0, Math.min(1, targetOpacity));
    FadeOverlayManager.material.visible = true;

    if(elapsed > wait + length){
      switch(FadeOverlayManager.state){
        case FadeOverlayState.FADING_IN:
          FadeOverlayManager.material.visible = false;
          FadeOverlayManager.material.opacity = 0;
          FadeOverlayManager.state = FadeOverlayState.FADED_IN;
          break;
        case FadeOverlayState.FADING_OUT:
          FadeOverlayManager.material.opacity = 1;
          FadeOverlayManager.state = FadeOverlayState.FADED_OUT;
          break;
      }
    }
  }

}
