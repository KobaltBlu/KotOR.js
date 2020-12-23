class SelfIllumColorController extends OdysseyController {

  constructor( controller = undefined ){
    super(controller);
  }

  setFrame(manager = undefined, anim = undefined, controller = undefined, data = undefined){
    if(manager.modelNode.mesh){
      if(manager.modelNode.mesh.material instanceof THREE.ShaderMaterial){
        manager.modelNode.mesh.material.uniforms.selfIllumColor.value.setRGB(
          data.r, 
          data.g, 
          data.b
        );
        manager.modelNode.mesh.material.defines.SELFILLUMCOLOR = "";
      }else{
        manager.modelNode.mesh.material.emissive.setRGB(
          data.r, 
          data.g, 
          data.b
        );
      }
    }
  }

  animate(manager = undefined, anim = undefined, controller = undefined, last = undefined, next = undefined, fl = 0){
    let lerpIllumColorR = last.r + fl * (next.r - last.r);
      let lerpIllumColorG = last.g + fl * (next.g - last.g);
      let lerpIllumColorB = last.b + fl * (next.b - last.b);
      //console.log(manager.modelNode.mesh._node.Diffuse.r, lerpIllumColor);
      if(manager.modelNode.mesh){

        if(manager.modelNode.mesh.material instanceof THREE.ShaderMaterial){
          manager.modelNode.mesh.material.uniforms.selfIllumColor.value.setRGB(
            lerpIllumColorR, 
            lerpIllumColorG, 
            lerpIllumColorB
          );
          manager.modelNode.mesh.material.defines.SELFILLUMCOLOR = "";
        }else{
          manager.modelNode.mesh.material.emissive.setRGB(
            lerpIllumColorR, 
            lerpIllumColorG, 
            lerpIllumColorB
          );
        }
        //manager.modelNode.mesh.material.needsUpdate = true;
      }
  }

}

module.exports = SelfIllumColorController;