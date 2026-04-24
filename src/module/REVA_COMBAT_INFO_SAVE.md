# Reva: CombatInfo Save (CCombatInformation::SaveData)

## Overview

`CCombatInformation::SaveData` (0x00550f30) serializes combat information to a GFF struct "CombatInfo" (StructID 0xcaaa / 51946). Called from CSWSCreatureStats::SaveStats during creature save.

## Fields Written (Reva)

| Field | Type | Source |
|-------|------|--------|
| NumAttacks | BYTE | combat_info->num_attacks |
| OnHandAttackMod | CHAR | combat_info->on_hand_attack_mod |
| OnHandDamageMod | CHAR | combat_info->on_hand_damage_mod |
| OffHandAttackMod | CHAR | combat_info->off_hand_attack_mod |
| OffHandDamageMod | CHAR | combat_info->off_hand_damage_mod |
| ForceResistance | BYTE | combat_info->force_resistance |
| ArcaneSpellFail | BYTE | combat_info->arcane_spell_fail |
| ArmorCheckPen | BYTE | combat_info->armor_check_pen |
| UnarmedDamDice | BYTE | combat_info->unarmed_dam_dice |
| UnarmedDamDie | BYTE | combat_info->unarmed_dam_die |
| OnHandCritRng | BYTE | combat_info->on_hand_crit_range |
| OnHandCritMult | BYTE | combat_info->on_hand_crit_mult |
| OffHandWeaponEq | BYTE | combat_info->off_hand_weapon_eq |
| OffHandCritRng | BYTE | combat_info->off_hand_crit_range |
| OffHandCritMult | BYTE | combat_info->off_hand_crit_mult |
| LeftEquip | DWORD | combat_info->left_equip |
| RightEquip | DWORD | combat_info->right_equip |
| LeftString | CExoString | combat_info->left_string |
| RightString | CExoString | combat_info->right_string |
| DamageDice | BYTE | combat_info->damage_dice |
| DamageDie | BYTE | combat_info->damage_die |
| AttackList | LIST | combat_info->attack_list (Modifier, WeaponWield, VersusGoodEvil, VersusRace per elem) |
| DamageList | LIST | combat_info->damage_list (Modifier, ModifierType, WeaponWield, VersusGoodEvil, VersusRace per elem) |

## KotOR.js Mapping

- attack/damage mods: from getBaseAttackBonus() + weapon bonuses
- LeftEquip/RightEquip: equipment.LEFTHAND?.id, equipment.RIGHTHAND?.id
- AttackList/DamageList: empty if no equivalent (KotOR.js may compute on load)
- scalar defaults: 0 where not computable
