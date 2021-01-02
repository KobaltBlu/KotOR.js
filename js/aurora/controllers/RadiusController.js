class RadiusController extends OdysseyController {

  constructor( controller = undefined ){
    super(controller);
  }

  setFrame(manager = undefined, anim = undefined, controller = undefined, data = undefined){
    if ((manager.modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
      manager.modelNode._node.radius = data.value || 0.000000001;
    }
  }

  animate(manager = undefined, anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    if ((manager.modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
      manager.modelNode._node.radius = ((next.value - last.value) * fl + last.value) || 0.000000001;
    }
  }

}

module.exports = RadiusController;