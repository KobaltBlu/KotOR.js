class EffectDisguise extends GameEffect {
  constructor(appearanceId = 0){
    super();
    this.type = GameEffect.Type.EffectDisguise;
    this.appearanceId = appearanceId;
  }

  onApply(){
    if(this.object instanceof ModuleCreature){
      this.object.LoadModel(() => {
        
        //if(this.getModel())
        //  this.getModel().buildSkeleton();

        console.log('Disguise applied', this.object, this);
      });
    }
  }

}

module.exports = EffectDisguise;