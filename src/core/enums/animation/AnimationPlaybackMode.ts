/**
 * SetAnimation playback modes.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file AnimationPlaybackMode.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export enum AnimationPlaybackMode {
  /** Reverse base-layer playback. */
  REVERSE = 0,
  /** Overlay playback; does not replace drive locomotion. */
  OVERLAY = 1,
  /** Normal PlayAnimation on the target model(s). */
  NORMAL = 2,
}
