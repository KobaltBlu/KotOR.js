import { OdysseyController } from ".";
import { OdysseyModelAnimation, OdysseyModelAnimationManager } from "..";
import { OdysseyModelControllerType } from "../../enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "../../interface/odyssey/controller/IOdysseyControllerGeneric";

export class ColorStartController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.ColorStart;

  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.colorStart.setRGB( data.x, data.y, data.z );
      manager.modelNode.emitter.material.uniforms.colorStart.value.copy(manager.modelNode.emitter.colorStart);
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.colorStart.setRGB(
        last.x + fl * (next.x - last.x),
        last.y + fl * (next.y - last.y),
        last.z + fl * (next.z - last.z)
      );
      manager.modelNode.emitter.material.uniforms.colorStart.value.copy(manager.modelNode.emitter.colorStart);
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

}
