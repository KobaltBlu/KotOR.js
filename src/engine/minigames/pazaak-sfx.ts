/**
 * DoGameSequence — set vs match SFX after score bump.
 * Tie has no result SFX (warnbust is on bust draw, not tie).
 */
export type PazaakRoundWinner = "player" | "opponent";

export function pazaakSetOrMatchSfx(
  winner: PazaakRoundWinner,
  winCountAfter: number,
  targetWins: number
): string {
  if(winner === "player"){
    return winCountAfter >= targetWins ? "mgs_winmatch" : "mgs_winset";
  }
  return winCountAfter >= targetWins ? "mgs_losematch" : "mgs_loseset";
}
