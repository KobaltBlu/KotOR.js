import { Action, ActionMoveToPoint, ActionQueue } from ".";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { WeaponType } from "../enums/combat/WeaponType";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { GameState } from "../GameState";
import { SSFObjectType } from "../interface/resource/SSFType";
import { ModuleCreature, ModuleObject } from "../module";
import { Utility } from "../utility/Utility";
import * as THREE from "three";

export class ActionPhysicalAttacks extends Action {

  constructor( groupId: number = ActionQueue.AUTO_INCREMENT_GROUP_ID ){
    super(groupId);
    this.type = ActionType.ActionPhysicalAttacks;

    //PARAMS
    // 0 - ResultsCalculated (?) (INT)
    // 1 - Target (DWORD)
    // 2 - CombatActionType (INT)
    // 3 - AnimationIndex (INT)
    // 4 - AnimationLength (INT)
    // 5 - AttackCount (?) (INT)
    // 6 - TalentID (INT)
    // 7 - AttackType (INT)
    // 8 - AttackResult (?) (INT)
    // 9 - AttackDamage (INT)
  }

  update(delta: number = 0): ActionStatus {
    
    this.target = this.getParameter(1);

    if(!(this.target instanceof ModuleObject)){
      return ActionStatus.FAILED;
    }

    if(!(this.owner instanceof ModuleCreature)){
      return ActionStatus.FAILED;
    }

    this.owner.resetExcitedDuration();
    let range = ( this.owner.isRangedEquipped() ? 15.0 : 2.0 );

    if(this.target.isDead()){
      //todo: we may need to end combatround early here if it has already started
      return ActionStatus.FAILED;
    }else{
      let distance = Utility.Distance2D(this.owner.position, this.target.position);
      if( distance > range ){

        this.owner.openSpot = undefined;
        let target_position = this.target.position.clone();

        if(this.target instanceof ModuleCreature){
          if(!this.owner.isRangedEquipped()){ //MELEE
            this.owner.openSpot = this.target.getClosesetOpenSpot(this.owner);
            if(typeof this.owner.openSpot != 'undefined'){
              target_position.copy(this.owner.openSpot.targetVector);
            }
          }
        }

        let actionMoveToTarget = new ActionMoveToPoint(this.groupId);
        actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, target_position.x);
        actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, target_position.y);
        actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, target_position.z);
        actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
        actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target.id);
        actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
        actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, range );
        actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
        actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
        this.owner.actionQueue.addFront(actionMoveToTarget);

        return ActionStatus.IN_PROGRESS;
      }else{
        this.owner.force = 0;
        this.owner.speed = 0;
        this.owner.openSpot = undefined;

        if(this.owner.combatRound){
          const combatRound = this.owner.combatRound;
          if(!combatRound.roundPaused) {

            if( !combatRound.engaged ){ //non dueling round
              combatRound.beginCombatRound();
              combatRound.pauseRound(this.owner, combatRound.roundLength);
              if(combatRound.action){
                combatRound.action.animation = ModuleCreatureAnimState.ATTACK;
              }

            }else{ //dueling round
              combatRound.beginCombatRound();
              if(combatRound.action){
                combatRound.action.animation = ModuleCreatureAnimState.ATTACK_DUELING;
              }
              combatRound.pauseRound(this.owner, combatRound.roundLength);

              if(combatRound.master){
                if(this.target instanceof ModuleCreature){
                  this.target.combatRound.beginCombatRound();
                  this.target.combatRound.pauseRound(this.owner, combatRound.roundLength);
                  if(this.target.combatRound.action){
                    this.target.combatRound.action.animation = ModuleCreatureAnimState.ATTACK_DUELING;
                  }
                }
              }

            }

            if(combatRound.roundStarted){

              if(combatRound.newAttackTarget instanceof ModuleObject){
                combatRound.setAttackTarget(combatRound.newAttackTarget);
              }

              combatRound.calculateAttackDamage(this.owner, combatRound.action);

              this.owner.setFacing(
                Math.atan2(
                  this.owner.position.y - this.target.position.y,
                  this.owner.position.x - this.target.position.x
                ) + Math.PI/2,
                false
              );

              let attack_sound = THREE.MathUtils.randInt(0, 2);
              switch(attack_sound){
                case 1:
                  this.owner.PlaySoundSet(SSFObjectType.ATTACK_2);
                break;
                case 2:
                  this.owner.PlaySoundSet(SSFObjectType.ATTACK_3);
                break;
                default:
                  this.owner.PlaySoundSet(SSFObjectType.ATTACK_1);
                break;
              }

              return ActionStatus.COMPLETE;
            }

          }
          return ActionStatus.IN_PROGRESS;
        }else{
          return ActionStatus.FAILED;
        }
      }
    }
  }

}
