/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AuroraModel class takes an MDL & MDX file and decode the values to later be passed to a 
 * THREE.AuroraModel class to be converted into an object that can be added to the scene graph.
 */

class AuroraModel {
  
  constructor( mdlReader = null, mdxReader = null, onLoad = null, onError = null ){

    this.mdlReader = mdlReader;
    this.mdxReader = mdxReader;

    this.fileHeader = {};
    this.geometryHeader = {};
    this.modelHeader = {};
    this.animations = [];
    this.rootNode = null;

    this.fileHeader.FlagBinary = this.mdlReader.ReadUInt32();

    if (this.fileHeader.FlagBinary != 0){
      throw ("KotOR binary model not presented");
    }

    this.fileHeader.ModelDataSize = this.mdlReader.ReadUInt32();
    this.fileHeader.RawDataSize = this.mdlReader.ReadUInt32();

    this.fileHeader.ModelDataOffset = 12;
    this.fileHeader.RawDataOffset = this.fileHeader.ModelDataOffset + this.fileHeader.ModelDataSize;

    /*
     * Geometry Header
     */

    this.geometryHeader.Unknown1 = this.mdlReader.ReadUInt32(); //4Byte Function pointer
    this.geometryHeader.Unknown2 = this.mdlReader.ReadUInt32(); //4Byte Function pointer

    this.geometryHeader.ModelName = this.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,'');
    this.geometryHeader.RootNodeOffset = this.mdlReader.ReadUInt32();
    this.geometryHeader.NodeCount = this.mdlReader.ReadUInt32();
    mdlReader.MovePointerForward(24);

    this.geometryHeader.RefCount = this.mdlReader.ReadUInt32();
    this.geometryHeader.GeometryType = this.mdlReader.ReadByte(); //Model Type
    this.geometryHeader.Unknown4 = this.mdlReader.ReadBytes(3); //Padding

    /*
     * Model Header
     */
    
    this.modelHeader.Classification = this.mdlReader.ReadByte();
    this.modelHeader.SubClassification = this.mdlReader.ReadByte();
    this.modelHeader.Smoothing = this.mdlReader.ReadByte() == 1 ? true : false; //Unknown
    this.modelHeader.Fogged = this.mdlReader.ReadByte();
    this.modelHeader.ChildModelCount = this.mdlReader.ReadUInt32(); //Unkown

    let _animDataDef = AuroraModel.ReadArrayDefinition(mdlReader);

    this.modelHeader.AnimationDataOffset = _animDataDef.offset;
    this.modelHeader.AnimationsCount = _animDataDef.count;

    this.modelHeader.AnimationsAllocated = this.modelHeader.AnimationsCount;

    this.modelHeader.ParentModelPointer = this.mdlReader.ReadUInt32(); // Parent model pointer

