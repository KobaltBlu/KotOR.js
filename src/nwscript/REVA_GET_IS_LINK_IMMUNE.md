# Reva: GetIsLinkImmune (ExecuteCommandGetIsLinkImmune)

## Overview

`ExecuteCommandGetIsLinkImmune` (0x005458d0) tests whether a creature is immune to a (possibly linked) effect. Returns 1 if immune, 0 otherwise. Reversed from CSWVirtualMachineCommands, CSWSCreatureStats::GetEffectLinkImmunity, and CSWSCreatureStats::GetEffectImmunity.

## NWScript Signature

```c
int GetIsLinkImmune(object oCreature, effect eEffect);
// Stack: pop object, pop effect
// Returns: 1 if target is immune to any effect in the link; 0 otherwise
```

## ExecuteCommandGetIsLinkImmune Logic

1. StackPopObject → object id
2. StackPopEngineStructure(0) → effect
3. GetGameObject(object_id)
4. If object has AsSWSCreature: iVar4 = CSWSCreatureStats::GetEffectLinkImmunity(creature->creature_stats, effect)
5. StackPushInteger(iVar4)
6. Return

## GetEffectLinkImmunity (0x005a6a90)

Recursive: if the effect is EffectLink, recurse on linked_effect_1 and linked_effect_2. For non-link effects, uses gameeffects 2DA to map effect type to immunity type columns; for each column with value != 0, calls GetEffectImmunity(creature_stats, column_index, null). If any returns 1, return 1. Skips EFFECT_TYPES that are link/invalid.

## GetEffectImmunity (0x005a6960)

GetEffectImmunity(creature_stats, immunityTypeIndex, versusCreature):
- Iterates creature's effects
- Looks for EffectImmunity (type 0x16)
- EffectImmunity intList[0]=immunity type, intList[1]=race filter, intList[2]=alignment filter
- Match: (intList[0] == immunityTypeIndex or intList[0] == IMMUNITY_ALL) and race/alignment filters
- Returns 1 if matching EffectImmunity found, 0 otherwise

## KotOR.js Mapping

- EffectLink: recurse on effect1 and effect2
- EffectVisualEffect: return 0 (not blocked by immunities per NWScript comment)
- Other effects: gameeffects 2DA maps effect type → immunity columns; check creature.getEffectImmunity(immunityType)
- ModuleCreature.getEffectImmunity(immunityType, versus?): iterate effects for EffectImmunity matching immunityType
- ModuleCreature.getEffectLinkImmunity(effect): recursive helper
