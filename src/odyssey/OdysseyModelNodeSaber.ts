import { OdysseyModelNodeType } from "../enums/odyssey/OdysseyModelNodeType";
import type { OdysseyModel } from "./OdysseyModel";
import type { OdysseyModelNode } from "./OdysseyModelNode";
import { OdysseyModelNodeMesh } from "./OdysseyModelNodeMesh";

/**
 * OdysseyModelNodeSaber class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelNodeSaber.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyModelNodeSaber extends OdysseyModelNodeMesh {
  offsetToSaberVerts: number;
  offsetToSaberUVs: number;
  offsetToSaberNormals: number;
  invCount1: number;
  invCount2: number;

  constructor(parent: OdysseyModelNode){
    super(parent);
    this.type |= OdysseyModelNodeType.Saber;
  }

  readBinary(odysseyModel: OdysseyModel){
    super.readBinary(odysseyModel);

    this.offsetToSaberVerts = this.odysseyModel.mdlReader.readUInt32();
    this.offsetToSaberUVs = this.odysseyModel.mdlReader.readUInt32();
    this.offsetToSaberNormals = this.odysseyModel.mdlReader.readUInt32();

    this.invCount1 = this.odysseyModel.mdlReader.readUInt32();
    this.invCount2 = this.odysseyModel.mdlReader.readUInt32();

    this.vertices = [];
    this.normals = [];
    this.tvectors[0] = [];
    this.tvectors[1] = [];
    this.indices = [];

    let vertexDataSize = 12;
    let normalDataSize = 12;
    let uvDataSize = 8;

    for(let i = 0; i < 176; i++){
      //SABER Vertices
      this.odysseyModel.mdlReader.position = this.odysseyModel.fileHeader.modelDataOffset + this.offsetToSaberVerts + (vertexDataSize * i);
      this.vertices.push(this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle());

      //SABER Normals
      this.odysseyModel.mdlReader.position = this.odysseyModel.fileHeader.modelDataOffset + this.offsetToSaberNormals + (normalDataSize * i);
      this.normals.push(this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle());

      //SABER UVs
      this.odysseyModel.mdlReader.position = this.odysseyModel.fileHeader.modelDataOffset + this.offsetToSaberUVs + (uvDataSize * i);
      this.tvectors[0].push(this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle());
      // this.tvectors[1][i] = this.tvectors[0][i];
    }

    this.tvectors[1] = this.tvectors[0];

/* 
 *  SABER MESH VERTEX INDICES
 * 
 *  95-----91-----<<<-----11-----7
 *   |      |              |     |
 *  94-----90-----<<<-----10-----6
 *   |      |              |     |
 *   |      |              |     |
 *   |      |              |     |
 *   |      |              |     |
 *   |      |              |     |
 *   |      |              |     |
 *   |      |              |     |
 *   |      |              |     |
 *   |      |              |     |
 *  93-----89-----<<<------9-----5
 *   |      |              |     |
 *  92-----88-----<<<------8-----4
 * 
 */

    this.indices = [];

    let order = [                      //--\\
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23
    ];

    //Build the face indices
    for(let i = 0, len = order.length-1; i < len; i++){
      let f1 = (order[i    ] * 4);
      let f2 = (order[i + 1] * 4);

      this.indices.push(
        f1 + 0, f1 + 1, f2 + 0,
        f1 + 1, f2 + 1, f2 + 0,
        f1 + 1, f1 + 2, f2 + 1,
        f1 + 2, f2 + 2, f2 + 1,
        f1 + 2, f2 + 3, f2 + 2, 
        f1 + 2, f1 + 3, f2 + 3
      );
    }

    /*this.indices = [
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
