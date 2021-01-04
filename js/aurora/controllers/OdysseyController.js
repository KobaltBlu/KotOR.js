class OdysseyController {

  constructor( controller ){
    Object.assign(this, controller);

    this.vec3 = new THREE.Vector3(0, 0, 0);
    this.quaternion = new THREE.Quaternion(0, 0, 0, 1);
  }

  setFrame(){

  }

  animate(){

  }

  update(){

  }

  static From( controller = undefined ){

    if(!(typeof controller === 'object'))
      return;

    switch(controller.type){
      case 8://Position
        return new PositionController(controller);
      case 20://Orientation
        return new OrientationController(controller);
      case 36://Scale
        return new ScaleController(controller);
    }
    
    if((controller.nodeType & AuroraModel.NODETYPE.Mesh) == AuroraModel.NODETYPE.Mesh) {
      switch(controller.type){
        case 100://SelfIllumColor
          return new SelfIllumColorController(controller);
        case 132://Alpha
          return new AlphaController(controller);
      }
    }

    if((controller.nodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
      switch(controller.type){
        case 76://Color
          return new ColorController(controller);
        case 88://Radius
          return new RadiusController(controller);
        case 140://Multiplier
          return new MultiplierController(controller);
      }
    }

    if((controller.nodeType & AuroraModel.NODETYPE.Emitter) == AuroraModel.NODETYPE.Emitter) {
      switch(controller.type){
        case 80://AlphaEnd
          return new AlphaEndController(controller);
        case 84://AlphaStart
          return new AlphaStartController(controller);
        case 88://BirthRate
          return new BirthRateController(controller);
        case 380://ColorEnd
          return new ColorEndController(controller);
        case 392://ColorStart
          return new ColorStartController(controller);
        case 108://FrameEnd
          return new FrameEndController(controller);
        case 112://FrameStart
          return new FrameStartController(controller);
        case 120://LifeExp
          return new LifeExpController(controller);
        case 124://Mass
          return new MassController(controller);
        case 144://SizeStart
          return new SizeStartController(controller);
        case 232://SizeMid
          return new SizeMidController(controller);
        case 148://SizeEnd
          return new SizeEndController(controller);
        case 216://AlphaMid
          return new AlphaMidController(controller);
        case 284://ColorMid
          return new ColorMidController(controller);
      }
    }

    return new OdysseyController(controller);

  }

}

module.exports = OdysseyController;