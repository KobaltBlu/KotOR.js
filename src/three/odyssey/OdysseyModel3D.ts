import * as THREE from "three";
import { IOdysseyControllerGeneric } from "@/interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { MDLLoader, TextureLoader } from "@/loaders";
import { TextureType } from "@/enums/loaders/TextureType";
import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { OdysseyModelNodeType } from "@/enums/odyssey/OdysseyModelNodeType";
import { OdysseyModelMDXFlag } from "@/enums/odyssey/OdysseyModelMDXFlag";
import { OdysseyModelClass } from "@/enums/odyssey/OdysseyModelClass";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils";
import { OdysseyController } from "@/odyssey/controllers";
import { IOdysseyModelHeader } from "@/interface/odyssey/IOdysseyModelHeader";
import type { SWAnimation } from "@/engine/rules/SWAnimation";
import { TwoDAManager } from "@/managers/TwoDAManager";
import { DirtyTextureManager } from "@/managers/DirtyTextureManager";
import { WindManager } from "@/managers/WindManager";
import { IOdysseyModelLoaderOptions } from "@/interface/odyssey";
import { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import { OdysseyModelAnimationManager } from "@/odyssey/OdysseyModelAnimationManager";
import { synchronizeAnimationToModel } from "@/odyssey/OdysseyNodeIdSync";
import { AuroraAnimationFlag } from "@/enums/animation/AuroraAnimationFlag";
import { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import { type OdysseyModelNodeLight } from "@/odyssey/OdysseyModelNodeLight";
import { type OdysseyModel } from "@/odyssey/OdysseyModel";
import { type OdysseyModelChangeEvent } from "@/odyssey/OdysseyModel";
import { type OdysseyModelNodeMesh } from "@/odyssey/OdysseyModelNodeMesh";
import { type OdysseyModelNodeDangly } from "@/odyssey/OdysseyModelNodeDangly";
import { ensureDanglyConstraintAttribute } from "@/odyssey/ensureDanglyVertexAttributes";
import {
  initDanglyWindMesh,
  initMergedDanglyWindMesh,
  type DanglyGroupParams,
  updateModelDanglyWind,
} from "@/odyssey/DanglyWindSimulator";
import { OdysseySaberTrail } from "@/odyssey/OdysseySaberTrail";
import { type OdysseyModelNodeSkin } from "@/odyssey/OdysseyModelNodeSkin";
import { type OdysseyModelNodeAABB } from "@/odyssey/OdysseyModelNodeAABB";
import { type OdysseyModelNodeSaber } from "@/odyssey/OdysseyModelNodeSaber";
import { type OdysseyModelNode } from "@/odyssey/OdysseyModelNode";
import { OdysseyObject3D } from "@/three/odyssey/OdysseyObject3D";
import { OdysseyEmitter3D } from "@/three/odyssey/OdysseyEmitter3D";
import { OdysseyLight3D } from "@/three/odyssey/OdysseyLight3D";
import { type IGameContext } from "@/interface/engine/IGameContext";
import { GameState } from "@/GameState";
import { createNodeParseContext, type NodeParseContext } from "@/three/odyssey/OdysseyModel3DNodeParseContext";
import { parseOdysseyNode } from "@/three/odyssey/OdysseyModel3DNodeParser";
import {
  createEmptyOdysseyLightPosArray,
  createEmptyOdysseyLightColorArray,
} from "@/shaders/chunks/OdysseyLighting";
import { enableOdysseyMaterialShadowReceive } from "@/shaders/chunks/OdysseyShadow";
import {
  applyOdysseyShadowCasterDepthMaterials,
  isOdysseyShadowCasterMaterial,
  shouldExcludeOdysseyShadowCasterMesh,
} from "@/three/odyssey/OdysseyShadowCasterMaterial";
import {
  buildGatherBonesDfsOrder,
  collectHeadhookAncestorNames,
  installOdysseySkeletonUpdate,
  ODYSSEY_IDENTITY_BIND_MATRIX,
  preferHeadBonesForNameCollisions,
  resolveSkinBoneSlot,
} from "@/three/odyssey/OdysseySkeletonBind";
import {
  buildAnimDummyInstanceBatches,
  updateAnimDummyInstances,
  type IAnimDummyInstanceBatch,
} from "@/three/odyssey/OdysseyAnimDummyInstancer";
import {
  collectMaterialUniqueAnimatedNodeNames as collectMaterialUniqueAnimNodeNames,
  nodeMaterialCacheShareable,
} from "@/three/odyssey/nodeMaterialCacheShareable";
import { ensureMergeCompatibleAttributes } from "@/three/odyssey/ensureMergeCompatibleAttributes";

export { resolveDanglyWindPower } from "@/three/odyssey/windPowerContext";
export type { NodeParseContext, NodeParseFlags, OdysseyModel3DParseBuilders } from "@/three/odyssey/OdysseyModel3DNodeParseContext";
export { createNodeParseContext } from "@/three/odyssey/OdysseyModel3DNodeParseContext";
export { parseOdysseyNode } from "@/three/odyssey/OdysseyModel3DNodeParser";

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
  private sourceModelUnsubscribe: Function = undefined;
  private pendingSyncEvents: OdysseyModelChangeEvent[] = [];
  private syncScheduled = false;

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
      if (typeof this.sourceModelUnsubscribe === "function") {
        this.sourceModelUnsubscribe();
        this.sourceModelUnsubscribe = undefined;
      }
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

    }

  }

  setSourceModel(model?: OdysseyModel): void {
    if (typeof this.sourceModelUnsubscribe === "function") {
      this.sourceModelUnsubscribe();
      this.sourceModelUnsubscribe = undefined;
    }
    this.sourceModel = model;
    if (this.sourceModel) {
      this.sourceModelUnsubscribe = this.sourceModel.addChangeListener(this.onSourceModelChange.bind(this));
    }
  }

  onSourceModelChange(event: OdysseyModelChangeEvent): void {
    this.pendingSyncEvents.push(event);
    if (this.syncScheduled) return;
    this.syncScheduled = true;
    queueMicrotask(() => this.flushSyncEvents());
  }

  flushSyncEvents(): void {
    this.syncScheduled = false;
    if (!this.pendingSyncEvents.length) return;
    const events = this.pendingSyncEvents.splice(0);
    const deduped = new Map<string, OdysseyModelChangeEvent>();
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const key = `${event.kind}:${event.nodeUUID || "model"}`;
      deduped.set(key, event);
    }
    const reducedEvents = Array.from(deduped.values());
    for (let i = 0; i < reducedEvents.length; i++) {
      const event = reducedEvents[i];
      switch (event.kind) {
        case "node.transform":
          this.syncNodeTransform(event.nodeUUID);
          break;
        case "controller.keyframes":
          // Animation edits are consumed naturally by update loop since runtime nodes keep source-linked controllers.
          break;
        case "node.material":
        case "node.geometry":
          this.rebuildNode(event.nodeUUID);
          break;
        case "node.hierarchy":
          this.rebuildSubtree(event.nodeUUID);
          break;
        case "model.meta":
          // model.meta should not force full replacement in normal flow.
          break;
      }
    }
  }

  syncNodeTransform(nodeUUID?: string): boolean {
    if (!nodeUUID) return false;
    const runtimeNode = this.nodesByUUID.get(nodeUUID);
    const sourceNode = runtimeNode?.odysseyModelNode;
    if (!runtimeNode || !sourceNode) return false;
    runtimeNode.position.copy(sourceNode.position);
    runtimeNode.quaternion.copy(sourceNode.quaternion);
    runtimeNode.updateMatrix();
    runtimeNode.updateMatrixWorld(true);
    return true;
  }

  /** Remove mesh materials/skins from model tracking arrays before dispose (keeps materials/skins in sync with rebuildNode). */
  private stripMeshFromModelTracking(mesh: THREE.Mesh): void {
    const materials: THREE.Material[] = Array.isArray(mesh.material)
      ? mesh.material as THREE.Material[]
      : mesh.material
        ? [mesh.material as THREE.Material]
        : [];
    for (let m = 0; m < materials.length; m++) {
      const mat = materials[m];
      const idx = this.materials.indexOf(mat);
      if (idx >= 0) this.materials.splice(idx, 1);
    }
    if (mesh instanceof THREE.SkinnedMesh) {
      const si = this.skins.indexOf(mesh);
      if (si >= 0) this.skins.splice(si, 1);
    }
  }

  rebuildNode(nodeUUID?: string): boolean {
    if (!nodeUUID) return false;
    const runtimeNode = this.nodesByUUID.get(nodeUUID);
    if (!runtimeNode || !runtimeNode.odysseyModelNode) return false;
    const sourceNode = runtimeNode.odysseyModelNode;

    if (runtimeNode.saberTrail) {
      runtimeNode.saberTrail.dispose();
      runtimeNode.saberTrail = undefined;
    }

    if (runtimeNode.mesh) {
      this.stripMeshFromModelTracking(runtimeNode.mesh);
      const saberIdx = this.saberMeshes.indexOf(runtimeNode.mesh);
      if (saberIdx >= 0) this.saberMeshes.splice(saberIdx, 1);
      runtimeNode.remove(runtimeNode.mesh);
      if (runtimeNode.mesh.material) {
        if (Array.isArray(runtimeNode.mesh.material)) {
          for (let i = 0; i < runtimeNode.mesh.material.length; i++) {
            this.disposeMaterial(runtimeNode.mesh.material[i]);
            runtimeNode.mesh.material[i].dispose();
          }
        } else {
          this.disposeMaterial(runtimeNode.mesh.material);
          runtimeNode.mesh.material.dispose();
        }
      }
      runtimeNode.mesh.geometry?.dispose();
      runtimeNode.mesh = undefined;
      runtimeNode.userData.mesh = undefined;
    }

    if (runtimeNode.emitter) {
      const emitterIdx = this.emitters.indexOf(runtimeNode.emitter);
      if (emitterIdx >= 0) this.emitters.splice(emitterIdx, 1);
      runtimeNode.emitter.removeFromParent();
      runtimeNode.emitter = undefined;
    }

    if (runtimeNode.light) {
      if (this.context?.lightManager && runtimeNode.light instanceof OdysseyLight3D) {
        this.context.lightManager.removeLight(runtimeNode.light);
      }
      runtimeNode.light.removeFromParent();
      runtimeNode.light = undefined as any;
    }

    runtimeNode.controllers = sourceNode.controllers;
    runtimeNode.position.copy(sourceNode.position);
    runtimeNode.quaternion.copy(sourceNode.quaternion);

    if ((sourceNode.nodeType & OdysseyModelNodeType.Mesh) == OdysseyModelNodeType.Mesh) {
      OdysseyModel3D.NodeMeshBuilder(this, runtimeNode, sourceNode as any, this.options);
    }
    if ((sourceNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      runtimeNode.light = OdysseyModel3D.NodeLightBuilder(this, runtimeNode, sourceNode as any, this.options);
    }
    if ((sourceNode.nodeType & OdysseyModelNodeType.Emitter) == OdysseyModelNodeType.Emitter) {
      runtimeNode.emitter = new OdysseyEmitter3D(sourceNode as any);
      runtimeNode.emitter.context = this.context;
      runtimeNode.emitter.name = sourceNode.name + '_em';
      runtimeNode.add(runtimeNode.emitter);
      this.emitters.push(runtimeNode.emitter);
    }

    runtimeNode.updateMatrixWorld(true);
    if (runtimeNode.mesh instanceof THREE.SkinnedMesh) {
      this.buildSkeleton();
    }
    return true;
  }

  rebuildSubtree(nodeUUID?: string): boolean {
    if (!nodeUUID) return false;
    const rootNode = this.nodesByUUID.get(nodeUUID);
    if (!rootNode) return false;
    rootNode.traverse((obj) => {
      if (!(obj instanceof OdysseyObject3D) || !obj.sourceNodeUUID) return;
      this.rebuildNode(obj.sourceNodeUUID);
    });
    return true;
  }

  rebuildModel(): void {
    this.rebuildFromSourceModel();
  }

  rebuildFromSourceModel(): void {
    const source = this.sourceModel;
    if (!source) return;
    const parent = this.parent;
    const context = this.context;
    const options = this.options || {};
    OdysseyModel3D.FromMDL(source, {
      ...options,
      context,
    }).then((rebuilt) => {
      if (!rebuilt || rebuilt === this) return;
      rebuilt.position.copy(this.position);
      rebuilt.quaternion.copy(this.quaternion);
      rebuilt.scale.copy(this.scale);
      if (parent) {
        parent.add(rebuilt);
        parent.remove(this);
      }
      this.dispatchEvent({
        type: 'odysseyInstanceReplaced',
        previous: this,
        next: rebuilt,
      } as THREE.Event);
      this.dispose();
    }).catch((e) => {
      console.error("OdysseyModel3D.rebuildFromSourceModel", e);
    });
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

    if(this.animateFrame){
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
      updateModelDanglyWind(this, GameState.windManager, dt);
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
      } as any);
      skinMaterial.defines.FORCE_SHIELD = '';
      skinMaterial.defines.IGNORE_LIGHTING = '';
      skinMaterial.defines.AURORA = '';
      skinMaterial.defines.USE_UV = '';
      skinMaterial.defines.USE_MAP = '';
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
    const supermodel: OdysseyModel = await MDLLoader.loader.load(resref);
    if(!supermodel){
      return odysseyModel;
    }

    odysseyModel.ensureNodesById();

    //--------------------------------------//
    // Supermodel: Animations Merge - Begin
    //--------------------------------------//
    for(let i = 0, ilen = supermodel.animations.length; i < ilen; i++){
      const animName = supermodel.animations[i].name;
      const hasAnim = odysseyModel.odysseyAnimationMap.has(animName);
      if(!hasAnim){
        const anim = OdysseyModelAnimation.From(supermodel.animations[i]);
        // SynchronizeNodes: remap anim model node.id onto geometry id space.
        // Clone happens inside sync so the cached supermodel MDL is not mutated.
        synchronizeAnimationToModel(anim, odysseyModel.nodes, odysseyModel.nodesById);
        odysseyModel.odysseyAnimations.push(anim);
        odysseyModel.odysseyAnimationMap.set(anim.name, anim);
      }
    }
    //------------------------------------//
    // Supermodel: Animations Merge - End
    //------------------------------------//

    const superModelName = supermodel.modelHeader.superModelName;
    if(!!superModelName){
      return OdysseyModel3D.SuperModelLoader( superModelName, odysseyModel ); 
    }
    return odysseyModel;
  }

  static async FromMDL(model: OdysseyModel, _options: IOdysseyModelLoaderOptions = {} as IOdysseyModelLoaderOptions): Promise<OdysseyModel3D> {
    return new Promise<OdysseyModel3D>( async (resolve: Function, reject: Function) => {

      const _default: IOdysseyModelLoaderOptions = {
        textureVar: '****',
        castShadow: false,
        receiveShadow: false,
        manageLighting: true,
        // context: Game,
        mergeStatic: false, //Use on room models
        static: false, //Static placeable
        parseChildren: true,
      } as IOdysseyModelLoaderOptions;

      const options: IOdysseyModelLoaderOptions = { ..._default, ..._options };
      if (options.attachMdlAabbMesh === undefined) {
        options.attachMdlAabbMesh = !!options.editorMode;
      }

      if(model){

        let odysseyModel = new OdysseyModel3D();
        odysseyModel.setSourceModel(model);
        odysseyModel.context = options.context;
        odysseyModel.name = model.geometryHeader.modelName.toLowerCase().trim();
        odysseyModel.options = options;
        odysseyModel.odysseyAnimations = [];
        for(let i = 0; i < model.animations.length; i++){
          const anim = OdysseyModelAnimation.From(model.animations[i]);
          odysseyModel.odysseyAnimations.push(anim);
          odysseyModel.odysseyAnimationMap.set(anim.name, anim);
          for (let j = 0; j < anim.nodes.length; j++) {
            const animNode = anim.nodes[j];
            const sourceNode = model.nodes.get(animNode.name);
            if (sourceNode) {
              animNode.sourceNodeUUID = sourceNode.uuid;
            }
          }
        }
        odysseyModel.Scale = 1;
        odysseyModel.names = model.names;
        odysseyModel.modelHeader = model.modelHeader;
        odysseyModel.affectedByFog = model.modelHeader.fogged ? true : false;

        // SelfIllum / Alpha clips mutate material uniforms — never share those ShaderMaterials.
        odysseyModel.materialUniqueAnimatedNodeNames =
          collectMaterialUniqueAnimNodeNames(odysseyModel.odysseyAnimations);

        if(options.mergeStatic){
          odysseyModel.mergedGeometries = [];
          odysseyModel.mergedDanglyGeometries = [];
          odysseyModel.mergedMaterials = [];
          odysseyModel.mergedDanglyMaterials = [];
          odysseyModel.mergedDanglyGroups = [];
          odysseyModel.mergedDanglyVertexOffset = 0;
          odysseyModel.mergedCastsShadow = false;
          
          // Material-based geometry grouping for optimized merging
          odysseyModel.geometryGroupsByMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();

          // Doors/placeables animate mesh nodes under the root (not room `modela`).
          // Exclude those from static merge so open/close clips still move geometry.
          // Also keep SelfIllum/Alpha animated meshes live (cannot bake into mergedMesh).
          odysseyModel.mergeExcludeAnimatedNodeNames =
            OdysseyModel3D.collectMergeExcludeAnimatedNodeNames(odysseyModel.odysseyAnimations);
          for(const name of odysseyModel.materialUniqueAnimatedNodeNames){
            odysseyModel.mergeExcludeAnimatedNodeNames.add(name);
          }
          // Mesh children under animated dummies (e.g. ani1_dummy → object02) are
          // not named in clips — keep their descendants out of mergeStatic too.
          odysseyModel.mergeExcludeAnimatedNodeNames =
            OdysseyModel3D.expandMergeExcludeWithDescendants(
              odysseyModel.mergeExcludeAnimatedNodeNames,
              model.rootNode,
            );
        }

        const parseContext = createNodeParseContext(options, {
          NodeMeshBuilder: OdysseyModel3D.NodeMeshBuilder,
          NodeLightBuilder: OdysseyModel3D.NodeLightBuilder,
          FromMDL: OdysseyModel3D.FromMDL,
        });
        odysseyModel.add(parseOdysseyNode(odysseyModel, odysseyModel, model.rootNode, parseContext));

        odysseyModel.userData.uuids = OdysseyModel3D.getUUIDs(odysseyModel);

        if(options.mergeStatic){
          
          //Merge Basic Geometries by Material
          if(odysseyModel.geometryGroupsByMaterial.size > 0){
            const finalGeometries: THREE.BufferGeometry[] = [];
            const finalMaterials: THREE.Material[] = [];
            
            // Process each material group
            for(const [material, geometries] of odysseyModel.geometryGroupsByMaterial){
              if(!geometries.length){ continue; }

              // Pre-merge geometries that use the same material
              ensureMergeCompatibleAttributes(geometries);
              const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries, true);
              if(!mergedGeometry){
                console.warn('OdysseyModel3D', 'mergeBufferGeometries failed for material group', material);
                continue;
              }
              finalGeometries.push(mergedGeometry);
              finalMaterials.push(material);
              
              // Dispose of individual geometries
              for(const geometry of geometries){
                geometry.dispose();
              }
            }
            
            // Final merge of all pre-merged geometries
            if(finalGeometries.length > 0){
              ensureMergeCompatibleAttributes(finalGeometries);
              odysseyModel.mergedBufferGeometry = BufferGeometryUtils.mergeBufferGeometries(finalGeometries, true);
              if(!odysseyModel.mergedBufferGeometry){
                console.warn('OdysseyModel3D', 'final mergeBufferGeometries failed', odysseyModel.name);
              }else{
                odysseyModel.mergedMesh = new THREE.Mesh(odysseyModel.mergedBufferGeometry, finalMaterials);
                odysseyModel.mergedMesh.receiveShadow = true;
                odysseyModel.mergedMesh.castShadow = odysseyModel.mergedCastsShadow;
                odysseyModel.mergedMesh.userData.odysseyMergedStatic = true;
                enableOdysseyMaterialShadowReceive(finalMaterials);
                OdysseyModel3D.registerMeshShadow(odysseyModel.mergedMesh, options);
                odysseyModel.add(odysseyModel.mergedMesh);
              }
              
              // Dispose of pre-merged geometries
              for(const geometry of finalGeometries){
                geometry.dispose();
              }
            }
            
            // Clear the material groups
            odysseyModel.geometryGroupsByMaterial.clear();
          }
          
          //Merge Dangly Geometries
          if(odysseyModel.mergedDanglyGeometries.length){

            ensureMergeCompatibleAttributes(odysseyModel.mergedDanglyGeometries);
            odysseyModel.mergedBufferDanglyGeometry = BufferGeometryUtils.mergeBufferGeometries(odysseyModel.mergedDanglyGeometries, true);
            odysseyModel.mergedDanglyMesh = new THREE.Mesh(odysseyModel.mergedBufferDanglyGeometry, odysseyModel.mergedDanglyMaterials);
            //odysseyModel.mergedDanglyMesh.receiveShadow = true;
            odysseyModel.add(odysseyModel.mergedDanglyMesh);
            initMergedDanglyWindMesh(odysseyModel.mergedDanglyMesh, odysseyModel.mergedDanglyGroups);

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
            node.removeFromParent();
          }

          // Hangar ships / anim-dummy props: InstancedMesh by shared mat+geo.
          odysseyModel.animDummyInstanceBatches = buildAnimDummyInstanceBatches(odysseyModel);

        }
        
        odysseyModel.buildSkeleton();
        odysseyModel.applyShadowCasterMaterials();

        if(model.modelHeader.superModelName.indexOf("null") == -1 && model.modelHeader.superModelName != ''){
          await OdysseyModel3D.SuperModelLoader(model.modelHeader.superModelName.toLowerCase(), odysseyModel);
        }

        odysseyModel.box.setFromArray([
          model.modelHeader.boundingMinX,
          model.modelHeader.boundingMinY,
          model.modelHeader.boundingMinZ,
          model.modelHeader.boundingMaxX,
          model.modelHeader.boundingMaxY,
          model.modelHeader.boundingMaxZ,
        ]);

        if(typeof _options.onComplete === 'function') _options.onComplete(odysseyModel);
        resolve(odysseyModel);
      }else{
        if(typeof _options.onComplete === 'function') _options.onComplete();
        reject('model is not of type OdysseyModel');
      }
    });

  }

  /**
   * Names of nodes with Position / Orientation / Scale controllers in any clip.
   * Used by mergeStatic so door/placeable panels are not baked into the closed pose.
   */
  static collectMergeExcludeAnimatedNodeNames(
    animations: OdysseyModelAnimation[] | undefined,
  ): Set<string> {
    const names = new Set<string>();
    if(!animations?.length) return names;
    for(let i = 0; i < animations.length; i++){
      const nodes = animations[i]?.nodes;
      if(!nodes?.length) continue;
      for(let j = 0; j < nodes.length; j++){
        const animNode = nodes[j];
        const controllers = animNode?.controllers;
        if(!controllers || !animNode.name) continue;
        if(
          controllers.has(OdysseyModelControllerType.Position) ||
          controllers.has(OdysseyModelControllerType.Orientation) ||
          controllers.has(OdysseyModelControllerType.Scale)
        ){
          names.add(animNode.name.toLowerCase());
        }
      }
    }
    return names;
  }

  /**
   * Once a node is merge-excluded, all descendants must stay live too
   * (animated dummy → child mesh with no clip entry of its own).
   */
  static expandMergeExcludeWithDescendants(
    seed: Set<string>,
    root: OdysseyModelNode | undefined,
  ): Set<string> {
    const names = new Set(seed);
    if(!root) return names;
    const walk = (node: OdysseyModelNode, underExcluded: boolean): void => {
      const name = (node.name || '').toLowerCase();
      const excluded = underExcluded || (!!name && names.has(name));
      if(excluded && name) names.add(name);
      const children = node.children;
      if(!children?.length) return;
      for(let i = 0; i < children.length; i++){
        walk(children[i], excluded);
      }
    };
    walk(root, false);
    return names;
  }

  /**
   * Names of nodes with SelfIllumColor / Alpha controllers in any clip.
   * Those meshes need unique materials (and must stay out of mergeStatic).
   */
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
    odysseyNode: OdysseyModelNodeMesh|OdysseyModelNodeDangly|OdysseyModelNodeSkin|OdysseyModelNodeAABB|OdysseyModelNodeSaber, 
    options: IOdysseyModelLoaderOptions
  ){
    try{
      //Create geometry only if the mesh is visible or it is a walkmesh
      const isSaber =
        (odysseyNode.nodeType & OdysseyModelNodeType.Saber) === OdysseyModelNodeType.Saber;

      // Sabers often have empty faces but valid verts/indices — still build the mesh.
      if(odysseyNode.faces.length || (isSaber && odysseyNode.vertices.length) ){

        if(!odysseyNode.isAnimDummyNode){
          //de-opt geometry if no uv's are present, we currently cannot handle this issue.
          if(!odysseyNode.tvectors[0].length) odysseyNode.isAnimDummyNode = true;
          else if(odysseyModel.mergeExcludeAnimatedNodeNames?.has(odysseyNode.name?.toLowerCase())){
            // Transform-animated mesh (door panels, etc.) — keep out of mergeStatic.
            odysseyNode.isAnimDummyNode = true;
          }
        }

        // Visible skin meshes cast SSCS shadows via the depth prepass (used invisible bone trimesh proxies).
        if( ( odysseyNode.flagRender || options.editorMode ) || (odysseyModel.modelHeader.classification == OdysseyModelClass.PLACEABLE)){

          //-------------------------//
          // BEGIN: GEOMETRY BUILDER
          //-------------------------//

          let geometry = undefined;
          
          //-------------------//
          // BUFFERED GEOMETRY
          //-------------------//
          if ((odysseyNode.nodeType & OdysseyModelNodeType.AABB) != OdysseyModelNodeType.AABB) {

            geometry = new THREE.BufferGeometry();
            if(odysseyNode.indices.length){
              geometry.setIndex(odysseyNode.indices);
            }

            //Positions
            geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( odysseyNode.vertices, 3 ) ); //Works with indices

            //Normals
            if(odysseyNode.normals.length){
              geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( odysseyNode.normals, 3 ) );
            }

            //UV1
            const vertCount = odysseyNode.vertices.length / 3;
            let uv1 = odysseyNode.tvectors[0];
            if(!uv1.length && vertCount > 0){
              uv1 = new Array(vertCount * 2).fill(0);
            }
            geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( uv1, 2 ) );
            
            //UV2 — must match vertex count for mergeBufferGeometries compatibility
            let uv2 = odysseyNode.tvectors[1];
            if(!uv2?.length && uv1.length){
              uv2 = uv1.slice ? uv1.slice(0) : Array.from(uv1 as number[]);
            }else if(uv2 && uv1.length && uv2.length !== uv1.length){
              // Mismatched LM channel — fall back to diffuse UVs rather than short attr
              uv2 = uv1.slice ? uv1.slice(0) : Array.from(uv1 as number[]);
            }else if(!uv2?.length && vertCount > 0){
              uv2 = new Array(vertCount * 2).fill(0);
            }
            geometry.setAttribute( 'uv2', new THREE.Float32BufferAttribute( uv2, 2 ) );

            // Vertex colors — MDX baked colors or white for shadow projection receivers.
            if(odysseyNode.colors.length >= odysseyNode.vertices.length){
              geometry.setAttribute('color', new THREE.Float32BufferAttribute(odysseyNode.colors, 3));
            }else if(options.receiveShadow || options.mergeStatic){
              const vCount = odysseyNode.vertices.length / 3;
              const colors = new Float32Array(vCount * 3);
              for(let ci = 0; ci < vCount * 3; ci++){
                colors[ci] = 1;
              }
              geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            }
            
            //--------------------------//
            // SKIN GEOMETRY ATTRIBUTES
            //--------------------------//
            if((odysseyNode.nodeType & OdysseyModelNodeType.Skin) == OdysseyModelNodeType.Skin){
              //Skin Index
              geometry.setAttribute( 'skinIndex', new THREE.Float32BufferAttribute( (odysseyNode as OdysseyModelNodeSkin).boneIdx, 4 ) )

              //Skin Weight
              geometry.setAttribute( 'skinWeight', new THREE.Float32BufferAttribute( (odysseyNode as OdysseyModelNodeSkin).weights, 4 ) );
            }

            //----------------------------//
            // DANGLY GEOMETRY ATTRIBUTES
            //----------------------------//
            if((odysseyNode.nodeType & OdysseyModelNodeType.Dangly) == OdysseyModelNodeType.Dangly){
              const danglyNode = odysseyNode as OdysseyModelNodeDangly;
              ensureDanglyConstraintAttribute(danglyNode, geometry);
              geometry.setAttribute( 'constraint', new THREE.Float32BufferAttribute( danglyNode.danglyVec4, 4 ) );
            }
            
            //Compute Geometry Tangents
            if((odysseyNode.nodeType & OdysseyModelNodeType.Saber) != OdysseyModelNodeType.Saber){
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
            geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );

            const normals = odysseyNode.faces.map( f => {
              return [ f.normal.x, f.normal.y, f.normal.z ]
            }).flat();

            //Normals
            geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );

            const colors = odysseyNode.faces.map( f => {
              const c = OdysseyWalkMesh.colorForMaterialIndex(f.materialIndex);
              return [
                c.r, c.g, c.b,
                c.r, c.g, c.b,
                c.r, c.g, c.b,
              ];
            }).flat();

            //Color
            geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) ); 
          }

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
          if ((odysseyNode.nodeType & OdysseyModelNodeType.Skin) == OdysseyModelNodeType.Skin) {
            material.defines = material.defines || {};
            material.defines.USE_SKINNING = '';
            // Defines changed after ShaderMaterial construction — force recompile.
            material.needsUpdate = true;
            if(material.userData){
              delete material.userData.odysseyProgramSortKey;
            }
            mesh = new THREE.SkinnedMesh( geometry , material );
            odysseyModel.skins.push(mesh);
            const shadowFlags = OdysseyModel3D.resolveMeshShadowFlags(odysseyNode, options, false);
            mesh.castShadow = shadowFlags.castShadow;
            mesh.receiveShadow = shadowFlags.receiveShadow;
            if(mesh.castShadow){
              OdysseyModel3D.applyShadowCasterDepthMaterial(mesh);
            }
            if(mesh.receiveShadow){
              OdysseyModel3D.registerMeshShadow(mesh, options);
            }
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

          //----------------//
          // MERGE GEOMETRY
          //----------------//
          // Sabers must stay as live light nodesaber meshes (trail rebuild each frame).
          if(!isSaber && !((odysseyNode.nodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB) && !odysseyNode.backgroundGeometry && options.mergeStatic && !odysseyNode.isAnimDummyNode && odysseyNode.faces.length){

            parentNode.getWorldPosition( mesh.position );
            parentNode.getWorldQuaternion( mesh.quaternion );
            mesh.updateMatrix(); // as needed

            //apply matrix to positions
            (geometry.getAttribute('position') as THREE.BufferAttribute).applyMatrix4( mesh.matrix );

            //apply matrix to normals
            let normalMatrix = new THREE.Matrix3().getNormalMatrix( mesh.matrix );
            (geometry.getAttribute('normal') as THREE.BufferAttribute).applyNormalMatrix( normalMatrix );
            geometry.normalizeNormals();

            // Rooms pass castShadow: false — merged static must not cast even if MDL flagShadow is set.
            if(options.castShadow !== false && (odysseyNode.flagShadow || options.castShadow)){
              odysseyModel.mergedCastsShadow = true;
            }

            if((odysseyNode.nodeType & OdysseyModelNodeType.Dangly) == OdysseyModelNodeType.Dangly){
              const danglyNode = odysseyNode as OdysseyModelNodeDangly;
              const vertCount = geometry.getAttribute("position").count;
              odysseyModel.mergedDanglyGroups.push({
                vertexStart: odysseyModel.mergedDanglyVertexOffset,
                vertexCount: vertCount,
                displacement: danglyNode.danglyDisplacement,
                tightness: danglyNode.danglyTightness,
                period: danglyNode.danglyPeriod,
              });
              odysseyModel.mergedDanglyVertexOffset += vertCount;
              odysseyModel.mergedDanglyGeometries.push(geometry);
              odysseyModel.mergedDanglyMaterials.push(material);
            }else{
              // Shared materials (cacheId hit) collapse into one merge group.
              if(!odysseyModel.geometryGroupsByMaterial.has(material)){
                odysseyModel.geometryGroupsByMaterial.set(material, []);
              }
              odysseyModel.geometryGroupsByMaterial.get(material).push(geometry);
            }

            //Unset the mesh variable so it can't be added to the node
            mesh = undefined;
          }
          
          //------------------//
          // ADD MESH TO NODE
          //------------------//
          if(mesh instanceof THREE.Mesh){
            (mesh as any).odysseyNode = odysseyNode;
            mesh.userData.odysseyModelNode = odysseyNode;
            (parentNode as any).mesh = mesh as any;
            mesh.matrixAutoUpdate = true;
            if ((odysseyNode.nodeType & OdysseyModelNodeType.Dangly) === OdysseyModelNodeType.Dangly) {
              initDanglyWindMesh(mesh, odysseyNode as OdysseyModelNodeDangly);
              odysseyModel.danglyMeshes.push(mesh);
            }
            if (isSaber) {
              const runtimeNode = parentNode as OdysseyObject3D;
              runtimeNode.saberTrail?.dispose();
              runtimeNode.saberTrail = new OdysseySaberTrail(
                mesh,
                odysseyNode as OdysseyModelNodeSaber,
                parentNode,
              );
              odysseyModel.saberMeshes.push(mesh);
              // Late transparent sort after default-order TXI decals.
              mesh.renderOrder = 2;
              runtimeNode.saberTrail.mesh.renderOrder = 2;
            }
            const isAabb = (odysseyNode.nodeType & OdysseyModelNodeType.AABB) === OdysseyModelNodeType.AABB;
            if(!isAabb || options.attachMdlAabbMesh){
              parentNode.add( mesh );
              parentNode.userData.mesh = mesh;
            }
            if(!isAabb){
              const shadowFlags = OdysseyModel3D.resolveMeshShadowFlags(odysseyNode, options, isSaber);
              mesh.castShadow = shadowFlags.castShadow;
              mesh.receiveShadow = shadowFlags.receiveShadow;
              mesh.userData.beaming = !!odysseyNode.beaming;
              if(mesh.castShadow){
                OdysseyModel3D.applyShadowCasterDepthMaterial(mesh);
              }
              OdysseyModel3D.registerMeshShadow(mesh, options);
            }else if(options.attachMdlAabbMesh){
              mesh.castShadow = false;
              mesh.receiveShadow = false;
            }
          }

        }

      }
      
    }catch(e){
      console.error('OdysseyModel3D failed to generate mesh', odysseyNode, e);
    }
  };

  cachedMaterials: Map<string, THREE.Material> = new Map<string, THREE.Material>();
  static NodeMaterialCacheId(
    odysseyNode: OdysseyModelNodeMesh,
    options?: IOdysseyModelLoaderOptions,
    odysseyModel?: OdysseyModel3D,
  ): string {
    let tMap1 = (odysseyNode.textureMap1 || '') + '';
    if(options?.textureVar && options.textureVar.indexOf('****') === -1){
      tMap1 = options.textureVar;
    }
    const tMap2 = (odysseyNode.textureMap2 || '') + '';
    const tMap3 = (odysseyNode.textureMap3 || '') + '';
    const tMap4 = (odysseyNode.textureMap4 || '') + '';
    const hasLm = !!(odysseyNode.hasLightmap && tMap2.length);
    const fog = odysseyModel?.affectedByFog ? 1 : 0;
    const sr = (options?.receiveShadow || options?.mergeStatic) ? 1 : 0;
    const lit = options?.lighting ? 1 : 0;
    const st = options?.static ? 1 : 0;
    const cs = options?.castShadow === false ? 0 : (options?.castShadow ? 1 : 0);
    const hol = options?.isHologram ? 1 : 0;
    const fs = options?.isForceShield ? 1 : 0;
    const tc = options?.useTweakColor ? 1 : 0;
    const tcv = options?.useTweakColor ? (options.tweakColor | 0) : 0;
    const emo = options?.envMapOverride || 'NONE';
    const fsh = odysseyNode.flagShadow ? 1 : 0;
    const tan = (
      (odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT1) ||
      (odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT2) ||
      (odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT3) ||
      (odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT4)
    ) ? 1 : 0;
    const bg = odysseyNode.backgroundGeometry ? 1 : 0;
    const fr = odysseyNode.flagRender ? 1 : 0;
    const th = odysseyNode.transparencyHint ? 1 : 0;
    let si = 'NONE';
    if(odysseyNode.controllers.has(OdysseyModelControllerType.SelfIllumColor)){
      const selfIllumColor = odysseyNode.controllers.get(OdysseyModelControllerType.SelfIllumColor);
      const frame = selfIllumColor?.data?.[0];
      if(frame){
        si = `${frame.x},${frame.y},${frame.z}`;
      }
    }
    let alpha = '1';
    if(odysseyNode.controllers.has(OdysseyModelControllerType.Alpha)){
      const a = odysseyNode.controllers.get(OdysseyModelControllerType.Alpha)?.data?.[0]?.value;
      if(typeof a === 'number'){ alpha = String(a); }
    }
    const auv = odysseyNode.nAnimateUV
      ? `1,${odysseyNode.fUVDirectionX},${odysseyNode.fUVDirectionY},${odysseyNode.fUVJitter},${odysseyNode.fUVJitterSpeed}`
      : '0';
    const dan = ((odysseyNode.nodeType & OdysseyModelNodeType.Dangly) === OdysseyModelNodeType.Dangly)
      ? `1,${(odysseyNode as OdysseyModelNodeDangly).danglyDisplacement},${(odysseyNode as OdysseyModelNodeDangly).danglyTightness},${(odysseyNode as OdysseyModelNodeDangly).danglyPeriod}`
      : '0';
    const bm = odysseyNode.beaming ? 1 : 0;
    const dirt = odysseyNode.dirtEnabled
      ? `1,${odysseyNode.dirtTexture ?? 1},${odysseyNode.dirtCoordSpace ?? 1}`
      : '0';
    const diff = (!tMap1 || tMap1 === 'toolcolors')
      ? `${odysseyNode.diffuse.r},${odysseyNode.diffuse.g},${odysseyNode.diffuse.b}`
      : 'NONE';
    const hh = (options?.isHologram && odysseyNode.hideInHolograms) ? 1 : 0;
    const uv = (
      (odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV1) ||
      (odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV2) ||
      (odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV3) ||
      (odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV4) ||
      ((odysseyNode.nodeType & OdysseyModelNodeType.Saber) === OdysseyModelNodeType.Saber)
    ) ? 1 : 0;
    const skin = ((odysseyNode.nodeType & OdysseyModelNodeType.Skin) === OdysseyModelNodeType.Skin) ? 1 : 0;

    return [
      `T1:${tMap1 || 'NONE'}`, `T2:${tMap2 || 'NONE'}`, `LM:${hasLm ? 1 : 0}`,
      `T3:${tMap3 || 'NONE'}`, `T4:${tMap4 || 'NONE'}`,
      `FOG:${fog}`, `SR:${sr}`, `LIT:${lit}`, `ST:${st}`, `CS:${cs}`,
      `HOL:${hol}`, `FS:${fs}`, `TC:${tc}`, `TCV:${tcv}`, `EMO:${emo}`,
      `FSH:${fsh}`, `TAN:${tan}`, `BG:${bg}`, `FR:${fr}`, `TH:${th}`,
      `SI:${si}`, `A:${alpha}`, `AUV:${auv}`, `DAN:${dan}`, `BM:${bm}`,
      `DIRT:${dirt}`, `D:${diff}`, `HH:${hh}`, `UV:${uv}`, `SKIN:${skin}`,
    ].join('|');
  }

  /**
   * Materials with per-instance animated state must not share.
   * Anim-dummy leaves without lightmaps may share (same T1/defines) so hangar
   * ships and props stop minting one ShaderMaterial per mesh.
   */
  static NodeMaterialCacheShareable(
    odysseyNode: OdysseyModelNodeMesh,
    options?: IOdysseyModelLoaderOptions,
    uniqueMaterialNodeNames?: Set<string>,
  ): boolean {
    return nodeMaterialCacheShareable(odysseyNode, options, uniqueMaterialNodeNames);
  }

  static NodeMaterialBuilder(odysseyModel: OdysseyModel3D, parentNode: THREE.Object3D, odysseyNode: OdysseyModelNodeMesh, options: IOdysseyModelLoaderOptions){
      
    let tMap1 = odysseyNode.textureMap1+'';
    let tMap2 = odysseyNode.textureMap2+'';
    let fallbackTexture = null;

    if(options.textureVar != '' && options.textureVar.indexOf('****') == -1){
      fallbackTexture = tMap1;
      tMap1 = options.textureVar;
    }

    if(tMap1 || tMap2){
      //odysseyNode.Diffuse.r = odysseyNode.Diffuse.g = odysseyNode.Diffuse.b = 0.8;
    }
    let material: THREE.Material;
    if((odysseyNode.nodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB){
      material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        fog: false,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      });
    }else{
      const cacheId = OdysseyModel3D.NodeMaterialCacheId(odysseyNode, options, odysseyModel);
      const canShare = OdysseyModel3D.NodeMaterialCacheShareable(
        odysseyNode,
        options,
        odysseyModel.materialUniqueAnimatedNodeNames,
      );
      // Share across placeables/doors/rooms — mergeStatic is no longer required.
      // SelfIllum/Alpha animated nodes never share (per-mesh uniform mutation).
      if(canShare && odysseyModel.cachedMaterials.has(cacheId)){
        return odysseyModel.cachedMaterials.get(cacheId)!;
      }

      material = new THREE.ShaderMaterial({
        fragmentShader: THREE.ShaderLib.odyssey.fragmentShader,
        vertexShader: THREE.ShaderLib.odyssey.vertexShader,
        uniforms: THREE.UniformsUtils.clone(THREE.ShaderLib.odyssey.uniforms),
        side: THREE.FrontSide,
        lights: false,
        fog: odysseyModel.affectedByFog,
      });
      material.userData.odysseyMaterialCacheId = cacheId;

      if(material instanceof THREE.ShaderMaterial){
        // Detach Vector4 light slots aliased by UniformsUtils.clone(ShaderLib).
        if(material.uniforms.odysseyLightPos){
          material.uniforms.odysseyLightPos.value = createEmptyOdysseyLightPosArray();
          material.userData.odysseyLightPosOwned = true;
        }
        if(material.uniforms.odysseyLightColor){
          material.uniforms.odysseyLightColor.value = createEmptyOdysseyLightColorArray();
          material.userData.odysseyLightColorOwned = true;
        }
        material.uniforms.shininess.value = 0.0000001;
        material.extensions.derivatives = true;
        //material.extensions.fragDepth = true;
        if(options.useTweakColor){
          material.uniforms.diffuse.value = new THREE.Color( odysseyNode.diffuse.r, odysseyNode.diffuse.g, odysseyNode.diffuse.b );
          material.uniforms.tweakColor.value.setRGB((options.tweakColor & 255)/255, ((options.tweakColor >> 8) & 255)/255, ((options.tweakColor >> 16) & 255)/255);
          material.defines.USE_TWEAK_COLOR = '';
        }else{
          material.uniforms.tweakColor.value.setRGB(1, 1, 1);
          material.uniforms.diffuse.value = new THREE.Color( 1, 1, 1 );//odysseyNode.Diffuse.r, odysseyNode.Diffuse.g, odysseyNode.Diffuse.b );
        }
        material.uniforms.time.value = options?.context?.time || 0;
        material.defines = material.defines || {};
        material.defines.AURORA = "";
        material.defines.MAX_ODYSSEY_LIGHTS = "8";

        if(options.isForceShield){
          material.defines.FORCE_SHIELD = "";
          material.defines.IGNORE_LIGHTING = "";
        }

        if(odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV1 || 
          odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV2 || 
          odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV3 || 
          odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV4 ||
          ((odysseyNode.nodeType & OdysseyModelNodeType.Saber) == OdysseyModelNodeType.Saber)
          ){
          material.defines.USE_UV = "";
        }

        if(odysseyNode.controllers.has(OdysseyModelControllerType.SelfIllumColor)){
          let selfIllumColor = odysseyNode.controllers.get(OdysseyModelControllerType.SelfIllumColor);
          const frame = selfIllumColor.data[0];
          if(frame){
            material.defines.SELFILLUMCOLOR = "";
            material.uniforms.selfIllumColor.value.setRGB(frame.x, frame.y, frame.z);
          }
        }

        // SetBeaming — beaming meshes use beamingProjectionAlpha as blend alpha.
        if(odysseyNode.beaming){
          material.userData.beaming = true;
          material.defines = material.defines || {};
          material.defines.USE_ODYSSEY_BEAMING = '';
          material.transparent = true;
          material.blending = THREE.AdditiveBlending;
          material.depthWrite = false;
          if(material.uniforms.opacity){
            material.uniforms.opacity.value = 0;
          }
          material.visible = false;
        }
      }

      if(!odysseyNode.flagRender && !((odysseyNode.nodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB)){
        material.visible = false;
      }

      // envmap assign — object-level envmap from appearance.2da
      // ENVMAP / baseitems partEnvMap, applied to all parts and overriding the TXI envmap.
      if(options.envMapOverride){
        material.userData.envMapOverride = options.envMapOverride;
      }

      odysseyModel.materials.push(material);
      
      if(odysseyNode.hasLightmap && tMap2.length){
        material.userData.lightmap = tMap2;
        material.userData.odysseyAuthoredLightmap = true;
        TextureLoader.enQueue(tMap2, material, TextureType.LIGHTMAP);
      }

      if(options.receiveShadow || options.mergeStatic){
        enableOdysseyMaterialShadowReceive(material);
      }

      if((!(odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT1) && 
        !(odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT2) && 
        !(odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT3) && 
        !(odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT4) &&
        !odysseyNode.flagShadow && !options.castShadow) || odysseyNode.backgroundGeometry || options.static){
          if(!options.lighting){
            material.defines.IGNORE_LIGHTING = "";
          }
      }

      if((odysseyNode.nodeType & OdysseyModelNodeType.Saber) == OdysseyModelNodeType.Saber){
        material.defines.IGNORE_LIGHTING = "";
        material.defines.SABER = "";
        // enableLightsaberBlurAdd — additive, no depth write, double-sided.
        material.transparent = true;
        material.blending = THREE.AdditiveBlending;
        material.depthWrite = false;
        material.side = THREE.DoubleSide;
      }

      if(options.isHologram){
        material.defines.HOLOGRAM = "";
        material.transparent = true;
        if(odysseyNode.hideInHolograms){
          material.visible = false;
        }
      }

      // TSL dirt overlay — Draw case 0x10.
      if(odysseyNode.dirtEnabled && material instanceof THREE.ShaderMaterial){
        const slot = Math.max(0, Math.min(2, ((odysseyNode.dirtTexture ?? 1) | 0) - 1));
        const dirtMap = DirtyTextureManager.getTexture(slot);
        if(dirtMap){
          material.defines.USE_DIRT = "";
          if(material.uniforms.dirtMap){
            material.uniforms.dirtMap.value = dirtMap;
          }else{
            material.uniforms.dirtMap = { value: dirtMap };
          }
          if(material.uniforms.dirtWorldspace){
            material.uniforms.dirtWorldspace.value = (odysseyNode.dirtCoordSpace ?? 1) !== 0 ? 1 : 0;
          }else{
            material.uniforms.dirtWorldspace = { value: (odysseyNode.dirtCoordSpace ?? 1) !== 0 ? 1 : 0 };
          }
          if(material.uniforms.dirtScale){
            material.uniforms.dirtScale.value = 0.1;
          }else{
            material.uniforms.dirtScale = { value: 0.1 };
          }
          material.needsUpdate = true;
        }
      }

      if(material instanceof THREE.ShaderMaterial){
        //Set dangly uniforms
        if((odysseyNode.nodeType & OdysseyModelNodeType.Dangly) == OdysseyModelNodeType.Dangly && odysseyNode) {
          const node: OdysseyModelNodeDangly = odysseyNode as any;
          material.uniforms.danglyDisplacement.value = node.danglyDisplacement;
          material.uniforms.danglyTightness.value = node.danglyTightness;
          material.uniforms.danglyPeriod.value = node.danglyPeriod;
          WindManager.bindWindUniforms(material.uniforms);
          material.defines.DANGLY = '';
          material.needsUpdate = true;
        }

        //Set animated uv uniforms — ProceduralAnimateHierarchy
        if(odysseyNode.nAnimateUV){
          material.uniforms.animatedUV.value.set(odysseyNode.fUVDirectionX, odysseyNode.fUVDirectionY, odysseyNode.fUVJitter, odysseyNode.fUVJitterSpeed);
          if(material.uniforms.animatedUVState){
            material.uniforms.animatedUVState.value.set(0, 0, 0, 0);
          }
          material.defines.ANIMATED_UV = '';
        }
      }

      let hasAlphaController = false;
      odysseyNode.controllers.forEach( (controller) => {
        if(controller.type === OdysseyModelControllerType.Alpha){
          hasAlphaController = true;
        }
      });
      // Additive TXI re-affirms transparent via this flag (force-cage shells, etc.).
      if(odysseyNode.transparencyHint || hasAlphaController){
        material.userData.odysseyAlphaFx = true;
      }

      if(odysseyNode.transparencyHint){
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
            }else if(!odysseyNode.transparencyHint){
              material.transparent = false;
            }
          break;
        }
      });

      if(!!tMap1 && tMap1 != 'toolcolors'){
        material.userData.map = tMap1;
        TextureLoader.enQueue(tMap1, material, TextureType.TEXTURE, undefined, fallbackTexture);
      }else{
        if(material instanceof THREE.ShaderMaterial){
          material.uniforms.diffuse.value.copy(odysseyNode.diffuse);
        }
      }

      material.needsUpdate = true;
      if(canShare){
        odysseyModel.cachedMaterials.set(cacheId, material);
      }
      material.addEventListener('txi', (event: any) => {
        const mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> = (parentNode as any).mesh;
        if(mesh && mesh.material.blending == THREE.AdditiveBlending){
          // transparencyHint outer shells draw after inner (hint false → 2, true → 3).
          mesh.renderOrder = odysseyNode.transparencyHint ? 3 : 2;
        }
      });
    }
    return material;
  };

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
    parentNode.flareColorShifts = flare.colorShifts.map((c) => c.clone());
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
