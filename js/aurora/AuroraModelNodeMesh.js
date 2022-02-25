/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AuroraModelNodeMesh
 */

 class AuroraModelNodeMesh extends AuroraModelNode {

  constructor(parent = undefined){
    super(parent);
    this.type |= AuroraModel.NODETYPE.Mesh;
  }

  readBinary(auroraModel = undefined){
    super.readBinary(auroraModel);

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

    this.functionPointer0 = this.auroraModel.mdlReader.ReadUInt32();
    this.functionPointer1 = this.auroraModel.mdlReader.ReadUInt32();

    let _faceArrDef = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader);

    this.FaceArrayOffset = _faceArrDef.offset;
    this.FaceArrayCount = _faceArrDef.count;

    this.boundingBox = {
      min: new THREE.Vector3(this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle()),
      max: new THREE.Vector3(this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle())
    };

    this.Radius = this.auroraModel.mdlReader.ReadSingle();

    this.PointsAverage = new THREE.Vector3(this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle());
    this.Diffuse = new THREE.Color(this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle());
    this.Ambient = new THREE.Color(this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle(), this.auroraModel.mdlReader.ReadSingle());

    this.Transparent = this.auroraModel.mdlReader.ReadUInt32() ? true : false;

    this.TextureMap1 = this.auroraModel.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,''); //This stores the texture filename
    this.TextureMap2 = this.auroraModel.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,''); //This stores the lightmap filename
    this.TextureMap3 = this.auroraModel.mdlReader.ReadChars(12).replace(/\0[\s\S]*$/g,''); //This stores a 3rd texture filename (?)
    this.TextureMap4 = this.auroraModel.mdlReader.ReadChars(12).replace(/\0[\s\S]*$/g,''); //This stores a 4th texture filename (?)

    this.IndexCountArrayDef = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader); //IndexCounterArray
    this.VertexLocArrayDef = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader); //vertex_indices_offset

    if (this.VertexLocArrayDef.count > 1)
      throw ("Face offsets offsets count wrong "+ this.VertexLocArrayDef.count);

    this.InvertedCountArrayDef = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader); //MeshInvertedCounterArray
    this.InvertedCountArrayDefDuplicate = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader); //MeshInvertedCounterArray

    this.saberBytes = [
      this.auroraModel.mdlReader.ReadByte(),
      this.auroraModel.mdlReader.ReadByte(),
      this.auroraModel.mdlReader.ReadByte(),
      this.auroraModel.mdlReader.ReadByte(),
      this.auroraModel.mdlReader.ReadByte(),
      this.auroraModel.mdlReader.ReadByte(),
      this.auroraModel.mdlReader.ReadByte(),
      this.auroraModel.mdlReader.ReadByte()
    ];

    this.nAnimateUV = this.auroraModel.mdlReader.ReadUInt32() ? true : false;
    this.fUVDirectionX = this.auroraModel.mdlReader.ReadSingle();
    this.fUVDirectionY = this.auroraModel.mdlReader.ReadSingle();
    this.fUVJitter = this.auroraModel.mdlReader.ReadSingle();
    this.fUVJitterSpeed = this.auroraModel.mdlReader.ReadSingle();

    this.MDXDataSize = this.auroraModel.mdlReader.ReadUInt32();
    this.MDXDataBitmap = this.auroraModel.mdlReader.ReadUInt32();

    let MDXVertexOffset = this.auroraModel.mdlReader.ReadUInt32();
    let MDXVertexNormalsOffset = this.auroraModel.mdlReader.ReadUInt32();
    let MDXVertexColorsOffset = this.auroraModel.mdlReader.ReadUInt32();
    let MDXUVOffset1 = this.auroraModel.mdlReader.ReadInt32();
    let MDXUVOffset2 = this.auroraModel.mdlReader.ReadInt32();
    let MDXUVOffset3 = this.auroraModel.mdlReader.ReadInt32();
    let MDXUVOffset4 = this.auroraModel.mdlReader.ReadInt32();

    let OffsetToMdxTangent1 = this.auroraModel.mdlReader.ReadInt32();
    let OffsetToMdxTangent2 = this.auroraModel.mdlReader.ReadInt32();
    let OffsetToMdxTangent3 = this.auroraModel.mdlReader.ReadInt32();
    let OffsetToMdxTangent4 = this.auroraModel.mdlReader.ReadInt32();

    this.VerticiesCount = this.auroraModel.mdlReader.ReadUInt16();
    this.TextureCount = this.auroraModel.mdlReader.ReadUInt16();

    this.HasLightmap = this.auroraModel.mdlReader.ReadByte() ? true : false;
    this.RotateTexture = this.auroraModel.mdlReader.ReadByte() ? true : false;
    this.BackgroundGeometry = this.auroraModel.mdlReader.ReadByte() ? true : false;
    this.FlagShadow = this.auroraModel.mdlReader.ReadByte() ? true : false;
    this.Beaming = this.auroraModel.mdlReader.ReadByte() ? true : false;
    this.FlagRender = this.auroraModel.mdlReader.ReadByte() ? true : false;

    if (this.auroraModel.engine == AuroraModel.ENGINE.K2){
      this.DirtEnabled = this.auroraModel.mdlReader.ReadByte();
      this.tslPadding1 = this.auroraModel.mdlReader.ReadByte();
      this.DirtTexture = this.auroraModel.mdlReader.ReadUInt16();
      this.DirtCoordSpace = this.auroraModel.mdlReader.ReadUInt16();
      this.HideInHolograms = this.auroraModel.mdlReader.ReadByte();
      this.tslPadding2 = this.auroraModel.mdlReader.ReadByte();
    } 

    this._Unknown2 = this.auroraModel.mdlReader.ReadUInt16();
    this._TotalArea = this.auroraModel.mdlReader.ReadSingle();
    this._Unknown4 = this.auroraModel.mdlReader.ReadUInt32();

    let MDXNodeDataOffset = this.auroraModel.mdlReader.ReadUInt32();
    let VertexCoordinatesOffset = this.auroraModel.mdlReader.ReadUInt32();

    this._mdxNodeDataOffset = MDXNodeDataOffset;

    if ((this.VerticiesCount == 0) || (this.FaceArrayCount == 0))
      return null;

    let cachedPosition = this.auroraModel.mdlReader.position;

    //Tangent1
    if(this.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT1){
      this.tangent1 = {
        tangents: [],
        bitangents: [],
        normals: [],
        computed: []
      };
    }

    //Tangent2
    if(this.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT2){
      this.tangent2 = {
        tangents: [],
        bitangents: [],
        normals: [],
        computed: []
      };
    }

    //Tangent3
    if(this.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT3){
      this.tangent3 = {
        tangents: [],
        bitangents: [],
        normals: [],
        computed: []
      };
    }

    //Tangent4
    if(this.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT4){
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
      if(this.MDXDataBitmap & AuroraModel.MDXFLAG.VERTEX){
        this.auroraModel.mdxReader.position = basePosition + MDXVertexOffset;
        this.vertices.push(this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle());
      }

      // Normal
      if(this.MDXDataBitmap & AuroraModel.MDXFLAG.NORMAL){
        this.auroraModel.mdxReader.position = basePosition + MDXVertexNormalsOffset;
        this.normals[i] = new THREE.Vector3(this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle());
      }

      // Color
      if(this.MDXDataBitmap & AuroraModel.MDXFLAG.COLOR){
        this.auroraModel.mdxReader.position = basePosition + MDXVertexColorsOffset;
        this.colors[i] = new THREE.Color(this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle());
      }
      
      // TexCoords1
      if(this.MDXDataBitmap & AuroraModel.MDXFLAG.UV1){
        this.auroraModel.mdxReader.position = basePosition + MDXUVOffset1;
        this.tvectors[0][i] = (new THREE.Vector2(this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle()));
        this.tvectors[1][i] = this.tvectors[0][i];
      }

      // TexCoords2
      if(this.MDXDataBitmap & AuroraModel.MDXFLAG.UV2){
        this.auroraModel.mdxReader.position = basePosition + MDXUVOffset2;
        this.tvectors[1][i] = (new THREE.Vector2(this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle()));
      }

      // TexCoords3
      if(this.MDXDataBitmap & AuroraModel.MDXFLAG.UV3){
        //TODO
      }

      // TexCoords4
      if(this.MDXDataBitmap & AuroraModel.MDXFLAG.UV4){
        //TODO
      }

      //Tangent1
      if(this.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT1){
        this.auroraModel.mdxReader.position = basePosition + OffsetToMdxTangent1;
        this.tangent1.tangents.push(this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle());
        this.tangent1.bitangents.push(this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle());
        this.tangent1.normals.push(this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle());
        //this.computeTangent(this.tangent1, i);
      }

      //Tangent2
      if(this.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT2){
        this.auroraModel.mdxReader.position = basePosition + OffsetToMdxTangent2;
        this.tangent2.tangents.push(this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle());
        this.tangent2.bitangents.push(this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle());
        this.tangent2.normals.push(this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle());
        //this.computeTangent(this.tangent2, i);
      }

      //Tangent3
      if(this.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT3){
        this.auroraModel.mdxReader.position = basePosition + OffsetToMdxTangent3;
        this.tangent3.tangents.push(this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle());
        this.tangent3.bitangents.push(this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle());
        this.tangent3.normals.push(this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle());
        //this.computeTangent(this.tangent3, i);
      }

      //Tangent4
      if(this.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT4){
        this.auroraModel.mdxReader.position = basePosition + OffsetToMdxTangent4;
        this.tangent4.tangents.push(this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle());
        this.tangent4.bitangents.push(this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle());
        this.tangent4.normals.push(this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle(), this.auroraModel.mdxReader.ReadSingle());
        //this.computeTangent(this.tangent4, i);
      }

    }

    if(this.VertexLocArrayDef.count){
      this.auroraModel.mdlReader.position = this.auroraModel.fileHeader.ModelDataOffset + this.VertexLocArrayDef.offset;
      let offVerts = this.auroraModel.mdlReader.ReadUInt32();
      this.auroraModel.mdlReader.position = this.auroraModel.fileHeader.ModelDataOffset + offVerts;
    }

    if(this.FaceArrayCount){
      this.auroraModel.mdlReader.position = this.auroraModel.fileHeader.ModelDataOffset + this.FaceArrayOffset;
      for (let i = 0; i < this.FaceArrayCount; i++) {

        this.faces[i] = new THREE.Face3(0, 0, 0);
        this.faces[i].normal.x = this.auroraModel.mdlReader.ReadSingle();
        this.faces[i].normal.y = this.auroraModel.mdlReader.ReadSingle();
        this.faces[i].normal.z = this.auroraModel.mdlReader.ReadSingle();
        this.faces[i].distance = this.auroraModel.mdlReader.ReadSingle();
        this.faces[i].materialId = this.auroraModel.mdlReader.ReadUInt32();
        this.faces[i].nAdjacentFaces1 = this.auroraModel.mdlReader.ReadUInt16();
        this.faces[i].nAdjacentFaces2 = this.auroraModel.mdlReader.ReadUInt16();
        this.faces[i].nAdjacentFaces3 = this.auroraModel.mdlReader.ReadUInt16();
        this.faces[i].a = this.auroraModel.mdlReader.ReadUInt16();
        this.faces[i].b = this.auroraModel.mdlReader.ReadUInt16();
        this.faces[i].c = this.auroraModel.mdlReader.ReadUInt16();
        this.faces[i].surfacemat = AuroraWalkMesh.SURFACEMATERIALS[this.faces[i].materialId];

        this.indices.push(this.faces[i].a, this.faces[i].b, this.faces[i].c);

        if(this.MDXDataBitmap & AuroraModel.MDXFLAG.UV1)
          this.texCords[0][i] = ([this.tvectors[0][this.faces[i].a], this.tvectors[0][this.faces[i].b], this.tvectors[0][this.faces[i].c]]);
        
        if(this.MDXDataBitmap & AuroraModel.MDXFLAG.UV2)
          this.texCords[1][i] = ([this.tvectors[1][this.faces[i].a], this.tvectors[1][this.faces[i].b], this.tvectors[1][this.faces[i].c]]);

      }
    }

    this.auroraModel.mdlReader.position = cachedPosition;

  }

  computeTangent(tangentObject, index){
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
module.exports = AuroraModelNodeMesh;
