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
    this.emitters_detonate = []
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
      for (let i = node.children.length - 1; i >= 0; i--) {
        const object = node.children[i];
        if (object.type === 'Mesh' || object.type === 'SkinnedMesh') {
          object.geometry.dispose();
          if(Array.isArray(object.material)){
            while(object.material.length){
              let material = object.material.splice(0, 1)[0];
              material.dispose();
            }
          }else{
            object.material.dispose();
          }

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

        }else if(object.type === 'AuroraLight'){
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
        node.remove(object);
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
              }else{
                //console.log('loop');
                this.currentAnimation.data.events = [];
              }
            });
          }
        }

        if(this.bonesInitialized && this.animLoops.length){
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
          aUV.material.uniforms.map.value.offset.x += aUV.speed.x;// * delta;
          aUV.material.uniforms.map.value.offset.y += aUV.speed.y;// * delta;
          aUV.material.uniforms.map.value.updateMatrix();
        }
      }

      //Update the time uniform on materials in this array
      for(let i = 0; i < this.materials.length; i++){
        let material = this.materials[i];
        if(material.uniforms){
          material.uniforms.time.value += delta;
        }
      }
  
      for(let i = 0; i < this.emitters.length; i++){
        let emitter = this.emitters[i];

        switch(emitter.node._emitter.Update){
          case 'Explosion':
            emitter.particlesPerSecond -= 1;
            if(emitter.particlesPerSecond < 1){
              emitter.particlesPerSecond = 1;
            }
          break;
          case 'Single':

          break;
          default:
            if(emitter.particlesPerSecond <= 0){
              emitter.particleCount = 1000;
            }
          break;
        }

        if(this.modelHeader.Classification != 1){

         // emitter.position.value.copy(emitter.node.getWorldPosition(new THREE.Vector3));
          //emitter.position.value.copy(this.position);

          if(emitter.node._emitter.canInheritLocal){
            //emitter.position.value.add(emitter.positionOffset);
          }

          //emitter.position.value.sub(emitter.position.spread);
          //emitter.position.value.sub(emitter.positionOffset);

          //emitter.updateFlags['position'] = true;

        }

        emitter.group.geometry.computeBoundingSphere();
        if(!emitter.group.geometry.boundingSphere.radius){
          if(this.modelHeader.Classification == 1){
            emitter.group.geometry.boundingSphere.radius = this.modelHeader.Radius;
          }else{
            emitter.group.geometry.boundingSphere.radius = 1;
          }
        }

        //if(this.modelHeader.Classification = 1){
          emitter.group.tick(delta);
        //}  
        
      }

      
      /*for(let i = 0; i < this.emitters.length; i++){
        this.emitters[i].tick(delta);
      }*/
  
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
                  if(node.emitter){
                    node.rotation.z = 0;
                  }
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
        let emitter = this.emitters_detonate[index];
        if(emitter){
          if(emitter.node._emitter.Update == 'Explosion'){
            emitter.age = 0;
            emitter.reset(true);
            emitter.alive = true;
            //emitter._activateParticles( 0, emitter.particleCount, emitter.paramsArray, 0 );
            emitter.updateFlags.params = true;
            emitter.enable();
            emitter.particlesPerSecond = emitter.particleCount*2;
            setTimeout( () => {
              emitter.alive = false;
            }, 700);
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
              if(modelNode.emitter){
                modelNode.rotation.z = 0;
              }
            break;
            case ControllerType.SelfIllumColor:
              if(modelNode.mesh){
                if(modelNode.mesh.material instanceof THREE.ShaderMaterial){
                  modelNode.mesh.material.uniforms.diffuse.value.setRGB(
                    data.r, 
                    data.g, 
                    data.b
                  );
                }else{
                  modelNode.mesh.material.color.setRGB(
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
  
      if(typeof modelNode != 'undefined'){
        if(modelNode.lipping && this.moduleObject && this.moduleObject.lipObject)
          return;

        anim._position.x = anim._position.y = anim._position.z = 0;
        anim._quaternion.x = anim._quaternion.y = anim._quaternion.z = 0;
        anim._quaternion.w = 1;
        
        node.controllers.forEach( (controller) => {

          let shouldBlend = false;

          if(anim.data.animation){
            shouldBlend = parseInt(anim.data.animation.looping) || parseInt(anim.data.animation.running) || parseInt(anim.data.animation.walking);
          }
            
          if( (controller.data.length == 1 || anim.data.elapsed == 0) && !shouldBlend ){
            let data = controller.data[0];
            switch(controller.type){
              case ControllerType.Position:
                if(typeof modelNode.controllers.get(ControllerType.Position) != 'undefined'){
          
                  anim._position.copy(modelNode.controllers.get(ControllerType.Position).data[0]);
        
                  if(anim.name.indexOf('CUT') > -1 && modelNode.name == 'cutscenedummy'){
                    anim._position.sub(this.position);
                  }
        
                }
                if(anim.transition){
                  modelNode.position.lerp(anim._position.add(data), anim.data.delta);
                }else{
                  modelNode.position.copy(anim._position.add(data));
                }
              break;
              case ControllerType.Orientation:
                if(typeof modelNode.controllers.get(ControllerType.Orientation) != 'undefined'){
                  anim._quaternion.copy(modelNode.controllers.get(ControllerType.Orientation).data[0]);
                }
                if(data.x == 0 && data.y == 0 && data.z == 0 && data.w == 1){
                  data.x = anim._quaternion.x;
                  data.y = anim._quaternion.y;
                  data.z = anim._quaternion.z;
                  data.w = anim._quaternion.w;
                }

                if(anim.transition){
                  modelNode.quaternion.slerp(this._quat.set(data.x, data.y, data.z, data.w), anim.data.delta);
                }else{
                  modelNode.quaternion.copy(data);
                }

                if(modelNode.emitter){
                  modelNode.rotation.z = 0;
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
                  modelNode.emitter.maxAge.value = Math.ceil(data.value);
                  modelNode.emitter.updateFlags['params'] = true;
                break;
                case ControllerType.BirthRate:
                  modelNode.emitter.particlesPerSecond = Math.ceil(data.value);
                  modelNode.emitter.particleCount = Math.ceil(data.value * modelNode.emitter.maxAge.value);
                break;
                case ControllerType.ColorStart:
                  modelNode.emitter.color.value[0].copy(data);
                  modelNode.emitter.updateFlags['color'] = true;
                break;
                case ControllerType.ColorMid:
                  modelNode.emitter.color.value[1].copy(data);
                  modelNode.emitter.updateFlags['color'] = true;
                break;
                case ControllerType.ColorEnd:
                  modelNode.emitter.color.value[2].copy(data);
                  modelNode.emitter.color.value[3].copy(data);
                  modelNode.emitter.updateFlags['color'] = true;
                break;
                case ControllerType.AlphaStart:
                  modelNode.emitter.opacity.value[0] = data.value;
                  modelNode.emitter.updateFlags['opacity'] = true;
                break;
                case ControllerType.AlphaMid:
                  modelNode.emitter.opacity.value[1] = data.value;
                  modelNode.emitter.updateFlags['opacity'] = true;
                break;
                case ControllerType.AlphaEnd:
                  modelNode.emitter.opacity.value[2] = data.value;
                  modelNode.emitter.opacity.value[3] = data.value;
                  modelNode.emitter.updateFlags['opacity'] = true;
                break;
              }
            }else{
              switch(controller.type){
                case ControllerType.SelfIllumColor:
                  if(modelNode.mesh){
                    if(modelNode.mesh.material instanceof THREE.ShaderMaterial){
                      modelNode.mesh.material.uniforms.diffuse.value.setRGB(
                        data.r, 
                        data.g, 
                        data.b
                      );
                    }else{
                      modelNode.mesh.material.color.setRGB(
                        data.r, 
                        data.g, 
                        data.b
                      );
                    }
                  }
                break;
                case ControllerType.Alpha:
                  if(modelNode.mesh){
                    modelNode.mesh.material.opacity = data.value;
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
              if (lastFrame + 1 >= controller.data.length || last.time >= anim.data.elapsed) {
                next = last;
                last = controller.data[0];
              }
              let fl = Math.abs((anim.data.elapsed - last.time) / (next.time - last.time));
              if(fl == Infinity)
                fl = anim.data.delta;

              switch(controller.type){
                case ControllerType.Position:
                  if(typeof modelNode.controllers.get(ControllerType.Position) != 'undefined'){
                    anim._position.copy(modelNode.controllers.get(ControllerType.Position).data[0]);
                    if(anim.name.indexOf('CUT') > -1 && modelNode.name == 'cutscenedummy'){
                      anim._position.sub(this.position);
                    }
                  }

                  if(last.isBezier){
                    this._vec3.copy(last.bezier.getPoint(fl).add(anim._position));
                    //modelNode.position.copy(this._vec3);
                    modelNode.position.lerp(this._vec3, fl);
                  }else{
                    this._vec3.copy(next);
                    this._vec3.add(anim._position);
                    if(anim.data.elapsed > anim.transition){
                      modelNode.position.copy(last);
                      modelNode.position.add(anim._position);
                    }
                    this._vec3;
                    modelNode.position.lerp(this._vec3, fl);
                  }

                break;
                case ControllerType.Orientation:
                  if(modelNode.emitter){

                    if(anim.data.elapsed > anim.transition){
                      this._quat.copy(last);
                    }
                    this._quat.slerp(next, fl);

                    //modelNode.emitter.velocity.value.copy(modelNode.emitterOptions.velocity.value.copy().applyQuaternion(this._quat));
                    //modelNode.emitter.velocity.spread.copy(modelNode.emitterOptions.velocity.spread.copy().applyQuaternion(this._quat));
                    //modelNode.emitter.updateFlags['velocity'] = true;

                    modelNode.rotation.z = 0;

                  }else{
                    this._quat.copy(next);
                    if(anim.data.elapsed > anim.transition){
                      modelNode.quaternion.copy(last);
                    }
                    modelNode.quaternion.slerp(this._quat, fl);
                  }
                  
                break;
                case ControllerType.Scale:
                  modelNode.scale.lerp(this._vec3.setScalar( ( (next.value) * this.Scale) ) || 0.000000001, fl);
                break;
              }

              if(modelNode.emitter){
                switch(controller.type){
                  case ControllerType.LifeExp:
                    if(modelNode.emitter){
                      modelNode.emitter.maxAge.value = Math.ceil(last.value + fl * (next.value - last.value));
                      modelNode.emitter.updateFlags['params'] = true;
                    }
                  break;
                  case ControllerType.BirthRate:
                    if(modelNode.emitter){
                      modelNode.emitter.particlesPerSecond = Math.ceil((last.value + fl * (next.value - last.value)));
                      modelNode.emitter.particleCount = modelNode.emitter.particlesPerSecond * modelNode.emitter.maxAge.value;
                    }
                  break;
                  case ControllerType.ColorStart:
                    modelNode.emitter.color.value[0].setRGB(
                      last.r + fl * (next.r - last.r),
                      last.g + fl * (next.g - last.g),
                      last.b + fl * (next.b - last.b)
                    );
                    modelNode.emitter.updateFlags['color'] = true;
                  break;
                  case ControllerType.ColorMid:
                    modelNode.emitter.color.value[1].setRGB(
                      last.r + fl * (next.r - last.r),
                      last.g + fl * (next.g - last.g),
                      last.b + fl * (next.b - last.b)
                    );
                    modelNode.emitter.updateFlags['color'] = true;
                  break;
                  case ControllerType.ColorEnd:
                    modelNode.emitter.color.value[2].setRGB(
                      last.r + fl * (next.r - last.r),
                      last.g + fl * (next.g - last.g),
                      last.b + fl * (next.b - last.b)
                    );
                    modelNode.emitter.color.value[3].setRGB(
                      last.r + fl * (next.r - last.r),
                      last.g + fl * (next.g - last.g),
                      last.b + fl * (next.b - last.b)
                    );
                    modelNode.emitter.updateFlags['color'] = true;
                  break;
                  case ControllerType.AlphaStart:
                    modelNode.emitter.opacity.value[0] = last.value + fl * (next.value - last.value);
                    modelNode.emitter.updateFlags['opacity'] = true;
                  break;
                  case ControllerType.AlphaMid:
                    modelNode.emitter.opacity.value[1] = last.value + fl * (next.value - last.value);
                    modelNode.emitter.updateFlags['opacity'] = true;
                  break;
                  case ControllerType.AlphaEnd:
                    modelNode.emitter.opacity.value[2] = last.value + fl * (next.value - last.value);
                    modelNode.emitter.opacity.value[3] = last.value + fl * (next.value - last.value);
                    modelNode.emitter.updateFlags['opacity'] = true;
                  break;
                }
              }else{
                switch(controller.type){
                  case ControllerType.Alpha:
                    if(modelNode.mesh){
                      modelNode.mesh.material.opacity = last.value + fl * (next.value - last.value);
                      modelNode.mesh.material.transparent = true;
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
                        modelNode.mesh.material.uniforms.diffuse.value.setRGB(
                          lerpIllumColorR, 
                          lerpIllumColorG, 
                          lerpIllumColorB
                        );
                      }else{
                        modelNode.mesh.material.color.setRGB(
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
                      let lerpR = last.r + fl * (next.r - last.r);
                      let lerpG = last.g + fl * (next.g - last.g);
                      let lerpB = last.b + fl * (next.b - last.b);
                      modelNode._node.light.color.setRGB(
                        lerpR, 
                        lerpG, 
                        lerpB
                      );
                    }
                  break;
                  case ControllerType.Multiplier:
                    if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                      modelNode._node.multiplier = last.value + fl * (next.value - last.value);
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
  
        });

        //modelNode.updateMatrixWorld(true);

        //if(modelNode.mesh){
          //modelNode.mesh.geometry.computeBoundingSphere();
        //}

      }

    }

    this.buildEmitter = function(node){
      //return;
      let controllerOptions = {
        size: new THREE.Vector3(),
        frameEnd: 0
      };
  
      node.controllerOptions = controllerOptions;
  
      let emitterOptions = {
        maxAge: {
          value: 1
        },
        position: {
          value: new THREE.Vector3(0, 0, 0),
          spread: new THREE.Vector3(0, 0, 0)
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
        opacity : {
          value: [1, 1, 1],
          spread: [0, 0, 0]
        },
        angle : {
          value: [0, 0, 0, 0],
          spread: [0, 0, 0, 0]
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
  
        particleCount: 1000
      };
  
      let positionOffset = new THREE.Vector3();
  
      //Read the emitter controllers
      node.controllers.forEach( (controller) => {
      //for(let cIDX in node.controllers){
        //let controller = node.controllers[cIDX];
        switch(controller.type){
          case ControllerType.Position:
            positionOffset.copy(controller.data[0]);
          break;
          case ControllerType.Orientation:
            //controllerOptions.orientation = new THREE.Quaternion(controller.data[0].x, controller.data[0].y, controller.data[0].z, controller.data[0].w);
          break;
          case ControllerType.ColorStart:
            controllerOptions.colorStart = new THREE.Color(controller.data[0].r, controller.data[0].g, controller.data[0].b);
          break;
          case ControllerType.ColorMid:
            controllerOptions.colorMid = new THREE.Color(controller.data[0].r, controller.data[0].g, controller.data[0].b);
          break;
          case ControllerType.ColorEnd:
            controllerOptions.colorEnd = new THREE.Color(controller.data[0].r, controller.data[0].g, controller.data[0].b);
          break;
          case ControllerType.XSize:
            controllerOptions.xSize = controller.data[0].value;
            controllerOptions.size.x = controllerOptions.xSize < 1 ? controllerOptions.xSize : (controllerOptions.xSize*.01);
          break;
          case ControllerType.YSize:
            controllerOptions.ySize = controller.data[0].value;
            controllerOptions.size.z = controllerOptions.ySize < 1 ? controllerOptions.ySize : (controllerOptions.ySize*.01);
          break;
          case ControllerType.Spread:
            controllerOptions.spread = controller.data[0].value;
          break;
          case ControllerType.LifeExp:
            controllerOptions.lifeExp = controller.data[0].value;
          break;
          case ControllerType.BirthRate:
            controllerOptions.birthRate = controller.data[0].value;
          break;
          case ControllerType.Drag:
            controllerOptions.drag = controller.data[0].value;
          break;
          case ControllerType.Threshold:
            controllerOptions.threshold = controller.data[0].value;
          break;
          case ControllerType.Grav:
            controllerOptions.gravity = controller.data[0].value;
          break;
          case ControllerType.Mass:
            controllerOptions.mass = controller.data[0].value;
          break;
          case ControllerType.Velocity:
            controllerOptions.velocity = controller.data[0].value;
          break;
          case ControllerType.RandVel:
            controllerOptions.randVelocity = controller.data[0].value;
          break;
          case ControllerType.SizeStart:
            emitterOptions.size.value[0] = controller.data[0].value * 2.0;
          break;
          case ControllerType.SizeMid:
            emitterOptions.size.value.push(controller.data[0].value * 2.0);
          break;
          case ControllerType.SizeEnd:
            emitterOptions.size.value.push(controller.data[0].value * 2.0);
          break;
          case ControllerType.AlphaStart:
            emitterOptions.opacity.value[0] = controller.data[0].value;
          break;
          case ControllerType.AlphaMid:
            emitterOptions.opacity.value[1] = controller.data[0].value;
            //emitterOptions.opacity.value[2] = controller.data[0].value;
          break;
          case ControllerType.AlphaEnd:
            emitterOptions.opacity.value[2] = controller.data[0].value;
          break;
          case ControllerType.ParticleRot:
            emitterOptions.angle.value = controller.data[0].value * 100;
          break;
          case ControllerType.FrameEnd:
            controllerOptions.frameEnd = controller.data[0].value;
          break;
        }
      });
  
      if(typeof controllerOptions.colorStart != 'undefined'){
        emitterOptions.color.value[0] = controllerOptions.colorStart;
      }
  
      if(typeof controllerOptions.colorMid != 'undefined'){
        emitterOptions.color.value[1] = (controllerOptions.colorMid);
        //emitterOptions.color.value[2] = (controllerOptions.colorMid);
      }
  
      if(typeof controllerOptions.colorEnd != 'undefined'){
        emitterOptions.color.value[2] = (controllerOptions.colorEnd);
      }

      let position = new THREE.Vector3();

      let speed_min = 0;
      let speed_max = 0;

      let xangle = 0;
      let zangle = 0;
      let vx = 0;
      let vy = 0;
      let vz = 0;

      let d = 0;
      let d2 = 0;

      if(node._emitter.Render = 'Billboard_to_World_Z'){
        controllerOptions.size.y = controllerOptions.size.x;
        controllerOptions.size.x = controllerOptions.size.z;
        controllerOptions.size.z = 0;
      }
  
      switch(node._emitter.Update){
        case 'Fountain':
          //emitterOptions.particleCount = Math.ceil(controllerOptions.birthRate * controllerOptions.lifeExp);

          //if(Math.ceil(controllerOptions.birthRate * controllerOptions.lifeExp) > 500){
          //  emitterOptions.particleCount = Math.ceil(controllerOptions.birthRate * controllerOptions.lifeExp);
          //}

          //if(emitterOptions.particleCount < 1)
          //  emitterOptions.particleCount = 1;

          //emitterOptions.maxParticleCount = emitterOptions.particleCount;
          emitterOptions.maxAge.value = controllerOptions.lifeExp;

          emitterOptions.position.spread.copy(controllerOptions.size);

          if(controllerOptions.drag)
            emitterOptions.drag.value = controllerOptions.drag;

          //if(controllerOptions.velocity){
            speed_min = controllerOptions.velocity;
            speed_max = controllerOptions.randVelocity;

            xangle = controllerOptions.spread;
            zangle = controllerOptions.spread;
            vx = Math.sin(xangle);
            vy = Math.sin(zangle);
            vz = Math.cos(xangle) + Math.cos(zangle);

            d = speed_min / (Math.abs(vx) + Math.abs(vy) + Math.abs(vz));
            d2 = speed_max / (Math.abs(vx) + Math.abs(vy) + Math.abs(vz));

            
            if(controllerOptions.velocity){
              emitterOptions.velocity.value.set((d * vx), (d * vy), (d * vz));
              emitterOptions.velocity.spread.set((d2 * vx), (d2 * vy), (d2 * vz));
            }

            //emitterOptions.velocity.value.applyQuaternion(node.quaternion);
            //emitterOptions.velocity.spread.applyQuaternion(node.quaternion);
          //}

          emitterOptions.acceleration.value = new THREE.Vector3(0, -controllerOptions.mass*2, 0);
  
        break;
        case 'Explosion':

          emitterOptions.particleCount = controllerOptions.birthRate || 1000;
          
          emitterOptions.maxAge.value = controllerOptions.lifeExp;

          emitterOptions.position.spread.copy(controllerOptions.size);

          if(controllerOptions.drag)
            emitterOptions.drag.value = controllerOptions.drag;
          else
            emitterOptions.drag.value = 5;

          if(controllerOptions.velocity){
            speed_min = controllerOptions.velocity;
            speed_max = controllerOptions.randVelocity;

            xangle = controllerOptions.spread;
            zangle = controllerOptions.spread;
            vx = Math.sin(xangle);
            vy = Math.sin(zangle);
            vz = Math.cos(xangle) + Math.cos(zangle);

            d = speed_min / (Math.abs(vx) + Math.abs(vy) + Math.abs(vz));
            d2 = speed_max / (Math.abs(vx) + Math.abs(vy) + Math.abs(vz));

            emitterOptions.velocity.value.set((d * vx), (d * vy), (d * vz));
            emitterOptions.velocity.spread.set(controllerOptions.spread, controllerOptions.spread, 0);

            emitterOptions.velocity.value.applyQuaternion(node.quaternion);
            emitterOptions.velocity.spread.applyQuaternion(node.quaternion);
          }

          emitterOptions.acceleration.value = new THREE.Vector3(0, 0, -.5);

          //emitterOptions.maxAge.value = controllerOptions.frameEnd || 1;

          //console.log(node, controllerOptions);
  
        break;
        case 'Single':
          emitterOptions.particleCount = 1;
          emitterOptions.maxParticleCount = 1;
          emitterOptions.maxAge.value = Infinity;

          emitterOptions.position.value.copy(position);
          emitterOptions.position.spread.copy(controllerOptions.size);

          if(controllerOptions.velocity){
            speed_min = controllerOptions.velocity;
            speed_max = controllerOptions.randVelocity;

            xangle = controllerOptions.spread;
            zangle = controllerOptions.spread;
            vx = Math.sin(xangle);
            vy = Math.sin(zangle);
            vz = Math.cos(xangle) + Math.cos(zangle);

            d = speed_min / (Math.abs(vx) + Math.abs(vy) + Math.abs(vz));
            d2 = speed_max / (Math.abs(vx) + Math.abs(vy) + Math.abs(vz));

            emitterOptions.velocity.value.set((d * vx), (d * vy), (d * vz));
            emitterOptions.velocity.spread.set((d2 * vx), (d2 * vy), (d2 * vz));

            //emitterOptions.velocity.value.applyQuaternion(node.quaternion);
            //emitterOptions.velocity.spread.applyQuaternion(node.quaternion);
          }

          if(controllerOptions.drag)
            emitterOptions.drag.value = controllerOptions.drag;

          emitterOptions.acceleration.value = new THREE.Vector3(0, -controllerOptions.mass, 0);
  
        break;
      }

      node.emitterOptions = emitterOptions;
      //console.log(node, node.emitterOptions)
      node.emitter = new SPE.Emitter(emitterOptions);
      node.emitter.node = node;
      node.emitter.header = node._emitter;
      node.emitter.positionOffset = positionOffset;
      node.particleGroup.addEmitter( node.emitter );
      node.particleGroup.mesh.visible = true;
      node.particleGroup.material.transparent = true;

      //These emitters need to be turned on when a 'Detonate' event is fired during an animation
      if(node._emitter.Update == 'Explosion'){
        node.emitter.alive = false;
        node.emitter.particlesPerSecond = 0;
      }else if(node._emitter.Update == 'Single'){
        node.emitter.particlesPerSecond = 2;
      }else{
        node.emitter.particlesPerSecond = controllerOptions.birthRate;
      }

      switch(node._emitter.Blend){
        case 'Normal':
          node.particleGroup.material.blending = THREE.NormalBlending;
        break;
        case 'Lighten':
          node.particleGroup.material.blending = THREE.AdditiveBlending;
        break;
      }
      this.options.context._emitters[node.name] = node;

      /*if(this.modelHeader.Classification == 1){
        this.options.context.group.emitters.remove(node.particleGroup.mesh);
        this.options.context.group.emitters.add(node.particleGroup.mesh);
      }else{
        this.options.context.group.emitters.remove(node.particleGroup.mesh);
        this.options.context.group.emitters.add(node.particleGroup.mesh);
      }*/

      

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
  
    node.name = _node.name.toLowerCase();

    if(node.name == auroraModel.name.toLowerCase()+'a'){
      options.isChildrenDynamic = true;
    }

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
        if(_node.faces.length){

          let geometry = new THREE.Geometry();
    
          geometry.boundingBox = _node.boundingBox;
    
          geometry.vertices = _node.vertices || [];
          geometry.faces = _node.faces || [];
          geometry.faceUvs = [[],[]];
          geometry.faceVertexUvs = [[],[]];
          
          if(_node.tvectors)
            geometry.faceUvs[0] = _node.tvectors[0];
          
          if(_node.texCords)
            geometry.faceVertexUvs[0] = _node.texCords[0];

          
          if(_node.tvectors)
            geometry.faceUvs[1] = _node.tvectors[0];

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
    
          if(options.textureVar != '' && options.textureVar.indexOf('****') == -1){
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
          material.uniforms.diffuse.value = new THREE.Color( _node.Diffuse.r, _node.Diffuse.g, _node.Diffuse.b );
          material.uniforms.time.value = Game.time;
          material.defines = material.defines || {};
          material.defines.AURORA = "";

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
          }

          if(!(_node.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT1) && 
            !(_node.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT2) && 
            !(_node.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT3) && 
            !(_node.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT4) &&
            !_node.FlagShadow && !options.castShadow){
              //console.log('IGNORE_LIGHTING', material);
              material.defines.IGNORE_LIGHTING = "";
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
                material.opacity = controller.data[0].value;
                if(material.opacity < 1){
                  material.transparent = true;
                  //modelNode.mesh.material.depthFunc = 4;
                }else{
                  material.transparent = false;
                  // modelNode.mesh.material.depthFunc = THREE.LessEqualDepth;
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
            });
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

          //mesh.visible = !node.isWalkmesh;
          mesh._node = _node;
          mesh.matrixAutoUpdate = false;
          mesh.castShadow = options.castShadow;
          mesh.receiveShadow = options.receiveShadow;

          if(!node.isWalkmesh && options.mergeStatic && _node.roomStatic && mesh.geometry.faces.length){
            mesh.position.copy(node.getWorldPosition(new THREE.Vector3));
            mesh.quaternion.copy(node.getWorldQuaternion(new THREE.Quaternion));
            mesh.updateMatrix(); // as needed
            //mesh.updateMatrixWorld(); // as needed

            auroraModel.mergedMaterials.push(material);

            THREE.AuroraModel.MergeGeometry(auroraModel.mergedGeometry, mesh.geometry, mesh.matrix, auroraModel.mergedMaterials.length-1)
            //auroraModel.mergedGeometry.merge(mesh.geometry, mesh.matrix);
            mesh.geometry.dispose();
            //options.parent.remove(node);
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
      
      let particleGroup = new SPE.Group({
        texture: {
          frames: new THREE.Vector2(_node.emitter.GridX, _node.emitter.GridY),
          frameCount: _node.emitter.GridX * _node.emitter.GridY
        },
        blending: THREE.NormalBlending,
        alphaTest: 0,
        transparent: true,
        depthWrite: true,
        depthTest: true,
        fog: false
      });
      TextureLoader.enQueueParticle(_node.emitter.Texture, particleGroup);

      node.add(particleGroup.mesh);

      node.particleGroup = particleGroup;
      node._emitter = _node.emitter;

      auroraModel.buildEmitter(node);
      auroraModel.emitters.push(node.emitter);

      if(_node.emitter.Update == 'Explosion'){
        auroraModel.emitters_detonate.push(node.emitter);
      }
  
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

  //https://stackoverflow.com/a/47424292/4958457

  //Fix the phong material to ignore light shading if a lightmap is present so that we can have shadows on level geometry
  THREE.ShaderLib[ 'phong' ].fragmentShader = THREE.ShaderLib[ 'phong' ].fragmentShader.replace(

    `vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;`,

    `
    #ifndef AURORA
      vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
    #else
      #ifdef USE_LIGHTMAP
        reflectedLight.indirectDiffuse = vec3(0.0, 0.0, 0.0);
        reflectedLight.indirectDiffuse += PI * texture2D( lightMap, vUv2 ).xyz * lightMapIntensity;
        reflectedLight.indirectDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb );
        vec3 outgoingLight = (reflectedLight.indirectDiffuse); // shadow intensity hardwired to 0.5 here
      #else
        //reflectedLight.indirectDiffuse = vec3(diffuseColor.rgb);
        vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
      #endif
    #endif
    
    #ifdef IGNORE_LIGHTING
      outgoingLight = vec3(diffuseColor.rgb);
    #endif`

  );

  //Fixing the envmap shader to to mix acording to the Alpha Channel of the base texture
  THREE.ShaderChunk['envmap_fragment'] = `
  #ifdef USE_ENVMAP
    #if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG )
      vec3 cameraToVertex = normalize( vWorldPosition - cameraPosition );
      vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
      #ifdef ENVMAP_MODE_REFLECTION
        vec3 reflectVec = reflect( cameraToVertex, worldNormal );
      #else
        vec3 reflectVec = refract( cameraToVertex, worldNormal, refractionRatio );
      #endif
    #else
      vec3 reflectVec = vReflect;
    #endif
    #ifdef ENVMAP_TYPE_CUBE
      vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
    #elif defined( ENVMAP_TYPE_EQUIREC )
      vec2 sampleUV;
      reflectVec = normalize( reflectVec );
      sampleUV.y = asin( clamp( reflectVec.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
      sampleUV.x = atan( reflectVec.z, reflectVec.x ) * RECIPROCAL_PI2 + 0.5;
      vec4 envColor = texture2D( envMap, sampleUV );
    #elif defined( ENVMAP_TYPE_SPHERE )
      reflectVec = normalize( reflectVec );
      vec3 reflectView = normalize( ( viewMatrix * vec4( reflectVec, 0.0 ) ).xyz + vec3( 0.0, 0.0, 1.0 ) );
      vec4 envColor = texture2D( envMap, reflectView.xy * 0.5 + 0.5 );
    #else
      vec4 envColor = vec4( 0.0 );
    #endif
    envColor = envMapTexelToLinear( envColor );
    #ifdef ENVMAP_BLENDING_MULTIPLY
      outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, (specularStrength * reflectivity) * (1.0 - diffuseColor.a) );
    #elif defined( ENVMAP_BLENDING_MIX )
      outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity * (1.0 - diffuseColor.a) );
    #elif defined( ENVMAP_BLENDING_ADD )
      outgoingLight += (envColor.xyz * specularStrength * reflectivity) * (1.0 - diffuseColor.a);
    #endif
  #endif
  `;

  THREE.ShaderLib.aurora = {
    fragmentShader: `
    #define PHONG
    uniform vec3 diffuse;
    uniform vec3 emissive;
    uniform vec3 specular;
    uniform float shininess;
    uniform float opacity;
    #ifdef WATER
      varying vec2 vUvWater;
      uniform float waterAlpha;
    #endif
    #include <common>
    #include <packing>
    #include <dithering_pars_fragment>
    #include <color_pars_fragment>
    #include <uv_pars_fragment>
    #include <uv2_pars_fragment>
    #include <map_pars_fragment>
    #include <alphamap_pars_fragment>
    #include <aomap_pars_fragment>
    #include <lightmap_pars_fragment>
    #include <emissivemap_pars_fragment>
    #include <envmap_pars_fragment>
    #include <gradientmap_pars_fragment>
    #include <fog_pars_fragment>
    #include <bsdfs>
    #include <lights_pars_begin>
    #include <lights_phong_pars_fragment>
    #include <shadowmap_pars_fragment>
    #ifdef WATER
      #ifdef USE_BUMPMAP
        uniform sampler2D bumpMap;
        uniform float bumpScale;
        vec2 dHdxy_fwd() {
          vec2 dSTdx = dFdx( vUvWater );
          vec2 dSTdy = dFdy( vUvWater );
          float Hll = bumpScale * texture2D( bumpMap, vUvWater ).x;
          float dBx = bumpScale * texture2D( bumpMap, vUvWater + dSTdx ).x - Hll;
          float dBy = bumpScale * texture2D( bumpMap, vUvWater + dSTdy ).x - Hll;
          return vec2( dBx, dBy );
        }
        vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy ) {
          vec3 vSigmaX = vec3( dFdx( surf_pos.x ), dFdx( surf_pos.y ), dFdx( surf_pos.z ) );
          vec3 vSigmaY = vec3( dFdy( surf_pos.x ), dFdy( surf_pos.y ), dFdy( surf_pos.z ) );
          vec3 vN = surf_norm;
          vec3 R1 = cross( vSigmaY, vN );
          vec3 R2 = cross( vN, vSigmaX );
          float fDet = dot( vSigmaX, R1 );
          fDet *= ( float( gl_FrontFacing ) * 2.0 - 1.0 );
          vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
          return normalize( abs( fDet ) * surf_norm - vGrad );
        }
      #endif
    #else
      #include <bumpmap_pars_fragment>
    #endif
    #include <normalmap_pars_fragment>
    #include <specularmap_pars_fragment>
    #include <logdepthbuf_pars_fragment>
    #include <clipping_planes_pars_fragment>
    void main() {
      #include <clipping_planes_fragment>
      vec4 diffuseColor = vec4( diffuse, opacity );
      ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
      vec3 totalEmissiveRadiance = emissive;
      #include <logdepthbuf_fragment>
      #include <map_fragment>
      #include <color_fragment>
      #include <alphamap_fragment>
      #include <alphatest_fragment>
      #include <specularmap_fragment>
      #include <normal_fragment_begin>
      #include <normal_fragment_maps>
      #include <emissivemap_fragment>
      // accumulation
      #include <lights_phong_fragment>
      #include <lights_fragment_begin>
      #include <lights_fragment_maps>
      #include <lights_fragment_end>
      // modulation
      #include <aomap_fragment>
      #ifndef AURORA
        vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
      #else
        #ifdef USE_LIGHTMAP
          reflectedLight.indirectDiffuse = vec3(0.0, 0.0, 0.0);
          reflectedLight.indirectDiffuse += PI * texture2D( lightMap, vUv2 ).xyz * lightMapIntensity;
          reflectedLight.indirectDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb );
          vec3 outgoingLight = (reflectedLight.indirectDiffuse); // shadow intensity hardwired to 0.5 here
        #else
          //reflectedLight.indirectDiffuse = vec3(diffuseColor.rgb);
          vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
        #endif
      #endif
      
      #ifdef IGNORE_LIGHTING
        outgoingLight = vec3(diffuseColor.rgb);
      #endif
      #ifdef USE_ENVMAP
        #if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG )
          vec3 cameraToVertex = normalize( vWorldPosition - cameraPosition );
          vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
          #ifdef ENVMAP_MODE_REFLECTION
            vec3 reflectVec = reflect( cameraToVertex, worldNormal );
          #else
            vec3 reflectVec = refract( cameraToVertex, worldNormal, refractionRatio );
          #endif
        #else
          vec3 reflectVec = vReflect;
        #endif
        #ifdef ENVMAP_TYPE_CUBE
          vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
        #elif defined( ENVMAP_TYPE_EQUIREC )
          vec2 sampleUV;
          reflectVec = normalize( reflectVec );
          sampleUV.y = asin( clamp( reflectVec.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
          sampleUV.x = atan( reflectVec.z, reflectVec.x ) * RECIPROCAL_PI2 + 0.5;
          vec4 envColor = texture2D( envMap, sampleUV );
        #elif defined( ENVMAP_TYPE_SPHERE )
          reflectVec = normalize( reflectVec );
          vec3 reflectView = normalize( ( viewMatrix * vec4( reflectVec, 0.0 ) ).xyz + vec3( 0.0, 0.0, 1.0 ) );
          vec4 envColor = texture2D( envMap, reflectView.xy * 0.5 + 0.5 );
        #else
          vec4 envColor = vec4( 0.0 );
        #endif
        envColor = envMapTexelToLinear( envColor );
        #ifdef ENVMAP_BLENDING_MULTIPLY
          outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, (specularStrength * reflectivity) * (1.0 - diffuseColor.a) );
        #elif defined( ENVMAP_BLENDING_MIX )
          outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity * (1.0 - diffuseColor.a) );
        #elif defined( ENVMAP_BLENDING_ADD )
          outgoingLight += (envColor.xyz * specularStrength * reflectivity) * (1.0 - diffuseColor.a);
        #endif
      #endif
      gl_FragColor = vec4( outgoingLight, diffuseColor.a );
      #include <tonemapping_fragment>
      #include <encodings_fragment>
      #include <fog_fragment>
      #if defined( PREMULTIPLIED_ALPHA ) || defined( WATER )
        gl_FragColor.rgb *= waterAlpha;
        gl_FragColor.a = waterAlpha;
      #endif
      #include <dithering_fragment>
    }
    `,
    vertexShader: `
    #define PHONG
    varying vec3 vViewPosition;
    #ifndef FLAT_SHADED
      varying vec3 vNormal;
    #endif
    #include <common>
    #ifdef AURORA
      uniform float time;
    #endif

    #ifdef WATER
      uniform mat3 waterTransform;
      varying vec2 vUvWater;
    #endif

    #ifdef DANGLY
      attribute vec4 constraint;
      uniform float danglyDisplacement;
      uniform float danglyTightness;
      uniform float danglyPeriod;
    #endif
    #include <uv_pars_vertex>
    #include <uv2_pars_vertex>
    #include <displacementmap_pars_vertex>
    #include <envmap_pars_vertex>
    #include <color_pars_vertex>
    #include <fog_pars_vertex>
    #include <morphtarget_pars_vertex>
    #include <skinning_pars_vertex>
    #include <shadowmap_pars_vertex>
    #include <logdepthbuf_pars_vertex>
    #include <clipping_planes_pars_vertex>
    void main() {
      #ifdef WATER
        #if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP ) || defined( USE_ROUGHNESSMAP ) || defined( USE_METALNESSMAP )
          vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
        #endif
        vUvWater = ( waterTransform * vec3( uv, 1 ) ).xy;
      #else
        #include <uv_vertex>
      #endif
      #include <uv2_vertex>
      #include <color_vertex>
      #include <beginnormal_vertex>
      #include <morphnormal_vertex>
      #include <skinbase_vertex>
      #include <skinnormal_vertex>
      #include <defaultnormal_vertex>
    #ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED
      vNormal = normalize( transformedNormal );
    #endif
      #include <begin_vertex>
      #include <morphtarget_vertex>
      #include <skinning_vertex>
      #ifdef USE_DISPLACEMENTMAP
        transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vUvWater ).x * displacementScale + displacementBias );
      #endif
      #ifdef DANGLY
        float wind = (1.0 * danglyPeriod) * ( cos(time) );
        transformed += vec3(cos(wind) * constraint.x, sin(wind) * constraint.y, cos(wind) * constraint.z * danglyTightness) * (constraint.w / 255.0) * (danglyDisplacement * 0.1);
      #endif
      #include <project_vertex>
      #include <logdepthbuf_vertex>
      #include <clipping_planes_vertex>
      vViewPosition = - mvPosition.xyz;
      #include <worldpos_vertex>
      #include <envmap_vertex>
      #include <shadowmap_vertex>
      #include <fog_vertex>
    }
    `,
    uniforms: THREE.UniformsUtils.merge([
      THREE.ShaderLib.phong.uniforms,
      { diffuse: { value: new THREE.Color() } },
      { time: { value: 0.0 } },
      { animatedUV: { value: new THREE.Vector4() } },
      { waterAlpha: { value: 1 } },
      { waterTransform: { value: new THREE.Matrix3() } },
      { danglyDisplacement: { value: 0 } },
      { danglyTightness: { value: 0 } },
      { danglyPeriod: { value: 0 } }
    ])
  };
  

