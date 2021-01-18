/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AuroraModelNodeSaber
 */

class AuroraModelNodeSaber extends AuroraModelNodeMesh {

  constructor(parent = undefined){
    super(parent);
    this.type |= AuroraModel.NODETYPE.Saber;

  }

  readBinary(auroraModel = undefined){
    super.readBinary(auroraModel);



  }

}

module.exports = AuroraModelNodeSaber;
