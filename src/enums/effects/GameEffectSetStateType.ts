/**
 * GameEffectSetStateType enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GameEffectSetStateType.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum GameEffectSetStateType {
  CONFUSED = 1,
  FRIGHTENED = 2,
  DROID_STUN = 3,
  CUT_SCENE_STUNNED = 4,
  CUT_SCENE_PARALYZE = 5,
  SLEEP = 6,
  CHOKE = 7,
  CUT_SCENE_HORRIFIED = 8,
  FORCEPUSH = 9,
  WHIRLWIND = 10,
  /** K2 — companion SetState from OnApplyKnockdown */
  KNOCKDOWN = 14,
  /** K2-only — EffectCrush */
  CRUSH = 15,
  /** K2 — EffectDroidConfused */
  DROID_CONFUSED = 16,
  /**
   * K2 SetState 0x11 — Internal choke-like lock (with 0x0E/0x0F);
   * no NWScript Effect* creator found in Aspyr.
   */
  HELD = 17,
  /** K2 — EffectMindTrick */
  MIND_TRICK = 18,
  /** K2 — EffectDroidScramble */
  DROID_SCRAMBLE = 19,
}
