import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { AppearanceManager } from "../managers/AppearanceManager";
import type { ModuleCreature } from "../module";
import { BitWise } from "../utility/BitWise";

/**
 * EffectDisguise class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectDisguise.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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
      if(BitWise.InstanceOf(this.object?.objectType, ModuleObjectType.ModuleCreature)){
        const creature = this.object as ModuleCreature;
        creature.pm_Appearance = creature.appearance;
        creature.pm_IsDisguised = true;
        creature.appearance = this.getInt(0);
        creature.creatureAppearance = disguise_appearance;
        console.log('Disguise applying', creature, this);
        creature.loadModel().then( () => {
          console.log('Disguise applied', creature, this);
        });
      }
    }
  }

  onRemove(){
    if(BitWise.InstanceOf(this.object?.objectType, ModuleObjectType.ModuleCreature)){
      const creature = this.object as ModuleCreature;
      if(creature.pm_IsDisguised){
        creature.appearance = creature.pm_Appearance;
        creature.pm_IsDisguised = false;
        creature.creatureAppearance = AppearanceManager.GetCreatureAppearanceById(creature.appearance);
      }
      console.log('Disguise removing', creature, this);
      creature.loadModel().then( () => {
        console.log('Disguise removed', creature, this);
      });
    }
  }

}

