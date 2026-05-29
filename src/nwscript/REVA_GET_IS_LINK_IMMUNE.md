# GetIsLinkImmune (observed original game behavior)

## Overview

`GetIsLinkImmune` returns whether a creature is immune to a (possibly linked) effect—any link in the chain that is blocked by an immunity causes a true result.

## NWScript

`int GetIsLinkImmune(object oCreature, effect eEffect);`

## Evaluation (observed)

1. Resolve the creature and the effect.
2. For a linked effect, recurse on sub-effects; for a simple effect, use the `gameeffects` 2DA to map effect type to immunity columns and test `GetEffectImmunity` for each applicable column.
3. Return 1 if any path reports immunity, else 0.

## GetEffectImmunity (observed)

- Walk the creature’s active effects.
- Find `EffectImmunity`-style effects with the right immunity type and optional race/alignment filters.
- Return 1 when a matching immunity effect is found.

## KotOR.js

- Recurse on `EffectLink` children; treat `EffectVisualEffect` as not blocked by this check where NWScript rules say so.
- Use `gameeffects` 2DA to map effect type to immunity types; call `getEffectImmunity` on the creature.
- `ModuleCreature.getEffectLinkImmunity(effect)` implements the recursive behavior.
