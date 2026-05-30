# CombatInfo save (observed original game behavior)

## Overview

Creature save serializes combat-related stats into a GFF struct `CombatInfo` (struct id 51946). The block is written during creature save from the live combat information record.

## Fields (observed mapping to GFF)

| Field | Type | Role |
|-------|------|------|
| NumAttacks | BYTE | Attack count |
| OnHandAttackMod / OnHandDamageMod | CHAR | Main-hand modifiers |
| OffHandAttackMod / OffHandDamageMod | CHAR | Off-hand modifiers |
| ForceResistance | BYTE | |
| ArcaneSpellFail | BYTE | |
| ArmorCheckPen | BYTE | |
| UnarmedDamDice / UnarmedDamDie | BYTE | |
| OnHandCritRng / OnHandCritMult | BYTE | |
| OffHandWeaponEq / OffHandCritRng / OffHandCritMult | BYTE | |
| LeftEquip / RightEquip | DWORD | Equipped item ids |
| LeftString / RightString | CExoString | |
| DamageDice / DamageDie | BYTE | |
| AttackList | LIST | Per-element modifier metadata |
| DamageList | LIST | Per-element modifier metadata |

## KotOR.js

- Attack/damage mods: from `getBaseAttackBonus()` and weapon bonuses where applicable
- Left/right equip: `equipment.LEFTHAND` / `RIGHTHAND` ids
- Lists: may be empty if not modeled on save
- Scalars: default to 0 when not computable
