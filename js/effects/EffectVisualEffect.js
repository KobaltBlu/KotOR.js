class EffectVisualEffect extends GameEffect {

  constructor(eId = 0, miss = false){
    super();
    this.type = GameEffect.Type.EffectVisualEffect;
    this.visualEffect = Global.kotor2DA.visualeffects.getByID(eId);

  }

  update(delta = 0){

    if(this.impact_model){
      if(this.impactTimer == undefined){
        this.impactTimer = 3000;
        this.impact_model.playAnimation('impact');
      }

      if(this.impactTimer <= 0){
        //this.impact_model.dispose();
        //this.impact_model = undefined;
      }else{
        this.impact_model.update(delta);
      }

      this.impactTimer -= 1000 * delta;
    }

    if(this.impact_root_model){
      if(this.impactRootTimer == undefined){
        this.impactRootTimer = 3000;
        this.impact_root_model.playAnimation('impact');
      }

      if(this.impactRootTimer <= 0){
        //this.impact_root_model.dispose();
        //this.impact_root_model = undefined;
      }else{
        this.impact_root_model.update(delta);
      }

      this.impactRootTimer -= 1000 * delta;
    }

    if(this.durationType == GameEffect.DurationType.TEMPORARY){

      if(this.duration <= 0){
        this.onDurationEnd();
        return;
      }

      if(this.model){

        this.model.animationManager.currentAnimation = undefined;

        if(this.object.model){
          for(let node of this.object.model.nodes){
            let c_node = this.model.nodes.get(node[0]);
            c_node.position.copy(node[1].position);
            c_node.quaternion.copy(node[1].quaternion);
            c_node.scale.copy(node[1].scale);
          }
        }
        
        if(this.object.head){
          for(let node of this.object.head.nodes){
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

    //FireAndForget
    if(this.visualEffect.type_fd == 'F'){
      //Handle progfx_Impact
      this.progFX_Impact();
    }

    this.impact();

    //Duration
    if(this.visualEffect.type_fd == 'D'){
      //Handle progfx_Duration
      this.progFX_Duration();
    }

    //Beam
    if(this.visualEffect.type_fd == 'B'){
    }

  }

  getImpactRootModel(){
    switch(this.object.getAppearance().sizecategory){
      case 1: //TINY
        return this.visualEffect.imp_root_s_node;
      case 2: //SMALL
        return this.visualEffect.imp_root_s_node;
      case 3: //MEDIUM
        return this.visualEffect.imp_root_m_node;
      case 4: //LARGE
        return this.visualEffect.imp_root_l_node;
      case 5: //HUGE
        return this.visualEffect.imp_root_h_node;
    }
    return '****';
  }

  impact(){
    if(this.visualEffect.imp_impact_node != '****'){
      Game.ModelLoader.load({
        file: this.visualEffect.imp_impact_node,
        onLoad: (mdl) => {
          THREE.AuroraModel.FromMDL(mdl, {
            context: this.object.context,
            onComplete: (model) => {
              this.impact_model = model;

              if(this.object.model){
                if(this.object.model.impact){

                  this.object.model.impact.add(this.impact_model);

                  TextureLoader.LoadQueue();
                }else{
                  this.impact_model.dispose();
                }
              }else{
                this.impact_model.dispose();
              }

            }
          });
        }
      });
    }
    this.impactRoot();

    if(this.visualEffect.soundimpact != '***'){
      if(this.object instanceof ModuleCreature){
        this.object.audioEmitter.PlaySound(this.visualEffect.soundimpact);
      }
    }
  }

  impactRoot(){
    if(this.getImpactRootModel() != '****'){
      Game.ModelLoader.load({
        file: this.getImpactRootModel(),
        onLoad: (mdl) => {
          THREE.AuroraModel.FromMDL(mdl, {
            context: this.object.context,
            onComplete: (model) => {
              this.impact_root_model = model;

              if(this.object.model){

                this.object.model.add(this.impact_root_model);

                TextureLoader.LoadQueue();
                
              }else{
                this.impact_model.dispose();
              }

            }
          });
        }
      });
    }
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

  progFX_Duration(){

    if(this.visualEffect.progfx_duration == '****')
      return;

    //ForceShield progFX_impact
    if(this.visualEffect.progfx_duration > 1400 && this.visualEffect.progfx_duration < 1500){
      let fx_tex = 'fx_tex_' + pad(this.visualEffect.progfx_duration - 1400, 2);
      
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