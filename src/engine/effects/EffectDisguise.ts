import { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { AppearanceManager } from "@engine/managers/AppearanceManager";
import type { Creature } from "@engine/module/Creature";
import { BitWise } from "@core/utility/BitWise";

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
      if(BitWise.InstanceOf(this.object?.objectType, GameObjectType.Creature)){
        const creature = this.object as Creature;
        creature.pm_Appearance = creature.appearance;
        creature.pm_IsDisguised = true;
        creature.setAppearance(this.getInt(0));
        console.log('Disguise applying', creature, this);
        creature.loadModel().then( () => {
          console.log('Disguise applied', creature, this);
        });
      }
    }
  }

  onRemove(){
    if(BitWise.InstanceOf(this.object?.objectType, GameObjectType.Creature)){
      const creature = this.object as Creature;
      if(creature.pm_IsDisguised){
        creature.appearance = creature.pm_Appearance;
        creature.pm_IsDisguised = false;
        creature.setAppearance(creature.appearance);
      }
      console.log('Disguise removing', creature, this);
      creature.loadModel().then( () => {
        console.log('Disguise removed', creature, this);
      });
    }
  }

}

