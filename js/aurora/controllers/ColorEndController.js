class ColorEndController extends OdysseyController {

  constructor( controller = undefined ){
    super(controller);
  }

  setFrame(manager = undefined, anim = undefined, controller = undefined, data = undefined){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.colorEnd.copy(data);
      manager.modelNode.emitter.material.uniforms.colorEnd.value.copy(data);
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

  animate(manager = undefined, anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.colorEnd.setRGB(
        last.r + fl * (next.r - last.r),
        last.g + fl * (next.g - last.g),
        last.b + fl * (next.b - last.b)
      );
      manager.modelNode.emitter.material.uniforms.colorEnd.value.copy(manager.modelNode.emitter.colorEnd);
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

}

module.exports = ColorEndController;