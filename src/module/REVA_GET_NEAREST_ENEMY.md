# Reva: CSWSCreature::GetNearestEnemy

## Overview

`CSWSCreature::GetNearestEnemy` (0x004f2de0) returns the object ID of the nearest hostile creature that this creature can perceive, within a given range. Used for combat target selection, rest interruption, and AI behavior.

## Signature

```c
ulong CSWSCreature::GetNearestEnemy(
  CSWSCreature *this,
  float maxRange,
  ulong excludeObjectId,
  ulong reputationContextId
);
```

- **maxRange**: Maximum distance to consider (e.g. 30.0 for Rest/SetExcitedState, MaxAttackRange for combat).
- **excludeObjectId**: Object to exclude from consideration (0x7f000000 = OBJECT_INVALID to exclude none).
- **reputationContextId**: When not OBJECT_INVALID, hostility is evaluated from that creature's perspective via `GetAIStateReputation(&candidate->object, reputationContextId)`; otherwise from this creature's perspective.
- **Returns**: Object ID of nearest valid enemy, or 0x7f000000 (OBJECT_INVALID) if none.

## Internal Logic

1. Get area; return OBJECT_INVALID if no area.
2. Iterate over `area->game_objects`.
3. For each object:
   - Skip self (`id == this->object.game_object.id`).
   - Skip `excludeObjectId` if specified.
   - **Hostility**: `GetAIStateReputation` returns 2 (hostile). If `reputationContextId != OBJECT_INVALID`, use candidate's reputation toward that context; else use this creature's reputation toward candidate.
   - Must be `CSWSCreature` (AsSWSCreature non-null).
   - Must not be dead (vtable field37_0x94 returns 0, `GetDeadTemp` returns 0).
   - **Perception**: `GetVisibleListElement(this, candidate->id)` must exist and have flag `(*(byte*)(element+1) & 1) != 0` (visible/perceived).
   - **Distance**: `distance - this.personal_space - candidate.personal_space < current_best_range`.
   - **Line of sight**: `CSWSArea::ClearLineOfSight` from this to candidate must pass.
4. Track nearest by adjusted distance; return that object ID or OBJECT_INVALID.

## Call Sites (Reva)

- **AIActionPhysicalAttacks** (0x005bc0a1): `GetNearestEnemy(this, MaxAttackRange(...), excludeId, repContext)` for AI combat.
- **CreateNewAttackActions** (0x005b6b1f, 0x005b6b49): Same for attack action creation.
- **Rest** (0x004fd278): `GetNearestEnemy(this, 30.0, OBJECT_INVALID, OBJECT_INVALID)` — abort rest if nearby enemy.
- **SetExcitedState** (0x004f364f): `GetNearestEnemy(this, 30.0, OBJECT_INVALID, OBJECT_INVALID)` — set excited if enemy in range.
- **OnApplyDamage** (0x004dfe10): Side-effect call (result unused).

## KotOR.js Mapping

- **Hostility**: `this.isHostile(candidate)` (FactionManager/GetReputation).
- **Perception**: `this.hasLineOfSight(candidate)` or `perceptionList` with `PerceptionMask.SEEN`.
- **Area objects**: `GameState.module?.area?.creatures`.
- **Personal space**: Optional; can use raw distance for simplicity.
- **ClearLineOfSight**: `this.hasLineOfSight(candidate)` covers visibility.
