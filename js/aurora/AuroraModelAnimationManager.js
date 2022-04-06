class AuroraModelAnimationManager {

  constructor(model = undefined){
    this.model = model;
    this.currentAnimation = undefined;
    this.lastAnimation = undefined;

    this._vec3 = new THREE.Vector3();
    this._quat = new THREE.Quaternion();
    this._animPosition = new THREE.Vector3();
    this._animQuaternion = new THREE.Quaternion();

    this.trans = false;
    this.lastFrame = 0;
    this.modelNode = undefined;

  }

  destory(){
    this.model = undefined;
  }

  update(delta = 0){

    if(this.currentAnimation && this.currentAnimation.type == 'AuroraModelAnimation'){
      if(this.model.bonesInitialized){
        this.updateAnimation(this.currentAnimation, delta, () => {
          if(!this.currentAnimation.data.loop){
            this.model.stopAnimation();
          }else{
            if(this.currentAnimation){
              this.lastAnimation = this.currentAnimation;
            }
            this.currentAnimation.data.events = [];
          }
        });
      }
    }

    //World Model Animation Loops
    if(this.model.bonesInitialized && this.model.animLoops.length){

      // this.animLoop = (this.animLoop instanceof AuroraModelAnimation) ? this.animLoop : this.model.animLoops[0];
      // if(this.animLoop instanceof AuroraModelAnimation){
      //   let animComplete = this.updateAnimation(this.animLoop, delta);
      //   if(animComplete){
      //     let index = this.model.animLoops.indexOf(this.animLoop) + 1;
      //     index = (index >= this.model.animLoops.length) ? 0 : index;
      //     this.animLoop = this.model.animLoops[index];
      //   }
      // }

      for(let i = 0, len = this.model.animLoops.length; i < len; i++){
        this.updateAnimation(this.model.animLoops[i], delta);
      }

    }

    //MiniGame Animations
    // if(this.model.bonesInitialized && this.model.mgAnims.length){
    //   let dead_animations = [];
    //   for(let i = 0, mgL = this.model.mgAnims.length; i < mgL; i++){
    //     this.updateAnimation(this.model.mgAnims[i], delta);
    //     if(this.model.mgAnims[i].data.elapsed >= this.model.mgAnims[i].length){
    //       dead_animations.push(i);
    //     }
    //   }
    //   let old_anims = dead_animations.length;
    //   while (old_anims--) {
    //     let anim_index = dead_animations[old_anims];
    //     this.model.mgAnims.splice(anim_index, 1);
    //   }
    // }

  }

  updateAnimation(anim = undefined, delta = 0, onEnd = undefined){
    anim.data.delta = delta;

    if(!anim.data.elapsedCount) anim.data.elapsedCount = 0;

    this.trans = (anim.transition && this.lastAnimation && this.lastAnimation.name != anim.name);
    this.lastFrame = 0;

    if(!this.model.bonesInitialized)
      return;
    
    this.updateAnimationEvents(anim);
    if(this.model.animateFrame){
      for(let i = 0, nl = anim.nodes.length; i < nl; i++){
        this.updateAnimationNode(anim, anim.nodes[i]);
      }
    }

    // if(this.lastAnimation && (this.lastAnimation.transition < 1)){
    //   if(this.lastAnimation.length * this.lastAnimation.transition < anim.data.elapsed){
    //     if(this.model.animateFrame){
    //       let transWeight = anim.data.elapsed / (this.lastAnimation.length * this.lastAnimation.transition);
    //       for(let i = 0, nl = this.lastAnimation.nodes.length; i < nl; i++){
    //         this.updateTransitionNode(this.lastAnimation, this.lastAnimation.nodes[i], transWeight);
    //       }
    //     }
    //     this.lastAnimation.data.lastTime = this.lastAnimation.data.elapsed;
    //     this.lastAnimation.data.elapsed += delta;

    //     if(this.lastAnimation.data.elapsed >= this.lastAnimation.length){
    //       this.lastAnimation.data.elapsed = 0;
    //     }
    //   }
    // }

    //this.updateAnimationNode(anim, anim.rooNode);
    anim.data.lastTime = anim.data.elapsed;
    anim.data.elapsed += delta;

    if(anim.data.elapsed >= anim.length){

      if(anim.data.elapsed > anim.length){
        anim.data.elapsed = anim.length;
        this.updateAnimationEvents(anim);
        //Update animation nodes if the model is being rendered
        if(this.model.animateFrame){
          for(let i = 0, nl = anim.nodes.length; i < nl; i++){
            this.updateAnimationNode(anim, anim.nodes[i]);
          }
        }
      }

      anim.data.lastTime = anim.length;
      anim.data.elapsed = 0;
      anim.data.elapsedCount++;

      if(typeof anim.data.callback === 'function')
        anim.data.callback();

      if(typeof onEnd == 'function')
        onEnd();

      return true;
    }
    return false;
  }

  updateAnimationEvents(anim){

    if(!anim.events.length)
      return;

    if(!anim.data.events){
      anim.data.events = [];
    }

    for(let f = 0, el = anim.events.length; f < el; f++){

      if(anim.events[f].length <= anim.data.elapsed && !anim.data.events[f]){
        this.model.playEvent(anim.events[f].name, f);
        anim.data.events[f] = true;
      }

      /*let last = 0;
      if(anim.events[f].length <= anim.data.elapsed){
        last = f;
      }

      let next = last + 1;
      if (last + 1 >= anim.events.length || anim.events[last].length >= anim.data.elapsed) {
        next = 0
      }
  
      if(next != anim.data.lastEvent){
        anim.data.lastEvent = next;
        this.playEvent(anim.events[next].name);
      }*/
    }
    
  }

  updateAnimationNode(anim, node){
    this.modelNode = this.model.nodes.get(node.name);//node.getNode(node, this.model);//

    if(this.model.moduleObject && this.model.moduleObject.head && this.model.moduleObject.head != this.model){
      //This if statement is a hack to get around using getObjectByName because it was too expensive
      //Not sure of the best approach here. This seems to work for now
      if(node.name != 'rootdummy' && node.name != 'cutscenedummy' && node.name != 'torso_g' && node.name != 'torsoupr_g')
        this.model.moduleObject.head.animationManager.updateAnimationNode(anim, node);
    }

    if(typeof this.modelNode != 'undefined'){

      if(this.modelNode.lipping && this.model.moduleObject && this.model.moduleObject.lipObject)
        return;

      anim._position.x = anim._position.y = anim._position.z = 0;
      anim._quaternion.x = anim._quaternion.y = anim._quaternion.z = 0;
      anim._quaternion.w = 1;

      let last, next, fl, data, shouldBlend;
      
      //Loop through and animate all the controllers for the current node
      for(let controller of node.controllers){

        controller = controller[1];

        /*shouldBlend = false;

        if(anim.data.animation){
          shouldBlend = parseInt(anim.data.animation.looping) || parseInt(anim.data.animation.running) || parseInt(anim.data.animation.walking);
        }*/

        if(controller.frameCount == 1){
          controller.setFrame(this, anim, controller, controller.data[0]);
          continue;
        }

        if(controller.data.length != controller.frameCount){
          console.log('Missing Controller Data', controller);
          continue;
        }
          
        if( (!anim.data.elapsed) /*&& !shouldBlend*/ ){
          controller.setFrame(this, anim, controller, controller.data[0]);
        }else{

          this.lastFrame = 0;
          for(let f = 0, fc = controller.frameCount; f < fc; f++){
            if(controller.data[f].time <= anim.data.elapsed){
              this.lastFrame = f;
            }
          }

          last = controller.data[this.lastFrame];
          if(last){

            //If the model was offscreen last frame pose the lastFrame 
            //To fix the spaghetti limbs issue
            if(this.model.wasOffscreen){
              controller.setFrame(this, anim, controller, last);
            }

            next = controller.data[this.lastFrame + 1];
            fl = 0;

            if (next) { 
              fl = Math.abs( (anim.data.elapsed - last.time) / (next.time - last.time) ) % 1;
            }else{
              fl = 1;
              next = controller.data[this.lastFrame];
              last = controller.data[this.lastFrame - 1] || controller.data[this.lastFrame];
            }

            //Make sure the last frame has already begun.
            if(anim.data.elapsed < last.time){
              fl = 0;
            }
            
            if(fl == Infinity) fl = 1.0;
            if(isNaN(fl)) fl = 0;

            if(fl > 1) fl = 1;
            if(fl < 0) fl = 0;

            controller.animate(this, anim, controller, last, next, fl);

          }

        }

      };

    }
  }

  updateTransitionNode(anim, node, tansWeight = 0){
    this.modelNode = this.model.nodes.get(node.name);//node.getNode(node, this.model);//

    if(this.model.moduleObject && this.model.moduleObject.head && this.model.moduleObject.head != this.model){
      //This if statement is a hack to get around using getObjectByName because it was too expensive
      //Not sure of the best approach here. This seems to work for now
      if(node.name != 'rootdummy' && node.name != 'cutscenedummy' && node.name != 'torso_g' && node.name != 'torsoupr_g')
        this.model.moduleObject.head.animationManager.updateAnimationNode(anim, node);
    }

    if(typeof this.modelNode != 'undefined'){

      if(this.modelNode.lipping && this.model.moduleObject && this.model.moduleObject.lipObject)
        return;

      anim._position.x = anim._position.y = anim._position.z = 0;
      anim._quaternion.x = anim._quaternion.y = anim._quaternion.z = 0;
      anim._quaternion.w = 1;

      let last, next, fl, data, shouldBlend;
      
      //Loop through and animate all the controllers for the current node
      for(let controller of node.controllers){

        controller = controller[1];

        /*shouldBlend = false;

        if(anim.data.animation){
          shouldBlend = parseInt(anim.data.animation.looping) || parseInt(anim.data.animation.running) || parseInt(anim.data.animation.walking);
        }*/

        if(controller.frameCount == 1){
          controller.setFrame(this, anim, controller, controller.data[0]);
          continue;
        }
          
        this.lastFrame = 0;
        for(let f = 0, fc = controller.frameCount; f < fc; f++){
          if(controller.data[f].time <= anim.data.elapsed){
            this.lastFrame = f;
          }
        }

        last = controller.data[this.lastFrame];
        if(last){

          //If the model was offscreen last frame pose the lastFrame 
          //To fix the spaghetti limbs issue
          if(this.model.wasOffscreen){
            controller.setFrame(this, anim, controller, last);
          }

          next = controller.data[this.lastFrame + 1];
          fl = 0;

          if (next) { 
            fl = Math.abs( (anim.data.elapsed - last.time) / (next.time - last.time) ) % 1;
          }else{
            fl = 1;
            next = controller.data[this.lastFrame];
            last = controller.data[this.lastFrame - 1] || controller.data[this.lastFrame];
          }
          
          if(fl == Infinity) fl = 1.0;
          if(isNaN(fl)) fl = 0;

          if(fl > 1) fl = 1;
          if(fl < 0) fl = 0;

          controller.animate(this, anim, controller, last, next, fl);

        }

      };

    }
  }

}

module.exports = AuroraModelAnimationManager;