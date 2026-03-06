jest.mock('../GameState', () => ({
  GameState: {
    ActionFactory: {
      ActionPhysicalAttacks: class {
        isUserAction = false;
        setParameter() {}
      },
      ActionCastSpell: class {
        isUserAction = false;
        setParameter() {}
      },
      ActionEquipItem: class {
        isUserAction = false;
        setParameter() {}
      },
      ActionUnequipItem: class {
        isUserAction = false;
        setParameter() {}
      },
    },
  },
}));

jest.mock('./Action', () => ({
  Action: class {
    owner: any;
    type: any;
    constructor() {}
  },
}));

import { ActionCombat } from './ActionCombat';
import { CombatActionType } from '../enums/combat/CombatActionType';
import { ModuleObjectType } from '../enums/module/ModuleObjectType';

function buildOwner(combatAction: any) {
  const queued: any[] = [];
  const owner: any = {
    objectType: ModuleObjectType.ModuleCreature,
    combatRound: {
      roundPaused: false,
      scheduledActionList: [combatAction],
    },
    actionQueue: {
      unshift(action: any) {
        queued.unshift(action);
      },
    },
  };
  return { owner, queued };
}

describe('ActionCombat user-action propagation', () => {
  it('propagates isUserAction for CAST_SPELL', () => {
    const combatAction: any = {
      actionType: CombatActionType.CAST_SPELL,
      isUserAction: true,
      spellClassIndex: 0,
      domainLevel: 0,
      projectilePath: 0,
      target: { id: 123, position: { x: 1, y: 2, z: 3 } },
    };
    const { owner, queued } = buildOwner(combatAction);
    const action = new ActionCombat();
    action.owner = owner;

    action.update(0);

    expect(queued).toHaveLength(1);
    expect(queued[0].isUserAction).toBe(true);
  });

  it('propagates isUserAction for ITEM_EQUIP', () => {
    const combatAction: any = {
      actionType: CombatActionType.ITEM_EQUIP,
      isUserAction: true,
      item: { id: 10 },
      equipInstant: false,
    };
    const { owner, queued } = buildOwner(combatAction);
    const action = new ActionCombat();
    action.owner = owner;

    action.update(0);

    expect(queued).toHaveLength(1);
    expect(queued[0].isUserAction).toBe(true);
  });

  it('propagates isUserAction for ITEM_UNEQUIP', () => {
    const combatAction: any = {
      actionType: CombatActionType.ITEM_UNEQUIP,
      isUserAction: true,
      item: { id: 10 },
      equipInstant: false,
    };
    const { owner, queued } = buildOwner(combatAction);
    const action = new ActionCombat();
    action.owner = owner;

    action.update(0);

    expect(queued).toHaveLength(1);
    expect(queued[0].isUserAction).toBe(true);
  });
});
