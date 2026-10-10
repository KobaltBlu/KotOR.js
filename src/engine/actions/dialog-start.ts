import { GameState } from "@engine/runtime/GameState";
import type { GameObject } from "@engine/module/GameObject";
import { DLGObject } from "@engine/dialog/DLGObject";
import { isCreature } from "@engine/module/guards/isCreature";
import { isGameObject } from "@engine/module/guards/isGameObject";

/**
 * ExecuteCommandBeginConversation → StartDialog ownership.
 *
 * The if-condition assigns pCVar8/uVar6 with C short-circuit side effects:
 * 1. listener == player → StartDialog(caller, listener)
 * 2. caller == player → StartDialog(listener, caller) // reassigns before check
 * 3. !creature / !party → StartDialog(caller, listener)
 * else (party CNPC) → StartDialog(listener, caller)
 *
 * (2) is why Trask ActionStartConversation(PC, "") → OnDialog on PC →
 * BeginConversation → StartDialog(Trask) with Trask's Conversation.
 * (else) is why blank ActionStartConversation(oPartyMember) from a door uses
 * the door's Conversation, not the companion's personal dialog.
 */
export function resolveDialogStartOwner(
  caller: GameObject,
  listener: GameObject
): GameObject {
  if(!isGameObject(caller)){
    return listener;
  }
  if(!isGameObject(listener)){
    return caller;
  }

  const player = GameState.PartyManager?.Player;
  const listenerIsPlayer = !!(listener.isPlayer || (player && listener === player));
  const callerIsPlayer = !!(caller.isPlayer || (player && caller === player));
  const callerIsParty = isCreature(caller) && !!caller.isPartyMember?.();

  // Order matches engine behavior || short-circuit (listener check before caller check).
  if(listenerIsPlayer){
    return caller;
  }
  if(callerIsPlayer){
    return listener;
  }
  if(!isCreature(caller) || !callerIsParty){
    return caller;
  }
  // Party CNPC → StartDialog(listener) — last speaker / ActionStartConversation caller
  return listener;
}

/**
 * BeginConversation blank sResRef → (ActionStartConversation override),
 * else StartDialog GetDialogResref on the StartDialog owner.
 */
export function resolveBeginConversationDialog(
  sResRef: string,
  instanceConversation: DLGObject | undefined,
  dialogOwner: GameObject
): DLGObject | undefined {
  if(typeof sResRef === 'string' && sResRef.length > 0){
    return DLGObject.FromResRef(sResRef);
  }
  // ActionStartConversation wrote a non-blank resref into the OnDialog instance
  if(instanceConversation){
    return instanceConversation;
  }
  if(isGameObject(dialogOwner)){
    return dialogOwner.getConversation?.();
  }
  return undefined;
}
