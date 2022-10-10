/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as THREE from "three";
import { OdysseyModel, OdysseyModelNode, OdysseyModelNodeMesh } from ".";
import { OdysseyModelAABBNode } from "../interface/odyssey/OdysseyModelAABBNode";
import { OdysseyModelNodeType } from "../interface/odyssey/OdysseyModelNodeType";

/* @file
 * The OdysseyModelNodeAABB
 */

export class OdysseyModelNodeAABB extends OdysseyModelNodeMesh {

  grassFaces: any[] = [];
  rootAABBNode: OdysseyModelAABBNode;

  constructor(parent: OdysseyModelNode){
    super(parent);
    this.type |= OdysseyModelNodeType.AABB;
  }

  //----------------//
  // Binary Methods
  //----------------//
  readBinary(odysseyModel: OdysseyModel){
    super.readBinary(odysseyModel);

    let rootNodeOffset = this.odysseyModel.mdlReader.ReadUInt32();
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

  readBinaryAABBNode(aabbNodeOffset: number){
    this.odysseyModel.mdlReader.Seek(this.odysseyModel.fileHeader.ModelDataOffset + aabbNodeOffset);

    let aabb: OdysseyModelAABBNode = {
      type: 'AABB',
      box: new THREE.Box3(
        new THREE.Vector3(this.odysseyModel.mdlReader.ReadSingle(), this.odysseyModel.mdlReader.ReadSingle(), this.odysseyModel.mdlReader.ReadSingle()),
        new THREE.Vector3(this.odysseyModel.mdlReader.ReadSingle(), this.odysseyModel.mdlReader.ReadSingle(), this.odysseyModel.mdlReader.ReadSingle())
      ),
      leftNodeOffset: this.odysseyModel.mdlReader.ReadInt32(),
      rightNodeOffset: this.odysseyModel.mdlReader.ReadInt32(),
      faceIdx: this.odysseyModel.mdlReader.ReadInt32(),
      mostSignificantPlane: this.odysseyModel.mdlReader.ReadInt32(),
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

    if(aabb.faceIdx > -1){
      aabb.face = this.faces[aabb.faceIdx];
    }

    return aabb;
  }



}
