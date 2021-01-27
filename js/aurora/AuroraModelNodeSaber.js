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

    this.offsetToSaberVerts = this.auroraModel.mdlReader.ReadUInt32();
    this.offsetToSaberUVs = this.auroraModel.mdlReader.ReadUInt32();
    this.offsetToSaberNormals = this.auroraModel.mdlReader.ReadUInt32();

    this.invCount1 = this.auroraModel.mdlReader.ReadUInt32();
    this.invCount2 = this.auroraModel.mdlReader.ReadUInt32();

    this.vertices = [];
    this.normals = [];
    this.tvectors[0] = [];
    this.tvectors[1] = [];
    this.indicies = [];

    for(let i = 0; i < 176; i++){
      //SABER Vertices
      this.auroraModel.mdlReader.position = this.auroraModel.fileHeader.ModelDataOffset + this.offsetToSaberVerts + ((4 * 3) * i);
      this.vertices.push(this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle());

      //SABER Normals
      this.auroraModel.mdlReader.position = this.auroraModel.fileHeader.ModelDataOffset + this.offsetToSaberNormals + ((4 * 3) * i);
      this.normals[i] = new THREE.Vector3(this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle());

      //SABER UVs
      this.auroraModel.mdlReader.position = this.auroraModel.fileHeader.ModelDataOffset + this.offsetToSaberUVs + ((4 * 2) * i);
      this.tvectors[0][i] = (new THREE.Vector2(this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle()));
      this.tvectors[1][i] = this.tvectors[0][i];
    }

/* 
 *    SABER MESH VERTEX INDICES
 *
 *  - Incompelete implementation.
 *  - 8-87 should be part of the right sides core that is stretched while swinging
 *  - 96-176 should be part of the left side of the core that is stretched while swinging
 *  
 * 
 *  95-----91---3-----7
 *   |      |   |     |
 *  94-----90---2-----6
 *   |      |   |     |
 *   |      |   |     |
 *   |      |   |     |
 *   |      |   |     |
 *   |      |   |     |
 *   |      |   |     |
 *   |      |   |     |
 *   |      |   |     |
 *   |      |   |     |
 *  93-----89---1-----5
 *   |      |   |     |
 *  92-----88---0-----4
 * 
 * 
 */

    this.indicies = [
      //RIGHT SIDE
      0, 1, 4, 1, 5, 4,
      1, 2, 5, 2, 6, 5,
      2, 7, 6, 2, 3, 7,

      //LEFT SIDE
      92,93,88,93,89,88,
      93,94,89,94,90,89,
      94,95,90,95,91,90
    ];

  }

}

module.exports = AuroraModelNodeSaber;
