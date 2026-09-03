import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { DLGObject } from "@/resource/DLGObject";
import { BitWise } from "@/utility/BitWise";

/**
 * Retail ExecuteCommandBeginConversation → StartDialog ownership.
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
  caller: ModuleObject,
  listener: ModuleObject
): ModuleObject {
  if(!BitWise.InstanceOfObject(caller, ModuleObjectType.ModuleObject)){
    return listener;
  }
  if(!BitWise.InstanceOfObject(listener, ModuleObjectType.ModuleObject)){
    return caller;
  }

  const player = GameState.PartyManager?.Player;
  const listenerIsPlayer = !!(listener.isPlayer || (player && listener === player));
  const callerIsPlayer = !!(caller.isPlayer || (player && caller === player));
  const callerIsCreature = BitWise.InstanceOfObject(caller, ModuleObjectType.ModuleCreature);
  const callerIsParty = callerIsCreature && !!(caller as ModuleCreature).isPartyMember?.();

  // Order matches retail || short-circuit (listener check before caller check).
  if(listenerIsPlayer){
    return caller;
  }
  if(callerIsPlayer){
    return listener;
  }
  if(!callerIsCreature || !callerIsParty){
    return caller;
  }
  // Party CNPC → StartDialog(listener) — last speaker / ActionStartConversation caller
  return listener;
}

/**
 * Retail BeginConversation blank sResRef → (ActionStartConversation override),
 * else StartDialog GetDialogResref on the StartDialog owner.
 */
export function resolveBeginConversationDialog(
  sResRef: string,
  instanceConversation: DLGObject | undefined,
  dialogOwner: ModuleObject
): DLGObject | undefined {
  if(typeof sResRef === 'string' && sResRef.length > 0){
    return DLGObject.FromResRef(sResRef);
  }
  // ActionStartConversation wrote a non-blank resref into the OnDialog instance
  if(instanceConversation){
    return instanceConversation;
  }
  if(BitWise.InstanceOfObject(dialogOwner, ModuleObjectType.ModuleObject)){
    return dialogOwner.getConversation?.();
  }
  return undefined;
}
