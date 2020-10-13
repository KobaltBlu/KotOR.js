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
    if(APP_MODE == 'FORGE'){
      if(tabManager.currentTab instanceof ModuleEditorTab){
        if(!this.auroraModel.visible)
          return false;
        
        frustum = tabManager.currentTab.viewportFrustum;
        this.sphere.center.copy(this.worldPosition);
        this.sphere.radius = this.getRadius();
        return frustum.intersectsSphere(this.sphere);
      }
      return false;
    }else{
      if(!this.auroraModel.visible)
        return false;

      this.sphere.center.copy(this.worldPosition);
      this.sphere.radius = this.getRadius();
      return frustum.intersectsSphere(this.sphere);
    }
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
    this.sphere = new THREE.Sphere();
    this.context = undefined;
    this.meshes = [];
    this.danglyMeshes = [];
    this.animations = [];
    this.emitters = [];
    this.lights = [];
    this.aabb = {};
    this.materials = [];
    this.parentModel = undefined;

    this.effects = [];

    this.puppeteer = undefined; 
    this.oddFrame = false;
  
    this.names = [];
    this.supermodels = [];

    this.target = null;
    this.force = 0;
    this.controlled = false;

    this.skins = [];
    this.forceShieldGeometry = [];

    //Beta AnimationManager
    this.animationManager = new AuroraModelAnimationManager(this);

    this.animationManager.currentAnimation = undefined;
    this.animationManager.lastAnimation = undefined;
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
          //console.log('Light', node);
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
        this.animationManager.currentAnimation = undefined;
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

        this.disposeForceShieldGeometry();

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

      //BEGIN: Animation Optimization
      this.animateFrame = true;
      if(this.moduleObject instanceof ModuleCreature){
        //If the object is further than 50 meters, animate every other frame
        if(this.moduleObject.distanceToCamera > 50){
          this.animateFrame = this.oddFrame;
        }
        
        if(this.animateFrame){
          //If we can animate and there is fog, make sure the distance isn't greater than the far point of the fog effect
          if(PartyManager.party.indexOf(this.moduleObject) == -1 && Game.scene.fog){
            if(this.moduleObject.distanceToCamera >= Game.scene.fog.far){
              this.animateFrame = false;
              //If the object is past the near point, and the near point is greater than zero, animate every other frame
            }else if(Game.scene.fog.near && this.moduleObject.distanceToCamera >= Game.scene.fog.near){
              this.animateFrame = this.oddFrame;
            }
          }
        }

      }

      if(!(this.moduleObject instanceof ModuleRoom)){
        if(!this.visible){
          this.animateFrame = false;
        }
      }
      //END: Animation Optimization

      for(let i = 0, len = this.effects.length; i < len; i++){
        this.effects[i].update(delta);
      }

      if(this.puppeteer && this.puppeteer.type == 'AuroraModel'){
        this.puppeteer.update(delta);
        if(this.puppeteer.currentAnimation && this.puppeteer.currentAnimation.type == 'AuroraModelAnimation'){
          if(this.puppeteer.bonesInitialized){
            this.updateAnimation(this.puppeteer.currentAnimation, delta, () => {
              if(!this.puppeteer.currentAnimation.data.loop){
                this.stopAnimation();
              }
            });
          }
        }
      }else{
        //New Animation System
        this.animationManager.update(delta);
      }

      //Update the time uniform on materials in this array
      for(let i = 0; i < this.materials.length; i++){
        let material = this.materials[i];
        if(material.type == 'ShaderMaterial'){
          material.uniforms.time.value = Game.deltaTime;
        }
      }

      if(this.headhook && this.headhook.children){
        for(let i = 0; i < this.headhook.children.length; i++){
          let node = this.headhook.children[i];
          if(node.type == 'AuroraModel'){
            for(let j = 0; j < node.materials.length; j++){
              let material = node.materials[j];
              if(material.type == 'ShaderMaterial'){
                material.uniforms.time.value = Game.deltaTime;
              }
            }
          }
        }
      }
      
      //Update emitters
      for(let i = 0; i < this.emitters.length; i++){
        this.emitters[i].tick(delta);
      }

      this.oddFrame = !this.oddFrame;
  
    }

    this.setEmitterTarget = function(node = undefined){
      if(node instanceof THREE.Object3D){
        for(let i = 0; i < this.emitters.length; i++){
          if(this.emitters[i].referenceNode instanceof THREE.Object3D){
            // node.getWorldPosition(
            //   this.emitters[i].referenceNode.position
            // );
            this.emitters[i].referenceNode = node;
          }
        }
      }
    };

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

      this.animationManager.currentAnimation = anim;

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

      if(this.animationManager.currentAnimation){
        this.animationManager.lastAnimation = this.animationManager.currentAnimation;
      }
      
      if(typeof anim === 'number'){
        this.animationManager.currentAnimation = this.animations[anim];
      }else if(typeof anim === 'string'){
        this.animationManager.currentAnimation = this.getAnimationByName(anim);
      }else{
        this.animationManager.currentAnimation = anim;
      }

      if(typeof this.animationManager.currentAnimation != 'undefined'){
        this.animationManager.currentAnimation.data = data;
        if(!this.animationManager.lastAnimation){
          this.animationManager.lastAnimation = this.animationManager.currentAnimation;
        }

        for(let i = 0, len = Global.kotor2DA['animations'].rows.length; i < len; i++){
          if(Global.kotor2DA.animations.rows[i].name == this.animationManager.currentAnimation.name){
            this.animationManager.currentAnimation.data.animation = Global.kotor2DA.animations.rows[i];
            break;
          }
        }

      }

    }
  
    this.stopAnimation = function(){
      //this.pose();
      if(typeof this.animationManager.currentAnimation != 'undefined'){
        this.animationManager.currentAnimation.data = {
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
      this.animationManager.currentAnimation = undefined;
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
      if(typeof this.animationManager.currentAnimation !== 'undefined'){
        return this.animationManager.currentAnimation.name;
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
      this.oldAnim = this.animationManager.currentAnimation;
      this.animationManager.currentAnimation = undefined;
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
      this.animationManager.currentAnimation = this.oldAnim;
  
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
                case AuroraModel.ControllerType.Position:
                    node.position.set(controller.data[0].x, controller.data[0].y, controller.data[0].z);
                break;
                case AuroraModel.ControllerType.Orientation:
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

    this.playEvent = function(event, index){
      //console.log(event)
      if(event == 'detonate'){
        let idx = 0;
        for(let i = 0; i < this.emitters.length; i++){
          let emitter = this.emitters[i];
          if(emitter.type == 'AuroraEmitter'){
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
            case AuroraModel.ControllerType.Position:
              let offsetX = 0;
              let offsetY = 0;
              let offsetZ = 0;
              if(typeof modelNode.controllers.get(AuroraModel.ControllerType.Position) != 'undefined'){
                offsetX = modelNode.controllers.get(AuroraModel.ControllerType.Position).data[0].x;
                offsetY = modelNode.controllers.get(AuroraModel.ControllerType.Position).data[0].y;
                offsetZ = modelNode.controllers.get(AuroraModel.ControllerType.Position).data[0].z;
              }
              modelNode.position.set((data.x + offsetX) * this.Scale, (data.y + offsetY) * this.Scale, (data.z + offsetZ) * this.Scale);

            break;
            case AuroraModel.ControllerType.Orientation:
              let offsetQX = 0;
              let offsetQY = 0;
              let offsetQZ = 0;
              let offsetQW = 1;
              if(typeof modelNode.controllers.get(AuroraModel.ControllerType.Orientation) != 'undefined'){  
                offsetQX = modelNode.controllers.get(AuroraModel.ControllerType.Orientation).data[0].x;
                offsetQY = modelNode.controllers.get(AuroraModel.ControllerType.Orientation).data[0].y;
                offsetQZ = modelNode.controllers.get(AuroraModel.ControllerType.Orientation).data[0].z;
                offsetQW = modelNode.controllers.get(AuroraModel.ControllerType.Orientation).data[0].w;
              }
              if(data.x == 0 && data.y == 0 && data.z == 0 && data.w == 1){
                data.x = offsetQX;
                data.y = offsetQY;
                data.z = offsetQZ;
                data.w = offsetQW;
              }

              modelNode.quaternion.set(data.x, data.y, data.z, data.w);
            break;
            case AuroraModel.ControllerType.SelfIllumColor:
              if(modelNode.mesh){
                if(modelNode.mesh.material.type instanceof THREE.ShaderMaterial){
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
            case AuroraModel.ControllerType.Color:
              if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                modelNode._node.color.setRGB(
                  data.r, 
                  data.g, 
                  data.b
                );
              }
            break;
            case AuroraModel.ControllerType.Multiplier:
              if ((modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
                modelNode._node.multiplier = data.value;
              }
            break;
            case AuroraModel.ControllerType.Radius:
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

    this.disableMatrixUpdate = function(){
      this.traverse( (node) => {
        if(node instanceof THREE.Object3D){
          node.matrixAutoUpdate = false;
        }
      });
      this.matrixAutoUpdate = true;
    }

    this.enableMatrixUpdate = function(){
      this.traverse( (node) => {
        if(node instanceof THREE.Object3D){
          node.matrixAutoUpdate = true;
        }
      });
      this.matrixAutoUpdate = true;
    }

    this.generateForceShieldGeometry = function( shieldTexName = '' ){
      //Start by making sure there are not any lingering forceShieldGeometries
      this.disposeForceShieldGeometry();

      //Clone the skins 
      for(let i = 0, len = this.skins.length; i < len; i++){
        let originalSkinMesh = this.skins[i];
        let skinMesh = originalSkinMesh.clone();
        let skinMaterial = new THREE.ShaderMaterial({
          fragmentShader: THREE.ShaderLib.aurora.fragmentShader,
          vertexShader: THREE.ShaderLib.aurora.vertexShader,
          uniforms: THREE.UniformsUtils.merge([THREE.ShaderLib.aurora.uniforms]),
          side:THREE.FrontSide,
          lights: true,
          fog: true,
          skinning: true
        });
        skinMaterial.defines.FORCE_SHIELD = '';
        skinMaterial.defines.AURORA = '';
        skinMaterial.defines.USE_UV = '';
        skinMaterial.uniforms.diffuse.value.r = 0.5;

        // skinMaterial.opacity = 0.5;
        // skinMaterial.transparent = true;
        // skinMaterial.blending = 2;
        // skinMaterial.needsUpdate = true;

        if(typeof shieldTexName == 'string' && shieldTexName.length){
          TextureLoader.enQueue(shieldTexName, skinMaterial, TextureLoader.Type.TEXTURE);
        }

        //Reuse the same skeleton
        skinMesh.skeleton = originalSkinMesh.skeleton;
        //Apply the new material
        skinMesh.material = skinMaterial;

        originalSkinMesh.matrixAutoUpdate = true;
        skinMesh.matrixAutoUpdate = true;

        originalSkinMesh.parent.add(skinMesh);
        this.forceShieldGeometry.push(skinMesh);
      }

      //Load the Texture Queue
      TextureLoader.LoadQueue();
    };

    this.disposeForceShieldGeometry = function(){
      while(this.forceShieldGeometry.length){
        let object = this.forceShieldGeometry.splice(0, 1)[0];
        this.remove(object);

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
      }
    };
  
  
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
      static: false, //Static placeable
    }, options);

    let isAsync = typeof options.onComplete === 'function';
  
    if(model instanceof AuroraModel){
  
      let auroraModel = new THREE.AuroraModel();
      auroraModel.context = options.context;
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
        let bufferGeometry = new THREE.BufferGeometry();
        bufferGeometry.fromGeometry(auroraModel.mergedGeometry);
        auroraModel.mergedGeometry.dispose();
        auroraModel.mergedMesh = new THREE.Mesh(bufferGeometry, auroraModel.mergedMaterials);
        auroraModel.mergedMesh.receiveShadow = true;
        auroraModel.add(auroraModel.mergedMesh);
        auroraModel.mergedGeometry = undefined;

        //Prune all the empty nodes 
        let pruneList = [];
        auroraModel.traverseIgnore(auroraModel.name+'a', (node) => {
          if(node.NodeType == 33 && !node.children.length){
            pruneList.push(node);
          }
        });
        let pruneCount = pruneList.length;
        //console.log('pruneList', pruneList, pruneCount);
        while(pruneCount--){
          let node = pruneList.splice(0, 1)[0];
          node.parent.remove(node);
        }

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
        if(_node.faces.length || (_node.NodeType & AuroraModel.NODETYPE.Saber) ){

          if(true){// (!_node.FlagRender && _node.TextureMap1 != 'NULL') || _node.FlagRender ){

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

            if((_node.NodeType & AuroraModel.NODETYPE.AABB) == AuroraModel.NODETYPE.AABB){
              material = new THREE.MeshBasicMaterial({
                fog: false,
                lights: false,
                side:THREE.FrontSide,
              });
            }else{

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
              //material.extensions.fragDepth = true;
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

              if(options.isForceShield){
                material.defines.FORCE_SHIELD = "";
                material.defines.IGNORE_LIGHTING = "";
              }

              if(_node.MDXDataBitmap & AuroraModel.MDXFLAG.UV1 || 
                _node.MDXDataBitmap & AuroraModel.MDXFLAG.UV2 || 
                _node.MDXDataBitmap & AuroraModel.MDXFLAG.UV3 || 
                _node.MDXDataBitmap & AuroraModel.MDXFLAG.UV4 ||
                ((_node.NodeType & AuroraModel.NODETYPE.Saber) == AuroraModel.NODETYPE.Saber)
                ){
                material.defines.USE_UV = "";
              }

              if(node.controllers.has(AuroraModel.ControllerType.SelfIllumColor)){
                let selfIllumColor = node.controllers.get(AuroraModel.ControllerType.SelfIllumColor);
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
                !_node.FlagShadow && !options.castShadow) || _node.BackgroundGeometry || options.static){
                  //console.log('IGNORE_LIGHTING', material);
                  if(!options.lighting){
                    material.defines.IGNORE_LIGHTING = "";
                  }
              }

              if((_node.NodeType & AuroraModel.NODETYPE.Saber) == AuroraModel.NODETYPE.Saber){
                material.defines.IGNORE_LIGHTING = "";
                material.defines.SABER = "";
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
              }

              if(_node.Transparent){
                material.transparent = true;
              }

              _node.controllers.forEach( (controller) => {
              //for(let cIDX in _node.controllers){
                //let controller = _node.controllers[cIDX];
                switch(controller.type){
                  case AuroraModel.ControllerType.Alpha:

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
            }
      
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
              geometry.setAttribute( 'constraint', new THREE.BufferAttribute( constraints, 4 ).copyVector4sArray( newConstraints ) );

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

            //Need to see if this affects memory usage
            mesh.auroraModel = auroraModel;

            if(node.isWalkmesh){
              auroraModel.walkmesh = mesh;
              mesh.visible = false;
            }
            
            //RenderOrder
            if((_node.NodeType & AuroraModel.NODETYPE.Saber) == AuroraModel.NODETYPE.Saber){
              node.mesh.renderOrder = 5500;
            }else if(_node.BackgroundGeometry){
              mesh.renderOrder = 1000;
            }else if(options.isChildrenDynamic){
              mesh.renderOrder = 5000;
            }

            if(!node.isWalkmesh && !_node.BackgroundGeometry && options.mergeStatic && _node.roomStatic && mesh.geometry.faces.length){

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
              mesh.matrixAutoUpdate = true;
              node.add( mesh );
              if(!((_node.NodeType & AuroraModel.NODETYPE.AABB) == AuroraModel.NODETYPE.AABB)){
                mesh.castShadow = _node.FlagShadow;// && !options.static;//options.castShadow;
                mesh.receiveShadow = options.receiveShadow;
              }
            }

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
          case AuroraModel.ControllerType.Color:
            _node.color = new THREE.Color(controller.data[0].r, controller.data[0].g, controller.data[0].b);
          break;
          case AuroraModel.ControllerType.Position:
            //_node.position.set(controller.data[0].x, controller.data[0].y, controller.data[0].z);
          break;
          case AuroraModel.ControllerType.Radius:
            _node.radius = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.Multiplier:
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
        let lensFlare = new THREE.Lensflare();

        for(let i = 0, len = _node.flare.textures.length; i < len; i++){

          TextureLoader.enQueue(_node.flare.textures[i], null, TextureLoader.Type.TEXTURE, (texture, tex) => {
            console.log('LensFlare', i, texture, _node.flare.sizes[i],  _node.flare.positions[i],  _node.flare.colorShifts[i]);
            lensFlare.addElement( new THREE.LensflareElement( texture, _node.flare.sizes[i],  _node.flare.positions[i],  _node.flare.colorShifts[i] ) );
          });

          /*TextureLoader.Load(_node.flare.textures[i], (texture) => {
            textureFlare0 = texture;
          });*/

        }

        if(!options.manageLighting){
          lightNode.add(lensFlare);
        }else{
          lightNode.lensFlare = lensFlare;
        }
      }

      if(options.manageLighting){
        LightManager.addLight(_node.light);
      }
      
    }
  
    if ((_node.NodeType & AuroraModel.NODETYPE.Emitter) == AuroraModel.NODETYPE.Emitter) {
      let emitter = new THREE.AuroraEmitter(_node);
      emitter.context = auroraModel.context;
      emitter.name = _node.name + '_em'
      node.emitter = emitter;
      node.add(emitter);
      auroraModel.emitters.push(emitter);
    }

    if((_node.NodeType & AuroraModel.NODETYPE.Reference) == AuroraModel.NODETYPE.Reference){
      console.log(options.parent);
      if(options.parent.emitter){
        options.parent.emitter.referenceNode = node;
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
      case 'freelookhook':
        auroraModel.freelookhook = node;  
      break;
      case 'lookathook':
        auroraModel.lookathook = node;
      break;
      case 'lightsaberhook':
        auroraModel.lightsaberhook = node;
      break;
      case 'deflecthook':
        auroraModel.deflecthook = node;
      break;
      case 'impact':
        auroraModel.impact = node;
      break;
      case 'impact_bolt':
        auroraModel.impact_bolt = node;
      break;
      case 'headconjure':
        auroraModel.headconjure = node;
      break;
      case 'handconjure':
        auroraModel.handconjure = node;
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

  
  

