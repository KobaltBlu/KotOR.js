# Reva: Item Cast Spell (Combat Round)

## Overview

When an item cast spell action is scheduled in the combat round, the original engine queues an ActionItemCastSpell (action type 0x3f / 63 = ActionCombat) to execute it. The combat round's AddSWItemSpellAction populates the round action with item id, active property index, target position, and target object.

## Reva Reference: AddSWItemSpellAction

**Binary:** k1_win_gog_swkotor.exe  
**Address:** 0x004d3a90  
**Signature:** `void CSWSCombatRound::AddSWItemSpellAction(CSWSCombatRound *this, ulong param_1, int param_2, int param_3, Vector param_4, ulong param_5, int param_6, int param_7)`

### Parameters

- **param_1** – Item object id (field27_0x64)
- **param_2** – Active property index (field28_0x68)
- **param_3** – (field29_0x6c)
- **param_4** – Target position (move_to_position)
- **param_5** – Target object id (field19_0x44)
- **param_6** – Projectile path (passed as param_7 to AddSWItemSpellAction)
- **param_7** – (attack_feat_, passed as param_6)

### Round Action

- `action_type = 10` (ITEM_CAST_SPELL)
- Round action is added via AddAction for combat execution

## Reva Reference: AddItemCastSpellActions

**Address:** 0x004f8c70

When param_9 == 0 (combat mode), calls AddSWItemSpellAction then adds Action 0x3f (ActionCombat) to execute the round. The ActionCombat processes scheduled actions and dispatches to the appropriate action type (Attack, CastSpell, ItemCastSpell, etc.).

## KotOR.js Mapping

ActionCombat.update() processes CombatRoundAction and creates the corresponding Action (ActionPhysicalAttacks, ActionCastSpell, ActionItemCastSpell, etc.). For ITEM_CAST_SPELL, create ActionItemCastSpell with params matching ModuleItem.useItemOnObject: target, area, position, spell id, caster level, delay, projectile path, item.
