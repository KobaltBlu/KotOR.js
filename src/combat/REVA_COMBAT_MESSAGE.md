# Reva: Combat Message / Combat Menu Log

## Overview

The original KotOR/TSL engine displays combat feedback (hit, miss, critical) in the in-game overlay's combat message label. The flow is: party member data stores a TLK string ID, and when that member is the player, the GUI is updated.

## Reva Reference: CSWPartyMemberData::SetCombatMessage

**Binary:** k1_win_gog_swkotor.exe  
**Address:** 0x006345e0  
**Signature:** `void __thiscall CSWPartyMemberData::SetCombatMessage(CSWPartyMemberData *this, ulong param_1)`

### Decompiled Logic

```c
this->field29_0x84 = param_1;  // Store TLK string ID
uVar1 = CClientExoApp::GetPlayerCreatureId(AppManager->client);
if (this->client_object_id == uVar1) {
  uVar1 = this->field29_0x84;
  this_00 = CClientExoApp::GetInGameGui(AppManager->client);
  CGuiInGame::SetCombatMessage(this_00, uVar1);
}
return;
```

Only the player's creature updates the combat message GUI.

## Reva Reference: CGuiInGame::SetCombatMessage

**Address:** 0x0062b110  
**Signature:** `void __thiscall CGuiInGame::SetCombatMessage(CGuiInGame *this, ulong param_1)`

Forwards to main interface:

```c
if (this->main_interface != (CSWGuiMainInterface *)0x0) {
  CSWGuiMainInterface::SetCombatMessage(this->main_interface, param_1);
}
return;
```

## Reva Reference: CSWGuiMainInterface::SetCombatMessage

**Address:** 0x00687700  
**Signature:** `void __thiscall CSWGuiMainInterface::SetCombatMessage(CSWGuiMainInterface *this, ulong param_1)`

- Sets `combat_mode_message_label` text from TLK string ID
- Uses color logic for certain IDs: 0xbaf3 (purple), 0xa5ec/0xa5ed/0xa5ee (green)
- 0xbc50 (48208) used as clear/default
- Skips update when auto-paused for some message types

## Callers of SetCombatMessage

- **AIActionPhysicalAttacks** – sets message 0xbc50 or attack-related ID
- **AIActionCastSpell** / **AIActionItemCastSpell** – 0xbc50 (casting)
- **AddCastSpellActions** – 0xa5ed (42477, casting spell – green)
- **AddItemCastSpellActions** – casting message
- **UpdateCombatMode** – reads `party_member_datas[i].field29_0x84`, passes to GUI when not 0xbc50
- **SetLeader** – updates combat message on leader change
- **WalkUpdateLocationDistance** – walk/combat feedback
- **UpdatePortraits** – 0xbb2b (47915)
- **ProcessInput** – forwards party member combat message to GUI

## KotOR.js Implementation

1. **InGameOverlay.setCombatMessage(text, durationMs)** – sets LBL_CMBTMODEMSG, shows LBL_CMBTMSGBG/LBL_CMBTMODEMSG, auto-hides after duration
2. **CombatMessageTLK** – maps AttackResult to message text (TLK or fallback)
3. **CombatRound.logAttackToCombatMenu()** – only for party leader, resolves text and calls setCombatMessage
