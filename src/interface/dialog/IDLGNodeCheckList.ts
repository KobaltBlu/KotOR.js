/**
 * IDLGNodeCheckList interface.
 *
 * Tracks dialog node completion state (VO, fade, camera, skip).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file IDLGNodeCheckList.ts
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export interface IDLGNodeCheckList {
  voiceOverError?: boolean;
  voiceOverComplete?: boolean;
  fadeComplete?: boolean;
  alreadyAllowed?: boolean;
  isSkipped?: boolean;
  cameraAnimationComplete?: boolean;
  isComplete?: () => boolean;
}
