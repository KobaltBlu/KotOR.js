import { OdysseyController } from ".";
import { OdysseyModelAnimation, OdysseyModelAnimationManager } from "..";
import { OdysseyModelControllerType } from "../../enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "../../interface/odyssey/controller/IOdysseyControllerGeneric";

export class AlphaMidController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.AlphaMid;

  constructor( controller: IOdysseyControllerGeneric ){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.opacity[1] = data.value;
      manager.modelNode.emitter.material.uniforms.opacity.value.fromArray(manager.modelNode.emitter.opacity);
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.opacity[1] = ((next.value - last.value) * fl + last.value);
      manager.modelNode.emitter.material.uniforms.opacity.value.fromArray(manager.modelNode.emitter.opacity);
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

}
