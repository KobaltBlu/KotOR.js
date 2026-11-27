import * as THREE from "three";
import { OdysseyModelEngine } from "@core/enums/odyssey/OdysseyModelEngine";
import { OdysseyModelMDXFlag } from "@core/enums/odyssey/OdysseyModelMDXFlag";
import { OdysseyModelNodeType } from "@core/enums/odyssey/OdysseyModelNodeType";
import { IOdysseyArrayDefinition } from "@core/interface/odyssey/IOdysseyArrayDefinition";
import { OdysseyFace3 } from "@engine/render/three/odyssey/OdysseyFace3";
import { OdysseyModelNode } from "@engine/odyssey/OdysseyModelNode";
import type { OdysseyModel } from "@engine/odyssey/OdysseyModel";
import { OdysseyModelUtility } from "@engine/odyssey/OdysseyModelUtility";
import {
  readMdxInterleavedFloats,
  readMdxTangentBlock,
} from "@engine/odyssey/binary/OdysseyModelMdxAttributeReader";
import {
  initMeshGeometryDefaults,
  populateMeshDirtFields,
  populateMeshFaces,
  populateMeshVertexAttributes,
  type DecodedMeshFaces,
} from "@engine/odyssey/domain/populateMeshFromDecoded";

const mdlStringCleaner = (str: string = ''): string => {
  const cleaned = str.replace(/\0[\s\S]*$/g,'').toLowerCase().trim();
  return cleaned != 'null' ? cleaned : '';
};

