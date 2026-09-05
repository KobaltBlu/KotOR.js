/**
 * Combat schedule must survive long approaches (>8s SetCombatState timer).
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/engine/FollowerCamera', () => ({
  FollowerCamera: { setCombatCameraActive: jest.fn() },
}));

jest.mock('@/GameState', () => ({
  GameState: {
    getCurrentPlayer: jest.fn(),
    TwoDAManager: { datatables: new Map() },
    ModuleObjectManager: { GetObjectById: (id: number) => ({ id }) },
    ActionFactory: {},
  },
}));

import { CombatData } from '@/combat/CombatData';
import { COMBAT_STATE_DURATION_MS, hasLivingCombatTarget } from '@/combat/combat-engagement';
import { ActionType } from '@/enums/actions/ActionType';

function makeCreature(){
  const c: any = {
    clientCombatMode: false,
    combatStateTimer: COMBAT_STATE_DURATION_MS,
    combatStateReason: 1,
    combatRound: { action: undefined, newAttackTarget: undefined, scheduledActionList: [] },
    actionQueue: [] as any[],
    animationState: { index: 0 },
    isDead: () => false,
    setCombatState: jest.fn(function(this: any, active: boolean){
      this.combatData.combatState = !!active;
      if(!active){
        this.combatStateTimer = 0;
        this.combatData.lastAttackTarget = undefined;
        this.combatData.lastAttemptedAttackTarget = undefined;
        this.combatRound.scheduledActionList = [];
        this.combatRound.action = undefined;
      }else{
        this.combatStateTimer = COMBAT_STATE_DURATION_MS;
      }
    }),
    setAnimationState: jest.fn(),
    weaponPowered: jest.fn(),
    cancelCombat: jest.fn(),
  };
  c.combatData = new CombatData(c);
  c.combatData.combatState = true;

  c.isActivelyPursuingCombatTarget = function(){
    if(!hasLivingCombatTarget(this)) return false;
    if(this.combatRound?.action?.target && !this.combatRound.action.target.isDead?.()){
      return true;
    }
    for(let i = 0; i < this.actionQueue.length; i++){
      const action = this.actionQueue[i];
      if(!action) continue;
      if(action.type === ActionType.ActionPhysicalAttacks) return true;
      if(action.type === ActionType.ActionMoveToPoint){
        const moveTarget = action.getParameter?.(4);
        if(
          moveTarget &&
          (
            moveTarget === this.combatData.lastAttackTarget ||
            moveTarget === this.combatData.lastAttemptedAttackTarget ||
            moveTarget === this.combatRound?.action?.target ||
            moveTarget === this.combatRound?.newAttackTarget
          )
        ){
          return true;
        }
      }
    }
    return false;
  };

  c.updateCombatStateTimer = function(delta = 0){
    if(!this.combatData.combatState) return;
    this.combatStateTimer -= (1000 * delta);
    if(this.combatStateTimer <= 0){
      if(this.isActivelyPursuingCombatTarget()){
        this.combatStateTimer = COMBAT_STATE_DURATION_MS;
        return;
      }
      this.setCombatState(false, this.combatStateReason);
    }
  };

  return c;
}

describe('combat schedule during long approach', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refreshes combat timer instead of clearing schedule while chasing living target', () => {
    const pc = makeCreature();
    const foe = { id: 2, isDead: () => false };
    pc.combatData.lastAttemptedAttackTarget = foe;
    pc.combatRound.action = { target: foe };
    pc.combatRound.scheduledActionList = [{ id: 'feat-queue' }];
    pc.actionQueue = [{ type: ActionType.ActionMoveToPoint, getParameter: () => foe }];
    pc.combatStateTimer = 1;

    pc.updateCombatStateTimer(0.002);

    expect(pc.setCombatState).not.toHaveBeenCalled();
    expect(pc.combatStateTimer).toBe(COMBAT_STATE_DURATION_MS);
    expect(pc.combatRound.scheduledActionList).toHaveLength(1);
  });

  it('clears combat state when timer expires with no living pursuit', () => {
    const pc = makeCreature();
    pc.combatStateTimer = 1;
    pc.combatRound.scheduledActionList = [{ id: 'feat-queue' }];

    pc.updateCombatStateTimer(0.002);

    expect(pc.setCombatState).toHaveBeenCalledWith(false, 1);
  });

  it('hasLivingCombatTarget stays true for living attempted attack target', () => {
    const pc = makeCreature();
    const foe = { id: 2, isDead: () => false };
    pc.combatData.lastAttemptedAttackTarget = foe;
    expect(hasLivingCombatTarget(pc)).toBe(true);
    foe.isDead = () => true;
    expect(hasLivingCombatTarget(pc)).toBe(false);
  });
});
