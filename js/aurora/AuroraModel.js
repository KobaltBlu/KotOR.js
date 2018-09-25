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

    let mdlReader = new BinaryReader(new Buffer(archive.GetResourceDataSync(archive.GetResourceByLabel(name, ResourceTypes['mdl']))));
    let mdxReader = new BinaryReader(new Buffer(archive.GetResourceDataSync(archive.GetResourceByLabel(name, ResourceTypes['mdx']))));

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

    //Non static objects in room meshes are children of the node that is the name of the model plus a
    //like: MODELNAMEa or m02ac_02ba
    if(parent){
      if(node.name == (this.geometryHeader.ModelName+'a').toLowerCase() || !parent.roomStatic){
        node.roomStatic = false;
      }else{
        node.roomStatic = true;
      }
    }

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
    node.NodeType = NodeType;
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
      this.mdlReader.position += 0x18;
    }

    if ((NodeType & AuroraModel.NODETYPE.AABB) == AuroraModel.NODETYPE.AABB) {
      this.mdlReader.position += 0x4;
    }

    if ((NodeType & AuroraModel.NODETYPE.Anim) == AuroraModel.NODETYPE.Anim) {
      this.mdlReader.position += 0x38;
    }

    node.NodeType = NodeType;
    let childrenLen = children.length;
    for (let i = 0; i != childrenLen; i++){
      node.add( this.ReadNode(this.fileHeader.ModelDataOffset + children[i], node ) );
    }

    return node;
  }

  ReadMeshNode(mesh){

    this.mdlReader.position += 8;

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

    mesh.TransparencyHint = this.mdlReader.ReadUInt32();

    let _hasTransparencyHint = true;
    let _transparencyHint = (mesh.TransparencyHint != 0);

    mesh.TextureMap1 = this.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,''); //This stores the texture filename
    mesh.TextureMap2 = this.mdlReader.ReadChars(32).replace(/\0[\s\S]*$/g,''); //This stores the lightmap filename
    mesh.TextureMap3 = this.mdlReader.ReadChars(12).replace(/\0[\s\S]*$/g,''); //This stores a 3rd texture filename (?)
    mesh.TextureMap4 = this.mdlReader.ReadChars(12).replace(/\0[\s\S]*$/g,''); //This stores a 3rd texture filename (?)

    mesh.IndexCountArrayDef = AuroraModel.ReadArrayDefinition(this.mdlReader); //IndexCounterArray
    mesh.VertexLocArrayDef = AuroraModel.ReadArrayDefinition(this.mdlReader); //vertex_indices_offset

    if (mesh.VertexLocArrayDef.count > 1)
        throw ("Face offsets offsets count wrong "+ mesh.VertexLocArrayDef.count);

    mesh.InvertedCountArrayDef = AuroraModel.ReadArrayDefinition(this.mdlReader); //MeshInvertedCounterArray
    //mesh.InvertedCountArrayDefDuplicate = AuroraModel.ReadArrayDefinition(this.mdlReader); //MeshInvertedCounterArray

    this.mdlReader.position += 12;

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

    mesh.nAnimateUV = this.mdlReader.ReadUInt32();
    mesh.fUVDirectionX = this.mdlReader.ReadSingle();
    mesh.fUVDirectionY = this.mdlReader.ReadSingle();
    mesh.fUVJitter = this.mdlReader.ReadSingle();
    mesh.fUVJitterSpeed = this.mdlReader.ReadSingle();

    mesh.MDXDataSize = this.mdlReader.ReadUInt32();
    mesh.MDXDataBitmap = this.mdlReader.ReadUInt32();
    let MDXVertexVertexOffset = this.mdlReader.ReadUInt32();
    let MDXVertexNormalsOffset = this.mdlReader.ReadUInt32();
    let MDXVertexNormalsUnunsed = this.mdlReader.ReadUInt32();

    //mesh.UV
    let UVOffsets = [
      this.mdlReader.ReadInt32(),
      this.mdlReader.ReadInt32(),
      this.mdlReader.ReadInt32(),
      this.mdlReader.ReadInt32()
    ];

    mesh.OffsetToMdxTangent1 = this.mdlReader.ReadInt32();
    mesh.OffsetToMdxTangent2 = this.mdlReader.ReadInt32();
    mesh.OffsetToMdxTangent3 = this.mdlReader.ReadInt32();
    mesh.OffsetToMdxTangent4 = this.mdlReader.ReadInt32();

    mesh.VerticiesCount = this.mdlReader.ReadUInt16();
    mesh.TextureCount = this.mdlReader.ReadUInt16();

    mesh.HasLightmap = this.mdlReader.ReadByte() ? true : false;
    mesh.RotateTexture = this.mdlReader.ReadByte();
    mesh.BackgroundGeometry = this.mdlReader.ReadByte();
    mesh.FlagShadow = this.mdlReader.ReadByte();
    mesh.Beaming = this.mdlReader.ReadByte();
    mesh.FlagRender = this.mdlReader.ReadByte();

    //Skipping these bytes will let TSL work
    if (GameInitializer.currentGame == Games.TSL){
      //this.mdlReader.position += 8; //Skip 8 Bytes
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

    mesh.vertices = [];
    mesh.normals = [];
    mesh.tvectors = [[], [], [], []];
    mesh.texCords = [[], [], [], []];
    mesh.indexArray = [];
    mesh.uvs = [];
    mesh.faces = [];

    mesh.vertices.length = mesh.VerticiesCount;
    mesh.normals.length = mesh.VerticiesCount;

    for (let t = 0; t < mesh.TextureCount; t++) {
      mesh.tvectors[t].length = mesh.VerticiesCount;
    }

    for (let i = 0; i < mesh.VerticiesCount; i++) {
      // Position
      this.mdxReader.position = (MDXNodeDataOffset + (i * mesh.MDXDataSize));
      mesh.vertices[i] = new THREE.Vector3(this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle());
      // Normal
      mesh.normals[i] = new THREE.Vector3(this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle());

      // TexCoords
      for (let t = 0; t < mesh.TextureCount; t++) {
        try {
          if (UVOffsets[t] != -1) {
            this.mdxReader.position = (MDXNodeDataOffset + i * mesh.MDXDataSize + UVOffsets[t]);
            mesh.tvectors[t][i] = (new THREE.Vector2(this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle()));
          } else {
            //mesh.tvectors[t].Add(new vec2(0.0f));
          }
        }catch(e){
          
        }
      }
    }

    this.mdlReader.position = this.fileHeader.ModelDataOffset + mesh.VertexLocArrayDef.offset;
    let offVerts = this.mdlReader.ReadUInt32();

    mesh.faces2 = [];

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
        mesh.texCords[0][i] = ([mesh.tvectors[0][index1], mesh.tvectors[0][index2], mesh.tvectors[0][index3]]);
        mesh.texCords[1][i] = ([mesh.tvectors[1][index1], mesh.tvectors[1][index2], mesh.tvectors[1][index3]]);
      }
    }

    this.mdlReader.position = endPos;

    return mesh;
  }

  ReadSkinNode(node){

      node.weights_def = AuroraModel.ReadArrayDefinition(this.mdlReader);

      node.mdx_vertex_struct_offset_bone_weights = this.mdlReader.ReadUInt32();
      node.mdx_vertex_struct_offset_bone_mapping_id = this.mdlReader.ReadUInt32();
      node.p_bone_mapping = this.mdlReader.ReadUInt32();
      node.count_bone_mapping = this.mdlReader.ReadUInt32();

      node.bone_quats_def = AuroraModel.ReadArrayDefinition(this.mdlReader);
      node.bone_vertex_def = AuroraModel.ReadArrayDefinition(this.mdlReader);
      node.bone_constants_def = AuroraModel.ReadArrayDefinition(this.mdlReader);

      node.bone_parts = [];//new Array(17);

      //this.mdlReader.position -= (2*3);

      for(let i = 0; i < 16; i++){
        node.bone_parts[i] = this.mdlReader.ReadInt16();
      }

      node.spare = this.mdlReader.ReadInt32();

      node.weights = [];//new Array(node.VerticiesCount*4);
      node.boneIdx = [];//new Array(node.VerticiesCount*4);

      for (let i = 0; i < node.VerticiesCount; i++) {
        // Position
        this.mdxReader.position = (node._mdxNodeDataOffset + (i * node.MDXDataSize)) + node.mdx_vertex_struct_offset_bone_weights;
        
        node.weights[i] = [0, 0, 0, 0];
        for(let i2 = 0; i2 < 4; i2++){
          let float = this.mdxReader.ReadSingle();
          node.weights[i][i2] = Math.abs(float);//(float == -1 ? 0 : float);//[i][i2] = float == -1 ? 0 : float;
        }

        node.boneIdx[i] = [0, 0, 0, 0];
        for(let i2 = 0; i2 < 4; i2++){
          let float = this.mdxReader.ReadSingle();
          node.boneIdx[i][i2] = Math.abs(float);//(float == -1 ? 0 : float);//[i][i2] = float == -1 ? 0 : float;
        }
      }

      if (node.count_bone_mapping > 0) {
        this.mdlReader.Seek(this.fileHeader.ModelDataOffset + node.p_bone_mapping);
        node.bone_mapping = new Array(node.count_bone_mapping);
        for(let i = 0; i < node.count_bone_mapping; i++){
          node.bone_mapping[i] = this.mdlReader.ReadSingle();
        }
      }

      if (node.bone_quats_def.count > 0) {
        this.mdlReader.Seek(this.fileHeader.ModelDataOffset + node.bone_quats_def.offset);
        node.bone_quats = new Array(node.bone_quats_def.count);
        for(let i = 0; i < node.bone_quats_def.count; i++){
          let w = this.mdlReader.ReadSingle();
          node.bone_quats[i] = new THREE.Quaternion(this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle(), w);
          node.bone_quats[i].normalize();
        }
      }

      if (node.bone_vertex_def.count > 0) {
        this.mdlReader.Seek(this.fileHeader.ModelDataOffset + node.bone_vertex_def.offset);
        node.bone_vertex = new Array(node.bone_vertex_def.count);
        for(let i = 0; i < node.bone_vertex_def.count; i++){
          node.bone_vertex[i] = new THREE.Vector3(this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle(), this.mdxReader.ReadSingle());
        }
      }

      if (node.bone_constants_def.count > 0) {
        this.mdlReader.Seek(this.fileHeader.ModelDataOffset + node.bone_constants_def.offset);
        node.bone_constants = new Array(node.bone_constants_def.count);
        for(let i = 0; i < node.bone_constants_def.count; i++){
          node.bone_constants[i] = this.mdlReader.ReadUInt16();
        }
      }

  }

  ReadLightNode(light){

    light.FlareRadius = this.mdlReader.ReadSingle();

    this.mdlReader.Skip(0x0C); //Unknown UInt32 array

    light.FlareSizes = new THREE.Vector3(this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle());
    light.FlarePositions = new THREE.Vector3(this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle());
    light.FlareColorShifts = new THREE.Vector3(this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle(), this.mdlReader.ReadSingle());

    light.PointerArray = this.mdlReader.ReadChars(0x0C);

    light.LightPriority = this.mdlReader.ReadUInt32();
    light.AmbientFlag = this.mdlReader.ReadUInt32(); //Flag
    light.DynamicFlag = this.mdlReader.ReadUInt32();
    light.AffectDynamicFlag = this.mdlReader.ReadUInt32();
    light.ShadowFlag = this.mdlReader.ReadUInt32();
    light.GenerateFlareFlag = this.mdlReader.ReadUInt32();
    light.FadingLightFlag = this.mdlReader.ReadUInt32();

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

  ReadNodeControllers(node, offset, count, data, data2){
    let pos = this.mdlReader.position;
    this.mdlReader.Seek(offset);

    let controllers = {};
    for(let i = 0; i < count; i++){

      let controller = {
        data: []
      };

      controller.type = this.mdlReader.ReadInt32();
      this.mdlReader.Skip(2); //controller.unk_keyflag = this.mdlReader.ReadInt16();
      controller.rowCount = this.mdlReader.ReadUInt16();
      controller.timeKeyIndex = this.mdlReader.ReadUInt16(); //Index into the float array of the first time key
      controller.dataValueIndex = this.mdlReader.ReadUInt16(); //Index into the float array of the first controller data value
      controller.columnCount = this.mdlReader.ReadByte();//Number of columns excluding the time key column
      this.mdlReader.Skip(3); //Skip unused padding
      
      let tmpQuat = new THREE.Quaternion();
    
      if(controller.rowCount != -1){

        controllers[controller.type] = controller;
        controller.data = new Array(controller.rowCount);

        switch(controller.type){
          case ControllerType.P2P_Bezier3:
          case ControllerType.Position:
            for (let r = 0; r < controller.rowCount; r++) {
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
                //I think this might be a bezier curve?!?
                //pointB and pointC are relative to pointA

                frame.isBezier = true;
                frame.bezier = {
                  pointA: {
                    x: data[controller.dataValueIndex + (r * 9) + 0] || 0.0,
                    y: data[controller.dataValueIndex + (r * 9) + 1] || 0.0,
                    z: data[controller.dataValueIndex + (r * 9) + 2] || 0.0
                  },
                  pointB: {
                    x: data[controller.dataValueIndex + (r * 9) + 3] || 0.0,
                    y: data[controller.dataValueIndex + (r * 9) + 4] || 0.0,
                    z: data[controller.dataValueIndex + (r * 9) + 5] || 0.0
                  },
                  pointC: {
                    x: data[controller.dataValueIndex + (r * 9) + 6] || 0.0,
                    y: data[controller.dataValueIndex + (r * 9) + 7] || 0.0,
                    z: data[controller.dataValueIndex + (r * 9) + 8] || 0.0
                  }
                };

                vec3.x = data[controller.dataValueIndex + (r * 9) + 0] || 0.0;
                vec3.y = data[controller.dataValueIndex + (r * 9) + 1] || 0.0;
                vec3.z = data[controller.dataValueIndex + (r * 9) + 2] || 0.0;

              }
  
              frame.x = vec3.x;
              frame.y = vec3.y;
              frame.z = vec3.z;
  
              controller.data[r] =(frame);
            }
          break;
          case ControllerType.Orientation:
            for (let r = 0; r < controller.rowCount; r++) {
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
                  data[controller.dataValueIndex + (r * controller.columnCount) + 0] || 0.0,
                  data[controller.dataValueIndex + (r * controller.columnCount) + 1] || 0.0,
                  data[controller.dataValueIndex + (r * controller.columnCount) + 2] || 0.0,
                  data[controller.dataValueIndex + (r * controller.columnCount) + 3] || 1.0
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
          case ControllerType.Color:
          case ControllerType.ColorStart:
          case ControllerType.ColorMid:
          case ControllerType.ColorEnd:
            for (let r = 0; r < controller.rowCount; r++) {
              let frame = {};
              frame.time = data[controller.timeKeyIndex + r];
              frame.r = data[controller.dataValueIndex + (r * controller.columnCount) + 0];
              frame.g = data[controller.dataValueIndex + (r * controller.columnCount) + 1];
              frame.b = data[controller.dataValueIndex + (r * controller.columnCount) + 2];
              controller.data[r] = frame
            }
          break;
          case ControllerType.ShadowRadius:
            for (let r = 0; r < controller.rowCount; r++) {
              let frame = {};
              frame.time = data[controller.timeKeyIndex + r];
              frame.shadowRadius = data[controller.dataValueIndex + (r * controller.columnCount) + 0];
              controller.data[r] = frame
            }
          break;
          case ControllerType.LifeExp:
          case ControllerType.BirthRate:
          case ControllerType.Bounce_Co:
          case ControllerType.Drag:
          case ControllerType.Grav:
          case ControllerType.FPS:
          case ControllerType.Detonate:
          case ControllerType.Spread:
          case ControllerType.Velocity:
          case ControllerType.RandVel:
          case ControllerType.Mass:
          case ControllerType.Multiplier:
          case ControllerType.ParticleRot:
          case ControllerType.SizeStart:
          case ControllerType.SizeMid:
          case ControllerType.SizeEnd:
          case ControllerType.SizeStart_Y:
          case ControllerType.SizeMid_Y:
          case ControllerType.SizeEnd_Y:
          case ControllerType.Threshold:
          case ControllerType.XSize:
          case ControllerType.YSize:
          case ControllerType.FrameStart:
          case ControllerType.FrameEnd:
          case ControllerType.Scale:
          case 240:
            for (let r = 0; r < controller.rowCount; r++) {
              let frame = {};
              frame.time = data[controller.timeKeyIndex + r];
              frame.value = data[controller.dataValueIndex + (r * controller.columnCount) + 0];
              controller.data[r] = frame
            }
          break;
          case ControllerType.SelfIllumColor:
            for (let r = 0; r < controller.rowCount; r++) {
  
              let frame = {};
  
              frame.time = data[controller.timeKeyIndex + r];
              frame.r = data[controller.dataValueIndex + (r * controller.columnCount) + 0];
              frame.g = data[controller.dataValueIndex + (r * controller.columnCount) + 1];
              frame.b = data[controller.dataValueIndex + (r * controller.columnCount) + 2];
  
              controller.data[r] = frame
            }
          break;
          /*case ControllerType.Radius:
            for (let r = 0; r < controller.rowCount; r++) {
              let frame = {};
              frame.time = data[controller.timeKeyIndex + r];
              frame.radius = data[controller.dataValueIndex + (r * controller.columnCount) + 0];
              controller.data.push(frame);
            }
          break;*/
        }
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
    node.controllers = this.ReadNodeControllers(this.mdlReader, this.fileHeader.ModelDataOffset + _contKeyDef.offset, _contKeyDef.count, controllerData, controllerData2);
    
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

module.exports = AuroraModel;
  