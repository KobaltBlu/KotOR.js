# Reva: SurrenderByFaction & ChangeFactionByFaction

## Overview

Both commands are implemented by `CSWVirtualMachineCommands::ExecuteCommandChangeByFaction` (0x00546340). The `routine` parameter selects behavior: `SurrenderByFaction` vs `ChangeFactionByFaction`.

## Signature

```c
ExecuteCommandChangeByFaction(this, ScriptFunctions routine, int paramCount);
// Args (stack): nFactionFrom (int), nFactionTo (int)
// Stack pop order: local_4 = nFactionTo (popped first), local_8 = nFactionFrom (popped second)
// NWScript order: SurrenderByFaction(nFactionFrom, nFactionTo) - so args[0]=From, args[1]=To
```

## Logic (Reva)

1. Pop nFactionTo, nFactionFrom from stack.
2. Get area from caller object (script runs in context of caller).
3. Get FactionManager, GetFaction(nFactionTo) → target faction.
4. Iterate area objects via GetFirstObjectInArea/GetNextObjectInArea.
5. For each creature where `creature_stats->faction_id == nFactionFrom`:
   - `CSWSFaction::AddMember(targetFaction, creatureId, 0)` — move to new faction.
   - If `routine == SurrenderByFaction`:
     - `CSWSCreature::SetCombatState(creature, 0, 1)` — disable combat.
     - `CSWSObject::ClearAllActions(creature, 1)` — clear action queue.
     - `CSWSCreature::PacifyCreature(creature)` — pacify creatures targeting this one.
   - Else (ChangeFactionByFaction):
     - `CSWSCreature::ClearVisibleList(creature)`
     - `CSWSCreature::UpdateVisibleList(creature, 0)`

## PacifyCreature (0x004fd960)

Iterates area creatures; for each that has `this` as combat target (lastAttackTarget, lastAttacker, etc.):
- `SetCombatState(other, 0, 1)`
- If other's lastHostileActor == this: `SetLastHostileActor(other, OBJECT_INVALID, 1)`
- `ClearHostileActionsVersus(other, this)`

## KotOR.js Mapping

- Area: `this.caller?.area` or `GameState.module?.area`
- Faction change: `FactionManager.RemoveCreatureFromFaction`, set `creature.faction`/`factionId`, `targetFaction.addMember(creature)`
- Clear actions: `creature.actionQueue.clear()`, `creature.combatRound.clearActions()`
- Combat off: `creature.combatData.combatState = false`, `creature.clearTarget()`
- Pacify: iterate area.creatures, for each with lastAttackTarget/lastAttacker/etc === creature, clear their combat/target
