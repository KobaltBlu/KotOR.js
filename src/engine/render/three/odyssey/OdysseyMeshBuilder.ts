import * as THREE from "three";
import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";
import { OdysseyModelNodeType } from "@core/enums/odyssey/OdysseyModelNodeType";
import { OdysseyModelClass } from "@core/enums/odyssey/OdysseyModelClass";
import { IOdysseyModelLoaderOptions } from "@engine/interface/odyssey/IOdysseyModelLoaderOptions";
import { OdysseyModelAnimation } from "@engine/odyssey/OdysseyModelAnimation";
import { OdysseyWalkMesh } from "@engine/odyssey/OdysseyWalkMesh";
import { type OdysseyModelNodeMesh } from "@engine/odyssey/OdysseyModelNodeMesh";
import { type OdysseyModelNodeDangly } from "@engine/odyssey/OdysseyModelNodeDangly";
import { ensureDanglyConstraintAttribute } from "@engine/odyssey/ensureDanglyVertexAttributes";
import {
  initDanglyWindMesh,
} from "@engine/odyssey/DanglyWindSimulator";
import { OdysseySaberTrail } from "@engine/odyssey/OdysseySaberTrail";
import { type OdysseyModelNodeSkin } from "@engine/odyssey/OdysseyModelNodeSkin";
import { type OdysseyModelNodeAABB } from "@engine/odyssey/OdysseyModelNodeAABB";
import { type OdysseyModelNodeSaber } from "@engine/odyssey/OdysseyModelNodeSaber";
import { type OdysseyModelNode } from "@engine/odyssey/OdysseyModelNode";
import { OdysseyObject3D } from "@engine/render/three/odyssey/OdysseyObject3D";
import { OdysseyMaterialBuilder } from "@engine/render/three/odyssey/OdysseyMaterialBuilder";
import { OdysseyModel3D } from "@engine/render/three/odyssey/OdysseyModel3D";

/**
 * Build a BufferAttribute from parse-time floats without copying Float32Array.
 * number[] still goes through Float32BufferAttribute (copies into Float32Array).
 */
function floatBufferAttribute(
  data: Float32Array | number[] | ArrayLike<number> | undefined | null,
  itemSize: number,
  copy = false,
): THREE.BufferAttribute {
  if(!data){
    return new THREE.BufferAttribute(new Float32Array(0), itemSize);
  }
  if(data instanceof Float32Array){
    return new THREE.BufferAttribute(copy ? new Float32Array(data) : data, itemSize);
  }
  return new THREE.Float32BufferAttribute(data as number[], itemSize);
}

/**
 * THREE BufferGeometry.setIndex() only wraps JS arrays. A bare Uint16/Uint32Array
 * becomes geometry.index without an `.array` property and crashes WebGLAttributes.
 */
function setGeometryIndex(
  geometry: THREE.BufferGeometry,
  indices: Uint32Array | Uint16Array | number[] | undefined | null,
): void {
  if(!indices || !(indices as ArrayLike<number>).length){
    return;
  }
  if(indices instanceof Uint32Array || indices instanceof Uint16Array){
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    return;
  }
  geometry.setIndex(indices as number[]);
}

function uvChannelOrZeros(
  uv: Float32Array | number[] | undefined,
  vertCount: number,
): Float32Array | number[] {
  if(uv && uv.length){
    return uv;
  }
  if(vertCount <= 0){
    return uv ?? [];
  }
  return new Float32Array(vertCount * 2);
}

function uvChannelMatchLength(
  uv2: Float32Array | number[] | undefined,
  uv1: Float32Array | number[],
  vertCount: number,
): Float32Array | number[] {
  if(!uv2?.length && uv1.length){
    return uv1 instanceof Float32Array ? new Float32Array(uv1) : (uv1.slice ? uv1.slice(0) : Array.from(uv1 as number[]));
  }
  if(uv2 && uv1.length && uv2.length !== uv1.length){
    return uv1 instanceof Float32Array ? new Float32Array(uv1) : (uv1.slice ? uv1.slice(0) : Array.from(uv1 as number[]));
  }
  if(!uv2?.length && vertCount > 0){
    return new Float32Array(vertCount * 2);
  }
  return uv2 ?? [];
}

