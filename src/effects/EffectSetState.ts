export class EffectSetState extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectSetState;
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
      this.fp_distance = this.getFloat(6);

      const anim_push_length = 0.4666600227355957 * (this.fp_distance / 5);
      const anim_land_length = 1.0666699409484863;
      const anim_getup_length = 1.466670036315918;

      if(this.elapsed < anim_push_length){
        const f_push_move_delta = (this.elapsed / anim_push_length);
        this.object.position.copy(v1.lerp(v2, f_push_move_delta));
        this.object.box.setFromObject(this.object.model);
      }else if(this.elapsed < anim_push_length + anim_land_length){
        this.object.position.set(
          this.getFloat(3),
          this.getFloat(4),
          this.getFloat(5)
        );
        this.object.box.setFromObject(this.object.model);
        this.object.fp_push_played = true;
      }else if(this.elapsed < anim_push_length + anim_land_length + anim_getup_length){
        this.object.fp_land_played = true;
      }else{
        this.object.fp_getup_played = true;
      }
    }
    this.elapsed += delta;

  }

}

