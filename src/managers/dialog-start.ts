import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { DLGObject } from "@/resource/DLGObject";
import { BitWise } from "@/utility/BitWise";

/**
 * Retail ExecuteCommandBeginConversation @ 0052e9f0 → StartDialog ownership.
 *
 * When OBJECT_SELF is a party CNPC (field426 / isPartyMember, not the player) and
 * the listener is not the player, StartDialog runs on the listener (last speaker).
 * Otherwise StartDialog runs on OBJECT_SELF (the BeginConversation caller).
 *
 * This is why blank ActionStartConversation(oPartyMember) from a door uses the
 * door's Conversation, not the companion's personal dialog.
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

  // Retail: listener==player || caller==player || !creature || field426==0 → StartDialog(caller)
  if(listenerIsPlayer || callerIsPlayer || !callerIsCreature || !callerIsParty){
    return caller;
  }
  // Party CNPC → StartDialog(listener) — last speaker / ActionStartConversation caller
  return listener;
}

/**
 * Retail BeginConversation blank sResRef → field78 (ActionStartConversation override),
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
