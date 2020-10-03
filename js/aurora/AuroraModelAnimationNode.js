/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AuroraModelAnimationNode holds the values for an animation node
 */

 class AuroraModelAnimationNode {

  constructor(){
    this.type = 'AuroraModelAnimationNode';
    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.controllers = new Map();
    this.children = [];
    this.name = '';

    this.modelNodeCache = {};


  }

  getNode(node, model){

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

}
module.exports = AuroraModelAnimationNode;
