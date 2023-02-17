/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as THREE from "three";
import { OdysseyModel, OdysseyModelAnimation, OdysseyModelAnimationManager, OdysseyModelNode, OdysseyModelNodeAABB, OdysseyModelNodeDangly, OdysseyModelNodeEmitter, OdysseyModelNodeLight, OdysseyModelNodeMesh, OdysseyModelNodeReference, OdysseyModelNodeSaber, OdysseyModelNodeSkin, OdysseyWalkMesh } from "../../odyssey";
import { GameState } from "../../GameState";
import { ModuleCreature, ModuleRoom } from "../../module";
import { OdysseyEmitter3D, OdysseyLight3D, OdysseyObject3D } from "./";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";
import { OdysseyTexture } from "../../resource/OdysseyTexture";
import { TwoDAManager } from "../../managers/TwoDAManager";
import { LightManager } from "../../managers/LightManager";
import { PartyManager } from "../../managers/PartyManager";
import { TextureLoader } from "../../loaders/TextureLoader";
import { TextureType } from "../../enums/loaders/TextureType";
import { OdysseyModelControllerType } from "../../interface/odyssey/OdysseyModelControllerType";
import { OdysseyModelNodeType } from "../../interface/odyssey/OdysseyModelNodeType";
import { OdysseyModelMDXFlag } from "../../interface/odyssey/OdysseyModelMDXFlag";
import { OdysseyModelClass } from "../../interface/odyssey/OdysseyModelClass";
import { ShaderManager } from "../../managers/ShaderManager";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils";
import { OdysseyController } from "../../odyssey/controllers";

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
  onComplete?: Function,
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

  skins: THREE.SkinnedMesh[] = [];
  forceShieldGeometry: any[] = [];

  //Beta AnimationManager
  animationManager: OdysseyModelAnimationManager = new OdysseyModelAnimationManager(this);

  wasOffscreen = false;
  animateFrame = true;

  nodes: Map<string, OdysseyObject3D> = new Map<string, OdysseyObject3D>();

  animNodeCache: {[key: string]: OdysseyObject3D} = {

  }; 

  talkdummy: OdysseyObject3D;
  cutscenedummy: OdysseyObject3D;  
  rootdummy: OdysseyObject3D;
  headhook: OdysseyObject3D;
  camerahook: OdysseyObject3D;  
  camerahookm: OdysseyObject3D;  
  camerahookf: OdysseyObject3D;  
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
  modelHeader: any = {};
  affectedByFog: boolean;
  options: any = {};
  oldAnim: OdysseyModelAnimation;
  mergedGeometries: any[];
  mergedDanglyGeometries: any[];
  mergedMaterials: any[];
  mergedDanglyMaterials: any[];
  mergedBufferGeometry: THREE.BufferGeometry;
  mergedMesh: THREE.Mesh;
  mergedBufferDanglyGeometry: THREE.BufferGeometry;
  mergedDanglyMesh: THREE.Mesh;
  walkmesh: THREE.Mesh;
  wok: OdysseyWalkMesh;
  animLoops: OdysseyModelAnimation[] = [];
  hasCollision: boolean;
  animLoop: any;

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

    if((GameState.debug as any).disableAnimation) return;

    //BEGIN: Animation Optimization
    this.animateFrame = true;
    if(this.userData.moduleObject instanceof ModuleCreature){
      //If the object is further than 50 meters, animate every other frame
      if(this.userData.moduleObject.distanceToCamera > 50){
        this.animateFrame = this.oddFrame;
      }
      
      if(this.animateFrame){
        //If we can animate and there is fog, make sure the distance isn't greater than the far point of the fog effect
        if(PartyManager.party.indexOf(this.userData.moduleObject) == -1 && this.context.scene.fog){
          if(this.userData.moduleObject.distanceToCamera >= this.context.scene.fog.far){
            this.animateFrame = false;
            //If the object is past the near point, and the near point is greater than zero, animate every other frame
          }else if(this.context.scene.fog.near && this.userData.moduleObject.distanceToCamera >= this.context.scene.fog.near){
            this.animateFrame = this.oddFrame;
          }
        }
      }

    }

    if(!(this.userData.moduleObject instanceof ModuleRoom)){
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
      if(material instanceof THREE.ShaderMaterial){
        if(material.type == 'ShaderMaterial'){
          material.uniforms.time.value = this.context.deltaTime;
        }
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

  playAnimation(anim: OdysseyModelAnimation|string|number, loop: boolean = false){
    const state: any = {
      loop: loop,
      blend: true,
      cFrame: 0,
      elapsed: 0,
      transElapsed: 0,
      lastTime: 0,
      delta: 0,
      lastEvent: -1,
      events: []
    };
    
    if(typeof anim === 'number'){
      this.animationManager.setCurrentAnimation(this.odysseyAnimations[anim], state);
    }else if(typeof anim === 'string'){
      this.animationManager.setCurrentAnimation(this.getAnimationByName(anim), state);
    }else{
      this.animationManager.setCurrentAnimation(anim, state);
    }

    if(typeof this.animationManager.currentAnimation != 'undefined'){
      if(!this.animationManager.lastAnimation){
        this.animationManager.setLastAnimation( this.animationManager.currentAnimation, state )
      }

      const animations2DA = TwoDAManager.datatables.get('animations');
      for(let i = 0, len = animations2DA.rows.length; i < len; i++){
        if(animations2DA.rows[i].name == this.animationManager.currentAnimation.name){
          this.animationManager.currentAnimationState.animation = animations2DA.rows[i];
          break;
        }
      }
      return this.animationManager.currentAnimation;
    }
    return undefined;
  }

  stopAnimation(){
    this.animationManager.stopAnimation();
  }

  getAnimationByName(name = ''): OdysseyModelAnimation {
    for(let i = 0; i < this.odysseyAnimations.length; i++){
      if(this.odysseyAnimations[i].name == name)
        return this.odysseyAnimations[i];
    }
  }

  getAnimationName(): string {
    if(typeof this.animationManager.currentAnimation !== 'undefined'){
      return this.animationManager.currentAnimation.name;
    }
    return undefined;
  }

  buildSkeleton(){
    this.bonesInitialized = false;
    this.oldAnim = this.animationManager.currentAnimation;
    this.animationManager.currentAnimation = undefined;
    this.pose();

    for(let i = 0; i < this.skins.length; i++){
      let skinNode = this.skins[i] as any;
      if(typeof skinNode.odysseyNode.bone_parts !== 'undefined'){
        let bones = [];
        let inverses = [];
        let parts = Array.from(this.nodes.values());
        for(let j = 0; j < skinNode.odysseyNode.bone_parts.length; j++){
          let boneNode = parts[skinNode.odysseyNode.bone_parts[j]];
          if(typeof boneNode != 'undefined'){
            bones[j] = boneNode;
            inverses[j] = skinNode.odysseyNode.bone_inverse_matrix[j];
          }
        }
        skinNode.geometry.bones = bones;
        skinNode.bind(new THREE.Skeleton( bones as any, inverses ));
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
          (node as any).controllers.forEach( (controller: OdysseyControllerGeneric) => {
            if(controller.data.length){
              switch(controller.type){
                case OdysseyModelControllerType.Position:
                  node.position.set(controller.data[0].x, controller.data[0].y, controller.data[0].z);
                break;
                case OdysseyModelControllerType.Orientation:
                  node.quaternion.set(controller.data[0].x, controller.data[0].y, controller.data[0].z, controller.data[0].w);
                break;
                case OdysseyModelControllerType.Scale:
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

      if(typeof this.userData.moduleObject == 'object' && typeof this.userData.moduleObject.playEvent == 'function'){
        this.userData.moduleObject.playEvent(event);
      }
    }

  }

  poseAnimationNode(anim: any, node: any){

    if(!this.bonesInitialized)
      return;

    let modelNode = this.nodes.get(node.name);

    if(typeof modelNode != 'undefined'){
      modelNode.controllers.forEach( (controller: OdysseyController) => {
      //for(let cIDX in node.controllers){

        //let controller = node.controllers[cIDX];
          
        let data = controller.data[0];
        switch(controller.type){
          case OdysseyModelControllerType.Position:
            let offsetX = 0;
            let offsetY = 0;
            let offsetZ = 0;
            if(typeof modelNode.controllers.get(OdysseyModelControllerType.Position) != 'undefined'){
              offsetX = modelNode.controllers.get(OdysseyModelControllerType.Position).data[0].x;
              offsetY = modelNode.controllers.get(OdysseyModelControllerType.Position).data[0].y;
              offsetZ = modelNode.controllers.get(OdysseyModelControllerType.Position).data[0].z;
            }
            modelNode.position.set((data.x + offsetX) * this.Scale, (data.y + offsetY) * this.Scale, (data.z + offsetZ) * this.Scale);

          break;
          case OdysseyModelControllerType.Orientation:
            let offsetQX = 0;
            let offsetQY = 0;
            let offsetQZ = 0;
            let offsetQW = 1;
            if(typeof modelNode.controllers.get(OdysseyModelControllerType.Orientation) != 'undefined'){  
              offsetQX = modelNode.controllers.get(OdysseyModelControllerType.Orientation).data[0].x;
              offsetQY = modelNode.controllers.get(OdysseyModelControllerType.Orientation).data[0].y;
              offsetQZ = modelNode.controllers.get(OdysseyModelControllerType.Orientation).data[0].z;
              offsetQW = modelNode.controllers.get(OdysseyModelControllerType.Orientation).data[0].w;
            }
            if(data.x == 0 && data.y == 0 && data.z == 0 && data.w == 1){
              data.x = offsetQX;
              data.y = offsetQY;
              data.z = offsetQZ;
              data.w = offsetQW;
            }

            modelNode.quaternion.set(data.x, data.y, data.z, data.w);
          break;
          case OdysseyModelControllerType.SelfIllumColor:
            if(modelNode.userData.mesh){
              if(modelNode.userData.mesh.material instanceof THREE.ShaderMaterial){
                modelNode.userData.mesh.material.uniforms.selfIllumColor.value.setRGB(
                  data.x, 
                  data.y, 
                  data.z
                );
                modelNode.userData.mesh.material.defines.SELFILLUMCOLOR = "";
              }else{
                modelNode.userData.mesh.material.emissive.setRGB(
                  data.x, 
                  data.y, 
                  data.z
                );
              }
            }
          break;
          case OdysseyModelControllerType.Color:
            if ((modelNode.odysseyModelNode.NodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
              (modelNode.odysseyModelNode as OdysseyModelNodeLight).color.setRGB(
                data.x, 
                data.y, 
                data.z
              );
            }
          break;
          case OdysseyModelControllerType.Multiplier:
            if ((modelNode.odysseyModelNode.NodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
              (modelNode.odysseyModelNode as OdysseyModelNodeLight).multiplier = data.value;
            }
          break;
          case OdysseyModelControllerType.Radius:
            if ((modelNode.odysseyModelNode.NodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
              (modelNode.odysseyModelNode as OdysseyModelNodeLight).radius = data.value;
            }
          break;
        }

      });
      modelNode.updateMatrix();
      if(modelNode.userData.mesh){
        modelNode.userData.mesh.geometry.computeBoundingSphere();
      }

    }

  }

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
        fragmentShader: THREE.ShaderLib.odyssey.fragmentShader,
        vertexShader: THREE.ShaderLib.odyssey.vertexShader,
        uniforms: THREE.UniformsUtils.merge([THREE.ShaderLib.odyssey.uniforms]),
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
        skinMaterial.userData.shield = shieldTexName;
        TextureLoader.enQueue(shieldTexName, skinMaterial, TextureType.TEXTURE);
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

  traverseIgnore( ignoreName: string = '', callback?: Function ){

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
    const supermodel: OdysseyModel = await GameState.ModelLoader.load(resref);
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

  static async FromMDL(model: OdysseyModel, _options: OdysseyModelLoaderOptions = {} as OdysseyModelLoaderOptions): Promise<OdysseyModel3D> {
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

            odysseyModel.mergedBufferGeometry = BufferGeometryUtils.mergeBufferGeometries(odysseyModel.mergedGeometries, true);
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

            odysseyModel.mergedBufferDanglyGeometry = BufferGeometryUtils.mergeBufferGeometries(odysseyModel.mergedDanglyGeometries, true);
            odysseyModel.mergedDanglyMesh = new THREE.Mesh(odysseyModel.mergedBufferDanglyGeometry, odysseyModel.mergedDanglyMaterials);
            //odysseyModel.mergedDanglyMesh.receiveShadow = true;
            odysseyModel.add(odysseyModel.mergedDanglyMesh);

            for(let i = 0, len = odysseyModel.mergedDanglyGeometries.length; i < len; i++){
              odysseyModel.mergedDanglyGeometries[i].dispose();
            }
            odysseyModel.mergedDanglyGeometries = [];

          }

          //Prune all the empty nodes 
          let pruneList: any = [];
          odysseyModel.traverseIgnore(odysseyModel.name+'a', (node: any) => {
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

        odysseyModel.box.setFromArray([
          model.modelHeader.BoundingMinX,
          model.modelHeader.BoundingMinY,
          model.modelHeader.BoundingMinZ,
          model.modelHeader.BoundingMaxX,
          model.modelHeader.BoundingMaxY,
          model.modelHeader.BoundingMaxZ,
        ]);

        if(typeof _options.onComplete === 'function') _options.onComplete(odysseyModel);
        resolve(odysseyModel);
      }else{
        if(typeof _options.onComplete === 'function') _options.onComplete();
        reject('model is not of type OdysseyModel');
      }
    });

  }

  static NodeParser(odysseyModel: OdysseyModel3D, parentNode: THREE.Object3D, odysseyNode: OdysseyModelNode, options: OdysseyModelLoaderOptions){

    //Skip over LightMap Omnilight and Spotlight references because they are blank nodes
    //Don't know if this will have any side effects yet
    if(odysseyNode.name.toLowerCase().indexOf('lmomnilight') >= 0 || odysseyNode.name.toLowerCase().indexOf('lmspotlight') >= 0){
      return;
    }

    let node = new OdysseyObject3D(odysseyNode);
    node.NodeType = odysseyNode.NodeType;

    if((odysseyNode.NodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB){
      odysseyModel.aabb = odysseyNode;
    }

    node.controllers = odysseyNode.controllers;
    
    if(odysseyNode.controllers.has(OdysseyModelControllerType.Orientation)){
      node.controllerHelpers.hasOrientation = true;
      node.controllerHelpers.orientation = odysseyNode.controllers.get(OdysseyModelControllerType.Orientation);
    }

    if(odysseyNode.controllers.has(OdysseyModelControllerType.Position)){
      node.controllerHelpers.hasPosition = true;
      node.controllerHelpers.position = odysseyNode.controllers.get(OdysseyModelControllerType.Position);
    }

    if(odysseyNode.controllers.has(OdysseyModelControllerType.Scale)){
      node.controllerHelpers.hasScale = true;
      node.controllerHelpers.scale = odysseyNode.controllers.get(OdysseyModelControllerType.Scale);
    }

    node.position.set(odysseyNode.position.x, odysseyNode.position.y, odysseyNode.position.z);
    node.quaternion.set(odysseyNode.quaternion.x, odysseyNode.quaternion.y, odysseyNode.quaternion.z, odysseyNode.quaternion.w);

    node.name = odysseyNode.name.toLowerCase();

    if(node.name == odysseyModel.name.toLowerCase()+'a'){
      options.isChildrenDynamic = true;
    }

    if(!odysseyModel.nodes.has(node.name))
      odysseyModel.nodes.set(node.name, node);

    parentNode.add(node);

    //-----------//
    // MESH NODE
    //-----------//
    if ((odysseyNode.NodeType & OdysseyModelNodeType.Mesh) == OdysseyModelNodeType.Mesh && odysseyNode instanceof OdysseyModelNodeMesh) {
      OdysseyModel3D.NodeMeshBuilder(odysseyModel, node, odysseyNode, options);  
    }

    //------------//
    // LIGHT NODE
    //------------//
    if ((odysseyNode.NodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light && odysseyNode instanceof OdysseyModelNodeLight) {
      OdysseyModel3D.NodeLightBuilder(odysseyModel, node, odysseyNode, options);      
    }

    if ((odysseyNode.NodeType & OdysseyModelNodeType.Emitter) == OdysseyModelNodeType.Emitter && odysseyNode instanceof OdysseyModelNodeEmitter) {
      let emitter = new OdysseyEmitter3D(odysseyNode);
      emitter.context = odysseyModel.context;
      emitter.name = odysseyNode.name + '_em'
      node.emitter = emitter;
      node.add(emitter);
      odysseyModel.emitters.push(emitter);
    }

    if((odysseyNode.NodeType & OdysseyModelNodeType.Reference) == OdysseyModelNodeType.Reference && odysseyNode instanceof OdysseyModelNodeReference){
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
      case 'camerahookm':
        odysseyModel.camerahookm = node;  
      break;
      case 'camerahookf':
        odysseyModel.camerahookf = node;  
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
      for(let i = 0; i < odysseyNode.childNodes.length; i++){
        OdysseyModel3D.NodeParser(odysseyModel, node, odysseyNode.childNodes[i], options);
      }
    }

    return node;

  };

  static NodeMeshBuilder(odysseyModel: OdysseyModel3D, parentNode: THREE.Object3D, odysseyNode: OdysseyModelNodeMesh|OdysseyModelNodeDangly|OdysseyModelNodeSkin|OdysseyModelNodeAABB|OdysseyModelNodeSaber, options: OdysseyModelLoaderOptions){
    try{
      //Create geometry only if the mesh is visible or it is a walkmesh

      //Make sure there is at least one face before we attempt to build the mesh
      if(odysseyNode.faces.length ){

        //Optimization: Only create a mesh if it is actually rendered. Ignore this for placeable models
        //This breaks shadows because the original game uses the bones of the model to cast shadows. 
        //This can possibly be remedied by setting skin meshes to cast shadows.
        if(odysseyNode.FlagRender || (odysseyModel.modelHeader.Classification == OdysseyModelClass.PLACEABLE)){

          //-------------------------//
          // BEGIN: GEOMETRY BUILDER
          //-------------------------//

          let geometry = undefined;
          
          //-------------------//
          // BUFFERED GEOMETRY
          //-------------------//
          if ((odysseyNode.NodeType & OdysseyModelNodeType.AABB) != OdysseyModelNodeType.AABB) {

            geometry = new THREE.BufferGeometry();
            geometry.setIndex(odysseyNode.indices); //Works with indices

            //Positions
            geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( odysseyNode.vertices, 3 ) ); //Works with indices

            //Normals
            // const normals = new Float32Array( odysseyNode.normals.length ); //Works with indices
            geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( odysseyNode.normals, 3 ) );//.copyArray( odysseyNode.normals ) ); //Works with indices

            //Color
            // // const color = new Float32Array( odysseyNode.vertices.length ); //Works with indices
            // geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( odysseyNode.vertices, 3 ) );//.copyArray( new Array(odysseyNode.vertices.length).fill(1, 0, odysseyNode.vertices.length) ) ); //Works with indices
            
            //UV1
            // const uv1 = new Float32Array( odysseyNode.tvectors[0].length ); //Works with indices
            geometry.setAttribute(  'uv', new THREE.Float32BufferAttribute( odysseyNode.tvectors[0], 2 ) );//.copyArray( odysseyNode.tvectors[0] ) ); //Works with indices
            
            //UV2
            // const uv2 = new Float32Array( odysseyNode.tvectors[1].length ); //Works with indices
            geometry.setAttribute( 'uv2', new THREE.Float32BufferAttribute( odysseyNode.tvectors[1], 2 ) );//.copyArray( odysseyNode.tvectors[1] ) ); //Works with indices
            
            //--------------------------//
            // SKIN GEOMETRY ATTRIBUTES
            //--------------------------//
            if((odysseyNode.NodeType & OdysseyModelNodeType.Skin) == OdysseyModelNodeType.Skin){
              //Skin Index
              // const boneIdx = Float32Array.from((odysseyNode as OdysseyModelNodeSkin).boneIdx);
              geometry.setAttribute( 'skinIndex', new THREE.Float32BufferAttribute( (odysseyNode as OdysseyModelNodeSkin).boneIdx, 4 ) )

              //Skin Weight
              // const weights = Float32Array.from((odysseyNode as OdysseyModelNodeSkin).weights);
              geometry.setAttribute( 'skinWeight', new THREE.Float32BufferAttribute( (odysseyNode as OdysseyModelNodeSkin).weights, 4 ) );
            }

            //----------------------------//
            // DANGLY GEOMETRY ATTRIBUTES
            //----------------------------//
            if((odysseyNode.NodeType & OdysseyModelNodeType.Dangly) == OdysseyModelNodeType.Dangly){
              //Contstraint
              // const constraints = new Float32Array( (odysseyNode as OdysseyModelNodeDangly).danglyVec4.length ); //Works with indices
              geometry.setAttribute( 'constraint', new THREE.Float32BufferAttribute( (odysseyNode as OdysseyModelNodeDangly).danglyVec4, 4 ) );//.copyArray( (odysseyNode as OdysseyModelNodeDangly).danglyVec4 ) ); //Works with indices
            }
            
            //Compute Geometry Tangents
            if((odysseyNode.NodeType & OdysseyModelNodeType.Saber) != OdysseyModelNodeType.Saber){
              // BufferGeometryUtils.computeTangents(geometry);
            }
            
          }else{
            geometry = new THREE.BufferGeometry();

            const vertices = odysseyNode.faces.map( f => {
              return [
                odysseyNode.vertices[(f.a * 3) + 0], odysseyNode.vertices[(f.a * 3) + 1], odysseyNode.vertices[(f.a * 3) + 2],
                odysseyNode.vertices[(f.b * 3) + 0], odysseyNode.vertices[(f.b * 3) + 1], odysseyNode.vertices[(f.b * 3) + 2],
                odysseyNode.vertices[(f.c * 3) + 0], odysseyNode.vertices[(f.c * 3) + 1], odysseyNode.vertices[(f.c * 3) + 2],
              ]
            }).flat();

            //Positions
            // const vertices32 = new Float32Array( vertices );
            geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );

            const normals = odysseyNode.faces.map( f => {
              return [ f.normal.x, f.normal.y, f.normal.z ]
            }).flat();

            //Normals
            // const normals32 = new Float32Array( normals );
            geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );

            const colors = odysseyNode.faces.map( f => {
              return [
                f.color.r, f.color.g, f.color.b,
                f.color.r, f.color.g, f.color.b,
                f.color.r, f.color.g, f.color.b,
              ]
            }).flat();

            //Color
            // const colors32 = new Float32Array( colors );
            geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) ); 
          }

          /*
          * This project has moved away from using Geometry.
          */
          
          //----------------//
          // BASIC GEOMETRY
          //----------------//
          // if(typeof geometry == 'undefined'){
          //   geometry = new Geometry();
          //   geometry.boundingBox = new THREE.Box3(odysseyNode.boundingBox.min, odysseyNode.boundingBox.max);
      
          //   geometry.vertices = [];
          //   for(let i = 0, len = odysseyNode.vertices.length; i < len; i+=3){
          //     geometry.vertices.push(new THREE.Vector3(odysseyNode.vertices[i], odysseyNode.vertices[i+1], odysseyNode.vertices[i+2]));
          //   }
          //   geometry.faces = odysseyNode.faces || [];
          //   geometry.faceVertexUvs = [[],[]];
            
          //   //Base Texture UVs
          //   if(odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV1){
          //     geometry.faceVertexUvs[0] = odysseyNode.texCords[0];
          //     geometry.faceVertexUvs[1] = odysseyNode.texCords[0];
          //   }

          //   //Lightmap UVs
          //   if(odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV2){
          //     geometry.faceVertexUvs[1] = odysseyNode.texCords[1];
          //   }

          //   //Colors
          //   if(odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.COLOR){
          //     geometry.colors = odysseyNode.colors;
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
          let material = OdysseyModel3D.NodeMaterialBuilder(odysseyModel, parentNode, odysseyNode, options);

          //---------------------//
          // BEGIN: MESH BUILDER
          //---------------------//
    
          let mesh = undefined;

          //-----------//
          // SKIN MESH
          //-----------//
          if ((odysseyNode.NodeType & OdysseyModelNodeType.Skin) == OdysseyModelNodeType.Skin) {
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
            console.error('OdysseyModel3D', 'Failed to generate mesh node', odysseyNode);
          }

          //Need to see if this affects memory usage
          mesh.userData.odysseyModel = odysseyModel;

          // if((odysseyNode.NodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB && odysseyNode instanceof OdysseyModelNodeAABB){
          //   odysseyModel.walkmesh = (mesh as THREE.Mesh);
          //   mesh.material.visible = false;
          // }
          
          //RenderOrder
          // if(odysseyNode.BackgroundGeometry){
          //   mesh.renderOrder = 1000;
          // }else if(options.isChildrenDynamic){
          //   mesh.renderOrder = 5000;
          // }

          //----------------//
          // MERGE GEOMETRY
          //----------------//
          if(!((odysseyNode.NodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB) && !odysseyNode.BackgroundGeometry && options.mergeStatic && odysseyNode.roomStatic && odysseyNode.faces.length){

            parentNode.getWorldPosition( mesh.position );
            parentNode.getWorldQuaternion( mesh.quaternion );
            mesh.updateMatrix(); // as needed

            //apply matrix to positions
            geometry.getAttribute('position').applyMatrix4( mesh.matrix );

            //apply matrix to normals
            let normalMatrix = new THREE.Matrix3().getNormalMatrix( mesh.matrix );
            geometry.getAttribute('normal').applyNormalMatrix( normalMatrix );
            geometry.normalizeNormals();

            if((odysseyNode.NodeType & OdysseyModelNodeType.Dangly) == OdysseyModelNodeType.Dangly){
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
            (mesh as any).odysseyNode = odysseyNode;
            mesh.matrixAutoUpdate = true;
            if(!((odysseyNode.NodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB) ){
              parentNode.add( mesh );
              parentNode.userData.mesh = mesh;
            }
            if(!((odysseyNode.NodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB)){
              mesh.castShadow = odysseyNode.FlagShadow;// && !options.static;//options.castShadow;
              mesh.receiveShadow = options.receiveShadow;
            }

            if(odysseyNode.HasLightmap && options.manageLighting){
              // mesh.onBeforeRender = (renderer, scene, camera, geometry, material: THREE.ShaderMaterial, group) => {
              //   if(material.type == "ShaderMaterial"){
              //     (material.uniforms.pointLights as any).properties.animated = {} as any;
              //     let odysseyLight: OdysseyLight3D;
              //     for(let i = 0, len = LightManager.lights.length; i < len; i++){
              //       odysseyLight = LightManager.lights[i];
              //       if(odysseyLight.isAnimated){
              //         let light = material.uniforms.pointLights.value.findIndex( (light: THREE.PointLight) => {
              //           return light.position.equals(odysseyLight.worldPosition);
              //         });
              //         if(light >= 0){
              //           material.uniforms.pointLights.value[i].animated = 1;
              //         }
              //       }else{
              //         material.uniforms.pointLights.value[i].animated = 0;
              //       }
              //     }
              //     // console.log(renderer, camera, material, LightManager);
              //   }
              // }
            }

          }

        }

      }
      
    }catch(e){
      console.error('OdysseyModel3D failed to generate mesh', odysseyNode, e);
    }
  };

  static NodeMaterialBuilder(odysseyModel: OdysseyModel3D, parentNode: THREE.Object3D, odysseyNode: OdysseyModelNodeMesh, options: OdysseyModelLoaderOptions){
      
    let tMap1 = odysseyNode.TextureMap1+'';
    let tMap2 = odysseyNode.TextureMap2+'';
    let fallbackTexture = null;

    if(options.textureVar != '' && options.textureVar.indexOf('****') == -1){
      fallbackTexture = tMap1;
      tMap1 = options.textureVar;
    }

    if(tMap1 || tMap2){
      //odysseyNode.Diffuse.r = odysseyNode.Diffuse.g = odysseyNode.Diffuse.b = 0.8;
    }
    let material: THREE.Material;
    if((odysseyNode.NodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB){
      material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        fog: false,
        side: THREE.FrontSide,
      });
    }else{
      material = new THREE.ShaderMaterial({
        fragmentShader: THREE.ShaderLib.odyssey.fragmentShader,
        vertexShader: THREE.ShaderLib.odyssey.vertexShader,
        uniforms: THREE.UniformsUtils.merge([THREE.ShaderLib.odyssey.uniforms]),
        side: THREE.FrontSide,
        lights: true,
        fog: odysseyModel.affectedByFog,
      });

      if(material instanceof THREE.ShaderMaterial){
        material.uniforms.shininess.value = 0.0000001;
        material.extensions.derivatives = true;
        //material.extensions.fragDepth = true;
        if(options.useTweakColor){
          material.uniforms.diffuse.value = new THREE.Color( odysseyNode.Diffuse.r, odysseyNode.Diffuse.g, odysseyNode.Diffuse.b );
          material.uniforms.tweakColor.value.setRGB((options.tweakColor & 255)/255, ((options.tweakColor >> 8) & 255)/255, ((options.tweakColor >> 16) & 255)/255);
        }else{
          material.uniforms.tweakColor.value.setRGB(1, 1, 1);
          material.uniforms.diffuse.value = new THREE.Color( 1, 1, 1 );//odysseyNode.Diffuse.r, odysseyNode.Diffuse.g, odysseyNode.Diffuse.b );
        }
        material.uniforms.time.value = options?.context?.time || 0;
        material.defines = material.defines || {};
        material.defines.AURORA = "";

        if(options.isForceShield){
          material.defines.FORCE_SHIELD = "";
          material.defines.IGNORE_LIGHTING = "";
        }
      

        if(odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV1 || 
          odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV2 || 
          odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV3 || 
          odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV4 ||
          ((odysseyNode.NodeType & OdysseyModelNodeType.Saber) == OdysseyModelNodeType.Saber)
          ){
          material.defines.USE_UV = "";
        }

        if(odysseyNode.controllers.has(OdysseyModelControllerType.SelfIllumColor)){
          let selfIllumColor = odysseyNode.controllers.get(OdysseyModelControllerType.SelfIllumColor);
          if(selfIllumColor.data[0].x || selfIllumColor.data[0].y || selfIllumColor.data[0].z){
            material.defines.SELFILLUMCOLOR = "";
            material.uniforms.selfIllumColor.value.copy(selfIllumColor.data[0]);
          }
        }
      }

      if(!odysseyNode.FlagRender && !((odysseyNode.NodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB)){
        material.visible = false;
      }

      odysseyModel.materials.push(material);
      
      if(odysseyNode.HasLightmap && tMap2.length){
        material.userData.lightmap = tMap2;
        TextureLoader.enQueue(tMap2, material, TextureType.LIGHTMAP);
      }

      if((!(odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT1) && 
        !(odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT2) && 
        !(odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT3) && 
        !(odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT4) &&
        !odysseyNode.FlagShadow && !options.castShadow) || odysseyNode.BackgroundGeometry || options.static){
          if(!options.lighting){
            material.defines.IGNORE_LIGHTING = "";
          }
      }

      if((odysseyNode.NodeType & OdysseyModelNodeType.Saber) == OdysseyModelNodeType.Saber){
        material.defines.IGNORE_LIGHTING = "";
        material.defines.SABER = "";
      }

      if(options.isHologram){
        material.defines.HOLOGRAM = "";
        material.transparent = true;
        if(odysseyNode.HideInHolograms){
          material.visible = false;
        }
      }

      if(material instanceof THREE.ShaderMaterial){
        //Set dangly uniforms
        if((odysseyNode.NodeType & OdysseyModelNodeType.Dangly) == OdysseyModelNodeType.Dangly && odysseyNode instanceof OdysseyModelNodeDangly) {
          material.uniforms.danglyDisplacement.value = odysseyNode.danglyDisplacement;
          material.uniforms.danglyTightness.value = odysseyNode.danglyTightness;
          material.uniforms.danglyPeriod.value = odysseyNode.danglyPeriod;
          material.defines.DANGLY = '';
        }

        //Set animated uv uniforms
        if(odysseyNode.nAnimateUV){
          material.uniforms.animatedUV.value.set(odysseyNode.fUVDirectionX, odysseyNode.fUVDirectionY, odysseyNode.fUVJitter, odysseyNode.fUVJitterSpeed);
          material.defines.ANIMATED_UV = '';
        }
      }

      if(odysseyNode.Transparent){
        material.transparent = true;
      }

      odysseyNode.controllers.forEach( (controller) => {
        switch(controller.type){
          case OdysseyModelControllerType.Alpha:

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
        material.userData.map = tMap1;
        TextureLoader.enQueue(tMap1, material, TextureType.TEXTURE, undefined, fallbackTexture);
      }else{
        if(material instanceof THREE.ShaderMaterial){
          material.uniforms.diffuse.value.copy(odysseyNode.Diffuse);
        }
      }

      material.needsUpdate = true;
    }
    return material;
  };

  static NodeLightBuilder(odysseyModel: OdysseyModel3D, parentNode: THREE.Object3D, odysseyNode: OdysseyModelNodeLight, options: OdysseyModelLoaderOptions){

    odysseyNode.color = new THREE.Color(0xFFFFFF);
    odysseyNode.radius = 5.0;
    odysseyNode.intensity = 1.0;
    odysseyNode.multiplier = 1.0;
    //odysseyNode.position = new THREE.Vector3();
    
    odysseyNode.controllers.forEach( (controller) => {
      switch(controller.type){
        case OdysseyModelControllerType.Color:
          odysseyNode.color = new THREE.Color(controller.data[0].x, controller.data[0].y, controller.data[0].z);
        break;
        case OdysseyModelControllerType.Position:
          //odysseyNode.position.set(controller.data[0].x, controller.data[0].y, controller.data[0].z);
        break;
        case OdysseyModelControllerType.Radius:
          odysseyNode.radius = controller.data[0].value;
        break;
        case OdysseyModelControllerType.Multiplier:
          odysseyNode.multiplier = controller.data[0].value;
        break;
      }
    });

    //if(GameKey != "TSL"){
    //  odysseyNode.intensity = odysseyNode.intensity > 1 ? odysseyNode.intensity * .01 : odysseyNode.intensity;
    //}else{
      odysseyNode.intensity = odysseyNode.intensity * odysseyNode.multiplier;// > 1 ? odysseyNode.intensity * .01 : odysseyNode.intensity;
    //}

    if(!options.manageLighting){
      let lightNode: THREE.Light;
      if(odysseyNode.AmbientFlag){
        lightNode = new THREE.AmbientLight( odysseyNode.color );
        lightNode.intensity = odysseyNode.multiplier * 0.5;
      }else{
        //lightNode = new THREE.PointLight( odysseyNode.color, odysseyNode.intensity, odysseyNode.radius * 100 );
        lightNode = new THREE.PointLight( odysseyNode.color, 1, odysseyNode.radius * odysseyNode.multiplier, 1 );
        (lightNode.shadow.camera as any).far = odysseyNode.radius;
        //lightNode.distance = radius;
        lightNode.position.copy(odysseyNode.position);
      }
      lightNode.userData = {
        decay: 1,
        controllers: odysseyNode.controllers,
        helper: { visiable: false },
      }
      // lightNode.decay = 1;
      lightNode.visible = true;
      // lightNode.controllers = odysseyNode.controllers;
      // lightNode.helper = {visible:false};
    
      //odysseyModel.lights.push(lightNode);
      odysseyNode.light = lightNode;
      parentNode.add(lightNode);
      OdysseyModel3D.NodeLensflareBuilder(odysseyModel, lightNode, odysseyNode, options);
    }else{
      let lightNode: OdysseyLight3D;
      lightNode = new OdysseyLight3D(odysseyNode);
      lightNode.odysseyModel = odysseyModel;
      lightNode.isAnimated = !odysseyNode.roomStatic;
      //if(!odysseyNode.AmbientFlag){
        lightNode.position.copy(odysseyNode.position);
      //}
      //odysseyNode.light = lightNode;
      parentNode.add(lightNode);

      lightNode.parentUUID = odysseyModel.uuid;
      lightNode.userData.odysseyModel = odysseyModel;
      lightNode.userData.odysseyNode = odysseyNode;
  
      lightNode.priority = odysseyNode.LightPriority;
      lightNode.isAmbient = odysseyNode.AmbientFlag ? true : false;
      lightNode.isDynamic = odysseyNode.DynamicFlag ? true : false;
      lightNode.affectDynamic = odysseyNode.AffectDynamicFlag ? true : false;
      lightNode.castShadow = odysseyNode.ShadowFlag ? true : false;
      lightNode.genFlare = odysseyNode.GenerateFlareFlag ? true : false;
      lightNode.isFading = odysseyNode.FadingLightFlag;
      lightNode.maxIntensity = odysseyNode.intensity;
      lightNode.color = odysseyNode.color;
      OdysseyModel3D.NodeLensflareBuilder(odysseyModel, lightNode, odysseyNode, options);
      LightManager.addLight(lightNode);
    }
  };

  static NodeLensflareBuilder(odysseyModel: OdysseyModel3D, parentNode: THREE.Object3D, odysseyNode: OdysseyModelNodeLight, options: OdysseyModelLoaderOptions){
    if(odysseyNode.flare.radius){
      // let lensFlare = new Lensflare();

      // for(let i = 0, len = odysseyNode.flare.textures.length; i < len; i++){
      //   TextureLoader.enQueue(odysseyNode.flare.textures[i], null, TextureType.TEXTURE, (texture: OdysseyTexture) => {
      //     lensFlare.addElement( new LensflareElement( texture, odysseyNode.flare.sizes[i],  odysseyNode.flare.positions[i],  odysseyNode.flare.colorShifts[i] ) );
      //   });
      // }

      // if(!options.manageLighting){
      //   //parentNode.add(lensFlare);
      // }else{
      //   (parentNode as any).lensFlare = lensFlare;
      // }
    }
  }

};
