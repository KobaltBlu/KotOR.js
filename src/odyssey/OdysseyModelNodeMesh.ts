/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as THREE from "three";
import { OdysseyModel, OdysseyModelNode, OdysseyWalkMesh } from ".";
import { OdysseyModelMDXFlag } from "../interface/odyssey/OdysseyModelMDXFlag";
import { OdysseyModelNodeType } from "../interface/odyssey/OdysseyModelNodeType";
import { OdysseyFace3 } from "../three/odyssey";

/* @file
 * The OdysseyModelNodeMesh
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
  FaceArrayOffset: number;
  FaceArrayCount: number;
  boundingBox: { min: THREE.Vector3; max: THREE.Vector3; };
  Radius: number;
  PointsAverage: THREE.Vector3;
  Diffuse: THREE.Color;
  Ambient: THREE.Color;
  Transparent: boolean;
  TextureMap1: string;
  TextureMap2: string;
  TextureMap3: string;
  TextureMap4: string;
  IndexCountArrayDef: { offset: number; count: number; count2: number; };
  VertexLocArrayDef: { offset: number; count: number; count2: number; };
  InvertedCountArrayDef: { offset: number; count: number; count2: number; };
  InvertedCountArrayDefDuplicate: { offset: number; count: number; count2: number; };
  saberBytes: number[];
  nAnimateUV: boolean;
  fUVDirectionX: number;
  fUVDirectionY: number;
  fUVJitter: number;
  fUVJitterSpeed: number;
  MDXDataSize: number;
  MDXDataBitmap: number;
  VerticiesCount: number;
  TextureCount: number;
  HasLightmap: boolean;
  RotateTexture: boolean;
  BackgroundGeometry: boolean;
  FlagShadow: boolean;
  Beaming: boolean;
  FlagRender: boolean;
  DirtEnabled: number;
  tslPadding1: number;
  DirtTexture: number;
  DirtCoordSpace: number;
  HideInHolograms: number;
  tslPadding2: number;
  _Unknown2: number;
  _TotalArea: number;
  _Unknown4: number;
  _mdxNodeDataOffset: number;
  tangent1: { tangents: any[]; bitangents: any[]; normals: any[]; computed: any[]; };
  tangent2: { tangents: any[]; bitangents: any[]; normals: any[]; computed: any[]; };
  tangent3: { tangents: any[]; bitangents: any[]; normals: any[]; computed: any[]; };
  tangent4: { tangents: any[]; bitangents: any[]; normals: any[]; computed: any[]; };

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

    this.functionPointer0 = this.odysseyModel.mdlReader.ReadUInt32();
    this.functionPointer1 = this.odysseyModel.mdlReader.ReadUInt32();

    let _faceArrDef = OdysseyModel.ReadArrayDefinition(this.odysseyModel.mdlReader);

    this.FaceArrayOffset = _faceArrDef.offset;
    this.FaceArrayCount = _faceArrDef.count;

    this.boundingBox = {
      min: new THREE.Vector3(this.odysseyModel.mdlReader.ReadSingle(), this.odysseyModel.mdlReader.ReadSingle(), this.odysseyModel.mdlReader.ReadSingle()),
      max: new THREE.Vector3(this.odysseyModel.mdlReader.ReadSingle(), this.odysseyModel.mdlReader.ReadSingle(), this.odysseyModel.mdlReader.ReadSingle())
    };

    this.Radius = this.odysseyModel.mdlReader.ReadSingle();

    this.PointsAverage = new THREE.Vector3(this.odysseyModel.mdlReader.ReadSingle(), this.odysseyModel.mdlReader.ReadSingle(), this.odysseyModel.mdlReader.ReadSingle());
    this.Diffuse = new THREE.Color(this.odysseyModel.mdlReader.ReadSingle(), this.odysseyModel.mdlReader.ReadSingle(), this.odysseyModel.mdlReader.ReadSingle());
    this.Ambient = new THREE.Color(this.odysseyModel.mdlReader.ReadSingle(), this.odysseyModel.mdlReader.ReadSingle(), this.odysseyModel.mdlReader.ReadSingle());

    this.Transparent = this.odysseyModel.mdlReader.ReadUInt32() ? true : false;

    this.TextureMap1 = this.odysseyModel.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,''); //This stores the texture filename
    this.TextureMap2 = this.odysseyModel.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,''); //This stores the lightmap filename
    this.TextureMap3 = this.odysseyModel.mdlReader.ReadChars(12).replace(/\0[\s\S]*$/g,''); //This stores a 3rd texture filename (?)
    this.TextureMap4 = this.odysseyModel.mdlReader.ReadChars(12).replace(/\0[\s\S]*$/g,''); //This stores a 4th texture filename (?)

    this.IndexCountArrayDef = OdysseyModel.ReadArrayDefinition(this.odysseyModel.mdlReader); //IndexCounterArray
    this.VertexLocArrayDef = OdysseyModel.ReadArrayDefinition(this.odysseyModel.mdlReader); //vertex_indices_offset

    if (this.VertexLocArrayDef.count > 1)
      throw ("Face offsets offsets count wrong "+ this.VertexLocArrayDef.count);

    this.InvertedCountArrayDef = OdysseyModel.ReadArrayDefinition(this.odysseyModel.mdlReader); //MeshInvertedCounterArray
    this.InvertedCountArrayDefDuplicate = OdysseyModel.ReadArrayDefinition(this.odysseyModel.mdlReader); //MeshInvertedCounterArray

    this.saberBytes = [
      this.odysseyModel.mdlReader.ReadByte(),
      this.odysseyModel.mdlReader.ReadByte(),
      this.odysseyModel.mdlReader.ReadByte(),
      this.odysseyModel.mdlReader.ReadByte(),
      this.odysseyModel.mdlReader.ReadByte(),
      this.odysseyModel.mdlReader.ReadByte(),
      this.odysseyModel.mdlReader.ReadByte(),
      this.odysseyModel.mdlReader.ReadByte()
    ];

    this.nAnimateUV = this.odysseyModel.mdlReader.ReadUInt32() ? true : false;
    this.fUVDirectionX = this.odysseyModel.mdlReader.ReadSingle();
    this.fUVDirectionY = this.odysseyModel.mdlReader.ReadSingle();
    this.fUVJitter = this.odysseyModel.mdlReader.ReadSingle();
    this.fUVJitterSpeed = this.odysseyModel.mdlReader.ReadSingle();

    this.MDXDataSize = this.odysseyModel.mdlReader.ReadUInt32();
    this.MDXDataBitmap = this.odysseyModel.mdlReader.ReadUInt32();

    let MDXVertexOffset = this.odysseyModel.mdlReader.ReadUInt32();
    let MDXVertexNormalsOffset = this.odysseyModel.mdlReader.ReadUInt32();
    let MDXVertexColorsOffset = this.odysseyModel.mdlReader.ReadUInt32();
    let MDXUVOffset1 = this.odysseyModel.mdlReader.ReadInt32();
    let MDXUVOffset2 = this.odysseyModel.mdlReader.ReadInt32();
    let MDXUVOffset3 = this.odysseyModel.mdlReader.ReadInt32();
    let MDXUVOffset4 = this.odysseyModel.mdlReader.ReadInt32();

    let OffsetToMdxTangent1 = this.odysseyModel.mdlReader.ReadInt32();
    let OffsetToMdxTangent2 = this.odysseyModel.mdlReader.ReadInt32();
    let OffsetToMdxTangent3 = this.odysseyModel.mdlReader.ReadInt32();
    let OffsetToMdxTangent4 = this.odysseyModel.mdlReader.ReadInt32();

    this.VerticiesCount = this.odysseyModel.mdlReader.ReadUInt16();
    this.TextureCount = this.odysseyModel.mdlReader.ReadUInt16();

    this.HasLightmap = this.odysseyModel.mdlReader.ReadByte() ? true : false;
    this.RotateTexture = this.odysseyModel.mdlReader.ReadByte() ? true : false;
    this.BackgroundGeometry = this.odysseyModel.mdlReader.ReadByte() ? true : false;
    this.FlagShadow = this.odysseyModel.mdlReader.ReadByte() ? true : false;
    this.Beaming = this.odysseyModel.mdlReader.ReadByte() ? true : false;
    this.FlagRender = this.odysseyModel.mdlReader.ReadByte() ? true : false;

    if (this.odysseyModel.engine == OdysseyModel.ENGINE.K2){
      this.DirtEnabled = this.odysseyModel.mdlReader.ReadByte();
      this.tslPadding1 = this.odysseyModel.mdlReader.ReadByte();
      this.DirtTexture = this.odysseyModel.mdlReader.ReadUInt16();
      this.DirtCoordSpace = this.odysseyModel.mdlReader.ReadUInt16();
      this.HideInHolograms = this.odysseyModel.mdlReader.ReadByte();
      this.tslPadding2 = this.odysseyModel.mdlReader.ReadByte();
    } 

    this._Unknown2 = this.odysseyModel.mdlReader.ReadUInt16();
    this._TotalArea = this.odysseyModel.mdlReader.ReadSingle();
    this._Unknown4 = this.odysseyModel.mdlReader.ReadUInt32();

    let MDXNodeDataOffset = this.odysseyModel.mdlReader.ReadUInt32();
    let VertexCoordinatesOffset = this.odysseyModel.mdlReader.ReadUInt32();

    this._mdxNodeDataOffset = MDXNodeDataOffset;

    if ((this.VerticiesCount == 0) || (this.FaceArrayCount == 0))
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

    for (let i = 0; i < this.VerticiesCount; i++) {
      // Base Position Offset
      let basePosition = (MDXNodeDataOffset + (i * this.MDXDataSize));

      // Vertex
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.VERTEX){
        this.odysseyModel.mdxReader.position = basePosition + MDXVertexOffset;
        this.vertices.push(this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle());
      }

      // Normal
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.NORMAL){
        this.odysseyModel.mdxReader.position = basePosition + MDXVertexNormalsOffset;
        this.normals.push(this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle());
      }

      // Color
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.COLOR){
        this.odysseyModel.mdxReader.position = basePosition + MDXVertexColorsOffset;
        this.colors.push(this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle());
      }
      
      // TexCoords1
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.UV1){
        this.odysseyModel.mdxReader.position = basePosition + MDXUVOffset1;
        this.tvectors[0].push(this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle());
        // this.tvectors[1][i] = this.tvectors[0][i];
      }

      // TexCoords2
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.UV2){
        this.odysseyModel.mdxReader.position = basePosition + MDXUVOffset2;
        this.tvectors[1].push(this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle());
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
        this.odysseyModel.mdxReader.position = basePosition + OffsetToMdxTangent1;
        this.tangent1.tangents.push(this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle());
        this.tangent1.bitangents.push(this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle());
        this.tangent1.normals.push(this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle());
        //this.computeTangent(this.tangent1, i);
      }

      //Tangent2
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT2){
        this.odysseyModel.mdxReader.position = basePosition + OffsetToMdxTangent2;
        this.tangent2.tangents.push(this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle());
        this.tangent2.bitangents.push(this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle());
        this.tangent2.normals.push(this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle());
        //this.computeTangent(this.tangent2, i);
      }

      //Tangent3
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT3){
        this.odysseyModel.mdxReader.position = basePosition + OffsetToMdxTangent3;
        this.tangent3.tangents.push(this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle());
        this.tangent3.bitangents.push(this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle());
        this.tangent3.normals.push(this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle());
        //this.computeTangent(this.tangent3, i);
      }

      //Tangent4
      if(this.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT4){
        this.odysseyModel.mdxReader.position = basePosition + OffsetToMdxTangent4;
        this.tangent4.tangents.push(this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle());
        this.tangent4.bitangents.push(this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle());
        this.tangent4.normals.push(this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle(), this.odysseyModel.mdxReader.ReadSingle());
        //this.computeTangent(this.tangent4, i);
      }

    }

    if(
      this.MDXDataBitmap & OdysseyModelMDXFlag.UV1 && 
      !(this.MDXDataBitmap & OdysseyModelMDXFlag.UV2)
    ){
      this.tvectors[1] = this.tvectors[0];
    }

    if(this.VertexLocArrayDef.count){
      this.odysseyModel.mdlReader.position = this.odysseyModel.fileHeader.ModelDataOffset + this.VertexLocArrayDef.offset;
      let offVerts = this.odysseyModel.mdlReader.ReadUInt32();
      this.odysseyModel.mdlReader.position = this.odysseyModel.fileHeader.ModelDataOffset + offVerts;
    }

    if(this.FaceArrayCount){
      this.odysseyModel.mdlReader.position = this.odysseyModel.fileHeader.ModelDataOffset + this.FaceArrayOffset;
      for (let i = 0; i < this.FaceArrayCount; i++) {

        this.faces[i] = new OdysseyFace3(0, 0, 0);
        this.faces[i].normal.x = this.odysseyModel.mdlReader.ReadSingle();
        this.faces[i].normal.y = this.odysseyModel.mdlReader.ReadSingle();
        this.faces[i].normal.z = this.odysseyModel.mdlReader.ReadSingle();
        this.faces[i].distance = this.odysseyModel.mdlReader.ReadSingle();
        this.faces[i].materialId = this.odysseyModel.mdlReader.ReadUInt32();
        this.faces[i].nAdjacentFaces1 = this.odysseyModel.mdlReader.ReadUInt16();
        this.faces[i].nAdjacentFaces2 = this.odysseyModel.mdlReader.ReadUInt16();
        this.faces[i].nAdjacentFaces3 = this.odysseyModel.mdlReader.ReadUInt16();
        this.faces[i].a = this.odysseyModel.mdlReader.ReadUInt16();
        this.faces[i].b = this.odysseyModel.mdlReader.ReadUInt16();
        this.faces[i].c = this.odysseyModel.mdlReader.ReadUInt16();
        this.faces[i].surfacemat = OdysseyWalkMesh.SURFACEMATERIALS[this.faces[i].materialId];

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
