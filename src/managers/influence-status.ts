import { FeebackMessageColor } from "@/enums/engine/FeedbackMessageColor";
import { GameState } from "@/GameState";

/**
 * Retail CGuiInGame::UpdateStatus ids 9 / 10 — influence gained / lost bitmasks
 * (AddInfluenceGained / AddInfluenceLost on status summary).
 */
export class InfluenceStatusFeedback {
  /** Bitmask of NPC slots that gained influence (retail +0x80). */
  static gainedMask: number = 0;
  /** Bitmask of NPC slots that lost influence. */
  static lostMask: number = 0;
  /** Dirty flag so a future MenuStatusSummary can open (retail +0x68). */
  static pending: boolean = false;

  static reset(){
    InfluenceStatusFeedback.gainedMask = 0;
    InfluenceStatusFeedback.lostMask = 0;
    InfluenceStatusFeedback.pending = false;
  }

  /**
   * Record influence change for NPC slot and emit combat-log feedback.
   * @param npcId NPC_* slot 0..11
   * @param gained true = UpdateStatus 9, false = 10
   */
  static notify(npcId: number, gained: boolean){
    const bit = 1 << ((npcId | 0) & 31);
    if(gained){
      InfluenceStatusFeedback.gainedMask |= bit;
    }else{
      InfluenceStatusFeedback.lostMask |= bit;
    }
    InfluenceStatusFeedback.pending = true;

    const cre =
      GameState.PartyManager.GetPartyMemberByNPCId?.(npcId) ||
      GameState.PartyManager.NPCS?.[npcId]?.moduleObject;
    const name = cre?.getName?.() || `NPC_${npcId | 0}`;
    const text = gained
      ? `Influence gained: ${name}`
      : `Influence lost: ${name}`;
    try{
      GameState.FeedbackMessageManager?.AddMessage?.(
        text,
        FeebackMessageColor.INFO,
      );
    }catch(_e){
      // Feedback may be unavailable outside a running game
    }
  }
}
