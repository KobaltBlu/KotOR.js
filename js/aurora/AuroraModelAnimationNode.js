/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AuroraModelAnimationNode holds the values for an animation node
 */

 class AuroraModelAnimationNode {

  constructor(){
    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.controllers = new Map();
    this.children = [];
    this.name = '';;
  }

}
module.exports = AuroraModelAnimationNode;
