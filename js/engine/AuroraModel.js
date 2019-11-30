/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The THREE.AuroraModel class takes an AuroraModel object and converts it into a THREE.js object
 */

//THREE.js representation of AuroraLight
THREE.AuroraLight = function () {
  
  THREE.Object3D.call( this );
  this.type = 'AuroraLight';

  this.worldPosition = new THREE.Vector3();
  this.sphere = new THREE.Sphere();

  this.getIntensity = function(){
    if(this._node)
      //return this._node.multiplier;
      return (this._node.multiplier > 1 && (Number(this._node.multiplier) === this._node.multiplier && this._node.multiplier % 1 === 0) ? this._node.multiplier : this._node.multiplier);
    else
      return 0;
  }

  this.getRadius = function(){
    if(this._node)
      return this._node.radius;
    else
      return 0;
  }

  this.isOnScreen = function( frustum = Game.viewportFrustum ){
    this.sphere.center.copy(this.worldPosition);
    this.sphere.radius = this.getRadius();
    return frustum.intersectsSphere(this.sphere);
  }

};

THREE.AuroraLight.prototype = Object.assign( Object.create( THREE.Object3D.prototype ), {
  constructor: THREE.AuroraLight
});

//THREE.js representation of AuroraModel
THREE.AuroraModel = function () {
  
    THREE.Object3D.call( this );
  
    this.type = 'AuroraModel';
    this.box = new THREE.Box3;
    this.context = undefined;
    this.meshes = [];
    this.danglyMeshes = [];
    this.animations = [];
    this.emitters = [];
    this.lights = [];
    this.aabb = {};
    this.materials = [];
    this.animatedUV = [];
    this.parentModel = undefined;

    this.effects = [];

    this.puppeteer = undefined; 
  
    this.names = [];
    this.supermodels = [];

    this.target = null;
    this.force = 0;
    this.controlled = false;

    this.skins = [];
  
    this.currentAnimation = undefined;
    this.lastAnimation = undefined;
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
    this.animLoop = undefined;
    this.mgAnims = [];
    this.animationLoop = false;
    this._vec3 = new THREE.Vector3();
    this._quat = new THREE.Quaternion();
    this._animPosition = new THREE.Vector3();
    this._animQuaternion = new THREE.Quaternion();

    this.nodes = new Map();

    this.animNodeCache = {

    };

    this.hasCollision = false;
    this.invalidateCollision = true;

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

    this.disableEmitters = function(){
      for(let i = 0; i < this.emitters.length; i++){
        this.emitters[i].disable();
      }
    };

    this.dispose = function(node = null){

      if(node == null)
        node = this;

      for(let i = 0; i < this.emitters.length; i++){
        if(this.emitters[i].group)
          this.emitters[i].remove();
      }

     // console.log('dispose', node)
      for (let i = node.children.length; i > 0; i--) {
        const object = node.children[i-1];
        node.remove(object);
        if (object.type === 'Mesh' || object.type === 'SkinnedMesh' || object.type === 'Points') {
          if(Array.isArray(object.material)){
            while(object.material.length){
              let material = object.material.splice(0, 1)[0];
              this.disposeMaterial(material);
              material.dispose();
            }
          }else{
            this.disposeMaterial(object.material);
            object.material.dispose();
          }
          object.geometry.dispose();
          //object.dispose();
        }else if(object.type === 'AuroraLight'){
          console.log('Light', node);
          LightManager.removeLight(node);
        }else{
          if(object.hasOwnProperty('mesh')){
            delete object.mesh;
          }
        }

        if(object.emitter){
          if(this.modelHeader.Classification == 1){
            if(object.emitter.group){
              object.emitter.group.dispose();
            }
          }else{
            if(object.emitter.group){
              object.emitter.remove();
            }
          }
        }

        this.dispose(object);
      }

      if(node instanceof THREE.AuroraModel){
        this.meshes = [];
        this.danglyMeshes = [];
        this.animations = [];
        this.emitters = [];
        this.lights = [];
        this.aabb = {};
        this.materials = [];
        this.skins = [];

        this.puppeteer = undefined; 
        this.names = [];
        this.supermodels = [];
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
        try{
          Game.octree.remove(this);
          Game.octree_walkmesh.remove(this);
        }catch(e){}
        //console.log(node);
      }

    }

    this.disposeMaterial = function(material){
      if(material instanceof THREE.ShaderMaterial){
        if(material.uniforms.map && material.uniforms.map.value)
          material.uniforms.map.value.dispose();

        if(material.uniforms.envMap && material.uniforms.envMap.value)
          material.uniforms.envMap.value.dispose();

        if(material.uniforms.alphaMap && material.uniforms.alphaMap.value)
          material.uniforms.alphaMap.value.dispose();

        if(material.uniforms.lightMap && material.uniforms.lightMap.value)
          material.uniforms.lightMap.value.dispose();

        if(material.uniforms.bumpMap && material.uniforms.bumpMap.value)
          material.uniforms.bumpMap.value.dispose();
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
              }else{
                if(this.currentAnimation){
                  this.lastAnimation = this.currentAnimation;
                }
                //console.log('loop');
                this.currentAnimation.data.events = [];
              }
            });
          }
        }

        if(this.bonesInitialized && this.animLoops.length){

          /*if(this.animLoop instanceof AuroraModelAnimation){
            this.updateAnimation(this.animLoop, delta, () => {

              let index = this.animLoops.indexOf(this.animLoop) + 1;
              if(index >= this.animLoops.length ){
                index = 0;
              }
              this.stopAnimationLoop();
              this.animLoop = this.animLoops[index];
            });
          }else{
            this.animLoop = this.animLoops[0];
          }*/

          for(let i = 0; i < this.animLoops.length; i++){
            this.updateAnimation(this.animLoops[i], delta);
          }
        }
        
        if(this.bonesInitialized && this.mgAnims.length){
          let dead_animations = [];
          for(let i = 0; i < this.mgAnims.length; i++){
            this.updateAnimation(this.mgAnims[i], delta);
            if(this.mgAnims[i].data.elapsed >= this.mgAnims[i].length){
              dead_animations.push(i);
            }
          }
          let old_anims = dead_animations.length;
          while (old_anims--) {
            let anim_index = dead_animations[old_anims];
            this.mgAnims.splice(anim_index, 1);
          }
        }

      }

      for(let i = 0; i < this.animatedUV.length; i++){
        let aUV = this.animatedUV[i];
        if(aUV.material.uniforms.map){
          aUV.material.uniforms.map.value.offset.x += aUV.speed.x * delta/2;
          aUV.material.uniforms.map.value.offset.y += aUV.speed.y * delta/2;
          aUV.material.uniforms.map.value.updateMatrix();
        }
      }

      //Update the time uniform on materials in this array
      for(let i = 0; i < this.materials.length; i++){
        let material = this.materials[i];
        if(material.uniforms){
          material.uniforms.time.value = Game.deltaTime;
        }
      }

      if(this.headhook && this.headhook.children){
        for(let i = 0; i < this.headhook.children.length; i++){
          let node = this.headhook.children[i];
          if(node instanceof THREE.AuroraModel){
            for(let j = 0; j < node.materials.length; j++){
              let material = node.materials[j];
              if(material.uniforms){
                material.uniforms.time.value = Game.deltaTime;
              }
            }
          }
        }
      }
  
      for(let i = 0; i < this.emitters.length; i++){
        this.emitters[i].tick(delta);
      }
  
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
        this.poseAnimationNode(anim, anim.nodes[i]);
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
          length: 0,
          delta: 0,
          lastEvent: -1,
          events: [],
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
          lastEvent: -1,
          events: [],
          callback: callback
        };
      }

      if(this.currentAnimation){
        this.lastAnimation = this.currentAnimation;
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
        if(!this.lastAnimation){
          this.lastAnimation = this.currentAnimation;
        }

        for(let i = 0, len = Global.kotor2DA['animations'].rows.length; i < len; i++){
          if(Global.kotor2DA.animations.rows[i].name == this.currentAnimation.name){
            this.currentAnimation.data.animation = Global.kotor2DA.animations.rows[i];
            break;
          }
        }

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
          lastEvent: -1,
          events: [],
          callback: undefined
        };
      }
      this.currentAnimation = undefined;
    }

    this.stopAnimationLoop = function(){
      //this.pose();
      if(typeof this.animLoop != 'undefined'){
        this.animLoop.data = {
          loop: false,
          cFrame: 0,
          elapsed: 0,
          lastTime: 0,
          delta: 0,
          lastEvent: -1,
          events: [],
          callback: undefined
        };
      }
      this.animLoop = undefined;
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

    this.mergeBones = function(model){
      return;
      /*for(let prop in model.bones){
        this.bones[prop] = model.bones[prop];
      }*/
    };
  
    this.buildSkeleton = function(){
      this.bonesInitialized = false;
      this.oldAnim = this.currentAnimation;
      this.currentAnimation = undefined;
      this.pose();
      let scale = new THREE.Vector3(1, 1, 1);

      /*let model = this;
      if(this.moduleObject && this == this.moduleObject.head){
        model = this.moduleObject.model;
      }*/

      for(let i = 0; i < this.skins.length; i++){
        let skinNode = this.skins[i];
        if(typeof skinNode.bone_parts !== 'undefined'){
          let bones = [];
          let inverses = [];
          for(let j = 0; j < skinNode.bone_parts.length; j++){
            let boneNode = this.nodes.get(skinNode.bone_parts[j]);

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

      this.bonesInitialized = true;
      this.currentAnimation = this.oldAnim;
  
    }
  
    this.pose = function(node = this){
      this.bonesInitialized = false;
      try{
        node.controllers.forEach( (controller) => {
        //for(let cIDX in node.controllers){
          //let controller = node.controllers[cIDX];
          //try{
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
          //}catch(e){
          //  console.error(e);
          //}

        });
        //node.updateMatrix();
        node.updateMatrixWorld(new THREE.Matrix4());
      }catch(e){}

      for(let i = 0; i < node.children.length; i++){
        this.pose(node.children[i])
      }
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

    this.playEvent = function(event, index){
      //console.log(event)
      if(event == 'detonate'){
        let idx = 0;
        for(let i = 0; i < this.emitters.length; i++){
          let emitter = this.emitters[i];
          if(emitter instanceof THREE.AuroraEmitter){
            if(emitter.updateType == 'Explosion'){
              if(idx == index){
                emitter.detonate();
              }
              idx++;
            }
          }
        }
      }else{

        if(typeof this.moduleObject == 'object' && typeof this.moduleObject.playEvent == 'function'){
          this.moduleObject.playEvent(event);
        }
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
      anim.data.elapsed += delta;
      anim.data.lastTime = anim.data.elapsed;

      if(anim.data.elapsed >= anim.length){

        if(anim.data.elapsed > anim.length){
          anim.data.elapsed = anim.length;
          this.updateAnimationEvents(anim);
          let animNodesLen = anim.nodes.length;
          for(let i = 0; i < animNodesLen; i++){
            this.updateAnimationNode(anim, anim.nodes[i]);
          }
        }
  
        anim.data.lastTime = anim.length;
        anim.data.elapsed = 0;

        if(typeof anim.data.callback === 'function')
          anim.data.callback();

        if(typeof onEnd == 'function')
          onEnd();

      }
    };

    this.updateAnimationEvents = function(anim){

      if(!anim.events.length)
        return;

      if(!anim.data.events){
        anim.data.events = [];
      }

      for(let f = 0; f < anim.events.length; f++){

        if(anim.events[f].length <= anim.data.elapsed && !anim.data.events[f]){
          this.playEvent(anim.events[f].name, f);
          anim.data.events[f] = true;
        }

        /*let last = 0;
        if(anim.events[f].length <= anim.data.elapsed){
          last = f;
        }

        let next = last + 1;
        if (last + 1 >= anim.events.length || anim.events[last].length >= anim.data.elapsed) {
          next = 0
        }
    
        if(next != anim.data.lastEvent){
          anim.data.lastEvent = next;
          this.playEvent(anim.events[next].name);
        }*/
      }
      
    }

    this.poseAnimationNode = function(anim, node){

      if(!this.bonesInitialized)
        return;

      let modelNode = this.nodes.get(node.name);
  
      if(typeof modelNode != 'undefined'){
        modelNode.controllers.forEach( (controller) => {
        //for(let cIDX in node.controllers){
  
          //let controller = node.controllers[cIDX];
            
          let data = controller.data[0];
          switch(controller.type){
            case ControllerType.Position:
              let offsetX = 0;
              let offsetY = 0;
              let offsetZ = 0;
              if(typeof modelNode.controllers.get(ControllerType.Position) != 'undefined'){
                offsetX = modelNode.controllers.get(ControllerType.Position).data[0].x;
                offsetY = modelNode.controllers.get(ControllerType.Position).data[0].y;
                offsetZ = modelNode.controllers.get(ControllerType.Position).data[0].z;
              }
              modelNode.position.set((data.x + offsetX) * this.Scale, (data.y + offsetY) * this.Scale, (data.z + offsetZ) * this.Scale);

            break;
            case ControllerType.Orientation:
              let offsetQX = 0;
              let offsetQY = 0;
              let offsetQZ = 0;
              let offsetQW = 1;
              if(typeof modelNode.controllers.get(ControllerType.Orientation) != 'undefined'){  
                offsetQX = modelNode.controllers.get(ControllerType.Orientation).data[0].x;
                offsetQY = modelNode.controllers.get(ControllerType.Orientation).data[0].y;
                offsetQZ = modelNode.controllers.get(ControllerType.Orientation).data[0].z;
                offsetQW = modelNode.controllers.get(ControllerType.Orientation).data[0].w;
              }
              if(data.x == 0 && data.y == 0 && data.z == 0 && data.w == 1){
                data.x = offsetQX;
                data.y = offsetQY;
                data.z = offsetQZ;
                data.w = offsetQW;
              }

              modelNode.quaternion.set(data.x, data.y, data.z, data.w);
            break;
            case ControllerType.SelfIllumColor:
              if(modelNode.mesh){
                if(modelNode.mesh.material instanceof THREE.ShaderMaterial){
                  modelNode.mesh.material.uniforms.selfIllumColor.value.setRGB(
                    data.r, 
                    data.g, 
                    data.b
                  );
                  modelNode.mesh.material.defines.SELFILLUMCOLOR = "";
                }else{
                  modelNode.mesh.material.emissive.setRGB(
                    data.r, 
                    data.g, 
                    data.b
                  );
                }
              }
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
                modelNode._node.multiplier = data.value;
              }
            break;
            case ControllerType.Radius:
              if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                modelNode._node.radius = data.value;
              }
            break;
          }
  
        });
        modelNode.updateMatrix();
        if(modelNode.mesh){
          modelNode.mesh.geometry.computeBoundingSphere();
        }

      }

    }

    this.updateAnimationNode = function(anim, node){

      let modelNode = this.nodes.get(node.name);

      if(this.moduleObject && this.moduleObject.head && this.moduleObject.head != this){
        //This if statement is a hack to get around using getObjectByName because it was too expensive
        //Not sure of the best approach here. This seems to work for now
        if(node.name != 'rootdummy' && node.name != 'cutscenedummy' && node.name != 'torso_g' && node.name != 'torsoupr_g')
          this.moduleObject.head.updateAnimationNode(anim, node);
      }

      let trans = (anim.transition && this.lastAnimation && this.lastAnimation.name != anim.name);
  
      if(typeof modelNode != 'undefined'){
        if(modelNode.lipping && this.moduleObject && this.moduleObject.lipObject)
          return;

        anim._position.x = anim._position.y = anim._position.z = 0;
        anim._quaternion.x = anim._quaternion.y = anim._quaternion.z = 0;
        anim._quaternion.w = 1;
        

        //node.controllers.forEach( (controller) => {
        for(var controller of node.controllers){

          controller = controller[1];

          let shouldBlend = false;

          if(anim.data.animation){
            shouldBlend = parseInt(anim.data.animation.looping) || parseInt(anim.data.animation.running) || parseInt(anim.data.animation.walking);
          }
            
          if( (controller.data.length == 1 || anim.data.elapsed == 0 || controller.data[0].time >= anim.data.elapsed) && !shouldBlend ){
            let data = controller.data[0];
            switch(controller.type){
              case ControllerType.Position:
                if(typeof modelNode.controllers.get(ControllerType.Position) != 'undefined'){

                  if(trans && controller.data.length > 1){
                    modelNode.trans.position.copy(modelNode.position);
                    anim._position.copy(modelNode.trans.position);
                  }else{
                    anim._position.copy(modelNode.controllers.get(ControllerType.Position).data[0]);
                  }
        
                  if(anim.name.indexOf('CUT') > -1 && modelNode.name == 'cutscenedummy'){
                    anim._position.sub(this.position);
                  }
        
                }
                if(trans && controller.data.length > 1){
                  modelNode.position.lerp(anim._position.add(data), anim.data.delta);
                }else{
                  modelNode.position.copy(anim._position.add(data));
                }
              break;
              case ControllerType.Orientation:

                if(typeof modelNode.controllers.get(ControllerType.Orientation) != 'undefined'){

                  if(trans && controller.data.length > 1){
                    modelNode.trans.quaternion.copy(modelNode.quaternion);
                    anim._quaternion.copy(modelNode.trans.quaternion);
                  }else{
                    anim._quaternion.copy(modelNode.controllers.get(ControllerType.Orientation).data[0]);
                  }
    
                }
                if(data.x == 0 && data.y == 0 && data.z == 0 && data.w == 1){
                  data.x = anim._quaternion.x;
                  data.y = anim._quaternion.y;
                  data.z = anim._quaternion.z;
                  data.w = anim._quaternion.w;
                }

                if(trans && controller.data.length > 1){
                  modelNode.quaternion.slerp(this._quat.copy(anim._quaternion), 0);
                }else{
                  modelNode.quaternion.copy(data);
                }
                
              break;
              case ControllerType.Scale:
                let offsetScale = 0;
                if(typeof modelNode.controllers.get(ControllerType.Scale) != 'undefined'){
                  offsetScale = modelNode.controllers.get(ControllerType.Scale).data[0].value || 0.000000000001; //0 scale causes warnings
                }
                modelNode.scale.setScalar( ( (data.value + offsetScale) * this.Scale ) || 0.00000001 );
              break;
            }

            if(modelNode.emitter){
              switch(controller.type){
                case ControllerType.LifeExp:
                  modelNode.emitter.lifeExp = Math.ceil(data.value);
                break;
                case ControllerType.BirthRate:
                  modelNode.emitter.birthRate = Math.ceil(data.value);
                break;
                case ControllerType.ColorStart:
                  modelNode.emitter.colorStart.copy(data);
                  modelNode.emitter.material.uniforms.colorStart.value.copy(data);
                  modelNode.emitter.material.uniformsNeedUpdate = true;
                break;
                case ControllerType.ColorMid:
                  modelNode.emitter.colorMid.copy(data);
                  modelNode.emitter.material.uniforms.colorMid.value.copy(data);
                  modelNode.emitter.material.uniformsNeedUpdate = true;
                break;
                case ControllerType.ColorEnd:
                  modelNode.emitter.colorEnd.copy(data);
                  modelNode.emitter.material.uniforms.colorEnd.value.copy(data);
                  modelNode.emitter.material.uniformsNeedUpdate = true;
                break;
                case ControllerType.AlphaStart:
                  modelNode.emitter.opacity[0] = data.value;
                  modelNode.emitter.material.uniforms.opacity.value.fromArray(modelNode.emitter.opacity);
                  modelNode.emitter.material.uniformsNeedUpdate = true;
                break;
                case ControllerType.AlphaMid:
                  modelNode.emitter.opacity[1] = data.value;
                  modelNode.emitter.material.uniforms.opacity.value.fromArray(modelNode.emitter.opacity);
                  modelNode.emitter.material.uniformsNeedUpdate = true;
                break;
                case ControllerType.AlphaEnd:
                  modelNode.emitter.opacity[2] = data.value;
                  modelNode.emitter.material.uniforms.opacity.value.fromArray(modelNode.emitter.opacity);
                  modelNode.emitter.material.uniformsNeedUpdate = true;
                break;
                case ControllerType.Mass:
                  modelNode.emitter.mass = data.value;
                  modelNode.emitter.attributeChanged('mass');
                break;
              }
            }else{
              switch(controller.type){
                case ControllerType.SelfIllumColor:
                  if(modelNode.mesh){
                    if(modelNode.mesh.material instanceof THREE.ShaderMaterial){
                      modelNode.mesh.material.uniforms.selfIllumColor.value.setRGB(
                        data.r, 
                        data.g, 
                        data.b
                      );
                      modelNode.mesh.material.defines.SELFILLUMCOLOR = "";
                    }else{
                      modelNode.mesh.material.emissive.setRGB(
                        data.r, 
                        data.g, 
                        data.b
                      );
                    }
                  }
                break;
                case ControllerType.Alpha:
                  if(modelNode.mesh){
                    if(modelNode.mesh.material instanceof THREE.ShaderMaterial){
                      modelNode.mesh.material.uniforms.opacity.value = data.value;
                    }else{
                      modelNode.mesh.material.opacity = data.value;
                    }
                    modelNode.mesh.material.transparent = true;
                  }
                break;
                case ControllerType.Color:
                  if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                    modelNode._node.light.color.setRGB(
                      data.r, 
                      data.g, 
                      data.b
                    );
                  }
                break;
                case ControllerType.Multiplier:
                  if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                    modelNode._node.multiplier = data.value;
                  }
                break;
                case ControllerType.Radius:
                  if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                    modelNode._node.radius = data.value;
                  }
                break;
              }
            }
          }else{

            let lastFrame = 0;
            let framesLen = controller.data.length;
            for(let f = 0; f < framesLen; f++){
              if(controller.data[f].time <= anim.data.elapsed){
                lastFrame = f;
              }
            }

            let last = controller.data[lastFrame];
            if(last){

              let next = controller.data[lastFrame + 1];
              let fl = 0;

              if (next) { 
                fl = Math.abs( (anim.data.elapsed - last.time) / (next.time - last.time) ) % 1;
              }else{
                fl = 1;
                next = controller.data[lastFrame];
                last = controller.data[lastFrame - 1] || controller.data[lastFrame];
              }
              
              if(fl == Infinity)
                fl = 1.0;

              switch(controller.type){
                case ControllerType.Position:

                  //if(last.x == next.x && last.y == next.y && last.z == next.z)
                  //  break;

                  if(typeof modelNode.controllers.get(ControllerType.Position) != 'undefined'){
                    anim._position.copy(modelNode.controllers.get(ControllerType.Position).data[0]);
                    if(anim.name.indexOf('CUT') > -1 && modelNode.name == 'cutscenedummy'){
                      anim._position.sub(this.position);
                    }
                  }

                  if(last.isBezier){
                    //Last point
                    if(last.isLinearBezier){
                      this._vec3.copy(last.bezier.getPoint(0)).add(anim._position);
                      modelNode.position.copy(this._vec3);
                    }else{
                      this._vec3.copy(last.bezier.getPoint((0.5 * fl) + 0.5).add(anim._position));
                      modelNode.position.copy(this._vec3);
                    }

                    //Next point
                    //if(next.isLinearBezier){
                      this._vec3.copy(next.bezier.getPoint( next.lastFrame ? 0 : 0.5 )).add(anim._position);
                      modelNode.position.lerp(this._vec3, fl);
                    //}else{
                    //  this._vec3.copy(next.bezier.getPoint(0.5 * fl).add(anim._position));
                    //  modelNode.position.lerp(this._vec3, fl);
                    //}
                  }else if(next.isBezier){
                    //Last point
                    this._vec3.copy(last).add(anim._position);
                    modelNode.position.copy(this._vec3);
                    //Next point
                    if(next.isLinearBezier){
                      this._vec3.copy(next.bezier.getPoint(0)).add(anim._position);
                      modelNode.position.lerp(this._vec3, fl);
                    }else{
                      this._vec3.copy(next.bezier.getPoint(0.5 * fl)).add(anim._position);
                      modelNode.position.lerp(this._vec3, fl);
                    }
                  }else{
                    
                    //if(trans && lastFrame == 0){
                    //  modelNode.position.copy(modelNode.trans.position);
                    //}else{
                      this._vec3.copy(last).add(anim._position);
                      modelNode.position.copy(this._vec3);
                    //}

                    this._vec3.copy(next);
                    this._vec3.add(anim._position);

                    // if(anim.data.elapsed > anim.transition){
                    //   modelNode.position.copy(last);
                    //   modelNode.position.add(anim._position);
                    // }
                    modelNode.position.lerp(this._vec3, fl);
                  }

                break;
                case ControllerType.Orientation:
                  if(modelNode.emitter){

                    if(trans && lastFrame == 0){
                      modelNode.position.copy(modelNode.trans.position);
                    }
                    this._quat.slerp(next, fl);

                    //modelNode.emitter.velocity.value.copy(modelNode.emitterOptions.velocity.value.copy().applyQuaternion(this._quat));
                    //modelNode.emitter.velocity.spread.copy(modelNode.emitterOptions.velocity.spread.copy().applyQuaternion(this._quat));
                    //modelNode.emitter.updateFlags['velocity'] = true;

                    modelNode.rotation.z = 0;

                  }else{
                    this._quat.copy(next);

                    if(next != last){
                      if(trans && lastFrame == 0){//(anim.length * anim.transition) > anim.data.elapsed){
                          //modelNode.quaternion.copy(modelNode.trans.quaternion);

                          modelNode.quaternion.copy(modelNode.trans.quaternion);
                          modelNode.trans.quaternion.copy(modelNode.quaternion.slerp(this._quat, fl));

                          //modelNode.quaternion.copy(
                            //modelNode.trans.quaternion.copy(
                                  /*modelNode.quaternion.slerp(
                                      modelNode.trans.quaternion, 
                                      anim.data.elapsed/(anim.length * anim.transition)
                                  )*/
                              //)
                          //);
                      }else{
                          modelNode.quaternion.copy(last);
                          modelNode.quaternion.slerp(this._quat, fl);
                      }
                    }else{
                      modelNode.quaternion.copy(last);
                    }
                    //modelNode.quaternion.copy(last);
                  }
                  
                break;
                case ControllerType.Scale:
                  modelNode.scale.lerp( this._vec3.setScalar( ( (next.value) * this.Scale) || 0.000000001 ), fl);
                break;
              }

              if(modelNode.emitter){
                switch(controller.type){
                  case ControllerType.LifeExp:
                    modelNode.emitter.lifeExp = next.value;//Math.ceil(last.value + fl * (next.value - last.value));
                  break;
                  case ControllerType.BirthRate:
                    modelNode.emitter.birthRate = next.value;//Math.ceil((last.value + fl * (next.value - last.value)));
                  break;
                  case ControllerType.ColorStart:
                    modelNode.emitter.colorStart.setRGB(
                      last.r + fl * (next.r - last.r),
                      last.g + fl * (next.g - last.g),
                      last.b + fl * (next.b - last.b)
                    );
                    modelNode.emitter.material.uniforms.colorStart.value.copy(modelNode.emitter.colorStart);
                    modelNode.emitter.material.uniformsNeedUpdate = true;
                  break;
                  case ControllerType.ColorMid:
                    modelNode.emitter.colorMid.setRGB(
                      last.r + fl * (next.r - last.r),
                      last.g + fl * (next.g - last.g),
                      last.b + fl * (next.b - last.b)
                    );
                    modelNode.emitter.material.uniforms.colorMid.value.copy(modelNode.emitter.colorMid);
                    modelNode.emitter.material.uniformsNeedUpdate = true;
                  break;
                  case ControllerType.ColorEnd:
                    modelNode.emitter.colorEnd.setRGB(
                      last.r + fl * (next.r - last.r),
                      last.g + fl * (next.g - last.g),
                      last.b + fl * (next.b - last.b)
                    );
                    modelNode.emitter.material.uniforms.colorEnd.value.copy(modelNode.emitter.colorEnd);
                    modelNode.emitter.material.uniformsNeedUpdate = true;
                  break;
                  case ControllerType.AlphaStart:
                    modelNode.emitter.opacity[0] = ((next.value - last.value) * fl + last.value);
                    modelNode.emitter.material.uniforms.opacity.value.fromArray(modelNode.emitter.opacity);
                    modelNode.emitter.material.uniformsNeedUpdate = true;
                  break;
                  case ControllerType.AlphaMid:
                    modelNode.emitter.opacity[1] = ((next.value - last.value) * fl + last.value);
                    modelNode.emitter.material.uniforms.opacity.value.fromArray(modelNode.emitter.opacity);
                    modelNode.emitter.material.uniformsNeedUpdate = true;
                  break;
                  case ControllerType.AlphaEnd:
                    modelNode.emitter.opacity[0] = ((next.value - last.value) * fl + last.value);
                    modelNode.emitter.material.uniforms.opacity.value.fromArray(modelNode.emitter.opacity);
                    modelNode.emitter.material.uniformsNeedUpdate = true;
                  break;
                }
              }else{
                switch(controller.type){
                  case ControllerType.Alpha:
                    if(modelNode.mesh){
                      modelNode.mesh.material.opacity = ((next.value - last.value) * fl + last.value);
                      modelNode.mesh.material.transparent = modelNode.mesh.material.opacity < 1.0;
                      modelNode.mesh.material.depthFunc = 4;
                    }
                  break;
                  case ControllerType.SelfIllumColor:
                    let lerpIllumColorR = last.r + fl * (next.r - last.r);
                    let lerpIllumColorG = last.g + fl * (next.g - last.g);
                    let lerpIllumColorB = last.b + fl * (next.b - last.b);
                    //console.log(modelNode.mesh._node.Diffuse.r, lerpIllumColor);
                    if(modelNode.mesh){

                      if(modelNode.mesh.material instanceof THREE.ShaderMaterial){
                        modelNode.mesh.material.uniforms.selfIllumColor.value.setRGB(
                          lerpIllumColorR, 
                          lerpIllumColorG, 
                          lerpIllumColorB
                        );
                        modelNode.mesh.material.defines.SELFILLUMCOLOR = "";
                      }else{
                        modelNode.mesh.material.emissive.setRGB(
                          lerpIllumColorR, 
                          lerpIllumColorG, 
                          lerpIllumColorB
                        );
                      }
                      //modelNode.mesh.material.needsUpdate = true;
                    }
                  break;
                  case ControllerType.Color:
                    if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                      modelNode._node.light.color.r = ((next.r - last.r) * fl + last.r);
                      modelNode._node.light.color.g = ((next.g - last.g) * fl + last.g);
                      modelNode._node.light.color.b = ((next.b - last.b) * fl + last.b);
                    }
                  break;
                  case ControllerType.Multiplier:
                    if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                      modelNode._node.multiplier = ((next.value - last.value) * fl + last.value);
                    }
                  break;
                  case ControllerType.Radius:
                    if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                      modelNode._node.radius = ((next.value - last.value) * fl + last.value);
                    }
                  break;
                }
              }

            }

          }
  
        };//);

        //modelNode.updateMatrixWorld(true);

        //if(modelNode.mesh){
          //modelNode.mesh.geometry.computeBoundingSphere();
        //}

      }

    }

    this.clone = function () {

      let cloned = new this.constructor().copy( this );
      cloned._animPosition = new THREE.Vector3();
      cloned._animQuaternion = new THREE.Quaternion();
      cloned.animations = this.animations.slice();
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
  
  // grabbing all the prototype methods from Object3D
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
      auroraModel.name = model.geometryHeader.ModelName.toLowerCase().trim();
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
        auroraModel.mergedGeometry.faceVertexUvs = [[],[]];
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
        auroraModel.mergedMesh.receiveShadow = true;
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

                //let auroraSuperModel = new THREE.AuroraModel();
                //auroraSuperModel.name = model.geometryHeader.ModelName.toLowerCase().trim();
                //auroraSuperModel.options = options;

                //auroraSuperModel.add(THREE.AuroraModel.NodeParser(auroraSuperModel, model.rootNode, options));

                //auroraModel.supermodels.push(auroraSuperModel);

                //auroraModel.nodes = new Map(auroraModel.nodes, auroraSuperModel.nodes);
                //auroraModel.buildSkeleton();
  
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

      auroraModel.box.setFromObject(auroraModel);
  
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

    //Skip over LightMap Omnilight references because they are blank nodes
    //Don't know if this will have any side effects yet
    if(_node.name.toLowerCase().indexOf('lmomnilight') >= 0){
      return;
    }
  
    let node = new THREE.Group();
    node._node = _node;
    node.NodeType = _node.NodeType;
    node.isWalkmesh = ((_node.NodeType & AuroraModel.NODETYPE.AABB) == AuroraModel.NODETYPE.AABB);

    if(node.isWalkmesh){
      auroraModel.aabb = _node.rootAABB;
    }

    node.controllers = _node.controllers;
    node.controllerCache = {};
    node.position.set(_node.position.x, _node.position.y, _node.position.z);
    node.quaternion.set(_node.quaternion.x, _node.quaternion.y, _node.quaternion.z, _node.quaternion.w);

    node.trans = {
      position: new THREE.Vector3,
      quaternion: new THREE.Quaternion
    };
  
    node.name = _node.name.toLowerCase();

    if(node.name == auroraModel.name.toLowerCase()+'a'){
      options.isChildrenDynamic = true;
    }

    if(!auroraModel.nodes.has(node.name))
      auroraModel.nodes.set(node.name, node);

    if(options.parent != auroraModel){
      options.parent.add(node);
    }
  
    node.getControllerByType = function(type = -1){

      return this.controllers.get(type);

      /*if(typeof this.controllers[type] != 'undefined'){
        return this.controllers[type];
      }
  
      return null;*/

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
        //if(_node.FlagRender || node.isWalkmesh || auroraModel.name == 'plc_invis'){
        if(_node.faces.length ){

          if( (!_node.FlagRender && _node.TextureMap1 != 'NULL') || _node.FlagRender ){

            let geometry = new THREE.Geometry();
      
            geometry.boundingBox = new THREE.Box3(_node.boundingBox.min, _node.boundingBox.max);//_node.boundingBox;
      
            geometry.vertices = _node.vertices || [];
            geometry.faces = _node.faces || [];
            geometry.faceUvs = [[],[]];
            geometry.faceVertexUvs = [[],[]];
            
            if(_node.tvectors)
              geometry.faceUvs[0] = _node.tvectors[0];
            
            if(_node.texCords)
              geometry.faceVertexUvs[0] = _node.texCords[0];

            
            if(_node.tvectors){
              geometry.faceUvs[1] = _node.tvectors[0];
              if(!geometry.faceUvs[0].length)
                geometry.faceUvs[0] = _node.tvectors[0];
            }

            if(_node.texCords)
              geometry.faceVertexUvs[1] = _node.texCords[0];
            
            if(geometry.faces.length){
              //geometry.computeFaceNormals();
              //geometry.computeVertexNormals();    // requires correct face normals
              //geometry.computeBoundingSphere();
              if(auroraModel.modelHeader.Smoothing)
                geometry.mergeVertices();
            }
      
            let tMap1 = _node.TextureMap1+'';
            let tMap2 = _node.TextureMap2+'';
            let fallbackTexture = null;
      
            if(options.textureVar != '' && options.textureVar.indexOf('****') == -1){
              fallbackTexture = tMap1;
              tMap1 = options.textureVar;
            }

            _node.tMap1 = tMap1;
      
            let material = null;
            let map1 = null;
            let map2 = null;

            if(tMap1 || tMap2){
              //_node.Diffuse.r = _node.Diffuse.g = _node.Diffuse.b = 0.8;
            }

            material = new THREE.ShaderMaterial({
              fragmentShader: THREE.ShaderLib.aurora.fragmentShader,
              vertexShader: THREE.ShaderLib.aurora.vertexShader,
              uniforms: THREE.UniformsUtils.merge([THREE.ShaderLib.aurora.uniforms]),
              side:THREE.FrontSide,
              lights: true,
              fog: auroraModel.affectedByFog,
            });
            material.uniforms.shininess.value = 0.0000001;
            material.extensions.derivatives = true;
            material.extensions.fragDepth = true;
            if(options.useTweakColor){
              material.uniforms.diffuse.value = new THREE.Color( _node.Diffuse.r, _node.Diffuse.g, _node.Diffuse.b );
              material.uniforms.tweakColor.value.setRGB((options.tweakColor & 255)/255, ((options.tweakColor >> 8) & 255)/255, ((options.tweakColor >> 16) & 255)/255);
            }else{
              material.uniforms.tweakColor.value.setRGB(1, 1, 1);
              material.uniforms.diffuse.value = new THREE.Color( 1, 1, 1 );//_node.Diffuse.r, _node.Diffuse.g, _node.Diffuse.b );
            }
            material.uniforms.time.value = Game.time;
            material.defines = material.defines || {};
            material.defines.AURORA = "";

            if(_node.MDXDataBitmap & AuroraModel.MDXFLAG.UV1 || 
               _node.MDXDataBitmap & AuroraModel.MDXFLAG.UV2 || 
               _node.MDXDataBitmap & AuroraModel.MDXFLAG.UV3 || 
               _node.MDXDataBitmap & AuroraModel.MDXFLAG.UV4
              ){
              material.defines.USE_UV = "";
            }

            if(node.controllers.has(ControllerType.SelfIllumColor)){
              let selfIllumColor = node.controllers.get(ControllerType.SelfIllumColor);
              if(selfIllumColor.data[0].r || selfIllumColor.data[0].g || selfIllumColor.data[0].b){
                material.defines.SELFILLUMCOLOR = "";
                material.uniforms.selfIllumColor.value.copy(selfIllumColor.data[0]);
              }
            }

            if(!_node.FlagRender && !node.isWalkmesh){
              material.visible = false;
            }

            auroraModel.materials.push(material);
            
            if(_node.HasLightmap && tMap2.length){
              //material.lightMap = map2;
              //material.uniforms.lightMap.value = map2;
              map2 = TextureLoader.enQueue(tMap2, material, TextureLoader.Type.LIGHTMAP);
              geometry.faceUvs[1] = _node.tvectors[1];
              geometry.faceVertexUvs[1] = _node.texCords[1];
              if(!geometry.faceUvs[0].length)
                geometry.faceUvs[0] = _node.tvectors[1];
            }

            if((!(_node.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT1) && 
              !(_node.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT2) && 
              !(_node.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT3) && 
              !(_node.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT4) &&
              !_node.FlagShadow && !options.castShadow && !options.lighting) || _node.BackgroundGeometry){
                //console.log('IGNORE_LIGHTING', material);
                material.defines.IGNORE_LIGHTING = "";
            }

            if(options.isHologram){
              material.defines.HOLOGRAM = "";
              material.transparent = true;
              if(_node.HideInHolograms){
                material.visible = false;
              }
            }

            //Set dangly uniforms
            if((_node.NodeType & AuroraModel.NODETYPE.Dangly) == AuroraModel.NODETYPE.Dangly) {
              material.uniforms.danglyDisplacement.value = _node.danglyDisplacement;
              material.uniforms.danglyTightness.value = _node.danglyTightness;
              material.uniforms.danglyPeriod.value = _node.danglyPeriod;
              material.defines.DANGLY = '';
            }

            //Set animated uv uniforms
            if(_node.nAnimateUV){
              material.uniforms.animatedUV.value.set(_node.fUVDirectionX, _node.fUVDirectionY, _node.fUVJitter, _node.fUVJitterSpeed);
              material.defines.ANIMATED_UV = '';

              auroraModel.animatedUV.push({
                material: material,
                speed: new THREE.Vector2(_node.fUVDirectionX, _node.fUVDirectionY),
                jitter: {
                  jitter: _node.fUVJitter,
                  speed: _node.fUVJitterSpeed
                }
              });
            }


            if(_node.Transparent){
              material.transparent = true;
            }

            _node.controllers.forEach( (controller) => {
            //for(let cIDX in _node.controllers){
              //let controller = _node.controllers[cIDX];
              switch(controller.type){
                case ControllerType.Alpha:

                  if(material instanceof THREE.ShaderMaterial){
                    material.uniforms.opacity.value = controller.data[0].value;
                  }else{
                    material.opacity = controller.data[0].value;
                  }

                  if(controller.data[0].value < 1){
                    material.transparent = true;
                  }else{
                    material.transparent = false;
                  }
                break;
              }
            });
      
            if(tMap1 != 'NULL' && tMap1 != 'Toolcolors'){
              map1 = TextureLoader.enQueue(tMap1, material, TextureLoader.Type.TEXTURE, (texture, tex) => {
                if(material.type != tex.material.type){
                  material = tex.material;
                  console.log('Material mismatch', tex.material);
                }
              }, fallbackTexture);
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

              if(!node.isWalkmesh && geometry.faces.length){
                let buffer = new THREE.BufferGeometry();
                buffer.fromGeometry(geometry);
                geometry.dispose();
                geometry = buffer;

              }

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
            }else if((_node.NodeType & AuroraModel.NODETYPE.Dangly) == AuroraModel.NODETYPE.Dangly) {
              let buffer = new THREE.BufferGeometry();
              buffer.fromGeometry(geometry);
              geometry.dispose();
              geometry = buffer;

              let newConstraints = [];

              for(let i = 0; i < _node.faces.length; i++){
                newConstraints.push(_node.danglyVec4[_node.faces[i].a]);
                newConstraints.push(_node.danglyVec4[_node.faces[i].b]);
                newConstraints.push(_node.danglyVec4[_node.faces[i].c]);
              }

              var constraints = new Float32Array( newConstraints.length * 4 );
              geometry.addAttribute( 'constraint', new THREE.BufferAttribute( constraints, 4 ).copyVector4sArray( newConstraints ) );

              mesh = new THREE.Mesh( geometry , material );
              _node.roomStatic = false;

              //console.log('dangly', mesh);

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
              mesh.visible = false;
            }

            if(!node.isWalkmesh && options.mergeStatic && _node.roomStatic && mesh.geometry.faces.length){

              mesh.position.copy(node.getWorldPosition(new THREE.Vector3));
              mesh.quaternion.copy(node.getWorldQuaternion(new THREE.Quaternion));
              mesh.updateMatrix(); // as needed
              //mesh.updateMatrixWorld(); // as needed

              auroraModel.mergedMaterials.push(material);
              THREE.AuroraModel.MergeGeometry(auroraModel.mergedGeometry, mesh.geometry, mesh.matrix, auroraModel.mergedMaterials.length-1)
              //auroraModel.mergedGeometry.merge(mesh.geometry, mesh.matrix);
              mesh.geometry.dispose();
              mesh.geometry = undefined;
              mesh = undefined;
              //options.parent.remove(node);
            }else{
              //mesh.visible = !node.isWalkmesh;
              mesh._node = _node;
              mesh.matrixAutoUpdate = false;
              mesh.castShadow = options.castShadow;
              mesh.receiveShadow = options.receiveShadow;
              node.add( mesh );
            }

            if(options.isChildrenDynamic)
              mesh.renderOrder = 5000;

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
      _node.multiplier = 1.0;
      _node.position = new THREE.Vector3();
      
      _node.controllers.forEach( (controller) => {
      //for(let cIDX in _node.controllers){
        //let controller = _node.controllers[cIDX];
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
            _node.multiplier = controller.data[0].value;
          break;
        }
      });

      //if(GameKey != "TSL"){
      //  _node.intensity = _node.intensity > 1 ? _node.intensity * .01 : _node.intensity;
      //}else{
        _node.intensity = _node.intensity * _node.multiplier;// > 1 ? _node.intensity * .01 : _node.intensity;
      //}

      let lightNode;
      if(!options.manageLighting){
        if(_node.AmbientFlag){
          lightNode = new THREE.AmbientLight( _node.color );
          lightNode.intensity = _node.multiplier * 0.5;
        }else{
          //lightNode = new THREE.PointLight( _node.color, _node.intensity, _node.radius * 100 );
          lightNode = new THREE.PointLight( _node.color, 1, _node.radius * _node.multiplier, 1 );
          lightNode.shadow.camera.far = _node.radius;
          //lightNode.distance = radius;
          lightNode.position = _node.position;
        }        
        lightNode.decay = 1;
        lightNode.visible = true;
        lightNode.controllers = _node.controllers;
        lightNode.helper = {visible:false};
      
        //auroraModel.lights.push(lightNode);
        _node.light = lightNode;
        options.parent.add(lightNode);
      }else{
        lightNode = new THREE.AuroraLight();
        lightNode.isAnimated = !_node.roomStatic;
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

      if(_node.flare.radius){
        let lendsFlare = new THREE.Lensflare();

        TextureLoader.enQueue(_node.flare.textures[0], null, TextureLoader.Type.TEXTURE, (texture, tex) => {
          lendsFlare.addElement( new THREE.LensflareElement( texture, _node.flare.sizes[0],  _node.flare.positions[0],  _node.flare.colorShifts[0] ) );
        });

        TextureLoader.Load(_node.flare.textures[0], (texture) => {
          textureFlare0 = texture;
        });

        lightNode.add(lendsFlare);
      }

      if(options.manageLighting){
        LightManager.addLight(_node.light);
      }
      
    }
  
    if ((_node.NodeType & AuroraModel.NODETYPE.Emitter) == AuroraModel.NODETYPE.Emitter) {
      let emitter = new THREE.AuroraEmitter(_node);
      emitter.name = _node.name + '_em'
      node.emitter = emitter;
      node.add(emitter);
      auroraModel.emitters.push(emitter);
    }
  
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
      case 'headconjure':
        auroraModel.headconjure = node;
      break;
      case 'maskhook':
        auroraModel.maskhook = node;
      break;
      case 'gogglehook':
        auroraModel.gogglehook = node;
      break;
    }

    node.matrixInverse = new THREE.Matrix4();
    node.matrixInverse.getInverse( node.matrix.clone() );
  
    if(options.parseChildren){
      options.parent = node;
      for(let i = 0; i < _node.childNodes.length; i++){
        //node.add(THREE.AuroraModel.NodeParser(auroraModel, _node.childNodes[i], options));
        THREE.AuroraModel.NodeParser(auroraModel, _node.childNodes[i], options);
      }
    }
  
    return node;
  
  }

  //This method is copied from the THREE.Geometry class and modified to work with lightmap UVs
  THREE.AuroraModel.MergeGeometry = function (geometry1, geometry2, matrix, materialIndexOffset ) {

		if ( ! ( geometry2 && geometry2.isGeometry ) ) {

			console.error( 'THREE.Geometry.merge(): geometry not an instance of THREE.Geometry.', geometry2 );
			return;

		}

		var normalMatrix,
			vertexOffset = geometry1.vertices.length,
			vertices1 = geometry1.vertices,
			vertices2 = geometry2.vertices,
			faces1 = geometry1.faces,
			faces2 = geometry2.faces,
			uvs1 = geometry1.faceVertexUvs[0],
      uvs2 = geometry2.faceVertexUvs[0],
      //BEGIN Lightmap UVs
      uvs21 = geometry1.faceVertexUvs[1],
      uvs22 = geometry2.faceVertexUvs[1],
      //END Lightmap UVs
			colors1 = geometry1.colors,
			colors2 = geometry2.colors;

		if ( materialIndexOffset === undefined ) materialIndexOffset = 0;

		if ( matrix !== undefined ) {

			normalMatrix = new THREE.Matrix3().getNormalMatrix( matrix );

		}

		// vertices

		for ( var i = 0, il = vertices2.length; i < il; i ++ ) {

			var vertex = vertices2[ i ];

			var vertexCopy = vertex.clone();

			if ( matrix !== undefined ) vertexCopy.applyMatrix4( matrix );

			vertices1.push( vertexCopy );

		}

		// colors

		for ( var i = 0, il = colors2.length; i < il; i ++ ) {

			colors1.push( colors2[ i ].clone() );

		}

		// faces

		for ( i = 0, il = faces2.length; i < il; i ++ ) {

			var face = faces2[ i ], faceCopy, normal, color,
				faceVertexNormals = face.vertexNormals,
				faceVertexColors = face.vertexColors;

			faceCopy = new THREE.Face3( face.a + vertexOffset, face.b + vertexOffset, face.c + vertexOffset );
			faceCopy.normal.copy( face.normal );

			if ( normalMatrix !== undefined ) {

				faceCopy.normal.applyMatrix3( normalMatrix ).normalize();

			}

			for ( var j = 0, jl = faceVertexNormals.length; j < jl; j ++ ) {

				normal = faceVertexNormals[ j ].clone();

				if ( normalMatrix !== undefined ) {

					normal.applyMatrix3( normalMatrix ).normalize();

				}

				faceCopy.vertexNormals.push( normal );

			}

			faceCopy.color.copy( face.color );

			for ( var j = 0, jl = faceVertexColors.length; j < jl; j ++ ) {

				color = faceVertexColors[ j ];
				faceCopy.vertexColors.push( color.clone() );

			}

			faceCopy.materialIndex = face.materialIndex + materialIndexOffset;

			faces1.push( faceCopy );

		}

		// uvs1
    for ( i = 0, il = uvs2.length; i < il; i ++ ) {

      var uv = uvs2[ i ], uvCopy = [];

      if ( uv === undefined ) {

        continue;

      }

      for ( var j = 0, jl = uv.length; j < jl; j ++ ) {

        uvCopy.push( uv[ j ].clone() );

      }

      uvs1.push( uvCopy );

    }

		// uvs2
    for ( i = 0, il = uvs22.length; i < il; i ++ ) {

      var uv = uvs22[ i ], uvCopy = [];

      if ( uv === undefined ) {

        continue;

      }

      for ( var j = 0, jl = uv.length; j < jl; j ++ ) {

        uvCopy.push( uv[ j ].clone() );

      }

      uvs21.push( uvCopy );

    }

  }

  
  

