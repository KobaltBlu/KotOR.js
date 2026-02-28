import { OdysseyModelNodeType } from "@/enums/odyssey/OdysseyModelNodeType";
import { IOdysseyControllerGeneric } from "@/interface/odyssey/controller/IOdysseyControllerGeneric";
import { AlphaController } from "@/odyssey/controllers/AlphaController";
import { AlphaEndController } from "@/odyssey/controllers/AlphaEndController";
import { AlphaMidController } from "@/odyssey/controllers/AlphaMidController";
import { AlphaStartController } from "@/odyssey/controllers/AlphaStartController";
import { BirthRateController } from "@/odyssey/controllers/BirthRateController";
import { ColorController } from "@/odyssey/controllers/ColorController";
import { ColorEndController } from "@/odyssey/controllers/ColorEndController";
import { ColorMidController } from "@/odyssey/controllers/ColorMidController";
import { ColorStartController } from "@/odyssey/controllers/ColorStartController";
import { FrameEndController } from "@/odyssey/controllers/FrameEndController";
import { FrameStartController } from "@/odyssey/controllers/FrameStartController";
import { LifeExpController } from "@/odyssey/controllers/LifeExpController";
import { MassController } from "@/odyssey/controllers/MassController";
import { MultiplierController } from "@/odyssey/controllers/MultiplierController";
import { OdysseyController } from "@/odyssey/controllers/OdysseyController";
import { OrientationController } from "@/odyssey/controllers/OrientationController";
import { PositionController } from "@/odyssey/controllers/PositionController";
import { RadiusController } from "@/odyssey/controllers/RadiusController";
import { ScaleController } from "@/odyssey/controllers/ScaleController";
import { SelfIllumColorController } from "@/odyssey/controllers/SelfIllumColorController";
import { SizeEndController } from "@/odyssey/controllers/SizeEndController";
import { SizeMidController } from "@/odyssey/controllers/SizeMidController";
import { SizeStartController } from "@/odyssey/controllers/SizeStartController";

/**
 * OdysseyControllerFactory class.
 * Static factory by design; no instance state.
 * @file OdysseyControllerFactory.ts
 */
/* eslint-disable @typescript-eslint/no-extraneous-class */
export class OdysseyControllerFactory {

  static From( controller: IOdysseyControllerGeneric ){

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
    
    if((controller.nodeType & OdysseyModelNodeType.Mesh) == OdysseyModelNodeType.Mesh) {
      switch(controller.type){
        case 100://SelfIllumColor
          return new SelfIllumColorController(controller);
        case 132://Alpha
          return new AlphaController(controller);
      }
    }

    if((controller.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      switch(controller.type){
        case 76://Color
          return new ColorController(controller);
        case 88://Radius
          return new RadiusController(controller);
        case 140://Multiplier
          return new MultiplierController(controller);
      }
    }

    if((controller.nodeType & OdysseyModelNodeType.Emitter) == OdysseyModelNodeType.Emitter) {
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