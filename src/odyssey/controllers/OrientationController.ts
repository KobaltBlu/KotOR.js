import { OdysseyModelAnimation } from "../OdysseyModelAnimation";
import { OdysseyModelAnimationManager } from "../OdysseyModelAnimationManager";
import { OdysseyController } from ".";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";
import { OdysseyModelControllerType } from "../../interface/odyssey/OdysseyModelControllerType";
import { OdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/OdysseyControllerFrameGeneric";

export class OrientationController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.Orientation;

  constructor( controller: OdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, data: OdysseyControllerFrameGeneric){
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

      if(manager.trans && controller.frameCount > 1){
        manager.modelNode.transitionState.quaternion.copy(manager.modelNode.quaternion);
        anim._quaternion.copy(manager.modelNode.transitionState.quaternion);
      }else{
        anim._quaternion.copy(manager.modelNode.controllerHelpers.orientation.data[0] as any);
      }

    }
    if(data.x == 0 && data.y == 0 && data.z == 0 && data.w == 1){
      data.x = anim._quaternion.x;
      data.y = anim._quaternion.y;
      data.z = anim._quaternion.z;
      data.w = anim._quaternion.w;
    }

    if(manager.trans && controller.frameCount > 1){
      manager.modelNode.quaternion.slerp(manager._quat.copy(anim._quaternion), 0);
    }else{
      manager.modelNode.quaternion.set(data.x, data.y, data.z, data.w);
    }

    manager.modelNode.updateMatrix();
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, last: OdysseyControllerFrameGeneric, next: OdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.emitter){

      if(manager.trans && manager.lastFrame == 0){
        manager.modelNode.position.copy(manager.modelNode.transitionState.position);
      }
      manager._quat.slerp(next as any, fl);
  
      //manager.modelNode.emitter.velocity.value.copy(manager.modelNode.emitterOptions.velocity.value.copy().applyQuaternion(manager._quat));
      //manager.modelNode.emitter.velocity.spread.copy(manager.modelNode.emitterOptions.velocity.spread.copy().applyQuaternion(manager._quat));
      //manager.modelNode.emitter.updateFlags['velocity'] = true;
  
      manager.modelNode.rotation.z = 0;
  
    }else{
      manager._quat.copy(next as any);
  
      if(next != last){
        if(manager.trans && manager.lastFrame == 0){
          manager.modelNode.quaternion.copy(manager.modelNode.transitionState.quaternion);
          manager.modelNode.transitionState.quaternion.copy(manager.modelNode.quaternion.slerp(manager._quat, fl));
        }else{
          manager.modelNode.quaternion.copy(last as any);
          manager.modelNode.quaternion.slerp(manager._quat, fl);
        }
      }else{
        manager.modelNode.quaternion.copy(last as any);
      }
      //manager.modelNode.quaternion.copy(last);
    }
    manager.modelNode.updateMatrix();
  }

}
