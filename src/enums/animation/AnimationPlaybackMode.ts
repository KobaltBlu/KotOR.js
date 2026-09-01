/**
 * Retail SetAnimation playback modes (kSetAnimationModeA/B).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file AnimationPlaybackMode.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export enum AnimationPlaybackMode {
  /** Mode 0 — reverse base-layer playback. */
  REVERSE = 0,
  /** Mode 1 — SetOverlayAnimation; does not replace drive locomotion. */
  OVERLAY = 1,
  /** Mode 2 — normal PlayAnimation on the target gob(s). */
  NORMAL = 2,
}
