/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as THREE from "three";
import { OdysseyModel, OdysseyModelNode, OdysseyModelNodeMesh } from ".";
import { IOdysseyModelAABBNode } from "../interface/odyssey/IOdysseyModelAABBNode";
import { OdysseyModelNodeType } from "../enums/odyssey/OdysseyModelNodeType";

/* @file
 * The OdysseyModelNodeAABB
 */

export class OdysseyModelNodeAABB extends OdysseyModelNodeMesh {

  grassFaces: any[] = [];
  rootAABBNode: IOdysseyModelAABBNode;

  constructor(parent: OdysseyModelNode){
    super(parent);
    this.type |= OdysseyModelNodeType.AABB;
  }

  //----------------//
  // Binary Methods
  //----------------//
  readBinary(odysseyModel: OdysseyModel){
    super.readBinary(odysseyModel);

    let rootNodeOffset = this.odysseyModel.mdlReader.readUInt32();
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
    this.odysseyModel.mdlReader.seek(this.odysseyModel.fileHeader.modelDataOffset + aabbNodeOffset);

    let aabb: IOdysseyModelAABBNode = {
      type: 'AABB',
      box: new THREE.Box3(
        new THREE.Vector3(this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle()),
        new THREE.Vector3(this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle())
      ),
      leftNodeOffset: this.odysseyModel.mdlReader.readInt32(),
      rightNodeOffset: this.odysseyModel.mdlReader.readInt32(),
      faceIdx: this.odysseyModel.mdlReader.readInt32(),
      mostSignificantPlane: this.odysseyModel.mdlReader.readInt32(),
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
