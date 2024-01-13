import { GameEffectDurationType } from "../enums/effects/GameEffectDurationType";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { GameState } from "../GameState";
import { GameEffect } from "./GameEffect";

/**
 * EffectRegenerate class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectRegenerate.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectRegenerate extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectRegenerate;

    //intList[0] : nAmount
    //intList[1] : fIntervalSeconds
    //intList[2] : nLastDayApplied
    //intList[3] : nLastTimeApplied
    //intList[4] : nItemPropsDef index

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();

    this.setInt(2, GameState.module.timeManager.pauseDay);
    this.setInt(3, GameState.module.timeManager.pauseTime);
  }

  update(delta = 0){
    super.update(delta);

    const milliseconds_elapsed = GameState.module.timeManager.getMilisecondsElapsed(this.getInt(2), this.getInt(3));
    if(milliseconds_elapsed >= this.getInt(1) * 1000){

      //tick regen
      if(this.getInt(4) == 54){
        //apply force heal
        const eHealFP = new GameState.GameEffectFactory.EffectHealForcePoints();
        eHealFP.setCreator(this.getCreator());
        eHealFP.setSpellId(this.getSpellId());
        eHealFP.setSubTypeUnMasked(GameEffectDurationType.INSTANT | this.getSubTypeUnMasked() & GameEffectDurationType.MASK);
        eHealFP.setDuration(0);
        eHealFP.setExpireDay(0);
        eHealFP.setExpireTime(0);
        eHealFP.setInt(0, this.getInt(0));
        eHealFP.initialize();
        this.object.addEffect(eHealFP);
        eHealFP.setSkipOnLoad(true);
      }else{
        //apply heal
        const eHeal = new GameState.GameEffectFactory.EffectHeal();
        eHeal.setCreator(this.getCreator());
        eHeal.setSpellId(this.getSpellId());
        eHeal.setSubTypeUnMasked(GameEffectDurationType.INSTANT | this.getSubTypeUnMasked() & GameEffectDurationType.MASK);
        eHeal.setDuration(0);
        eHeal.setExpireDay(0);
        eHeal.setExpireTime(0);
        eHeal.setInt(0, this.getInt(0));
        eHeal.initialize();
        this.object.addEffect(eHeal);
        eHeal.setSkipOnLoad(true);
      }

      this.setInt(2, GameState.module.timeManager.pauseDay);
      this.setInt(3, GameState.module.timeManager.pauseTime);
    }
    
  }

}

