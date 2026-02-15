import * as THREE from "three";
import { GameState } from "../GameState";
import { FadeOverlayState } from "../enums/engine/FadeOverlayState";

/**
 * FadeOverlayManager class.
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
  static fading = false;
  static duration = 0;
  static elapsed = 0;
  static wait = 0;
  static state: FadeOverlayState = FadeOverlayState.NONE;

  static holdForScript: boolean;
  /* Fade Geometry */

  /** renderOrder so video player (9999991+) can always draw on top of the fade */
  static readonly FADE_RENDER_ORDER = 9999990;

  static Initialize(){
    FadeOverlayManager.plane.position.z = 499;
    FadeOverlayManager.plane.renderOrder = FadeOverlayManager.FADE_RENDER_ORDER;
    FadeOverlayManager.material.visible = false;
    GameState.scene_gui.add( FadeOverlayManager.plane );
  }

  static FadeOut(duration = 0, r = 0, g = 0, b = 0, nWait = 0){
    FadeOverlayManager.material.visible = true;
    FadeOverlayManager.material.color.setRGB(r, g, b);
    FadeOverlayManager.duration = duration;
    FadeOverlayManager.elapsed = 0;
    FadeOverlayManager.state = FadeOverlayState.FADING_OUT;
    FadeOverlayManager.wait = nWait;
    // Start from 0 opacity for fade out
    FadeOverlayManager.material.opacity = duration === 0 ? 1 : 0;
  }

  static FadeIn(duration = 0, r = 0, g = 0, b = 0, nWait = 0){
    FadeOverlayManager.material.visible = true;
    FadeOverlayManager.material.color.setRGB(r, g, b);
    FadeOverlayManager.duration = duration;
    FadeOverlayManager.elapsed = 0;
    FadeOverlayManager.state = FadeOverlayState.FADING_IN;
    FadeOverlayManager.wait = nWait;
    // Start from 1 opacity for fade in
    FadeOverlayManager.material.opacity = duration === 0 ? 0 : 1;
  }

  static FadeInFromCutscene(){
    if(FadeOverlayManager.state == FadeOverlayState.FADED_OUT || FadeOverlayManager.state == FadeOverlayState.FADING_OUT){
      FadeOverlayManager.FadeIn(1, 0, 0, 0);
    }
  }

  static Update(delta = 0){
    // Early return for inactive states
    if(FadeOverlayManager.state === FadeOverlayState.NONE || 
       FadeOverlayManager.state === FadeOverlayState.FADED_IN || 
       FadeOverlayManager.state === FadeOverlayState.FADED_OUT){
      return;
    }

    // Handle wait period
    if(FadeOverlayManager.wait > 0){
      FadeOverlayManager.wait -= delta;
      return;
    }

    // Update elapsed time
    FadeOverlayManager.elapsed += delta;
    
    // Clamp elapsed time to duration
    const isComplete = FadeOverlayManager.elapsed >= FadeOverlayManager.duration;
    if(isComplete){
      FadeOverlayManager.elapsed = FadeOverlayManager.duration;
    }

    // Calculate progress (0 to 1)
    const progress = FadeOverlayManager.duration > 0 ? 
      Math.min(FadeOverlayManager.elapsed / FadeOverlayManager.duration, 1) : 1;

    // Apply easing function for smoother transitions
    const easedProgress = FadeOverlayManager.easeInOutQuad(progress);

    // Calculate target opacity based on state
    let targetOpacity: number;
    switch(FadeOverlayManager.state){
      case FadeOverlayState.FADING_IN:
        targetOpacity = 1 - easedProgress; // Fade from 1 to 0
        break;
      case FadeOverlayState.FADING_OUT:
        targetOpacity = easedProgress; // Fade from 0 to 1
        break;
      default:
        return;
    }

    // Update material opacity
    FadeOverlayManager.material.opacity = Math.max(0, Math.min(1, targetOpacity));
    FadeOverlayManager.material.visible = true;

    // Handle completion
    if(isComplete){
      switch(FadeOverlayManager.state){
        case FadeOverlayState.FADING_IN:
          FadeOverlayManager.material.visible = false;
          FadeOverlayManager.state = FadeOverlayState.FADED_IN;
          break;
        case FadeOverlayState.FADING_OUT:
          FadeOverlayManager.state = FadeOverlayState.FADED_OUT;
          break;
      }
    }
  }

  /**
   * Easing function for smooth transitions
   * @param t Progress value (0 to 1)
   * @returns Eased progress value
   */
  private static easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

}
