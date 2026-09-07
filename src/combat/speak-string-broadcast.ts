import { TalkVolume } from "@/enums/engine/TalkVolume";
import { PerceptionMask } from "@/enums/engine/PerceptionMask";

/**
 * SpeakString / BroadcastDialog notify plan (volume → range + who hears).
 * Party lives in PartyManager.party and must be notified for every volume that
 * notifies area creatures (SILENT_TALK delivers GEN_I_WAS_ATTACKED to companions).
 *
 * @file speak-string-broadcast.ts
 * @see BroadcastDialog 
 */

export type SpeakStringNotifyPlan = {
  range: number;
  notifyCreatures: boolean;
  notifyParty: boolean;
};

export function getSpeakStringNotifyPlan(volume: TalkVolume): SpeakStringNotifyPlan {
  switch(volume){
    case TalkVolume.TALK:
      return { range: 5, notifyCreatures: true, notifyParty: true };
    case TalkVolume.WHISPER:
      return { range: 2, notifyCreatures: true, notifyParty: true };
    case TalkVolume.SHOUT:
      return { range: 40, notifyCreatures: true, notifyParty: true };
    case TalkVolume.SILENT_TALK:
      return { range: 20, notifyCreatures: true, notifyParty: true };
    case TalkVolume.SILENT_SHOUT:
      return { range: 1000, notifyCreatures: true, notifyParty: true };
    default:
      return { range: 5, notifyCreatures: false, notifyParty: false };
  }
}

/**
 * BroadcastDialog creature→creature gate: listener must already HEAR the
 * speaker (visibility HEARD bit). Party mutual perception is forced in,
 * so party notify skips this check.
 */
export function listenerHearsSpeaker(
  listener: { perceptionList?: Array<{ object?: unknown; data?: number }> },
  speaker: unknown
): boolean {
  if(!listener || !speaker || listener === speaker) return true;
  const list = listener.perceptionList;
  if(!list?.length) return false;
  for(let i = 0; i < list.length; i++){
    const entry = list[i];
    if(entry?.object === speaker && (entry.data & PerceptionMask.HEARD)){
      return true;
    }
  }
  return false;
}

/**
 * After matching (or failing to match) a heard shout, always drain the head so
 * unmatched strings cannot stall later patterns.
 */
export function drainHeardStringHead<T>(heardStrings: T[]): T | undefined {
  if(!heardStrings.length) return undefined;
  return heardStrings.shift();
}
