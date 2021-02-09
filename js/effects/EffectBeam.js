class EffectBeam extends GameEffect {

  constructor(){
    super();
    this.type = GameEffect.Type.EffectBeam;

    //intList[0] : visualeffects.2da id
    //intList[1] : bodypart constant
    //intList[2] : hit or miss

    //objectList[0] : caster

    this.modelName = undefined;
    this.model = undefined;

  }

  initialize(){
    if(this.initialized)
      return this;

    this.visualEffect = Global.kotor2DA.visualeffects.getByID(this.getInt(0));

    super.initialize();

    return new Promise( ( resolve, reject) => {
      switch(this.visualEffect.progfx_duration){
        case 616:
          this.modelName = 'v_coldray_dur';
        break;
        case 612: 
          this.modelName = 'v_deathfld_dur';
        break;
        case 613: 
          this.modelName = 'v_drain_dur';
        break;
        case 611:
          this.modelName = 'v_drdkill_dur';
        break;
        case 610:
          this.modelName = 'v_drddisab_dur';
        break;
        case 620: 
          this.modelName = 'v_drdstun_dur';
        break;
        case 614:
          this.modelName = 'v_flame_dur';
        break;
        case 619:
          this.modelName = 'v_fstorm_dur';
        break;
        case 617:
          this.modelName = 'v_ionray01_dur';
        break;
        case 618:
          this.modelName = 'v_ionray02_dur';
        break;
        case 609:
          this.modelName = 'v_lightnx_dur';
        break;
        case 608:
          this.modelName = 'v_lightns_dur';
        break;
        case 621:
          this.modelName = 'v_fshock_dur';
        break;
        case 615:
          this.modelName = 'v_stunray_dur';
        break;
        default:
          this.modelName = 'v_coldray_dur';
        break;
      }

      Game.ModelLoader.load({
        file: this.modelName,
        onLoad: (mdl) => {
          THREE.AuroraModel.FromMDL(mdl, {
            onComplete: (model) => {
              this.model = model;
              resolve(this);
            }
          });
        },
        onError: () => {
          resolve(this);
        }
      });

    });
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    if(this.model instanceof THREE.AuroraModel){
      if(this.getCaster().model instanceof THREE.AuroraModel){
        //Add the effect to the casters model
        this.getCaster().model.add(this.model);
        //Set the target node of the BeamEffect emitter
        this.model.setEmitterTarget(this.object.model);
      }
    }
  }

  update(delta = 0){
    super.update(delta);

    if(this.durationEnded && this.hasSubType(GameEffect.DurationType.TEMPORARY)){
      return;
    }
  }

  getCaster(){
    return this.getObject(0);
  }

}

module.exports = EffectBeam;