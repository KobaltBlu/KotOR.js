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
 *  SABER MESH VERTEX INDICES
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
 */

    this.indicies = [];

    let order = [                      //--\\
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23
    ];

    for(let i = 0, len = order.length-1; i < len; i++){
      let f1 = (order[i    ] * 4);
      let f2 = (order[i + 1] * 4);

      this.indicies.push(
        f1 + 0, f1 + 1, f2 + 0,
        f1 + 1, f2 + 1, f2 + 0,
        f1 + 1, f1 + 2, f2 + 1,
        f1 + 2, f2 + 2, f2 + 1,
        f1 + 2, f2 + 3, f2 + 2, 
        f1 + 2, f1 + 3, f2 + 3
      );
    }

    /*this.indicies = [
      //RIGHT SIDE
      0, 1, 4, 1, 5, 4,
      1, 2, 5, 2, 6, 5,
      2, 7, 6, 2, 3, 7,

      //LEFT SIDE
      92,93,88,93,89,88,
      93,94,89,94,90,89,
      94,95,90,95,91,90
    ];*/

  }

}

module.exports = AuroraModelNodeSaber;
