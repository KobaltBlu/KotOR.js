/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as THREE from "three";
import { OdysseyModel, OdysseyModelAnimation, OdysseyModelAnimationManager, OdysseyModelNode, OdysseyModelNodeAABB, OdysseyModelNodeDangly, OdysseyModelNodeEmitter, OdysseyModelNodeLight, OdysseyModelNodeMesh, OdysseyModelNodeReference, OdysseyModelNodeSaber, OdysseyModelNodeSkin, OdysseyWalkMesh, ControllerType, MDXFLAG, ModelClass, ModelHeader, NODETYPE } from "../../odyssey";
import { GameState } from "../../GameState";
import { LightManager } from "../../LightManager";
import { ModuleObject, ModuleCreature, ModuleRoom } from "../../module";
import { PartyManager } from "../../PartyManager";
import { TextureLoader } from "../../resource/TextureLoader";
// import { Geometry } from "../Geometry";
import { Lensflare, LensflareElement } from "../Lensflare";
import { OdysseyEmitter3D, OdysseyLight3D, OdysseyObject3D } from "./";

/* @file
 * The OdysseyModel3D class takes an OdysseyModel object and converts it into a THREE.js object
 */

export interface OdysseyModelLoaderOptions {
  textureVar?: string, //override texture
  castShadow?: boolean, //force cast shadow on mesh nodes
  receiveShadow?: boolean, //force recieve shadow on mesh nodes
  manageLighting?: boolean, // true | light nodes are manages by the LightManager class, false | lights are created inline
  // context: Game,
  mergeStatic?: boolean, //Use on room models
  static?: boolean, //Static placeable
  lighting?: boolean,
  useTweakColor?: boolean,
  tweakColor?: number,
  isForceShield?: boolean,
  isChildrenDynamic?: boolean,
  parseChildren?: boolean,
  isHologram?: boolean,
  context?: any,
  onComplete: Function,
}

//THREE.js representation of OdysseyModel
export class OdysseyModel3D extends OdysseyObject3D {

  type = 'OdysseyModel';
  box = new THREE.Box3;
  sphere = new THREE.Sphere();
  context: any = undefined;
  meshes: any[] = [];
  danglyMeshes: any[] = [];
  odysseyAnimations: OdysseyModelAnimation[] = [];
  emitters: any = [];
  lights: any = [];
  aabb: any = {};
  materials: THREE.Material[] = [];
  parentModel: any = undefined;

  effects: any[] = [];

  puppeteer: any = undefined; 
  oddFrame = false;

  names: string[] = [];
  supermodels: any[] = [];

  target: any = null;
  controlled = false;

  skins: any[] = [];
  forceShieldGeometry: any[] = [];

  //Beta AnimationManager
  animationManager = new OdysseyModelAnimationManager(this);

  wasOffscreen = false;
  animateFrame = true;

  nodes = new Map();

  animNodeCache = {

  }; 

  talkdummy: OdysseyObject3D;
  cutscenedummy: OdysseyObject3D;  
  rootdummy: OdysseyObject3D;
  headhook: OdysseyObject3D;
  camerahook: OdysseyObject3D;  
  freelookhook: OdysseyObject3D;  
  lookathook: OdysseyObject3D;
  lightsaberhook: OdysseyObject3D;
  deflecthook: OdysseyObject3D;
  maskhook: OdysseyObject3D;
  gogglehook: OdysseyObject3D;
  rhand: OdysseyObject3D;
  lhand: OdysseyObject3D;
  impact: OdysseyObject3D;
  impact_bolt: OdysseyObject3D;
  headconjure: OdysseyObject3D;
  handconjure: OdysseyObject3D;
  trans: OdysseyObject3D;
  bullethook0: OdysseyObject3D;
  bullethook1: OdysseyObject3D;
  bullethook2: OdysseyObject3D;
  bullethook3: OdysseyObject3D;
  gunhook0: OdysseyObject3D;
  gunhook1: OdysseyObject3D;
  gunhook2: OdysseyObject3D;
  gunhook3: OdysseyObject3D;
  modelhook: OdysseyObject3D;

  moduleObject: any = undefined;
  bonesInitialized = false;
  Scale: number;
  modelHeader: ModelHeader;
  affectedByFog: boolean;
  options: {};
  oldAnim: OdysseyModelAnimation;
  mergedGeometries: any[];
  mergedDanglyGeometries: any[];
  mergedMaterials: any[];
  mergedDanglyMaterials: any[];
  mergedBufferGeometry: THREE.BufferGeometry;
  mergedMesh: THREE.Mesh<THREE.BufferGeometry, any[]>;
  mergedBufferDanglyGeometry: THREE.BufferGeometry;
  mergedDanglyMesh: THREE.Mesh<THREE.BufferGeometry, any[]>;
  walkmesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
  wok: OdysseyWalkMesh;
  animLoops: OdysseyModelAnimation[] = [];

  disableEmitters(){
    for(let i = 0; i < this.emitters.length; i++){
      this.emitters[i].disable();
    }
  };

  dispose(node?: any){

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
      }else if(object.type === 'OdysseyLight'){
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

    if(node instanceof OdysseyModel3D){
      this.meshes = [];
      this.danglyMeshes = [];
      this.odysseyAnimations = [];
      this.emitters = [];
      this.lights = [];
      this.aabb = {};
      this.materials = [];
      this.skins = [];

      this.puppeteer = undefined; 
      this.names = [];
      this.supermodels = [];
      this.target = null;
      this.controlled = false;
      this.animationManager.currentAnimation = undefined;
      this.animNodeCache = {};
      this.options = {};
    
      this.headhook = null;
      this.lhand = null;
      this.rhand = null;
    
      this.moduleObject = undefined;

      if(this.parent instanceof OdysseyModel3D){
        this.parent.remove(this);
      }
      //console.log(node);

      this.disposeForceShieldGeometry();

    }

  }

