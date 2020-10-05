class EffectBeam extends GameEffect {

  constructor(vfxId = 0, caster = undefined, bodyPart = '', miss = false){
    super();
    this.type = GameEffect.Type.EffectBeam;
    this.vfxId = vfxId;
    this.caster = caster;
    this.bodyPart = bodyPart;
    this.miss = miss;

    this.visualEffect = Global.kotor2DA.visualeffects.getByID(this.vfxId);

    this.modelName = undefined;
    this.model = undefined;

  }

  initialize(){
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
    //this.duration = duration;
    if(this.model instanceof THREE.AuroraModel){
      if(this.caster.model instanceof THREE.AuroraModel){
        //Add the effect to the casters model
        this.caster.model.add(this.model);
        //Set the target node of the BeamEffect emitter
        this.model.setEmitterTarget(this.object.model);
      }
    }
  }

}

module.exports = EffectBeam;