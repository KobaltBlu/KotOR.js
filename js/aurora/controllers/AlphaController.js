class AlphaController extends OdysseyController {

  constructor( controller = undefined ){
    super(controller);
  }

  setFrame(manager = undefined, anim = undefined, controller = undefined, data = undefined){
    if(manager.modelNode.mesh){
      if(manager.modelNode.mesh.material instanceof THREE.ShaderMaterial){
        manager.modelNode.mesh.material.uniforms.opacity.value = data.value;
        manager.modelNode.mesh.material.opacity = data.value;
        manager.modelNode.mesh.material.uniformsNeedUpdate = true;
      }else{
        manager.modelNode.mesh.material.opacity = data.value;
      }
      manager.modelNode.mesh.material.transparent = true;
      manager.modelNode.mesh.material.needsUpdate = true;
    }
  }

  animate(manager = undefined, anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    if(manager.modelNode.mesh){
      if(manager.modelNode.mesh.material instanceof THREE.ShaderMaterial){
        manager.modelNode.mesh.material.uniforms.opacity.value = ((next.value - last.value) * fl + last.value);;
        manager.modelNode.mesh.material.uniformsNeedUpdate = true;
      }
      manager.modelNode.mesh.material.opacity = ((next.value - last.value) * fl + last.value);
      manager.modelNode.mesh.material.transparent = true;//manager.modelNode.mesh.material.opacity < 1.0;
      //manager.modelNode.mesh.material.depthFunc = 4;
      manager.modelNode.mesh.material.needsUpdate = true;
    }
  }

}

module.exports = AlphaController;