  disposeMaterial(material: THREE.Material){
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

  update(delta: number = 0){

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

    this.animationManager.update(delta);

    //Update the time uniform on materials in this array
    for(let i = 0; i < this.materials.length; i++){
      let material = this.materials[i];
      if(material.type == 'ShaderMaterial'){
        material.uniforms.time.value = this.context.deltaTime;
      }
    }

    //TODO: Reimplement
    // if(this.headhook && this.headhook.children){
    //   for(let i = 0; i < this.headhook.children.length; i++){
    //     let node = this.headhook.children[i];
    //     if(node.type == 'OdysseyModel'){
    //       for(let j = 0; j < node.materials.length; j++){
    //         let material = node.materials[j];
    //         if(material.type == 'ShaderMaterial'){
    //           material.uniforms.time.value = this.context.deltaTime;
    //         }
    //       }
    //     }
    //   }
    // }
    
    //Update emitters
    for(let i = 0; i < this.emitters.length; i++){
      this.emitters[i].tick(delta);
    }

    this.oddFrame = !this.oddFrame;

  }

  setEmitterTarget(node: OdysseyModel3D){
    if(node instanceof OdysseyModel3D){
      for(let i = 0; i < this.emitters.length; i++){
        if(this.emitters[i].referenceNode instanceof OdysseyModel3D){
          // node.getWorldPosition(
          //   this.emitters[i].referenceNode.position
          // );
          this.emitters[i].referenceNode = node;
        }
      }
    }
  };

  setPuppeteer(pup: OdysseyModel3D = undefined){
    this.puppeteer = pup;
  };

  removePuppeteer(){
    this.puppeteer = undefined;
  };

  poseAnimation(anim: OdysseyModelAnimation|string|number){
    let animation: OdysseyModelAnimation;
    if(typeof anim === 'number'){
      animation = this.odysseyAnimations[anim];
    }else if(typeof anim === 'string'){
      animation = this.getAnimationByName(anim);
    }else{
      animation = anim;
    }

    if(animation instanceof OdysseyModelAnimation){
      this.animationManager.currentAnimation = animation;

      let animNodesLen = animation.nodes.length;
      for(let i = 0; i < animNodesLen; i++){
        this.poseAnimationNode(anim, animation.nodes[i]);
      }
    }
  };

  playAnimation(anim: any = undefined, looping: boolean = false, callback?: Function){
    return this.animationManager.playAnimation(anim, looping, callback);
  }

  stopAnimation(){
    this.animationManager.stopAnimation();
  }

  stopAnimationLoop(){
    this.animationManager.stopAnimationLoop();
  }

  getAnimationName(): string{
    return this.animationManager.getAnimationName();
  }

  getAnimationByName( name = '' ): OdysseyModelAnimation{
    return this.animationManager.getAnimationByName(name);
  }

  buildSkeleton(){
    this.bonesInitialized = false;
    this.oldAnim = this.animationManager.currentAnimation;
    this.animationManager.currentAnimation = undefined;
    this.pose();

    for(let i = 0; i < this.skins.length; i++){
      let skinNode = this.skins[i];
      if(typeof skinNode.auroraNode.bone_parts !== 'undefined'){
        let bones = [];
        let inverses = [];
        let parts = Array.from(this.nodes.values());
        for(let j = 0; j < skinNode.auroraNode.bone_parts.length; j++){
          let boneNode = parts[skinNode.auroraNode.bone_parts[j]];
          if(typeof boneNode != 'undefined'){
            bones[j] = boneNode;
            inverses[j] = skinNode.auroraNode.bone_inverse_matrix[j];
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

  pose(node: OdysseyModel3D|THREE.Object3D = undefined){
    this.bonesInitialized = false;
    if(node){
      try{
        if((node as any).Controllers){
          (node as any).controllers.forEach( (controller) => {
            if(controller.data.length){
              switch(controller.type){
                case ControllerType.Position:
                  node.position.set(controller.data[0].x, controller.data[0].y, controller.data[0].z);
                break;
                case ControllerType.Orientation:
                  node.quaternion.set(controller.data[0].x, controller.data[0].y, controller.data[0].z, controller.data[0].w);
                break;
                case ControllerType.Scale:
                  node.scale.set(controller.data[0].value, controller.data[0].value, controller.data[0].value);
                break;
              }
            }
          });
        }
        //node.updateMatrix();
        node.updateMatrixWorld(true);
      }catch(e){}

      for(let i = 0; i < node.children.length; i++){
        this.pose(node.children[i])
      }
    }else{
      for(let i = 0; i < this.children.length; i++){
        this.pose(this.children[i])
      }
    }
  }

  playEvent(event: string, index: number = 0){
    //console.log(event)
    if(event == 'detonate'){
      let idx = 0;
      for(let i = 0; i < this.emitters.length; i++){
        let emitter = this.emitters[i];
        if(emitter.type == 'OdysseyEmitter'){
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

  poseAnimationNode(anim, node){

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
            if ((modelNode.auroraNode.NodeType & NODETYPE.Light) == NODETYPE.Light) {
              modelNode.auroraNode.color.setRGB(
                data.r, 
                data.g, 
                data.b
              );
            }
          break;
          case ControllerType.Multiplier:
            if ((modelNode.auroraNode.NodeType & NODETYPE.Light) == NODETYPE.Light) {
              modelNode.auroraNode.multiplier = data.value;
            }
          break;
          case ControllerType.Radius:
            if ((modelNode.auroraNode.NodeType & NODETYPE.Light) == NODETYPE.Light) {
              modelNode.auroraNode.radius = data.value;
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

  // clone(): THREE.Object3D {

  //   let cloned = (new OdysseyModel3D).copy( this );
  //   cloned._animPosition = new THREE.Vector3();
  //   cloned._animQuaternion = new THREE.Quaternion();
  //   cloned.odysseyAnimations = this.odysseyAnimations.slice();
  //   cloned.traverse( (node) => {
  //     if(node instanceof THREE.SkinnedMesh){
  //       cloned.push(mesh)
  //     }
  //   });
  //   cloned.pose();
  //   cloned.buildSkeleton();
  //   return cloned;

  // }

  disableMatrixUpdate(){
    this.traverse( (node) => {
      if(node instanceof OdysseyModel3D){
        node.matrixAutoUpdate = false;
      }
    });
    this.matrixAutoUpdate = true;
  }

  enableMatrixUpdate(){
    this.traverse( (node) => {
      if(node instanceof OdysseyModel3D){
        node.matrixAutoUpdate = true;
      }
    });
    this.matrixAutoUpdate = true;
  }

  generateForceShieldGeometry( shieldTexName = '' ){
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
      } as any);
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

  disposeForceShieldGeometry(){
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

  traverseIgnore( ignoreName: string = '', callback: Function|undefined = undefined ){

    if(this.name == ignoreName)
      return;
  
    if(typeof callback == 'function')
      callback( this );
  
    var children = this.children;
  
    for ( var i = 0, l = children.length; i < l; i ++ ) {
      if(typeof (children[ i ] as any).traverseIgnore === 'function'){
        (children[ i ] as any).traverseIgnore( ignoreName, callback );
      }
    }
  
  }

  static async SuperModelLoader(resref: string, odysseyModel: OdysseyModel3D): Promise<OdysseyModel3D> {
    const supermodel: OdysseyModel = await GameState.ModelLoader.loadAsync(resref);
    if(!!supermodel){
      //--------------------------------------//
      // Supermodel: Animations Merge - Begin
      //--------------------------------------//

      let currentAnimations = odysseyModel.odysseyAnimations.slice(); //Copy the array
      for(let i = 0; i < supermodel.animations.length; i++){
        let animName = supermodel.animations[i].name;
        let hasAnim = false;
        for(let j = 0; j < currentAnimations.length; j++){
          if(animName == currentAnimations[j].name){
            //odysseyModel.odysseyAnimations[j] = supermodel.odysseyAnimations[i];
            hasAnim = true;
            break;
          }
        }

        if(!hasAnim){
          odysseyModel.odysseyAnimations.push(OdysseyModelAnimation.From(supermodel.animations[i]));
        }
      }

      //------------------------------------//
      // Supermodel: Animations Merge - End
      //------------------------------------//

      let superModelName = supermodel.modelHeader.SuperModelName;
      if(superModelName != 'null' && superModelName.indexOf("NULL") == -1 && superModelName != ''){
        return OdysseyModel3D.SuperModelLoader( superModelName.toLowerCase(), odysseyModel ); 
      }
    }
    return odysseyModel;
  }

  static async FromMDL(model, _options: OdysseyModelLoaderOptions = {} as OdysseyModelLoaderOptions): Promise<OdysseyModel3D> {
    return new Promise<OdysseyModel3D>( async (resolve: Function, reject: Function) => {

      const _default: OdysseyModelLoaderOptions = {
        textureVar: '****',
        castShadow: false,
        receiveShadow: false,
        manageLighting: true,
        // context: Game,
        mergeStatic: false, //Use on room models
        static: false, //Static placeable
        parseChildren: true,
        isChildrenDynamic: false,   
      } as OdysseyModelLoaderOptions;

      const options: OdysseyModelLoaderOptions = { ..._default, ..._options };

      if(model instanceof OdysseyModel){

        let odysseyModel = new OdysseyModel3D();
        odysseyModel.context = options.context;
        odysseyModel.name = model.geometryHeader.ModelName.toLowerCase().trim();
        odysseyModel.options = options;
        odysseyModel.odysseyAnimations = [];//model.animations.slice();
        if(!(odysseyModel.odysseyAnimations instanceof Array)){
          odysseyModel.odysseyAnimations = [];
        }else{
          for(let i = 0; i < model.animations.length; i++){
            odysseyModel.odysseyAnimations[i] = OdysseyModelAnimation.From(model.animations[i]);
          }
        }
        odysseyModel.Scale = 1;
        odysseyModel.names = model.names;
        odysseyModel.modelHeader = model.modelHeader;
        odysseyModel.affectedByFog = model.modelHeader.Fogged ? true : false;
        
        odysseyModel._animPosition = new THREE.Vector3();
        odysseyModel._animQuaternion = new THREE.Quaternion();

        if(options.mergeStatic){
          odysseyModel.mergedGeometries = [];
          odysseyModel.mergedDanglyGeometries = [];
          odysseyModel.mergedMaterials = [];
          odysseyModel.mergedDanglyMaterials = [];
        }

        odysseyModel.add(OdysseyModel3D.NodeParser(odysseyModel, odysseyModel, model.rootNode, options));

        if(options.mergeStatic){
          
          //Merge Basic Geometries
          if(odysseyModel.mergedGeometries.length){

            odysseyModel.mergedBufferGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(odysseyModel.mergedGeometries);
            odysseyModel.mergedMesh = new THREE.Mesh(odysseyModel.mergedBufferGeometry, odysseyModel.mergedMaterials);
            odysseyModel.mergedMesh.receiveShadow = true;
            odysseyModel.add(odysseyModel.mergedMesh);

            for(let i = 0, len = odysseyModel.mergedGeometries.length; i < len; i++){
              odysseyModel.mergedGeometries[i].dispose();
            }
            odysseyModel.mergedGeometries = [];

          }
          
          //Merge Dangly Geometries
          if(odysseyModel.mergedDanglyGeometries.length){

            odysseyModel.mergedBufferDanglyGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(odysseyModel.mergedDanglyGeometries);
            odysseyModel.mergedDanglyMesh = new THREE.Mesh(odysseyModel.mergedBufferDanglyGeometry, odysseyModel.mergedDanglyMaterials);
            //odysseyModel.mergedDanglyMesh.receiveShadow = true;
            odysseyModel.add(odysseyModel.mergedDanglyMesh);

            for(let i = 0, len = odysseyModel.mergedDanglyGeometries.length; i < len; i++){
              odysseyModel.mergedDanglyGeometries[i].dispose();
            }
            odysseyModel.mergedDanglyGeometries = [];

          }

          //Prune all the empty nodes 
          let pruneList = [];
          odysseyModel.traverseIgnore(odysseyModel.name+'a', (node) => {
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
        
        odysseyModel.buildSkeleton();

        if(model.modelHeader.SuperModelName.indexOf("NULL") == -1 && model.modelHeader.SuperModelName != ''){
          await OdysseyModel3D.SuperModelLoader(model.modelHeader.SuperModelName.toLowerCase(), odysseyModel);
        }

        odysseyModel.box.setFromObject(odysseyModel);
        resolve(odysseyModel);
      }else{
        reject('model is not of type OdysseyModel');
      }
    });

  }

  static NodeParser(odysseyModel: OdysseyModel3D, parentNode: THREE.Object3D, auroraNode: OdysseyModelNode, options: OdysseyModelLoaderOptions){

    //Skip over LightMap Omnilight and Spotlight references because they are blank nodes
    //Don't know if this will have any side effects yet
    if(auroraNode.name.toLowerCase().indexOf('lmomnilight') >= 0 || auroraNode.name.toLowerCase().indexOf('lmspotlight') >= 0){
      return;
    }

    let node = new OdysseyModel3D(auroraNode);
    node.NodeType = auroraNode.NodeType;

    if((auroraNode.NodeType & NODETYPE.AABB) == NODETYPE.AABB){
      odysseyModel.aabb = auroraNode;
    }

    node.controllers = auroraNode.controllers;
    
    if(auroraNode.controllers.has(ControllerType.Orientation)){
      node.controllerHelpers.hasOrientation = true;
      node.controllerHelpers.orientation = auroraNode.controllers.get(ControllerType.Orientation);
    }

    if(auroraNode.controllers.has(ControllerType.Position)){
      node.controllerHelpers.hasPosition = true;
      node.controllerHelpers.position = auroraNode.controllers.get(ControllerType.Position);
    }

    if(auroraNode.controllers.has(ControllerType.Scale)){
      node.controllerHelpers.hasScale = true;
      node.controllerHelpers.scale = auroraNode.controllers.get(ControllerType.Scale);
    }

    node.position.set(auroraNode.position.x, auroraNode.position.y, auroraNode.position.z);
    node.quaternion.set(auroraNode.quaternion.x, auroraNode.quaternion.y, auroraNode.quaternion.z, auroraNode.quaternion.w);

    node.name = auroraNode.name.toLowerCase();

    if(node.name == odysseyModel.name.toLowerCase()+'a'){
      options.isChildrenDynamic = true;
    }

    if(!odysseyModel.nodes.has(node.name))
      odysseyModel.nodes.set(node.name, node);

    parentNode.add(node);

    //-----------//
    // MESH NODE
    //-----------//
    if ((auroraNode.NodeType & NODETYPE.Mesh) == NODETYPE.Mesh && auroraNode instanceof OdysseyModelNodeMesh) {
      OdysseyModel3D.NodeMeshBuilder(odysseyModel, node, auroraNode, options);  
    }

    //------------//
    // LIGHT NODE
    //------------//
    if ((auroraNode.NodeType & NODETYPE.Light) == NODETYPE.Light && auroraNode instanceof OdysseyModelNodeLight) {
      OdysseyModel3D.NodeLightBuilder(odysseyModel, node, auroraNode, options);      
    }

    if ((auroraNode.NodeType & NODETYPE.Emitter) == NODETYPE.Emitter && auroraNode instanceof OdysseyModelNodeEmitter) {
      // let emitter = new OdysseyEmitter3D(auroraNode);
      // emitter.context = odysseyModel.context;
      // emitter.name = auroraNode.name + '_em'
      // node.emitter = emitter;
      // node.add(emitter);
      // odysseyModel.emitters.push(emitter);
    }

    if((auroraNode.NodeType & NODETYPE.Reference) == NODETYPE.Reference && auroraNode instanceof OdysseyModelNodeReference){
      //console.log('OdysseyModel', 'Reference Node', options.parent);
      if(parentNode.parent instanceof OdysseyEmitter3D)
        parentNode.parent.emitter.referenceNode = node;
    }

    switch(node.name){
      case 'talkdummy':
        odysseyModel.talkdummy = node;
      break;
      case 'cutscenedummy':
        odysseyModel.cutscenedummy = node;  
      break;
      case 'rootdummy':
        odysseyModel.rootdummy = node;
      break;
      case 'headhook':
        odysseyModel.headhook = node;
      break;
      case 'camerahook':
        odysseyModel.camerahook = node;  
      break;
      case 'freelookhook':
        odysseyModel.freelookhook = node;  
      break;
      case 'lookathook':
        odysseyModel.lookathook = node;
      break;
      case 'lightsaberhook':
        odysseyModel.lightsaberhook = node;
      break;
      case 'deflecthook':
        odysseyModel.deflecthook = node;
      break;
      case 'maskhook':
        odysseyModel.maskhook = node;
      break;
      case 'gogglehook':
        odysseyModel.gogglehook = node;
      break;
      case 'rhand':
        odysseyModel.rhand = node;
      break;
      case 'lhand':
        odysseyModel.lhand = node;
      break;
      case 'impact':
        odysseyModel.impact = node;
      break;
      case 'impact_bolt':
        odysseyModel.impact_bolt = node;
      break;
      case 'headconjure':
        odysseyModel.headconjure = node;
      break;
      case 'handconjure':
        odysseyModel.handconjure = node;
      break;
      case 'trans':
        odysseyModel.trans = node;
      break;
      case 'bullethook0':
        odysseyModel.bullethook0 = node;
      break;
      case 'bullethook1':
        odysseyModel.bullethook1 = node;
      break;
      case 'bullethook2':
        odysseyModel.bullethook2 = node;
      break;
      case 'bullethook3':
        odysseyModel.bullethook3 = node;
      break;
      case 'gunhook0':
        odysseyModel.gunhook0 = node;
      break;
      case 'gunhook1':
        odysseyModel.gunhook1 = node;
      break;
      case 'gunhook2':
        odysseyModel.gunhook2 = node;
      break;
      case 'gunhook3':
        odysseyModel.gunhook3 = node;
      break;
      case 'modelhook':
        odysseyModel.modelhook = node;
      break;
    }

    node.matrixInverse = new THREE.Matrix4();
    node.matrixInverse.copy(node.matrix).invert();
    //node.matrixInverse.getInverse( node.matrix.clone() );

    if(options.parseChildren){
      for(let i = 0; i < auroraNode.childNodes.length; i++){
        OdysseyModel3D.NodeParser(odysseyModel, node, auroraNode.childNodes[i], options);
      }
    }

    return node;

  };

  static NodeMeshBuilder(odysseyModel: OdysseyModel3D, parentNode: THREE.Object3D, auroraNode: OdysseyModelNodeMesh|OdysseyModelNodeDangly|OdysseyModelNodeSkin|OdysseyModelNodeAABB|OdysseyModelNodeSaber, options: OdysseyModelLoaderOptions){
    try{
      //Create geometry only if the mesh is visible or it is a walkmesh

      //Make sure there is at least one face before we attempt to build the mesh
      if(auroraNode.faces.length ){

        //Optimization: Only create a mesh if it is actually rendered. Ignore this for placeable models
        //This breaks shadows because the original game uses the bones of the model to cast shadows. 
        //This can possibly be remedied by setting skin meshes to cast shadows.
        if(auroraNode.FlagRender || (odysseyModel.modelHeader.Classification == ModelClass.PLACEABLE)){

          //-------------------------//
          // BEGIN: GEOMETRY BUILDER
          //-------------------------//

          let geometry = undefined;
          
          //-------------------//
          // BUFFERED GEOMETRY
          //-------------------//
          if ((auroraNode.NodeType & NODETYPE.AABB) != NODETYPE.AABB) {

            geometry = new THREE.BufferGeometry();
            geometry.setIndex(auroraNode.indices); //Works with indices

            //Positions
            geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( auroraNode.vertices, 3 ) ); //Works with indices

            //Normals
            const normals = new Float32Array( auroraNode.normals.length * 3 ); //Works with indices
            geometry.setAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ).copyVector3sArray( auroraNode.normals ) ); //Works with indices

            //Color
            // const color = new Float32Array( auroraNode.vertices.length ); //Works with indices
            // geometry.setAttribute( 'color', new THREE.BufferAttribute( color, 3 ).copyArray( new Array(auroraNode.vertices.length).fill(1, 0, auroraNode.vertices.length) ) ); //Works with indices
            
            //UV1
            const uv1 = new Float32Array( auroraNode.tvectors[0].length * 2 ); //Works with indices
            geometry.setAttribute( 'uv', new THREE.BufferAttribute( uv1, 2 ).copyVector2sArray( auroraNode.tvectors[0].flat() ) ); //Works with indices
            
            //UV2
            const uv2 = new Float32Array( auroraNode.tvectors[1].length * 2 ); //Works with indices
            geometry.setAttribute( 'uv2', new THREE.BufferAttribute( uv2, 2 ).copyVector2sArray( auroraNode.tvectors[1].flat() ) ); //Works with indices
            
            //--------------------------//
            // SKIN GEOMETRY ATTRIBUTES
            //--------------------------//
            if((auroraNode.NodeType & NODETYPE.Skin) == NODETYPE.Skin){
              //Skin Index
              const boneIdx = new Float32Array( (auroraNode as OdysseyModelNodeSkin).boneIdx.length * 4 ); //Works with indices
              geometry.setAttribute( 'skinIndex', new THREE.BufferAttribute( boneIdx, 4 ).copyArray( (auroraNode as OdysseyModelNodeSkin).boneIdx.flat() ) ); //Works with indices

              //Skin Weight
              const weights = new Float32Array( (auroraNode as OdysseyModelNodeSkin).weights.length * 4 ); //Works with indices
              geometry.setAttribute( 'skinWeight', new THREE.BufferAttribute( weights, 4 ).copyArray( (auroraNode as OdysseyModelNodeSkin).weights.flat() ) ); //Works with indices
            }

            //----------------------------//
            // DANGLY GEOMETRY ATTRIBUTES
            //----------------------------//
            if((auroraNode.NodeType & NODETYPE.Dangly) == NODETYPE.Dangly){
              //Contstraint
              const constraints = new Float32Array( (auroraNode as OdysseyModelNodeDangly).danglyVec4.length * 4 ); //Works with indices
              geometry.setAttribute( 'constraint', new THREE.BufferAttribute( constraints, 4 ).copyVector4sArray( (auroraNode as OdysseyModelNodeDangly).danglyVec4 ) ); //Works with indices
            }
            
            //Compute Geometry Tangents
            if((auroraNode.NodeType & NODETYPE.Saber) != NODETYPE.Saber){
              THREE.BufferGeometryUtils.computeTangents(geometry);
            }
            
          }else{
            geometry = new THREE.BufferGeometry();

            const vertices = auroraNode.faces.map( f => {
              return [
                auroraNode.vertices[(f.a * 3) + 0], auroraNode.vertices[(f.a * 3) + 1], auroraNode.vertices[(f.a * 3) + 2],
                auroraNode.vertices[(f.b * 3) + 0], auroraNode.vertices[(f.b * 3) + 1], auroraNode.vertices[(f.b * 3) + 2],
                auroraNode.vertices[(f.c * 3) + 0], auroraNode.vertices[(f.c * 3) + 1], auroraNode.vertices[(f.c * 3) + 2],
              ]
            }).flat();

            //Positions
            const vertices32 = new Float32Array( vertices );
            geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices32, 3 ) );

            const normals = auroraNode.faces.map( f => {
              return [ f.normal.x, f.normal.y, f.normal.z ]
            }).flat();

            //Normals
            const normals32 = new Float32Array( normals );
            geometry.setAttribute( 'normal', new THREE.BufferAttribute( normals32, 3 ) );

            const colors = auroraNode.faces.map( f => {
              return [
                f.color.r, f.color.g, f.color.b,
                f.color.r, f.color.g, f.color.b,
                f.color.r, f.color.g, f.color.b,
              ]
            }).flat();

            //Color
            const colors32 = new Float32Array( colors );
            geometry.setAttribute( 'color', new THREE.BufferAttribute( colors32, 3 ) ); 
          }

          /*
          * This project has moved away from using Geometry.
          */
          
          //----------------//
          // BASIC GEOMETRY
          //----------------//
          // if(typeof geometry == 'undefined'){
          //   geometry = new Geometry();
          //   geometry.boundingBox = new THREE.Box3(auroraNode.boundingBox.min, auroraNode.boundingBox.max);
      
          //   geometry.vertices = [];
          //   for(let i = 0, len = auroraNode.vertices.length; i < len; i+=3){
          //     geometry.vertices.push(new THREE.Vector3(auroraNode.vertices[i], auroraNode.vertices[i+1], auroraNode.vertices[i+2]));
          //   }
          //   geometry.faces = auroraNode.faces || [];
          //   geometry.faceVertexUvs = [[],[]];
            
          //   //Base Texture UVs
          //   if(auroraNode.MDXDataBitmap & MDXFLAG.UV1){
          //     geometry.faceVertexUvs[0] = auroraNode.texCords[0];
          //     geometry.faceVertexUvs[1] = auroraNode.texCords[0];
          //   }

          //   //Lightmap UVs
          //   if(auroraNode.MDXDataBitmap & MDXFLAG.UV2){
          //     geometry.faceVertexUvs[1] = auroraNode.texCords[1];
          //   }

          //   //Colors
          //   if(auroraNode.MDXDataBitmap & MDXFLAG.COLOR){
          //     geometry.colors = auroraNode.colors;
          //   }
            
          //   //if(odysseyModel.modelHeader.Smoothing)
          //     //geometry.mergeVertices();
      
          //   geometry.verticesNeedUpdate = true;
          //   geometry.normalsNeedUpdate = true;
          //   geometry.uvsNeedUpdate = true;
          //   //geometry.computeBoundingBox();
          // }

          //-------------------------//
          // BEGIN: MATERIAL BUILDER
          //-------------------------//
          let material = OdysseyModel3D.NodeMaterialBuilder(odysseyModel, parentNode, auroraNode, options);

          //---------------------//
          // BEGIN: MESH BUILDER
          //---------------------//
    
          let mesh = undefined;

          //-----------//
          // SKIN MESH
          //-----------//
          if ((auroraNode.NodeType & NODETYPE.Skin) == NODETYPE.Skin) {
            (material as any).skinning = true;
            mesh = new THREE.SkinnedMesh( geometry , material );
            odysseyModel.skins.push(mesh);
          }

          //------------//
          // BASIC MESH
          //------------//
          if(!mesh && geometry && material)
            mesh = new THREE.Mesh( geometry , material );

          if(!mesh){
            console.error('OdysseyModel3D', 'Failed to generate mesh node', auroraNode);
          }

          (auroraNode as any).mesh = mesh;

          //Need to see if this affects memory usage
          mesh.odysseyModel = odysseyModel;

          // if((auroraNode.NodeType & NODETYPE.AABB) == NODETYPE.AABB && auroraNode instanceof OdysseyModelNodeAABB){
          //   odysseyModel.walkmesh = (mesh as THREE.Mesh);
          //   mesh.material.visible = false;
          // }
          
          //RenderOrder
          // if(auroraNode.BackgroundGeometry){
          //   mesh.renderOrder = 1000;
          // }else if(options.isChildrenDynamic){
          //   mesh.renderOrder = 5000;
          // }

          //----------------//
          // MERGE GEOMETRY
          //----------------//
          if(!((auroraNode.NodeType & NODETYPE.AABB) == NODETYPE.AABB) && !auroraNode.BackgroundGeometry && options.mergeStatic && auroraNode.roomStatic && auroraNode.faces.length){

            parentNode.getWorldPosition( mesh.position );
            parentNode.getWorldQuaternion( mesh.quaternion );
            mesh.updateMatrix(); // as needed

            //apply matrix to positions
            geometry.getAttribute('position').applyMatrix4( mesh.matrix );

            //apply matrix to normals
            let normalMatrix = new THREE.Matrix3().getNormalMatrix( mesh.matrix );
            geometry.getAttribute('normal').applyMatrix3( normalMatrix );
            geometry.normalizeNormals();

            if((auroraNode.NodeType & NODETYPE.Dangly) == NODETYPE.Dangly){
              odysseyModel.mergedDanglyGeometries.push(geometry);
              odysseyModel.mergedDanglyMaterials.push(material);
            }else{
              odysseyModel.mergedGeometries.push(geometry);
              odysseyModel.mergedMaterials.push(material);
            }

            //Unset the mesh variable so it can't be added to the node
            mesh = undefined;
          }
          
          //------------------//
          // ADD MESH TO NODE
          //------------------//
          if(mesh instanceof THREE.Mesh){

            //mesh.visible = !node.isWalkmesh;
            (mesh as any).auroraNode = auroraNode;
            mesh.matrixAutoUpdate = true;
            if(!((auroraNode.NodeType & NODETYPE.AABB) == NODETYPE.AABB) ){
              parentNode.add( mesh );
            }
            if(!((auroraNode.NodeType & NODETYPE.AABB) == NODETYPE.AABB)){
              mesh.castShadow = auroraNode.FlagShadow;// && !options.static;//options.castShadow;
              mesh.receiveShadow = options.receiveShadow;
            }

          }

        }

      }
      
    }catch(e){
      console.error('OdysseyModel3D failed to generate mesh', auroraNode, e);
    }
  };

  static NodeMaterialBuilder(odysseyModel: OdysseyModel3D, parentNode: THREE.Object3D, auroraNode: OdysseyModelNodeMesh, options: OdysseyModelLoaderOptions){
      
    let tMap1 = auroraNode.TextureMap1+'';
    let tMap2 = auroraNode.TextureMap2+'';
    let fallbackTexture = null;

    if(options.textureVar != '' && options.textureVar.indexOf('****') == -1){
      fallbackTexture = tMap1;
      tMap1 = options.textureVar;
    }

    if(tMap1 || tMap2){
      //auroraNode.Diffuse.r = auroraNode.Diffuse.g = auroraNode.Diffuse.b = 0.8;
    }
    let material: THREE.Material;
    if((auroraNode.NodeType & NODETYPE.AABB) == NODETYPE.AABB){
      material = new THREE.MeshBasicMaterial({
        vertexColors: true,
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
        // fog: odysseyModel.affectedByFog,
      });

      if(material instanceof THREE.ShaderMaterial){
        material.uniforms.shininess.value = 0.0000001;
        material.extensions.derivatives = true;
        //material.extensions.fragDepth = true;
        if(options.useTweakColor){
          material.uniforms.diffuse.value = new THREE.Color( auroraNode.Diffuse.r, auroraNode.Diffuse.g, auroraNode.Diffuse.b );
          material.uniforms.tweakColor.value.setRGB((options.tweakColor & 255)/255, ((options.tweakColor >> 8) & 255)/255, ((options.tweakColor >> 16) & 255)/255);
        }else{
          material.uniforms.tweakColor.value.setRGB(1, 1, 1);
          material.uniforms.diffuse.value = new THREE.Color( 1, 1, 1 );//auroraNode.Diffuse.r, auroraNode.Diffuse.g, auroraNode.Diffuse.b );
        }
        material.uniforms.time.value = options.context.time;
        material.defines = material.defines || {};
        material.defines.AURORA = "";

        if(options.isForceShield){
          material.defines.FORCE_SHIELD = "";
          material.defines.IGNORE_LIGHTING = "";
        }
      

        if(auroraNode.MDXDataBitmap & MDXFLAG.UV1 || 
          auroraNode.MDXDataBitmap & MDXFLAG.UV2 || 
          auroraNode.MDXDataBitmap & MDXFLAG.UV3 || 
          auroraNode.MDXDataBitmap & MDXFLAG.UV4 ||
          ((auroraNode.NodeType & NODETYPE.Saber) == NODETYPE.Saber)
          ){
          material.defines.USE_UV = "";
        }

        if(auroraNode.controllers.has(ControllerType.SelfIllumColor)){
          let selfIllumColor = auroraNode.controllers.get(ControllerType.SelfIllumColor);
          if(selfIllumColor.data[0].x || selfIllumColor.data[0].y || selfIllumColor.data[0].z){
            material.defines.SELFILLUMCOLOR = "";
            material.uniforms.selfIllumColor.value.copy(selfIllumColor.data[0]);
          }
        }
      }

      if(!auroraNode.FlagRender && !((auroraNode.NodeType & NODETYPE.AABB) == NODETYPE.AABB)){
        material.visible = false;
      }

      odysseyModel.materials.push(material);
      
      if(auroraNode.HasLightmap && tMap2.length){
        TextureLoader.enQueue(tMap2, material, TextureLoader.Type.LIGHTMAP);
      }

      if((!(auroraNode.MDXDataBitmap & MDXFLAG.TANGENT1) && 
        !(auroraNode.MDXDataBitmap & MDXFLAG.TANGENT2) && 
        !(auroraNode.MDXDataBitmap & MDXFLAG.TANGENT3) && 
        !(auroraNode.MDXDataBitmap & MDXFLAG.TANGENT4) &&
        !auroraNode.FlagShadow && !options.castShadow) || auroraNode.BackgroundGeometry || options.static){
          if(!options.lighting){
            material.defines.IGNORE_LIGHTING = "";
          }
      }

      if((auroraNode.NodeType & NODETYPE.Saber) == NODETYPE.Saber){
        material.defines.IGNORE_LIGHTING = "";
        material.defines.SABER = "";
      }

      if(options.isHologram){
        material.defines.HOLOGRAM = "";
        material.transparent = true;
        if(auroraNode.HideInHolograms){
          material.visible = false;
        }
      }

      if(material instanceof THREE.ShaderMaterial){
        //Set dangly uniforms
        if((auroraNode.NodeType & NODETYPE.Dangly) == NODETYPE.Dangly && auroraNode instanceof OdysseyModelNodeDangly) {
          material.uniforms.danglyDisplacement.value = auroraNode.danglyDisplacement;
          material.uniforms.danglyTightness.value = auroraNode.danglyTightness;
          material.uniforms.danglyPeriod.value = auroraNode.danglyPeriod;
          material.defines.DANGLY = '';
        }

        //Set animated uv uniforms
        if(auroraNode.nAnimateUV){
          material.uniforms.animatedUV.value.set(auroraNode.fUVDirectionX, auroraNode.fUVDirectionY, auroraNode.fUVJitter, auroraNode.fUVJitterSpeed);
          material.defines.ANIMATED_UV = '';
        }
      }

      if(auroraNode.Transparent){
        material.transparent = true;
      }

      auroraNode.controllers.forEach( (controller) => {
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
        TextureLoader.enQueue(tMap1, material, TextureLoader.Type.TEXTURE, undefined, fallbackTexture);
      }else{
        if(material instanceof THREE.ShaderMaterial){
          material.uniforms.diffuse.value.copy(auroraNode.Diffuse);
        }
      }

      material.needsUpdate = true;
    }
    return material;
  };

  static NodeLightBuilder(odysseyModel: OdysseyModel3D, parentNode: THREE.Object3D, auroraNode: OdysseyModelNodeLight, options: OdysseyModelLoaderOptions){

    auroraNode.color = new THREE.Color(0xFFFFFF);
    auroraNode.radius = 5.0;
    auroraNode.intensity = 1.0;
    auroraNode.multiplier = 1.0;
    //auroraNode.position = new THREE.Vector3();
    
    auroraNode.controllers.forEach( (controller) => {
      switch(controller.type){
        case ControllerType.Color:
          auroraNode.color = new THREE.Color(controller.data[0].x, controller.data[0].y, controller.data[0].z);
        break;
        case ControllerType.Position:
          //auroraNode.position.set(controller.data[0].x, controller.data[0].y, controller.data[0].z);
        break;
        case ControllerType.Radius:
          auroraNode.radius = controller.data[0].value;
        break;
        case ControllerType.Multiplier:
          auroraNode.multiplier = controller.data[0].value;
        break;
      }
    });

    //if(GameKey != "TSL"){
    //  auroraNode.intensity = auroraNode.intensity > 1 ? auroraNode.intensity * .01 : auroraNode.intensity;
    //}else{
      auroraNode.intensity = auroraNode.intensity * auroraNode.multiplier;// > 1 ? auroraNode.intensity * .01 : auroraNode.intensity;
    //}

    if(!options.manageLighting){
      let lightNode: THREE.Light;
      if(auroraNode.AmbientFlag){
        lightNode = new THREE.AmbientLight( auroraNode.color );
        lightNode.intensity = auroraNode.multiplier * 0.5;
      }else{
        //lightNode = new THREE.PointLight( auroraNode.color, auroraNode.intensity, auroraNode.radius * 100 );
        lightNode = new THREE.PointLight( auroraNode.color, 1, auroraNode.radius * auroraNode.multiplier, 1 );
        (lightNode.shadow.camera as any).far = auroraNode.radius;
        //lightNode.distance = radius;
        lightNode.position.copy(auroraNode.position);
      }
      lightNode.userData = {
        decay: 1,
        controllers: auroraNode.controllers,
        helper: { visiable: false },
      }
      // lightNode.decay = 1;
      lightNode.visible = true;
      // lightNode.controllers = auroraNode.controllers;
      // lightNode.helper = {visible:false};
    
      //odysseyModel.lights.push(lightNode);
      auroraNode.light = lightNode;
      parentNode.add(lightNode);
      OdysseyModel3D.NodeLensflareBuilder(odysseyModel, lightNode, auroraNode, options);
    }else{
      let lightNode: OdysseyLight3D;
      lightNode = new OdysseyLight3D(auroraNode);
      lightNode.isAnimated = !auroraNode.roomStatic;
      //if(!auroraNode.AmbientFlag){
        lightNode.position.copy(auroraNode.position);
      //}
      //auroraNode.light = lightNode;
      parentNode.add(lightNode);

      lightNode.parentUUID = odysseyModel.uuid;
      lightNode.odysseyModel = odysseyModel;
  
      lightNode.auroraNode = auroraNode;
  
      lightNode.priority = auroraNode.LightPriority;
      lightNode.isAmbient = auroraNode.AmbientFlag ? true : false;
      lightNode.isDynamic = auroraNode.DynamicFlag ? true : false;
      lightNode.affectDynamic = auroraNode.AffectDynamicFlag ? true : false;
      lightNode.castShadow = auroraNode.ShadowFlag ? true : false;
      lightNode.genFlare = auroraNode.GenerateFlareFlag ? true : false;
      lightNode.isFading = auroraNode.FadingLightFlag;
      lightNode.maxIntensity = auroraNode.intensity;
      lightNode.color = auroraNode.color;
      OdysseyModel3D.NodeLensflareBuilder(odysseyModel, lightNode, auroraNode, options);
      LightManager.addLight(lightNode);
    }
  };

  static NodeLensflareBuilder(odysseyModel: OdysseyModel3D, parentNode: THREE.Object3D, auroraNode: OdysseyModelNodeLight, options: OdysseyModelLoaderOptions){
    if(auroraNode.flare.radius){
      let lensFlare = new Lensflare();

      for(let i = 0, len = auroraNode.flare.textures.length; i < len; i++){
        TextureLoader.enQueue(auroraNode.flare.textures[i], null, TextureLoader.Type.TEXTURE, (texture, tex) => {
          lensFlare.addElement( new LensflareElement( texture, auroraNode.flare.sizes[i],  auroraNode.flare.positions[i],  auroraNode.flare.colorShifts[i] ) );
        });
      }

      if(!options.manageLighting){
        //parentNode.add(lensFlare);
      }else{
        (parentNode as any).lensFlare = lensFlare;
      }
    }
  }

};
