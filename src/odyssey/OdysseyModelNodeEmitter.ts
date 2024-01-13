import { OdysseyModelEmitterFlag } from "../enums/odyssey/OdysseyModelEmitterFlag";
import { OdysseyModelNodeType } from "../enums/odyssey/OdysseyModelNodeType";
import { IOdysseyModelEmitterFlags } from "../interface/odyssey/IOdysseyModelEmitterFlags";
import type { OdysseyModel } from "./OdysseyModel";
import { OdysseyModelNode } from "./OdysseyModelNode";

/**
 * OdysseyModelNodeEmitter class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelNodeEmitter.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyModelNodeEmitter extends OdysseyModelNode {
  deadSpace: number;
  blastRadius: number;
  blastLength: number;
  gridX: number;
  gridY: number;
  spaceType: number;
  updateMode: string;
  renderMode: string;
  blendMode: string;
  textureResRef: string;
  chunkResRef: string;
  twoSidedTex: number;
  loop: number;
  renderOrder: number;
  padding1: number;
  nFlags: number;
  branchCount: number;
  controlPTSmoothing: number;

  flags: IOdysseyModelEmitterFlags = {
    isP2P: false,
    isP2PSel: false,
    affectedByWind: false,
    isTinted: false,
    canBounce: false,
    isRandom: false,
    canInherit: false,
    canInheritVelocity: false,
    canInheritLocal: false,
    canSplat: false,
    canInheritPart: false,
    isDepthTexture: false,
  };

  constructor(parent: OdysseyModelNode){
    super(parent);
    this.type |= OdysseyModelNodeType.Emitter;
    //SIZE: 224 BYTES
  }

  readBinary(odysseyModel: OdysseyModel){
    super.readBinary(odysseyModel);

    //angle at which the particle will be culled when aligned with the camera
    this.deadSpace = this.odysseyModel.mdlReader.readSingle();

    //wind generation
    this.blastRadius = this.odysseyModel.mdlReader.readSingle();
    this.blastLength = this.odysseyModel.mdlReader.readSingle();

    //lightning
    this.branchCount = this.odysseyModel.mdlReader.readUInt32();
    this.controlPTSmoothing = this.odysseyModel.mdlReader.readSingle();

    this.gridX = this.odysseyModel.mdlReader.readUInt32();
    this.gridY = this.odysseyModel.mdlReader.readUInt32();
    this.spaceType = this.odysseyModel.mdlReader.readUInt32();

    this.updateMode = this.odysseyModel.mdlReader.readChars(32).replace(/\0[\s\S]*$/g,'');
    this.renderMode = this.odysseyModel.mdlReader.readChars(32).replace(/\0[\s\S]*$/g,'');
    this.blendMode = this.odysseyModel.mdlReader.readChars(32).replace(/\0[\s\S]*$/g,'');
    this.textureResRef = this.odysseyModel.mdlReader.readChars(32).replace(/\0[\s\S]*$/g,'');
    this.chunkResRef = this.odysseyModel.mdlReader.readChars(16).replace(/\0[\s\S]*$/g,'');

    this.twoSidedTex = this.odysseyModel.mdlReader.readUInt32();
    this.loop = this.odysseyModel.mdlReader.readUInt32();
    this.renderOrder = this.odysseyModel.mdlReader.readUInt16();
    this.padding1 = this.odysseyModel.mdlReader.readUInt16();

    this.nFlags = this.odysseyModel.mdlReader.readUInt32();

    this.flags.isP2P = (this.nFlags & OdysseyModelEmitterFlag.P2P) == OdysseyModelEmitterFlag.P2P;
    this.flags.isP2PSel = (this.nFlags & OdysseyModelEmitterFlag.P2P_SEL) == OdysseyModelEmitterFlag.P2P_SEL;
    this.flags.affectedByWind = (this.nFlags & OdysseyModelEmitterFlag.AFFECTED_WIND) == OdysseyModelEmitterFlag.AFFECTED_WIND;
    this.flags.isTinted = (this.nFlags & OdysseyModelEmitterFlag.TINTED) == OdysseyModelEmitterFlag.TINTED;
    this.flags.canBounce = (this.nFlags & OdysseyModelEmitterFlag.BOUNCE) == OdysseyModelEmitterFlag.BOUNCE;
    this.flags.isRandom = (this.nFlags & OdysseyModelEmitterFlag.RANDOM) == OdysseyModelEmitterFlag.RANDOM;
    this.flags.canInherit = (this.nFlags & OdysseyModelEmitterFlag.INHERIT) == OdysseyModelEmitterFlag.INHERIT;
    this.flags.canInheritVelocity = (this.nFlags & OdysseyModelEmitterFlag.INHERIT_VEL) == OdysseyModelEmitterFlag.INHERIT_VEL;
    this.flags.canInheritLocal = (this.nFlags & OdysseyModelEmitterFlag.INHERIT_LOCAL) == OdysseyModelEmitterFlag.INHERIT_LOCAL;
    this.flags.canSplat = (this.nFlags & OdysseyModelEmitterFlag.SPLAT) == OdysseyModelEmitterFlag.SPLAT;
    this.flags.canInheritPart = (this.nFlags & OdysseyModelEmitterFlag.INHERIT_PART) == OdysseyModelEmitterFlag.INHERIT_PART;
    this.flags.isDepthTexture = (this.nFlags & OdysseyModelEmitterFlag.DEPTH_TEXTURE) == OdysseyModelEmitterFlag.DEPTH_TEXTURE;

  }

}
