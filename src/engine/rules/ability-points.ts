/**
 * Retail DetermineCostToIncreaseScore
 * DetermineCostToDecreaseScore point-buy costs.
 */
export function costToIncreaseAbility(currentScore: number): number {
  const score = currentScore | 0;
  if(score < 14) return 1;
  if(score < 16) return 2;
  return 3;
}

/** Positive refund amount when decreasing from currentScore. */
export function costToDecreaseAbility(currentScore: number): number {
  const score = currentScore | 0;
  if(score <= 8) return 0;
  if(score <= 14) return 1;
  if(score <= 16) return 2;
  return 3;
}
