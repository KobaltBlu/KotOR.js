/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * THREE.AuroraModelNode
 */

THREE.AuroraModelNode = function () {

  THREE.Object3D.call( this );

  this.controllers = [];


  this.getControllerByType = function(type = -1){

    for(let i = 0; i < this.controllers.length; i++){
      let cntrler = this.controllers[i];
      if(cntrler.type == type){
        return cntrler;
      }
    }

    return null;

  }

};

// grabbing all the prototype methods from Object3D
THREE.AuroraModelNode.prototype = Object.create( THREE.Object3D.prototype );
