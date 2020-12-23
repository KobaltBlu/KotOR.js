class SizeStartController extends OdysseyController {

  constructor( controller = undefined ){
    super(controller);
  }

  setFrame(manager = undefined, anim = undefined, controller = undefined, data = undefined){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.material.uniforms.scale.value.x = data.value;
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

  animate(manager = undefined, anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.material.uniforms.scale.value.x = ((next.value - last.value) * fl + last.value);
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

}

module.exports = SizeStartController;