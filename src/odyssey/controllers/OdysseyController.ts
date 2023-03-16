import { OdysseyModelAnimation } from "../OdysseyModelAnimation";
import { OdysseyModelAnimationManager } from "../OdysseyModelAnimationManager";
import { 
  AlphaController, AlphaEndController, AlphaMidController, AlphaStartController, BirthRateController, BlurLengthController, BounceCoefficientController, ColorController, ColorEndController, ColorMidController,
  ColorStartController, CombineTimeController, ControlPTCountController, ControlPTDelayController, ControlPTRadiusController, DetonateController, DragController, FPSController, FrameEndController, FrameStartController, GravityController, LifeExpController, LightningDelayController, LightningRadiusController, LightningScaleController, LightningSubDivController, LightningZigZagController, MassController, MultiplierController, OrientationController,
  P2PBezier2Controller,
  P2PBezier3Controller,
  ParticleRotationController,
  PercentEndController,
  PercentMidController,
  PercentStartController,
  PositionController, RadiusController, RandomBirthRateController, RandomVelocityController, ScaleController, SelfIllumColorController, SizeEndController, SizeEndYController, SizeMidController, SizeMidYController, SizeStartController, SizeStartYController, SpreadController, TangentLengthController, TangentSpreadController, TargetSizeController, ThresholdController, VelocityController, VerticalDisplacementController, XSizeController, YSizeController
} from ".";

