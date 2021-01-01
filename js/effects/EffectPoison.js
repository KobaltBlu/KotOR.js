class EffectPoison extends GameEffect {
  constructor(nPoison = 0){
    super();
    this.type = GameEffect.Type.EffectPoison;
    this.nPoison = nPoison;
    this.poison = Global.kotor2DA.poison.rows[this.nPoison];

    this.time = 0;

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
  }

  update(delta = 0){

  }

}

module.exports = EffectPoison;