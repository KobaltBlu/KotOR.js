# GetNearestEnemy (observed original game behavior)

## Overview

The original client finds the nearest hostile creature that the caller can perceive within a maximum range, excluding an optional object id, and optionally evaluating reputation from another context. It is used for combat targeting, rest interruption, AI, and similar systems.

## Parameters (observed)

- **maxRange**: Maximum distance to consider (for example attack range for combat, a fixed range for rest or “excited” checks).
- **excludeObjectId**: Object to skip, or the invalid object id to exclude no one.
- **reputationContextId**: When valid, hostility may be evaluated from that object’s perspective; otherwise from the caller’s perspective.

**Returns** the nearest qualifying enemy’s object id, or the invalid object id if none.

## Internal logic (observed)

1. Require a valid area; otherwise return no target.
2. Scan objects in the area; skip self and the excluded id.
3. **Hostility**: use faction / reputation so only hostile candidates remain (optionally from a context object).
4. **Creature only**: must be a creature object.
5. **Alive**: must not be in a dead state.
6. **Perception**: candidate must be visible in the caller’s perception list (perceived/seen as required by the engine).
7. **Distance**: track the nearest by adjusted range (for example accounting for personal space).
8. **Line of sight**: require a clear line from caller to candidate when the engine’s rules demand it.

## KotOR.js

- Hostility: `this.isHostile(candidate)` (faction / `GetReputation`).
- Perception: `hasLineOfSight` / perception list with `PerceptionMask.SEEN` as appropriate.
- Area objects: `GameState.module?.area?.creatures` (or equivalent).
- Optional personal-space padding vs. raw distance.
- Line of sight: `this.hasLineOfSight(candidate)` where applicable.
