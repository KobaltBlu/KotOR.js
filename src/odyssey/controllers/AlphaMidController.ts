import { OdysseyController } from ".";
import { OdysseyModelAnimation, OdysseyModelAnimationManager } from "..";
import { OdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/OdysseyControllerFrameGeneric";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";

export class AlphaMidController extends OdysseyController {

  constructor( controller: OdysseyControllerGeneric ){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, data: OdysseyControllerFrameGeneric){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.opacity[1] = data.value;
      manager.modelNode.emitter.material.uniforms.opacity.value.fromArray(manager.modelNode.emitter.opacity);
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, last: OdysseyControllerFrameGeneric, next: OdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.opacity[1] = ((next.value - last.value) * fl + last.value);
      manager.modelNode.emitter.material.uniforms.opacity.value.fromArray(manager.modelNode.emitter.opacity);
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

}