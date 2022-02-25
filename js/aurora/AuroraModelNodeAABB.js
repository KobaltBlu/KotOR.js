/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AuroraModelNodeAABB
 */

class AuroraModelNodeAABB extends AuroraModelNodeMesh {

  grassFaces = [];

  constructor(parent = undefined){
    super(parent);
    this.type |= AuroraModel.NODETYPE.AABB;
  }

  //----------------//
  // Binary Methods
  //----------------//
  readBinary(auroraModel = undefined){
    super.readBinary(auroraModel);

    let rootNodeOffset = this.auroraModel.mdlReader.ReadUInt32();
    this.rootAABBNode = this.readBinaryAABBNode(rootNodeOffset);

    let face;
    for(let i = 0; i < this.faces.length; i++){
      face = this.faces[i];
      if(face && face.surfacemat){
        //Is this face grassy
        if(face.surfacemat.grass == 1){
          this.grassFaces.push(face);
        }
      }
    }

  }

  readBinaryAABBNode(aabbNodeOffset){
    this.auroraModel.mdlReader.Seek(this.auroraModel.fileHeader.ModelDataOffset + aabbNodeOffset);

    let aabb = {
      type: 'AABB',
      box: new THREE.Box3(
        new THREE.Vector3(this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle()),
        new THREE.Vector3(this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle())
      ),
      leftNodeOffset: this.auroraModel.mdlReader.ReadInt32(),
      rightNodeOffset: this.auroraModel.mdlReader.ReadInt32(),
      faceIdx: this.auroraModel.mdlReader.ReadInt32(),
      mostSignificantPlane: this.auroraModel.mdlReader.ReadInt32(),
      leftNode: undefined,
      rightNode: undefined,
      face: undefined
    };

    if(aabb.leftNodeOffset > 0){
      aabb.leftNode = this.readBinaryAABBNode(aabb.leftNodeOffset);
    }

    if(aabb.rightNodeOffset > 0){
      aabb.rightNode = this.readBinaryAABBNode(aabb.rightNodeOffset);
    }

    if(this.faceIdx > -1){
      aabb.face = node.faces[node.faceIdx];
    }

    return aabb;
  }



}

module.exports = AuroraModelNodeAABB;
