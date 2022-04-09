class EffectSetState extends GameEffect {
  constructor(){
    super();
    this.type = GameEffect.Type.EffectSetState;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    this.elapsed = 0;

  }

  update(delta = 0){
    super.update(delta);

    if(this.getInt(0) == 9){
      if(this.elapsed < 0.4666600227355957){
        const f_push_move_delta = (this.elapsed / 0.4666600227355957);
        const v1 = new THREE.Vector3(
          this.getFloat(0),
          this.getFloat(1),
          this.getFloat(2)
        );
        const v2 = new THREE.Vector3(
          this.getFloat(3),
          this.getFloat(4),
          this.getFloat(5)
        );
        this.object.position.copy(v1.lerp(v2, f_push_move_delta));
        this.object.box.setFromObject(this.object.model);
      }else if(this.elapsed < 1.533329963684082){
        this.object.position.set(
          this.getFloat(3),
          this.getFloat(4),
          this.getFloat(5)
        );
        this.object.box.setFromObject(this.object.model);
        this.object.fp_push_played = true;
      }else if(this.elapsed < 3){
        this.object.fp_land_played = true;
      }else{
        this.object.fp_getup_played = true;
      }
    }
    this.elapsed += delta;

  }

}

module.exports = EffectSetState;