    this.modelHeader.BoundingMinX = this.mdlReader.ReadSingle();
    this.modelHeader.BoundingMinY = this.mdlReader.ReadSingle();
    this.modelHeader.BoundingMinZ = this.mdlReader.ReadSingle();
    this.modelHeader.BoundingMaxX = this.mdlReader.ReadSingle();
    this.modelHeader.BoundingMaxY = this.mdlReader.ReadSingle();
    this.modelHeader.BoundingMaxZ = this.mdlReader.ReadSingle();
    this.modelHeader.Radius = this.mdlReader.ReadSingle();
    this.modelHeader.Scale = this.mdlReader.ReadSingle();
    this.mdlReader.Seek(148);
    this.modelHeader.SuperModelName = this.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,'');
    
    /*
     * Names Array Header
     */

    this.mdlReader.position += 4; // Root node pointer again
    this.mdlReader.position += 12; // Unknown

    let _nameDef = AuroraModel.ReadArrayDefinition(this.mdlReader);
    let nameOffset = _nameDef.offset;
    let nameCount = _nameDef.count;

    let nameOffsets = AuroraModel.ReadArray(this.mdlReader, this.fileHeader.ModelDataOffset + nameOffset, nameCount);

    this.names = AuroraModel.readStrings(this.mdlReader, nameOffsets, this.fileHeader.ModelDataOffset);
    let namesLen = this.names.length;
    for(let i = 0; i < namesLen; i++){
      this.names[i] = this.names[i].toLowerCase();
    }

    /*
     * Nodes Header
     */

    //START: TEST - Loading Root Node
    this.nodes = {};
    let tmpPos = this.mdlReader.position;
    let nodeOffset = this.fileHeader.ModelDataOffset + this.geometryHeader.RootNodeOffset;
    this.rootNode = this.ReadNode(nodeOffset);
    this.mdlReader.Seek(tmpPos);
    //END:   TEST - Loading Root Node

    let animOffsets = AuroraModel.ReadArray(mdlReader, this.fileHeader.ModelDataOffset + this.modelHeader.AnimationDataOffset, this.modelHeader.AnimationsCount);

    for (let i = 0; i!=this.modelHeader.AnimationsCount; i++){
      let tmpPos = this.mdlReader.position;
      let offset = animOffsets[i];
      this.ReadAnimation(this.fileHeader.ModelDataOffset + offset);
      this.mdlReader.Seek(tmpPos);
    }

    //console.log(this.modelHeader.SuperModelName.indexOf("NULL") == -1);

    this.mdlReader = undefined;
    this.mdxReader = undefined;

  }

  LoadSuperModel(name){
    let archive = Global.kotorBIF["models"];

    let mdlReader = new BinaryReader(Buffer.from(archive.GetResourceDataSync(archive.GetResourceByLabel(name, ResourceTypes['mdl']))));
    let mdxReader = new BinaryReader(Buffer.from(archive.GetResourceDataSync(archive.GetResourceByLabel(name, ResourceTypes['mdx']))));

    return new AuroraModel(mdlReader, mdxReader);
  }

  ParseModel(){

  }

  ReadHeader(){

  }

  ReadNode(offset, parent = this.rootNode){

    this.mdlReader.position = offset;  
    let node = new AuroraModelNode();
    let NodeType = node.NodeType = this.mdlReader.ReadUInt16();  

    node.Supernode = this.mdlReader.ReadUInt16();
    node.NodePosition = this.mdlReader.ReadUInt16();

    if (node.NodePosition < this.names.length){
      node.name = this.names[node.NodePosition].replace(/\0[\s\S]*$/g,'').toLowerCase();
    }else{
      node.name = '';
    }

    this.nodes[node.name] = node;

    //Non static objects in room meshes are children of the node that is the name of the model plus a
    //like: MODELNAMEa or m02ac_02ba

    if(parent){
      if(node.name == (this.geometryHeader.ModelName.trim()+'a').toLowerCase()){
        node.roomStatic = false;
      }else{
        node.roomStatic = parent.roomStatic;
      }
    }

    // if(parent){
    //   if(node.name == (this.geometryHeader.ModelName+'a').toLowerCase() || !parent.roomStatic){
    //     node.roomStatic = false;
    //   }else{
    //     node.roomStatic = true;
    //   }
    // }

    this.mdlReader.position += (6 + 4);

    node.position.x = this.mdlReader.ReadSingle();
    node.position.y = this.mdlReader.ReadSingle();
    node.position.z = this.mdlReader.ReadSingle();

    node.quaternion.w = this.mdlReader.ReadSingle();
    node.quaternion.x = this.mdlReader.ReadSingle();
    node.quaternion.y = this.mdlReader.ReadSingle();
    node.quaternion.z = this.mdlReader.ReadSingle();

    let _childDef = AuroraModel.ReadArrayDefinition(this.mdlReader);
    let children = AuroraModel.ReadArray(this.mdlReader, this.fileHeader.ModelDataOffset + _childDef.offset, _childDef.count);
    let _contKeyDef = AuroraModel.ReadArrayDefinition(this.mdlReader);
    let _contDataDef = AuroraModel.ReadArrayDefinition(this.mdlReader);
    let controllerData = AuroraModel.ReadArrayFloats(this.mdlReader, this.fileHeader.ModelDataOffset + _contDataDef.offset, _contDataDef.count);

    node.controllers = this.ReadNodeControllers(node, this.fileHeader.ModelDataOffset + _contKeyDef.offset, _contKeyDef.count, controllerData);
    
    if ((NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
      this.ReadLightNode(node);
    }

    if ((NodeType & AuroraModel.NODETYPE.Emitter) == AuroraModel.NODETYPE.Emitter) {
      node.emitter = this.ReadEmitterNode(node);
    }

    if ((NodeType & AuroraModel.NODETYPE.Reference) == AuroraModel.NODETYPE.Mesh) {
      node.modelName = this.mdlReader.ReadChars(32);
      node.reattachable = this.mdlReader.ReadInt32();
    }

    if ((NodeType & AuroraModel.NODETYPE.Mesh) == AuroraModel.NODETYPE.Mesh) {
      this.ReadMeshNode(node, parent);
    }

    if ((NodeType & AuroraModel.NODETYPE.Skin) == AuroraModel.NODETYPE.Skin) {
      this.ReadSkinNode(node, parent);
    }

    if ((NodeType & AuroraModel.NODETYPE.Dangly) == AuroraModel.NODETYPE.Dangly) {
      this.ReadDanglyNode(node, parent);
    }

    if ((NodeType & AuroraModel.NODETYPE.AABB) == AuroraModel.NODETYPE.AABB) {
      node.rootAABB = this.ReadAABBNode(node, this.mdlReader.ReadUInt32());
    }

    if ((NodeType & AuroraModel.NODETYPE.Anim) == AuroraModel.NODETYPE.Anim) {
      this.mdlReader.position += 0x38;
    }

    let childrenLen = children.length;
    for (let i = 0; i != childrenLen; i++){
      node.add( this.ReadNode(this.fileHeader.ModelDataOffset + children[i], node ) );
    }

    return node;
  }

  ReadMeshNode(mesh){

    this.mdlReader.position += 8;

    mesh.vertices = [];
    mesh.normals = [];
    mesh.tvectors = [[], [], [], []];
    mesh.texCords = [[], [], [], []];
    mesh.tangents = [[], [], [], []];
    mesh.indexArray = [];
    mesh.uvs = [];
    mesh.faces = [];

    let _faceArrDef = AuroraModel.ReadArrayDefinition(this.mdlReader);

    mesh.FaceArrayOffset = _faceArrDef.offset;
    mesh.FaceArrayCount = _faceArrDef.count;

    mesh.boundingBox = {
      min: new THREE.Vector3(this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle()),
      max: new THREE.Vector3(this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle())
    };

    mesh.Radius = this.mdlReader.ReadSingle();

    mesh.PointsAverage = new THREE.Vector3(this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle());
    mesh.Diffuse = new THREE.Color(this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle());
    mesh.Ambient = new THREE.Color(this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle());

    mesh.Transparent = this.mdlReader.ReadUInt32() ? true : false;

    mesh.TextureMap1 = this.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,''); //This stores the texture filename
    mesh.TextureMap2 = this.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,''); //This stores the lightmap filename
    mesh.TextureMap3 = this.mdlReader.ReadChars(12).replace(/\0[\s\S]*$/g,''); //This stores a 3rd texture filename (?)
    mesh.TextureMap4 = this.mdlReader.ReadChars(12).replace(/\0[\s\S]*$/g,''); //This stores a 4th texture filename (?)

    mesh.IndexCountArrayDef = AuroraModel.ReadArrayDefinition(this.mdlReader); //IndexCounterArray
    mesh.VertexLocArrayDef = AuroraModel.ReadArrayDefinition(this.mdlReader); //vertex_indices_offset

    if (mesh.VertexLocArrayDef.count > 1)
      throw ("Face offsets offsets count wrong "+ mesh.VertexLocArrayDef.count);

    mesh.InvertedCountArrayDef = AuroraModel.ReadArrayDefinition(this.mdlReader); //MeshInvertedCounterArray
    mesh.InvertedCountArrayDefDuplicate = AuroraModel.ReadArrayDefinition(this.mdlReader); //MeshInvertedCounterArray

    mesh.saberBytes = [
      this.mdlReader.ReadByte(),
      this.mdlReader.ReadByte(),
      this.mdlReader.ReadByte(),
      this.mdlReader.ReadByte(),
      this.mdlReader.ReadByte(),
      this.mdlReader.ReadByte(),
      this.mdlReader.ReadByte(),
      this.mdlReader.ReadByte()
    ];

    mesh.nAnimateUV = this.mdlReader.ReadUInt32() ? true : false;
    mesh.fUVDirectionX = this.mdlReader.ReadSingle();
    mesh.fUVDirectionY = this.mdlReader.ReadSingle();
    mesh.fUVJitter = this.mdlReader.ReadSingle();
    mesh.fUVJitterSpeed = this.mdlReader.ReadSingle();

    mesh.MDXDataSize = this.mdlReader.ReadUInt32();
    mesh.MDXDataBitmap = this.mdlReader.ReadUInt32();

    let MDXVertexOffset = this.mdlReader.ReadUInt32();
    let MDXVertexNormalsOffset = this.mdlReader.ReadUInt32();
    let MDXVertexNormalsUnunsed = this.mdlReader.ReadUInt32();
    let MDXUVOffset1 = this.mdlReader.ReadInt32();
    let MDXUVOffset2 = this.mdlReader.ReadInt32();
    let MDXUVOffset3 = this.mdlReader.ReadInt32();
    let MDXUVOffset4 = this.mdlReader.ReadInt32();

    let OffsetToMdxTangent1 = this.mdlReader.ReadInt32();
    let OffsetToMdxTangent2 = this.mdlReader.ReadInt32();
    let OffsetToMdxTangent3 = this.mdlReader.ReadInt32();
    let OffsetToMdxTangent4 = this.mdlReader.ReadInt32();

    mesh.VerticiesCount = this.mdlReader.ReadUInt16();
    mesh.TextureCount = this.mdlReader.ReadUInt16();

    mesh.HasLightmap = this.mdlReader.ReadByte() ? true : false;
    mesh.RotateTexture = this.mdlReader.ReadByte() ? true : false;
    mesh.BackgroundGeometry = this.mdlReader.ReadByte() ? true : false;
    mesh.FlagShadow = this.mdlReader.ReadByte() ? true : false;
    mesh.Beaming = this.mdlReader.ReadByte() ? true : false;
    mesh.FlagRender = this.mdlReader.ReadByte() ? true : false;

    if (GameInitializer.currentGame == Games.TSL){
      mesh.DirtEnabled = this.mdlReader.ReadByte();
      mesh.tslPadding1 = this.mdlReader.ReadByte();
      mesh.DirtTexture = this.mdlReader.ReadUInt16();
      mesh.DirtCoordSpace = this.mdlReader.ReadUInt16();
      mesh.HideInHolograms = this.mdlReader.ReadByte();
      mesh.tslPadding2 = this.mdlReader.ReadByte();
    } 

    mesh._Unknown2 = this.mdlReader.ReadUInt16();
    mesh._TotalArea = this.mdlReader.ReadSingle();
    mesh._Unknown4 = this.mdlReader.ReadUInt32();

    let MDXNodeDataOffset = this.mdlReader.ReadUInt32();
    let VertexCoordinatesOffset = this.mdlReader.ReadUInt32();

    mesh._mdxNodeDataOffset = MDXNodeDataOffset;

    if ((mesh.VertexLocArrayDef.count < 1) || (mesh.VerticiesCount == 0) || (mesh.FaceArrayCount == 0))
      return null;

    let endPos = this.mdlReader.position;

    if (mesh.TextureCount > 2){
      mesh.TextureCount = 2;
    }

    mesh.vertices.length = mesh.VerticiesCount;
    mesh.normals.length = mesh.VerticiesCount;

    for (let t = 0; t < mesh.TextureCount; t++) {
      //mesh.tvectors[t].length = mesh.VerticiesCount;
    }

    for (let i = 0; i < mesh.VerticiesCount; i++) {
      // Base Position Offset
      let basePosition = (MDXNodeDataOffset + (i * mesh.MDXDataSize));

      // Vertex
      if(mesh.MDXDataBitmap & AuroraModel.MDXFLAG.VERTEX){
        this.mdxReader.position = basePosition + MDXVertexOffset;
        mesh.vertices[i] = new THREE.Vector3(this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle());
      }

      // Normal
      if(mesh.MDXDataBitmap & AuroraModel.MDXFLAG.NORMAL){
        this.mdxReader.position = basePosition + MDXVertexNormalsOffset;
        mesh.normals[i] = new THREE.Vector3(this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle());
      }
      
      // TexCoords1
      if(mesh.MDXDataBitmap & AuroraModel.MDXFLAG.UV1){
        this.mdxReader.position = basePosition + MDXUVOffset1;
        mesh.tvectors[0][i] = (new THREE.Vector2(this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle()));
      }

      // TexCoords2
      if(mesh.MDXDataBitmap & AuroraModel.MDXFLAG.UV2){
        this.mdxReader.position = basePosition + MDXUVOffset2;
        mesh.tvectors[1][i] = (new THREE.Vector2(this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle()));
      }

      // TexCoords3
      if(mesh.MDXDataBitmap & AuroraModel.MDXFLAG.UV3){
        //TODO
      }

      // TexCoords4
      if(mesh.MDXDataBitmap & AuroraModel.MDXFLAG.UV4){
        //TODO
      }

      //Tangent1
      if(mesh.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT1){
        this.mdxReader.position = basePosition + OffsetToMdxTangent1;
        mesh.tangents[0][i] = [];
        for(let j= 0; j < 3; j++){
          mesh.tangents[0][i][j] = new THREE.Vector3(this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle());
        }
      }

      //Tangent2
      if(mesh.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT2){
        this.mdxReader.position = basePosition + OffsetToMdxTangent2;
        mesh.tangents[1][i] = [];
        for(let j= 0; j < 3; j++){
          mesh.tangents[1][i][j] = new THREE.Vector3(this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle());
        }
      }

      //Tangent1
      if(mesh.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT3){
        this.mdxReader.position = basePosition + OffsetToMdxTangent3;
        mesh.tangents[2][i] = [];
        for(let j= 0; j < 3; j++){
          mesh.tangents[2][i][j] = new THREE.Vector3(this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle());
        }
      }

      //Tangent1
      if(mesh.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT4){
        this.mdxReader.position = basePosition + OffsetToMdxTangent4;
        mesh.tangents[3][i] = [];
        for(let j= 0; j < 3; j++){
          mesh.tangents[3][i][j] = new THREE.Vector3(this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle());
        }
      }

    }

    this.mdlReader.position = this.fileHeader.ModelDataOffset + mesh.VertexLocArrayDef.offset;
    let offVerts = this.mdlReader.ReadUInt32();

    this.mdlReader.position = this.fileHeader.ModelDataOffset + offVerts;

    if(mesh.TextureCount) {
      mesh.faces.length = mesh.FaceArrayCount;
      mesh.texCords[0].length = mesh.FaceArrayCount;
      mesh.texCords[1].length = mesh.FaceArrayCount;
      for (let i = 0; i < mesh.FaceArrayCount; i++) {
        let index1 = this.mdlReader.ReadUInt16();
        let index2 = this.mdlReader.ReadUInt16();
        let index3 = this.mdlReader.ReadUInt16();
        let normal = [
          mesh.normals[index1],
          mesh.normals[index2],
          mesh.normals[index3]
        ];
        mesh.faces[i] = new THREE.Face3(index1, index2, index3, normal);

        if(mesh.MDXDataBitmap & AuroraModel.MDXFLAG.UV1)
          mesh.texCords[0][i] = ([mesh.tvectors[0][index1], mesh.tvectors[0][index2], mesh.tvectors[0][index3]]);
        
        if(mesh.MDXDataBitmap & AuroraModel.MDXFLAG.UV2)
          mesh.texCords[1][i] = ([mesh.tvectors[1][index1], mesh.tvectors[1][index2], mesh.tvectors[1][index3]]);
      }
    }

    if(mesh.TextureCount){
      this.mdlReader.position = this.fileHeader.ModelDataOffset + mesh.FaceArrayOffset;
      for (let i = 0; i < mesh.FaceArrayCount; i++) {
        mesh.faces[i].normalX = this.mdlReader.ReadSingle();
        mesh.faces[i].normalY = this.mdlReader.ReadSingle();
        mesh.faces[i].normalZ = this.mdlReader.ReadSingle();
        mesh.faces[i].distance = this.mdlReader.ReadSingle();
        mesh.faces[i].materialId = this.mdlReader.ReadUInt32();
        mesh.faces[i].nAdjacentFaces1 = this.mdlReader.ReadUInt16();
        mesh.faces[i].nAdjacentFaces2 = this.mdlReader.ReadUInt16();
        mesh.faces[i].nAdjacentFaces3 = this.mdlReader.ReadUInt16();
        mesh.faces[i].indexVertex1 = this.mdlReader.ReadUInt16();
        mesh.faces[i].indexVertex2 = this.mdlReader.ReadUInt16();
        mesh.faces[i].indexVertex3 = this.mdlReader.ReadUInt16();
      }
    }

    this.mdlReader.position = endPos;

    return mesh;
  }

  ReadSkinNode(node){

    node.weights_def = AuroraModel.ReadArrayDefinition(this.mdlReader);

    node.MDXBoneWeightOffset = this.mdlReader.ReadUInt32();
    node.MDXBoneIndexOffset = this.mdlReader.ReadUInt32();
    node.BoneMapOffset = this.mdlReader.ReadUInt32();
    node.BoneMapCount = this.mdlReader.ReadUInt32();

    node.BoneQuaternionDef = AuroraModel.ReadArrayDefinition(this.mdlReader);
    node.BoneVertexDef = AuroraModel.ReadArrayDefinition(this.mdlReader);
    node.BoneConstantsDef = AuroraModel.ReadArrayDefinition(this.mdlReader);

    node.bone_parts = [];//new Array(17);

    for(let i = 0; i <= 17; i++){
      node.bone_parts[i] = this.mdlReader.ReadUInt16();
    }

    //node.spare = this.mdlReader.ReadInt16();

    node.weights = [];//new Array(node.VerticiesCount*4);
    node.boneIdx = [];//new Array(node.VerticiesCount*4);

    for (let i = 0; i < node.VerticiesCount; i++) {
      // Position
      this.mdxReader.position = (node._mdxNodeDataOffset + (i * node.MDXDataSize)) + node.MDXBoneWeightOffset;
      
      node.weights[i] = [0, 0, 0, 0];
      for(let i2 = 0; i2 < 4; i2++){
        let float = this.mdxReader.ReadSingle();
        node.weights[i][i2] = (float);//(float == -1 ? 0 : float);//[i][i2] = float == -1 ? 0 : float;
      }

      this.mdxReader.position = (node._mdxNodeDataOffset + (i * node.MDXDataSize)) + node.MDXBoneIndexOffset;

      node.boneIdx[i] = [0, 0, 0, 0];
      for(let i2 = 0; i2 < 4; i2++){
        let float = this.mdxReader.ReadSingle();
        node.boneIdx[i][i2] = (float);//(float == -1 ? 0 : float);//[i][i2] = float == -1 ? 0 : float;
      }
    }

    if (node.BoneMapCount > 0) {
      this.mdlReader.Seek(this.fileHeader.ModelDataOffset + node.BoneMapOffset);
      node.bone_mapping = [];
      for(let i = 0; i < node.BoneMapCount; i++){
        node.bone_mapping[i] = this.mdlReader.ReadSingle();
      }
    }

    if (node.BoneQuaternionDef.count > 0) {
      this.mdlReader.Seek(this.fileHeader.ModelDataOffset + node.BoneQuaternionDef.offset);
      node.bone_quats = [];
      for(let i = 0; i < node.BoneQuaternionDef.count; i++){
        let w = this.mdlReader.ReadSingle();
        node.bone_quats[i] = new THREE.Quaternion(this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle(), w);
        //node.bone_quats[i].normalize();
      }
    }

    if (node.BoneVertexDef.count > 0) {
      this.mdlReader.Seek(this.fileHeader.ModelDataOffset + node.BoneVertexDef.offset);
      node.bone_vertex = [];
      for(let i = 0; i < node.BoneVertexDef.count; i++){
        node.bone_vertex[i] = new THREE.Vector3(this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle());
        //node.bone_vertex[i].normalize();
      }
    }

    if (node.BoneConstantsDef.count > 0) {
      this.mdlReader.Seek(this.fileHeader.ModelDataOffset + node.BoneConstantsDef.offset);
      node.bone_constants = [];
      for(let i = 0; i < node.BoneConstantsDef.count; i++){
        node.bone_constants[i] = this.mdlReader.ReadByte();
      }
    }

  }

  ReadDanglyNode(node, parent){
    let contraintArray = AuroraModel.ReadArrayDefinition(this.mdlReader);

    node.danglyDisplacement = this.mdlReader.ReadSingle();
    node.danglyTightness = this.mdlReader.ReadSingle();
    node.danglyPeriod = this.mdlReader.ReadSingle();

    node.danglyMDLOffset = this.mdlReader.ReadUInt32();
    
    node.constraints = AuroraModel.ReadArrayFloats(this.mdlReader, this.fileHeader.ModelDataOffset + contraintArray.offset, contraintArray.count);
    this.mdlReader.Seek(this.fileHeader.ModelDataOffset + node.danglyMDLOffset);
    node.danglyVec4 = new Array(contraintArray.count);
    for(let i = 0; i < contraintArray.count; i++){
      node.danglyVec4[i] = new THREE.Vector4(this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle(), node.constraints[i]);
    }
  }

  ReadLightNode(light){

    let flareRadius = this.mdlReader.ReadSingle();

    this.mdlReader.Skip(0x0C); //Unknown UInt32 array

    let FlareSizes = AuroraModel.ReadArrayDefinition(this.mdlReader);
    let FlarePositions = AuroraModel.ReadArrayDefinition(this.mdlReader);
    let FlareColorShifts = AuroraModel.ReadArrayDefinition(this.mdlReader);
    let FlareTextures = AuroraModel.ReadArrayDefinition(this.mdlReader);

    light.LightPriority = this.mdlReader.ReadUInt32();
    light.AmbientFlag = this.mdlReader.ReadUInt32(); //Flag
    light.DynamicFlag = this.mdlReader.ReadUInt32();
    light.AffectDynamicFlag = this.mdlReader.ReadUInt32();
    light.ShadowFlag = this.mdlReader.ReadUInt32();
    light.GenerateFlareFlag = this.mdlReader.ReadUInt32();
    light.FadingLightFlag = this.mdlReader.ReadUInt32();

    light.flare = {
      radius: flareRadius,
      sizes: [],
      positions: [],
      colorShifts: [],
      textures: []
    };

    if(FlareTextures.count){
      //FlareTextures are stored as follows offset1,offset2,string1,string2
      for(let i = 0; i < FlareTextures.count; i++){
        //Seek to the location of the textures offset value
        this.mdlReader.Seek(this.fileHeader.ModelDataOffset + FlareTextures.offset + (4*i));
        //Read out the offset value
        let stringOffset = this.mdlReader.ReadUInt32();
        //Seek the reader to where the beginning of the flare texture name should be located
        this.mdlReader.Seek(this.fileHeader.ModelDataOffset + stringOffset);
        //Read the string and push it to the textures array
        light.flare.textures.push(this.mdlReader.ReadString().replace(/\0[\s\S]*$/g,'').trim().toLowerCase());
      }
    }

    if(FlareSizes.count){
      this.mdlReader.Seek(this.fileHeader.ModelDataOffset + FlareSizes.offset);
      for(let i = 0; i < FlareSizes.count; i++){
        light.flare.sizes.push(this.mdlReader.ReadSingle())
      }
    }

    if(FlarePositions.count){
      this.mdlReader.Seek(this.fileHeader.ModelDataOffset + FlarePositions.offset);
      for(let i = 0; i < FlarePositions.count; i++){
        light.flare.positions.push(this.mdlReader.ReadSingle())
      }
    }

    if(FlareColorShifts.count){
      this.mdlReader.Seek(this.fileHeader.ModelDataOffset + FlareColorShifts.offset);
      for(let i = 0; i < FlareColorShifts.count; i++){
        light.flare.colorShifts.push(
          new THREE.Color(this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle())
          );
      }
    }

    return light;
  }

  ReadEmitterNode(emitter){

    this.mdlReader.Skip(8);

    emitter.DeadSpace = this.mdlReader.ReadSingle();
    emitter.BlastRadius = this.mdlReader.ReadSingle();
    emitter.BlastLength = this.mdlReader.ReadSingle();
    emitter.GridX = this.mdlReader.ReadUInt32();
    emitter.GridY = this.mdlReader.ReadUInt32();
    emitter.SpaceType = this.mdlReader.ReadUInt32();

    emitter.Update = this.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,'');
    emitter.Render = this.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,'');
    emitter.Blend = this.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,'');
    emitter.Texture = this.mdlReader.ReadChars(64).replace(/\0[\s\S]*$/g,'');
    emitter.Chunk = this.mdlReader.ReadChars(16).replace(/\0[\s\S]*$/g,'');

    emitter.TwoSidedTex = this.mdlReader.ReadUInt32();
    emitter.Loop = this.mdlReader.ReadUInt32();
    emitter.RenderOrder = this.mdlReader.ReadUInt16();
    emitter.Padding = this.mdlReader.ReadUInt16();

    emitter.Flags = this.mdlReader.ReadUInt32();

    emitter.isP2P = (emitter.Flags & EMITTER_FLAGS.P2P);
    emitter.isP2PSel = (emitter.Flags & EMITTER_FLAGS.P2P_SEL);
    emitter.affectedByWind = (emitter.Flags & EMITTER_FLAGS.AFFECTED_WIND);
    emitter.isTinted = (emitter.Flags & EMITTER_FLAGS.TINTED);
    emitter.canBounce = (emitter.Flags & EMITTER_FLAGS.BOUNCE);
    emitter.isRandom = (emitter.Flags & EMITTER_FLAGS.RANDOM);
    emitter.canInherit = (emitter.Flags & EMITTER_FLAGS.INHERIT);
    emitter.canInheritVelocity = (emitter.Flags & EMITTER_FLAGS.INHERIT_VEL);
    emitter.canInheritLocal = (emitter.Flags & EMITTER_FLAGS.INHERIT_LOCAL);
    emitter.canSplat = (emitter.Flags & EMITTER_FLAGS.SPLAT);
    emitter.canInheritPart = (emitter.Flags & EMITTER_FLAGS.INHERIT_PART);
    emitter.isDepthTexture = (emitter.Flags & EMITTER_FLAGS.DEPTH_TEXTURE);


    return emitter;

  }

  ReadAABBNode(node = null, aabbNodeOffset = -1){
    
    this.mdlReader.Seek(this.fileHeader.ModelDataOffset + aabbNodeOffset);

    let aabb = {
      type: 'AABB',
      box: new THREE.Box3(
        new THREE.Vector3(this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle()),
        new THREE.Vector3(this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle())
      ),
      leftNodeOffset: this.mdlReader.ReadInt32(),
      rightNodeOffset: this.mdlReader.ReadInt32(),
      faceIdx: this.mdlReader.ReadInt32(),
      unk1: this.mdlReader.ReadInt32(),
      leftNode: undefined,
      rightNode: undefined,
      face: undefined
    };

    if(aabb.leftNodeOffset > 0){
      aabb.leftNode = this.ReadAABBNode(node, aabb.leftNodeOffset);
    }

    if(aabb.rightNodeOffset > 0){
      aabb.rightNode = this.ReadAABBNode(node, aabb.rightNodeOffset);
    }

    if(node.faceIdx > -1){
      aabb.face = node.faces[node.faceIdx];
    }

    return aabb;
    
  }

  ReadNodeControllers(node, offset, count, data, data2){
    let pos = this.mdlReader.position;
    this.mdlReader.Seek(offset);

    let controllers = new Map();
    for(let i = 0; i < count; i++){

      let controller = {
        data: []
      };

      controller.type = this.mdlReader.ReadInt32();
      this.mdlReader.Skip(2); //controller.unk_keyflag = this.mdlReader.ReadInt16();
      controller.frameCount = this.mdlReader.ReadUInt16();
      controller.timeKeyIndex = this.mdlReader.ReadUInt16(); //Index into the float array of the first time key
      controller.dataValueIndex = this.mdlReader.ReadUInt16(); //Index into the float array of the first controller data value
      controller.columnCount = this.mdlReader.ReadByte();//Number of columns excluding the time key column
      this.mdlReader.Skip(3); //Skip unused padding
      
      let tmpQuat = new THREE.Quaternion();

      let NodeType = node.NodeType;
      if(this.nodes[node.name]){
        NodeType = node.NodeType = this.nodes[node.name].NodeType;
      }
    
      if(controller.frameCount != -1){

        if(node instanceof AuroraModelAnimationNode || node instanceof AuroraModelNode){

          //Default Controllers
          switch(controller.type){
            case AuroraModel.ControllerType.Position:
              for (let r = 0; r < controller.frameCount; r++) {
                let frame = {
                  isBezier: false,
                  time: data[controller.timeKeyIndex + r]
                };

                let vec3 = {x: 0, y: 0, z: 0};

                if(controller.columnCount == 1){
                  vec3.x = data[controller.dataValueIndex + (r * controller.columnCount)] || 0.0;
                  vec3.y = data[controller.dataValueIndex + (r * controller.columnCount)] || 0.0;
                  vec3.z = data[controller.dataValueIndex + (r * controller.columnCount)] || 0.0;
                }else if(controller.columnCount == 3){
                  vec3.x = data[controller.dataValueIndex + (r * controller.columnCount) + 0] || 0.0;
                  vec3.y = data[controller.dataValueIndex + (r * controller.columnCount) + 1] || 0.0;
                  vec3.z = data[controller.dataValueIndex + (r * controller.columnCount) + 2] || 0.0;
                }else{
                  //This is a bezier curve this controller contains 3 vector3's packed end to end:
                  //pointA: x1,y1,z1 | pointB: x2,y2,z2 | pointC: x3,y3,z3
                  //pointB and pointC are relative to pointA
                  //console.log('bezier', node.name, controller);
                  let rowOffset = controller.dataValueIndex + (r * 9);

                  frame.a = new THREE.Vector3(
                    data[rowOffset + 0] || 0.0,
                    data[rowOffset + 1] || 0.0,
                    data[rowOffset + 2] || 0.0
                  );

                  frame.b = new THREE.Vector3(
                    data[rowOffset + 3] || 0.0,
                    data[rowOffset + 4] || 0.0,
                    data[rowOffset + 5] || 0.0
                  );

                  frame.c = new THREE.Vector3(
                    data[rowOffset + 6] || 0.0,
                    data[rowOffset + 7] || 0.0,
                    data[rowOffset + 8] || 0.0
                  );

                  frame.isBezier = true;
                  frame.bezier = new THREE.QuadraticBezierCurve3(
                    //POINT A
                    new THREE.Vector3(
                      data[rowOffset + 0] || 0.0,
                      data[rowOffset + 1] || 0.0,
                      data[rowOffset + 2] || 0.0
                    ),
                    //POINT B
                    new THREE.Vector3(
                      (data[rowOffset + 0] + data[rowOffset + 3]) || 0.0,
                      (data[rowOffset + 1] + data[rowOffset + 4]) || 0.0,
                      (data[rowOffset + 2] + data[rowOffset + 5]) || 0.0
                    ),
                    //POINT C
                    new THREE.Vector3(
                      (data[rowOffset + 0] + data[rowOffset + 6]) || 0.0,
                      (data[rowOffset + 1] + data[rowOffset + 7]) || 0.0,
                      (data[rowOffset + 2] + data[rowOffset + 8]) || 0.0
                    )
                  );
                  
                  //If this is the first frame ignore the control point at v1 by copying the values from v0
                  //This appears to fix the problem I was having with the camera going off the rails at times
                  //This also appears to make all the isLinearBezier checks I was doing before unnecessary
                  //Further testing is needed before I can be sure isLinearBezier can be removed from the AnimationManager as well
                  if(!r){
                    frame.bezier.v1.copy(frame.bezier.v0);
                  }

                  /*frame.isLinearBezier = (frame.bezier.v0.x.toFixed(6) == frame.bezier.v2.x.toFixed(6) && frame.bezier.v0.y.toFixed(6) == frame.bezier.v2.y.toFixed(6));

                  if(frame.isLinearBezier){
                    frame.bezier.v1.copy(frame.bezier.v0).add(frame.bezier.v2).multiplyScalar(0.5);
                  }else if(frame.bezier.v0.length() - frame.bezier.v1.length() < 0.01){
                    frame.isLinearBezier = true;
                    frame.bezier.v1.copy(frame.bezier.v0).add(frame.bezier.v2).multiplyScalar(0.5);
                  }*/

                  vec3.x = data[rowOffset + 0] || 0.0;
                  vec3.y = data[rowOffset + 1] || 0.0;
                  vec3.z = data[rowOffset + 2] || 0.0;

                }
    
                frame.x = vec3.x;
                frame.y = vec3.y;
                frame.z = vec3.z;
    
                controller.data[r] = (frame);
              }
            break;
            case AuroraModel.ControllerType.Orientation:
              for (let r = 0; r < controller.frameCount; r++) {
                let frame = {};
                frame.time = data[controller.timeKeyIndex + r];

                if(controller.columnCount == 2){
                  let temp = data2[controller.dataValueIndex + r];
                  let original = data[controller.dataValueIndex + r];
                  
                  let x, y, z, w = 0;

                  if(isNaN(temp)){
                    temp = 0;
                  }

                  x = (parseInt(temp & 0x07ff) / 1023.0) - 1.0;
                  y = (parseInt((temp >> 11) & 0x07ff) / 1023.0) - 1.0;
                  z = (parseInt((temp >> 22) & 0x3FF) / 511.0) - 1.0;

                  let fSquares =  (Math.pow(x, 2.0) + Math.pow(y, 2.0) + Math.pow(z, 2.0));

                  if(fSquares < 1.0){
                    w = Math.sqrt(1.0 - fSquares);
                    tmpQuat.set(x, y, z, w);
                  } else {
                    tmpQuat.set(x, y, z, 0);
                  }

                }else{
                  tmpQuat.set(
                    data[controller.dataValueIndex + (r * controller.columnCount) + 0],
                    data[controller.dataValueIndex + (r * controller.columnCount) + 1],
                    data[controller.dataValueIndex + (r * controller.columnCount) + 2],
                    data[controller.dataValueIndex + (r * controller.columnCount) + 3]
                  );

                }

                tmpQuat.normalize();
    
                frame.x = tmpQuat.x;
                frame.y = tmpQuat.y;
                frame.z = tmpQuat.z;
                frame.w = tmpQuat.w;
    
                controller.data[r] = frame;
              }
            break;
            case AuroraModel.ControllerType.Scale:
              for (let r = 0; r < controller.frameCount; r++) {
                let frame = {};
                frame.time = data[controller.timeKeyIndex + r];
                frame.value = data[controller.dataValueIndex + (r * controller.columnCount) + 0] || 0.0;
                controller.data[r] = frame;
              }
            break;
          }

          //Mesh Controllers
          if ((NodeType & AuroraModel.NODETYPE.Mesh) == AuroraModel.NODETYPE.Mesh) {
            switch(controller.type){
              case AuroraModel.ControllerType.Alpha:
                for (let r = 0; r < controller.frameCount; r++) {
                  let frame = {};
                  frame.time = data[controller.timeKeyIndex + r];
                  frame.value = data[controller.dataValueIndex + (r * controller.columnCount) + 0] || 0.0;
                  controller.data[r] = frame;
                }
              break;
              case AuroraModel.ControllerType.SelfIllumColor:
                for (let r = 0; r < controller.frameCount; r++) {
      
                  let frame = {};
      
                  frame.time = data[controller.timeKeyIndex + r];
                  frame.r = data[controller.dataValueIndex + (r * controller.columnCount) + 0] || 0.0;
                  frame.g = data[controller.dataValueIndex + (r * controller.columnCount) + 1] || 0.0;
                  frame.b = data[controller.dataValueIndex + (r * controller.columnCount) + 2] || 0.0;
      
                  controller.data[r] = frame;
                }
              break;
            }
          }

          //Light Controllers
          if ((NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
            switch(controller.type){
              case AuroraModel.ControllerType.Color:
                for (let r = 0; r < controller.frameCount; r++) {
                  let frame = {};
                  frame.time = data[controller.timeKeyIndex + r];
                  frame.r = data[controller.dataValueIndex + (r * controller.columnCount) + 0];
                  frame.g = data[controller.dataValueIndex + (r * controller.columnCount) + 1];
                  frame.b = data[controller.dataValueIndex + (r * controller.columnCount) + 2];
                  controller.data[r] = frame
                }
              break;
              case AuroraModel.ControllerType.ShadowRadius:
              case AuroraModel.ControllerType.Radius:
              case AuroraModel.ControllerType.VerticalDisplacement:
              case AuroraModel.ControllerType.Multiplier:
                for (let r = 0; r < controller.frameCount; r++) {
                  let frame = {};
                  frame.time = data[controller.timeKeyIndex + r];
                  frame.value = data[controller.dataValueIndex + (r * controller.columnCount) + 0];
                  controller.data[r] = frame
                }
              break;
            }
          }

          //Emitter Controllers
          if ((NodeType & AuroraModel.NODETYPE.Emitter) == AuroraModel.NODETYPE.Emitter) {
            switch(controller.type){
              //case AuroraModel.ControllerType.P2P_Bezier3:
              case AuroraModel.ControllerType.ColorStart:
              case AuroraModel.ControllerType.ColorMid:
              case AuroraModel.ControllerType.ColorEnd:
                for (let r = 0; r < controller.frameCount; r++) {
                  let frame = {};
                  frame.time = data[controller.timeKeyIndex + r];
                  frame.r = data[controller.dataValueIndex + (r * controller.columnCount) + 0];
                  frame.g = data[controller.dataValueIndex + (r * controller.columnCount) + 1];
                  frame.b = data[controller.dataValueIndex + (r * controller.columnCount) + 2];
                  controller.data[r] = frame
                }
              break;
              case AuroraModel.ControllerType.LifeExp:
              case AuroraModel.ControllerType.BirthRate:
              case AuroraModel.ControllerType.Bounce_Co:
              case AuroraModel.ControllerType.Drag:
              case AuroraModel.ControllerType.Grav:
              case AuroraModel.ControllerType.FPS:
              case AuroraModel.ControllerType.Detonate:
              case AuroraModel.ControllerType.CombineTime:
              case AuroraModel.ControllerType.Spread:
              case AuroraModel.ControllerType.Velocity:
              case AuroraModel.ControllerType.RandVel:
              case AuroraModel.ControllerType.Mass:
              case AuroraModel.ControllerType.ParticleRot:
              case AuroraModel.ControllerType.SizeStart:
              case AuroraModel.ControllerType.SizeMid:
              case AuroraModel.ControllerType.SizeEnd:
              case AuroraModel.ControllerType.SizeStart_Y:
              case AuroraModel.ControllerType.SizeMid_Y:
              case AuroraModel.ControllerType.SizeEnd_Y:
              case AuroraModel.ControllerType.LightningDelay:
              case AuroraModel.ControllerType.LightningRadius:
              case AuroraModel.ControllerType.LightningScale:
              case AuroraModel.ControllerType.LightningZigZag:
              case AuroraModel.ControllerType.LightningSubDiv:
              case AuroraModel.ControllerType.P2P_Bezier2:
              case AuroraModel.ControllerType.P2P_Bezier3:
              case AuroraModel.ControllerType.AlphaStart:
              case AuroraModel.ControllerType.AlphaMid:
              case AuroraModel.ControllerType.AlphaEnd:
              case AuroraModel.ControllerType.PercentStart:
              case AuroraModel.ControllerType.PercentMid:
              case AuroraModel.ControllerType.PercentEnd:
              case AuroraModel.ControllerType.Threshold:
              case AuroraModel.ControllerType.XSize:
              case AuroraModel.ControllerType.YSize:
              case AuroraModel.ControllerType.FrameStart:
              case AuroraModel.ControllerType.FrameEnd:
              case AuroraModel.ControllerType.BlurLength:
              case 240:
                for (let r = 0; r < controller.frameCount; r++) {
                  let frame = {};
                  frame.time = data[controller.timeKeyIndex + r];
                  frame.value = data[controller.dataValueIndex + (r * controller.columnCount) + 0];
                  controller.data[r] = frame
                }
              break;
            }
          }

        }

        if(controller.data.length)
          controller.data[controller.data.length-1].lastFrame = true;

        controller = OdysseyController.From(controller);

        controllers.set(controller.type, controller);//controllers[controller.type] = controller;
        
      }

    }

    this.mdlReader.Seek(pos);
    return controllers;
  }

  ReadAnimation(offset){
    let pos = this.mdlReader.position;
    this.mdlReader.Seek(offset);

    let anim = new AuroraModelAnimation();

    anim._position = new THREE.Vector3();
    anim._quaternion = new THREE.Quaternion();

    //GeometryHeader
    anim.p_func1 = this.mdlReader.ReadUInt32(); //4Byte Function pointer
    anim.p_func12 = this.mdlReader.ReadUInt32(); //4Byte Function pointer

    anim.name = this.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,'');
    anim.RootNodeOffset = this.mdlReader.ReadUInt32();
    anim.NodeCount = this.mdlReader.ReadUInt32();

    this.mdlReader.MovePointerForward(24); //Skip unknown array definitions

    anim.RefCount = this.mdlReader.ReadUInt32();
    anim.GeometryType = this.mdlReader.ReadByte(); //Model Type
    anim.Unknown4 = this.mdlReader.ReadBytes(3); //Padding

    //Animation
    anim.length = this.mdlReader.ReadSingle();
    anim.transition = this.mdlReader.ReadSingle();
    anim.ModelName = this.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,'').toLowerCase();

    let _eventsDef = AuroraModel.ReadArrayDefinition(this.mdlReader);
    //anim.events = AuroraModel.ReadArrayFloats(this.mdlReader, this.fileHeader.ModelDataOffset + _eventsDef.offset, _eventsDef.count);
    anim.events = new Array(_eventsDef.count);
    this.mdlReader.MovePointerForward(4); //Unknown uint32

    let events_pos = this.mdlReader.position;

    if (_eventsDef.count > 0) {
      this.mdlReader.Seek(this.fileHeader.ModelDataOffset + _eventsDef.offset);
      for (let i = 0; i < _eventsDef.count; i++) {
        anim.events[i] = { 
          length: this.mdlReader.ReadSingle(), 
          name: this.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,'') 
        };
      }
    }

    //this.mdlReader.Seek(events_pos);

    //Animation Node
    anim.nodes = [];
    anim.rootNode = this.ReadAnimationNode(anim, this.fileHeader.ModelDataOffset + anim.RootNodeOffset);
    

    anim.currentFrame = 0;
    anim.elapsed = 0;
    anim.lastTime = 0;

    this.animations.push(anim);
    this.mdlReader.Seek(pos);

    return anim;
  }

  ReadAnimationNode(anim, offset){
    let pos = this.mdlReader.position;
    this.mdlReader.Seek(offset);

    //Animation Node
    let node = new AuroraModelAnimationNode();

    node.NodeType = this.mdlReader.ReadUInt16();
    node.Supernode = this.mdlReader.ReadUInt16();
    node.NodePosition = this.mdlReader.ReadUInt16();

    if (node.NodePosition < this.names.length){
      node.name = this.names[node.NodePosition].replace(/\0[\s\S]*$/g,'').toLowerCase();
    }

    this.mdlReader.MovePointerForward(2);

    node.rootNodeOffset = this.mdlReader.ReadUInt32();
    node.parentNodeOffset = this.mdlReader.ReadUInt32();

    node.position.x = this.mdlReader.ReadSingle();
    node.position.y = this.mdlReader.ReadSingle();
    node.position.z = this.mdlReader.ReadSingle();

    node.quaternion.w = this.mdlReader.ReadSingle();
    node.quaternion.x = this.mdlReader.ReadSingle();
    node.quaternion.y = this.mdlReader.ReadSingle();
    node.quaternion.z = this.mdlReader.ReadSingle();

    let _childDef = AuroraModel.ReadArrayDefinition(this.mdlReader);
    let children = AuroraModel.ReadArray(this.mdlReader, this.fileHeader.ModelDataOffset + _childDef.offset, _childDef.count);
    let _contKeyDef = AuroraModel.ReadArrayDefinition(this.mdlReader);
    let _contDataDef = AuroraModel.ReadArrayDefinition(this.mdlReader);
    let controllerData = AuroraModel.ReadArrayFloats(this.mdlReader, this.fileHeader.ModelDataOffset + _contDataDef.offset, _contDataDef.count);
    let controllerData2 = AuroraModel.ReadArray(this.mdlReader, this.fileHeader.ModelDataOffset + _contDataDef.offset, _contDataDef.count);
    //console.log('animation', node.name, controllerData);
    node.controllers = this.ReadNodeControllers(node, this.fileHeader.ModelDataOffset + _contKeyDef.offset, _contKeyDef.count, controllerData, controllerData2);
    
    anim.nodes.push(node);
    let len = children.length;
    for (let i = 0; i < len; i++) {
      //node.children.push( this.ReadAnimationNode(anim, this.fileHeader.ModelDataOffset + children[i] ) );
      this.ReadAnimationNode(anim, this.fileHeader.ModelDataOffset + children[i] )
    }

    this.mdlReader.Seek(pos);

    

    return node;
  }

  static ReadArray(stream, offset, count){
    let posCache = stream.position;
    stream.position = offset;

    let values = [];
    for (let i = 0; i < count; i++) {
      values[i] = stream.ReadUInt32();
    }

    stream.position = posCache;
    return values;
  }

  static ReadArrayFloats(stream, offset, count){
    let posCache = stream.position;
    stream.position = offset;

    let values = [];
    for (let i = 0; i < count; i++) {
      values[i] = stream.ReadSingle();
    }

    stream.position = posCache;
    return values;
  }

  //Gets the Array Offset & Length
  static ReadArrayDefinition(stream){
    return {
      offset: stream.ReadUInt32(), 
      count: stream.ReadUInt32(), 
      count2: stream.ReadUInt32()
    };
  }

  static readStrings(stream, offsets, offset) {
    let posCache = stream.position;
    let strings = [];

    for (let i = 0; i != offsets.length; i++){
      stream.position = offset + offsets[i];

      let str = "";
      let char;

      while ((char = stream.ReadChar()).charCodeAt() != 0)
        str = str + char;

      strings[i] = str;
    }

    stream.position = posCache;
    return strings;
  }

}

