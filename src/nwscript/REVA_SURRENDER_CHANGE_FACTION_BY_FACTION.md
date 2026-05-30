# SurrenderByFaction and ChangeFactionByFaction (observed original game behavior)

## Overview

Both script commands are handled by a shared `ExecuteCommandChangeByFaction` path. A `routine` discriminator chooses surrender behavior (stand down, clear actions, pacify) versus a straight faction change with visibility list refresh.

## Arguments (observed)

Stack / argument order matches the NWScript surface: `nFactionFrom`, `nFactionTo` (see command signature in `nwscript` definitions).

## Logic (observed)

1. Read target and source faction ids; resolve the area and faction manager.
2. Enumerate objects in the area; for each creature in `nFactionFrom`, add it to `nFactionTo`.
3. **Surrender**: end combat for that creature, clear its action queue, and pacify other creatures that were targeting it.
4. **Change only**: clear and rebuild the creature’s visible list for faction changes without the full surrender side effects.

**Pacify** (observed): for other creatures in the area that had this creature as a combat target, clear combat state and hostile focus toward it where the engine’s rules require.

## KotOR.js

- Area: `this.caller?.area` or `GameState.module?.area`
- Faction: `FactionManager` / `RemoveCreatureFromFaction`, set `faction` / `factionId`, add to target faction
- Clear actions: `creature.actionQueue.clear()`, `creature.combatRound.clearActions()`
- Combat off: `creature.combatData.combatState = false`, `creature.clearTarget()`
- Pacify: scan area creatures and clear targets that pointed at the moved creature
