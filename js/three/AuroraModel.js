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
      return 0.5;//(this._node.multiplier > 1 && (Number(this._node.multiplier) === this._node.multiplier && this._node.multiplier % 1 === 0) ? this._node.multiplier : this._node.multiplier);
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
          object.mesh = undefined;
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
        if(PartyManager.party.indexOf(this.moduleObject) == -1 && this.context.scene.fog){
          if(this.moduleObject.distanceToCamera >= this.context.scene.fog.far){
            this.animateFrame = false;
            //If the object is past the near point, and the near point is greater than zero, animate every other frame
          }else if(this.context.scene.fog.near && this.moduleObject.distanceToCamera >= this.context.scene.fog.near){
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
        material.uniforms.time.value = this.context.deltaTime;
      }
    }

    if(this.headhook && this.headhook.children){
      for(let i = 0; i < this.headhook.children.length; i++){
        let node = this.headhook.children[i];
        if(node.type == 'AuroraModel'){
          for(let j = 0; j < node.materials.length; j++){
            let material = node.materials[j];
            if(material.type == 'ShaderMaterial'){
              material.uniforms.time.value = this.context.deltaTime;
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
      return this.animationManager.currentAnimation;
    }
    return undefined;
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

    for(let i = 0; i < this.skins.length; i++){
      let skinNode = this.skins[i];
      if(typeof skinNode._node.bone_parts !== 'undefined'){
        let bones = [];
        let inverses = [];
        let parts = Array.from(this.nodes.values());
        for(let j = 0; j < skinNode._node.bone_parts.length; j++){
          let boneNode = parts[skinNode._node.bone_parts[j]];
          if(typeof boneNode != 'undefined'){
            bones[j] = boneNode;
            inverses[j] = skinNode._node.bone_matrix[j];
          }
        }
        skinNode.geometry.bones = bones;
        skinNode.bind(new THREE.Skeleton( bones, inverses ));
        skinNode.skeleton.update();
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
        if(controller.data.length){
          switch(controller.type){
            case AuroraModel.ControllerType.Position:
              node.position.set(controller.data[0].x, controller.data[0].y, controller.data[0].z);
            break;
            case AuroraModel.ControllerType.Orientation:
              node.quaternion.set(controller.data[0].x, controller.data[0].y, controller.data[0].z, controller.data[0].w);
            break;
            case AuroraModel.ControllerType.Scale:
              node.scale.set(controller.data[0].value, controller.data[0].value, controller.data[0].value);
            break;
          }
        }
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
    //TextureLoader.LoadQueue();
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
      auroraModel.mergedGeometries = [];
      auroraModel.mergedDanglyGeometries = [];
      auroraModel.mergedMaterials = [];
      auroraModel.mergedDanglyMaterials = [];
    }

    auroraModel.add(THREE.AuroraModel.NodeParser(auroraModel, model.rootNode, options));

    if(options.mergeStatic){
      
      //Merge Basic Geometries
      if(auroraModel.mergedGeometries.length){

        auroraModel.mergedBufferGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(auroraModel.mergedGeometries, true);
        auroraModel.mergedMesh = new THREE.Mesh(auroraModel.mergedBufferGeometry, auroraModel.mergedMaterials);
        auroraModel.mergedMesh.receiveShadow = true;
        auroraModel.add(auroraModel.mergedMesh);

        for(let i = 0, len = auroraModel.mergedGeometries.length; i < len; i++){
          auroraModel.mergedGeometries[i].dispose();
        }
        auroraModel.mergedGeometries = [];

      }
      
      //Merge Dangly Geometries
      if(auroraModel.mergedDanglyGeometries.length){

        auroraModel.mergedBufferDanglyGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(auroraModel.mergedDanglyGeometries, true);
        auroraModel.mergedDanglyMesh = new THREE.Mesh(auroraModel.mergedBufferDanglyGeometry, auroraModel.mergedDanglyMaterials);
        //auroraModel.mergedDanglyMesh.receiveShadow = true;
        auroraModel.add(auroraModel.mergedDanglyMesh);

        for(let i = 0, len = auroraModel.mergedDanglyGeometries.length; i < len; i++){
          auroraModel.mergedDanglyGeometries[i].dispose();
        }
        auroraModel.mergedDanglyGeometries = [];

      }

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

  //Skip over LightMap Omnilight and Spotlight references because they are blank nodes
  //Don't know if this will have any side effects yet
  if(_node.name.toLowerCase().indexOf('lmomnilight') >= 0 || _node.name.toLowerCase().indexOf('lmspotlight') >= 0){
    return;
  }

  let node = new THREE.Group();
  node._node = _node;
  node.NodeType = _node.NodeType;
  node.isWalkmesh = ((_node.NodeType & AuroraModel.NODETYPE.AABB) == AuroraModel.NODETYPE.AABB);

  if(node.isWalkmesh){
    auroraModel.aabb = _node;
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

  //-----------//
  // MESH NODE
  //-----------//
  if ((_node.NodeType & AuroraModel.NODETYPE.Mesh) == AuroraModel.NODETYPE.Mesh) {
    THREE.AuroraModel.NodeMeshBuilder(auroraModel, node, options);  
  }

  //------------//
  // LIGHT NODE
  //------------//
  if ((_node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
    THREE.AuroraModel.NodeLightBuilder(auroraModel, node, options);      
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
    //console.log('AuroraModel', 'Reference Node', options.parent);
    if(options.parent.emitter){
      options.parent.emitter.referenceNode = node;
    }
  }

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
  node.matrixInverse.copy(node.matrix).invert();
  //node.matrixInverse.getInverse( node.matrix.clone() );

  if(options.parseChildren){
    options.parent = node;
    for(let i = 0; i < _node.childNodes.length; i++){
      //node.add(THREE.AuroraModel.NodeParser(auroraModel, _node.childNodes[i], options));
      THREE.AuroraModel.NodeParser(auroraModel, _node.childNodes[i], options);
    }
  }

  return node;

};

THREE.AuroraModel.NodeMeshBuilder = function(auroraModel, node, options){
  let _node = node._node;
  try{
    //Create geometry only if the mesh is visible or it is a walkmesh

    //Make sure there is at least one face before we attempt to build the mesh
    if(_node.faces.length ){

      //Optimization: Only create a mesh if it is actually rendered. Ignore this for placeable models
      //This breaks shadows because the original game uses the bones of the model to cast shadows. 
      //This can possibly be remedied by setting skin meshes to cast shadows.
      if(_node.FlagRender || (auroraModel.modelHeader.Classification == AuroraModel.CLASS.PLACEABLE)){

        //-------------------------//
        // BEGIN: GEOMETRY BUILDER
        //-------------------------//

        let geometry = undefined;
        
        //-------------------//
        // BUFFERED GEOMETRY
        //-------------------//
        if ((_node.NodeType & AuroraModel.NODETYPE.AABB) != AuroraModel.NODETYPE.AABB) {

          geometry = new THREE.BufferGeometry();
          geometry.setIndex(_node.indices); //Works with indices

          //Positions
          geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( _node.vertices, 3 ) ); //Works with indices

          //Normals
          const normals = new Float32Array( _node.normals.length * 3 ); //Works with indices
          geometry.setAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ).copyVector3sArray( _node.normals ) ); //Works with indices

          //Color
          const color = new Float32Array( _node.vertices.length ); //Works with indices
          geometry.setAttribute( 'color', new THREE.BufferAttribute( color, 3 ).copyArray( new Array(_node.vertices.length).fill(1, 0, _node.vertices.length) ) ); //Works with indices
          
          //UV1
          const uv1 = new Float32Array( _node.tvectors[0].length * 2 ); //Works with indices
          geometry.setAttribute( 'uv', new THREE.BufferAttribute( uv1, 2 ).copyVector2sArray( _node.tvectors[0].flat() ) ); //Works with indices
          
          //UV2
          const uv2 = new Float32Array( _node.tvectors[1].length * 2 ); //Works with indices
          geometry.setAttribute( 'uv2', new THREE.BufferAttribute( uv2, 2 ).copyVector2sArray( _node.tvectors[1].flat() ) ); //Works with indices
          
          //--------------------------//
          // SKIN GEOMETRY ATTRIBUTES
          //--------------------------//
          if((_node.NodeType & AuroraModel.NODETYPE.Skin) == AuroraModel.NODETYPE.Skin){
            //Skin Index
            const boneIdx = new Float32Array( _node.boneIdx.length * 4 ); //Works with indices
            geometry.setAttribute( 'skinIndex', new THREE.BufferAttribute( boneIdx, 4 ).copyArray( _node.boneIdx.flat() ) ); //Works with indices

            //Skin Weight
            const weights = new Float32Array( _node.weights.length * 4 ); //Works with indices
            geometry.setAttribute( 'skinWeight', new THREE.BufferAttribute( weights, 4 ).copyArray( _node.weights.flat() ) ); //Works with indices
          }

          //----------------------------//
          // DANGLY GEOMETRY ATTRIBUTES
          //----------------------------//
          if((_node.NodeType & AuroraModel.NODETYPE.Dangly) == AuroraModel.NODETYPE.Dangly){
            //Contstraint
            const constraints = new Float32Array( _node.danglyVec4.length * 4 ); //Works with indices
            geometry.setAttribute( 'constraint', new THREE.BufferAttribute( constraints, 4 ).copyVector4sArray( _node.danglyVec4 ) ); //Works with indices
          }
          
          //Compute Geometry Tangents
          if((_node.NodeType & AuroraModel.NODETYPE.Saber) != AuroraModel.NODETYPE.Saber){
            THREE.BufferGeometryUtils.computeTangents(geometry);
          }
          
        }

        /*
         * The project is moving away from using THREE.Geometry. The only geometry that should be using THREE.Geometry are WalkMeshes for now.
         */
        
        //----------------//
        // BASIC GEOMETRY
        //----------------//
        if(typeof geometry == 'undefined'){
          geometry = new THREE.Geometry();
          geometry.boundingBox = new THREE.Box3(_node.boundingBox.min, _node.boundingBox.max);
    
          geometry.vertices = [];
          for(let i = 0, len = _node.vertices.length; i < len; i+=3){
            geometry.vertices.push(new THREE.Vector3(_node.vertices[i], _node.vertices[i+1], _node.vertices[i+2]));
          }
          geometry.faces = _node.faces || [];
          geometry.faceVertexUvs = [[],[]];
          
          //Base Texture UVs
          if(_node.MDXDataBitmap & AuroraModel.MDXFLAG.UV1){
            geometry.faceVertexUvs[0] = _node.texCords[0];
            geometry.faceVertexUvs[1] = _node.texCords[0];
          }

          //Lightmap UVs
          if(_node.MDXDataBitmap & AuroraModel.MDXFLAG.UV2){
            geometry.faceVertexUvs[1] = _node.texCords[1];
          }

          //Colors
          if(_node.MDXDataBitmap & AuroraModel.MDXFLAG.COLOR){
            geometry.colors = _node.colors;
          }
          
          //if(auroraModel.modelHeader.Smoothing)
            //geometry.mergeVertices();
    
          geometry.verticesNeedUpdate = true;
          geometry.normalsNeedUpdate = true;
          geometry.uvsNeedUpdate = true;
          //geometry.computeBoundingBox();
        }

        //-------------------------//
        // BEGIN: MATERIAL BUILDER
        //-------------------------//
        let material = THREE.AuroraModel.NodeMaterialBuilder(auroraModel, node, options);

        //---------------------//
        // BEGIN: MESH BUILDER
        //---------------------//
  
        let mesh = undefined;

        //-----------//
        // SKIN MESH
        //-----------//
        if ((_node.NodeType & AuroraModel.NODETYPE.Skin) == AuroraModel.NODETYPE.Skin) {

          let bones = [];
          bones.length = _node.bone_parts.length;
          material.skinning = true;
          mesh = new THREE.SkinnedMesh( geometry , material );
          auroraModel.skins.push(mesh);

        }

        //------------//
        // BASIC MESH
        //------------//
        if(!mesh && geometry && material)
          mesh = new THREE.Mesh( geometry , material );

        if(!mesh){
          console.error('THREE.AuroraModel', 'Failed to generate mesh node', _node);
        }

        node.mesh = mesh;

        //Need to see if this affects memory usage
        mesh.auroraModel = auroraModel;

        if(node.isWalkmesh){
          auroraModel.walkmesh = mesh;
          mesh.material.visible = false;
        }
        
        //RenderOrder
        // if(_node.BackgroundGeometry){
        //   mesh.renderOrder = 1000;
        // }else if(options.isChildrenDynamic){
        //   mesh.renderOrder = 5000;
        // }

        //----------------//
        // MERGE GEOMETRY
        //----------------//
        if(!node.isWalkmesh && !_node.BackgroundGeometry && options.mergeStatic && _node.roomStatic && _node.faces.length){

          node.getWorldPosition( mesh.position );
          node.getWorldQuaternion( mesh.quaternion );
          mesh.updateMatrix(); // as needed

          //apply matrix to positions
          geometry.getAttribute('position').applyMatrix4( mesh.matrix );

          //apply matrix to normals
          let normalMatrix = new THREE.Matrix3().getNormalMatrix( mesh.matrix );
          geometry.getAttribute('normal').applyMatrix3( normalMatrix );
          geometry.normalizeNormals();

          if((_node.NodeType & AuroraModel.NODETYPE.Dangly) == AuroraModel.NODETYPE.Dangly){
            auroraModel.mergedDanglyGeometries.push(geometry);
            auroraModel.mergedDanglyMaterials.push(material);
          }else{
            auroraModel.mergedGeometries.push(geometry);
            auroraModel.mergedMaterials.push(material);
          }

          //Unset the mesh variable so it can't be added to the node
          mesh = undefined;
          
        }
        
        //------------------//
        // ADD MESH TO NODE
        //------------------//
        if(mesh instanceof THREE.Mesh){

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
};

THREE.AuroraModel.NodeMaterialBuilder = function(auroraModel, node, options){
  let _node = node._node;
    
  let tMap1 = _node.TextureMap1+'';
  let tMap2 = _node.TextureMap2+'';
  let fallbackTexture = null;

  if(options.textureVar != '' && options.textureVar.indexOf('****') == -1){
    fallbackTexture = tMap1;
    tMap1 = options.textureVar;
  }

  _node.tMap1 = tMap1;

  if(tMap1 || tMap2){
    //_node.Diffuse.r = _node.Diffuse.g = _node.Diffuse.b = 0.8;
  }

  if((_node.NodeType & AuroraModel.NODETYPE.AABB) == AuroraModel.NODETYPE.AABB){
    material = new THREE.MeshBasicMaterial({
      fog: false,
      side: THREE.FrontSide,
    });
  }else{
    material = new THREE.ShaderMaterial({
      fragmentShader: THREE.ShaderLib.aurora.fragmentShader,
      vertexShader: THREE.ShaderLib.aurora.vertexShader,
      uniforms: THREE.UniformsUtils.merge([THREE.ShaderLib.aurora.uniforms]),
      side: THREE.FrontSide,
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
    material.uniforms.time.value = options.context.time;
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
      TextureLoader.enQueue(tMap2, material, TextureLoader.Type.LIGHTMAP);
    }

    if((!(_node.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT1) && 
      !(_node.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT2) && 
      !(_node.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT3) && 
      !(_node.MDXDataBitmap & AuroraModel.MDXFLAG.TANGENT4) &&
      !_node.FlagShadow && !options.castShadow) || _node.BackgroundGeometry || options.static){
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
      TextureLoader.enQueue(tMap1, material, TextureLoader.Type.TEXTURE, undefined, fallbackTexture);
    }else{
      material.uniforms.diffuse.value.copy(_node.Diffuse);
    }

    material.needsUpdate = true;
  }
  return material;
};

THREE.AuroraModel.NodeLightBuilder = function(auroraModel, node, options){
  let _node = node._node;

  _node.color = new THREE.Color(0xFFFFFF);
  _node.radius = 5.0;
  _node.intensity = 1.0;
  _node.multiplier = 1.0;
  _node.position = new THREE.Vector3();
  
  _node.controllers.forEach( (controller) => {
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
        //console.log('LensFlare', i, texture, _node.flare.sizes[i],  _node.flare.positions[i],  _node.flare.colorShifts[i]);
        lensFlare.addElement( new THREE.LensflareElement( texture, _node.flare.sizes[i],  _node.flare.positions[i],  _node.flare.colorShifts[i] ) );
      });
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
};