//https://bitbucket.org/bead-v/mdledit/src/678765df0b1369a4a86bc901188e5e3975b10e8a/MDL.h?at=master&fileviewer=file-view-default
const EMITTER_FLAGS = {
  P2P           :  0x0001,
  P2P_SEL       :  0x0002,
  AFFECTED_WIND :  0x0004,
  TINTED        :  0x0008,
  BOUNCE        :  0x0010,
  RANDOM        :  0x0020,
  INHERIT       :  0x0040,
  INHERIT_VEL   :  0x0080,
  INHERIT_LOCAL :  0x0100,
  SPLAT         :  0x0200,
  INHERIT_PART  :  0x0400,
  DEPTH_TEXTURE :  0x0800, //maybe, per ndix UR
  13            :  0x1000,
  2000          :  0x2000,
  3000          :  0x4000,
  4000          :  0x8000,
};

AuroraModel.NODETYPE = {
  Header: 0x0001,
  Light: 0x0002,
  Emitter: 0x0004,
  Camera: 0x0008,
  Reference: 0x0010,
  Mesh: 0x0020,
  Skin: 0x0040,
  Anim: 0x0080,
  Dangly: 0x0100,
  AABB: 0x0200,
  Saber: 0x0800, //2081
};

AuroraModel.MDXFLAG = {
  VERTEX: 0x0001,
  UV1: 0x0002,
  UV2: 0x0004,
  UV3: 0x0008,
  UV4: 0x0010,
  NORMAL: 0x0020,
  COLOR: 0x0040,
  TANGENT1: 0x0080,
  TANGENT2: 0x0100,
  TANGENT3: 0x0200,
  TANGENT4: 0x0400
}