/**
 * Names of nodes with Position / Orientation / Scale controllers in any clip.
 * Used by mergeStatic so door/placeable panels are not baked into the closed pose.
 */
export function collectMergeExcludeAnimatedNodeNames(
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
export function expandMergeExcludeWithDescendants(
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
 * Build THREE mesh geometry/material for an Odyssey mesh node and attach to parentNode.
 */
export function buildOdysseyNodeMesh(
  odysseyModel: OdysseyModel3D,
  parentNode: THREE.Object3D,
  odysseyNode: OdysseyModelNodeMesh|OdysseyModelNodeDangly|OdysseyModelNodeSkin|OdysseyModelNodeAABB|OdysseyModelNodeSaber,
  options: IOdysseyModelLoaderOptions
): void {
  try{
    const isSaber =
      (odysseyNode.nodeType & OdysseyModelNodeType.Saber) === OdysseyModelNodeType.Saber;

    // Sabers often have empty faces but valid verts/indices — still build the mesh.
    const faceLen = (odysseyNode.faceCount | 0) || (odysseyNode.faces?.length | 0);
    if(faceLen || (isSaber && odysseyNode.vertices.length) ){

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

          const willMergeStatic = !isSaber
            && !odysseyNode.backgroundGeometry
            && !!options.mergeStatic
            && !odysseyNode.isAnimDummyNode
            && !!faceLen;
          // mergeStatic applies world matrices to position/normal — copy those attrs.
          const copyPosNorm = willMergeStatic;

          geometry = new THREE.BufferGeometry();
          setGeometryIndex(geometry, odysseyNode.indices);

          //Positions — prefer parse-time Float32Array without an extra copy.
          geometry.setAttribute( 'position', floatBufferAttribute( odysseyNode.vertices, 3, copyPosNorm ) );

          //Normals
          if(odysseyNode.normals.length){
            geometry.setAttribute( 'normal', floatBufferAttribute( odysseyNode.normals, 3, copyPosNorm ) );
          }

          //UV1
          const vertCount = odysseyNode.vertices.length / 3;
          const uv1 = uvChannelOrZeros(odysseyNode.tvectors[0], vertCount);
          geometry.setAttribute( 'uv', floatBufferAttribute( uv1, 2 ) );

          // Lightmap UVs (attribute uv1 — Three r151+; formerly uv2) — must match
          // vertex count for mergeGeometries compatibility
          const uv2 = uvChannelMatchLength(odysseyNode.tvectors[1], uv1, vertCount);
          geometry.setAttribute( 'uv1', floatBufferAttribute( uv2, 2 ) );

          // Vertex colors — MDX baked colors or white for shadow projection receivers.
          if(odysseyNode.colors.length >= odysseyNode.vertices.length){
            geometry.setAttribute('color', floatBufferAttribute(odysseyNode.colors, 3));
          }else if(options.receiveShadow || options.mergeStatic){
            const vCount = odysseyNode.vertices.length / 3;
            const colors = new Float32Array(vCount * 3);
            colors.fill(1);
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          }

          //--------------------------//
          // SKIN GEOMETRY ATTRIBUTES
          //--------------------------//
          if((odysseyNode.nodeType & OdysseyModelNodeType.Skin) == OdysseyModelNodeType.Skin){
            const skinNode = odysseyNode as OdysseyModelNodeSkin;
            geometry.setAttribute( 'skinIndex', floatBufferAttribute( skinNode.boneIdx, 4 ) );
            geometry.setAttribute( 'skinWeight', floatBufferAttribute( skinNode.weights, 4 ) );
          }

          //----------------------------//
          // DANGLY GEOMETRY ATTRIBUTES
          //----------------------------//
          if((odysseyNode.nodeType & OdysseyModelNodeType.Dangly) == OdysseyModelNodeType.Dangly){
            const danglyNode = odysseyNode as OdysseyModelNodeDangly;
            ensureDanglyConstraintAttribute(danglyNode, geometry);
            geometry.setAttribute( 'constraint', floatBufferAttribute( danglyNode.danglyVec4, 4 ) );
          }

        }else{
          geometry = new THREE.BufferGeometry();

          const aabbFaceCount = (odysseyNode.faceCount | 0) || odysseyNode.faces.length;
          const vertices: number[] = [];
          const normals: number[] = [];
          const colors: number[] = [];
          for (let fi = 0; fi < aabbFaceCount; fi++) {
            let a: number;
            let b: number;
            let c: number;
            let nx: number;
            let ny: number;
            let nz: number;
            let materialIndex: number;
            if (odysseyNode.faceIndices && odysseyNode.faceCount > 0) {
              a = odysseyNode.faceIndices[fi * 3];
              b = odysseyNode.faceIndices[fi * 3 + 1];
              c = odysseyNode.faceIndices[fi * 3 + 2];
              nx = odysseyNode.faceNormals[fi * 3];
              ny = odysseyNode.faceNormals[fi * 3 + 1];
              nz = odysseyNode.faceNormals[fi * 3 + 2];
              materialIndex = odysseyNode.faceMaterialIndices[fi];
            } else {
              const f = odysseyNode.faces[fi];
              a = f.a; b = f.b; c = f.c;
              nx = f.normal.x; ny = f.normal.y; nz = f.normal.z;
              materialIndex = f.materialIndex;
            }
            vertices.push(
              odysseyNode.vertices[(a * 3) + 0], odysseyNode.vertices[(a * 3) + 1], odysseyNode.vertices[(a * 3) + 2],
              odysseyNode.vertices[(b * 3) + 0], odysseyNode.vertices[(b * 3) + 1], odysseyNode.vertices[(b * 3) + 2],
              odysseyNode.vertices[(c * 3) + 0], odysseyNode.vertices[(c * 3) + 1], odysseyNode.vertices[(c * 3) + 2],
            );
            // Match prior AABB path: one normal triplet + per-vertex color from material.
            normals.push(nx, ny, nz);
            const col = OdysseyWalkMesh.colorForMaterialIndex(materialIndex);
            colors.push(col.r, col.g, col.b, col.r, col.g, col.b, col.r, col.g, col.b);
          }

          geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
          geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
          geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
        }

        //-------------------------//
        // BEGIN: MATERIAL BUILDER
        //-------------------------//
        let material = OdysseyMaterialBuilder.buildNodeMaterial(odysseyModel, parentNode, odysseyNode, options);

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
          const skinShadowFlags = OdysseyModel3D.resolveMeshShadowFlags(odysseyNode, options, false);
          mesh.castShadow = skinShadowFlags.castShadow;
          mesh.receiveShadow = skinShadowFlags.receiveShadow;
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
          console.error('OdysseyMeshBuilder', 'Failed to generate mesh node', odysseyNode);
        }

        //Need to see if this affects memory usage
        mesh.userData.odysseyModel = odysseyModel;

        //----------------//
        // MERGE GEOMETRY
        //----------------//
        // Sabers must stay as live light nodesaber meshes (trail rebuild each frame).
        // Skins must stay SkinnedMesh: their bones animate (placeables can use
        // character models, e.g. seated pazaak players), and a static merge
        // would drop skinning and bake the bind pose.
        if(!isSaber && !(mesh instanceof THREE.SkinnedMesh) && !((odysseyNode.nodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB) && !odysseyNode.backgroundGeometry && options.mergeStatic && !odysseyNode.isAnimDummyNode && faceLen){

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
    console.error('OdysseyMeshBuilder failed to generate mesh', odysseyNode, e);
  }
}
