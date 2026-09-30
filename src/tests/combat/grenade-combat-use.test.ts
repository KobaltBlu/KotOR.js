/**
 * Grenade schedule enables client combat mode; hand-hold release starts flight.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as THREE from 'three';

jest.mock('@/utility/polyfills', () => ({}));

jest.mock('@/engine/OdysseyRenderPipeline', () => ({
  OdysseyRenderPipeline: {},
}));

jest.mock('@/engine/FollowerCamera', () => ({
  FollowerCamera: {
    setCombatCameraActive: jest.fn(),
  },
}));

jest.mock('@/GameState', () => ({
  GameState: {
    PartyManager: {
      getCurrentPlayer: jest.fn(() => undefined),
    },
    ModuleObjectManager: { GetObjectById: () => undefined },
    TwoDAManager: { datatables: new Map() },
    FeedbackMessageManager: { AddMessage: jest.fn() },
    TLKManager: { GetStringById: () => ({ Value: '' }) },
    GameKey: 0,
    AutoPauseManager: { SignalAutoPauseEvent: jest.fn() },
    ActionFactory: {
      ActionCombat: class ActionCombat {
        type = 0x3f;
        constructor(_id?: number) {}
      },
    },
  },
}));

jest.mock('@/odyssey', () => ({
  OdysseyModelAnimation: { GetAnimation2DA: () => undefined },
}));

jest.mock('@/effects', () => ({ EffectDamage: class {} }));
jest.mock('@/effects/effect-bonuses', () => ({
  getAttackEffectBonus: () => 0,
  getDamageIncreaseBonusesByChannel: () => [],
}));
jest.mock('@/engine/TextSprite3D', () => ({
  TextSprite3D: { CreateOnObject: jest.fn() },
}));
jest.mock('@/combat/combat-projectile', () => ({
  getProjectileImpactPosition: () => ({ x: 0, y: 0, z: 0, clone: () => ({ x: 0, y: 0, z: 0 }) }),
  spawnCombatProjectile: jest.fn(),
  castAmmunitionProjectile: jest.fn(),
}));
jest.mock('@/engine/pathfinding/visual-los', () => ({ hasVisualLos: () => true }));
jest.mock('@/combat/ranged-impact-vfx', () => ({
  signalRangedImpactVfx: jest.fn(),
  spawnWorldImpactVfx: jest.fn(),
}));
jest.mock('@/combat/attack-summary-feedback', () => ({
  formatAttackSummaryFeedback: () => ({ message: '', color: 0 }),
  AttackSummaryStrRef: {},
}));
jest.mock('@/combat/duel-debug', () => ({ duelLog: () => {}, duelWho: () => '' }));
jest.mock('@/combat/combat-round-pause', () => ({
  shouldEndRoundOnPauseExpiry: () => false,
  shouldSnapCombatReady: () => false,
}));
jest.mock('@/combat/damage-mitigation', () => ({
  damageFlagsFromChannels: () => 0,
  mitigateDamageAmount: (n: number) => n,
  scaleDamageChannels: (c: unknown) => c,
}));
jest.mock('@/combat/queue-attack-actions', () => ({
  queueAttackActions: jest.fn(() => false),
}));
jest.mock('@/loaders', () => ({
  MDLLoader: { loader: { load: async () => undefined } },
  ResourceLoader: { loadCachedResource: () => undefined },
}));
jest.mock('@/three/odyssey', () => ({
  OdysseyModel3D: { FromMDL: async () => undefined },
}));
jest.mock('@/module/ModuleObject', () => ({
  ModuleObject: class ModuleObject {
    id = 0;
    position = { x: 0, y: 0, z: 0, distanceToSquared: () => 0, copy: () => {} };
  },
}));
jest.mock('@/nwscript/NWScript', () => ({ NWScript: class {} }));
jest.mock('@/nwscript/NWScriptDefK1', () => ({ NWScriptDefK1: {} }));
jest.mock('@/nwscript/NWScriptDefK2', () => ({ NWScriptDefK2: {} }));
jest.mock('@/engine/SaveGame', () => ({ SaveGame: class {} }));
jest.mock('@/managers/GameOverManager', () => ({ GameOverManager: {} }));
jest.mock('@/KotOR', () => ({ KotOR: {} }));

import { CombatRound } from '@/combat/CombatRound';
import { CombatRoundAction } from '@/combat/CombatRoundAction';
import { CombatActionType } from '@/enums/combat/CombatActionType';
import { ActionType } from '@/enums/actions/ActionType';
import { ModuleObjectType } from '@/enums/module/ModuleObjectType';
import { GameState } from '@/GameState';
import { FollowerCamera } from '@/engine/FollowerCamera';
import { setClientCombatMode } from '@/combat/combat-engagement';
import { isGrenadeItemType } from '@/combat/item-cast-grenade';
import { SpellCastInstance } from '@/combat/SpellCastInstance';
import { TalentSpell } from '@/talents/TalentSpell';

/**
 * Mirrors ModuleItem.scheduleItemCastSpell grenade / clear / ensure branches
 * without importing the full ModuleItem graph.
 */
