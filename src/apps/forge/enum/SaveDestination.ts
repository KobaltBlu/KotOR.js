/**
 * SaveDestination – where to save a resource (ported from Holocron BifSaveOption).
 * Used by save flow: MOD, Override, or RIM.
 */

export enum SaveDestination {
  Nothing = 0,
  /** Save as new/updated MOD (ERF) file. */
  MOD = 1,
  /** Save to game override folder. */
  Override = 2,
  /** Save to RIM file. */
  RIM = 3,
}
