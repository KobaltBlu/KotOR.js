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

    console.log('SABER', this.offsetToSaberVerts, this.offsetToSaberUVs, this.offsetToSaberNormals, this.invCount1, this.invCount2);

    for(let i = 0; i < 176; i++){
      //SABER Verticies
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

    this.indicies = [
      0, 1, 4, 1, 4, 5,
      1, 2, 5, 5, 2, 6,
      2, 7, 6, 2, 3, 7,
      92,93,0, 93,1, 0,
      93,94,1, 94,2, 1,
      94,95,2, 95,3, 2
    ];

  }

}

module.exports = AuroraModelNodeSaber;
