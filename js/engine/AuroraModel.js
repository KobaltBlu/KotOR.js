/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The THREE.AuroraModel class takes an AuroraModel object and converts it into a THREE.js object
 */

THREE.AuroraModel = function () {
  
    THREE.Object3D.call( this );
  
    this.type = 'AuroraModel';
    this.context = undefined;
    this.meshes = [];
    this.danglyMeshes = [];
    this.bones = [];
    this.animations = [];
    this.emitters = [];
    this.lights = [];
    this.aabb = {};
    this.materials = {};
    this.animatedUV = [];

    this.puppeteer = undefined; 
  
    this.names = [];
    this.supermodels = {};

    this.target = null;
    this.force = 0;
    this.controlled = false;

    this.bones = {};
    this.skins = [];
  
    this.currentAnimation = undefined;
    this.animationData = {
      loop: false,
      cFrame: 0,
      elapsed: 0,
      lastTime: 0,
      delta: 0,
      lastEvent: 0,
      callback: undefined
    };
    this.animationQueue = [];
    this.animLoops = [];
    this.animationLoop = false;
    this._vec3 = new THREE.Vector3();
    this._quat = new THREE.Quaternion();
    this._animPosition = new THREE.Vector3();
    this._animQuaternion = new THREE.Quaternion();

    this.animNodeCache = {

    };

    this.hasCollision = false;
    this.invalidateCollision = true;

    this.local = {
      numbers: {},
      booleans: {},
      strings: {}
    };

    this.listening = false;
    this.listenPatterns = {};
  
    this.headhook = null;
    this.rhand = null;
    this.lhand = null;
    this.camerahook = null;  
    this.lookathook = null;
    this.impact = null;
  
    this.moduleObject = undefined;
    this.AxisFront = new THREE.Vector3();
    this.bonesInitialized = false;

    this.dispose = function(node = null){

      if(node == null)
        node = this;

     // console.log('dispose', node)
      for (let i = node.children.length - 1; i >= 0; i--) {
        const object = node.children[i];
        if (object.type === 'Mesh' || object.type === 'SkinnedMesh') {
          object.geometry.dispose();
          object.material.dispose();

          /*if(object.material.map)
            object.material.map.dispose();

          if(object.material.envMap)
            object.material.envMap.dispose();

          if(object.material.alphaMap)
            object.material.alphaMap.dispose();

          if(object.material.lightMap)
            object.material.lightMap.dispose();

          if(object.material.bumpMap)
            object.material.bumpMap.dispose();*/

        }else{
          if(object.hasOwnProperty('mesh')){
            delete object.mesh;
          }
        }
        this.dispose(object);
        node.remove(object);
      }

      if(node instanceof THREE.AuroraModel){
        this.meshes = [];
        this.danglyMeshes = [];
        this.bones = [];
        this.animations = [];
        this.emitters = [];
        this.lights = [];
        this.aabb = {};
        this.materials = {};
        this.bones = {};
        this.skins = [];

        this.puppeteer = undefined; 
        this.names = [];
        this.supermodels = {};
        this.target = null;
        this.force = 0;
        this.controlled = false;
        this.currentAnimation = undefined;
        this.animationData = {
          loop: false,
          cFrame: 0,
          elapsed: 0,
          lastTime: 0,
          delta: 0,
          lastEvent: 0,
          callback: undefined
        };
        this.animationQueue = [];
        this.animLoops = [];
        this.animationLoop = false;
        this.animNodeCache = {};
        this.options = {};

        this.listening = false;
        this.listenPatterns = {};
      
        this.headhook = null;
        this.lhand = null;
        this.rhand = null;
      
        this.moduleObject = undefined;

        if(this.parent instanceof THREE.Object3D){
          this.parent.remove(this);
        }
        
        Game.octree.remove(this);
        Game.octree_walkmesh.remove(this);
        //console.log(node);
      }

    }
  
    this.update = function(delta){

      if(this.puppeteer instanceof THREE.AuroraModel){
        this.puppeteer.update(delta);
        if(this.puppeteer.currentAnimation instanceof AuroraModelAnimation){
          if(this.puppeteer.bonesInitialized){
            this.updateAnimation(this.puppeteer.currentAnimation, delta, () => {
              if(!this.puppeteer.currentAnimation.data.loop){
                this.stopAnimation();
              }
            });
          }
        }
      }else{
        if(this.currentAnimation instanceof AuroraModelAnimation){
          if(this.bonesInitialized){
            this.updateAnimation(this.currentAnimation, delta, () => {
              if(!this.currentAnimation.data.loop){
                this.stopAnimation();
              }
            });
          }
        }
        if(this.bonesInitialized && this.animLoops.length){
          for(let i = 0; i < this.animLoops.length; i++){
            this.updateAnimation(this.animLoops[i], delta);
          }
        }
      }

      for(let i = 0; i < this.animatedUV.length; i++){
        let aUV = this.animatedUV[i];

        if(aUV.material.map){
          aUV.material.map.offset.x += aUV.speed.x * delta;
          aUV.material.map.offset.y += aUV.speed.y * delta;
        }

      }
  
      //for(let i = 0; i < this.emitters.length; i++){
        //let emitter = this.emitters[i].emitter;
        //emitter.tick();
      //}
  
    }

    this.setPuppeteer = function(pup = undefined){
      this.puppeteer = pup;
    };

    this.removePuppeteer = function(){
      this.puppeteer = undefined;
    };

    this.poseAnimation = function(anim){

      if(typeof anim === 'number'){
        anim = this.animations[anim];
      }else if(typeof anim === 'string'){
        anim = this.getAnimationByName(anim);
      }else{
        anim = anim;
      }

      this.currentAnimation = anim;

      let animNodesLen = anim.nodes.length;
      for(let i = 0; i < animNodesLen; i++){
        this.poseAnimationNode(anim.nodes[i]);
      }
    };
  
    this.playAnimation = function(anim = undefined, inData = {}, callback = undefined){
      let data = {};
      if(typeof inData == 'object'){
        data = Object.assign({
          loop: false,
          blend: true,
          cFrame: 0,
          elapsed: 0,
          lastTime: 0,
          delta: 0,
          lastEvent: 0,
          callback: callback
        }, inData);
      }else{
        data = {
          loop: inData ? true : false,
          blend: true,
          cFrame: 0,
          elapsed: 0,
          lastTime: 0,
          delta: 0,
          lastEvent: 0,
          callback: callback
        };
      }
      
      if(typeof anim === 'number'){
        this.currentAnimation = this.animations[anim];
      }else if(typeof anim === 'string'){
        this.currentAnimation = this.getAnimationByName(anim);
      }else{
        this.currentAnimation = anim;
      }

      if(typeof this.currentAnimation != 'undefined'){
        this.currentAnimation.data = data;
      }

    }
  
    this.stopAnimation = function(){
      //this.pose();
      if(typeof this.currentAnimation != 'undefined'){
        this.currentAnimation.data = {
          loop: false,
          cFrame: 0,
          elapsed: 0,
          lastTime: 0,
          delta: 0,
          lastEvent: 0,
          callback: undefined
        };
      }
      this.currentAnimation = undefined;
    }
  
    this.getAnimationByName = function( name = '' ){
  
      for(let i = 0; i < this.animations.length; i++){
        if(this.animations[i].name == name)
          return this.animations[i];
      }
  
    }

    this.getAnimationName = function(){
      if(typeof this.currentAnimation !== 'undefined'){
        return this.currentAnimation.name;
      }else{
        return undefined;
      }
    }
  
    this.buildSkeleton = function(){
      this.bonesInitialized = false;
      this.oldAnim = this.currentAnimation;
      this.currentAnimation = undefined;
      this.pose();
      let scale = new THREE.Vector3(1, 1, 1);
      for(let i = 0; i < this.skins.length; i++){
        let skinNode = this.skins[i];
        if(typeof skinNode.bone_parts !== 'undefined'){
          let bones = [];
          let inverses = [];
          for(let j = 0; j < skinNode.bone_parts.length; j++){
            let boneNode = this.bones[skinNode.bone_parts[j]];
            
            if(typeof boneNode != 'undefined'){
              bones.push(boneNode);
              inverses.push(
                boneNode.matrixInverse
              );
            }
            
          }
          skinNode.geometry.bones = bones;
          skinNode.bind(new THREE.Skeleton( bones, inverses ));
          skinNode.skeleton.update();
          //skinNode.updateMatrix();
          skinNode.updateMatrixWorld();
        }
      }

      try{
        
        for(let i = 0; i < this.headhook.children.length; i++){
          if(this.headhook.children[i] instanceof THREE.AuroraModel){
            this.headhook.children[i].buildSkeleton();
          }
        }

      }catch(e){}

      this.bonesInitialized = true;
      this.currentAnimation = this.oldAnim;
  
    }
  
    this.pose = function(node = this){
      this.bonesInitialized = false;
      try{
        for(let cIDX in node.controllers){
          let controller = node.controllers[cIDX];
          try{
            if(controller.data.length){
              switch(controller.type){
                case ControllerType.Position:
                    node.position.set(controller.data[0].x, controller.data[0].y, controller.data[0].z);
                break;
                case ControllerType.Orientation:
                  node.quaternion.set(controller.data[0].x, controller.data[0].y, controller.data[0].z, controller.data[0].w);
                break;
              }
            }
          }catch(e){
            console.error(e);
          }

        }
        //node.updateMatrix();
        node.updateMatrixWorld(new THREE.Matrix4());
        node.matrixInverse = new THREE.Matrix4();
        node.matrixInverse.getInverse( node.getMatrixWorld(new THREE.Matrix4()) );
      }catch(e){}

      for(let i = 0; i < node.children.length; i++){
        this.pose(node.children[i])
      }
      //this.bonesInitialized = true;
    }

    this.updateLights = function(delta){
      /*for( let i = 0; i < this.lights.length; i++ ){
        
        let light = this.lights[i];
        
        if(!light._worldPos)
            light._worldPos = light.getWorldPosition(new THREE.Vector3());

        light._distance = Game.getCurrentPlayer().getModel().position.distanceTo(light._worldPos);

      }

      //this.lights.sort(function(a,b) { return a._distance - b._distance } );
      
      let limit = 3;

      for( let i = 0; i < this.lights.length; i++ ){

        let light = this.lights[i];
        if( i >= limit ){

          if( light.intensity <= 0 ){
            light.intensity = 0;
            light.visible = true;

          }else{

            light.intensity -= delta;

          }

        }else{

          //light.visible = true;
          if(light.intensity < light.maxIntensity){

            light.intensity += delta;
            if(light.intensity > light.maxIntensity)
                light.intensity = light.maxIntensity;

          }

        }

      }*/
        
    }
  
    this.turnLightsOff = function(){
      /*for(let i = 0; i < this.lights.length; i++){
        let light = this.lights[i];
        if(light instanceof THREE.AmbientLight){
          light.visible = true;
          light.intensity = 0.000000001;
        }else{
          light.intensity = 0.000000001;
        }
        //light.helper.visible = false;
      }*/
    }
  
    this.turnLightsOn = function(args = {}){

      /*args = Object.assign({
        sortByPcPosition: true
      }, args);

      if(args.sortByPcPosition){

        for( let i = 0; i < this.lights.length; i++ ){
          let light = this.lights[i];
          light._distance = Game.getCurrentPlayer().getModel().position.distanceTo(light.getWorldPosition(new THREE.Vector3()));
        }

        this.lights.sort(function(a,b) { return a.priority > b.priority || a._distance - b._distance } );

      }
      
      let limit = 3;

      for( let i = 0; i < this.lights.length; i++ ){
        let light = this.lights[i];
        if(i >= limit){
          //light.visible = light.helper.visible = true;
        }else{
          if(light instanceof THREE.AmbientLight){
            light.visible = true;
            light.intensity = light.maxIntensity;
          }else{
            light.visible = true;
            light.intensity = light.maxIntensity;// = this.lights[i].helper.visible = true;
          }
          //light.helper.visible = true;
        }
        
      }*/

    }

    this.setLocalNumber = function(idx, val){
      this.local.numbers[idx] = val
    }

    this.getLocalNumber = function(idx){
      return this.local.numbers[idx];
    }

    this.setLocalBoolean = function(idx, val){
      this.local.booleans[idx] = val
    }

    this.getLocalBoolean = function(idx){
      return this.local.booleans[idx];
    }

    this.setListening = function(bValue){
      this.listening = bValue ? true : false;
    }

    this.setListenPattern = function(sPattern = '', nNumber = 0){
      this.listenPatterns[sPattern] = nNumber;
    }

    this.playEvent = function(event){
      if(typeof this.moduleObject == 'object'){
        this.moduleObject.playEvent(event);
      }
    }

    this.updateAnimation = function(anim, delta, onEnd = undefined) {
      anim.data.delta = delta;

      if(!this.bonesInitialized)
        return;
      
      this.updateAnimationEvents(anim);
      let animNodesLen = anim.nodes.length;
      for(let i = 0; i < animNodesLen; i++){
        this.updateAnimationNode(anim, anim.nodes[i]);
      }
      //this.updateAnimationNode(anim, anim.rooNode);
  
      if(anim.data.elapsed >= anim.length){
  
        anim.data.lastTime = anim.data.elapsed; anim.data.elapsed = 0;

        if(typeof anim.data.callback === 'function')
          anim.data.callback();

        if(typeof onEnd == 'function')
          onEnd();

      }else{
        anim.data.elapsed += delta;
      }
  
      anim.data.lastTime = anim.data.elapsed;
    };

    this.updateAnimationEvents = function(anim){

      if(!anim.events.length)
        return;

      let last = 0;
      for(let f = 0; f < anim.events.length; f++){
        if(anim.events[f].length <= anim.data.elapsed){
          last = f;
        }
      }
  
      let next = last + 1;
      if (last + 1 >= anim.events.length || anim.events[last].length >= anim.data.elapsed) {
        next = 0
      }
  
      if(next != anim.data.lastEvent){
        anim.data.lastEvent = next;
        this.playEvent(anim.events[next].name);
      }
    }

    this.poseAnimationNode = function(node){

      let modelNode = undefined;

      this.animNodeCache[node.name];

      if(!this.bonesInitialized)
        return;

      if(typeof this.animNodeCache[node.name] != 'undefined'){
        modelNode = this.animNodeCache[node.name];
      }else{
        this.animNodeCache[node.name] = modelNode = this.getObjectByName(node.name);
      }
  
      if(typeof modelNode != 'undefined'){
  
        for(let cIDX in node.controllers){
  
          let controller = node.controllers[cIDX];
            
          let data = controller.data[0];
          switch(controller.type){
            case ControllerType.Position:
              let offsetX = 0;
              let offsetY = 0;
              let offsetZ = 0;
              if(typeof modelNode.controllers[8] != 'undefined'){
                offsetX = modelNode.controllers[8].data[0].x;
                offsetY = modelNode.controllers[8].data[0].y;
                offsetZ = modelNode.controllers[8].data[0].z;
              }
              modelNode.position.set((data.x + offsetX) * this.Scale, (data.y + offsetY) * this.Scale, (data.z + offsetZ) * this.Scale);
            break;
            case ControllerType.Orientation:
              let offsetQX = 0;
              let offsetQY = 0;
              let offsetQZ = 0;
              let offsetQW = 1;
              if(typeof modelNode.controllers[20] != 'undefined'){  
                offsetQX = modelNode.controllers[20].data[0].x;
                offsetQY = modelNode.controllers[20].data[0].y;
                offsetQZ = modelNode.controllers[20].data[0].z;
                offsetQW = modelNode.controllers[20].data[0].w;
              }
              if(data.x == 0 && data.y == 0 && data.z == 0 && data.w == 1){
                data.x = offsetQX;
                data.y = offsetQY;
                data.z = offsetQZ;
                data.w = offsetQW;
              }

              modelNode.quaternion.set(data.x * this.Scale, data.y * this.Scale, data.z * this.Scale, data.w * this.Scale);
            break;
            case ControllerType.SelfIllumColor:
              modelNode.mesh.material.color.setRGB(
                data.r, 
                data.g, 
                data.b
              );
            break;
            case ControllerType.Color:
              if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                modelNode._node.color.setRGB(
                  data.r, 
                  data.g, 
                  data.b
                );
              }
            break;
            case ControllerType.Multiplier:
              if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                modelNode._node.intensity = data.value;
              }
            break;
            case ControllerType.Radius:
              if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                modelNode._node.radius = data.value;
              }
            break;
          }
  
        }
        modelNode.updateMatrix();
      }
    }

    this.updateAnimationNode = function(anim, node){
      
      let modelNode = undefined;
      //let superNode = undefined;

      //this.animNodeCache[node.name];

      if(typeof this.animNodeCache[node.name] != 'undefined'){
        modelNode = this.animNodeCache[node.name];
      }else{
        this.animNodeCache[node.name] = modelNode = this.getObjectByName(node.name);
      }

      /*if(node.name.substr(0, 2) == 's_'){
        superNode = modelNode;
        modelNode = this.children[0];
      }else if(anim.ModelName.substr(0, 2) == 's_'){
        superNode = this.supermodels[anim.ModelName].getObjectByName(node.name);
      }*/
  
      if(typeof modelNode != 'undefined'){
        anim._position.x = anim._position.y = anim._position.z = 0;
        anim._quaternion.x = anim._quaternion.y = anim._quaternion.z = 0;
        anim._quaternion.w = 1;
  
        for(let cIDX in node.controllers){
  
          let controller = node.controllers[cIDX];
            
          if(controller.data.length == 1 || anim.data.elapsed == 0){
            let data = controller.data[0];
            switch(controller.type){
              case ControllerType.Position:
                if(typeof modelNode.controllers[8] != 'undefined'){
          
                  anim._position.copy(modelNode.controllers[8].data[0]);
        
                  if(anim.name.indexOf('CUT') > -1 && modelNode.name == 'cutscenedummy'){
                    anim._position.sub(this.position);
                  }
        
                }
                modelNode.position.set((data.x + anim._position.x) * this.Scale, (data.y + anim._position.y) * this.Scale, (data.z + anim._position.z) * this.Scale);
              break;
              case ControllerType.Orientation:
                if(typeof modelNode.controllers[20] != 'undefined'){
                    anim._quaternion.copy(modelNode.controllers[20].data[0]);
                }
                if(data.x == 0 && data.y == 0 && data.z == 0 && data.w == 1){
                  data.x = anim._quaternion.x;
                  data.y = anim._quaternion.y;
                  data.z = anim._quaternion.z;
                  data.w = anim._quaternion.w;
                }

                if(anim.transition){
                  modelNode.quaternion.slerp(this._quat.set(data.x * this.Scale, data.y * this.Scale, data.z * this.Scale, data.w * this.Scale), anim.data.delta);
                }else{
                  modelNode.quaternion.copy(data);
                }
                
              break;
              case ControllerType.SelfIllumColor:
                modelNode.mesh.material.color.setRGB(
                  data.r, 
                  data.g, 
                  data.b
                );
              break;
              case ControllerType.Scale:
                let offsetScale = 0;
                if(typeof modelNode.controllers[36] != 'undefined'){
                  offsetScale = modelNode.controllers[36].data[0].value || 0.000000000001; //0 scale causes warnings
                }
                modelNode.scale.setScalar( ( (data.value + offsetScale) * this.Scale ) || 0.00000001 );
              break;
              /*case ControllerType.Color:
                if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                  modelNode.light.color.setRGB(
                    data.r, 
                    data.g, 
                    data.b
                  );
                }
              break;*/
              case ControllerType.Multiplier:
                if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                  modelNode._node.intensity = data.value;
                }
              break;
              case ControllerType.Radius:
                if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                  modelNode._node.radius = data.value;
                }
              break;
            }
          }else{

            let lastFrame = 0;
            let framesLen = controller.data.length;
            for(let f = 0; f < framesLen; f++){
              try{
                if(controller.data[f].time <= anim.data.elapsed){
                  lastFrame = f;
                }
              }catch(e){
                //
              }
            }

            let last = controller.data[lastFrame];
            if(last){

              let next = controller.data[lastFrame + 1];
              if (lastFrame + 1 >= controller.data.length || last.time >= anim.data.elapsed) {
                next = controller.data[0];
              }
              let fl = Math.abs((anim.data.elapsed - last.time) / (next.time - last.time));
              if(fl == Infinity)
                fl = 1;
              if(node.name == 'geosphere0'){
                //console.log('fl', ((anim.data.elapsed - last.time) / (last.time - next.time))*-1 );
              }

              switch(controller.type){
                case ControllerType.Position:
                  if(typeof modelNode.controllers[8] != 'undefined'){
            
                    anim._position.copy(modelNode.controllers[8].data[0]);
          
                    if(anim.name.indexOf('CUT') > -1 && modelNode.name == 'cutscenedummy'){
                      anim._position.sub(this.position);
                    }
          
                  }

                  if(this.children[0].name == 'm40ad_c01_cam' && anim.name === 'CUT001W'){
                    //console.log('flzzz', fl, anim.data.elapsed, last.time, next.time);
                  }

                  this._vec3.copy(next);
                  this._vec3.add(anim._position);

                  if(last.isBezier){

                    this._vec3.copy(last);

                    /*if(fl > 0.333 && fl < 0.666){
                      this._vec3.add(anim._position);
                      anim.bezierB.copy(last.bezier.pointA).sub(last.bezier.pointA);
                      anim.bezierB.multiplyScalar(fl);
                      this._vec3.add(anim.bezierB);
                    }else if(fl >= 0.666){
                      this._vec3.add(anim._position);
                      anim.bezierC.copy(last.bezier.pointA).sub(last.bezier.pointB);
                      anim.bezierC.multiplyScalar(fl);
                      this._vec3.add(anim.bezierC);
                    }else{
                      this._vec3.add(anim._position);
                      anim.bezierA.copy(last.bezier.pointA);
                      anim.bezierA.multiplyScalar(fl);
                      this._vec3.add(anim.bezierA);
                    }*/

                    this._vec3.add(anim._position);
                    anim.bezierC.copy(last.bezier.pointC);
                    anim.bezierC.multiplyScalar(fl);
                    this._vec3.add(anim.bezierC);
                    
                  }

                  this._vec3.multiplyScalar(this.Scale);
                  modelNode.position.lerp(this._vec3, fl);

                break;
                case ControllerType.Orientation:
                  
                  this._quat.copy(next);
  
                  modelNode.quaternion.slerp(this._quat, fl);
                break;
                case ControllerType.Scale:
                  modelNode.scale.lerp(this._vec3.setScalar( ( (next.value) * this.Scale) ) || 0.000000001, fl);
                break;
                case ControllerType.SelfIllumColor:
                  let lerpIllumColorR = last.r + fl * (next.r - last.r);
                  let lerpIllumColorG = last.g + fl * (next.g - last.g);
                  let lerpIllumColorB = last.b + fl * (next.b - last.b);
                  //console.log(modelNode.mesh._node.Diffuse.r, lerpIllumColor);
                  modelNode.mesh.material.color.setRGB(
                    lerpIllumColorR, 
                    lerpIllumColorG, 
                    lerpIllumColorB
                  );
                  //modelNode.mesh.material.needsUpdate = true;
                break;
                /*case ControllerType.Color:
                  if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                    let lerpR = last.r + fl * (next.r - last.r);
                    let lerpG = last.g + fl * (next.g - last.g);
                    let lerpB = last.b + fl * (next.b - last.b);
                    modelNode.color.setRGB(
                      lerpR, 
                      lerpG, 
                      lerpB
                    );
                  }
                break;*/
                case ControllerType.Multiplier:
                  if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                    modelNode._node.intensity = last.value + fl * (next.value - last.value);
                  }
                break;
                case ControllerType.Radius:
                  if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                    modelNode._node.radius = last.value + fl * (next.value - last.value);
                  }
                break;
              }

            }

          }
  
        }

        modelNode.updateMatrix();

      }

    }

    this.rebuildEmitters = function(){

      return;

      for(let i = 0; i < this.emitters.length; i++){
        let emitterNode = this.emitters[i];
        if(emitterNode.emitter){

          let speed, xangle, zangle, vx, vy, vz, d = 0;
          let speedMax, xangleMax, zangleMax, vxMax, vyMax, vzMax, dMax = 0;
          let position = new THREE.Vector3();

          switch(emitterNode._emitter.Update){
            case 'Fountain':
              emitterNode.emitter.particleCount = Math.ceil(emitterNode.controllerOptions.birthRate * emitterNode.controllerOptions.lifeExp);
              emitterNode.emitter.maxParticleCount = emitterNode.emitter.particleCount;
              emitterNode.emitter.maxAge.value = emitterNode.controllerOptions.lifeExp;
    
              position = this.position.clone();
              position.add(emitterNode.position);
    
              emitterNode.emitter.position.value.copy(position);
              emitterNode.emitter.position.spread.copy(emitterNode.controllerOptions.size);
      
              emitterNode.emitter.velocity.value.setScalar(-emitterNode.controllerOptions.velocity);
              emitterNode.emitter.velocity.spread.setScalar(-emitterNode.controllerOptions.randVelocity);

              if(emitterNode.controllerOptions.drag)
                emitterNode.emitter.drag.value = emitterNode.controllerOptions.drag;
    
              if(emitterNode.controllerOptions.mass)
                emitterNode.emitter.acceleration.value = new THREE.Vector3(0, 0, -emitterNode.controllerOptions.mass);
      
            break;
            case 'Single':
              emitterNode.emitter.particleCount = 1;
              emitterNode.emitter.maxParticleCount = 1;
              emitterNode.emitter.maxAge.value = Infinity;
    
              position = this.position.clone();
              position.add(emitterNode.position);
    
              emitterNode.emitter.position.value.copy(position);
              emitterNode.emitter.position.spread.copy(emitterNode.controllerOptions.size);
    
              emitterNode.emitter.velocity.value.setScalar(-emitterNode.controllerOptions.velocity);
              emitterNode.emitter.velocity.spread.setScalar(-emitterNode.controllerOptions.randVelocity);

              if(emitterNode.controllerOptions.drag)
                emitterNode.emitter.drag.value = emitterNode.controllerOptions.drag;
    
              if(emitterNode.controllerOptions.mass)
                emitterNode.emitter.acceleration.value = new THREE.Vector3(0, 0, -emitterNode.controllerOptions.mass);
      
            break;
          }


          emitterNode.emitter.reset();
          emitterNode.emitter.enable();
        }
      }
    }

    this.buildEmitter = function(node){
      return;
      let controllerOptions = {
        size: new THREE.Vector3()
      };
  
      node.controllerOptions = controllerOptions;
  
      let emitterOptions = {
        maxAge: {
          value: 2
        },
        position: {
          value: new THREE.Vector3(0, 0, 0),
          spread: new THREE.Vector3(0)
        },
        velocity : {
          value: new THREE.Vector3(0),
          spread: new THREE.Vector3(0)
        },
        drag : {
          value: new THREE.Vector3(0),
          spread: new THREE.Vector3(0)
        },
        acceleration : {
          value: new THREE.Vector3(0),
          spread: new THREE.Vector3(0)
        },
        rotation: {
          static: true,
          angle: 0
        },
        color: {
          value: [ new THREE.Color('black') ]
        },
        type: SPE.distributions.BOX,
        size: {
          value: []
        },
  
        particleCount: 10
      };
  
      //console.log('emitter', node.name, node.controllers, emitterOptions);
  
      //Read the emitter controllers
      for(let cIDX in node.controllers){
        let controller = node.controllers[cIDX];
        switch(controller.type){
          case ControllerType.Position:
            ////console.log('position', controller.data[0].x, controller.data[0].y, controller.data[0].z);
            controllerOptions.position = new THREE.Vector3(controller.data[0].x, controller.data[0].y, controller.data[0].z);
          break;
          case ControllerType.Orientation:
            ////console.log('orientation', controller.data[0].x, controller.data[0].y, controller.data[0].z, controller.data[0].w);
            controllerOptions.orientation = new THREE.Quaternion(controller.data[0].x, controller.data[0].y, controller.data[0].z, controller.data[0].w);
          break;
          case ControllerType.ColorStart:
            ////console.log('colorStart', controller.data[0].r, controller.data[0].g, controller.data[0].b)
            controllerOptions.colorStart = new THREE.Color(controller.data[0].r, controller.data[0].g, controller.data[0].b);
          break;
          case ControllerType.ColorMid:
            ////console.log('colorMid', controller.data[0].r, controller.data[0].g, controller.data[0].b)
            controllerOptions.colorMid = new THREE.Color(controller.data[0].r, controller.data[0].g, controller.data[0].b);
          break;
          case ControllerType.ColorEnd:
            ////console.log('colorEnd', controller.data[0].r, controller.data[0].g, controller.data[0].b)
            controllerOptions.colorEnd = new THREE.Color(controller.data[0].r, controller.data[0].g, controller.data[0].b);
          break;
          case ControllerType.XSize:
            ////console.log('XSize', controller.data[0].value)
            controllerOptions.xSize = controller.data[0].value;
            controllerOptions.size.y = controller.data[0].value *0.01;
          break;
          case ControllerType.YSize:
            ////console.log('YSize', controller.data[0].value)
            controllerOptions.ySize = controller.data[0].value;
            controllerOptions.size.x = controller.data[0].value * 0.01;
          break;
          case ControllerType.Spread:
            ////console.log('spread', controller.data[0].value)
            controllerOptions.spread = controller.data[0].value;
          break;
          case ControllerType.LifeExp:
            ////console.log('maxAge', controller.data[0].value)
            controllerOptions.lifeExp = controller.data[0].value;
          break;
          case ControllerType.BirthRate:
            ////console.log('birthRate', controller.data[0].value)
            controllerOptions.birthRate = controller.data[0].value;
          break;
          case ControllerType.Drag:
            ////console.log('drag', controller.data[0].value)
            controllerOptions.drag = controller.data[0].value;
          break;
          case ControllerType.Threshold:
            controllerOptions.threshold = controller.data[0].value;
          break;
          case ControllerType.Grav:
            ////console.log('grav', controller.data[0].value)
            controllerOptions.gravity = controller.data[0].value;
          break;
          case ControllerType.Mass:
            ////console.log('mass', controller.data[0].value)
            controllerOptions.mass = controller.data[0].value;
          break;
          case ControllerType.Velocity:
            ////console.log('velocity', controller.data[0].value)
            controllerOptions.velocity = controller.data[0].value;
          break;
          case ControllerType.RandVel:
            ////console.log('randVelocity', controller.data[0].value)
            controllerOptions.randVelocity = controller.data[0].value;
          break;
          case ControllerType.SizeStart:
            ////console.log('SizeStart', controller.data[0].value)
            emitterOptions.size.value[0] = controller.data[0].value * 2.0;
          break;
          case ControllerType.SizeMid:
            ////console.log('SizeStart', controller.data[0].value)
            emitterOptions.size.value.push(controller.data[0].value * 2.0);
          break;
          case ControllerType.SizeEnd:
            ////console.log('SizeEnd', controller.data[0].value)
            emitterOptions.size.value.push(controller.data[0].value * 2.0);
          break;
          case ControllerType.ParticleRot:
            ////console.log('SizeEnd', controller.data[0].value)
            emitterOptions.rotation.angle = controller.data[0].value;
          break;
        }
      }
  
      if(typeof controllerOptions.colorStart != 'undefined'){
        emitterOptions.color.value[0] = controllerOptions.colorStart;
      }
  
      if(typeof controllerOptions.colorMid != 'undefined'){
        emitterOptions.color.value.push(controllerOptions.colorMid);
      }
  
      if(typeof controllerOptions.colorEnd != 'undefined'){
        emitterOptions.color.value.push(controllerOptions.colorEnd);
      }

      let speed, xangle, zangle, vx, vy, vz, d = 0;
      let speedMax, xangleMax, zangleMax, vxMax, vyMax, vzMax, dMax = 0;
      let position = new THREE.Vector3();
  
      switch(node._emitter.Update){
        case 'Fountain':
          emitterOptions.particleCount = Math.ceil(controllerOptions.birthRate * controllerOptions.lifeExp);
          emitterOptions.maxParticleCount = emitterOptions.particleCount;
          emitterOptions.maxAge.value = controllerOptions.lifeExp;

          position = this.position.clone();
          position.add(node.position);

          emitterOptions.position.value.copy(position);
          emitterOptions.position.spread.copy(controllerOptions.size);

          emitterOptions.rotation.static = true;
          emitterOptions.rotation.angle = node.rotation.z;
          
          emitterOptions.velocity.value.setScalar(-controllerOptions.velocity);
          emitterOptions.velocity.spread.setScalar(-controllerOptions.randVelocity);

          if(controllerOptions.drag)
            emitterOptions.drag.value = controllerOptions.drag;

          if(controllerOptions.mass)
            emitterOptions.acceleration.value = new THREE.Vector3(0, 0, controllerOptions.mass);
  
        break;
        case 'Single':
          emitterOptions.particleCount = 1;
          emitterOptions.maxParticleCount = 1;
          emitterOptions.maxAge.value = Infinity;

          position = this.position.clone();
          position.add(node.position);

          emitterOptions.position.value.copy(position);
          //emitterOptions.position.spread.copy(controllerOptions.size);

          emitterOptions.velocity.value.setScalar(-controllerOptions.velocity);
          //emitterOptions.velocity.spread.setScalar(-controllerOptions.randVelocity);

          if(controllerOptions.drag)
            emitterOptions.drag.value = controllerOptions.drag;

          if(controllerOptions.mass)
            emitterOptions.acceleration.value = new THREE.Vector3(0, 0, controllerOptions.mass);
  
        break;
      }
  
      node.emitter = new SPE.Emitter(emitterOptions);
      node.emitter.header = node._emitter;
      node.particleGroup.addEmitter( node.emitter );
      node.particleGroup.mesh.visible = true;

      this.options.context._emitters[node.name] = node;

      this.options.context.group.emitters.remove(node.particleGroup.mesh);
      this.options.context.group.emitters.add(node.particleGroup.mesh);

    }

    this.clone = function () {

      let cloned = new this.constructor().copy( this );
      cloned._animPosition = new THREE.Vector3();
      cloned._animQuaternion = new THREE.Quaternion();
      cloned.animations = this.animations.slice();
      cloned.bones = Object.assign({}, this.bones);
      cloned.traverse( (node) => {
        if(node instanceof THREE.SkinnedMesh){
          cloned.push(mesh)
        }
      });
      cloned.pose();
      cloned.buildSkeleton();
      return cloned;
  
    }
  
  
  };
  
  // grabbing all the prototype methods from Object4D
  //THREE.AuroraModel.prototype = Object.create( THREE.Object3D.prototype );

  THREE.AuroraModel.prototype = Object.assign( Object.create( THREE.Object3D.prototype ), {
    constructor: THREE.AuroraModel
  } );
  
  THREE.AuroraModel.FromMDL = function(model, options = {}) {
  
    options = Object.assign({
      textureVar: '****',
      onComplete: null,
      castShadow: false,
      receiveShadow: false,
      manageLighting: true,
      context: Game,
      mergeStatic: false, //Use on room models
    }, options);

    let isAsync = typeof options.onComplete === 'function';
  
    if(model instanceof AuroraModel){
  
      let auroraModel = new THREE.AuroraModel();
      auroraModel.options = options;
      auroraModel.animations = [];//model.animations.slice();
      if(!(auroraModel.animations instanceof Array)){
        auroraModel.animations = [];
      }else{
        for(let i = 0; i < model.animations.length; i++){
          auroraModel.animations[i] = AuroraModelAnimation.From(model.animations[i]);
        }
      }
      auroraModel.Scale = 1;
      auroraModel.names = model.names;
      auroraModel.modelHeader = model.modelHeader;
      auroraModel.affectedByFog = model.modelHeader.Fogged ? true : false;
      options.parent = auroraModel;
      
      auroraModel._animPosition = new THREE.Vector3();
      auroraModel._animQuaternion = new THREE.Quaternion();

      if(options.mergeStatic){
        auroraModel.mergedGeometry = new THREE.Geometry();
        //auroraModel.mergedMaterial = new THREE.MeshPhongMaterial({color: 0xFF0000});
        auroraModel.mergedMaterials = [];
      }

      auroraModel.add(THREE.AuroraModel.NodeParser(auroraModel, model.rootNode, options));

      if(options.mergeStatic){
        let buffer = new THREE.BufferGeometry();
        buffer.fromGeometry(auroraModel.mergedGeometry);
        auroraModel.mergedGeometry.dispose();
        let geometry = buffer;
        auroraModel.mergedMesh = new THREE.Mesh(geometry, auroraModel.mergedMaterials);
        auroraModel.add(auroraModel.mergedMesh);
        auroraModel.mergedGeometry = undefined;
      }

      
      
      auroraModel.buildSkeleton();

      if(model.modelHeader.SuperModelName.indexOf("NULL") == -1 && model.modelHeader.SuperModelName != ''){
        
        if(isAsync){
          
          let superModelLoader = (_supermodel, onComplete) => {
            
            Game.ModelLoader.load({
              file: _supermodel,
              onLoad: (supermodel) => {
  
                let currentAnimations = auroraModel.animations; //Copy the array

                /*for(let i = 0; i < currentAnimations.length; i++){
                  currentAnimations[i] = AuroraModelAnimation.From(currentAnimations[i]);
                }*/
  
                for(let i = 0; i < supermodel.animations.length; i++){
                  let animName = supermodel.animations[i].name;
                  let hasAnim = false;
                  for(let j = 0; j < currentAnimations.length; j++){
                    if(animName == currentAnimations[j].name){
                      hasAnim = true;
                      break;
                    }
                  }
  
                  if(!hasAnim){
                    auroraModel.animations.push(AuroraModelAnimation.From(supermodel.animations[i]));
                  }
                }

                let superModelName = supermodel.modelHeader.SuperModelName;

                if(superModelName != 'null' && superModelName.indexOf("NULL") == -1 && superModelName != ''){
                  superModelLoader(
                    superModelName.toLowerCase(),
                    onComplete
                  ); 
                }else if(typeof onComplete === 'function'){
                  onComplete();
                }
  
              }
            });
          };

          superModelLoader(
            model.modelHeader.SuperModelName.toLowerCase(),
            () => {
              if(typeof options.onComplete === 'function'){
                setTimeout( () => {
                  options.onComplete(auroraModel);
                }, 0);
              }
            }
          )

        }else{
        
          try{

            let hasSupermodel = true;
            let _supermodel = model.modelHeader.SuperModelName;

            while(hasSupermodel){

              let supermodel  = Game.ModelLoader.loadSync({
                file: _supermodel.toLowerCase()
              });

              let currentAnimations = auroraModel.animations.slice(); //Copy the array

              for(let i = 0; i < currentAnimations.length; i++){
                currentAnimations[i] = AuroraModelAnimation.From(currentAnimations[i]);
              }

              for(let i = 0; i < supermodel.animations.length; i++){
                let animName = supermodel.animations[i].name;

                let isReplaced = false;
                for(let j = 0; j < currentAnimations.length; j++){

                  if(animName == currentAnimations[j].name){

                    auroraModel.animations[j] = supermodel.animations[i];
                    isReplaced = true;
                    break;

                  }

                }

                if(!isReplaced)
                  auroraModel.animations.push(supermodel.animations[i]);

              }

              if(supermodel.modelHeader.SuperModelName.indexOf("NULL") == -1 && supermodel.modelHeader.SuperModelName != ''){
                hasSupermodel = true;
                _supermodel = supermodel.modelHeader.SuperModelName;
              }else{
                hasSupermodel = false;
                _supermodel = '';
              }

            }
    
          }catch(e){
            console.error('supermodel', e);
          }

        }
  
      }else{
        if(typeof options.onComplete === 'function'){
          //auroraModel.pose();
          //auroraModel.buildSkeleton();
          options.onComplete(auroraModel);
        }
      }
  
      return auroraModel;
  
    }else{
      throw 'model is not of type AuroraModel';
    }
  
  }
  
  THREE.AuroraModel.NodeParser = function(auroraModel, _node, options){

    options = Object.assign({
      parseChildren: true,
      parent: auroraModel,
      isChildrenDynamic: false
    }, options);
  
    let node = new THREE.Group();
    node._node = _node;
    node.NodeType = _node.NodeType;
    node.isWalkmesh = ((_node.NodeType & AuroraModel.NODETYPE.AABB) == AuroraModel.NODETYPE.AABB);

    node.controllers = _node.controllers;
    node.controllerCache = {};
    node.position.set(_node.position.x, _node.position.y, _node.position.z);
    node.quaternion.set(_node.quaternion.x, _node.quaternion.y, _node.quaternion.z, _node.quaternion.w);
  
    node.name = _node.name.toLowerCase();

    if(node.name == auroraModel.name.toLowerCase()+'a'){
      options.isChildrenDynamic = true;
    }

    if(options.parent != auroraModel){
      options.parent.add(node);
    }
  
    node.getControllerByType = function(type = -1){

      if(typeof this.controllers[type] != 'undefined'){
        return this.controllers[type];
      }
  
      return null;

      /*if(typeof this.controllerCache[type] != 'undefined')
        return this.controllerCache[type];
  
      for(let i = 0; i < this.controllers.length; i++){
        let cntrler = this.controllers[i];
        if(cntrler.type == type){
          this.controllerCache[type] = cntrler;
          return cntrler;
        }
      }*/
  
    }
  
    if (_node instanceof AuroraModelNodeAABB) {
      //console.log(node);
    }

    if ((_node.NodeType & AuroraModel.NODETYPE.Saber) == AuroraModel.NODETYPE.Saber) {
      //console.log('Saber', _node, node);
    }
  
    if ((_node.NodeType & AuroraModel.NODETYPE.Mesh) == AuroraModel.NODETYPE.Mesh) {
      try{
        //Create geometry only if the mesh is visible or it is a walkmesh
        if(_node.FlagRender || node.isWalkmesh){

          let geometry = new THREE.Geometry();
    
          geometry.boundingBox = _node.boundingBox;
    
          geometry.vertices = _node.vertices || [];
          geometry.faces = _node.faces || [];
          geometry.faceUvs = [[]];
          geometry.faceVertexUvs = [[]];
          
          if(_node.tvectors)
            geometry.faceUvs[0] = _node.tvectors[0];
          
          if(_node.texCords)
            geometry.faceVertexUvs[0] = _node.texCords[0];
          
          if(geometry.faces.length){
            geometry.computeFaceNormals();
            geometry.computeVertexNormals();    // requires correct face normals
            geometry.computeBoundingSphere();
            if(auroraModel.modelHeader.Smoothing)
              geometry.mergeVertices();
          }
    
          let tMap1 = _node.TextureMap1;
          let tMap2 = _node.TextureMap2;
    
          if(options.textureVar != '' && options.textureVar.indexOf('****') == -1){
            tMap1 = options.textureVar;
          }

          _node.tMap1 = tMap1;
    
          let material = null;
          let map1 = null;
          let map2 = null;

          let selfIllum = 1;
          let _selfIllum = node.controllers[ControllerType.SelfIllumColor];

          if(_selfIllum){
            selfIllum = _selfIllum.data[0].value || new THREE.Color(1, 1, 1);
          }

          /*let _materialObj = {
            color: {
              r: _node.Diffuse.r, 
              g: _node.Diffuse.g, 
              b: _node.Diffuse.b
            },
            options: {
              hasLightmap: _node.HasLightmap,
              hasShadow: _node.FlagShadow,
              hasTransparency: _node.TransparencyHint,
              hasSelfIllum: _selfIllum,
              canFog: auroraModel.affectedByFog,
              animatedUV: _node.nAnimateUV,
              isDynamic: options.isChildrenDynamic,
              castShadow: options.castShadow
            },
            map: tMap1,
            lightmap: tMap2
          };

          let materialID = objectHash(_materialObj);*/

          //console.log('mat', materialID, _materialObj);

          /*if(auroraModel.materials.hasOwnProperty(materialID)){
            material = auroraModel.materials[materialID];
          }else{*/
    
            if(_node.HasLightmap){

              //this material is affected by lighting and is lightmapped
              //MeshBasicMaterial is required here so lighting is not applied to
              //meshes that have lightmaps
              if(_node.nAnimateUV){
                material = new THREE.MeshStandardMaterial({
                  map: map1,
                  lightMap: map2,
                  color: new THREE.Color( _node.Diffuse.r, _node.Diffuse.g, _node.Diffuse.b ),
                  side:THREE.FrontSide,//THREE.DoubleSide,
                  fog: auroraModel.affectedByFog
                });
              }else{
                material = new THREE.MeshBasicMaterial({
                  map: map1,
                  lightMap: map2,
                  color: new THREE.Color( _node.Diffuse.r, _node.Diffuse.g, _node.Diffuse.b ),
                  side:THREE.FrontSide,//THREE.DoubleSide,
                  fog: auroraModel.affectedByFog
                });
              }
              map2 = TextureLoader.enQueue(tMap2, material, TextureLoader.Type.LIGHTMAP);
              geometry.faceUvs[1] = _node.tvectors[1];
              geometry.faceVertexUvs[1] = _node.texCords[1];
              //material.needsUpdate = true;

            }else if(_node.FlagShadow || options.castShadow){
              //this material is affected by lighting
              material = new THREE.MeshLambertMaterial({
                map: map1,
                color: new THREE.Color( _node.Diffuse.r, _node.Diffuse.g, _node.Diffuse.b ),//0xFFFFFF,
                side:THREE.FrontSide,
                fog: auroraModel.affectedByFog
              });
              //material.needsUpdate = true;
            }else{

              if(options.isChildrenDynamic){
                //This material is not affected by lighting
                material = new THREE.MeshLambertMaterial({
                  map: map1,
                  color: new THREE.Color( _node.Diffuse.r, _node.Diffuse.g, _node.Diffuse.b ),//0xFFFFFF,
                  side:THREE.FrontSide,
                  fog: auroraModel.affectedByFog
                });
              }else{
                //This material is not affected by lighting
                material = new THREE.MeshBasicMaterial({
                  map: map1,
                  color: new THREE.Color( _node.Diffuse.r, _node.Diffuse.g, _node.Diffuse.b ),//0xFFFFFF,
                  side:THREE.FrontSide,
                  fog: auroraModel.affectedByFog
                });
              }

              
              //material.needsUpdate = true;
            }

            if(_node.TransparencyHint){
              material.transparent = true;
            }

            //material.alphaTest = Game.AlphaTest;
      
            ////console.log(tMap1);
            if(tMap1 != 'NULL' && tMap1 != 'Toolcolors'){
              map1 = TextureLoader.enQueue(tMap1, material);
            }

          // auroraModel.materials[materialID] = material;

          //}

          if(_node.nAnimateUV){
            auroraModel.animatedUV.push({
              material: material,
              speed: new THREE.Vector2(_node.fUVDirectionX, _node.fUVDirectionY),
              jitter: {
                jitter: _node.fUVJitter,
                speed: _node.fUVJitterSpeed
              }
            })
          }

          material.needsUpdate = true;
    
          geometry.verticesNeedUpdate = true;
          geometry.normalsNeedUpdate = true;
          geometry.uvsNeedUpdate = true;
          //geometry.computeBoundingBox();
    
          let mesh = undefined;
          if ((_node.NodeType & AuroraModel.NODETYPE.Skin) == AuroraModel.NODETYPE.Skin) {
            geometry.skinIndices.length = _node.weights.length;
            geometry.skinWeights.length = _node.weights.length;
            for(let i = 0; i < _node.weights.length; i++){
              geometry.skinIndices[i] = new THREE.Vector4().fromArray(_node.boneIdx[i]);
              geometry.skinWeights[i] = new THREE.Vector4().fromArray(_node.weights[i]);
            }

            //if(!node.isWalkmesh && geometry.faces.length){
              /*let buffer = new THREE.BufferGeometry();
              buffer.fromGeometry(geometry);
              geometry.dispose();
              geometry = buffer;*/
            //}

            /*geometry.addAttribute('skinIndex', 
              new THREE.BufferAttribute( new Float32Array(_node.boneIdx.slice()), 4)
            );

            geometry.addAttribute('skinWeight', 
              new THREE.BufferAttribute( new Float32Array(_node.weights.slice()), 4)
            );*/



            let bones = [];
            bones.length = _node.bone_parts.length;
            for(let i = 0; i < _node.bone_parts.length; i++){
              bones[i] = auroraModel.names[_node.bone_parts[i]];
            }
            material.skinning = true;
            mesh = new THREE.SkinnedMesh( geometry , material );
            mesh.bone_parts = bones;
            mesh.bone_quat = _node.bone_quats;
            mesh.bone_vec3 = _node.bone_vertex;
            auroraModel.skins.push(mesh);
            //mesh.bind(skeleton);
          }else{
            if(!node.isWalkmesh && geometry.faces.length && !_node.roomStatic){
              let buffer = new THREE.BufferGeometry();
              buffer.fromGeometry(geometry);
              geometry.dispose();
              geometry = buffer;
            }
            mesh = new THREE.Mesh( geometry , material );
          }
          node.mesh = mesh;

          if(node.isWalkmesh){
            auroraModel.walkmesh = mesh;
          }

          mesh.visible = (_node.FlagRender ? true : false) && !node.isWalkmesh;
          mesh._node = _node;
          mesh.matrixAutoUpdate = false;
          mesh.castShadow = options.castShadow;
          mesh.receiveShadow = options.receiveShadow;

          if(!node.isWalkmesh && options.mergeStatic && _node.roomStatic){
            mesh.position.copy(node.getWorldPosition(new THREE.Vector3));
            mesh.quaternion.copy(node.getWorldQuaternion(new THREE.Quaternion));
            mesh.updateMatrix(); // as needed
            //mesh.updateMatrixWorld(); // as needed

            if(auroraModel.mergedMaterials.indexOf(material) == -1)
              auroraModel.mergedMaterials.push(material);

            for(let i = 0; i < mesh.geometry.faces.length; i++){
              mesh.geometry.faces[i].materialIndex = auroraModel.mergedMaterials.indexOf(material);
            }
            auroraModel.mergedGeometry.merge(mesh.geometry, mesh.matrix);
            mesh.geometry.dispose();
            options.parent.remove(node);
          }else{
            node.add( mesh );
          }

        }
        
      }catch(e){
        console.error('THREE.AuroraModel failed to generate mesh', _node, e);
      }
  
    }
  
    if ((_node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
      _node.color = new THREE.Color(0xFFFFFF);
      _node.radius = 5.0;
      _node.intensity = 1.0;
      _node.position = new THREE.Vector3();
      
      for(let cIDX in _node.controllers){
        let controller = _node.controllers[cIDX];
        switch(controller.type){
          case ControllerType.Color:
            _node.color = new THREE.Color(controller.data[0].r, controller.data[0].g, controller.data[0].b);
          break;
          case ControllerType.Position:
            //_node.position.set(controller.data[0].x, controller.data[0].y, controller.data[0].z);
          break;
          case ControllerType.Radius:
            _node.radius = controller.data[0].value;
          break;
          case ControllerType.Multiplier:
            //_node.intensity = controller.data[0].value;
          break;
        }
      }

      //if(GameKey != "TSL"){
      //  _node.intensity = _node.intensity > 1 ? _node.intensity * .01 : _node.intensity;
      //}else{
        _node.intensity = _node.intensity;// > 1 ? _node.intensity * .01 : _node.intensity;
      //}

      let lightNode;
      if(!options.manageLighting){
        if(_node.AmbientFlag){
          lightNode = new THREE.AmbientLight( _node.color );
        }else{
          //lightNode = new THREE.PointLight( _node.color, _node.intensity, _node.radius * 100 );
          lightNode = new THREE.PointLight( _node.color, _node.intensity, _node.radius, 1 );
          lightNode.shadow.camera.far = _node.radius;
          //lightNode.distance = radius;
          lightNode.position = _node.position;
        }        
        lightNode.decay = 2;
        lightNode.visible = true;
        lightNode.controllers = _node.controllers;
        lightNode.helper = {visible:false};
      
        //auroraModel.lights.push(lightNode);
        _node.light = lightNode;
        options.parent.add(lightNode);
      }else{
        lightNode = new THREE.Object3D();
        //if(!_node.AmbientFlag){
          lightNode.position = _node.position;
        //}
        _node.light = lightNode;
        node.add(lightNode);
      }

      lightNode.parentUUID = auroraModel.uuid;
      lightNode.auroraModel = auroraModel;

      lightNode._node = _node;

      lightNode.priority = _node.LightPriority;
      lightNode.isAmbient = _node.AmbientFlag;
      lightNode.isDynamic = _node.DynamicFlag;
      lightNode.affectDynamic = _node.AffectDynamicFlag;
      lightNode.castShadow = _node.ShadowFlag ? true : false;
      lightNode.genFlare = _node.GenerateFlareFlag;
      lightNode.isFading = _node.FadingLightFlag;
      lightNode.maxIntensity = _node.intensity;
      lightNode.color = _node.color;

      if(options.manageLighting){
        LightManager.addLight(_node.light);
      }
      
    }
  
    if ((_node.NodeType & AuroraModel.NODETYPE.Emitter) == AuroraModel.NODETYPE.Emitter) {
      let particleGroup;
      
      if(false && options.context.emitters[_node.emitter.Texture]){
        particleGroup = options.context.emitters[_node.emitter.Texture];
      }else{
        particleGroup = options.context.emitters[_node.emitter.Texture] = new SPE.Group({
          texture: {
            frames: new THREE.Vector2(_node.emitter.GridX, _node.emitter.GridY),
            frameCount: _node.emitter.GridX * _node.emitter.GridY
          },
          blending: THREE.NormalBlending,
          alphaTest: 0.5,
          transparent: true,
          depthWrite: true,
          depthTest: true,
          fog: true
        });
        switch(_node.emitter.Blend){
          case 'Normal':
            particleGroup.blending = THREE.NormalBlending;
          break;
          case 'Lighten':
            particleGroup.blending = THREE.AdditiveBlending;
          break;
        }
        TextureLoader.enQueueParticle(_node.emitter.Texture, options.context.emitters[_node.emitter.Texture]);
        //options.context.group.emitters.add(particleGroup.mesh);
      }

      node.particleGroup = particleGroup;
      node._emitter = _node.emitter;

      //auroraModel.buildEmitter(node);
      //auroraModel.emitters.push(node);
  
    }

    auroraModel.bones[node.name] = node;
  
    //node.visible = !node.isWalkmesh;
  
    switch(node.name){
      case 'headhook':
        auroraModel.headhook = node;
      break;
      case 'rhand':
        auroraModel.rhand = node;
      break;
      case 'lhand':
        auroraModel.lhand = node;
      break;
      case 'camerahook':
        auroraModel.camerahook = node;  
      break;
      case 'lookathook':
        auroraModel.lookathook = node;
      break;
      case 'impact':
        auroraModel.impact = node;
      break;
    }
  
    if(options.parseChildren){
      options.parent = node;
      for(let i = 0; i < _node.childNodes.length; i++){
        //node.add(THREE.AuroraModel.NodeParser(auroraModel, _node.childNodes[i], options));
        THREE.AuroraModel.NodeParser(auroraModel, _node.childNodes[i], options);
      }
    }
  
    return node;
  
  }




