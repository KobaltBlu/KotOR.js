/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as THREE from "three";
import { OdysseyModelAnimation, OdysseyModelNode, OdysseyModel } from ".";
import { OdysseyModel3D } from "../three/odyssey";

/* @file
 * The OdysseyModelAnimationNode holds the values for an animation node
 */

export class OdysseyModelAnimationNode extends OdysseyModelNode {
  children: any[];
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
    // super.readBinary(odysseyModel);
  }

}
