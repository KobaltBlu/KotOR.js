import * as THREE from "three";
import { OdysseyModel3D } from "../three/odyssey";
import { OdysseyModelNode } from "./OdysseyModelNode";
import type { OdysseyModelAnimation } from "./OdysseyModelAnimation";
import type { OdysseyModel } from "./OdysseyModel";

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
  modelNodeCache: any = {};
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
        cache = this.modelNodeCache[model.uuid] = {};
      }

      let nodeCache = cache[node.name] || undefined;
      if(typeof nodeCache == 'undefined'){
        nodeCache = this.modelNodeCache[model.uuid][node.name] = model.nodes.get(node.name);
      }

      return nodeCache;

    }

  }

  readBinary(odysseyModel: OdysseyModel){
    super.readBinary(odysseyModel);
  }

}
