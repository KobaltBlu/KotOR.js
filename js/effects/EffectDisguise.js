class EffectDisguise extends GameEffect {
  constructor(nDisguiseAppearance = 0){
    super();
    this.type = GameEffect.Type.EffectDisguise;
    this.nDisguiseAppearance = nDisguiseAppearance;
    this.appearance = Global.kotor2DA.appearance.rows[this.nDisguiseAppearance];
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    if(this.object instanceof ModuleCreature){
      this.object.LoadModel(() => {
        
        //if(this.getModel())
        //  this.getModel().buildSkeleton();

        console.log('Disguise applied', this.object, this);
      });
    }
  }

  onRemove(){
    if(this.object.pm_IsDisguised){
      this.object.appearance = this.object.pm_Appearance;
      this.object.pm_IsDisguised = 0;
    }
  }

}

module.exports = EffectDisguise;