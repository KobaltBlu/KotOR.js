/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AuroraModelAnimationNode holds the values for an animation node
 */

 class AuroraModelAnimationNode {

  constructor(){
    this.position = {x: 0, y: 0, z: 0};
    this.quaternion = {x: 0, y: 0, z: 0, w: 0};
    this.controllers = [];
    this.children = [];
    this.name = '';;
  }

}
module.exports = AuroraModelAnimationNode;
