class MassController extends OdysseyController {

  constructor( controller = undefined ){
    super(controller);
  }

  setFrame(manager = undefined, anim = undefined, controller = undefined, data = undefined){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.mass = data.value;
      manager.modelNode.emitter.attributeChanged('mass');
    }
  }

  animate(manager = undefined, anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.mass = next.value;//Math.ceil(last.value + fl * (next.value - last.value));
      manager.modelNode.emitter.attributeChanged('mass');
    }
  }

}

module.exports = MassController;