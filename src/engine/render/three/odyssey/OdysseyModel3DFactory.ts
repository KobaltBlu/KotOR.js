import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils";
import { MDLLoader } from "@engine/loaders";
import { IOdysseyModelLoaderOptions } from "@engine/interface/odyssey/IOdysseyModelLoaderOptions";
import { OdysseyModelAnimation } from "@engine/odyssey/OdysseyModelAnimation";
import { synchronizeAnimationToModel } from "@engine/odyssey/OdysseyNodeIdSync";
import { type OdysseyModel } from "@engine/odyssey/OdysseyModel";
import {
  initMergedDanglyWindMesh,
} from "@engine/odyssey/DanglyWindSimulator";
import { enableOdysseyMaterialShadowReceive } from "@engine/render/shaders/chunks/OdysseyShadow";
import { createNodeParseContext } from "@engine/render/three/odyssey/OdysseyModel3DNodeParseContext";
import { parseOdysseyNode } from "@engine/render/three/odyssey/OdysseyModel3DNodeParser";
import {
  buildAnimDummyInstanceBatches,
} from "@engine/render/three/odyssey/OdysseyAnimDummyInstancer";
import {
  collectMaterialUniqueAnimatedNodeNames,
} from "@engine/render/three/odyssey/nodeMaterialCacheShareable";
import { ensureMergeCompatibleAttributes } from "@engine/render/three/odyssey/ensureMergeCompatibleAttributes";
import {
  buildOdysseyNodeMesh,
  collectMergeExcludeAnimatedNodeNames,
  expandMergeExcludeWithDescendants,
} from "@engine/render/three/odyssey/OdysseyMeshBuilder";
import { OdysseyObject3D } from "@engine/render/three/odyssey/OdysseyObject3D";
import { OdysseyModel3D } from "@engine/render/three/odyssey/OdysseyModel3D";

type SyncedAnimNodes = Pick<OdysseyModelAnimation, 'nodes' | 'rootNode'>;

/**
 * Supermodel anim → node-id-synchronized node set, per geometry source model.
 *
 * The sync result depends only on the geometry hierarchy (names, nodeNumbers,
 * parent links), which is identical for every OdysseyModel3D built from the
 * same parsed OdysseyModel with the same parse options. Cloning the anim nodes
 * is the dominant per-creature load cost (~20k nodes for the humanoid
 * supermodel chain), so build it once and share the read-only node set.
 * Per-instance state on anim nodes (modelNodeCache) is already keyed by model uuid.
 */
const superAnimSyncCache = new WeakMap<OdysseyModel, Map<string, WeakMap<OdysseyModelAnimation, SyncedAnimNodes>>>();

function getSuperAnimSyncCache(odysseyModel: OdysseyModel3D): WeakMap<OdysseyModelAnimation, SyncedAnimNodes> | undefined {
  const source = odysseyModel.sourceModel;
  // Editor sessions can mutate the source hierarchy; always resync there.
  if(!source || odysseyModel.options?.editorMode){
    return undefined;
  }
  let bySignature = superAnimSyncCache.get(source);
  if(!bySignature){
    bySignature = new Map();
    superAnimSyncCache.set(source, bySignature);
  }
  const signature = `${odysseyModel.options?.parseChildren !== false}:${odysseyModel.nodes.size}:${odysseyModel.nodesById.length}`;
  let byAnim = bySignature.get(signature);
  if(!byAnim){
    byAnim = new WeakMap();
    bySignature.set(signature, byAnim);
  }
  return byAnim;
}

/**
 * Load supermodel animation chain onto an already-built OdysseyModel3D.
 */
