/**
 * Runtime context for creature ServerToClientAnimation row resolution.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CreatureAnimationContext.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
import type { GameEngineType } from '@core/enums/engine/GameEngineType';

export interface CreatureAnimationContext {
  simple: boolean;
  injured: boolean;
  poisoned: boolean;
  diseased: boolean;
  weaponType: number;
  /** K1 vs TSL row selection (e.g. droid utility). */
  gameKey: GameEngineType;
}
