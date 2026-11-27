import { AttackResult } from "@core/enums/combat/AttackResult";
import { FeebackMessageColor } from "@engine/enums/engine/FeedbackMessageColor";
import type { Creature } from "@engine/module/Creature";
import type { GameObject } from "@engine/module/GameObject";
import type { TalentFeat } from "@engine/talents";
import { formatTlkWithCustoms, tlkText } from "@engine/world/tlk-tokens";

/**
 * TLK strrefs for SendAttackSummaryFeedback
 * HandleServerToPlayerCCMessage case 0x12 (client xx).
 */
export const AttackSummaryStrRef = {
  /** "<CUSTOM0> <CUSTOM1> with attack on <CUSTOM2>" */
  BASE: 0xa43a,
  /** "succeeds" — attack_result in {1,2,3} */
  SUCCEEDS: 0xa43b,
  /** "fails" */
  FAILS: 0xa43c,
  /** "<CUSTOM0> used" */
  FEAT_USED: 0xa43e,
  /** "<CUSTOM0> with <CUSTOM1> vs. Defense <CUSTOM2> for damage <CUSTOM3>. " */
  DETAIL: 0xa487,
  /** "Hit" */
  HIT: 0xa495,
  /** "Miss" */
  MISS: 0xa496,
  /** "Critical Hit!" */
  CRITICAL: 0x5e7,
  /** "Sneak Attack!" */
  SNEAK: 0x5b3,
  /** "Death Blow!" (coup de grâce) */
  DEATH_BLOW: 0xa53f,
  /** "Automatic Hit!" */
  AUTOMATIC_HIT: 0xa596,
  /** "Automatic Miss!" */
  AUTOMATIC_MISS: 0xa597,
  /** "Deflected!" — attack_result == 8 (PARRIED) */
  DEFLECTED: 0xa5ab,
  /** "Returned!" — attack_result == 9 (DEFLECTED / return damage) */
  RETURNED: 0xa5b5,
  /** "<CUSTOM0> Force Resisted!" — onApply feedback */
  FORCE_RESISTED: 0x96be,
} as const;

export interface AttackSummaryFeedbackInput {
  attacker: Creature;
  defender?: GameObject;
  attackResult: AttackResult;
  /** Total attack roll (d20 + modifiers), ints[2]. */
  toHitTotal: number;
  /** Target defense / AC, ints[3]. */
  targetDefense: number;
  /** Base / total damage shown in summary (clamped >= 0). */
  damage: number;
  feat?: TalentFeat;
  critical?: boolean;
  sneakAttack?: boolean;
  /** Coup de grâce → "Death Blow!" */
  coupDeGrace?: boolean;
  /** EffectAssuredHit (or equivalent) → "Automatic Hit!" */
  automaticHit?: boolean;
  automaticMiss?: boolean;
}

export { formatTlkWithCustoms, tlkText };

function objectName(obj: GameObject | undefined): string {
  if (!obj) return tlkText(0) || '';
  try {
    return obj.getName?.() || '';
  } catch {
    return '';
  }
}

function featName(feat?: TalentFeat): string {
  if (!feat || feat.name == null || feat.name < 0) return '';
  return tlkText(feat.name) || feat.label || '';
}

function isHitGroup(result: AttackResult): boolean {
  return (
    result === AttackResult.HIT_SUCCESSFUL ||
    result === AttackResult.CRITICAL_HIT ||
    result === AttackResult.AUTOMATIC_HIT
  );
}

/**
 * Build the Messages-menu combat line matching CC 0x12 formatting.
 */
export function formatAttackSummaryFeedback(input: AttackSummaryFeedbackInput): {
  message: string;
  color: FeebackMessageColor;
} {
  const hit = isHitGroup(input.attackResult);
  const attackerName = objectName(input.attacker);
  const defenderName = objectName(input.defender);

  let message =
    formatTlkWithCustoms(AttackSummaryStrRef.BASE, [
      attackerName,
      tlkText(hit ? AttackSummaryStrRef.SUCCEEDS : AttackSummaryStrRef.FAILS),
      defenderName,
    ]) + '. ';

  const usedFeat = featName(input.feat);
  if (usedFeat) {
    message += formatTlkWithCustoms(AttackSummaryStrRef.FEAT_USED, [usedFeat]) + '. ';
  }

  const damage = Math.max(0, input.damage | 0);
  message += formatTlkWithCustoms(AttackSummaryStrRef.DETAIL, [
    tlkText(hit ? AttackSummaryStrRef.HIT : AttackSummaryStrRef.MISS),
    String(input.toHitTotal | 0),
    String(input.targetDefense | 0),
    String(damage),
  ]);

  // appends suffix + trailing space for each flag.
  if (input.critical) {
    message += tlkText(AttackSummaryStrRef.CRITICAL) + ' ';
  }
  if (input.sneakAttack) {
    message += tlkText(AttackSummaryStrRef.SNEAK) + ' ';
  }
  if (input.coupDeGrace) {
    message += tlkText(AttackSummaryStrRef.DEATH_BLOW) + ' ';
  }
  if (input.automaticHit) {
    message += tlkText(AttackSummaryStrRef.AUTOMATIC_HIT) + ' ';
  } else if (input.automaticMiss) {
    message += tlkText(AttackSummaryStrRef.AUTOMATIC_MISS) + ' ';
  }

  if (input.attackResult === AttackResult.PARRIED) {
    message += tlkText(AttackSummaryStrRef.DEFLECTED) + ' ';
  } else if (input.attackResult === AttackResult.DEFLECTED) {
    message += tlkText(AttackSummaryStrRef.RETURNED) + ' ';
  }

  return {
    message: message.replace(/\s+$/, ''),
    color: hit ? FeebackMessageColor.ATTACK : FeebackMessageColor.INFO,
  };
}