/**
 * OdysseyModelNodeMesh class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelNodeMesh.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyModelNodeMesh extends OdysseyModelNode {
  vertices: Float32Array | number[];
  normals: Float32Array | number[];
  colors: Float32Array | number[];
  /** Vertex color index list (ASCII / MDLedit); optional. */
  colorIndices?: number[];
  tvectors: (Float32Array | number[])[];
  texCords: any[][];
  tangents: any[][];
  indexArray: any[];
  uvs: any[];
  /** Typed face storage from binary parse (indices / materials / planes). */
  faceCount: number = 0;
  faceIndices: Uint16Array;
  faceNormals: Float32Array;
  faceDistances: Float32Array;
  faceMaterialIndices: Uint32Array;
  faceAdjacent: Int16Array;
  faceSmoothingGroups?: Uint32Array;
  private _faces: OdysseyFace3[] | undefined;
  indices: Uint32Array | number[];
  functionPointer0: number;
  functionPointer1: number;
  boundingBox: { min: THREE.Vector3; max: THREE.Vector3; };
  radius: number;
  average: THREE.Vector3;
  diffuse: THREE.Color;
  ambient: THREE.Color;
  transparencyHint: boolean;
  textureMap1: string;
  textureMap2: string;
  textureMap3: string;
  textureMap4: string;
  indexCountArrayDef: IOdysseyArrayDefinition;
  vertexLocArrayDef: IOdysseyArrayDefinition;
  InvertedCountArrayDef: IOdysseyArrayDefinition;
  InvertedCountArrayDefDuplicate: IOdysseyArrayDefinition;
  saberBytes: number[];
  nAnimateUV: boolean;
  fUVDirectionX: number;
  fUVDirectionY: number;
  fUVJitter: number;
  fUVJitterSpeed: number;
  verticesCount: number;
  textureCount: number;
  hasLightmap: boolean;
  rotateTexture: boolean;
  backgroundGeometry: boolean;
  flagShadow: boolean;
  beaming: boolean;
  flagRender: boolean;
  dirtEnabled: number = 0;
  tslPadding1: number = 0;
  dirtTexture: number = 1;
  dirtCoordSpace: number = 1;
  hideInHolograms: number = 0;
  tslPadding2: number = 0;
  _unknown2: number;
  _totalArea: number;
  _unknown4: number;
  tangent1: { tangents: Float32Array | number[]; bitangents: Float32Array | number[]; normals: Float32Array | number[]; computed: any[]; };
  tangent2: { tangents: Float32Array | number[]; bitangents: Float32Array | number[]; normals: Float32Array | number[]; computed: any[]; };
  tangent3: { tangents: Float32Array | number[]; bitangents: Float32Array | number[]; normals: Float32Array | number[]; computed: any[]; };
  tangent4: { tangents: Float32Array | number[]; bitangents: Float32Array | number[]; normals: Float32Array | number[]; computed: any[]; };
  faceArrayDefinition: IOdysseyArrayDefinition;
  vertexCoordinatesOffset: number;

  /** Mesh inverted counter from MDL (Aurora `inv_count`). */
  meshInvertedCounter: number = 0;

  //MDX
  MDXDataSize: number;
  MDXDataBitmap: number;
  MDXNodeDataOffset: number;
  MDXVertexOffset: number;
  MDXVertexNormalsOffset: number;
  MDXVertexColorsOffset: number;
  MDXUVOffset1: number;
  MDXUVOffset2: number;
  MDXUVOffset3: number;
  MDXUVOffset4: number;
  offsetToMdxTangent1: number;
  offsetToMdxTangent2: number;
  offsetToMdxTangent3: number;
  offsetToMdxTangent4: number;

  constructor(parent: OdysseyModelNode){
    super(parent);
    this.type |= OdysseyModelNodeType.Mesh;
  }

  /**
   * Lazy OdysseyFace3[] for ASCII export / AABB grass / THREE walkmesh display.
   * Binary parse stores typed arrays only; color is left unset (THREE factory paints).
   */
  get faces(): OdysseyFace3[] {
    if (!this._faces) {
      this._faces = this.buildFacesFromTyped();
    }
    return this._faces;
  }

  set faces(value: OdysseyFace3[]) {
    this._faces = value ?? [];
    this.faceCount = this._faces.length;
  }

  /** Drop lazy OdysseyFace3 cache after typed face arrays change. */
  clearFaceCache(): void {
    this._faces = undefined;
  }

  private buildFacesFromTyped(): OdysseyFace3[] {
    const count = this.faceCount | 0;
    if (count <= 0 || !this.faceIndices) {
      return [];
    }
    const out: OdysseyFace3[] = new Array(count);
    for (let i = 0; i < count; i++) {
      const a = this.faceIndices[i * 3];
      const b = this.faceIndices[i * 3 + 1];
      const c = this.faceIndices[i * 3 + 2];
      const face = new OdysseyFace3(a, b, c);
      face.normal.x = this.faceNormals[i * 3];
      face.normal.y = this.faceNormals[i * 3 + 1];
      face.normal.z = this.faceNormals[i * 3 + 2];
      face.distance = this.faceDistances[i];
      face.materialIndex = this.faceMaterialIndices[i];
      face.adjacent[0] = this.faceAdjacent[i * 3];
      face.adjacent[1] = this.faceAdjacent[i * 3 + 1];
      face.adjacent[2] = this.faceAdjacent[i * 3 + 2];
      face.surfacemat = OdysseyModelUtility.SURFACEMATERIALS[face.materialIndex];
      if (this.faceSmoothingGroups) {
        face.smoothingGroup = this.faceSmoothingGroups[i];
      }
      out[i] = face;
    }
    return out;
  }

  readBinary(odysseyModel: OdysseyModel){
    super.readBinary(odysseyModel);

    initMeshGeometryDefaults(this);

    this.functionPointer0 = this.odysseyModel.mdlReader.readUInt32();
    this.functionPointer1 = this.odysseyModel.mdlReader.readUInt32();

    this.faceArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);

    this.boundingBox = {
      min: new THREE.Vector3(this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle()),
      max: new THREE.Vector3(this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle())
    };

    this.radius = this.odysseyModel.mdlReader.readSingle();

    this.average = new THREE.Vector3(this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle());
    this.diffuse = new THREE.Color(this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle());
    this.ambient = new THREE.Color(this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle(), this.odysseyModel.mdlReader.readSingle());

    this.transparencyHint = this.odysseyModel.mdlReader.readUInt32() ? true : false;

    this.textureMap1 = mdlStringCleaner(this.odysseyModel.mdlReader.readChars(32));
    this.textureMap2 = mdlStringCleaner(this.odysseyModel.mdlReader.readChars(32));
    this.textureMap3 = mdlStringCleaner(this.odysseyModel.mdlReader.readChars(12));
    this.textureMap4 = mdlStringCleaner(this.odysseyModel.mdlReader.readChars(12));

    this.indexCountArrayDef = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);
    this.vertexLocArrayDef = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);

    if (this.vertexLocArrayDef.count > 1)
      throw ("Face offsets offsets count wrong "+ this.vertexLocArrayDef.count);

    this.InvertedCountArrayDef = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);
    this.InvertedCountArrayDefDuplicate = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);

    this.saberBytes = [
      this.odysseyModel.mdlReader.readByte(),
      this.odysseyModel.mdlReader.readByte(),
      this.odysseyModel.mdlReader.readByte(),
      this.odysseyModel.mdlReader.readByte(),
      this.odysseyModel.mdlReader.readByte(),
      this.odysseyModel.mdlReader.readByte(),
      this.odysseyModel.mdlReader.readByte(),
      this.odysseyModel.mdlReader.readByte()
    ];

    this.nAnimateUV = this.odysseyModel.mdlReader.readUInt32() ? true : false;
    this.fUVDirectionX = this.odysseyModel.mdlReader.readSingle();
    this.fUVDirectionY = this.odysseyModel.mdlReader.readSingle();
    this.fUVJitter = this.odysseyModel.mdlReader.readSingle();
    this.fUVJitterSpeed = this.odysseyModel.mdlReader.readSingle();

    this.MDXDataSize = this.odysseyModel.mdlReader.readUInt32();
    this.MDXDataBitmap = this.odysseyModel.mdlReader.readUInt32();

    this.MDXVertexOffset = this.odysseyModel.mdlReader.readUInt32();
    this.MDXVertexNormalsOffset = this.odysseyModel.mdlReader.readUInt32();
    this.MDXVertexColorsOffset = this.odysseyModel.mdlReader.readInt32();
    this.MDXUVOffset1 = this.odysseyModel.mdlReader.readInt32();
    this.MDXUVOffset2 = this.odysseyModel.mdlReader.readInt32();
    this.MDXUVOffset3 = this.odysseyModel.mdlReader.readInt32();
    this.MDXUVOffset4 = this.odysseyModel.mdlReader.readInt32();

    this.offsetToMdxTangent1 = this.odysseyModel.mdlReader.readInt32();
    this.offsetToMdxTangent2 = this.odysseyModel.mdlReader.readInt32();
    this.offsetToMdxTangent3 = this.odysseyModel.mdlReader.readInt32();
    this.offsetToMdxTangent4 = this.odysseyModel.mdlReader.readInt32();

    this.verticesCount = this.odysseyModel.mdlReader.readUInt16();
    this.textureCount = this.odysseyModel.mdlReader.readUInt16();

    this.hasLightmap = this.odysseyModel.mdlReader.readByte() ? true : false;
    this.rotateTexture = this.odysseyModel.mdlReader.readByte() ? true : false;
    this.backgroundGeometry = this.odysseyModel.mdlReader.readByte() ? true : false;
    this.flagShadow = this.odysseyModel.mdlReader.readByte() ? true : false;
    this.beaming = this.odysseyModel.mdlReader.readByte() ? true : false;
    this.flagRender = this.odysseyModel.mdlReader.readByte() ? true : false;

    if (this.odysseyModel.engine == OdysseyModelEngine.K2){
      const dirtEnabled = this.odysseyModel.mdlReader.readByte();
      this.tslPadding1 = this.odysseyModel.mdlReader.readByte();
      const dirtTexture = this.odysseyModel.mdlReader.readUInt16();
      const dirtCoordSpace = this.odysseyModel.mdlReader.readUInt16();
      const hideInHolograms = this.odysseyModel.mdlReader.readByte();
      this.tslPadding2 = this.odysseyModel.mdlReader.readByte();
      populateMeshDirtFields(this, {
        dirtEnabled,
        dirtTexture,
        dirtCoordSpace,
        hideInHolograms,
      });
    }

    this._unknown2 = this.odysseyModel.mdlReader.readUInt16();
    this._totalArea = this.odysseyModel.mdlReader.readSingle();
    this._unknown4 = this.odysseyModel.mdlReader.readUInt32();

    this.MDXNodeDataOffset = this.odysseyModel.mdlReader.readUInt32();
    this.vertexCoordinatesOffset = this.odysseyModel.mdlReader.readUInt32();

    if ((this.verticesCount == 0) || (this.faceArrayDefinition.count == 0))
      return;

    let cachedPosition = this.odysseyModel.mdlReader.position;

    this.readMdxVertexAttributes();

    if(this.vertexLocArrayDef.count){
      this.odysseyModel.mdlReader.position = this.odysseyModel.fileHeader.modelDataOffset + this.vertexLocArrayDef.offset;
      let offVerts = this.odysseyModel.mdlReader.readUInt32();
      this.odysseyModel.mdlReader.position = this.odysseyModel.fileHeader.modelDataOffset + offVerts;
    }

    if(this.faceArrayDefinition.count){
      this.readTypedFaces();
    }

    if (this.InvertedCountArrayDef?.count > 0) {
      this.odysseyModel.mdlReader.seek(this.odysseyModel.fileHeader.modelDataOffset + this.InvertedCountArrayDef.offset);
      this.meshInvertedCounter = this.odysseyModel.mdlReader.readUInt32();
    }

    this.odysseyModel.mdlReader.position = cachedPosition;

  }

  private readMdxVertexAttributes(): void {
    const mdxBuffer = this.odysseyModel.mdxReader.buffer;
    const stride = this.MDXDataSize | 0;
    const n = this.verticesCount | 0;
    const base = this.MDXNodeDataOffset | 0;

    const attrs: {
      vertices?: Float32Array;
      normals?: Float32Array;
      colors?: Float32Array;
      tvectors: (Float32Array | undefined)[];
    } = { tvectors: [] };

    if (this.MDXDataBitmap & OdysseyModelMDXFlag.VERTEX) {
      attrs.vertices = readMdxInterleavedFloats(mdxBuffer, base, stride, this.MDXVertexOffset, n, 3);
    }

    if (this.MDXDataBitmap & OdysseyModelMDXFlag.NORMAL) {
      attrs.normals = readMdxInterleavedFloats(mdxBuffer, base, stride, this.MDXVertexNormalsOffset, n, 3);
    }

    if (this.MDXVertexColorsOffset >= 0) {
      attrs.colors = readMdxInterleavedFloats(mdxBuffer, base, stride, this.MDXVertexColorsOffset, n, 3);
    }

    if (this.MDXDataBitmap & OdysseyModelMDXFlag.UV1) {
      attrs.tvectors[0] = readMdxInterleavedFloats(mdxBuffer, base, stride, this.MDXUVOffset1, n, 2);
    }

    if (this.MDXDataBitmap & OdysseyModelMDXFlag.UV2) {
      attrs.tvectors[1] = readMdxInterleavedFloats(mdxBuffer, base, stride, this.MDXUVOffset2, n, 2);
    } else if (attrs.tvectors[0]) {
      // Copy so uv/uv1 BufferAttributes never share one ArrayBuffer.
      attrs.tvectors[1] = new Float32Array(attrs.tvectors[0]);
    }

    populateMeshVertexAttributes(this, attrs);

    if (this.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT1) {
      const block = readMdxTangentBlock(mdxBuffer, base, stride, this.offsetToMdxTangent1, n);
      this.tangent1 = { ...block, computed: [] };
    }
    if (this.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT2) {
      const block = readMdxTangentBlock(mdxBuffer, base, stride, this.offsetToMdxTangent2, n);
      this.tangent2 = { ...block, computed: [] };
    }
    if (this.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT3) {
      const block = readMdxTangentBlock(mdxBuffer, base, stride, this.offsetToMdxTangent3, n);
      this.tangent3 = { ...block, computed: [] };
    }
    if (this.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT4) {
      const block = readMdxTangentBlock(mdxBuffer, base, stride, this.offsetToMdxTangent4, n);
      this.tangent4 = { ...block, computed: [] };
    }
  }

  private readTypedFaces(): void {
    const count = this.faceArrayDefinition.count;
    const decoded: DecodedMeshFaces = {
      faceCount: count,
      faceNormals: new Float32Array(count * 3),
      faceDistances: new Float32Array(count),
      faceMaterialIndices: new Uint32Array(count),
      faceAdjacent: new Int16Array(count * 3),
      faceIndices: new Uint16Array(count * 3),
      indices: new Uint32Array(count * 3),
    };

    this.odysseyModel.mdlReader.position =
      this.odysseyModel.fileHeader.modelDataOffset + this.faceArrayDefinition.offset;

    for (let i = 0; i < count; i++) {
      decoded.faceNormals[i * 3] = this.odysseyModel.mdlReader.readSingle();
      decoded.faceNormals[i * 3 + 1] = this.odysseyModel.mdlReader.readSingle();
      decoded.faceNormals[i * 3 + 2] = this.odysseyModel.mdlReader.readSingle();
      decoded.faceDistances[i] = this.odysseyModel.mdlReader.readSingle();
      decoded.faceMaterialIndices[i] = this.odysseyModel.mdlReader.readUInt32();
      decoded.faceAdjacent[i * 3] = this.odysseyModel.mdlReader.readInt16();
      decoded.faceAdjacent[i * 3 + 1] = this.odysseyModel.mdlReader.readInt16();
      decoded.faceAdjacent[i * 3 + 2] = this.odysseyModel.mdlReader.readInt16();
      const a = this.odysseyModel.mdlReader.readUInt16();
      const b = this.odysseyModel.mdlReader.readUInt16();
      const c = this.odysseyModel.mdlReader.readUInt16();
      decoded.faceIndices[i * 3] = a;
      decoded.faceIndices[i * 3 + 1] = b;
      decoded.faceIndices[i * 3 + 2] = c;
      decoded.indices![i * 3] = a;
      decoded.indices![i * 3 + 1] = b;
      decoded.indices![i * 3 + 2] = c;
    }

    if (this.odysseyModel.modelHeader.smoothingGroupsInFile && count > 0) {
      decoded.faceSmoothingGroups = new Uint32Array(count);
      for (let i = 0; i < count; i++) {
        decoded.faceSmoothingGroups[i] = this.odysseyModel.mdlReader.readUInt32();
      }
    }

    populateMeshFaces(this, decoded);
  }

  computeTangent(tangentObject: any, index: number){
    let n = new THREE.Vector3().fromArray(tangentObject.normals, index * 3);
    let n2 = n.clone();

    let t = new THREE.Vector3().fromArray(tangentObject.tangents, index * 3);
    let t2 = new THREE.Vector3().fromArray(tangentObject.bitangents, index * 3);
    let tmp = new THREE.Vector3();
    let tmp2 = new THREE.Vector3();

    // Gram-Schmidt orthogonalize

    tmp.copy( t );
    tmp.sub( n.multiplyScalar( n.dot( t ) ) ).normalize();

    // Calculate handedness

    tmp2.crossVectors( n2, t );
    let test = tmp2.dot( t2 );
    let w = ( test < 0.0 ) ? - 1.0 : 1.0;

    tangentObject.computed[(index * 4) + 0] = tmp.x;
    tangentObject.computed[(index * 4) + 1] = tmp.y;
    tangentObject.computed[(index * 4) + 2] = tmp.z;
    tangentObject.computed[(index * 4) + 3] = w;
  }

}
