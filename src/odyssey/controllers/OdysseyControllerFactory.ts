import { OdysseyController } from "@/odyssey/controllers/OdysseyController";
import { IOdysseyControllerGeneric } from "@/interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyModelNodeType } from "@/enums/odyssey/OdysseyModelNodeType";
import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { AlphaController } from "@/odyssey/controllers/AlphaController";
import { AlphaEndController } from "@/odyssey/controllers/AlphaEndController";
import { AlphaMidController } from "@/odyssey/controllers/AlphaMidController";
import { AlphaStartController } from "@/odyssey/controllers/AlphaStartController";
import { BirthRateController } from "@/odyssey/controllers/BirthRateController";
import { BlurLengthController } from "@/odyssey/controllers/BlurLengthController";
import { BounceCoefficientController } from "@/odyssey/controllers/BounceCoefficientController";
import { ColorController } from "@/odyssey/controllers/ColorController";
import { ColorEndController } from "@/odyssey/controllers/ColorEndController";
import { ColorMidController } from "@/odyssey/controllers/ColorMidController";
import { ColorStartController } from "@/odyssey/controllers/ColorStartController";
import { CombineTimeController } from "@/odyssey/controllers/CombineTimeController";
import { ControlPTCountController } from "@/odyssey/controllers/ControlPTCountController";
import { ControlPTDelayController } from "@/odyssey/controllers/ControlPTDelayController";
import { ControlPTRadiusController } from "@/odyssey/controllers/ControlPTRadiusController";
import { DetonateController } from "@/odyssey/controllers/DetonateController";
import { DragController } from "@/odyssey/controllers/DragController";
import { FPSController } from "@/odyssey/controllers/FPSController";
import { FrameEndController } from "@/odyssey/controllers/FrameEndController";
import { FrameStartController } from "@/odyssey/controllers/FrameStartController";
import { GravityController } from "@/odyssey/controllers/GravityController";
import { LifeExpController } from "@/odyssey/controllers/LifeExpController";
import { LightningDelayController } from "@/odyssey/controllers/LightningDelayController";
import { LightningRadiusController } from "@/odyssey/controllers/LightningRadiusController";
import { LightningScaleController } from "@/odyssey/controllers/LightningScaleController";
import { LightningSubDivController } from "@/odyssey/controllers/LightningSubDivController";
import { LightningZigZagController } from "@/odyssey/controllers/LightningZigZagController";
import { MassController } from "@/odyssey/controllers/MassController";
import { MultiplierController } from "@/odyssey/controllers/MultiplierController";
import { OrientationController } from "@/odyssey/controllers/OrientationController";
import { P2PBezier2Controller } from "@/odyssey/controllers/P2PBezier2Controller";
import { P2PBezier3Controller } from "@/odyssey/controllers/P2PBezier3Controller";
import { ParticleRotationController } from "@/odyssey/controllers/ParticleRotationController";
import { PercentEndController } from "@/odyssey/controllers/PercentEndController";
import { PercentMidController } from "@/odyssey/controllers/PercentMidController";
import { PercentStartController } from "@/odyssey/controllers/PercentStartController";
import { PositionController } from "@/odyssey/controllers/PositionController";
import { RadiusController } from "@/odyssey/controllers/RadiusController";
import { RandomBirthRateController } from "@/odyssey/controllers/RandomBirthRateController";
import { RandomVelocityController } from "@/odyssey/controllers/RandomVelocityController";
import { ScaleController } from "@/odyssey/controllers/ScaleController";
import { SelfIllumColorController } from "@/odyssey/controllers/SelfIllumColorController";
import { SizeEndController } from "@/odyssey/controllers/SizeEndController";
import { SizeEndYController } from "@/odyssey/controllers/SizeEndYController";
import { SizeMidController } from "@/odyssey/controllers/SizeMidController";
import { SizeMidYController } from "@/odyssey/controllers/SizeMidYController";
import { SizeStartController } from "@/odyssey/controllers/SizeStartController";
import { SizeStartYController } from "@/odyssey/controllers/SizeStartYController";
import { SpreadController } from "@/odyssey/controllers/SpreadController";
import { TangentLengthController } from "@/odyssey/controllers/TangentLengthController";
import { TangentSpreadController } from "@/odyssey/controllers/TangentSpreadController";
import { TargetSizeController } from "@/odyssey/controllers/TargetSizeController";
import { ThresholdController } from "@/odyssey/controllers/ThresholdController";
import { VelocityController } from "@/odyssey/controllers/VelocityController";
import { XSizeController } from "@/odyssey/controllers/XSizeController";
import { YSizeController } from "@/odyssey/controllers/YSizeController";

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
