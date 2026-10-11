import * as THREE from "three";
import type { OdysseyModelAnimation } from "@engine/odyssey/OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "@engine/odyssey/OdysseyModelAnimationManager";
import { OdysseyController } from "@engine/odyssey/controllers/OdysseyController";
import { IOdysseyControllerGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerFrameGeneric";

/**
 * OrientationController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OrientationController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OrientationController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.Orientation;

  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    //Cache the orientation controller
    if(manager.modelNode.controllerHelpers.hasOrientation === undefined){
      let _controller = manager.modelNode.controllers.get(OdysseyModelControllerType.Orientation);
      if(typeof _controller != 'undefined'){
        manager.modelNode.controllerHelpers.hasOrientation = true;
        manager.modelNode.controllerHelpers.orientation = _controller;
      }else{
        manager.modelNode.controllerHelpers.hasOrientation = false;
        manager.modelNode.controllerHelpers.orientation = undefined;
      }
    }

    if(manager.modelNode.controllerHelpers.hasOrientation){

      // if(manager.trans && this.frameCount > 1){
      // manager.modelNode.transitionState.quaternion.copy(manager.modelNode.quaternion);
      // anim._quaternion.copy(manager.modelNode.transitionState.quaternion);
      // }else{
        anim._quaternion.copy(manager.modelNode.controllerHelpers.orientation.data[0] as any);
      // }

    }
    // Preserve identity-key → bind-pose behavior without mutating shared keyframe data.
    let x = data.x, y = data.y, z = data.z, w = data.w;
    if(x == 0 && y == 0 && z == 0 && w == 1){
      x = anim._quaternion.x;
      y = anim._quaternion.y;
      z = anim._quaternion.z;
      w = anim._quaternion.w;
    }

    manager.modelNode.quaternion.set(x, y, z, w);

    manager.markNodeTransformDirty();
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.emitter){

      // if(manager.trans && manager.lastFrame == 0){
      // manager.modelNode.position.copy(manager.modelNode.transitionState.position);
      // }
      manager._quat.slerp(next as any, fl);
  
      //manager.modelNode.emitter.velocity.value.copy(manager.modelNode.emitterOptions.velocity.value.copy.applyQuaternion(manager._quat));
      //manager.modelNode.emitter.velocity.spread.copy(manager.modelNode.emitterOptions.velocity.spread.copy.applyQuaternion(manager._quat));
      //manager.modelNode.emitter.updateFlags['velocity'] = true;
  
      manager.modelNode.rotation.z = 0;
  
    }else{
      manager._quat.copy(next as any);
  
      if(next != last){
        // if(manager.trans && manager.lastFrame == 0){
        // manager.modelNode.quaternion.copy(manager.modelNode.transitionState.quaternion);
        // manager.modelNode.transitionState.quaternion.copy(manager.modelNode.quaternion.slerp(manager._quat, fl));
        // }else{
          manager.modelNode.quaternion.copy(last as any);
          manager.modelNode.quaternion.slerp(manager._quat, fl);
        // }
      }else{
        manager.modelNode.quaternion.copy(last as any);
      }
      //manager.modelNode.quaternion.copy(last);
    }
    manager.markNodeTransformDirty();
  }

  /**
   * Stateless orientation sample into `out` (mesh path). Emitter path remains
   * on setFrame/animate until characterized — returns false for emitters.
   */
  sampleOrientation(
    manager: OdysseyModelAnimationManager,
    _anim: OdysseyModelAnimation,
    last: IOdysseyControllerFrameGeneric,
    next: IOdysseyControllerFrameGeneric,
    fl: number,
    out: THREE.Quaternion
  ): boolean {
    if(manager.modelNode.emitter){
      return false;
    }
    if(next != last){
      out.copy(last as any);
      manager._quat.copy(next as any);
      out.slerp(manager._quat, fl);
    }else{
      out.copy(last as any);
    }
    return true;
  }

  sampleOrientationFrame(
    manager: OdysseyModelAnimationManager,
    anim: OdysseyModelAnimation,
    data: IOdysseyControllerFrameGeneric,
    out: THREE.Quaternion
  ): void {
    if(manager.modelNode.controllerHelpers.hasOrientation === undefined){
      const _controller = manager.modelNode.controllers.get(OdysseyModelControllerType.Orientation);
      if(typeof _controller != 'undefined'){
        manager.modelNode.controllerHelpers.hasOrientation = true;
        manager.modelNode.controllerHelpers.orientation = _controller;
      }else{
        manager.modelNode.controllerHelpers.hasOrientation = false;
        manager.modelNode.controllerHelpers.orientation = undefined;
      }
    }
    if(manager.modelNode.controllerHelpers.hasOrientation){
      anim._quaternion.copy(manager.modelNode.controllerHelpers.orientation.data[0] as any);
    }
    let x = data.x, y = data.y, z = data.z, w = data.w;
    if(x == 0 && y == 0 && z == 0 && w == 1){
      x = anim._quaternion.x;
      y = anim._quaternion.y;
      z = anim._quaternion.z;
      w = anim._quaternion.w;
    }
    out.set(x, y, z, w);
  }

}
