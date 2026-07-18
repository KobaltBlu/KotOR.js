import { Action } from "@/actions/Action";
import { DiceType } from "@/enums/combat/DiceType";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { SkillType } from "@/enums/nwscript/SkillType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { Dice } from "@/utility/Dice";
import { isInUseRange, queueMoveIntoUseRange } from "@/actions/use-range";

/**
 * ActionHeal class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionHeal.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionHeal extends Action {

  private animQueued = false;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionHeal;

    //PARAMS
    // 0 - dword: target creature
    // 1 - dword: medpac / repair kit item
    // 2 - int: skill type (SkillType.TREAT_INJURY or SkillType.REPAIR); 0 treated as TREAT_INJURY
    // 3 - int: allow move into range
  }

  update(delta: number = 0): ActionStatus {
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.ERROR;
    }

    const owner = this.owner as ModuleCreature;
    if(owner.isDead() || owner.isDebilitated()){
      return ActionStatus.ERROR;
    }

    this.target = this.getParameter<ModuleObject>(0);
    const item = this.getParameter<ModuleItem>(1);
    const skillParam = this.getParameter<number>(2) | 0;
    const skillType = skillParam === SkillType.REPAIR ? SkillType.REPAIR : SkillType.TREAT_INJURY;
    const allowMove = this.getParameter<number>(3) !== 0;

    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature)){
      return ActionStatus.ERROR;
    }
    if(!BitWise.InstanceOfObject(item, ModuleObjectType.ModuleItem)){
      return ActionStatus.ERROR;
    }

    if(!isInUseRange(owner, this.target)){
      if(!allowMove){
        return ActionStatus.ERROR;
      }
      this.setParameter(3, ActionParameterType.INT, 0);
      queueMoveIntoUseRange(owner, this.target, this.groupId);
      return ActionStatus.IN_PROGRESS;
    }

    owner.setFacingObject(this.target);

    if(!this.animQueued){
      this.animQueued = true;
      const playAnim = new GameState.ActionFactory.ActionPlayAnimation();
      playAnim.setParameter(0, ActionParameterType.INT, 10017);
      playAnim.setParameter(1, ActionParameterType.FLOAT, 1.0);
      playAnim.setParameter(2, ActionParameterType.FLOAT, 2.0);
      owner.actionQueue.addFront(playAnim);
      return ActionStatus.IN_PROGRESS;
    }

    const skillRank = owner.getSkillLevel(skillType) | 0;
    const roll = Dice.roll(1, DiceType.d20);
    const healAmount = roll + skillRank;

    if(skillType === SkillType.TREAT_INJURY){
      const poisonOrDisease = this.target.effects.find(
        (e) => e.type === GameEffectType.EffectPoison || e.type === GameEffectType.EffectDisease
      );

      if(poisonOrDisease){
        // Treat Injury d20 vs poison/disease DC when available; else modest flat DC.
        const poisonDC = ((poisonOrDisease as any).getInt?.(0) | 0) || 15;
        if(roll + skillRank >= poisonDC){
          this.target.removeEffect(poisonOrDisease);
        }
      }else if(this.target.getHP() >= this.target.getMaxHP()){
        return ActionStatus.ERROR;
      }
    }else if(this.target.getHP() >= this.target.getMaxHP()){
      return ActionStatus.ERROR;
    }

    const inventory = owner.getInventory();
    if(inventory.includes(item)){
      const stack = item.getStackSize();
      if(stack <= 1){
        const idx = inventory.indexOf(item);
        if(idx >= 0){
          inventory.splice(idx, 1);
        }
        item.destroy();
      }else{
        item.setStackSize(stack - 1);
      }
    }

    const healEffect = new GameState.GameEffectFactory.EffectHeal();
    healEffect.setCreator(owner);
    healEffect.setInt(0, healAmount);
    this.target.addEffect(healEffect);

    return ActionStatus.COMPLETE;
  }

}
