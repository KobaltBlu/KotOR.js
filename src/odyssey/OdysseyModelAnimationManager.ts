import * as THREE from "three";
import { OdysseyModel3D, OdysseyObject3D } from "../three/odyssey";
import type { OdysseyModelAnimation } from "./OdysseyModelAnimation";
import type { OdysseyModelAnimationNode } from "./OdysseyModelAnimationNode";
import { OdysseyController } from "./controllers/OdysseyController";
import { IOdysseyControllerFrameGeneric } from "../interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { OdysseyModelControllerType } from "../enums/odyssey/OdysseyModelControllerType";

/**
 * OdysseyModelAnimationManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelAnimationManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyModelAnimationManager {
  model: OdysseyModel3D;
  currentAnimation: OdysseyModelAnimation;
  currentAnimationState: any;
  lastAnimation: OdysseyModelAnimation;
  lastAnimationState: any;
  overlayAnimation: OdysseyModelAnimation;
  overlayAnimationState: any;
  _vec3: THREE.Vector3 = new THREE.Vector3();
  _quat: THREE.Quaternion = new THREE.Quaternion();
  _animPosition: THREE.Vector3 = new THREE.Vector3();
  _animQuaternion: THREE.Quaternion = new THREE.Quaternion();
  _animPosition2: THREE.Vector3 = new THREE.Vector3();
  _animQuaternion2: THREE.Quaternion = new THREE.Quaternion();
  trans: boolean;
  lastFrame: number;
  modelNode: OdysseyObject3D;

  headModel: OdysseyModel3D;
  headModelNode: OdysseyObject3D;

  transElapsed: number = 0;

  animLoopStates: Map<number, any> = new Map();

  constructor(model: OdysseyModel3D){
    this.model = model;

    this.currentAnimation = undefined;
    this.currentAnimationState = {};

    this.lastAnimation = undefined;
    this.lastAnimationState = {};

    this.overlayAnimation = undefined;
    this.overlayAnimationState = {};

    this.trans = false;
    this.modelNode = undefined;

  }

  destroy(){
    this.model = undefined;
  }

  update(delta = 0){

    if(this.currentAnimation && this.currentAnimation.type == 'OdysseyModelAnimation'){
      if(this.model.bonesInitialized){
        if(!this.updateAnimation(this.currentAnimation, this.currentAnimationState, delta)){
          if(!this.currentAnimationState.loop){
            this.stopAnimation();
          }else{
            if(this.currentAnimation){
              this.setLastAnimation(this.currentAnimation, this.currentAnimationState);
            }
            this.currentAnimationState.events = [];
          }
        }
      }
    }

    //Overlay Animation: update
    if(this.overlayAnimation && this.overlayAnimation.type == 'OdysseyModelAnimation'){
      if(this.model.bonesInitialized){
        if(!this.updateOverlayAnimation(this.overlayAnimation, this.overlayAnimationState, delta)){
          if(!this.overlayAnimationState.loop){
            this.stopOverlayAnimation();
          }
        }
      }
    }

    //World Model Animation Loops
    if(this.model.bonesInitialized && this.model.animLoops.length){
      for(let i = 0, len = this.model.animLoops.length; i < len; i++){
        if(!this.animLoopStates.has(i)){
          this.animLoopStates.set(i, {
            loop: true,
            cFrame: 0,
            elapsed: 0,
            lastTime: 0,
            delta: 0,
            lastEvent: -1,
            events: [],
          });
        }
        this.updateAnimation(this.model.animLoops[i], this.animLoopStates.get(i), delta);
      }
    }

  }

  stopAnimation(){
    this.currentAnimation = undefined;
    this.currentAnimationState = {
      loop: false,
      cFrame: 0,
      elapsed: 0,
      lastTime: 0,
      delta: 0,
      lastEvent: -1,
      events: [],
    };
    this.lastAnimation = undefined;
    this.lastAnimationState = {
      loop: false,
      cFrame: 0,
      elapsed: 0,
      lastTime: 0,
      delta: 0,
      lastEvent: -1,
      events: [],
    };
  }

  stopOverlayAnimation(){
    this.overlayAnimation = undefined;
    this.overlayAnimationState = {
      loop: false,
      cFrame: 0,
      elapsed: 0,
      lastTime: 0,
      delta: 0,
      lastEvent: -1,
      events: [],
    };
  }

  setCurrentAnimation(anim: OdysseyModelAnimation, state: any = {}){
    // if(anim) console.log(this.model?.name, anim.name);
    if(this.currentAnimation){
      this.setLastAnimation(this.currentAnimation, this.currentAnimationState);
    }
    this.currentAnimation = anim;
    this.currentAnimationState = state;
  }

  setLastAnimation(anim: OdysseyModelAnimation, state: any = {}){
    this.transElapsed = 0;
    this.lastAnimation = anim;
    this.lastAnimationState = Object.assign({}, state);
  }

  setLastFromCurrentAnimation(){
    this.setLastAnimation(
      this.currentAnimation,
      this.currentAnimationState
    );
  }

  setOverlayAnimation(anim: OdysseyModelAnimation, state: any = {}){
    this.overlayAnimation = anim;
    this.overlayAnimationState = state;
  }

  updateAnimation(anim: OdysseyModelAnimation, state: any = {}, delta: number = 0){
    state.delta = delta;

    if(!state.elapsedCount) state.elapsedCount = 0;

    this.trans = (anim.transition && this.lastAnimation && this.lastAnimation.name != anim.name && this.transElapsed < anim.transition);

    if(!this.model.bonesInitialized)
      return;
    
    this.updateAnimationEvents(anim);

    //Update animation nodes if the model is being rendered
    if(this.model.animateFrame){
      let node: OdysseyModelAnimationNode;
      for(let i = 0, nl = anim.nodes.length; i < nl; i++){
        node = anim.nodes[i];
        if(this.trans){
          this.updateAnimationNode(this.lastAnimation, this.lastAnimation.nodes.find( n => n.nodePosition == node.nodePosition ), this.lastAnimationState, false);
        }
        this.updateAnimationNode(anim, node, state, this.trans);
      }
    }



    //this.updateAnimationNode(anim, anim.rooNode);
    state.lastTime = state.elapsed;
    state.elapsed += delta;

    if(this.lastAnimation && this.lastAnimationState){
      this.lastAnimationState.lastTime = this.lastAnimationState.elapsed;
      this.lastAnimationState.elapsed += delta;
      this.transElapsed += delta;
      if(this.lastAnimationState.elapsed >= this.lastAnimation.length){
        this.lastAnimationState.elapsed = this.lastAnimation.length;
        this.lastAnimationState.lastTime = this.lastAnimation.length;
        if(this.lastAnimationState.loop) this.lastAnimationState.elapsed = 0;
        this.lastAnimationState.elapsedCount++;
      }
      if(this.transElapsed >= this.currentAnimation.transition){
        this.transElapsed = 0;
        this.setLastAnimation(undefined, undefined);
      }
    }else{
      this.transElapsed = 0;
    }

    if(state.elapsed >= anim.length){

      if(state.elapsed > anim.length){
        state.elapsed = anim.length;
        this.updateAnimationEvents(anim, state);
        //Update animation nodes if the model is being rendered
        // if(this.model.animateFrame){
        //   for(let i = 0, nl = anim.nodes.length; i < nl; i++){
        //     this.updateAnimationNode(anim, anim.nodes[i], state, false);
        //   }
        // }
      }

      state.lastTime = anim.length;
      state.elapsed = 0;
      state.elapsedCount++;

      return false;
    }
    return true;
  }

  updateOverlayAnimation(anim: OdysseyModelAnimation, state: any = {}, delta: number = 0){
    state.delta = delta;

    if(!state.elapsedCount) state.elapsedCount = 0;

    this.trans = false;//(anim.transition && this.lastAnimation && this.lastAnimation.name != anim.name && this.transElapsed < anim.transition);

    if(!this.model.bonesInitialized)
      return;
    
    this.updateAnimationEvents(anim);

    //Update animation nodes if the model is being rendered
    if(this.model.animateFrame){
      let node: OdysseyModelAnimationNode;
      for(let i = 0, nl = anim.nodes.length; i < nl; i++){
        node = anim.nodes[i];
        // if(this.trans){
        //   this.updateAnimationNode(this.lastAnimation, this.lastAnimation.nodes.find( n => n.nodePosition == node.nodePosition ), this.lastAnimationState, false);
        // }
        this.updateAnimationNode(anim, node, state, this.trans);
      }
    }



    //this.updateAnimationNode(anim, anim.rooNode);
    state.lastTime = state.elapsed;
    state.elapsed += delta;

    // if(this.lastAnimation && this.lastAnimationState){
    //   this.lastAnimationState.lastTime = this.lastAnimationState.elapsed;
    //   this.lastAnimationState.elapsed += delta;
    //   // this.transElapsed += delta;
    //   if(this.lastAnimationState.elapsed >= this.lastAnimation.length){
    //     this.lastAnimationState.elapsed = this.lastAnimation.length;
    //     this.lastAnimationState.lastTime = this.lastAnimation.length;
    //     if(this.lastAnimationState.loop) this.lastAnimationState.elapsed = 0;
    //     this.lastAnimationState.elapsedCount++;
    //   }
    //   // if(this.transElapsed >= this.currentAnimation.transition){
    //   //   this.transElapsed = 0;
    //   //   this.setLastAnimation(undefined, undefined);
    //   // }
    // }else{
    //   // this.transElapsed = 0;
    // }

    if(state.elapsed >= anim.length){

      if(state.elapsed > anim.length){
        state.elapsed = anim.length;
        this.updateAnimationEvents(anim, state);
      }

      state.lastTime = anim.length;
      state.elapsed = 0;
      state.elapsedCount++;

      return false;
    }
    return true;
  }

  updateAnimationEvents(anim: OdysseyModelAnimation, state: any = {}){

    if(!anim.events.length)
      return;

    if(!state.events){
      state.events = [];
    }

    for(let f = 0, el = anim.events.length; f < el; f++){

      if(anim.events[f].length <= state.elapsed && !state.events[f]){
        this.model.playEvent(anim.events[f].name, f);
        state.events[f] = true;
      }

      /*let last = 0;
      if(anim.events[f].length <= state.elapsed){
        last = f;
      }

      let next = last + 1;
      if (last + 1 >= anim.events.length || anim.events[last].length >= state.elapsed) {
        next = 0
      }
  
      if(next != state.lastEvent){
        state.lastEvent = next;
        this.playEvent(anim.events[next].name);
      }*/
    }
    
  }

  updateAnimationNode(anim: OdysseyModelAnimation, node: OdysseyModelAnimationNode, state: any, canTween: boolean = false){
    if(!node) return;
    this.modelNode = this.model.nodes.get(node.name);

    if(this.modelNode){

      anim._position.x = anim._position.y = anim._position.z = 0;
      anim._quaternion.x = anim._quaternion.y = anim._quaternion.z = 0;
      anim._quaternion.w = 1;

      let last: IOdysseyControllerFrameGeneric;
      let next: IOdysseyControllerFrameGeneric;
      let fl: number = 0;
      let lastFrame: number = 0;
      
      //Loop through and animate all the controllers for the current node
      let controller: OdysseyController;
      for(let c of node.controllers){
        controller = c[1];

        if(controller.frameCount == 1 && !canTween){
          controller.setFrame(this, anim, controller.data[0]);
          continue;
        }

        if(controller.data.length != controller.frameCount){
          console.log('Missing Controller Data', controller);
          continue;
        }

        lastFrame = 0;
        for(let f = 0, fc = controller.frameCount; f < fc; f++){
          if(controller.data[f].time <= state.elapsed){
            lastFrame = f;
          }
        }

        last = controller.data[lastFrame];
        if(last){

          //If the model was offscreen last frame pose the lastFrame 
          //To fix the spaghetti limbs issue
          if(this.model.wasOffscreen){
            controller.setFrame(this, anim, last);
          }

          next = controller.data[lastFrame + 1];
          fl = 0;

          if (next) { 
            fl = Math.abs( (state.elapsed - last.time) / (next.time - last.time) ) % 1;
          }else{
            fl = 1;
            next = controller.data[lastFrame];
            last = controller.data[lastFrame - 1] || controller.data[lastFrame];
          }

          //Make sure the last frame has already begun.
          if(state.elapsed < last.time){
            fl = 0;
          }
          
          if(fl == Infinity) fl = 1.0;
          if(isNaN(fl)) fl = 0;

          if(fl > 1) fl = 1;
          if(fl < 0) fl = 0;

          if(canTween){
            if( controller.type == OdysseyModelControllerType.Position ){
              let tweenFL = Math.min(this.currentAnimation.transition, this.transElapsed ) / this.currentAnimation.transition;
              this._animPosition.copy(this.modelNode.position);
              controller.animate(this, anim, last, next, fl);
              this._animPosition2.copy(this.modelNode.position);
              this.modelNode.position.copy(this._animPosition).lerp(this._animPosition2, tweenFL);
            }else if( controller.type == OdysseyModelControllerType.Orientation ){
              let tweenFL = Math.min(this.currentAnimation.transition, this.transElapsed ) / this.currentAnimation.transition;
              this._animQuaternion.copy(this.modelNode.quaternion);
              controller.animate(this, anim, last, next, fl);
              this._animQuaternion2.copy(this.modelNode.quaternion);
              this.modelNode.quaternion.copy(this._animQuaternion).slerp(this._animQuaternion2, tweenFL);
            }else{
              controller.animate(this, anim, last, next, fl);
            }
          }else{
            controller.animate(this, anim, last, next, fl);
          }

        }

      }

    }

  }

}
