/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AuroraModelAnimation class holds the values used in animations.
 */

class AuroraModelAnimation {

  constructor(){
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

  Update(delta, obj, onEnd = null){
    this.delta = delta;

    this.UpdateEvents(obj);

    this.UpdateNode(this.rootNode, obj);

    if(this.elapsed > this.length){

      this.lastTime = this.elapsed; this.elapsed = 0;
      if(typeof this.callback === 'function')
        this.callback();

      if(typeof onEnd == 'function')
        onEnd();
    }else{
      this.elapsed += delta;
    }

    this.lastTime = this.elapsed;
  }

  UpdateEvents(obj){
    let last = 0;
    for(let f = 0; f < this.events.length; f++){
      if(this.events[f].length <= this.elapsed){
        last = f;
      }
    }

    let next = last + 1;
    if (last + 1 >= this.events.length || this.events[last].length >= this.elapsed) {
      next = 0
    }

    if(next != this.lastEvent){
      this.lastEvent = next;
      obj.playEvent(this.events[next].name);
    }
  }

  UpdateNode(node, obj) {

    let modelNode = obj.getObjectByName(node.name);

    if(typeof modelNode != 'undefined'){
      let offsetX = 0;
      let offsetY = 0;
      let offsetZ = 0;

      let offsetQX = 0;
      let offsetQY = 0;
      let offsetQZ = 0;
      let offsetQW = 1;

      let offsetScale = 0;

      try{

        let posController = modelNode.getControllerByType(8);

        if(posController.type != 8)
          throw 'Not a position controller'

        offsetX = posController.data[0].x;
        offsetY = posController.data[0].y;
        offsetZ = posController.data[0].z;
      }catch(e){}

      try{

        let quatController = modelNode.getControllerByType(20);

        if(quatController.type != 20)
          throw 'Not a orientation controller'

        offsetQX = quatController.data[0].x;
        offsetQY = quatController.data[0].y;
        offsetQZ = quatController.data[0].z;
        offsetQW = quatController.data[0].w;
      }catch(e){}

      try{

        let scaleController = modelNode.getControllerByType(36);

        if(scaleController.type != 36)
          throw 'Not a scale controller'

        offsetScale = scaleController.data[0].value;
      }catch(e){}

      //console.log(modelNode.name, modelNode);

      for(let ci = 0; ci < node.controllers.length; ci++){

        let controller = node.controllers[ci];

        try{

          if(controller.data.length == 1 || this.elapsed == 0){
            let data = controller.data[0];
            switch(controller.type){
              case ControllerType.Position:
                modelNode.position.set((data.x + offsetX) * obj.Scale, (data.y + offsetY) * obj.Scale, (data.z + offsetZ) * obj.Scale);
              break;
              case ControllerType.Orientation:
                if(data.x == 0 && data.y == 0 && data.z == 0 && data.w == 1){
                  data.x = offsetQX;
                  data.y = offsetQY;
                  data.z = offsetQZ;
                  data.w = offsetQW;
                }

                modelNode.quaternion.set(data.x * obj.Scale, data.y * obj.Scale, data.z * obj.Scale, data.w * obj.Scale);
              break;
              case ControllerType.Scale:
                modelNode.scale.set((data.value + offsetScale) * obj.Scale, (data.value + offsetScale) * obj.Scale, (data.value + offsetScale) * obj.Scale);
              break;
            }
          }else{

            let lastFrame = 0;
            for(let f = 0; f < controller.data.length; f++){
              if(controller.data[f].time <= this.elapsed){
                lastFrame = f;
              }
            }

            let last = controller.data[lastFrame];

            // if (lastFrame + 1 >= controller.data.length || last.time >= this.elapsed) {
            //   switch(controller.type){
            //     case ControllerType.Position:
            //       modelNode.position.set((last.x + offsetX) * obj.Scale, (last.y + offsetY) * obj.Scale, (last.z + offsetZ) * obj.Scale);
            //     break;
            //     case ControllerType.Orientation:
            //       if(last.x == 0 && last.y == 0 && last.z == 0 && last.w == 1){
            //         last.x = offsetQX;
            //         last.y = offsetQY;
            //         last.z = offsetQZ;
            //         last.w = offsetQW
            //       }

            //       modelNode.quaternion.set(last.x * obj.Scale, last.y * obj.Scale, last.z * obj.Scale, last.w * obj.Scale);
            //     break;
            //   }
            //   return;
            // }

            let next = controller.data[lastFrame + 1];
            if (lastFrame + 1 >= controller.data.length || last.time >= this.elapsed) {
              next = controller.data[0];
            }

            switch(controller.type){
              case ControllerType.Position:
                let fl = (this.elapsed - last.time) / (next.time - last.time);
                modelNode.position.lerp(new THREE.Vector3(next.x + offsetX, next.y + offsetY, next.z + offsetZ), fl);
              break;
              case ControllerType.Orientation:
                let qfl = (this.elapsed - last.time) / (next.time - last.time);
                if(next.x == 0 && next.y == 0 && next.z == 0 && next.w == 1){
                  next.x = offsetQX;
                  next.y = offsetQY;
                  next.z = offsetQZ;
                  next.w = offsetQW
                }

                modelNode.quaternion.slerp(new THREE.Quaternion(next.x* obj.Scale, next.y* obj.Scale, next.z* obj.Scale, next.w* obj.Scale), qfl);
              break;
              case ControllerType.Scale:
                let sfl = (this.elapsed - last.time) / (next.time - last.time);
                modelNode.position.lerp(new THREE.Vector3(next.value + offsetX, next.value + offsetY, next.value + offsetZ), sfl);
              break;
            }

          }

        }catch(e){
          console.error(e);
        }

      }
    }

    for(let i = 0; i < node.children.length; i++){
      this.UpdateNode(node.children[i], obj);
    }

  }

  static from(obj){

    let anim = new AuroraModelAnimation();

    anim.length = obj.length;
    anim.transition = obj.transition;
    anim.ModelName = obj.ModelName;
    anim.name = obj.name;
    anim.currentFrame = 0;
    anim.elapsed = 0;
    anim.lastTime = 0;

    anim.events = JSON.parse(JSON.stringify(obj.events));

    anim.rootNode = AuroraModelAnimation.cloneAnimationNode(obj.rootNode);

    return anim;

  }

  static cloneAnimationNode( node ){

    let clone =  new AuroraModelAnimationNode();

    clone.name = node.name;
    clone.position = new THREE.Vector3(node.position.x, node.position.y, node.position.z);
    clone.quaternion = new THREE.Quaternion(node.quaternion.x, node.quaternion.y, node.quaternion.z, node.quaternion.w);
    clone.controllers = JSON.parse(JSON.stringify(node.controllers));

    for(let i = 0; i < node.children.length; i++){
      clone.children.push(AuroraModelAnimation.cloneAnimationNode(node.children[i]));
    }

    return clone;

  }

}
module.exports = AuroraModelAnimation;
