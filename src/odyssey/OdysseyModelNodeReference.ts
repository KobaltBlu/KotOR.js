import { OdysseyModelNodeType } from "../enums/odyssey/OdysseyModelNodeType";
import type { OdysseyModel } from "./OdysseyModel";
import { OdysseyModelNode } from "./OdysseyModelNode";

/**
 * OdysseyModelNodeReference class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelNodeReference.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyModelNodeReference extends OdysseyModelNode {
  modelName: string;
  reattachable: number;

  constructor(parent: OdysseyModelNode){
    super(parent);
    this.type |= OdysseyModelNodeType.Reference;
  }

  readBinary(odysseyModel: OdysseyModel){
    super.readBinary(odysseyModel);

    this.modelName = this.odysseyModel.mdlReader.readChars(32).replace(/\0[\s\S]*$/g,'');;
    this.reattachable = this.odysseyModel.mdlReader.readInt32();
  }

}
