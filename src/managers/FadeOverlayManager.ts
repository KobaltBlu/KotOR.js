import * as THREE from "three";
import { GameState } from "../GameState";
import { FadeOverlayState } from "../enums/engine/FadeOverlayState";

export class FadeOverlayManager {

  static geometry = new THREE.PlaneGeometry( 1, 1, 1 );
  static material = new THREE.MeshBasicMaterial( {color: 0x000000, side: THREE.DoubleSide, transparent: true, opacity: 0} );
  static plane = new THREE.Mesh( FadeOverlayManager.geometry, FadeOverlayManager.material );
  static fading = false;
  static duration = 0;
  static elapsed = 0;
  static state: FadeOverlayState = FadeOverlayState.NONE;

  static holdForScript: boolean;
  /* Fade Geometry */

  static Initialize(){
    FadeOverlayManager.plane.position.z = 499;
    FadeOverlayManager.plane.renderOrder = Infinity;
    FadeOverlayManager.material.visible = false;
    GameState.scene_gui.add( FadeOverlayManager.plane );
  }

  static FadeOut(duration = 0, r = 0, g = 0, b = 0){
    //FadeOverlayManager.material.opacity = 0;
    FadeOverlayManager.material.visible = true;
    FadeOverlayManager.material.color.setRGB(r,g,b);
    FadeOverlayManager.duration = duration*2;
    FadeOverlayManager.elapsed = 0;
    FadeOverlayManager.state = FadeOverlayState.FADING_OUT;
  }

  static FadeIn(duration = 0, r = 0, g = 0, b = 0){
    //FadeOverlayManager.material.opacity = 1;
    FadeOverlayManager.material.visible = true;
    FadeOverlayManager.material.color.setRGB(r,g,b);
    FadeOverlayManager.duration = duration*2;
    FadeOverlayManager.elapsed = 0;
    FadeOverlayManager.state = FadeOverlayState.FADING_IN;
  }

  static FadeInFromCutscene(){
    if(FadeOverlayManager.state == FadeOverlayState.FADED_OUT || FadeOverlayManager.state == FadeOverlayState.FADING_OUT){
      FadeOverlayManager.FadeIn(1, 0, 0, 0);
    }
  }

  static Update(delta = 0){

    if(FadeOverlayManager.state == FadeOverlayState.NONE || FadeOverlayManager.state == FadeOverlayState.FADED_IN || FadeOverlayManager.state == FadeOverlayState.FADED_OUT){
      return;
    }

    FadeOverlayManager.elapsed += 1*delta;

    if(FadeOverlayManager.elapsed > FadeOverlayManager.duration){
      FadeOverlayManager.elapsed = FadeOverlayManager.duration;
    }

    switch(FadeOverlayManager.state){
      case FadeOverlayState.FADING_IN:
        if(FadeOverlayManager.elapsed >= FadeOverlayManager.duration){
          FadeOverlayManager.material.visible = false;
        }else{
          FadeOverlayManager.material.opacity += ( 0 - FadeOverlayManager.material.opacity ) * (FadeOverlayManager.elapsed / FadeOverlayManager.duration);
          if(isNaN(FadeOverlayManager.material.opacity)){
            FadeOverlayManager.material.opacity = 0;
          }
        }

        if(FadeOverlayManager.elapsed >= FadeOverlayManager.duration){
          FadeOverlayManager.state = FadeOverlayState.FADED_IN;
        }
      break;
      case FadeOverlayState.FADING_OUT:
        FadeOverlayManager.material.opacity += ( 1 - FadeOverlayManager.material.opacity ) * (FadeOverlayManager.elapsed / FadeOverlayManager.duration);
        if(isNaN(FadeOverlayManager.material.opacity)){
          FadeOverlayManager.material.opacity = 1;
        }

        if(FadeOverlayManager.elapsed >= FadeOverlayManager.duration){
          FadeOverlayManager.state = FadeOverlayState.FADED_OUT;
        }
      break;
    }

  }

}
