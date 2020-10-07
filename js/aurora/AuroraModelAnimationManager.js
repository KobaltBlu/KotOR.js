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

      /*if(this.animLoop instanceof AuroraModelAnimation){
        this.updateAnimation(this.animLoop, delta, () => {

          let index = this.animLoops.indexOf(this.animLoop) + 1;
          if(index >= this.animLoops.length ){
            index = 0;
          }
          this.stopAnimationLoop();
          this.animLoop = this.animLoops[index];
        });
      }else{
        this.animLoop = this.animLoops[0];
      }*/

      for(let i = 0, len = this.model.animLoops.length; i < len; i++){
        this.updateAnimation(this.model.animLoops[i], delta);
      }
    }

    //MiniGame Animations
    if(this.model.bonesInitialized && this.model.mgAnims.length){
      let dead_animations = [];
      for(let i = 0, mgL = this.model.mgAnims.length; i < mgL; i++){
        this.updateAnimation(this.model.mgAnims[i], delta);
        if(this.model.mgAnims[i].data.elapsed >= this.model.mgAnims[i].length){
          dead_animations.push(i);
        }
      }
      let old_anims = dead_animations.length;
      while (old_anims--) {
        let anim_index = dead_animations[old_anims];
        this.model.mgAnims.splice(anim_index, 1);
      }
    }

  }

  updateAnimation(anim = undefined, delta = 0, onEnd = undefined){
    anim.data.delta = delta;

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

      if(typeof anim.data.callback === 'function')
        anim.data.callback();

      if(typeof onEnd == 'function')
        onEnd();

    }
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
      for(var controller of node.controllers){

        controller = controller[1];

        if(typeof AuroraModelAnimationManager.AnimateController[controller.type] === 'undefined'){
          //console.error('AuroraModelAnimationManager', 'Controller missing', controller.type);
          //console.log('AuroraModelAnimationManager', 'Controller missing', controller, anim, this.model);
          continue;
        }

        shouldBlend = false;

        if(anim.data.animation){
          shouldBlend = parseInt(anim.data.animation.looping) || parseInt(anim.data.animation.running) || parseInt(anim.data.animation.walking);
        }
          
        if( (controller.frameCount == 1 || anim.data.elapsed == 0 || controller.data[0].time >= anim.data.elapsed) && !shouldBlend ){
          data = controller.data[0];
          //AuroraModelAnimationManager.AnimateController[controller.type].setFrame(anim, data);
          if(typeof AuroraModelAnimationManager.AnimateController[controller.type].setFrame === 'function'){
            AuroraModelAnimationManager.AnimateController[controller.type].setFrame.call(this, anim, controller, data);
          }else{
            //console.error('AuroraModelAnimationManager.setFrame', 'Controller missing function setFrame', controller.type);
            //console.log('AuroraModelAnimationManager.setFrame', 'Controller missing function setFrame', controller, anim, this.model);
          }
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
              if(typeof AuroraModelAnimationManager.AnimateController[controller.type].setFrame === 'function'){
                AuroraModelAnimationManager.AnimateController[controller.type].setFrame.call(this, anim, controller, last);
              }
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
            
            if(fl == Infinity)
              fl = 1.0;

            if(typeof AuroraModelAnimationManager.AnimateController[controller.type].animate === 'function'){
              //AuroraModelAnimationManager.AnimateController[controller.type].animate(anim, last, next, fl);
              AuroraModelAnimationManager.AnimateController[controller.type].animate.call(this, anim, controller, last, next, fl);
            }else{
              //console.error('AuroraModelAnimationManager.animate', 'Controller missing function animate', controller.type);
              //console.log('AuroraModelAnimationManager.animate', 'Controller missing function animate', controller, anim, this.model);
            }

          }

        }

      };

    }
  }

}

