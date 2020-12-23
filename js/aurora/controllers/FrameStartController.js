class FrameStartController extends OdysseyController {

  constructor( controller = undefined ){
    super(controller);
  }

  setFrame(manager = undefined, anim = undefined, controller = undefined, data = undefined){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.material.uniforms.frameRange.value.x = data.value;
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

  animate(manager = undefined, anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.material.uniforms.frameRange.value.x = next.value;
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

}

module.exports = FrameStartController;