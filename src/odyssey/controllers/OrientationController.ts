import { OdysseyModelControllerType } from "../../enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "../../interface/odyssey/controller/IOdysseyControllerGeneric";

import type { OdysseyModelAnimation } from "../OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "../OdysseyModelAnimationManager";

import { OdysseyController } from "./OdysseyController";

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

      // if(manager.trans && this.frameCount > 1){
      //   manager.modelNode.transitionState.quaternion.copy(manager.modelNode.quaternion);
      //   anim._quaternion.copy(manager.modelNode.transitionState.quaternion);
      // }else{
        const o0 = manager.modelNode.controllerHelpers.orientation.data[0];
        anim._quaternion.set(o0.x, o0.y, o0.z, o0.w);
      // }

    }
    if(data.x == 0 && data.y == 0 && data.z == 0 && data.w == 1){
      data.x = anim._quaternion.x;
      data.y = anim._quaternion.y;
      data.z = anim._quaternion.z;
      data.w = anim._quaternion.w;
    }

    // if(manager.trans && this.frameCount > 1){
    //   manager.modelNode.quaternion.slerp(manager._quat.copy(anim._quaternion), 0);
    // }else{
      manager.modelNode.quaternion.set(data.x, data.y, data.z, data.w);
    // }

    manager.modelNode.updateMatrix();
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.emitter){

      // if(manager.trans && manager.lastFrame == 0){
      //   manager.modelNode.position.copy(manager.modelNode.transitionState.position);
      // }
      manager._animQuaternion2.set(next.x, next.y, next.z, next.w);
      manager._quat.slerp(manager._animQuaternion2, fl);
  
      //manager.modelNode.emitter.velocity.value.copy(manager.modelNode.emitterOptions.velocity.value.copy().applyQuaternion(manager._quat));
      //manager.modelNode.emitter.velocity.spread.copy(manager.modelNode.emitterOptions.velocity.spread.copy().applyQuaternion(manager._quat));
      //manager.modelNode.emitter.updateFlags['velocity'] = true;
  
      manager.modelNode.rotation.z = 0;
  
    }else{
      manager._quat.set(next.x, next.y, next.z, next.w);
  
      if(next != last){
        // if(manager.trans && manager.lastFrame == 0){
        //   manager.modelNode.quaternion.copy(manager.modelNode.transitionState.quaternion);
        //   manager.modelNode.transitionState.quaternion.copy(manager.modelNode.quaternion.slerp(manager._quat, fl));
        // }else{
          manager.modelNode.quaternion.set(last.x, last.y, last.z, last.w);
          manager.modelNode.quaternion.slerp(manager._quat, fl);
        // }
      }else{
        manager.modelNode.quaternion.set(last.x, last.y, last.z, last.w);
      }
      //manager.modelNode.quaternion.copy(last);
    }
    manager.modelNode.updateMatrix();
  }

}
