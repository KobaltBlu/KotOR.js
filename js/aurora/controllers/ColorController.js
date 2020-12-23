class ColorController extends OdysseyController {

  constructor( controller = undefined ){
    super(controller);
  }

  setFrame(manager = undefined, anim = undefined, controller = undefined, data = undefined){
    if ((manager.modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
      manager.modelNode._node.light.color.setRGB( data.r, data.g, data.b );
    }
  }

  animate(manager = undefined, anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    if ((manager.modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
      manager.modelNode._node.light.color.r = ((next.r - last.r) * fl + last.r);
      manager.modelNode._node.light.color.g = ((next.g - last.g) * fl + last.g);
      manager.modelNode._node.light.color.b = ((next.b - last.b) * fl + last.b);
    }
  }

}

module.exports = ColorController;