AuroraModel.MODELFLAG = {
  FlagEffect: 0x01,
  FlagTile: 0x02,
  FlagCharacter: 0x04,
  FlagDoor: 0x08,
  FlagPlaceable: 0x20,
  FlagOther: 0x00,
}

AuroraModel.ControllerType = {
  Position             : 8,
  Orientation          : 20,
  Scale                : 36,
  Color                : 76,
  Radius               : 88,
  ShadowRadius         : 96,
  VerticalDisplacement : 100,
  Multiplier           : 140,
  AlphaEnd             : 80,
  AlphaStart           : 84,
  BirthRate            : 88,
  Bounce_Co            : 92,
  ColorEnd             : 380,
  ColorStart           : 392,
  CombineTime          : 96,
  Drag                 : 100,
  FPS                  : 104,
  FrameEnd             : 108,
  FrameStart           : 112,
  Grav                 : 116,
  LifeExp              : 120,
  Mass                 : 124,
  Threshold            : 164,
  P2P_Bezier2          : 128,
  P2P_Bezier3          : 132,
  ParticleRot          : 136,
  RandVel              : 140,
  SizeStart            : 144,
  SizeEnd              : 148,
  SizeStart_Y          : 152,
  SizeEnd_Y            : 156,
  Spread               : 160,
  Threshold            : 164,
  Velocity             : 168,
  XSize                : 172,
  YSize                : 176,
  BlurLength           : 180,
  LightningDelay       : 184,
  LightningRadius      : 188,
  LightningSubDiv      : 196,
  LightningScale       : 192,
  LightningZigZag      : 200,
  Detonate             : 228,
  AlphaMid             : 216,
  ColorMid             : 284,
  PercentStart         : 220,
  PercentMid           : 224,
  PercentEnd           : 228,
  SizeMid              : 232,
  SizeMid_Y            : 236,
  SelfIllumColor       : 100,
  Alpha                : 132
};

module.exports = AuroraModel;
  