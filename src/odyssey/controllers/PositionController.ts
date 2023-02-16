import { OdysseyModelAnimation } from "..";
import { OdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/OdysseyControllerFrameGeneric";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";
import { OdysseyModelControllerType } from "../../interface/odyssey/OdysseyModelControllerType";
import { OdysseyModelAnimationManager } from "../OdysseyModelAnimationManager";
import { OdysseyController } from "./OdysseyController";

export class PositionController extends OdysseyController {

  constructor( controller: OdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, data: OdysseyControllerFrameGeneric){
    if(typeof manager.modelNode.controllers.get(OdysseyModelControllerType.Position) != 'undefined'){

      if(manager.trans && controller.frameCount > 1){
        manager.modelNode.transitionState.position.copy(manager.modelNode.position);
        anim._position.copy(manager.modelNode.transitionState.position);
      }else{
        anim._position.copy(manager.modelNode.controllers.get(OdysseyModelControllerType.Position).data[0]);
      }

      if(anim.name.indexOf('CUT') > -1 && manager.modelNode.name == 'cutscenedummy'){
        anim._position.sub(manager.model.parent.position);
      }

    }
    if(manager.trans && controller.frameCount > 1){
      manager.modelNode.position.lerp(anim._position.add(data), anim.data.delta);
    }else{
      manager.modelNode.position.copy(anim._position.add(data));
    }
    manager.modelNode.updateMatrix();
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, last: OdysseyControllerFrameGeneric, next: OdysseyControllerFrameGeneric, fl: number = 0){
    //if(last.x == next.x && last.y == next.y && last.z == next.z)
    //  break;

    //Cache the position controller
    if(manager.modelNode.controllerHelpers.hasPosition === undefined){
      let _controller = manager.modelNode.controllers.get(OdysseyModelControllerType.Position);
      if(typeof _controller != 'undefined'){
        manager.modelNode.controllerHelpers.hasPosition = true;
        manager.modelNode.controllerHelpers.position = _controller;
      }else{
        manager.modelNode.controllerHelpers.hasPosition = false;
        manager.modelNode.controllerHelpers.position = undefined;
      }
    }

    if(manager.modelNode.controllerHelpers.hasPosition){
      anim._position.copy(manager.modelNode.controllerHelpers.position.data[0]);
      if(anim.name.indexOf('CUT') > -1 && manager.modelNode.name == 'cutscenedummy'){
        anim._position.sub(manager.model.parent.position);
      }
    }

    if(last.isBezier){
      //Last point
      if(last.isLinearBezier){
        manager._vec3.copy(last.bezier.getPoint(0)).add(anim._position);
        manager.modelNode.position.copy(manager._vec3);
      }else{
        manager._vec3.copy(last.bezier.getPoint((0.5 * fl) + 0.5).add(anim._position));
        manager.modelNode.position.copy(manager._vec3);
      }

      //Next point
      //if(next.isLinearBezier){
        manager._vec3.copy(next.bezier.getPoint( next.lastFrame ? 0 : 0.5 )).add(anim._position);
        manager.modelNode.position.lerp(manager._vec3, fl);
      //}else{
      //  manager._vec3.copy(next.bezier.getPoint(0.5 * fl).add(anim._position));
      //  manager.modelNode.position.lerp(manager._vec3, fl);
      //}
    }else if(next.isBezier){
      //Last point
      manager._vec3.copy(last as any).add(anim._position);
      manager.modelNode.position.copy(manager._vec3);
      //Next point
      if(next.isLinearBezier){
        manager._vec3.copy(next.bezier.getPoint(0)).add(anim._position);
        manager.modelNode.position.lerp(manager._vec3, fl);
      }else{
        manager._vec3.copy(next.bezier.getPoint(0.5 * fl)).add(anim._position);
        manager.modelNode.position.lerp(manager._vec3, fl);
      }
    }else{
      
      //if(manager.trans && lastFrame == 0){
      //  manager.modelNode.position.copy(manager.modelNode.transitionState.position);
      //}else{
        manager._vec3.copy(last as any).add(anim._position);
        manager.modelNode.position.copy(manager._vec3);
      //}

      manager._vec3.copy(next as any);
      manager._vec3.add(anim._position);

      // if(anim.data.elapsed > anim.transition){
      //   manager.modelNode.position.copy(last);
      //   manager.modelNode.position.add(anim._position);
      // }
      manager.modelNode.position.lerp(manager._vec3, fl);
    }
    manager.modelNode.updateMatrix();
  }

}
