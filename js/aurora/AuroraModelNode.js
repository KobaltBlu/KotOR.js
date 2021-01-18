/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AuroraModelNode
 */

 class AuroraModelNode {

  constructor(parent = undefined){
    this.parent = parent;
    this.type = AuroraModel.NODETYPE.Header;
    this.childNodes = [];
    this.childOffsets = [];
    this.controllers = new Map();
    this.position = {x: 0, y: 0, z: 0};
    this.quaternion = {x: 0, y: 0, z: 0, w: 1};
    this.roomStatic = true;
  }

  setParent(parent = undefined){
    this.parent = parent;
  }

  setType(type){
    this.NodeType = type;
    this.type = type;
  }

  add(node){
    this.childNodes.push(node);
  }

  addController(controller){

  }

  getControllerByType(type = -1){
    return this.controllers.get(type);
  }

  readBinary(auroraModel = undefined){
    this.auroraModel = auroraModel;

    this.NodeType = this.auroraModel.mdlReader.ReadUInt16();  

    this.Supernode = this.auroraModel.mdlReader.ReadUInt16();
    this.NodePosition = this.auroraModel.mdlReader.ReadUInt16();

    if (this.NodePosition < this.auroraModel.names.length){
      this.name = this.auroraModel.names[this.NodePosition].replace(/\0[\s\S]*$/g,'').toLowerCase();
    }else{
      this.name = '';
    }

    if(!this.auroraModel.nodes[this.name])
      this.auroraModel.nodes[this.name] = this;

    //Non static objects in room meshes are children of the node that is the name of the model plus a
    //like: MODELNAMEa or m02ac_02ba

    if(this.parent){
      if(this.name == (this.auroraModel.geometryHeader.ModelName.trim()+'a').toLowerCase()){
        this.roomStatic = false;
      }else{
        this.roomStatic = this.parent.roomStatic;
      }
    }

    this.auroraModel.mdlReader.position += (6 + 4);

    //Node Position
    this.position.x = this.auroraModel.mdlReader.ReadSingle();
    this.position.y = this.auroraModel.mdlReader.ReadSingle();
    this.position.z = this.auroraModel.mdlReader.ReadSingle();

    //Node Quaternion
    this.quaternion.w = this.auroraModel.mdlReader.ReadSingle();
    this.quaternion.x = this.auroraModel.mdlReader.ReadSingle();
    this.quaternion.y = this.auroraModel.mdlReader.ReadSingle();
    this.quaternion.z = this.auroraModel.mdlReader.ReadSingle();

    //Node Children
    let _childDef = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader);
    this.childOffsets = AuroraModel.ReadArray(this.auroraModel.mdlReader, this.auroraModel.fileHeader.ModelDataOffset + _childDef.offset, _childDef.count);

    //Node Controllers
    let _contKeyDef = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader);
    let _contDataDef = AuroraModel.ReadArrayDefinition(this.auroraModel.mdlReader);
    let controllerData = AuroraModel.ReadArrayFloats(this.auroraModel.mdlReader, this.auroraModel.fileHeader.ModelDataOffset + _contDataDef.offset, _contDataDef.count);
    let controllerData2 = AuroraModel.ReadArray(this.auroraModel.mdlReader, this.auroraModel.fileHeader.ModelDataOffset + _contDataDef.offset, _contDataDef.count);

    this.controllers = this.readBinaryNodeControllers(this.auroraModel.fileHeader.ModelDataOffset + _contKeyDef.offset, _contKeyDef.count, controllerData, controllerData2);

  }

  readBinaryNodeControllers(offset, count, data, data2){
    let pos = this.auroraModel.mdlReader.position;
    this.auroraModel.mdlReader.Seek(offset);

    let controllers = new Map();
    for(let i = 0; i < count; i++){

      let controller = {
        data: []
      };

      controller.type = this.auroraModel.mdlReader.ReadInt32();
      this.auroraModel.mdlReader.Skip(2); //controller.unk_keyflag = this.auroraModel.mdlReader.ReadInt16();
      controller.frameCount = this.auroraModel.mdlReader.ReadUInt16();
      controller.timeKeyIndex = this.auroraModel.mdlReader.ReadUInt16(); //Index into the float array of the first time key
      controller.dataValueIndex = this.auroraModel.mdlReader.ReadUInt16(); //Index into the float array of the first controller data value
      controller.columnCount = this.auroraModel.mdlReader.ReadByte();//Number of columns excluding the time key column
      this.auroraModel.mdlReader.Skip(3); //Skip unused padding
      
      let tmpQuat = new THREE.Quaternion();

      let NodeType = this.NodeType;
      if(this.auroraModel.nodes[this.name]){
        controller.nodeType = NodeType = this.auroraModel.nodes[this.name].NodeType;
      }
      //console.log(this.name, controller.nodeType, this.auroraModel.nodes);
    
      if(controller.frameCount != -1){

        if(this instanceof AuroraModelAnimationNode || this instanceof AuroraModelNode){

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
                  //console.log('bezier', this.name, controller);
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
        controllers.set(controller.type, controller);
        
      }

    }

    this.auroraModel.mdlReader.Seek(pos);
    return controllers;
  }

}

module.exports = AuroraModelNode;
