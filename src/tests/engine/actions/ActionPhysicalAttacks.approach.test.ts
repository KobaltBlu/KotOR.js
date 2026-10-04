/**
 * PhysicalAttacks approach queue: CheckMove + Facing + Move.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as THREE from 'three';

jest.mock('@engine/pathfinding/walk-line-clear', () => ({
  WalkLineHitCode: { Fail: 0, Ok: 1, NonWalk: -1, DetailedBlock: -2, Creature: -3 },
  hasWalkLineClear: jest.fn(() => ({
    ok: true,
    code: 1,
    clearPoint: new THREE.Vector3(),
    clearT: 1,
  })),
}));

jest.mock('@engine/combat/CombatRound', () => ({
  CombatRound: { ROUND_LENGTH: 3000 },
}));

const queued: unknown[] = [];

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    PartyManager: { party: [] },
    ActionFactory: {
      ActionPhysicalAttacks: class {
        parameters: { type: number; value: unknown }[] = [];
        isUserAction = false;
        setParameter(i: number, type: number, value: unknown){
          this.parameters[i] = { type, value };
        }
      },
      ActionMoveToPoint: class {
        type = 0x01;
        parameters: { type: number; value: unknown }[] = [];
        setParameter(i: number, type: number, value: unknown){
          this.parameters[i] = { type, value };
        }
      },
      ActionCheckMoveToObjectRadius: class {
        type = 0x11;
        parameters: { type: number; value: unknown }[] = [];
        setParameter(i: number, type: number, value: unknown){
          this.parameters[i] = { type, value };
        }
      },
      ActionChangeFacingObject: class {
        type = 0x13;
        parameters: { type: number; value: unknown }[] = [];
        setParameter(i: number, type: number, value: unknown){
          this.parameters[i] = { type, value };
        }
      },
    },
  },
}));

jest.mock('@engine/actions/Action', () => ({
  Action: class {
    parameters: { type: number; value: unknown }[] = [];
    owner: unknown;
    target: unknown;
    groupId = -1;
    isUserAction = false;
    setParameter(i: number, type: number, value: unknown){
      this.parameters[i] = { type, value };
    }
    getParameter<T>(i: number): T {
      return this.parameters[i]?.value as T;
    }
  },
}));

jest.mock('@engine/combat/attack-range', () => ({
  desiredAttackRange: () => 2.0,
  maxAttackRange: () => 2.5,
  getAttackMoveArriveRange: () => 2.0,
  getCreaturePersonalSpace: () => 0.4,
  getPathPersonalSpace: () => 0.35,
  hasCombatLineOfSight: jest.fn(() => true),
}));

jest.mock('@engine/combat/combat-dueling', () => ({
  resolveDuelRoundFlags: () => ({
    choreographed: false,
    engaged: false,
    master: false,
    useDuelingAnim: false,
  }),
}));

jest.mock('@engine/combat/nearest-enemy', () => ({
  hasTargetBeenDetected: () => true,
}));

jest.mock('@engine/combat/initialize-new-attack-target', () => ({
  tryStuckLosRetarget: jest.fn(() => 'waiting'),
}));

jest.mock('@engine/combat/nearest-action-point', () => ({
  getNearestActionPoint: (_t: { position: THREE.Vector3 }, _from: THREE.Vector3) =>
    new THREE.Vector3(10, 0, 0),
}));

jest.mock('@engine/combat/combat-round-pause', () => ({
  resolveAttackPauseMs: () => 1500,
}));

jest.mock('@engine/combat/try-force-jump-approach', () => ({
  tryForceJumpApproach: jest.fn(() => false),
}));

jest.mock('@engine/combat/duel-debug', () => ({
  duelLog: () => {},
  duelWho: () => 'x',
}));

jest.mock('@engine/module/guards/isCreature', () => ({
  isCreature: (o: unknown) => !!(o as { __creature?: boolean })?.__creature,
}));

jest.mock('@engine/module/guards/isObject', () => ({
  isObject: (o: unknown) => !!o,
}));

import { ActionPhysicalAttacks } from '@engine/actions/ActionPhysicalAttacks';
import { ActionStatus } from '@core/enums/actions/ActionStatus';
import { ActionParameterType } from '@core/enums/actions/ActionParameterType';
import { hasCombatLineOfSight } from '@engine/combat/attack-range';
import { ActionType } from '@core/enums/actions/ActionType';
import { tryForceJumpApproach } from '@engine/combat/try-force-jump-approach';
import { CombatFeatType } from '@core/enums/combat/CombatFeatType';
import {
  CreatureLocoState,
  getCreatureLocoState,
  tryWakePausedCreatureLoco,
} from '@engine/pathfinding/creature-loco';
import type { ModuleCreature } from '@engine/module/ModuleCreature';

describe('ActionPhysicalAttacks approach queue', () => {
  beforeEach(() => {
    queued.length = 0;
    (hasCombatLineOfSight as jest.Mock).mockReturnValue(true);
    (tryForceJumpApproach as jest.Mock).mockReturnValue(false);
  });

  function makeOwner(pos: THREE.Vector3){
    return {
      __creature: true,
      id: 1,
      position: pos,
      area: { id: 1 },
      pathFindIgnoreObjectId: 0,
      pathFindApproachPersonalSpace: 0,
      isRangedEquipped: () => false,
      isDead: () => false,
      resetExcitedDuration: () => {},
      force: 0,
      speed: 0,
      combatRound: undefined,
      actionQueue: {
        addFront: (a: unknown) => { queued.unshift(a); },
      },
      getAppearance: () => ({ hitradius: 0.25, creperspace: 0.4, perspace: 0.35 }),
    };
  }

  function makeTarget(pos: THREE.Vector3){
    return {
      __creature: true,
      id: 2,
      position: pos,
      area: { id: 1 },
      isDead: () => false,
      getAppearance: () => ({ hitradius: 0.25, creperspace: 0.4, perspace: 0.35 }),
    };
  }

  it('queues Move → Facing → CheckMove → PhysicalAttacks when too far', () => {
    const owner = makeOwner(new THREE.Vector3(0, 0, 0));
    const target = makeTarget(new THREE.Vector3(10, 0, 0));
    const action = new ActionPhysicalAttacks();
    (action as any).owner = owner;
    action.setParameter(1, ActionParameterType.DWORD, target as any);
    (action as any).target = target;

    const status = action.update(0);

    expect(status).toBe(ActionStatus.COMPLETE);
    expect(queued.length).toBe(4);
    expect((queued[0] as { type?: number }).type).toBe(ActionType.ActionMoveToPoint);
    expect((queued[1] as { type?: number }).type).toBe(ActionType.ActionChangeFacingObject);
    expect((queued[2] as { type?: number }).type).toBe(ActionType.ActionCheckMoveToObjectRadius);
    // requeued PhysicalAttacks has no type set on mock — check param copy
    expect((queued[3] as { parameters: unknown[] }).parameters[1]?.value).toBe(target);

    const check = queued[2] as { parameters: { value: unknown }[] };
    expect(check.parameters[0].value).toBe(2);
    expect(check.parameters[1].value).toBe(1);
    expect(check.parameters[2].value).toBe(2.0);
    expect(check.parameters[3].value).toBe(2.5);

    expect(owner.pathFindIgnoreObjectId).toBe(2);
    expect(owner.pathFindApproachPersonalSpace).toBeCloseTo(1.6, 5);

    const move = queued[0] as { parameters: { value: unknown }[] };
    expect(move.parameters[0].value).toBe(10);
    expect(move.parameters[4].value).toBe(2);
    expect(move.parameters[6].value).toBe(2.0);
  });

  it('front-queued MoveToPoint wakes a paused creature and carries plot dest params', () => {
    const owner = makeOwner(new THREE.Vector3(76.74, 83.28, 0));
    const target = makeTarget(new THREE.Vector3(80.324, 73.008, 0));
    const action = new ActionPhysicalAttacks();
    (action as any).owner = owner;
    action.setParameter(1, ActionParameterType.DWORD, target as any);
    (action as any).target = target;

    expect(action.update(0)).toBe(ActionStatus.COMPLETE);
    const move = queued[0] as {
      type?: number;
      parameters: { type: number; value: unknown }[];
    };
    expect(move.type).toBe(ActionType.ActionMoveToPoint);
    // Dest comes from getNearestActionPoint mock (10,0,0); live target id in param 4.
    expect(move.parameters[0].value).toBe(10);
    expect(move.parameters[1].value).toBe(0);
    expect(move.parameters[4].value).toBe(2);

    // Prior completed move leaves Paused; head MoveToPoint must wake PathWalk.
    const creature = {
      creatureLocoState: CreatureLocoState.Paused,
    } as unknown as ModuleCreature;
    expect(tryWakePausedCreatureLoco(creature, move.type)).toBe(true);
    expect(getCreatureLocoState(creature)).toBe(CreatureLocoState.PathWalk);
  });

  it('backoff queues only Move + PhysicalAttacks (no Check/Facing)', () => {
    // dist 0.5 → deep inside desired²−0.2
    const owner = makeOwner(new THREE.Vector3(0, 0, 0));
    const target = makeTarget(new THREE.Vector3(0.5, 0, 0));
    const action = new ActionPhysicalAttacks();
    (action as any).owner = owner;
    action.setParameter(1, ActionParameterType.DWORD, target as any);
    (action as any).target = target;

    const status = action.update(0);

    expect(status).toBe(ActionStatus.COMPLETE);
    expect(queued.length).toBe(2);
    expect((queued[0] as { type?: number }).type).toBe(ActionType.ActionMoveToPoint);
    const move = queued[0] as { parameters: { value: unknown }[] };
    expect(move.parameters[4].value).toBe(0x7f000000);
    expect(move.parameters[6].value).toBe(0);
  });

  it('queues approach when in range but no LOS', () => {
    (hasCombatLineOfSight as jest.Mock).mockReturnValue(false);
    const owner = makeOwner(new THREE.Vector3(0, 0, 0));
    const target = makeTarget(new THREE.Vector3(2.0, 0, 0)); // within max 2.5
    const action = new ActionPhysicalAttacks();
    (action as any).owner = owner;
    action.setParameter(1, ActionParameterType.DWORD, target as any);
    (action as any).target = target;

    const status = action.update(0);

    expect(status).toBe(ActionStatus.COMPLETE);
    expect(queued.length).toBe(4);
    expect((queued[0] as { type?: number }).type).toBe(ActionType.ActionMoveToPoint);
  });

  it('Force Jump success skips MoveTo and stamps feat into param 6', () => {
    (tryForceJumpApproach as jest.Mock).mockImplementation(
      (_a: unknown, _t: unknown, out: { featId: number }) => {
        out.featId = CombatFeatType.FORCE_JUMP_MASTERY;
        return true;
      }
    );
    const startCombatRound = jest.fn();
    const calculateAttackDamage = jest.fn();
    const pauseRound = jest.fn();
    const owner = makeOwner(new THREE.Vector3(0, 0, 0));
    (owner as any).combatRound = {
      action: { featId: 0 },
      roundPaused: false,
      roundStarted: true,
      startCombatRound,
      calculateAttackDamage,
      pauseRound,
      newAttackTarget: undefined,
      setAttackTarget: jest.fn(),
    };
    (owner as any).setFacing = jest.fn();
    (owner as any).playSoundSet = jest.fn();
    const target = makeTarget(new THREE.Vector3(15, 0, 0));
    const action = new ActionPhysicalAttacks();
    (action as any).owner = owner;
    action.setParameter(1, ActionParameterType.DWORD, target as any);
    action.setParameter(6, ActionParameterType.INT, 0);
    (action as any).target = target;

    const status = action.update(0);

    expect(queued.length).toBe(0);
    expect(action.getParameter<number>(6)).toBe(CombatFeatType.FORCE_JUMP_MASTERY);
    expect((owner as any).combatRound.action.featId).toBe(CombatFeatType.FORCE_JUMP_MASTERY);
    expect(startCombatRound).toHaveBeenCalled();
    expect(status).toBe(ActionStatus.COMPLETE);
  });
});
