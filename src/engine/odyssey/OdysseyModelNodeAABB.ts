import * as THREE from "three";
import { IOdysseyModelAABBNode } from "@engine/interface/odyssey/IOdysseyModelAABBNode";
import { OdysseyModelNodeType } from "@core/enums/odyssey/OdysseyModelNodeType";
import { OdysseyModelNodeMesh } from "@engine/odyssey/OdysseyModelNodeMesh";
import type { OdysseyModelNode } from "@engine/odyssey/OdysseyModelNode";
import type { OdysseyModel } from "@engine/odyssey/OdysseyModel";
import type { OdysseyFace3 } from "@engine/render/three/odyssey/OdysseyFace3";
import { OdysseyModelUtility } from "@engine/odyssey/OdysseyModelUtility";

/**
 * OdysseyModelNodeAABB class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelNodeAABB.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyModelNodeAABB extends OdysseyModelNodeMesh {

  private _grassFaces: OdysseyFace3[] | undefined;
  private _grassFaceIndices: number[] = [];
  rootAABBNode: IOdysseyModelAABBNode;

  constructor(parent: OdysseyModelNode){
    super(parent);
    this.type |= OdysseyModelNodeType.AABB;
  }

  /** Lazy grass faces for {@link resolveGrassFaces}; built from typed face materials. */
  get grassFaces(): OdysseyFace3[] {
    if (!this._grassFaces) {
      this._grassFaces = [];
      if (this._grassFaceIndices.length) {
        const faces = this.faces;
        for (let i = 0; i < this._grassFaceIndices.length; i++) {
          const face = faces[this._grassFaceIndices[i]];
          if (face) this._grassFaces.push(face);
        }
      } else {
        for (const face of this.faces) {
          if (face?.surfacemat?.grass) {
            this._grassFaces.push(face);
          }
        }
      }
    }
    return this._grassFaces;
  }

  set grassFaces(value: OdysseyFace3[]) {
    this._grassFaces = value ?? [];
  }

  //----------------//
  // Binary Methods
  //----------------//
  readBinary(odysseyModel: OdysseyModel){
    super.readBinary(odysseyModel);

    let rootNodeOffset = this.odysseyModel.mdlReader.readUInt32();
    this.rootAABBNode = this.readBinaryAABBNode(rootNodeOffset);

    this._grassFaceIndices = [];
    this._grassFaces = undefined;
    const count = this.faceCount | 0;
    for (let i = 0; i < count; i++) {
      const matIdx = this.faceMaterialIndices[i];
      const surfacemat = OdysseyModelUtility.SURFACEMATERIALS[matIdx];
      if (surfacemat?.grass) {
        this._grassFaceIndices.push(i);
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

    // Face object resolved lazily via faceIdx when consumers need OdysseyFace3.
    return aabb;
  }

}
