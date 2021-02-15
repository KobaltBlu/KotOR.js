/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AuroraModelNodeEmitter
 */

class AuroraModelNodeEmitter extends AuroraModelNode {

  constructor(parent = undefined){
    super(parent);
    this.type |= AuroraModel.NODETYPE.Emitter;
  }

  readBinary(auroraModel = undefined){
    super.readBinary(auroraModel);

    this.auroraModel.mdlReader.Skip(8);

    this.DeadSpace = this.auroraModel.mdlReader.ReadSingle();
    this.BlastRadius = this.auroraModel.mdlReader.ReadSingle();
    this.BlastLength = this.auroraModel.mdlReader.ReadSingle();
    this.GridX = this.auroraModel.mdlReader.ReadUInt32();
    this.GridY = this.auroraModel.mdlReader.ReadUInt32();
    this.SpaceType = this.auroraModel.mdlReader.ReadUInt32();

    this.Update = this.auroraModel.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,'');
    this.Render = this.auroraModel.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,'');
    this.Blend = this.auroraModel.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,'');
    this.Texture = this.auroraModel.mdlReader.ReadChars(64).replace(/\0[\s\S]*$/g,'');
    this.Chunk = this.auroraModel.mdlReader.ReadChars(16).replace(/\0[\s\S]*$/g,'');

    this.TwoSidedTex = this.auroraModel.mdlReader.ReadUInt32();
    this.Loop = this.auroraModel.mdlReader.ReadUInt32();
    this.RenderOrder = this.auroraModel.mdlReader.ReadUInt16();
    this.Padding = this.auroraModel.mdlReader.ReadUInt16();

    this.Flags = this.auroraModel.mdlReader.ReadUInt32();

    this.isP2P = (this.Flags & AuroraModel.EMITTER_FLAGS.P2P);
    this.isP2PSel = (this.Flags & AuroraModel.EMITTER_FLAGS.P2P_SEL);
    this.affectedByWind = (this.Flags & AuroraModel.EMITTER_FLAGS.AFFECTED_WIND);
    this.isTinted = (this.Flags & AuroraModel.EMITTER_FLAGS.TINTED);
    this.canBounce = (this.Flags & AuroraModel.EMITTER_FLAGS.BOUNCE);
    this.isRandom = (this.Flags & AuroraModel.EMITTER_FLAGS.RANDOM);
    this.canInherit = (this.Flags & AuroraModel.EMITTER_FLAGS.INHERIT);
    this.canInheritVelocity = (this.Flags & AuroraModel.EMITTER_FLAGS.INHERIT_VEL);
    this.canInheritLocal = (this.Flags & AuroraModel.EMITTER_FLAGS.INHERIT_LOCAL);
    this.canSplat = (this.Flags & AuroraModel.EMITTER_FLAGS.SPLAT);
    this.canInheritPart = (this.Flags & AuroraModel.EMITTER_FLAGS.INHERIT_PART);
    this.isDepthTexture = (this.Flags & AuroraModel.EMITTER_FLAGS.DEPTH_TEXTURE);

  }

}
module.exports = AuroraModelNodeEmitter;
