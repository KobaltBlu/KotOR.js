import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { AppearanceManager } from "../managers";
import { ModuleCreature, ModuleObject } from "../module";

export class EffectDisguise extends GameEffect {
  appearance: any;
  constructor(){
    super();
    this.type = GameEffectType.EffectDisguise;

    //intList[0] : appearance.2da id / disguise id
    this.appearance = AppearanceManager.GetCreatureAppearanceById(this.getInt(0));
    
  }

  initialize(){
    super.initialize();

    this.appearance = AppearanceManager.GetCreatureAppearanceById(this.getInt(0));

    return this;
  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();

    const disguise_appearance = AppearanceManager.GetCreatureAppearanceById(this.getInt(0));
    if(disguise_appearance){
      if(this.object instanceof ModuleCreature){
        this.object.pm_Appearance = this.object.appearance;
        this.object.pm_IsDisguised = true;
        this.object.appearance = this.getInt(0);
        this.object.creatureAppearance = disguise_appearance;
        console.log('Disguise applying', this.object, this);
        this.object.LoadModel().then( () => {
          console.log('Disguise applied', this.object, this);
        });
      }
    }
  }

  onRemove(){
    if(this.object instanceof ModuleCreature){
      if(this.object.pm_IsDisguised){
        this.object.appearance = this.object.pm_Appearance;
        this.object.pm_IsDisguised = false;
        this.object.creatureAppearance = AppearanceManager.GetCreatureAppearanceById(this.object.appearance);
      }
      console.log('Disguise removing', this.object, this);
      this.object.LoadModel().then( () => {
        console.log('Disguise removed', this.object, this);
      });
    }
  }

}

