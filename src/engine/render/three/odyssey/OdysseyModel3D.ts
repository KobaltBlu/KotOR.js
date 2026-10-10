import * as THREE from "three";
import { IOdysseyControllerGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyTexture } from "@engine/render/three/odyssey/OdysseyTexture";
import { TextureLoader } from "@engine/loaders";
import { TextureType } from "@core/enums/loaders/TextureType";
import { OdysseyModelClass } from "@core/enums/odyssey/OdysseyModelClass";
import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";
import { OdysseyModelNodeType } from "@core/enums/odyssey/OdysseyModelNodeType";
import type { SWAnimation } from "@engine/rules/SWAnimation";
import { TwoDAManager } from "@core/managers/TwoDAManager";
import { IOdysseyModelLoaderOptions } from "@engine/interface/odyssey/IOdysseyModelLoaderOptions";
import { OdysseyModelAnimation } from "@engine/odyssey/OdysseyModelAnimation";
import { OdysseyModelAnimationManager } from "@engine/odyssey/OdysseyModelAnimationManager";
import { AuroraAnimationFlag } from "@core/enums/animation/AuroraAnimationFlag";
import { OdysseyWalkMesh } from "@engine/odyssey/OdysseyWalkMesh";
import { type OdysseyModelNodeLight } from "@engine/odyssey/OdysseyModelNodeLight";
import { type OdysseyModel } from "@engine/odyssey/OdysseyModel";
import { type OdysseyModelChangeEvent } from "@engine/odyssey/OdysseyModel";
import { type OdysseyModelNodeMesh } from "@engine/odyssey/OdysseyModelNodeMesh";
import {
  type DanglyGroupParams,
  updateModelDanglyWind,
} from "@engine/odyssey/DanglyWindSimulator";
import { type OdysseyModelNodeSkin } from "@engine/odyssey/OdysseyModelNodeSkin";
import { type OdysseyModelNodeAABB } from "@engine/odyssey/OdysseyModelNodeAABB";
import { type OdysseyModelNode } from "@engine/odyssey/OdysseyModelNode";
import { IOdysseyModelHeader } from "@core/interface/odyssey/IOdysseyModelHeader";
import { OdysseyObject3D } from "@engine/render/three/odyssey/OdysseyObject3D";
import { OdysseyEmitter3D } from "@engine/render/three/odyssey/OdysseyEmitter3D";
import { OdysseyLight3D } from "@engine/render/three/odyssey/OdysseyLight3D";
import { type IGameContext } from "@engine/interface/engine/IGameContext";
import { type NodeParseContext } from "@engine/render/three/odyssey/OdysseyModel3DNodeParseContext";
import { parseOdysseyNode } from "@engine/render/three/odyssey/OdysseyModel3DNodeParser";
import { enableOdysseyMaterialShadowReceive } from "@engine/render/shaders/chunks/OdysseyShadow";
import {
  applyOdysseyShadowCasterDepthMaterials,
  isOdysseyShadowCasterMaterial,
  shouldExcludeOdysseyShadowCasterMesh,
} from "@engine/render/three/odyssey/OdysseyShadowCasterMaterial";
import {
  buildGatherBonesDfsOrder,
  collectHeadhookAncestorNames,
  installOdysseySkeletonUpdate,
  ODYSSEY_IDENTITY_BIND_MATRIX,
  preferHeadBonesForNameCollisions,
  registerOdysseySkinBounds,
  resolveSkinBoneSlot,
  unregisterOdysseySkinBounds,
} from "@engine/render/three/odyssey/OdysseySkeletonBind";
import {
  updateAnimDummyInstances,
  type IAnimDummyInstanceBatch,
} from "@engine/render/three/odyssey/OdysseyAnimDummyInstancer";
import {
  collectMaterialUniqueAnimatedNodeNames as collectMaterialUniqueAnimNodeNames,
} from "@engine/render/three/odyssey/nodeMaterialCacheShareable";
import { OdysseyMaterialBuilder } from "@engine/render/three/odyssey/OdysseyMaterialBuilder";
import {
  buildOdysseyNodeMesh,
  collectMergeExcludeAnimatedNodeNames,
  expandMergeExcludeWithDescendants,
} from "@engine/render/three/odyssey/OdysseyMeshBuilder";
import {
  createOdysseyModel3DFromMDL,
  loadOdysseySuperModel,
} from "@engine/render/three/odyssey/OdysseyModel3DFactory";
import { OdysseyModel3DEditorSync } from "@engine/render/three/odyssey/OdysseyModel3DEditorSync";

export { resolveDanglyWindPower } from "@engine/render/three/odyssey/windPowerContext";
export type { NodeParseContext, NodeParseFlags, OdysseyModel3DParseBuilders } from "@engine/render/three/odyssey/OdysseyModel3DNodeParseContext";
export { createNodeParseContext } from "@engine/render/three/odyssey/OdysseyModel3DNodeParseContext";
export { parseOdysseyNode } from "@engine/render/three/odyssey/OdysseyModel3DNodeParser";
export { buildOdysseyNodeMesh } from "@engine/render/three/odyssey/OdysseyMeshBuilder";

