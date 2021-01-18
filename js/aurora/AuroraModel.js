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

    this.geometryHeader.FunctionPointer0 = this.mdlReader.ReadUInt32(); //4Byte Function pointer
    this.geometryHeader.FunctionPointer1 = this.mdlReader.ReadUInt32(); //4Byte Function pointer

    //Thanks bead-v :)
    //Use FunctionPointer0 in the geometry header to determine the engine version the model was prepared for.
    switch(this.geometryHeader.FunctionPointer0){
      case 4273776: //K1
        this.engine = AuroraModel.ENGINE.K1;
      break;
      case 4285200: //K2
        this.engine = AuroraModel.ENGINE.K2;
      break;
      case 4254992: //K1_XBOX
        this.engine = AuroraModel.ENGINE.K1_XBOX;
      break;
      case 4285872: //K2_XBOX
        this.engine = AuroraModel.ENGINE.K2_XBOX;
      break;
    }

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
    let nodeOffset = this.geometryHeader.RootNodeOffset;
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

    this.mdlReader.position = this.fileHeader.ModelDataOffset + offset;  
    let node = undefined;

    //Read the node type so we can know what type of node we are dealing with
    let NodeType = this.mdlReader.ReadUInt16();
    this.mdlReader.position -= 2;

    if ((NodeType & AuroraModel.NODETYPE.Emitter) == AuroraModel.NODETYPE.Emitter) {
      node = new AuroraModelNodeEmitter(parent);
    }else if ((NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
      node = new AuroraModelNodeLight(parent);
    }else if ((NodeType & AuroraModel.NODETYPE.Skin) == AuroraModel.NODETYPE.Skin) {
      node = new AuroraModelNodeSkin(parent);
    }else if ((NodeType & AuroraModel.NODETYPE.Dangly) == AuroraModel.NODETYPE.Dangly) {
      node = new AuroraModelNodeDangly(parent);
    }else if ((NodeType & AuroraModel.NODETYPE.AABB) == AuroraModel.NODETYPE.AABB) {
      node = new AuroraModelNodeAABB(parent);
    }else if ((NodeType & AuroraModel.NODETYPE.Anim) == AuroraModel.NODETYPE.Anim) {
      this.mdlReader.position += 0x38;
    }else if ((NodeType & AuroraModel.NODETYPE.Mesh) == AuroraModel.NODETYPE.Mesh) {
      node = new AuroraModelNodeMesh(parent);
    }else if ((NodeType & AuroraModel.NODETYPE.Reference) == AuroraModel.NODETYPE.Reference) {
      node = new AuroraModelNodeReference(parent);
    }else{
      node = new AuroraModelNode(parent);
    }

    if(node instanceof AuroraModelNode){
      node.readBinary(this);
      node.auroraModel = undefined;

      for(let i = 0, len = node.childOffsets.length; i < len; i++){
        node.add( this.ReadNode(node.childOffsets[i], node ) );
      }
  
      return node;
    }else{
      console.error('AuroraModel.ReadNode', 'Unhandled Node', NodeType);
    }

    return node;
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

    let node = new AuroraModelAnimationNode(anim);
    node.readBinary(this);
    anim.nodes.push(node);

    //Child Animation Nodes
    let len = node.childOffsets.length;
    for (let i = 0; i < len; i++) {
      this.ReadAnimationNode(anim, this.fileHeader.ModelDataOffset + node.childOffsets[i] )
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
AuroraModel.EMITTER_FLAGS = {
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

AuroraModel.CLASS = {
  OTHER:      0x00,
  EFFECT:     0x01,
  TILE:       0x02,
  CREATURE:   0x04,
  DOOR:       0x08,
  LIGHTSABER: 0x10,
  PLACEABLE:  0x20,
  FLYER:      0x40,
};

AuroraModel.ENGINE = {
  K1:       0x0001,
  K2:       0x0002,
  K1_XBOX:  0x0004,
  K2_XBOX:  0x0008
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
  