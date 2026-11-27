import { OdysseyController } from "@engine/odyssey/controllers/OdysseyController";
import { IOdysseyControllerGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyModelNodeType } from "@core/enums/odyssey/OdysseyModelNodeType";
import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";
import { AlphaController } from "@engine/odyssey/controllers/AlphaController";
import { AlphaEndController } from "@engine/odyssey/controllers/AlphaEndController";
import { AlphaMidController } from "@engine/odyssey/controllers/AlphaMidController";
import { AlphaStartController } from "@engine/odyssey/controllers/AlphaStartController";
import { BirthRateController } from "@engine/odyssey/controllers/BirthRateController";
import { BlurLengthController } from "@engine/odyssey/controllers/BlurLengthController";
import { BounceCoefficientController } from "@engine/odyssey/controllers/BounceCoefficientController";
import { ColorController } from "@engine/odyssey/controllers/ColorController";
import { ColorEndController } from "@engine/odyssey/controllers/ColorEndController";
import { ColorMidController } from "@engine/odyssey/controllers/ColorMidController";
import { ColorStartController } from "@engine/odyssey/controllers/ColorStartController";
import { CombineTimeController } from "@engine/odyssey/controllers/CombineTimeController";
import { ControlPTCountController } from "@engine/odyssey/controllers/ControlPTCountController";
import { ControlPTDelayController } from "@engine/odyssey/controllers/ControlPTDelayController";
import { ControlPTRadiusController } from "@engine/odyssey/controllers/ControlPTRadiusController";
import { DetonateController } from "@engine/odyssey/controllers/DetonateController";
import { DragController } from "@engine/odyssey/controllers/DragController";
import { FPSController } from "@engine/odyssey/controllers/FPSController";
import { FrameEndController } from "@engine/odyssey/controllers/FrameEndController";
import { FrameStartController } from "@engine/odyssey/controllers/FrameStartController";
import { GravityController } from "@engine/odyssey/controllers/GravityController";
import { LifeExpController } from "@engine/odyssey/controllers/LifeExpController";
import { LightningDelayController } from "@engine/odyssey/controllers/LightningDelayController";
import { LightningRadiusController } from "@engine/odyssey/controllers/LightningRadiusController";
import { LightningScaleController } from "@engine/odyssey/controllers/LightningScaleController";
import { LightningSubDivController } from "@engine/odyssey/controllers/LightningSubDivController";
import { LightningZigZagController } from "@engine/odyssey/controllers/LightningZigZagController";
import { MassController } from "@engine/odyssey/controllers/MassController";
import { MultiplierController } from "@engine/odyssey/controllers/MultiplierController";
import { ShadowRadiusController } from "@engine/odyssey/controllers/ShadowRadiusController";
import { VerticalDisplacementController } from "@engine/odyssey/controllers/VerticalDisplacementController";
import { OrientationController } from "@engine/odyssey/controllers/OrientationController";
import { P2PBezier2Controller } from "@engine/odyssey/controllers/P2PBezier2Controller";
import { P2PBezier3Controller } from "@engine/odyssey/controllers/P2PBezier3Controller";
import { ParticleRotationController } from "@engine/odyssey/controllers/ParticleRotationController";
import { PercentEndController } from "@engine/odyssey/controllers/PercentEndController";
import { PercentMidController } from "@engine/odyssey/controllers/PercentMidController";
import { PercentStartController } from "@engine/odyssey/controllers/PercentStartController";
import { PositionController } from "@engine/odyssey/controllers/PositionController";
import { RadiusController } from "@engine/odyssey/controllers/RadiusController";
import { RandomBirthRateController } from "@engine/odyssey/controllers/RandomBirthRateController";
import { RandomVelocityController } from "@engine/odyssey/controllers/RandomVelocityController";
import { ScaleController } from "@engine/odyssey/controllers/ScaleController";
import { SelfIllumColorController } from "@engine/odyssey/controllers/SelfIllumColorController";
import { SizeEndController } from "@engine/odyssey/controllers/SizeEndController";
import { SizeEndYController } from "@engine/odyssey/controllers/SizeEndYController";
import { SizeMidController } from "@engine/odyssey/controllers/SizeMidController";
import { SizeMidYController } from "@engine/odyssey/controllers/SizeMidYController";
import { SizeStartController } from "@engine/odyssey/controllers/SizeStartController";
import { SizeStartYController } from "@engine/odyssey/controllers/SizeStartYController";
import { SpreadController } from "@engine/odyssey/controllers/SpreadController";
import { TangentLengthController } from "@engine/odyssey/controllers/TangentLengthController";
import { TangentSpreadController } from "@engine/odyssey/controllers/TangentSpreadController";
import { TargetSizeController } from "@engine/odyssey/controllers/TargetSizeController";
import { ThresholdController } from "@engine/odyssey/controllers/ThresholdController";
import { VelocityController } from "@engine/odyssey/controllers/VelocityController";
import { XSizeController } from "@engine/odyssey/controllers/XSizeController";
import { YSizeController } from "@engine/odyssey/controllers/YSizeController";