import * as THREE from "three";
import { OdysseyModelNodeType } from "../../enums/odyssey/OdysseyModelNodeType";
import { OdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/OdysseyControllerFrameGeneric";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";
import { OdysseyModelControllerType } from "../../enums/odyssey/OdysseyModelControllerType";

export class OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.INVALID;

  vec3;
  quaternion;
  frameCount: number;
  data: OdysseyControllerFrameGeneric[] = [];

  constructor( controller: OdysseyControllerGeneric ){
    Object.assign(this, controller);

    this.vec3 = new THREE.Vector3(0, 0, 0);
    this.quaternion = new THREE.Quaternion(0, 0, 0, 1);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: OdysseyControllerFrameGeneric){
    
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: OdysseyControllerFrameGeneric, next: OdysseyControllerFrameGeneric, fl: number = 0){
    
  }

  update(){

  }

  static From( controller: OdysseyControllerGeneric ){

    if(!(typeof controller === 'object'))
      return;

    switch(controller.type){
      case OdysseyModelControllerType.Position:
        return new PositionController(controller);
      case OdysseyModelControllerType.Orientation:
        return new OrientationController(controller);
      case OdysseyModelControllerType.Scale:
        return new ScaleController(controller);
    }
    
    if((controller.nodeType & OdysseyModelNodeType.Mesh) == OdysseyModelNodeType.Mesh) {
      switch(controller.type){
        case OdysseyModelControllerType.SelfIllumColor:
          return new SelfIllumColorController(controller);
        case OdysseyModelControllerType.Alpha:
          return new AlphaController(controller);
      }
    }

    if((controller.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      switch(controller.type){
        case OdysseyModelControllerType.Color:
          return new ColorController(controller);
        case OdysseyModelControllerType.Radius:
          return new RadiusController(controller);
        case OdysseyModelControllerType.VerticalDisplacement:
          return new VerticalDisplacementController(controller);
        case OdysseyModelControllerType.Multiplier:
          return new MultiplierController(controller);
      }
    }

    if((controller.nodeType & OdysseyModelNodeType.Emitter) == OdysseyModelNodeType.Emitter) {
      switch(controller.type){
        //BirthRate
        case OdysseyModelControllerType.BirthRate:
          return new BirthRateController(controller);
        case OdysseyModelControllerType.RandomBirthRate:
          return new RandomBirthRateController(controller);

        case OdysseyModelControllerType.Bounce_Co:
          return new BounceCoefficientController(controller);
        
        case OdysseyModelControllerType.Detonate:
          return new DetonateController(controller);
        case OdysseyModelControllerType.CombineTime:
          return new CombineTimeController(controller);
        case OdysseyModelControllerType.Drag:
          return new DragController(controller);
        case OdysseyModelControllerType.Mass:
          return new MassController(controller);
        case OdysseyModelControllerType.Gravity:
          return new GravityController(controller);
        case OdysseyModelControllerType.Threshold:
          return new ThresholdController(controller);
        case OdysseyModelControllerType.Spread:
          return new SpreadController(controller);

        //VELOCITY
        case OdysseyModelControllerType.Velocity:
          return new VelocityController(controller);
        case OdysseyModelControllerType.RandomVelocity:
          return new RandomVelocityController(controller);

        case OdysseyModelControllerType.FPS:
          return new FPSController(controller);

        //P2P
        case OdysseyModelControllerType.P2P_Bezier2:
          return new P2PBezier2Controller(controller);
        case OdysseyModelControllerType.P2P_Bezier3:
          return new P2PBezier3Controller(controller);

        case OdysseyModelControllerType.ParticleRot:
          return new ParticleRotationController(controller);

        //COLOR
        case OdysseyModelControllerType.ColorStart:
          return new ColorStartController(controller);
        case OdysseyModelControllerType.ColorMid:
          return new ColorMidController(controller);
        case OdysseyModelControllerType.ColorEnd:
          return new ColorEndController(controller);

        //FRAME
        case OdysseyModelControllerType.FrameEnd:
          return new FrameEndController(controller);
        case OdysseyModelControllerType.FrameStart:
          return new FrameStartController(controller);

        case OdysseyModelControllerType.XSize:
          return new XSizeController(controller);
        case OdysseyModelControllerType.YSize:
          return new YSizeController(controller);

        case OdysseyModelControllerType.BlurLength:
          return new BlurLengthController(controller);

        //LIGHTNING
        case OdysseyModelControllerType.LightningDelay:
          return new LightningDelayController(controller);
        case OdysseyModelControllerType.LightningRadius:
          return new LightningRadiusController(controller);
        case OdysseyModelControllerType.LightningScale:
          return new LightningScaleController(controller);
        case OdysseyModelControllerType.LightningSubDiv:
          return new LightningSubDivController(controller);
        case OdysseyModelControllerType.LightningZigZag:
          return new LightningZigZagController(controller);

        case OdysseyModelControllerType.LifeExp:
          return new LifeExpController(controller);
        
        //SIZE
        case OdysseyModelControllerType.SizeStart:
          return new SizeStartController(controller);
        case OdysseyModelControllerType.SizeStart_Y:
          return new SizeStartYController(controller);
        case OdysseyModelControllerType.SizeMid:
          return new SizeMidController(controller);
        case OdysseyModelControllerType.SizeMid_Y:
          return new SizeMidYController(controller);
        case OdysseyModelControllerType.SizeEnd:
          return new SizeEndController(controller);
        case OdysseyModelControllerType.SizeEnd_Y:
          return new SizeEndYController(controller);
        
        //ALPHA
        case OdysseyModelControllerType.AlphaStart:
          return new AlphaStartController(controller);
        case OdysseyModelControllerType.AlphaMid:
          return new AlphaMidController(controller);
        case OdysseyModelControllerType.AlphaEnd:
          return new AlphaEndController(controller);
        
        //PERCENT
        case OdysseyModelControllerType.PercentStart:
          return new PercentStartController(controller);
        case OdysseyModelControllerType.PercentMid:
          return new PercentMidController(controller);
        case OdysseyModelControllerType.PercentEnd:
          return new PercentEndController(controller);

        case OdysseyModelControllerType.TargetSize:
          return new TargetSizeController(controller);
        case OdysseyModelControllerType.ControlPTCount:
          return new ControlPTCountController(controller);
        case OdysseyModelControllerType.ControlPTRadius:
          return new ControlPTRadiusController(controller);
        case OdysseyModelControllerType.ControlPTDelay:
          return new ControlPTDelayController(controller);
        case OdysseyModelControllerType.TangentSpread:
          return new TangentSpreadController(controller);
        case OdysseyModelControllerType.TangentLength:
          return new TangentLengthController(controller);
      }
    }

    return new OdysseyController(controller);

  }

}
