class EffectVisualEffect extends GameEffect {

  constructor(eId = 0, miss = false){
    super();
    this.type = GameEffect.Type.EffectVisualEffect;

    this.visualEffect = Global.kotor2DA.visualeffects.getByID(eId);

  }

  update(delta = 0){

    if(this.durationType == GameEffect.DurationType.TEMPORARY){

      if(this.duration <= 0){
        this.onDurationEnd();
        return;
      }

      if(this.model){

        this.model.animationManager.currentAnimation = undefined;

        if(this.object.model){
          for(var node of this.object.model.nodes){
            let c_node = this.model.nodes.get(node[0]);
            c_node.position.copy(node[1].position);
            c_node.quaternion.copy(node[1].quaternion);
            c_node.scale.copy(node[1].scale);
          }
        }
        
        if(this.object.head){
          for(var node of this.object.head.nodes){
            let c_node = this.model.headhook.head.nodes.get(node[0]);
            c_node.position.copy(node[1].position);
            c_node.quaternion.copy(node[1].quaternion);
            c_node.scale.copy(node[1].scale);
          }
        }

        this.model.position.copy(this.object.position);
        this.model.rotation.copy(this.object.model.rotation);

        this.model.update(delta);

      }

      this.duration -= delta;
    }

  }

  onApply(){

    //Handle progfx_Impact
    this.progFX_Impact();

  }

  progFX_Impact(){

    if(this.visualEffect.progfx_impact == '****')
      return;

    //ForceShield progFX_impact
    if(this.visualEffect.progfx_impact > 1400 && this.visualEffect.progfx_impact < 1500){
      let fx_tex = 'fx_tex_' + pad(this.visualEffect.progfx_impact - 1400, 2);
      
      if(this.object instanceof ModuleCreature){
        Game.ModelLoader.load({
          file: this.object.bodyModel,
          onLoad: (mdl) => {
            THREE.AuroraModel.FromMDL(mdl, {
              textureVar: fx_tex,
              isForceShield: true,
              context: this.object.context,
              onComplete: (model) => {
                this.model = model;
                Game.scene.add(model);
                model.position.copy(this.object.position);
                model.rotation.copy(this.object.rotation);
                model.quaternion.copy(this.object.quaternion);
                //model.disableMatrixUpdate();
                
                if(this.object.headModel){
                  Game.ModelLoader.load({
                    file: this.object.headModel,
                    onLoad: (mdl) => {
                      THREE.AuroraModel.FromMDL(mdl, {
                        textureVar: fx_tex,
                        context: this.object.context,
                        isForceShield: true,
                        onComplete: (head) => {
                          this.model.headhook.head = head;
                          this.model.headhook.add(head);
                          //head.disableMatrixUpdate();
                          TextureLoader.LoadQueue();
                        }
                      });
                    }
                  });
                }else{
                  TextureLoader.LoadQueue();
                }
              }
            });
          }
        });
      }

    }
  }

  onRemove(){
    if(this.model instanceof THREE.AuroraModel){
      this.model.dispose();
    }
  }

}
module.exports = EffectVisualEffect;