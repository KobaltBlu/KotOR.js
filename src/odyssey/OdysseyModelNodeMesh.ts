import * as THREE from "three";
import { OdysseyModelEngine } from "../enums/odyssey/OdysseyModelEngine";
import { OdysseyModelMDXFlag } from "../enums/odyssey/OdysseyModelMDXFlag";
import { OdysseyModelNodeType } from "../enums/odyssey/OdysseyModelNodeType";
import { IOdysseyArrayDefinition } from "../interface/odyssey/IOdysseyArrayDefinition";
import { OdysseyFace3 } from "../three/odyssey/OdysseyFace3";
import { OdysseyModelNode } from "./OdysseyModelNode";
import type { OdysseyModel } from "./OdysseyModel";
import { OdysseyModelUtility } from "./OdysseyModelUtility";

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
  vertices: any[];
  normals: number[];
  colors: number[];
  tvectors: number[][];
  texCords: any[][];
  tangents: any[][];
  indexArray: any[];
  uvs: any[];
  faces: any[];
  indices: any[];
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
  dirtEnabled: number;
  tslPadding1: number;
  dirtTexture: number;
  dirtCoordSpace: number;
  hideInHolograms: number;
  tslPadding2: number;
  _unknown2: number;
  _totalArea: number;
  _unknown4: number;
  tangent1: { tangents: any[]; bitangents: any[]; normals: any[]; computed: any[]; };
  tangent2: { tangents: any[]; bitangents: any[]; normals: any[]; computed: any[]; };
  tangent3: { tangents: any[]; bitangents: any[]; normals: any[]; computed: any[]; };
  tangent4: { tangents: any[]; bitangents: any[]; normals: any[]; computed: any[]; };
  faceArrayDefinition: IOdysseyArrayDefinition;
  vertexCoordinatesOffset: number;

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

  readBinary(odysseyModel: OdysseyModel){
    super.readBinary(odysseyModel);

    this.vertices = [];
    this.normals = [];
    this.colors = [];
    this.tvectors = [[], [], [], []];
    this.texCords = [[], [], [], []];
    this.tangents = [[], [], [], []];
    this.indexArray = [];
    this.uvs = [];
    this.faces = [];
    this.indices = [];

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

    this.textureMap1 = this.odysseyModel.mdlReader.readChars(32).replace(/\0[\s\S]*$/g,''); //This stores the texture filename
    this.textureMap2 = this.odysseyModel.mdlReader.readChars(32).replace(/\0[\s\S]*$/g,''); //This stores the lightmap filename
    this.textureMap3 = this.odysseyModel.mdlReader.readChars(12).replace(/\0[\s\S]*$/g,''); //This stores a 3rd texture filename (?)
    this.textureMap4 = this.odysseyModel.mdlReader.readChars(12).replace(/\0[\s\S]*$/g,''); //This stores a 4th texture filename (?)

    this.indexCountArrayDef = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader); //IndexCounterArray
    this.vertexLocArrayDef = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader); //vertex_indices_offset

    if (this.vertexLocArrayDef.count > 1)
      throw ("Face offsets offsets count wrong "+ this.vertexLocArrayDef.count);

    this.InvertedCountArrayDef = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader); //MeshInvertedCounterArray
    this.InvertedCountArrayDefDuplicate = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader); //MeshInvertedCounterArray

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
    this.MDXVertexColorsOffset = this.odysseyModel.mdlReader.readUInt32();
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
      this.dirtEnabled = this.odysseyModel.mdlReader.readByte();
      this.tslPadding1 = this.odysseyModel.mdlReader.readByte();
      this.dirtTexture = this.odysseyModel.mdlReader.readUInt16();
      this.dirtCoordSpace = this.odysseyModel.mdlReader.readUInt16();
      this.hideInHolograms = this.odysseyModel.mdlReader.readByte();
      this.tslPadding2 = this.odysseyModel.mdlReader.readByte();
    } 

    this._unknown2 = this.odysseyModel.mdlReader.readUInt16();
    this._totalArea = this.odysseyModel.mdlReader.readSingle();
    this._unknown4 = this.odysseyModel.mdlReader.readUInt32();

    this.MDXNodeDataOffset = this.odysseyModel.mdlReader.readUInt32();
    this.vertexCoordinatesOffset = this.odysseyModel.mdlReader.readUInt32();

    if ((this.verticesCount == 0) || (this.faceArrayDefinition.count == 0))
      return;

    let cachedPosition = this.odysseyModel.mdlReader.position;

    //Tangent1
    if(this.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT1){
      this.tangent1 = {
        tangents: [],
        bitangents: [],
        normals: [],
        computed: []
      };
    }

    //Tangent2
    if(this.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT2){
      this.tangent2 = {
        tangents: [],
        bitangents: [],
        normals: [],
        computed: []
      };
    }

    //Tangent3
    if(this.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT3){
      this.tangent3 = {
        tangents: [],
        bitangents: [],
        normals: [],
        computed: []
      };
    }

    //Tangent4
    if(this.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT4){
      this.tangent4 = {
        tangents: [],
        bitangents: [],
        normals: [],
        computed: []
      };
    }

    for (let i = 0; i < this.verticesCount; i++) {
      // Base Position Offset
      let basePosition = (this.MDXNodeDataOffset + (i * this.MDXDataSize));

      // Vertex
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.VERTEX){
        this.odysseyModel.mdxReader.position = basePosition + this.MDXVertexOffset;
        this.vertices.push(this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle());
      }

      // Normal
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.NORMAL){
        this.odysseyModel.mdxReader.position = basePosition + this.MDXVertexNormalsOffset;
        this.normals.push(this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle());
      }

      // Color
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.COLOR){
        this.odysseyModel.mdxReader.position = basePosition + this.MDXVertexColorsOffset;
        this.colors.push(this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle());
      }
      
      // TexCoords1
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.UV1){
        this.odysseyModel.mdxReader.position = basePosition + this.MDXUVOffset1;
        this.tvectors[0].push(this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle());
        // this.tvectors[1][i] = this.tvectors[0][i];
      }

      // TexCoords2
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.UV2){
        this.odysseyModel.mdxReader.position = basePosition + this.MDXUVOffset2;
        this.tvectors[1].push(this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle());
      }else{
        this.tvectors[1] = this.tvectors[0].slice(0);
      }

      // TexCoords3
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.UV3){
        //TODO
      }

      // TexCoords4
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.UV4){
        //TODO
      }

      //Tangent1
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT1){
        this.odysseyModel.mdxReader.position = basePosition + this.offsetToMdxTangent1;
        this.tangent1.tangents.push(this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle());
        this.tangent1.bitangents.push(this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle());
        this.tangent1.normals.push(this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle());
        //this.computeTangent(this.tangent1, i);
      }

      //Tangent2
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT2){
        this.odysseyModel.mdxReader.position = basePosition + this.offsetToMdxTangent2;
        this.tangent2.tangents.push(this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle());
        this.tangent2.bitangents.push(this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle());
        this.tangent2.normals.push(this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle());
        //this.computeTangent(this.tangent2, i);
      }

      //Tangent3
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT3){
        this.odysseyModel.mdxReader.position = basePosition + this.offsetToMdxTangent3;
        this.tangent3.tangents.push(this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle());
        this.tangent3.bitangents.push(this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle());
        this.tangent3.normals.push(this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle());
        //this.computeTangent(this.tangent3, i);
      }

      //Tangent4
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT4){
        this.odysseyModel.mdxReader.position = basePosition + this.offsetToMdxTangent4;
        this.tangent4.tangents.push(this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle());
        this.tangent4.bitangents.push(this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle());
        this.tangent4.normals.push(this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle(), this.odysseyModel.mdxReader.readSingle());
        //this.computeTangent(this.tangent4, i);
      }

    }

    if(
      this.MDXDataBitmap & OdysseyModelMDXFlag.UV1 && 
      !(this.MDXDataBitmap & OdysseyModelMDXFlag.UV2)
    ){
      this.tvectors[1] = this.tvectors[0];
    }

    if(this.vertexLocArrayDef.count){
      this.odysseyModel.mdlReader.position = this.odysseyModel.fileHeader.modelDataOffset + this.vertexLocArrayDef.offset;
      let offVerts = this.odysseyModel.mdlReader.readUInt32();
      this.odysseyModel.mdlReader.position = this.odysseyModel.fileHeader.modelDataOffset + offVerts;
    }

    if(this.faceArrayDefinition.count){
      this.odysseyModel.mdlReader.position = this.odysseyModel.fileHeader.modelDataOffset + this.faceArrayDefinition.offset;
      for (let i = 0; i < this.faceArrayDefinition.count; i++) {

        this.faces[i] = new OdysseyFace3(0, 0, 0);
        this.faces[i].normal.x = this.odysseyModel.mdlReader.readSingle();
        this.faces[i].normal.y = this.odysseyModel.mdlReader.readSingle();
        this.faces[i].normal.z = this.odysseyModel.mdlReader.readSingle();
        this.faces[i].distance = this.odysseyModel.mdlReader.readSingle();
        this.faces[i].materialId = this.odysseyModel.mdlReader.readUInt32();
        this.faces[i].nAdjacentFaces1 = this.odysseyModel.mdlReader.readUInt16();
        this.faces[i].nAdjacentFaces2 = this.odysseyModel.mdlReader.readUInt16();
        this.faces[i].nAdjacentFaces3 = this.odysseyModel.mdlReader.readUInt16();
        this.faces[i].a = this.odysseyModel.mdlReader.readUInt16();
        this.faces[i].b = this.odysseyModel.mdlReader.readUInt16();
        this.faces[i].c = this.odysseyModel.mdlReader.readUInt16();
        this.faces[i].surfacemat = OdysseyModelUtility.SURFACEMATERIALS[this.faces[i].materialId];

        this.indices.push(this.faces[i].a, this.faces[i].b, this.faces[i].c);

        if(this.MDXDataBitmap & OdysseyModelMDXFlag.UV1)
          this.texCords[0][i] = ([this.tvectors[0][this.faces[i].a], this.tvectors[0][this.faces[i].b], this.tvectors[0][this.faces[i].c]]);
        
        if(this.MDXDataBitmap & OdysseyModelMDXFlag.UV2)
          this.texCords[1][i] = ([this.tvectors[1][this.faces[i].a], this.tvectors[1][this.faces[i].b], this.tvectors[1][this.faces[i].c]]);

      }
    }

    this.odysseyModel.mdlReader.position = cachedPosition;

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