export async function loadOdysseySuperModel(
  resref: string,
  odysseyModel: OdysseyModel3D,
): Promise<OdysseyModel3D> {
  const supermodel: OdysseyModel = await MDLLoader.loader.load(resref);
  if(!supermodel){
    return odysseyModel;
  }

  odysseyModel.ensureNodesById();
  const syncCache = getSuperAnimSyncCache(odysseyModel);

  //--------------------------------------//
  // Supermodel: Animations Merge - Begin
  //--------------------------------------//
  for(let i = 0, ilen = supermodel.animations.length; i < ilen; i++){
    const superAnim = supermodel.animations[i];
    const animName = superAnim.name;
    const hasAnim = odysseyModel.odysseyAnimationMap.has(animName);
    if(!hasAnim){
      const anim = OdysseyModelAnimation.From(superAnim);
      const synced = syncCache?.get(superAnim);
      if(synced){
        anim.nodes = synced.nodes;
        anim.rootNode = synced.rootNode;
      }else{
        // SynchronizeNodes: remap anim model node.id onto geometry id space.
        // Clone happens inside sync so the cached supermodel MDL is not mutated.
        synchronizeAnimationToModel(anim, odysseyModel.nodes, odysseyModel.nodesById);
        syncCache?.set(superAnim, { nodes: anim.nodes, rootNode: anim.rootNode });
      }
      odysseyModel.odysseyAnimations.push(anim);
      odysseyModel.odysseyAnimationMap.set(anim.name, anim);
    }
  }
  //------------------------------------//
  // Supermodel: Animations Merge - End
  //------------------------------------//

  const superModelName = supermodel.modelHeader.superModelName;
  if(!!superModelName){
    return loadOdysseySuperModel( superModelName, odysseyModel );
  }
  return odysseyModel;
}

function finishMergeStatic(odysseyModel: OdysseyModel3D, options: IOdysseyModelLoaderOptions): void {
  //Merge Basic Geometries by Material
  if(odysseyModel.geometryGroupsByMaterial.size > 0){
    const finalGeometries: THREE.BufferGeometry[] = [];
    const finalMaterials: THREE.Material[] = [];

    // Process each material group
    for(const [material, geometries] of odysseyModel.geometryGroupsByMaterial){
      if(!geometries.length){ continue; }

      // Pre-merge geometries that use the same material
      ensureMergeCompatibleAttributes(geometries);
      const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, true);
      if(!mergedGeometry){
        console.warn('OdysseyModel3DFactory', 'mergeGeometries failed for material group', material);
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
      odysseyModel.mergedBufferGeometry = BufferGeometryUtils.mergeGeometries(finalGeometries, true);
      if(!odysseyModel.mergedBufferGeometry){
        console.warn('OdysseyModel3DFactory', 'final mergeGeometries failed', odysseyModel.name);
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
    odysseyModel.mergedBufferDanglyGeometry = BufferGeometryUtils.mergeGeometries(odysseyModel.mergedDanglyGeometries, true);
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
  while(pruneCount--){
    let node = pruneList.splice(0, 1)[0];
    node.removeFromParent();
  }

  // Hangar ships / anim-dummy props: InstancedMesh by shared mat+geo.
  odysseyModel.animDummyInstanceBatches = buildAnimDummyInstanceBatches(odysseyModel);
}

/**
 * Construct an OdysseyModel3D from a parsed OdysseyModel (FromMDL body).
 */
export async function createOdysseyModel3DFromMDL(
  model: OdysseyModel,
  _options: IOdysseyModelLoaderOptions = {} as IOdysseyModelLoaderOptions,
): Promise<OdysseyModel3D> {
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
        collectMaterialUniqueAnimatedNodeNames(odysseyModel.odysseyAnimations);

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
          collectMergeExcludeAnimatedNodeNames(odysseyModel.odysseyAnimations);
        for(const name of odysseyModel.materialUniqueAnimatedNodeNames){
          odysseyModel.mergeExcludeAnimatedNodeNames.add(name);
        }
        // Mesh children under animated dummies (e.g. ani1_dummy → object02) are
        // not named in clips — keep their descendants out of mergeStatic too.
        odysseyModel.mergeExcludeAnimatedNodeNames =
          expandMergeExcludeWithDescendants(
            odysseyModel.mergeExcludeAnimatedNodeNames,
            model.rootNode,
          );
      }

      const parseContext = createNodeParseContext(options, {
        NodeMeshBuilder: buildOdysseyNodeMesh,
        NodeLightBuilder: OdysseyModel3D.NodeLightBuilder,
        FromMDL: OdysseyModel3D.FromMDL,
      });
      odysseyModel.add(parseOdysseyNode(odysseyModel, odysseyModel, model.rootNode, parseContext));

      odysseyModel.userData.uuids = OdysseyObject3D.getUUIDs(odysseyModel);

      if(options.mergeStatic){
        finishMergeStatic(odysseyModel, options);
      }

      // buildSkeleton() finishes with applyShadowCasterMaterials().
      odysseyModel.buildSkeleton();

      if(model.modelHeader.superModelName.indexOf("null") == -1 && model.modelHeader.superModelName != ''){
        await loadOdysseySuperModel(model.modelHeader.superModelName.toLowerCase(), odysseyModel);
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
