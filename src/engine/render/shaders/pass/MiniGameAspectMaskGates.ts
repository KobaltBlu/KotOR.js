import { EngineMode } from '@engine/enums/engine/EngineMode';
import { MiniGameType } from '@engine/enums/engine/MiniGameType';

/**
 * When the 4:3 minigame aspect mask should run.
 * Enabled for swoop / turret area minigames in EngineMode.MINIGAME.
 *
 * @file MiniGameAspectMaskGates.ts
 */
export interface MiniGameAspectMaskEnableInput {
  engineMode: EngineMode;
  /** Area has a loaded ModuleMiniGame. */
  hasMiniGame: boolean;
  /** Optional type gate — undefined means any MG type. */
  miniGameType?: MiniGameType;
}

export function resolveMiniGameAspectMaskPass(
  input: MiniGameAspectMaskEnableInput
): boolean {
  if(input.engineMode !== EngineMode.MINIGAME) return false;
  if(!input.hasMiniGame) return false;
  if(input.miniGameType === undefined) return true;
  return (
    input.miniGameType === MiniGameType.SWOOPRACE ||
    input.miniGameType === MiniGameType.TURRET
  );
}