/**
 * OdysseyModel3D class.
 * 
 * THREE.js representation of OdysseyModel
 * 
 * The OdysseyModel3D class takes an OdysseyModel object and converts it into a THREE.js object
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModel3D.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyModel3D extends OdysseyObject3D {

  type = 'OdysseyModel';
  box = new THREE.Box3;
  sphere = new THREE.Sphere();
  context: IGameContext = undefined;
  meshes: any[] = [];
  danglyMeshes: any[] = [];
  /** lightsaber blade meshes — trails live on parent OdysseyObject3D.saberTrail */
  saberMeshes: THREE.Mesh[] = [];
  odysseyAnimations: OdysseyModelAnimation[] = [];
  odysseyAnimationMap: Map<string, OdysseyModelAnimation> = new Map<string, OdysseyModelAnimation>();
  emitters: OdysseyEmitter3D[] = [];
  lights: any = [];
  aabb: OdysseyModelNodeAABB = {} as any;
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
  childModels: OdysseyModel3D[] = [];

  //Beta AnimationManager
  animationManager: OdysseyModelAnimationManager = new OdysseyModelAnimationManager(this);

  wasOffscreen = false;
  animateFrame = true;
  /**
   * Play-out-of-place: skip root position/orientation controllers so the clip
   * poses in place (server ID bands 0x4B0–0x52F / 0x640–0x6BF).
   */
  playOutOfPlaceActive = false;

  nodes: Map<string, OdysseyObject3D> = new Map<string, OdysseyObject3D>();
  /**
   * Runtime nodes indexed by MDL nameIndex (node index into names).
   * Useful for tools / nameIndex lookups. Skin bone_parts use GatherBones DFS
   * (see dfsNodes), not this table — on p_bastilabb those diverge for legs.
   */
  nodesByNameIndex: OdysseyObject3D[] = [];
  /**
   * Nodes in GatherBones / hierarchy DFS order. Skin bone_parts[slot]
   * and QBone/TBone are parallel to this list.
   */
  dfsNodes: OdysseyObject3D[] = [];
  /**
   * nameIndex → GatherBones DFS index. May differ from nameIndex on models
   * like p_bastilabb; used when mapping names onto DFS (not for bone_parts).
   */
  dfsIndexByNameIndex: number[] = [];
  /**
   * Runtime nodes indexed by MDL nodeNumber (model node.id).
   * Shared across the supermodel chain for skeletal bones; AnimateHierarchy
   * matches Parts to anim nodes by this id. Prefer this over the name Map.
   */
  nodesById: OdysseyObject3D[] = [];
  nodesByUUID: Map<string, OdysseyObject3D> = new Map<string, OdysseyObject3D>();
  sourceModel: OdysseyModel;
  readonly editorSync: OdysseyModel3DEditorSync = new OdysseyModel3DEditorSync(this);
  cachedMaterials: Map<string, THREE.Material> = new Map<string, THREE.Material>();

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
  hturn_g: OdysseyObject3D;
  
  bonesInitialized = false;
  Scale: number;
  modelHeader: IOdysseyModelHeader = {} as IOdysseyModelHeader;
  /**
   * Gob.distortion. Set by Gob EnableDistortion / VFX 0x708;
   * cleared by DisableDistortion. Combined with TILE classification for
   * forcePushBucket / emitter stencil mask (ManageSceneBSP / RenderFunc).
   */
  distortion: boolean = false;
  affectedByFog: boolean;
  options: any = {};
  oldAnim: OdysseyModelAnimation;
  mergedGeometries: any[];
  mergedDanglyGeometries: any[];
  mergedMaterials: any[];
  mergedDanglyMaterials: any[];
  mergedBufferGeometry: THREE.BufferGeometry;
  
  // Material-based geometry grouping for optimized merging
  geometryGroupsByMaterial: Map<THREE.Material, THREE.BufferGeometry[]>;
  mergedMesh: THREE.Mesh;
  /** True when any merged static part had MDL flagShadow / castShadow. */
  mergedCastsShadow = false;
  /**
   * Node names with Position/Orientation/Scale keys in any clip.
   * mergeStatic must keep these live (doors/placeables are not under room `*a` dummies).
   * Also includes SelfIllumColor / Alpha animated nodes (cannot bake into mergedMesh).
   */
  mergeExcludeAnimatedNodeNames: Set<string> = new Set();
  /**
   * Node names with SelfIllumColor / Alpha keys in any clip.
   * Those materials mutate per-mesh uniforms and must not share a ShaderMaterial.
   */
  materialUniqueAnimatedNodeNames: Set<string> = new Set();
  /** Anim-dummy leaf InstancedMesh batches (hangar ships, etc.). */
  animDummyInstanceBatches: IAnimDummyInstanceBatch[] = [];
  mergedBufferDanglyGeometry: THREE.BufferGeometry;
  mergedDanglyMesh: THREE.Mesh;
  mergedDanglyGroups: DanglyGroupParams[];
  mergedDanglyVertexOffset: number;
  walkmesh: THREE.Mesh;
  wok: OdysseyWalkMesh;
  animLoops: OdysseyModelAnimation[] = [];
  hasCollision: boolean;
  animLoop: any;
  opacity: number = 1;

  /**
   * force-distortion opt-in (ManageSceneBSP / PartEmitter RenderFunc):
   * gob.distortion != 0 OR ((classification >> 1) & 1) — i.e. OdysseyModelClass.TILE.
   */
  isForceDistortionActive(): boolean {
    if(this.distortion) return true;
    const cls = Number(
      this.modelHeader?.classification ??
      (this.sourceModel as any)?.modelHeader?.classification ??
      0
    );
    return (cls & OdysseyModelClass.TILE) !== 0;
  }

  setOpacity(opacity: number){
    this.opacity = opacity;
    if(!this.materials.length) return;
    const fading = opacity < 1;
    for(let i = 0; i < this.materials.length; i++){
      const mat = this.materials[i];
      mat.opacity = opacity;
      mat.needsUpdate = true;
      if(mat instanceof THREE.ShaderMaterial && mat.uniforms?.opacity){
        mat.uniforms.opacity.value = opacity;
        mat.uniformsNeedUpdate = true;
      }
      // Additive/TXI special blends keep their own transparent/depthWrite; normal materials
      // must disable depthWrite while fading or the mesh pops invisible in WebGL.
      if(mat.blending === THREE.AdditiveBlending){
        continue;
      }
      mat.transparent = fading;
      mat.depthWrite = !fading;
    }
  }

  applyShadowCasterMaterials(){
    for(let i = 0; i < this.skins.length; i++){
      const skin = this.skins[i];
      if(skin.castShadow){
        OdysseyModel3D.applyShadowCasterDepthMaterial(skin);
      }
    }
  }

  /** Materials excluded from shadow-map casting. */
  static isShadowCasterMaterial(material: THREE.Material): boolean {
    return isOdysseyShadowCasterMaterial(material);
  }

  static shouldExcludeShadowCasterMesh(mesh: THREE.Mesh): boolean {
    return shouldExcludeOdysseyShadowCasterMesh(mesh);
  }

  static applyShadowCasterDepthMaterial(mesh: THREE.Mesh | THREE.SkinnedMesh): void {
    if(shouldExcludeOdysseyShadowCasterMesh(mesh)){ return; }
    applyOdysseyShadowCasterDepthMaterials(mesh);
  }

  static resolveMeshShadowFlags(
    odysseyNode: OdysseyModelNodeMesh,
    options: IOdysseyModelLoaderOptions,
    isSaber: boolean
  ): { castShadow: boolean; receiveShadow: boolean } {
    const shadowsOn = options.shadowsEnabled !== false;
    if(!shadowsOn || isSaber){
      return { castShadow: false, receiveShadow: false };
    }
    // castShadow: false (rooms/doors) must suppress MDL flagShadow so tiles
    // receive shadows without self-shadowing. true forces cast; omit uses MDL.
    const castShadow = options.castShadow === false
      ? false
      : (!!odysseyNode.flagShadow || !!options.castShadow);
    return {
      castShadow,
      receiveShadow: !!options.receiveShadow,
    };
  }

  /** Mark attached rigid equipment (weapons/helm) as shadow casters. */
  static markAttachedEquipmentShadowCasting(root: THREE.Object3D, shadowsEnabled = true): void {
    if(!shadowsEnabled){ return; }
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if(!mesh.isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh){ return; }
      if(shouldExcludeOdysseyShadowCasterMesh(mesh)){ return; }
      if(mesh.userData.odysseyShadowCastAuthored === undefined){
        mesh.userData.odysseyShadowCastAuthored = mesh.castShadow;
      }
      mesh.castShadow = true;
      mesh.userData.odysseyAttachedEquipmentCaster = true;
      OdysseyModel3D.applyShadowCasterDepthMaterial(mesh);
    });
  }

  static restoreAttachedEquipmentShadowCasting(root: THREE.Object3D): void {
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if(!mesh.isMesh){ return; }
      if(mesh.userData.odysseyShadowCastAuthored !== undefined){
        mesh.castShadow = mesh.userData.odysseyShadowCastAuthored;
      }
      delete mesh.userData.odysseyAttachedEquipmentCaster;
      mesh.customDepthMaterial = undefined;
      mesh.customDistanceMaterial = undefined;
    });
  }

  attachHead(head: OdysseyModel3D){

    // Prior head dispose leaves SkinnedMeshes in this.skins; drop orphans.
    this.skins = this.skins.filter((skin) => {
      let obj: THREE.Object3D | null = skin;
      while(obj){
        if(obj === this){
          return true;
        }
        obj = obj.parent;
      }
      return false;
    });

    const rootNode = head.getRootOdysseyNode();
    // console.log('attachHead', rootNode);
    let remapper: [OdysseyObject3D, OdysseyObject3D][] = [];
    if(rootNode){
      rootNode.traverse( (node: OdysseyObject3D) => {
        // console.log('traverse', node);
        if(node == rootNode) return;

        if(node instanceof THREE.SkinnedMesh){
          // bone_parts / QBone use the head model's GatherBones DFS, not body
          head.ensureGatherBonesDfs();
          node.userData.boneNames = head.names;
          node.userData.nodesByNameIndex = head.nodesByNameIndex;
          node.userData.dfsNodes = head.dfsNodes;
          node.userData.dfsIndexByNameIndex = head.dfsIndexByNameIndex;
          this.skins.push(node);
          let m_node = node.parent;
          let n_parent = this.nodes.get(m_node.parent?.name);
          if(n_parent) remapper.push([m_node as OdysseyObject3D, n_parent]);
        }else if(node instanceof THREE.Mesh){
          let m_node = node.parent;
          let n_parent = this.nodes.get(m_node.parent?.name);
          if(n_parent) remapper.push([m_node as OdysseyObject3D, n_parent]);
        }else if(node instanceof THREE.Light){
          let n_parent = this.nodes.get(node.parent?.name);
          if(n_parent) remapper.push([node, n_parent]);
        }else if(node instanceof OdysseyObject3D){
          if(!this.nodes.has(node.name)){
            this.nodes.set(node.name, node);
          }
        }

        if(node.name == 'hturn_g'){
          this.hturn_g = node;
        }

      });

      for(let i = 0; i < remapper.length; i++){
        remapper[i][0].removeFromParent();
        remapper[i][1].add(remapper[i][0]);
      }

      this.headhook.add(rootNode);

      // p_bastilabb embeds neck/head bones that collide with the head MDL
      // (same names + nodeNumbers). Prefer the head's Object3Ds for those
      // collisions so anim (nodes/nodesById) and skins share one hierarchy.
      // Never steal headhook ancestors (torsoupr_g, torso_g,...).
      head.ensureGatherBonesDfs();
      this.ensureGatherBonesDfs();
      preferHeadBonesForNameCollisions(
        this,
        head.dfsNodes,
        collectHeadhookAncestorNames(this.headhook),
      );

      //fix skins
      this.buildSkeleton();
      this.applyShadowCasterMaterials();

      for(let i = 0; i < head.materials.length; i++){
        this.materials.push(head.materials[i]);
      }
    }

  }

  getRootOdysseyNode(): OdysseyObject3D | undefined {
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      if (child instanceof OdysseyObject3D && child.odysseyModelNode) {
        return child;
      }
    }
    return undefined;
  }

  disableEmitters(){
    for(let i = 0; i < this.emitters.length; i++){
      this.emitters[i].disable();
    }
  };

  dispose(node?: THREE.Object3D){

    if(node == null)
      node = this;

    if (node instanceof OdysseyObject3D && node.saberTrail) {
      node.saberTrail.dispose();
      node.saberTrail = undefined;
    }

    while(this.childModels.length){
      const childModel3D = this.childModels.shift();
      if(childModel3D){
        childModel3D.dispose();
      }
    }

    for(let i = 0; i < this.emitters.length; i++){
      if((this.emitters[i] as any).group)
        this.emitters[i].removeFromParent();
    }

    // console.log('dispose', node)
    for (let i = node.children.length; i > 0; i--) {
      const object = node.children[i-1];
      if (object instanceof OdysseyObject3D && object.saberTrail) {
        object.saberTrail.dispose();
        object.saberTrail = undefined;
      }
      node.remove(object);
      if (object.type === 'Mesh' || object.type === 'SkinnedMesh' || object.type === 'Points') {
        if(object instanceof THREE.Mesh){
          OdysseyModel3D.unregisterMeshShadow(object);
          const isSaberTrailMesh = !!object.userData?.saberTrailMesh;
          if (!isSaberTrailMesh) {
            if(Array.isArray(object.material)){
              while(object.material.length){
                let material = object.material.splice(0, 1)[0];
                this.disposeMaterial(material);
                material.dispose();
              }
            }else if(object.material){
              this.disposeMaterial(object.material);
              object.material.dispose();
            }
          }
          object.geometry.dispose();
        }
      }else if(object.type === 'OdysseyLight'){
        if(!!this.context && !!this.context.lightManager){
          this.context.lightManager.removeLight(node as OdysseyLight3D);
        }
      }else{
        if(object.hasOwnProperty('mesh')){
          (object as any).mesh = undefined;
        }
      }

      if((object as any).emitter){
        if(this.modelHeader.classification == 1){
          if((object as any).emitter.group){
            (object as any).emitter.group.dispose();
          }
        }else{
          if((object as any).emitter.group){
            (object as any).emitter.remove();
          }
        }
      }

      this.dispose(object);
    }

    if(node instanceof OdysseyModel3D){
      this.editorSync.unsubscribe();
      this.meshes = [];
      this.danglyMeshes = [];
      this.saberMeshes = [];
      this.odysseyAnimations = [];
      this.emitters = [];
      this.lights = [];
      this.aabb = {} as any;
      this.materials = [];
      this.skins = [];

      this.puppeteer = undefined; 
      this.names = [];
      this.supermodels = [];
      this.target = null;
      this.controlled = false;
      this.animationManager.currentAnimation = undefined;
      this.animNodeCache = {};
      this.nodesByUUID.clear();
      this.nodesByNameIndex = [];
      this.dfsNodes = [];
      this.dfsIndexByNameIndex = [];
      this.nodesById = [];
      this.options = {};
    
      this.headhook = null;
      this.lhand = null;
      this.rhand = null;

      if(this.parent instanceof OdysseyModel3D){
        this.parent.remove(this);
      }
      //console.log(node);

      this.disposeForceShieldGeometry();

      super.dispose();
    }

  }

  setSourceModel(model?: OdysseyModel): void {
    this.editorSync.setSourceModel(model);
  }

  onSourceModelChange(event: OdysseyModelChangeEvent): void {
    this.editorSync.onSourceModelChange(event);
  }

  flushSyncEvents(): void {
    this.editorSync.flushSyncEvents();
  }

  syncNodeTransform(nodeUUID?: string): boolean {
    return this.editorSync.syncNodeTransform(nodeUUID);
  }

  rebuildNode(nodeUUID?: string): boolean {
    return this.editorSync.rebuildNode(nodeUUID);
  }

  rebuildSubtree(nodeUUID?: string): boolean {
    return this.editorSync.rebuildSubtree(nodeUUID);
  }

  rebuildModel(): void {
    this.rebuildFromSourceModel();
  }

  rebuildFromSourceModel(): void {
    this.editorSync.rebuildFromSourceModel();
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

    // if((GameState.debug as any).disableAnimation) return;

    for(let i = 0, len = this.effects.length; i < len; i++){
      this.effects[i].update(delta);
    }

    this.animationManager.update(delta);
    // Instance matrices follow pose — skip when animateFrame gated this model off.
    if(this.animateFrame){
      updateAnimDummyInstances(this);
    }

    const dt =
      delta > 0 ? delta : (this.context?.deltaTime ?? 0);

    if(this.animateFrame){
      // Odyssey vertex shaders use `time` in sin for dangly, animated effects, etc. — must accumulate (seconds), not reset to delta each frame.
      for(let i = 0; i < this.materials.length; i++){
        let material = this.materials[i];
        if(material instanceof THREE.ShaderMaterial){
          if(material.type == 'ShaderMaterial'){
            material.uniforms.time.value += dt;
            // ProceduralAnimateHierarchy — once per rendered frame, no deltaT:
            // base += (uvDirectionX, uvDirectionY); jitter phase driven by uvJitterSpeed
            if(material.defines?.ANIMATED_UV != null && material.uniforms.animatedUVState && material.uniforms.animatedUV){
              const state = material.uniforms.animatedUVState.value;
              const uv = material.uniforms.animatedUV.value;
              state.x += uv.x;
              state.y += uv.y;
              state.z += uv.w;
              material.uniformsNeedUpdate = true;
            }
          }
        }
      }

      //Update emitters
      for(let i = 0; i < this.emitters.length; i++){
        this.emitters[i].tick(delta);
      }
    }
    
    //Update childModels (propagate pose gate so equipment emitters stay quiet too)
    for(let i = 0; i < this.childModels.length; i++){
      const child = this.childModels[i];
      child.animateFrame = this.animateFrame;
      child.update(delta);
    }

    if(this.animateFrame){
      const windManager = this.context?.getWindManager?.();
      updateModelDanglyWind(this, windManager, dt);
      for (let i = 0, len = this.saberMeshes.length; i < len; i++) {
        const mesh = this.saberMeshes[i];
        if (!mesh) continue;
        // Resolve parent bone matrices after animation; trails must not call this themselves.
        mesh.updateWorldMatrix(true, false);
        const node = mesh.parent as OdysseyObject3D | null;
        node?.saberTrail?.update(dt, mesh.matrixWorld);
      }
    }

    this.oddFrame = !this.oddFrame;

  }

  setEmitterTarget(node: OdysseyObject3D | OdysseyModel3D | THREE.Object3D){
    if(!node) return;
    for(let i = 0; i < this.emitters.length; i++){
      const em = this.emitters[i];
      // Lightning / P2P beams retarget via EffectBeam (e.g. v_coldray_dur).
      // Do not use !!referenceNode — emitters always hold a default placeholder Object3D.
      if(
        em.node?.updateMode === 'Lightning' ||
        em.node?.flags?.isP2P ||
        em.hasReferenceTarget
      ){
        em.setReferenceNode(node);
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
      animation = this.odysseyAnimationMap.get(anim.toLowerCase().trim());
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
      cFrame: 0,
      elapsed: 0,
      lastTime: 0,
      delta: 0,
      lastEvent: -1,
      events: [],
      speed: 1,
    };

    let clip: OdysseyModelAnimation;
    if(typeof anim === 'number'){
      clip = this.odysseyAnimations[anim];
    }else if(typeof anim === 'string'){
      clip = this.odysseyAnimationMap.get(anim.toLowerCase().trim());
    }else{
      clip = anim;
    }

    if(!clip){
      return undefined;
    }

    let flags = loop ? AuroraAnimationFlag.LOOPING : AuroraAnimationFlag.FIRE_FORGET;
    this.animationManager.playAnimation(clip, flags, state);

    if(typeof this.animationManager.currentAnimation != 'undefined'){
      const animations2DA = TwoDAManager.datatables.get('animations');
      if(animations2DA){
        for(let i = 0, len = animations2DA.rows.length; i < len; i++){
          if(animations2DA.rows[i].name == this.animationManager.currentAnimation.name){
            this.animationManager.currentAnimationState.animation = animations2DA.rows[i];
            break;
          }
        }
      }
      return this.animationManager.currentAnimation;
    }
    return undefined;
  }

  playOverlayAnimation(
    anim: OdysseyModelAnimation|string|number,
    data: SWAnimation,
    flags?: number
  ){
    const state: any = {
      loop: data?.looping,
      cFrame: 0,
      elapsed: 0,
      lastTime: 0,
      delta: 0,
      lastEvent: -1,
      events: [],
      animation: data,
    };

    let clip: OdysseyModelAnimation;
    if(typeof anim === 'number'){
      clip = this.odysseyAnimations[anim];
    }else if(typeof anim === 'string'){
      clip = this.odysseyAnimationMap.get(anim.toLowerCase().trim());
    }else{
      clip = anim;
    }

    if(!clip){
      return;
    }

    let f = typeof flags === 'number' ? flags : AuroraAnimationFlag.OVERLAY_SLOT;
    if(!(f & AuroraAnimationFlag.OVERLAY_SLOT) && !(f & AuroraAnimationFlag.ADDITIVE_GESTURE)){
      f |= AuroraAnimationFlag.OVERLAY_SLOT;
    }
    if(state.loop){
      f |= AuroraAnimationFlag.LOOPING;
    }else if(!(f & AuroraAnimationFlag.FIRE_FORGET) && !(f & AuroraAnimationFlag.ADDITIVE_GESTURE)){
      f |= AuroraAnimationFlag.FIRE_FORGET;
    }
    this.animationManager.playOverlayAnimation(clip, f, state);
  }

  stopAnimation(){
    this.animationManager.stopAnimation();
  }

  getAnimationName(): string {
    if(typeof this.animationManager.currentAnimation !== 'undefined'){
      return this.animationManager.currentAnimation.name;
    }
    return undefined;
  }

  /**
   * Ensure nodesByNameIndex is populated for skin binds.
   * Prefer nodes whose name matches names[nameIndex] so head/weapon attaches
   * with their own nameIndex namespaces do not overwrite body slots.
   */
  ensureNodesByNameIndex(): void {
    if(this.nodesByNameIndex.length > 0){
      return;
    }
    this.traverse((obj: THREE.Object3D) => {
      if(!(obj instanceof OdysseyObject3D) || !obj.odysseyModelNode){
        return;
      }
      const nameIndex = obj.odysseyModelNode.nameIndex;
      if(typeof nameIndex !== 'number' || nameIndex < 0){
        return;
      }
      if(this.names[nameIndex] !== obj.name){
        return;
      }
      if(typeof this.nodesByNameIndex[nameIndex] === 'undefined'){
        this.nodesByNameIndex[nameIndex] = obj;
      }
    });
  }

  /**
   * Ensure dfsNodes / dfsIndexByNameIndex match GatherBones order.
   */
  ensureGatherBonesDfs(): void {
    if(this.dfsNodes.length > 0){
      return;
    }
    const root = this.getRootOdysseyNode() ?? this;
    const { dfsNodes, dfsIndexByNameIndex } = buildGatherBonesDfsOrder(root, this.names);
    this.dfsNodes = dfsNodes as OdysseyObject3D[];
    this.dfsIndexByNameIndex = dfsIndexByNameIndex;
  }

  /**
   * Ensure nodesById is populated for anim / Part-id lookups (model node.id).
   * Only register nodes whose name matches this model's names[nameIndex] so head
   * attaches with colliding nodeNumbers do not overwrite body skeletal slots.
   */
  ensureNodesById(): void {
    if(this.nodesById.length > 0){
      return;
    }
    this.traverse((obj: THREE.Object3D) => {
      if(!(obj instanceof OdysseyObject3D) || !obj.odysseyModelNode){
        return;
      }
      const nodeNumber = obj.odysseyModelNode.nodeNumber;
      const nameIndex = obj.odysseyModelNode.nameIndex;
      if(typeof nodeNumber !== 'number' || nodeNumber < 0){
        return;
      }
      if(typeof nameIndex === 'number' && nameIndex >= 0 && this.names[nameIndex] !== obj.name){
        return;
      }
      if(typeof this.nodesById[nodeNumber] === 'undefined'){
        this.nodesById[nodeNumber] = obj;
      }
    });
  }

  /**
   * Bind each skin to its bone slots.
   *
   * (/ ExecuteSkinTransforms / RenderSkinned):
   * - MDX bone index → bone_parts[slot] → GatherBones DFS index
   * - qbone_ref_inv / tbone_ref_inv are parallel to that same DFS walk
   * - On p_bastilabb, nameIndex ≠ DFS for leg slots; treating bone_parts as
   * nameIndex binds the wrong Object3D (e.g. foot instead of thigh)
   *
   * Resolve bone and inverse both via dfsNodes[bone_parts[j]]. Keep MDL
   * inverses and update in skin-local space.
   */
  buildSkeleton(){
    this.bonesInitialized = false;
    this.oldAnim = this.animationManager.currentAnimation;
    this.animationManager.currentAnimation = undefined;
    this.pose();
    this.ensureNodesByNameIndex();
    this.ensureGatherBonesDfs();
    this.ensureNodesById();
    this.updateMatrixWorld(true);

    for(let i = 0; i < this.skins.length; i++){
      const skinNode = this.skins[i];
      if(typeof skinNode.userData.boneNames === 'undefined'){
        skinNode.userData.boneNames = this.names;
      }
      if(typeof skinNode.userData.nodesByNameIndex === 'undefined'){
        skinNode.userData.nodesByNameIndex = this.nodesByNameIndex;
      }
      if(typeof skinNode.userData.dfsNodes === 'undefined'){
        skinNode.userData.dfsNodes = this.dfsNodes;
      }
      if(typeof skinNode.userData.dfsIndexByNameIndex === 'undefined'){
        skinNode.userData.dfsIndexByNameIndex = this.dfsIndexByNameIndex;
      }
      const odysseyModelNode = skinNode.userData.odysseyModelNode as OdysseyModelNodeSkin | undefined;
      if(typeof odysseyModelNode?.bone_parts !== 'undefined'){
        const slotCount = odysseyModelNode.bone_parts.length;
        const bones: (THREE.Object3D | undefined)[] = new Array(slotCount);
        const inverses: THREE.Matrix4[] = new Array(slotCount);
        const dfsNodes: OdysseyObject3D[] = skinNode.userData.dfsNodes;
        const inverseMats = odysseyModelNode.bone_inverse_matrix;

        for(let j = 0; j < slotCount; j++){
          const dfsIndex = odysseyModelNode.bone_parts[j];
          const { bone, inverse } = resolveSkinBoneSlot(
            dfsIndex,
            dfsNodes,
            inverseMats,
            dfsNodes.length,
            j,
          );
          bones[j] = bone;
          inverses[j] = inverse;
        }

        const skeleton = new THREE.Skeleton(bones as any[], inverses);
        // Identity bindMatrix skips calculateInverses so MDL inverses are kept.
        skinNode.bindMode = 'detached';
        skinNode.bind(skeleton, ODYSSEY_IDENTITY_BIND_MATRIX);
        installOdysseySkeletonUpdate(skeleton, skinNode);
        skinNode.skeleton.update();
        skinNode.updateMatrixWorld();
      }
    }

    this.bonesInitialized = true;
    this.animationManager.currentAnimation = this.oldAnim;
    this.applyShadowCasterMaterials();
  }

  pose(node: OdysseyModel3D|THREE.Object3D = undefined){
    this.bonesInitialized = false;
    if(node){
      try{
        if((node as any).Controllers){
          (node as any).controllers.forEach( (controller: IOdysseyControllerGeneric) => {
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
        //node.updateMatrix;
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
      this.dispatchEvent({type: 'playEvent', event: event});
    }

  }

  poseAnimationNode(anim: any, node: any){

    if(!this.bonesInitialized)
      return;

    let modelNode: OdysseyObject3D | undefined;
    if(typeof node?.nodeNumber === 'number' && node.nodeNumber >= 0){
      modelNode = this.nodesById?.[node.nodeNumber];
    }
    if(typeof modelNode === 'undefined'){
      modelNode = this.nodes.get(node.name);
    }

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
            if ((modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
              (modelNode.odysseyModelNode as OdysseyModelNodeLight).color.setRGB(
                data.x, 
                data.y, 
                data.z
              );
              const colorLight = (modelNode as any).light as OdysseyLight3D | undefined;
              if(colorLight){
                colorLight.color.setRGB(data.x, data.y, data.z);
              }
            }
          break;
          case OdysseyModelControllerType.Multiplier:
            if ((modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
              (modelNode.odysseyModelNode as OdysseyModelNodeLight).multiplier = data.value;
              const multLight = (modelNode as any).light as OdysseyLight3D | undefined;
              if(multLight){
                multLight.multiplier = data.value;
              }
            }
          break;
          case OdysseyModelControllerType.Radius:
            if ((modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
              (modelNode.odysseyModelNode as OdysseyModelNodeLight).radius = data.value;
              const radiusLight = (modelNode as any).light as OdysseyLight3D | undefined;
              if(radiusLight){
                radiusLight.radius = data.value;
              }
            }
          break;
          case OdysseyModelControllerType.ShadowRadius:
            if ((modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
              const shadowLight = (modelNode as any).light as OdysseyLight3D | undefined;
              if(shadowLight){
                shadowLight.shadowRadius = data.value;
              }
            }
          break;
          case OdysseyModelControllerType.VerticalDisplacement:
            if ((modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
              const dispLight = (modelNode as any).light as OdysseyLight3D | undefined;
              if(dispLight){
                dispLight.verticalDisplacement = data.value;
              }
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
      // Freeze the full graph (bones + meshes). Animation marks dirty locals
      // via markNodeTransformDirty; renderer skips auto updateMatrix on frozen nodes.
      node.matrixAutoUpdate = false;
    });
    // Model root still participates in parent container moves.
    this.matrixAutoUpdate = true;
  }

  enableMatrixUpdate(){
    this.traverse( (node) => {
      node.matrixAutoUpdate = true;
    });
    this.matrixAutoUpdate = true;
  }

  /**
   * EnableBumpedOutShell — clone skinned meshes onto the
   * same parents/skeleton so the shell inherits creature transform + bone animation.
   */
  generateForceShieldGeometry( shieldTexName = '' ){
    //Start by making sure there are not any lingering forceShieldGeometries
    this.disposeForceShieldGeometry();

    for(let i = 0, len = this.skins.length; i < len; i++){
      const originalSkinMesh = this.skins[i];
      if(!(originalSkinMesh instanceof THREE.SkinnedMesh))
        continue;
      if(!originalSkinMesh.parent || !originalSkinMesh.skeleton || !originalSkinMesh.geometry)
        continue;

      // Do not use SkinnedMesh.clone — recursive copy walks Odyssey node children and
      // can hit undefined refs in Material/Object3D.toJSON. Share geometry + skeleton only.
      const skinMaterial = new THREE.ShaderMaterial({
        fragmentShader: THREE.ShaderLib.odyssey.fragmentShader,
        vertexShader: THREE.ShaderLib.odyssey.vertexShader,
        uniforms: THREE.UniformsUtils.clone(THREE.ShaderLib.odyssey.uniforms),
        side: THREE.FrontSide,
        lights: false,
        fog: true,
        skinning: true
      } as THREE.ShaderMaterialParameters);
      skinMaterial.defines.FORCE_SHIELD = '';
      skinMaterial.defines.IGNORE_LIGHTING = '';
      skinMaterial.defines.AURORA = '';
      skinMaterial.defines.USE_UV = '';
      // USE_MAP is set by TextureLoader.assignMaterialTexture once the shield map binds.
      skinMaterial.defines.USE_SKINNING = '';
      skinMaterial.defines.MAX_ODYSSEY_LIGHTS = '8';
      skinMaterial.uniforms.diffuse.value.setRGB(1, 1, 1);
      // Additive shell — stay in transparent list so body opaques draw first
      // (same pattern as SABER / beaming; TXI re-affirms via FORCE_SHIELD).
      skinMaterial.transparent = true;
      skinMaterial.blending = THREE.AdditiveBlending;
      skinMaterial.depthWrite = false;

      if(typeof shieldTexName == 'string' && shieldTexName.length){
        skinMaterial.userData.shield = shieldTexName;
        TextureLoader.enQueue(shieldTexName, skinMaterial, TextureType.TEXTURE);
      }

      const skinMesh = new THREE.SkinnedMesh(originalSkinMesh.geometry, skinMaterial);
      skinMesh.bindMode = originalSkinMesh.bindMode;
      skinMesh.bindMatrix.copy(originalSkinMesh.bindMatrix);
      skinMesh.bindMatrixInverse.copy(originalSkinMesh.bindMatrixInverse);
      skinMesh.skeleton = originalSkinMesh.skeleton;
      skinMesh.position.copy(originalSkinMesh.position);
      skinMesh.quaternion.copy(originalSkinMesh.quaternion);
      skinMesh.scale.copy(originalSkinMesh.scale);
      skinMesh.matrixAutoUpdate = true;
      skinMesh.frustumCulled = originalSkinMesh.frustumCulled;
      skinMesh.userData.isForceShield = true;
      skinMesh.castShadow = false;
      skinMesh.receiveShadow = false;
      skinMesh.name = (originalSkinMesh.name || 'skin') + '_forceshield';
      // Share boneMatrices; register so pose changes refresh this shell's sphere too.
      registerOdysseySkinBounds(originalSkinMesh.skeleton, skinMesh);

      originalSkinMesh.matrixAutoUpdate = true;
      originalSkinMesh.parent.add(skinMesh);
      this.forceShieldGeometry.push(skinMesh);
    }
  };

  /** DisableBumpedOutShell */
  disposeForceShieldGeometry(){
    while(this.forceShieldGeometry.length){
      let object = this.forceShieldGeometry.splice(0, 1)[0];
      object.removeFromParent();
      if(object.isSkinnedMesh && object.skeleton){
        unregisterOdysseySkinBounds(object.skeleton, object);
      }

      if(Array.isArray(object.material)){
        while(object.material.length){
          let material = object.material.splice(0, 1)[0];
          this.disposeMaterial(material);
          material.dispose();
        }
      }else if(object.material){
        this.disposeMaterial(object.material);
        object.material.dispose();
      }
      // Geometry is shared with the creature skin — never dispose it here.
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
    return loadOdysseySuperModel(resref, odysseyModel);
  }

  static async FromMDL(model: OdysseyModel, _options: IOdysseyModelLoaderOptions = {} as IOdysseyModelLoaderOptions): Promise<OdysseyModel3D> {
    return createOdysseyModel3DFromMDL(model, _options);
  }

  static collectMergeExcludeAnimatedNodeNames(
    animations: OdysseyModelAnimation[] | undefined,
  ): Set<string> {
    return collectMergeExcludeAnimatedNodeNames(animations);
  }

  static expandMergeExcludeWithDescendants(
    seed: Set<string>,
    root: OdysseyModelNode | undefined,
  ): Set<string> {
    return expandMergeExcludeWithDescendants(seed, root);
  }

  static collectMaterialUniqueAnimatedNodeNames(
    animations: OdysseyModelAnimation[] | undefined,
  ): Set<string> {
    return collectMaterialUniqueAnimNodeNames(animations);
  }

  /** Delegates to {@link parseOdysseyNode}; retained as `OdysseyModel3D.NodeParser` for existing call sites. */
  static NodeParser(
    odysseyModel: OdysseyModel3D,
    parentNode: THREE.Object3D,
    odysseyNode: OdysseyModelNode,
    parseContext: NodeParseContext,
  ): OdysseyObject3D {
    return parseOdysseyNode(odysseyModel, parentNode, odysseyNode, parseContext);
  }

  static NodeMeshBuilder(
    odysseyModel: OdysseyModel3D,
    parentNode: THREE.Object3D,
    odysseyNode: any,
    options: IOdysseyModelLoaderOptions,
  ){
    return buildOdysseyNodeMesh(odysseyModel, parentNode, odysseyNode, options);
  }

  static NodeMaterialCacheId(
    odysseyNode: OdysseyModelNodeMesh,
    options?: IOdysseyModelLoaderOptions,
    odysseyModel?: OdysseyModel3D,
  ): string {
    return OdysseyMaterialBuilder.nodeMaterialCacheId(odysseyNode, options, odysseyModel);
  }

  static NodeMaterialCacheShareable(
    odysseyNode: OdysseyModelNodeMesh,
    options?: IOdysseyModelLoaderOptions,
    uniqueMaterialNodeNames?: Set<string>,
  ): boolean {
    return OdysseyMaterialBuilder.nodeMaterialCacheShareable(odysseyNode, options, uniqueMaterialNodeNames);
  }

  static NodeMaterialBuilder(odysseyModel: OdysseyModel3D, parentNode: THREE.Object3D, odysseyNode: OdysseyModelNodeMesh, options: IOdysseyModelLoaderOptions){
    return OdysseyMaterialBuilder.buildNodeMaterial(odysseyModel, parentNode, odysseyNode, options);
  }

  static NodeLightBuilder(odysseyModel: OdysseyModel3D, parentNode: THREE.Object3D, odysseyNode: OdysseyModelNodeLight, options: IOdysseyModelLoaderOptions): OdysseyLight3D {

    const lightNode = new OdysseyLight3D(odysseyNode);
    lightNode.odysseyModel = odysseyModel;
    lightNode.isAnimated = odysseyNode.isAnimDummyNode;
    lightNode.name = (odysseyNode.name || '').toLowerCase();
    // Parent OdysseyObject3D already owns the node transform (parser sets
    // position/quaternion). Keep the light at local origin so world position
    // is not doubled.
    lightNode.position.set(0, 0, 0);
    parentNode.add(lightNode);

    lightNode.parentUUID = odysseyModel.uuid;
    lightNode.userData.odysseyModel = odysseyModel;
    lightNode.userData.odysseyNode = odysseyNode;

    lightNode.priority = odysseyNode.lightPriority;
    lightNode.authoredPriority = odysseyNode.lightPriority;
    lightNode.isAmbient = odysseyNode.ambientFlag ? true : false;
    lightNode.dynamicType = odysseyNode.dynamicFlag | 0;
    lightNode.isDynamic = lightNode.dynamicType !== 0;
    lightNode.affectDynamic = odysseyNode.affectDynamicFlag ? true : false;
    lightNode.castShadow = odysseyNode.shadowFlag ? true : false;
    lightNode.genFlare = odysseyNode.generateFlareFlag ? true : false;
    lightNode.isFading = odysseyNode.fadingLightFlag;
    // light fade pass: fadingLightFlag → initial fade 0, else 1
    lightNode.fadeFactor = odysseyNode.fadingLightFlag ? 0 : 1;
    lightNode.shadowFadeFactor = 0;
    lightNode.maxIntensity = 1;
    lightNode.color = odysseyNode.color;
    lightNode.radius = odysseyNode.radius || 0;
    lightNode.multiplier = odysseyNode.multiplier || 0;
    lightNode.shadowRadius = 0;
    lightNode.verticalDisplacement = 0;
    OdysseyModel3D.NodeLensflareBuilder(odysseyModel, lightNode, odysseyNode, options);
    // manageLighting defaults true: register with the context LightManager.
    // false keeps the OdysseyLight3D model-local (no manager registration).
    const manageLighting = options?.manageLighting !== false;
    if(manageLighting && !!odysseyModel.context?.lightManager){
      odysseyModel.context.lightManager.addLight(lightNode);
    }
    (parentNode as any).light = lightNode;

    odysseyNode.controllers.forEach( (controller) => {
      switch(controller.type){
        case OdysseyModelControllerType.Color:
          lightNode.color = new THREE.Color(controller.data[0].x, controller.data[0].y, controller.data[0].z);
        break;
        case OdysseyModelControllerType.Position:
          //odysseyNode.position.set(controller.data[0].x, controller.data[0].y, controller.data[0].z);
        break;
        case OdysseyModelControllerType.Radius:
          lightNode.radius = controller.data[0].value;
        break;
        case OdysseyModelControllerType.Multiplier:
          lightNode.multiplier = controller.data[0].value;
        break;
        case OdysseyModelControllerType.ShadowRadius:
          lightNode.shadowRadius = controller.data[0].value;
        break;
        case OdysseyModelControllerType.VerticalDisplacement:
          lightNode.verticalDisplacement = controller.data[0].value;
        break;
      }
    });

    return lightNode;
  };

  /**
   * Attach MDL flare arrays to the light for.
   * CollectLightsForGivenRoom gates on flarecolorshifts count, not
   * generateflare or flareradius (radius is cull/falloff at draw time).
   */
  static NodeLensflareBuilder(_odysseyModel: OdysseyModel3D, parentNode: OdysseyLight3D, odysseyNode: OdysseyModelNodeLight, _options: IOdysseyModelLoaderOptions){
    const flare = odysseyNode.flare;
    if(!flare?.colorShifts?.length){
      return;
    }

    parentNode.flareRadius = flare.radius || 0;
    parentNode.flareSizes = flare.sizes.slice();
    parentNode.flarePositions = flare.positions.slice();
    parentNode.flareColorShifts = flare.colorShifts.map((c) => new THREE.Color(c.r, c.g, c.b));
    parentNode.flareTextures = new Array(flare.textures.length).fill(null);
    parentNode.flareOcclusionFade = 0;

    for(let i = 0, len = flare.textures.length; i < len; i++){
      const index = i;
      const resref = flare.textures[i];
      if(!resref){
        continue;
      }
      TextureLoader.enQueue(resref, null, TextureType.TEXTURE, (texture: OdysseyTexture) => {
        parentNode.flareTextures[index] = texture;
      });
    }
  }

  static registerMeshShadow(mesh: THREE.Mesh | THREE.SkinnedMesh, options?: IOdysseyModelLoaderOptions){
    if(options?.shadowsEnabled === false){ return; }
    if(!mesh?.receiveShadow){ return; }
    enableOdysseyMaterialShadowReceive(mesh.material);
  }

  static unregisterMeshShadow(mesh: THREE.Mesh | THREE.SkinnedMesh){
    mesh.customDepthMaterial = undefined;
    mesh.customDistanceMaterial = undefined;
  }

};