AuroraModelAnimationManager.AnimateController = {
  //Position
  8: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if(typeof this.modelNode.controllers.get(AuroraModel.ControllerType.Position) != 'undefined'){

        if(this.trans && controller.frameCount > 1){
          this.modelNode.trans.position.copy(this.modelNode.position);
          anim._position.copy(this.modelNode.trans.position);
        }else{
          anim._position.copy(this.modelNode.controllers.get(AuroraModel.ControllerType.Position).data[0]);
        }

        if(anim.name.indexOf('CUT') > -1 && this.modelNode.name == 'cutscenedummy'){
          anim._position.sub(this.model.position);
        }

      }
      if(this.trans && controller.frameCount > 1){
        this.modelNode.position.lerp(anim._position.add(data), anim.data.delta);
      }else{
        this.modelNode.position.copy(anim._position.add(data));
      }
      this.modelNode.updateMatrix();
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      //if(last.x == next.x && last.y == next.y && last.z == next.z)
      //  break;

      //Cache the position controller
      if(this.modelNode.controllers.hasPosition === undefined){
        let _controller = this.modelNode.controllers.get(AuroraModel.ControllerType.Position);
        if(typeof _controller != 'undefined'){
          this.modelNode.controllers.hasPosition = true;
          this.modelNode.controllers.position = _controller;
        }else{
          this.modelNode.controllers.hasPosition = false;
          this.modelNode.controllers.position = undefined;
        }
      }

      if(this.modelNode.controllers.hasPosition){
        anim._position.copy(this.modelNode.controllers.position.data[0]);
        if(anim.name.indexOf('CUT') > -1 && this.modelNode.name == 'cutscenedummy'){
          anim._position.sub(this.model.position);
        }
      }

      if(last.isBezier){
        //Last point
        if(last.isLinearBezier){
          this._vec3.copy(last.bezier.getPoint(0)).add(anim._position);
          this.modelNode.position.copy(this._vec3);
        }else{
          this._vec3.copy(last.bezier.getPoint((0.5 * fl) + 0.5).add(anim._position));
          this.modelNode.position.copy(this._vec3);
        }

        //Next point
        //if(next.isLinearBezier){
          this._vec3.copy(next.bezier.getPoint( next.lastFrame ? 0 : 0.5 )).add(anim._position);
          this.modelNode.position.lerp(this._vec3, fl);
        //}else{
        //  this._vec3.copy(next.bezier.getPoint(0.5 * fl).add(anim._position));
        //  this.modelNode.position.lerp(this._vec3, fl);
        //}
      }else if(next.isBezier){
        //Last point
        this._vec3.copy(last).add(anim._position);
        this.modelNode.position.copy(this._vec3);
        //Next point
        if(next.isLinearBezier){
          this._vec3.copy(next.bezier.getPoint(0)).add(anim._position);
          this.modelNode.position.lerp(this._vec3, fl);
        }else{
          this._vec3.copy(next.bezier.getPoint(0.5 * fl)).add(anim._position);
          this.modelNode.position.lerp(this._vec3, fl);
        }
      }else{
        
        //if(this.trans && lastFrame == 0){
        //  this.modelNode.position.copy(this.modelNode.trans.position);
        //}else{
          this._vec3.copy(last).add(anim._position);
          this.modelNode.position.copy(this._vec3);
        //}

        this._vec3.copy(next);
        this._vec3.add(anim._position);

        // if(anim.data.elapsed > anim.transition){
        //   this.modelNode.position.copy(last);
        //   this.modelNode.position.add(anim._position);
        // }
        this.modelNode.position.lerp(this._vec3, fl);
      }
      this.modelNode.updateMatrix();
    }
  },
  //Orientation
  20: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

      //Cache the orientation controller
      if(this.modelNode.controllers.hasOrientation === undefined){
        let _controller = this.modelNode.controllers.get(AuroraModel.ControllerType.Orientation);
        if(typeof _controller != 'undefined'){
          this.modelNode.controllers.hasOrientation = true;
          this.modelNode.controllers.orientation = _controller;
        }else{
          this.modelNode.controllers.hasOrientation = false;
          this.modelNode.controllers.orientation = undefined;
        }
      }

      if(this.modelNode.controllers.hasOrientation){

        if(this.trans && controller.frameCount > 1){
          this.modelNode.trans.quaternion.copy(this.modelNode.quaternion);
          anim._quaternion.copy(this.modelNode.trans.quaternion);
        }else{
          anim._quaternion.copy(this.modelNode.controllers.orientation.data[0]);
        }

      }
      if(data.x == 0 && data.y == 0 && data.z == 0 && data.w == 1){
        data.x = anim._quaternion.x;
        data.y = anim._quaternion.y;
        data.z = anim._quaternion.z;
        data.w = anim._quaternion.w;
      }

      if(this.trans && controller.frameCount > 1){
        this.modelNode.quaternion.slerp(this._quat.copy(anim._quaternion), 0);
      }else{
        this.modelNode.quaternion.copy(data);
      }

      this.modelNode.updateMatrix();

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      if(this.modelNode.emitter){

        if(this.trans && this.lastFrame == 0){
          this.modelNode.position.copy(this.modelNode.trans.position);
        }
        this._quat.slerp(next, fl);

        //this.modelNode.emitter.velocity.value.copy(this.modelNode.emitterOptions.velocity.value.copy().applyQuaternion(this._quat));
        //this.modelNode.emitter.velocity.spread.copy(this.modelNode.emitterOptions.velocity.spread.copy().applyQuaternion(this._quat));
        //this.modelNode.emitter.updateFlags['velocity'] = true;

        this.modelNode.rotation.z = 0;

      }else{
        this._quat.copy(next);

        if(next != last){
          if(this.trans && this.lastFrame == 0){//(anim.length * anim.transition) > anim.data.elapsed){
              //this.modelNode.quaternion.copy(this.modelNode.trans.quaternion);

              this.modelNode.quaternion.copy(this.modelNode.trans.quaternion);
              this.modelNode.trans.quaternion.copy(this.modelNode.quaternion.slerp(this._quat, fl));

              //this.modelNode.quaternion.copy(
                //this.modelNode.trans.quaternion.copy(
                      /*this.modelNode.quaternion.slerp(
                          this.modelNode.trans.quaternion, 
                          anim.data.elapsed/(anim.length * anim.transition)
                      )*/
                  //)
              //);
          }else{
              this.modelNode.quaternion.copy(last);
              this.modelNode.quaternion.slerp(this._quat, fl);
          }
        }else{
          this.modelNode.quaternion.copy(last);
        }
        //this.modelNode.quaternion.copy(last);
      }
      this.modelNode.updateMatrix();
    }
  },
  //Scale
  36: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      let offsetScale = 0;
      if(typeof this.modelNode.controllers.get(AuroraModel.ControllerType.Scale) != 'undefined'){
        offsetScale = this.modelNode.controllers.get(AuroraModel.ControllerType.Scale).data[0].value || 0.000000000001; //0 scale causes warnings
      }
      //this.modelNode.scale.setScalar( ( (data.value + offsetScale) * this.model.Scale ) || 0.00000001 );
      this.modelNode.scale.setScalar( ( (data.value) * this.model.Scale ) || 0.00000001 );
      this.modelNode.updateMatrix();
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      this.modelNode.scale.lerp( this._vec3.setScalar( ( (next.value) * this.model.Scale) || 0.000000001 ), fl);
      this.modelNode.updateMatrix();
    }
  },
  //Color
  76: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if ((this.modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
        this.modelNode._node.light.color.setRGB(
          data.r, 
          data.g, 
          data.b
        );
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      if ((this.modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
        this.modelNode._node.light.color.r = ((next.r - last.r) * fl + last.r);
        this.modelNode._node.light.color.g = ((next.g - last.g) * fl + last.g);
        this.modelNode._node.light.color.b = ((next.b - last.b) * fl + last.b);
      }
    }
  },
  //Radius
  88: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if ((this.modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
        this.modelNode._node.radius = data.value;
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      if ((this.modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
        this.modelNode._node.radius = ((next.value - last.value) * fl + last.value);
      }
    }
  },
  //ShadowRadius
  96: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //VerticalDisplacement
  100: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //Multiplier
  140: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if ((this.modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
        this.modelNode._node.multiplier = data.value;
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      if ((this.modelNode._node.NodeType & AuroraModel.NODETYPE.Light) == AuroraModel.NODETYPE.Light) {
        this.modelNode._node.multiplier = ((next.value - last.value) * fl + last.value);
      }
    }
  },
  //AlphaEnd
  80: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if(this.modelNode.emitter){
        this.modelNode.emitter.opacity[2] = data.value;
        this.modelNode.emitter.material.uniforms.opacity.value.fromArray(this.modelNode.emitter.opacity);
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      if(this.modelNode.emitter){
        this.modelNode.emitter.opacity[0] = ((next.value - last.value) * fl + last.value);
        this.modelNode.emitter.material.uniforms.opacity.value.fromArray(this.modelNode.emitter.opacity);
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    }
  },
  //AlphaStart
  84: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if(this.modelNode.emitter){
        this.modelNode.emitter.opacity[0] = data.value;
        this.modelNode.emitter.material.uniforms.opacity.value.fromArray(this.modelNode.emitter.opacity);
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      if(this.modelNode.emitter){
        this.modelNode.emitter.opacity[0] = ((next.value - last.value) * fl + last.value);
        this.modelNode.emitter.material.uniforms.opacity.value.fromArray(this.modelNode.emitter.opacity);
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    }
  },
  //BirthRate
  88: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if(this.modelNode.emitter){
        this.modelNode.emitter.birthRate = data.value;
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      if(this.modelNode.emitter){
        this.modelNode.emitter.birthRate = next.value;//Math.ceil((last.value + fl * (next.value - last.value)));
      }
    }
  },
  //Bounce_Co
  92: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //ColorEnd
  380: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if(this.modelNode.emitter){
        this.modelNode.emitter.colorEnd.copy(data);
        this.modelNode.emitter.material.uniforms.colorEnd.value.copy(data);
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      if(this.modelNode.emitter){
        this.modelNode.emitter.colorEnd.setRGB(
          last.r + fl * (next.r - last.r),
          last.g + fl * (next.g - last.g),
          last.b + fl * (next.b - last.b)
        );
        this.modelNode.emitter.material.uniforms.colorEnd.value.copy(this.modelNode.emitter.colorEnd);
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    }
  },
  //ColorStart
  392: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if(this.modelNode.emitter){
        this.modelNode.emitter.colorStart.copy(data);
        this.modelNode.emitter.material.uniforms.colorStart.value.copy(data);
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      if(this.modelNode.emitter){
        this.modelNode.emitter.colorStart.setRGB(
          last.r + fl * (next.r - last.r),
          last.g + fl * (next.g - last.g),
          last.b + fl * (next.b - last.b)
        );
        this.modelNode.emitter.material.uniforms.colorStart.value.copy(this.modelNode.emitter.colorStart);
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    }
  },
  //CombineTime
  96: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //Drag
  100: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //FPS
  104: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //FrameEnd
  108: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if(this.modelNode.emitter){
        this.modelNode.emitter.material.uniforms.frameRange.value.y = data.value;
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      if(this.modelNode.emitter){
        this.modelNode.emitter.material.uniforms.frameRange.value.y = next.value;
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    }
  },
  //FrameStart
  112: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if(this.modelNode.emitter){
        this.modelNode.emitter.material.uniforms.frameRange.value.x = data.value;
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      if(this.modelNode.emitter){
        this.modelNode.emitter.material.uniforms.frameRange.value.x = next.value;
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    }
  },
  //Grav
  116: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //LifeExp
  120: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if(this.modelNode.emitter){
        this.modelNode.emitter.lifeExp = Math.ceil(data.value);
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      if(this.modelNode.emitter){
        this.modelNode.emitter.lifeExp = next.value;//Math.ceil(last.value + fl * (next.value - last.value));
      }
    }
  },
  //Mass
  124: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if(this.modelNode.emitter){
        this.modelNode.emitter.mass = data.value;
        this.modelNode.emitter.attributeChanged('mass');
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //Threshold
  164: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //P2P_Bezier2
  128: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //P2P_Bezier3
  132: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //ParticleRot
  136: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //RandVel
  140: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //SizeStart
  144: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if(this.modelNode.emitter){
        this.modelNode.emitter.material.uniforms.scale.value.x = data.value;
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      if(this.modelNode.emitter){
        this.modelNode.emitter.material.uniforms.scale.value.x = ((next.value - last.value) * fl + last.value);
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    }
  },
  
  //SizeMid
  232: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if(this.modelNode.emitter){
        this.modelNode.emitter.material.uniforms.scale.value.y = data.value;
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      if(this.modelNode.emitter){
        this.modelNode.emitter.material.uniforms.scale.value.y = ((next.value - last.value) * fl + last.value);
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    }
  },
  //SizeEnd
  148: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if(this.modelNode.emitter){
        this.modelNode.emitter.material.uniforms.scale.value.z = data.value;
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      if(this.modelNode.emitter){
        this.modelNode.emitter.material.uniforms.scale.value.z = ((next.value - last.value) * fl + last.value);
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    }
  },
  //SizeStart_Y
  152: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //SizeMid_Y
  236: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //SizeEnd_Y
  156: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //Spread
  160: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //Threshold
  164: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //Velocity
  168: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //XSize
  172: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //YSize
  176: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //BlurLength
  180: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //LightningDelay
  184: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //LightningRadius
  188: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //LightningScale
  192: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //Detonate
  228: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //AlphaMid
  216: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if(this.modelNode.emitter){
        this.modelNode.emitter.opacity[1] = data.value;
        this.modelNode.emitter.material.uniforms.opacity.value.fromArray(this.modelNode.emitter.opacity);
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      if(this.modelNode.emitter){
        this.modelNode.emitter.opacity[1] = ((next.value - last.value) * fl + last.value);
        this.modelNode.emitter.material.uniforms.opacity.value.fromArray(this.modelNode.emitter.opacity);
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    }
  },
  //ColorMid
  284: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if(this.modelNode.emitter){
        this.modelNode.emitter.colorMid.copy(data);
        this.modelNode.emitter.material.uniforms.colorMid.value.copy(data);
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      if(this.modelNode.emitter){
        this.modelNode.emitter.colorMid.setRGB(
          last.r + fl * (next.r - last.r),
          last.g + fl * (next.g - last.g),
          last.b + fl * (next.b - last.b)
        );
        this.modelNode.emitter.material.uniforms.colorMid.value.copy(this.modelNode.emitter.colorMid);
        this.modelNode.emitter.material.uniformsNeedUpdate = true;
      }
    }
  },
  //PercentStart
  220: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //PercentMid
  224: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //PercentEnd
  228: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){

    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    
    }
  },
  //SelfIllumColor
  100: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if(this.modelNode.mesh){
        if(this.modelNode.mesh.material instanceof THREE.ShaderMaterial){
          this.modelNode.mesh.material.uniforms.selfIllumColor.value.setRGB(
            data.r, 
            data.g, 
            data.b
          );
          this.modelNode.mesh.material.defines.SELFILLUMCOLOR = "";
        }else{
          this.modelNode.mesh.material.emissive.setRGB(
            data.r, 
            data.g, 
            data.b
          );
        }
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      let lerpIllumColorR = last.r + fl * (next.r - last.r);
      let lerpIllumColorG = last.g + fl * (next.g - last.g);
      let lerpIllumColorB = last.b + fl * (next.b - last.b);
      //console.log(this.modelNode.mesh._node.Diffuse.r, lerpIllumColor);
      if(this.modelNode.mesh){

        if(this.modelNode.mesh.material instanceof THREE.ShaderMaterial){
          this.modelNode.mesh.material.uniforms.selfIllumColor.value.setRGB(
            lerpIllumColorR, 
            lerpIllumColorG, 
            lerpIllumColorB
          );
          this.modelNode.mesh.material.defines.SELFILLUMCOLOR = "";
        }else{
          this.modelNode.mesh.material.emissive.setRGB(
            lerpIllumColorR, 
            lerpIllumColorG, 
            lerpIllumColorB
          );
        }
        //this.modelNode.mesh.material.needsUpdate = true;
      }
    }
  },
  //Alpha
  132: {
    setFrame: function(anim = undefined, controller = undefined, data = undefined){
      if(this.modelNode.mesh){
        if(this.modelNode.mesh.material instanceof THREE.ShaderMaterial){
          this.modelNode.mesh.material.uniforms.opacity.value = data.value;
          this.modelNode.mesh.material.opacity = data.value;
          this.modelNode.mesh.material.uniformsNeedUpdate = true;
        }else{
          this.modelNode.mesh.material.opacity = data.value;
        }
        this.modelNode.mesh.material.transparent = true;
        this.modelNode.mesh.material.needsUpdate = true;
      }
    },
    animate: function(anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
      if(this.modelNode.mesh){
        if(this.modelNode.mesh.material instanceof THREE.ShaderMaterial){
          this.modelNode.mesh.material.uniforms.opacity.value = ((next.value - last.value) * fl + last.value);;
          this.modelNode.mesh.material.uniformsNeedUpdate = true;
        }
        this.modelNode.mesh.material.opacity = ((next.value - last.value) * fl + last.value);
        this.modelNode.mesh.material.transparent = true;//this.modelNode.mesh.material.opacity < 1.0;
        //this.modelNode.mesh.material.depthFunc = 4;
        this.modelNode.mesh.material.needsUpdate = true;
      }
    }
  }
};

module.exports = AuroraModelAnimationManager;