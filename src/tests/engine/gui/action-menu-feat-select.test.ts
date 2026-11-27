/**
 * Target slot-0 combat feat selection / activation (ActionMenu).
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockAttackCreature = jest.fn();
const mockClearAllActions = jest.fn();

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    GameKey: 0,
    ActionMenuManager: {
      ActionMenuItem: class ActionMenuItem {
        action: any;
        talent: any;
        target: any;
        icon: string;
        name: string;
        enabled: boolean;
        constructor(props: any = {}){
          Object.assign(this, {
            action: undefined,
            talent: undefined,
            target: undefined,
            icon: '',
            name: '',
            enabled: true,
          }, props);
        }
      },
      ActionMenuPanel: class ActionMenuPanel {
        selectedIndex = 0;
        actions: any[] = [];
        clearActions(){ this.actions = []; }
        reset(){ this.selectedIndex = 0; }
        addAction(a: any){ this.actions.push(a); }
        getSelectedAction(){
          if(!this.actions.length) return undefined;
          if(this.selectedIndex >= this.actions.length) this.selectedIndex = this.actions.length - 1;
          if(this.selectedIndex < 0) this.selectedIndex = 0;
          return this.actions[this.selectedIndex];
        }
      },
    },
    ActionFactory: {},
    Module: { Area: {} },
    TLKManager: { GetStringById: () => undefined },
  },
}));

jest.mock('@engine/menu/action-menu-usable', () => ({
  UsableItemMask: { MEDICAL: 1, OTHER: 2, MINES: 4 },
  getMineStrengthLevel: () => 0,
  getUsableItemMenuName: () => '',
  isDoorOrPlaceableMineItem: () => false,
  isGrenadeHostileItem: () => false,
  isLeaderUsableItem: () => false,
  isPlaceableTargetUseItem: () => false,
  isSecuritySpikeItem: () => false,
  isUsableItemActive: () => false,
}));

jest.mock('@engine/combat/spell-cast-gates', () => ({
  shouldShowCounterSpellAction: () => false,
}));

jest.mock('@engine/talents/TalentFeat', () => {
  class TalentFeat {
    id: number;
    constructor(id: number){ this.id = id; }
  }
  return { TalentFeat };
});

jest.mock('@engine/talents/TalentSpell', () => {
  class TalentSpell {}
  return { TalentSpell };
});

jest.mock('@engine/talents/TalentObject', () => {
  class TalentObject {}
  return { TalentObject };
});

import { ActionMenuManager } from '@engine/menu/ActionMenuManager';
import { ActionType } from '@core/enums/actions/ActionType';
import { TalentFeat } from '@engine/talents/TalentFeat';

// Folded helpers — stub after import so UpdateMenuActions stays focused.
(ActionMenuManager as any).getCombatMenuFeatIds = () => [28];
(ActionMenuManager as any).buildForceMenuSpellList = () => [];
(ActionMenuManager as any).buildEquipmentForceMenuSpellList = () => [];
(ActionMenuManager as any).getHostileTargetExclusionFlags = () => 0;
(ActionMenuManager as any).isDroidForceMenuCaster = () => false;
(ActionMenuManager as any).isForceMenuSpellEnabled = () => true;
import { GameState } from '@engine/runtime/GameState';

function seedCombatSlot0(enemy: any){
  const panel = ActionMenuManager.ActionPanels.targetPanels[0];
  panel.clearActions();
  panel.addAction(new GameState.ActionMenuManager.ActionMenuItem({
    talent: new TalentFeat(28),
    target: enemy,
    icon: 'ipowerattack',
    name: 'Power Attack',
  }));
  panel.addAction(new GameState.ActionMenuManager.ActionMenuItem({
    action: { type: ActionType.ActionPhysicalAttacks, object: enemy, talent: undefined },
    icon: 'i_attack',
    name: 'Attack',
  }));
  return panel;
}

describe('ActionMenuManager combat feat selection', () => {
  let pc: any;
  let enemy: any;

  beforeEach(() => {
    mockAttackCreature.mockReset();
    mockClearAllActions.mockReset();
    ActionMenuManager.InitActionMenuPanels();
    // Ensure the next SetTarget counts as a target change.
    (ActionMenuManager as any).oTarget = undefined;

    enemy = { id: 2 };
    pc = {
      combatData: { combatState: true },
      playerAttackCreature: mockAttackCreature,
      clearAllActions: mockClearAllActions,
    };

    ActionMenuManager.SetPC(pc);
  });

  it('defaults slot 0 to Attack when the selected target changes', () => {
    ActionMenuManager.SetTarget(enemy);
    const panel = seedCombatSlot0(enemy);
    ActionMenuManager.applyDefaultAttackSelectionIfNeeded();

    const selected = panel.getSelectedAction();
    expect(selected?.action?.type).toBe(ActionType.ActionPhysicalAttacks);
  });

  it('keeps Power Attack selected across rebuilds for the same target', () => {
    ActionMenuManager.SetTarget(enemy);
    const panel = seedCombatSlot0(enemy);
    ActionMenuManager.applyDefaultAttackSelectionIfNeeded();

    panel.selectedIndex = 0; // Power Attack
    expect(panel.getSelectedAction()?.talent).toBeInstanceOf(TalentFeat);

    // Same target → do not force Attack; rebuild only clears/re-adds actions
    ActionMenuManager.SetTarget(enemy);
    seedCombatSlot0(enemy);
    ActionMenuManager.applyDefaultAttackSelectionIfNeeded();

    expect(panel.selectedIndex).toBe(0);
    expect(panel.getSelectedAction()?.talent).toBeInstanceOf(TalentFeat);
  });

  it('queues playerAttackCreature with the selected feat talent', () => {
    ActionMenuManager.SetTarget(enemy);
    const panel = seedCombatSlot0(enemy);
    panel.selectedIndex = 0;

    ActionMenuManager.onTargetMenuAction(0);
    expect(mockAttackCreature).toHaveBeenCalledTimes(1);
    const [target, feat] = mockAttackCreature.mock.calls[0];
    expect(target).toBe(enemy);
    expect(feat).toBeInstanceOf(TalentFeat);
    expect((feat as TalentFeat).id).toBe(28);
  });

  it('queues a basic attack when Attack is selected', () => {
    ActionMenuManager.SetTarget(enemy);
    const panel = seedCombatSlot0(enemy);
    panel.selectedIndex = 1;

    ActionMenuManager.onTargetMenuAction(0);
    expect(mockAttackCreature).toHaveBeenCalledWith(enemy, undefined);
  });
});
