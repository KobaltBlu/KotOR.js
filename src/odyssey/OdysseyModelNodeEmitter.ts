/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { OdysseyModel, OdysseyModelNode } from ".";
import { OdysseyModelEmitterFlag } from "../interface/odyssey/OdysseyModelEmitterFlag";
import { OdysseyModelNodeType } from "../interface/odyssey/OdysseyModelNodeType";

/* @file
 * The OdysseyModelNodeEmitter
 */

export class OdysseyModelNodeEmitter extends OdysseyModelNode {
  DeadSpace: number;
  BlastRadius: number;
  BlastLength: number;
  GridX: number;
  GridY: number;
  SpaceType: number;
  Update: string;
  Render: string;
  Blend: string;
  Texture: string;
  Chunk: string;
  TwoSidedTex: number;
  Loop: number;
  RenderOrder: number;
  Padding: number;
  Flags: number;
  isP2P: number;
  isP2PSel: number;
  affectedByWind: number;
  isTinted: number;
  canBounce: number;
  isRandom: number;
  canInherit: number;
  canInheritVelocity: number;
  canInheritLocal: number;
  canSplat: number;
  canInheritPart: number;
  isDepthTexture: number;

  constructor(parent: OdysseyModelNode){
    super(parent);
    this.type |= OdysseyModelNodeType.Emitter;
  }

  readBinary(odysseyModel: OdysseyModel){
    super.readBinary(odysseyModel);

    this.odysseyModel.mdlReader.Skip(8);

    this.DeadSpace = this.odysseyModel.mdlReader.ReadSingle();
    this.BlastRadius = this.odysseyModel.mdlReader.ReadSingle();
    this.BlastLength = this.odysseyModel.mdlReader.ReadSingle();
    this.GridX = this.odysseyModel.mdlReader.ReadUInt32();
    this.GridY = this.odysseyModel.mdlReader.ReadUInt32();
    this.SpaceType = this.odysseyModel.mdlReader.ReadUInt32();

    this.Update = this.odysseyModel.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,'');
    this.Render = this.odysseyModel.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,'');
    this.Blend = this.odysseyModel.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,'');
    this.Texture = this.odysseyModel.mdlReader.ReadChars(64).replace(/\0[\s\S]*$/g,'');
    this.Chunk = this.odysseyModel.mdlReader.ReadChars(16).replace(/\0[\s\S]*$/g,'');

    this.TwoSidedTex = this.odysseyModel.mdlReader.ReadUInt32();
    this.Loop = this.odysseyModel.mdlReader.ReadUInt32();
    this.RenderOrder = this.odysseyModel.mdlReader.ReadUInt16();
    this.Padding = this.odysseyModel.mdlReader.ReadUInt16();

    this.Flags = this.odysseyModel.mdlReader.ReadUInt32();

    this.isP2P = (this.Flags & OdysseyModelEmitterFlag.P2P);
    this.isP2PSel = (this.Flags & OdysseyModelEmitterFlag.P2P_SEL);
    this.affectedByWind = (this.Flags & OdysseyModelEmitterFlag.AFFECTED_WIND);
    this.isTinted = (this.Flags & OdysseyModelEmitterFlag.TINTED);
    this.canBounce = (this.Flags & OdysseyModelEmitterFlag.BOUNCE);
    this.isRandom = (this.Flags & OdysseyModelEmitterFlag.RANDOM);
    this.canInherit = (this.Flags & OdysseyModelEmitterFlag.INHERIT);
    this.canInheritVelocity = (this.Flags & OdysseyModelEmitterFlag.INHERIT_VEL);
    this.canInheritLocal = (this.Flags & OdysseyModelEmitterFlag.INHERIT_LOCAL);
    this.canSplat = (this.Flags & OdysseyModelEmitterFlag.SPLAT);
    this.canInheritPart = (this.Flags & OdysseyModelEmitterFlag.INHERIT_PART);
    this.isDepthTexture = (this.Flags & OdysseyModelEmitterFlag.DEPTH_TEXTURE);

  }

}
