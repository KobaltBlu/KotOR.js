import { OdysseyController } from "./OdysseyController";
import { IOdysseyControllerGeneric } from "../../interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyModelNodeType } from "../../enums/odyssey/OdysseyModelNodeType";
import { AlphaController } from "./AlphaController";
import { AlphaEndController } from "./AlphaEndController";
import { AlphaMidController } from "./AlphaMidController";
import { AlphaStartController } from "./AlphaStartController";
import { BirthRateController } from "./BirthRateController";
import { ColorController } from "./ColorController";
import { ColorEndController } from "./ColorEndController";
import { ColorMidController } from "./ColorMidController";
import { ColorStartController } from "./ColorStartController";
import { FrameEndController } from "./FrameEndController";
import { FrameStartController } from "./FrameStartController";
import { LifeExpController } from "./LifeExpController";
import { MassController } from "./MassController";
import { MultiplierController } from "./MultiplierController";
import { OrientationController } from "./OrientationController";
import { PositionController } from "./PositionController";
import { RadiusController } from "./RadiusController";
import { ScaleController } from "./ScaleController";
import { SelfIllumColorController } from "./SelfIllumColorController";
import { SizeEndController } from "./SizeEndController";
import { SizeMidController } from "./SizeMidController";
import { SizeStartController } from "./SizeStartController";

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