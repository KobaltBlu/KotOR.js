/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AuroraModelAnimation class holds the values used in animations.
 */

class AuroraModelAnimation {

  constructor(){
    this.type = 'AuroraModelAnimation';
    this.rootNode = new AuroraModelAnimationNode();
    //this.currentFrame = 0;
    //this.elapsed = 0;
    //this.lastTime = 0;
    //this.delta = 0;
    this.data = {
      loop: false,
      cFrame: 0,
      elapsed: 0,
      lastTime: 0,
      delta: 0,
      lastEvent: 0,
      events: [],
      callback: undefined
    };
    this.callback = null;

    this.lastEvent = 0;

    this._position = new THREE.Vector3();
    this._quaternion = new THREE.Quaternion();

    this.bezierA = new THREE.Vector3();
    this.bezierB = new THREE.Vector3();
    this.bezierC = new THREE.Vector3();

  }

  static From(original){
    let anim = new AuroraModelAnimation();
    //anim = Object.assign(Object.create( Object.getPrototypeOf(original)), original);
    anim.rootNode = original.rootNode;
    anim.currentFrame = original.currentFrame;
    anim.nodes = original.nodes;
    anim.ModelName = original.ModelName;
    anim.events = original.events;
    anim.name = original.name;
    anim.length = original.length;
    anim.transition = original.transition;

    this._position = new THREE.Vector3();
    this._quaternion = new THREE.Quaternion();

    this.bezierA = new THREE.Vector3();
    this.bezierB = new THREE.Vector3();
    this.bezierC = new THREE.Vector3();

    anim.data = {
      loop: false,
      cFrame: 0,
      elapsed: 0,
      lastTime: 0,
      delta: 0,
      lastEvent: 0,
      callback: undefined
    };

    return anim;
  }

  getDamageDelay(){
    for(let i = 0, len = this.events.length; i < len; i++){
      if(this.events[i].name == 'Hit'){
        return this.events[i].length;
      }
    }
    return 0.5;
  }

  static GetAnimation2DA(name = ''){
    for(let i = 0, len = Global.kotor2DA.animations.RowCount; i < len; i++){
      if(Global.kotor2DA.animations.rows[i].name.toLowerCase() == name.toLowerCase()){
        return Global.kotor2DA.animations.rows[i];
      }
    }
    return undefined;
  }

}
module.exports = AuroraModelAnimation;
