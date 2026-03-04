import * as THREE from "three";


import type { OdysseyModel } from "@/odyssey/OdysseyModel";
import type { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import { OdysseyModelNode } from "@/odyssey/OdysseyModelNode";
import { OdysseyModel3D } from "@/three/odyssey";

/**
 * OdysseyModelAnimationNode class.
 * 
 * The OdysseyModelAnimationNode holds the values for an animation node
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelAnimationNode.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyModelAnimationNode extends OdysseyModelNode {
  children: OdysseyModelAnimationNode[] = [];
  modelNodeCache: Record<string, Record<string, OdysseyModelNode | undefined>> = {};
  animation: OdysseyModelAnimation;

  constructor(animation?: OdysseyModelAnimation){
    super(undefined);
    this.animation = animation;
    // super(parent);
    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.controllers = new Map();
    this.children = [];
    this.name = '';
    this.modelNodeCache = {};
  }

  getNode(node: OdysseyModelNode, model: OdysseyModel3D){

    if(node && model){
      let cache = this.modelNodeCache[model.uuid] || undefined;
      if(typeof cache == 'undefined'){
        cache = this.modelNodeCache[model.uuid] = {} as Record<string, OdysseyModelNode | undefined>;
      }

      let nodeCache = cache[node.name];
      if(typeof nodeCache == 'undefined'){
        nodeCache = model.nodes.get(node.name) as unknown as OdysseyModelNode | undefined;
        this.modelNodeCache[model.uuid][node.name] = nodeCache;
      }

      return nodeCache;

    }

  }

  readBinary(odysseyModel: OdysseyModel){
    super.readBinary(odysseyModel);
  }

}
