import { CombatRound } from "@/combat/CombatRound";
import { ModuleObjectType, SSFType } from "@/enums";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { Action } from "@/actions/Action";
import * as THREE from 'three';
import { TURN_SPEED_FAST } from "@/engine/TurnSpeeds";
import { enqueueMoveToPoint } from "@/actions/helpers/enqueueMoveToPoint";

/**
 * ActionPhysicalAttacks class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionPhysicalAttacks.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionPhysicalAttacks extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionPhysicalAttacks;

    //PARAMS
    // 0 - (?)
    // 1 - Target (DWORD)
    // 2 - (?)
    // 3 - AnimationIndex (INT)
    // 4 - AnimationLength (INT)
    // 5 - (?)
    // 6 - (?)
    // 7 - (?)
    // 8 - (?)
    // 9 - (?)
  }

  update(delta: number = 0): ActionStatus {
    
    this.target = this.getParameter<ModuleObject>(1);

    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleObject)){
      return ActionStatus.FAILED;
    }

    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }

    const owner: ModuleCreature = this.owner as any;
    const target: ModuleCreature = this.target as any;

    owner.resetExcitedDuration();
    let range = ( owner.isRangedEquipped() ? 15.0 : 2.0 );

    if(target.isDead()){
      //todo: we may need to end combatround early here if it has already started
      return ActionStatus.FAILED;
    }else{
      let distance = Utility.Distance2D(owner.position, target.position);
      if( distance > range ){

        // owner.openSpot = undefined;
        let target_position = target.position.clone();
        
        /*if(!owner.isRangedEquipped()){ //MELEE
          owner.openSpot = target.getClosesetOpenSpot(owner);
          if(typeof owner.openSpot != 'undefined'){
            target_position.copy(owner.openSpot.targetVector);
          }
        }*/

        enqueueMoveToPoint(owner, {
          x: target_position.x,
          y: target_position.y,
          z: target_position.z,
          area: target.area.id,
          target: target.id,
          run: true,
          range,
          timeout: 30.0,
          groupId: this.groupId,
        });

        return ActionStatus.IN_PROGRESS;
      }else{
        owner.force = 0;
        owner.speed = 0;

        if(!owner.combatRound){
          return ActionStatus.FAILED;
        }

        const combatRound = owner.combatRound;
        if(!combatRound.roundPaused) {

          if( !combatRound.engaged ){ //non dueling round
            combatRound.beginCombatRound();
            combatRound.pauseRound(owner, CombatRound.ROUND_LENGTH);
            if(combatRound.action){
              combatRound.action.animation = ModuleCreatureAnimState.ATTACK;
            }

          }else{ //dueling round
            combatRound.beginCombatRound();
            if(combatRound.action){
              combatRound.action.animation = ModuleCreatureAnimState.ATTACK_DUELING;
            }
            combatRound.pauseRound(owner, CombatRound.ROUND_LENGTH);

            if(combatRound.master){
              target.combatRound.beginCombatRound();
              target.combatRound.pauseRound(owner, CombatRound.ROUND_LENGTH/2);
              if(target.combatRound.action){
                target.combatRound.action.animation = ModuleCreatureAnimState.ATTACK_DUELING;
              }
            }

          }

          if(combatRound.roundStarted){

            if(BitWise.InstanceOfObject(combatRound.newAttackTarget, ModuleObjectType.ModuleObject)){
              combatRound.setAttackTarget(combatRound.newAttackTarget);
            }

            combatRound.calculateAttackDamage(owner, combatRound.action);

            owner.setFacing(
              Math.atan2(
                owner.position.y - target.position.y,
                owner.position.x - target.position.x
              ) + Math.PI/2,
              false,
              TURN_SPEED_FAST
            );

            const attack_sound = THREE.MathUtils.randInt(0, 2);
            switch(attack_sound){
              case 1:
                owner.playSoundSet(SSFType.ATTACK_2);
              break;
              case 2:
                owner.playSoundSet(SSFType.ATTACK_3);
              break;
              default:
                owner.playSoundSet(SSFType.ATTACK_1);
              break;
            }

            return ActionStatus.COMPLETE;
          }

        }
        return ActionStatus.IN_PROGRESS;
      }
    }
  }

}
