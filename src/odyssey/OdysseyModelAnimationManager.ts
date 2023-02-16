import * as THREE from "three";
import { OdysseyModel3D, OdysseyObject3D } from "../three/odyssey";
import { OdysseyModelAnimation } from "./OdysseyModelAnimation";

export class OdysseyModelAnimationManager {
  model: OdysseyModel3D;
  currentAnimation: OdysseyModelAnimation;
  currentAnimationData: any;
  lastAnimation: OdysseyModelAnimation;
  lastAnimationData: any;
  _vec3: THREE.Vector3;
  _quat: THREE.Quaternion;
  _animPosition: THREE.Vector3;
  _animQuaternion: THREE.Quaternion;
  trans: boolean;
  lastFrame: number;
  modelNode: OdysseyObject3D;

  constructor(model: OdysseyModel3D){
    this.model = model;

    this.currentAnimation = undefined;
    this.currentAnimationData = {};

    this.lastAnimation = undefined;
    this.lastAnimationData = {};

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

    if(this.currentAnimation && this.currentAnimation.type == 'OdysseyModelAnimation'){
      if(this.model.bonesInitialized){
        if(!this.updateAnimation(this.currentAnimation, delta)){
          if(!this.currentAnimationData.loop){
            this.model.stopAnimation();
          }else{
            if(this.currentAnimation){
              this.lastAnimation = this.currentAnimation;
              this.lastAnimationData = this.currentAnimationData;
            }
            this.currentAnimationData.events = [];
          }
        }
      }
    }

    //World Model Animation Loops
    if(this.model.bonesInitialized && this.model.animLoops.length){

      // this.animLoop = (this.animLoop instanceof OdysseyModelAnimation) ? this.animLoop : this.model.animLoops[0];
      // if(this.animLoop instanceof OdysseyModelAnimation){
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

  updateAnimation(anim: any, delta: number = 0){
    this.currentAnimationData.delta = delta;

    if(!this.currentAnimationData.elapsedCount) this.currentAnimationData.elapsedCount = 0;

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
    //   if(this.lastAnimation.length * this.lastAnimation.transition < this.currentAnimationData.elapsed){
    //     if(this.model.animateFrame){
    //       let transWeight = this.currentAnimationData.elapsed / (this.lastAnimation.length * this.lastAnimation.transition);
    //       for(let i = 0, nl = this.lastAnimation.nodes.length; i < nl; i++){
    //         this.updateTransitionNode(this.lastAnimation, this.lastAnimation.nodes[i], transWeight);
    //       }
    //     }
    //     this.this.lastAnimationData.lastTime = this.this.lastAnimationData.elapsed;
    //     this.this.lastAnimationData.elapsed += delta;

    //     if(this.this.lastAnimationData.elapsed >= this.lastAnimation.length){
    //       this.this.lastAnimationData.elapsed = 0;
    //     }
    //   }
    // }

    //this.updateAnimationNode(anim, anim.rooNode);
    this.currentAnimationData.lastTime = this.currentAnimationData.elapsed;
    this.currentAnimationData.elapsed += delta;

    if(this.currentAnimationData.elapsed >= anim.length){

      if(this.currentAnimationData.elapsed > anim.length){
        this.currentAnimationData.elapsed = anim.length;
        this.updateAnimationEvents(anim);
        //Update animation nodes if the model is being rendered
        if(this.model.animateFrame){
          for(let i = 0, nl = anim.nodes.length; i < nl; i++){
            this.updateAnimationNode(anim, anim.nodes[i]);
          }
        }
      }

      this.currentAnimationData.lastTime = anim.length;
      this.currentAnimationData.elapsed = 0;
      this.currentAnimationData.elapsedCount++;

      if(typeof this.currentAnimationData.callback === 'function')
        this.currentAnimationData.callback();

      return false;
    }
    return true;
  }

  updateAnimationEvents(anim: any){

    if(!anim.events.length)
      return;

    if(!this.currentAnimationData.events){
      this.currentAnimationData.events = [];
    }

    for(let f = 0, el = anim.events.length; f < el; f++){

      if(anim.events[f].length <= this.currentAnimationData.elapsed && !this.currentAnimationData.events[f]){
        this.model.playEvent(anim.events[f].name, f);
        this.currentAnimationData.events[f] = true;
      }

      /*let last = 0;
      if(anim.events[f].length <= this.currentAnimationData.elapsed){
        last = f;
      }

      let next = last + 1;
      if (last + 1 >= anim.events.length || anim.events[last].length >= this.currentAnimationData.elapsed) {
        next = 0
      }
  
      if(next != this.currentAnimationData.lastEvent){
        this.currentAnimationData.lastEvent = next;
        this.playEvent(anim.events[next].name);
      }*/
    }
    
  }

  updateAnimationNode(anim: any, node: any){
    this.modelNode = this.model.nodes.get(node.name);//node.getNode(node, this.model);//

    if(this.model.userData.moduleObject && this.model.userData.moduleObject.head && this.model.userData.moduleObject.head != this.model){
      //This if statement is a hack to get around using getObjectByName because it was too expensive
      //Not sure of the best approach here. This seems to work for now
      if(node.name != 'rootdummy' && node.name != 'cutscenedummy' && node.name != 'torso_g' && node.name != 'torsoupr_g')
        this.model.userData.moduleObject.head.animationManager.updateAnimationNode(anim, node);
    }

    if(typeof this.modelNode != 'undefined'){

      if(this.modelNode.lipping && this.model.userData.moduleObject && this.model.userData.moduleObject.lipObject)
        return;

      anim._position.x = anim._position.y = anim._position.z = 0;
      anim._quaternion.x = anim._quaternion.y = anim._quaternion.z = 0;
      anim._quaternion.w = 1;

      let last, next, fl, data, shouldBlend;
      
      //Loop through and animate all the controllers for the current node
      for(let controller of node.controllers){

        controller = controller[1];

        /*shouldBlend = false;

        if(this.currentAnimationData.animation){
          shouldBlend = parseInt(this.currentAnimationData.animation.looping) || parseInt(this.currentAnimationData.animation.running) || parseInt(this.currentAnimationData.animation.walking);
        }*/

        if(controller.frameCount == 1){
          controller.setFrame(this, anim, controller, controller.data[0]);
          continue;
        }

        if(controller.data.length != controller.frameCount){
          console.log('Missing Controller Data', controller);
          continue;
        }
          
        if( (!this.currentAnimationData.elapsed) /*&& !shouldBlend*/ ){
          controller.setFrame(this, anim, controller, controller.data[0]);
        }else{

          this.lastFrame = 0;
          for(let f = 0, fc = controller.frameCount; f < fc; f++){
            if(controller.data[f].time <= this.currentAnimationData.elapsed){
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
              fl = Math.abs( (this.currentAnimationData.elapsed - last.time) / (next.time - last.time) ) % 1;
            }else{
              fl = 1;
              next = controller.data[this.lastFrame];
              last = controller.data[this.lastFrame - 1] || controller.data[this.lastFrame];
            }

            //Make sure the last frame has already begun.
            if(this.currentAnimationData.elapsed < last.time){
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

  updateTransitionNode(anim: any, node: any, tansWeight = 0){
    this.modelNode = this.model.nodes.get(node.name);//node.getNode(node, this.model);//

    if(this.model.userData.moduleObject && this.model.userData.moduleObject.head && this.model.userData.moduleObject.head != this.model){
      //This if statement is a hack to get around using getObjectByName because it was too expensive
      //Not sure of the best approach here. This seems to work for now
      if(node.name != 'rootdummy' && node.name != 'cutscenedummy' && node.name != 'torso_g' && node.name != 'torsoupr_g')
        this.model.userData.moduleObject.head.animationManager.updateAnimationNode(anim, node);
    }

    if(typeof this.modelNode != 'undefined'){

      if(this.modelNode.lipping && this.model.userData.moduleObject && this.model.userData.moduleObject.lipObject)
        return;

      anim._position.x = anim._position.y = anim._position.z = 0;
      anim._quaternion.x = anim._quaternion.y = anim._quaternion.z = 0;
      anim._quaternion.w = 1;

      let last, next, fl, data, shouldBlend;
      
      //Loop through and animate all the controllers for the current node
      for(let controller of node.controllers){

        controller = controller[1];

        /*shouldBlend = false;

        if(this.currentAnimationData.animation){
          shouldBlend = parseInt(this.currentAnimationData.animation.looping) || parseInt(this.currentAnimationData.animation.running) || parseInt(this.currentAnimationData.animation.walking);
        }*/

        if(controller.frameCount == 1){
          controller.setFrame(this, anim, controller, controller.data[0]);
          continue;
        }
          
        this.lastFrame = 0;
        for(let f = 0, fc = controller.frameCount; f < fc; f++){
          if(controller.data[f].time <= this.currentAnimationData.elapsed){
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
            fl = Math.abs( (this.currentAnimationData.elapsed - last.time) / (next.time - last.time) ) % 1;
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