function scheduleGrenadeLike(opts: {
  caster: any;
  target: any;
  itemType: number;
  icon?: string;
}){
  const { caster, target, itemType } = opts;
  if(!caster?.combatRound) return;
  const hadPending = caster.combatRound.getActionPending();
  const combatAction = new CombatRoundAction();
  combatAction.actionType = CombatActionType.ITEM_CAST_SPELL;
  combatAction.target = target;
  combatAction.iconResRef = opts.icon || 'i_grenade01';
  caster.combatRound.addAction(combatAction);

  if(isGrenadeItemType(itemType)){
    setClientCombatMode(caster, true);
  }
  if(hadPending && caster === GameState.PartyManager.getCurrentPlayer?.()){
    caster.clearAllActions(true);
  }
  if(!caster.actionQueue.actionTypeExists(ActionType.ActionCombat)){
    caster.actionQueue.add(new GameState.ActionFactory.ActionCombat(0xFFFF));
  }
}

function makeCaster(id: number){
  const actionQueue: any[] = [];
  (actionQueue as any).actionTypeExists = (type: ActionType) =>
    actionQueue.some((a) => a?.type === type);
  (actionQueue as any).add = (action: any) => { actionQueue.push(action); };

  const creature: any = {
    id,
    objectType: ModuleObjectType.ModuleCreature,
    clientCombatMode: false,
    position: new THREE.Vector3(0, 0, 0),
    combatData: {},
    combatRound: undefined as CombatRound | undefined,
    actionQueue,
    clearAllActions: jest.fn(function(this: any){
      this.actionQueue.length = 0;
    }),
    isDead: () => false,
    onCombatRoundEnd: jest.fn(),
    bodyFuel: false,
  };
  creature.combatRound = new CombatRound(creature);
  return creature;
}

describe('grenade schedule → client combat mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (GameState.PartyManager.getCurrentPlayer as jest.Mock).mockReturnValue(undefined);
  });

  it('setClientCombatMode(true) when scheduling a grenade throw', () => {
    const caster = makeCaster(100);
    (GameState.PartyManager.getCurrentPlayer as jest.Mock).mockReturnValue(caster);
    const foe = makeCaster(200);

    scheduleGrenadeLike({ caster, target: foe, itemType: 6 });

    expect(caster.clientCombatMode).toBe(true);
    expect(FollowerCamera.setCombatCameraActive).toHaveBeenCalledWith(true);
    expect(caster.combatRound.scheduledActionList.length).toBe(1);
    expect(caster.combatRound.scheduledActionList[0].actionType)
      .toBe(CombatActionType.ITEM_CAST_SPELL);
    expect(caster.actionQueue.actionTypeExists(ActionType.ActionCombat)).toBe(true);
  });

  it('does not force combat mode for non-grenade item casts', () => {
    const caster = makeCaster(102);
    (GameState.PartyManager.getCurrentPlayer as jest.Mock).mockReturnValue(caster);
    scheduleGrenadeLike({ caster, target: caster, itemType: 0x2d });
    expect(caster.clientCombatMode).toBe(false);
    expect(FollowerCamera.setCombatCameraActive).not.toHaveBeenCalled();
  });

  it('uses clearAllActions(true) when the player already has a pending schedule', () => {
    const caster = makeCaster(101);
    (GameState.PartyManager.getCurrentPlayer as jest.Mock).mockReturnValue(caster);
    const foe = makeCaster(201);
    caster.combatRound.scheduledActionList.push({
      actionTimer: 0,
      actionType: CombatActionType.ATTACK,
    } as any);
    caster.combatRound.timer = 0;
    caster.actionQueue.add({ type: ActionType.ActionMoveToPoint });

    scheduleGrenadeLike({ caster, target: foe, itemType: 6 });

    expect(caster.clearAllActions).toHaveBeenCalledWith(true);
  });
});

describe('SpellCastInstance hand-hold release', () => {
  it('keeps mesh on hand until releaseFromHandHold then starts flight', () => {
    const owner: any = {
      position: new THREE.Vector3(0, 0, 0),
      model: {
        handconjure: {
          getWorldPosition: (out: THREE.Vector3) => {
            out.set(1, 2, 3);
            return out;
          },
        },
      },
      context: { group: { effects: { add: jest.fn() } } },
      spellTargetPosition: new THREE.Vector3(),
      combatData: {},
    };
    const spell = new TalentSpell(91);
    const instance = new SpellCastInstance(owner, undefined as any, spell);
    instance.targetLocation.set(10, 0, 0);
    instance.projectileTarget.set(10, 0, 0);
    instance.holdOnHand = true;
    instance.projectile = {
      position: new THREE.Vector3(),
      update: jest.fn(),
      dispose: jest.fn(),
      lookAt: jest.fn(),
      quaternion: { copy: jest.fn(), setFromUnitVectors: jest.fn() },
      up: new THREE.Vector3(0, 0, 1),
    } as any;
    instance.projectileHook = owner.model.handconjure;
    instance.projectileOrigin = new THREE.Vector3();
    instance.projectileCurve = {
      v0: new THREE.Vector3(),
      v2: new THREE.Vector3(10, 0, 0),
    } as any;

    instance.update(0.016);
    expect(instance.holdOnHand).toBe(true);
    expect(instance.projectile.position.x).toBe(1);
    expect(instance.projectileDistance).toBeUndefined();

    instance.releaseFromHandHold(2500);
    expect(instance.holdOnHand).toBe(false);
    expect(instance.impactAtProjectileLanding).toBe(true);
    expect(instance.castTime).toBe(2500);
    expect(instance.projectileOrigin.x).toBe(1);

    instance.update(0.016);
    expect(instance.projectileDistance).toBeDefined();
    expect(instance.impacted).toBe(false);
  });
});
