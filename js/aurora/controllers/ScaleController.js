class ScaleController extends OdysseyController {

  constructor( controller = undefined ){
    super(controller);
  }

  setFrame(manager = undefined, anim = undefined, controller = undefined, data = undefined){
    let offsetScale = 0;
    if(typeof manager.modelNode.controllers.get(AuroraModel.ControllerType.Scale) != 'undefined'){
      offsetScale = manager.modelNode.controllers.get(AuroraModel.ControllerType.Scale).data[0].value || 0.000000000001; //0 scale causes warnings
    }
    //manager.modelNode.scale.setScalar( ( (data.value + offsetScale) * manager.model.Scale ) || 0.00000001 );
    manager.modelNode.scale.setScalar( ( (data.value) * manager.model.Scale ) || 0.00000001 );
    manager.modelNode.updateMatrix();
  }

  animate(manager = undefined, anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    manager.modelNode.scale.lerp( manager._vec3.setScalar( ( (next.value) * manager.model.Scale) || 0.000000001 ), fl);
    manager.modelNode.updateMatrix();
  }

}

module.exports = ScaleController;