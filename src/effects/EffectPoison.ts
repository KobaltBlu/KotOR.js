import { GameState } from "../GameState";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { GameEffect } from "./GameEffect";

/**
 * EffectPoison class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectPoison.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectPoison extends GameEffect {
  time: number;
  poison: any;
  constructor(){
    super();
    this.type = GameEffectType.EffectPoison;
    this.time = 0;

    //intList[0] : poison.2da id
    //intList[1] : nLastDayApplied
    //intList[2] : nLastTimeApplied
    //intList[3] : nLastDayApplied ?Last Ticked
    //intList[4] : nLastTimeApplied ?Last Ticked
    //intList[5] : nPoisonDuration
    //intList[6] : nPosionPeriod
    //intList[7] : 
    
    //floatList[0] : tick count

  }

  initialize(){
    super.initialize();
    const poison2DA = GameState.TwoDAManager.datatables.get('poison');
    if(poison2DA){
      this.poison = poison2DA.rows[this.getPoisionId()];
    }

    return this;
  }

  onApply(){
    if(this.applied)
      return;

    //Poison Visual Effect
    let eVisualEffect = new GameState.GameEffectFactory.EffectVisualEffect();
    eVisualEffect.setCreator(this.getCreator());
    eVisualEffect.setSpellId(this.getSpellId());
    eVisualEffect.setSubTypeUnMasked(this.getSubTypeUnMasked());
    eVisualEffect.setDuration(this.duration);
    eVisualEffect.setExpireDay(this.expireDay);
    eVisualEffect.setExpireTime(this.expireTime);
    eVisualEffect.setInt(0, 1003);
    eVisualEffect.initialize();
    this.object.addEffect(eVisualEffect);
    eVisualEffect.setSkipOnLoad(true);

      
    super.onApply();
  }

  getPoisionId(){
    return this.intList[0];
  }

}