/**
 * OdysseyControllerFactory class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyControllerFactory.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyControllerFactory {

  static From( controller: IOdysseyControllerGeneric ){

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
        case OdysseyModelControllerType.Multiplier:
          return new MultiplierController(controller);
        case OdysseyModelControllerType.ShadowRadius:
          return new ShadowRadiusController(controller);
        case OdysseyModelControllerType.VerticalDisplacement:
          return new VerticalDisplacementController(controller);
      }
    }

    if((controller.nodeType & OdysseyModelNodeType.Emitter) == OdysseyModelNodeType.Emitter) {
      switch(controller.type){
        case OdysseyModelControllerType.AlphaEnd:
          return new AlphaEndController(controller);
        case OdysseyModelControllerType.AlphaStart:
          return new AlphaStartController(controller);
        case OdysseyModelControllerType.BirthRate:
          return new BirthRateController(controller);
        case OdysseyModelControllerType.Bounce_Co:
          return new BounceCoefficientController(controller);
        case OdysseyModelControllerType.CombineTime:
          return new CombineTimeController(controller);
        case OdysseyModelControllerType.Drag:
          return new DragController(controller);
        case OdysseyModelControllerType.FPS:
          return new FPSController(controller);
        case OdysseyModelControllerType.FrameEnd:
          return new FrameEndController(controller);
        case OdysseyModelControllerType.FrameStart:
          return new FrameStartController(controller);
        case OdysseyModelControllerType.Gravity:
          return new GravityController(controller);
        case OdysseyModelControllerType.LifeExp:
          return new LifeExpController(controller);
        case OdysseyModelControllerType.Mass:
          return new MassController(controller);
        case OdysseyModelControllerType.P2P_Bezier2:
          return new P2PBezier2Controller(controller);
        case OdysseyModelControllerType.P2P_Bezier3:
          return new P2PBezier3Controller(controller);
        case OdysseyModelControllerType.ParticleRot:
          return new ParticleRotationController(controller);
        case OdysseyModelControllerType.RandomVelocity:
          return new RandomVelocityController(controller);
        case OdysseyModelControllerType.SizeStart:
          return new SizeStartController(controller);
        case OdysseyModelControllerType.SizeMid:
          return new SizeMidController(controller);
        case OdysseyModelControllerType.SizeEnd:
          return new SizeEndController(controller);
        case OdysseyModelControllerType.SizeStart_Y:
          return new SizeStartYController(controller);
        case OdysseyModelControllerType.SizeEnd_Y:
          return new SizeEndYController(controller);
        case OdysseyModelControllerType.SizeMid_Y:
          return new SizeMidYController(controller);
        case OdysseyModelControllerType.Spread:
          return new SpreadController(controller);
        case OdysseyModelControllerType.Threshold:
          return new ThresholdController(controller);
        case OdysseyModelControllerType.Velocity:
          return new VelocityController(controller);
        case OdysseyModelControllerType.XSize:
          return new XSizeController(controller);
        case OdysseyModelControllerType.YSize:
          return new YSizeController(controller);
        case OdysseyModelControllerType.BlurLength:
          return new BlurLengthController(controller);
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
        case OdysseyModelControllerType.AlphaMid:
          return new AlphaMidController(controller);
        case OdysseyModelControllerType.PercentStart:
          return new PercentStartController(controller);
        case OdysseyModelControllerType.PercentMid:
          return new PercentMidController(controller);
        case OdysseyModelControllerType.PercentEnd:
          return new PercentEndController(controller);
        case OdysseyModelControllerType.RandomBirthRate:
          return new RandomBirthRateController(controller);
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
        case OdysseyModelControllerType.ColorMid:
          return new ColorMidController(controller);
        case OdysseyModelControllerType.ColorEnd:
          return new ColorEndController(controller);
        case OdysseyModelControllerType.ColorStart:
          return new ColorStartController(controller);
        case OdysseyModelControllerType.Detonate:
          return new DetonateController(controller);
      }
    }

    return new OdysseyController(controller);

  }

}
