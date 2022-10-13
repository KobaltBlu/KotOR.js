import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { TwoDAManager } from "../managers/TwoDAManager";
import { ModuleCreature, ModuleObject } from "../module";

export class EffectDisguise extends GameEffect {
  appearance: any;
  constructor( disguise_id: number = 0 ){
    super();
    this.type = GameEffectType.EffectDisguise;

    //intList[0] : appearance.2da id / disguise id
    this.setInt(0, disguise_id);
    const appearance2DA = TwoDAManager.datatables.get('appearance');
    if(appearance2DA){
      this.appearance = appearance2DA.rows[this.getInt(0)];
    }
    
  }

  async initialize(){
    super.initialize();

    const appearance2DA = TwoDAManager.datatables.get('appearance');
    if(appearance2DA){
      this.appearance = appearance2DA.rows[this.getInt(0)];
    }

    return this;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    if(this.object instanceof ModuleCreature){
      //this.object.LoadModel(() => {
        //console.log('Disguise applied', this.object, this);
      //});
    }
  }

  onRemove(){
    if(this.object instanceof ModuleCreature){
      if(this.object.pm_IsDisguised){
        this.object.appearance = this.object.pm_Appearance;
        this.object.pm_IsDisguised = 0;
      }
      //this.object.LoadModel(() => {
      //  
      //});
    }
  }

}

