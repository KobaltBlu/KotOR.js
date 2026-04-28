# Item cast spell (combat round) (observed original game behavior)

## Overview

When an item cast spell action is scheduled in the combat round, the original engine queues a combat-round processor (`ActionCombat`) to run the round. `AddSWItemSpellAction` fills the round action with the item id, active property index, target position, target object, and related combat parameters.

## Parameters (observed)

- Item object id
- Active property index and related item fields for the property being used
- Target position (for example movement or aim point)
- Target object id
- Projectile path and attack-feat / spell execution parameters as used by the round builder

The round action type corresponds to item cast spell; the round runner then dispatches to the correct action implementation (including attack, cast spell, item cast spell) as the round advances.

## KotOR.js

`ActionCombat.update()` processes `CombatRoundAction` and creates the corresponding `Action` (`ActionPhysicalAttacks`, `ActionCastSpell`, `ActionItemCastSpell`, etc.). For item cast spell, build `ActionItemCastSpell` with parameters aligned with `ModuleItem.useItemOnObject`: target, area, position, spell id, caster level, delay, projectile path, and item.
