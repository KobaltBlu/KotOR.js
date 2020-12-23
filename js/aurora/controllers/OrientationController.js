class OrientationController extends OdysseyController {

  constructor( controller = undefined ){
    super(controller);
  }

  setFrame(manager = undefined, anim = undefined, controller = undefined, data = undefined){
    //Cache the orientation controller
    if(manager.modelNode.controllers.hasOrientation === undefined){
      let _controller = manager.modelNode.controllers.get(AuroraModel.ControllerType.Orientation);
      if(typeof _controller != 'undefined'){
        manager.modelNode.controllers.hasOrientation = true;
        manager.modelNode.controllers.orientation = _controller;
      }else{
        manager.modelNode.controllers.hasOrientation = false;
        manager.modelNode.controllers.orientation = undefined;
      }
    }

    if(manager.modelNode.controllers.hasOrientation){

      if(manager.trans && controller.frameCount > 1){
        manager.modelNode.trans.quaternion.copy(manager.modelNode.quaternion);
        anim._quaternion.copy(manager.modelNode.trans.quaternion);
      }else{
        anim._quaternion.copy(manager.modelNode.controllers.orientation.data[0]);
      }

    }
    if(data.x == 0 && data.y == 0 && data.z == 0 && data.w == 1){
      data.x = anim._quaternion.x;
      data.y = anim._quaternion.y;
      data.z = anim._quaternion.z;
      data.w = anim._quaternion.w;
    }

    if(manager.trans && controller.frameCount > 1){
      manager.modelNode.quaternion.slerp(manager._quat.copy(anim._quaternion), 0);
    }else{
      manager.modelNode.quaternion.copy(data);
    }

    manager.modelNode.updateMatrix();
  }

  animate(manager = undefined, anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    if(manager.modelNode.emitter){

      if(manager.trans && manager.lastFrame == 0){
        manager.modelNode.position.copy(manager.modelNode.trans.position);
      }
      manager._quat.slerp(next, fl);
  
      //manager.modelNode.emitter.velocity.value.copy(manager.modelNode.emitterOptions.velocity.value.copy().applyQuaternion(manager._quat));
      //manager.modelNode.emitter.velocity.spread.copy(manager.modelNode.emitterOptions.velocity.spread.copy().applyQuaternion(manager._quat));
      //manager.modelNode.emitter.updateFlags['velocity'] = true;
  
      manager.modelNode.rotation.z = 0;
  
    }else{
      manager._quat.copy(next);
  
      if(next != last){
        if(manager.trans && manager.lastFrame == 0){
          manager.modelNode.quaternion.copy(manager.modelNode.trans.quaternion);
          manager.modelNode.trans.quaternion.copy(manager.modelNode.quaternion.slerp(manager._quat, fl));
        }else{
          manager.modelNode.quaternion.copy(last);
          manager.modelNode.quaternion.slerp(manager._quat, fl);
        }
      }else{
        manager.modelNode.quaternion.copy(last);
      }
      //manager.modelNode.quaternion.copy(last);
    }
    manager.modelNode.updateMatrix();
  }

}

module.exports = OrientationController;