class LifeExpController extends OdysseyController {

  constructor( controller = undefined ){
    super(controller);
  }

  setFrame(manager = undefined, anim = undefined, controller = undefined, data = undefined){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.lifeExp = Math.ceil(data.value);
    }
  }

  animate(manager = undefined, anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.lifeExp = next.value;//Math.ceil(last.value + fl * (next.value - last.value));
    }
  }

}

module.exports = LifeExpController;