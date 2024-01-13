import type { OdysseyModelAnimation } from "../OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "../OdysseyModelAnimationManager";
import { IOdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "../../interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyModelControllerType } from "../../enums/odyssey/OdysseyModelControllerType";
import { OdysseyController } from "./OdysseyController";

/**
 * PositionController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file PositionController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class PositionController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.Position;

  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if(typeof manager.modelNode.controllers.get(OdysseyModelControllerType.Position) != 'undefined'){

      // if(manager.trans && this.frameCount > 1){
      //   manager.modelNode.transitionState.position.copy(manager.modelNode.position);
      //   anim._position.copy(manager.modelNode.transitionState.position);
      // }else{
        anim._position.copy(manager.modelNode.controllers.get(OdysseyModelControllerType.Position).data[0] as any);
      // }

      if(anim.name.indexOf('CUT') > -1 && manager.modelNode.name == 'cutscenedummy'){
        anim._position.sub(manager.model.parent.position);
      }

    }
    //if(manager.trans && this.frameCount > 1){
    //  manager.modelNode.position.lerp(anim._position.add(data), anim.data.delta);
    //}else{
      manager.modelNode.position.copy(anim._position.add(data as any));
    //}
    manager.modelNode.updateMatrix();
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
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
