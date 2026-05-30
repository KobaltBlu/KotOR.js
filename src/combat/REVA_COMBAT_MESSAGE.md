# Combat message / combat menu log (observed original game behavior)

## Overview

The original client shows combat feedback (hit, miss, critical, and similar) in the in-game overlay combat message area. Party member data holds a TLK string id for the current message; when the relevant member is the player-controlled creature, the GUI is updated with that string and color rules for certain message types.

## Flow (observed)

1. Party member data stores a TLK id for the pending combat message.
2. If that member is the current player creature, the in-game UI receives the id and sets the combat message label from TLK, applying color highlights for specific message ids and a default “clear” id when appropriate.
3. The main in-game interface forwards the update from the top-level in-game GUI layer.

## KotOR.js

1. `InGameOverlay.setCombatMessage(text, durationMs)` — sets `LBL_CMBTMODEMSG`, shows background/label, auto-hides after duration.
2. `CombatMessageTLK` — maps `AttackResult` to message text (TLK or fallback).
3. `CombatRound.logAttackToCombatMenu()` — for the party leader, resolves text and calls `setCombatMessage`.
